"""
Communication Logging Service
Tracks all emails and SMS sent to clients
"""
import logging
from datetime import datetime, timezone
from typing import Optional
import uuid

logger = logging.getLogger(__name__)

# This will be set by server.py when it initializes
db = None

def set_db(database):
    """Set the database reference"""
    global db
    db = database

async def log_communication(
    entreprise_id: str,
    client_id: str,
    comm_type: str,  # "email" or "sms"
    recipient: str,
    subject: Optional[str] = None,
    content_preview: Optional[str] = None,
    status: str = "sent",
    error_message: Optional[str] = None,
    related_entity: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    sent_by: Optional[str] = None
):
    """Log a communication (email or SMS) to the database"""
    if db is None:
        logger.warning("Database not initialized, skipping communication log")
        return None
    
    try:
        comm_doc = {
            "id": str(uuid.uuid4()),
            "entreprise_id": entreprise_id,
            "client_id": client_id,
            "type": comm_type,
            "direction": "outgoing",
            "subject": subject,
            "recipient": recipient,
            "content_preview": content_preview[:200] if content_preview else None,
            "status": status,
            "error_message": error_message,
            "related_entity": related_entity,
            "related_entity_id": related_entity_id,
            "sent_by": sent_by,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.communications.insert_one(comm_doc)
        logger.info(f"Logged {comm_type} to {recipient} (status: {status})")
        return comm_doc["id"]
        
    except Exception as e:
        logger.error(f"Failed to log communication: {e}")
        return None


async def log_email(
    entreprise_id: str,
    client_id: str,
    recipient_email: str,
    subject: str,
    content_preview: Optional[str] = None,
    status: str = "sent",
    error_message: Optional[str] = None,
    related_entity: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    sent_by: Optional[str] = None
):
    """Convenience function to log an email"""
    return await log_communication(
        entreprise_id=entreprise_id,
        client_id=client_id,
        comm_type="email",
        recipient=recipient_email,
        subject=subject,
        content_preview=content_preview,
        status=status,
        error_message=error_message,
        related_entity=related_entity,
        related_entity_id=related_entity_id,
        sent_by=sent_by
    )


async def log_sms(
    entreprise_id: str,
    client_id: str,
    phone_number: str,
    message: str,
    status: str = "sent",
    error_message: Optional[str] = None,
    related_entity: Optional[str] = None,
    related_entity_id: Optional[str] = None,
    sent_by: Optional[str] = None
):
    """Convenience function to log an SMS"""
    return await log_communication(
        entreprise_id=entreprise_id,
        client_id=client_id,
        comm_type="sms",
        recipient=phone_number,
        subject=None,
        content_preview=message,
        status=status,
        error_message=error_message,
        related_entity=related_entity,
        related_entity_id=related_entity_id,
        sent_by=sent_by
    )


async def get_client_communications(
    entreprise_id: str,
    client_id: str,
    limit: int = 50,
    comm_type: Optional[str] = None
):
    """Get communication history for a specific client"""
    if db is None:
        return []
    
    query = {
        "entreprise_id": entreprise_id,
        "client_id": client_id
    }
    
    if comm_type:
        query["type"] = comm_type
    
    try:
        communications = await db.communications.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        
        return communications
    except Exception as e:
        logger.error(f"Failed to get communications: {e}")
        return []
