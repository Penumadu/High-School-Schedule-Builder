
import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.firebase import get_firestore_client

def sync_all_schools():
    db = get_firestore_client()
    
    print("Fetching master subjects...")
    master_subjects = [d.to_dict() for d in db.collection("master_subjects").stream()]
    if not master_subjects:
        print("No master subjects found. Please run upload_master.py first.")
        return

    schools = db.collection("schools").stream()
    
    for school in schools:
        school_id = school.id
        print(f"Syncing school: {school_id}...")
        
        # Check if school already has subjects
        existing_subjects = list(db.collection("schools").document(school_id).collection("subjects").limit(1).stream())
        if existing_subjects:
            print(f"School {school_id} already has subjects. Skipping to avoid duplicates.")
            continue
        
        batch = db.batch()
        count = 0
        for subj in master_subjects:
            import uuid
            new_id = f"subj_{uuid.uuid4().hex[:8]}"
            doc_ref = db.collection("schools").document(school_id).collection("subjects").document(new_id)
            batch.set(doc_ref, subj)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        
        batch.commit()
        print(f"Imported {count} subjects to {school_id}.")

if __name__ == "__main__":
    sync_all_schools()
