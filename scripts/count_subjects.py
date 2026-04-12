
import sys
import os
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client

def count_subjects():
    db = get_firestore_client()
    schools = ['corpus_christie_burlington', 'whiteoaks_oakville', 'demo-school', 'school_bb773cfd']
    print("Subject Counts:")
    for s in schools:
        count = len(list(db.collection('schools').document(s).collection('subjects').stream()))
        print(f"{s}: {count}")

if __name__ == "__main__":
    count_subjects()
