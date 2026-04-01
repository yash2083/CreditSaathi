"""CreditScore document — mirrors the original Mongoose CreditScore schema."""

from beanie import Document
from pydantic import Field
from typing import Optional, Literal, Any
from datetime import datetime


class SHAPSummaryItem(dict):
    pass


class StressSignalItem(dict):
    pass


class FraudFlagItem(dict):
    pass


class CreditScore(Document):
    msme_id: str
    generated_by: str
    score_value: int = Field(ge=300, le=850)
    risk_category: Literal["Low", "Medium", "High"]
    model_version: str = "xgboost_v1"
    shap_values: Optional[dict] = None
    shap_summary: Optional[list] = None
    feature_input_snapshot: Optional[dict] = None
    recommended_loan_amount: Optional[float] = None
    recommended_interest_band: Optional[str] = None
    eligible_government_schemes: list[str] = []
    stress_signals: list[dict] = []
    fraud_flags: list[dict] = []
    explanation_text: Optional[str] = None
    audit_hash: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "creditscores"

    def to_response_dict(self) -> dict:
        return {
            "_id": str(self.id),
            "msmeId": self.msme_id,
            "generatedBy": self.generated_by,
            "scoreValue": self.score_value,
            "riskCategory": self.risk_category,
            "modelVersion": self.model_version,
            "shapValues": self.shap_values,
            "shapSummary": self.shap_summary,
            "featureInputSnapshot": self.feature_input_snapshot,
            "recommendedLoanAmount": self.recommended_loan_amount,
            "recommendedInterestBand": self.recommended_interest_band,
            "eligibleGovernmentSchemes": self.eligible_government_schemes,
            "stressSignals": self.stress_signals,
            "fraudFlags": self.fraud_flags,
            "explanationText": self.explanation_text,
            "auditHash": self.audit_hash,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
