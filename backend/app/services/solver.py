"""
OR-Tools CP-SAT Constraint Solver for High School Scheduling.

Translates school data into mathematical constraints and finds an optimal
assignment of (subject, section, teacher, room, period) tuples.

Supports automatic sectioning: if student demand exceeds room capacity,
multiple sections are created for the same subject.
"""

import math
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple

from ortools.sat.python import cp_model

from app.core.firebase import get_firestore_client
from app.models.schedule import (
    ScheduleGenerateResponse,
    ScheduleAssignment,
    ConflictReport,
    ConflictItem,
)

logger = logging.getLogger(__name__)


class ScheduleSolver:
    """High School Schedule Generator using Google OR-Tools CP-SAT."""

    def __init__(self, school_id: str):
        self.school_id = school_id
        self.db = get_firestore_client()
        self.school_ref = self.db.collection("schools").document(school_id)

    def _evaluate_logic(self, student: Dict[str, Any], node: Dict[str, Any]) -> bool:
        """Recursively evaluate the academic logic tree for a student."""
        if not node:
            return True
        
        # Case 1: Leaf Condition
        if "prerequisite" in node:
            prereq_id = node["prerequisite"]
            operator = node.get("operator", ">=")
            threshold = node.get("value", 50.0)
            
            grades = student.get("historical_grades", {})
            # Try both ID and name for flexibility
            student_grade = grades.get(prereq_id, 0.0)
            
            if operator == ">=": return student_grade >= threshold
            if operator == ">": return student_grade > threshold
            if operator == "==": return student_grade == threshold
            if operator == "<=": return student_grade <= threshold
            if operator == "<": return student_grade < threshold
            return False
            
        # Case 2: Group Node (AND/OR)
        if "condition" in node:
            condition = node["condition"]
            rules = node.get("rules", [])
            if not rules:
                return True
            
            evals = [self._evaluate_logic(student, r) for r in rules]
            if condition == "AND":
                return all(evals)
            if condition == "OR":
                return any(evals)
                
        return True

    def _load_data(self) -> Dict[str, Any]:
        """Load all necessary data from Firestore for the solver."""
        # School settings
        school_doc = self.school_ref.get()
        if not school_doc.exists:
            raise ValueError(f"School '{self.school_id}' not found")
        school = school_doc.to_dict()
        settings = school.get("settings", {})
        periods_per_day = settings.get("periods_per_day", 8)

        # Teachers
        teachers = []
        for doc in self.school_ref.collection("teachers").stream():
            data = doc.to_dict()
            data["teacher_id"] = doc.id
            if data.get("is_active", True):
                teachers.append(data)

        # Subjects
        subjects = []
        for doc in self.school_ref.collection("subjects").stream():
            data = doc.to_dict()
            data["subject_id"] = doc.id
            # Ensure mandatory defaults to False
            data["is_mandatory"] = data.get("is_mandatory", False)
            subjects.append(data)

        # Classrooms
        classrooms = []
        for doc in self.school_ref.collection("classrooms").stream():
            data = doc.to_dict()
            data["room_id"] = doc.id
            classrooms.append(data)

        # Students
        students = []
        for doc in self.school_ref.collection("students").stream():
            data = doc.to_dict()
            data["student_id"] = doc.id
            students.append(data)

        # Academic Rules
        rules = {}
        for doc in self.school_ref.collection("rules").stream():
            data = doc.to_dict()
            rules[data["target_subject_id"]] = data["logic_tree"]

        return {
            "periods_per_day": periods_per_day,
            "teachers": teachers,
            "subjects": subjects,
            "classrooms": classrooms,
            "students": students,
            "rules": rules,
        }

    def generate(self, semester: int) -> ScheduleGenerateResponse:
        """Run the CP-SAT solver and save results to Firestore."""
        data = self._load_data()

        teachers = data["teachers"]
        subjects = data["subjects"]
        classrooms = data["classrooms"]
        students = data["students"]
        rules = data["rules"]
        num_periods = data["periods_per_day"]

        if not teachers:
            raise ValueError("No active teachers found. Cannot generate schedule.")
        if not subjects:
            raise ValueError("No subjects found. Cannot generate schedule.")
        if not classrooms:
            raise ValueError("No classrooms found. Cannot generate schedule.")

        # Create index maps
        teacher_idx = {t["teacher_id"]: i for i, t in enumerate(teachers)}
        subject_idx = {s["subject_id"]: i for i, s in enumerate(subjects)}
        room_idx = {r["room_id"]: i for i, r in enumerate(classrooms)}
        period_names = [f"Period_{p+1}" for p in range(num_periods)]

        # Build subject → qualified teachers mapping
        subject_teachers: Dict[int, List[int]] = {}
        for si, subj in enumerate(subjects):
            qualified = []
            for ti, teacher in enumerate(teachers):
                specs = teacher.get("specializations", [])
                # Check for matches against ID, Name, or Code
                if (subj["subject_id"] in specs or 
                    subj.get("name", "") in specs or 
                    subj.get("code", "") in specs):
                    qualified.append(ti)
            # If no one is specifically qualified, allow all teachers
            if not qualified:
                qualified = list(range(len(teachers)))
            subject_teachers[si] = qualified

        # Build subject → student enrollment mapping (with Academic Rule Enforcement)
        subject_students: Dict[int, List[int]] = {}
        excluded_conflicts: List[ConflictItem] = []

        for si, subj in enumerate(subjects):
            enrolled = []
            subj_id = subj["subject_id"]
            subj_code = subj.get("code", "")
            subj_name = subj.get("name", "")
            subj_grade = subj.get("grade_level")
            is_mandatory = subj.get("is_mandatory", False)
            rule = rules.get(subj_id)

            for sti, student in enumerate(students):
                student_grade = student.get("grade_level")
                
                # Logic 1: Mandatory Subject for this grade?
                should_enroll = False
                if is_mandatory and student_grade == subj_grade:
                    should_enroll = True
                
                # Logic 2: Optional Choice?
                else:
                    requested = student.get("requested_subjects", [])
                    if (subj_id in requested or 
                        subj_name in requested or 
                        subj_code in requested):
                        should_enroll = True

                if should_enroll:
                    # Enforce Academic Rule if exists
                    if rule and not self._evaluate_logic(student, rule):
                        excluded_conflicts.append(ConflictItem(
                            type="PREREQUISITE_FAILURE",
                            description=f"Student {student.get('first_name','')} {student.get('last_name','')} excluded from {subj_name} (Prerequisite not met)",
                            affected_ids=[student["student_id"], subj_id]
                        ))
                        continue
                    enrolled.append(sti)
            subject_students[si] = enrolled

        # Facility type matching helper
        def get_facility(item): return item.get("facility_type", "REGULAR").upper()

        # ──────────── AUTOMATIC SECTIONING ────────────
        # Determine the maximum room capacity for each facility type
        facility_rooms: Dict[str, List[int]] = {}
        for ri, room in enumerate(classrooms):
            ftype = get_facility(room)
            facility_rooms.setdefault(ftype, []).append(ri)

        def max_capacity_for_facility(ftype: str) -> int:
            rooms = facility_rooms.get(ftype, [])
            if not rooms:
                return 30  # default fallback
            return max(classrooms[ri].get("capacity", 30) for ri in rooms)

        # Build sections: list of (subject_idx, section_idx, student_indices)
        sections = []  # Each entry: (original_subject_idx, section_number, [student_indices])
        section_subject_map = []  # Maps flat section index → original subject index

        for si, subj in enumerate(subjects):
            enrolled = subject_students.get(si, [])
            ftype = get_facility(subj)
            max_cap = max_capacity_for_facility(ftype)
            
            if not enrolled:
                # Still create 1 section so the subject is scheduled
                num_sections = 1
            else:
                num_sections = max(1, math.ceil(len(enrolled) / max_cap))
            
            # Split students across sections as evenly as possible
            for sec_idx in range(num_sections):
                start = sec_idx * max_cap
                end = min((sec_idx + 1) * max_cap, len(enrolled))
                section_students = enrolled[start:end] if enrolled else []
                sections.append((si, sec_idx, section_students))
                section_subject_map.append(si)

        logger.info(f"Created {len(sections)} sections from {len(subjects)} subjects")

        # ──────────── BUILD THE CP-SAT MODEL ────────────
        model = cp_model.CpModel()

        num_sections = len(sections)
        num_teachers = len(teachers)
        num_rooms = len(classrooms)
        num_p = len(period_names)

        x = {}
        for sec_i, (si, sec_idx, sec_students) in enumerate(sections):
            subj = subjects[si]
            for t in subject_teachers[si]:
                for r in range(num_rooms):
                    # Facility match constraint
                    subj_facility = get_facility(subj)
                    room_facility = get_facility(classrooms[r])
                    
                    if subj_facility != room_facility:
                        if subj_facility == "GYM" and not classrooms[r].get("is_gym"):
                            continue
                        if subj_facility != "GYM":
                            continue

                    # Room capacity check: this section must fit in this room
                    room_cap = classrooms[r].get("capacity", 30)
                    if len(sec_students) > room_cap:
                        continue  # skip rooms too small for this section

                    for p in range(num_p):
                        x[sec_i, t, r, p] = model.NewBoolVar(f"x_sec{sec_i}_t{t}_r{r}_p{p}")

        # ── HARD CONSTRAINTS ──

        # 1. Each section assigned to required number of periods
        for sec_i, (si, sec_idx, sec_students) in enumerate(sections):
            req_periods = subjects[si].get("required_periods_per_week", 1)
            req_periods = min(req_periods, num_p)
            
            vars_for_section = [
                x[sec_i, t, r, p]
                for t in subject_teachers[si]
                for r in range(num_rooms)
                for p in range(num_p)
                if (sec_i, t, r, p) in x
            ]
            
            if not vars_for_section:
                excluded_conflicts.append(ConflictItem(
                    type="NO_VALID_ASSIGNMENT",
                    description=f"No valid room/teacher combo for {subjects[si].get('name','')} section {sec_idx+1}. Check facility types and room capacities.",
                    affected_ids=[subjects[si]["subject_id"]],
                ))
                continue
            
            model.Add(sum(vars_for_section) == req_periods)

        # 2. No teacher double-booking + Off-Times
        for t in range(num_teachers):
            off_times = teachers[t].get("off_times", [])
            for p in range(num_p):
                if (p + 1) in off_times:
                    for sec_i, (si, _, _) in enumerate(sections):
                        if t in subject_teachers.get(si, []):
                            for r in range(num_rooms):
                                if (sec_i, t, r, p) in x:
                                    model.Add(x[sec_i, t, r, p] == 0)
                
                model.Add(
                    sum(
                        x[sec_i, t, r, p]
                        for sec_i, (si, _, _) in enumerate(sections)
                        if t in subject_teachers.get(si, [])
                        for r in range(num_rooms)
                        if (sec_i, t, r, p) in x
                    ) <= 1
                )

        # 3. No room double-booking
        for r in range(num_rooms):
            for p in range(num_p):
                model.Add(
                    sum(
                        x[sec_i, t, r, p]
                        for sec_i, (si, _, _) in enumerate(sections)
                        for t in subject_teachers.get(si, [])
                        if (sec_i, t, r, p) in x
                    ) <= 1
                )

        # 4. Teacher max workload
        for t in range(num_teachers):
            max_p = teachers[t].get("max_periods_per_week", 25)
            model.Add(
                sum(
                    x[sec_i, t, r, p]
                    for sec_i, (si, _, _) in enumerate(sections)
                    if t in subject_teachers.get(si, [])
                    for r in range(num_rooms)
                    for p in range(num_p)
                    if (sec_i, t, r, p) in x
                ) <= max_p
            )

        # 5. Student No-Overlap (Unique Student Schedules)
        # Build student → sections mapping
        student_sections: Dict[int, List[int]] = {}
        for sec_i, (si, sec_idx, sec_students) in enumerate(sections):
            for sti in sec_students:
                student_sections.setdefault(sti, []).append(sec_i)
        
        for sti, sec_list in student_sections.items():
            if len(sec_list) <= 1:
                continue
            for p in range(num_p):
                overlap_vars = []
                for sec_i in sec_list:
                    si_for = section_subject_map[sec_i]
                    for t in subject_teachers.get(si_for, []):
                        for r in range(num_rooms):
                            if (sec_i, t, r, p) in x:
                                overlap_vars.append(x[sec_i, t, r, p])
                if overlap_vars:
                    model.Add(sum(overlap_vars) <= 1)

        # ── SOLVE ──
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(model)

        conflicts = excluded_conflicts
        assignments = []

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for sec_i, (si, sec_idx, sec_students) in enumerate(sections):
                for t in subject_teachers[si]:
                    for r in range(num_rooms):
                        for p in range(num_p):
                            if (sec_i, t, r, p) in x and solver.Value(x[sec_i, t, r, p]):
                                enrolled_ids = [
                                    students[sti]["student_id"]
                                    for sti in sec_students
                                ]
                                section_label = f" (Section {sec_idx+1})" if len([s for s in sections if s[0] == si]) > 1 else ""
                                assignments.append(ScheduleAssignment(
                                    period_name=period_names[p],
                                    subject_id=subjects[si]["subject_id"],
                                    teacher_id=teachers[t]["teacher_id"],
                                    room_id=classrooms[r]["room_id"],
                                    enrolled_student_ids=enrolled_ids,
                                ))
        else:
            conflicts.append(ConflictItem(
                type="INFEASIBLE",
                description="Solver failed to find a valid schedule. Common causes: not enough rooms or teachers for the number of subjects/sections, or teacher off-times are too restrictive.",
                affected_ids=[],
            ))

        # Check for unassigned students
        scheduled_subject_ids = {a.subject_id for a in assignments}
        for student in students:
            for req in student.get("requested_subjects", []):
                # Match by ID, name, or code
                matched = False
                for subj in subjects:
                    if req in (subj["subject_id"], subj.get("name", ""), subj.get("code", "")):
                        if subj["subject_id"] in scheduled_subject_ids:
                            matched = True
                        break
                if not matched:
                    conflicts.append(ConflictItem(
                        type="UNASSIGNED_STUDENT",
                        description=f"Student {student.get('first_name','')} {student.get('last_name','')} choice '{req}' not scheduled.",
                        affected_ids=[student["student_id"]],
                    ))

        conflict_report = ConflictReport(
            has_conflicts=len(conflicts) > 0,
            total_conflicts=len(conflicts),
            conflicts=conflicts,
        )

        # Save to Firestore
        schedule_id = f"sched_{uuid.uuid4().hex[:8]}"
        timestamp = datetime.utcnow().isoformat()
        
        schedule_data = {
            "semester": semester,
            "status": "DRAFT",
            "assignments": [a.model_dump() for a in assignments],
            "conflict_report": conflict_report.model_dump(),
            "created_at": timestamp,
        }
        self.school_ref.collection("schedules").document(schedule_id).set(schedule_data)

        # ──────────────────────── INDIVIDUAL STUDENT SCHEDULES ────────────────────────
        # Map master assignments back to each student for unique viewing
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for sti, student in enumerate(students):
                student_id = student["student_id"]
                student_assignments = []
                
                # Find all master assignments that include this student
                for assignment in assignments:
                    if student_id in assignment.enrolled_student_ids:
                        student_assignments.append(assignment.model_dump())
                
                if student_assignments:
                    # Save a snapshot of this student's schedule
                    self.school_ref.collection("students").document(student_id)\
                        .collection("student_schedules").document(schedule_id).set({
                            "schedule_id": schedule_id,
                            "semester": semester,
                            "assignments": student_assignments,
                            "updated_at": timestamp
                        })

        return ScheduleGenerateResponse(
            schedule_id=schedule_id,
            status="DRAFT",
            message=f"Generated {len(assignments)} classes across {len(sections)} sections" + (f" ({len(conflicts)} conflicts)" if conflicts else ""),
            conflict_report=conflict_report,
        )
