from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from datetime import datetime

class CategoryBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = None

class CategoryOut(CategoryBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CategoryList(BaseModel):
    categories: List[CategoryOut]
    total: int
