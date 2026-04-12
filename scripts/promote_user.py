import sys
import os

# Add backend to path so we can import app modules
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

import firebase_admin
from firebase_admin import auth, credentials
from app.core.firebase import get_firebase_app

def promote_user(email: str, role: str = "SUPER_ADMIN"):
    # Initialize Firebase
    get_firebase_app()
    
    try:
        user = auth.get_user_by_email(email)
        auth.set_custom_user_claims(user.uid, {'role': role})
        print(f"✅ SUCCESS: User {email} is now a {role}")
        print(f"User UID: {user.uid}")
        print("Please log out and log back in on the website for changes to take effect.")
    except Exception as e:
        print(f"❌ ERROR: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/promote_user.py your-email@example.com")
    else:
        promote_user(sys.argv[1])
