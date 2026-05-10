"""
Push notification routes
"""
from fastapi import APIRouter, HTTPException, Depends
import logging

from auth import get_current_user
from dependencies import db
from push_service import get_vapid_public_key, send_push_to_users

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.get("/vapid-key")
async def get_push_vapid_key():
    """Get the VAPID public key for push subscription"""
    return {"publicKey": get_vapid_public_key()}


@router.post("/subscribe")
async def subscribe_to_push(subscription: dict, current_user: dict = Depends(get_current_user)):
    """Subscribe current user to push notifications"""
    if not subscription or not subscription.get("endpoint"):
        raise HTTPException(status_code=400, detail="Invalid subscription")
    
    # Check if subscription already exists
    user = await db.users.find_one(
        {"id": current_user["user_id"]},
        {"_id": 0, "push_subscriptions": 1}
    )
    
    existing_subscriptions = user.get("push_subscriptions", []) if user else []
    
    # Check if this endpoint already exists
    for sub in existing_subscriptions:
        if sub.get("endpoint") == subscription.get("endpoint"):
            return {"message": "Already subscribed", "subscribed": True}
    
    # Add new subscription
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$push": {"push_subscriptions": subscription}}
    )
    
    logger.info(f"User {current_user['user_id']} subscribed to push notifications")
    return {"message": "Successfully subscribed", "subscribed": True}


@router.delete("/unsubscribe")
async def unsubscribe_from_push(endpoint: str, current_user: dict = Depends(get_current_user)):
    """Unsubscribe from push notifications"""
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$pull": {"push_subscriptions": {"endpoint": endpoint}}}
    )
    return {"message": "Successfully unsubscribed"}


@router.get("/status")
async def get_push_status(current_user: dict = Depends(get_current_user)):
    """Get push notification status for current user"""
    user = await db.users.find_one(
        {"id": current_user["user_id"]},
        {"_id": 0, "push_subscriptions": 1}
    )
    
    subscriptions = user.get("push_subscriptions", []) if user else []
    return {
        "subscribed": len(subscriptions) > 0,
        "subscription_count": len(subscriptions)
    }


@router.post("/test")
async def send_test_push(current_user: dict = Depends(get_current_user)):
    """Send a test push notification to current user"""
    result = await send_push_to_users(
        db=db,
        user_ids=[current_user["user_id"]],
        title="🔔 Test notification",
        body="Les notifications push fonctionnent correctement !",
        url="/tech"
    )
    
    if result["sent"] == 0:
        raise HTTPException(status_code=400, detail="Aucune notification envoyée. Vérifiez que vous êtes abonné aux notifications.")
    
    return {"message": "Test notification sent", "result": result}
