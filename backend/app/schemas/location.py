from typing import Optional, List
import uuid
from pydantic import BaseModel, Field
from datetime import datetime

class LocationBase(BaseModel):
    code: str = Field(..., max_length=50)
    name: str = Field(..., max_length=100)
    zone: Optional[str] = Field(None, max_length=50)
    location_type: Optional[str] = Field(None, max_length=50)
    is_active: bool = True

class LocationCreate(LocationBase):
    pass

class LocationUpdate(BaseModel):
    code: Optional[str] = Field(None, max_length=50)
    name: Optional[str] = Field(None, max_length=100)
    zone: Optional[str] = Field(None, max_length=50)
    location_type: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None

class LocationOut(LocationBase):
    id: uuid.UUID
    warehouse_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LocationList(BaseModel):
    locations: List[LocationOut]
    total: int
