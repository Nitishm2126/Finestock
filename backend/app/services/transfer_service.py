import uuid
import asyncio
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.transfer import Transfer, TransferLine
from app.models.warehouse import Warehouse
from app.models.location import Location
from app.models.product import Product
from app.models.stock_position import StockPosition
from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.audit_event import AuditEvent
from app.schemas.transfer import TransferCreate, TransferUpdate
from app.core.realtime import manager


class TransferService:
    @staticmethod
    def _generate_transfer_number(db: Session, organization_id: uuid.UUID) -> str:
        count = db.query(Transfer).filter(Transfer.organization_id == organization_id).count()
        year = datetime.utcnow().year
        return f"TRF-{year}-{count + 1:04d}"

    @staticmethod
    def get_transfers(
        db: Session,
        organization_id: uuid.UUID,
        source_warehouse_id: Optional[uuid.UUID] = None,
        destination_warehouse_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Transfer], int]:
        query = db.query(Transfer).filter(Transfer.organization_id == organization_id)
        if source_warehouse_id:
            query = query.filter(Transfer.source_warehouse_id == source_warehouse_id)
        if destination_warehouse_id:
            query = query.filter(Transfer.destination_warehouse_id == destination_warehouse_id)
        if status:
            query = query.filter(Transfer.status == status)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    Transfer.transfer_number.ilike(s),
                    Transfer.reason.ilike(s),
                )
            )

        total = query.count()
        transfers = query.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
        return transfers, total

    @staticmethod
    def get_transfer_by_id(db: Session, organization_id: uuid.UUID, transfer_id: uuid.UUID) -> Optional[Transfer]:
        return db.query(Transfer).filter(
            Transfer.id == transfer_id,
            Transfer.organization_id == organization_id,
        ).first()

    @staticmethod
    def create_transfer(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        data: TransferCreate,
    ) -> Transfer:
        # Validate source and destination warehouses/locations
        src_loc = db.query(Location).filter(
            Location.id == data.source_location_id,
            Location.warehouse_id == data.source_warehouse_id,
        ).first()
        if not src_loc:
            raise ValueError("Source location does not belong to specified source warehouse")

        dest_loc = db.query(Location).filter(
            Location.id == data.destination_location_id,
            Location.warehouse_id == data.destination_warehouse_id,
        ).first()
        if not dest_loc:
            raise ValueError("Destination location does not belong to specified destination warehouse")

        if data.source_location_id == data.destination_location_id:
            raise ValueError("Source location and destination location must be different")

        transfer_number = data.transfer_number or TransferService._generate_transfer_number(db, organization_id)

        transfer = Transfer(
            id=uuid.uuid4(),
            organization_id=organization_id,
            transfer_number=transfer_number,
            source_warehouse_id=data.source_warehouse_id,
            source_location_id=data.source_location_id,
            destination_warehouse_id=data.destination_warehouse_id,
            destination_location_id=data.destination_location_id,
            status="REQUESTED",
            reason=data.reason,
            notes=data.notes,
            requested_by=user_id,
            version=1,
        )
        db.add(transfer)

        for line_data in data.lines:
            product = db.query(Product).filter(
                Product.id == line_data.product_id,
                Product.organization_id == organization_id,
            ).first()
            if not product:
                raise ValueError(f"Product {line_data.product_id} not found or access denied")

            line = TransferLine(
                id=uuid.uuid4(),
                transfer_id=transfer.id,
                product_id=line_data.product_id,
                quantity=line_data.quantity,
            )
            db.add(line)

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CREATE",
            entity_type="TRANSFER",
            entity_id=str(transfer.id),
            before_state=None,
            after_state={"transfer_number": transfer_number, "status": "REQUESTED"},
        )
        db.add(audit)

        db.commit()
        db.refresh(transfer)
        return transfer

    @staticmethod
    def approve_transfer(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        transfer_id: uuid.UUID,
        version: Optional[int] = None,
    ) -> Transfer:
        transfer = TransferService.get_transfer_by_id(db, organization_id, transfer_id)
        if not transfer:
            raise ValueError("Transfer not found")
        if transfer.status != "REQUESTED":
            raise ValueError(f"Cannot approve transfer in {transfer.status} status")

        if version is not None and version != transfer.version:
            raise ValueError("Version conflict: transfer was modified by another user")

        transfer.status = "APPROVED"
        transfer.approved_by = user_id
        transfer.version += 1

        db.commit()
        db.refresh(transfer)
        return transfer

    @staticmethod
    def execute_transfer(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        transfer_id: uuid.UUID,
        version: Optional[int] = None,
    ) -> Transfer:
        """
        Executes internal stock movement:
        - Locks source and destination stock positions FOR UPDATE
        - Decreases source location stock
        - Increases destination location stock
        - Total inventory count stays constant
        - Creates 2 immutable ledger entries: TRANSFER_OUT and TRANSFER_IN
        """
        transfer = db.query(Transfer).filter(
            Transfer.id == transfer_id,
            Transfer.organization_id == organization_id,
        ).first()
        if not transfer:
            raise ValueError("Transfer not found")
        if transfer.status == "DONE":
            raise ValueError("Transfer has already been executed")
        if transfer.status == "CANCELLED":
            raise ValueError("Cannot execute a cancelled transfer")

        if version is not None and version != transfer.version:
            raise ValueError("Version conflict: transfer was modified by another user")

        for line in transfer.lines:
            # 1. Lock and validate source position
            src_pos = db.query(StockPosition).filter(
                StockPosition.product_id == line.product_id,
                StockPosition.location_id == transfer.source_location_id,
            ).with_for_update().first()

            available = (src_pos.quantity - src_pos.reserved_quantity) if src_pos else Decimal("0")
            if available < line.quantity:
                prod = db.query(Product).filter(Product.id == line.product_id).first()
                sku = prod.sku if prod else str(line.product_id)
                raise ValueError(
                    f"Insufficient stock for product {sku} at source location. Available: {available}, Required: {line.quantity}"
                )

            src_before = src_pos.quantity
            src_pos.quantity -= line.quantity
            src_after = src_pos.quantity

            # 2. Lock and update destination position
            dest_pos = db.query(StockPosition).filter(
                StockPosition.product_id == line.product_id,
                StockPosition.location_id == transfer.destination_location_id,
            ).with_for_update().first()

            if dest_pos:
                dest_before = dest_pos.quantity
                dest_pos.quantity += line.quantity
                dest_after = dest_pos.quantity
            else:
                dest_before = Decimal("0")
                dest_pos = StockPosition(
                    id=uuid.uuid4(),
                    product_id=line.product_id,
                    location_id=transfer.destination_location_id,
                    quantity=line.quantity,
                    reserved_quantity=Decimal("0"),
                )
                db.add(dest_pos)
                dest_after = line.quantity

            # 3. Create immutable ledger entries for both legs
            ledger_out = StockLedgerEntry(
                id=uuid.uuid4(),
                organization_id=organization_id,
                product_id=line.product_id,
                location_id=transfer.source_location_id,
                transaction_type="TRANSFER_OUT",
                reference_type="TRANSFER",
                reference_id=transfer.transfer_number,
                quantity_delta=-line.quantity,
                quantity_before=src_before,
                quantity_after=src_after,
                created_by=user_id,
                metadata_={
                    "transfer_id": str(transfer.id),
                    "destination_location_id": str(transfer.destination_location_id),
                },
            )
            db.add(ledger_out)

            ledger_in = StockLedgerEntry(
                id=uuid.uuid4(),
                organization_id=organization_id,
                product_id=line.product_id,
                location_id=transfer.destination_location_id,
                transaction_type="TRANSFER_IN",
                reference_type="TRANSFER",
                reference_id=transfer.transfer_number,
                quantity_delta=line.quantity,
                quantity_before=dest_before,
                quantity_after=dest_after,
                created_by=user_id,
                metadata_={
                    "transfer_id": str(transfer.id),
                    "source_location_id": str(transfer.source_location_id),
                },
            )
            db.add(ledger_in)

        transfer.status = "DONE"
        transfer.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="EXECUTE",
            entity_type="TRANSFER",
            entity_id=str(transfer.id),
            before_state={"status": transfer.status},
            after_state={"status": "DONE", "transfer_number": transfer.transfer_number},
        )
        db.add(audit)

        db.commit()
        db.refresh(transfer)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(
                    manager.broadcast_to_org(
                        str(organization_id),
                        {
                            "event": "TRANSFER_COMPLETED",
                            "transfer_number": transfer.transfer_number,
                            "status": "DONE",
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                )
        except Exception:
            pass

        return transfer

    @staticmethod
    def cancel_transfer(
        db: Session,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        transfer_id: uuid.UUID,
    ) -> Transfer:
        transfer = TransferService.get_transfer_by_id(db, organization_id, transfer_id)
        if not transfer:
            raise ValueError("Transfer not found")
        if transfer.status == "DONE":
            raise ValueError("Cannot cancel an executed transfer")
        if transfer.status == "CANCELLED":
            return transfer

        transfer.status = "CANCELLED"
        transfer.version += 1

        audit = AuditEvent(
            id=uuid.uuid4(),
            organization_id=organization_id,
            actor_user_id=user_id,
            action="CANCEL",
            entity_type="TRANSFER",
            entity_id=str(transfer.id),
            before_state={"status": transfer.status},
            after_state={"status": "CANCELLED"},
        )
        db.add(audit)

        db.commit()
        db.refresh(transfer)
        return transfer
