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
            
            # If student has NO historical grades at all, treat as new student → pass
            if not grades:
                return True
            
            # If the specific prerequisite isn't in their grades, pass
            # (they haven't taken the prerequisite course yet)
            if prereq_id not in grades:
                return True
            
            student_grade = grades[prereq_id]
            
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

    def _get_assignment_constraints(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract non-academic constraints (Teacher/Period) from a logic tree.
        Returns a simplified map of { 'allowed_teachers': set(), 'allowed_periods': set() }.
        This is a pre-processor for the solver variables.
        """
        if not node: return {}
        
        # Leaf Node
        if node.get("type") == "TEACHER":
            return {"allowed_teachers": {node.get("teacher_id")}}
        if node.get("type") == "PERIOD":
            return {"allowed_periods": {node.get("period")}}
        
        # Group Node
        if "condition" in node:
            res_list = [self._get_assignment_constraints(r) for r in node.get("rules", [])]
            combined = {"allowed_teachers": set(), "allowed_periods": set()}
            
            if node["condition"] == "AND":
                # Intersection logic (Must meet ALL)
                for r in res_list:
                    if "allowed_teachers" in r:
                        if not combined["allowed_teachers"]: combined["allowed_teachers"] = r["allowed_teachers"]
                        else: combined["allowed_teachers"] &= r["allowed_teachers"]
                    if "allowed_periods" in r:
                        if not combined["allowed_periods"]: combined["allowed_periods"] = r["allowed_periods"]
                        else: combined["allowed_periods"] &= r["allowed_periods"]
            else:
                # Union logic (Can meet ANY)
                for r in res_list:
                    if "allowed_teachers" in r: combined["allowed_teachers"] |= r["allowed_teachers"]
                    if "allowed_periods" in r: combined["allowed_periods"] |= r["allowed_periods"]
            
            return {k: v for k, v in combined.items() if v}
            
        return {}

    def generate(self, semester: int) -> ScheduleGenerateResponse:
        """Run the CP-SAT solver and save results to Firestore."""
        from ortools.sat.python import cp_model
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

        # Build subject → qualified teachers mapping (Now with Rule Enforcement!)
        subject_teachers: Dict[int, List[int]] = {}
        subject_period_restriction: Dict[int, List[int]] = {} # p+1 values

        for si, subj in enumerate(subjects):
            subj_id = subj["subject_id"]
            rule = rules.get(subj_id)
            
            # Get specific assignment constraints from the rules engine
            constraints = self._get_assignment_constraints(rule)
            req_teacher_ids = constraints.get("allowed_teachers", set())
            req_periods = constraints.get("allowed_periods", set())

            qualified_idx = []
            for ti, teacher in enumerate(teachers):
                t_id = teacher["teacher_id"]
                specs = teacher.get("specializations", [])
                
                # Rule 1: If rule specifies teachers, you MUST be one of them
                if req_teacher_ids and t_id not in req_teacher_ids:
                    continue
                
                # Rule 2: Specialization match (only if no specific teacher is required)
                if not req_teacher_ids:
                    if (subj_id not in specs and 
                        subj.get("name", "") not in specs and 
                        subj.get("code", "") not in specs):
                        continue
                
                qualified_idx.append(ti)

            # Fallback: if no one is specifically qualified, allow all (unless restricted by rule)
            if not qualified_idx and not req_teacher_ids:
                qualified_idx = list(range(len(teachers)))
                
            subject_teachers[si] = qualified_idx
            if req_periods:
                subject_period_restriction[si] = list(req_periods)

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
                
                # Logic 2: Optional Choice? (Only if Approved)
                else:
                    is_approved = student.get("is_approved", False)
                    requested = student.get("requested_subjects", [])
                    if is_approved and (subj_id in requested or 
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
                    for p in range(num_p):
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

                        # Period lock rule check (Rule Engine Integration)
                        if si in subject_period_restriction:
                            if (p + 1) not in subject_period_restriction[si]:
                                continue

                        x[sec_i, t, r, p] = model.NewBoolVar(f"x_sec{sec_i}_t{t}_r{r}_p{p}")

        # ── HARD CONSTRAINTS ──

        # 1. Each section assigned to at least 1 period, targeting required periods
        all_section_sums = []
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
            
            section_sum = sum(vars_for_section)
            # Flexible: at least 1 period, at most the required number
            model.Add(section_sum >= 1)
            model.Add(section_sum <= req_periods)
            all_section_sums.append(section_sum)
        
        # Maximize total assigned periods across all sections
        if all_section_sums:
            model.Maximize(sum(all_section_sums))

        # 2. No teacher double-booking + Off-Times + Consecutive Limit
        max_consecutive = settings.get("max_consecutive_periods", 3)
        
        for t in range(num_teachers):
            off_times = teachers[t].get("off_times", [])
            teacher_period_vars = [] # Store the 'is_teaching' var for each period
            
            for p in range(num_p):
                # Teacher assignment at period p
                p_vars = [
                    x[sec_i, t, r, p]
                    for sec_i, (si, _, _) in enumerate(sections)
                    if t in subject_teachers.get(si, [])
                    for r in range(num_rooms)
                    if (sec_i, t, r, p) in x
                ]
                is_teaching_p = model.NewBoolVar(f"t{t}_active_p{p}")
                if p_vars:
                    model.Add(is_teaching_p == sum(p_vars))
                else:
                    model.Add(is_teaching_p == 0)
                
                teacher_period_vars.append(is_teaching_p)

                # Hard Lock: Off-times
                if (p + 1) in off_times:
                    model.Add(is_teaching_p == 0)

            # Constraint: Max consecutive periods (The Dash Prevention)
            if num_p > max_consecutive:
                for start_p in range(num_p - max_consecutive):
                    window = teacher_period_vars[start_p : start_p + max_consecutive + 1]
                    model.Add(sum(window) <= max_consecutive)

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

        # 4. Teacher max workload (Weekly)
        for t in range(num_teachers):
            max_p = teachers[t].get("max_periods_per_week", 25)
            # Automatic Prep Period adjustment: if 4 periods/day and 5 days, 
            # 1.0 FTE should be 15 periods/week max.
            if num_p == 4 and max_p > 15:
                max_p = 15
            
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

        # 5. Student No-Overlap + Consecutive Limit
        # Build student → is_scheduled_at_p mapping
        student_period_vars = {} # (student_idx, period_idx) -> Var

        for sti in range(len(students)):
            for p in range(num_p):
                is_active_st_p = model.NewBoolVar(f"st{sti}_active_p{p}")
                
                # All assignments involving this student at period p
                st_p_vars = []
                for sec_i, (si, sec_idx, sec_students) in enumerate(sections):
                    if sti in sec_students:
                        for t in subject_teachers.get(si, []):
                            for r in range(num_rooms):
                                if (sec_i, t, r, p) in x:
                                    st_p_vars.append(x[sec_i, t, r, p])
                
                if st_p_vars:
                    model.Add(is_active_st_p == sum(st_p_vars))
                else:
                    model.Add(is_active_st_p == 0)
                
                student_period_vars[sti, p] = is_active_st_p

            # Constraint: Max consecutive periods for student
            if num_p > max_consecutive:
                for start_p in range(num_p - max_consecutive):
                    window = [student_period_vars[sti, p] for p in range(start_p, start_p + max_consecutive + 1)]
                    model.Add(sum(window) <= max_consecutive)

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
