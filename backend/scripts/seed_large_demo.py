import uuid
import random
from app.core.firebase import get_firestore_client

def seed_large_data(school_id: str):
    db = get_firestore_client()
    school_ref = db.collection("schools").document(school_id)
    
    print(f"Expanding data for school: {school_id}")

    # --- 1. SUBJECTS ---
    subjects_data = [
        # Grade 9
        {"code": "ENG-9", "name": "English 9", "grade_level": 9, "is_mandatory": True, "type": "REGULAR"},
        {"code": "MTH-9", "name": "Math 9", "grade_level": 9, "is_mandatory": True, "type": "REGULAR"},
        {"code": "SCI-9", "name": "Science 9", "grade_level": 9, "is_mandatory": True, "type": "LAB"},
        # Grade 10
        {"code": "ENG-10", "name": "English 10", "grade_level": 10, "is_mandatory": True, "type": "REGULAR"},
        {"code": "MTH-10", "name": "Math 10", "grade_level": 10, "is_mandatory": True, "type": "REGULAR"},
        {"code": "HIS-10", "name": "History 10", "grade_level": 10, "is_mandatory": True, "type": "REGULAR"},
        # Grade 11
        {"code": "ENG-11", "name": "English 11", "grade_level": 11, "is_mandatory": True, "type": "REGULAR"},
        {"code": "PHY-11", "name": "Physics 11", "grade_level": 11, "is_mandatory": False, "type": "LAB"},
        {"code": "CHM-11", "name": "Chemistry 11", "grade_level": 11, "is_mandatory": False, "type": "LAB"},
        # Grade 12
        {"code": "ENG-12", "name": "English 12", "grade_level": 12, "is_mandatory": True, "type": "REGULAR"},
        {"code": "CALC-12", "name": "Calculus 12", "grade_level": 12, "is_mandatory": False, "type": "REGULAR"},
        # Electives (Any Grade)
        {"code": "CS-100", "name": "Comp Sci", "grade_level": 10, "is_mandatory": False, "type": "LAB"},
        {"code": "ART-100", "name": "Visual Arts", "grade_level": 9, "is_mandatory": False, "type": "REGULAR"},
        {"code": "DRA-100", "name": "Drama", "grade_level": 11, "is_mandatory": False, "type": "REGULAR"},
        {"code": "PE-100", "name": "Phys Ed", "grade_level": 9, "is_mandatory": False, "type": "GYM"},
    ]
    
    for s in subjects_data:
        school_ref.collection("subjects").document(f"subj_{s['code'].lower().replace('-', '_')}").set({
            "code": s["code"],
            "name": s["name"],
            "grade_level": s["grade_level"],
            "required_periods_per_week": 5,
            "facility_type": s["type"],
            "is_mandatory": s["is_mandatory"]
        })
    print(f"  - Added {len(subjects_data)} subjects")

    # --- 2. CLASSROOMS ---
    rooms = [
        {"code": "R101", "type": "REGULAR", "cap": 30},
        {"code": "R102", "type": "REGULAR", "cap": 30},
        {"code": "R103", "type": "REGULAR", "cap": 30},
        {"code": "R104", "type": "REGULAR", "cap": 30},
        {"code": "LAB-1", "type": "LAB", "cap": 24},
        {"code": "LAB-2", "type": "LAB", "cap": 24},
        {"code": "GYM-A", "type": "GYM", "cap": 100},
    ]
    for r in rooms:
        school_ref.collection("classrooms").document(f"room_{r['code'].lower()}").set({
            "code": r["code"],
            "name": f"Room {r['code']}",
            "capacity": r["cap"],
            "facility_type": r["type"],
            "is_gym": r["type"] == "GYM"
        })
    print(f"  - Added {len(rooms)} classrooms")

    # --- 3. TEACHERS ---
    first_names = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"]
    
    for i in range(12):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        # Give them specializations from the subjects above
        specs = [random.choice(subjects_data)["code"] for _ in range(2)]
        
        school_ref.collection("teachers").document(f"teacher_{i}").set({
            "first_name": fn,
            "last_name": ln,
            "email": f"{fn.lower()}.{ln.lower()}{i}@school.com",
            "specializations": list(set(specs)),
            "max_periods_per_week": random.randint(20, 30),
            "off_times": random.sample(range(1, 9), 2), # Busy 2 periods a day
            "is_active": True
        })
    print(f"  - Added 12 teachers with varied availability")

    # --- 4. STUDENTS ---
    for grade in [9, 10, 11, 12]:
        for i in range(12): # 12 students per grade
            fn = random.choice(first_names)
            ln = random.choice(last_names)
            
            # Elective choices based on grade
            possible_electives = [s["code"] for s in subjects_data if not s["is_mandatory"]]
            choices = random.sample(possible_electives, 2)
            
            school_ref.collection("students").document(f"stu_g{grade}_{i}").set({
                "first_name": fn,
                "last_name": ln,
                "email": f"std_{grade}_{i}@edu.com",
                "grade_level": grade,
                "requested_subjects": choices,
                "historical_grades": {}
            })
    print(f"  - Added 48 students (12 per grade level)")

    print(f"\n✅ SUCCESS: School '{school_id}' populated with large dataset!")

if __name__ == "__main__":
    seed_large_data("demo-school")
