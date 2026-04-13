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
    ClassroomCreate, ClassroomResponse,
    StudentCreate, StudentResponse,
    RuleCreate, RuleResponse,
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
    return TeacherResponse(teacher_id=t_id, **_repo(school_id, "teachers").upsert(t_id, data))

@router.put("/{school_id}/staff/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(school_id: str, teacher_id: str, update: TeacherUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "teachers").upsert(teacher_id, update.model_dump(exclude_unset=True))
    return TeacherResponse(teacher_id=teacher_id, **data)

# ──────────────────────── SUBJECTS ────────────────────────

@router.get("/{school_id}/subjects", response_model=List[SubjectResponse])
async def list_subjects(school_id: str, user: dict = Depends(get_current_user)):
    return [SubjectResponse(subject_id=d["id"], **d) for d in _repo(school_id, "subjects").list_all()]

@router.post("/{school_id}/subjects", response_model=SubjectResponse)
async def create_subject(school_id: str, subject: SubjectCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    s_id = f"subj_{uuid.uuid4().hex[:8]}"
    return SubjectResponse(subject_id=s_id, **_repo(school_id, "subjects").upsert(s_id, subject.model_dump()))


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
    return [ClassroomResponse(room_id=d["id"], **d) for d in _repo(school_id, "classrooms").list_all()]

@router.post("/{school_id}/classrooms", response_model=ClassroomResponse)
async def create_classroom(school_id: str, classroom: ClassroomCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    r_id = f"room_{uuid.uuid4().hex[:8]}"
    return ClassroomResponse(room_id=r_id, **_repo(school_id, "classrooms").upsert(r_id, classroom.model_dump()))

@router.put("/{school_id}/classrooms/{room_id}", response_model=ClassroomResponse)
async def update_classroom(school_id: str, room_id: str, update: ClassroomUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "classrooms").upsert(room_id, update.model_dump(exclude_unset=True))
    return ClassroomResponse(room_id=room_id, **data)

# ──────────────────────── STUDENTS ────────────────────────

@router.get("/{school_id}/students", response_model=List[StudentResponse])
async def list_students(school_id: str, grade: int = None, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "students").list_all()
    if grade: data = [d for d in data if d.get("grade_level") == grade]
    return [StudentResponse(student_id=d["id"], **d) for d in data]

@router.post("/{school_id}/students", response_model=StudentResponse)
async def create_student(school_id: str, student: StudentCreate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    s_id = f"stu_{uuid.uuid4().hex[:8]}"
    data = {**student.model_dump(), "last_schedule_email_status": "PENDING"}
    return StudentResponse(student_id=s_id, **_repo(school_id, "students").upsert(s_id, data))

@router.put("/{school_id}/students/{student_id}", response_model=StudentResponse)
async def update_student(school_id: str, student_id: str, update: StudentUpdate, user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))):
    data = _repo(school_id, "students").upsert(student_id, update.model_dump(exclude_unset=True))
    return StudentResponse(student_id=student_id, **data)


# ──────────────────────── RULES ────────────────────────

@router.get("/{school_id}/rules", response_model=List[RuleResponse])
async def list_rules(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    ref = _school_ref(school_id).collection("rules")
    docs = ref.stream()
    return [RuleResponse(rule_id=d.id, **d.to_dict()) for d in docs]


@router.post("/{school_id}/rules", response_model=RuleResponse)
async def create_rule(
    school_id: str,
    rule: RuleCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    rule_id = f"rule_{uuid.uuid4().hex[:8]}"
    data = rule.model_dump()
    _school_ref(school_id).collection("rules").document(rule_id).set(data)
    return RuleResponse(rule_id=rule_id, **data)


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
    return RuleResponse(rule_id=doc.id, **doc.to_dict())


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
    return RuleResponse(rule_id=rule_id, **updated)


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
