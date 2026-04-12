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


# ──────────────────────── STAFF / TEACHERS ────────────────────────

@router.get("/{school_id}/staff", response_model=List[TeacherResponse])
async def list_staff(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    ref = _school_ref(school_id).collection("teachers")
    docs = ref.stream()
    return [TeacherResponse(teacher_id=d.id, **d.to_dict()) for d in docs]


@router.post("/{school_id}/staff", response_model=TeacherResponse)
async def create_teacher(
    school_id: str,
    teacher: TeacherCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    teacher_id = f"teacher_{uuid.uuid4().hex[:8]}"
    data = teacher.model_dump()
    data["is_active"] = True
    _school_ref(school_id).collection("teachers").document(teacher_id).set(data)
    return TeacherResponse(teacher_id=teacher_id, **data)


@router.put("/{school_id}/staff/{teacher_id}", response_model=TeacherResponse)
async def update_teacher(
    school_id: str,
    teacher_id: str,
    update: TeacherUpdate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    ref = _school_ref(school_id).collection("teachers").document(teacher_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    ref.update(update_data)

    updated = ref.get().to_dict()
    return TeacherResponse(teacher_id=teacher_id, **updated)


# ──────────────────────── SUBJECTS ────────────────────────

@router.get("/{school_id}/subjects", response_model=List[SubjectResponse])
async def list_subjects(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    ref = _school_ref(school_id).collection("subjects")
    docs = ref.stream()
    return [SubjectResponse(subject_id=d.id, **d.to_dict()) for d in docs]


@router.post("/{school_id}/subjects", response_model=SubjectResponse)
async def create_subject(
    school_id: str,
    subject: SubjectCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    subject_id = f"subj_{uuid.uuid4().hex[:8]}"
    data = subject.model_dump()
    _school_ref(school_id).collection("subjects").document(subject_id).set(data)
    return SubjectResponse(subject_id=subject_id, **data)


@router.put("/{school_id}/subjects/{subject_id}", response_model=SubjectResponse)
async def update_subject(
    school_id: str,
    subject_id: str,
    update: SubjectUpdate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    ref = _school_ref(school_id).collection("subjects").document(subject_id)
    doc = ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    ref.update(update_data)

    updated = ref.get().to_dict()
    return SubjectResponse(subject_id=subject_id, **updated)


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


# ──────────────────────── CLASSROOMS ────────────────────────

@router.get("/{school_id}/classrooms", response_model=List[ClassroomResponse])
async def list_classrooms(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    ref = _school_ref(school_id).collection("classrooms")
    docs = ref.stream()
    return [ClassroomResponse(room_id=d.id, **d.to_dict()) for d in docs]


@router.post("/{school_id}/classrooms", response_model=ClassroomResponse)
async def create_classroom(
    school_id: str,
    classroom: ClassroomCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    room_id = f"room_{uuid.uuid4().hex[:8]}"
    data = classroom.model_dump()
    _school_ref(school_id).collection("classrooms").document(room_id).set(data)
    return ClassroomResponse(room_id=room_id, **data)


# ──────────────────────── STUDENTS ────────────────────────

@router.get("/{school_id}/students", response_model=List[StudentResponse])
async def list_students(
    school_id: str,
    grade: int = None,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    ref = _school_ref(school_id).collection("students")
    if grade:
        ref = ref.where("grade_level", "==", grade)
    docs = ref.stream()
    return [StudentResponse(student_id=d.id, **d.to_dict()) for d in docs]


@router.post("/{school_id}/students", response_model=StudentResponse)
async def create_student(
    school_id: str,
    student: StudentCreate,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    student_id = f"stu_{uuid.uuid4().hex[:8]}"
    data = student.model_dump()
    data["last_schedule_email_status"] = "PENDING"
    _school_ref(school_id).collection("students").document(student_id).set(data)
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
