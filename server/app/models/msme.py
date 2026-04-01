"""MSME document — mirrors the original Mongoose MSME schema."""

from beanie import Document, Indexed, Link
from pydantic import Field
from typing import Optional, Literal
from datetime import datetime
import re


class MSME(Document):
    owner: str  # User ID as string
    business_name: str
    gstin: Indexed(str, unique=True)
    pan: Optional[str] = None
    business_type: Literal["micro", "small", "medium"]
    sector: str
    incorporation_date: Optional[datetime] = None
    registered_state: str
    city: Optional[str] = None
    contact_email: str
    contact_phone: str
    udyam_registration_no: Optional[str] = None
    annual_turnover_band: Optional[Literal["<40L", "40L-1.5Cr", "1.5Cr-5Cr", "5Cr-25Cr", ">25Cr"]] = None
    employee_count: Optional[int] = None
    bank_account_linked: bool = False
    aa_consent_given: bool = False
    aa_consent_timestamp: Optional[datetime] = None
    latest_score_id: Optional[str] = None  # CreditScore ID
    status: Literal["active", "inactive", "flagged"] = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "msmes"

    def to_response_dict(self) -> dict:
        """Convert to frontend-compatible camelCase dict."""
        data = {
            "_id": str(self.id),
            "owner": self.owner,
            "businessName": self.business_name,
            "gstin": self.gstin,
            "pan": self.pan,
            "businessType": self.business_type,
            "sector": self.sector,
            "incorporationDate": self.incorporation_date.isoformat() if self.incorporation_date else None,
            "registeredState": self.registered_state,
            "city": self.city,
            "contactEmail": self.contact_email,
            "contactPhone": self.contact_phone,
            "udyamRegistrationNo": self.udyam_registration_no,
            "annualTurnoverBand": self.annual_turnover_band,
            "employeeCount": self.employee_count,
            "bankAccountLinked": self.bank_account_linked,
            "aaConsentGiven": self.aa_consent_given,
            "aaConsentTimestamp": self.aa_consent_timestamp.isoformat() if self.aa_consent_timestamp else None,
            "latestScoreId": self.latest_score_id,
            "status": self.status,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
        return data
