import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.stock_position import StockPosition
from app.schemas.location import LocationCreate, LocationUpdate, LocationOut, LocationList
from app.api.deps import get_current_user, require_supervisor

router = APIRouter(tags=["Locations"])

@router.get("/warehouses/{warehouse_id}/locations", response_model=LocationList)
def list_locations(
    warehouse_id: uuid.UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
        
    query = db.query(Location).filter(Location.warehouse_id == warehouse_id)
    total = query.count()
    locations = query.offset(skip).limit(limit).all()
    return {"locations": locations, "total": total}

@router.get("/locations/{location_id}", response_model=LocationOut)
def get_location(
    location_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    location = db.query(Location).join(Warehouse).filter(
        Location.id == location_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location

@router.post("/warehouses/{warehouse_id}/locations", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    *,
    warehouse_id: uuid.UUID,
    db: Session = Depends(get_db),
    location_in: LocationCreate,
    current_user: User = Depends(require_supervisor),
) -> Any:
    warehouse = db.query(Warehouse).filter(
        Warehouse.id == warehouse_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not warehouse:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warehouse not found")
        
    code = location_in.code.strip().upper()
    existing = db.query(Location).filter(
        Location.code == code,
        Location.warehouse_id == warehouse_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location with this code already exists in warehouse")
        
    location = Location(
        id=uuid.uuid4(),
        warehouse_id=warehouse_id,
        code=code,
        name=location_in.name,
        zone=location_in.zone,
        location_type=location_in.location_type,
        is_active=location_in.is_active,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

@router.put("/locations/{location_id}", response_model=LocationOut)
def update_location(
    *,
    db: Session = Depends(get_db),
    location_id: uuid.UUID,
    location_in: LocationUpdate,
    current_user: User = Depends(require_supervisor),
) -> Any:
    location = db.query(Location).join(Warehouse).filter(
        Location.id == location_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
        
    if location_in.code:
        code = location_in.code.strip().upper()
        existing = db.query(Location).filter(
            Location.code == code,
            Location.warehouse_id == location.warehouse_id,
            Location.id != location_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Location with this code already exists in warehouse")
        location.code = code
        
    if location_in.name is not None: location.name = location_in.name
    if location_in.zone is not None: location.zone = location_in.zone
    if location_in.location_type is not None: location.location_type = location_in.location_type
    if location_in.is_active is not None: location.is_active = location_in.is_active
        
    db.commit()
    db.refresh(location)
    return location

@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_location(
    *,
    db: Session = Depends(get_db),
    location_id: uuid.UUID,
    current_user: User = Depends(require_supervisor),
):
    location = db.query(Location).join(Warehouse).filter(
        Location.id == location_id,
        Warehouse.organization_id == current_user.organization_id
    ).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
        
    stock_count = db.query(StockPosition).filter(
        StockPosition.location_id == location_id,
        StockPosition.quantity > 0
    ).count()
    
    if stock_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete location with existing stock"
        )
        
    location.is_active = False
    db.commit()
    return None
