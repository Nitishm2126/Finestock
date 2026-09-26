import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, get_db
from app.core.security import decode_access_token
from app.core.realtime import manager
from app.models.user import User
from app.models.receipt import Receipt
from app.models.delivery import DeliveryOrder
from app.models.transfer import Transfer
from app.models.adjustment import Adjustment
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/realtime", tags=["Realtime"])


@router.websocket("/inventory")
async def websocket_inventory_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
):
    """
    Real-time inventory WebSocket endpoint.
    Client provides JWT in query param ?token=...
    Authenticates user and registers websocket to organization broadcast channel.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    user_id_str = payload.get("sub")
    if not user_id_str:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Check user in DB
    with SessionLocal() as db:
        user = db.query(User).filter(User.id == user_id_str).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        org_id = str(user.organization_id)

    await manager.connect(websocket, org_id)

    # Send initial connection confirmation
    await websocket.send_text(
        json.dumps({
            "event": "CONNECTED",
            "message": "Connected to FineStock Real-Time Inventory Control stream",
            "organization_id": org_id,
        })
    )

    try:
        while True:
            data = await websocket.receive_text()
            # Handle client heartbeat or pings
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"event": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, org_id)
    except Exception as e:
        logger.warning(f"WebSocket connection exception: {e}")
        manager.disconnect(websocket, org_id)


@router.get("/operations/live")
def get_live_operations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    org_id = current_user.organization_id

    # Active receipts (WAITING, PARTIAL)
    receipts = db.query(Receipt).filter(
        Receipt.organization_id == org_id,
        Receipt.status.in_(["WAITING", "PARTIAL", "DRAFT"]),
    ).order_by(Receipt.created_at.desc()).limit(10).all()

    # Active deliveries (WAITING, PICKING, PICKED, PACKING, PACKED, READY)
    deliveries = db.query(DeliveryOrder).filter(
        DeliveryOrder.organization_id == org_id,
        DeliveryOrder.status.in_(["WAITING", "PICKING", "PICKED", "PACKING", "READY"]),
    ).order_by(DeliveryOrder.created_at.desc()).limit(10).all()

    # Active transfers (REQUESTED, APPROVED, IN_TRANSIT)
    transfers = db.query(Transfer).filter(
        Transfer.organization_id == org_id,
        Transfer.status.in_(["REQUESTED", "APPROVED", "IN_TRANSIT"]),
    ).order_by(Transfer.created_at.desc()).limit(10).all()

    # Active adjustments (PENDING_APPROVAL)
    adjustments = db.query(Adjustment).filter(
        Adjustment.organization_id == org_id,
        Adjustment.status == "PENDING_APPROVAL",
    ).order_by(Adjustment.created_at.desc()).limit(10).all()

    live_operations = []

    for r in receipts:
        total_exp = sum(l.expected_quantity for l in r.lines)
        total_rec = sum(l.received_quantity for l in r.lines)
        progress = int((total_rec / total_exp * 100)) if total_exp > 0 else 0
        live_operations.append({
            "type": "RECEIPT",
            "document_number": r.receipt_number,
            "operator": "Warehouse Inbound",
            "warehouse_name": r.warehouse.name if r.warehouse else "Warehouse",
            "status": r.status,
            "progress": progress,
            "started_at": r.created_at.isoformat(),
            "updated_at": r.updated_at.isoformat(),
        })

    for d in deliveries:
        total_req = sum(l.requested_quantity for l in d.lines)
        total_picked = sum(l.picked_quantity for l in d.lines)
        progress = int((total_picked / total_req * 100)) if total_req > 0 else 0
        live_operations.append({
            "type": "DELIVERY",
            "document_number": d.delivery_number,
            "operator": d.customer_name,
            "warehouse_name": d.warehouse.name if d.warehouse else "Warehouse",
            "status": d.status,
            "progress": progress,
            "started_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
        })

    for t in transfers:
        live_operations.append({
            "type": "TRANSFER",
            "document_number": t.transfer_number,
            "operator": "Internal Logistics",
            "warehouse_name": f"{t.source_warehouse.name if t.source_warehouse else 'WH'} → {t.destination_warehouse.name if t.destination_warehouse else 'WH'}",
            "status": t.status,
            "progress": 50 if t.status == "APPROVED" else 20,
            "started_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
        })

    for a in adjustments:
        live_operations.append({
            "type": "ADJUSTMENT",
            "document_number": a.adjustment_number,
            "operator": "Inventory Auditor",
            "warehouse_name": a.warehouse.name if a.warehouse else "Warehouse",
            "status": a.status,
            "progress": 50,
            "started_at": a.created_at.isoformat(),
            "updated_at": a.updated_at.isoformat(),
        })

    return {
        "active_count": len(live_operations),
        "operations": live_operations,
    }
