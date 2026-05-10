"""
Webhook delivery service - Sends webhook events to registered endpoints
"""
import aiohttp
import hashlib
import hmac
import json
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

async def send_webhook(
    db,
    webhook: dict,
    event_type: str,
    payload: dict,
    entreprise_id: str
) -> dict:
    """Send a webhook event to the registered URL"""
    delivery_id = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # Build the event payload
    event_data = {
        "event": event_type,
        "delivery_id": delivery_id,
        "timestamp": timestamp,
        "entreprise_id": entreprise_id,
        "data": payload
    }
    
    # Calculate HMAC signature if secret is set
    headers = {
        "Content-Type": "application/json",
        "X-Actoos-Event": event_type,
        "X-Actoos-Delivery": delivery_id,
        "X-Actoos-Timestamp": timestamp
    }
    
    if webhook.get("secret"):
        signature = hmac.new(
            webhook["secret"].encode(),
            json.dumps(event_data).encode(),
            hashlib.sha256
        ).hexdigest()
        headers["X-Actoos-Signature"] = f"sha256={signature}"
    
    # Log the delivery attempt
    delivery_log = {
        "id": delivery_id,
        "webhook_id": webhook["id"],
        "entreprise_id": entreprise_id,
        "event_type": event_type,
        "url": webhook["url"],
        "payload": event_data,
        "status": "pending",
        "created_at": timestamp
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                webhook["url"],
                json=event_data,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                status_code = response.status
                response_body = await response.text()
                
                # Update delivery log
                delivery_log["status"] = "success" if 200 <= status_code < 300 else "failed"
                delivery_log["response_status"] = status_code
                delivery_log["response_body"] = response_body[:500]  # Truncate
                delivery_log["completed_at"] = datetime.now(timezone.utc).isoformat()
                
                # Update webhook last_triggered and failure count
                update_data = {"last_triggered_at": timestamp}
                if delivery_log["status"] == "failed":
                    update_data["$inc"] = {"failure_count": 1}
                else:
                    update_data["failure_count"] = 0
                
                await db.webhooks.update_one(
                    {"id": webhook["id"]},
                    {"$set": {"last_triggered_at": timestamp, "failure_count": 0 if delivery_log["status"] == "success" else webhook.get("failure_count", 0) + 1}}
                )
                
                logger.info(f"Webhook delivered: {event_type} to {webhook['url']} - Status: {status_code}")
                
    except aiohttp.ClientError as e:
        delivery_log["status"] = "failed"
        delivery_log["error"] = str(e)
        delivery_log["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        # Increment failure count
        await db.webhooks.update_one(
            {"id": webhook["id"]},
            {"$set": {"last_triggered_at": timestamp}, "$inc": {"failure_count": 1}}
        )
        
        logger.error(f"Webhook delivery failed: {event_type} to {webhook['url']} - {e}")
    
    except Exception as e:
        delivery_log["status"] = "failed"
        delivery_log["error"] = str(e)
        delivery_log["completed_at"] = datetime.now(timezone.utc).isoformat()
        logger.error(f"Webhook delivery error: {e}")
    
    # Save delivery log
    await db.webhook_deliveries.insert_one(delivery_log)
    
    return delivery_log


async def trigger_webhooks(
    db,
    entreprise_id: str,
    event_type: str,
    payload: dict
):
    """Trigger all active webhooks for an event type"""
    # Find all active webhooks for this entreprise that listen to this event
    webhooks = await db.webhooks.find({
        "entreprise_id": entreprise_id,
        "is_active": True,
        "events": event_type,
        "failure_count": {"$lt": 10}  # Disable after 10 consecutive failures
    }, {"_id": 0}).to_list(100)
    
    results = []
    for webhook in webhooks:
        result = await send_webhook(db, webhook, event_type, payload, entreprise_id)
        results.append(result)
    
    return results


def create_event_payload(entity_type: str, entity: dict, action: str) -> dict:
    """Create a standardized webhook payload"""
    # Remove sensitive fields
    safe_entity = {k: v for k, v in entity.items() if k not in ['password_hash', 'token_client', 'secret']}
    
    return {
        "entity_type": entity_type,
        "action": action,
        "entity": safe_entity
    }
