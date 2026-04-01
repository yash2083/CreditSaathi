"""
CreditSaathi Chatbot Service
─────────────────────────────
RAG-powered credit advisor using OpenRouter (NVIDIA Nemotron).
Fetches MSME context and grounds LLM responses in actual data.
"""

import httpx
import json
from typing import Optional
from app.config import settings
from app.models.msme import MSME
from app.models.credit_score import CreditScore
from app.models.loan_application import LoanApplication


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL_ID = "nvidia/nemotron-3-super-120b-a12b:free"

# ── Knowledge base for government schemes & credit tips ─────────
KNOWLEDGE_BASE = """
## Government Schemes for MSMEs in India

1. **Mudra Yojana** (PMMY)
   - Shishu: Loans up to ₹50,000 | For startups & micro enterprises
   - Kishor: Loans ₹50,000 – ₹5 Lakh | For growing businesses
   - Tarun: Loans ₹5 Lakh – ₹10 Lakh | For established MSMEs
   - Eligibility: Credit score 500+, valid GSTIN, 6+ months of business operation

2. **CGTMSE** (Credit Guarantee Fund Trust)
   - Collateral-free loans up to ₹5 Crore
   - Eligibility: Credit score 600+, MSE classification
   - Coverage: Up to 85% for micro enterprises, 75% for others

3. **PSB Loans in 59 Minutes**
   - Loans up to ₹5 Crore from public sector banks
   - Eligibility: Credit score 650+, GST-registered, 3+ years vintage
   - Fast-track in-principle approval

4. **PM SVANidhi** (Street Vendor's AtmaNirbhar Nidhi)
   - Working capital loan up to ₹50,000
   - For street vendors with vending certificate/ID
   - Interest subsidy of 7%

5. **Emergency Credit Line Guarantee Scheme (ECLGS)**
   - Additional credit of 20% of outstanding loans
   - For MSMEs with existing credit facilities

## Credit Score Improvement Tips

1. **GST Filing Consistency** — File all returns on time; missed or late filings heavily impact scores
2. **Revenue Growth** — Steady quarter-over-quarter revenue growth signals financial health
3. **Cash Flow Management** — Maintain positive net cash flow; avoid 3+ months of negative flow
4. **Vendor Payment Punctuality** — Pay suppliers on time to improve payment behaviour scores
5. **Reduce Cheque Bounces** — Even 1-2 bounces significantly hurt creditworthiness
6. **Avoid Nil Returns** — Consecutive nil GST returns signal business inactivity
7. **Diversify Revenue Sources** — Multiple income streams reduce concentration risk
8. **Maintain Documentation** — Updated KYC and financial documents build trust
9. **UPI Transaction Volume** — Active digital transactions show business vitality
10. **Apply for Credit Wisely** — Too many loan applications lower perceived creditworthiness
"""

# ── Language configuration ───────────────────────────
LANGUAGE_CONFIG = {
    "en": {
        "name": "English",
        "instruction": "Respond entirely in English.",
        "reminder": "Continue responding in English.",
        "greeting_name": "Hey",
    },
    "kn": {
        "name": "Kannada (ಕನ್ನಡ)",
        "instruction": """⚠️ CRITICAL: You MUST respond ENTIRELY in Kannada (ಕನ್ನಡ) using the Kannada script. This is NON-NEGOTIABLE.

RULES:
✅ DO: Write ALL sentences in Kannada script (e.g., ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ 712 ಆಗಿದೆ)
✅ DO: Keep financial acronyms in English: GST, MSME, CGTMSE, UPI, SHAP, XGBoost
✅ DO: Keep scheme names in English: Mudra Yojana, CGTMSE, PM SVANidhi
✅ DO: Keep currency as ₹ with numbers in standard format (₹50,000)
✅ DO: Keep page routes in English: /dashboard, /data-upload, /loans
❌ DO NOT: Write any Kannada in Latin/Roman script (transliteration)
❌ DO NOT: Respond in English unless quoting a technical term
❌ DO NOT: Mix English sentences with Kannada — full Kannada only

Example correct response:
"📊 ನಿಮ್ಮ ಕ್ರೆಡಿಟ್ ಸ್ಕೋರ್ 712 ಆಗಿದೆ. ಇದು **Low Risk** ವರ್ಗದಲ್ಲಿ ಬರುತ್ತದೆ. ನೀವು Mudra Yojana ಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ."

Example WRONG response (DO NOT DO THIS):
"Nimma credit score 712 agide" — This is transliteration and is UNACCEPTABLE.""",
        "reminder": "⚠️ ನೆನಪಿಡಿ: ನಿಮ್ಮ ಸಂಪೂರ್ಣ ಪ್ರತಿಕ್ರಿಯೆ ಕನ್ನಡ ಲಿಪಿಯಲ್ಲಿ ಇರಬೇಕು. REMINDER: Your ENTIRE response MUST be in Kannada script.",
        "greeting_name": "ನಮಸ್ಕಾರ",
    },
    "hi": {
        "name": "Hindi (हिंदी)",
        "instruction": """⚠️ CRITICAL: You MUST respond ENTIRELY in Hindi (हिंदी) using the Devanagari script. This is NON-NEGOTIABLE.

RULES:
✅ DO: Write ALL sentences in Devanagari script (e.g., आपका क्रेडिट स्कोर 712 है)
✅ DO: Keep financial acronyms in English: GST, MSME, CGTMSE, UPI, SHAP, XGBoost
✅ DO: Keep scheme names in English: Mudra Yojana, CGTMSE, PM SVANidhi
✅ DO: Keep currency as ₹ with numbers in standard format (₹50,000)
✅ DO: Keep page routes in English: /dashboard, /data-upload, /loans
❌ DO NOT: Write any Hindi in Latin/Roman script (transliteration)
❌ DO NOT: Respond in English unless quoting a technical term
❌ DO NOT: Mix English sentences with Hindi — full Hindi only

Example correct response:
"📊 आपका क्रेडिट स्कोर 712 है। यह **Low Risk** श्रेणी में आता है। आप Mudra Yojana के लिए पात्र हैं।"

Example WRONG response (DO NOT DO THIS):
"Aapka credit score 712 hai" — This is transliteration and is UNACCEPTABLE.""",
        "reminder": "⚠️ याद रखें: आपका पूरा उत्तर देवनागरी लिपि में होना चाहिए। REMINDER: Your ENTIRE response MUST be in Devanagari script.",
        "greeting_name": "नमस्ते",
    },
}


async def _build_msme_context(user_id: str) -> dict:
    """Fetch MSME data, latest score, SHAP, and loans for the user."""
    context = {
        "has_msme": False,
        "msme": None,
        "score": None,
        "loans": [],
        "stress_signals": [],
        "fraud_flags": [],
    }

    # Find MSME owned by this user
    msme = await MSME.find_one(MSME.owner == user_id)
    if not msme:
        return context

    context["has_msme"] = True
    context["msme"] = {
        "businessName": msme.business_name,
        "gstin": msme.gstin[:4] + "****" + msme.gstin[-3:],  # Masked
        "businessType": msme.business_type,
        "sector": msme.sector,
        "state": msme.registered_state,
        "city": msme.city,
        "status": msme.status,
        "employeeCount": msme.employee_count,
        "turnoverBand": msme.annual_turnover_band,
    }

    # Latest score
    if msme.latest_score_id:
        score = await CreditScore.get(msme.latest_score_id)
        if score:
            context["score"] = {
                "value": score.score_value,
                "riskCategory": score.risk_category,
                "modelVersion": score.model_version,
                "shapSummary": score.shap_summary or [],
                "explanationText": score.explanation_text,
                "recommendedLoanAmount": score.recommended_loan_amount,
                "recommendedInterestBand": score.recommended_interest_band,
                "eligibleSchemes": score.eligible_government_schemes,
                "generatedAt": score.created_at.isoformat(),
            }
            context["stress_signals"] = score.stress_signals or []
            context["fraud_flags"] = score.fraud_flags or []

    # Loan applications
    loans = await LoanApplication.find(
        LoanApplication.msme_id == str(msme.id)
    ).to_list(10)
    context["loans"] = [
        {
            "status": loan.status,
            "requestedAmount": loan.requested_amount,
            "purpose": loan.loan_purpose,
            "officerRemarks": loan.officer_remarks,
            "approvedAmount": loan.approved_amount,
        }
        for loan in loans
    ]

    return context


def _build_system_prompt(context: dict, language: str = "en") -> str:
    """Build the system prompt with RAG context and language preference."""
    lang_cfg = LANGUAGE_CONFIG.get(language, LANGUAGE_CONFIG["en"])

    prompt = f"""You are CreditSaathi AI — a friendly, expert financial credit advisor for Indian MSMEs (Micro, Small & Medium Enterprises).

## LANGUAGE INSTRUCTION (MANDATORY)
{lang_cfg['instruction']}
The user has selected {lang_cfg['name']} as their preferred language. You MUST respond in this language throughout the entire conversation.

## Your Personality
- Warm, encouraging, and professional
- Use simple language (no jargon); explain financial concepts clearly
- Be concise but thorough — aim for 2-4 short paragraphs max
- Use emojis sparingly for friendliness (📊 💡 ✅ ⚠️)
- Always provide actionable advice
- Never impersonate a human — you are an AI assistant
- Format responses with markdown for readability (bold, bullets, etc.)

## Critical Rules
- ONLY reference data provided in the context below — NEVER make up numbers or scores
- If no MSME data exists, guide the user to onboard their business
- If no score exists, guide them to upload GST & transaction data
- For loan queries, use the actual recommended amounts from their score
- Never reveal raw SHAP values to MSME owners — explain in plain English
- Be encouraging about improvement, never punitive about low scores

"""

    if not context["has_msme"]:
        prompt += """## User Context
This user has NOT onboarded an MSME profile yet. Guide them to create one at the "Onboard MSME" section.
"""
    else:
        msme = context["msme"]
        prompt += f"""## User's MSME Profile
- Business: {msme['businessName']}
- GSTIN: {msme['gstin']}
- Type: {msme['businessType']} enterprise | Sector: {msme['sector']}
- State: {msme['state']}{f" | City: {msme['city']}" if msme.get('city') else ""}
- Status: {msme['status']}
{f"- Employees: {msme['employeeCount']}" if msme.get('employeeCount') else ""}
{f"- Turnover Band: {msme['turnoverBand']}" if msme.get('turnoverBand') else ""}
"""

        if context["score"]:
            s = context["score"]
            prompt += f"""
## Latest Credit Score
- Score: {s['value']} / 850
- Risk Category: {s['riskCategory']}
- Generated: {s['generatedAt'][:10]}
- Recommended Loan: ₹{s['recommendedLoanAmount']:,.0f} at {s['recommendedInterestBand']} if {s['recommendedLoanAmount']} else "Not eligible currently"
- Eligible Schemes: {', '.join(s['eligibleSchemes']) if s['eligibleSchemes'] else 'None currently'}
- AI Explanation: {s['explanationText'] or 'N/A'}

### SHAP Factor Breakdown (what drives the score)
"""
            for item in s.get("shapSummary", []):
                if isinstance(item, dict):
                    prompt += f"- {item.get('feature', 'N/A')}: impact={item.get('impact', 0):.2f}, direction={item.get('direction', 'N/A')}\n"
        else:
            prompt += "\n## Credit Score: NOT YET GENERATED\nGuide the user to upload at least 6 months of GST and transaction data, then generate their score.\n"

        if context["stress_signals"]:
            prompt += "\n## Active Stress Signals ⚠️\n"
            for sig in context["stress_signals"]:
                prompt += f"- [{sig.get('severity', 'warning').upper()}] {sig.get('signal', '')}: {sig.get('description', '')}\n"

        if context["loans"]:
            prompt += "\n## Loan Applications\n"
            for loan in context["loans"]:
                prompt += f"- {loan['purpose'].replace('_', ' ').title()}: ₹{loan['requestedAmount']:,.0f} — Status: {loan['status']}\n"

    prompt += f"""
## Knowledge Base (Government Schemes & Credit Tips)
{KNOWLEDGE_BASE}

## CreditSaathi Platform Guide (Web App Features)
When users ask "how do I...", "where can I...", or about platform features, use this guide:

### 📊 Dashboard (/dashboard)
- First page after login — shows your financial health overview at a glance
- **Summary Cards**: Credit score, risk level, loan eligibility, MSME status
- **Score Gauge**: Visual arc showing your score (300–850) with colour zones (red/amber/green)
- **Charts**: Revenue trend (12 months), Cash flow (inflow vs outflow), Score history timeline
- **SHAP Panel**: Shows what factors are pushing your score up or down
- **Stress Signals**: Early warning indicators if financial distress is detected
- **Eligible Schemes**: Government schemes you qualify for based on your score
- **Quick Actions**: Shortcuts to upload data, apply for loans, or onboard MSME

### 🏢 Onboard MSME (/msme/onboard)
- Multi-step form to register your business on the platform
- **Step 1 — Basic Info**: Business name, GSTIN (15-digit, validated), business type (micro/small/medium), sector, state
- **Step 2 — Financial Info**: PAN, Udyam number, turnover band, employee count
- **Step 3 — Confirm**: Review and submit
- GSTIN must be unique — duplicate check is automatic
- After onboarding, status is set to "active"

### 📤 Data Upload (/data-upload)
- Upload your financial data to feed the AI scoring engine
- **GST Records**: CSV or JSON format — filing period, type (GSTR1/GSTR3B/GSTR9), on-time status, revenue, tax paid
- **Transaction Records**: Monthly bank/UPI data — inflow, outflow, UPI count, cheque bounces, vendor payment punctuality
- Downloadable CSV templates are provided on the page
- **Minimum requirement**: At least 6 months of BOTH GST and transaction data to generate a score
- Invalid rows are flagged with reasons; valid rows still import
- You can also add single records manually via a form

### 🎯 Credit Score Generation
- Available on the Dashboard once you have 6+ months of data
- Click "Generate Score" — the AI model (XGBoost) analyses your data in under 10 seconds
- Produces: Score (300–850), Risk Category (Low/Medium/High), SHAP breakdown, stress signals
- **Score Ranges**: 700–850 = Low Risk (green), 550–699 = Medium Risk (amber), 300–549 = High Risk (red)
- Old scores are kept in history — you can see your score trend over time
- Each score includes personalised improvement recommendations

### 🏦 Loan Center (/loans)
- Apply for loans and track application status
- Application requires: requested amount, loan purpose (working capital/equipment/expansion/other), repayment tenure
- Must have a valid credit score less than 90 days old
- Score-based loan recommendations are auto-generated:
  - 700–850: Up to ₹50L at 8–10%
  - 650–699: Up to ₹25L at 10–13%
  - 600–649: Up to ₹10L at 13–16%
  - 550–599: Up to ₹5L at 16–20%
  - Below 550: Not recommended — improve score first
- Bank officers review, approve, or reject applications

### 👥 MSME Portfolio (/msmes) — Bank Officers Only
- View all MSMEs in your portfolio with search and filters
- Filter by risk category, sector, state, score range
- Risk distribution donut chart for portfolio overview

### 🔐 User Roles
- **MSME Owner**: View own profile, upload data, view own score, apply for loans
- **Bank Officer**: View portfolio MSMEs, trigger scoring, manage loan applications
- **Admin**: Full access, user management, model configuration

### 💡 Common User Journeys
1. **New user**: Register → Onboard MSME → Upload 6+ months GST + Transactions → Generate Score → View Dashboard → Apply for Loan
2. **Returning user**: Login → Dashboard (check updated score) → Upload new month's data → Re-generate score
3. **Improve score**: Dashboard → Check SHAP panel for weak factors → Address issues (file GST on time, improve cash flow) → Re-score after 1-2 months

Remember: Always ground your answers in the user's actual data above. If unsure, say so honestly. When guiding users to a feature, mention the page name and navigation path.

## FINAL LANGUAGE REMINDER
{lang_cfg['reminder']}
"""
    return prompt


async def get_chat_response(
    user_id: str,
    message: str,
    conversation_history: list[dict],
    api_key: str,
    language: str = "en",
) -> str:
    """
    Process a chat message with RAG context and return LLM response.
    """
    # Build context from user's MSME data
    context = await _build_msme_context(user_id)

    # Build messages array
    system_prompt = _build_system_prompt(context, language=language)
    messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (last 10 messages for context window)
    for msg in conversation_history[-10:]:
        messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    # Add current message
    messages.append({"role": "user", "content": message})

    # Call OpenRouter
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://creditsaathi.app",
        "X-Title": "CreditSaathi AI Advisor",
    }

    payload = {
        "model": MODEL_ID,
        "messages": messages,
        "max_tokens": 800,
        "temperature": 0.7,
        "top_p": 0.9,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
            )
            response.raise_for_status()
            data = response.json()

            if "choices" in data and len(data["choices"]) > 0:
                return data["choices"][0]["message"]["content"]
            else:
                return "I'm having trouble processing your request right now. Please try again in a moment. 🔄"

    except httpx.TimeoutException:
        return "⏳ The AI service is taking longer than expected. Please try again in a few seconds."
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 429:
            return "🔄 I'm receiving too many requests right now. Please wait a moment and try again."
        return "⚠️ I'm temporarily unable to connect to the AI service. Please try again shortly."
    except Exception as e:
        return f"⚠️ Something went wrong. Please try again. If the issue persists, contact support."
