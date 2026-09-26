import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.schemas.warehouse import WarehouseCreate, WarehouseUpdate, WarehouseOut, WarehouseList
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])

@router.get("/", response_model=WarehouseList)
def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    query = db.query(Warehouse).filter(Warehouse.organization_id == current_user.organization_id)
    total = query.count()
    warehouses = query.offset(skip).limit(limit).all()
    
    for w in warehouses:
        w.location_count = db.query(Location).filter(Location.warehouse_id == w.id).count()
        
    return {"warehouses": warehouses, "total": total}

@router.get("/{warehouse_id}", response_model=WarehouseOut)
def get_warehouse(
    warehouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    warehouse.location_count = db.query(Location).filter(Location.warehouse_id == warehouse.id).count()
    return warehouse

@router.post("/", response_model=WarehouseOut, status_code=status.HTTP_201_CREATED)
def create_warehouse(
    *,
    db: Session = Depends(get_db),
    warehouse_in: WarehouseCreate,
    current_user: User = Depends(require_manager),
) -> Any:
    code = warehouse_in.code.strip().upper()
    existing = db.query(Warehouse).filter(
        Warehouse.code == code,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Warehouse with this code already exists")
    
    warehouse = Warehouse(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        name=warehouse_in.name,
        code=code,
        address=warehouse_in.address,
        is_active=warehouse_in.is_active,
    )
    db.add(warehouse)
    db.commit()
    db.refresh(warehouse)
    warehouse.location_count = 0
    return warehouse

@router.put("/{warehouse_id}", response_model=WarehouseOut)
def update_warehouse(
    *,
    db: Session = Depends(get_db),
    warehouse_id: uuid.UUID,
    warehouse_in: WarehouseUpdate,
    current_user: User = Depends(require_manager),
) -> Any:
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
    
    if warehouse_in.code:
        code = warehouse_in.code.strip().upper()
        existing = db.query(Warehouse).filter(
            Warehouse.code == code,
            Warehouse.organization_id == current_user.organization_id,
            Warehouse.id != warehouse_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Warehouse with this code already exists")
        warehouse.code = code
        
    if warehouse_in.name is not None: warehouse.name = warehouse_in.name
    if warehouse_in.address is not None: warehouse.address = warehouse_in.address
    if warehouse_in.is_active is not None: warehouse.is_active = warehouse_in.is_active
        
    db.commit()
    db.refresh(warehouse)
    warehouse.location_count = db.query(Location).filter(Location.warehouse_id == warehouse.id).count()
    return warehouse

@router.delete("/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_warehouse(
    *,
    db: Session = Depends(get_db),
    warehouse_id: uuid.UUID,
    current_user: User = Depends(require_manager),
):
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
        
    location_count = db.query(Location).filter(Location.warehouse_id == warehouse_id).count()
    if location_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete warehouse with existing locations"
        )
        
    # Soft deactivate instead
    warehouse.is_active = False
    db.commit()
    return None
