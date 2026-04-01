"""
Intervention routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body, Query
from typing import List, Optional
from datetime import datetime, timezone, date as date_type
import uuid
import logging

from models import InterventionCreate, InterventionUpdate, ChecklistResponse, InterventionSignature, InterventionGeoLocation
from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action
from route_optimizer import optimize_route, calculate_simple_route_score
from push_service import notify_new_intervention_available_to_techs
from plan_limits import check_intervention_limit, raise_limit_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interventions", tags=["Interventions"])


async def notify_available_intervention(entreprise_id: str, intervention: dict, client: dict):
    """Notify technicians about a new available intervention via SMS and Push.
    Only notifies technicians with matching skills if the intervention has a category."""
    try:
        # Build query for technicians
        tech_query = {"entreprise_id": entreprise_id, "role": "tech", "statut": "actif"}
        
        # If intervention has a category, only notify techs with that skill
        categorie_id = intervention.get("categorie_id")
        if categorie_id:
            tech_query["$or"] = [
                {"skills": categorie_id},
                {"skills": {"$exists": False}},
                {"skills": []},
                {"skills": None}
            ]
        
        # Get matching technicians
        technicians = await db.users.find(
            tech_query,
            {"_id": 0, "id": 1, "telephone": 1, "prenom": 1, "nom": 1, "skills": 1}
        ).to_list(100)
        
        logger.info(f"Notifying {len(technicians)} qualified technicians for intervention {intervention.get('id')}")
        
        entreprise = await db.entreprises.find_one({"id": entreprise_id}, {"_id": 0, "nom": 1})
        entreprise_nom = entreprise.get("nom", "Votre entreprise") if entreprise else "Votre entreprise"
        
        # Parse date for message
        try:
            date_obj = datetime.fromisoformat(intervention["date_prevue"].replace('Z', '+00:00'))
            date_str = date_obj.strftime("%d/%m à %Hh%M")
        except:
            date_str = "bientôt"
        
        client_nom = f"{client.get('nom', '')} {client.get('prenom', '')}".strip() or "Client"
        
        # Send Push notifications to qualified techs only
        tech_ids = [t["id"] for t in technicians]
        if tech_ids:
            push_result = await notify_new_intervention_available_to_techs(db, entreprise_id, intervention, tech_ids)
            logger.info(f"Push notifications sent: {push_result}")
        
        # Send SMS to each qualified technician with a phone number
        for tech in technicians:
            if tech.get("telephone"):
                try:
                    message = f"🔔 {entreprise_nom}: Nouvelle intervention disponible!\n{intervention.get('titre', 'Intervention')}\n📍 {intervention.get('ville', '')}\n📅 {date_str}\n👤 {client_nom}\n\nOuvrez l'app pour l'accepter."
                    from sms_service import send_sms
                    await send_sms(tech["telephone"], message)
                except Exception as e:
                    logger.warning(f"Failed to send SMS to {tech.get('prenom')}: {e}")
    except Exception as e:
        logger.error(f"Error notifying technicians: {e}")


@router.post("")
async def create_intervention(
    data: InterventionCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Create a new intervention"""
    # Check intervention limit
    limit_check = await check_intervention_limit(db, current_user["entreprise_id"])
    raise_limit_error(limit_check)
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    intervention_dict = data.model_dump()
    intervention_dict["id"] = str(uuid.uuid4())
    intervention_dict["entreprise_id"] = current_user["entreprise_id"]
    intervention_dict["statut"] = "planifiee"
    intervention_dict["photos"] = []
    intervention_dict["date_prevue"] = intervention_dict["date_prevue"].isoformat()
    intervention_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    intervention_dict["updated_at"] = intervention_dict["created_at"]
    
    await db.interventions.insert_one(intervention_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "intervention", intervention_dict["id"])
    
    # If no technician assigned, notify all technicians
    if not intervention_dict.get("technicien_id"):
        background_tasks.add_task(
            notify_available_intervention,
            current_user["entreprise_id"],
            intervention_dict,
            client
        )
    
    return serialize_doc(intervention_dict)


@router.get("")
async def list_interventions(
    statut: Optional[str] = None,
    technicien_id: Optional[str] = None,
    client_id: Optional[str] = None,
    date_debut: Optional[str] = None,
    date_fin: Optional[str] = None,
    include_available: Optional[bool] = False,
    current_user: dict = Depends(get_current_user)
):
    """List interventions with filters. Technicians only see available interventions matching their skills."""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    # Technicians see their own + optionally available interventions (skill-filtered)
    if current_user["role"] == "tech":
        if include_available:
            # Get tech's skills
            tech = await db.users.find_one(
                {"id": current_user["user_id"]},
                {"_id": 0, "skills": 1}
            )
            tech_skills = tech.get("skills", []) if tech else []
            
            # Build available intervention filter based on skills
            available_filter = [
                {"technicien_id": None},
                {"technicien_id": {"$exists": False}}
            ]
            
            # If tech has skills, only show matching interventions or ones with no category
            if tech_skills:
                skill_filter = {
                    "$and": [
                        {"$or": available_filter},
                        {"$or": [
                            {"categorie_id": {"$in": tech_skills}},
                            {"categorie_id": None},
                            {"categorie_id": {"$exists": False}}
                        ]}
                    ]
                }
                query["$or"] = [
                    {"technicien_id": current_user["user_id"]},
                    skill_filter
                ]
            else:
                # Tech with no skills can see all available interventions
                query["$or"] = [
                    {"technicien_id": current_user["user_id"]},
                    {"technicien_id": None},
                    {"technicien_id": {"$exists": False}}
                ]
        else:
            query["technicien_id"] = current_user["user_id"]
    elif technicien_id:
        query["technicien_id"] = technicien_id
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    if date_debut:
        query["date_prevue"] = {"$gte": date_debut}
    if date_fin:
        if "date_prevue" in query:
            query["date_prevue"]["$lte"] = date_fin
        else:
            query["date_prevue"] = {"$lte": date_fin}
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(1000)
    return [serialize_doc(i) for i in interventions]


@router.get("/today")
async def get_today_interventions(current_user: dict = Depends(get_current_user)):
    """Get today's interventions for technician. Skill-based filtering for available missions."""
    today = datetime.now(timezone.utc).date()
    today_start = datetime(today.year, today.month, today.day, 0, 0, 0, tzinfo=timezone.utc).isoformat()
    today_end = datetime(today.year, today.month, today.day, 23, 59, 59, tzinfo=timezone.utc).isoformat()
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "date_prevue": {"$gte": today_start, "$lte": today_end}
    }
    
    if current_user["role"] == "tech":
        # Get tech's skills
        tech = await db.users.find_one(
            {"id": current_user["user_id"]},
            {"_id": 0, "skills": 1}
        )
        tech_skills = tech.get("skills", []) if tech else []
        
        # Build available intervention filter
        available_filter = [
            {"technicien_id": None},
            {"technicien_id": {"$exists": False}}
        ]
        
        if tech_skills:
            # Tech with skills: only see matching interventions or ones with no category
            skill_filter = {
                "$and": [
                    {"$or": available_filter},
                    {"$or": [
                        {"categorie_id": {"$in": tech_skills}},
                        {"categorie_id": None},
                        {"categorie_id": {"$exists": False}}
                    ]}
                ]
            }
            query["$or"] = [
                {"technicien_id": current_user["user_id"]},
                skill_filter
            ]
        else:
            # Tech with no skills can see all available interventions
            query["$or"] = [
                {"technicien_id": current_user["user_id"]},
                {"technicien_id": None},
                {"technicien_id": {"$exists": False}}
            ]
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(100)
    
    # Enrich with client data
    for i in interventions:
        client = await db.clients.find_one({"id": i["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "telephone": 1, "adresse": 1})
        i["client"] = serialize_doc(client) if client else None
    
    return [serialize_doc(i) for i in interventions]


@router.get("/available")
async def get_available_interventions(current_user: dict = Depends(get_current_user)):
    """Get available (unassigned) interventions for technicians to claim. Filtered by technician skills."""
    # Get tech's skills if tech role
    tech_skills = []
    if current_user["role"] == "tech":
        tech = await db.users.find_one(
            {"id": current_user["user_id"]},
            {"_id": 0, "skills": 1}
        )
        tech_skills = tech.get("skills", []) if tech else []
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "statut": "planifiee",
        "$or": [
            {"technicien_id": None},
            {"technicien_id": {"$exists": False}}
        ]
    }
    
    # If tech has skills, filter interventions by matching category
    if current_user["role"] == "tech" and tech_skills:
        query["$and"] = [
            {"$or": query.pop("$or")},
            {"$or": [
                {"categorie_id": {"$in": tech_skills}},
                {"categorie_id": None},
                {"categorie_id": {"$exists": False}}
            ]}
        ]
    
    interventions = await db.interventions.find(query, {"_id": 0}).sort("date_prevue", 1).to_list(100)
    
    # Enrich with client data
    for i in interventions:
        client = await db.clients.find_one({"id": i["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1, "telephone": 1, "adresse": 1})
        i["client"] = serialize_doc(client) if client else None
    
    return [serialize_doc(i) for i in interventions]


# ==================== ROUTE OPTIMIZATION ====================
@router.post("/optimize-route")
async def optimize_interventions_route(
    date: str = None,
    intervention_ids: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Optimize the route for interventions using AI"""
    # Default to today
    if not date:
        date = date_type.today().isoformat()
    
    # Parse intervention_ids if provided as comma-separated string
    ids_list = None
    if intervention_ids:
        ids_list = [id.strip() for id in intervention_ids.split(',') if id.strip()]
    
    # Build query
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if ids_list:
        query["id"] = {"$in": ids_list}
    else:
        # Get interventions for the date
        query["date_prevue"] = {"$regex": f"^{date}"}
        query["statut"] = {"$in": ["planifiee", "en_cours"]}
    
    # For technicians, only their interventions
    if current_user.get("role") == "tech":
        query["$or"] = [
            {"technicien_id": current_user["user_id"]},
            {"technicien_id": None}
        ]
    
    # Fetch interventions with client data
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(length=50)
    
    # Enrich with client info
    client_ids = list(set(i.get("client_id") for i in interventions if i.get("client_id")))
    clients_cursor = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(length=100)
    clients_map = {c["id"]: c for c in clients_cursor}
    
    for inv in interventions:
        inv["client"] = clients_map.get(inv.get("client_id"))
    
    # Optimize route
    result = await optimize_route(interventions)
    
    # Add intervention details to result
    interventions_map = {i["id"]: i for i in interventions}
    result["interventions"] = [
        {
            "id": inv_id,
            "titre": interventions_map.get(inv_id, {}).get("titre", ""),
            "adresse": interventions_map.get(inv_id, {}).get("adresse", "") or 
                      interventions_map.get(inv_id, {}).get("client", {}).get("adresse", ""),
            "ville": interventions_map.get(inv_id, {}).get("ville", "") or 
                    interventions_map.get(inv_id, {}).get("client", {}).get("ville", ""),
            "heure_prevue": interventions_map.get(inv_id, {}).get("date_prevue", ""),
            "priorite": interventions_map.get(inv_id, {}).get("priorite", "normale"),
            "statut": interventions_map.get(inv_id, {}).get("statut", "")
        }
        for inv_id in result.get("optimized_order", [])
    ]
    
    return result


@router.get("/route-score")
async def get_route_score(
    date: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Get a simple route efficiency score for the day's interventions"""
    if not date:
        date = date_type.today().isoformat()
    
    query = {
        "entreprise_id": current_user["entreprise_id"],
        "date_prevue": {"$regex": f"^{date}"},
        "statut": {"$in": ["planifiee", "en_cours"]}
    }
    
    if current_user.get("role") == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    interventions = await db.interventions.find(query, {"_id": 0}).to_list(length=50)
    
    # Enrich with client info
    client_ids = list(set(i.get("client_id") for i in interventions if i.get("client_id")))
    if client_ids:
        clients_cursor = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(length=100)
        clients_map = {c["id"]: c for c in clients_cursor}
        for inv in interventions:
            inv["client"] = clients_map.get(inv.get("client_id"))
    
    score = calculate_simple_route_score(interventions)
    score["date"] = date
    score["total_interventions"] = len(interventions)
    
    return score


@router.post("/apply-optimized-order")
async def apply_optimized_order(
    optimized_order: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Apply the optimized order by updating intervention priorities/order field"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Seuls les admins peuvent réorganiser les interventions")
    
    # Update each intervention with its position in the optimized order
    for position, intervention_id in enumerate(optimized_order):
        await db.interventions.update_one(
            {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
            {"$set": {"ordre_tournee": position + 1, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "optimize_route", 
        "interventions", 
        f"optimized_{len(optimized_order)}_interventions"
    )
    
    return {
        "message": f"Ordre optimisé appliqué à {len(optimized_order)} interventions",
        "order": optimized_order
    }


@router.get("/{intervention_id}")
async def get_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific intervention"""
    query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    intervention = await db.interventions.find_one(query, {"_id": 0})
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Enrich with client data
    client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0})
    intervention["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(intervention)


@router.put("/{intervention_id}")
async def update_intervention(
    intervention_id: str,
    data: InterventionUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an intervention"""
    query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    update_data = data.model_dump(exclude_unset=True)
    for key in ["date_prevue", "heure_debut", "heure_fin"]:
        if key in update_data and update_data[key]:
            update_data[key] = update_data[key].isoformat()
    
    # Add updated_at timestamp for LWW conflict resolution
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.interventions.update_one(query, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "intervention", intervention_id)
    
    intervention = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
    return serialize_doc(intervention)


@router.delete("/{intervention_id}")
async def delete_intervention(intervention_id: str, current_user: dict = Depends(require_admin)):
    """Delete an intervention (admin only)"""
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Cannot delete if already started
    if intervention["statut"] in ["en_cours", "terminee"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer une intervention en cours ou terminée")
    
    await db.interventions.delete_one({"id": intervention_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "intervention", intervention_id)
    
    return {"message": "Intervention supprimée"}


@router.post("/{intervention_id}/cancel")
async def cancel_intervention(
    intervention_id: str,
    motif: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Cancel an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    if intervention["statut"] in ["terminee", "annulee"]:
        raise HTTPException(status_code=400, detail="Cette intervention ne peut pas être annulée")
    
    update = {"statut": "annulee", "date_annulation": now, "updated_at": now}
    if motif:
        update["motif_annulation"] = motif
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "cancel", "intervention", intervention_id, {"motif": motif})
    
    return {"message": "Intervention annulée"}


@router.post("/{intervention_id}/start")
async def start_intervention(
    intervention_id: str,
    geo: Optional[InterventionGeoLocation] = None,
    current_user: dict = Depends(get_current_user)
):
    """Start an intervention with optional geolocation"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the intervention
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Check if user can start (admin can start any, tech can start if assigned or unassigned)
    is_admin = current_user.get("role") == "admin"
    is_assigned = intervention.get("technicien_id") == current_user["user_id"]
    is_unassigned = not intervention.get("technicien_id")
    
    if not is_admin and not is_assigned and not is_unassigned:
        raise HTTPException(status_code=403, detail="Vous n'êtes pas assigné à cette intervention")
    
    if intervention["statut"] != "planifiee":
        raise HTTPException(status_code=400, detail="Cette intervention ne peut pas être démarrée")
    
    # If unassigned and tech starts, assign to them
    update = {"statut": "en_cours", "heure_debut": now, "updated_at": now}
    if is_unassigned and not is_admin:
        update["technicien_id"] = current_user["user_id"]
    
    # Add geolocation if provided
    if geo:
        update["geo_debut"] = {
            "latitude": geo.latitude,
            "longitude": geo.longitude,
            "accuracy": geo.accuracy,
            "timestamp": geo.timestamp or now
        }
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "start", "intervention", intervention_id)
    
    return {"message": "Intervention démarrée", "heure_debut": now, "geo_debut": update.get("geo_debut")}


@router.post("/{intervention_id}/claim")
async def claim_intervention(
    intervention_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
):
    """Claim an unassigned intervention - first tech to claim gets it"""
    # Find the intervention
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Check if already assigned
    if intervention.get("technicien_id"):
        # Get the tech who has it
        assigned_tech = await db.users.find_one({"id": intervention["technicien_id"]}, {"_id": 0, "prenom": 1, "nom": 1})
        tech_name = f"{assigned_tech.get('prenom', '')} {assigned_tech.get('nom', '')}" if assigned_tech else "un autre technicien"
        raise HTTPException(status_code=409, detail=f"Cette intervention a déjà été prise par {tech_name}")
    
    if intervention["statut"] != "planifiee":
        raise HTTPException(status_code=400, detail="Cette intervention ne peut plus être réclamée")
    
    # Assign to the tech who claims it
    now = datetime.now(timezone.utc).isoformat()
    await db.interventions.update_one(
        {"id": intervention_id, "technicien_id": None},
        {"$set": {"technicien_id": current_user["user_id"], "date_assignation": now, "updated_at": now}}
    )
    
    # Verify it was actually assigned to this user (race condition check)
    updated = await db.interventions.find_one({"id": intervention_id}, {"_id": 0, "technicien_id": 1})
    if updated.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=409, detail="Cette intervention a été prise par un autre technicien")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "claim", "intervention", intervention_id)
    
    # Get current user info for notification
    claiming_tech = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "prenom": 1, "nom": 1})
    tech_name = f"{claiming_tech.get('prenom', '')} {claiming_tech.get('nom', '')}" if claiming_tech else "Un technicien"
    
    return {
        "message": "Intervention assignée avec succès",
        "intervention_id": intervention_id,
        "technicien_id": current_user["user_id"],
        "technicien_nom": tech_name
    }


@router.post("/{intervention_id}/complete")
async def complete_intervention(
    intervention_id: str,
    notes_terrain: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Complete an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    update = {"statut": "terminee", "heure_fin": now, "updated_at": now}
    if notes_terrain:
        update["notes_terrain"] = notes_terrain
    
    # Build query - admins can complete any intervention, techs only their own
    query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user.get("role") != "admin":
        query["technicien_id"] = current_user["user_id"]
    
    result = await db.interventions.update_one(query, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "complete", "intervention", intervention_id)
    return {"message": "Intervention terminée", "heure_fin": now}


@router.put("/{intervention_id}/checklist")
async def update_intervention_checklist(
    intervention_id: str,
    responses: List[ChecklistResponse],
    current_user: dict = Depends(get_current_user)
):
    """Update checklist responses for an intervention"""
    # Verify access
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Techs can only update their own interventions
    if current_user["role"] == "tech" and intervention.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    # Convert to dict and add timestamp
    responses_dict = []
    for r in responses:
        r_dict = r.model_dump()
        if r_dict.get("checked") or r_dict.get("value") or r_dict.get("photo_url"):
            r_dict["completed_at"] = datetime.now(timezone.utc).isoformat()
        responses_dict.append(r_dict)
    
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$set": {"checklist_responses": responses_dict, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_checklist", "intervention", intervention_id)
    return {"message": "Checklist mise à jour", "responses": responses_dict}


@router.post("/{intervention_id}/complete-with-signature")
async def complete_intervention_with_signature(
    intervention_id: str,
    data: InterventionSignature,
    geo_latitude: Optional[float] = Query(None),
    geo_longitude: Optional[float] = Query(None),
    geo_accuracy: Optional[float] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    """Complete an intervention with client signature and optional geolocation (via query params)"""
    from plan_limits import check_feature
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Find the intervention
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Verify technician owns this intervention
    if current_user["role"] == "tech" and intervention.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    if intervention["statut"] != "en_cours":
        raise HTTPException(status_code=400, detail="Cette intervention doit être en cours pour être terminée")
    
    # Check if team_validation feature is enabled (Pro+)
    requires_validation = await check_feature(db, current_user["entreprise_id"], "team_validation")
    
    # If team_validation is enabled and user is a tech, set status to "en_validation"
    # Admins can complete directly
    if requires_validation and current_user["role"] == "tech":
        new_statut = "en_validation"
    else:
        new_statut = "terminee"
    
    # Build update
    update = {
        "statut": new_statut,
        "heure_fin": now,
        "signature_client": data.signature,
        "nom_signataire": data.nom_signataire,
        "date_signature": now,
        "updated_at": now
    }
    
    if data.notes:
        update["notes_terrain"] = data.notes
    
    # Add geolocation if provided via query params
    if geo_latitude is not None and geo_longitude is not None:
        update["geo_fin"] = {
            "latitude": geo_latitude,
            "longitude": geo_longitude,
            "accuracy": geo_accuracy,
            "timestamp": now
        }
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "complete_with_signature",
        "intervention",
        intervention_id,
        {"signataire": data.nom_signataire, "has_geo": geo_latitude is not None}
    )
    
    return {
        "message": "Intervention terminée et signée",
        "heure_fin": now,
        "signataire": data.nom_signataire,
        "date_signature": now
    }


@router.post("/{intervention_id}/signature")
async def add_signature_to_intervention(
    intervention_id: str,
    data: InterventionSignature,
    current_user: dict = Depends(get_current_user)
):
    """Add client signature to an intervention (can be done before completion)"""
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Verify technician owns this intervention
    if current_user["role"] == "tech" and intervention.get("technicien_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    update = {
        "signature_client": data.signature,
        "nom_signataire": data.nom_signataire,
        "date_signature": now,
        "updated_at": now
    }
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "signature",
        "intervention",
        intervention_id,
        {"signataire": data.nom_signataire}
    )
    
    return {
        "message": "Signature enregistrée",
        "signataire": data.nom_signataire,
        "date_signature": now
    }


@router.post("/{intervention_id}/geolocation")
async def update_intervention_geolocation(
    intervention_id: str,
    geo: InterventionGeoLocation,
    geo_type: str = "current",  # "debut", "fin", or "current"
    current_user: dict = Depends(get_current_user)
):
    """Update geolocation for an intervention"""
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    geo_data = {
        "latitude": geo.latitude,
        "longitude": geo.longitude,
        "accuracy": geo.accuracy,
        "timestamp": geo.timestamp or now
    }
    
    field_name = f"geo_{geo_type}" if geo_type in ["debut", "fin"] else "geo_current"
    
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$set": {field_name: geo_data, "updated_at": now}}
    )
    
    return {"message": "Géolocalisation mise à jour", "type": geo_type, "geo": geo_data}


@router.post("/{intervention_id}/validate")
async def validate_intervention(
    intervention_id: str,
    approved: bool = True,
    notes_validation: Optional[str] = None,
    current_user: dict = Depends(require_admin)
):
    """
    Validate a completed intervention (Admin/Team Leader only)
    This is required when team_validation feature is enabled (Pro+ plans)
    """
    now = datetime.now(timezone.utc).isoformat()
    
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    if intervention["statut"] != "en_validation":
        raise HTTPException(
            status_code=400, 
            detail=f"Cette intervention n'est pas en attente de validation (statut: {intervention['statut']})"
        )
    
    if approved:
        # Approve: set to terminee
        update = {
            "statut": "terminee",
            "validated_by": current_user["user_id"],
            "validated_at": now,
            "notes_validation": notes_validation,
            "updated_at": now
        }
        action = "validate"
        message = "Intervention validée et terminée"
    else:
        # Reject: send back to en_cours for fixes
        update = {
            "statut": "en_cours",
            "rejected_by": current_user["user_id"],
            "rejected_at": now,
            "rejection_reason": notes_validation,
            # Clear the signature so tech needs to re-complete
            "heure_fin": None,
            "updated_at": now
        }
        action = "reject"
        message = "Intervention rejetée - renvoyée au technicien"
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        action,
        "intervention",
        intervention_id,
        {"approved": approved, "notes": notes_validation}
    )
    
    # TODO: Send notification to technician about validation result
    
    return {
        "message": message,
        "approved": approved,
        "validated_by": current_user["user_id"],
        "timestamp": now
    }


@router.get("/pending-validation")
async def get_interventions_pending_validation(
    current_user: dict = Depends(require_admin)
):
    """Get all interventions pending validation (Admin only)"""
    interventions = await db.interventions.find(
        {
            "entreprise_id": current_user["entreprise_id"],
            "statut": "en_validation"
        },
        {"_id": 0}
    ).sort("heure_fin", -1).to_list(100)
    
    # Enrich with client and technician info
    for intervention in interventions:
        client = await db.clients.find_one({"id": intervention["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
        intervention["client_nom"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
        
        if intervention.get("technicien_id"):
            tech = await db.users.find_one({"id": intervention["technicien_id"]}, {"_id": 0, "prenom": 1, "nom": 1})
            intervention["technicien_nom"] = f"{tech.get('prenom', '')} {tech.get('nom', '')}" if tech else ""
    
    return [serialize_doc(i) for i in interventions]


# ==================== OFFLINE SYNC WITH LWW ====================

@router.post("/sync")
async def sync_interventions(
    changes: List[dict] = Body(...),
    last_sync: Optional[str] = Body(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Synchronize offline changes with Last-Write-Wins conflict resolution.
    
    Each change should have:
    - intervention_id: str
    - updates: dict of field changes
    - local_updated_at: ISO timestamp of when the change was made locally
    
    Returns:
    - synced: list of successfully synced interventions
    - conflicts: list of interventions where server version was newer (LWW applied)
    - errors: list of failed syncs
    - server_updates: interventions modified on server since last_sync
    """
    results = {
        "synced": [],
        "conflicts": [],
        "errors": [],
        "server_updates": []
    }
    
    now = datetime.now(timezone.utc).isoformat()
    
    for change in changes:
        try:
            intervention_id = change.get("intervention_id")
            updates = change.get("updates", {})
            local_updated_at = change.get("local_updated_at")
            
            if not intervention_id:
                results["errors"].append({"error": "Missing intervention_id", "change": change})
                continue
            
            # Fetch current server state
            query = {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]}
            if current_user["role"] == "tech":
                query["$or"] = [
                    {"technicien_id": current_user["user_id"]},
                    {"technicien_id": None},
                    {"technicien_id": {"$exists": False}}
                ]
            
            server_intervention = await db.interventions.find_one(query, {"_id": 0})
            
            if not server_intervention:
                results["errors"].append({
                    "intervention_id": intervention_id, 
                    "error": "Intervention not found or not accessible"
                })
                continue
            
            server_updated_at = server_intervention.get("updated_at")
            
            # LWW: Compare timestamps
            conflict_detected = False
            if server_updated_at and local_updated_at:
                server_time = datetime.fromisoformat(server_updated_at.replace('Z', '+00:00'))
                local_time = datetime.fromisoformat(local_updated_at.replace('Z', '+00:00'))
                
                if server_time > local_time:
                    # Server version is newer - this is a conflict, server wins
                    conflict_detected = True
                    results["conflicts"].append({
                        "intervention_id": intervention_id,
                        "server_updated_at": server_updated_at,
                        "local_updated_at": local_updated_at,
                        "server_data": serialize_doc(server_intervention),
                        "resolution": "server_wins",
                        "message": "La version du serveur est plus récente"
                    })
                    continue
            
            # Apply updates (local version wins or no conflict)
            # Clean updates - remove protected fields
            protected_fields = ["id", "entreprise_id", "_id", "created_at"]
            clean_updates = {k: v for k, v in updates.items() if k not in protected_fields}
            clean_updates["updated_at"] = now
            clean_updates["synced_at"] = now
            
            await db.interventions.update_one(
                {"id": intervention_id},
                {"$set": clean_updates}
            )
            
            # Fetch updated intervention
            updated = await db.interventions.find_one({"id": intervention_id}, {"_id": 0})
            
            results["synced"].append({
                "intervention_id": intervention_id,
                "updated_at": now,
                "data": serialize_doc(updated)
            })
            
            await log_action(
                current_user["entreprise_id"],
                current_user["user_id"],
                "sync",
                "intervention",
                intervention_id,
                {"offline_sync": True}
            )
            
        except Exception as e:
            logger.error(f"Sync error for change {change}: {e}")
            results["errors"].append({
                "intervention_id": change.get("intervention_id"),
                "error": str(e)
            })
    
    # Get server updates since last_sync (for bi-directional sync)
    if last_sync:
        try:
            query = {
                "entreprise_id": current_user["entreprise_id"],
                "updated_at": {"$gt": last_sync}
            }
            if current_user["role"] == "tech":
                query["technicien_id"] = current_user["user_id"]
            
            server_changes = await db.interventions.find(query, {"_id": 0}).to_list(100)
            results["server_updates"] = [serialize_doc(i) for i in server_changes]
        except Exception as e:
            logger.error(f"Error fetching server updates: {e}")
    
    return {
        "success": True,
        "timestamp": now,
        "summary": {
            "synced": len(results["synced"]),
            "conflicts": len(results["conflicts"]),
            "errors": len(results["errors"]),
            "server_updates": len(results["server_updates"])
        },
        **results
    }


@router.get("/sync/status")
async def get_sync_status(
    since: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get sync status - what has changed on the server since a given timestamp.
    Used by frontend to check if there are updates to fetch.
    """
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    if since:
        query["updated_at"] = {"$gt": since}
    
    # Count changed interventions
    count = await db.interventions.count_documents(query)
    
    # Get latest updated_at
    latest = await db.interventions.find_one(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "updated_at": 1},
        sort=[("updated_at", -1)]
    )
    
    return {
        "changes_count": count,
        "latest_update": latest.get("updated_at") if latest else None,
        "server_time": datetime.now(timezone.utc).isoformat()
    }
