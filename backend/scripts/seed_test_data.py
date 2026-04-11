import uuid
from app.core.firebase import get_firestore_client

def seed_data(school_id: str):
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)
    
    # 1. Clear existing test data (optional, but cleaner)
    print(f"Seeding data for school: {school_id}")
    
    # 2. Add Subjects
    subjects = [
        {"code": "ENG-9", "name": "English 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": True},
        {"code": "MTH-9", "name": "Mathematics 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": True},
        {"code": "SCI-9", "name": "Science 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "LAB", "is_mandatory": True},
        {"code": "ART-9", "name": "Visual Arts", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": False},
        {"code": "MUS-9", "name": "Music", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": False},
    ]
    
    subj_ids = {}
    for s in subjects:
        doc_id = f"subj_{s['code'].lower()}"
        school_ref.collection("subjects").document(doc_id).set(s)
        subj_ids[s['code']] = doc_id
        print(f"  Added subject: {s['code']}")

    # 3. Add Classrooms
    rooms = [
        {"code": "RM-101", "name": "Classroom 101", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
        {"code": "RM-102", "name": "Classroom 102", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
        {"code": "LAB-A", "name": "Science Lab A", "capacity": 25, "facility_type": "LAB", "is_gym": False},
    ]
    for r in rooms:
        school_ref.collection("classrooms").document(f"room_{r['code'].lower()}").set(r)
        print(f"  Added room: {r['code']}")

    # 4. Add Teachers
    teachers = [
        {"first_name": "Alice", "last_name": "Smith", "email": "alice@example.com", "specializations": ["ENG-9", "ART-9"], "max_periods_per_week": 25, "is_active": True},
        {"first_name": "Bob", "last_name": "Jones", "email": "bob@example.com", "specializations": ["MTH-9", "SCI-9"], "max_periods_per_week": 25, "is_active": True},
        {"first_name": "Charlie", "last_name": "Davis", "email": "charlie@example.com", "specializations": ["MUS-9", "SCI-9"], "max_periods_per_week": 25, "is_active": True},
    ]
    for t in teachers:
        school_ref.collection("teachers").document(f"teacher_{t['first_name'].lower()}").set(t)
        print(f"  Added teacher: {t['first_name']} {t['last_name']}")

    # 5. Add Students
    students = [
        {"first_name": "Student", "last_name": "One", "email": "s1@example.com", "grade_level": 9, "requested_subjects": ["ART-9"]},
        {"first_name": "Student", "last_name": "Two", "email": "s2@example.com", "grade_level": 9, "requested_subjects": ["MUS-9"]},
        {"first_name": "Student", "last_name": "Three", "email": "s3@example.com", "grade_level": 9, "requested_subjects": ["ART-9", "MUS-9"]},
    ]
    for s in students:
        school_ref.collection("students").document(f"stu_{s['email'].split('@')[0]}").set(s)
        print(f"  Added student: {s['first_name']} {s['last_name']}")

    print("\n✅ Seeding complete! You can now run the Scheduling Engine.")

if __name__ == "__main__":
    # Using the found school ID
    seed_data("school_5852924b")
