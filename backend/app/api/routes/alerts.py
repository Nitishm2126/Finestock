import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.alert import OperationalAlertOut, OperationalAlertList
from app.services.alert_service import AlertService

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("/", response_model=OperationalAlertList)
def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alerts, total = AlertService.get_alerts(db, current_user.organization_id, skip=skip, limit=limit)
    return {"alerts": alerts, "total": total}


@router.post("/{alert_id}/ack")
def acknowledge_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    success = AlertService.acknowledge_alert(db, current_user.organization_id, alert_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return {"success": True, "message": "Alert acknowledged"}
