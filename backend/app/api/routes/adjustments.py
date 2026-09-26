import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_supervisor
from app.schemas.adjustment import (
    AdjustmentCreate,
    AdjustmentApproveRequest,
    AdjustmentOut,
    AdjustmentList,
)
from app.services.adjustment_service import AdjustmentService

router = APIRouter(prefix="/adjustments", tags=["Adjustments"])


def _format_adjustment_out(a) -> dict:
    return {
        "id": a.id,
        "organization_id": a.organization_id,
        "adjustment_number": a.adjustment_number,
        "warehouse_id": a.warehouse_id,
        "warehouse_name": a.warehouse.name if a.warehouse else None,
        "location_id": a.location_id,
        "location_name": a.location.name if a.location else None,
        "product_id": a.product_id,
        "sku": a.product.sku if a.product else None,
        "product_name": a.product.name if a.product else None,
        "system_quantity": a.system_quantity,
        "physical_count": a.physical_count,
        "difference": a.difference,
        "reason": a.reason,
        "status": a.status,
        "notes": a.notes,
        "requested_by": a.requested_by,
        "approved_by": a.approved_by,
        "version": a.version,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


@router.get("/", response_model=AdjustmentList)
def list_adjustments(
    warehouse_id: Optional[uuid.UUID] = None,
    location_id: Optional[uuid.UUID] = None,
    product_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    reason: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    adjustments, total = AdjustmentService.get_adjustments(
        db=db,
        organization_id=current_user.organization_id,
        warehouse_id=warehouse_id,
        location_id=location_id,
        product_id=product_id,
        status=status_filter,
        reason=reason,
        search=search,
        skip=skip,
        limit=limit,
    )
    return {"adjustments": [_format_adjustment_out(a) for a in adjustments], "total": total}


@router.post("/", response_model=AdjustmentOut, status_code=status.HTTP_201_CREATED)
def create_adjustment(
    data: AdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        adjustment = AdjustmentService.create_adjustment(db, current_user.organization_id, current_user.id, data)
        return _format_adjustment_out(adjustment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{adjustment_id}", response_model=AdjustmentOut)
def get_adjustment(
    adjustment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    adjustment = AdjustmentService.get_adjustment_by_id(db, current_user.organization_id, adjustment_id)
    if not adjustment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Adjustment not found")
    return _format_adjustment_out(adjustment)


@router.post("/{adjustment_id}/approve", response_model=AdjustmentOut)
def approve_adjustment(
    adjustment_id: uuid.UUID,
    req: Optional[AdjustmentApproveRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    try:
        version = req.version if req else None
        adjustment = AdjustmentService.approve_adjustment(db, current_user.organization_id, current_user.id, adjustment_id, version)
        return _format_adjustment_out(adjustment)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{adjustment_id}/cancel", response_model=AdjustmentOut)
def cancel_adjustment(
    adjustment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        adjustment = AdjustmentService.cancel_adjustment(db, current_user.organization_id, current_user.id, adjustment_id)
        return _format_adjustment_out(adjustment)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
