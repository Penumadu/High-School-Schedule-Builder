"""Application configuration loaded from environment variables."""

import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Central configuration for the application."""

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "serviceAccountKey.json")
    FIREBASE_SERVICE_ACCOUNT_JSON: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "highschool-schedule-bui")
    FIREBASE_CLIENT_EMAIL: str = os.getenv("FIREBASE_CLIENT_EMAIL", "")
    FIREBASE_PRIVATE_KEY: str = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

    # CORS
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    # Extended local origins for robust dev communication
    ALLOWED_ORIGINS: List[str] = os.getenv(
        "ALLOWED_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000,http://0.0.0.0:3000,http://localhost:3001"
    ).split(",")

    # Cache
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # SendGrid (stubbed – set to enable real email sending)
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv(
        "SENDGRID_FROM_EMAIL", "noreply@schedulerapp.com"
    )

    # App
    APP_NAME: str = "School Schedule Builder API"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"


settings = Settings()
