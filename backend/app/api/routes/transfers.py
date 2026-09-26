import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user, require_supervisor
from app.schemas.transfer import (
    TransferCreate,
    TransferApproveRequest,
    TransferExecuteRequest,
    TransferOut,
    TransferList,
)
from app.services.transfer_service import TransferService

router = APIRouter(prefix="/transfers", tags=["Transfers"])


def _format_transfer_out(t) -> dict:
    return {
        "id": t.id,
        "organization_id": t.organization_id,
        "transfer_number": t.transfer_number,
        "source_warehouse_id": t.source_warehouse_id,
        "source_warehouse_name": t.source_warehouse.name if t.source_warehouse else None,
        "source_location_id": t.source_location_id,
        "source_location_name": t.source_location.name if t.source_location else None,
        "destination_warehouse_id": t.destination_warehouse_id,
        "destination_warehouse_name": t.destination_warehouse.name if t.destination_warehouse else None,
        "destination_location_id": t.destination_location_id,
        "destination_location_name": t.destination_location.name if t.destination_location else None,
        "status": t.status,
        "reason": t.reason,
        "requested_by": t.requested_by,
        "approved_by": t.approved_by,
        "notes": t.notes,
        "version": t.version,
        "created_at": t.created_at,
        "updated_at": t.updated_at,
        "lines": [
            {
                "id": line.id,
                "transfer_id": line.transfer_id,
                "product_id": line.product_id,
                "sku": line.product.sku if line.product else None,
                "product_name": line.product.name if line.product else None,
                "quantity": line.quantity,
            }
            for line in t.lines
        ],
    }


@router.get("/", response_model=TransferList)
def list_transfers(
    source_warehouse_id: Optional[uuid.UUID] = None,
    destination_warehouse_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transfers, total = TransferService.get_transfers(
        db=db,
        organization_id=current_user.organization_id,
        source_warehouse_id=source_warehouse_id,
        destination_warehouse_id=destination_warehouse_id,
        status=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    return {"transfers": [_format_transfer_out(t) for t in transfers], "total": total}


@router.post("/", response_model=TransferOut, status_code=status.HTTP_201_CREATED)
def create_transfer(
    data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = TransferService.create_transfer(db, current_user.organization_id, current_user.id, data)
        return _format_transfer_out(transfer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{transfer_id}", response_model=TransferOut)
def get_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transfer = TransferService.get_transfer_by_id(db, current_user.organization_id, transfer_id)
    if not transfer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transfer not found")
    return _format_transfer_out(transfer)


@router.post("/{transfer_id}/approve", response_model=TransferOut)
def approve_transfer(
    transfer_id: uuid.UUID,
    req: Optional[TransferApproveRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_supervisor),
):
    try:
        version = req.version if req else None
        transfer = TransferService.approve_transfer(db, current_user.organization_id, current_user.id, transfer_id, version)
        return _format_transfer_out(transfer)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{transfer_id}/execute", response_model=TransferOut)
def execute_transfer(
    transfer_id: uuid.UUID,
    req: Optional[TransferExecuteRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = req.version if req else None
        transfer = TransferService.execute_transfer(db, current_user.organization_id, current_user.id, transfer_id, version)
        return _format_transfer_out(transfer)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{transfer_id}/cancel", response_model=TransferOut)
def cancel_transfer(
    transfer_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transfer = TransferService.cancel_transfer(db, current_user.organization_id, current_user.id, transfer_id)
        return _format_transfer_out(transfer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
