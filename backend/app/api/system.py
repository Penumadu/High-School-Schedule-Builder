"""Super Admin system routes — school provisioning and management."""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from app.core.auth import require_role
from app.core.firebase import get_firestore_client, get_firebase_app
from app.models.system import (
    SchoolCreateRequest,
    SchoolResponse,
    ProvisionResponse,
)
from firebase_admin import auth as firebase_auth

router = APIRouter(prefix="/system", tags=["System Admin"])


@router.get("/schools")
async def list_schools(user: dict = Depends(require_role("SUPER_ADMIN"))):
    """List all registered schools."""
    db = get_firestore_client()
    schools_ref = db.collection("schools")
    docs = schools_ref.stream()

    schools = []
    for doc in docs:
        data = doc.to_dict()
        data["school_id"] = doc.id
        schools.append(data)

    return {"schools": schools, "total": len(schools)}


@router.get("/schools/{school_id}")
async def get_school(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN")),
):
    """Get details for a specific school."""
    db = get_firestore_client()
    doc = db.collection("schools").document(school_id).get()

    if not doc.exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School '{school_id}' not found",
        )

    data = doc.to_dict()
    data["school_id"] = doc.id
    return data


@router.post("/provision-school", response_model=ProvisionResponse)
async def provision_school(
    request: SchoolCreateRequest,
    user: dict = Depends(require_role("SUPER_ADMIN")),
):
    """
    Provision a new school tenant:
    1. Create the schools/{school_id} document
    2. Create the initial Principal user in Firebase Auth
    3. Set custom claims (role=PRINCIPAL, school_id)
    4. Create the user profile in schools/{school_id}/users
    """
    db = get_firestore_client()
    get_firebase_app()

    # Check if school already exists
    existing = db.collection("schools").document(request.school_id).get()
    if existing.exists:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"School '{request.school_id}' already exists",
        )

    # 1. Create school document
    school_data = {
        "school_name": request.school_name,
        "subscription_tier": request.subscription_tier.value,
        "status": "ACTIVE",
        "settings": request.settings.model_dump(),
        "created_at": datetime.utcnow().isoformat(),
        "created_by": user["uid"],
    }
    db.collection("schools").document(request.school_id).set(school_data)

    # 2. Create Principal user in Firebase Auth
    is_demo = user.get("uid") == "demo-user"
    
    if is_demo:
        principal_uid = f"demo_principal_{request.school_id}"
        message = "DEMO MODE: School provisioned successfully. Principal account mocked (no real Auth created)."
    else:
        try:
            principal_user = firebase_auth.create_user(
                email=request.principal_email,
                password="ChangeMe123!",  # Temporary password
                display_name=f"{request.principal_first_name} {request.principal_last_name}",
            )
            principal_uid = principal_user.uid
            
            # 3. Set custom claims
            firebase_auth.set_custom_user_claims(principal_uid, {
                "role": "PRINCIPAL",
                "school_id": request.school_id,
            })
            message = "School provisioned successfully. Principal account created with temporary password 'ChangeMe123!'"
        except firebase_auth.EmailAlreadyExistsError:
            # Clean up the school doc
            db.collection("schools").document(request.school_id).delete()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Email '{request.principal_email}' is already registered",
            )

    # 4. Create user profile in the school's users sub-collection
    user_profile = {
        "uid": principal_uid,
        "role": "PRINCIPAL",
        "first_name": request.principal_first_name,
        "last_name": request.principal_last_name,
        "email": request.principal_email,
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
    }
    db.collection("schools").document(request.school_id) \
        .collection("users").document(principal_uid).set(user_profile)

    # 5. Pre-populate Subjects from Master Catalogue
    try:
        master_subjects = db.collection("master_subjects").stream()
        batch = db.batch()
        count = 0
        import uuid
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
        message += f" Catalogue initialized with {count} master subjects."
    except Exception as e:
        print(f"Failed to copy master subjects: {e}")
        message += " (Warning: Master catalogue failed to initialize)"

    return ProvisionResponse(
        school_id=request.school_id,
        school_name=request.school_name,
        principal_uid=principal_uid,
        principal_email=request.principal_email,
        message=message,
    )


@router.put("/schools/{school_id}/status")
async def update_school_status(
    school_id: str,
    status_update: dict,
    user: dict = Depends(require_role("SUPER_ADMIN")),
):
    """Update a school's status (ACTIVE / SUSPENDED)."""
    db = get_firestore_client()
    doc_ref = db.collection("schools").document(school_id)

    if not doc_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School '{school_id}' not found",
        )

    new_status = status_update.get("status", "ACTIVE")
    if new_status not in ["ACTIVE", "SUSPENDED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be 'ACTIVE' or 'SUSPENDED'",
        )

    doc_ref.update({"status": new_status})
    return {"message": f"School '{school_id}' status updated to {new_status}"}
@router.delete("/schools/{school_id}")
async def delete_school(
    school_id: str,
    user: dict = Depends(require_role("SUPER_ADMIN")),
):
    """Permanently delete a school and all its data."""
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)
    
    if not school_ref.get().exists:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"School '{school_id}' not found",
        )

    # Recursive deletion of sub-collections
    collections = ["teachers", "subjects", "students", "classrooms", "rules", "schedules"]
    
    for coll_name in collections:
        coll_ref = school_ref.collection(coll_name)
        # Note: Streaming and deleting is fine for small/medium collections
        docs = coll_ref.stream()
        for doc in docs:
            # We also need to check for sub-sub-collections like 'student_schedules'
            if coll_name == "students":
                sub_docs = doc.reference.collection("student_schedules").stream()
                for sd in sub_docs:
                    sd.reference.delete()
            doc.reference.delete()

    # Finally delete the root school document
    school_ref.delete()
    
    return {"message": f"School '{school_id}' and all associated data permanently deleted"}
