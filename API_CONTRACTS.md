# Backend API Endpoints (FastAPI)

## Admin Operations (`/api/v1/admin`)

- `GET /templates/{import_type}`
  - Auth: Principal / Coordinator / Super Admin
  - Action: Generates an Excel (.xlsx) template with sample data.
  - Returns: Binary file stream.

- `POST /{school_id}/validate`
  - Payload: `UploadFile, import_type`
  - Returns: `ValidationReport` { `is_valid`, `errors`, `warnings` }

- `POST /{school_id}/commit`
  - Payload: `{ "import_type": "string", "data": List[Dict] }`
  - Action: Writes validated bulk data to Firestore.

## Scheduling Operations (`/api/v1/solver` or `/api/v1/schedule`)

- `POST /generate`
  - Payload: `{ "school_id": "string", "semester": 1 }`
  - Action: Runs the CP-SAT solver with student-level conflict constraints.
  - Returns: `ScheduleGenerateResponse`
    - `schedule_id`: string
    - `status`: string
    - `conflict_report`: { `has_conflicts`, `total_conflicts`, `conflicts`: List[ConflictItem] }

## Individual Student Access

- `GET /students/{id}/schedule`
  - Action: Fetches the personalized conflict-free timetable for the student.
  - Returns: List of `ScheduleAssignment`.