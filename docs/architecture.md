# CreditSaathi — Architecture Overview

> System architecture and design decisions for the AI-Powered MSME Credit Intelligence Platform.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│            React 18 + Redux Toolkit + Tailwind CSS           │
│         Dashboard │ Score Gauge │ SHAP Panel │ Charts        │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS REST (JSON)
                           │ JWT Bearer Token
┌──────────────────────────▼──────────────────────────────────┐
│                 Node.js / Express Backend                     │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Auth API │ │ MSME API │ │Score API │ │  Loan API     │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Middleware Layer                         │   │
│  │  JWT Auth │ RBAC │ Rate Limit │ Validation │ Audit   │   │
│  └──────────────────────────────────────────────────────┘   │
└────────┬──────────────────┬──────────────────┬──────────────┘
         │                  │                  │
         │ Mongoose ODM     │ Internal HTTP    │ Firebase SDK
         ▼                  ▼                  ▼
┌────────────────┐ ┌────────────────┐ ┌────────────────────┐
│  MongoDB Atlas │ │ Python/FastAPI │ │  Firebase Storage  │
│  (Free Tier)   │ │ ML Service     │ │  (Free Tier)       │
│                │ │                │ │                    │
│  • Users       │ │ • XGBoost      │ │  • Bank statements │
│  • MSMEs       │ │ • SHAP         │ │  • GST files       │
│  • Scores      │ │ • Feature Eng. │ │  • KYC documents   │
│  • Loans       │ │ • Fraud Rules  │ │                    │
│  • Audit Logs  │ │ • Stress Det.  │ │                    │
└────────────────┘ └────────────────┘ └────────────────────┘
```

---

## Service Communication

```
┌──────────┐   POST /scoring/generate/:id   ┌──────────────┐
│  Express │ ──────────────────────────────► │   FastAPI     │
│  Backend │   { msmeId, features }          │   ML Service  │
│          │ ◄────────────────────────────── │               │
│          │   { score, shap, risk, stress } │               │
└──────────┘                                 └──────────────┘
     │
     │  Score generation flow:
     │  1. Backend assembles feature payload from MongoDB
     │  2. Sends POST to ML service (http://localhost:8000)
     │  3. ML service runs XGBoost + SHAP
     │  4. Backend stores result in credit_scores collection
     │  5. Returns score + SHAP to frontend
```

---

## Data Flow — Credit Score Generation

```
  MSME Owner / Bank Officer
         │
         │ 1. Upload GST + Transaction Data (CSV/JSON)
         ▼
  ┌──────────────┐
  │  Express API │──► Validate & store in MongoDB
  └──────┬───────┘
         │
         │ 2. Click "Generate Score"
         ▼
  ┌──────────────┐
  │  Express API │──► Check: ≥6 months GST + Transaction data?
  └──────┬───────┘
         │
         │ 3. Assemble features from raw data
         ▼
  ┌──────────────┐    ┌─────────────────┐
  │  Express API │───►│  FastAPI ML Svc  │
  │              │    │                 │
  │              │    │  Feature Eng.   │
  │              │    │  ► Normalise    │
  │              │    │  ► XGBoost      │
  │              │    │  ► SHAP values  │
  │              │    │  ► Stress det.  │
  │              │    │  ► Fraud rules  │
  └──────┬───────┘◄───└─────────────────┘
         │
         │ 4. Store CreditScore document
         │ 5. Update MSME.latestScoreId
         │ 6. Create audit log entry
         ▼
  ┌──────────────┐
  │   Frontend   │──► Display score gauge, SHAP panel, risk badge
  └──────────────┘
```

---

## Database Design

### Collections & Relationships

```
  ┌──────────┐       ┌──────────────┐       ┌───────────────┐
  │  users   │──1:N──│    msmes     │──1:N──│  gst_records  │
  └──────────┘       └──────┬───────┘       └───────────────┘
                            │
                      1:N   │   1:N
                 ┌──────────┼──────────┐
                 ▼          ▼          ▼
          ┌────────────┐ ┌──────────┐ ┌────────────────────┐
          │credit_scores│ │documents │ │transaction_records │
          └─────┬──────┘ └──────────┘ └────────────────────┘
                │
           1:N  │
                ▼
        ┌────────────────┐     ┌──────────────┐
        │loan_applications│     │  audit_logs  │
        └────────────────┘     └──────────────┘
```

### Key Collections

| Collection | Records (Pilot) | Key Indexes |
|---|---|---|
| `users` | ~100 | `email` (unique) |
| `msmes` | ~10,000 | `gstin` (unique), `owner`, `status` |
| `gst_records` | ~120,000 | `msmeId` + `filingPeriod` (compound) |
| `transaction_records` | ~120,000 | `msmeId` + `month` (compound) |
| `credit_scores` | ~50,000 | `msmeId`, `createdAt` |
| `loan_applications` | ~5,000 | `msmeId`, `status`, `assignedOfficer` |
| `audit_logs` | ~200,000 | `targetMsmeId`, `action`, `createdAt` |

---

## Authentication & Authorisation

```
  Login                    Protected Request
    │                           │
    ▼                           ▼
  POST /auth/login         GET /scoring/:id/latest
    │                           │
    ▼                           ▼
  Validate email/password   Extract JWT from Authorization header
    │                           │
    ▼                           ▼
  Generate:                 Verify JWT (15-min expiry)
  • Access token (15 min)       │
  • Refresh token (7 days)      ▼
    │                       Check role permission (RBAC)
    ▼                           │
  Return access token           ▼
  Set refresh in httpOnly   Allow / Deny (401 / 403)
  cookie
```

### Role-Based Access Control (RBAC)

| Role | Can Access |
|---|---|
| `admin` | Everything — user management, model config, audit logs |
| `bank_officer` | All MSMEs in their org, scoring, loan decisions |
| `msme_owner` | Own profile only, own score, own loan status |

---

## ML Service Architecture

```
  FastAPI App (Port 8000)
  │
  ├── POST /score
  │   ├── Input:  { features: { gst_filing_rate, avg_net_cash_flow, ... } }
  │   ├── Pipeline:
  │   │   1. StandardScaler (pre-fitted) normalises 10 features
  │   │   2. XGBoost predicts probability (0–1)
  │   │   3. Map to score: 300 + (probability × 550)
  │   │   4. SHAP TreeExplainer computes feature contributions
  │   │   5. Stress detection rules evaluate signals
  │   │   6. Fraud detection rules evaluate anomalies
  │   └── Output: { score, risk_category, shap_values, stress_signals, fraud_flags }
  │
  └── GET /health
      └── Returns: { status: "ok", model_version: "xgboost_v1" }
```

### ML Feature Vector (10 Features)

| # | Feature | Source | Range |
|---|---------|--------|-------|
| 1 | `gst_filing_rate` | GST records | 0–1 |
| 2 | `gst_on_time_rate` | GST records | 0–1 |
| 3 | `avg_monthly_revenue` | GST records | Normalised |
| 4 | `revenue_growth_rate` | GST records | % |
| 5 | `avg_net_cash_flow` | Transactions | Normalised |
| 6 | `cash_flow_volatility` | Transactions | Std dev |
| 7 | `upi_volume_growth` | Transactions | % |
| 8 | `cheque_bounce_rate` | Transactions | 0–1 |
| 9 | `vendor_payment_score` | Transactions | 0–1 |
| 10 | `nil_return_ratio` | GST records | 0–1 |

---

## API Structure

### Base URLs

| Environment | URL |
|---|---|
| Development | `http://localhost:5000/api/v1` |
| ML Service | `http://localhost:8000` (internal only) |
| Production | `https://api.creditsaathi.in/v1` |

### Route Groups

```
/api/v1/
├── auth/          → Register, Login, Refresh, Logout
├── users/         → Profile management
├── msmes/         → MSME CRUD, onboarding
├── gst/           → GST record upload & retrieval
├── transactions/  → Cash flow data upload
├── scoring/       → Trigger scoring, get scores, SHAP data
├── loans/         → Loan application lifecycle
├── documents/     → File upload & retrieval
├── reports/       → BI reports
└── admin/         → User management, audit logs
```

---

## Security Layers

| Layer | Implementation |
|---|---|
| **Authentication** | JWT (15-min access + 7-day refresh in httpOnly cookie) |
| **Password Storage** | bcrypt (salt rounds: 12) |
| **Authorisation** | RBAC middleware per route |
| **Rate Limiting** | express-rate-limit (100 req / 15 min / IP) |
| **Input Validation** | Joi / express-validator on all endpoints |
| **HTTP Hardening** | Helmet.js |
| **CORS** | Whitelist frontend origin only |
| **PII Encryption** | AES-256 at rest (PAN, Aadhaar) |
| **File Storage** | Firebase Storage with security rules + signed URLs |
| **Audit Trail** | Append-only logs, SHA-256 hash of score I/O |

---

## Deployment Architecture

```
  GitHub Repository
       │
       │ Push / PR to develop or main
       ▼
  GitHub Actions CI
  ├── Backend: ESLint + Jest
  ├── Frontend: ESLint + Build
  └── ML: flake8 + pytest
       │
       │ On merge to main
       ▼
  ┌────────────────────┐
  │  GitHub Container   │
  │  Registry (free)    │
  │  Docker images      │
  └────────┬───────────┘
           │
           ▼
  ┌────────────────────┐
  │ Render / Railway    │
  │ (free tier)         │
  │                    │
  │ • Backend service  │
  │ • ML service       │
  │ • Frontend (static)│
  └────────────────────┘
           │
           ▼
  ┌────────────────────┐
  │  MongoDB Atlas     │
  │  (M0 free tier)    │
  └────────────────────┘
```

---

## Phase Roadmap

| Phase | Features | Timeline |
|---|---|---|
| **Phase 1 — Core MVP** | Auth, MSME profiles, data ingestion, AI scoring, SHAP, dashboard | Month 1–2 |
| **Phase 2 — High Impact** | Loan engine, stress detection, eKYC, fraud detection | Month 2–3 |
| **Phase 3 — Advanced** | Sector benchmarking, dynamic monitoring, supply chain, Hindi UI | Month 4–6 |
| **Phase 4 — Differentiating** | LLM chatbot (Groq API), bank API integration layer | Month 7–12 |
