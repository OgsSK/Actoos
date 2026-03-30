"""
Audit logs routes - View action history
"""
from fastapi import APIRouter, Depends
from typing import Optional

from auth import require_admin
from dependencies import db, serialize_doc

router = APIRouter(prefix="/audit-logs", tags=["Audit"])


@router.get("")
async def list_audit_logs(
    entity: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(require_admin)
):
    """List audit logs (admin only)"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    if entity:
        query["entity"] = entity
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return [serialize_doc(l) for l in logs]
