"""Pydantic models for admin CRUD operations (staff, subjects, classrooms, students, rules)."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ---------- STAFF / TEACHERS ----------

class TeacherCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    subject: str
    subject_code: str
    specializations: List[str] = Field(default_factory=list)
    max_periods_per_week: int = Field(default=25, ge=1, le=40)
    off_times: List[int] = Field(default_factory=list, description="Period indices (1-indexed) where teacher is busy")


class TeacherUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    subject: Optional[str] = None
    subject_code: Optional[str] = None
    specializations: Optional[List[str]] = None
    max_periods_per_week: Optional[int] = None
    is_active: Optional[bool] = None
    off_times: Optional[List[int]] = None


class TeacherResponse(BaseModel):
    id: str
    teacher_id: str
    user_id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    subject: str = "General"
    subject_code: str = "GEN"
    specializations: List[str] = []
    max_periods_per_week: int = 25
    is_active: bool = True
    off_times: List[int] = []


# ---------- SUBJECTS ----------

class SubjectCreate(BaseModel):
    name: str = Field(..., description="Subject name from JSON")
    code: str = Field(..., description="Course Code from JSON")
    grade_level: str = Field(..., description="Grade from JSON (e.g. 'Grade 10')")
    credits: str = Field(default="1 Credit", description="Credits from JSON")
    level: str = Field(default="Open", description="Level from JSON")
    department: str = Field(default="General", description="Department from JSON")
    prerequisites: str = Field(default="", description="Pre-requisites from JSON")
    required_periods_per_week: int = Field(default=5, ge=1, le=10)
    facility_type: str = Field(default="REGULAR", description="e.g. REGULAR, LAB, GYM")
    is_mandatory: bool = Field(default=False, description="If true, all students in the grade are enrolled")


class SubjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    grade_level: Optional[str] = None
    credits: Optional[str] = None
    level: Optional[str] = None
    department: Optional[str] = None
    prerequisites: Optional[str] = None
    required_periods_per_week: Optional[int] = None
    facility_type: Optional[str] = None
    is_mandatory: Optional[bool] = None


class SubjectResponse(BaseModel):
    id: str
    subject_id: str
    name: str = ""
    code: str = ""
    grade_level: str = "Grade 10"
    credits: str = "1 Credit"
    level: str = "Open"
    department: str = "General"
    prerequisites: str = ""
    required_periods_per_week: int = 5
    facility_type: str = "REGULAR"
    is_mandatory: bool = False


# ---------- CLASSROOMS ----------

class ClassroomCreate(BaseModel):
    name: str
    code: str
    capacity: int = Field(default=30, ge=1, le=500)
    facility_type: str = Field(default="REGULAR")
    is_gym: bool = Field(default=False)


class ClassroomUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    capacity: Optional[int] = None
    facility_type: Optional[str] = None
    is_gym: Optional[bool] = None


class ClassroomResponse(BaseModel):
    id: str
    room_id: str
    name: str = ""
    code: str = ""
    capacity: int = 30
    facility_type: str = "REGULAR"
    is_gym: bool = False


# ---------- STUDENTS ----------

class StudentCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    grade_level: int = Field(ge=9, le=12)
    historical_grades: Dict[str, float] = Field(default_factory=dict)
    requested_subjects: List[str] = Field(default_factory=list)
    prerequisite_waivers: List[str] = Field(default_factory=list, description="Subject IDs where academic rules are waived")
    is_approved: bool = Field(default=False)


class StudentUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    grade_level: Optional[int] = None
    historical_grades: Optional[Dict[str, float]] = None
    requested_subjects: Optional[List[str]] = None
    prerequisite_waivers: Optional[List[str]] = None
    is_approved: Optional[bool] = None


class StudentResponse(BaseModel):
    id: str
    student_id: str
    user_id: Optional[str] = None
    first_name: str = ""
    last_name: str = ""
    email: str = ""
    grade_level: int = 9
    historical_grades: Dict[str, float] = {}
    requested_subjects: List[str] = []
    prerequisite_waivers: List[str] = []
    is_approved: bool = False
    last_schedule_email_status: str = "PENDING"


# ---------- RULES ----------

class RuleCondition(BaseModel):
    prerequisite: str
    operator: str = Field(default=">=", description="Comparison operator")
    value: float = Field(description="Grade threshold")


class RuleCreate(BaseModel):
    target_subject_id: str
    logic_tree: Dict[str, Any] = Field(
        ...,
        description="JSON logic tree, e.g. {'condition': 'AND', 'rules': [...]}"
    )


class RuleResponse(BaseModel):
    rule_id: str
    target_subject_id: str
    logic_tree: Dict[str, Any]


class RuleUpdate(BaseModel):
    target_subject_id: Optional[str] = None
    logic_tree: Optional[Dict[str, Any]] = None


# ---------- VALIDATION / IMPORT ----------

class ValidationError(BaseModel):
    row: int
    field: str
    message: str
    severity: str = "error"  # "error" or "warning"


class ValidationReport(BaseModel):
    total_rows: int
    valid_rows: int
    errors: List[ValidationError]
    warnings: List[ValidationError]
    is_valid: bool


class ImportCommitRequest(BaseModel):
    import_type: str = Field(
        ..., description="One of: 'staff', 'subjects', 'student_choices'"
    )
    data: List[Dict[str, Any]]
    school_id: str
