from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from app.schemas.category import CategoryOut
from app.schemas.uom import UOMOut

class ProductBase(BaseModel):
    sku: str = Field(..., max_length=100)
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    category_id: uuid.UUID
    uom_id: uuid.UUID
    reorder_point: Decimal = Field(default=Decimal("0.0000"), ge=0)
    reorder_quantity: Decimal = Field(default=Decimal("0.0000"), ge=0)
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    sku: Optional[str] = Field(None, max_length=100)
    name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    uom_id: Optional[uuid.UUID] = None
    reorder_point: Optional[Decimal] = Field(None, ge=0)
    reorder_quantity: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    category: Optional[CategoryOut] = None
    uom: Optional[UOMOut] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductList(BaseModel):
    products: List[ProductOut]
    total: int
