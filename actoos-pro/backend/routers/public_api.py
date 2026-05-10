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
    WEBHOOK_EVENTS, API_PERMISSIONS,
    APIClientCreate, APIClientUpdate, APIInterventionCreate, APIInterventionUpdate
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


# ==================== WRITE ENDPOINTS (POST/PUT/DELETE) ====================

@router.post("/v1/clients")
async def api_create_client(
    data: APIClientCreate,
    api_key: dict = Depends(require_permission("write"))
):
    """Create a new client (External API)"""
    # Check for duplicate external_id if provided
    if data.external_id:
        existing = await db.clients.find_one({
            "entreprise_id": api_key["entreprise_id"],
            "external_id": data.external_id
        })
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"Un client avec l'external_id '{data.external_id}' existe déjà"
            )
    
    # Check for duplicate email if provided
    if data.email:
        existing = await db.clients.find_one({
            "entreprise_id": api_key["entreprise_id"],
            "email": data.email
        })
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Un client avec l'email '{data.email}' existe déjà"
            )
    
    client_dict = data.model_dump()
    client_dict["id"] = str(uuid.uuid4())
    client_dict["entreprise_id"] = api_key["entreprise_id"]
    client_dict["portal_token"] = str(uuid.uuid4())
    client_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    client_dict["created_via"] = "api"
    client_dict["api_key_id"] = api_key["id"]
    
    await db.clients.insert_one(client_dict)
    
    # Trigger webhooks
    await trigger_webhooks(
        db,
        api_key["entreprise_id"],
        "client.created",
        {"entity_type": "client", "action": "created", "entity": serialize_doc(client_dict)}
    )
    
    logger.info(f"Client created via API: {client_dict['id']} by key {api_key['name']}")
    
    return serialize_doc(client_dict)


@router.put("/v1/clients/{client_id}")
async def api_update_client(
    client_id: str,
    data: APIClientUpdate,
    api_key: dict = Depends(require_permission("write"))
):
    """Update a client (External API)"""
    # Verify client exists
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Build update data
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Check for duplicate email if changing
    if data.email and data.email != client.get("email"):
        existing = await db.clients.find_one({
            "entreprise_id": api_key["entreprise_id"],
            "email": data.email,
            "id": {"$ne": client_id}
        })
        if existing:
            raise HTTPException(status_code=409, detail=f"Un client avec l'email '{data.email}' existe déjà")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_via"] = "api"
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    # Get updated client
    updated_client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    # Trigger webhooks
    await trigger_webhooks(
        db,
        api_key["entreprise_id"],
        "client.updated",
        {"entity_type": "client", "action": "updated", "entity": serialize_doc(updated_client)}
    )
    
    logger.info(f"Client updated via API: {client_id} by key {api_key['name']}")
    
    return serialize_doc(updated_client)


@router.get("/v1/clients/by-external-id/{external_id}")
async def api_get_client_by_external_id(
    external_id: str,
    api_key: dict = Depends(require_permission("read"))
):
    """Get a client by external_id (External API)"""
    client = await db.clients.find_one(
        {"external_id": external_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return serialize_doc(client)


@router.post("/v1/interventions")
async def api_create_intervention(
    data: APIInterventionCreate,
    api_key: dict = Depends(require_permission("write"))
):
    """Create a new intervention (External API)"""
    # Verify client exists
    client = await db.clients.find_one(
        {"id": data.client_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Verify technician if provided
    if data.technicien_id:
        tech = await db.users.find_one({
            "id": data.technicien_id,
            "entreprise_id": api_key["entreprise_id"],
            "role": "tech"
        })
        if not tech:
            raise HTTPException(status_code=404, detail="Technicien non trouvé")
    
    # Verify category if provided
    if data.categorie_id:
        category = await db.categories.find_one({
            "id": data.categorie_id,
            "entreprise_id": api_key["entreprise_id"]
        })
        if not category:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    # Check for duplicate external_id if provided
    if data.external_id:
        existing = await db.interventions.find_one({
            "entreprise_id": api_key["entreprise_id"],
            "external_id": data.external_id
        })
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Une intervention avec l'external_id '{data.external_id}' existe déjà"
            )
    
    # Validate priority
    valid_priorities = ["basse", "normale", "haute", "urgente"]
    if data.priorite and data.priorite not in valid_priorities:
        raise HTTPException(status_code=400, detail=f"Priorité invalide. Valeurs possibles: {valid_priorities}")
    
    intervention_dict = data.model_dump()
    intervention_dict["id"] = str(uuid.uuid4())
    intervention_dict["entreprise_id"] = api_key["entreprise_id"]
    intervention_dict["statut"] = "planifiee"
    intervention_dict["photos"] = []
    intervention_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    intervention_dict["created_via"] = "api"
    intervention_dict["api_key_id"] = api_key["id"]
    
    # Use client address if not provided
    if not intervention_dict.get("adresse"):
        intervention_dict["adresse"] = client.get("adresse")
    if not intervention_dict.get("ville"):
        intervention_dict["ville"] = client.get("ville")
    if not intervention_dict.get("code_postal"):
        intervention_dict["code_postal"] = client.get("code_postal")
    
    await db.interventions.insert_one(intervention_dict)
    
    # Trigger webhooks
    await trigger_webhooks(
        db,
        api_key["entreprise_id"],
        "intervention.created",
        {"entity_type": "intervention", "action": "created", "entity": serialize_doc(intervention_dict)}
    )
    
    logger.info(f"Intervention created via API: {intervention_dict['id']} by key {api_key['name']}")
    
    return serialize_doc(intervention_dict)


@router.put("/v1/interventions/{intervention_id}")
async def api_update_intervention(
    intervention_id: str,
    data: APIInterventionUpdate,
    api_key: dict = Depends(require_permission("write"))
):
    """Update an intervention (External API)"""
    # Verify intervention exists
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Build update data
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    # Verify technician if changing
    if data.technicien_id:
        tech = await db.users.find_one({
            "id": data.technicien_id,
            "entreprise_id": api_key["entreprise_id"],
            "role": "tech"
        })
        if not tech:
            raise HTTPException(status_code=404, detail="Technicien non trouvé")
    
    # Verify category if changing
    if data.categorie_id:
        category = await db.categories.find_one({
            "id": data.categorie_id,
            "entreprise_id": api_key["entreprise_id"]
        })
        if not category:
            raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    # Validate status if changing
    valid_statuses = ["planifiee", "en_cours", "terminee", "annulee"]
    if data.statut and data.statut not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Statut invalide. Valeurs possibles: {valid_statuses}")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_data["updated_via"] = "api"
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update_data})
    
    # Get updated intervention
    updated_intervention = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    
    # Trigger webhooks
    await trigger_webhooks(
        db,
        api_key["entreprise_id"],
        "intervention.updated",
        {"entity_type": "intervention", "action": "updated", "entity": serialize_doc(updated_intervention)}
    )
    
    logger.info(f"Intervention updated via API: {intervention_id} by key {api_key['name']}")
    
    return serialize_doc(updated_intervention)


@router.get("/v1/interventions/by-external-id/{external_id}")
async def api_get_intervention_by_external_id(
    external_id: str,
    api_key: dict = Depends(require_permission("read"))
):
    """Get an intervention by external_id (External API)"""
    intervention = await db.interventions.find_one(
        {"external_id": external_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return serialize_doc(intervention)


@router.delete("/v1/interventions/{intervention_id}")
async def api_delete_intervention(
    intervention_id: str,
    api_key: dict = Depends(require_permission("write"))
):
    """Cancel/Delete an intervention (External API) - Only planned interventions can be cancelled"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": api_key["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    if intervention["statut"] not in ["planifiee"]:
        raise HTTPException(
            status_code=400,
            detail="Seules les interventions planifiées peuvent être annulées via l'API"
        )
    
    # Cancel instead of delete for audit trail
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$set": {
            "statut": "annulee",
            "date_annulation": datetime.now(timezone.utc).isoformat(),
            "motif_annulation": "Annulée via API externe",
            "cancelled_via": "api"
        }}
    )
    
    # Trigger webhooks
    cancelled_intervention = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    await trigger_webhooks(
        db,
        api_key["entreprise_id"],
        "intervention.cancelled",
        {"entity_type": "intervention", "action": "cancelled", "entity": serialize_doc(cancelled_intervention)}
    )
    
    logger.info(f"Intervention cancelled via API: {intervention_id} by key {api_key['name']}")
    
    return {"message": "Intervention annulée", "id": intervention_id}


# ==================== API INFO ====================
@router.get("/info")
async def get_api_info():
    """Get public API information"""
    return {
        "name": "Actoos Public API",
        "version": "1.1.0",
        "documentation": "/docs",
        "endpoints": {
            "clients": {
                "list": "GET /api/public-api/v1/clients",
                "get": "GET /api/public-api/v1/clients/{id}",
                "get_by_external_id": "GET /api/public-api/v1/clients/by-external-id/{external_id}",
                "create": "POST /api/public-api/v1/clients",
                "update": "PUT /api/public-api/v1/clients/{id}"
            },
            "interventions": {
                "list": "GET /api/public-api/v1/interventions",
                "get": "GET /api/public-api/v1/interventions/{id}",
                "get_by_external_id": "GET /api/public-api/v1/interventions/by-external-id/{external_id}",
                "create": "POST /api/public-api/v1/interventions",
                "update": "PUT /api/public-api/v1/interventions/{id}",
                "cancel": "DELETE /api/public-api/v1/interventions/{id}"
            },
            "devis": {
                "list": "GET /api/public-api/v1/devis",
                "get": "GET /api/public-api/v1/devis/{id}"
            },
            "factures": {
                "list": "GET /api/public-api/v1/factures",
                "get": "GET /api/public-api/v1/factures/{id}"
            }
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
        "permissions": API_PERMISSIONS,
        "features": {
            "external_id": "Utilisez le champ 'external_id' pour synchroniser avec votre système ERP/CRM",
            "pagination": "Utilisez 'limit' et 'offset' pour paginer les résultats",
            "webhooks": "Configurez des webhooks pour recevoir des notifications en temps réel"
        }
    }
