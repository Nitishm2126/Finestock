import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict


class MovementOut(BaseModel):
    id: uuid.UUID
    timestamp: datetime
    product_id: uuid.UUID
    sku: str
    product_name: str
    warehouse_id: Optional[uuid.UUID] = None
    warehouse_name: Optional[str] = None
    location_id: uuid.UUID
    location_name: str
    transaction_type: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    quantity_delta: Decimal
    quantity_before: Decimal
    quantity_after: Decimal
    actor_name: Optional[str] = None
    metadata: Optional[dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class MovementList(BaseModel):
    movements: List[MovementOut]
    total: int
