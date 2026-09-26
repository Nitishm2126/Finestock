import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class DeliveryOrderLineCreate(BaseModel):
    product_id: uuid.UUID
    requested_quantity: Decimal = Field(..., gt=0)
    source_location_id: Optional[uuid.UUID] = None


class DeliveryOrderLineOut(BaseModel):
    id: uuid.UUID
    delivery_id: uuid.UUID
    product_id: uuid.UUID
    sku: Optional[str] = None
    product_name: Optional[str] = None
    requested_quantity: Decimal
    reserved_quantity: Decimal
    picked_quantity: Decimal
    packed_quantity: Decimal
    delivered_quantity: Decimal
    source_location_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryOrderBase(BaseModel):
    delivery_number: Optional[str] = None
    customer_name: str = Field(..., min_length=1, max_length=255)
    warehouse_id: uuid.UUID
    source_location_id: uuid.UUID
    scheduled_date: Optional[datetime] = None
    priority: str = Field("NORMAL", pattern="^(NORMAL|HIGH|URGENT)$")
    notes: Optional[str] = None


class DeliveryOrderCreate(DeliveryOrderBase):
    lines: List[DeliveryOrderLineCreate] = Field(..., min_length=1)


class DeliveryOrderUpdate(BaseModel):
    customer_name: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    priority: Optional[str] = None
    notes: Optional[str] = None
    version: Optional[int] = None


class DeliveryReserveRequest(BaseModel):
    version: Optional[int] = None


class DeliveryPickRequest(BaseModel):
    version: Optional[int] = None
    line_picks: Optional[dict[str, Decimal]] = None  # line_id -> picked quantity


class DeliveryPackRequest(BaseModel):
    version: Optional[int] = None
    package_info: Optional[str] = None
    line_packs: Optional[dict[str, Decimal]] = None  # line_id -> packed quantity


class DeliveryDeliverRequest(BaseModel):
    version: Optional[int] = None


class DeliveryOrderOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    delivery_number: str
    customer_name: str
    warehouse_id: uuid.UUID
    warehouse_name: Optional[str] = None
    source_location_id: uuid.UUID
    source_location_name: Optional[str] = None
    status: str
    scheduled_date: Optional[datetime] = None
    priority: str
    notes: Optional[str] = None
    created_by: Optional[uuid.UUID] = None
    version: int
    created_at: datetime
    updated_at: datetime
    lines: List[DeliveryOrderLineOut] = []

    model_config = ConfigDict(from_attributes=True)


class DeliveryOrderList(BaseModel):
    deliveries: List[DeliveryOrderOut]
    total: int
