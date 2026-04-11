"""Authentication dependencies for FastAPI routes."""

from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from firebase_admin import auth as firebase_auth

from app.core.firebase import get_firebase_app


async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Verify the Firebase ID token from the Authorization header.
    Returns a dict with uid, email, role, school_id from custom claims.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )

    token = authorization.split("Bearer ")[1]

    if token == "mock-token":
        # Demo mode bypass for local testing without Firebase config
        return {
            "uid": "demo-user",
            "email": "admin@demo.edu",
            "role": "SUPER_ADMIN",
            "school_id": "demo-school",
        }

    try:
        get_firebase_app()
        decoded = firebase_auth.verify_id_token(token)
    except firebase_auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid ID token",
        )
    except firebase_auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Expired ID token",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
        )

    return {
        "uid": decoded["uid"],
        "email": decoded.get("email", ""),
        "role": decoded.get("role", ""),
        "school_id": decoded.get("school_id", ""),
    }


def require_role(*allowed_roles: str):
    """
    Dependency factory: checks that the current user has one of the allowed roles.
    Usage: Depends(require_role("SUPER_ADMIN", "PRINCIPAL"))
    """

    async def _check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user['role']}' is not authorized. Required: {allowed_roles}",
            )
        return user

    return _check


def require_school_access(school_id_param: str = "school_id"):
    """
    Dependency factory: ensures the user belongs to the specified school
    (or is a SUPER_ADMIN who has global access).
    The school_id is read from the path/query parameter named `school_id_param`.
    """

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
