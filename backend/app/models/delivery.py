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


class DeliveryOrder(Base):
    __tablename__ = "delivery_orders"

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
    delivery_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
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
    status: Mapped[str] = mapped_column(String(30), default="DRAFT", nullable=False, index=True)
    scheduled_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    priority: Mapped[str] = mapped_column(String(20), default="NORMAL", nullable=False)
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
    warehouse: Mapped["Warehouse"] = relationship("Warehouse")
    source_location: Mapped["Location"] = relationship("Location", foreign_keys=[source_location_id])
    creator: Mapped[Optional["User"]] = relationship("User")
    lines: Mapped[List["DeliveryOrderLine"]] = relationship(
        "DeliveryOrderLine",
        back_populates="delivery",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint("organization_id", "delivery_number", name="uq_delivery_orders_org_number"),
    )

    def __repr__(self) -> str:
        return f"<DeliveryOrder {self.delivery_number} status={self.status}>"


class DeliveryOrderLine(Base):
    __tablename__ = "delivery_order_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    delivery_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delivery_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    requested_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    picked_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    packed_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    delivered_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    source_location_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="SET NULL"),
        nullable=True,
    )

    delivery: Mapped["DeliveryOrder"] = relationship("DeliveryOrder", back_populates="lines")
    product: Mapped["Product"] = relationship("Product")
    source_location: Mapped[Optional["Location"]] = relationship("Location")

    __table_args__ = (
        CheckConstraint("requested_quantity >= 0", name="ck_delivery_lines_requested_pos"),
        CheckConstraint("reserved_quantity >= 0", name="ck_delivery_lines_reserved_pos"),
        CheckConstraint("picked_quantity >= 0", name="ck_delivery_lines_picked_pos"),
        CheckConstraint("packed_quantity >= 0", name="ck_delivery_lines_packed_pos"),
        CheckConstraint("delivered_quantity >= 0", name="ck_delivery_lines_delivered_pos"),
    )
