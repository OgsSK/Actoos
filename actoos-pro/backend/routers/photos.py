"""
Photos routes - Upload and retrieve intervention photos
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Response
from typing import Optional
from datetime import datetime, timezone
import uuid
import logging

from auth import get_current_user
from dependencies import db, serialize_doc, log_action
from storage import put_object, get_object, APP_NAME
from image_utils import strip_exif_and_compress, is_valid_image

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/photos", tags=["Photos"])


@router.post("/interventions/{intervention_id}")
async def upload_photo(
    intervention_id: str,
    file: UploadFile = File(...),
    type_photo: str = "autre",
    description: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Upload photo for intervention with EXIF stripping and compression"""
    # Verify intervention exists and belongs to user
    intervention = await db.interventions.find_one(
        {"id": intervention_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not intervention:
        raise HTTPException(status_code=404, detail="Intervention non trouvée")
    
    # Read file data
    data = await file.read()
    
    # Validate it's an image
    if not is_valid_image(data):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas une image valide")
    
    # Process image: strip EXIF (GPS privacy) and compress
    processed_data, content_type = strip_exif_and_compress(data, max_size_kb=500)
    
    # Upload to storage (always as .jpg after processing)
    storage_path = f"{APP_NAME}/photos/{current_user['entreprise_id']}/{intervention_id}/{uuid.uuid4()}.jpg"
    
    result = put_object(storage_path, processed_data, content_type)
    if not result:
        raise HTTPException(status_code=500, detail="Erreur lors du téléchargement")
    
    # Save to database
    photo_dict = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "intervention_id": intervention_id,
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "type_photo": type_photo,
        "description": description,
        "size_bytes": len(processed_data),
        "exif_stripped": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_deleted": False
    }
    await db.photos.insert_one(photo_dict)
    
    # Update intervention photos list
    await db.interventions.update_one(
        {"id": intervention_id},
        {"$push": {"photos": photo_dict["id"]}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "upload", "photo", photo_dict["id"])
    
    return serialize_doc(photo_dict)


@router.get("/interventions/{intervention_id}")
async def list_intervention_photos(intervention_id: str, current_user: dict = Depends(get_current_user)):
    """List photos for an intervention"""
    photos = await db.photos.find(
        {"intervention_id": intervention_id, "entreprise_id": current_user["entreprise_id"], "is_deleted": False},
        {"_id": 0}
    ).to_list(100)
    return [serialize_doc(p) for p in photos]


@router.get("/{photo_id}")
async def get_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Download a photo"""
    photo = await db.photos.find_one(
        {"id": photo_id, "entreprise_id": current_user["entreprise_id"], "is_deleted": False},
        {"_id": 0}
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    data, content_type = get_object(photo["storage_path"])
    if not data:
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    
    return Response(content=data, media_type=photo.get("content_type", content_type))



@router.delete("/{photo_id}")
async def delete_photo(photo_id: str, current_user: dict = Depends(get_current_user)):
    """Soft delete a photo (mark as deleted)"""
    photo = await db.photos.find_one(
        {"id": photo_id, "entreprise_id": current_user["entreprise_id"], "is_deleted": False},
        {"_id": 0}
    )
    if not photo:
        raise HTTPException(status_code=404, detail="Photo non trouvée")
    
    # Soft delete
    await db.photos.update_one(
        {"id": photo_id},
        {"$set": {"is_deleted": True, "deleted_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Remove from intervention photos list
    await db.interventions.update_one(
        {"id": photo["intervention_id"]},
        {"$pull": {"photos": photo_id}}
    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "photo", photo_id)
    
    return {"message": "Photo supprimée"}
