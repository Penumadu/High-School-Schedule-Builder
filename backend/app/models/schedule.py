"""Pydantic models for the scheduling engine."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ScheduleStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class ScheduleGenerateRequest(BaseModel):
    school_id: str
    semester: int = Field(ge=1, le=2)


class ScheduleAssignment(BaseModel):
    period_name: str
    subject_id: str
    teacher_id: str
    room_id: str
    enrolled_student_ids: List[str]


class ConflictItem(BaseModel):
    type: str  # "UNASSIGNED_STUDENT", "CAPACITY_OVERFLOW", "TEACHER_OVERLOAD"
    description: str
    affected_ids: List[str] = Field(default_factory=list)


class ConflictReport(BaseModel):
    has_conflicts: bool
    total_conflicts: int
    conflicts: List[ConflictItem]


class ScheduleResponse(BaseModel):
    schedule_id: str
    semester: int
    status: str
    published_at: Optional[str] = None
    assignments: List[ScheduleAssignment]
    conflict_report: Optional[ConflictReport] = None


class ScheduleGenerateResponse(BaseModel):
    schedule_id: str
    status: str
    message: str
    conflict_report: ConflictReport


class PublishRequest(BaseModel):
    send_emails: bool = True
