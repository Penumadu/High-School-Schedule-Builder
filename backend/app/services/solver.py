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
        """Load all necessary data from Firestore for the solver. Fallbacks to demo data if quota hit."""
        from app.core.db import FirestoreRepo
        
        # School settings
        try:
            school_doc = self.school_ref.get()
            if not school_doc.exists:
                if self.school_id == "demo-school":
                    school = {"settings": {"periods_per_day": 8}}
                else:
                    raise ValueError(f"School '{self.school_id}' not found")
            else:
                school = school_doc.to_dict()
        except Exception as e:
            if ("Quota exceeded" in str(e) or "429" in str(e)) and self.school_id == "demo-school":
                school = {"settings": {"periods_per_day": 8}}
            else:
                raise e

        settings = school.get("settings", {})
        periods_per_day = settings.get("periods_per_day", 8)

        # Use FirestoreRepo to benefit from its fallback logic
        teachers = FirestoreRepo(self.school_id, "teachers").list_all()
        subjects = FirestoreRepo(self.school_id, "subjects").list_all()
        classrooms = FirestoreRepo(self.school_id, "classrooms").list_all()
        students = FirestoreRepo(self.school_id, "students").list_all()
        
        # Rules need transformation to dict: subject_id -> logic_tree
        raw_rules = FirestoreRepo(self.school_id, "rules").list_all()
        rules = {}
        for r in raw_rules:
            # Handle both list of rules and logic tree structure
            if "target_subject_id" in r and "logic_tree" in r:
                rules[r["target_subject_id"]] = r["logic_tree"]

        return {
            "periods_per_day": periods_per_day,
            "settings": settings,
            "teachers": teachers,
            "subjects": subjects,
            "classrooms": classrooms,
            "students": students,
            "rules": rules,
        }

    def _get_assignment_constraints(self, node: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract non-academic constraints (Teacher/Period/Room) from a logic tree.
        """
        if not node: return {}
        
        if node.get("type") == "TEACHER":
            return {"allowed_teachers": {node.get("teacher_id")}}
        if node.get("type") == "PERIOD":
            return {"allowed_periods": {node.get("period")}}
        if node.get("type") == "FACILITY":
            # Can be by room_id OR facility_type
            return {
                "allowed_rooms": {node.get("room_id")} if node.get("room_id") else None,
                "facility_type": node.get("facility_type")
            }
        
        # Group Node
        if "condition" in node:
            res_list = [self._get_assignment_constraints(r) for r in node.get("rules", [])]
            combined = {"allowed_teachers": set(), "allowed_periods": set(), "allowed_rooms": set(), "facility_types": set()}
            
            if node["condition"] == "AND":
                # Intersection logic (Must meet ALL)
                for r in res_list:
                    if "allowed_teachers" in r:
                        if not combined["allowed_teachers"]: combined["allowed_teachers"] = r["allowed_teachers"]
                        else: combined["allowed_teachers"] &= r["allowed_teachers"]
                    if "allowed_periods" in r:
                        if not combined["allowed_periods"]: combined["allowed_periods"] = r["allowed_periods"]
                        else: combined["allowed_periods"] &= r["allowed_periods"]
                    if "allowed_rooms" in r and r["allowed_rooms"]:
                        if not combined["allowed_rooms"]: combined["allowed_rooms"] = r["allowed_rooms"]
                        else: combined["allowed_rooms"] &= r["allowed_rooms"]
                    if "facility_type" in r:
                        combined["facility_types"].add(r["facility_type"])
            else:
                # Union logic (Can meet ANY)
                for r in res_list:
                    if "allowed_teachers" in r: combined["allowed_teachers"] |= r["allowed_teachers"]
                    if "allowed_periods" in r: combined["allowed_periods"] |= r["allowed_periods"]
                    if "allowed_rooms" in r and r["allowed_rooms"]: combined["allowed_rooms"] |= r["allowed_rooms"]
                    if "facility_type" in r: combined["facility_types"].add(r["facility_type"])
            
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
        settings = data["settings"]

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

        # Build subject → qualified teachers/rooms mapping (Now with Rule Enforcement!)
        subject_teachers: Dict[int, List[int]] = {}
        subject_period_restriction: Dict[int, List[int]] = {} # p+1 values
        subject_room_restriction: Dict[int, List[int]] = {}

        for si, subj in enumerate(subjects):
            subj_id = subj["subject_id"]
            subj_name = subj.get("name", "").lower()
            subj_code = subj.get("code", "").lower()
            subj_facility = subj.get("facility_type", "REGULAR")
            rule = rules.get(subj_id)
            
            # 1. Get assignment constraints from Rules Engine
            constraints = self._get_assignment_constraints(rule)
            req_teacher_ids = constraints.get("allowed_teachers", set())
            req_periods = constraints.get("allowed_periods", set())
            req_room_ids = constraints.get("allowed_rooms", set())
            req_facility_types = constraints.get("facility_types", set())

            # 2. Qualified Teachers
            qualified_teachers = []
            for ti, teacher in enumerate(teachers):
                t_id = teacher["teacher_id"]
                specs = [s.lower() for s in teacher.get("specializations", [])]
                if req_teacher_ids and t_id not in req_teacher_ids:
                    continue
                if not req_teacher_ids:
                    is_qualified = any(spec in subj_id.lower() or spec in subj_name or subj_name in spec for spec in specs)
                    if not is_qualified: continue
                qualified_teachers.append(ti)

            if not qualified_teachers and not req_teacher_ids:
                qualified_teachers = list(range(len(teachers)))
            subject_teachers[si] = qualified_teachers

            # 3. Qualified Rooms
            qualified_rooms = []
            for ri, room in enumerate(classrooms):
                r_id = room["room_id"]
                r_facility = room.get("facility_type", "REGULAR")
                
                # Rule Lock (Specific ID)
                if req_room_ids and r_id not in req_room_ids:
                    continue
                
                # Facility Lock (If subject or rule requires specific type)
                allowed_types = req_facility_types if req_facility_types else {subj_facility}
                if r_facility not in allowed_types:
                    continue
                
                qualified_rooms.append(ri)
            
            # If no rooms match specialized type, fallback to any room (avoid crash) but warn
            if not qualified_rooms:
                qualified_rooms = list(range(len(classrooms)))
            
            subject_room_restriction[si] = qualified_rooms

            # 4. Period Restrictions
            if req_periods:
                subject_period_restriction[si] = list(req_periods)

        # Build subject → student enrollment mapping (with Improved Academic Rule Enforcement)
        subject_students_pool: Dict[int, List[int]] = {} # Pool of students who SHOULD take the course
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
                grades = student.get("historical_grades", {})
                
                # Logic 1: Mandatory Subject? (Allow +/- 1 grade gap for missing credits)
                should_enroll = False
                if is_mandatory:
                    # Check if already passed (grade >= 50)
                    already_passed = False
                    if str(subj_id) in grades and float(grades[str(subj_id)]) >= 50:
                        already_passed = True
                    elif str(subj_code) in grades and float(grades[str(subj_code)]) >= 50:
                        already_passed = True
                    
                    if already_passed:
                        should_enroll = False
                    elif student_grade == subj_grade:
                        should_enroll = True
                    elif student_grade is not None and subj_grade is not None:
                        # Convert to int safely
                        try:
                            s_g = int(str(student_grade))
                            sub_g = int(str(subj_grade))
                            if s_g > sub_g and (s_g - sub_g) <= 1:
                                should_enroll = True # Grade 11 taking Grade 10 mandatory
                        except (ValueError, TypeError):
                            pass
                
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
                    waivers = student.get("prerequisite_waivers", [])
                    
                    if rule and subj_id not in waivers and not self._evaluate_logic(student, rule):
                        excluded_conflicts.append(ConflictItem(
                            type="PREREQUISITE_FAILURE",
                            description=f"Student {student.get('first_name','')} {student.get('last_name','')} excluded from {subj_name} (Prerequisite not met)",
                            affected_ids=[student["student_id"], subj_id]
                        ))
                        continue
                    enrolled.append(sti)
            subject_students_pool[si] = enrolled

        # Facility type matching helper
        def get_facility(item): return item.get("facility_type", "REGULAR").upper()

        # ──────────── DYNAMIC SECTIONING ────────────
        # Identify possible sections and allow the solver to assign students to them
        facility_rooms: Dict[str, List[int]] = {}
        for ri, room in enumerate(classrooms):
            ftype = get_facility(room)
            facility_rooms.setdefault(ftype, []).append(ri)

        def max_capacity_for_facility(ftype: str) -> int:
            rooms = facility_rooms.get(ftype, [])
            if not rooms: return 30
            return max(classrooms[ri].get("capacity", 30) for ri in rooms)

        sections = [] # Each entry: (subject_idx, section_number)
        subj_sections: Dict[int, List[int]] = {} # subject_idx -> list of section indices

        for si, subj in enumerate(subjects):
            enrolled_pool = subject_students_pool.get(si, [])
            if not enrolled_pool:
                # Still create 1 section so the subject is scheduled
                num_needed = 1
            else:
                max_cap = max_capacity_for_facility(get_facility(subj))
                num_needed = max(1, math.ceil(len(enrolled_pool) / max_cap))
            
            subj_sections[si] = []
            for sec_idx in range(num_needed):
                sec_i = len(sections)
                sections.append((si, sec_idx))
                subj_sections[si].append(sec_i)

        # ──────────── BUILD THE CP-SAT MODEL ────────────
        model = cp_model.CpModel()
        num_sections = len(sections)
        num_teachers = len(teachers)
        num_rooms = len(classrooms)
        num_p = len(period_names)
        num_st = len(students)

        # Variables: Section Assignment x[section, teacher, room, period]
        x = {}
        # Variables: Student Section Assignment y[student, section]
        y = {}
        # Intermediate Variables: Section at Period p
        sec_period = {}
        # Intermediate Variables: Student at Period p
        st_period = {}

        for sec_i, (si, sec_idx) in enumerate(sections):
            subj = subjects[si]
            for t in subject_teachers[si]:
                for r in subject_room_restriction[si]:
                    for p in range(num_p):
                        # Period Restriction Check
                        if si in subject_period_restriction:
                            if (p + 1) not in subject_period_restriction[si]: 
                                continue

                        x[sec_i, t, r, p] = model.NewBoolVar(f"x_sec{sec_i}_t{t}_r{r}_p{p}")

        for sti in range(num_st):
            for si, subj in enumerate(subjects):
                if sti in subject_students_pool.get(si, []):
                    for sec_i in subj_sections[si]:
                        y[sti, sec_i] = model.NewBoolVar(f"y_st{sti}_sec{sec_i}")

        for sec_i in range(num_sections):
            for p in range(num_p):
                sec_period[sec_i, p] = model.NewBoolVar(f"sec{sec_i}_p{p}")
                si_for_sec = sections[sec_i][0]
                relevant_x = [x[sec_i, t, r, p] for t in subject_teachers[si_for_sec] for r in subject_room_restriction[si_for_sec] if (sec_i, t, r, p) in x]
                if relevant_x:
                    model.Add(sec_period[sec_i, p] == sum(relevant_x))
                else:
                    model.Add(sec_period[sec_i, p] == 0)

        for sti in range(num_st):
            for p in range(num_p):
                st_period[sti, p] = model.NewBoolVar(f"st{sti}_p{p}")
                # Student is at period p if they are in ANY section that is at period p
                # st_period[sti, p] == OR(y[sti, sec_i] AND sec_period[sec_i, p])
                active_sec_vars = []
                for si, sec_list in subj_sections.items():
                    if sti in subject_students_pool.get(si, []):
                        for sec_i in sec_list:
                            # is_in_sec_at_p = y[sti, sec_i] AND sec_period[sec_i, p]
                            is_in_p = model.NewBoolVar(f"st{sti}_sec{sec_i}_p{p}")
                            model.Add(is_in_p == 1).OnlyEnforceIf([y[sti, sec_i], sec_period[sec_i, p]])
                            model.Add(is_in_p == 0).OnlyEnforceIf(y[sti, sec_i].Not())
                            model.Add(is_in_p == 0).OnlyEnforceIf(sec_period[sec_i, p].Not())
                            active_sec_vars.append(is_in_p)
                
                if active_sec_vars:
                    model.Add(st_period[sti, p] == sum(active_sec_vars))
                else:
                    model.Add(st_period[sti, p] == 0)

        # ── HARD CONSTRAINTS ──

        # 1. Section Continuity and Student Requirements
        all_section_sums = []
        for sec_i, (si, _) in enumerate(sections):
            req_p = min(subjects[si].get("required_periods_per_week", 1), num_p)
            vars_for_section = [x[sec_i, t, r, p] for t in subject_teachers[si] for r in range(num_rooms) for p in range(num_p) if (sec_i, t, r, p) in x]
            if not vars_for_section:
                excluded_conflicts.append(ConflictItem(type="NO_VALID_ASSIGNMENT", description=f"No valid assignment for {subjects[si].get('name','')}", affected_ids=[subjects[si]["subject_id"]]))
                continue
            section_sum = sum(vars_for_section)
            model.Add(section_sum >= 1)
            model.Add(section_sum <= req_p)
            all_section_sums.append(section_sum)

        if all_section_sums:
            model.Maximize(sum(all_section_sums))

        # 2. Student Subject Fulfillment
        for si, students_in_pool in subject_students_pool.items():
            for sti in students_in_pool:
                # Each student in the pool must be assigned to exactly ONE section of that subject
                relevant_y = [y[sti, sec_i] for sec_i in subj_sections[si]]
                model.Add(sum(relevant_y) == 1)

        # 3. Dynamic Room Capacity (Optimized)
        # Instead of creating implications for every (t, p) combination, 
        # we check if a section is EVER assigned to a room.
        for sec_i, (si, _) in enumerate(sections):
            relevant_students = [y[sti, sec_i] for sti in subject_students_pool.get(si, [])]
            if not relevant_students:
                continue

            for r in range(num_rooms):
                room_cap = classrooms[r].get("capacity", 30)
                
                # Gather all assignments for this section in this room across all periods and teachers
                vars_in_room = [
                    x[sec_i, t, r, p]
                    for t in subject_teachers[si]
                    for p in range(num_p)
                    if (sec_i, t, r, p) in x
                ]
                
                if vars_in_room:
                    # Create a boolean that is true if the section uses this room at least once
                    sec_uses_room = model.NewBoolVar(f"sec{sec_i}_uses_r{r}")
                    model.AddMaxEquality(sec_uses_room, vars_in_room)
                    
                    # Enforce capacity only if the room is used
                    model.Add(sum(relevant_students) <= room_cap).OnlyEnforceIf(sec_uses_room)

        # 4. No Overlaps (Teachers & Rooms - Optimized using AddAtMostOne)
        for t in range(num_teachers):
            for p in range(num_p):
                model.AddAtMostOne([
                    x[sec_i, t, r, p] 
                    for sec_i, (si, _) in enumerate(sections) 
                    for r in range(num_rooms) 
                    if (sec_i, t, r, p) in x
                ])
        
        for r in range(num_rooms):
            for p in range(num_p):
                model.AddAtMostOne([
                    x[sec_i, t, r, p] 
                    for sec_i, (si, _) in enumerate(sections) 
                    for t in subject_teachers[si] 
                    if (sec_i, t, r, p) in x
                ])

        # 5. Consecutive Limits (Teachers & Students)
        max_consecutive = settings.get("max_consecutive_periods", 3)
        for t in range(num_teachers):
            teacher_p_vars = []
            for p in range(num_p):
                active_p = model.NewBoolVar(f"t{t}_act_p{p}")
                p_vars = [x[sec_i, t, r, p] for sec_i, (si, _) in enumerate(sections) for r in range(num_rooms) if (sec_i, t, r, p) in x]
                if p_vars: model.Add(active_p == sum(p_vars))
                else: model.Add(active_p == 0)
                teacher_p_vars.append(active_p)
                if (p + 1) in teachers[t].get("off_times", []): model.Add(active_p == 0)
            if num_p > max_consecutive:
                for start in range(num_p - max_consecutive):
                    model.Add(sum(teacher_p_vars[start : start + max_consecutive + 1]) <= max_consecutive)

        # 6. Teacher max workload (Weekly)
        for t in range(num_teachers):
            max_p = teachers[t].get("max_periods_per_week", 25)
            # Automatic Prep Period adjustment: if 4 periods/day and 5 days, 
            # 1.0 FTE should be 15 periods/week max.
            if num_p == 4 and max_p > 15:
                max_p = 15
            
            model.Add(
                sum(
                    x[sec_i, t, r, p]
                    for sec_i, (si, _) in enumerate(sections)
                    for r in range(num_rooms)
                    for p in range(num_p)
                    if (sec_i, t, r, p) in x
                ) <= max_p
            )

        for sti in range(num_st):
            # 7a. Student No-Overlap: A student can be in at most 1 class per period
            for p in range(num_p):
                model.Add(st_period[sti, p] <= 1)

            # 7b. Student Consecutive Limit
            if num_p > max_consecutive:
                for start in range(num_p - max_consecutive):
                    model.Add(sum(st_period[sti, p] for p in range(start, start + max_consecutive + 1)) <= max_consecutive)

        # ── SOLVE ──
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(model)

        conflicts = excluded_conflicts
        assignments = []

        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            for sec_i, (si, sec_idx) in enumerate(sections):
                for t in subject_teachers[si]:
                    for r in range(num_rooms):
                        for p in range(num_p):
                            if (sec_i, t, r, p) in x and solver.Value(x[sec_i, t, r, p]):
                                # Find students assigned to this section
                                enrolled_ids = [
                                    students[sti]["student_id"]
                                    for sti in subject_students_pool.get(si, [])
                                    if solver.Value(y[sti, sec_i])
                                ]
                                assignments.append(ScheduleAssignment(
                                    period_name=period_names[p],
                                    subject_id=subjects[si]["subject_id"],
                                    teacher_id=teachers[t]["teacher_id"],
                                    room_id=classrooms[r]["room_id"],
                                    enrolled_student_ids=enrolled_ids,
                                ))
        else:
            # Heuristic Diagnostics for INFEASIBLE state
            infeasible_reason = "Solver failed to find a valid schedule. "
            
            # Check 1: Teacher Capacity
            total_req_periods = sum(min(subjects[s].get("required_periods_per_week", 1), num_p) * len(sec_list) for s, sec_list in subj_sections.items())
            total_teacher_capacity = sum(min(t.get("max_periods_per_week", 25), num_p * 5) for t in teachers)
            if total_req_periods > total_teacher_capacity:
                infeasible_reason += f"Not enough teacher capacity (Need {total_req_periods} periods, but teachers can only teach {total_teacher_capacity} periods total). "
            
            # Check 2: Facility Capacity (Rough estimation)
            for ftype, rooms in facility_rooms.items():
                if ftype == "REGULAR": continue # Usually plenty
                req_facility_periods = sum(min(subjects[s].get("required_periods_per_week", 1), num_p) * len(sec_list) for s, sec_list in subj_sections.items() if get_facility(subjects[s]) == ftype)
                avail_facility_periods = len(rooms) * num_p * 5 # Assuming 5 days a week
                if req_facility_periods > avail_facility_periods:
                     infeasible_reason += f"Not enough {ftype} capacity (Need {req_facility_periods} room-periods, but only {avail_facility_periods} available). "

            if infeasible_reason == "Solver failed to find a valid schedule. ":
                infeasible_reason += "Common causes: Highly restricted teacher off-times, or specific teachers are required for too many overlapping subjects."

            conflicts.append(ConflictItem(
                type="INFEASIBLE",
                description=infeasible_reason,
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
        
        try:
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
        except Exception as e:
            if self.school_id == "demo-school":
                # In demo mode, we can fail silently on save as long as we return the result
                pass
            else:
                raise e

        return ScheduleGenerateResponse(
            schedule_id=schedule_id,
            status="DRAFT",
            message=f"Generated {len(assignments)} classes across {len(sections)} sections" + (f" ({len(conflicts)} conflicts)" if conflicts else ""),
            conflict_report=conflict_report,
        )
