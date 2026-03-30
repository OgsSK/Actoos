"""
Intervention routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List, Optional
from datetime import datetime, timezone, date as date_type
import uuid
import logging

from models import InterventionCreate, InterventionUpdate, ChecklistResponse
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
    
    update = {"statut": "annulee", "date_annulation": now}
    if motif:
        update["motif_annulation"] = motif
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "cancel", "intervention", intervention_id, {"motif": motif})
    
    return {"message": "Intervention annulée"}


@router.post("/{intervention_id}/start")
async def start_intervention(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """Start an intervention"""
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
    update = {"statut": "en_cours", "heure_debut": now}
    if is_unassigned and not is_admin:
        update["technicien_id"] = current_user["user_id"]
    
    await db.interventions.update_one({"id": intervention_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "start", "intervention", intervention_id)
    
    return {"message": "Intervention démarrée", "heure_debut": now}


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
        {"$set": {"technicien_id": current_user["user_id"], "date_assignation": now}}
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
    update = {"statut": "terminee", "heure_fin": now}
    if notes_terrain:
        update["notes_terrain"] = notes_terrain
    
    result = await db.interventions.update_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"], "technicien_id": current_user["user_id"]},
        {"$set": update}
    )
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
        {"$set": {"checklist_responses": responses_dict}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update_checklist", "intervention", intervention_id)
    return {"message": "Checklist mise à jour", "responses": responses_dict}
