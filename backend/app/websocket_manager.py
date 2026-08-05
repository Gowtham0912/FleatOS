"""
WebSocket connection manager.

Maintains a set of active WebSocket connections and provides
broadcast functionality for real-time location updates.
"""

import json
import logging
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages active WebSocket connections and broadcasts messages."""

    def __init__(self):
        # All currently connected dashboard clients
        self._active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self._active.append(websocket)
        logger.info(
            "WebSocket connected. Total connections: %d", len(self._active)
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection from the active list."""
        if websocket in self._active:
            self._active.remove(websocket)
        logger.info(
            "WebSocket disconnected. Total connections: %d", len(self._active)
        )

    async def broadcast(self, data: dict) -> None:
        """Send a JSON payload to all active connections."""
        # Serialize datetime objects to ISO strings
        message = json.dumps(data, default=_json_serializer)
        dead: list[WebSocket] = []

        for ws in self._active:
            try:
                await ws.send_text(message)
            except Exception as exc:
                logger.warning("Failed to send to client, removing: %s", exc)
                dead.append(ws)

        # Clean up dead connections
        for ws in dead:
            self.disconnect(ws)

    @property
    def connection_count(self) -> int:
        return len(self._active)


def _json_serializer(obj):
    """Custom JSON serializer for types not handled by default."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj)} is not JSON serializable")


# Module-level singleton shared across the entire application
manager = ConnectionManager()
