import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, List
from sqlalchemy import (
    String,
    Integer,
    Numeric,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    CheckConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.organization import Organization
    from app.models.supplier import Supplier
    from app.models.warehouse import Warehouse
    from app.models.location import Location
    from app.models.user import User
    from app.models.product import Product


class Receipt(Base):
    __tablename__ = "receipts"

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
    receipt_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    supplier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False, index=True)
    expected_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reference_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    organization: Mapped["Organization"] = relationship("Organization")
    supplier: Mapped["Supplier"] = relationship("Supplier", back_populates="receipts")
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
    destination_location: Mapped["Location"] = relationship("Location", foreign_keys=[destination_location_id])
    creator: Mapped[Optional["User"]] = relationship("User")
    lines: Mapped[List["ReceiptLine"]] = relationship(
        "ReceiptLine",
        back_populates="receipt",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "receipt_number", name="uq_receipts_org_number"),
    )

    def __repr__(self) -> str:
        return f"<Receipt {self.receipt_number} status={self.status}>"


class ReceiptLine(Base):
    __tablename__ = "receipt_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    receipt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("receipts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    expected_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    received_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    destination_location_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )

    receipt: Mapped["Receipt"] = relationship("Receipt", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    destination_location: Mapped[Optional["Location"]] = relationship("Location")

    __table_args__ = (
        CheckConstraint("expected_quantity >= 0", name="ck_receipt_lines_expected_pos"),
        CheckConstraint("received_quantity >= 0", name="ck_receipt_lines_received_pos"),
    )
