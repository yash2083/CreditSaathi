"""Loan routes — mirrors /api/v1/loans/* from the Express backend."""

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.loan_application import LoanApplication
from app.models.credit_score import CreditScore
from app.models.msme import MSME
from app.models.user import User
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/loans", tags=["Loans"])


class SubmitLoanRequest(BaseModel):
    msmeId: str
    scoreId: str
    requestedAmount: float
    loanPurpose: str
    repaymentTenure: Optional[int] = None


class UpdateLoanStatusRequest(BaseModel):
    status: str
    officerRemarks: Optional[str] = None
    approvedAmount: Optional[float] = None


# ── POST /api/v1/loans ───────────────────────────────
@router.post("", status_code=201)
async def submit_loan(body: SubmitLoanRequest, request: Request, user: User = Depends(get_current_user)):
    if not all([body.msmeId, body.scoreId, body.requestedAmount, body.loanPurpose]):
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "msmeId, scoreId, requestedAmount, and loanPurpose are required."}})

    score = await CreditScore.get(body.scoreId)
    if not score:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "Credit score not found."}})

    # Check if score is less than 90 days old
    days_since_score = (datetime.utcnow() - score.created_at).days
    if days_since_score > 90:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "SCORE_EXPIRED", "message": "This score is outdated. Please generate a new score before applying."}})

    loan = LoanApplication(
        msme_id=body.msmeId,
        applicant=str(user.id),
        score_id=body.scoreId,
        requested_amount=body.requestedAmount,
        loan_purpose=body.loanPurpose,
        repayment_tenure=body.repaymentTenure,
    )
    await loan.insert()

    await create_audit_log(
        action="loan_submitted", performed_by=str(user.id),
        target_msme_id=body.msmeId, entity_type="LoanApplication",
        entity_id=str(loan.id), request=request,
    )

    return {"success": True, "message": "Loan application submitted", "data": loan.to_response_dict()}


# ── GET /api/v1/loans ────────────────────────────────
@router.get("")
async def list_loans(
    request: Request,
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    msmeId: Optional[str] = None,
):
    query_filters = {}

    if user.role == "msme_owner":
        query_filters["applicant"] = str(user.id)
    if status:
        query_filters["status"] = status
    if msmeId:
        query_filters["msme_id"] = msmeId

    total = await LoanApplication.find(query_filters).count()
    loans = await LoanApplication.find(query_filters).sort("-created_at").skip((page - 1) * limit).limit(limit).to_list()

    result = []
    for loan in loans:
        data = loan.to_response_dict()
        # Populate references
        msme = await MSME.get(loan.msme_id)
        if msme:
            data["msmeId"] = {"_id": str(msme.id), "businessName": msme.business_name, "gstin": msme.gstin}
        score = await CreditScore.get(loan.score_id)
        if score:
            data["scoreId"] = {"_id": str(score.id), "scoreValue": score.score_value, "riskCategory": score.risk_category}
        applicant = await User.get(loan.applicant)
        if applicant:
            data["applicant"] = {"_id": str(applicant.id), "name": applicant.name, "email": applicant.email}
        if loan.assigned_officer:
            officer = await User.get(loan.assigned_officer)
            if officer:
                data["assignedOfficer"] = {"_id": str(officer.id), "name": officer.name, "email": officer.email}
        result.append(data)

    return {
        "success": True,
        "data": result,
        "pagination": {"total": total, "page": page, "limit": limit, "totalPages": max(1, -(-total // limit))},
    }


# ── GET /api/v1/loans/:id ───────────────────────────
@router.get("/{loan_id}")
async def get_loan_detail(loan_id: str, user: User = Depends(get_current_user)):
    loan = await LoanApplication.get(loan_id)
    if not loan:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "Loan application not found."}})

    data = loan.to_response_dict()
    # Populate
    msme = await MSME.get(loan.msme_id)
    if msme:
        data["msmeId"] = msme.to_response_dict()
    score = await CreditScore.get(loan.score_id)
    if score:
        data["scoreId"] = score.to_response_dict()
    applicant = await User.get(loan.applicant)
    if applicant:
        data["applicant"] = {"_id": str(applicant.id), "name": applicant.name, "email": applicant.email}
    if loan.assigned_officer:
        officer = await User.get(loan.assigned_officer)
        if officer:
            data["assignedOfficer"] = {"_id": str(officer.id), "name": officer.name, "email": officer.email}

    return {"success": True, "data": data}


# ── PATCH /api/v1/loans/:id/status ───────────────────
@router.patch("/{loan_id}/status")
async def update_loan_status(
    loan_id: str, body: UpdateLoanStatusRequest, request: Request,
    user: User = Depends(require_roles("admin", "bank_officer")),
):
    if body.status not in ["under_review", "approved", "rejected", "disbursed"]:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Invalid status."}})

    if body.status == "rejected" and not body.officerRemarks:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Remarks are required for rejection."}})

    loan = await LoanApplication.get(loan_id)
    if not loan:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "Loan application not found."}})

    loan.status = body.status
    loan.officer_remarks = body.officerRemarks
    loan.approved_amount = body.approvedAmount
    loan.assigned_officer = str(user.id)
    if body.status in ["approved", "rejected"]:
        loan.decision_date = datetime.utcnow()
    loan.updated_at = datetime.utcnow()
    await loan.save()

    audit_action = "loan_approved" if body.status == "approved" else ("loan_rejected" if body.status == "rejected" else "loan_submitted")
    await create_audit_log(
        action=audit_action, performed_by=str(user.id),
        target_msme_id=loan.msme_id, entity_type="LoanApplication",
        entity_id=str(loan.id), request=request,
        payload={"status": body.status, "officerRemarks": body.officerRemarks},
    )

    return {"success": True, "message": f"Loan {body.status}", "data": loan.to_response_dict()}
