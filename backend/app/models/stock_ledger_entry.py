import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, Any
from sqlalchemy import (
    String,
    Numeric,
    DateTime,
    ForeignKey,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base


class StockLedgerEntry(Base):
    __tablename__ = "stock_ledger_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transaction_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    reference_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    reference_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    
    quantity_delta: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    quantity_before: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    quantity_after: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    metadata_: Mapped[Optional[dict[str, Any]]] = mapped_column("metadata", JSONB, nullable=True)

    __table_args__ = (
        Index("ix_stock_ledger_org_prod_loc", "organization_id", "product_id", "location_id"),
    )

    def __repr__(self) -> str:
        return f"<StockLedgerEntry id={self.id} delta={self.quantity_delta}>"
