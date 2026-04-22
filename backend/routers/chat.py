"""
Chat routes - Real-time messaging between Admin and Technicians
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc
from realtime_events import broadcast_event, send_event_to_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat"])


class MessageCreate(BaseModel):
    """Message creation model"""
    recipient_id: Optional[str] = None  # None = broadcast to all techs
    content: str
    intervention_id: Optional[str] = None  # Link to intervention if relevant


class MessageResponse(BaseModel):
    """Message response model"""
    id: str
    sender_id: str
    sender_name: str
    sender_role: str
    recipient_id: Optional[str]
    content: str
    intervention_id: Optional[str]
    read: bool
    created_at: str


@router.get("/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    """
    Get list of conversations for the current user.
    - Admin: sees all techs they've messaged + unread messages
    - Tech: sees conversation with admin
    """
    user_id = current_user["user_id"]
    entreprise_id = current_user["entreprise_id"]
    is_admin = current_user.get("role") == "admin"
    
    if is_admin:
        # Get all technicians with their last message and unread count
        techs = await db.users.find(
            {"entreprise_id": entreprise_id, "role": "tech", "actif": True},
            {"_id": 0, "id": 1, "prenom": 1, "nom": 1, "email": 1}
        ).to_list(100)
        
        conversations = []
        for tech in techs:
            # Get last message and unread count
            last_message = await db.chat_messages.find_one(
                {
                    "entreprise_id": entreprise_id,
                    "$or": [
                        {"sender_id": user_id, "recipient_id": tech["id"]},
                        {"sender_id": tech["id"], "recipient_id": user_id},
                        {"sender_id": tech["id"], "recipient_id": None}  # Broadcast from tech
                    ]
                },
                {"_id": 0}
            )
            
            unread_count = await db.chat_messages.count_documents({
                "entreprise_id": entreprise_id,
                "sender_id": tech["id"],
                "recipient_id": {"$in": [user_id, None]},
                "read": False
            })
            
            conversations.append({
                "user_id": tech["id"],
                "user_name": f"{tech.get('prenom', '')} {tech.get('nom', '')}".strip() or tech.get("email", ""),
                "role": "tech",
                "last_message": last_message.get("content", "") if last_message else None,
                "last_message_at": last_message.get("created_at") if last_message else None,
                "unread_count": unread_count
            })
        
        # Sort by last message time (most recent first)
        conversations.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)
        return conversations
    else:
        # Tech sees conversation with admin
        admin = await db.users.find_one(
            {"entreprise_id": entreprise_id, "role": "admin"},
            {"_id": 0, "id": 1, "prenom": 1, "nom": 1, "email": 1}
        )
        
        if not admin:
            return []
        
        # Get last message
        last_message = await db.chat_messages.find_one(
            {
                "entreprise_id": entreprise_id,
                "$or": [
                    {"sender_id": user_id},
                    {"recipient_id": user_id},
                    {"recipient_id": None}  # Broadcast messages
                ]
            },
            {"_id": 0}
        )
        
        unread_count = await db.chat_messages.count_documents({
            "entreprise_id": entreprise_id,
            "sender_id": admin["id"],
            "recipient_id": {"$in": [user_id, None]},
            "read": False
        })
        
        return [{
            "user_id": admin["id"],
            "user_name": f"{admin.get('prenom', '')} {admin.get('nom', '')}".strip() or "Administrateur",
            "role": "admin",
            "last_message": last_message.get("content", "") if last_message else None,
            "last_message_at": last_message.get("created_at") if last_message else None,
            "unread_count": unread_count
        }]


@router.get("/messages/{conversation_user_id}")
async def get_messages(
    conversation_user_id: str,
    limit: int = 50,
    before: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get messages between current user and another user.
    Also includes broadcast messages.
    """
    user_id = current_user["user_id"]
    entreprise_id = current_user["entreprise_id"]
    
    query = {
        "entreprise_id": entreprise_id,
        "$or": [
            {"sender_id": user_id, "recipient_id": conversation_user_id},
            {"sender_id": conversation_user_id, "recipient_id": user_id},
            {"sender_id": conversation_user_id, "recipient_id": None},  # Broadcasts from other user
            {"sender_id": user_id, "recipient_id": None}  # Broadcasts from current user
        ]
    }
    
    if before:
        query["created_at"] = {"$lt": before}
    
    messages = await db.chat_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Mark messages as read
    await db.chat_messages.update_many(
        {
            "entreprise_id": entreprise_id,
            "sender_id": conversation_user_id,
            "recipient_id": {"$in": [user_id, None]},
            "read": False
        },
        {"$set": {"read": True}}
    )
    
    # Reverse to show oldest first
    messages.reverse()
    
    return [serialize_doc(m) for m in messages]


@router.post("/messages")
async def send_message(
    data: MessageCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """
    Send a message to a specific user or broadcast to all techs.
    
    - Admin can send to specific tech or broadcast (recipient_id=None)
    - Tech can send to admin or broadcast (recipient_id=None)
    """
    user_id = current_user["user_id"]
    entreprise_id = current_user["entreprise_id"]
    
    # Get sender info
    sender = await db.users.find_one({"id": user_id}, {"_id": 0, "prenom": 1, "nom": 1, "role": 1})
    sender_name = f"{sender.get('prenom', '')} {sender.get('nom', '')}".strip() if sender else "Utilisateur"
    sender_role = sender.get("role", "tech") if sender else "tech"
    
    # Validate recipient if specified
    if data.recipient_id:
        recipient = await db.users.find_one(
            {"id": data.recipient_id, "entreprise_id": entreprise_id},
            {"_id": 0, "id": 1}
        )
        if not recipient:
            raise HTTPException(status_code=404, detail="Destinataire non trouvé")
    
    # Create message
    now = datetime.now(timezone.utc).isoformat()
    message = {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "sender_id": user_id,
        "sender_name": sender_name,
        "sender_role": sender_role,
        "recipient_id": data.recipient_id,  # None for broadcast
        "content": data.content,
        "intervention_id": data.intervention_id,
        "read": False,
        "created_at": now
    }
    
    await db.chat_messages.insert_one(message)
    
    # Send real-time notification
    event_data = {
        "message_id": message["id"],
        "sender_id": user_id,
        "sender_name": sender_name,
        "content": data.content[:100],  # Preview
        "intervention_id": data.intervention_id
    }
    
    if data.recipient_id:
        # Send to specific user
        background_tasks.add_task(
            send_event_to_user,
            entreprise_id,
            data.recipient_id,
            "chat_message",
            event_data
        )
    else:
        # Broadcast to all in entreprise
        background_tasks.add_task(
            broadcast_event,
            entreprise_id,
            "chat_message",
            event_data,
            user_id  # Exclude sender
        )
    
    return serialize_doc(message)


@router.get("/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Get total unread message count for the current user"""
    user_id = current_user["user_id"]
    entreprise_id = current_user["entreprise_id"]
    
    count = await db.chat_messages.count_documents({
        "entreprise_id": entreprise_id,
        "recipient_id": {"$in": [user_id, None]},
        "sender_id": {"$ne": user_id},
        "read": False
    })
    
    return {"unread_count": count}


@router.post("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a specific message as read"""
    result = await db.chat_messages.update_one(
        {
            "id": message_id,
            "entreprise_id": current_user["entreprise_id"],
            "recipient_id": {"$in": [current_user["user_id"], None]}
        },
        {"$set": {"read": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message non trouvé")
    
    return {"success": True}
