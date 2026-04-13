"""Pydantic models for system-level operations (Super Admin)."""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from enum import Enum


class SubscriptionTier(str, Enum):
    BASIC = "BASIC"
    PRO = "PRO"
    ENTERPRISE = "ENTERPRISE"


class SchoolStatus(str, Enum):
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"


class SchoolSettings(BaseModel):
    periods_per_day: int = Field(default=4, ge=1, le=12)
    period_duration_mins: int = Field(default=75, ge=30, le=120)
    max_consecutive_periods: int = Field(default=3, ge=1, le=10)
    has_mandatory_prep: bool = True
    allow_email_notifications: bool = True


class SchoolCreateRequest(BaseModel):
    school_name: str = Field(..., min_length=2, max_length=200)
    school_id: str = Field(
        ...,
        min_length=3,
        max_length=50,
        pattern=r"^[a-z0-9_]+$",
        description="URL-safe identifier, e.g. 'burlington_central_01'",
    )
    subscription_tier: SubscriptionTier = SubscriptionTier.BASIC
    settings: SchoolSettings = SchoolSettings()
    # Initial principal account
    principal_email: str
    principal_first_name: str
    principal_last_name: str


class SchoolResponse(BaseModel):
    school_id: str
    school_name: str
    subscription_tier: str
    status: str
    settings: SchoolSettings
    created_at: Optional[str] = None


class ProvisionResponse(BaseModel):
    school_id: str
    school_name: str
    principal_uid: str
    principal_email: str
    message: str
