"""Import validation and Firestore commit service using Pandas."""

import io
import uuid
from typing import List, Dict, Any


from app.core.firebase import get_firestore_client
from app.models.admin import ValidationReport, ValidationError


class ImportService:
    """Handles Excel validation and Firestore batch writes."""

    STAFF_COLUMNS = ["first_name", "last_name", "email", "specializations", "max_periods_per_week", "off_times"]
    SUBJECT_COLUMNS = ["code", "name", "grade_level", "required_periods_per_week", "facility_type", "is_mandatory"]
    STUDENT_COLUMNS = ["first_name", "last_name", "email", "grade_level", "requested_subjects"]
    CLASSROOM_COLUMNS = ["code", "name", "capacity", "facility_type"]

    def __init__(self, school_id: str):
        self.school_id = school_id
        self.db = get_firestore_client()

    def _read_file(self, contents: bytes, filename: str):
        """Read Excel or CSV into a DataFrame."""
        import pandas as pd
        if filename.endswith(".csv"):
            return pd.read_csv(io.BytesIO(contents))
        else:
            return pd.read_excel(io.BytesIO(contents))

    async def validate_staff(self, contents: bytes, filename: str) -> ValidationReport:
        """Validate a staff import file."""
        import pandas as pd
        df = self._read_file(contents, filename)
        errors = []
        warnings = []

        missing_cols = [c for c in self.STAFF_COLUMNS if c not in df.columns]
        if missing_cols:
            errors.append(ValidationError(row=0, field="schema", message=f"Missing: {missing_cols}"))
            return ValidationReport(total_rows=len(df), valid_rows=0, errors=errors, warnings=[], is_valid=False)

        for idx, row in df.iterrows():
            row_num = idx + 2
            if pd.isna(row.get("email")) or "@" not in str(row.get("email")):
                errors.append(ValidationError(row=row_num, field="email", message="Invalid email"))
            
            # Off times validation (comma-sep numbers)
            off_times = str(row.get("off_times", ""))
            if off_times and str(off_times) != "nan":
                try:
                    [int(p.strip()) for p in str(off_times).split(",") if p.strip()]
                except ValueError:
                    errors.append(ValidationError(row=row_num, field="off_times", message="Must be comma-separated numbers (e.g. 1,2)"))

        valid_rows = len(df) - len(errors)
        return ValidationReport(total_rows=len(df), valid_rows=max(0, valid_rows), errors=errors, warnings=warnings, is_valid=not errors)

    async def validate_subjects(self, contents: bytes, filename: str) -> ValidationReport:
        """Validate a subjects import file."""
        import pandas as pd
        df = self._read_file(contents, filename)
        errors = []
        
        missing_cols = [c for c in self.SUBJECT_COLUMNS if c not in df.columns]
        if missing_cols:
            errors.append(ValidationError(row=0, field="schema", message=f"Missing: {missing_cols}"))
            return ValidationReport(total_rows=len(df), valid_rows=0, errors=errors, warnings=[], is_valid=False)

        for idx, row in df.iterrows():
            row_num = idx + 2
            if pd.isna(row.get("code")) or not str(row["code"]).strip():
                errors.append(ValidationError(row=row_num, field="code", message="Course code required"))
            
            grade = row.get("grade_level")
            if pd.isna(grade) or not (9 <= int(grade) <= 12):
                errors.append(ValidationError(row=row_num, field="grade_level", message="Grade must be 9-12"))

        valid_rows = len(df) - len(errors)
        return ValidationReport(total_rows=len(df), valid_rows=max(0, valid_rows), errors=errors, warnings=[], is_valid=not errors)

    async def validate_classrooms(self, contents: bytes, filename: str) -> ValidationReport:
        """Validate a classrooms import file."""
        import pandas as pd
        df = self._read_file(contents, filename)
        errors = []
        
        missing_cols = [c for c in self.CLASSROOM_COLUMNS if c not in df.columns]
        if missing_cols:
            errors.append(ValidationError(row=0, field="schema", message=f"Missing: {missing_cols}"))
            return ValidationReport(total_rows=len(df), valid_rows=0, errors=errors, warnings=[], is_valid=False)

        for idx, row in df.iterrows():
            row_num = idx + 2
            if pd.isna(row.get("code")):
                errors.append(ValidationError(row=row_num, field="code", message="Room code required"))
            if pd.isna(row.get("capacity")) or int(row["capacity"]) < 1:
                errors.append(ValidationError(row=row_num, field="capacity", message="Capacity must be > 0"))

        valid_rows = len(df) - len(errors)
        return ValidationReport(total_rows=len(df), valid_rows=max(0, valid_rows), errors=errors, warnings=[], is_valid=not errors)

    async def validate_student_choices(self, contents: bytes, filename: str) -> ValidationReport:
        """Validate student choices."""
        import pandas as pd
        df = self._read_file(contents, filename)
        errors = []
        
        missing_cols = [c for c in self.STUDENT_COLUMNS if c not in df.columns]
        if missing_cols:
            errors.append(ValidationError(row=0, field="schema", message=f"Missing: {missing_cols}"))
            return ValidationReport(total_rows=len(df), valid_rows=0, errors=errors, warnings=[], is_valid=False)

        for idx, row in df.iterrows():
            row_num = idx + 2
            if pd.isna(row.get("email")):
                errors.append(ValidationError(row=row_num, field="email", message="Email required"))

        valid_rows = len(df) - len(errors)
        return ValidationReport(total_rows=len(df), valid_rows=max(0, valid_rows), errors=errors, warnings=[], is_valid=not errors)

    async def commit_to_firestore(self, import_type: str, data: List[Dict[str, Any]]) -> dict:
        """Commit validated data to Firestore using batch writes."""
        batch = self.db.batch()
        school_ref = self.db.collection("schools").document(self.school_id)
        count = 0

        for item in data:
            if import_type == "staff":
                doc_id = f"teacher_{uuid.uuid4().hex[:8]}"
                off_times_str = str(item.get("off_times", ""))
                off_times = [int(p.strip()) for p in off_times_str.split(",") if p.strip()] if off_times_str != "nan" else []
                
                doc_data = {
                    "first_name": item.get("first_name", ""),
                    "last_name": item.get("last_name", ""),
                    "email": item.get("email", ""),
                    "specializations": [s.strip() for s in str(item.get("specializations", "")).split(",") if s.strip()],
                    "max_periods_per_week": int(item.get("max_periods_per_week", 25)),
                    "off_times": off_times,
                    "is_active": True,
                }
                batch.set(school_ref.collection("teachers").document(doc_id), doc_data)

            elif import_type == "subjects":
                doc_id = f"subj_{uuid.uuid4().hex[:8]}"
                doc_data = {
                    "code": str(item.get("code", "")),
                    "name": item.get("name", ""),
                    "grade_level": int(item.get("grade_level", 9)),
                    "required_periods_per_week": int(item.get("required_periods_per_week", 5)),
                    "facility_type": item.get("facility_type", "REGULAR"),
                    "is_mandatory": str(item.get("is_mandatory", "No")).lower() in ["yes", "true", "1"]
                }
                batch.set(school_ref.collection("subjects").document(doc_id), doc_data)

            elif import_type == "classrooms":
                doc_id = f"room_{uuid.uuid4().hex[:8]}"
                doc_data = {
                    "code": str(item.get("code", "")),
                    "name": item.get("name", ""),
                    "capacity": int(item.get("capacity", 30)),
                    "facility_type": item.get("facility_type", "REGULAR"),
                    "is_gym": item.get("facility_type") == "GYM"
                }
                batch.set(school_ref.collection("classrooms").document(doc_id), doc_data)

            elif import_type == "student_choices":
                doc_id = f"stu_{uuid.uuid4().hex[:8]}"
                choices = [s.strip() for s in str(item.get("requested_subjects", "")).split(",") if s.strip()]
                doc_data = {
                    "first_name": item.get("first_name", ""),
                    "last_name": item.get("last_name", ""),
                    "email": item.get("email", ""),
                    "grade_level": int(item.get("grade_level", 9)),
                    "historical_grades": {},
                    "requested_subjects": choices,
                    "last_schedule_email_status": "PENDING",
                }
                batch.set(school_ref.collection("students").document(doc_id), doc_data)
            
            count += 1
            if count % 500 == 0:
                batch.commit()
                batch = self.db.batch()

        batch.commit()
        return {"message": f"Successfully committed {count} records", "count": count}
