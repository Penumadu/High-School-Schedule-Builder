
import json
import uuid
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.firebase import get_firestore_client

def import_courses(json_path, school_id):
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
    
    print(f"Importing {total} courses into school '{school_id}'...")
    
    for course in courses:
        subject_id = f"subj_{uuid.uuid4().hex[:8]}"
        
        data = {
            "name": course.get("Subject", ""),
            "code": course.get("Course Code", ""),
            "grade_level": course.get("Grade", "Grade 9"),
            "credits": course.get("Credits", "1 Credit"),
            "level": course.get("Level", "Open"),
            "department": course.get("Department", "General"),
            "prerequisites": course.get("Pre-requisites", ""),
            "required_periods_per_week": 5, 
            "facility_type": "REGULAR",
            "is_mandatory": False
        }
        
        doc_ref = db.collection("schools").document(school_id).collection("subjects").document(subject_id)
        batch.set(doc_ref, data)
        count += 1
        
        if count % 400 == 0:
            batch.commit()
            batch = db.batch()
            print(f"Uploaded {count}/{total}...")

    batch.commit()
    print(f"Finished! Imported {count} courses.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/import_master_courses.py <json_path> <school_id>")
        sys.exit(1)
    
    import_courses(sys.argv[1], sys.argv[2])
