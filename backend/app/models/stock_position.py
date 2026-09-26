import uuid
from datetime import datetime
from decimal import Decimal
from typing import TYPE_CHECKING
from sqlalchemy import (
    Numeric,
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
    from app.models.product import Product
    from app.models.location import Location


class StockPosition(Base):
    __tablename__ = "stock_positions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
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
    quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
    reserved_quantity: Mapped[Decimal] = mapped_column(
        Numeric(14, 4),
        default=Decimal("0.0000"),
        nullable=False,
    )
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
    product: Mapped["Product"] = relationship("Product", back_populates="stock_positions")
    location: Mapped["Location"] = relationship("Location", back_populates="stock_positions")

    __table_args__ = (
        UniqueConstraint("product_id", "location_id", name="uq_stock_positions_product_location"),
        CheckConstraint("quantity >= 0", name="ck_stock_positions_quantity_positive"),
        CheckConstraint("reserved_quantity >= 0", name="ck_stock_positions_reserved_positive"),
        CheckConstraint(
            "reserved_quantity <= quantity",
            name="ck_stock_positions_reserved_lte_quantity",
        ),
    )

    def __repr__(self) -> str:
        return f"<StockPosition id={self.id} product_id={self.product_id} location_id={self.location_id} qty={self.quantity}>"
