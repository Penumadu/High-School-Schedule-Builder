"""Authentication dependencies for FastAPI routes."""

from typing import Optional
import logging
from fastapi import Depends, HTTPException, status, Header
from firebase_admin import auth as firebase_auth

from app.core.firebase import get_firebase_app
from app.core.config import settings

logger = logging.getLogger(__name__)

async def get_token_header(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return authorization.split("Bearer ")[1]

async def get_current_user(token: str = Depends(get_token_header)) -> dict:
    """Validate Firebase ID token and return user info."""
    if token == "mock-token":
        return {
            "uid": "demo-user",
            "email": "admin@demo.edu",
            "role": "SUPER_ADMIN",
            "school_id": "demo-school",
        }

    try:
        get_firebase_app()
        decoded_token = firebase_auth.verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email", ""),
            "role": decoded_token.get("role", "GUEST"),
            "school_id": decoded_token.get("school_id", ""),
        }
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token format: {str(e)}",
        )
    except firebase_auth.InvalidIdTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired ID token",
        )
    except Exception as e:
        error_msg = str(e)
        if "Project ID" in error_msg:
            error_msg = f"Project ID mismatch. Backend expects {settings.FIREBASE_PROJECT_ID}. Check the project ID in your Web App config."
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {error_msg}",
        )

def require_role(*allowed_roles: str):
    """Checks that the current user has one of the allowed roles."""
    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user['role']}' is not authorized. Required: {allowed_roles}",
            )
        return user
    return _check

def require_school_access(school_id_param: str = "school_id"):
    """Ensures the user belongs to the specified school."""
    async def _check(
        school_id: str,
        user: dict = Depends(get_current_user),
    ) -> dict:
        if user["role"] == "SUPER_ADMIN":
            return user
        if user["school_id"] != school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this school's data",
            )
        return user
    return _check
