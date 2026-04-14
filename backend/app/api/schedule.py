"""Schedule generation and management API routes."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.core.auth import require_role, get_current_user
from app.core.firebase import get_firestore_client
from app.models.schedule import (
    ScheduleGenerateRequest,
    ScheduleGenerateResponse,
    ScheduleResponse,
    PublishRequest,
)
from app.services.email_service import send_schedule_emails
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache
from app.core.cache import school_key_builder

router = APIRouter(prefix="/schedule", tags=["Scheduling"])


@router.post("/generate", response_model=ScheduleGenerateResponse)
async def generate_schedule(
    request: ScheduleGenerateRequest,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Trigger the OR-Tools CP-SAT solver to generate a schedule.
    Compiles data from Firestore, runs the constraint model, and writes output.
    """
    # Lazy import — ortools is very large and would crash the serverless function
    # if imported at module startup
    from app.services.solver import ScheduleSolver
    
    solver = ScheduleSolver(request.school_id)

    try:
        result = solver.generate(semester=request.semester)
        # Clear cache for this school so the new schedule appears in lists
        await FastAPICache.clear(namespace=request.school_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Schedule generation failed: {str(e)}",
        )

    return result


@router.get("/{school_id}/{schedule_id}", response_model=ScheduleResponse)
@cache(expire=3600, key_builder=school_key_builder) # Long expiry for specific schedules
async def get_schedule(
    school_id: str,
    schedule_id: str,
    user: dict = Depends(get_current_user),
):
    """Fetch a specific schedule."""
    db = get_firestore_client()
    doc = db.collection("schools").document(school_id) \
        .collection("schedules").document(schedule_id).get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Schedule not found")

    data = doc.to_dict()
    data["schedule_id"] = doc.id
    return data


@router.get("/{school_id}/list")
@cache(expire=600, key_builder=school_key_builder)
async def list_schedules(
    school_id: str,
    user: dict = Depends(get_current_user),
):
    """List all schedules for a school."""
    db = get_firestore_client()
    docs = db.collection("schools").document(school_id) \
        .collection("schedules").stream()

    schedules = []
    for doc in docs:
        data = doc.to_dict()
        data["schedule_id"] = doc.id
        schedules.append(data)

    return {"schedules": schedules}


@router.post("/{school_id}/{schedule_id}/publish")
async def publish_schedule(
    school_id: str,
    schedule_id: str,
    request: PublishRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Publish a schedule (set status to PUBLISHED) and optionally trigger email notifications.
    """
    db = get_firestore_client()
    doc_ref = db.collection("schools").document(school_id) \
        .collection("schedules").document(schedule_id)

    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Schedule not found")

    from datetime import datetime
    doc_ref.update({
        "status": "PUBLISHED",
        "published_at": datetime.utcnow().isoformat(),
    })

    if request.send_emails:
        background_tasks.add_task(send_schedule_emails, school_id, schedule_id)

    # Invalidate caches
    await FastAPICache.clear(namespace=school_id)

    return {
        "message": "Schedule published successfully",
        "emails_queued": request.send_emails,
    }
