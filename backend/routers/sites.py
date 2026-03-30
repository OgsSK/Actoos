"""
Sites routes - Multi-site support for clients
A client can have multiple physical locations (headquarters, warehouse, factory, etc.)
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import logging

from models import SiteCreate, SiteUpdate, SiteResponse
from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sites", tags=["Sites"])


@router.post("", response_model=SiteResponse)
async def create_site(
    data: SiteCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new site for a client"""
    # Verify client exists and belongs to the same entreprise
    client = await db.clients.find_one({
        "id": data.client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    site_dict = data.model_dump()
    site_dict["id"] = str(uuid.uuid4())
    site_dict["entreprise_id"] = current_user["entreprise_id"]
    site_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sites.insert_one(site_dict)
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "create",
        "site",
        site_dict["id"],
        {"client_id": data.client_id, "nom": data.nom}
    )
    
    logger.info(f"Site created: {site_dict['id']} for client {data.client_id}")
    return serialize_doc(site_dict)


@router.get("", response_model=List[SiteResponse])
async def list_sites(
    client_id: Optional[str] = None,
    actif: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all sites, optionally filtered by client"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if client_id:
        query["client_id"] = client_id
    if actif is not None:
        query["actif"] = actif
    
    sites = await db.sites.find(query, {"_id": 0}).sort("nom", 1).to_list(500)
    return [serialize_doc(s) for s in sites]


@router.get("/client/{client_id}", response_model=List[SiteResponse])
async def get_client_sites(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all sites for a specific client"""
    # Verify client exists
    client = await db.clients.find_one({
        "id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    sites = await db.sites.find(
        {"client_id": client_id, "entreprise_id": current_user["entreprise_id"], "actif": True},
        {"_id": 0}
    ).sort("nom", 1).to_list(100)
    
    return [serialize_doc(s) for s in sites]


@router.get("/{site_id}", response_model=SiteResponse)
async def get_site(
    site_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific site"""
    site = await db.sites.find_one({
        "id": site_id,
        "entreprise_id": current_user["entreprise_id"]
    }, {"_id": 0})
    
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    
    return serialize_doc(site)


@router.put("/{site_id}", response_model=SiteResponse)
async def update_site(
    site_id: str,
    data: SiteUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a site"""
    site = await db.sites.find_one({
        "id": site_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    
    update_data = data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.sites.update_one({"id": site_id}, {"$set": update_data})
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "update",
        "site",
        site_id
    )
    
    updated_site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    return serialize_doc(updated_site)


@router.delete("/{site_id}")
async def delete_site(
    site_id: str,
    current_user: dict = Depends(require_admin)
):
    """Delete a site (admin only) - actually deactivates it"""
    site = await db.sites.find_one({
        "id": site_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    if not site:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    
    # Check if site has linked interventions
    linked_interventions = await db.interventions.count_documents({
        "site_id": site_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    if linked_interventions > 0:
        # Soft delete - just deactivate
        await db.sites.update_one(
            {"id": site_id},
            {"$set": {"actif": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        await log_action(
            current_user["entreprise_id"],
            current_user["user_id"],
            "deactivate",
            "site",
            site_id,
            {"reason": f"{linked_interventions} interventions liées"}
        )
        return {
            "message": f"Site désactivé ({linked_interventions} interventions liées)",
            "deactivated": True
        }
    else:
        # Hard delete if no linked interventions
        await db.sites.delete_one({"id": site_id})
        await log_action(
            current_user["entreprise_id"],
            current_user["user_id"],
            "delete",
            "site",
            site_id
        )
        return {"message": "Site supprimé", "deleted": True}


@router.post("/{site_id}/activate")
async def activate_site(
    site_id: str,
    current_user: dict = Depends(require_admin)
):
    """Reactivate a deactivated site"""
    result = await db.sites.update_one(
        {"id": site_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {"actif": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Site non trouvé")
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "activate",
        "site",
        site_id
    )
    
    return {"message": "Site réactivé"}
