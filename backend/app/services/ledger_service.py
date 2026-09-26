import uuid
from decimal import Decimal
from typing import Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.stock_ledger_entry import StockLedgerEntry
from app.models.stock_position import StockPosition
from app.models.product import Product
from app.models.location import Location
from app.models.warehouse import Warehouse

class LedgerService:
    @staticmethod
    def record_stock_event(
        db: Session,
        organization_id: uuid.UUID,
        product_id: uuid.UUID,
        location_id: uuid.UUID,
        quantity_delta: Decimal,
        transaction_type: str,
        user_id: Optional[uuid.UUID] = None,
        reference_type: Optional[str] = None,
        reference_id: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> StockLedgerEntry:
        """
        Records an immutable stock event and updates the current stock position.
        This must be called within an existing database transaction.
        """
        
        # 1. Verify product and location belong to the organization
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.organization_id == organization_id
        ).with_for_update().first()
        if not product:
            raise ValueError("Product not found or access denied")
            
        location = db.query(Location).join(Warehouse).filter(
            Location.id == location_id,
            Warehouse.organization_id == organization_id
        ).first()
        if not location:
            raise ValueError("Location not found or access denied")

        # 2. Get or create stock position
        position = db.query(StockPosition).filter(
            StockPosition.product_id == product_id,
            StockPosition.location_id == location_id
        ).with_for_update().first()
        
        if position:
            quantity_before = position.quantity
            position.quantity += quantity_delta
        else:
            quantity_before = Decimal("0")
            position = StockPosition(
                id=uuid.uuid4(),
                product_id=product_id,
                location_id=location_id,
                quantity=quantity_delta,
                reserved_quantity=Decimal("0"),
            )
            db.add(position)
            
        quantity_after = position.quantity
        
        if quantity_after < 0:
            raise ValueError(f"Insufficient stock for product {product.sku} at location {location.code}")

        # 3. Create immutable ledger entry
        entry = StockLedgerEntry(
            id=uuid.uuid4(),
            organization_id=organization_id,
            product_id=product_id,
            location_id=location_id,
            transaction_type=transaction_type,
            reference_type=reference_type,
            reference_id=reference_id,
            quantity_delta=quantity_delta,
            quantity_before=quantity_before,
            quantity_after=quantity_after,
            created_by=user_id,
            metadata_=metadata,
        )
        db.add(entry)
        
        # Flush to ensure everything is written in this transaction
        db.flush()
        
        return entry
