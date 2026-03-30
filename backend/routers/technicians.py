"""
Technicians routes
"""
from fastapi import APIRouter, Depends

from auth import get_current_user
from dependencies import db, serialize_doc

router = APIRouter(prefix="/techniciens", tags=["Technicians"])


@router.get("")
async def list_techniciens(current_user: dict = Depends(get_current_user)):
    """List all technicians"""
    users = await db.users.find(
        {"entreprise_id": current_user["entreprise_id"], "role": "tech"},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return [serialize_doc(u) for u in users]
