
import os
import sys
from dotenv import load_dotenv

# Add backend to path and load env
sys.path.append(os.path.join(os.getcwd(), 'backend'))
load_dotenv('backend/.env')

from app.core.firebase import get_firestore_client

def check_school_data(school_id):
    db = get_firestore_client()
    print(f"Checking data for school: {school_id}")
    
    collections = ['staff', 'subjects', 'students', 'classrooms']
    for coll in collections:
        ref = db.collection('schools').document(school_id).collection(coll)
        count = len(list(ref.limit(5).stream()))
        print(f" - {coll}: {count} records found (limited to 5)")

if __name__ == "__main__":
    check_school_data('demo-school')
    check_school_data('corpus_christie_burlington')
