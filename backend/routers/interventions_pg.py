"""
Intervention routes - OPTIMIZED PostgreSQL
Core CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body, Query
from typing import List, Optional
from datetime import datetime, timezone, date as date_type, timedelta
import uuid
import logging

from models import InterventionCreate, InterventionUpdate, InterventionSignature
from auth import get_current_user, require_admin
from postgres_db import pg

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interventions", tags=["Interventions"])


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


@router.post("")
async def create_intervention(
    data: InterventionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new intervention"""
    # Verify client exists
    client = await pg.find_one("clients", {"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    intervention_id = str(uuid.uuid4())
    intervention_data = data.model_dump()
    intervention_data["id"] = intervention_id
    intervention_data["entreprise_id"] = current_user["entreprise_id"]
    intervention_data["created_by"] = current_user["user_id"]
    intervention_data["statut"] = data.statut or "planifiee"
    
    # Copy client address if not provided
    if not intervention_data.get("adresse"):
        intervention_data["adresse"] = client.get("adresse")
        intervention_data["ville"] = client.get("ville")
        intervention_data["code_postal"] = client.get("code_postal")
    
    await pg.insert("interventions", intervention_data)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "intervention", intervention_id)
    
    intervention = await pg.find_one("interventions", {"id": intervention_id})
    return intervention


@router.get("")
async def list_interventions(
    statut: Optional[str] = None,
    technicien_id: Optional[str] = None,
    client_id: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List interventions with filters"""
    query = """
    SELECT 
        i.*,
        c.nom as client_nom, c.prenom as client_prenom, c.telephone as client_telephone,
        u.nom as technicien_nom, u.prenom as technicien_prenom
    FROM interventions i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN users u ON i.technicien_id = u.id
    WHERE i.entreprise_id = :ent_id
    """
    params = {"ent_id": current_user["entreprise_id"]}
    
    if statut:
        query += " AND i.statut = :statut"
        params["statut"] = statut
    
    if technicien_id:
        query += " AND i.technicien_id = :tech_id"
        params["tech_id"] = technicien_id
    
    if client_id:
        query += " AND i.client_id = :client_id"
        params["client_id"] = client_id
    
    if date_debut:
        query += " AND i.date_prevue >= :date_debut"
        params["date_debut"] = date_debut
    
    if date_fin:
        query += " AND i.date_prevue <= :date_fin"
        params["date_fin"] = date_fin
    
    query += " ORDER BY i.date_prevue DESC LIMIT 1000"
    
    return await pg.fetch_all(query, params)


@router.get("/available")
async def list_available_interventions(current_user: dict = Depends(get_current_user)):
    """List available interventions for technicians to claim"""
    query = """
    SELECT 
        i.*,
        c.nom as client_nom, c.prenom as client_prenom, c.adresse as client_adresse
    FROM interventions i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.entreprise_id = :ent_id
    AND i.statut = 'disponible'
    AND i.technicien_id IS NULL
    ORDER BY i.date_prevue ASC
    LIMIT 100
    """
    return await pg.fetch_all(query, {"ent_id": current_user["entreprise_id"]})


@router.get("/my")
async def list_my_interventions(
    statut: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List interventions assigned to current technician"""
    query = """
    SELECT 
        i.*,
        c.nom as client_nom, c.prenom as client_prenom, c.telephone as client_telephone,
        c.adresse as client_adresse, c.ville as client_ville
    FROM interventions i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.entreprise_id = :ent_id AND i.technicien_id = :user_id
    """
    params = {"ent_id": current_user["entreprise_id"], "user_id": current_user["user_id"]}
    
    if statut:
        query += " AND i.statut = :statut"
        params["statut"] = statut
    
    query += " ORDER BY i.date_prevue ASC LIMIT 500"
    
    return await pg.fetch_all(query, params)


@router.get("/{intervention_id}")
async def get_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific intervention with details"""
    query = """
    SELECT 
        i.*,
        c.nom as client_nom, c.prenom as client_prenom, c.email as client_email,
        c.telephone as client_telephone, c.adresse as client_adresse,
        u.nom as technicien_nom, u.prenom as technicien_prenom, u.telephone as technicien_telephone
    FROM interventions i
    LEFT JOIN clients c ON i.client_id = c.id
    LEFT JOIN users u ON i.technicien_id = u.id
    WHERE i.id = :id AND i.entreprise_id = :ent_id
    """
    intervention = await pg.fetch_one(query, {"id": intervention_id, "ent_id": current_user["entreprise_id"]})
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    return intervention


@router.put("/{intervention_id}")
async def update_intervention(
    intervention_id: str,
    data: InterventionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an intervention"""
    update_data = data.model_dump(exclude_unset=True)
    
    count = await pg.update(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        update_data
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "intervention", intervention_id)
    
    return await pg.find_one("interventions", {"id": intervention_id})


@router.delete("/{intervention_id}")
async def delete_intervention(intervention_id: str, current_user: dict = Depends(require_admin)):
    """Delete an intervention"""
    count = await pg.delete(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "intervention", intervention_id)
    return {"message": "Intervention supprimée"}


@router.post("/{intervention_id}/assign")
async def assign_intervention(
    intervention_id: str,
    technicien_id: str,
    current_user: dict = Depends(require_admin)
):
    """Assign intervention to a technician"""
    # Verify technician exists
    tech = await pg.find_one("users", {"id": technicien_id, "entreprise_id": current_user["entreprise_id"], "role": "technicien"})
    if not tech:
        raise HTTPException(status_code=404, detail="Technicien non trouvé")
    
    count = await pg.update(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"technicien_id": technicien_id, "statut": "planifiee"}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "assign", "intervention", intervention_id, {"technicien_id": technicien_id})
    return {"message": "Intervention assignée"}


@router.post("/{intervention_id}/claim")
async def claim_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Technician claims an available intervention"""
    intervention = await pg.find_one(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    if intervention.get("statut") != "disponible":
        raise HTTPException(status_code=400, detail="Cette intervention n'est plus disponible")
    
    if intervention.get("technicien_id"):
        raise HTTPException(status_code=400, detail="Cette intervention est déjà assignée")
    
    await pg.update(
        "interventions",
        {"id": intervention_id},
        {"technicien_id": current_user["user_id"], "statut": "planifiee"}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "claim", "intervention", intervention_id)
    return {"message": "Intervention réclamée avec succès"}


@router.post("/{intervention_id}/start")
async def start_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Start an intervention"""
    intervention = await pg.find_one(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Verify user is assigned or admin
    if intervention.get("technicien_id") != current_user["user_id"] and current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    await pg.update(
        "interventions",
        {"id": intervention_id},
        {"statut": "en_cours", "date_debut_reelle": datetime.now(timezone.utc)}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "start", "intervention", intervention_id)
    return {"message": "Intervention démarrée"}


@router.post("/{intervention_id}/complete")
async def complete_intervention(
    intervention_id: str,
    rapport: str = Body(None),
    notes_technicien: str = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """Complete an intervention"""
    intervention = await pg.find_one(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    update_data = {
        "statut": "terminee",
        "date_fin_reelle": datetime.now(timezone.utc)
    }
    if rapport:
        update_data["rapport"] = rapport
    if notes_technicien:
        update_data["notes_technicien"] = notes_technicien
    
    await pg.update("interventions", {"id": intervention_id}, update_data)
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "complete", "intervention", intervention_id)
    return {"message": "Intervention terminée"}


@router.post("/{intervention_id}/cancel")
async def cancel_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel an intervention"""
    count = await pg.update(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"statut": "annulee"}
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "cancel", "intervention", intervention_id)
    return {"message": "Intervention annulée"}


@router.post("/{intervention_id}/signature")
async def add_signature(
    intervention_id: str,
    data: InterventionSignature,
    current_user: dict = Depends(get_current_user)
):
    """Add client signature to intervention"""
    count = await pg.update(
        "interventions",
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {
            "signature_client": data.signature_data,
            "nom_signataire": data.nom_signataire,
            "date_signature": datetime.now(timezone.utc)
        }
    )
    if count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    return {"message": "Signature ajoutée"}


@router.get("/{intervention_id}/photos")
async def get_intervention_photos(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Get photos for an intervention"""
    photos = await pg.find_many(
        "photos",
        {"intervention_id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        order_by="created_at ASC"
    )
    return photos


@router.get("/stats/summary")
async def get_interventions_stats(current_user: dict = Depends(get_current_user)):
    """Get intervention statistics"""
    stats = await pg.get_dashboard_stats(current_user["entreprise_id"])
    return stats
