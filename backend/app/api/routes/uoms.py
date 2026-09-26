import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.uom import UOM
from app.models.product import Product
from app.schemas.uom import UOMCreate, UOMUpdate, UOMOut, UOMList
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/uoms", tags=["UOMs"])

@router.get("/", response_model=UOMList)
def list_uoms(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    query = db.query(UOM).filter(UOM.organization_id == current_user.organization_id)
    total = query.count()
    uoms = query.offset(skip).limit(limit).all()
    return {"uoms": uoms, "total": total}

@router.get("/{uom_id}", response_model=UOMOut)
def get_uom(
    uom_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    uom = db.query(UOM).filter(
        UOM.id == uom_id,
        UOM.organization_id == current_user.organization_id
    ).first()
    if not uom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")
    return uom

@router.post("/", response_model=UOMOut, status_code=status.HTTP_201_CREATED)
def create_uom(
    *,
    db: Session = Depends(get_db),
    uom_in: UOMCreate,
    current_user: User = Depends(require_manager),
) -> Any:
    code = uom_in.code.strip().upper()
    existing = db.query(UOM).filter(
        UOM.code == code,
        UOM.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="UOM with this code already exists")
    
    uom = UOM(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        name=uom_in.name,
        code=code,
        description=uom_in.description,
    )
    db.add(uom)
    db.commit()
    db.refresh(uom)
    return uom

@router.put("/{uom_id}", response_model=UOMOut)
def update_uom(
    *,
    db: Session = Depends(get_db),
    uom_id: uuid.UUID,
    uom_in: UOMUpdate,
    current_user: User = Depends(require_manager),
) -> Any:
    uom = db.query(UOM).filter(
        UOM.id == uom_id,
        UOM.organization_id == current_user.organization_id
    ).first()
    if not uom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")
    
    if uom_in.code:
        code = uom_in.code.strip().upper()
        existing = db.query(UOM).filter(
            UOM.code == code,
            UOM.organization_id == current_user.organization_id,
            UOM.id != uom_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="UOM with this code already exists")
        uom.code = code
    
    if uom_in.name is not None:
        uom.name = uom_in.name
    if uom_in.description is not None:
        uom.description = uom_in.description
        
    db.commit()
    db.refresh(uom)
    return uom

@router.delete("/{uom_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_uom(
    *,
    db: Session = Depends(get_db),
    uom_id: uuid.UUID,
    current_user: User = Depends(require_manager),
):
    uom = db.query(UOM).filter(
        UOM.id == uom_id,
        UOM.organization_id == current_user.organization_id
    ).first()
    if not uom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="UOM not found")
    
    products_count = db.query(Product).filter(Product.uom_id == uom_id).count()
    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete UOM because it is referenced by one or more products"
        )
        
    db.delete(uom)
    db.commit()
    return None
