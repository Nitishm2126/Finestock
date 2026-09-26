import json
import logging
from typing import Dict, List, Any
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Map organization_id (as str) to list of active WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, org_id: str):
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = []
        self.active_connections[org_id].append(websocket)
        logger.info(f"WebSocket client connected to org {org_id}. Total: {len(self.active_connections[org_id])}")

    def disconnect(self, websocket: WebSocket, org_id: str):
        if org_id in self.active_connections:
            if websocket in self.active_connections[org_id]:
                self.active_connections[org_id].remove(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]
        logger.info(f"WebSocket client disconnected from org {org_id}")

    async def broadcast_to_org(self, org_id: str, message: Dict[str, Any]):
        if org_id not in self.active_connections:
            return

        dead_connections = []
        payload_str = json.dumps(message, default=str)
        for connection in self.active_connections[org_id]:
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Error broadcasting to client in org {org_id}: {e}")
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead, org_id)

    async def broadcast_all(self, message: Dict[str, Any]):
        payload_str = json.dumps(message, default=str)
        for org_id, connections in list(self.active_connections.items()):
            dead_connections = []
            for connection in connections:
                try:
                    await connection.send_text(payload_str)
                except Exception:
                    dead_connections.append(connection)
            for dead in dead_connections:
                self.disconnect(dead, org_id)


manager = ConnectionManager()
