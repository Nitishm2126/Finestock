import uuid
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate, SupplierUpdate


class SupplierService:
    @staticmethod
    def get_suppliers(
        db: Session,
        organization_id: uuid.UUID,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Supplier], int]:
        query = db.query(Supplier).filter(Supplier.organization_id == organization_id)
        if is_active is not None:
            query = query.filter(Supplier.is_active == is_active)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Supplier.name.ilike(s),
                    Supplier.code.ilike(s),
                    Supplier.email.ilike(s),
                )
            )
        total = query.count()
        suppliers = query.order_by(Supplier.name.asc()).offset(skip).limit(limit).all()
        return suppliers, total

    @staticmethod
    def get_supplier_by_id(db: Session, organization_id: uuid.UUID, supplier_id: uuid.UUID) -> Optional[Supplier]:
        return db.query(Supplier).filter(
            Supplier.id == supplier_id,
            Supplier.organization_id == organization_id,
        ).first()

    @staticmethod
    def create_supplier(db: Session, organization_id: uuid.UUID, data: SupplierCreate) -> Supplier:
        existing = db.query(Supplier).filter(
            Supplier.organization_id == organization_id,
            Supplier.code == data.code,
        ).first()
        if existing:
            raise ValueError(f"Supplier code '{data.code}' already exists")

        supplier = Supplier(
            id=uuid.uuid4(),
            organization_id=organization_id,
            name=data.name,
            code=data.code,
            email=data.email,
            phone=data.phone,
            address=data.address,
            lead_time_days=data.lead_time_days,
            is_active=data.is_active,
            notes=data.notes,
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier

    @staticmethod
    def update_supplier(
        db: Session,
        organization_id: uuid.UUID,
        supplier_id: uuid.UUID,
        data: SupplierUpdate,
    ) -> Supplier:
        supplier = SupplierService.get_supplier_by_id(db, organization_id, supplier_id)
        if not supplier:
            raise ValueError("Supplier not found")

        if data.code and data.code != supplier.code:
            existing = db.query(Supplier).filter(
                Supplier.organization_id == organization_id,
                Supplier.code == data.code,
            ).first()
            if existing:
                raise ValueError(f"Supplier code '{data.code}' already exists")
            supplier.code = data.code

        if data.name is not None:
            supplier.name = data.name
        if data.email is not None:
            supplier.email = data.email
        if data.phone is not None:
            supplier.phone = data.phone
        if data.address is not None:
            supplier.address = data.address
        if data.lead_time_days is not None:
            supplier.lead_time_days = data.lead_time_days
        if data.is_active is not None:
            supplier.is_active = data.is_active
        if data.notes is not None:
            supplier.notes = data.notes

        db.commit()
        db.refresh(supplier)
        return supplier
