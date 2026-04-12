
import os
import sys
import json
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client
from app.models.admin import SubjectResponse, StudentResponse, ClassroomResponse

def debug_models():
    db = get_firestore_client()
    school_id = "demo-school"
    
    print(f"--- Debugging {school_id} Models ---")
    
    # 1. Test Subject
    print("\n[Subjects]")
    docs = list(db.collection('schools').document(school_id).collection('subjects').limit(1).stream())
    if docs:
        data = docs[0].to_dict()
        print(f"Raw data: {data}")
        try:
            SubjectResponse(subject_id=docs[0].id, **data)
            print("Subject validation: SUCCESS")
        except Exception as e:
            print(f"Subject validation: FAILED -> {e}")
    else:
        print("No subjects found")

    # 2. Test Student
    print("\n[Students]")
    docs = list(db.collection('schools').document(school_id).collection('students').limit(1).stream())
    if docs:
        data = docs[0].to_dict()
        print(f"Raw data: {data}")
        try:
            StudentResponse(student_id=docs[0].id, **data)
            print("Student validation: SUCCESS")
        except Exception as e:
            print(f"Student validation: FAILED -> {e}")
    else:
        print("No students found")

    # 3. Test Classroom
    print("\n[Classrooms]")
    docs = list(db.collection('schools').document(school_id).collection('classrooms').limit(1).stream())
    if docs:
        data = docs[0].to_dict()
        print(f"Raw data: {data}")
        try:
            ClassroomResponse(room_id=docs[0].id, **data)
            print("Classroom validation: SUCCESS")
        except Exception as e:
            print(f"Classroom validation: FAILED -> {e}")
    else:
        print("No classrooms found")

if __name__ == "__main__":
    debug_models()
