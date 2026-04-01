"""Transaction routes — mirrors /api/v1/transactions/* from the Express backend."""

from fastapi import APIRouter, Request, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.transaction_record import TransactionRecord
from app.models.msme import MSME
from app.models.user import User
from app.services.auth_service import get_current_user
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/transactions", tags=["Transactions"])


class TransactionInput(BaseModel):
    month: str
    totalInflow: float
    totalOutflow: float
    upiTransactionCount: Optional[int] = 0
    upiVolume: Optional[float] = 0
    chequeBouncedCount: Optional[int] = 0
    emiPaidOnTime: Optional[bool] = None
    vendorPaymentsPunctuality: Optional[float] = 0.5
    seasonalityFlag: Optional[bool] = False
    dataSource: Optional[str] = "manual"


class BulkTransactionUploadRequest(BaseModel):
    msmeId: str
    records: List[TransactionInput]


# ── POST /api/v1/transactions/upload ─────────────────
@router.post("/upload")
async def upload_transaction_records(body: BulkTransactionUploadRequest, request: Request, user: User = Depends(get_current_user)):
    if not body.msmeId or not body.records or len(body.records) == 0:
        return JSONResponse(status_code=400, content={"success": False, "error": {"code": "VALIDATION_ERROR", "message": "msmeId and records array are required."}})

    msme = await MSME.get(body.msmeId)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    imported = 0
    errors = []

    for i, record in enumerate(body.records):
        try:
            net_cash_flow = record.totalInflow - record.totalOutflow

            existing = await TransactionRecord.find_one(
                TransactionRecord.msme_id == body.msmeId,
                TransactionRecord.month == record.month,
            )

            if existing:
                existing.total_inflow = record.totalInflow
                existing.total_outflow = record.totalOutflow
                existing.net_cash_flow = net_cash_flow
                existing.upi_transaction_count = record.upiTransactionCount
                existing.upi_volume = record.upiVolume
                existing.cheque_bounced_count = record.chequeBouncedCount
                existing.emi_paid_on_time = record.emiPaidOnTime
                existing.vendor_payments_punctuality = record.vendorPaymentsPunctuality
                existing.seasonality_flag = record.seasonalityFlag
                existing.data_source = record.dataSource
                existing.updated_at = datetime.utcnow()
                await existing.save()
            else:
                new_record = TransactionRecord(
                    msme_id=body.msmeId,
                    month=record.month,
                    total_inflow=record.totalInflow,
                    total_outflow=record.totalOutflow,
                    net_cash_flow=net_cash_flow,
                    upi_transaction_count=record.upiTransactionCount,
                    upi_volume=record.upiVolume,
                    cheque_bounced_count=record.chequeBouncedCount,
                    emi_paid_on_time=record.emiPaidOnTime,
                    vendor_payments_punctuality=record.vendorPaymentsPunctuality,
                    seasonality_flag=record.seasonalityFlag,
                    data_source=record.dataSource,
                )
                await new_record.insert()
            imported += 1
        except Exception as e:
            errors.append({"row": i + 1, "error": str(e)})

    await create_audit_log(
        action="transaction_uploaded", performed_by=str(user.id),
        target_msme_id=body.msmeId, entity_type="TransactionRecord",
        request=request, payload={"imported": imported, "errors": len(errors)},
    )

    return {
        "success": True,
        "message": f"{imported} records imported, {len(errors)} errors found",
        "data": {"imported": imported, "errors": errors},
    }


# ── POST /api/v1/transactions/:msmeId ───────────────
@router.post("/{msme_id}", status_code=201)
async def add_single_transaction(msme_id: str, body: TransactionInput, user: User = Depends(get_current_user)):
    msme = await MSME.get(msme_id)
    if not msme:
        return JSONResponse(status_code=404, content={"success": False, "error": {"code": "NOT_FOUND", "message": "MSME not found."}})

    net_cash_flow = body.totalInflow - body.totalOutflow

    existing = await TransactionRecord.find_one(
        TransactionRecord.msme_id == msme_id,
        TransactionRecord.month == body.month,
    )

    if existing:
        existing.total_inflow = body.totalInflow
        existing.total_outflow = body.totalOutflow
        existing.net_cash_flow = net_cash_flow
        existing.upi_transaction_count = body.upiTransactionCount
        existing.upi_volume = body.upiVolume
        existing.cheque_bounced_count = body.chequeBouncedCount
        existing.emi_paid_on_time = body.emiPaidOnTime
        existing.vendor_payments_punctuality = body.vendorPaymentsPunctuality
        existing.seasonality_flag = body.seasonalityFlag
        existing.data_source = body.dataSource
        existing.updated_at = datetime.utcnow()
        await existing.save()
        return {"success": True, "message": "Record updated", "data": existing.to_response_dict()}

    record = TransactionRecord(
        msme_id=msme_id,
        month=body.month,
        total_inflow=body.totalInflow,
        total_outflow=body.totalOutflow,
        net_cash_flow=net_cash_flow,
        upi_transaction_count=body.upiTransactionCount,
        upi_volume=body.upiVolume,
        cheque_bounced_count=body.chequeBouncedCount,
        emi_paid_on_time=body.emiPaidOnTime,
        vendor_payments_punctuality=body.vendorPaymentsPunctuality,
        seasonality_flag=body.seasonalityFlag,
        data_source=body.dataSource,
    )
    await record.insert()
    return {"success": True, "message": "Record created", "data": record.to_response_dict()}


# ── GET /api/v1/transactions/:msmeId ─────────────────
@router.get("/{msme_id}")
async def get_transaction_records(msme_id: str, user: User = Depends(get_current_user)):
    records = await TransactionRecord.find(
        TransactionRecord.msme_id == msme_id
    ).sort("-month").to_list()

    return {
        "success": True,
        "data": [r.to_response_dict() for r in records],
        "meta": {"total": len(records)},
    }
