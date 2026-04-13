"""Student and Teacher facing API routes."""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any

from app.core.auth import get_current_user, require_role
from app.core.firebase import get_firestore_client

router = APIRouter(tags=["Student & Teacher"])


# ──────────────────────── STUDENT ROUTES ────────────────────────

def _evaluate_subject_eligibility(subj_id: str, rules: dict, historical_grades: dict) -> Dict[str, Any]:
    """Helper to evaluate if a student meets prerequisites for a subject."""
    if subj_id not in rules:
        return {"eligible": True, "reason": None}
    
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
            results.append((False, f"Required course {prereq} not found in transcript"))
        elif operator == ">=" and actual < threshold:
            results.append((False, f"Grade in {prereq} ({actual}%) is below required {threshold}%"))
        elif operator == ">" and actual <= threshold:
            results.append((False, f"Grade in {prereq} ({actual}%) must be higher than {threshold}%"))
        else:
            results.append((True, None))

    if condition_type == "AND":
        passed = all(r[0] for r in results)
        failed_reasons = [r[1] for r in results if not r[0]]
        reason = "; ".join(failed_reasons) if not passed else None
    else:
        passed = any(r[0] for r in results)
        reason = "None of the alternate prerequisites met" if not passed else None
    
    return {"eligible": passed, "reason": reason}


@router.get("/student/{school_id}/eligibility/{student_id}")
async def get_student_eligibility(
    school_id: str,
    student_id: str,
    user: dict = Depends(get_current_user),
):
    """Calculate eligibility for ALL catalog subjects for a specific student."""
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)

    # 1. Load data
    student_doc = school_ref.collection("students").document(student_id).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="Student not found")
    
    student_data = student_doc.to_dict()
    historical_grades = student_data.get("historical_grades", {})
    
    # 2. Load subjects & rules
    subjects = [d.to_dict() for d in school_ref.collection("subjects").stream()]
    rules = {}
    for doc in school_ref.collection("rules").stream():
        data = doc.to_dict()
        rules[data.get("target_subject_id", "")] = data.get("logic_tree", {})

    # 3. Calculate for each
    eligibility_map = {}
    for subj in subjects:
        subj_id = subj.get("code") or subj.get("id") # Fallback to id if code missing
        if not subj_id: continue
        
        result = _evaluate_subject_eligibility(subj_id, rules, historical_grades)
        eligibility_map[subj_id] = result

    return {
        "student_id": student_id,
        "eligibility": eligibility_map
    }


@router.post("/rules/validate-student")
async def validate_student_choices(
    payload: Dict[str, Any],
    user: dict = Depends(get_current_user),
):
    """
    Real-time validation of a student's course choices against the rules engine.
    """
    db = get_firestore_client()
    school_id = payload.get("school_id") or user.get("school_id")
    student_id = payload.get("student_id")
    requested = payload.get("requested_subjects", [])

    if not school_id:
        raise HTTPException(status_code=400, detail="school_id is required")

    school_ref = db.collection("schools").document(school_id)
    student_doc = school_ref.collection("students").document(student_id).get()
    historical_grades = student_doc.to_dict().get("historical_grades", {}) if student_doc.exists else {}

    rules = {}
    for doc in school_ref.collection("rules").stream():
        data = doc.to_dict()
        rules[data.get("target_subject_id", "")] = data.get("logic_tree", {})

    rejections = []
    for subj_id in requested:
        check = _evaluate_subject_eligibility(subj_id, rules, historical_grades)
        if not check["eligible"]:
            rejections.append({
                "subject": subj_id,
                "reason": check["reason"]
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


@router.get("/admin/{school_id}/attendance/daily")
async def get_daily_attendance_report(
    school_id: str,
    date: str = None, # YYYY-MM-DD
    user: dict = Depends(require_role("PRINCIPAL", "COORDINATOR")),
):
    """Aggregate a list of all students marked absent today/specified date."""
    import datetime
    db = get_firestore_client()
    if not date:
        date = datetime.date.today().isoformat()
    
    # Query all attendance records for this date
    att_ref = db.collection("schools").document(school_id).collection("attendance")
    docs = att_ref.where("date", "==", date).stream()
    
    absences_by_student = {} # student_id -> [period_names]
    
    for doc in docs:
        data = doc.to_dict()
        period = data.get("period_name", "Unknown")
        for sid in data.get("absent_student_ids", []):
            if sid not in absences_by_student:
                absences_by_student[sid] = []
            absences_by_student[sid].append(period)
            
    # Enrich with student names
    report = []
    for sid, periods in absences_by_student.items():
        s_doc = db.collection("schools").document(school_id).collection("students").document(sid).get()
        s_data = s_doc.to_dict() if s_doc.exists else {}
        report.append({
            "student_id": sid,
            "name": f"{s_data.get('first_name', '')} {s_data.get('last_name', '')}",
            "grade": s_data.get("grade_level"),
            "periods_absent": periods,
            "total_periods": len(periods)
        })
        
    return {"date": date, "absentees": report}


@router.get("/student/{school_id}/attendance/summary")
async def get_student_attendance_summary(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Get total absence count and period list for the logged-in student."""
    db = get_firestore_client()
    student_uid = user["uid"]

    # 1. Find student_id
    students = db.collection("schools").document(school_id) \
        .collection("students").where("user_id", "==", student_uid).stream()
    
    student_id = None
    for doc in students:
        student_id = doc.id
        break
    
    if not student_id:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # 2. Query all attendance where student was absent
    att_ref = db.collection("schools").document(school_id).collection("attendance")
    docs = att_ref.where("absent_student_ids", "array_contains", student_id).stream()
    
    history = []
    for doc in docs:
        data = doc.to_dict()
        history.append({
            "date": data.get("date"),
            "period": data.get("period_name"),
        })

    return {
        "student_id": student_id,
        "total_absences": len(history),
        "history": sorted(history, key=lambda x: x["date"], reverse=True)
    }


@router.get("/teacher/{school_id}/attendance/history")
async def get_teacher_attendance_history(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """Get previous attendance submissions for the logged-in teacher."""
    db = get_firestore_client()
    teacher_uid = user["uid"]
    
    att_ref = db.collection("schools").document(school_id).collection("attendance")
    docs = att_ref.where("submitted_by", "==", teacher_uid).stream()
    
    history = []
    for doc in docs:
        data = doc.to_dict()
        data["id"] = doc.id
        history.append(data)
        
    return {"history": sorted(history, key=lambda x: x["date"], reverse=True)}


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
