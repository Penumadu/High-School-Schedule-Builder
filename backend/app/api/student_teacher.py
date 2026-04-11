"""Student and Teacher facing API routes."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.core.auth import get_current_user, require_role
from app.core.firebase import get_firestore_client

router = APIRouter(tags=["Student & Teacher"])


# ──────────────────────── STUDENT ROUTES ────────────────────────

@router.post("/rules/validate-student")
async def validate_student_choices(
    payload: Dict[str, Any],
    user: dict = Depends(get_current_user),
):
    """
    Real-time validation of a student's course choices against the rules engine.
    Payload: { "student_id": "...", "school_id": "...", "requested_subjects": ["sub_1", ...] }
    """
    db = get_firestore_client()
    school_id = payload.get("school_id", user.get("school_id", ""))
    student_id = payload.get("student_id", "")
    requested = payload.get("requested_subjects", [])

    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")

    school_ref = db.collection("schools").document(school_id)

    # Load student's historical grades
    student_doc = school_ref.collection("students").document(student_id).get()
    historical_grades = {}
    if student_doc.exists:
        historical_grades = student_doc.to_dict().get("historical_grades", {})

    # Load rules
    rules = {}
    for doc in school_ref.collection("rules").stream():
        data = doc.to_dict()
        rules[data.get("target_subject_id", "")] = data.get("logic_tree", {})

    # Validate each requested subject
    rejections = []
    for subj_id in requested:
        if subj_id in rules:
            logic = rules[subj_id]
            conditions = logic.get("rules", [])
            condition_type = logic.get("condition", "AND")

            results = []
            for cond in conditions:
                prereq = cond.get("prerequisite", "")
                operator = cond.get("operator", ">=")
                threshold = cond.get("value", 0)
                actual = historical_grades.get(prereq, None)

                if actual is None:
                    results.append(False)
                elif operator == ">=" and actual < threshold:
                    results.append(False)
                elif operator == ">" and actual <= threshold:
                    results.append(False)
                else:
                    results.append(True)

            passed = all(results) if condition_type == "AND" else any(results)

            if not passed:
                rejections.append({
                    "subject": subj_id,
                    "reason": f"Grade prerequisite not met for {subj_id}",
                    "details": logic,
                })

    return {
        "valid": len(rejections) == 0,
        "rejections": rejections,
    }


@router.get("/student/{school_id}/schedule")
async def get_student_schedule(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Get the current user's personal schedule."""
    db = get_firestore_client()
    student_uid = user["uid"]

    # Find the student profile
    students = db.collection("schools").document(school_id) \
        .collection("students").where("user_id", "==", student_uid).stream()

    student = None
    for doc in students:
        student = doc.to_dict()
        student["student_id"] = doc.id
        break

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get published schedules
    schedules = db.collection("schools").document(school_id) \
        .collection("schedules").where("status", "==", "PUBLISHED").stream()

    my_schedule = []
    for sched_doc in schedules:
        sched = sched_doc.to_dict()
        for assignment in sched.get("assignments", []):
            if student["student_id"] in assignment.get("enrolled_student_ids", []):
                my_schedule.append({
                    "period_name": assignment["period_name"],
                    "subject_id": assignment["subject_id"],
                    "teacher_id": assignment["teacher_id"],
                    "room_id": assignment["room_id"],
                    "semester": sched.get("semester"),
                })

    return {"student_id": student["student_id"], "schedule": my_schedule}


@router.put("/student/{school_id}/choices")
async def update_student_choices(
    school_id: str,
    payload: Dict[str, Any],
    user: dict = Depends(get_current_user),
):
    """Update a student's course selections."""
    db = get_firestore_client()
    student_id = payload.get("student_id", "")
    new_choices = payload.get("requested_subjects", [])

    ref = db.collection("schools").document(school_id) \
        .collection("students").document(student_id)

    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Student not found")

    ref.update({"requested_subjects": new_choices})
    return {"message": "Choices updated", "requested_subjects": new_choices}


# ──────────────────────── TEACHER ROUTES ────────────────────────

@router.get("/teacher/{school_id}/schedule")
async def get_teacher_schedule(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Get the current teacher's personal schedule."""
    db = get_firestore_client()
    teacher_uid = user["uid"]

    # Find teacher profile
    teachers = db.collection("schools").document(school_id) \
        .collection("teachers").where("user_id", "==", teacher_uid).stream()

    teacher = None
    for doc in teachers:
        teacher = doc.to_dict()
        teacher["teacher_id"] = doc.id
        break

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Get published schedules
    schedules = db.collection("schools").document(school_id) \
        .collection("schedules").where("status", "==", "PUBLISHED").stream()

    my_schedule = []
    for sched_doc in schedules:
        sched = sched_doc.to_dict()
        for assignment in sched.get("assignments", []):
            if assignment.get("teacher_id") == teacher["teacher_id"]:
                my_schedule.append({
                    "period_name": assignment["period_name"],
                    "subject_id": assignment["subject_id"],
                    "room_id": assignment["room_id"],
                    "enrolled_student_ids": assignment.get("enrolled_student_ids", []),
                    "semester": sched.get("semester"),
                })

    return {"teacher_id": teacher["teacher_id"], "schedule": my_schedule}


@router.post("/teacher/{school_id}/attendance")
async def submit_attendance(
    school_id: str,
    payload: Dict[str, Any],
    user: dict = Depends(require_role("TEACHER", "PRINCIPAL", "COORDINATOR")),
):
    """Submit attendance for a specific period."""
    db = get_firestore_client()
    import uuid

    attendance_id = f"att_{uuid.uuid4().hex[:8]}"
    data = {
        "schedule_id": payload.get("schedule_id", ""),
        "date": payload.get("date", ""),
        "period_name": payload.get("period_name", ""),
        "absent_student_ids": payload.get("absent_student_ids", []),
        "submitted_by": user["uid"],
    }

    db.collection("schools").document(school_id) \
        .collection("attendance").document(attendance_id).set(data)

    return {"message": "Attendance recorded", "attendance_id": attendance_id}


@router.get("/teacher/{school_id}/roster/{period_name}")
async def get_class_roster(
    school_id: str,
    period_name: str,
    user: dict = Depends(get_current_user),
):
    """Get the class roster for a specific period."""
    db = get_firestore_client()
    teacher_uid = user["uid"]

    # Find teacher
    teachers = db.collection("schools").document(school_id) \
        .collection("teachers").where("user_id", "==", teacher_uid).stream()

    teacher = None
    for doc in teachers:
        teacher = doc.to_dict()
        teacher["teacher_id"] = doc.id
        break

    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher profile not found")

    # Find the assignment for this period
    schedules = db.collection("schools").document(school_id) \
        .collection("schedules").where("status", "==", "PUBLISHED").stream()

    roster = []
    for sched_doc in schedules:
        sched = sched_doc.to_dict()
        for assignment in sched.get("assignments", []):
            if (assignment.get("teacher_id") == teacher["teacher_id"]
                    and assignment.get("period_name") == period_name):
                # Fetch student details
                for sid in assignment.get("enrolled_student_ids", []):
                    s_doc = db.collection("schools").document(school_id) \
                        .collection("students").document(sid).get()
                    if s_doc.exists:
                        s_data = s_doc.to_dict()
                        roster.append({
                            "student_id": sid,
                            "first_name": s_data.get("first_name", ""),
                            "last_name": s_data.get("last_name", ""),
                        })

    return {"period": period_name, "roster": roster}
