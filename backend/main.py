"""FastAPI application entry point — Minimal for Debugging."""

import logging
import os
from fastapi import FastAPI

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="Diagnostic App")

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "diagnostic_mode": True,
        "env_check": {
            "has_json": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")),
        }
    }

@app.get("/api/v1/debug/routes")
async def debug_routes():
    return {"routes": [r.path for r in app.routes]}

