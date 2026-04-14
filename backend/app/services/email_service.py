"""Email notification service — sends schedule emails to students.

Uses SendGrid when configured, otherwise logs emails to console (stub mode).
"""

import logging
from typing import Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.config import settings
from app.core.firebase import get_firestore_client

logger = logging.getLogger(__name__)

# Jinja2 template environment
import os
template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates")
jinja_env = Environment(
    loader=FileSystemLoader(template_dir),
    autoescape=select_autoescape(["html"]),
)


def _send_email_sendgrid(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email via SendGrid API."""
    if not settings.SENDGRID_API_KEY:
        logger.info(f"[STUB] Would send email to {to_email}: {subject}")
        return True

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        message = Mail(
            from_email=settings.SENDGRID_FROM_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        sg = SendGridAPIClient(settings.SENDGRID_API_KEY)
        response = sg.send(message)
        return response.status_code in (200, 201, 202)
    except Exception as e:
        logger.error(f"SendGrid error for {to_email}: {e}")
        return False


async def send_schedule_emails(school_id: str, schedule_id: str, student_ids: Optional[list[str]] = None):
    """
    Background task: sends personalized schedule emails to enrolled students.
    If student_ids is provided, only sends to those specific students.
    Updates delivery status in Firestore.
    """
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)

    # Load school info
    school_doc = school_ref.get()
    school_name = school_doc.to_dict().get("school_name", "Your School") if school_doc.exists else "Your School"

    # Load schedule
    sched_doc = school_ref.collection("schedules").document(schedule_id).get()
    if not sched_doc.exists:
        logger.error(f"Schedule {schedule_id} not found")
        return

    schedule = sched_doc.to_dict()
    assignments = schedule.get("assignments", [])

    # Load subject and teacher names for the email
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

    # Build per-student schedules
    student_schedules = {}
    for assignment in assignments:
        for sid in assignment.get("enrolled_student_ids", []):
            if sid not in student_schedules:
                student_schedules[sid] = []
            student_schedules[sid].append({
                "period": assignment["period_name"],
                "subject": subject_names.get(assignment["subject_id"], assignment["subject_id"]),
                "teacher": teacher_names.get(assignment["teacher_id"], assignment["teacher_id"]),
                "room": room_names.get(assignment["room_id"], assignment["room_id"]),
            })

    # Load email template
    try:
        template = jinja_env.get_template("schedule_email.html")
    except Exception:
        logger.error("Email template not found, using fallback")
        template = None

    # Send emails
    for student_id, schedule_items in student_schedules.items():
        # Filter by student_ids if provided
        if student_ids is not None and student_id not in student_ids:
            continue
            
        student_doc = school_ref.collection("students").document(student_id).get()
        if not student_doc.exists:
            continue

        student = student_doc.to_dict()
        email = student.get("email", "")
        if not email:
            continue

        first_name = student.get("first_name", "Student")
        schedule_items.sort(key=lambda x: x["period"])

        if template:
            html = template.render(
                student_name=first_name,
                school_name=school_name,
                semester=schedule.get("semester", 1),
                schedule=schedule_items,
            )
        else:
            # Fallback plain HTML
            rows = "".join(
                f"<tr><td>{s['period']}</td><td>{s['subject']}</td><td>{s['teacher']}</td><td>{s['room']}</td></tr>"
                for s in schedule_items
            )
            html = f"<h2>Your Schedule</h2><table><tr><th>Period</th><th>Subject</th><th>Teacher</th><th>Room</th></tr>{rows}</table>"

        success = _send_email_sendgrid(
            to_email=email,
            subject=f"Your Schedule for Semester {schedule.get('semester', 1)} — {school_name}",
            html_content=html,
        )

        # Update delivery status
        status = "DELIVERED" if success else "BOUNCED"
        school_ref.collection("students").document(student_id).update({
            "last_schedule_email_status": status,
        })

    logger.info(f"Schedule emails sent for {len(student_schedules)} students")
