"""
Communications routes (SMS history, stats)
"""
from fastapi import APIRouter, Depends
from typing import Optional

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(prefix="/communications", tags=["Communications"])


@router.get("")
async def list_all_communications(
    comm_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """List all communications for the entreprise"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if comm_type and comm_type in ["email", "sms"]:
        query["type"] = comm_type
    
    if status and status in ["sent", "delivered", "failed", "pending"]:
        query["status"] = status
    
    communications = await db.communications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Enrich with client names
    for comm in communications:
        client = await db.clients.find_one(
            {"id": comm.get("client_id")},
            {"_id": 0, "nom": 1, "prenom": 1}
        )
        if client:
            comm["client_nom"] = f"{client.get('prenom', '')} {client.get('nom', '')}".strip()
    
    return [serialize_doc(c) for c in communications]


@router.get("/stats")
async def get_communication_stats(current_user: dict = Depends(get_current_user)):
    """Get communication statistics"""
    pipeline = [
        {"$match": {"entreprise_id": current_user["entreprise_id"]}},
        {"$group": {
            "_id": {"type": "$type", "status": "$status"},
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.communications.aggregate(pipeline).to_list(100)
    
    stats = {
        "emails": {"sent": 0, "delivered": 0, "failed": 0},
        "sms": {"sent": 0, "delivered": 0, "failed": 0},
        "total": 0
    }
    
    for r in results:
        comm_type = r["_id"]["type"]
        status = r["_id"]["status"]
        count = r["count"]
        
        if comm_type in stats and status in stats[comm_type]:
            stats[comm_type][status] = count
        stats["total"] += count
    
    return stats
