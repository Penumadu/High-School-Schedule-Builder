"""Export API for schedule downloads (CSV/PDF)."""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.core.auth import require_role
from app.core.firebase import get_firestore_client
import csv
import io

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("/schedule/{school_id}/{grade_level}")
async def export_schedule_csv(
    school_id: str,
    grade_level: int,
    user: dict = Depends(require_role("SUPER_ADMIN", "PRINCIPAL", "COORDINATOR")),
):
    """
    Export the published schedule for a specific grade level as CSV.
    """
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)

    # Get published schedules
    schedules = school_ref.collection("schedules") \
        .where("status", "==", "PUBLISHED").stream()

    # Get students for this grade
    grade_students = {}
    for doc in school_ref.collection("students") \
            .where("grade_level", "==", grade_level).stream():
        data = doc.to_dict()
        grade_students[doc.id] = f"{data.get('first_name', '')} {data.get('last_name', '')}"

    # Get subject and teacher names for display
    subject_names = {}
    for doc in school_ref.collection("subjects").stream():
        subject_names[doc.id] = doc.to_dict().get("name", doc.id)

    teacher_names = {}
    for doc in school_ref.collection("teachers").stream():
        data = doc.to_dict()
        teacher_names[doc.id] = f"{data.get('first_name', '')} {data.get('last_name', '')}"

    room_names = {}
    for doc in school_ref.collection("classrooms").stream():
        room_names[doc.id] = doc.to_dict().get("name", doc.id)

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Period", "Subject", "Teacher", "Room", "# Students"])

    rows = []
    for sched_doc in schedules:
        sched = sched_doc.to_dict()
        for assignment in sched.get("assignments", []):
            enrolled = assignment.get("enrolled_student_ids", [])
            grade_enrolled = [sid for sid in enrolled if sid in grade_students]
            if grade_enrolled:
                rows.append({
                    "period": assignment["period_name"],
                    "subject": subject_names.get(assignment["subject_id"], assignment["subject_id"]),
                    "teacher": teacher_names.get(assignment["teacher_id"], assignment["teacher_id"]),
                    "room": room_names.get(assignment["room_id"], assignment["room_id"]),
                    "count": len(grade_enrolled),
                })

    rows.sort(key=lambda r: r["period"])
    for row in rows:
        writer.writerow([row["period"], row["subject"], row["teacher"], row["room"], row["count"]])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=schedule_grade_{grade_level}.csv"},
    )
