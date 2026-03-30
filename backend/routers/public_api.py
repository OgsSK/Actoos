"""
Public API routes - API keys, webhooks, and external access endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, Header, Request
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid
import secrets
import hashlib
import logging

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action
from models_api import (
    APIKeyCreate, APIKeyResponse, WebhookCreate, WebhookResponse,
    WEBHOOK_EVENTS, API_PERMISSIONS
)
from webhook_service import trigger_webhooks, send_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/public-api", tags=["Public API"])


# ==================== API KEY AUTHENTICATION ====================
async def get_api_key_user(x_api_key: str = Header(None, alias="X-API-Key")):
    """Authenticate request using API key"""
    if not x_api_key:
        raise HTTPException(status_code=401, detail="Clé API requise (header X-API-Key)")
    
    # Hash the key to find it in database
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    
    api_key = await db.api_keys.find_one({
        "key_hash": key_hash,
        "is_active": True
    }, {"_id": 0})
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Clé API invalide ou désactivée")
    
    # Check expiration
    if api_key.get("expires_at"):
        expires_at = datetime.fromisoformat(api_key["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            raise HTTPException(status_code=401, detail="Clé API expirée")
    
    # Update last used
    await db.api_keys.update_one(
        {"id": api_key["id"]},
        {"$set": {"last_used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return api_key


def require_permission(permission: str):
    """Decorator to check API key permissions"""
    async def check_permission(api_key: dict = Depends(get_api_key_user)):
        if permission not in api_key.get("permissions", []) and "admin" not in api_key.get("permissions", []):
            raise HTTPException(status_code=403, detail=f"Permission '{permission}' requise")
        return api_key
    return check_permission


# ==================== API KEY MANAGEMENT ====================
@router.get("/keys")
async def list_api_keys(current_user: dict = Depends(require_admin)):
    """List all API keys for the entreprise"""
    keys = await db.api_keys.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "key_hash": 0}  # Don't expose hash
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_doc(k) for k in keys]


@router.post("/keys")
async def create_api_key(data: APIKeyCreate, current_user: dict = Depends(require_admin)):
    """Create a new API key"""
    # Generate secure key
    raw_key = f"actoos_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    key_prefix = raw_key[:12]  # First 12 chars for identification
    
    # Calculate expiration
    expires_at = None
    if data.expires_in_days:
        expires_at = (datetime.now(timezone.utc) + timedelta(days=data.expires_in_days)).isoformat()
    
    api_key_doc = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "name": data.name,
        "key_hash": key_hash,
        "key_prefix": key_prefix,
        "permissions": data.permissions,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
        "last_used_at": None,
        "is_active": True
    }
    
    await db.api_keys.insert_one(api_key_doc)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "api_key", api_key_doc["id"])
    
    # Return the key only once - it won't be shown again
    response = serialize_doc(api_key_doc)
    response["key"] = raw_key  # Only returned on creation
    del response["key_hash"]
    
    return response


@router.delete("/keys/{key_id}")
async def revoke_api_key(key_id: str, current_user: dict = Depends(require_admin)):
    """Revoke an API key"""
    result = await db.api_keys.update_one(
        {"id": key_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {"is_active": False, "revoked_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Clé API non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "revoke", "api_key", key_id)
    
    return {"message": "Clé API révoquée"}


# ==================== WEBHOOK MANAGEMENT ====================
@router.get("/webhooks")
async def list_webhooks(current_user: dict = Depends(require_admin)):
    """List all webhooks for the entreprise"""
    webhooks = await db.webhooks.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "secret": 0}  # Don't expose secret
    ).sort("created_at", -1).to_list(100)
    
    return [serialize_doc(w) for w in webhooks]


@router.get("/webhooks/events")
async def list_webhook_events():
    """List all available webhook events"""
    return {
        "events": WEBHOOK_EVENTS,
        "description": {
            "intervention.created": "Une nouvelle intervention a été créée",
            "intervention.updated": "Une intervention a été modifiée",
            "intervention.started": "Un technicien a démarré une intervention",
            "intervention.completed": "Une intervention a été terminée",
            "intervention.cancelled": "Une intervention a été annulée",
            "devis.created": "Un nouveau devis a été créé",
            "devis.sent": "Un devis a été envoyé au client",
            "devis.signed": "Un devis a été signé par le client",
            "facture.created": "Une nouvelle facture a été créée",
            "facture.emitted": "Une facture a été émise",
            "facture.paid": "Une facture a été payée",
            "client.created": "Un nouveau client a été créé",
            "client.updated": "Un client a été modifié",
        }
    }


@router.post("/webhooks")
async def create_webhook(data: WebhookCreate, current_user: dict = Depends(require_admin)):
    """Create a new webhook"""
    # Validate URL
    if not data.url.startswith("https://"):
        raise HTTPException(status_code=400, detail="L'URL du webhook doit être HTTPS")
    
    # Validate events
    invalid_events = [e for e in data.events if e not in WEBHOOK_EVENTS]
    if invalid_events:
        raise HTTPException(status_code=400, detail=f"Événements invalides: {invalid_events}")
    
    # Generate secret if not provided
    secret = data.secret or secrets.token_urlsafe(32)
    
    webhook_doc = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "url": data.url,
        "events": data.events,
        "secret": secret,
        "description": data.description,
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_triggered_at": None,
        "failure_count": 0,
        "is_active": True
    }
    
    await db.webhooks.insert_one(webhook_doc)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "webhook", webhook_doc["id"])
    
    response = serialize_doc(webhook_doc)
    # Return secret only on creation
    return response


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(webhook_id: str, current_user: dict = Depends(require_admin)):
    """Send a test event to a webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    
    # Send test event
    test_payload = {
        "entity_type": "test",
        "action": "test",
        "entity": {
            "message": "Ceci est un test de webhook",
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    }
    
    result = await send_webhook(
        db, webhook, "test.ping", test_payload, current_user["entreprise_id"]
    )
    
    return {
        "message": "Test envoyé",
        "delivery_id": result.get("id"),
        "status": result.get("status"),
        "response_status": result.get("response_status")
    }


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str, current_user: dict = Depends(require_admin)):
    """Delete a webhook"""
    result = await db.webhooks.delete_one(
        {"id": webhook_id, "entreprise_id": current_user["entreprise_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "webhook", webhook_id)
    
    return {"message": "Webhook supprimé"}


@router.put("/webhooks/{webhook_id}/toggle")
async def toggle_webhook(webhook_id: str, current_user: dict = Depends(require_admin)):
    """Enable or disable a webhook"""
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "is_active": 1}
    )
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    
    new_status = not webhook.get("is_active", True)
    
    await db.webhooks.update_one(
        {"id": webhook_id},
        {"$set": {"is_active": new_status, "failure_count": 0}}
    )
    
    return {"message": f"Webhook {'activé' if new_status else 'désactivé'}", "is_active": new_status}


@router.get("/webhooks/{webhook_id}/deliveries")
async def get_webhook_deliveries(
    webhook_id: str,
    limit: int = 50,
    current_user: dict = Depends(require_admin)
):
    """Get delivery history for a webhook"""
    # Verify webhook belongs to entreprise
    webhook = await db.webhooks.find_one(
        {"id": webhook_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1}
    )
    
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook non trouvé")
    
    deliveries = await db.webhook_deliveries.find(
        {"webhook_id": webhook_id},
        {"_id": 0, "payload": 0}  # Exclude large payload
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    return [serialize_doc(d) for d in deliveries]


# ==================== EXTERNAL API ENDPOINTS ====================
@router.get("/v1/clients")
async def api_list_clients(
    limit: int = 100,
    offset: int = 0,
    api_key: dict = Depends(require_permission("read"))
):
    """List clients (External API)"""
    clients = await db.clients.find(
        {"entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    ).skip(offset).limit(limit).to_list(limit)
    
    return {
        "data": [serialize_doc(c) for c in clients],
        "limit": limit,
        "offset": offset,
        "total": await db.clients.count_documents({"entreprise_id": api_key["entreprise_id"]})
    }


@router.get("/v1/clients/{client_id}")
async def api_get_client(client_id: str, api_key: dict = Depends(require_permission("read"))):
    """Get a specific client (External API)"""
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return serialize_doc(client)


@router.get("/v1/interventions")
async def api_list_interventions(
    limit: int = 100,
    offset: int = 0,
    statut: Optional[str] = None,
    api_key: dict = Depends(require_permission("read"))
):
    """List interventions (External API)"""
    query = {"entreprise_id": api_key["entreprise_id"]}
    if statut:
        query["statut"] = statut
    
    interventions = await db.interventions.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
    
    return {
        "data": [serialize_doc(i) for i in interventions],
        "limit": limit,
        "offset": offset,
        "total": await db.interventions.count_documents(query)
    }


@router.get("/v1/interventions/{intervention_id}")
async def api_get_intervention(intervention_id: str, api_key: dict = Depends(require_permission("read"))):
    """Get a specific intervention (External API)"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return serialize_doc(intervention)


@router.get("/v1/devis")
async def api_list_devis(
    limit: int = 100,
    offset: int = 0,
    statut: Optional[str] = None,
    api_key: dict = Depends(require_permission("read"))
):
    """List devis (External API)"""
    query = {"entreprise_id": api_key["entreprise_id"]}
    if statut:
        query["statut"] = statut
    
    devis_list = await db.devis.find(query, {"_id": 0, "token_client": 0}).skip(offset).limit(limit).to_list(limit)
    
    return {
        "data": [serialize_doc(d) for d in devis_list],
        "limit": limit,
        "offset": offset,
        "total": await db.devis.count_documents(query)
    }


@router.get("/v1/factures")
async def api_list_factures(
    limit: int = 100,
    offset: int = 0,
    statut: Optional[str] = None,
    api_key: dict = Depends(require_permission("read"))
):
    """List factures (External API)"""
    query = {"entreprise_id": api_key["entreprise_id"]}
    if statut:
        query["statut"] = statut
    
    factures = await db.factures.find(query, {"_id": 0}).skip(offset).limit(limit).to_list(limit)
    
    return {
        "data": [serialize_doc(f) for f in factures],
        "limit": limit,
        "offset": offset,
        "total": await db.factures.count_documents(query)
    }


@router.get("/v1/factures/{facture_id}")
async def api_get_facture(facture_id: str, api_key: dict = Depends(require_permission("read"))):
    """Get a specific facture (External API)"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    return serialize_doc(facture)


# ==================== API INFO ====================
@router.get("/info")
async def get_api_info():
    """Get public API information"""
    return {
        "name": "Actoos Public API",
        "version": "1.0.0",
        "documentation": "/docs",
        "endpoints": {
            "clients": "/api/public-api/v1/clients",
            "interventions": "/api/public-api/v1/interventions",
            "devis": "/api/public-api/v1/devis",
            "factures": "/api/public-api/v1/factures"
        },
        "authentication": {
            "type": "API Key",
            "header": "X-API-Key",
            "description": "Incluez votre clé API dans le header X-API-Key"
        },
        "webhooks": {
            "available_events": WEBHOOK_EVENTS,
            "signature_header": "X-Actoos-Signature",
            "signature_algorithm": "HMAC-SHA256"
        },
        "permissions": API_PERMISSIONS
    }
