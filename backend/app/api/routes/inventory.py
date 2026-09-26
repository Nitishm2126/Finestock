import uuid
from typing import Any, Optional, Dict
from decimal import Decimal
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.location import Location
from app.models.warehouse import Warehouse
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.receipt import Receipt, ReceiptLine
from app.models.delivery import DeliveryOrder, DeliveryOrderLine
from app.schemas.stock import StockPositionOut, StockPositionList, StockTimelineResponse, StockTimelineItem
from app.api.deps import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])


def _calculate_incoming_outgoing(db: Session, org_id: uuid.UUID) -> tuple[Dict[uuid.UUID, Decimal], Dict[uuid.UUID, Decimal]]:
    # Incoming: sum expected - received for non-DONE receipts
    inc_query = db.query(
        ReceiptLine.product_id,
        func.sum(ReceiptLine.expected_quantity - ReceiptLine.received_quantity),
    ).join(Receipt).filter(
        Receipt.organization_id == org_id,
        Receipt.status.in_(["WAITING", "PARTIAL", "DRAFT"]),
    ).group_by(ReceiptLine.product_id).all()
    incoming = {pid: (qty or Decimal("0")) for pid, qty in inc_query}

    # Outgoing: sum requested - delivered for active deliveries
    out_query = db.query(
        DeliveryOrderLine.product_id,
        func.sum(DeliveryOrderLine.requested_quantity - DeliveryOrderLine.delivered_quantity),
    ).join(DeliveryOrder).filter(
        DeliveryOrder.organization_id == org_id,
        DeliveryOrder.status.in_(["WAITING", "PICKING", "PICKED", "PACKING", "READY"]),
    ).group_by(DeliveryOrderLine.product_id).all()
    outgoing = {pid: (qty or Decimal("0")) for pid, qty in out_query}

    return incoming, outgoing


def _build_stock_response(positions, incoming_map, outgoing_map):
    result = []
    for pos, prod, loc, wh in positions:
        available = pos.quantity - pos.reserved_quantity
        incoming = incoming_map.get(prod.id, Decimal("0.0000"))
        outgoing = outgoing_map.get(prod.id, Decimal("0.0000"))

        if available <= 0:
            risk = "Critical"
        elif available <= prod.reorder_point:
            risk = "Low Stock"
        else:
            risk = "Healthy"

        result.append(
            StockPositionOut(
                product_id=prod.id,
                sku=prod.sku,
                product_name=prod.name,
                category_name=prod.category.name if prod.category else None,
                warehouse_id=wh.id,
                warehouse_name=wh.name,
                location_id=loc.id,
                location_name=loc.name,
                quantity=pos.quantity,
                reserved_quantity=pos.reserved_quantity,
                available_quantity=available,
                incoming_quantity=incoming,
                outgoing_quantity=outgoing,
                risk=risk,
                updated_at=pos.updated_at,
            )
        )
    return result


@router.get("/", response_model=StockPositionList)
def get_inventory(
    product_id: Optional[uuid.UUID] = None,
    warehouse_id: Optional[uuid.UUID] = None,
    location_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    low_stock: bool = False,
    out_of_stock: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    query = db.query(StockPosition, Product, Location, Warehouse).join(
        Product, StockPosition.product_id == Product.id
    ).join(
        Location, StockPosition.location_id == Location.id
    ).join(
        Warehouse, Location.warehouse_id == Warehouse.id
    ).filter(
        Product.organization_id == current_user.organization_id
    )

    if product_id:
        query = query.filter(StockPosition.product_id == product_id)
    if warehouse_id:
        query = query.filter(Location.warehouse_id == warehouse_id)
    if location_id:
        query = query.filter(StockPosition.location_id == location_id)

    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.sku.ilike(s),
                Location.name.ilike(s),
                Warehouse.name.ilike(s),
            )
        )

    if out_of_stock:
        query = query.filter(StockPosition.quantity == 0)
    elif low_stock:
        query = query.filter(StockPosition.quantity <= Product.reorder_point)

    total = query.count()
    positions = query.order_by(Warehouse.name.asc(), Location.name.asc()).offset(skip).limit(limit).all()

    incoming_map, outgoing_map = _calculate_incoming_outgoing(db, current_user.organization_id)
    return {"positions": _build_stock_response(positions, incoming_map, outgoing_map), "total": total}


@router.get("/{product_id}/timeline", response_model=StockTimelineResponse)
def get_product_timeline(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id,
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    positions = db.query(StockPosition).filter(StockPosition.product_id == product_id).all()
    current_physical = sum(pos.quantity for pos in positions) if positions else Decimal("0")
    current_reserved = sum(pos.reserved_quantity for pos in positions) if positions else Decimal("0")
    current_available = current_physical - current_reserved

    # Query ledger entries for this product
    entries = db.query(StockLedgerEntry, Location, Warehouse, User).join(
        Location, StockLedgerEntry.location_id == Location.id
    ).join(
        Warehouse, Location.warehouse_id == Warehouse.id
    ).outerjoin(
        User, StockLedgerEntry.created_by == User.id
    ).filter(
        StockLedgerEntry.product_id == product_id,
        StockLedgerEntry.organization_id == current_user.organization_id,
    ).order_by(StockLedgerEntry.created_at.desc()).all()

    timeline_items = []
    for entry, loc, wh, usr in entries:
        actor_name = f"{usr.first_name} {usr.last_name}" if usr else "System"
        notes = None
        if entry.metadata_ and isinstance(entry.metadata_, dict):
            notes = entry.metadata_.get("notes") or entry.metadata_.get("reason")

        timeline_items.append(
            StockTimelineItem(
                id=entry.id,
                timestamp=entry.created_at,
                transaction_type=entry.transaction_type,
                reference_type=entry.reference_type,
                reference_id=entry.reference_id,
                quantity_delta=entry.quantity_delta,
                quantity_before=entry.quantity_before,
                quantity_after=entry.quantity_after,
                location_name=loc.name,
                warehouse_name=wh.name,
                actor_name=actor_name,
                notes=notes,
            )
        )

    return StockTimelineResponse(
        product_id=product.id,
        sku=product.sku,
        product_name=product.name,
        current_physical=current_physical,
        current_reserved=current_reserved,
        current_available=current_available,
        timeline=timeline_items,
    )
