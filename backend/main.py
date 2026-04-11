"""FastAPI application entry point — School Schedule Builder API."""

import logging
import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

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
    description="Multi-tenant scheduling platform for high schools",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware — allow all origins in production for now to avoid CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(imports.router, prefix=settings.API_V1_PREFIX)
app.include_router(schedule.router, prefix=settings.API_V1_PREFIX)
app.include_router(student_teacher.router, prefix=settings.API_V1_PREFIX)
app.include_router(export.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_event():
    """Initialize Firebase on app startup."""
    try:
        init_firebase()
        logger.info("✅ Firebase initialized successfully")
    except Exception as e:
        logger.warning(f"⚠️ Firebase initialization deferred: {e}")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
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
            "has_private_key": bool(os.getenv("FIREBASE_PRIVATE_KEY", "")),
            "has_client_email": bool(os.getenv("FIREBASE_CLIENT_EMAIL", "")),
            "project_id": settings.FIREBASE_PROJECT_ID,
        }
    }


@app.get("/api/v1/debug/routes")
async def debug_routes():
    """List all registered routes — for debugging 404s."""
    routes = []
    for route in app.routes:
        if hasattr(route, "methods"):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
            })
    return {"routes": routes, "total": len(routes)}
