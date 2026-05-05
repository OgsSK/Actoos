"""
Client management routes with archive/restore functionality
"""
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from models import ClientCreate, ClientResponse
from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Create a new client"""
    client_dict = data.model_dump()
    client_dict["id"] = str(uuid.uuid4())
    client_dict["entreprise_id"] = current_user["entreprise_id"]
    client_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    client_dict["archived"] = False  # New field for archive system
    client_dict["archived_at"] = None
    
    await db.clients.insert_one(client_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "client", client_dict["id"])
    
    return ClientResponse(**client_dict)


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    include_archived: bool = Query(False, description="Include archived clients"),
    archived_only: bool = Query(False, description="Show only archived clients"),
    current_user: dict = Depends(get_current_user)
):
    """List all clients (active or archived)"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    # Filter by archive status
    if archived_only:
        query["archived"] = True
    elif not include_archived:
        query["$or"] = [{"archived": False}, {"archived": {"$exists": False}}]
    
    if search:
        search_conditions = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"prenom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"telephone": {"$regex": search, "$options": "i"}}
        ]
        if "$or" in query:
            # Combine with archive filter
            query = {
                "$and": [
                    {"entreprise_id": current_user["entreprise_id"]},
                    {"$or": query["$or"]},
                    {"$or": search_conditions}
                ]
            }
        else:
            query["$or"] = search_conditions
    
    clients = await db.clients.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [ClientResponse(**serialize_doc(c)) for c in clients]


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific client"""
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return ClientResponse(**serialize_doc(client))


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientCreate, current_user: dict = Depends(get_current_user)):
    """Update a client"""
    update_data = data.model_dump(exclude_unset=True)
    result = await db.clients.update_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "client", client_id)
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return ClientResponse(**serialize_doc(client))


@router.delete("/{client_id}")
async def archive_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Archive a client (soft delete - admin only)"""
    # Check if client exists
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Archive instead of delete
    result = await db.clients.update_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {
            "archived": True,
            "archived_at": datetime.now(timezone.utc).isoformat(),
            "archived_by": current_user["user_id"]
        }}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "archive", "client", client_id)
    return {"message": "Client archivé", "archived": True}


@router.post("/{client_id}/restore")
async def restore_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Restore an archived client (admin only)"""
    # Check if client exists and is archived
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    if not client.get("archived"):
        raise HTTPException(status_code=400, detail="Ce client n'est pas archivé")
    
    # Restore client
    result = await db.clients.update_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {
            "archived": False,
            "restored_at": datetime.now(timezone.utc).isoformat(),
            "restored_by": current_user["user_id"]
        }}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "restore", "client", client_id)
    return {"message": "Client restauré", "archived": False}


@router.delete("/{client_id}/permanent")
async def permanently_delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Permanently delete a client and all related data (admin only)
    WARNING: This action is irreversible!
    """
    # Check if client exists
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Check if client is archived first (safety measure)
    if not client.get("archived"):
        raise HTTPException(
            status_code=400, 
            detail="Le client doit être archivé avant de pouvoir être supprimé définitivement"
        )
    
    # Check for related data
    interventions_count = await db.interventions.count_documents({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    devis_count = await db.devis.count_documents({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    factures_count = await db.factures.count_documents({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    # Delete all related data
    deleted_data = {
        "interventions": 0,
        "devis": 0,
        "factures": 0,
        "sites": 0,
        "photos": 0,
        "communications": 0
    }
    
    # Delete interventions and their photos
    interventions = await db.interventions.find(
        {"client_id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"id": 1}
    ).to_list(1000)
    
    for intervention in interventions:
        await db.photos.delete_many({"intervention_id": intervention["id"]})
        deleted_data["photos"] += 1
    
    result = await db.interventions.delete_many({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    deleted_data["interventions"] = result.deleted_count
    
    # Delete devis
    result = await db.devis.delete_many({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    deleted_data["devis"] = result.deleted_count
    
    # Delete factures
    result = await db.factures.delete_many({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    deleted_data["factures"] = result.deleted_count
    
    # Delete sites
    result = await db.sites.delete_many({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    deleted_data["sites"] = result.deleted_count
    
    # Delete communications
    result = await db.communications.delete_many({
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    deleted_data["communications"] = result.deleted_count
    
    # Finally delete the client
    await db.clients.delete_one({
        "id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "permanent_delete", 
        "client", 
        client_id,
        details=deleted_data
    )
    
    return {
        "message": "Client et toutes ses données supprimés définitivement",
        "deleted_data": deleted_data
    }


@router.get("/archived/count")
async def get_archived_clients_count(current_user: dict = Depends(get_current_user)):
    """Get count of archived clients"""
    count = await db.clients.count_documents({
        "entreprise_id": current_user["entreprise_id"],
        "archived": True
    })
    return {"count": count}


@router.get("/{client_id}/communications")
async def get_client_communication_history(
    client_id: str,
    comm_type: Optional[str] = None,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get communication history for a specific client"""
    # Verify client exists and belongs to entreprise
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "client_id": client_id
    }
    
    if comm_type and comm_type in ["email", "sms"]:
        query["type"] = comm_type
    
    communications = await db.communications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return [serialize_doc(c) for c in communications]
