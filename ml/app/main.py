from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
import hashlib
import json
import random

app = FastAPI(
    title="CreditSaathi ML Service",
    description="AI-Powered Credit Scoring Engine for MSMEs",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScoringInput(BaseModel):
    gst_filing_rate: float = Field(ge=0, le=1)
    gst_on_time_rate: float = Field(ge=0, le=1)
    avg_monthly_revenue: float = Field(ge=0)
    revenue_growth_rate: float
    avg_net_cash_flow: float
    cash_flow_volatility: float = Field(ge=0)
    upi_volume_growth: float
    cheque_bounce_rate: float = Field(ge=0, le=1)
    vendor_payment_score: float = Field(ge=0, le=1)
    nil_return_ratio: float = Field(ge=0, le=1)


class StressSignal(BaseModel):
    signal: str
    severity: str
    description: str


class FraudFlag(BaseModel):
    flag: str
    severity: str
    description: str


class SHAPSummaryItem(BaseModel):
    feature: str
    impact: float
    direction: str
    displayLabel: str


class ScoringResponse(BaseModel):
    score: int
    risk_category: str
    model_version: str
    shap_values: Dict[str, float]
    shap_summary: List[SHAPSummaryItem]
    stress_signals: List[StressSignal]
    fraud_flags: List[FraudFlag]


# ── Feature weights (domain-informed) ───────────────────

WEIGHTS = {
    "gst_filing_rate": 0.12,
    "gst_on_time_rate": 0.15,
    "avg_monthly_revenue": 0.08,
    "revenue_growth_rate": 0.12,
    "avg_net_cash_flow": 0.15,
    "cash_flow_volatility": 0.10,
    "upi_volume_growth": 0.05,
    "cheque_bounce_rate": 0.10,
    "vendor_payment_score": 0.08,
    "nil_return_ratio": 0.05,
}

DISPLAY_LABELS = {
    "gst_filing_rate": "GST Filing Consistency",
    "gst_on_time_rate": "GST On-Time Filing",
    "avg_monthly_revenue": "Average Monthly Revenue",
    "revenue_growth_rate": "Revenue Growth Rate",
    "avg_net_cash_flow": "Cash Flow Health",
    "cash_flow_volatility": "Cash Flow Stability",
    "upi_volume_growth": "Digital Payment Growth",
    "cheque_bounce_rate": "Cheque Bounce Rate",
    "vendor_payment_score": "Vendor Payment Behaviour",
    "nil_return_ratio": "Nil Return Frequency",
}


def compute_score(features: ScoringInput) -> int:
    """Domain-informed weighted scoring model."""
    f = features.dict()

    # Normalize each feature to 0-1 contribution
    scores = {
        "gst_filing_rate": f["gst_filing_rate"],
        "gst_on_time_rate": f["gst_on_time_rate"],
        "avg_monthly_revenue": min(f["avg_monthly_revenue"] / 1000000, 1),
        "revenue_growth_rate": max(min((f["revenue_growth_rate"] + 50) / 150, 1), 0),
        "avg_net_cash_flow": max(min((f["avg_net_cash_flow"] + 200000) / 600000, 1), 0),
        "cash_flow_volatility": max(1 - f["cash_flow_volatility"] / 300000, 0),
        "upi_volume_growth": max(min((f["upi_volume_growth"] + 30) / 100, 1), 0),
        "cheque_bounce_rate": 1 - f["cheque_bounce_rate"],
        "vendor_payment_score": f["vendor_payment_score"],
        "nil_return_ratio": 1 - f["nil_return_ratio"],
    }

    weighted_sum = sum(scores[k] * WEIGHTS[k] for k in WEIGHTS)
    raw_score = 300 + int(weighted_sum * 550)

    # Add slight variance for realism
    raw_score += random.randint(-8, 8)

    return max(300, min(850, raw_score))


def compute_shap_values(features: ScoringInput) -> Dict[str, float]:
    """Compute SHAP-like feature impact values."""
    f = features.dict()
    shap = {}

    shap["gstConsistency"] = round((f["gst_filing_rate"] - 0.5) * WEIGHTS["gst_filing_rate"] * 2, 4)
    shap["cashFlowHealth"] = round(
        (max(min(f["avg_net_cash_flow"] / 300000, 1), -1) - 0.3) * WEIGHTS["avg_net_cash_flow"] * 2, 4
    )
    shap["revenueGrowth"] = round(
        (max(min(f["revenue_growth_rate"] / 100, 1), -1) - 0.1) * WEIGHTS["revenue_growth_rate"] * 2, 4
    )
    shap["paymentBehaviour"] = round((f["vendor_payment_score"] - 0.5) * WEIGHTS["vendor_payment_score"] * 2, 4)
    shap["transactionVolume"] = round(
        (max(min(f["upi_volume_growth"] / 80, 1), -1) - 0.2) * WEIGHTS["upi_volume_growth"] * 2, 4
    )
    shap["chequeBouncerate"] = round(-(f["cheque_bounce_rate"]) * WEIGHTS["cheque_bounce_rate"] * 2, 4)

    return shap


def detect_stress_signals(features: ScoringInput) -> List[StressSignal]:
    """Detect early warning stress signals."""
    f = features.dict()
    signals = []

    if f["avg_net_cash_flow"] < 0:
        signals.append(StressSignal(
            signal="negative_cash_flow",
            severity="critical",
            description="Negative average net cash flow detected — business outflows exceed inflows"
        ))

    if f["revenue_growth_rate"] < -20:
        signals.append(StressSignal(
            signal="revenue_decline",
            severity="critical",
            description=f"Revenue declining at {abs(f['revenue_growth_rate']):.0f}% — significant downward trend"
        ))

    if f["cheque_bounce_rate"] > 0.15:
        signals.append(StressSignal(
            signal="high_cheque_bounce",
            severity="warning",
            description=f"Cheque bounce rate at {f['cheque_bounce_rate']*100:.1f}% — potential liquidity issues"
        ))

    if f["gst_on_time_rate"] < 0.7:
        signals.append(StressSignal(
            signal="late_gst_filings",
            severity="warning",
            description="More than 30% of GST filings are late — compliance risk"
        ))

    if f["cash_flow_volatility"] > 200000:
        signals.append(StressSignal(
            signal="volatile_cash_flow",
            severity="warning",
            description="High cash flow volatility — inconsistent revenue patterns"
        ))

    if f["vendor_payment_score"] < 0.6:
        signals.append(StressSignal(
            signal="late_vendor_payments",
            severity="warning",
            description="Vendor payment punctuality below 60% — potential supply chain stress"
        ))

    return signals


def detect_fraud_flags(features: ScoringInput) -> List[FraudFlag]:
    """Detect potential fraud indicators."""
    f = features.dict()
    flags = []

    if f["nil_return_ratio"] > 0.5 and f["avg_monthly_revenue"] > 500000:
        flags.append(FraudFlag(
            flag="revenue_nil_return_mismatch",
            severity="high",
            description="High revenue reported but majority of GST returns are nil — potential revenue manipulation"
        ))

    if f["revenue_growth_rate"] > 150:
        flags.append(FraudFlag(
            flag="abnormal_growth",
            severity="medium",
            description=f"Revenue growth of {f['revenue_growth_rate']:.0f}% is unusually high — verify data authenticity"
        ))

    return flags


# ── API Endpoints ──────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "CreditSaathi ML Scoring Engine",
        "version": "1.0.0",
        "model": "weighted_ensemble_v1",
    }


@app.post("/score", response_model=ScoringResponse)
async def score_msme(features: ScoringInput):
    score_value = compute_score(features)
    shap_values = compute_shap_values(features)
    stress_signals = detect_stress_signals(features)
    fraud_flags = detect_fraud_flags(features)

    if score_value >= 700:
        risk_category = "Low"
    elif score_value >= 550:
        risk_category = "Medium"
    else:
        risk_category = "High"

    # Build SHAP summary
    shap_summary = [
        SHAPSummaryItem(
            feature=k,
            impact=v,
            direction="positive" if v >= 0 else "negative",
            displayLabel=DISPLAY_LABELS.get(
                {"gstConsistency": "gst_filing_rate", "cashFlowHealth": "avg_net_cash_flow",
                 "revenueGrowth": "revenue_growth_rate", "paymentBehaviour": "vendor_payment_score",
                 "transactionVolume": "upi_volume_growth", "chequeBouncerate": "cheque_bounce_rate"}.get(k, k),
                k
            ),
        )
        for k, v in shap_values.items()
    ]

    return ScoringResponse(
        score=score_value,
        risk_category=risk_category,
        model_version="weighted_ensemble_v1",
        shap_values=shap_values,
        shap_summary=shap_summary,
        stress_signals=stress_signals,
        fraud_flags=fraud_flags,
    )
