import uuid
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import (
    String,
    Boolean,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base

if TYPE_CHECKING:
    from app.models.warehouse import Warehouse
    from app.models.stock_position import StockPosition


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    warehouse_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("warehouses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    zone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    location_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False, index=True)
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
    warehouse: Mapped["Warehouse"] = relationship("Warehouse", back_populates="locations")
    stock_positions: Mapped[List["StockPosition"]] = relationship(
        "StockPosition", back_populates="location", cascade="all, delete-orphan"
    )

    __table_args__ = (
        UniqueConstraint("warehouse_id", "code", name="uq_locations_warehouse_code"),
        Index("ix_locations_wh_active", "warehouse_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Location id={self.id} code={self.code} warehouse_id={self.warehouse_id}>"
