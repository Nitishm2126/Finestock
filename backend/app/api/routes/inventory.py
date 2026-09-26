import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.location import Location
from app.models.warehouse import Warehouse
from app.models.stock_position import StockPosition
from app.schemas.stock import StockPositionOut, StockPositionList
from app.api.deps import get_current_user

router = APIRouter(prefix="/inventory", tags=["Inventory"])

def _build_stock_response(positions):
    result = []
    for pos, prod, loc, wh in positions:
        result.append({
            "product_id": prod.id,
            "sku": prod.sku,
            "product_name": prod.name,
            "warehouse_id": wh.id,
            "warehouse_name": wh.name,
            "location_id": loc.id,
            "location_name": loc.name,
            "quantity": pos.quantity,
            "reserved_quantity": pos.reserved_quantity,
            "available_quantity": pos.quantity - pos.reserved_quantity,
        })
    return result

@router.get("/", response_model=StockPositionList)
def get_inventory(
    product_id: Optional[uuid.UUID] = None,
    warehouse_id: Optional[uuid.UUID] = None,
    location_id: Optional[uuid.UUID] = None,
    low_stock: bool = False,
    out_of_stock: bool = False,
    skip: int = 0,
    limit: int = 100,
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
        
    if out_of_stock:
        query = query.filter(StockPosition.quantity == 0)
    elif low_stock:
        query = query.filter(StockPosition.quantity <= Product.reorder_point)
        
    total = query.count()
    positions = query.offset(skip).limit(limit).all()
    
    return {"positions": _build_stock_response(positions), "total": total}

@router.get("/{product_id}", response_model=StockPositionList)
def get_inventory_by_product(
    product_id: uuid.UUID,
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
        Product.organization_id == current_user.organization_id,
        StockPosition.product_id == product_id
    )
    positions = query.all()
    return {"positions": _build_stock_response(positions), "total": len(positions)}

@router.get("/location/{location_id}", response_model=StockPositionList)
def get_inventory_by_location(
    location_id: uuid.UUID,
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
        Product.organization_id == current_user.organization_id,
        StockPosition.location_id == location_id
    )
    positions = query.all()
    return {"positions": _build_stock_response(positions), "total": len(positions)}

@router.get("/warehouse/{warehouse_id}", response_model=StockPositionList)
def get_inventory_by_warehouse(
    warehouse_id: uuid.UUID,
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
        Product.organization_id == current_user.organization_id,
        Location.warehouse_id == warehouse_id
    )
    positions = query.all()
    return {"positions": _build_stock_response(positions), "total": len(positions)}
