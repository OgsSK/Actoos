"""
Client management routes
"""
from fastapi import APIRouter, HTTPException, Depends
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
    
    await db.clients.insert_one(client_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "client", client_dict["id"])
    
    return ClientResponse(**client_dict)


@router.get("", response_model=List[ClientResponse])
async def list_clients(
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all clients"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    if search:
        query["$or"] = [
            {"nom": {"$regex": search, "$options": "i"}},
            {"prenom": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"telephone": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
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
async def delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    """Delete a client (admin only)"""
    result = await db.clients.delete_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "client", client_id)
    return {"message": "Client supprimé"}


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
