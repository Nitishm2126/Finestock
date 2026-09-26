import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class AdjustmentBase(BaseModel):
    adjustment_number: Optional[str] = None
    warehouse_id: uuid.UUID
    location_id: uuid.UUID
    product_id: uuid.UUID
    physical_count: Decimal = Field(..., ge=0)
    reason: str = Field("COUNT_CORRECTION", pattern="^(COUNT_CORRECTION|DAMAGE|SHRINKAGE|FOUND_STOCK|DATA_ERROR|EXPIRY|OTHER)$")
    notes: Optional[str] = None


class AdjustmentCreate(AdjustmentBase):
    pass


class AdjustmentUpdate(BaseModel):
    physical_count: Optional[Decimal] = Field(None, ge=0)
    reason: Optional[str] = None
    notes: Optional[str] = None
    version: Optional[int] = None


class AdjustmentApproveRequest(BaseModel):
    version: Optional[int] = None


class AdjustmentOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    adjustment_number: str
    warehouse_id: uuid.UUID
    warehouse_name: Optional[str] = None
    location_id: uuid.UUID
    location_name: Optional[str] = None
    product_id: uuid.UUID
    sku: Optional[str] = None
    product_name: Optional[str] = None
    system_quantity: Decimal
    physical_count: Decimal
    difference: Decimal
    reason: str
    status: str
    notes: Optional[str] = None
    requested_by: Optional[uuid.UUID] = None
    approved_by: Optional[uuid.UUID] = None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdjustmentList(BaseModel):
    adjustments: List[AdjustmentOut]
    total: int
