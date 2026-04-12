
import os
import json
import sys
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client

SCHOOL_ID = 'corpus_christie_burlington'

def seed_data():
    db = get_firestore_client()
    school_ref = db.collection('schools').document(SCHOOL_ID)
    
    # 1. Seed Subjects
    print("Seeding subjects...")
    try:
        with open('frontend/src/data/Master_Course_Catalogue_v2.json', 'r') as f:
            subjects = json.load(f)
        
        subjs_ref = school_ref.collection('subjects')
        batch = db.batch()
        count = 0
        for subj in subjects:
            code = subj.get('code', 'unknown')
            doc_ref = subjs_ref.document(code)
            batch.set(doc_ref, subj, merge=True)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print(f"Successfully synced {count} subjects.")
    except Exception as e:
        print(f"Error seeding subjects: {e}")

    # 2. Seed Teachers
    print("Seeding teachers...")
    try:
        with open('frontend/src/data/default_teachers.json', 'r') as f:
            teachers = json.load(f)
        
        teachers_ref = school_ref.collection('teachers')
        batch = db.batch()
        count = 0
        for t in teachers:
            # Generate a consistent ID based on email to prevent duplicates
            email = t.get('email', 'unknown')
            t_id = email.replace('@', '_').replace('.', '_')
            doc_ref = teachers_ref.document(t_id)
            # Remove teacher_id from data if it's internal
            data = t.copy()
            data.pop('teacher_id', None)
            batch.set(doc_ref, data, merge=True)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print(f"Successfully synced {count} teachers.")
    except Exception as e:
        print(f"Error seeding teachers: {e}")

if __name__ == "__main__":
    seed_data()
