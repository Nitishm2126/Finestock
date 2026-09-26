import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.receipt import (
    ReceiptCreate,
    ReceiptUpdate,
    ReceiptValidateRequest,
    ReceiptOut,
    ReceiptList,
)
from app.services.receipt_service import ReceiptService

router = APIRouter(prefix="/receipts", tags=["Receipts"])


def _format_receipt_out(receipt) -> dict:
    return {
        "id": receipt.id,
        "organization_id": receipt.organization_id,
        "receipt_number": receipt.receipt_number,
        "supplier_id": receipt.supplier_id,
        "supplier_name": receipt.supplier.name if receipt.supplier else None,
        "warehouse_id": receipt.warehouse_id,
        "warehouse_name": receipt.warehouse.name if receipt.warehouse else None,
        "destination_location_id": receipt.destination_location_id,
        "destination_location_name": receipt.destination_location.name if receipt.destination_location else None,
        "status": receipt.status,
        "expected_date": receipt.expected_date,
        "reference_number": receipt.reference_number,
        "notes": receipt.notes,
        "created_by": receipt.created_by,
        "version": receipt.version,
        "created_at": receipt.created_at,
        "updated_at": receipt.updated_at,
        "lines": [
            {
                "id": line.id,
                "receipt_id": line.receipt_id,
                "product_id": line.product_id,
                "sku": line.product.sku if line.product else None,
                "product_name": line.product.name if line.product else None,
                "expected_quantity": line.expected_quantity,
                "received_quantity": line.received_quantity,
                "destination_location_id": line.destination_location_id,
            }
            for line in receipt.lines
        ],
    }


@router.get("/", response_model=ReceiptList)
def list_receipts(
    warehouse_id: Optional[uuid.UUID] = None,
    supplier_id: Optional[uuid.UUID] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipts, total = ReceiptService.get_receipts(
        db=db,
        organization_id=current_user.organization_id,
        warehouse_id=warehouse_id,
        supplier_id=supplier_id,
        status=status_filter,
        search=search,
        skip=skip,
        limit=limit,
    )
    return {"receipts": [_format_receipt_out(r) for r in receipts], "total": total}


@router.post("/", response_model=ReceiptOut, status_code=status.HTTP_201_CREATED)
def create_receipt(
    data: ReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        receipt = ReceiptService.create_receipt(db, current_user.organization_id, current_user.id, data)
        return _format_receipt_out(receipt)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{receipt_id}", response_model=ReceiptOut)
def get_receipt(
    receipt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receipt = ReceiptService.get_receipt_by_id(db, current_user.organization_id, receipt_id)
    if not receipt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Receipt not found")
    return _format_receipt_out(receipt)


@router.patch("/{receipt_id}", response_model=ReceiptOut)
def update_receipt(
    receipt_id: uuid.UUID,
    data: ReceiptUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        receipt = ReceiptService.update_receipt(db, current_user.organization_id, current_user.id, receipt_id, data)
        return _format_receipt_out(receipt)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{receipt_id}/validate", response_model=ReceiptOut)
def validate_receipt(
    receipt_id: uuid.UUID,
    req: Optional[ReceiptValidateRequest] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        receipt = ReceiptService.validate_receipt(db, current_user.organization_id, current_user.id, receipt_id, req)
        return _format_receipt_out(receipt)
    except ValueError as e:
        msg = str(e)
        if "conflict" in msg.lower():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/{receipt_id}/cancel", response_model=ReceiptOut)
def cancel_receipt(
    receipt_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        receipt = ReceiptService.cancel_receipt(db, current_user.organization_id, current_user.id, receipt_id)
        return _format_receipt_out(receipt)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
