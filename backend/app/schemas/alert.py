import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class OperationalAlertOut(BaseModel):
    id: uuid.UUID
    organization_id: uuid.UUID
    alert_type: str
    severity: str
    title: str
    message: str
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    is_acknowledged: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OperationalAlertList(BaseModel):
    alerts: List[OperationalAlertOut]
    total: int
