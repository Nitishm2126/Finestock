from typing import Optional, List
import uuid
from pydantic import BaseModel
from decimal import Decimal

class StockPositionOut(BaseModel):
    product_id: uuid.UUID
    sku: str
    product_name: str
    warehouse_id: uuid.UUID
    warehouse_name: str
    location_id: uuid.UUID
    location_name: str
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal

    class Config:
        from_attributes = True

class StockPositionList(BaseModel):
    positions: List[StockPositionOut]
    total: int
