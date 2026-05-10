"""
Real-time Event Service using Server-Sent Events (SSE)
Provides live updates between Admin Dashboard and Technician App
Supports Redis Pub/Sub for multi-instance synchronization
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, Request, Query
from fastapi.responses import StreamingResponse
from collections import defaultdict

from auth import get_current_user, get_current_user_from_token
from dependencies import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/events", tags=["Real-time Events"])

# Store active SSE connections by entreprise_id
# Format: {entreprise_id: {user_id: queue}}
active_connections: Dict[str, Dict[str, asyncio.Queue]] = defaultdict(dict)

# Redis pub/sub channel prefix
REDIS_CHANNEL_PREFIX = "actoos:events:"


class EventType:
    """Event types for real-time sync"""
    INTERVENTION_CREATED = "intervention_created"
    INTERVENTION_UPDATED = "intervention_updated"
    INTERVENTION_STARTED = "intervention_started"
    INTERVENTION_COMPLETED = "intervention_completed"
    INTERVENTION_ASSIGNED = "intervention_assigned"
    INTERVENTION_CLAIMED = "intervention_claimed"
    DEVIS_CREATED = "devis_created"
    DEVIS_SIGNED = "devis_signed"
    FACTURE_CREATED = "facture_created"
    FACTURE_PAID = "facture_paid"
    CLIENT_CREATED = "client_created"
    SYNC_REQUIRED = "sync_required"
    CHAT_MESSAGE = "chat_message"


async def _handle_redis_event(event: dict):
    """Handle events received from Redis pub/sub"""
    entreprise_id = event.get("entreprise_id")
    if not entreprise_id or entreprise_id not in active_connections:
        return
    
    exclude_user_id = event.get("exclude_user_id")
    target_user_id = event.get("target_user_id")
    
    sse_event = {
        "type": event.get("type"),
        "data": event.get("data"),
        "timestamp": event.get("timestamp", datetime.now(timezone.utc).isoformat())
    }
    
    # Send to specific user or broadcast
    if target_user_id:
        if target_user_id in active_connections[entreprise_id]:
            try:
                await active_connections[entreprise_id][target_user_id].put(sse_event)
            except Exception as e:
                logger.warning(f"Failed to send event to user {target_user_id}: {e}")
    else:
        for user_id, queue in list(active_connections[entreprise_id].items()):
            if exclude_user_id and user_id == exclude_user_id:
                continue
            try:
                await queue.put(sse_event)
            except Exception as e:
                logger.warning(f"Failed to send event to user {user_id}: {e}")


# Initialize Redis subscription on startup
_redis_subscribed = False

async def _init_redis_subscription():
    """Initialize Redis pub/sub subscription"""
    global _redis_subscribed
    if _redis_subscribed:
        return
    
    try:
        from redis_service import subscribe_to_events, is_redis_available
        if is_redis_available():
            await subscribe_to_events(f"{REDIS_CHANNEL_PREFIX}*", _handle_redis_event)
            _redis_subscribed = True
            logger.info("Redis pub/sub subscription initialized for SSE")
    except Exception as e:
        logger.warning(f"Failed to initialize Redis subscription: {e}")


async def broadcast_event(
    entreprise_id: str,
    event_type: str,
    data: dict,
    exclude_user_id: str = None
):
    """
    Broadcast an event to all connected users of an entreprise
    Uses Redis pub/sub if available for multi-instance support
    
    Args:
        entreprise_id: The entreprise to broadcast to
        event_type: Type of event (from EventType)
        data: Event payload
        exclude_user_id: User ID to exclude (e.g., the one who triggered the event)
    """
    event = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entreprise_id": entreprise_id,
        "exclude_user_id": exclude_user_id
    }
    
    logger.info(f"Broadcasting {event_type} to entreprise {entreprise_id}")
    
    # Try to publish via Redis for multi-instance sync
    try:
        from redis_service import publish_event, is_redis_available
        if is_redis_available():
            await publish_event(f"{REDIS_CHANNEL_PREFIX}{entreprise_id}", event)
            return  # Redis will handle distribution
    except Exception as e:
        logger.warning(f"Redis publish failed, using local broadcast: {e}")
    
    # Fallback: local broadcast only
    if entreprise_id not in active_connections:
        return
    
    sse_event = {
        "type": event_type,
        "data": data,
        "timestamp": event["timestamp"]
    }
    
    for user_id, queue in list(active_connections[entreprise_id].items()):
        if exclude_user_id and user_id == exclude_user_id:
            continue
        try:
            await queue.put(sse_event)
        except Exception as e:
            logger.warning(f"Failed to send event to user {user_id}: {e}")


async def send_event_to_user(
    entreprise_id: str,
    user_id: str,
    event_type: str,
    data: dict
):
    """Send an event to a specific user (uses Redis if available)"""
    event = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "entreprise_id": entreprise_id,
        "target_user_id": user_id
    }
    
    # Try to publish via Redis for multi-instance sync
    try:
        from redis_service import publish_event, is_redis_available
        if is_redis_available():
            await publish_event(f"{REDIS_CHANNEL_PREFIX}{entreprise_id}", event)
            return
    except Exception as e:
        logger.warning(f"Redis publish failed, using local send: {e}")
    
    # Fallback: local send only
    if entreprise_id not in active_connections:
        return
    
    if user_id not in active_connections[entreprise_id]:
        return
    
    sse_event = {
        "type": event_type,
        "data": data,
        "timestamp": event["timestamp"]
    }
    
    try:
        await active_connections[entreprise_id][user_id].put(sse_event)
        logger.info(f"Sent {event_type} to user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to send event to user {user_id}: {e}")


async def event_generator(request: Request, entreprise_id: str, user_id: str):
    """Generate SSE events for a connected user"""
    queue = asyncio.Queue()
    active_connections[entreprise_id][user_id] = queue
    
    logger.info(f"SSE connection established for user {user_id} in entreprise {entreprise_id}")
    
    try:
        # Send initial connection confirmation
        yield f"event: connected\ndata: {json.dumps({'user_id': user_id, 'entreprise_id': entreprise_id})}\n\n"
        
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break
            
            try:
                # Wait for events with timeout to send keepalive
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"event: {event['type']}\ndata: {json.dumps(event)}\n\n"
            except asyncio.TimeoutError:
                # Send keepalive ping
                yield f"event: ping\ndata: {json.dumps({'timestamp': datetime.now(timezone.utc).isoformat()})}\n\n"
    except asyncio.CancelledError:
        pass
    finally:
        # Clean up connection
        if entreprise_id in active_connections and user_id in active_connections[entreprise_id]:
            del active_connections[entreprise_id][user_id]
            if not active_connections[entreprise_id]:
                del active_connections[entreprise_id]
        logger.info(f"SSE connection closed for user {user_id}")


@router.get("/stream")
async def event_stream(
    request: Request,
    token: str = Query(..., description="JWT token for authentication")
):
    """
    SSE endpoint for real-time events.
    
    Connect to receive live updates about:
    - Interventions (created, updated, started, completed, assigned, claimed)
    - Devis (created, signed)
    - Factures (created, paid)
    - Sync notifications
    
    Authentication via token query parameter (EventSource doesn't support headers).
    
    Example usage in frontend:
    ```javascript
    const eventSource = new EventSource('/api/events/stream?token=' + token);
    
    eventSource.addEventListener('intervention_updated', (e) => {
        const data = JSON.parse(e.data);
        console.log('Intervention updated:', data);
    });
    ```
    """
    # Authenticate user from token query parameter
    current_user = await get_current_user_from_token(token)
    
    return StreamingResponse(
        event_generator(request, current_user["entreprise_id"], current_user["user_id"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/connections")
async def get_active_connections(current_user: dict = Depends(get_current_user)):
    """Get count of active SSE connections for the entreprise (admin only)"""
    if current_user.get("role") != "admin":
        return {"count": 0, "users": []}
    
    entreprise_id = current_user["entreprise_id"]
    if entreprise_id not in active_connections:
        return {"count": 0, "users": []}
    
    return {
        "count": len(active_connections[entreprise_id]),
        "users": list(active_connections[entreprise_id].keys())
    }


# Helper functions to broadcast specific events

async def notify_intervention_change(
    entreprise_id: str,
    intervention: dict,
    event_type: str,
    exclude_user_id: str = None
):
    """Notify about an intervention change"""
    await broadcast_event(
        entreprise_id=entreprise_id,
        event_type=event_type,
        data={
            "intervention_id": intervention.get("id"),
            "titre": intervention.get("titre"),
            "statut": intervention.get("statut"),
            "technicien_id": intervention.get("technicien_id"),
            "client_id": intervention.get("client_id"),
            "date_prevue": intervention.get("date_prevue")
        },
        exclude_user_id=exclude_user_id
    )


async def notify_intervention_assigned_realtime(
    entreprise_id: str,
    intervention: dict,
    technicien_id: str
):
    """Notify a specific technician about assignment"""
    await send_event_to_user(
        entreprise_id=entreprise_id,
        user_id=technicien_id,
        event_type=EventType.INTERVENTION_ASSIGNED,
        data={
            "intervention_id": intervention.get("id"),
            "titre": intervention.get("titre"),
            "date_prevue": intervention.get("date_prevue"),
            "message": f"Vous avez été assigné à: {intervention.get('titre')}"
        }
    )


async def notify_sync_required(entreprise_id: str, reason: str = None):
    """Notify all users to refresh their data"""
    await broadcast_event(
        entreprise_id=entreprise_id,
        event_type=EventType.SYNC_REQUIRED,
        data={"reason": reason or "Données mises à jour"}
    )
