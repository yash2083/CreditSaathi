# CreditSaathi

> **AI-Powered Credit & Business Intelligence Platform for MSMEs**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-Proprietary-CD3D3D?style=for-the-badge)

---


## 🚀 Overview

CreditSaathi is a full-stack AI-powered credit intelligence platform for India's MSME sector. It evaluates MSME financial health using alternative data sources — GST filing patterns, UPI/bank transaction flows, monthly revenue trends, and payment behaviour — to generate instant credit scores, risk categories, and actionable business intelligence reports.

### Key Features

- **AI Credit Scoring** — XGBoost model generates scores (300–850) from GST + transaction data
- **SHAP Explainability** — Visual breakdown of what drives each score
- **Risk Categorisation** — Low / Medium / High risk with colour-coded badges
- **Business Intelligence Dashboard** — Revenue trends, cash flow charts, score gauge
- **Loan Recommendation Engine** — Auto-suggests loan amount, interest rate, government schemes
- **Early Stress Detection** — Flags financial distress signals before they escalate
- **Fraud Detection** — Rule-based anomaly detection for inflated data
- **eKYC & Document Verification** — Upload and verify Aadhaar, PAN, bank statements
- **LLM Chatbot (Phase 4)** — RAG-powered credit advisor using Groq API

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + Redux Toolkit + Tailwind CSS + Recharts |
| **Backend** | Python 3.12 + FastAPI + Uvicorn |
| **Database** | MongoDB 7.x (Atlas) + Motor (async) + Beanie ODM |
| **ML Service** | Python 3.11 + FastAPI + XGBoost + SHAP |
| **Auth** | JWT (python-jose) + bcrypt (passlib) |
| **HTTP Client** | httpx (async, for ML service calls) |
| **OCR** | Tesseract.js (open-source) |
| **Chatbot LLM** | Groq API (free tier) |
| **CI/CD** | GitHub Actions |
| **Containerisation** | Docker + Docker Compose |
| **Hosting** | Render / Railway (free tier) |

---

## 📁 Project Structure

```
CreditSaathi/
├── client/                    # React frontend (Vite + Tailwind + Redux)
│   └── src/
│       ├── pages/             # Dashboard, Score, Reports, Login
│       ├── components/        # Charts, Gauge, SHAP Panel, Risk Badge
│       ├── store/             # Redux slices (auth, msme, score)
│       ├── hooks/             # Custom hooks (useScore, useMSME, useAuth)
│       ├── services/          # Axios API service layer
│       ├── utils/             # Formatters, validators
│       └── assets/            # Logos, icons, static assets
│
├── server/                    # Python/FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Pydantic settings (env vars)
│   │   ├── database.py        # Motor + Beanie DB init & safe-seed
│   │   ├── models/            # Beanie document models
│   │   ├── routes/            # FastAPI route modules
│   │   └── services/          # Auth (JWT), ML caller, audit log
│   ├── seed.py                # Full database seeder script
│   ├── requirements.txt       # Python dependencies
│   └── .env                   # Environment variables
│
├── ml/                        # Python/FastAPI ML microservice
│   ├── app/                   # FastAPI application
│   ├── models/                # Saved .joblib model files
│   └── tests/                 # pytest test suites
│
├── docs/                      # Project documentation
├── .github/workflows/         # GitHub Actions CI/CD
├── docker-compose.yml         # Local dev environment
├── .env.example               # Template environment variables
├── .gitignore
├── functional_requirements.md
├── requirements-2.md
└── README.md
```

---

## ⚡ Quick Start

### Prerequisites

- **Python** >= 3.12
- **Node.js** >= 20.x LTS (for frontend only)
- **MongoDB** (Atlas recommended)
- **Docker & Docker Compose** (optional, for containerised setup)

### 1. Clone the Repository

```bash
git clone https://github.com/yash2083/CreditSaathi.git
cd CreditSaathi
```

### 2. Environment Setup

```bash
cp .env.example server/.env
cp .env.example ml/.env
# Edit both .env files with your actual credentials
```

### 3. Run with Docker (Recommended)

```bash
docker-compose up --build
```

This starts:

- **Frontend** → http://localhost:3000
- **Backend API** → http://localhost:5000
- **ML Service** → http://localhost:8000
- **MongoDB** → localhost:27017

### 4. Run Without Docker

**Backend (FastAPI):**

```bash
cd server
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
```

**Frontend:**

```bash
cd client
npm install
npm run dev
```

**ML Service:**

```bash
cd ml
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## 👥 Team & Roles

| Member | Role | Responsibilities |
|--------|------|------------------|
| **Developer A** | Backend Lead | FastAPI APIs, ML service integration, MongoDB design |
| **Developer B** | Frontend Lead | React UI, Redux state, dashboard, data visualisation |
| **Developer C** | ML / Data Engineer | Python ML service, SHAP, feature engineering, synthetic data |
| **Developer D** | Full-Stack + DevOps | MongoDB queries, deployment, CI/CD, testing |

---

## 🌿 Branch Strategy

```
main ← develop ← feature/xxx
```

- **`main`** — Production-ready code only
- **`develop`** — Integration branch, all features merge here first
- **`feature/xxx`** — Individual feature branches (e.g. `feature/auth`, `feature/scoring-api`)
- All PRs require **at least 1 reviewer** before merge
- Never push directly to `main` or `develop`

---

## 📋 Sprint Plan

| Sprint   | Weeks | Focus                                 |
| -------- | ----- | ------------------------------------- |
| Sprint 1 | 1–2   | Foundation, Auth, MSME Onboarding     |
| Sprint 2 | 3–4   | Data Ingestion, ML Model, Scoring API |
| Sprint 3 | 5–6   | Dashboard, SHAP Panel, Visualisations |
| Sprint 4 | 7–8   | Loan Module, Recommendation Engine    |
| Sprint 5 | 9–10  | eKYC, Fraud Detection, Hardening      |
| Sprint 6 | 11–12 | Testing, Deployment, Pilot Prep       |

---

## 📖 Documentation

- [Functional Requirements](./functional_requirements.md) — Detailed feature specs for all phases
- [Project Requirements](./requirements-2.md) — Tech stack, architecture, API design, sprint plan

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
