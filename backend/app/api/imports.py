"""Import and validation API routes — the 'Validate-then-Commit' workflow."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List, Dict, Any
import io

from app.core.auth import require_role
from app.core.firebase import get_firestore_client
from app.models.admin import ValidationReport, ImportCommitRequest
from app.services.import_service import ImportService

router = APIRouter(prefix="/admin", tags=["Data Import"])


@router.post("/{school_id}/validate", response_model=ValidationReport)
async def validate_import(
    school_id: str,
    import_type: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Step 1 of Validate-then-Commit:
    Upload an Excel file, validate it against the schema and rules engine.
    Returns a ValidationReport with errors/warnings.
    """
    if not file.filename.endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(
            status_code=400,
            detail="File must be .xlsx, .xls, or .csv",
        )

    contents = await file.read()
    service = ImportService(school_id)

    if import_type == "staff":
        report = await service.validate_staff(contents, file.filename)
    elif import_type == "subjects":
        report = await service.validate_subjects(contents, file.filename)
    elif import_type == "classrooms":
        report = await service.validate_classrooms(contents, file.filename)
    elif import_type == "student_choices":
        report = await service.validate_student_choices(contents, file.filename)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid import_type: '{import_type}'. Must be 'staff', 'subjects', 'classrooms', or 'student_choices'",
        )

    return report


@router.post("/{school_id}/commit")
async def commit_import(
    school_id: str,
    request: ImportCommitRequest,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Step 2 of Validate-then-Commit:
    Write validated data to Firestore using batch writes.
    """
    service = ImportService(school_id)

    try:
        result = await service.commit_to_firestore(
            import_type=request.import_type,
            data=request.data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Batch commit failed: {str(e)}",
        )

    return result
