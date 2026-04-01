"""Audit logging service — mirrors the Node.js audit.service.js."""

from typing import Optional, Any
from fastapi import Request

from app.models.audit_log import AuditLog


async def create_audit_log(
    action: str,
    performed_by: Optional[str] = None,
    target_msme_id: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    request: Optional[Request] = None,
    payload: Optional[Any] = None,
) -> None:
    """Create an audit log entry. Errors are logged but never raised."""
    try:
        ip_address = request.client.host if request and request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown") if request else "unknown"

        log = AuditLog(
            action=action,
            performed_by=performed_by,
            target_msme_id=target_msme_id,
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            user_agent=user_agent,
            payload=payload,
        )
        await log.insert()
    except Exception as e:
        print(f"Audit log error: {e}")
