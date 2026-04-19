"""Authentication and user management API routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional

from datetime import datetime
from app.core.auth import get_current_user, require_role
from app.core.firebase import get_firebase_app, get_firestore_client
from app.models.system import SchoolCreateRequest, ProvisionResponse, SubscriptionTier, SchoolSettings
from firebase_admin import auth as firebase_auth
from fastapi_cache import FastAPICache

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SignupRequest(BaseModel):
    school_name: str
    school_id: str
    principal_email: str
    password: str
    first_name: str
    last_name: str

@router.post("/signup", response_model=ProvisionResponse)
async def signup(request: SignupRequest):
    """
    Public signup for new schools.
    Provisions a school and creates a Principal user.
    """
    db = get_firestore_client()
    get_firebase_app()

    # Check if school already exists
    existing = db.collection("schools").document(request.school_id).get()
    if existing.exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"School ID '{request.school_id}' is already taken",
        )

    # 1. Create school document
    school_data = {
        "school_name": request.school_name,
        "subscription_tier": SubscriptionTier.BASIC.value,
        "status": "ACTIVE",
        "settings": SchoolSettings().model_dump(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": "self_signup",
    }
    db.collection("schools").document(request.school_id).set(school_data)

    try:
        # 2. Create Principal user in Firebase Auth
        principal_user = firebase_auth.create_user(
            email=request.principal_email,
            password=request.password,
            display_name=f"{request.first_name} {request.last_name}",
        )
        principal_uid = principal_user.uid
        
        # 3. Set custom claims
        firebase_auth.set_custom_user_claims(principal_uid, {
            "role": "PRINCIPAL",
            "school_id": request.school_id,
        })
    except firebase_auth.EmailAlreadyExistsError:
        # Clean up the school doc
        db.collection("schools").document(request.school_id).delete()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{request.principal_email}' is already registered",
        )
    except Exception as e:
        db.collection("schools").document(request.school_id).delete()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}",
        )

    # 4. Create user profile in the school's users sub-collection
    user_profile = {
        "uid": principal_uid,
        "role": "PRINCIPAL",
        "first_name": request.first_name,
        "last_name": request.last_name,
        "email": request.principal_email,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("schools").document(request.school_id) \
        .collection("users").document(principal_uid).set(user_profile)

    # 5. Pre-populate Subjects from Master Catalogue (Optional but helpful)
    try:
        master_subjects = db.collection("master_subjects").stream()
        batch = db.batch()
        count = 0
        for subj_doc in master_subjects:
            subj_data = subj_doc.to_dict()
            code = subj_data.get('code', 'unknown')
            target_ref = db.collection("schools").document(request.school_id) \
                .collection("subjects").document(code)
            batch.set(target_ref, subj_data, merge=True)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
    except Exception as e:
        print(f"Failed to copy master subjects during signup: {e}")

    # 6. Clear Schools Cache
    await FastAPICache.clear(namespace="schools")

    return ProvisionResponse(
        school_id=request.school_id,
        school_name=request.school_name,
        principal_uid=principal_uid,
        principal_email=request.principal_email,
        message="Account created successfully! You can now log in.",
    )


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
