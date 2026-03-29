from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="CreditSaathi ML Service",
    description="AI Credit Scoring Microservice — XGBoost + SHAP",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Health Check ──────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "creditsaathi-ml",
        "model_version": "xgboost_v1",
    }


# ── Scoring Endpoint (stub) ──────────────────
class FeatureInput(BaseModel):
    gst_filing_rate: float
    gst_on_time_rate: float
    avg_monthly_revenue: float
    revenue_growth_rate: float
    avg_net_cash_flow: float
    cash_flow_volatility: float
    upi_volume_growth: float
    cheque_bounce_rate: float
    vendor_payment_score: float
    nil_return_ratio: float


class ScoreResponse(BaseModel):
    score: int
    risk_category: str
    shap_values: dict
    shap_summary: list
    stress_signals: list
    fraud_flags: list
    model_version: str


@app.post("/score", response_model=ScoreResponse)
def generate_score(features: FeatureInput):
    """
    Stub endpoint — returns a placeholder score.
    Will be replaced with real XGBoost + SHAP in Sprint 2.
    """
    # Placeholder scoring logic
    raw_probability = (
        features.gst_filing_rate * 0.15
        + features.gst_on_time_rate * 0.10
        + features.vendor_payment_score * 0.15
        + (1 - features.cheque_bounce_rate) * 0.10
        + (1 - features.nil_return_ratio) * 0.10
        + min(features.revenue_growth_rate / 100, 1) * 0.10
        + min(features.upi_volume_growth / 100, 1) * 0.10
        + min(features.avg_net_cash_flow / 1000000, 1) * 0.10
        + (1 - min(features.cash_flow_volatility / 1000000, 1)) * 0.05
        + min(features.avg_monthly_revenue / 10000000, 1) * 0.05
    )

    score = int(300 + (raw_probability * 550))
    score = max(300, min(850, score))

    if score >= 700:
        risk_category = "Low"
    elif score >= 550:
        risk_category = "Medium"
    else:
        risk_category = "High"

    return ScoreResponse(
        score=score,
        risk_category=risk_category,
        shap_values={
            "gst_consistency": 0.0,
            "cash_flow_health": 0.0,
            "revenue_growth": 0.0,
            "payment_behaviour": 0.0,
            "transaction_volume": 0.0,
            "cheque_bounce_rate": 0.0,
        },
        shap_summary=[
            {
                "feature": "GST Filing Consistency",
                "impact": 0.0,
                "direction": "positive",
            }
        ],
        stress_signals=[],
        fraud_flags=[],
        model_version="xgboost_v1_stub",
    )
