"""MSME routes — mirrors /api/v1/msmes/* from the Express backend."""

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.msme import MSME
from app.models.credit_score import CreditScore
from app.models.user import User
from app.services.auth_service import get_current_user, require_roles
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/msmes", tags=["MSMEs"])


class CreateMSMERequest(BaseModel):
    businessName: str
    gstin: str
    pan: Optional[str] = None
    businessType: str
    sector: str
    registeredState: str
    city: Optional[str] = None
    contactEmail: str
    contactPhone: str
    udyamRegistrationNo: Optional[str] = None
    annualTurnoverBand: Optional[str] = None
    employeeCount: Optional[int] = None
    incorporationDate: Optional[str] = None


class UpdateMSMERequest(BaseModel):
    businessName: Optional[str] = None
    businessType: Optional[str] = None
    sector: Optional[str] = None
    registeredState: Optional[str] = None
    city: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    udyamRegistrationNo: Optional[str] = None
    annualTurnoverBand: Optional[str] = None
    employeeCount: Optional[int] = None
    status: Optional[str] = None


# ── POST /api/v1/msmes ────────────────────────────────
@router.post("", status_code=201)
async def create_msme(body: CreateMSMERequest, request: Request, user: User = Depends(get_current_user)):
    if not all([body.businessName, body.gstin, body.businessType, body.sector,
                body.registeredState, body.contactEmail, body.contactPhone]):
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "Required fields missing."}})

    existing = await MSME.find_one(MSME.gstin == body.gstin.upper())
    if existing:
        return JSONResponse(status_code=409, content={"success": False, "error": {"code": "DUPLICATE", "message": "An MSME with this GSTIN already exists."}})

    inc_date = None
    if body.incorporationDate:
        try:
            inc_date = datetime.fromisoformat(body.incorporationDate.replace("Z", "+00:00"))
        except ValueError:
            inc_date = None

    msme = MSME(
        owner=str(user.id),
        business_name=body.businessName,
        gstin=body.gstin.upper(),
        pan=body.pan.upper() if body.pan else None,
        business_type=body.businessType,
        sector=body.sector,
        registered_state=body.registeredState,
        city=body.city,
        contact_email=body.contactEmail.lower(),
        contact_phone=body.contactPhone,
        udyam_registration_no=body.udyamRegistrationNo,
        annual_turnover_band=body.annualTurnoverBand,
        employee_count=body.employeeCount,
        incorporation_date=inc_date,
    )
    await msme.insert()

    await create_audit_log(
        action="msme_created", performed_by=str(user.id),
        target_msme_id=str(msme.id), entity_type="MSME",
        entity_id=str(msme.id), request=request,
    )

    return {"success": True, "message": "MSME profile created", "data": msme.to_response_dict()}


# ── GET /api/v1/msmes ────────────────────────────────
@router.get("")
async def list_msmes(
    request: Request,
    user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    riskCategory: Optional[str] = None,
    sector: Optional[str] = None,
    status: Optional[str] = None,
):
    import re

    query_filters = {}

    # MSME owners only see their own
    if user.role == "msme_owner":
        query_filters["owner"] = str(user.id)
    if status:
        query_filters["status"] = status
    if sector:
        query_filters["sector"] = sector

    query = MSME.find(query_filters)

    if search:
        # Beanie doesn't directly support $or with find(), use raw MongoDB query
        regex = {"$regex": search, "$options": "i"}
        query = MSME.find(
            {**query_filters, "$or": [
                {"business_name": regex},
                {"gstin": regex},
                {"city": regex},
            ]}
        )

    total = await query.count()
    msmes = await query.sort("-updated_at").skip((page - 1) * limit).limit(limit).to_list()

    result = []
    for m in msmes:
        data = m.to_response_dict()
        # Populate latest score if available
        if m.latest_score_id:
            score = await CreditScore.get(m.latest_score_id)
            if score:
                data["latestScoreId"] = {
                    "_id": str(score.id),
                    "scoreValue": score.score_value,
                    "riskCategory": score.risk_category,
                    "createdAt": score.created_at.isoformat(),
                }
        result.append(data)

    # Filter by risk category after population
    if riskCategory:
        result = [m for m in result if isinstance(m.get("latestScoreId"), dict) and m["latestScoreId"].get("riskCategory") == riskCategory]

    return {
        "success": True,
        "data": result,
        "pagination": {
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": max(1, -(-total // limit)),
        },
    }


# ── GET /api/v1/msmes/:id ────────────────────────────
@router.get("/{msme_id}")
async def get_msme(msme_id: str, user: User = Depends(get_current_user)):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    # MSME owners can only see their own
    if user.role == "msme_owner" and msme.owner != str(user.id):
        return JSONResponse(status_code=403, content={"success": False, "error": {"code": "FORBIDDEN", "message": "Access denied."}})

    data = msme.to_response_dict()

    # Populate owner info
    owner = await User.get(msme.owner)
    if owner:
        data["owner"] = {"_id": str(owner.id), "name": owner.name, "email": owner.email}

    # Populate latest score
    if msme.latest_score_id:
        score = await CreditScore.get(msme.latest_score_id)
        if score:
            data["latestScoreId"] = score.to_response_dict()

    return {"success": True, "data": data}


# ── PUT /api/v1/msmes/:id ────────────────────────────
@router.put("/{msme_id}")
async def update_msme(msme_id: str, body: UpdateMSMERequest, request: Request, user: User = Depends(get_current_user)):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    update_data = body.model_dump(exclude_none=True)
    field_map = {
        "businessName": "business_name", "businessType": "business_type",
        "registeredState": "registered_state", "contactEmail": "contact_email",
        "contactPhone": "contact_phone", "udyamRegistrationNo": "udyam_registration_no",
        "annualTurnoverBand": "annual_turnover_band", "employeeCount": "employee_count",
    }

    for camel, snake in field_map.items():
        if camel in update_data:
            setattr(msme, snake, update_data[camel])
    if "city" in update_data:
        msme.city = update_data["city"]
    if "sector" in update_data:
        msme.sector = update_data["sector"]
    if "status" in update_data:
        msme.status = update_data["status"]

    msme.updated_at = datetime.utcnow()
    await msme.save()

    await create_audit_log(
        action="msme_updated", performed_by=str(user.id),
        target_msme_id=str(msme.id), entity_type="MSME",
        entity_id=str(msme.id), request=request, payload=update_data,
    )

    return {"success": True, "message": "MSME updated", "data": msme.to_response_dict()}


# ── DELETE /api/v1/msmes/:id ─────────────────────────
@router.delete("/{msme_id}")
async def delete_msme(
    msme_id: str, request: Request,
    user: User = Depends(require_roles("admin", "bank_officer")),
):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    msme.status = "inactive"
    msme.updated_at = datetime.utcnow()
    await msme.save()

    await create_audit_log(
        action="msme_deleted", performed_by=str(user.id),
        target_msme_id=str(msme.id), entity_type="MSME",
        entity_id=str(msme.id), request=request,
    )

    return {"success": True, "message": "MSME deactivated", "data": msme.to_response_dict()}
