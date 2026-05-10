"""
Push Notification Service using Web Push
"""
import os
import json
import logging
from pywebpush import webpush, WebPushException

logger = logging.getLogger(__name__)

# VAPID keys for web push
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', 'BDEosOMy7hCZHnWBDqZu4tXgkG20SA8TPnpRVFKa9mDCjUBJeoNM9BZHTAbQWHjCtlnOHnLOZba7KiaBDH913mk')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', 'KzQjovJG3M3RJddeEfl-ZiLpalP9eNRjZhCV4DLN93M')
VAPID_CLAIMS = {
    "sub": "mailto:admin@actoos.fr"
}

def get_vapid_public_key() -> str:
    """Return the VAPID public key for client subscription"""
    return VAPID_PUBLIC_KEY

async def send_push_notification(
    subscription: dict,
    title: str,
    body: str,
    icon: str = "/actoos-favicon.png",
    url: str = None,
    tag: str = None,
    data: dict = None
) -> dict:
    """
    Send a push notification to a single subscription
    
    Args:
        subscription: Push subscription object with endpoint, keys (p256dh, auth)
        title: Notification title
        body: Notification body text
        icon: URL to notification icon
        url: URL to open when notification is clicked
        tag: Tag to replace existing notifications
        data: Additional data to send with notification
    
    Returns:
        dict with status and message
    """
    if not subscription or not subscription.get('endpoint'):
        return {"status": "error", "message": "Invalid subscription"}
    
    payload = {
        "title": title,
        "body": body,
        "icon": icon,
        "badge": "/actoos-favicon.png",
        "vibrate": [200, 100, 200],
        "requireInteraction": True
    }
    
    if url:
        payload["data"] = {"url": url}
    if tag:
        payload["tag"] = tag
    if data:
        payload["data"] = {**(payload.get("data") or {}), **data}
    
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims=VAPID_CLAIMS
        )
        logger.info(f"Push notification sent successfully to {subscription.get('endpoint', '')[:50]}...")
        return {"status": "success", "message": "Notification sent"}
    except WebPushException as e:
        logger.error(f"Push notification failed: {e}")
        # Handle expired subscriptions
        if e.response and e.response.status_code in [404, 410]:
            return {"status": "expired", "message": "Subscription expired", "should_remove": True}
        return {"status": "error", "message": str(e)}
    except Exception as e:
        logger.error(f"Push notification error: {e}")
        return {"status": "error", "message": str(e)}

async def send_push_to_users(
    db,
    user_ids: list,
    title: str,
    body: str,
    url: str = None,
    tag: str = None,
    data: dict = None
) -> dict:
    """
    Send push notification to multiple users
    
    Args:
        db: Database connection
        user_ids: List of user IDs to notify
        title: Notification title
        body: Notification body
        url: URL to open on click
        tag: Notification tag
        data: Additional data
    
    Returns:
        dict with success/failure counts
    """
    results = {"sent": 0, "failed": 0, "expired": 0}
    expired_subscriptions = []
    
    for user_id in user_ids:
        # Get user's push subscriptions
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "push_subscriptions": 1})
        if not user or not user.get("push_subscriptions"):
            continue
        
        for subscription in user.get("push_subscriptions", []):
            result = await send_push_notification(
                subscription=subscription,
                title=title,
                body=body,
                url=url,
                tag=tag,
                data=data
            )
            
            if result["status"] == "success":
                results["sent"] += 1
            elif result.get("should_remove"):
                results["expired"] += 1
                expired_subscriptions.append({"user_id": user_id, "endpoint": subscription.get("endpoint")})
            else:
                results["failed"] += 1
    
    # Remove expired subscriptions
    for expired in expired_subscriptions:
        await db.users.update_one(
            {"id": expired["user_id"]},
            {"$pull": {"push_subscriptions": {"endpoint": expired["endpoint"]}}}
        )
    
    return results

async def send_push_to_entreprise_techs(
    db,
    entreprise_id: str,
    title: str,
    body: str,
    url: str = None,
    tag: str = None,
    data: dict = None,
    exclude_user_id: str = None
) -> dict:
    """
    Send push notification to all technicians of an entreprise
    
    Args:
        db: Database connection
        entreprise_id: Entreprise ID
        title: Notification title
        body: Notification body
        url: URL to open on click
        tag: Notification tag
        data: Additional data
        exclude_user_id: User ID to exclude from notification
    
    Returns:
        dict with success/failure counts
    """
    # Find all techs for this entreprise with push subscriptions
    query = {
        "entreprise_id": entreprise_id,
        "role": "tech",
        "push_subscriptions": {"$exists": True, "$ne": []}
    }
    if exclude_user_id:
        query["id"] = {"$ne": exclude_user_id}
    
    techs = await db.users.find(query, {"_id": 0, "id": 1}).to_list(length=100)
    user_ids = [t["id"] for t in techs]
    
    if not user_ids:
        return {"sent": 0, "failed": 0, "expired": 0, "no_subscribers": True}
    
    return await send_push_to_users(
        db=db,
        user_ids=user_ids,
        title=title,
        body=body,
        url=url,
        tag=tag,
        data=data
    )

# Notification templates
async def notify_new_intervention_available(db, entreprise_id: str, intervention: dict):
    """Notify techs of a new available intervention"""
    return await send_push_to_entreprise_techs(
        db=db,
        entreprise_id=entreprise_id,
        title="🔔 Nouvelle mission disponible",
        body=f"{intervention.get('titre', 'Nouvelle intervention')} - Cliquez pour accepter",
        url="/tech",
        tag=f"new-intervention-{intervention.get('id')}",
        data={"type": "new_intervention", "intervention_id": intervention.get("id")}
    )

async def notify_new_intervention_available_to_techs(db, entreprise_id: str, intervention: dict, tech_ids: list):
    """Notify specific qualified techs of a new available intervention (skill-based filtering)"""
    if not tech_ids:
        return {"sent": 0, "failed": 0, "expired": 0, "no_subscribers": True}
    
    return await send_push_to_users(
        db=db,
        user_ids=tech_ids,
        title="🔔 Nouvelle mission disponible",
        body=f"{intervention.get('titre', 'Nouvelle intervention')} - Cliquez pour accepter",
        url="/tech",
        tag=f"new-intervention-{intervention.get('id')}",
        data={"type": "new_intervention", "intervention_id": intervention.get("id")}
    )

async def notify_intervention_assigned(db, user_id: str, intervention: dict):
    """Notify a tech that an intervention was assigned to them"""
    return await send_push_to_users(
        db=db,
        user_ids=[user_id],
        title="📋 Mission assignée",
        body=f"Vous avez été assigné à: {intervention.get('titre', 'une intervention')}",
        url="/tech",
        tag=f"assigned-{intervention.get('id')}",
        data={"type": "intervention_assigned", "intervention_id": intervention.get("id")}
    )

async def notify_intervention_reminder(db, user_id: str, intervention: dict):
    """Notify a tech about an upcoming intervention"""
    return await send_push_to_users(
        db=db,
        user_ids=[user_id],
        title="⏰ Rappel intervention",
        body=f"Intervention prévue: {intervention.get('titre', '')}",
        url="/tech",
        tag=f"reminder-{intervention.get('id')}",
        data={"type": "reminder", "intervention_id": intervention.get("id")}
    )

async def notify_devis_signed(db, user_id: str, devis: dict, client_name: str):
    """Notify admin that a devis was signed"""
    return await send_push_to_users(
        db=db,
        user_ids=[user_id],
        title="✅ Devis signé",
        body=f"Le devis {devis.get('numero_devis')} a été signé par {client_name}",
        url=f"/dashboard/devis/{devis.get('id')}",
        tag=f"devis-signed-{devis.get('id')}",
        data={"type": "devis_signed", "devis_id": devis.get("id")}
    )
