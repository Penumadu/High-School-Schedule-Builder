
import sys
import os
import uuid
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client

def force_sync_subjects():
    db = get_firestore_client()
    
    print("Fetching master subjects...")
    master_docs = db.collection("master_subjects").stream()
    master_subjects = [d.to_dict() for d in master_docs]
    
    if not master_subjects:
        print("No master subjects found.")
        return

    schools = db.collection("schools").stream()
    
    for school in schools:
        school_id = school.id
        print(f"Force Syncing school: {school_id}...")
        
        # 1. Delete all existing subjects
        subjs_ref = db.collection("schools").document(school_id).collection("subjects")
        docs = subjs_ref.stream()
        batch = db.batch()
        deleted_count = 0
        for doc in docs:
            batch.delete(doc.reference)
            deleted_count += 1
            if deleted_count % 400 == 0:
                batch.commit()
                batch = db.batch()
        batch.commit()
        print(f"Deleted {deleted_count} existing subjects from {school_id}.")
        
        # 2. Add all master subjects
        batch = db.batch()
        added_count = 0
        for subj in master_subjects:
            new_id = f"subj_{uuid.uuid4().hex[:8]}"
            doc_ref = subjs_ref.document(new_id)
            batch.set(doc_ref, subj)
            added_count += 1
            if added_count % 400 == 0:
                batch.commit()
                batch = db.batch()
        
        if added_count > 0:
            batch.commit()
            print(f"Successfully added {added_count} master subjects to {school_id}.")

if __name__ == "__main__":
    force_sync_subjects()
