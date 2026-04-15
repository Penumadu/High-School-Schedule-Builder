import json
import os
import sys
import uuid
from pathlib import Path

# Add backend to sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.core.firebase import get_firestore_client

def load_data():
    db = get_firestore_client()
    school_id = "corpus_christie_burlington"
    school_ref = db.collection("schools").document(school_id)

    # 1. Clear existing data
    print(f"Cleaning existing data for {school_id}...")
    teachers_ref = school_ref.collection("teachers")
    subjects_ref = school_ref.collection("subjects")

    # Helper to delete collection
    def delete_collection(coll_ref, batch_size=500):
        docs = coll_ref.limit(batch_size).stream()
        deleted = 0
        for doc in docs:
            doc.reference.delete()
            deleted += 1
        if deleted >= batch_size:
            return deleted + delete_collection(coll_ref, batch_size)
        return deleted

    t_deleted = delete_collection(teachers_ref)
    s_deleted = delete_collection(subjects_ref)
    print(f"Deleted {t_deleted} teachers and {s_deleted} subjects.")

    # 2. Load JSON files
    project_root = Path(__file__).parent.parent.parent
    teachers_path = project_root / "frontend" / "src" / "data" / "default_teachers.json"
    subjects_path = project_root / "frontend" / "src" / "data" / "default_subjects.json"

    with open(teachers_path, 'r') as f:
        teachers_data = json.load(f)
    
    with open(subjects_path, 'r') as f:
        subjects_data = json.load(f)

    print(f"Loading {len(teachers_data)} teachers and {len(subjects_data)} subjects...")

    # 3. Batch Write Teachers
    batch = db.batch()
    count = 0
    for item in teachers_data:
        doc_id = f"teacher_{uuid.uuid4().hex[:8]}"
        doc_data = {
            "first_name": item.get("first_name", ""),
            "last_name": item.get("last_name", ""),
            "email": item.get("email", ""),
            "subject": item.get("subject", "General"),
            "subject_code": item.get("subject_code", "GEN"),
            "specializations": item.get("specializations", []),
            "max_periods_per_week": int(item.get("max_periods_per_week", 25)),
            "off_times": item.get("off_times", []),
            "is_active": True,
            "teacher_id": item.get("teacher_id", doc_id)
        }
        batch.set(teachers_ref.document(doc_id), doc_data)
        count += 1
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()
    print(f"Seeded {count} teachers.")

    # 4. Batch Write Subjects
    batch = db.batch()
    count = 0
    for item in subjects_data:
        doc_id = f"subj_{item.get('code', uuid.uuid4().hex[:8]).lower().replace('-', '_')}"
        doc_data = {
            "code": str(item.get("code", "")),
            "name": item.get("name", ""),
            "grade_level": str(item.get("grade_level", "Grade 9")),
            "credits": str(item.get("credits", "1 Credit")),
            "level": str(item.get("level", "Open")),
            "department": str(item.get("department", "General")),
            "prerequisites": str(item.get("prerequisites", "")),
            "required_periods_per_week": int(item.get("required_periods_per_week", 5)),
            "facility_type": item.get("facility_type", "REGULAR"),
            "is_mandatory": item.get("is_mandatory", False)
        }
        batch.set(subjects_ref.document(doc_id), doc_data)
        count += 1
        if count % 500 == 0:
            batch.commit()
            batch = db.batch()
    batch.commit()
    print(f"Seeded {count} subjects.")

    print("\n✅ SUCCESS: Data Load Complete!")

if __name__ == "__main__":
    load_data()
