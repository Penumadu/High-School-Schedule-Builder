"""Authentication and user management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from app.core.auth import get_current_user, require_role
from app.core.firebase import get_firebase_app, get_firestore_client
from firebase_admin import auth as firebase_auth

router = APIRouter(prefix="/auth", tags=["Authentication"])


class SetClaimsRequest(BaseModel):
    uid: str
    role: str
    school_id: Optional[str] = None


class UserProfileResponse(BaseModel):
    uid: str
    email: str
    role: str
    school_id: str
    display_name: Optional[str] = None


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(user: dict = Depends(get_current_user)):
    """Return the current user's profile and custom claims."""
    get_firebase_app()
    try:
        firebase_user = firebase_auth.get_user(user["uid"])
        display_name = firebase_user.display_name
    except Exception:
        display_name = None

    return UserProfileResponse(
        uid=user["uid"],
        email=user["email"],
        role=user["role"],
        school_id=user["school_id"],
        display_name=display_name,
    )


@router.post("/set-claims")
async def set_custom_claims(
    request: SetClaimsRequest,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL")),
):
    """
    Set custom claims on a Firebase user (role, school_id).
    Only SUPER_ADMIN and PRINCIPAL can do this.
    """
    get_firebase_app()

    # Principals can only set claims for users in their school
    if user["role"] == "PRINCIPAL" and request.school_id != user["school_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Principals can only manage users in their own school",
        )

    allowed_roles = ["PRINCIPAL", "COORDINATOR", "TEACHER", "STUDENT"]
    if user["role"] == "PRINCIPAL" and request.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Principals can only assign these roles: {allowed_roles}",
        )

    claims = {"role": request.role}
    if request.school_id:
        claims["school_id"] = request.school_id

    try:
        firebase_auth.set_custom_user_claims(request.uid, claims)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set claims: {str(e)}",
        )

    return {"message": f"Claims set for user {request.uid}", "claims": claims}
