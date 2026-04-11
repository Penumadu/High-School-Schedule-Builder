"""
OR-Tools CP-SAT Constraint Solver for High School Scheduling.

Translates school data into mathematical constraints and finds an optimal
assignment of (subject, teacher, room, period) tuples.
"""

import uuid
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
        # Build subject → student enrollment mapping (with Academic Rule Enforcement)
        subject_students: Dict[int, List[int]] = {}
        excluded_conflicts: List[ConflictItem] = []

        for si, subj in enumerate(subjects):
            enrolled = []
            subj_id = subj["subject_id"]
            subj_code = subj.get("code", "")
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
                        subj.get("name", "") in requested or 
                        subj_code in requested):
                        should_enroll = True

                if should_enroll:
                    # Enforce Academic Rule if exists
                    if rule and not self._evaluate_logic(student, rule):
                        excluded_conflicts.append(ConflictItem(
                            type="PREREQUISITE_FAILURE",
                            description=f"Student {student['student_id']} excluded from {subj['name']} (Prerequisite not met)",
                            affected_ids=[student["student_id"], subj_id]
                        ))
                        continue
                    enrolled.append(sti)
            subject_students[si] = enrolled

        # Facility type matching helper
        def get_facility(item): return item.get("facility_type", "REGULAR").upper()

        # ──────────── BUILD THE CP-SAT MODEL ────────────
        model = cp_model.CpModel()

        num_subjects = len(subjects)
        num_teachers = len(teachers)
        num_rooms = len(classrooms)
        num_p = len(period_names)

        x = {}
        for s in range(num_subjects):
            for t in subject_teachers[s]:
                for r in range(num_rooms):
                    # Facility match constraint: Subject facility must match Room facility
                    # Exception: If subject needs GYM, it MUST have a GYM room
                    subj_facility = get_facility(subjects[s])
                    room_facility = get_facility(classrooms[r])
                    
                    if subj_facility != room_facility:
                        # Legacy check for is_gym boolean
                        if subj_facility == "GYM" and not classrooms[r].get("is_gym"):
                            continue
                        if subj_facility != "GYM": # Regular or Lab must match exactly
                            continue

                    for p in range(num_p):
                        x[s, t, r, p] = model.NewBoolVar(f"x_s{s}_t{t}_r{r}_p{p}")

        # ── HARD CONSTRAINTS ──

        # 1. Each subject assigned to required number of periods
        for s in range(num_subjects):
            req_periods = subjects[s].get("required_periods_per_week", 1)
            req_periods = min(req_periods, num_p)
            model.Add(
                sum(
                    x[s, t, r, p]
                    for t in subject_teachers[s]
                    for r in range(num_rooms)
                    for p in range(num_p)
                    if (s, t, r, p) in x
                ) == req_periods
            )

        # 2. No teacher double-booking + Off-Times
        for t in range(num_teachers):
            off_times = teachers[t].get("off_times", [])
            for p in range(num_p):
                # If teacher is busy this period, they cannot teach
                if (p + 1) in off_times:
                    for s in range(num_subjects):
                        if t in subject_teachers.get(s, []):
                            for r in range(num_rooms):
                                if (s, t, r, p) in x:
                                    model.Add(x[s, t, r, p] == 0)
                
                model.Add(
                    sum(
                        x[s, t, r, p]
                        for s in range(num_subjects)
                        if t in subject_teachers.get(s, [])
                        for r in range(num_rooms)
                        if (s, t, r, p) in x
                    ) <= 1
                )

        # 3. No room double-booking
        for r in range(num_rooms):
            for p in range(num_p):
                model.Add(
                    sum(
                        x[s, t, r, p]
                        for s in range(num_subjects)
                        for t in subject_teachers.get(s, [])
                        if (s, t, r, p) in x
                    ) <= 1
                )

        # 4. Room capacity
        for s in range(num_subjects):
            num_enrolled = len(subject_students.get(s, []))
            for r in range(num_rooms):
                room_cap = classrooms[r].get("capacity", 30)
                if num_enrolled > room_cap:
                    for t in subject_teachers[s]:
                        for p in range(num_p):
                            if (s, t, r, p) in x:
                                model.Add(x[s, t, r, p] == 0)

        # 5. Teacher max workload
        for t in range(num_teachers):
            max_p = teachers[t].get("max_periods_per_week", 25)
            model.Add(
                sum(
                    x[s, t, r, p]
                    for s in range(num_subjects)
                    if t in subject_teachers.get(s, [])
                    for r in range(num_rooms)
                    for p in range(num_p)
                    if (s, t, r, p) in x
                ) <= max_p
            )

        # 6. Student No-Overlap (Unique Student Schedules)
        # For each student, they cannot have more than one subject in the same period
        for sti, student in enumerate(students):
            approved_subjs = []
            for si, subj in enumerate(subjects):
                if sti in subject_students.get(si, []):
                    approved_subjs.append(si)
            
            if not approved_subjs:
                continue

            for p in range(num_p):
                # Sum of all assignments for this student's subjects in this period must be <= 1
                model.Add(
                    sum(
                        x[s, t, r, p]
                        for s in approved_subjs
                        for t in subject_teachers.get(s, [])
                        for r in range(num_rooms)
                        if (s, t, r, p) in x
                    ) <= 1
                )

        # ── SOLVE ──
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(model)

        conflicts = excluded_conflicts
        assignments = []

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for s in range(num_subjects):
                for t in subject_teachers[s]:
                    for r in range(num_rooms):
                        for p in range(num_p):
                            if (s, t, r, p) in x and solver.Value(x[s, t, r, p]):
                                enrolled_ids = [
                                    students[sti]["student_id"]
                                    for sti in subject_students.get(s, [])
                                ]
                                assignments.append(ScheduleAssignment(
                                    period_name=period_names[p],
                                    subject_id=subjects[s]["subject_id"],
                                    teacher_id=teachers[t]["teacher_id"],
                                    room_id=classrooms[r]["room_id"],
                                    enrolled_student_ids=enrolled_ids,
                                ))
        else:
            conflicts.append(ConflictItem(
                type="INFEASIBLE",
                description="Solver failed to find a valid schedule. Check for room or teacher shortages.",
                affected_ids=[],
            ))

        # Check for unassigned students
        scheduled_subjects = {a.subject_id for a in assignments}
        for student in students:
            for req in student.get("requested_subjects", []):
                if req not in scheduled_subjects:
                    conflicts.append(ConflictItem(
                        type="UNASSIGNED_STUDENT",
                        description=f"Student {student['student_id']} choice '{req}' not scheduled.",
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
            message=f"Generated {len(assignments)} classes" + (f" ({len(conflicts)} conflicts)" if conflicts else ""),
            conflict_report=conflict_report,
        )

