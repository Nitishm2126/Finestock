from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from datetime import datetime

class UOMBase(BaseModel):
    name: str = Field(..., max_length=100)
    code: str = Field(..., max_length=20)
    description: Optional[str] = None

class UOMCreate(UOMBase):
    pass

class UOMUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    code: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = None

class UOMOut(UOMBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime

    class Config:
        from_attributes = True

class UOMList(BaseModel):
    uoms: List[UOMOut]
    total: int
