from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from datetime import datetime

class WarehouseBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    address: Optional[str] = None
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = None
    is_active: Optional[bool] = None

class WarehouseOut(WarehouseBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    location_count: Optional[int] = 0

    class Config:
        from_attributes = True

class WarehouseList(BaseModel):
    warehouses: List[WarehouseOut]
    total: int
