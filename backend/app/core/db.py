from app.core.firebase import get_firestore_client

class FirestoreRepo:
    """
    Generic repository to handle repetitive Firestore CRUD.
    Reduces boilerplate in the API controllers.
    """
    def __init__(self, school_id: str, collection_name: str):
        self.db = get_firestore_client()
        self.school_id = school_id
        self.collection_name = collection_name
        self.ref = self.db.collection("schools").document(school_id).collection(collection_name)

    def list_all(self):
        """Streams all docs and returns list of dicts with IDs. Fallbacks to demo data if quota hit."""
        try:
            return [{**d.to_dict(), "id": d.id} for d in self.ref.stream()]
        except Exception as e:
            if self.school_id == "demo-school":
                return self._get_demo_data()
            raise e

    def _get_demo_data(self):
        """Rich mock data for full-featured testing in Quota/Demo mode."""
        if self.collection_name == "teachers":
            return [
                {"id": f"t{i}", "teacher_id": f"t{i}", "first_name": name, "last_name": last, "email": f"{name.lower()}@demo.edu", "specializations": specs, "max_periods_per_week": 25, "is_active": True}
                for i, (name, last, specs) in enumerate([
                    ("John", "Doe", ["Math", "Physics"]), ("Sarah", "Connor", ["History", "English"]),
                    ("Jane", "Smith", ["Chemistry", "Biology"]), ("Robert", "Brown", ["Physical Ed"]),
                    ("Michael", "Jordan", ["Physical Ed", "Math"]), ("Emily", "Davis", ["English", "Art"]),
                    ("David", "Wilson", ["Computer Science", "Math"]), ("Linda", "Taylor", ["Music", "History"]),
                    ("Kevin", "Bacon", ["Art", "Drama"]), ("Steve", "Jobs", ["Computer Science"]),
                    ("Maria", "Garcia", ["Spanish", "English"]), ("James", "Bond", ["Security", "Physical Ed"])
                ])
            ]
        elif self.collection_name == "subjects":
            return [
                {"id": code, "subject_id": code, "code": code, "name": name, "grade_level": grade, "department": dept, "facility_type": ft, "is_mandatory": mandatory, "required_periods_per_week": p}
                for code, name, grade, dept, ft, mandatory, p in [
                    ("MATH101", "Algebra II", "10", "Math", "REGULAR", True, 5),
                    ("MATH201", "Calculus", "12", "Math", "REGULAR", False, 5),
                    ("SCI101", "Physics I", "10", "Science", "LAB", True, 4),
                    ("SCI202", "Organic Chemistry", "11", "Science", "LAB", False, 4),
                    ("ENG101", "English Literature", "9", "English", "REGULAR", True, 5),
                    ("ENG303", "World Poetry", "12", "English", "REGULAR", False, 3),
                    ("HIST101", "World History", "10", "History", "REGULAR", True, 4),
                    ("ART101", "Digital Arts", "11", "Arts", "COMPUTER", False, 3),
                    ("MUS101", "Chorus", "9", "Arts", "MUSIC", False, 2),
                    ("CS101", "Intro to Python", "10", "Tech", "COMPUTER", False, 4),
                    ("PE-01", "Varsity Sports", "11", "Athletics", "GYM", True, 2),
                    ("SPAN101", "Spanish I", "9", "Languages", "REGULAR", True, 5),
                    ("BIO101", "Biology Basics", "9", "Science", "LAB", True, 4),
                    ("DRAMA1", "Theatre Arts", "10", "Arts", "REGULAR", False, 3),
                    ("ECON1", "Economics", "11", "SocSci", "REGULAR", True, 3)
                ]
            ]
        elif self.collection_name == "students":
            import random
            random.seed(42) # Deterministic for testing
            first_names = ["Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah", "Ian", "Julia", "Kevin", "Laura", "Mike", "Nina", "Oscar", "Paula", "Quinn", "Rose", "Sam", "Tina", "Umar", "Vera", "Will", "Xena", "Yosef"]
            last_names = ["Smith", "Jones", "Williams", "Brown", "Taylor", "Miller", "Wilson", "Moore", "Anderson", "Thomas"]
            subject_pool = ["MATH101", "SCI101", "ENG101", "HIST101", "PE-01", "SPAN101", "BIO101"]
            return [
                {
                    "id": f"s{i}", "student_id": f"s{i}", "first_name": first_names[i], "last_name": random.choice(last_names),
                    "email": f"{first_names[i].lower()}@stu.demo.edu", "grade_level": random.choice([9, 10, 11, 12]),
                    "requested_subjects": random.sample(subject_pool, k=random.randint(3, 5)),
                    "last_schedule_email_status": "NOT SENT"
                } for i in range(len(first_names))
            ]
        elif self.collection_name == "classrooms":
            return [
                {"id": "r1", "room_id": "r1", "code": "RM101", "name": "Math Wing A", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
                {"id": "r2", "room_id": "r2", "code": "RM102", "name": "History Wing B", "capacity": 30, "facility_type": "REGULAR", "is_gym": False},
                {"id": "r3", "room_id": "r3", "code": "LAB-1", "name": "Science Lab A", "capacity": 24, "facility_type": "LAB", "is_gym": False},
                {"id": "r4", "room_id": "r4", "code": "LAB-2", "name": "Biology Lab", "capacity": 24, "facility_type": "LAB", "is_gym": False},
                {"id": "r5", "room_id": "r5", "code": "COMP-1", "name": "IT Lab 1", "capacity": 25, "facility_type": "COMPUTER", "is_gym": False},
                {"id": "r6", "room_id": "r6", "code": "GYM-1", "name": "Main Gym", "capacity": 100, "facility_type": "GYM", "is_gym": True},
                {"id": "r7", "room_id": "r7", "code": "MUSIC-1", "name": "Sound Studio", "capacity": 20, "facility_type": "MUSIC", "is_gym": False},
                {"id": "r8", "room_id": "r8", "code": "ART-1", "name": "Art Studio", "capacity": 25, "facility_type": "ART", "is_gym": False},
            ]
        elif self.collection_name == "rules":
            return [
                {
                    "id": "rule_1", "rule_id": "rule_1", "name": "Calculus Prerequisite", 
                    "type": "ACADEMIC", "is_active": True,
                    "target_subject_id": "MATH201",
                    "logic_tree": {
                        "condition": "AND",
                        "rules": [
                            {"type": "ACADEMIC", "prerequisite": "MATH101", "operator": ">=", "value": 80}
                        ]
                    }
                },
                {
                    "id": "rule_2", "rule_id": "rule_2", "name": "Physics I Requirement", 
                    "type": "ACADEMIC", "is_active": True,
                    "target_subject_id": "SCI101",
                    "logic_tree": {
                        "condition": "OR",
                        "rules": [
                            {"type": "ACADEMIC", "prerequisite": "MATH101", "operator": ">=", "value": 75},
                            {"type": "ACADEMIC", "prerequisite": "MATH201", "operator": ">", "value": 60}
                        ]
                    }
                },
                {
                    "id": "rule_3", "rule_id": "rule_3", "name": "Math Department Head Lock", 
                    "type": "TEACHER", "is_active": True,
                    "target_subject_id": "MATH201",
                    "logic_tree": {
                        "type": "TEACHER", "teacher_id": "t6" # David Wilson
                    }
                },
                {
                    "id": "rule_4", "rule_id": "rule_4", "name": "Afternoon PE Only", 
                    "type": "PERIOD", "is_active": True,
                    "target_subject_id": "PE-01",
                    "logic_tree": {
                        "condition": "OR",
                        "rules": [
                            {"type": "PERIOD", "period": 7},
                            {"type": "PERIOD", "period": 8}
                        ]
                    }
                }
            ]
        return []

    def get_one(self, doc_id: str):
        """Fetches one document or returns None."""
        try:
            doc = self.ref.document(doc_id).get()
            return {**doc.to_dict(), "id": doc.id} if doc.exists else None
        except Exception as e:
            if self.school_id == "demo-school":
                all_data = self._get_demo_data()
                return next((d for d in all_data if d["id"] == doc_id), None)
            raise e

    def upsert(self, doc_id: str, data: dict):
        """Creates or merges document data."""
        try:
            self.ref.document(doc_id).set(data, merge=True)
            return {**data, "id": doc_id}
        except Exception as e:
            if ("Quota exceeded" in str(e) or "429" in str(e)) and self.school_id == "demo-school":
                return {**data, "id": doc_id} # Mock success
            raise e

    def remove(self, doc_id: str):
        """Deletes a document."""
        try:
            self.ref.document(doc_id).delete()
        except Exception as e:
            if ("Quota exceeded" in str(e) or "429" in str(e)) and self.school_id == "demo-school":
                return # Mock success
            raise e
