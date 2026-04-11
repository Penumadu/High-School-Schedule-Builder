"""Firebase Admin SDK initialization — singleton pattern."""

import os
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth

from app.core.config import settings

_app = None


def get_firebase_app():
    """Initialize and return the Firebase Admin app (singleton)."""
    global _app
    if _app is not None:
        return _app

    # Priority 1: Full JSON string (Easiest for Vercel)
    if settings.FIREBASE_SERVICE_ACCOUNT_JSON:
        try:
            info = json.loads(settings.FIREBASE_SERVICE_ACCOUNT_JSON)
            cred = credentials.Certificate(info)
            _app = firebase_admin.initialize_app(cred)
            return _app
        except Exception as e:
            print(f"Error parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

    # Priority 2: Individual Environment Variables
    if settings.FIREBASE_PRIVATE_KEY and settings.FIREBASE_CLIENT_EMAIL:
        cred = credentials.Certificate({
            "project_id": settings.FIREBASE_PROJECT_ID,
            "private_key": settings.FIREBASE_PRIVATE_KEY,
            "client_email": settings.FIREBASE_CLIENT_EMAIL,
            "type": "service_account"
        })
        _app = firebase_admin.initialize_app(cred)
    
    # Priority 2: Service Account File (Best for local development)
    elif os.path.exists(settings.FIREBASE_CREDENTIALS_PATH):
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _app = firebase_admin.initialize_app(cred)
    
    # Priority 3: Application Default Credentials (Best for Cloud Run/GCP)
    else:
        _app = firebase_admin.initialize_app(options={
            "projectId": settings.FIREBASE_PROJECT_ID,
        })

    return _app


def get_firestore_client():
    """Return the Firestore client."""
    get_firebase_app()
    return firestore.client()


def get_auth_client():
    """Return the Firebase Auth module (used for user management)."""
    get_firebase_app()
    return firebase_auth


# Convenient singleton references
db = None
auth_client = None


def init_firebase():
    """Call once at startup to initialize Firebase resources."""
    global db, auth_client
    get_firebase_app()
    db = get_firestore_client()
    auth_client = get_auth_client()
    return db, auth_client
