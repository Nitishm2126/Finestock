from typing import Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.stock_position import StockPosition
from app.schemas.dashboard import DashboardSummary
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    org_id = current_user.organization_id
    
    total_products = db.query(Product).filter(Product.organization_id == org_id).count()
    active_products = db.query(Product).filter(
        Product.organization_id == org_id, Product.is_active == True
    ).count()
    
    total_warehouses = db.query(Warehouse).filter(Warehouse.organization_id == org_id).count()
    
    total_locations = db.query(Location).join(Warehouse).filter(
        Warehouse.organization_id == org_id
    ).count()
    
    stock_agg = db.query(
        func.sum(StockPosition.quantity).label("total_qty")
    ).join(Product).filter(Product.organization_id == org_id).first()
    
    total_stock_units = float(stock_agg.total_qty or 0)
    
    # Needs to be a query that considers sum of quantity per product.
    # To keep it simple per requirements, low stock is quantity <= reorder_point
    # Out of stock is quantity = 0
    # The requirement says:
    # Low stock: quantity <= reorder_point
    # Out of stock: quantity = 0
    # Let's count products matching this. We can use a subquery to sum quantity per product.
    
    subq = db.query(
        StockPosition.product_id,
        func.sum(StockPosition.quantity).label("total_qty")
    ).group_by(StockPosition.product_id).subquery()
    
    # Get all active products with their total quantity (or 0 if no stock position)
    product_stats = db.query(
        Product.reorder_point,
        func.coalesce(subq.c.total_qty, 0).label("qty")
    ).outerjoin(
        subq, Product.id == subq.c.product_id
    ).filter(
        Product.organization_id == org_id,
        Product.is_active == True
    ).all()
    
    low_stock_products = 0
    out_of_stock_products = 0
    
    for rp, qty in product_stats:
        if qty == 0:
            out_of_stock_products += 1
        elif qty <= rp:
            low_stock_products += 1

    return DashboardSummary(
        total_products=total_products,
        active_products=active_products,
        total_warehouses=total_warehouses,
        total_locations=total_locations,
        total_stock_units=total_stock_units,
        low_stock_products=low_stock_products,
        out_of_stock_products=out_of_stock_products,
    )
