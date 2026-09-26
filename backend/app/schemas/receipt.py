import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ReceiptLineCreate(BaseModel):
    product_id: uuid.UUID
    expected_quantity: Decimal = Field(..., gt=0)
    received_quantity: Optional[Decimal] = Field(default=Decimal("0.0000"), ge=0)
    destination_location_id: Optional[uuid.UUID] = None


class ReceiptLineOut(BaseModel):
    id: uuid.UUID
    receipt_id: uuid.UUID
    product_id: uuid.UUID
    sku: Optional[str] = None
    product_name: Optional[str] = None
    expected_quantity: Decimal
    received_quantity: Decimal
    destination_location_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class ReceiptBase(BaseModel):
    receipt_number: Optional[str] = None
    supplier_id: uuid.UUID
    warehouse_id: uuid.UUID
    destination_location_id: uuid.UUID
    expected_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None


class ReceiptCreate(ReceiptBase):
    lines: List[ReceiptLineCreate] = Field(..., min_length=1)


class ReceiptUpdate(BaseModel):
    supplier_id: Optional[uuid.UUID] = None
    warehouse_id: Optional[uuid.UUID] = None
    destination_location_id: Optional[uuid.UUID] = None
    expected_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    version: Optional[int] = None


class ReceiptValidateRequest(BaseModel):
    version: Optional[int] = None
    line_quantities: Optional[dict[str, Decimal]] = None  # map of line_id or product_id to received quantity


class ReceiptOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    receipt_number: str
    supplier_id: uuid.UUID
    supplier_name: Optional[str] = None
    warehouse_id: uuid.UUID
    warehouse_name: Optional[str] = None
    destination_location_id: uuid.UUID
    destination_location_name: Optional[str] = None
    status: str
    expected_date: Optional[datetime] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    version: int
    created_at: datetime
    updated_at: datetime
    lines: List[ReceiptLineOut] = []

    model_config = ConfigDict(from_attributes=True)


class ReceiptList(BaseModel):
    receipts: List[ReceiptOut]
    total: int
