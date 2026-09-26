import uuid
from typing import List, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.operational_alert import OperationalAlert
from app.models.product import Product
from app.models.stock_position import StockPosition
from app.models.adjustment import Adjustment


class AlertService:
    @staticmethod
    def get_alerts(
        db: Session,
        organization_id: uuid.UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[OperationalAlert], int]:
        # 1. Fetch persistent operational alerts
        alerts = db.query(OperationalAlert).filter(
            OperationalAlert.organization_id == organization_id,
            OperationalAlert.is_acknowledged == False,
        ).order_by(OperationalAlert.created_at.desc()).offset(skip).limit(limit).all()

        total = db.query(OperationalAlert).filter(
            OperationalAlert.organization_id == organization_id,
            OperationalAlert.is_acknowledged == False,
        ).count()

        # If few alerts, also synthesize active low stock / out of stock alerts
        if not alerts:
            # Check products with low stock
            products = db.query(Product).filter(
                Product.organization_id == organization_id,
                Product.is_active == True,
            ).all()

            for p in products:
                # Calculate total available stock across locations
                positions = db.query(StockPosition).filter(StockPosition.product_id == p.id).all()
                total_qty = sum(pos.quantity for pos in positions) if positions else Decimal("0")
                total_res = sum(pos.reserved_quantity for pos in positions) if positions else Decimal("0")
                available = total_qty - total_res

                if available <= 0:
                    alert = OperationalAlert(
                        id=uuid.uuid4(),
                        organization_id=organization_id,
                        alert_type="OUT_OF_STOCK",
                        severity="CRITICAL",
                        title=f"Out of Stock: {p.name}",
                        message=f"Product {p.sku} has 0 units available across all locations.",
                        reference_type="PRODUCT",
                        reference_id=str(p.id),
                        is_acknowledged=False,
                    )
                    alerts.append(alert)
                elif available <= p.reorder_point:
                    alert = OperationalAlert(
                        id=uuid.uuid4(),
                        organization_id=organization_id,
                        alert_type="LOW_STOCK",
                        severity="WARNING",
                        title=f"Low Stock: {p.name}",
                        message=f"Product {p.sku} has {available} units available (Reorder point: {p.reorder_point}).",
                        reference_type="PRODUCT",
                        reference_id=str(p.id),
                        is_acknowledged=False,
                    )
                    alerts.append(alert)

            # Check pending adjustments
            pending_adj = db.query(Adjustment).filter(
                Adjustment.organization_id == organization_id,
                Adjustment.status == "PENDING_APPROVAL",
            ).all()
            for adj in pending_adj:
                alert = OperationalAlert(
                    id=uuid.uuid4(),
                    organization_id=organization_id,
                    alert_type="ADJUSTMENT_PENDING",
                    severity="INFO",
                    title=f"Pending Adjustment: {adj.adjustment_number}",
                    message=f"Adjustment for variance of {adj.difference} requires approval.",
                    reference_type="ADJUSTMENT",
                    reference_id=str(adj.id),
                    is_acknowledged=False,
                )
                alerts.append(alert)

            total = len(alerts)

        return alerts, total

    @staticmethod
    def acknowledge_alert(db: Session, organization_id: uuid.UUID, alert_id: uuid.UUID) -> bool:
        alert = db.query(OperationalAlert).filter(
            OperationalAlert.id == alert_id,
            OperationalAlert.organization_id == organization_id,
        ).first()
        if alert:
            alert.is_acknowledged = True
            db.commit()
            return True
        return False
