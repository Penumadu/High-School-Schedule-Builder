
import json
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.firebase import get_firestore_client

def upload_master_subjects(json_path):
    db = get_firestore_client()
    try:
        with open(json_path, 'r') as f:
            courses = json.load(f)
    except Exception as e:
        print(f"Error reading JSON: {e}")
        return
    
    batch = db.batch()
    count = 0
    total = len(courses)
    
    print(f"Uploading {total} courses to 'master_subjects' collection...")
    
    for course in courses:
        # Use course code as ID if unique, otherwise random
        code = course.get("Course Code", "")
        doc_id = code if code else f"master_{uuid.uuid4().hex[:8]}"
        
        data = {
            "name": course.get("Subject", ""),
            "code": code,
            "grade_level": course.get("Grade", "Grade 9"),
            "credits": course.get("Credits", "1 Credit"),
            "level": course.get("Level", "Open"),
            "department": course.get("Department", "General"),
            "prerequisites": course.get("Pre-requisites", ""),
            "required_periods_per_week": 5, 
            "facility_type": "REGULAR",
            "is_mandatory": False
        }
        
        doc_ref = db.collection("master_subjects").document(doc_id)
        batch.set(doc_ref, data)
        count += 1
        
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"Uploaded {count}/{total}...")

    batch.commit()
    print(f"Finished! Uploaded {count} master subjects.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/upload_master.py <json_path>")
        sys.exit(1)
    
    upload_master_subjects(sys.argv[1])
