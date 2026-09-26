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
    from app.models.warehouse import Warehouse
    from app.models.location import Location
    from app.models.user import User
    from app.models.product import Product


class Transfer(Base):
    __tablename__ = "transfers"

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
    transfer_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    source_warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    source_location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    destination_warehouse_id: Mapped[uuid.UUID] = mapped_column(
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
    reason: Mapped[str] = mapped_column(String(255), default="Internal Transfer", nullable=False)
    requested_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    approved_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    source_warehouse: Mapped["Warehouse"] = relationship("Warehouse", foreign_keys=[source_warehouse_id])
    destination_warehouse: Mapped["Warehouse"] = relationship("Warehouse", foreign_keys=[destination_warehouse_id])
    source_location: Mapped["Location"] = relationship("Location", foreign_keys=[source_location_id])
    destination_location: Mapped["Location"] = relationship("Location", foreign_keys=[destination_location_id])
    requester: Mapped[Optional["User"]] = relationship("User", foreign_keys=[requested_by])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])
    lines: Mapped[List["TransferLine"]] = relationship(
        "TransferLine",
        back_populates="transfer",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "transfer_number", name="uq_transfers_org_number"),
    )

    def __repr__(self) -> str:
        return f"<Transfer {self.transfer_number} status={self.status}>"


class TransferLine(Base):
    __tablename__ = "transfer_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    transfer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("transfers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )

    transfer: Mapped["Transfer"] = relationship("Transfer", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_transfer_lines_quantity_pos"),
    )
