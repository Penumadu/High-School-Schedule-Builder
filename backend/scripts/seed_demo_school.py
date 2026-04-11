import uuid
from app.core.firebase import get_firestore_client

def seed_demo_school(school_name: str):
    db = get_firestore_client()
    
    # 1. Create New School
    school_id = f"school_{uuid.uuid4().hex[:8]}"
    school_ref = db.collection("schools").document(school_id)
    
    school_ref.set({
        "school_name": school_name,
        "status": "ACTIVE",
        "subscription_tier": "PRO",
        "created_at": "2026-04-11T12:00:00Z",
        "settings": {
            "periods_per_day": 8,
            "days_per_week": 5
        }
    })
    
    print(f"Created New School: {school_name} (ID: {school_id})")
    
    # 2. Add Subjects
    subjects = [
        {"code": "ENG-9", "name": "English 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": True},
        {"code": "MTH-9", "name": "Mathematics 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": True},
        {"code": "SCI-9", "name": "Science 9", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "LAB", "is_mandatory": True},
        {"code": "ART-9", "name": "Visual Arts", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": False},
        {"code": "MUS-9", "name": "Music", "grade_level": 9, "required_periods_per_week": 5, "facility_type": "REGULAR", "is_mandatory": False},
    ]
    
    for s in subjects:
        doc_id = f"subj_{s['code'].lower().replace('-', '_')}"
        school_ref.collection("subjects").document(doc_id).set(s)
    
    print(f"  - Seeded {len(subjects)} subjects")

    # 3. Add Classrooms
    rooms = [
        {"code": "RM-101", "name": "Classroom 101", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
        {"code": "RM-102", "name": "Classroom 102", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
        {"code": "LAB-A", "name": "Science Lab A", "capacity": 25, "facility_type": "LAB", "is_gym": False},
    ]
    for r in rooms:
        school_ref.collection("classrooms").document(f"room_{r['code'].lower().replace('-', '_')}").set(r)
    
    print(f"  - Seeded {len(rooms)} classrooms")

    # 4. Add Teachers
    teachers = [
        {"first_name": "Alice", "last_name": "Smith", "email": "alice@demo.com", "specializations": ["ENG-9", "ART-9"], "max_periods_per_week": 25, "is_active": True},
        {"first_name": "Bob", "last_name": "Jones", "email": "bob@demo.com", "specializations": ["MTH-9", "SCI-9"], "max_periods_per_week": 25, "is_active": True},
        {"first_name": "Charlie", "last_name": "Davis", "email": "charlie@demo.com", "specializations": ["MUS-9", "SCI-9"], "max_periods_per_week": 25, "is_active": True},
    ]
    for t in teachers:
        school_ref.collection("teachers").document(f"teacher_{t['first_name'].lower()}").set(t)
    
    print(f"  - Seeded {len(teachers)} teachers")

    # 5. Add Students
    students = [
        {"first_name": "John", "last_name": "Doe", "email": "john@demo.com", "grade_level": 9, "requested_subjects": ["ART-9"]},
        {"first_name": "Jane", "last_name": "Smith", "email": "jane@demo.com", "grade_level": 9, "requested_subjects": ["MUS-9"]},
        {"first_name": "Alex", "last_name": "Taylor", "email": "alex@demo.com", "grade_level": 9, "requested_subjects": ["ART-9", "MUS-9"]},
    ]
    for s in students:
        school_ref.collection("students").document(f"stu_{s['first_name'].lower()}").set(s)
    
    print(f"  - Seeded {len(students)} students")

    print(f"\n✅ SUCCESS: Demo School Created!")
    print(f"School ID: {school_id}")
    return school_id

if __name__ == "__main__":
    seed_demo_school("Demo School")
