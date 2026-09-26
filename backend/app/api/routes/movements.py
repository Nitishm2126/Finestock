import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.location import Location
from app.models.warehouse import Warehouse
from app.models.stock_ledger_entry import StockLedgerEntry
from app.api.deps import get_current_user
from app.schemas.movement import MovementOut, MovementList

router = APIRouter(prefix="/movements", tags=["Movements"])


@router.get("/", response_model=MovementList)
def get_movements(
    product_id: Optional[uuid.UUID] = None,
    warehouse_id: Optional[uuid.UUID] = None,
    location_id: Optional[uuid.UUID] = None,
    transaction_type: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(StockLedgerEntry, Product, Location, Warehouse, User).join(
        Product, StockLedgerEntry.product_id == Product.id
    ).join(
        Location, StockLedgerEntry.location_id == Location.id
    ).join(
        Warehouse, Location.warehouse_id == Warehouse.id
    ).outerjoin(
        User, StockLedgerEntry.created_by == User.id
    ).filter(
        StockLedgerEntry.organization_id == current_user.organization_id
    )

    if product_id:
        query = query.filter(StockLedgerEntry.product_id == product_id)
    if location_id:
        query = query.filter(StockLedgerEntry.location_id == location_id)
    if warehouse_id:
        query = query.filter(Location.warehouse_id == warehouse_id)
    if transaction_type:
        query = query.filter(StockLedgerEntry.transaction_type == transaction_type)
    if search:
        s = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(s),
                Product.sku.ilike(s),
                StockLedgerEntry.reference_id.ilike(s),
                Location.name.ilike(s),
            )
        )

    total = query.count()
    rows = query.order_by(StockLedgerEntry.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for entry, prod, loc, wh, usr in rows:
        actor_name = f"{usr.first_name} {usr.last_name}" if usr else "System"
        result.append(
            MovementOut(
                id=entry.id,
                timestamp=entry.created_at,
                product_id=prod.id,
                sku=prod.sku,
                product_name=prod.name,
                warehouse_id=wh.id,
                warehouse_name=wh.name,
                location_id=loc.id,
                location_name=loc.name,
                transaction_type=entry.transaction_type,
                reference_type=entry.reference_type,
                reference_id=entry.reference_id,
                quantity_delta=entry.quantity_delta,
                quantity_before=entry.quantity_before,
                quantity_after=entry.quantity_after,
                actor_name=actor_name,
                metadata=entry.metadata_,
            )
        )

    return {"movements": result, "total": total}
