"""FastAPI application entry point — School Schedule Builder API."""

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.firebase import init_firebase
from app.api import auth, system, admin, imports, schedule, student_teacher, export

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers (excluding schedule for now to test stability)
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(imports.router, prefix=settings.API_V1_PREFIX)
# app.include_router(schedule.router, prefix=settings.API_V1_PREFIX)
app.include_router(student_teacher.router, prefix=settings.API_V1_PREFIX)
app.include_router(export.router, prefix=settings.API_V1_PREFIX)


@app.get(f"{settings.API_V1_PREFIX}/health")
async def health_check():
    """Health check with Firebase status."""
    firebase_ok = False
    firebase_error = ""
    try:
        from app.core.firebase import get_firebase_app
        get_firebase_app()
        firebase_ok = True
    except Exception as e:
        firebase_error = str(e)

    return {
        "status": "healthy",
        "firebase": "connected" if firebase_ok else f"error: {firebase_error}",
        "env_check": {
            "has_service_account_json": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "")),
            "project_id": settings.FIREBASE_PROJECT_ID,
        }
    }

@app.get("/api/v1/debug/routes")
async def debug_routes():
    return {"routes": [r.path for r in app.routes]}


