import uuid
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.delivery import DeliveryOrder, DeliveryOrderLine
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.product import Product
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.audit_event import AuditEvent
from app.schemas.delivery import (
    DeliveryOrderCreate,
    DeliveryOrderUpdate,
    DeliveryPickRequest,
    DeliveryPackRequest,
)
from app.core.realtime import manager


class InsufficientStockException(Exception):
    def __init__(self, message: str, details: Dict[str, Any]):
        super().__init__(message)
        self.message = message
        self.details = details


class DeliveryService:
    @staticmethod
    def _generate_delivery_number(db: Session, organization_id: uuid.UUID) -> str:
        count = db.query(DeliveryOrder).filter(DeliveryOrder.organization_id == organization_id).count()
        year = datetime.utcnow().year
        return f"DEL-{year}-{count + 1:04d}"

    @staticmethod
    def get_deliveries(
        db: Session,
        organization_id: uuid.UUID,
        warehouse_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[DeliveryOrder], int]:
        query = db.query(DeliveryOrder).filter(DeliveryOrder.organization_id == organization_id)
        if warehouse_id:
            query = query.filter(DeliveryOrder.warehouse_id == warehouse_id)
        if status:
            query = query.filter(DeliveryOrder.status == status)
        if priority:
            query = query.filter(DeliveryOrder.priority == priority)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    DeliveryOrder.delivery_number.ilike(s),
                    DeliveryOrder.customer_name.ilike(s),
                )
            )

        total = query.count()
        deliveries = query.order_by(DeliveryOrder.created_at.desc()).offset(skip).limit(limit).all()
        return deliveries, total

    @staticmethod
    def get_delivery_by_id(db: Session, organization_id: uuid.UUID, delivery_id: uuid.UUID) -> Optional[DeliveryOrder]:
        return db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()

    @staticmethod
    def create_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        data: DeliveryOrderCreate,
    ) -> DeliveryOrder:
        warehouse = db.query(Warehouse).filter(
            Warehouse.id == data.warehouse_id,
            Warehouse.organization_id == organization_id,
        ).first()
        if not warehouse:
            raise ValueError("Warehouse not found or access denied")

        source_loc = db.query(Location).filter(
            Location.id == data.source_location_id,
            Location.warehouse_id == warehouse.id,
        ).first()
        if not source_loc:
            raise ValueError("Source location not found in selected warehouse")

        delivery_number = data.delivery_number or DeliveryService._generate_delivery_number(db, organization_id)

        delivery = DeliveryOrder(
            id=uuid.uuid4(),
            organization_id=organization_id,
            delivery_number=delivery_number,
            customer_name=data.customer_name,
            warehouse_id=data.warehouse_id,
            source_location_id=data.source_location_id,
            status="WAITING",
            scheduled_date=data.scheduled_date,
            priority=data.priority,
            notes=data.notes,
            created_by=user_id,
            version=1,
        )
        db.add(delivery)

        for line_data in data.lines:
            product = db.query(Product).filter(
                Product.id == line_data.product_id,
                Product.organization_id == organization_id,
            ).first()
            if not product:
                raise ValueError(f"Product {line_data.product_id} not found or access denied")

            line = DeliveryOrderLine(
                id=uuid.uuid4(),
                delivery_id=delivery.id,
                product_id=line_data.product_id,
                requested_quantity=line_data.requested_quantity,
                reserved_quantity=Decimal("0.0000"),
                picked_quantity=Decimal("0.0000"),
                packed_quantity=Decimal("0.0000"),
                delivered_quantity=Decimal("0.0000"),
                source_location_id=line_data.source_location_id or data.source_location_id,
            )
            db.add(line)

        # Audit event
        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CREATE",
            entity_type="DELIVERY",
            entity_id=str(delivery.id),
            before_state=None,
            after_state={"delivery_number": delivery_number, "status": "WAITING"},
        )
        db.add(audit)

        db.commit()
        db.refresh(delivery)
        return delivery

    @staticmethod
    def reserve_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_id: uuid.UUID,
        version: Optional[int] = None,
    ) -> DeliveryOrder:
        """
        Allocates inventory reservation for this delivery order.
        Uses SELECT ... FOR UPDATE to prevent race conditions.
        """
        delivery = db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()
        if not delivery:
            raise ValueError("Delivery order not found")
        if delivery.status in ["DELIVERED", "CANCELLED"]:
            raise ValueError(f"Cannot reserve delivery in {delivery.status} status")

        if version is not None and version != delivery.version:
            raise ValueError("Version conflict: delivery order was modified by another user")

        for line in delivery.lines:
            target_loc_id = line.source_location_id or delivery.source_location_id
            pos = db.query(StockPosition).filter(
                StockPosition.product_id == line.product_id,
                StockPosition.location_id == target_loc_id,
            ).with_for_update().first()

            physical = pos.quantity if pos else Decimal("0")
            current_reserved = pos.reserved_quantity if pos else Decimal("0")
            available = physical - current_reserved

            needed = line.requested_quantity - line.reserved_quantity
            if needed <= 0:
                continue

            if available < needed:
                prod = db.query(Product).filter(Product.id == line.product_id).first()
                sku = prod.sku if prod else str(line.product_id)
                raise InsufficientStockException(
                    f"Insufficient available stock for product {sku}",
                    {
                        "product_id": str(line.product_id),
                        "sku": sku,
                        "physical": float(physical),
                        "reserved": float(current_reserved),
                        "available": float(available),
                        "requested": float(needed),
                    },
                )

            pos.reserved_quantity += needed
            line.reserved_quantity += needed

        delivery.version += 1
        db.commit()
        db.refresh(delivery)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "DELIVERY_RESERVED",
                            "delivery_number": delivery.delivery_number,
                            "status": delivery.status,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return delivery

    @staticmethod
    def pick_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_id: uuid.UUID,
        req: Optional[DeliveryPickRequest] = None,
    ) -> DeliveryOrder:
        delivery = db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()
        if not delivery:
            raise ValueError("Delivery order not found")
        if delivery.status in ["DELIVERED", "CANCELLED"]:
            raise ValueError(f"Cannot pick delivery in {delivery.status} status")

        if req and req.version is not None and req.version != delivery.version:
            raise ValueError("Version conflict: delivery order was modified by another user")

        # Automatically reserve any unreserved quantity first
        DeliveryService.reserve_delivery(db, organization_id, user_id, delivery_id)

        all_picked = True
        for line in delivery.lines:
            picked_qty = line.requested_quantity
            if req and req.line_picks:
                line_key = str(line.id)
                prod_key = str(line.product_id)
                if line_key in req.line_picks:
                    picked_qty = req.line_picks[line_key]
                elif prod_key in req.line_picks:
                    picked_qty = req.line_picks[prod_key]

            line.picked_quantity = picked_qty
            if line.picked_quantity < line.requested_quantity:
                all_picked = False

        delivery.status = "PICKED" if all_picked else "PICKING"
        delivery.version += 1

        db.commit()
        db.refresh(delivery)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "OPERATION_STATUS_CHANGED",
                            "delivery_number": delivery.delivery_number,
                            "status": delivery.status,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return delivery

    @staticmethod
    def pack_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_id: uuid.UUID,
        req: Optional[DeliveryPackRequest] = None,
    ) -> DeliveryOrder:
        delivery = db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()
        if not delivery:
            raise ValueError("Delivery order not found")
        if delivery.status in ["DELIVERED", "CANCELLED"]:
            raise ValueError(f"Cannot pack delivery in {delivery.status} status")

        for line in delivery.lines:
            packed_qty = line.picked_quantity or line.requested_quantity
            if req and req.line_packs:
                line_key = str(line.id)
                prod_key = str(line.product_id)
                if line_key in req.line_packs:
                    packed_qty = req.line_packs[line_key]
                elif prod_key in req.line_packs:
                    packed_qty = req.line_packs[prod_key]

            line.packed_quantity = packed_qty

        delivery.status = "READY"
        delivery.version += 1

        db.commit()
        db.refresh(delivery)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "OPERATION_STATUS_CHANGED",
                            "delivery_number": delivery.delivery_number,
                            "status": delivery.status,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return delivery

    @staticmethod
    def deliver_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_id: uuid.UUID,
        version: Optional[int] = None,
    ) -> DeliveryOrder:
        """
        Completes the physical delivery:
        - Decreases physical stock (StockPosition.quantity)
        - Decreases reserved stock (StockPosition.reserved_quantity)
        - Creates immutable StockLedgerEntry (DELIVERY_OUT)
        - Sets status to DELIVERED
        """
        delivery = db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()
        if not delivery:
            raise ValueError("Delivery order not found")
        if delivery.status == "DELIVERED":
            raise ValueError("Delivery order has already been completed")
        if delivery.status == "CANCELLED":
            raise ValueError("Cannot deliver a cancelled order")

        if version is not None and version != delivery.version:
            raise ValueError("Version conflict: delivery order was modified by another user")

        for line in delivery.lines:
            target_loc_id = line.source_location_id or delivery.source_location_id
            pos = db.query(StockPosition).filter(
                StockPosition.product_id == line.product_id,
                StockPosition.location_id == target_loc_id,
            ).with_for_update().first()

            qty_to_deliver = line.requested_quantity
            line.delivered_quantity = qty_to_deliver

            if not pos or pos.quantity < qty_to_deliver:
                prod = db.query(Product).filter(Product.id == line.product_id).first()
                sku = prod.sku if prod else str(line.product_id)
                raise InsufficientStockException(
                    f"Insufficient stock for product {sku}",
                    {
                        "product_id": str(line.product_id),
                        "sku": sku,
                        "physical": float(pos.quantity if pos else 0),
                        "requested": float(qty_to_deliver),
                    },
                )

            qty_before = pos.quantity
            pos.quantity -= qty_to_deliver
            # Release reservation as it is consumed
            release_res = min(pos.reserved_quantity, line.reserved_quantity, qty_to_deliver)
            pos.reserved_quantity -= release_res
            line.reserved_quantity -= release_res
            qty_after = pos.quantity

            # Ledger entry
            ledger = StockLedgerEntry(
                id=uuid.uuid4(),
                organization_id=organization_id,
                product_id=line.product_id,
                location_id=target_loc_id,
                transaction_type="DELIVERY_OUT",
                reference_type="DELIVERY",
                reference_id=delivery.delivery_number,
                quantity_delta=-qty_to_deliver,
                quantity_before=qty_before,
                quantity_after=qty_after,
                created_by=user_id,
                metadata_={
                    "delivery_id": str(delivery.id),
                    "customer_name": delivery.customer_name,
                    "warehouse_id": str(delivery.warehouse_id),
                },
            )
            db.add(ledger)

        delivery.status = "DELIVERED"
        delivery.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="DELIVER",
            entity_type="DELIVERY",
            entity_id=str(delivery.id),
            before_state={"status": "READY"},
            after_state={"status": "DELIVERED", "delivery_number": delivery.delivery_number},
        )
        db.add(audit)

        db.commit()
        db.refresh(delivery)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "DELIVERY_COMPLETED",
                            "delivery_number": delivery.delivery_number,
                            "status": "DELIVERED",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return delivery

    @staticmethod
    def cancel_delivery(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_id: uuid.UUID,
    ) -> DeliveryOrder:
        delivery = db.query(DeliveryOrder).filter(
            DeliveryOrder.id == delivery_id,
            DeliveryOrder.organization_id == organization_id,
        ).first()
        if not delivery:
            raise ValueError("Delivery order not found")
        if delivery.status == "DELIVERED":
            raise ValueError("Cannot cancel a completed delivery")
        if delivery.status == "CANCELLED":
            return delivery

        # Release any reservations
        for line in delivery.lines:
            if line.reserved_quantity > 0:
                target_loc_id = line.source_location_id or delivery.source_location_id
                pos = db.query(StockPosition).filter(
                    StockPosition.product_id == line.product_id,
                    StockPosition.location_id == target_loc_id,
                ).with_for_update().first()
                if pos:
                    pos.reserved_quantity = max(Decimal("0"), pos.reserved_quantity - line.reserved_quantity)
                line.reserved_quantity = Decimal("0")

        delivery.status = "CANCELLED"
        delivery.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CANCEL",
            entity_type="DELIVERY",
            entity_id=str(delivery.id),
            before_state={"status": delivery.status},
            after_state={"status": "CANCELLED"},
        )
        db.add(audit)

        db.commit()
        db.refresh(delivery)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "RESERVATION_RELEASED",
                            "delivery_number": delivery.delivery_number,
                            "status": "CANCELLED",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return delivery
