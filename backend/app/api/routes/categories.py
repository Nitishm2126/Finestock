import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryOut, CategoryList
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("/", response_model=CategoryList)
def list_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    query = db.query(Category).filter(Category.organization_id == current_user.organization_id)
    total = query.count()
    categories = query.offset(skip).limit(limit).all()
    return {"categories": categories, "total": total}

@router.get("/{category_id}", response_model=CategoryOut)
def get_category(
    category_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.organization_id == current_user.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category

@router.post("/", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(
    *,
    db: Session = Depends(get_db),
    category_in: CategoryCreate,
    current_user: User = Depends(require_manager),
) -> Any:
    existing = db.query(Category).filter(
        func.lower(Category.name) == category_in.name.strip().lower(),
        Category.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category with this name already exists")
    
    category = Category(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        name=category_in.name,
        description=category_in.description,
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category

@router.put("/{category_id}", response_model=CategoryOut)
def update_category(
    *,
    db: Session = Depends(get_db),
    category_id: uuid.UUID,
    category_in: CategoryUpdate,
    current_user: User = Depends(require_manager),
) -> Any:
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.organization_id == current_user.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    if category_in.name:
        existing = db.query(Category).filter(
            func.lower(Category.name) == category_in.name.strip().lower(),
            Category.organization_id == current_user.organization_id,
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Category with this name already exists")
    
    update_data = category_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
        
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_category(
    *,
    db: Session = Depends(get_db),
    category_id: uuid.UUID,
    current_user: User = Depends(require_manager),
):
    category = db.query(Category).filter(
        Category.id == category_id,
        Category.organization_id == current_user.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    products_count = db.query(Product).filter(Product.category_id == category_id).count()
    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category because it is referenced by one or more products"
        )
        
    db.delete(category)
    db.commit()
    return None
