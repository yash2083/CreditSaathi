"""GST routes — mirrors /api/v1/gst/* from the Express backend."""

from fastapi import APIRouter, Request, Depends, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.gst_record import GSTRecord
from app.models.msme import MSME
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/gst", tags=["GST"])


class GSTRecordInput(BaseModel):
    filingPeriod: str
    filingType: str
    filedOnTime: bool
    filingDate: str
    taxableRevenue: float
    taxPaid: float
    nilReturn: Optional[bool] = False
    amendment: Optional[bool] = False
    rawDataRef: Optional[str] = None


class BulkGSTUploadRequest(BaseModel):
    msmeId: str
    records: List[GSTRecordInput]


# ── POST /api/v1/gst/upload ──────────────────────────
@router.post("/upload")
async def upload_gst_records(body: BulkGSTUploadRequest, request: Request, user: User = Depends(get_current_user)):
    if not body.msmeId or not body.records or len(body.records) == 0:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "msmeId and records array are required."}})

    msme = await MSME.get(body.msmeId)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    imported = 0
    errors = []

    for i, record in enumerate(body.records):
        try:
            filing_date = datetime.fromisoformat(record.filingDate.replace("Z", "+00:00"))

            existing = await GSTRecord.find_one(
                GSTRecord.msme_id == body.msmeId,
                GSTRecord.filing_period == record.filingPeriod,
            )

            if existing:
                existing.filing_type = record.filingType
                existing.filed_on_time = record.filedOnTime
                existing.filing_date = filing_date
                existing.taxable_revenue = record.taxableRevenue
                existing.tax_paid = record.taxPaid
                existing.nil_return = record.nilReturn
                existing.amendment = record.amendment
                existing.raw_data_ref = record.rawDataRef
                existing.updated_at = datetime.utcnow()
                await existing.save()
            else:
                new_record = GSTRecord(
                    msme_id=body.msmeId,
                    filing_period=record.filingPeriod,
                    filing_type=record.filingType,
                    filed_on_time=record.filedOnTime,
                    filing_date=filing_date,
                    taxable_revenue=record.taxableRevenue,
                    tax_paid=record.taxPaid,
                    nil_return=record.nilReturn,
                    amendment=record.amendment,
                    raw_data_ref=record.rawDataRef,
                )
                await new_record.insert()
            imported += 1
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    await create_audit_log(
        action="gst_uploaded", performed_by=str(user.id),
        target_msme_id=body.msmeId, entity_type="GSTRecord",
        request=request, payload={"imported": imported, "errors": len(errors)},
    )

    return {
        "success": True,
        "message": f"{imported} records imported, {len(errors)} errors found",
        "data": {"imported": imported, "errors": errors},
    }


# ── POST /api/v1/gst/:msmeId/manual ─────────────────
@router.post("/{msme_id}/manual", status_code=201)
async def add_single_gst_record(msme_id: str, body: GSTRecordInput, user: User = Depends(get_current_user)):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    filing_date = datetime.fromisoformat(body.filingDate.replace("Z", "+00:00"))

    existing = await GSTRecord.find_one(
        GSTRecord.msme_id == msme_id,
        GSTRecord.filing_period == body.filingPeriod,
    )

    if existing:
        existing.filing_type = body.filingType
        existing.filed_on_time = body.filedOnTime
        existing.filing_date = filing_date
        existing.taxable_revenue = body.taxableRevenue
        existing.tax_paid = body.taxPaid
        existing.nil_return = body.nilReturn
        existing.amendment = body.amendment
        existing.raw_data_ref = body.rawDataRef
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return {"success": True, "message": "Record updated", "data": existing.to_response_dict()}

    record = GSTRecord(
        msme_id=msme_id,
        filing_period=body.filingPeriod,
        filing_type=body.filingType,
        filed_on_time=body.filedOnTime,
        filing_date=filing_date,
        taxable_revenue=body.taxableRevenue,
        tax_paid=body.taxPaid,
        nil_return=body.nilReturn,
        amendment=body.amendment,
        raw_data_ref=body.rawDataRef,
    )
    await record.insert()
    return {"success": True, "message": "Record created", "data": record.to_response_dict()}


# ── GET /api/v1/gst/:msmeId ─────────────────────────
@router.get("/{msme_id}")
async def get_gst_records(
    msme_id: str,
    user: User = Depends(get_current_user),
    sort: str = Query("-filingDate"),
    filingType: Optional[str] = None,
):
    query_filters = {"msme_id": msme_id}
    if filingType:
        query_filters["filing_type"] = filingType

    sort_field = sort.lstrip("-")
    sort_field_map = {"filingDate": "filing_date", "filingPeriod": "filing_period"}
    actual_field = sort_field_map.get(sort_field, sort_field)
    sort_dir = "-" if sort.startswith("-") else "+"
    sort_expr = f"{sort_dir}{actual_field}"

    records = await GSTRecord.find(query_filters).sort(sort_expr).to_list()

    return {
        "success": True,
        "data": [r.to_response_dict() for r in records],
        "meta": {"total": len(records)},
    }
