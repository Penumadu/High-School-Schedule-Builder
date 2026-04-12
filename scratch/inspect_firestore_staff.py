
import os
import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred_path = os.environ.get('FIREBASE_SERVICE_ACCOUNT_PATH')
if not cred_path:
    # Look for it in the workspace
    for root, dirs, files in os.walk('.'):
        for file in files:
            if file.endswith('.json') and 'firebase' in file.lower():
                cred_path = os.path.join(root, file)
                break
        if cred_path: break

if not cred_path:
    print("Could not find Firebase service account key.")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)
db = firestore.client()

# School ID for Corpus Christie
school_id = "corpus_christie"

print(f"Checking staff for school: {school_id}")
staff_ref = db.collection('schools').document(school_id).collection('staff')
docs = staff_ref.limit(5).stream()

for doc in docs:
    print(f"\nID: {doc.id}")
    print(doc.to_dict())
