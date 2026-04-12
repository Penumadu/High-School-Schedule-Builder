import os
import json
import sys
import time
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client

SCHOOL_IDS = ['corpus_christie_burlington', 'demo-school']

def seed_data():
    db = get_firestore_client()
    
    for school_id in SCHOOL_IDS:
        print(f"\n--- SEEDING SCHOOL: {school_id} ---")
        school_ref = db.collection('schools').document(school_id)
        
        # 1. Seed Subjects
        print(f"[{school_id}] Seeding subjects...")
        try:
            with open('frontend/src/data/default_subjects.json', 'r') as f:
                subjects = json.load(f)
            
            subjs_ref = school_ref.collection('subjects')
            batch = db.batch()
            count = 0
            for subj in subjects:
                code = subj.get('code') or subj.get('course_code') or 'unknown'
                # Ensure ALL required SubjectResponse fields are present
                data = {
                    "subject_id": subj.get('subject_id') or code,
                    "name": subj.get('name', 'Unnamed Subject'),
                    "code": code,
                    "grade_level": subj.get('grade_level', 'General'),
                    "credits": subj.get('credits', '1 Credit'),
                    "level": subj.get('level', 'Open'),
                    "department": subj.get('department', 'General'),
                    "prerequisites": subj.get('prerequisites', ''),
                    "required_periods_per_week": subj.get('required_periods_per_week', 5),
                    "facility_type": subj.get('facility_type', 'REGULAR'),
                    "is_mandatory": subj.get('is_mandatory', False)
                }
                doc_ref = subjs_ref.document(code)
                batch.set(doc_ref, data, merge=True)
                count += 1
                if count % 400 == 0:
                    batch.commit()
                    time.sleep(0.5)
                    batch = db.batch()
            batch.commit()
            time.sleep(0.5)
            print(f"[{school_id}] Successfully synced {count} subjects.")
        except Exception as e:
            print(f"[{school_id}] Error seeding subjects: {e}")

        # 2. Seed Teachers
        print(f"[{school_id}] Cleanup & Seeding teachers...")
        try:
            with open('frontend/src/data/default_teachers.json', 'r') as f:
                teachers = json.load(f)
            
            teachers_ref = school_ref.collection('teachers')
            print(f"[{school_id}] Wiping old teacher records...")
            old_docs = teachers_ref.stream()
            delete_batch = db.batch()
            del_count = 0
            for doc in old_docs:
                delete_batch.delete(doc.reference)
                del_count += 1
                if del_count % 400 == 0:
                    delete_batch.commit()
                    time.sleep(0.5)
                    delete_batch = db.batch()
            delete_batch.commit()
            time.sleep(0.5)
            print(f"[{school_id}] Deleted {del_count} old teacher records.")

            batch = db.batch()
            count = 0
            for t in teachers:
                email = t.get('email', 'unknown')
                t_id = email.replace('@', '_').replace('.', '_')
                doc_ref = teachers_ref.document(t_id)
                # Ensure ALL required TeacherResponse fields are present
                data = {
                    "teacher_id": t_id,
                    "first_name": t.get('first_name', ''),
                    "last_name": t.get('last_name', ''),
                    "email": email,
                    "specializations": t.get('specializations', []),
                    "max_periods_per_week": t.get('max_periods_per_week', 25),
                    "is_active": t.get('is_active', True),
                    "off_times": t.get('off_times', []),
                    "user_id": None
                }
                batch.set(doc_ref, data, merge=True)
                count += 1
                if count % 400 == 0:
                    batch.commit()
                    time.sleep(0.5)
                    batch = db.batch()
            batch.commit()
            time.sleep(0.5)
            print(f"[{school_id}] Successfully synced {count} teachers.")
        except Exception as e:
            print(f"[{school_id}] Error seeding teachers: {e}")

        # 3. Seed Students (500)
        print(f"[{school_id}] Seeding dummy students...")
        try:
            students_ref = school_ref.collection('students')
            batch = db.batch()
            for i in range(100): # Reducing for speed but keeping meaningful number
                s_id = f"student_{i:03d}"
                student_data = {
                    "student_id": s_id,
                    "first_name": f"StudentFirst_{i}",
                    "last_name": f"StudentLast_{i}",
                    "email": f"student_{i}@example.edu",
                    "grade_level": (i % 4) + 9, # 9-12
                    "historical_grades": {},
                    "requested_subjects": [],
                    "last_schedule_email_status": "PENDING",
                    "user_id": None
                }
                batch.set(students_ref.document(s_id), student_data)
            batch.commit()
            print(f"[{school_id}] Successfully seeded 100 students.")
        except Exception as e:
            print(f"[{school_id}] Error seeding students: {e}")

        # 4. Seed Classrooms (30)
        print(f"[{school_id}] Seeding dummy classrooms...")
        try:
            rooms_ref = school_ref.collection('classrooms')
            batch = db.batch()
            for i in range(30):
                r_id = f"RM_{100 + i}"
                room_data = {
                    "room_id": r_id,
                    "name": f"Classroom {100 + i}",
                    "code": r_id,
                    "capacity": 30,
                    "facility_type": "REGULAR" if i < 20 else "LAB",
                    "is_gym": False
                }
                batch.set(rooms_ref.document(r_id), room_data)
            batch.commit()
            print(f"[{school_id}] Successfully seeded 30 classrooms.")
        except Exception as e:
            print(f"[{school_id}] Error seeding classrooms: {e}")

if __name__ == "__main__":
    seed_data()
