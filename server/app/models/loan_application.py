"""LoanApplication document — mirrors the original Mongoose LoanApplication schema."""

from beanie import Document
from pydantic import Field
from typing import Optional, Literal
from datetime import datetime


class LoanApplication(Document):
    msme_id: str
    applicant: str  # User ID
    assigned_officer: Optional[str] = None  # User ID
    score_id: str  # CreditScore ID
    requested_amount: float = Field(ge=0)
    loan_purpose: Literal["working_capital", "equipment", "expansion", "other"]
    repayment_tenure: Optional[int] = None  # months
    status: Literal["submitted", "under_review", "approved", "rejected", "disbursed"] = "submitted"
    officer_remarks: Optional[str] = None
    approved_amount: Optional[float] = None
    decision_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "loanapplications"

    def to_response_dict(self) -> dict:
        return {
            "_id": str(self.id),
            "msmeId": self.msme_id,
            "applicant": self.applicant,
            "assignedOfficer": self.assigned_officer,
            "scoreId": self.score_id,
            "requestedAmount": self.requested_amount,
            "loanPurpose": self.loan_purpose,
            "repaymentTenure": self.repayment_tenure,
            "status": self.status,
            "officerRemarks": self.officer_remarks,
            "approvedAmount": self.approved_amount,
            "decisionDate": self.decision_date.isoformat() if self.decision_date else None,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
