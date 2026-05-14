import json
import re
import httpx
from datetime import datetime
import hashlib

from app.config import settings
from app.models.credit_score import CreditScore
from app.models.msme import MSME

# We'll use a deepseek free model by default
AI_SCORING_MODEL = "deepseek/deepseek-v4-flash:free"

SYSTEM_PROMPT = """You are CreditSaathi's core risk engine — a highly advanced ensemble of XGBoost and Random Forest machine learning models trained on Indian MSME financial data.
Your job is to evaluate an MSME based on their uploaded invoice data and generate a highly realistic, mocked credit score out of 850.

You must return ONLY valid JSON in the exact structure below. Do not include any conversational text or markdown fences.

{
  "score": 0,               // Integer between 300 and 850. (700+ is excellent, 550+ is medium, below is high risk)
  "risk_category": "",      // "Low", "Medium", or "High"
  "shap_summary": [         // Exactly 4 SHAP values explaining the score
    {
      "feature": "Recent Invoice Volume",
      "impact": "positive", // "positive" or "negative"
      "description": "Strong recent transaction indicating active business."
    }
  ],
  "stress_signals": [       // List of strings, 0 to 2 items
    "Possible concentration risk on single buyer"
  ],
  "fraud_flags": [],        // List of strings, usually empty unless data looks highly suspicious
  "explanation_text": ""    // A 2-sentence explanation of the score. Mention the XGBoost ensemble confidence.
}

Base your score on the invoice total amount and the prompt input. If the invoice amount is large, give a better score. Make the SHAP descriptions sound highly technical (e.g., "Non-linear interaction between Invoice Total and Date").
"""

async def generate_mock_ai_score(msme: MSME, user_id: str, invoice_data: dict) -> CreditScore:
    """Generate a mock credit score using OpenRouter and save it."""
    
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is missing")

    # Construct the user prompt
    invoice_summary = {
        "invoice_number": invoice_data.get("invoice", {}).get("invoice_number"),
        "invoice_date": invoice_data.get("invoice", {}).get("invoice_date"),
        "total_amount": invoice_data.get("tax_summary", {}).get("total_amount", 0),
        "total_tax": invoice_data.get("tax_summary", {}).get("total_tax", 0),
        "buyer_name": invoice_data.get("buyer", {}).get("name"),
    }
    
    user_content = f"Evaluate the MSME: {msme.business_name} (GSTIN: {msme.gstin}). They just uploaded a new GST invoice: {json.dumps(invoice_summary)}. Generate the XGBoost ensemble score and SHAP values."

    payload = {
        "model": AI_SCORING_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        "temperature": 0.3,
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://creditsaathi.app",
        "X-Title": "CreditSaathi Score Mock",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
        )
        resp.raise_for_status()

    data = resp.json()
    raw_text = data["choices"][0]["message"]["content"]

    # Extract JSON
    json_str = raw_text.strip()
    fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)```", json_str)
    if fence_match:
        json_str = fence_match.group(1).strip()

    parsed = json.loads(json_str)

    # Convert recommended loan
    score_val = parsed.get("score", 650)
    if score_val >= 700:
        loan = {"amount": 5000000, "band": "8-10%", "schemes": ["Mudra Yojana (Tarun)", "CGTMSE"]}
    elif score_val >= 600:
        loan = {"amount": 1000000, "band": "13-16%", "schemes": ["Mudra Yojana (Kishor)"]}
    else:
        loan = {"amount": 0, "band": "N/A", "schemes": []}

    audit_hash = hashlib.sha256(json.dumps(parsed).encode()).hexdigest()

    stress_raw = parsed.get("stress_signals", [])
    stress_signals = [{"signal": s} if isinstance(s, str) else s for s in stress_raw]

    fraud_raw = parsed.get("fraud_flags", [])
    fraud_flags = [{"flag": f} if isinstance(f, str) else f for f in fraud_raw]

    credit_score = CreditScore(
        msme_id=str(msme.id),
        generated_by=user_id,
        score_value=score_val,
        risk_category=parsed.get("risk_category", "Medium"),
        model_version="xgboost_rf_ensemble_v2",
        shap_summary=parsed.get("shap_summary", []),
        feature_input_snapshot={"invoice_context": invoice_summary},
        recommended_loan_amount=loan["amount"],
        recommended_interest_band=loan["band"],
        eligible_government_schemes=loan["schemes"],
        stress_signals=stress_signals,
        fraud_flags=fraud_flags,
        explanation_text=parsed.get("explanation_text", ""),
        audit_hash=audit_hash,
    )
    
    await credit_score.insert()

    # Update MSME
    msme.latest_score_id = str(credit_score.id)
    msme.updated_at = datetime.utcnow()
    await msme.save()

    return credit_score
