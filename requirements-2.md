# CreditSaathi — Project Requirements Document

> **AI-Powered Credit & Business Intelligence Platform for MSMEs**
> Version: 1.0 | Stack: MERN | Duration: 3 Months | Team Size: 4

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Team Structure & Roles](#2-team-structure--roles)
3. [Technology Stack](#3-technology-stack)
4. [System Architecture](#4-system-architecture)
5. [Database Schema](#5-database-schema)
6. [API Architecture](#6-api-architecture)
7. [Security Requirements](#7-security-requirements)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Sprint Plan — 3 Month Roadmap](#9-sprint-plan--3-month-roadmap)
10. [Environment & DevOps](#10-environment--devops)
11. [Third-Party Integrations](#11-third-party-integrations)
12. [Compliance & Regulatory](#12-compliance--regulatory)
13. [Testing Strategy](#13-testing-strategy)
14. [Risk Register](#14-risk-register)
15. [Definition of Done](#15-definition-of-done)

---

## 1. Project Overview

### 1.1 Background

CreditSaathi is a full-stack AI-powered credit intelligence platform targeting India's MSME sector. The platform evaluates MSME financial health using alternative data sources — GST filing patterns, UPI/bank transaction flows, monthly revenue trends, and payment behaviour — to generate instant credit scores, risk categories, and actionable business intelligence reports for banks, NBFCs, and lenders.

### 1.2 Business Goals

| Goal | Metric |
|------|--------|
| Replace CIBIL dependency for MSME lending | Score generated without CIBIL as input |
| Instant credit scoring | Score delivered in < 10 seconds |
| Regulatory explainability | SHAP panel for every scoring decision |
| Reduce loan rejection rate | Target 40% improvement in approvals for eligible MSMEs |
| Enable bank pilot | POC with 1 bank/NBFC by Month 3 |

### 1.3 Scope — 3 Month Build

Given a 3-month timeline and a team of 4, the build is scoped as follows:

| Phase | Scope | Timeline |
|-------|-------|----------|
| Phase 1 — Core MVP | AI credit scoring, risk classification, SHAP explainability, business dashboard | Month 1–2 |
| Phase 2 — High Impact | Loan recommendation engine, early stress detection, eKYC + document upload, basic fraud detection | Month 2–3 |
| Phase 3 & 4 — Stubs | Sector benchmarking, dynamic monitoring, supply chain finance, LLM chatbot, bank API layer | Architecture planned, full build post MVP |

---

## 2. Team Structure & Roles

### 2.1 Team Allocation

| Member | Role | Primary Responsibilities |
|--------|------|--------------------------|
| **Developer A** | Backend Lead | Node.js/Express REST APIs, ML microservice integration, business logic, MongoDB design |
| **Developer B** | Frontend Lead | React application, Redux state management, dashboard UI, data visualisation (Recharts) |
| **Developer C** | ML / Data Engineer | Python ML scoring service, SHAP integration, data pipeline, synthetic data generation, feature engineering |
| **Developer D** | Full-Stack + DevOps | MongoDB advanced queries, AWS deployment, CI/CD pipeline, Phase 2 feature development, testing |

### 2.2 Collaboration Protocol

- **Daily standup**: 15 min, async (Slack/Discord updates)
- **Sprint review**: Every 2 weeks (end of each sprint)
- **Code review**: All PRs require review from at least 1 other team member before merge
- **Branch strategy**: `main` → `develop` → `feature/xxx` → PRs into `develop` → merge to `main` on release
- **Task tracking**: GitHub Projects (Kanban board) or Notion
- **Documentation**: All APIs documented in Postman or Swagger before implementation

---

## 3. Technology Stack

### 3.1 Core MERN Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 18.x | SPA framework |
| **State Management** | Redux Toolkit | 2.x | Global state, async thunks |
| **UI Framework** | Tailwind CSS | 3.x | Styling |
| **Charts** | Recharts | 2.x | Revenue trends, cash flow visuals |
| **HTTP Client** | Axios | 1.x | API calls with interceptors |
| **Backend** | Node.js + Express | 20.x LTS / 4.x | REST API server |
| **Database** | MongoDB | 7.x | Primary datastore |
| **ODM** | Mongoose | 8.x | Schema modelling and validation |

### 3.2 ML Service (Python Microservice)

| Technology | Purpose |
|-----------|---------|
| Python 3.11 | ML runtime |
| FastAPI | ML REST microservice (called by Node backend) |
| scikit-learn | Preprocessing pipelines |
| XGBoost / LightGBM | Primary credit scoring model |
| SHAP | Explainability panel generation |
| Pandas / NumPy | Feature engineering and data transformation |
| Joblib | Model serialisation |

> **Architecture note**: The ML scoring service runs as a separate Python/FastAPI microservice. The Node.js backend calls it via internal HTTP. This keeps the MERN stack clean while enabling Python's ML ecosystem.

### 3.3 Supporting Infrastructure

| Tool | Purpose |
|------|---------|
| Render / Railway (free tier) | Backend + ML service hosting (no cost for MVP) |
| Firebase Storage (free tier — 5 GB) | Document storage (bank statements, GST files) |
| MongoDB Atlas (free tier — M0, 512 MB) | Managed MongoDB in cloud |
| Redis (optional Phase 2) | Caching score results, session management |
| Firebase Storage | Profile image / document preview (same bucket as above) |
| JWT + bcrypt | Authentication and password hashing |
| Nodemailer + Gmail SMTP | Email notifications (free — up to 500 emails/day) |
| Multer | File upload handling |
| Docker | Containerisation of Node + Python services |
| GitHub Actions (free tier — 2,000 min/mo) | CI/CD pipeline |

### 3.4 Development Tools

| Tool | Purpose |
|------|---------|
| ESLint + Prettier | Code linting and formatting |
| Jest + Supertest | Backend unit and integration tests |
| React Testing Library | Frontend component testing |
| Postman | API design and testing |
| Swagger / OpenAPI | API documentation |
| dotenv | Environment variable management |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser)                      │
│              React 18 + Redux Toolkit + Tailwind         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS REST
┌──────────────────────▼──────────────────────────────────┐
│               Node.js / Express Backend                  │
│         Auth │ MSME APIs │ Score APIs │ Report APIs      │
│                   JWT Middleware                         │
└────────┬─────────────────────────────────┬──────────────┘
         │ Mongoose ODM                    │ Internal HTTP
┌────────▼───────────┐          ┌──────────▼──────────────┐
│   MongoDB Atlas    │          │   Python / FastAPI       │
│  Users, MSMEs,    │          │   ML Scoring Service     │
│  Scores, Reports  │          │   XGBoost + SHAP         │
└────────────────────┘          └─────────────────────────┘
         │
┌────────▼───────────┐
│     AWS S3         │
│  Documents, Files  │
└────────────────────┘
```

### 4.2 Module Breakdown

**Backend modules (Node.js/Express)**

```
/server
  /config          → DB connection, env, constants
  /models          → Mongoose schemas
  /routes          → Express route definitions
  /controllers     → Business logic handlers
  /middleware      → Auth, error handling, file upload, rate limiting
  /services        → ML service caller, S3 service, email service
  /utils           → Helpers, validators, score formatter
  /tests           → Jest test suites
```

**Frontend modules (React)**

```
/client/src
  /pages           → Dashboard, Score, Reports, MSME Profile, Login
  /components      → Charts, Score Gauge, SHAP Panel, Risk Badge, Tables
  /store           → Redux slices (auth, msme, score, report)
  /hooks           → useScore, useMSME, useAuth custom hooks
  /services        → Axios API service layer
  /utils           → Formatters, validators
  /assets          → Logos, icons, static assets
```

---

## 5. Database Schema

### 5.1 Collections Overview

| Collection | Description |
|------------|-------------|
| `users` | Bank officers, admin users, MSME owners |
| `msmes` | Core MSME business profiles |
| `gst_records` | GST filing history per MSME |
| `transaction_records` | UPI/bank cash flow data |
| `credit_scores` | Generated credit score with SHAP data |
| `loan_applications` | Loan application lifecycle |
| `documents` | Uploaded files metadata |
| `audit_logs` | All scoring decisions for compliance |
| `benchmarks` | Sector benchmark data |

### 5.2 Key Schema Definitions

#### users

```javascript
{
  _id: ObjectId,
  name: String,
  email: { type: String, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'bank_officer', 'msme_owner'] },
  organisationName: String,
  organisationType: { type: String, enum: ['bank', 'nbfc', 'msme'] },
  isVerified: Boolean,
  refreshToken: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### msmes

```javascript
{
  _id: ObjectId,
  owner: { type: ObjectId, ref: 'User' },
  businessName: String,
  gstin: { type: String, unique: true },
  pan: String,
  businessType: { type: String, enum: ['micro', 'small', 'medium'] },
  sector: String,                          // e.g. 'textile', 'retail', 'manufacturing'
  incorporationDate: Date,
  registeredState: String,
  city: String,
  contactEmail: String,
  contactPhone: String,
  udyamRegistrationNo: String,
  annualTurnoverBand: String,              // e.g. '<40L', '40L-1.5Cr', '1.5Cr-5Cr'
  employeeCount: Number,
  bankAccountLinked: Boolean,
  aaConsentGiven: Boolean,                 // Account Aggregator consent
  aaConsentTimestamp: Date,
  latestScoreId: { type: ObjectId, ref: 'CreditScore' },
  status: { type: String, enum: ['active', 'inactive', 'flagged'] },
  createdAt: Date,
  updatedAt: Date
}
```

#### gst_records

```javascript
{
  _id: ObjectId,
  msmeId: { type: ObjectId, ref: 'MSME' },
  filingPeriod: String,                   // e.g. 'GSTR1_2024_Q3'
  filingType: { type: String, enum: ['GSTR1', 'GSTR3B', 'GSTR9'] },
  filedOnTime: Boolean,
  filingDate: Date,
  taxableRevenue: Number,
  taxPaid: Number,
  nilReturn: Boolean,
  amendment: Boolean,
  rawDataRef: String,                     // Firebase Storage path for original JSON
  createdAt: Date
}
```

#### transaction_records

```javascript
{
  _id: ObjectId,
  msmeId: { type: ObjectId, ref: 'MSME' },
  month: String,                          // 'YYYY-MM'
  totalInflow: Number,
  totalOutflow: Number,
  netCashFlow: Number,
  upiTransactionCount: Number,
  upiVolume: Number,
  chequeBouncedCount: Number,
  emiPaidOnTime: Boolean,
  vendorPaymentsPunctuality: Number,      // 0-1 ratio
  seasonalityFlag: Boolean,
  dataSource: { type: String, enum: ['manual', 'aa_framework', 'bank_statement_ocr'] },
  createdAt: Date
}
```

#### credit_scores

```javascript
{
  _id: ObjectId,
  msmeId: { type: ObjectId, ref: 'MSME' },
  generatedBy: { type: ObjectId, ref: 'User' },
  scoreValue: { type: Number, min: 300, max: 850 },
  riskCategory: { type: String, enum: ['Low', 'Medium', 'High'] },
  modelVersion: String,
  shapValues: {
    gstConsistency: Number,
    cashFlowHealth: Number,
    revenueGrowth: Number,
    paymentBehaviour: Number,
    transactionVolume: Number,
    chequeBouncerate: Number
  },
  shapSummary: [
    {
      feature: String,
      impact: Number,               // positive = good for score
      displayLabel: String
    }
  ],
  featureInputSnapshot: Object,     // raw feature values used for scoring
  recommendedLoanAmount: Number,
  recommendedInterestBand: String,
  eligibleGovernmentSchemes: [String],
  stressSignals: [String],          // early warning flags if any
  explanationText: String,          // plain-English summary
  auditHash: String,                // SHA-256 of input+output for tamper evidence
  createdAt: Date
}
```

#### loan_applications

```javascript
{
  _id: ObjectId,
  msmeId: { type: ObjectId, ref: 'MSME' },
  assignedOfficer: { type: ObjectId, ref: 'User' },
  scoreId: { type: ObjectId, ref: 'CreditScore' },
  requestedAmount: Number,
  loanPurpose: String,
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'disbursed']
  },
  officerRemarks: String,
  decisionDate: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### audit_logs

```javascript
{
  _id: ObjectId,
  action: String,                         // 'score_generated', 'loan_approved', etc.
  performedBy: { type: ObjectId, ref: 'User' },
  targetMsmeId: { type: ObjectId, ref: 'MSME' },
  entityType: String,
  entityId: ObjectId,
  ipAddress: String,
  userAgent: String,
  payload: Object,                        // sanitised snapshot
  createdAt: Date
}
```

---

## 6. API Architecture

### 6.1 Base URL Structure

```
Production:  https://api.creditsaathi.in/v1
Development: http://localhost:5000/api/v1
ML Service:  http://localhost:8000 (internal only)
```

### 6.2 Route Groups

| Route Group | Base Path | Description |
|-------------|-----------|-------------|
| Auth | `/api/v1/auth` | Register, login, refresh, logout |
| Users | `/api/v1/users` | Profile management |
| MSMEs | `/api/v1/msmees` | MSME CRUD, onboarding |
| GST | `/api/v1/gst` | GST record ingestion and retrieval |
| Transactions | `/api/v1/transactions` | Cash flow data upload |
| Scoring | `/api/v1/scoring` | Trigger scoring, retrieve scores |
| Reports | `/api/v1/reports` | Business intelligence reports |
| Documents | `/api/v1/documents` | File upload and retrieval |
| Loans | `/api/v1/loans` | Loan application management |
| Admin | `/api/v1/admin` | User management, audit logs |

### 6.3 Key Endpoints

**Auth**
```
POST   /auth/register           → Register user
POST   /auth/login              → Login, returns JWT + refresh token
POST   /auth/refresh            → Rotate access token
POST   /auth/logout             → Invalidate refresh token
POST   /auth/verify-email       → Email verification
```

**MSME Management**
```
POST   /msmees                  → Create MSME profile
GET    /msmees                  → List MSMEs (paginated, bank officer only)
GET    /msmees/:id              → Get MSME detail
PUT    /msmees/:id              → Update MSME profile
DELETE /msmees/:id              → Soft delete
GET    /msmees/:id/summary      → Dashboard summary card
```

**Data Ingestion**
```
POST   /gst/upload              → Upload GST filing records (JSON or CSV)
POST   /gst/:msmeId/manual      → Add single GST record manually
GET    /gst/:msmeId             → Get all GST records for MSME

POST   /transactions/upload     → Upload bank statement (CSV/JSON)
POST   /transactions/:msmeId    → Add monthly cash flow record
GET    /transactions/:msmeId    → Retrieve transaction history
```

**Scoring**
```
POST   /scoring/generate/:msmeId → Trigger credit score generation
GET    /scoring/:msmeId/latest  → Get latest credit score
GET    /scoring/:msmeId/history → Score history over time
GET    /scoring/:scoreId/shap   → Get SHAP breakdown for a score
GET    /scoring/:scoreId/report → Download full PDF report
```

**Loan Applications**
```
POST   /loans                   → Submit loan application
GET    /loans                   → List applications (officer view)
GET    /loans/:id               → Application detail
PATCH  /loans/:id/status        → Update status (approve/reject)
```

### 6.4 Standard Response Format

```javascript
// Success
{
  "success": true,
  "message": "Credit score generated successfully",
  "data": { ... },
  "meta": { "timestamp": "ISO8601", "requestId": "uuid" }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "GSTIN is required",
    "field": "gstin"
  },
  "meta": { "timestamp": "ISO8601", "requestId": "uuid" }
}
```

---

## 7. Security Requirements

### 7.1 Authentication & Authorisation

- JWT access tokens with 15-minute expiry
- Refresh tokens with 7-day expiry, stored in `httpOnly` cookies
- Role-based access control (RBAC): `admin`, `bank_officer`, `msme_owner`
- Email verification before account activation
- bcrypt password hashing (salt rounds: 12)

### 7.2 API Security

- Rate limiting: 100 requests/15 min per IP (express-rate-limit)
- Strict CORS policy — whitelist frontend origin only
- Helmet.js for HTTP header hardening
- Input validation and sanitisation on all endpoints (Joi / express-validator)
- SQL/NoSQL injection prevention via Mongoose strict mode
- File upload validation: type check (MIME), size limit (10MB), virus scan stub

### 7.3 Data Security

- All PII fields (PAN, Aadhaar) encrypted at rest using AES-256
- GSTIN stored in plain text (required for GST API calls) but access-controlled
- Firebase Storage: security rules restrict access, signed URLs for document access (15-min expiry)
- Audit log on every scoring decision (immutable, append-only)
- HTTPS enforced in production; TLS 1.2+

### 7.4 Compliance Readiness

- All data operations log user ID, timestamp, and IP
- MSME consent tracked before any data aggregation (AA consent flag)
- Data deletion workflow for DPDP Act compliance (right to erasure)
- No PII in application logs

---

## 8. Non-Functional Requirements

| Category | Requirement | Target |
|----------|-------------|--------|
| **Performance** | Credit score generation time | < 10 seconds end-to-end |
| **Performance** | API response time (95th percentile) | < 500ms |
| **Performance** | Dashboard load time | < 2 seconds |
| **Availability** | Uptime target | 99% (pilot phase) |
| **Scalability** | Concurrent scoring requests | 50 concurrent (MVP) |
| **Scalability** | MSME records | Up to 10,000 for pilot |
| **Reliability** | ML service failure fallback | Graceful error with retry |
| **Accessibility** | WCAG AA compliance | Level AA |
| **Browser Support** | Chrome, Firefox, Safari, Edge | Latest 2 versions |
| **Mobile** | Responsive design | Mobile-friendly (React + Tailwind) |
| **Internationalisation** | Language support | English (Hindi stub in Phase 3) |

---

## 9. Sprint Plan — 3 Month Roadmap

> **12 weeks | 6 sprints of 2 weeks each | 4 developers**

---

### Sprint 1 — Weeks 1–2: Foundation

**Goal**: Project scaffolding, database, authentication, MSME onboarding

| Task | Owner | Priority |
|------|-------|----------|
| Initialise MERN monorepo structure | Dev A | P0 |
| Configure MongoDB Atlas + Mongoose connection | Dev A | P0 |
| Implement User model + JWT auth (register/login/refresh) | Dev A | P0 |
| RBAC middleware | Dev A | P0 |
| React app scaffold (Vite + Tailwind + Redux Toolkit) | Dev B | P0 |
| Login/Register UI with form validation | Dev B | P0 |
| Protected route wrapper | Dev B | P0 |
| MSME model + CRUD endpoints | Dev D | P0 |
| MSME onboarding form (multi-step) | Dev D | P1 |
| Set up Python/FastAPI ML service skeleton | Dev C | P0 |
| Docker Compose for local dev | Dev D | P1 |
| GitHub Actions CI skeleton | Dev D | P1 |
| Postman collection baseline | Dev A | P1 |

**Deliverable**: Working auth flow, MSME profile creation, dev environment running via Docker

---

### Sprint 2 — Weeks 3–4: Data Ingestion & ML Core

**Goal**: GST + transaction data upload, ML model training, scoring endpoint

| Task | Owner | Priority |
|------|-------|----------|
| GST record model + upload endpoint (CSV/JSON) | Dev A | P0 |
| Transaction record model + upload endpoint | Dev A | P0 |
| Feature engineering pipeline (Python) | Dev C | P0 |
| Synthetic dataset generation for model training | Dev C | P0 |
| Train XGBoost scoring model (v1) | Dev C | P0 |
| SHAP integration in ML service | Dev C | P0 |
| Score generation endpoint (`POST /scoring/generate/:id`) | Dev A | P0 |
| Node → FastAPI internal HTTP service call | Dev A | P0 |
| CreditScore model (Mongoose) + storage | Dev A | P0 |
| Data upload UI (drag-and-drop CSV) | Dev B | P1 |
| Loading states + error handling UI | Dev B | P1 |
| Audit log model + middleware | Dev D | P1 |
| Unit tests for auth + MSME endpoints | Dev D | P1 |

**Deliverable**: End-to-end scoring pipeline working (upload data → trigger score → receive 300–850 + SHAP)

---

### Sprint 3 — Weeks 5–6: Dashboard & SHAP UI

**Goal**: Business intelligence dashboard, SHAP explainability panel, risk badge

| Task | Owner | Priority |
|------|-------|----------|
| MSME dashboard page (score card, risk badge, trends) | Dev B | P0 |
| Credit score gauge component (D3 / SVG arc) | Dev B | P0 |
| SHAP explainability panel (horizontal bar chart) | Dev B | P0 |
| Revenue trend line chart (Recharts) | Dev B | P0 |
| Cash flow inflow/outflow bar chart | Dev B | P0 |
| Risk category badge component | Dev B | P0 |
| Score history timeline | Dev B | P1 |
| Bank officer portfolio view (list of MSMEs + scores) | Dev B | P1 |
| Latest score API with populated SHAP data | Dev A | P0 |
| Report generation endpoint (text summary) | Dev A | P1 |
| Plain-English explanation generator (rule-based) | Dev C | P1 |
| Integration tests for scoring pipeline | Dev D | P1 |
| Swagger docs for all V1 endpoints | Dev D | P1 |

**Deliverable**: Fully functional dashboard with score, SHAP panel, and charts visible to bank officer

---

### Sprint 4 — Weeks 7–8: Loan Module + Phase 2 Start

**Goal**: Loan application flow, recommendation engine, document upload

| Task | Owner | Priority |
|------|-------|----------|
| Loan application model + CRUD endpoints | Dev A | P0 |
| Loan recommendation logic (score → amount + rate mapping) | Dev A | P0 |
| Government scheme eligibility mapping (Mudra, CGTMSE, PSB59) | Dev C | P1 |
| Loan application form (MSME owner) | Dev B | P0 |
| Loan status tracking UI (officer + MSME views) | Dev B | P0 |
| Document upload (Multer + S3) | Dev A | P1 |
| Document viewer UI | Dev B | P1 |
| Early stress detection signals (rule-based v1) | Dev C | P1 |
| Stress signal display on dashboard | Dev B | P1 |
| Email notification on score + loan decision | Dev D | P1 |
| Admin panel (user list, audit log viewer) | Dev D | P1 |

**Deliverable**: Loan application lifecycle functional; recommendation engine live; document upload working

---

### Sprint 5 — Weeks 9–10: eKYC, Fraud Detection & Hardening

**Goal**: eKYC stub, fraud detection, enhanced ML model, security hardening

| Task | Owner | Priority |
|------|-------|----------|
| eKYC upload flow (Aadhaar/PAN image + OCR stub) | Dev A | P1 |
| Document validation (type, size, MIME) | Dev A | P1 |
| OCR integration stub (Tesseract.js or AWS Textract) | Dev C | P1 |
| Fraud detection rules (inflated GST, mismatched income) | Dev C | P1 |
| Fraud flag model integration into scoring output | Dev C | P1 |
| Fraud alert display on bank officer dashboard | Dev B | P1 |
| Model v2 — retrained with payment behaviour features | Dev C | P1 |
| Rate limiting tightening + security audit | Dev D | P0 |
| Penetration testing checklist run | Dev D | P0 |
| Performance testing (load test key endpoints) | Dev D | P1 |
| Responsive mobile UI pass | Dev B | P1 |
| Cross-browser testing | Dev B | P1 |

**Deliverable**: Fraud detection integrated; eKYC upload flow; security hardening complete

---

### Sprint 6 — Weeks 11–12: Polish, Testing & Pilot Prep

**Goal**: End-to-end testing, demo preparation, deployment, documentation

| Task | Owner | Priority |
|------|-------|----------|
| End-to-end test suite (Cypress or Playwright) | Dev D | P0 |
| Full Jest coverage for backend (target 70%+) | Dev D | P0 |
| Bug bash — all team members test full flows | All | P0 |
| Production deployment (AWS EC2 or Railway) | Dev D | P0 |
| Domain, SSL, environment configuration | Dev D | P0 |
| Demo dataset preparation (realistic synthetic MSMEs) | Dev C | P1 |
| Bank officer demo walkthrough script | Dev B | P1 |
| Sector benchmarking stub (Phase 3 foundation) | Dev A | P2 |
| PDF score report generation (puppeteer) | Dev A | P1 |
| User guide / onboarding documentation | Dev B | P1 |
| API documentation final publish (Swagger) | Dev A | P1 |
| Handover notes and post-MVP roadmap doc | All | P1 |

**Deliverable**: Production-deployed CreditSaathi platform, demo-ready for bank pilot

---

### Sprint Summary Table

| Sprint | Weeks | Focus | Phase Coverage |
|--------|-------|-------|----------------|
| 1 | 1–2 | Foundation, Auth, MSME Onboarding | Setup |
| 2 | 3–4 | Data Ingestion, ML Model, Scoring API | Phase 1 |
| 3 | 5–6 | Dashboard, SHAP Panel, Visualisations | Phase 1 |
| 4 | 7–8 | Loan Module, Recommendation Engine | Phase 1 + Phase 2 start |
| 5 | 9–10 | eKYC, Fraud Detection, Hardening | Phase 2 |
| 6 | 11–12 | Testing, Deployment, Pilot Prep | Phase 2 + MVP launch |

---

## 10. Environment & DevOps

### 10.1 Environment Variables

**Node.js Backend (.env)**
```
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<256-bit-secret>
JWT_REFRESH_SECRET=<256-bit-secret>
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
ML_SERVICE_URL=http://localhost:8000
FIREBASE_PROJECT_ID=creditsaathi
FIREBASE_STORAGE_BUCKET=creditsaathi.appspot.com
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-key.json
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
ALLOWED_ORIGIN=http://localhost:3000
```

**Python ML Service (.env)**
```
MODEL_PATH=./models/xgboost_v1.joblib
SCALER_PATH=./models/scaler.joblib
PORT=8000
LOG_LEVEL=info
```

### 10.2 Docker Setup

```yaml
# docker-compose.yml
services:
  backend:
    build: ./server
    ports: ["5000:5000"]
    env_file: ./server/.env
    depends_on: [mongo, ml-service]

  frontend:
    build: ./client
    ports: ["3000:3000"]

  ml-service:
    build: ./ml
    ports: ["8000:8000"]
    volumes: ["./ml/models:/app/models"]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: ["mongo-data:/data/db"]
```

### 10.3 CI/CD Pipeline (GitHub Actions)

```
On PR to develop:
  → Run ESLint
  → Run Jest tests
  → Run Python pytest
  → Build Docker images

On merge to main:
  → Run full test suite
  → Build + push Docker images to GitHub Container Registry (free)
  → Deploy to Render / Railway (free tier)
  → Run smoke test against production
```

---

## 11. Third-Party Integrations

| Integration | Purpose | Phase | Notes | Cost |
|-------------|---------|-------|-------|------|
| MongoDB Atlas (M0 free tier) | Database | Phase 1 | 512 MB free, sufficient for MVP | Free |
| Firebase Storage (free tier) | Document storage | Phase 1 | 5 GB free storage, 1 GB/day download | Free |
| Nodemailer + Gmail SMTP | Email notifications | Phase 1 | Gmail App Password, up to 500 emails/day | Free |
| Manual CSV Upload | Bank/transaction data ingestion | Phase 1–2 | Primary data source; AA integration deferred to post-MVP | Free |
| Manual GST Upload (CSV/JSON) | GST data ingestion | Phase 1–2 | Template-based upload; GSTN API deferred to post-MVP | Free |
| Manual Document Upload + Officer Review | Identity verification | Phase 2 | Aadhaar/PAN uploaded as images, verified by officer; eKYC API deferred | Free |
| Tesseract.js | OCR for bank statements | Phase 2 | Open-source, runs locally in Node.js | Free |
| Puppeteer | PDF report generation | Phase 2 | Server-side rendering of score report | Free |
| Groq API (free tier) | MSME chatbot with RAG (Phase 4) | Phase 4 | Groq API for fast LLM inference; free tier available; architecture stub in Phase 2 | Free (within free tier limits) |

---

## 12. Compliance & Regulatory

### 12.1 RBI Guidelines

- **Digital Lending Guidelines 2022**: All loan decisions must have a traceable, logged audit trail. CreditSaathi stores a SHA-256 hash of every input + output pair per score.
- **AI/ML Explainability**: RBI mandates explainable AI for credit decisions. SHAP panel addresses this. Every score has a stored `shapSummary` array.
- **Fair Lending**: Score algorithm must not use protected attributes (religion, caste, gender) as features. Feature list must be documented and auditable.

### 12.2 DPDP Act 2023 (Digital Personal Data Protection)

- Explicit consent must be collected before any data processing (AA consent flag in MSME model)
- Users must be able to request data deletion (soft delete + anonymisation workflow)
- Data localisation: all data stored in AWS ap-south-1 (Mumbai)
- No PII transmitted in logs or error messages

### 12.3 Audit Trail Requirements

Every scoring event must log:
- Timestamp (UTC)
- MSME ID
- Requesting user ID + role
- Model version used
- Full feature input snapshot
- Score output + risk category
- SHAP values
- IP address
- Audit hash (SHA-256)

---

## 13. Testing Strategy

### 13.1 Test Types

| Type | Tool | Coverage Target | Owner |
|------|------|-----------------|-------|
| Unit (backend) | Jest | 70% coverage | Dev D |
| Integration (API) | Supertest | All routes | Dev D |
| Unit (frontend) | React Testing Library | Key components | Dev B |
| End-to-End | Cypress / Playwright | Core user journeys | Dev D |
| ML model testing | pytest | Accuracy metrics | Dev C |
| Load testing | k6 | 50 concurrent users | Dev D |
| Security | OWASP checklist | Manual + automated | Dev A |

### 13.2 Key Test Scenarios

- Successful MSME registration and score generation (happy path)
- Score generation with incomplete data (graceful error)
- Concurrent scoring requests (no race condition)
- JWT expiry and token refresh flow
- File upload validation (wrong type, oversized)
- Role-based access enforcement (MSME owner cannot see other MSMEs)
- Fraud flag triggers on anomalous GST data

---

## 14. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ML model low accuracy on synthetic data | High | High | Use domain-informed synthetic generation; validate with real data in pilot |
| GST API access delays | High | Medium | Build manual CSV upload as primary; API as enhancement |
| AA framework integration complexity | High | Medium | Use Finvu SDK; plan 2-week integration buffer |
| 3-month timeline slippage | Medium | High | Phase 3 & 4 are explicitly post-MVP; Phase 2 is partially scoped |
| MongoDB Atlas free tier limits | Low | Low | Upgrade to M10 cluster at pilot stage |
| Bank pilot not secured by Month 3 | Medium | High | Use demo bank with synthetic portfolio as fallback |
| Team member unavailability | Medium | High | Cross-train Developer D on both backend and ML service |

---

## 15. Definition of Done

A feature is considered complete when:

- [ ] Functionality implemented and working in development environment
- [ ] Unit tests written and passing
- [ ] API endpoint documented in Swagger (backend features)
- [ ] Code reviewed and approved by at least one other team member
- [ ] No ESLint / Prettier violations
- [ ] Error states handled gracefully (no unhandled promise rejections)
- [ ] Mobile responsive (for UI features)
- [ ] Merged to `develop` branch via PR
- [ ] Feature tested by another team member (not the implementer)

---

*Document Version: 1.0*
*Project: CreditSaathi — AI-Powered MSME Credit Intelligence Platform*
*Prepared for: Internal Development Team*
*Confidential*
