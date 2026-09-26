import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.delivery import (
    DeliveryOrderCreate,
    DeliveryOrderUpdate,
    DeliveryReserveRequest,
    DeliveryPickRequest,
    DeliveryPackRequest,
    DeliveryDeliverRequest,
    DeliveryOrderOut,
    DeliveryOrderList,
)
from app.services.delivery_service import DeliveryService, InsufficientStockException

router = APIRouter(prefix="/deliveries", tags=["Deliveries"])


def _format_delivery_out(d) -> dict:
    return {
        "id": d.id,
        "organization_id": d.organization_id,
        "delivery_number": d.delivery_number,
        "customer_name": d.customer_name,
        "warehouse_id": d.warehouse_id,
        "warehouse_name": d.warehouse.name if d.warehouse else None,
        "source_location_id": d.source_location_id,
        "source_location_name": d.source_location.name if d.source_location else None,
        "status": d.status,
        "scheduled_date": d.scheduled_date,
        "priority": d.priority,
        "notes": d.notes,
        "created_by": d.created_by,
        "version": d.version,
        "created_at": d.created_at,
        "updated_at": d.updated_at,
        "lines": [
            {
                "id": line.id,
                "delivery_id": line.delivery_id,
                "product_id": line.product_id,
                "sku": line.product.sku if line.product else None,
                "product_name": line.product.name if line.product else None,
                "requested_quantity": line.requested_quantity,
                "reserved_quantity": line.reserved_quantity,
                "picked_quantity": line.picked_quantity,
                "packed_quantity": line.packed_quantity,
                "delivered_quantity": line.delivered_quantity,
                "source_location_id": line.source_location_id,
            }
            for line in d.lines
        ],
    }


@router.get("/", response_model=DeliveryOrderList)
def list_deliveries(
    warehouse_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    deliveries, total = DeliveryService.get_deliveries(
        db=db,
        organization_id=current_user.organization_id,
        warehouse_id=warehouse_id,
        status=status_filter,
        priority=priority,
        search=search,
        skip=skip,
        limit=limit,
    )
    return {"deliveries": [_format_delivery_out(d) for d in deliveries], "total": total}


@router.post("/", response_model=DeliveryOrderOut, status_code=status.HTTP_201_CREATED)
def create_delivery(
    data: DeliveryOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delivery = DeliveryService.create_delivery(db, current_user.organization_id, current_user.id, data)
        return _format_delivery_out(delivery)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{delivery_id}", response_model=DeliveryOrderOut)
def get_delivery(
    delivery_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delivery = DeliveryService.get_delivery_by_id(db, current_user.organization_id, delivery_id)
    if not delivery:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery order not found")
    return _format_delivery_out(delivery)


@router.post("/{delivery_id}/reserve", response_model=DeliveryOrderOut)
def reserve_delivery(
    delivery_id: uuid.UUID,
    req: Optional[DeliveryReserveRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = req.version if req else None
        delivery = DeliveryService.reserve_delivery(db, current_user.organization_id, current_user.id, delivery_id, version)
        return _format_delivery_out(delivery)
    except InsufficientStockException as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": "INSUFFICIENT_STOCK",
                    "message": e.message,
                    "details": e.details,
                },
            },
        )
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{delivery_id}/pick", response_model=DeliveryOrderOut)
def pick_delivery(
    delivery_id: uuid.UUID,
    req: Optional[DeliveryPickRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delivery = DeliveryService.pick_delivery(db, current_user.organization_id, current_user.id, delivery_id, req)
        return _format_delivery_out(delivery)
    except InsufficientStockException as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": "INSUFFICIENT_STOCK",
                    "message": e.message,
                    "details": e.details,
                },
            },
        )
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{delivery_id}/pack", response_model=DeliveryOrderOut)
def pack_delivery(
    delivery_id: uuid.UUID,
    req: Optional[DeliveryPackRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delivery = DeliveryService.pack_delivery(db, current_user.organization_id, current_user.id, delivery_id, req)
        return _format_delivery_out(delivery)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{delivery_id}/deliver", response_model=DeliveryOrderOut)
def deliver_delivery(
    delivery_id: uuid.UUID,
    req: Optional[DeliveryDeliverRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        version = req.version if req else None
        delivery = DeliveryService.deliver_delivery(db, current_user.organization_id, current_user.id, delivery_id, version)
        return _format_delivery_out(delivery)
    except InsufficientStockException as e:
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={
                "success": False,
                "error": {
                    "code": "INSUFFICIENT_STOCK",
                    "message": e.message,
                    "details": e.details,
                },
            },
        )
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{delivery_id}/cancel", response_model=DeliveryOrderOut)
def cancel_delivery(
    delivery_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        delivery = DeliveryService.cancel_delivery(db, current_user.organization_id, current_user.id, delivery_id)
        return _format_delivery_out(delivery)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
