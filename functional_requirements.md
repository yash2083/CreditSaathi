# CreditSaathi — Functional Requirements Document

> **AI-Powered Credit & Business Intelligence Platform for MSMEs**
> Version: 1.0 | All Phases (1–4) | MERN Stack

---

## Table of Contents

1. [User Roles & Permissions](#1-user-roles--permissions)
2. [Phase 1 — Core MVP](#2-phase-1--core-mvp)
   - 2.1 User Authentication & Onboarding
   - 2.2 MSME Profile Management
   - 2.3 Data Ingestion (GST + Transactions)
   - 2.4 AI Credit Scoring Engine
   - 2.5 SHAP Explainability Panel
   - 2.6 Risk Categorisation
   - 2.7 Business Intelligence Dashboard
3. [Phase 2 — High-Impact Features](#3-phase-2--high-impact-features)
   - 3.1 Loan Recommendation Engine
   - 3.2 Early Stress Detection
   - 3.3 eKYC & Document Verification
   - 3.4 Fraud Detection
4. [Phase 3 — Advanced Features](#4-phase-3--advanced-features)
   - 4.1 Sector Benchmarking
   - 4.2 Dynamic Credit Monitoring
   - 4.3 Supply Chain Finance Module
   - 4.4 Multilingual Interface
5. [Phase 4 — Differentiating Layer](#5-phase-4--differentiating-layer)
   - 5.1 LLM-Powered MSME Chatbot
   - 5.2 Bank API Integration Layer
6. [Cross-Cutting Concerns](#6-cross-cutting-concerns)

---

## 1. User Roles & Permissions

### 1.1 Role Definitions

| Role | Description | Primary Access |
|------|-------------|----------------|
| `admin` | Platform administrator (CreditSaathi team) | Full system access, user management, model configuration |
| `bank_officer` | Loan officer at a bank or NBFC | View all MSMEs under their organisation, trigger scoring, manage loan applications |
| `msme_owner` | Business owner / applicant | View own profile, upload data, view own score and loan status |

### 1.2 Permission Matrix

| Feature | Admin | Bank Officer | MSME Owner |
|---------|-------|--------------|------------|
| Create MSME profile | ✓ | ✓ | ✓ (own only) |
| View any MSME profile | ✓ | ✓ (org only) | ✗ |
| Upload GST / transaction data | ✓ | ✓ | ✓ (own only) |
| Trigger credit scoring | ✓ | ✓ | ✓ (own only) |
| View SHAP breakdown | ✓ | ✓ | Simplified view |
| Approve/reject loan applications | ✗ | ✓ | ✗ |
| View audit logs | ✓ | Own actions | ✗ |
| Manage users | ✓ | ✗ | ✗ |
| Configure ML model | ✓ | ✗ | ✗ |
| View sector benchmarks | ✓ | ✓ | ✓ (own sector) |

---

## 2. Phase 1 — Core MVP

> **Target completion**: End of Month 2 (Sprint 1–4)

---

### 2.1 User Authentication & Onboarding

#### FR-AUTH-001: User Registration

**Description**: Any user can register on the platform with their email, password, organisation name, and role.

**Acceptance Criteria**:
- User must provide: full name, email address, password (min 8 chars, 1 uppercase, 1 number, 1 special char), organisation name, role selection (`bank_officer` or `msme_owner`)
- `admin` accounts can only be created by an existing admin via the admin panel
- System sends a verification email with a 24-hour expiry link upon registration
- User cannot log in until email is verified
- Duplicate email registration returns a clear error: "An account with this email already exists"
- Passwords are hashed using bcrypt (salt rounds: 12) before storage; plain text passwords are never stored

**Edge Cases**:
- Registration with already-verified email → error
- Registration attempt with invalid email format → inline validation error
- Clicking expired verification link → prompt to resend

---

#### FR-AUTH-002: User Login

**Description**: Verified users can log in with email and password to receive a JWT access token and refresh token.

**Acceptance Criteria**:
- Valid login returns a short-lived JWT access token (15 min) and a long-lived refresh token (7 days)
- Refresh token is stored in an `httpOnly` cookie; access token returned in response body
- Failed login attempt shows a generic error: "Invalid email or password" (no field-specific leakage)
- After 5 consecutive failed attempts within 10 minutes, the account is locked for 15 minutes with an appropriate message
- Successful login records a login event in audit logs (timestamp, IP, user agent)

---

#### FR-AUTH-003: Token Refresh

**Description**: When the access token expires, the client can use the refresh token to obtain a new one without requiring re-login.

**Acceptance Criteria**:
- `POST /auth/refresh` with a valid refresh token cookie returns a new access token
- Expired or tampered refresh tokens return `401 Unauthorized`
- Each refresh rotates the refresh token (old token is invalidated)
- If refresh token is not present (cookie missing), return `401` with message "Session expired, please log in again"

---

#### FR-AUTH-004: Logout

**Description**: Users can log out, which invalidates their refresh token.

**Acceptance Criteria**:
- `POST /auth/logout` clears the `httpOnly` refresh token cookie
- The refresh token is also invalidated server-side (removed from DB)
- Subsequent calls with that refresh token return `401`

---

#### FR-AUTH-005: Password Reset

**Description**: Users can request a password reset via email.

**Acceptance Criteria**:
- User enters email on forgot-password screen
- If email exists, system sends a reset link valid for 1 hour
- If email does not exist, same success message is shown (anti-enumeration)
- Reset link contains a secure, single-use token
- On valid token: user sets a new password; token is immediately invalidated after use
- Password change triggers email notification to user

---

### 2.2 MSME Profile Management

#### FR-MSME-001: Create MSME Profile

**Description**: A bank officer or MSME owner can create a detailed business profile for an MSME applicant.

**Acceptance Criteria**:
- Required fields: business name, GSTIN (validated format), business type (micro/small/medium), sector, registered state, contact email, contact phone
- Optional fields: Udyam registration number, annual turnover band, employee count, PAN number, incorporation date, city
- GSTIN must pass format validation (15-character alphanumeric) and duplicate check
- On successful creation, a unique MSME ID is generated and returned
- The creating user is linked as the `owner` reference
- Multi-step form in the UI (Step 1: Basic Info → Step 2: Financial Info → Step 3: Confirm)
- After creation, the MSME status is set to `active`

---

#### FR-MSME-002: View MSME Profile

**Description**: Authorised users can view an MSME's full profile including scores and financial data summary.

**Acceptance Criteria**:
- Bank officers see all MSMEs in their organisation
- MSME owners see only their own profile
- Profile page displays: business details, latest credit score (if any), risk category, score generation date, flagged stress signals (if any)
- If no score has been generated yet, the page shows a clear CTA: "Generate Credit Score"

---

#### FR-MSME-003: Update MSME Profile

**Description**: Authorised users can update non-critical MSME fields.

**Acceptance Criteria**:
- Fields that cannot be updated after creation: GSTIN, PAN (require admin override)
- Updatable fields: contact email, phone, employee count, turnover band, city
- Every update is recorded in the audit log with before/after values
- Changes trigger a notification to the MSME owner

---

#### FR-MSME-004: MSME Listing & Search (Bank Officer View)

**Description**: Bank officers can view a paginated list of all MSMEs in their portfolio with filtering and search.

**Acceptance Criteria**:
- Default view shows 20 MSMEs per page, sorted by most recently updated
- Search by: business name, GSTIN, city
- Filter by: risk category (Low/Medium/High), sector, state, score range, loan application status
- Each list row shows: business name, GSTIN (masked), latest score, risk badge, last scored date
- Sort options: score ascending/descending, name alphabetical, date

---

### 2.3 Data Ingestion (GST + Transaction Records)

#### FR-DATA-001: GST Filing Upload

**Description**: Users can upload GST filing history for an MSME to be used as input to the scoring model.

**Acceptance Criteria**:
- Supported input formats: CSV (template provided), JSON
- CSV template is downloadable from the upload page
- Required columns: filing_period, filing_type (GSTR1/GSTR3B/GSTR9), filed_on_time (boolean), filing_date, taxable_revenue, tax_paid
- On upload, system validates: file format, required columns, date formats, no future dates, no duplicate filing periods
- Invalid rows are flagged with row number and reason; valid rows are still imported
- After successful upload, the system displays a summary: "X records imported, Y errors found"
- Each record is linked to the MSME and timestamped
- Minimum data requirement for scoring: at least 6 months of GST records

---

#### FR-DATA-002: Transaction / Cash Flow Upload

**Description**: Users can upload monthly bank transaction summaries or UPI cash flow data.

**Acceptance Criteria**:
- Supported input: CSV (template provided), JSON
- Required columns: month (YYYY-MM), total_inflow, total_outflow, upi_transaction_count, upi_volume, cheque_bounced_count, vendor_payments_punctuality (0.00–1.00)
- Validation: no future months, no duplicate month entries per MSME, numeric fields must be non-negative
- Data source must be specified: `manual`, `aa_framework`, or `bank_statement_ocr`
- After upload, a monthly cash flow chart updates immediately on the dashboard
- Minimum data requirement for scoring: at least 6 months of transaction records

---

#### FR-DATA-003: Manual Single-Record Entry

**Description**: Users can add a single GST record or transaction record manually via a form (for when bulk upload is not needed).

**Acceptance Criteria**:
- Form for single GST record: all fields from FR-DATA-001 as individual inputs
- Form for single transaction record: all fields from FR-DATA-002 as individual inputs
- Same validation rules as bulk upload apply
- Duplicate check: if a record for the same period already exists, prompt "A record for this period already exists. Do you want to update it?"

---

#### FR-DATA-004: View Ingested Data

**Description**: Users can view all uploaded GST and transaction records for an MSME in a tabular format.

**Acceptance Criteria**:
- GST Records table: sortable by filing period, filterable by filing type and filed_on_time
- Transaction Records table: sortable by month, shows inflow, outflow, net cash flow
- Each table shows total record count and date range of available data
- Warning banner if data is insufficient for scoring (< 6 months)
- Option to delete individual records (with confirmation and audit log entry)

---

### 2.4 AI Credit Scoring Engine

#### FR-SCORE-001: Trigger Credit Score Generation

**Description**: Authorised users can trigger credit score generation for an MSME with sufficient data.

**Acceptance Criteria**:
- A "Generate Score" button is visible on the MSME profile page
- System validates: at least 6 months of GST records exist, at least 6 months of transaction records exist
- If data is insufficient, button is disabled with tooltip: "Minimum 6 months of GST and transaction data required"
- On trigger, the system:
  1. Assembles feature vector from MSME data
  2. Calls the Python/FastAPI ML scoring microservice via internal HTTP
  3. Receives score (300–850), risk category, SHAP values, and stress signals
  4. Stores the result as a new `CreditScore` document
  5. Updates the MSME's `latestScoreId` reference
  6. Creates an audit log entry
- Score generation must complete within 10 seconds
- If ML service is unavailable, system returns: "Scoring service is temporarily unavailable. Please try again in a few minutes." (no crash)
- The latest score always reflects the most recent scoring run; old scores are retained in history

---

#### FR-SCORE-002: Feature Engineering (ML Service)

**Description**: The Python ML service transforms raw MSME data into model-ready features.

**Acceptance Criteria**:
- Input: MSME ID (backend fetches and sends feature payload to ML service)
- Features computed:
  - `gst_filing_rate`: proportion of expected filings that were filed (0–1)
  - `gst_on_time_rate`: proportion of filings filed on time (0–1)
  - `avg_monthly_revenue`: rolling 6-month average of taxable revenue
  - `revenue_growth_rate`: % change from oldest to newest quarter
  - `avg_net_cash_flow`: rolling 6-month average of (inflow – outflow)
  - `cash_flow_volatility`: standard deviation of monthly net cash flows
  - `upi_volume_growth`: % growth in UPI transaction volume
  - `cheque_bounce_rate`: bounces / total cheque transactions
  - `vendor_payment_score`: average vendor payment punctuality ratio
  - `nil_return_ratio`: proportion of nil GST returns filed
- All features are normalised using a pre-fitted StandardScaler
- Feature vector is logged alongside the score for audit and reproducibility

---

#### FR-SCORE-003: Model Scoring

**Description**: The XGBoost model produces a credit score and the SHAP library computes feature contributions.

**Acceptance Criteria**:
- Model inputs: normalised feature vector (10 features)
- Model output: raw probability (0–1) mapped to score range 300–850 using linear scaling: `score = 300 + (probability × 550)`
- SHAP TreeExplainer computes SHAP values for each feature
- Output returned to Node.js backend:
  ```json
  {
    "score": 712,
    "risk_category": "Low",
    "shap_values": { ... },
    "shap_summary": [ { "feature": "Cash flow health", "impact": 0.18, "direction": "positive" }, ... ],
    "stress_signals": [],
    "model_version": "xgboost_v1.2"
  }
  ```
- Risk category mapping:
  - 300–549: High Risk
  - 550–699: Medium Risk
  - 700–850: Low Risk

---

#### FR-SCORE-004: Score History

**Description**: Users can view the historical credit score timeline for an MSME.

**Acceptance Criteria**:
- Score history is displayed as a line chart over time (Recharts)
- Each data point shows: date, score, risk category colour
- Tooltip on hover shows score, risk category, and triggering user
- Bank officers can see the full history; MSME owners see their own history
- History table below the chart lists: date, score, risk category, who triggered it, model version

---

### 2.5 SHAP Explainability Panel

#### FR-SHAP-001: Feature Impact Display

**Description**: For every score, the platform displays a SHAP-based breakdown showing which factors drove the score up or down.

**Acceptance Criteria**:
- Panel is visible on the score detail page and the MSME profile dashboard
- Displayed as a horizontal bar chart (positive impacts: green bars to the right; negative impacts: red bars to the left)
- Features displayed (in order of absolute impact):
  - GST filing consistency
  - Cash flow health (net inflow/outflow ratio)
  - Revenue growth rate
  - Payment behaviour (vendor punctuality)
  - Transaction volume (UPI growth)
  - Cheque bounce rate
  - Nil return ratio
- Each bar shows: feature label, impact value (+X.XX or −X.XX), and a plain-English one-liner
- Bank officer sees numerical SHAP values; MSME owner sees only plain-English summaries (no raw numbers)

---

#### FR-SHAP-002: Plain-English Explanation

**Description**: The platform generates a plain-English paragraph explaining the score outcome.

**Acceptance Criteria**:
- Automatically generated from SHAP values using rule-based templates
- Example output:
  > "Your credit score of 712 is driven primarily by your strong cash flow consistency and on-time GST filings. Your vendor payment punctuality is excellent. The main area pulling your score down is a slight decline in revenue over the past two quarters. Addressing this through consistent revenue growth could push your score into the 740+ range."
- Text is displayed below the SHAP bar chart
- Tone is encouraging and actionable (not punitive)
- Text is stored in the `CreditScore.explanationText` field

---

### 2.6 Risk Categorisation

#### FR-RISK-001: Risk Badge Display

**Description**: Every scored MSME displays a prominent risk category badge.

**Acceptance Criteria**:
- Badge colours: Low Risk = Green, Medium Risk = Amber, High Risk = Red
- Badge is visible on: MSME profile page, bank officer portfolio list, loan application card
- Risk category label is never shown alone — it is always accompanied by the numerical score
- Tooltip on hover explains what each risk category means:
  - Low Risk (700–850): "Strong financial indicators. Eligible for fast-track loan consideration."
  - Medium Risk (550–699): "Mixed financial signals. Standard underwriting review recommended."
  - High Risk (300–549): "Significant financial stress signals. Enhanced due diligence required."

---

#### FR-RISK-002: Risk Summary for Bank Officer

**Description**: Bank officers can see a portfolio-level risk distribution overview.

**Acceptance Criteria**:
- Dashboard shows a donut chart of their portfolio by risk category (Low / Medium / High)
- Summary cards below show count of MSMEs in each category
- Clicking a segment filters the MSME list to that risk category
- The portfolio overview refreshes automatically when new scores are generated

---

### 2.7 Business Intelligence Dashboard

#### FR-DASH-001: MSME Owner Dashboard

**Description**: An MSME owner sees their own financial health summary on login.

**Acceptance Criteria**:
- Summary cards (top row): Latest Credit Score, Risk Category, Score Change (from previous), Data Completeness %
- Revenue trend chart: line chart showing monthly taxable revenue for the last 12 months (from GST records)
- Cash flow chart: grouped bar chart showing monthly inflow vs outflow for the last 6 months
- SHAP panel: feature impact breakdown for their latest score
- Data status panel: shows which data is complete (GST: ✓, Transactions: ✓, eKYC: pending)
- If no score exists: prominent CTA card "Your business data is ready. Request a credit score."

---

#### FR-DASH-002: Bank Officer Dashboard

**Description**: A bank officer sees their portfolio overview on login.

**Acceptance Criteria**:
- Portfolio summary: total MSMEs, scored MSMEs, pending loan applications, average portfolio score
- Risk distribution donut chart (FR-RISK-002)
- Recent activity feed: last 10 actions (scores generated, loans submitted, etc.)
- Top 5 MSMEs by score (sorted, with risk badge and loan status)
- Stress-flagged MSMEs alert panel: list of MSMEs with active stress signals
- Quick-access search bar to jump to any MSME profile

---

#### FR-DASH-003: Score Gauge Component

**Description**: A visual gauge/arc shows the credit score in the 300–850 range.

**Acceptance Criteria**:
- SVG arc gauge: 300 (leftmost) to 850 (rightmost), coloured zones (red: 300–549, amber: 550–699, green: 700–850)
- The needle or indicator points to the current score
- Score number is displayed prominently in the centre of the gauge
- Risk category label displayed below the gauge
- Animated: on page load, the gauge sweeps from 300 to the actual score over 1.2 seconds

---

---

## 3. Phase 2 — High-Impact Features

> **Target completion**: End of Month 3 (Sprint 4–6, partial)

---

### 3.1 Loan Recommendation Engine

#### FR-LOAN-001: Loan Eligibility Assessment

**Description**: Based on the AI credit score, the system automatically recommends a loan amount range, interest rate band, and relevant government schemes.

**Acceptance Criteria**:
- Recommendation is generated automatically after every score generation
- Mapping logic (configurable by admin):

  | Score Range | Recommended Amount | Interest Band | Notes |
  |-------------|-------------------|---------------|-------|
  | 700–850 | Up to ₹50L | 8–10% | Fast-track eligible |
  | 650–699 | Up to ₹25L | 10–13% | Standard review |
  | 600–649 | Up to ₹10L | 13–16% | Enhanced documentation needed |
  | 550–599 | Up to ₹5L | 16–20% | Collateral may be required |
  | 300–549 | Not recommended | — | Re-apply after improvement |

- Government scheme eligibility mapped by score + sector:
  - Mudra Yojana (Shishu/Kishor/Tarun) — for scores 500+
  - CGTMSE — for scores 600+
  - PSB Loans in 59 Minutes — for scores 650+
  - PM SVANidhi (street vendors) — sector specific
- Recommendation stored in `CreditScore.recommendedLoanAmount`, `recommendedInterestBand`, `eligibleGovernmentSchemes`

---

#### FR-LOAN-002: Loan Application Submission

**Description**: An MSME owner or bank officer can submit a formal loan application linked to a credit score.

**Acceptance Criteria**:
- Application form fields: requested amount, loan purpose (working capital / equipment / expansion / other), repayment tenure preference
- Application must be linked to an existing, valid credit score (< 90 days old)
- If score is older than 90 days, prompt: "This score is outdated. Please generate a new score before applying."
- On submission, status is set to `submitted` and an email notification is sent to the assigned bank officer
- MSME owner can view their application status at any time
- Bank officer receives an in-app notification on the dashboard

---

#### FR-LOAN-003: Loan Application Management (Bank Officer)

**Description**: Bank officers can review, approve, or reject loan applications.

**Acceptance Criteria**:
- Application detail page shows: MSME profile, credit score + SHAP panel, recommended amount, requested amount, loan purpose
- Officer can approve (with optional remarks and countersigned amount), reject (mandatory reason field), or mark as "additional documents required"
- Status changes trigger email notifications to the MSME owner
- All decisions are logged in the audit trail with remarks
- Approved applications show estimated disbursement timeline (informational only)
- Officer cannot approve their own application submissions

---

### 3.2 Early Stress Detection

#### FR-STRESS-001: Stress Signal Computation

**Description**: The platform identifies early warning signs of financial distress in an MSME's data and surfaces them to bank officers.

**Acceptance Criteria**:
- Stress signals are evaluated every time a new score is generated
- Signals detected:
  - `gst_filing_gap`: no filing for 2+ consecutive months
  - `revenue_decline_sharp`: > 30% revenue drop in a single quarter
  - `cash_flow_negative_streak`: negative net cash flow for 3+ consecutive months
  - `cheque_bounce_increase`: bounce rate increased > 50% quarter-over-quarter
  - `upi_volume_crash`: UPI transaction volume dropped > 40% month-on-month
  - `nil_return_spike`: 2+ consecutive nil GST returns after period of active filings
- Each signal has a severity level: `warning` (yellow) or `critical` (red)
- Signals stored in `CreditScore.stressSignals` array

---

#### FR-STRESS-002: Stress Alert Display

**Description**: Active stress signals are prominently displayed to bank officers and MSME owners.

**Acceptance Criteria**:
- Bank officer dashboard has a dedicated "Stress Alerts" panel listing all MSMEs with active signals
- MSME profile page shows a collapsible "Early Warning Signals" section with each signal explained in plain English
- MSME owner sees their own stress signals with actionable guidance (e.g. "Your cash flow has been negative for 3 months. Filing GST returns and maintaining inflows can prevent further score decline.")
- Signals are colour-coded: warning = amber badge, critical = red badge
- Bank officers can mark signals as "acknowledged" (does not remove them but logs the action)

---

### 3.3 eKYC & Document Verification

#### FR-KYC-001: Document Upload

**Description**: MSMEs can upload identity and financial documents required for loan processing.

**Acceptance Criteria**:
- Supported document types: Aadhaar card (front + back), PAN card, business registration certificate, latest 6-month bank statement (PDF), audited P&L (PDF)
- Accepted file formats: PDF, JPG, PNG
- Maximum file size per document: 10MB
- Files are uploaded to Firebase Storage (free tier — 5 GB storage, 1 GB/day download) with security rules restricting access
- Document metadata stored in `documents` collection (MSME ID, document type, storage path, upload timestamp, verification status)
- After upload, verification status is `pending`
- Users can view a list of their uploaded documents with status badges

---

#### FR-KYC-002: Document Verification (Officer Review)

**Description**: Bank officers can review uploaded documents and mark them as verified or rejected.

**Acceptance Criteria**:
- Officers see documents in a side-by-side viewer (document preview on left, verification action on right)
- Actions: Approve, Reject (with reason), Request Re-upload
- Verification decision is logged in audit trail
- On rejection, the MSME owner receives an email with the reason and instructions to re-upload

---

#### FR-KYC-003: Basic OCR Data Extraction

**Description**: The system attempts to auto-extract key fields from uploaded bank statements to reduce manual data entry.

**Acceptance Criteria**:
- On PDF bank statement upload, the system calls the OCR service using Tesseract.js (open-source, runs locally — no paid API needed)
- Extracted fields: account holder name, account number (masked), monthly inflow totals, monthly outflow totals
- Extracted data is shown to the user for confirmation before it is saved as transaction records
- If OCR confidence < 70%, the extracted data is flagged for manual review
- If OCR fails entirely, a fallback message is shown: "Automatic extraction failed. Please enter data manually." with a link to the manual entry form

---

### 3.4 Fraud Detection

#### FR-FRAUD-001: Anomaly Detection Rules

**Description**: The platform applies rule-based anomaly detection to flag potentially fraudulent or inflated MSME financial data.

**Acceptance Criteria**:
- Fraud rules evaluated at score generation time:
  - `gst_revenue_vs_transaction_mismatch`: declared GST revenue > 2× inferred revenue from transaction data
  - `sudden_revenue_spike`: single month revenue > 5× trailing 3-month average
  - `implausible_vendor_payments`: vendor payment punctuality = 1.0 (perfect) but cash flow is consistently negative
  - `duplicate_gstin_risk`: GSTIN appears in multiple MSME profiles
  - `nil_to_active_flip`: sudden switch from nil returns to high-revenue returns without gradual ramp
- Each rule evaluates independently; multiple rules can trigger simultaneously
- Flags stored in `CreditScore.fraudFlags` array

---

#### FR-FRAUD-002: Fraud Flag Display

**Description**: Detected fraud signals are surfaced to bank officers for manual review.

**Acceptance Criteria**:
- MSME profile shows a "Fraud Risk Indicator" panel (only visible to bank officers and admins)
- Each active flag shows: flag name, brief explanation, severity (medium / high)
- Fraud flags do NOT automatically reject an application — they flag for human review
- Bank officers can mark each flag as "reviewed and cleared" or "escalated" with notes
- Any MSME with active, unreviewed fraud flags cannot be approved for a loan without an officer override

---

---

## 4. Phase 3 — Advanced Features

> **Target completion**: Months 4–6 (post-MVP build, architecture planned in Phase 1–2)

---

### 4.1 Sector Benchmarking

#### FR-BENCH-001: Sector Comparison

**Description**: The platform compares an MSME's financial performance against sector peers.

**Acceptance Criteria**:
- Benchmark data is pre-loaded per sector (textile, retail, manufacturing, food processing, construction, services) with percentile distributions for: revenue growth, net cash flow ratio, GST consistency, average credit score
- MSME profile shows a "Sector Comparison" panel with statements like:
  - "Your cash flow ratio is better than 68% of textile MSMEs in Karnataka"
  - "Your average GST filing rate is in the top 25% of your sector"
- Percentile calculations run client-side from aggregated (anonymised) benchmark data
- Benchmark data is refreshed quarterly from aggregate platform data
- Users can filter benchmarks by: sector, state, business size band

---

### 4.2 Dynamic Credit Monitoring

#### FR-MONITOR-001: Automated Monthly Re-Scoring

**Description**: The platform automatically re-scores all MSMEs with active loans or applications each month when new data is available.

**Acceptance Criteria**:
- A scheduled job runs on the 5th of each month
- Job identifies MSMEs: (a) with an active loan application or disbursed loan, and (b) with at least 1 new month of data since last score
- Re-scoring runs automatically without manual trigger
- Bank officers receive a monthly portfolio health report email listing score changes
- If an MSME's score drops by 50+ points in a single month, an urgent alert is sent to the assigned officer
- Monitoring can be disabled per MSME by an admin

---

### 4.3 Supply Chain Finance Module

#### FR-SCF-001: Invoice Upload & Discounting

**Description**: MSMEs can upload invoices to request early payment financing based on buyer creditworthiness.

**Acceptance Criteria**:
- MSME uploads an invoice (PDF) with: invoice number, buyer GSTIN, invoice amount, due date
- System extracts buyer GSTIN and evaluates buyer's creditworthiness (if buyer is also on the platform) or uses a risk proxy (GSTIN verification age, size)
- Platform calculates a discounting offer: early payment amount = invoice amount × (1 – discount rate)
- Discount rate is based on: buyer risk, days to maturity, MSME score
- MSME can accept or reject the offer
- Accepted offers are routed to partner lending institution for funding

---

### 4.4 Multilingual Interface

#### FR-LANG-001: Hindi Language Support

**Description**: The full platform UI is available in Hindi for Tier-2/3 city users.

**Acceptance Criteria**:
- Language toggle in header: English / हिंदी
- All UI labels, form placeholders, error messages, and dashboard text are translated
- Score explanations and SHAP summaries are also generated in Hindi
- Language preference is saved to user profile
- Default language is auto-detected from browser locale; falls back to English

---

---

## 5. Phase 4 — Differentiating Layer

> **Target completion**: Months 7–12 (post Phase 3)

---

### 5.1 LLM-Powered MSME Chatbot

#### FR-CHAT-001: RAG-Powered Credit Advisor Chatbot

**Description**: An AI chatbot that can answer MSME owners' questions about their score, eligibility, and improvement steps in plain language.

**Acceptance Criteria**:
- Chat interface is embedded on the MSME dashboard (collapsible widget)
- Chatbot has access to: the MSME's latest score, SHAP breakdown, loan application status, and a knowledge base of government schemes and credit improvement tips
- Example questions the chatbot can answer:
  - "Why was my score low?"
  - "What do I need to qualify for a ₹10L loan?"
  - "How can I improve my score in the next 3 months?"
  - "Am I eligible for Mudra Yojana?"
  - "What does my GST filing consistency mean?"
- Chatbot uses RAG (Retrieval-Augmented Generation) with the Groq API for fast LLM inference (free tier available)
- Responses are grounded in the MSME's actual data — chatbot does not hallucinate facts about their score
- Conversation history is stored per session (not persisted across sessions for privacy)
- Chatbot is available in English and Hindi
- Chatbot is clearly labelled as an AI assistant; it never impersonates a human advisor

---

### 5.2 Bank API Integration Layer

#### FR-API-001: Open API for Loan Origination Systems

**Description**: A documented, secure API layer that allows any bank to integrate CreditSaathi's scoring engine into their existing LOS.

**Acceptance Criteria**:
- Banks can register as API partners via an admin-approved onboarding process
- Each bank receives a unique API key with rate limiting (1000 requests/day default)
- API endpoint: `POST /api/v1/partner/score` accepts MSME data payload and returns score + SHAP + risk category synchronously (< 10 sec) or asynchronously via webhook
- Webhook delivery: on score completion, POST to bank's pre-registered callback URL with signed payload (HMAC-SHA256)
- API versioning is enforced (`/v1/`, `/v2/`) for backward compatibility
- Full OpenAPI 3.0 specification published at `/api/docs`
- Bank-level usage analytics available in partner dashboard (requests made, scores generated, average latency)
- Partner API sandbox environment with synthetic MSME data for testing

---

---

## 6. Cross-Cutting Concerns

### 6.1 Notifications

| Event | Channel | Recipient |
|-------|---------|-----------|
| Registration + email verification | Email | Registering user |
| Score generated | In-app + Email | MSME owner + assigned officer |
| Loan application submitted | In-app + Email | Assigned officer |
| Loan decision made | Email | MSME owner |
| Stress signal detected | In-app (officer dashboard) | Assigned bank officer |
| Fraud flag triggered | In-app (officer dashboard) | Assigned bank officer |
| Document rejected | Email | MSME owner |
| Monthly re-score completed | Email summary | Bank officer |
| Score drops 50+ points | Email (urgent) | Bank officer |

### 6.2 Audit Logging

Every state-changing action must produce an audit log entry containing:

- Action type (enumerated, e.g. `score_generated`, `loan_approved`, `document_uploaded`)
- Performed by (user ID + role)
- Target MSME ID
- Entity affected (e.g. score ID, loan ID)
- IP address + user agent
- Timestamp (UTC)
- Sanitised payload snapshot (PII removed)

Audit logs are: append-only (no updates/deletes), accessible only to admins, exportable as CSV for regulatory submission.

### 6.3 Error Handling

- All API errors return structured JSON with `code`, `message`, and optional `field` (see requirements.md §6.4)
- Unhandled server errors return `500` with a generic message — never expose stack traces in production
- ML service timeouts (> 12 sec) return a graceful error with retry instruction
- Frontend shows user-friendly error toasts for all API failures
- Network errors on the frontend show: "Connection lost. Please check your internet connection."

### 6.4 Pagination

All list endpoints support:
- `?page=1&limit=20` query parameters
- Response includes: `data[]`, `pagination: { total, page, limit, totalPages }`
- Maximum limit: 100 per request

### 6.5 Data Retention

| Data Type | Retention Period |
|-----------|-----------------|
| Credit scores | 7 years (regulatory requirement) |
| Audit logs | 7 years |
| Uploaded documents | 3 years after last loan closure |
| User accounts (deleted) | Anonymised after 30 days |
| Session tokens | 7 days (refresh token expiry) |

---

*Document Version: 1.0*
*Project: CreditSaathi — AI-Powered MSME Credit Intelligence Platform*
*Prepared for: Internal Development Team*
*Confidential*
