import uuid
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.receipt import Receipt, ReceiptLine
from app.models.supplier import Supplier
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.product import Product
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.audit_event import AuditEvent
from app.schemas.receipt import ReceiptCreate, ReceiptUpdate, ReceiptValidateRequest
from app.core.realtime import manager


class ReceiptService:
    @staticmethod
    def _generate_receipt_number(db: Session, organization_id: uuid.UUID) -> str:
        count = db.query(Receipt).filter(Receipt.organization_id == organization_id).count()
        year = datetime.utcnow().year
        return f"REC-{year}-{count + 1:04d}"

    @staticmethod
    def get_receipts(
        db: Session,
        organization_id: uuid.UUID,
        warehouse_id: Optional[uuid.UUID] = None,
        supplier_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Receipt], int]:
        query = db.query(Receipt).filter(Receipt.organization_id == organization_id)
        if warehouse_id:
            query = query.filter(Receipt.warehouse_id == warehouse_id)
        if supplier_id:
            query = query.filter(Receipt.supplier_id == supplier_id)
        if status:
            query = query.filter(Receipt.status == status)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Receipt.receipt_number.ilike(s),
                    Receipt.reference_number.ilike(s),
                )
            )

        total = query.count()
        receipts = query.order_by(Receipt.created_at.desc()).offset(skip).limit(limit).all()
        return receipts, total

    @staticmethod
    def get_receipt_by_id(db: Session, organization_id: uuid.UUID, receipt_id: uuid.UUID) -> Optional[Receipt]:
        return db.query(Receipt).filter(
            Receipt.id == receipt_id,
            Receipt.organization_id == organization_id,
        ).first()

    @staticmethod
    def create_receipt(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ReceiptCreate,
    ) -> Receipt:
        # Verify supplier, warehouse, destination location belong to org
        supplier = db.query(Supplier).filter(
            Supplier.id == data.supplier_id,
            Supplier.organization_id == organization_id,
        ).first()
        if not supplier:
            raise ValueError("Supplier not found or access denied")

        warehouse = db.query(Warehouse).filter(
            Warehouse.id == data.warehouse_id,
            Warehouse.organization_id == organization_id,
        ).first()
        if not warehouse:
            raise ValueError("Warehouse not found or access denied")

        dest_loc = db.query(Location).filter(
            Location.id == data.destination_location_id,
            Location.warehouse_id == warehouse.id,
        ).first()
        if not dest_loc:
            raise ValueError("Destination location not found in selected warehouse")

        receipt_number = data.receipt_number or ReceiptService._generate_receipt_number(db, organization_id)

        receipt = Receipt(
            id=uuid.uuid4(),
            organization_id=organization_id,
            receipt_number=receipt_number,
            supplier_id=data.supplier_id,
            warehouse_id=data.warehouse_id,
            destination_location_id=data.destination_location_id,
            status="WAITING",  # Awaiting physical arrival
            expected_date=data.expected_date,
            reference_number=data.reference_number,
            notes=data.notes,
            created_by=user_id,
            version=1,
        )
        db.add(receipt)

        for line_data in data.lines:
            product = db.query(Product).filter(
                Product.id == line_data.product_id,
                Product.organization_id == organization_id,
            ).first()
            if not product:
                raise ValueError(f"Product {line_data.product_id} not found or access denied")

            line = ReceiptLine(
                id=uuid.uuid4(),
                receipt_id=receipt.id,
                product_id=line_data.product_id,
                expected_quantity=line_data.expected_quantity,
                received_quantity=Decimal("0.0000"),  # No stock increase yet!
                destination_location_id=line_data.destination_location_id or data.destination_location_id,
            )
            db.add(line)

        # Audit event
        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CREATE",
            entity_type="RECEIPT",
            entity_id=str(receipt.id),
            before_state=None,
            after_state={"receipt_number": receipt_number, "status": "WAITING"},
        )
        db.add(audit)

        db.commit()
        db.refresh(receipt)
        return receipt

    @staticmethod
    def update_receipt(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        receipt_id: uuid.UUID,
        data: ReceiptUpdate,
    ) -> Receipt:
        receipt = ReceiptService.get_receipt_by_id(db, organization_id, receipt_id)
        if not receipt:
            raise ValueError("Receipt not found")
        if receipt.status in ["DONE", "CANCELLED"]:
            raise ValueError(f"Cannot modify receipt in {receipt.status} status")

        if data.version is not None and data.version != receipt.version:
            raise ValueError("Version conflict: receipt was modified by another user")

        if data.supplier_id is not None:
            receipt.supplier_id = data.supplier_id
        if data.warehouse_id is not None:
            receipt.warehouse_id = data.warehouse_id
        if data.destination_location_id is not None:
            receipt.destination_location_id = data.destination_location_id
        if data.expected_date is not None:
            receipt.expected_date = data.expected_date
        if data.reference_number is not None:
            receipt.reference_number = data.reference_number
        if data.notes is not None:
            receipt.notes = data.notes

        receipt.version += 1
        db.commit()
        db.refresh(receipt)
        return receipt

    @staticmethod
    def validate_receipt(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        receipt_id: uuid.UUID,
        req: Optional[ReceiptValidateRequest] = None,
    ) -> Receipt:
        """
        Validates the receipt:
        - Locks stock positions with FOR UPDATE
        - Increases stock position
        - Creates immutable ledger entries
        - Creates audit log
        - Updates receipt status to DONE
        """
        receipt = db.query(Receipt).filter(
            Receipt.id == receipt_id,
            Receipt.organization_id == organization_id,
        ).first()
        if not receipt:
            raise ValueError("Receipt not found")
        if receipt.status == "DONE":
            raise ValueError("Receipt has already been validated")
        if receipt.status == "CANCELLED":
            raise ValueError("Cannot validate a cancelled receipt")

        if req and req.version is not None and req.version != receipt.version:
            raise ValueError("Version conflict: receipt was modified by another user")

        # Begin atomic transaction
        for line in receipt.lines:
            target_loc_id = line.destination_location_id or receipt.destination_location_id

            # Determine received quantity: either custom specified or expected quantity
            qty_to_receive = line.expected_quantity
            if req and req.line_quantities:
                line_key = str(line.id)
                prod_key = str(line.product_id)
                if line_key in req.line_quantities:
                    qty_to_receive = req.line_quantities[line_key]
                elif prod_key in req.line_quantities:
                    qty_to_receive = req.line_quantities[prod_key]

            if qty_to_receive <= 0:
                raise ValueError(f"Quantity to receive must be greater than 0 for product {line.product_id}")

            line.received_quantity = qty_to_receive

            # Lock stock position FOR UPDATE
            pos = db.query(StockPosition).filter(
                StockPosition.product_id == line.product_id,
                StockPosition.location_id == target_loc_id,
            ).with_for_update().first()

            if pos:
                qty_before = pos.quantity
                pos.quantity += qty_to_receive
                qty_after = pos.quantity
            else:
                qty_before = Decimal("0")
                pos = StockPosition(
                    id=uuid.uuid4(),
                    product_id=line.product_id,
                    location_id=target_loc_id,
                    quantity=qty_to_receive,
                    reserved_quantity=Decimal("0"),
                )
                db.add(pos)
                qty_after = qty_to_receive

            # Create immutable ledger entry
            ledger = StockLedgerEntry(
                id=uuid.uuid4(),
                organization_id=organization_id,
                product_id=line.product_id,
                location_id=target_loc_id,
                transaction_type="RECEIPT_IN",
                reference_type="RECEIPT",
                reference_id=receipt.receipt_number,
                quantity_delta=qty_to_receive,
                quantity_before=qty_before,
                quantity_after=qty_after,
                created_by=user_id,
                metadata_={
                    "receipt_id": str(receipt.id),
                    "supplier_id": str(receipt.supplier_id),
                    "warehouse_id": str(receipt.warehouse_id),
                },
            )
            db.add(ledger)

        receipt.status = "DONE"
        receipt.version += 1

        # Audit event
        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="VALIDATE",
            entity_type="RECEIPT",
            entity_id=str(receipt.id),
            before_state={"status": "WAITING"},
            after_state={"status": "DONE", "receipt_number": receipt.receipt_number},
        )
        db.add(audit)

        db.commit()
        db.refresh(receipt)

        # Broadcast real-time event
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "RECEIPT_VALIDATED",
                            "timestamp": datetime.utcnow().isoformat(),
                            "organization_id": str(organization_id),
                            "receipt_number": receipt.receipt_number,
                            "warehouse_id": str(receipt.warehouse_id),
                            "status": "DONE",
                        },
                    )
                )
        except Exception:
            pass

        return receipt

    @staticmethod
    def cancel_receipt(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        receipt_id: uuid.UUID,
    ) -> Receipt:
        receipt = ReceiptService.get_receipt_by_id(db, organization_id, receipt_id)
        if not receipt:
            raise ValueError("Receipt not found")
        if receipt.status == "DONE":
            raise ValueError("Cannot cancel a completed receipt")
        if receipt.status == "CANCELLED":
            return receipt

        receipt.status = "CANCELLED"
        receipt.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CANCEL",
            entity_type="RECEIPT",
            entity_id=str(receipt.id),
            before_state={"status": receipt.status},
            after_state={"status": "CANCELLED"},
        )
        db.add(audit)

        db.commit()
        db.refresh(receipt)
        return receipt
