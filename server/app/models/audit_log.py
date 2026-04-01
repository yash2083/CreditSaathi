"""AuditLog document — mirrors the original Mongoose AuditLog schema."""

from beanie import Document
from pydantic import Field
from typing import Optional, Literal, Any
from datetime import datetime


class AuditLog(Document):
    action: Literal[
        "user_registered", "user_login", "user_logout",
        "msme_created", "msme_updated", "msme_deleted",
        "gst_uploaded", "transaction_uploaded",
        "score_generated",
        "loan_submitted", "loan_approved", "loan_rejected",
        "document_uploaded", "document_verified",
    ]
    performed_by: Optional[str] = None  # User ID
    target_msme_id: Optional[str] = None  # MSME ID
    entity_type: Optional[str] = None
    entity_id: Optional[str] = None
    ip_address: Optional[str] = "unknown"
    user_agent: Optional[str] = "unknown"
    payload: Optional[Any] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "auditlogs"
