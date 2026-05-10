"""
Search routes
"""
from fastapi import APIRouter, Depends

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(tags=["Search"])


@router.get("/search")
async def global_search(q: str, current_user: dict = Depends(get_current_user)):
    """Global search across clients, devis, factures, interventions"""
    ent_id = current_user["entreprise_id"]
    results = {"clients": [], "devis": [], "factures": [], "interventions": []}
    
    # Search clients
    clients = await db.clients.find(
        {"entreprise_id": ent_id, "$or": [
            {"nom": {"$regex": q, "$options": "i"}},
            {"prenom": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"telephone": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).to_list(10)
    results["clients"] = [serialize_doc(c) for c in clients]
    
    # Search devis
    devis = await db.devis.find(
        {"entreprise_id": ent_id, "$or": [
            {"numero": {"$regex": q, "$options": "i"}},
            {"objet": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0}
    ).to_list(10)
    results["devis"] = [serialize_doc(d) for d in devis]
    
    # Search factures
    factures = await db.factures.find(
        {"entreprise_id": ent_id, "numero": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).to_list(10)
    results["factures"] = [serialize_doc(f) for f in factures]
    
    # Search interventions
    interventions = await db.interventions.find(
        {"entreprise_id": ent_id, "titre": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ).to_list(10)
    results["interventions"] = [serialize_doc(i) for i in interventions]
    
    return results
