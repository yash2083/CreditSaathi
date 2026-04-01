"""JWT authentication service — mirrors the Node.js JWT logic."""

from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.models.user import User

security = HTTPBearer(auto_error=False)


def create_access_token(user_id: str) -> str:
    """Generate a short-lived access token."""
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"id": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    """Generate a long-lived refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    payload = {"id": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm="HS256")


def verify_access_token(token: str) -> dict:
    """Decode and verify an access token."""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token."},
        )


def verify_refresh_token(token: str) -> dict:
    """Decode and verify a refresh token."""
    try:
        payload = jwt.decode(token, settings.JWT_REFRESH_SECRET, algorithms=["HS256"])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Session expired, please log in again."},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> User:
    """FastAPI dependency — extract and validate the current user from JWT."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Authentication required."},
        )

    token = credentials.credentials
    payload = verify_access_token(token)
    user_id = payload.get("id")

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Invalid token."},
        )

    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "User not found."},
        )

    return user


def require_roles(*roles: str):
    """Factory for role-based access control dependency."""

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FORBIDDEN",
                    "message": "You do not have permission to perform this action.",
                },
            )
        return user

    return role_checker
