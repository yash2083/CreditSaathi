"""Auth routes — mirrors /api/v1/auth/* from the Express backend."""

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from app.models.user import User
from app.services.auth_service import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_user,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/auth", tags=["Auth"])


# ── Request Schemas ────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    organisationName: Optional[str] = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refreshToken: str


# ── POST /api/v1/auth/register ─────────────────────────
@router.post("/register", status_code=201)
async def register(body: RegisterRequest, request: Request):
    if not body.name or not body.email or not body.password or not body.role:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Name, email, password, and role are required."}})

    if body.role not in ["bank_officer", "msme_owner"]:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Role must be bank_officer or msme_owner."}})

    existing = await User.find_one(User.email == body.email.lower())
    if existing:
        return JSONResponse(status_code=409, content={"success": False, "error": {"code": "DUPLICATE", "message": "An account with this email already exists."}})

    user = User(
        name=body.name,
        email=body.email.lower(),
        password_hash=User.hash_password(body.password),
        role=body.role,
        organisation_name=body.organisationName or "",
        organisation_type="msme" if body.role == "msme_owner" else "bank",
    )
    await user.insert()

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    user.refresh_token = refresh_token
    await user.save()

    await create_audit_log(action="user_registered", performed_by=str(user.id), request=request)

    return {
        "success": True,
        "message": "Registration successful",
        "data": {
            "user": user.to_safe_dict(),
            "accessToken": access_token,
            "refreshToken": refresh_token,
        },
    }


# ── POST /api/v1/auth/login ───────────────────────────
@router.post("/login")
async def login(body: LoginRequest, request: Request):
    if not body.email or not body.password:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Email and password are required."}})

    user = await User.find_one(User.email == body.email.lower())

    if not user:
        return JSONResponse(status_code=401, content={"success": False, "error": {"code": "AUTH_FAILED", "message": "Invalid email or password."}})

    if user.is_locked():
        return JSONResponse(status_code=423, content={"success": False, "error": {"code": "ACCOUNT_LOCKED", "message": "Account is temporarily locked. Try again later."}})

    if not user.verify_password(body.password):
        user.login_attempts += 1
        if user.login_attempts >= 5:
            from datetime import datetime, timedelta
            user.lock_until = datetime.utcnow() + timedelta(minutes=15)
            user.login_attempts = 0
        await user.save()
        return JSONResponse(status_code=401, content={"success": False, "error": {"code": "AUTH_FAILED", "message": "Invalid email or password."}})

    # Reset login attempts on success
    user.login_attempts = 0
    user.lock_until = None

    access_token = create_access_token(str(user.id))
    refresh_token = create_refresh_token(str(user.id))
    user.refresh_token = refresh_token
    await user.save()

    await create_audit_log(action="user_login", performed_by=str(user.id), request=request)

    return {
        "success": True,
        "message": "Login successful",
        "data": {
            "user": user.to_safe_dict(),
            "accessToken": access_token,
            "refreshToken": refresh_token,
        },
    }


# ── POST /api/v1/auth/refresh ─────────────────────────
@router.post("/refresh")
async def refresh_token_handler(body: RefreshRequest):
    if not body.refreshToken:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Refresh token is required."}})

    payload = verify_refresh_token(body.refreshToken)
    user = await User.get(payload["id"])

    if not user or user.refresh_token != body.refreshToken:
        return JSONResponse(status_code=401, content={"success": False, "error": {"code": "UNAUTHORIZED", "message": "Invalid refresh token."}})

    new_access_token = create_access_token(str(user.id))
    new_refresh_token = create_refresh_token(str(user.id))
    user.refresh_token = new_refresh_token
    await user.save()

    return {
        "success": True,
        "data": {
            "accessToken": new_access_token,
            "refreshToken": new_refresh_token,
        },
    }


# ── POST /api/v1/auth/logout ──────────────────────────
@router.post("/logout")
async def logout(request: Request, user: User = Depends(get_current_user)):
    user.refresh_token = None
    await user.save()
    await create_audit_log(action="user_logout", performed_by=str(user.id), request=request)
    return {"success": True, "message": "Logged out successfully"}


# ── GET /api/v1/auth/me ───────────────────────────────
@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"success": True, "data": {"user": user.to_safe_dict()}}
