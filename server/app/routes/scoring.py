"""Scoring routes — mirrors /api/v1/scoring/* from the Express backend."""

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from datetime import datetime
import hashlib, json, math

from app.models.credit_score import CreditScore
from app.models.msme import MSME
from app.models.gst_record import GSTRecord
from app.models.transaction_record import TransactionRecord
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.ml_service import call_ml_service
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/scoring", tags=["Scoring"])


# ── Feature assembly (same logic as Node.js) ─────────
async def assemble_features(msme_id: str) -> dict | None:
    gst_records = await GSTRecord.find(GSTRecord.msme_id == msme_id).sort("filing_date").to_list()
    tx_records = await TransactionRecord.find(TransactionRecord.msme_id == msme_id).sort("month").to_list()

    if len(gst_records) < 6 or len(tx_records) < 6:
        return None

    total_filings = len(gst_records)
    on_time_filings = sum(1 for r in gst_records if r.filed_on_time)
    nil_returns = sum(1 for r in gst_records if r.nil_return)
    revenues = [r.taxable_revenue for r in gst_records]
    avg_revenue = sum(revenues) / len(revenues)

    last_q_revenue = sum(revenues[-3:]) / 3
    first_q_revenue = sum(revenues[:3]) / 3
    revenue_growth_rate = ((last_q_revenue - first_q_revenue) / first_q_revenue * 100) if first_q_revenue > 0 else 0

    net_cash_flows = [r.total_inflow - r.total_outflow for r in tx_records]
    avg_net_cash_flow = sum(net_cash_flows) / len(net_cash_flows)
    mean = avg_net_cash_flow
    variance = sum((v - mean) ** 2 for v in net_cash_flows) / len(net_cash_flows)
    cash_flow_volatility = math.sqrt(variance)

    upi_volumes = [r.upi_volume or 0 for r in tx_records]
    last_upi = sum(upi_volumes[-3:]) / 3
    first_upi = sum(upi_volumes[:3]) / 3
    upi_volume_growth = ((last_upi - first_upi) / first_upi * 100) if first_upi > 0 else 0

    total_bounces = sum(r.cheque_bounced_count or 0 for r in tx_records)
    total_tx = len(tx_records)
    cheque_bounce_rate = total_bounces / (total_tx * 10) if total_tx > 0 else 0

    vendor_scores = [r.vendor_payments_punctuality or 0.5 for r in tx_records]
    vendor_payment_score = sum(vendor_scores) / len(vendor_scores)

    return {
        "gst_filing_rate": min(total_filings / (total_filings + 2), 1) if total_filings > 0 else 0,
        "gst_on_time_rate": on_time_filings / total_filings if total_filings > 0 else 0,
        "avg_monthly_revenue": avg_revenue,
        "revenue_growth_rate": max(-100, min(200, revenue_growth_rate)),
        "avg_net_cash_flow": avg_net_cash_flow,
        "cash_flow_volatility": cash_flow_volatility,
        "upi_volume_growth": max(-100, min(200, upi_volume_growth)),
        "cheque_bounce_rate": min(cheque_bounce_rate, 1),
        "vendor_payment_score": vendor_payment_score,
        "nil_return_ratio": nil_returns / total_filings if total_filings > 0 else 0,
    }


def get_loan_recommendation(score: int) -> dict:
    if score >= 700:
        return {"amount": 5000000, "band": "8-10%", "schemes": ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"]}
    if score >= 650:
        return {"amount": 2500000, "band": "10-13%", "schemes": ["Mudra Yojana (Kishor)", "CGTMSE", "PSB Loans 59 Min"]}
    if score >= 600:
        return {"amount": 1000000, "band": "13-16%", "schemes": ["Mudra Yojana (Kishor)", "CGTMSE"]}
    if score >= 550:
        return {"amount": 500000, "band": "16-20%", "schemes": ["Mudra Yojana (Shishu)"]}
    return {"amount": 0, "band": "N/A", "schemes": []}


def generate_explanation(result: dict) -> str:
    score = result["score"]
    risk = result["risk_category"]
    text = f"Your credit score of {score} places you in the {risk} Risk category. "

    if score >= 700:
        text += "Your strong financial indicators, including consistent GST filings and stable cash flow, support this excellent score. "
        text += "You may be eligible for fast-track loan consideration."
    elif score >= 550:
        text += "Your financial profile shows mixed signals. While some indicators are positive, there are areas that could be improved. "
        text += "Maintaining consistent filings and improving cash flow stability could boost your score."
    else:
        text += "Several financial stress signals are affecting your score. Key areas to address include GST filing consistency, "
        text += "cash flow stability, and vendor payment punctuality. Consistent improvement over 3-6 months can significantly raise your score."

    return text


# ── POST /api/v1/scoring/generate/:msmeId ────────────
@router.post("/generate/{msme_id}", status_code=201)
async def generate_score(msme_id: str, request: Request, user: User = Depends(get_current_user)):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    features = await assemble_features(str(msme.id))
    if not features:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "INSUFFICIENT_DATA", "message": "Minimum 6 months of GST and transaction data required."}})

    try:
        ml_result = await call_ml_service(features)
    except Exception as e:
        return JSONResponse(status_code=502, content={"success": False, "error": {"code": "ML_SERVICE_ERROR", "message": str(e)}})

    loan = get_loan_recommendation(ml_result["score"])

    audit_hash = hashlib.sha256(
        json.dumps({"features": features, "score": ml_result["score"]}).encode()
    ).hexdigest()

    credit_score = CreditScore(
        msme_id=str(msme.id),
        generated_by=str(user.id),
        score_value=ml_result["score"],
        risk_category=ml_result["risk_category"],
        model_version=ml_result.get("model_version", "xgboost_v1"),
        shap_values=ml_result.get("shap_values"),
        shap_summary=ml_result.get("shap_summary"),
        feature_input_snapshot=features,
        recommended_loan_amount=loan["amount"],
        recommended_interest_band=loan["band"],
        eligible_government_schemes=loan["schemes"],
        stress_signals=ml_result.get("stress_signals", []),
        fraud_flags=ml_result.get("fraud_flags", []),
        explanation_text=generate_explanation(ml_result),
        audit_hash=audit_hash,
    )
    await credit_score.insert()

    msme.latest_score_id = str(credit_score.id)
    msme.updated_at = datetime.utcnow()
    await msme.save()

    await create_audit_log(
        action="score_generated", performed_by=str(user.id),
        target_msme_id=str(msme.id), entity_type="CreditScore",
        entity_id=str(credit_score.id), request=request,
        payload={"score": ml_result["score"], "riskCategory": ml_result["risk_category"]},
    )

    return {"success": True, "message": "Credit score generated", "data": credit_score.to_response_dict()}


# ── GET /api/v1/scoring/:msmeId/latest ───────────────
@router.get("/{msme_id}/latest")
async def get_latest_score(msme_id: str, user: User = Depends(get_current_user)):
    scores = await CreditScore.find(
        CreditScore.msme_id == msme_id
    ).sort("-created_at").limit(1).to_list()

    if not scores:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "No score found."}})

    score = scores[0]
    data = score.to_response_dict()

    # Populate generatedBy
    gen_user = await User.get(score.generated_by)
    if gen_user:
        data["generatedBy"] = {"_id": str(gen_user.id), "name": gen_user.name, "email": gen_user.email}

    return {"success": True, "data": data}


# ── GET /api/v1/scoring/:msmeId/history ──────────────
@router.get("/{msme_id}/history")
async def get_score_history(msme_id: str, user: User = Depends(get_current_user)):
    scores = await CreditScore.find(
        CreditScore.msme_id == msme_id
    ).sort("-created_at").to_list()

    result = []
    for s in scores:
        item = {
            "_id": str(s.id),
            "scoreValue": s.score_value,
            "riskCategory": s.risk_category,
            "createdAt": s.created_at.isoformat(),
            "modelVersion": s.model_version,
            "generatedBy": s.generated_by,
        }
        gen_user = await User.get(s.generated_by)
        if gen_user:
            item["generatedBy"] = {"_id": str(gen_user.id), "name": gen_user.name}
        result.append(item)

    return {"success": True, "data": result}
