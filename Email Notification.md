## Notification Engine (Email Automation)

**Trigger:** Dispatched automatically when a Schedule transitions to "Published" status.
**Provider:** SendGrid API / Firebase Trigger Email Extension.
**Template Engine:** Jinja2 

**Workflow:**
1. Admin finalizes the schedule in the UI and clicks "Publish".
2. FastAPI generates customized HTML payloads for each student using `schedule_template.html`.
3. Payloads are added to a Background Task queue.
4. Emails are dispatched as HTML.
5. Delivery status (Sent/Bounced) is logged back into the `students` Firestore document under `last_schedule_email_status`.


