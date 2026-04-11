"""FastAPI application entry point — Defensive for Debugging."""

import logging
import os
import sys
import traceback
from fastapi import FastAPI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Defensive Diagnostic App")

# Global error storage to report via health check
IMPORT_ERROR = None
ROUTERS_LOADED = []

try:
    from app.core.config import settings
    from app.api import auth, system, admin, imports, schedule, student_teacher, export
    
    app.include_router(auth.router, prefix="/api/v1")
    ROUTERS_LOADED.append("auth")
    
    app.include_router(system.router, prefix="/api/v1")
    ROUTERS_LOADED.append("system")
    
    app.include_router(admin.router, prefix="/api/v1")
    ROUTERS_LOADED.append("admin")
    
    app.include_router(imports.router, prefix="/api/v1")
    ROUTERS_LOADED.append("imports")
    
    app.include_router(student_teacher.router, prefix="/api/v1")
    ROUTERS_LOADED.append("student_teacher")
    
    app.include_router(export.router, prefix="/api/v1")
    ROUTERS_LOADED.append("export")
    
except Exception as e:
    IMPORT_ERROR = {
        "error": str(e),
        "type": type(e).__name__,
        "traceback": traceback.format_exc()
    }
    logger.error(f"❌ CRITICAL IMPORT ERROR: {e}")

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "stable" if not IMPORT_ERROR else "degraded",
        "import_error": IMPORT_ERROR,
        "routers_loaded": ROUTERS_LOADED,
        "python_version": sys.version,
        "env_check": {
            "has_json": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")),
        }
    }

@app.get("/api/v1/debug/routes")
async def debug_routes():
    return {"routes": [r.path for r in app.routes], "error": bool(IMPORT_ERROR)}



