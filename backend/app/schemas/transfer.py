import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class TransferLineCreate(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal = Field(..., gt=0)


class TransferLineOut(BaseModel):
    id: uuid.UUID
    transfer_id: uuid.UUID
    product_id: uuid.UUID
    sku: Optional[str] = None
    product_name: Optional[str] = None
    quantity: Decimal

    model_config = ConfigDict(from_attributes=True)


class TransferBase(BaseModel):
    transfer_number: Optional[str] = None
    source_warehouse_id: uuid.UUID
    source_location_id: uuid.UUID
    destination_warehouse_id: uuid.UUID
    destination_location_id: uuid.UUID
    reason: str = Field("Internal Transfer", max_length=255)
    notes: Optional[str] = None


class TransferCreate(TransferBase):
    lines: List[TransferLineCreate] = Field(..., min_length=1)


class TransferUpdate(BaseModel):
    reason: Optional[str] = None
    notes: Optional[str] = None
    version: Optional[int] = None


class TransferApproveRequest(BaseModel):
    version: Optional[int] = None


class TransferExecuteRequest(BaseModel):
    version: Optional[int] = None


class TransferOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    transfer_number: str
    source_warehouse_id: uuid.UUID
    source_warehouse_name: Optional[str] = None
    source_location_id: uuid.UUID
    source_location_name: Optional[str] = None
    destination_warehouse_id: uuid.UUID
    destination_warehouse_name: Optional[str] = None
    destination_location_id: uuid.UUID
    destination_location_name: Optional[str] = None
    status: str
    reason: str
    requested_by: Optional[uuid.UUID] = None
    approved_by: Optional[uuid.UUID] = None
    notes: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime
    lines: List[TransferLineOut] = []

    model_config = ConfigDict(from_attributes=True)


class TransferList(BaseModel):
    transfers: List[TransferOut]
    total: int
