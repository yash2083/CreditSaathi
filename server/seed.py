"""
Seed script — populates MongoDB with demo data for two users:
  1. officer@gmail.com (bank_officer) — password: 12345678
  2. example@gmail.com (msme_owner)   — password: 12345678

Creates: 3 MSMEs, 12-month GST records, 12-month transaction records,
         credit scores, and loan applications.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure we can import app modules
sys.path.insert(0, str(Path(__file__).parent))
os.chdir(str(Path(__file__).parent))

from dotenv import load_dotenv
load_dotenv()

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.models.user import User
from app.models.msme import MSME
from app.models.gst_record import GSTRecord
from app.models.transaction_record import TransactionRecord
from app.models.credit_score import CreditScore
from app.models.loan_application import LoanApplication
from app.models.audit_log import AuditLog


MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/creditsaathi")


async def seed():
    # ── Connect ────────────────────────────────────────
    client = AsyncIOMotorClient(MONGO_URI)
    db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "creditsaathi"
    db = client[db_name]

    await init_beanie(
        database=db,
        document_models=[User, MSME, GSTRecord, TransactionRecord, CreditScore, LoanApplication, AuditLog],
    )

    # ── Clear existing data ────────────────────────────
    print("🗑  Clearing existing data...")
    for model in [AuditLog, LoanApplication, CreditScore, TransactionRecord, GSTRecord, MSME, User]:
        await model.find_all().delete()

    # ── Create Users ───────────────────────────────────
    print("👤 Creating users...")

    officer = User(
        name="Rajesh Kumar",
        email="officer@gmail.com",
        password_hash=User.hash_password("12345678"),
        role="bank_officer",
        organisation_name="State Bank of India",
        organisation_type="bank",
    )
    await officer.insert()

    owner = User(
        name="Priya Sharma",
        email="example@gmail.com",
        password_hash=User.hash_password("12345678"),
        role="msme_owner",
        organisation_name="Sharma Textiles Pvt Ltd",
        organisation_type="msme",
    )
    await owner.insert()

    print(f"   ✅ officer@gmail.com (bank_officer) — ID: {officer.id}")
    print(f"   ✅ example@gmail.com (msme_owner)   — ID: {owner.id}")

    # ── Create MSMEs ───────────────────────────────────
    print("🏢 Creating MSME profiles...")

    msmes_data = [
        {
            "owner": str(owner.id),
            "business_name": "Sharma Textiles Pvt Ltd",
            "gstin": "27AADCS1234H1ZP",
            "pan": "AADCS1234H",
            "business_type": "small",
            "sector": "Textile Manufacturing",
            "registered_state": "Maharashtra",
            "city": "Mumbai",
            "contact_email": "info@sharmatextiles.in",
            "contact_phone": "+919876543210",
            "udyam_registration_no": "UDYAM-MH-07-0012345",
            "annual_turnover_band": "1.5Cr-5Cr",
            "employee_count": 45,
            "incorporation_date": datetime(2018, 3, 15),
            "bank_account_linked": True,
            "aa_consent_given": True,
            "aa_consent_timestamp": datetime(2025, 11, 1),
        },
        {
            "owner": str(owner.id),
            "business_name": "GreenLeaf Organics",
            "gstin": "29BBBCG5678K1ZQ",
            "pan": "BBBCG5678K",
            "business_type": "micro",
            "sector": "Organic Food Processing",
            "registered_state": "Karnataka",
            "city": "Bengaluru",
            "contact_email": "contact@greenleaforganics.in",
            "contact_phone": "+919812345678",
            "udyam_registration_no": "UDYAM-KA-29-0098765",
            "annual_turnover_band": "40L-1.5Cr",
            "employee_count": 12,
            "incorporation_date": datetime(2021, 7, 20),
            "bank_account_linked": True,
            "aa_consent_given": True,
            "aa_consent_timestamp": datetime(2025, 10, 15),
        },
        {
            "owner": str(owner.id),
            "business_name": "Apex Auto Components",
            "gstin": "33CCCDA9012L1ZR",
            "pan": "CCCDA9012L",
            "business_type": "medium",
            "sector": "Auto Parts Manufacturing",
            "registered_state": "Tamil Nadu",
            "city": "Chennai",
            "contact_email": "sales@apexauto.in",
            "contact_phone": "+919898765432",
            "udyam_registration_no": "UDYAM-TN-33-0054321",
            "annual_turnover_band": "5Cr-25Cr",
            "employee_count": 120,
            "incorporation_date": datetime(2015, 1, 10),
            "bank_account_linked": True,
            "aa_consent_given": True,
            "aa_consent_timestamp": datetime(2025, 9, 1),
        },
    ]

    msme_objects = []
    for md in msmes_data:
        msme = MSME(**md)
        await msme.insert()
        msme_objects.append(msme)
        print(f"   ✅ {msme.business_name} — {msme.gstin}")

    # ── Generate GST Records (12 months each) ──────────
    print("📋 Creating GST records (12 months × 3 MSMEs)...")

    base_revenues = [350000, 120000, 1500000]  # per MSME
    growth_rates = [1.04, 1.06, 1.03]  # monthly growth

    for idx, msme in enumerate(msme_objects):
        base_rev = base_revenues[idx]
        growth = growth_rates[idx]

        for month_offset in range(12):
            period_date = datetime(2025, 4, 1) + timedelta(days=30 * month_offset)
            period_str = period_date.strftime("%Y-%m")
            filing_date = period_date + timedelta(days=18 + (month_offset % 3))

            revenue = base_rev * (growth ** month_offset)
            # Randomize a bit
            import random
            revenue *= random.uniform(0.85, 1.15)
            tax_paid = revenue * 0.18

            on_time = random.random() > 0.15  # 85% on-time rate

            gst = GSTRecord(
                msme_id=str(msme.id),
                filing_period=period_str,
                filing_type=random.choice(["GSTR1", "GSTR3B"]),
                filed_on_time=on_time,
                filing_date=filing_date,
                taxable_revenue=round(revenue, 2),
                tax_paid=round(tax_paid, 2),
                nil_return=random.random() < 0.05,  # 5% nil returns
                amendment=random.random() < 0.08,
            )
            await gst.insert()

    print("   ✅ 36 GST records created")

    # ── Generate Transaction Records (12 months each) ──
    print("💰 Creating transaction records (12 months × 3 MSMEs)...")

    base_inflows = [400000, 150000, 1800000]
    base_outflows = [280000, 110000, 1400000]

    for idx, msme in enumerate(msme_objects):
        inflow = base_inflows[idx]
        outflow = base_outflows[idx]

        for month_offset in range(12):
            period_date = datetime(2025, 4, 1) + timedelta(days=30 * month_offset)
            month_str = period_date.strftime("%Y-%m")

            import random
            m_inflow = inflow * (1.03 ** month_offset) * random.uniform(0.8, 1.2)
            m_outflow = outflow * (1.02 ** month_offset) * random.uniform(0.85, 1.15)
            upi_count = random.randint(80, 350)
            upi_vol = m_inflow * random.uniform(0.3, 0.6)

            tx = TransactionRecord(
                msme_id=str(msme.id),
                month=month_str,
                total_inflow=round(m_inflow, 2),
                total_outflow=round(m_outflow, 2),
                net_cash_flow=round(m_inflow - m_outflow, 2),
                upi_transaction_count=upi_count,
                upi_volume=round(upi_vol, 2),
                cheque_bounced_count=random.randint(0, 3),
                emi_paid_on_time=random.random() > 0.1,
                vendor_payments_punctuality=round(random.uniform(0.65, 0.95), 2),
                seasonality_flag=month_offset in [5, 6, 11],  # monsoon + year-end
                data_source=random.choice(["manual", "aa_framework"]),
            )
            await tx.insert()

    print("   ✅ 36 transaction records created")

    # ── Generate Credit Scores ─────────────────────────
    print("📊 Generating credit scores...")

    score_configs = [
        {"score": 728, "risk": "Low", "loan_amt": 5000000, "band": "8-10%",
         "schemes": ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"]},
        {"score": 612, "risk": "Medium", "loan_amt": 1000000, "band": "13-16%",
         "schemes": ["Mudra Yojana (Kishor)", "CGTMSE"]},
        {"score": 785, "risk": "Low", "loan_amt": 5000000, "band": "8-10%",
         "schemes": ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"]},
    ]

    score_objects = []
    for idx, msme in enumerate(msme_objects):
        cfg = score_configs[idx]

        # Create historical scores (3 per MSME)
        for hist_idx in range(3):
            hist_score = cfg["score"] - (3 - hist_idx) * random.randint(15, 40)
            hist_score = max(300, min(850, hist_score))
            hist_risk = "Low" if hist_score >= 700 else ("Medium" if hist_score >= 550 else "High")
            hist_date = datetime.utcnow() - timedelta(days=90 * (3 - hist_idx))

            hist_cs = CreditScore(
                msme_id=str(msme.id),
                generated_by=str(officer.id),
                score_value=hist_score,
                risk_category=hist_risk,
                model_version="weighted_ensemble_v1",
                shap_values={
                    "gstConsistency": round(random.uniform(0.02, 0.12), 4),
                    "cashFlowHealth": round(random.uniform(-0.05, 0.15), 4),
                    "revenueGrowth": round(random.uniform(-0.03, 0.10), 4),
                    "paymentBehaviour": round(random.uniform(0.01, 0.08), 4),
                    "transactionVolume": round(random.uniform(-0.02, 0.05), 4),
                    "chequeBouncerate": round(random.uniform(-0.08, -0.01), 4),
                },
                shap_summary=[
                    {"feature": "gstConsistency", "impact": 0.08, "direction": "positive", "displayLabel": "GST Filing Consistency"},
                    {"feature": "cashFlowHealth", "impact": 0.12, "direction": "positive", "displayLabel": "Cash Flow Health"},
                    {"feature": "revenueGrowth", "impact": 0.06, "direction": "positive", "displayLabel": "Revenue Growth Rate"},
                    {"feature": "paymentBehaviour", "impact": 0.04, "direction": "positive", "displayLabel": "Vendor Payment Behaviour"},
                    {"feature": "transactionVolume", "impact": 0.03, "direction": "positive", "displayLabel": "Digital Payment Growth"},
                    {"feature": "chequeBouncerate", "impact": -0.04, "direction": "negative", "displayLabel": "Cheque Bounce Rate"},
                ],
                created_at=hist_date,
                updated_at=hist_date,
            )
            await hist_cs.insert()

        # Latest score
        cs = CreditScore(
            msme_id=str(msme.id),
            generated_by=str(officer.id),
            score_value=cfg["score"],
            risk_category=cfg["risk"],
            model_version="weighted_ensemble_v1",
            shap_values={
                "gstConsistency": round(random.uniform(0.04, 0.12), 4),
                "cashFlowHealth": round(random.uniform(0.02, 0.18), 4),
                "revenueGrowth": round(random.uniform(0.01, 0.12), 4),
                "paymentBehaviour": round(random.uniform(0.01, 0.08), 4),
                "transactionVolume": round(random.uniform(-0.01, 0.06), 4),
                "chequeBouncerate": round(random.uniform(-0.10, -0.01), 4),
            },
            shap_summary=[
                {"feature": "gstConsistency", "impact": 0.10, "direction": "positive", "displayLabel": "GST Filing Consistency"},
                {"feature": "cashFlowHealth", "impact": 0.15, "direction": "positive", "displayLabel": "Cash Flow Health"},
                {"feature": "revenueGrowth", "impact": 0.08, "direction": "positive", "displayLabel": "Revenue Growth Rate"},
                {"feature": "paymentBehaviour", "impact": 0.05, "direction": "positive", "displayLabel": "Vendor Payment Behaviour"},
                {"feature": "transactionVolume", "impact": 0.03, "direction": "positive", "displayLabel": "Digital Payment Growth"},
                {"feature": "chequeBouncerate", "impact": -0.05, "direction": "negative", "displayLabel": "Cheque Bounce Rate"},
            ],
            feature_input_snapshot={
                "gst_filing_rate": 0.86, "gst_on_time_rate": 0.83,
                "avg_monthly_revenue": 380000, "revenue_growth_rate": 18.5,
                "avg_net_cash_flow": 95000, "cash_flow_volatility": 42000,
                "upi_volume_growth": 35.2, "cheque_bounce_rate": 0.06,
                "vendor_payment_score": 0.82, "nil_return_ratio": 0.04,
            },
            recommended_loan_amount=cfg["loan_amt"],
            recommended_interest_band=cfg["band"],
            eligible_government_schemes=cfg["schemes"],
            stress_signals=[
                {"signal": "high_cheque_bounce", "severity": "warning", "description": f"Cheque bounce rate slightly elevated — monitor for improvement"},
            ] if cfg["risk"] == "Medium" else [],
            fraud_flags=[],
            explanation_text=(
                f"Your credit score of {cfg['score']} places you in the {cfg['risk']} Risk category. "
                + ("Your strong financial indicators, including consistent GST filings and stable cash flow, support this excellent score. You may be eligible for fast-track loan consideration."
                   if cfg["risk"] == "Low" else
                   "Your financial profile shows mixed signals. While some indicators are positive, there are areas that could be improved. Maintaining consistent filings and improving cash flow stability could boost your score.")
            ),
            audit_hash="demo-seed-hash-" + str(idx),
        )
        await cs.insert()
        score_objects.append(cs)

        # Update MSME with latest score
        msme.latest_score_id = str(cs.id)
        msme.updated_at = datetime.utcnow()
        await msme.save()

        print(f"   ✅ {msme.business_name}: {cfg['score']} ({cfg['risk']} Risk)")

    # ── Create Loan Applications ───────────────────────
    print("🏦 Creating loan applications...")

    loan_configs = [
        {"amount": 2500000, "purpose": "working_capital", "tenure": 24, "status": "approved",
         "remarks": "Strong credit profile. Approved with standard terms.", "approved_amt": 2200000},
        {"amount": 500000, "purpose": "equipment", "tenure": 12, "status": "submitted",
         "remarks": None, "approved_amt": None},
        {"amount": 5000000, "purpose": "expansion", "tenure": 36, "status": "under_review",
         "remarks": None, "approved_amt": None},
        {"amount": 800000, "purpose": "working_capital", "tenure": 18, "status": "rejected",
         "remarks": "Insufficient credit history. Reapply after 6 months with improved filings.", "approved_amt": None},
    ]

    for li, lc in enumerate(loan_configs):
        msme_idx = li % len(msme_objects)
        loan = LoanApplication(
            msme_id=str(msme_objects[msme_idx].id),
            applicant=str(owner.id),
            assigned_officer=str(officer.id) if lc["status"] in ["approved", "rejected", "under_review"] else None,
            score_id=str(score_objects[msme_idx].id),
            requested_amount=lc["amount"],
            loan_purpose=lc["purpose"],
            repayment_tenure=lc["tenure"],
            status=lc["status"],
            officer_remarks=lc["remarks"],
            approved_amount=lc["approved_amt"],
            decision_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if lc["status"] in ["approved", "rejected"] else None,
            created_at=datetime.utcnow() - timedelta(days=random.randint(5, 60)),
        )
        await loan.insert()
        print(f"   ✅ ₹{lc['amount']:,.0f} — {lc['purpose']} — {lc['status']}")

    # ── Done ───────────────────────────────────────────
    print("\n" + "=" * 55)
    print("🎉 Seed complete! Demo data populated successfully.")
    print("=" * 55)
    print("\n📌 Login credentials:")
    print("   Bank Officer:  officer@gmail.com / 12345678")
    print("   MSME Owner:    example@gmail.com / 12345678")
    print()

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
