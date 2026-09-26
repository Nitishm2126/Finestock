import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from sqlalchemy import (
    String,
    Integer,
    Numeric,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
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


class Adjustment(Base):
    __tablename__ = "adjustments"

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
    adjustment_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    location_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("locations.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    system_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    physical_count: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    difference: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        nullable=False,
    )
    reason: Mapped[str] = mapped_column(
        String(50),
        default="COUNT_CORRECTION",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(30),
        default="DRAFT",
        nullable=False,
        index=True,
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
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
    location: Mapped["Location"] = relationship("Location")
    product: Mapped["Product"] = relationship("Product")
    requester: Mapped[Optional["User"]] = relationship("User", foreign_keys=[requested_by])
    approver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[approved_by])

    __table_args__ = (
        UniqueConstraint("organization_id", "adjustment_number", name="uq_adjustments_org_number"),
    )

    def __repr__(self) -> str:
        return f"<Adjustment {self.adjustment_number} status={self.status} diff={self.difference}>"
