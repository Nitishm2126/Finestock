from typing import Optional, List
import uuid
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    first_name: str = Field(..., max_length=100)
    last_name: str = Field(..., max_length=100)
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role_id: uuid.UUID

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None
    role_id: Optional[uuid.UUID] = None

class RoleOut(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class UserOut(UserBase):
    id: uuid.UUID
    organization_id: uuid.UUID
    role_id: uuid.UUID
    role: RoleOut
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserList(BaseModel):
    users: List[UserOut]
    total: int
