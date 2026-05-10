"""
Offline Sync Router
Handles synchronization of offline-created data (devis, clients, interventions)
For Pro & Enterprise plans only
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
from typing import List, Optional
import uuid
import logging
import base64

logger = logging.getLogger(__name__)

from auth import get_current_user
from dependencies import db, serialize_doc
from plan_limits import check_feature, raise_limit_error

router = APIRouter(prefix="/offline", tags=["Offline Sync"])


@router.post("/sync/devis")
async def sync_offline_devis(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync offline-created devis to the server.
    Converts temporary IDs to real sequential numbers.
    """
    entreprise_id = current_user["entreprise_id"]
    
    # Check if offline mode is enabled for this plan
    entreprise = await db.entreprises.find_one({"id": entreprise_id})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    plan_limits = entreprise.get("plan_limits", {})
    if not plan_limits.get("offline_mode", False):
        raise HTTPException(
            status_code=403, 
            detail="Le mode hors ligne n'est pas disponible pour votre plan"
        )
    
    temp_id = data.get("temp_id")
    if not temp_id:
        raise HTTPException(status_code=400, detail="temp_id requis")
    
    # Check if already synced
    existing = await db.devis.find_one({"offline_temp_id": temp_id})
    if existing:
        return {
            "status": "already_synced",
            "devis_id": existing["id"],
            "numero": existing["numero"]
        }
    
    # Get next devis number
    sequence = entreprise.get("sequence_devis", 1)
    year = datetime.now().year
    numero = f"DEV-{year}-{sequence:04d}"
    
    # Resolve client ID (might be offline client)
    client_id = data.get("client_id", "")
    real_client_id = client_id
    
    # If client was created offline, look for the synced version
    if client_id.startswith("CLIENT-OFFLINE-"):
        offline_client = await db.clients.find_one({
            "entreprise_id": entreprise_id,
            "offline_temp_id": client_id
        })
        if offline_client:
            real_client_id = offline_client["id"]
        else:
            # Client not synced yet, will be handled in client sync
            pass
    
    # Create devis
    devis_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    devis = {
        "id": devis_id,
        "numero": numero,
        "entreprise_id": entreprise_id,
        "client_id": real_client_id,
        "client_name": data.get("client_name", ""),
        "lignes": data.get("lignes", []),
        "total_ht": data.get("total_ht", 0),
        "total_tva": data.get("total_tva", 0),
        "total_ttc": data.get("total_ttc", 0),
        "devise": data.get("devise", "EUR"),
        "statut": "signed" if data.get("signature") else "draft",
        "validite_jours": data.get("validite_jours", 30),
        "conditions": data.get("conditions", ""),
        "notes_internes": data.get("notes_internes", ""),
        "offline_temp_id": temp_id,
        "created_offline": True,
        "created_offline_at": data.get("created_at", now),
        "synced_at": now,
        "created_at": now,
        "created_by": current_user["id"]
    }
    
    # Handle signature if present
    if data.get("signature"):
        devis["signature"] = {
            "data": data["signature"].get("signature_data", ""),
            "signatory_name": data["signature"].get("signatory_name", ""),
            "signed_at": data["signature"].get("created_at", now)
        }
        devis["signed_at"] = data["signature"].get("created_at", now)
        devis["signed_by"] = data["signature"].get("signatory_name", "")
    
    await db.devis.insert_one(devis)
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": entreprise_id},
        {"$inc": {"sequence_devis": 1}}
    )
    
    logger.info(f"Synced offline devis {temp_id} -> {numero}")
    
    return {
        "status": "synced",
        "devis_id": devis_id,
        "numero": numero,
        "temp_id": temp_id
    }


@router.post("/sync/client")
async def sync_offline_client(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync offline-created client to the server.
    """
    entreprise_id = current_user["entreprise_id"]
    
    temp_id = data.get("temp_id")
    if not temp_id:
        raise HTTPException(status_code=400, detail="temp_id requis")
    
    # Check if already synced
    existing = await db.clients.find_one({
        "entreprise_id": entreprise_id,
        "offline_temp_id": temp_id
    })
    if existing:
        return {
            "status": "already_synced",
            "client_id": existing["id"],
            "temp_id": temp_id
        }
    
    # Check if client with same name exists
    existing_name = await db.clients.find_one({
        "entreprise_id": entreprise_id,
        "nom": data.get("nom", "")
    })
    if existing_name:
        return {
            "status": "duplicate",
            "client_id": existing_name["id"],
            "temp_id": temp_id,
            "message": "Un client avec ce nom existe déjà"
        }
    
    # Create client
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client = {
        "id": client_id,
        "entreprise_id": entreprise_id,
        "nom": data.get("nom", ""),
        "email": data.get("email", ""),
        "telephone": data.get("telephone", ""),
        "adresse": data.get("adresse", ""),
        "ville": data.get("ville", ""),
        "code_postal": data.get("code_postal", ""),
        "offline_temp_id": temp_id,
        "created_offline": True,
        "created_offline_at": data.get("created_at", now),
        "synced_at": now,
        "created_at": now
    }
    
    await db.clients.insert_one(client)
    
    logger.info(f"Synced offline client {temp_id} -> {client_id}")
    
    return {
        "status": "synced",
        "client_id": client_id,
        "temp_id": temp_id
    }


@router.post("/sync/intervention")
async def sync_offline_intervention(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Sync offline-created intervention to the server.
    """
    entreprise_id = current_user["entreprise_id"]
    
    temp_id = data.get("temp_id")
    if not temp_id:
        raise HTTPException(status_code=400, detail="temp_id requis")
    
    # Check if already synced
    existing = await db.interventions.find_one({
        "entreprise_id": entreprise_id,
        "offline_temp_id": temp_id
    })
    if existing:
        return {
            "status": "already_synced",
            "intervention_id": existing["id"],
            "temp_id": temp_id
        }
    
    # Resolve client ID (might be offline client)
    client_id = data.get("client_id", "")
    real_client_id = client_id
    
    if client_id.startswith("CLIENT-OFFLINE-"):
        offline_client = await db.clients.find_one({
            "entreprise_id": entreprise_id,
            "offline_temp_id": client_id
        })
        if offline_client:
            real_client_id = offline_client["id"]
    
    # Create intervention
    intervention_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = {
        "id": intervention_id,
        "entreprise_id": entreprise_id,
        "client_id": real_client_id,
        "titre": data.get("titre", ""),
        "description": data.get("description", ""),
        "date_prevue": data.get("date_prevue", now),
        "duree_estimee": data.get("duree_estimee", 60),
        "adresse": data.get("adresse", ""),
        "ville": data.get("ville", ""),
        "code_postal": data.get("code_postal", ""),
        "priorite": data.get("priorite", "normale"),
        "statut": data.get("statut", "planifiee"),
        "categorie_id": data.get("categorie_id"),
        "technicien_id": data.get("technicien_id"),
        "offline_temp_id": temp_id,
        "created_offline": True,
        "created_offline_at": data.get("created_at", now),
        "synced_at": now,
        "created_at": now,
        "updated_at": now
    }
    
    await db.interventions.insert_one(intervention)
    
    logger.info(f"Synced offline intervention {temp_id} -> {intervention_id}")
    
    return {
        "status": "synced",
        "intervention_id": intervention_id,
        "temp_id": temp_id
    }


@router.post("/sync/batch")
async def sync_batch(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Batch sync multiple offline items.
    Order: clients first, then devis, then interventions.
    """
    results = {
        "clients": [],
        "devis": [],
        "interventions": [],
        "errors": []
    }
    
    # Sync clients first (devis and interventions may reference them)
    for client_data in data.get("clients", []):
        try:
            result = await sync_offline_client(client_data, current_user)
            results["clients"].append(result)
        except Exception as e:
            results["errors"].append({
                "type": "client",
                "temp_id": client_data.get("temp_id"),
                "error": str(e)
            })
    
    # Sync devis
    for devis_data in data.get("devis", []):
        try:
            result = await sync_offline_devis(devis_data, current_user)
            results["devis"].append(result)
        except Exception as e:
            results["errors"].append({
                "type": "devis",
                "temp_id": devis_data.get("temp_id"),
                "error": str(e)
            })
    
    # Sync interventions
    for intervention_data in data.get("interventions", []):
        try:
            result = await sync_offline_intervention(intervention_data, current_user)
            results["interventions"].append(result)
        except Exception as e:
            results["errors"].append({
                "type": "intervention",
                "temp_id": intervention_data.get("temp_id"),
                "error": str(e)
            })
    
    return {
        "status": "completed",
        "synced": {
            "clients": len(results["clients"]),
            "devis": len(results["devis"]),
            "interventions": len(results["interventions"])
        },
        "errors": len(results["errors"]),
        "details": results
    }


@router.get("/pending")
async def get_pending_offline_count(
    current_user: dict = Depends(get_current_user)
):
    """
    Get count of pending offline items to sync.
    Used for sync indicator in UI.
    """
    entreprise_id = current_user["entreprise_id"]
    
    # Count unsynced items (those created offline that haven't been synced)
    # This is informational only - the actual count comes from the client
    
    return {
        "message": "Check local IndexedDB for pending items",
        "sync_endpoint": "/api/offline/sync/batch"
    }
