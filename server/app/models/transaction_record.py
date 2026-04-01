"""TransactionRecord document — mirrors the original Mongoose TransactionRecord schema."""

from beanie import Document
from pydantic import Field
from typing import Optional, Literal
from datetime import datetime


class TransactionRecord(Document):
    msme_id: str
    month: str  # YYYY-MM format
    total_inflow: float = Field(ge=0)
    total_outflow: float = Field(ge=0)
    net_cash_flow: Optional[float] = None
    upi_transaction_count: int = Field(default=0, ge=0)
    upi_volume: float = Field(default=0, ge=0)
    cheque_bounced_count: int = Field(default=0, ge=0)
    emi_paid_on_time: Optional[bool] = None
    vendor_payments_punctuality: float = Field(default=0.5, ge=0, le=1)
    seasonality_flag: bool = False
    data_source: Literal["manual", "aa_framework", "bank_statement_ocr"] = "manual"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "transactionrecords"

    def compute_net_cash_flow(self) -> None:
        self.net_cash_flow = self.total_inflow - self.total_outflow

    def to_response_dict(self) -> dict:
        return {
            "_id": str(self.id),
            "msmeId": self.msme_id,
            "month": self.month,
            "totalInflow": self.total_inflow,
            "totalOutflow": self.total_outflow,
            "netCashFlow": self.net_cash_flow,
            "upiTransactionCount": self.upi_transaction_count,
            "upiVolume": self.upi_volume,
            "chequeBouncedCount": self.cheque_bounced_count,
            "emiPaidOnTime": self.emi_paid_on_time,
            "vendorPaymentsPunctuality": self.vendor_payments_punctuality,
            "seasonalityFlag": self.seasonality_flag,
            "dataSource": self.data_source,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
