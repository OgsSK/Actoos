"""
Categories management routes
"""
from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import uuid
import logging

from models import CategorieCreate
from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action
from plan_limits import check_category_limit, raise_limit_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["Categories"])

# Default categories to seed for new entreprises
DEFAULT_CATEGORIES = [
    {
        "code": "plomberie",
        "nom": "Plomberie",
        "description": "Interventions de plomberie et sanitaire",
        "icone": "droplet",
        "couleur": "#3B82F6",
        "checklist_template": [
            {"id": "plb_1", "label": "Coupure d'eau effectuée", "type": "checkbox", "required": True},
            {"id": "plb_2", "label": "Fuite identifiée et réparée", "type": "checkbox", "required": True},
            {"id": "plb_3", "label": "Test d'étanchéité réalisé", "type": "checkbox", "required": True},
            {"id": "plb_4", "label": "Pression vérifiée (bar)", "type": "number", "required": False},
            {"id": "plb_5", "label": "Photo avant intervention", "type": "photo", "required": False},
            {"id": "plb_6", "label": "Photo après intervention", "type": "photo", "required": False},
            {"id": "plb_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "electricite",
        "nom": "Électricité",
        "description": "Interventions électriques",
        "icone": "zap",
        "couleur": "#F59E0B",
        "checklist_template": [
            {"id": "elec_1", "label": "Coupure du courant effectuée", "type": "checkbox", "required": True},
            {"id": "elec_2", "label": "Vérification du tableau électrique", "type": "checkbox", "required": True},
            {"id": "elec_3", "label": "Test de continuité réalisé", "type": "checkbox", "required": False},
            {"id": "elec_4", "label": "Mise à la terre vérifiée", "type": "checkbox", "required": True},
            {"id": "elec_5", "label": "Tension mesurée (V)", "type": "number", "required": False},
            {"id": "elec_6", "label": "Photo du tableau", "type": "photo", "required": False},
            {"id": "elec_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "nettoyage",
        "nom": "Nettoyage",
        "description": "Services de nettoyage et entretien",
        "icone": "sparkles",
        "couleur": "#10B981",
        "checklist_template": [
            {"id": "net_1", "label": "Sols nettoyés", "type": "checkbox", "required": True},
            {"id": "net_2", "label": "Vitres nettoyées", "type": "checkbox", "required": False},
            {"id": "net_3", "label": "Sanitaires désinfectés", "type": "checkbox", "required": True},
            {"id": "net_4", "label": "Poubelles vidées", "type": "checkbox", "required": True},
            {"id": "net_5", "label": "Produits utilisés", "type": "text", "required": False},
            {"id": "net_6", "label": "Photo avant", "type": "photo", "required": False},
            {"id": "net_7", "label": "Photo après", "type": "photo", "required": False}
        ]
    },
    {
        "code": "climatisation",
        "nom": "Climatisation / Chauffage",
        "description": "Installation et maintenance CVC",
        "icone": "thermometer",
        "couleur": "#6366F1",
        "checklist_template": [
            {"id": "clim_1", "label": "Filtres vérifiés/remplacés", "type": "checkbox", "required": True},
            {"id": "clim_2", "label": "Niveau de gaz vérifié", "type": "checkbox", "required": True},
            {"id": "clim_3", "label": "Température de sortie (°C)", "type": "number", "required": False},
            {"id": "clim_4", "label": "Condensats évacués", "type": "checkbox", "required": False},
            {"id": "clim_5", "label": "Télécommande fonctionnelle", "type": "checkbox", "required": False},
            {"id": "clim_6", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "btp",
        "nom": "BTP / Travaux",
        "description": "Travaux de construction et rénovation",
        "icone": "hammer",
        "couleur": "#EF4444",
        "checklist_template": [
            {"id": "btp_1", "label": "Zone sécurisée", "type": "checkbox", "required": True},
            {"id": "btp_2", "label": "Matériaux réceptionnés", "type": "checkbox", "required": False},
            {"id": "btp_3", "label": "Travaux conformes au devis", "type": "checkbox", "required": True},
            {"id": "btp_4", "label": "Nettoyage du chantier", "type": "checkbox", "required": True},
            {"id": "btp_5", "label": "Photo avant travaux", "type": "photo", "required": False},
            {"id": "btp_6", "label": "Photo après travaux", "type": "photo", "required": False},
            {"id": "btp_7", "label": "Observations", "type": "text", "required": False}
        ]
    },
    {
        "code": "maintenance",
        "nom": "Maintenance générale",
        "description": "Entretien et maintenance préventive",
        "icone": "settings",
        "couleur": "#8B5CF6",
        "checklist_template": [
            {"id": "maint_1", "label": "Inspection visuelle effectuée", "type": "checkbox", "required": True},
            {"id": "maint_2", "label": "Points de contrôle vérifiés", "type": "checkbox", "required": True},
            {"id": "maint_3", "label": "Pièces remplacées", "type": "text", "required": False},
            {"id": "maint_4", "label": "Prochaine maintenance recommandée", "type": "text", "required": False},
            {"id": "maint_5", "label": "Photo équipement", "type": "photo", "required": False},
            {"id": "maint_6", "label": "Observations", "type": "text", "required": False}
        ]
    }
]


async def seed_categories_for_entreprise(entreprise_id: str):
    """Seed default categories for a new entreprise"""
    existing = await db.categories.count_documents({"entreprise_id": entreprise_id})
    if existing > 0:
        return  # Already seeded
    
    for cat in DEFAULT_CATEGORIES:
        cat_doc = {
            **cat,
            "id": str(uuid.uuid4()),
            "entreprise_id": entreprise_id,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.categories.insert_one(cat_doc)
    logger.info(f"Seeded {len(DEFAULT_CATEGORIES)} categories for entreprise {entreprise_id}")


@router.get("")
async def list_categories(current_user: dict = Depends(get_current_user)):
    """List all categories for the entreprise"""
    # Seed categories if none exist
    await seed_categories_for_entreprise(current_user["entreprise_id"])
    
    categories = await db.categories.find(
        {"entreprise_id": current_user["entreprise_id"], "active": True},
        {"_id": 0}
    ).sort("nom", 1).to_list(100)
    
    return [serialize_doc(c) for c in categories]


@router.get("/{categorie_id}")
async def get_categorie(categorie_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific category with its checklist template"""
    categorie = await db.categories.find_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not categorie:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    return serialize_doc(categorie)


@router.post("")
async def create_categorie(data: CategorieCreate, current_user: dict = Depends(require_admin)):
    """Create a new category (admin only)"""
    # Check category limit
    limit_check = await check_category_limit(db, current_user["entreprise_id"])
    raise_limit_error(limit_check)
    
    # Check if code already exists
    existing = await db.categories.find_one({
        "entreprise_id": current_user["entreprise_id"],
        "code": data.code
    })
    if existing:
        raise HTTPException(status_code=400, detail="Une catégorie avec ce code existe déjà")
    
    cat_dict = data.model_dump()
    cat_dict["id"] = str(uuid.uuid4())
    cat_dict["entreprise_id"] = current_user["entreprise_id"]
    cat_dict["active"] = True
    cat_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    # Convert checklist items to dicts
    cat_dict["checklist_template"] = [
        item.model_dump() if hasattr(item, 'model_dump') else item 
        for item in cat_dict.get("checklist_template", [])
    ]
    
    await db.categories.insert_one(cat_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "categorie", cat_dict["id"])
    
    return serialize_doc(cat_dict)


@router.put("/{categorie_id}")
async def update_categorie(categorie_id: str, data: CategorieCreate, current_user: dict = Depends(require_admin)):
    """Update a category (admin only)"""
    update_data = data.model_dump()
    update_data["checklist_template"] = [
        item.model_dump() if hasattr(item, 'model_dump') else item 
        for item in update_data.get("checklist_template", [])
    ]
    
    result = await db.categories.update_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "categorie", categorie_id)
    
    categorie = await db.categories.find_one({"id": categorie_id}, {"_id": 0})
    return serialize_doc(categorie)


@router.delete("/{categorie_id}")
async def delete_categorie(categorie_id: str, current_user: dict = Depends(require_admin)):
    """Soft delete a category (admin only)"""
    result = await db.categories.update_one(
        {"id": categorie_id, "entreprise_id": current_user["entreprise_id"]},
        {"$set": {"active": False}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "categorie", categorie_id)
    return {"message": "Catégorie supprimée"}
