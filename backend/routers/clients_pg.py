"""
Client management routes - OPTIMIZED PostgreSQL
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models import ClientCreate, ClientResponse
from auth import get_current_user, require_admin
from postgres_db import pg

router = APIRouter(prefix="/clients", tags=["Clients"])


async def log_action(entreprise_id: str, user_id: str, action: str, entity_type: str = None, entity_id: str = None, details: dict = None):
    """Log audit action"""
    await pg.insert("audit_logs", {
        "id": str(uuid.uuid4()),
        "entreprise_id": entreprise_id,
        "user_id": user_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "details": details or {}
    })


@router.post("", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client"""
    client_id = str(uuid.uuid4())
    client_data = data.model_dump()
    client_data["id"] = client_id
    client_data["entreprise_id"] = current_user["entreprise_id"]
    client_data["portal_token"] = str(uuid.uuid4())
    
    await pg.insert("clients", client_data)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "client", client_id)
    
    client = await pg.find_one("clients", {"id": client_id})
    return ClientResponse(**client)


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    include_archived: bool = Query(False),
    archived_only: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    """List all clients"""
    query = "SELECT * FROM clients WHERE entreprise_id = :ent_id"
    params = {"ent_id": current_user["entreprise_id"]}
    
    # Archive filter
    if archived_only:
        query += " AND archived = true"
    elif not include_archived:
        query += " AND (archived = false OR archived IS NULL)"
    
    # Search filter
    if search:
        query += " AND (nom ILIKE :search OR prenom ILIKE :search OR email ILIKE :search OR telephone ILIKE :search)"
        params["search"] = f"%{search}%"
    
    query += " ORDER BY created_at DESC LIMIT 1000"
    
    clients = await pg.fetch_all(query, params)
    return [ClientResponse(**c) for c in clients]


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific client"""
    client = await pg.find_one("clients", {"id": client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return ClientResponse(**client)


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Update a client"""
    count = await pg.update(
        "clients",
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        data.model_dump(exclude_unset=True)
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "client", client_id)
    
    client = await pg.find_one("clients", {"id": client_id})
    return ClientResponse(**client)


@router.delete("/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Delete a client"""
    # Check for linked interventions
    linked = await pg.count("interventions", {"client_id": client_id})
    if linked > 0:
        raise HTTPException(status_code=400, detail=f"Ce client a {linked} intervention(s). Archivez-le plutôt.")
    
    count = await pg.delete("clients", {"id": client_id, "entreprise_id": current_user["entreprise_id"]})
    if count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "client", client_id)
    return {"message": "Client supprimé"}


@router.post("/{client_id}/archive")
async def archive_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Archive a client"""
    count = await pg.update(
        "clients",
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"archived": True, "archived_at": datetime.now(timezone.utc)}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "archive", "client", client_id)
    return {"message": "Client archivé"}


@router.post("/{client_id}/restore")
async def restore_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Restore an archived client"""
    count = await pg.update(
        "clients",
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"archived": False, "archived_at": None}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "restore", "client", client_id)
    return {"message": "Client restauré"}


@router.get("/{client_id}/interventions")
async def get_client_interventions(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get all interventions for a client"""
    interventions = await pg.find_many(
        "interventions",
        {"client_id": client_id, "entreprise_id": current_user["entreprise_id"]},
        order_by="date_prevue DESC",
        limit=100
    )
    return interventions


@router.get("/{client_id}/devis")
async def get_client_devis(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get all quotes for a client"""
    devis = await pg.find_many(
        "devis",
        {"client_id": client_id, "entreprise_id": current_user["entreprise_id"]},
        order_by="created_at DESC",
        limit=100
    )
    return devis


@router.get("/{client_id}/factures")
async def get_client_factures(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get all invoices for a client"""
    factures = await pg.find_many(
        "factures",
        {"client_id": client_id, "entreprise_id": current_user["entreprise_id"]},
        order_by="created_at DESC",
        limit=100
    )
    return factures
