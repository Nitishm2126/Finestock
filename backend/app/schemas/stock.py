from typing import Optional, List
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict
from decimal import Decimal


class StockPositionOut(BaseModel):
    product_id: uuid.UUID
    sku: str
    product_name: str
    category_name: Optional[str] = None
    warehouse_id: uuid.UUID
    warehouse_name: str
    location_id: uuid.UUID
    location_name: str
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal
    incoming_quantity: Decimal = Decimal("0.0000")
    outgoing_quantity: Decimal = Decimal("0.0000")
    risk: str = "Healthy"
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class StockPositionList(BaseModel):
    positions: List[StockPositionOut]
    total: int


class StockTimelineItem(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    transaction_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    quantity_delta: Decimal
    quantity_before: Decimal
    quantity_after: Decimal
    location_name: str
    warehouse_name: str
    actor_name: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StockTimelineResponse(BaseModel):
    product_id: uuid.UUID
    sku: str
    product_name: str
    current_physical: Decimal
    current_reserved: Decimal
    current_available: Decimal
    timeline: List[StockTimelineItem]
