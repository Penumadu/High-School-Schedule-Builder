"""Admin CRUD routes for staff, subjects, classrooms, students, and rules."""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import List
import uuid
import io


from app.core.auth import get_current_user, require_role
from app.core.firebase import get_firestore_client
from app.models.admin import (
    TeacherCreate, TeacherUpdate, TeacherResponse,
    SubjectCreate, SubjectUpdate, SubjectResponse,
    ClassroomCreate, ClassroomUpdate, ClassroomResponse,
    StudentCreate, StudentUpdate, StudentResponse,
    RuleCreate, RuleUpdate, RuleResponse,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/templates/{import_type}")
async def download_template(
    import_type: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """Generate and return an Excel template for bulk imports."""
    columns = []
    samples = []
    
    if import_type == "staff":
        columns = ["first_name", "last_name", "email", "specializations", "max_periods_per_week", "off_times"]
        samples = [
            ["John", "Doe", "john@school.edu", "MATH101,ALG-1", 25, "1,2"],
            ["Jane", "Smith", "jane@school.edu", "PHYS-9,CHEM-10", 22, "8"]
        ]
    elif import_type == "subjects":
        columns = ["code", "name", "grade_level", "required_periods_per_week", "facility_type"]
        samples = [
            ["MATH101", "Algebra II", 10, 5, "REGULAR"],
            ["SCI-B1", "Biology Lab", 11, 4, "LAB"]
        ]
    elif import_type == "students":
        columns = ["first_name", "last_name", "email", "grade_level", "requested_subjects"]
        samples = [
            ["Alice", "Wonder", "alice@stu.edu", 10, "MATH101,ENG10,PE-1"],
            ["Bob", "Builder", "bob@stu.edu", 9, "ALG-1,SCI-B1"]
        ]
    elif import_type == "classrooms":
        columns = ["code", "name", "capacity", "facility_type"]
        samples = [
            ["RM101", "Math Wing - A", 30, "REGULAR"],
            ["LAB-3", "Chemistry Lab", 24, "LAB"]
        ]
    else:
        raise HTTPException(status_code=400, detail="Invalid import type")

    import pandas as pd
    df = pd.DataFrame(samples, columns=columns)
    
    # Write to Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
    
    output.seek(0)
    
    headers = {
        'Content-Disposition': f'attachment; filename="{import_type}_template.xlsx"'
    }
    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers=headers
    )



def _school_ref(school_id: str):
    """Get a reference to a school's document."""
    db = get_firestore_client()
    return db.collection("schools").document(school_id)


from app.core.db import FirestoreRepo

def _repo(school_id: str, collection: str):
    return FirestoreRepo(school_id, collection)

# ──────────────────────── STAFF / TEACHERS ────────────────────────

@router.get("/{school_id}/staff", response_model=List[TeacherResponse])
async def list_staff(school_id: str, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    return [TeacherResponse(teacher_id=d["id"], **d) for d in _repo(school_id, "teachers").list_all()]

@router.post("/{school_id}/staff", response_model=TeacherResponse)
async def create_teacher(school_id: str, teacher: TeacherCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    t_id = f"teacher_{uuid.uuid4().hex[:8]}"
    data = {**teacher.model_dump(), "is_active": True}
    res = _repo(school_id, "teachers").upsert(t_id, data)
    return TeacherResponse(**{**res, "teacher_id": t_id})

@router.put("/{school_id}/staff/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(school_id: str, teacher_id: str, update: TeacherUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "teachers").upsert(teacher_id, update.model_dump(exclude_unset=True))
    return TeacherResponse(**{**data, "teacher_id": teacher_id})

# ──────────────────────── SUBJECTS ────────────────────────

@router.get("/{school_id}/subjects", response_model=List[SubjectResponse])
async def list_subjects(school_id: str, user: dict = Depends(get_current_user)):
    return [SubjectResponse(**{**d, "subject_id": d.get("subject_id") or d["id"]}) for d in _repo(school_id, "subjects").list_all()]

@router.post("/{school_id}/subjects", response_model=SubjectResponse)
async def create_subject(school_id: str, subject: SubjectCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    s_id = f"subj_{uuid.uuid4().hex[:8]}"
    res = _repo(school_id, "subjects").upsert(s_id, subject.model_dump())
    return SubjectResponse(**{**res, "subject_id": s_id})


@router.put("/{school_id}/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(school_id: str, subject_id: str, update: SubjectUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "subjects").upsert(subject_id, update.model_dump(exclude_unset=True))
    return SubjectResponse(**{**data, "subject_id": subject_id})


@router.delete("/{school_id}/subjects/{subject_id}")
async def delete_subject(
    school_id: str,
    subject_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    ref = _school_ref(school_id).collection("subjects").document(subject_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Subject not found")
    ref.delete()
    return {"message": f"Subject '{subject_id}' deleted"}


@router.get("/{school_id}/classrooms", response_model=List[ClassroomResponse])
async def list_classrooms(school_id: str, user: dict = Depends(get_current_user)):
    return [ClassroomResponse(**{**d, "room_id": d.get("room_id") or d["id"]}) for d in _repo(school_id, "classrooms").list_all()]

@router.post("/{school_id}/classrooms", response_model=ClassroomResponse)
async def create_classroom(school_id: str, classroom: ClassroomCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    r_id = f"room_{uuid.uuid4().hex[:8]}"
    res = _repo(school_id, "classrooms").upsert(r_id, classroom.model_dump())
    return ClassroomResponse(**{**res, "room_id": r_id})

@router.put("/{school_id}/classrooms/{room_id}", response_model=ClassroomResponse)
async def update_classroom(school_id: str, room_id: str, update: ClassroomUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "classrooms").upsert(room_id, update.model_dump(exclude_unset=True))
    return ClassroomResponse(room_id=room_id, **data)

# ──────────────────────── STUDENTS ────────────────────────

@router.get("/{school_id}/students", response_model=List[StudentResponse])
async def list_students(school_id: str, grade: int = None, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR"))):
    data = _repo(school_id, "students").list_all()
    if grade: data = [d for d in data if d.get("grade_level") == grade]
    return [StudentResponse(**{**d, "student_id": d.get("student_id") or d["id"]}) for d in data]

@router.post("/{school_id}/students", response_model=StudentResponse)
async def create_student(school_id: str, student: StudentCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR"))):
    s_id = f"stu_{uuid.uuid4().hex[:8]}"
    data = {**student.model_dump(), "last_schedule_email_status": "PENDING"}
    res = _repo(school_id, "students").upsert(s_id, data)
    return StudentResponse(**{**res, "student_id": s_id})

@router.put("/{school_id}/students/{student_id}", response_model=StudentResponse)
async def update_student(school_id: str, student_id: str, update: StudentUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR"))):
    data = _repo(school_id, "students").upsert(student_id, update.model_dump(exclude_unset=True))
    return StudentResponse(**{**data, "student_id": student_id})


# ──────────────────────── RULES ────────────────────────

@router.get("/{school_id}/rules", response_model=List[RuleResponse])
async def list_rules(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    ref = _school_ref(school_id).collection("rules")
    docs = ref.stream()
    return [RuleResponse(**{**d.to_dict(), "rule_id": d.id}) for d in docs]


@router.post("/{school_id}/rules", response_model=RuleResponse)
async def create_rule(
    school_id: str,
    rule: RuleCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    rule_id = f"rule_{uuid.uuid4().hex[:8]}"
    data = rule.model_dump()
    _school_ref(school_id).collection("rules").document(rule_id).set(data)
    return RuleResponse(**{**data, "rule_id": rule_id})


@router.get("/{school_id}/rules/{rule_id}", response_model=RuleResponse)
async def get_rule(
    school_id: str,
    rule_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    ref = _school_ref(school_id).collection("rules").document(rule_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Rule not found")
    data = doc.to_dict()
    return RuleResponse(**{**data, "rule_id": doc.id})


@router.put("/{school_id}/rules/{rule_id}", response_model=RuleResponse)
async def update_rule(
    school_id: str,
    rule_id: str,
    update: RuleUpdate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    ref = _school_ref(school_id).collection("rules").document(rule_id)
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    ref.set(update_data, merge=True)
    
    updated = ref.get().to_dict()
    return RuleResponse(**{**updated, "rule_id": rule_id})


@router.delete("/{school_id}/rules/{rule_id}")
async def delete_rule(
    school_id: str,
    rule_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    ref = _school_ref(school_id).collection("rules").document(rule_id)
    if not ref.get().exists:
        raise HTTPException(status_code=404, detail="Rule not found")
    ref.delete()
    return {"message": f"Rule '{rule_id}' deleted"}


@router.get("/{school_id}/stats")
async def get_school_stats(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Optimized stats fetch using Firestore Aggregation queries.
    Drastically reduces Read Quota usage from O(N) to O(1).
    """
    ref = _school_ref(school_id)
    
    # Run counts on the server side
    try:
        students_count = ref.collection("students").count().get()[0][0].value
        staff_count = ref.collection("teachers").count().get()[0][0].value
        subjects_count = ref.collection("subjects").count().get()[0][0].value
        classrooms_count = ref.collection("classrooms").count().get()[0][0].value
        
        return {
            "students": students_count,
            "staff": staff_count,
            "subjects": subjects_count,
            "classrooms": classrooms_count
        }
    except Exception as e:
        # Fallback if Firestore client doesn't support count() in some environments
        print(f"Stats optimization failed: {e}")
        return {"students": 0, "staff": 0, "subjects": 0, "classrooms": 0}


# ──────────────────────── SCHOOL SETTINGS ────────────────────────

@router.get("/{school_id}/settings", response_model=dict)
async def get_school_settings(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """Fetch current school settings."""
    doc = _school_ref(school_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="School not found")
    
    data = doc.to_dict()
    return data.get("settings", {})


@router.put("/{school_id}/settings", response_model=dict)
async def update_school_settings(
    school_id: str,
    settings: dict,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    """Update school-specific scheduling policies."""
    _school_ref(school_id).update({"settings": settings})
    return settings


# ──────────────────────── GUIDANCE / COURSE SELECTION OVERSIGHT ────────────────────────

@router.get("/{school_id}/guidance/status")
async def get_guidance_status(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """Fetch completion status of student course selections."""
    db = get_firestore_client()
    students_ref = _school_ref(school_id).collection("students")
    
    docs = students_ref.stream()
    students = []
    total = 0
    submitted = 0
    
    course_demand = {} # code -> count

    for doc in docs:
        data = doc.to_dict()
        total += 1
        choices = data.get("requested_subjects", [])
        has_submitted = len(choices) > 0
        if has_submitted:
            submitted += 1
            for code in choices:
                course_demand[code] = course_demand.get(code, 0) + 1
        
        students.append({
            "id": doc.id,
            "name": f"{data.get('first_name', '')} {data.get('last_name', '')}",
            "grade": data.get("grade_level"),
            "status": "SUBMITTED" if has_submitted else "PENDING",
            "choice_count": len(choices)
        })

    # Sort demand
    sorted_demand = sorted(course_demand.items(), key=lambda x: x[1], reverse=True)

    return {
        "total_students": total,
        "submitted_count": submitted,
        "pending_count": total - submitted,
        "completion_rate": (submitted / total * 100) if total > 0 else 0,
        "students": students,
        "top_demanded_courses": sorted_demand[:10]
    }


@router.get("/{school_id}/export/schedule")
async def export_master_schedule(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """Generate a master Excel export of all published schedules."""
    import pandas as pd
    import io
    from fastapi.responses import StreamingResponse
    
    db = get_firestore_client()
    schedules = db.collection("schools").document(school_id) \
        .collection("schedules").where("status", "==", "PUBLISHED").stream()
        
    rows = []
    for doc in schedules:
        data = doc.to_dict()
        semester = data.get("semester", "1")
        for asgn in data.get("assignments", []):
            rows.append({
                "Semester": semester,
                "Period": asgn.get("period_name", "").replace("_", " "),
                "Subject Code": asgn.get("subject_id"),
                "Teacher ID": asgn.get("teacher_id"),
                "Room": asgn.get("room_id"),
                "Enrollment": len(asgn.get("enrolled_student_ids", []))
            })
            
    if not rows:
        raise HTTPException(status_code=404, detail="No published schedules found to export")
        
    df = pd.DataFrame(rows)
    
    # Create Excel in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Master Schedule')
    
    output.seek(0)
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Master_Schedule_{school_id}.xlsx"}
    )
