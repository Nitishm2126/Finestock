import uuid
from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.category import Category
from app.models.uom import UOM
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut, ProductList
from app.api.deps import get_current_user, require_manager

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("/", response_model=ProductList)
def list_products(
    skip: int = 0,
    limit: int = 100,
    sku: Optional[str] = None,
    name: Optional[str] = None,
    category_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    query = db.query(Product).filter(Product.organization_id == current_user.organization_id)
    
    if sku:
        query = query.filter(Product.sku.ilike(f"%{sku}%"))
    if name:
        query = query.filter(Product.name.ilike(f"%{name}%"))
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
        
    total = query.count()
    products = query.order_by(Product.name).offset(skip).limit(limit).all()
    return {"products": products, "total": total}

@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product

@router.post("/", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    *,
    db: Session = Depends(get_db),
    product_in: ProductCreate,
    current_user: User = Depends(require_manager),
) -> Any:
    sku = product_in.sku.strip().upper()
    existing = db.query(Product).filter(
        Product.sku == sku,
        Product.organization_id == current_user.organization_id
    ).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product with this SKU already exists")
    
    category = db.query(Category).filter(
        Category.id == product_in.category_id,
        Category.organization_id == current_user.organization_id
    ).first()
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Category")
        
    uom = db.query(UOM).filter(
        UOM.id == product_in.uom_id,
        UOM.organization_id == current_user.organization_id
    ).first()
    if not uom:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UOM")
    
    product = Product(
        id=uuid.uuid4(),
        organization_id=current_user.organization_id,
        category_id=product_in.category_id,
        uom_id=product_in.uom_id,
        sku=sku,
        name=product_in.name,
        description=product_in.description,
        reorder_point=product_in.reorder_point,
        reorder_quantity=product_in.reorder_quantity,
        is_active=product_in.is_active,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.put("/{product_id}", response_model=ProductOut)
def update_product(
    *,
    db: Session = Depends(get_db),
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    current_user: User = Depends(require_manager),
) -> Any:
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    
    if product_in.sku:
        sku = product_in.sku.strip().upper()
        existing = db.query(Product).filter(
            Product.sku == sku,
            Product.organization_id == current_user.organization_id,
            Product.id != product_id
        ).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product with this SKU already exists")
        product.sku = sku
        
    if product_in.category_id:
        category = db.query(Category).filter(
            Category.id == product_in.category_id,
            Category.organization_id == current_user.organization_id
        ).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Category")
        product.category_id = product_in.category_id
            
    if product_in.uom_id:
        uom = db.query(UOM).filter(
            UOM.id == product_in.uom_id,
            UOM.organization_id == current_user.organization_id
        ).first()
        if not uom:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid UOM")
        product.uom_id = product_in.uom_id
            
    if product_in.name is not None: product.name = product_in.name
    if product_in.description is not None: product.description = product_in.description
    if product_in.reorder_point is not None: product.reorder_point = product_in.reorder_point
    if product_in.reorder_quantity is not None: product.reorder_quantity = product_in.reorder_quantity
    if product_in.is_active is not None: product.is_active = product_in.is_active
        
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
def delete_product(
    *,
    db: Session = Depends(get_db),
    product_id: uuid.UUID,
    current_user: User = Depends(require_manager),
):
    product = db.query(Product).filter(
        Product.id == product_id,
        Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        
    # Prefer soft deactivation
    product.is_active = False
    db.commit()
    return None
