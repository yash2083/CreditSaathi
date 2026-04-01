"""User document — mirrors the original Mongoose User schema."""

from beanie import Document, Indexed
from pydantic import Field, EmailStr
from typing import Optional, Literal
from datetime import datetime

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User(Document):
    name: str
    email: Indexed(str, unique=True)
    password_hash: str
    role: Literal["admin", "bank_officer", "msme_owner"]
    organisation_name: Optional[str] = ""
    organisation_type: Optional[Literal["bank", "nbfc", "msme"]] = None
    is_verified: bool = True
    refresh_token: Optional[str] = None
    login_attempts: int = 0
    lock_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"

    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.password_hash)

    @staticmethod
    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def is_locked(self) -> bool:
        if self.lock_until and self.lock_until > datetime.utcnow():
            return True
        return False

    def to_safe_dict(self) -> dict:
        """Return user data without sensitive fields."""
        return {
            "id": str(self.id),
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "organisationName": self.organisation_name,
        }
