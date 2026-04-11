# High School Schedule Builder & Optimizer (SaaS Platform)

An intelligent, multi-tenant scheduling platform designed to automate and optimize high school timetables. The system ingests school resources, student choices, and custom academic rules to generate conflict-free schedules for a two-semester academic year, complete with automated email delivery.

## Core Features
- **Constraint-Based Scheduling Engine:** Utilizes Python-based constraint programming to assign teachers, rooms, and students without conflicts while optimizing for minimal gaps.
- **Multi-Tenant Architecture:** Secure, isolated data structures allowing multiple schools to operate on the same platform using Firebase Custom Claims.
- **Dynamic Rules Engine:** School administrators can configure custom prerequisites (e.g., "Student must have >70% in Grade 9 Physics to take Grade 10 Physics").
- **Bulk Data Processing:** Support for massive Excel/CSV uploads with automated validation against system rules.
- **Automated Notifications:** Asynchronous, background-processed email delivery using Jinja2 templating to notify students when schedules are published.

## Tech Stack
- **Frontend:** React / Next.js (with `react-hook-form` and SheetJS for data uploads)
- **Backend (API):** Python / FastAPI
- **Database & Auth:** Firebase Firestore & Firebase Authentication
- **Optimization Engine:** Google OR-Tools (CP-SAT Solver)
- **Email Templating:** Jinja2
- **Data Processing:** Pandas (for Excel validation and cleaning)

---

## System Roles & Access Levels

Access is controlled via Role-Based Access Control (RBAC) and tenant-level data isolation.

1. **Super Admin (Platform Level):** Manages school onboarding, subscription tiers, platform-wide configuration, and initial Principal account provisioning.
2. **Principal (Tenant Level):** Global view of their specific school, manages feature flags, staff directories, and system rules. 
3. **Guidance Coordinator:** Handles schedule overrides, conflict resolution, runs the scheduling algorithm, and downloads grade-level schedules.
4. **Teacher:** Views personal schedules and submits period-by-period attendance.
5. **Student:** Selects desired subjects (validated in real-time by the Rules Engine) and views/receives their generated schedule.

---

## Key Workflows

### 1. Data Import & Validation Workflow
To handle thousands of records, the platform supports bulk Excel uploads via a "Validate-then-Commit" process:
* **Upload:** Admin uploads `Staff.xlsx`, `Subjects.xlsx`, or `Student_Choices.xlsx` in the frontend.
* **Validation:** FastAPI uses Pandas to clean the data and validate it against the Rules Engine (e.g., checking if historical grades meet new subject prerequisites).
* **Commit:** Data is written to Firestore using Batch Writes to ensure atomic, error-free updates.

### 2. The Scheduling Engine
Instead of sequential looping, the platform translates school data into mathematical constraints:
* **Hard Constraints:** Room capacities cannot be exceeded; teachers/students cannot be double-booked; gym classes require specific facilities.
* **Soft Constraints:** Minimize student downtime; prioritize teachers' primary subject specializations.
* **Output:** The OR-Tools solver returns a mathematical optimum, which is translated back into JSON and saved to the database.

### 3. Automated Notification Engine
Once a schedule is approved, the system distributes it automatically:
* **Trigger:** Admin clicks "Publish Schedules" on the dashboard.
* **Background Processing:** FastAPI background tasks loop through the student roster so the UI does not freeze.
* **Templating:** Jinja2 injects student-specific data (classes, times, rooms, teachers) into a responsive HTML email template.
* **Dispatch & Logging:** Emails are sent via an SMTP provider, and delivery statuses are logged directly to the student's Firestore profile.

---

## Database Architecture Overview

The system uses a NoSQL hierarchical structure to ensure strict multi-tenancy. All operational data is stored as sub-collections beneath a specific tenant's document.

* `system_admins/` (Global)
* `schools/{school_id}/` (Tenant Root)
    * `/users` (Staff and Students)
    * `/classrooms`
    * `/subjects`
    * `/rules`
    * `/schedules`

