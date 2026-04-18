from app.core.db import _repo
school_id = "demo-school" # or whatever the default is, let's list all schools or just use the firebase admin directly
from app.core.firebase import get_firebase_app
from firebase_admin import firestore
get_firebase_app()
db = firestore.client()
schools = db.collection("schools").limit(1).get()
if schools:
    school_id = schools[0].id
    print("School ID:", school_id)
    teachers = db.collection(f"schools/{school_id}/teachers").limit(5).get()
    for t in teachers:
        print(f"Teacher {t.id}: {t.to_dict()}")
