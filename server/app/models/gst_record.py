"""GSTRecord document — mirrors the original Mongoose GSTRecord schema."""

from beanie import Document
from pydantic import Field
from typing import Optional, Literal
from datetime import datetime


class GSTRecord(Document):
    msme_id: str
    filing_period: str
    filing_type: Literal["GSTR1", "GSTR3B", "GSTR9"]
    filed_on_time: bool
    filing_date: datetime
    taxable_revenue: float = Field(ge=0)
    tax_paid: float = Field(ge=0)
    nil_return: bool = False
    amendment: bool = False
    raw_data_ref: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "gstrecords"

    def to_response_dict(self) -> dict:
        return {
            "_id": str(self.id),
            "msmeId": self.msme_id,
            "filingPeriod": self.filing_period,
            "filingType": self.filing_type,
            "filedOnTime": self.filed_on_time,
            "filingDate": self.filing_date.isoformat(),
            "taxableRevenue": self.taxable_revenue,
            "taxPaid": self.tax_paid,
            "nilReturn": self.nil_return,
            "amendment": self.amendment,
            "rawDataRef": self.raw_data_ref,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
        }
