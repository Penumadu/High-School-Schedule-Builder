
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
        subjs_ref = db.collection("schools").document(school_id).collection("subjects")
        
        # Optimized Upsert: Only write if needed, use course code as ID
        batch = db.batch()
        count = 0
        for subj in master_subjects:
            code = subj.get('code', 'unknown')
            # Using the code as the ID avoids duplicates and the need for deletions
            doc_ref = subjs_ref.document(code)
            batch.set(doc_ref, subj, merge=True)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        print(f"Successfully synced/merged {count} master subjects to {school_id}.")

if __name__ == "__main__":
    force_sync_subjects()
