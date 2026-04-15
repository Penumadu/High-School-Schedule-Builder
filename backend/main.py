"""FastAPI application entry point — School Schedule Builder API."""

import os
import sys
import logging

# Ensure the backend directory is in the Python path for Vercel
sys.path.append(os.path.dirname(__file__))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.firebase import init_firebase
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
from redis import asyncio as aioredis
from app.api import auth, system, admin, imports, schedule, student_teacher, export, settings as school_settings
from fastapi import Request
from fastapi.responses import JSONResponse
from google.api_core import exceptions as google_exceptions

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
)

@app.on_event("startup")
async def startup():
    if settings.REDIS_URL:
        # Use Redis if URL is provided
        redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
        FastAPICache.init(RedisBackend(redis), prefix="fastapi-cache")
    else:
        # Fallback to In-Memory
        FastAPICache.init(InMemoryBackend(), prefix="fastapi-cache")
    
    # Initialize Firebase
    init_firebase()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Ensure all errors include CORS headers for frontend debugging."""
    logger.error(f"Global error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "error_type": "INTERNAL_SERVER_ERROR"},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

@app.exception_handler(google_exceptions.ResourceExhausted)
async def quota_exception_handler(request: Request, exc: google_exceptions.ResourceExhausted):
    """Handle Firebase/Google Cloud Quota Exceeded errors gracefully."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Firebase Quota Exceeded. Please try again tomorrow or upgrade your plan.",
            "error_type": "QUOTA_EXHAUSTED"
        },
        headers={
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        }
    )

app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(system.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(imports.router, prefix=settings.API_V1_PREFIX)
app.include_router(schedule.router, prefix=settings.API_V1_PREFIX)
app.include_router(student_teacher.router, prefix=settings.API_V1_PREFIX)
app.include_router(export.router, prefix=settings.API_V1_PREFIX)
app.include_router(school_settings.router, prefix=settings.API_V1_PREFIX)

# CORS middleware - MUST be added AFTER all routers to wrap all responses (including errors)
# as the outermost layer in Starlette.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS + ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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



