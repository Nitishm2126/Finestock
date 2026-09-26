from typing import Optional, Dict
from pydantic import BaseModel


class HealthResponse(BaseModel):
    success: bool
    message: str
    database: str
    services: Optional[Dict[str, str]] = None
