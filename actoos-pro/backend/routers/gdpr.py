"""
GDPR Data Retention Routes
Implements configurable data retention policies per enterprise
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from datetime import datetime, timezone, timedelta
from typing import Optional
from pydantic import BaseModel, Field
import logging

from auth import get_current_user, require_admin
from dependencies import db, serialize_doc, log_action

router = APIRouter(prefix="/gdpr", tags=["GDPR"])
logger = logging.getLogger(__name__)

# Default retention periods (in months)
DEFAULT_RETENTION = {
    "photos": 24,           # 2 years
    "interventions": 36,    # 3 years
    "devis": 60,           # 5 years (legal requirement)
    "factures": 120,       # 10 years (legal requirement)
    "clients_inactifs": 36  # 3 years without activity
}

# Minimum retention periods (legal requirements)
MIN_RETENTION = {
    "photos": 1,
    "interventions": 12,
    "devis": 60,      # Cannot be reduced - legal requirement
    "factures": 120,  # Cannot be reduced - legal requirement
    "clients_inactifs": 12
}


class RetentionSettings(BaseModel):
    photos_months: int = Field(default=24, ge=1, le=120, description="Rétention photos en mois")
    interventions_months: int = Field(default=36, ge=12, le=120, description="Rétention interventions en mois")
    devis_months: int = Field(default=60, ge=60, le=120, description="Rétention devis en mois (min 5 ans légal)")
    factures_months: int = Field(default=120, ge=120, le=120, description="Rétention factures (10 ans légal)")
    clients_inactifs_months: int = Field(default=36, ge=12, le=120, description="Rétention clients inactifs")
    auto_cleanup_enabled: bool = Field(default=False, description="Activer le nettoyage automatique")
    notify_before_deletion: bool = Field(default=True, description="Notifier avant suppression")
    notify_days_before: int = Field(default=30, ge=7, le=90, description="Jours avant notification")


@router.get("/settings")
async def get_retention_settings(current_user: dict = Depends(require_admin)):
    """Get GDPR data retention settings for the enterprise"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "gdpr_settings": 1}
    )
    
    if not entreprise or "gdpr_settings" not in entreprise:
        # Return defaults
        return {
            "photos_months": DEFAULT_RETENTION["photos"],
            "interventions_months": DEFAULT_RETENTION["interventions"],
            "devis_months": DEFAULT_RETENTION["devis"],
            "factures_months": DEFAULT_RETENTION["factures"],
            "clients_inactifs_months": DEFAULT_RETENTION["clients_inactifs"],
            "auto_cleanup_enabled": False,
            "notify_before_deletion": True,
            "notify_days_before": 30,
            "last_cleanup": None,
            "next_scheduled_cleanup": None
        }
    
    return entreprise["gdpr_settings"]


@router.put("/settings")
async def update_retention_settings(
    settings: RetentionSettings,
    current_user: dict = Depends(require_admin)
):
    """Update GDPR data retention settings"""
    
    # Validate minimum retention periods (legal requirements)
    if settings.devis_months < MIN_RETENTION["devis"]:
        raise HTTPException(
            status_code=400, 
            detail=f"La rétention des devis ne peut pas être inférieure à {MIN_RETENTION['devis']} mois (obligation légale)"
        )
    
    if settings.factures_months < MIN_RETENTION["factures"]:
        raise HTTPException(
            status_code=400,
            detail=f"La rétention des factures ne peut pas être inférieure à {MIN_RETENTION['factures']} mois (obligation légale)"
        )
    
    gdpr_settings = {
        **settings.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user["user_id"]
    }
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {"gdpr_settings": gdpr_settings}}
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "update",
        "gdpr_settings",
        current_user["entreprise_id"],
        {"settings": settings.model_dump()}
    )
    
    return {"message": "Paramètres GDPR mis à jour", "settings": gdpr_settings}


@router.get("/preview")
async def preview_cleanup(current_user: dict = Depends(require_admin)):
    """Preview what would be deleted with current retention settings"""
    
    entreprise_id = current_user["entreprise_id"]
    
    # Get current settings
    entreprise = await db.entreprises.find_one(
        {"id": entreprise_id},
        {"_id": 0, "gdpr_settings": 1}
    )
    
    settings = entreprise.get("gdpr_settings", {}) if entreprise else {}
    
    photos_months = settings.get("photos_months", DEFAULT_RETENTION["photos"])
    interventions_months = settings.get("interventions_months", DEFAULT_RETENTION["interventions"])
    clients_months = settings.get("clients_inactifs_months", DEFAULT_RETENTION["clients_inactifs"])
    
    now = datetime.now(timezone.utc)
    
    # Calculate cutoff dates
    photos_cutoff = (now - timedelta(days=photos_months * 30)).isoformat()
    interventions_cutoff = (now - timedelta(days=interventions_months * 30)).isoformat()
    clients_cutoff = (now - timedelta(days=clients_months * 30)).isoformat()
    
    # Count items that would be deleted
    preview = {
        "photos": {
            "count": 0,
            "cutoff_date": photos_cutoff,
            "retention_months": photos_months
        },
        "interventions": {
            "count": 0,
            "cutoff_date": interventions_cutoff,
            "retention_months": interventions_months
        },
        "clients_inactifs": {
            "count": 0,
            "cutoff_date": clients_cutoff,
            "retention_months": clients_months
        }
    }
    
    # Count old photos
    photos_count = await db.photos.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$lt": photos_cutoff}
    })
    preview["photos"]["count"] = photos_count
    
    # Count old completed interventions
    interventions_count = await db.interventions.count_documents({
        "entreprise_id": entreprise_id,
        "statut": "terminee",
        "created_at": {"$lt": interventions_cutoff}
    })
    preview["interventions"]["count"] = interventions_count
    
    # Count inactive clients (no interventions in X months)
    # Find clients with their last intervention date
    pipeline = [
        {"$match": {"entreprise_id": entreprise_id}},
        {"$lookup": {
            "from": "interventions",
            "localField": "id",
            "foreignField": "client_id",
            "as": "interventions"
        }},
        {"$project": {
            "id": 1,
            "last_intervention": {"$max": "$interventions.created_at"}
        }},
        {"$match": {
            "$or": [
                {"last_intervention": {"$lt": clients_cutoff}},
                {"last_intervention": None}
            ]
        }},
        {"$count": "total"}
    ]
    
    result = await db.clients.aggregate(pipeline).to_list(1)
    preview["clients_inactifs"]["count"] = result[0]["total"] if result else 0
    
    # Calculate storage that would be freed (estimate)
    avg_photo_size_kb = 200  # Average compressed photo size
    preview["estimated_storage_freed_mb"] = round(photos_count * avg_photo_size_kb / 1024, 2)
    
    return preview


@router.post("/cleanup/execute")
async def execute_cleanup(
    background_tasks: BackgroundTasks,
    dry_run: bool = True,
    current_user: dict = Depends(require_admin)
):
    """
    Execute data cleanup based on retention settings.
    Use dry_run=True to preview without deleting.
    """
    entreprise_id = current_user["entreprise_id"]
    
    # Get settings
    entreprise = await db.entreprises.find_one(
        {"id": entreprise_id},
        {"_id": 0, "gdpr_settings": 1}
    )
    
    settings = entreprise.get("gdpr_settings", {}) if entreprise else {}
    
    if dry_run:
        # Just return preview
        return await preview_cleanup(current_user)
    
    # Execute cleanup in background
    background_tasks.add_task(
        perform_cleanup,
        entreprise_id,
        settings,
        current_user["user_id"]
    )
    
    return {
        "message": "Nettoyage lancé en arrière-plan",
        "status": "processing"
    }


async def perform_cleanup(entreprise_id: str, settings: dict, user_id: str):
    """Background task to perform actual data cleanup"""
    logger.info(f"Starting GDPR cleanup for entreprise {entreprise_id}")
    
    now = datetime.now(timezone.utc)
    results = {
        "photos_deleted": 0,
        "interventions_archived": 0,
        "clients_anonymized": 0,
        "started_at": now.isoformat(),
        "errors": []
    }
    
    try:
        # Get retention periods
        photos_months = settings.get("photos_months", DEFAULT_RETENTION["photos"])
        interventions_months = settings.get("interventions_months", DEFAULT_RETENTION["interventions"])
        
        photos_cutoff = (now - timedelta(days=photos_months * 30)).isoformat()
        interventions_cutoff = (now - timedelta(days=interventions_months * 30)).isoformat()
        
        # 1. Delete old photos
        photo_result = await db.photos.delete_many({
            "entreprise_id": entreprise_id,
            "created_at": {"$lt": photos_cutoff}
        })
        results["photos_deleted"] = photo_result.deleted_count
        logger.info(f"Deleted {photo_result.deleted_count} old photos")
        
        # 2. Archive old interventions (soft delete - mark as archived)
        intervention_result = await db.interventions.update_many(
            {
                "entreprise_id": entreprise_id,
                "statut": "terminee",
                "created_at": {"$lt": interventions_cutoff},
                "is_archived": {"$ne": True}
            },
            {
                "$set": {
                    "is_archived": True,
                    "archived_at": now.isoformat(),
                    "archived_reason": "gdpr_retention"
                }
            }
        )
        results["interventions_archived"] = intervention_result.modified_count
        logger.info(f"Archived {intervention_result.modified_count} old interventions")
        
        # 3. Anonymize inactive clients (instead of deleting)
        clients_months = settings.get("clients_inactifs_months", DEFAULT_RETENTION["clients_inactifs"])
        clients_cutoff = (now - timedelta(days=clients_months * 30)).isoformat()
        
        # Find inactive clients
        pipeline = [
            {"$match": {"entreprise_id": entreprise_id, "is_anonymized": {"$ne": True}}},
            {"$lookup": {
                "from": "interventions",
                "localField": "id",
                "foreignField": "client_id",
                "as": "interventions"
            }},
            {"$project": {
                "id": 1,
                "last_intervention": {"$max": "$interventions.created_at"}
            }},
            {"$match": {
                "$or": [
                    {"last_intervention": {"$lt": clients_cutoff}},
                    {"last_intervention": None}
                ]
            }}
        ]
        
        inactive_clients = await db.clients.aggregate(pipeline).to_list(1000)
        
        for client in inactive_clients:
            # Anonymize instead of delete
            await db.clients.update_one(
                {"id": client["id"]},
                {"$set": {
                    "nom": "Client Anonymisé",
                    "prenom": "",
                    "email": f"anonymized-{client['id'][:8]}@gdpr.local",
                    "telephone": "",
                    "adresse": "",
                    "notes": "",
                    "is_anonymized": True,
                    "anonymized_at": now.isoformat()
                }}
            )
            results["clients_anonymized"] += 1
        
        logger.info(f"Anonymized {results['clients_anonymized']} inactive clients")
        
        # Update cleanup timestamp
        results["completed_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.entreprises.update_one(
            {"id": entreprise_id},
            {"$set": {
                "gdpr_settings.last_cleanup": results,
                "gdpr_settings.next_scheduled_cleanup": (now + timedelta(days=30)).isoformat()
            }}
        )
        
        # Log the action
        await log_action(
            entreprise_id,
            user_id,
            "gdpr_cleanup",
            "entreprise",
            entreprise_id,
            results
        )
        
    except Exception as e:
        logger.error(f"GDPR cleanup error: {e}")
        results["errors"].append(str(e))
        
        await db.entreprises.update_one(
            {"id": entreprise_id},
            {"$set": {"gdpr_settings.last_cleanup": results}}
        )


@router.get("/export-request")
async def get_export_requests(current_user: dict = Depends(require_admin)):
    """Get list of data export requests (GDPR right to data portability)"""
    requests = await db.gdpr_requests.find(
        {"entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return requests


@router.post("/export-request/{client_id}")
async def create_export_request(
    client_id: str,
    current_user: dict = Depends(require_admin)
):
    """Create a data export request for a client (GDPR right to access)"""
    
    # Verify client exists
    client = await db.clients.find_one({
        "id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Create export request
    request_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    export_request = {
        "id": request_id,
        "client_id": client_id,
        "entreprise_id": current_user["entreprise_id"],
        "requested_by": current_user["user_id"],
        "status": "pending",
        "created_at": now,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.gdpr_requests.insert_one(export_request)
    
    return {"message": "Demande d'export créée", "request_id": request_id}


@router.delete("/client/{client_id}")
async def request_client_deletion(
    client_id: str,
    current_user: dict = Depends(require_admin)
):
    """
    Request deletion of a client and all their data (GDPR right to be forgotten).
    This anonymizes the client data rather than hard deleting to maintain 
    financial record integrity.
    """
    
    # Verify client exists
    client = await db.clients.find_one({
        "id": client_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Check if client has unpaid invoices
    unpaid = await db.factures.count_documents({
        "client_id": client_id,
        "statut": {"$nin": ["payee", "annulee"]}
    })
    
    if unpaid > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Ce client a {unpaid} facture(s) impayée(s). Réglez-les d'abord."
        )
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Anonymize client
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {
            "nom": "Client Supprimé",
            "prenom": "",
            "email": f"deleted-{client_id[:8]}@gdpr.local",
            "telephone": "",
            "adresse": "",
            "notes": "",
            "is_deleted": True,
            "is_anonymized": True,
            "deleted_at": now,
            "deletion_requested_by": current_user["user_id"]
        }}
    )
    
    # Delete associated photos
    await db.photos.delete_many({
        "entreprise_id": current_user["entreprise_id"],
        "intervention_id": {"$in": await get_client_intervention_ids(client_id)}
    })
    
    # Log action
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "gdpr_delete",
        "client",
        client_id
    )
    
    return {"message": "Client et données associées anonymisés/supprimés"}


async def get_client_intervention_ids(client_id: str) -> list:
    """Helper to get all intervention IDs for a client"""
    interventions = await db.interventions.find(
        {"client_id": client_id},
        {"id": 1}
    ).to_list(10000)
    return [i["id"] for i in interventions]


# Import uuid at top of file
import uuid
