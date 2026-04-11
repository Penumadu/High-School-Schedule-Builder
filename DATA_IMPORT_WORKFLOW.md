# Data Import & Validation Workflow

This system employs a "Validate-then-Commit" architecture to ensure zero database corruption during bulk school data ingestion.

## 1. Template Acquisition
- **Action**: Principal/Admin clicks **"Download Excel Template"** in the Import Hub.
- **Backend**: `/admin/templates/{type}` generates a dynamic `.xlsx` file with:
  - Required headers (e.g., `code`, `facility_type`).
  - Sample valid data rows as a reference.

## 2. Preparation & Upload
- **Manual Step**: Admin fills the Excel file with staff, subject, or student data.
- **Action**: Admin drops the completed file into the React Dashboard.

## 3. Remote Validation (API)
- **Endpoint**: `POST /admin/{school_id}/validate`
- **Logic**: 
  - Validates **Schema Alignment** (Mandatory columns).
  - Enforces **Data Types** (e.g., `grade_level` between 9-12).
  - Checks **Constraint Feasibility** (e.g., `off_times` format).
- **Result**: Returns a `ValidationReport` with specific Errors (Must Fix) and Warnings (Can Proceed).

## 4. Local Review
- **Frontend**: Displays a clear UI report.
- **Commit Button**: Only enabled if no high-severity errors exist.

## 5. Atomic Batch Commit
- **Endpoint**: `POST /admin/{school_id}/commit`
- **Logic**: Sends the validated JSON array to the backend.
- **Execution**: Uses Firestore `writeBatch()` to ensure atomic updates—guaranteeing all records succeed or none are written.

## 6. Derived Student Timetables
- **Trigger**: Scheduling Solver `POST /generate`.
- **Logic**: After finding the master feasibility, the system maps assignments to each `student_id` in the batch.
- **Storage**: Individual conflict-free timetables are saved in `students/{id}/student_schedules`.