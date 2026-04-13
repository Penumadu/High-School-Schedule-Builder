import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.firebase import get_firestore_client
from google.api_core import exceptions

def test_connection():
    try:
        db = get_firestore_client()
        print("--- Testing Firebase Connection ---")
        
        # Try to list schools
        schools_ref = db.collection("schools")
        docs = list(schools_ref.limit(1).stream())
        
        print(f"Connection Successful! Found {len(docs)} schools in the first peek.")
        
    except exceptions.ResourceExhausted as e:
        print("\n❌ QUOTA EXCEEDED!")
        print(f"Message: {e.message}")
        print("Firebase has restricted your API calls due to daily usage limits.")
        
    except exceptions.PermissionDenied as e:
        print("\n❌ PERMISSION DENIED!")
        print(f"Message: {e.message}")
        print("Your service account does not have access to this project.")
        
    except Exception as e:
        print(f"\n❌ UNKNOWN ERROR: {type(e).__name__}")
        print(f"Details: {str(e)}")

if __name__ == "__main__":
    test_connection()
