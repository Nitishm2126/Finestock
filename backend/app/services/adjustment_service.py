import uuid
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.adjustment import Adjustment
from app.models.product import Product
from app.models.location import Location
from app.models.warehouse import Warehouse
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.audit_event import AuditEvent
from app.schemas.adjustment import AdjustmentCreate, AdjustmentUpdate
from app.core.realtime import manager


class AdjustmentService:
    @staticmethod
    def _generate_adjustment_number(db: Session, organization_id: uuid.UUID) -> str:
        count = db.query(Adjustment).filter(Adjustment.organization_id == organization_id).count()
        year = datetime.utcnow().year
        return f"ADJ-{year}-{count + 1:04d}"

    @staticmethod
    def get_adjustments(
        db: Session,
        organization_id: uuid.UUID,
        warehouse_id: Optional[uuid.UUID] = None,
        location_id: Optional[uuid.UUID] = None,
        product_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        reason: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Adjustment], int]:
        query = db.query(Adjustment).filter(Adjustment.organization_id == organization_id)
        if warehouse_id:
            query = query.filter(Adjustment.warehouse_id == warehouse_id)
        if location_id:
            query = query.filter(Adjustment.location_id == location_id)
        if product_id:
            query = query.filter(Adjustment.product_id == product_id)
        if status:
            query = query.filter(Adjustment.status == status)
        if reason:
            query = query.filter(Adjustment.reason == reason)
        if search:
            s = f"%{search}%"
            query = query.filter(Adjustment.adjustment_number.ilike(s))

        total = query.count()
        adjustments = query.order_by(Adjustment.created_at.desc()).offset(skip).limit(limit).all()
        return adjustments, total

    @staticmethod
    def get_adjustment_by_id(db: Session, organization_id: uuid.UUID, adjustment_id: uuid.UUID) -> Optional[Adjustment]:
        return db.query(Adjustment).filter(
            Adjustment.id == adjustment_id,
            Adjustment.organization_id == organization_id,
        ).first()

    @staticmethod
    def create_adjustment(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        data: AdjustmentCreate,
    ) -> Adjustment:
        # Validate warehouse, location, product
        warehouse = db.query(Warehouse).filter(
            Warehouse.id == data.warehouse_id,
            Warehouse.organization_id == organization_id,
        ).first()
        if not warehouse:
            raise ValueError("Warehouse not found or access denied")

        location = db.query(Location).filter(
            Location.id == data.location_id,
            Location.warehouse_id == warehouse.id,
        ).first()
        if not location:
            raise ValueError("Location not found in selected warehouse")

        product = db.query(Product).filter(
            Product.id == data.product_id,
            Product.organization_id == organization_id,
        ).first()
        if not product:
            raise ValueError("Product not found or access denied")

        # Current system quantity
        pos = db.query(StockPosition).filter(
            StockPosition.product_id == data.product_id,
            StockPosition.location_id == data.location_id,
        ).first()
        system_quantity = pos.quantity if pos else Decimal("0.0000")
        difference = data.physical_count - system_quantity

        adjustment_number = data.adjustment_number or AdjustmentService._generate_adjustment_number(db, organization_id)

        adjustment = Adjustment(
            id=uuid.uuid4(),
            organization_id=organization_id,
            adjustment_number=adjustment_number,
            warehouse_id=data.warehouse_id,
            location_id=data.location_id,
            product_id=data.product_id,
            system_quantity=system_quantity,
            physical_count=data.physical_count,
            difference=difference,
            reason=data.reason,
            status="PENDING_APPROVAL",
            notes=data.notes,
            requested_by=user_id,
            version=1,
        )
        db.add(adjustment)

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CREATE",
            entity_type="ADJUSTMENT",
            entity_id=str(adjustment.id),
            metadata_={"adjustment_number": adjustment_number, "difference": str(difference)},
        )
        db.add(audit)

        db.commit()
        db.refresh(adjustment)
        return adjustment

    @staticmethod
    def approve_adjustment(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        adjustment_id: uuid.UUID,
        version: Optional[int] = None,
    ) -> Adjustment:
        """
        Approves and executes stock adjustment:
        - Locks stock position FOR UPDATE
        - Updates stock position to physical count
        - Creates immutable StockLedgerEntry
        - Sets status to APPROVED
        """
        adjustment = db.query(Adjustment).filter(
            Adjustment.id == adjustment_id,
            Adjustment.organization_id == organization_id,
        ).first()
        if not adjustment:
            raise ValueError("Adjustment not found")
        if adjustment.status == "APPROVED":
            raise ValueError("Adjustment has already been approved")
        if adjustment.status == "CANCELLED":
            raise ValueError("Cannot approve a cancelled adjustment")

        if version is not None and version != adjustment.version:
            raise ValueError("Version conflict: adjustment was modified by another user")

        pos = db.query(StockPosition).filter(
            StockPosition.product_id == adjustment.product_id,
            StockPosition.location_id == adjustment.location_id,
        ).with_for_update().first()

        qty_before = pos.quantity if pos else Decimal("0")
        qty_after = adjustment.physical_count
        actual_delta = qty_after - qty_before

        if pos:
            pos.quantity = qty_after
        else:
            pos = StockPosition(
                id=uuid.uuid4(),
                product_id=adjustment.product_id,
                location_id=adjustment.location_id,
                quantity=qty_after,
                reserved_quantity=Decimal("0"),
            )
            db.add(pos)

        # Create immutable ledger entry
        ledger = StockLedgerEntry(
            id=uuid.uuid4(),
            organization_id=organization_id,
            product_id=adjustment.product_id,
            location_id=adjustment.location_id,
            transaction_type="ADJUSTMENT",
            reference_type="ADJUSTMENT",
            reference_id=adjustment.adjustment_number,
            quantity_delta=actual_delta,
            quantity_before=qty_before,
            quantity_after=qty_after,
            created_by=user_id,
            metadata_={
                "reason": adjustment.reason,
                "notes": adjustment.notes,
                "adjustment_id": str(adjustment.id),
            },
        )
        db.add(ledger)

        adjustment.status = "APPROVED"
        adjustment.approved_by = user_id
        adjustment.system_quantity = qty_before
        adjustment.difference = actual_delta
        adjustment.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="APPROVE",
            entity_type="ADJUSTMENT",
            entity_id=str(adjustment.id),
            metadata_={"status": "APPROVED", "difference": str(actual_delta)},
        )
        db.add(audit)

        db.commit()
        db.refresh(adjustment)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "ADJUSTMENT_APPROVED",
                            "adjustment_number": adjustment.adjustment_number,
                            "status": "APPROVED",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return adjustment

    @staticmethod
    def cancel_adjustment(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        adjustment_id: uuid.UUID,
    ) -> Adjustment:
        adjustment = AdjustmentService.get_adjustment_by_id(db, organization_id, adjustment_id)
        if not adjustment:
            raise ValueError("Adjustment not found")
        if adjustment.status == "APPROVED":
            raise ValueError("Cannot cancel an approved adjustment")
        if adjustment.status == "CANCELLED":
            return adjustment

        adjustment.status = "CANCELLED"
        adjustment.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CANCEL",
            entity_type="ADJUSTMENT",
            entity_id=str(adjustment.id),
            metadata_={"status": "CANCELLED"},
        )
        db.add(audit)

        db.commit()
        db.refresh(adjustment)
        return adjustment
