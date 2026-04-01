"""MongoDB connection using Motor (async) + Beanie ODM.

On every startup:
  1. Connects to MongoDB
  2. init_beanie creates collections if they don't exist
  3. Ensures all indexes are present
  4. Runs safe seed — only inserts default users/data if missing
"""

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.config import settings
from app.models.user import User
from app.models.msme import MSME
from app.models.credit_score import CreditScore
from app.models.gst_record import GSTRecord
from app.models.transaction_record import TransactionRecord
from app.models.loan_application import LoanApplication
from app.models.audit_log import AuditLog

_client: AsyncIOMotorClient | None = None

ALL_MODELS = [User, MSME, CreditScore, GSTRecord, TransactionRecord, LoanApplication, AuditLog]


async def connect_db() -> None:
    """Initialize MongoDB connection, ensure collections/indexes, and safe-seed."""
    global _client
    _client = AsyncIOMotorClient(settings.MONGO_URI)

    db_name = settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "creditsaathi"

    # init_beanie auto-creates collections for all registered document models
    await init_beanie(
        database=_client[db_name],
        document_models=ALL_MODELS,
    )
    print(f"📦 MongoDB connected: {settings.MONGO_URI}")

    # Ensure indexes exist on every launch
    await ensure_indexes()

    # Safe seed — only if core data is missing
    await safe_seed()


async def ensure_indexes() -> None:
    """Explicitly create MongoDB indexes for every model.
    Wrapped in try/except per index — resilient to existing indexes with different options."""
    print("🔑 Ensuring indexes...")

    db = _client[settings.MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "creditsaathi"]

    index_specs = [
        ("users", "email", {"unique": True}),
        ("msmes", "gstin", {"unique": True}),
        ("msmes", "owner", {}),
        ("msmes", "status", {}),
        ("msmes", "sector", {}),
        ("creditscores", [("msme_id", 1), ("created_at", -1)], {}),
        ("creditscores", "generated_by", {}),
        ("gstrecords", [("msme_id", 1), ("filing_period", 1)], {"unique": True}),
        ("gstrecords", [("msme_id", 1), ("filing_date", -1)], {}),
        ("transactionrecords", [("msme_id", 1), ("month", 1)], {"unique": True}),
        ("transactionrecords", [("msme_id", 1), ("created_at", -1)], {}),
        ("loanapplications", "msme_id", {}),
        ("loanapplications", "status", {}),
        ("loanapplications", "assigned_officer", {}),
        ("auditlogs", "target_msme_id", {}),
        ("auditlogs", "action", {}),
        ("auditlogs", "performed_by", {}),
        ("auditlogs", [("created_at", -1)], {}),
    ]

    for collection, keys, opts in index_specs:
        try:
            await db[collection].create_index(keys, **opts)
        except Exception as e:
            print(f"   ⚠️  Index {collection}.{keys}: {e}")

    print("   ✅ All indexes ensured")


async def safe_seed() -> None:
    """Insert default users only if they don't already exist.
    Never overwrites existing data — safe for new DB servers."""

    # Check if default users exist
    officer = await User.find_one(User.email == "officer@gmail.com")
    owner = await User.find_one(User.email == "example@gmail.com")

    if officer and owner:
        print("🌱 Default users already exist — skipping seed")
        return

    print("🌱 Default users missing — running safe seed...")

    if not officer:
        officer = User(
            name="Rajesh Kumar",
            email="officer@gmail.com",
            password_hash=User.hash_password("12345678"),
            role="bank_officer",
            organisation_name="State Bank of India",
            organisation_type="bank",
        )
        await officer.insert()
        print("   ✅ Created officer@gmail.com (bank_officer)")

    if not owner:
        owner = User(
            name="Priya Sharma",
            email="example@gmail.com",
            password_hash=User.hash_password("12345678"),
            role="msme_owner",
            organisation_name="Sharma Textiles Pvt Ltd",
            organisation_type="msme",
        )
        await owner.insert()
        print("   ✅ Created example@gmail.com (msme_owner)")

    # Only seed MSME + demo data if no MSMEs exist at all
    msme_count = await MSME.count()
    if msme_count > 0:
        print("   ℹ️  MSMEs already exist — skipping demo data seed")
        return

    print("   📋 Seeding demo MSME data...")

    import random
    from datetime import datetime, timedelta

    # Create MSMEs
    msmes_data = [
        {"business_name": "Sharma Textiles Pvt Ltd", "gstin": "27AADCS1234H1ZP", "pan": "AADCS1234H",
         "business_type": "small", "sector": "Textile Manufacturing", "registered_state": "Maharashtra",
         "city": "Mumbai", "contact_email": "info@sharmatextiles.in", "contact_phone": "+919876543210",
         "udyam_registration_no": "UDYAM-MH-07-0012345", "annual_turnover_band": "1.5Cr-5Cr",
         "employee_count": 45, "incorporation_date": datetime(2018, 3, 15),
         "bank_account_linked": True, "aa_consent_given": True},
        {"business_name": "GreenLeaf Organics", "gstin": "29BBBCG5678K1ZQ", "pan": "BBBCG5678K",
         "business_type": "micro", "sector": "Organic Food Processing", "registered_state": "Karnataka",
         "city": "Bengaluru", "contact_email": "contact@greenleaforganics.in", "contact_phone": "+919812345678",
         "udyam_registration_no": "UDYAM-KA-29-0098765", "annual_turnover_band": "40L-1.5Cr",
         "employee_count": 12, "incorporation_date": datetime(2021, 7, 20),
         "bank_account_linked": True, "aa_consent_given": True},
        {"business_name": "Apex Auto Components", "gstin": "33CCCDA9012L1ZR", "pan": "CCCDA9012L",
         "business_type": "medium", "sector": "Auto Parts Manufacturing", "registered_state": "Tamil Nadu",
         "city": "Chennai", "contact_email": "sales@apexauto.in", "contact_phone": "+919898765432",
         "udyam_registration_no": "UDYAM-TN-33-0054321", "annual_turnover_band": "5Cr-25Cr",
         "employee_count": 120, "incorporation_date": datetime(2015, 1, 10),
         "bank_account_linked": True, "aa_consent_given": True},
    ]

    msme_objects = []
    for md in msmes_data:
        existing = await MSME.find_one(MSME.gstin == md["gstin"])
        if existing:
            msme_objects.append(existing)
            continue
        msme = MSME(owner=str(owner.id), **md)
        await msme.insert()
        msme_objects.append(msme)

    # GST + Transaction records (12 months each)
    base_revenues = [350000, 120000, 1500000]
    base_inflows = [400000, 150000, 1800000]
    base_outflows = [280000, 110000, 1400000]

    for idx, msme in enumerate(msme_objects):
        for month_offset in range(12):
            period_date = datetime(2025, 4, 1) + timedelta(days=30 * month_offset)
            period_str = period_date.strftime("%Y-%m")
            filing_date = period_date + timedelta(days=18 + (month_offset % 3))

            revenue = base_revenues[idx] * (1.04 ** month_offset) * random.uniform(0.85, 1.15)
            existing_gst = await GSTRecord.find_one(GSTRecord.msme_id == str(msme.id), GSTRecord.filing_period == period_str)
            if not existing_gst:
                await GSTRecord(
                    msme_id=str(msme.id), filing_period=period_str,
                    filing_type=random.choice(["GSTR1", "GSTR3B"]),
                    filed_on_time=random.random() > 0.15, filing_date=filing_date,
                    taxable_revenue=round(revenue, 2), tax_paid=round(revenue * 0.18, 2),
                    nil_return=random.random() < 0.05,
                ).insert()

            m_inflow = base_inflows[idx] * (1.03 ** month_offset) * random.uniform(0.8, 1.2)
            m_outflow = base_outflows[idx] * (1.02 ** month_offset) * random.uniform(0.85, 1.15)
            existing_tx = await TransactionRecord.find_one(TransactionRecord.msme_id == str(msme.id), TransactionRecord.month == period_str)
            if not existing_tx:
                await TransactionRecord(
                    msme_id=str(msme.id), month=period_str,
                    total_inflow=round(m_inflow, 2), total_outflow=round(m_outflow, 2),
                    net_cash_flow=round(m_inflow - m_outflow, 2),
                    upi_transaction_count=random.randint(80, 350),
                    upi_volume=round(m_inflow * random.uniform(0.3, 0.6), 2),
                    cheque_bounced_count=random.randint(0, 3),
                    emi_paid_on_time=random.random() > 0.1,
                    vendor_payments_punctuality=round(random.uniform(0.65, 0.95), 2),
                    data_source=random.choice(["manual", "aa_framework"]),
                ).insert()

    # Credit scores
    score_configs = [
        {"score": 728, "risk": "Low", "loan_amt": 5000000, "band": "8-10%", "schemes": ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"]},
        {"score": 612, "risk": "Medium", "loan_amt": 1000000, "band": "13-16%", "schemes": ["Mudra Yojana (Kishor)", "CGTMSE"]},
        {"score": 785, "risk": "Low", "loan_amt": 5000000, "band": "8-10%", "schemes": ["Mudra Yojana (Tarun)", "CGTMSE", "PSB Loans 59 Min"]},
    ]

    score_objects = []
    for idx, msme in enumerate(msme_objects):
        existing_score = await CreditScore.find_one(CreditScore.msme_id == str(msme.id))
        if existing_score:
            score_objects.append(existing_score)
            continue

        cfg = score_configs[idx]
        # Historical scores
        for hist_idx in range(3):
            hist_score = max(300, cfg["score"] - (3 - hist_idx) * random.randint(15, 40))
            hist_risk = "Low" if hist_score >= 700 else ("Medium" if hist_score >= 550 else "High")
            await CreditScore(
                msme_id=str(msme.id), generated_by=str(officer.id),
                score_value=hist_score, risk_category=hist_risk,
                model_version="weighted_ensemble_v1",
                shap_values={"gstConsistency": 0.08, "cashFlowHealth": 0.12, "revenueGrowth": 0.06, "paymentBehaviour": 0.04, "transactionVolume": 0.03, "chequeBouncerate": -0.04},
                shap_summary=[
                    {"feature": "gstConsistency", "impact": 0.08, "direction": "positive", "displayLabel": "GST Filing Consistency"},
                    {"feature": "cashFlowHealth", "impact": 0.12, "direction": "positive", "displayLabel": "Cash Flow Health"},
                    {"feature": "revenueGrowth", "impact": 0.06, "direction": "positive", "displayLabel": "Revenue Growth Rate"},
                    {"feature": "paymentBehaviour", "impact": 0.04, "direction": "positive", "displayLabel": "Vendor Payment Behaviour"},
                    {"feature": "transactionVolume", "impact": 0.03, "direction": "positive", "displayLabel": "Digital Payment Growth"},
                    {"feature": "chequeBouncerate", "impact": -0.04, "direction": "negative", "displayLabel": "Cheque Bounce Rate"},
                ],
                created_at=datetime.utcnow() - timedelta(days=90 * (3 - hist_idx)),
            ).insert()

        # Latest score
        cs = CreditScore(
            msme_id=str(msme.id), generated_by=str(officer.id),
            score_value=cfg["score"], risk_category=cfg["risk"],
            model_version="weighted_ensemble_v1",
            shap_values={"gstConsistency": 0.10, "cashFlowHealth": 0.15, "revenueGrowth": 0.08, "paymentBehaviour": 0.05, "transactionVolume": 0.03, "chequeBouncerate": -0.05},
            shap_summary=[
                {"feature": "gstConsistency", "impact": 0.10, "direction": "positive", "displayLabel": "GST Filing Consistency"},
                {"feature": "cashFlowHealth", "impact": 0.15, "direction": "positive", "displayLabel": "Cash Flow Health"},
                {"feature": "revenueGrowth", "impact": 0.08, "direction": "positive", "displayLabel": "Revenue Growth Rate"},
                {"feature": "paymentBehaviour", "impact": 0.05, "direction": "positive", "displayLabel": "Vendor Payment Behaviour"},
                {"feature": "transactionVolume", "impact": 0.03, "direction": "positive", "displayLabel": "Digital Payment Growth"},
                {"feature": "chequeBouncerate", "impact": -0.05, "direction": "negative", "displayLabel": "Cheque Bounce Rate"},
            ],
            recommended_loan_amount=cfg["loan_amt"], recommended_interest_band=cfg["band"],
            eligible_government_schemes=cfg["schemes"],
            stress_signals=[{"signal": "high_cheque_bounce", "severity": "warning", "description": "Cheque bounce rate slightly elevated"}] if cfg["risk"] == "Medium" else [],
            fraud_flags=[],
            explanation_text=f"Your credit score of {cfg['score']} places you in the {cfg['risk']} Risk category. " + (
                "Your strong financial indicators support this excellent score. You may be eligible for fast-track loan consideration."
                if cfg["risk"] == "Low" else
                "Your financial profile shows mixed signals. Maintaining consistent filings could boost your score."
            ),
        )
        await cs.insert()
        score_objects.append(cs)
        msme.latest_score_id = str(cs.id)
        await msme.save()

    # Loan applications
    loan_count = await LoanApplication.count()
    if loan_count == 0:
        loan_configs = [
            {"amount": 2500000, "purpose": "working_capital", "tenure": 24, "status": "approved", "remarks": "Strong credit profile. Approved.", "approved_amt": 2200000},
            {"amount": 500000, "purpose": "equipment", "tenure": 12, "status": "submitted", "remarks": None, "approved_amt": None},
            {"amount": 5000000, "purpose": "expansion", "tenure": 36, "status": "under_review", "remarks": None, "approved_amt": None},
            {"amount": 800000, "purpose": "working_capital", "tenure": 18, "status": "rejected", "remarks": "Insufficient credit history. Reapply after 6 months.", "approved_amt": None},
        ]
        for li, lc in enumerate(loan_configs):
            msme_idx = li % len(msme_objects)
            await LoanApplication(
                msme_id=str(msme_objects[msme_idx].id), applicant=str(owner.id),
                assigned_officer=str(officer.id) if lc["status"] != "submitted" else None,
                score_id=str(score_objects[msme_idx].id),
                requested_amount=lc["amount"], loan_purpose=lc["purpose"],
                repayment_tenure=lc["tenure"], status=lc["status"],
                officer_remarks=lc["remarks"], approved_amount=lc["approved_amt"],
                decision_date=datetime.utcnow() - timedelta(days=random.randint(1, 30)) if lc["status"] in ["approved", "rejected"] else None,
                created_at=datetime.utcnow() - timedelta(days=random.randint(5, 60)),
            ).insert()

    print("   ✅ Demo data seeded successfully")


async def disconnect_db() -> None:
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        print("📦 MongoDB disconnected")
