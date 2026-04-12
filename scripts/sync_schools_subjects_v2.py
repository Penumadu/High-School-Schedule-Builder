
import sys
import os
import uuid

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# We'll use a local function to search for .env since load_dotenv might not be installed in the context
# but we can set the env var manually in the run_command if needed.
from app.core.firebase import get_firestore_client

def sync_all_schools():
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
        print(f"Syncing school: {school_id}...")
        
        # Get existing codes to avoid duplicates
        existing_docs = db.collection("schools").document(school_id).collection("subjects").stream()
        existing_codes = {d.to_dict().get("code") for d in existing_docs}
        
        batch = db.batch()
        count = 0
        for subj in master_subjects:
            if subj.get("code") in existing_codes:
                continue
                
            new_id = f"subj_{uuid.uuid4().hex[:8]}"
            doc_ref = db.collection("schools").document(school_id).collection("subjects").document(new_id)
            batch.set(doc_ref, subj)
            count += 1
            if count % 400 == 0:
                batch.commit()
                batch = db.batch()
        
        if count > 0:
            batch.commit()
            print(f"Successfully added {count} new subjects to {school_id}.")
        else:
            print(f"School {school_id} is already up to date.")

if __name__ == "__main__":
    sync_all_schools()
