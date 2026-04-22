"""
Devis (Quotes) routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
import uuid
import logging

from models import DevisCreate, DevisUpdate
from auth import get_current_user, require_admin, decode_token
from dependencies import db, serialize_doc, log_action, calculate_totals
from pdf_generator import generate_devis_pdf
from email_service import send_devis_email
import communication_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/devis", tags=["Devis"])


@router.post("")
async def create_devis(data: DevisCreate, current_user: dict = Depends(get_current_user)):
    """Create a new devis"""
    from currency_utils import get_exchange_rate
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number and currency info
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_devis", 1)
    year = datetime.now().year
    numero_devis = f"D{year}-{seq:05d}"
    
    # Capture currency snapshot at document creation time
    devise = entreprise.get("devise", "EUR")
    taux_change_eur = get_exchange_rate(devise, "EUR")
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_devis": 1}}
    )
    
    # Calculate totals
    lignes = [l.model_dump() for l in data.lignes]
    total_ht, total_tva, total_ttc = calculate_totals(lignes)
    
    devis_dict = data.model_dump()
    devis_dict["lignes"] = lignes
    devis_dict["id"] = str(uuid.uuid4())
    devis_dict["entreprise_id"] = current_user["entreprise_id"]
    devis_dict["technicien_id"] = current_user["user_id"] if current_user["role"] == "tech" else None
    devis_dict["numero_devis"] = numero_devis
    devis_dict["statut"] = "brouillon"
    devis_dict["total_ht"] = total_ht
    devis_dict["total_tva"] = total_tva
    devis_dict["total_ttc"] = total_ttc
    devis_dict["devise"] = devise  # Currency snapshot
    devis_dict["taux_change_eur"] = taux_change_eur  # Exchange rate snapshot
    devis_dict["token_client"] = str(uuid.uuid4())
    devis_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    devis_dict["date_expiration"] = (datetime.now(timezone.utc) + timedelta(days=data.validite_jours)).isoformat()
    
    await db.devis.insert_one(devis_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "devis", devis_dict["id"])
    
    return serialize_doc(devis_dict)


@router.get("")
async def list_devis(
    statut: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all devis"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    
    devis_list = await db.devis.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for d in devis_list:
        client = await db.clients.find_one({"id": d["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
        d["client_nom"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
    
    return [serialize_doc(d) for d in devis_list]


@router.get("/{devis_id}")
async def get_devis(devis_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific devis"""
    query = {"id": devis_id, "entreprise_id": current_user["entreprise_id"]}
    if current_user["role"] == "tech":
        query["technicien_id"] = current_user["user_id"]
    
    devis = await db.devis.find_one(query, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    devis["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(devis)


@router.put("/{devis_id}")
async def update_devis(devis_id: str, data: DevisUpdate, current_user: dict = Depends(get_current_user)):
    """Update a devis"""
    query = {"id": devis_id, "entreprise_id": current_user["entreprise_id"]}
    
    devis = await db.devis.find_one(query, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if devis["statut"] not in ["brouillon", "envoye"]:
        raise HTTPException(status_code=400, detail="Ce devis ne peut plus être modifié")
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "lignes" in update_data:
        lignes = [l if isinstance(l, dict) else l.model_dump() for l in update_data["lignes"]]
        update_data["lignes"] = lignes
        total_ht, total_tva, total_ttc = calculate_totals(lignes)
        update_data["total_ht"] = total_ht
        update_data["total_tva"] = total_tva
        update_data["total_ttc"] = total_ttc
    
    await db.devis.update_one(query, {"$set": update_data})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "update", "devis", devis_id)
    
    devis = await db.devis.find_one({"id": devis_id}, {"_id": 0})
    return serialize_doc(devis)


@router.delete("/{devis_id}")
async def delete_devis(devis_id: str, current_user: dict = Depends(require_admin)):
    """Delete a devis (admin only, only brouillon/envoye status)"""
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    if devis["statut"] not in ["brouillon", "envoye"]:
        raise HTTPException(status_code=400, detail="Impossible de supprimer un devis signé ou facturé")
    
    await db.devis.delete_one({"id": devis_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "devis", devis_id)
    
    return {"message": "Devis supprimé"}


@router.post("/{devis_id}/send")
async def send_devis(devis_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Mark devis as sent and send notification to client (WhatsApp/SMS/Email based on preferences)"""
    from notification_service import NotificationService
    
    # Get devis before update
    devis = await db.devis.find_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"], "statut": "brouillon"},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà envoyé")
    
    # Update status
    await db.devis.update_one(
        {"id": devis_id},
        {"$set": {"statut": "envoye", "date_envoi": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get client and entreprise
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Get intervention photos and notes if linked
    intervention_photos = None
    intervention_notes = None
    if devis.get("intervention_id"):
        intervention = await db.interventions.find_one(
            {"id": devis["intervention_id"]},
            {"_id": 0, "photos": 1, "notes_terrain": 1, "notes_technicien": 1}
        )
        if intervention:
            intervention_photos = intervention.get("photos", [])
            intervention_notes = intervention.get("notes_terrain") or intervention.get("notes_technicien")
    
    # Generate PDF with intervention data if available
    pdf_bytes = generate_devis_pdf(
        devis, 
        client or {}, 
        entreprise or {},
        intervention_photos=intervention_photos,
        intervention_notes=intervention_notes
    )
    
    # Get base URL for PDF link
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    
    # Build PDF URL (for WhatsApp document attachment)
    pdf_url = f"{base_url}/api/devis/{devis_id}/pdf?token={devis.get('token_client', '')}"
    
    # Send notification via preferred channel (WhatsApp > SMS > Email)
    notification_result = {"status": "skipped", "channels": []}
    if client:
        notification_result = await NotificationService.send_notification(
            entreprise_id=current_user["entreprise_id"],
            notification_type="devis",
            client=client,
            data=devis,
            entreprise=entreprise,
            pdf_url=pdf_url
        )
        
        # Log communication for each successful channel
        if notification_result.get("status") == "success":
            for channel_info in notification_result.get("details", {}).get("channels", []):
                channel = channel_info.get("channel")
                if channel == "email":
                    await communication_log.log_email(
                        entreprise_id=current_user["entreprise_id"],
                        client_id=client["id"],
                        recipient_email=client.get("email", ""),
                        subject=f"Devis {devis.get('numero', devis_id[:8])}",
                        content_preview="Nouveau devis envoyé",
                        status="sent",
                        related_entity="devis",
                        related_entity_id=devis_id,
                        sent_by=current_user["user_id"]
                    )
                elif channel in ["whatsapp", "sms"]:
                    await communication_log.log_sms(
                        entreprise_id=current_user["entreprise_id"],
                        client_id=client["id"],
                        recipient_phone=client.get("telephone", ""),
                        message=f"Notification devis {devis.get('numero', '')} via {channel.upper()}",
                        status="sent",
                        message_id=channel_info.get("result", {}).get("message_id"),
                        related_entity="devis",
                        related_entity_id=devis_id,
                        sent_by=current_user["user_id"]
                    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "send", "devis", devis_id, {
        "notification_status": notification_result.get("status"),
        "channels": [c.get("channel") for c in notification_result.get("details", {}).get("channels", [])]
    })
    
    return {
        "message": "Devis envoyé",
        "token_client": devis["token_client"],
        "notification": notification_result
    }


class DevisSignRequest(BaseModel):
    """Request model for signing a devis"""
    signature: str
    nom_signataire: str


@router.post("/{devis_id}/sign")
async def sign_devis(
    devis_id: str,
    data: DevisSignRequest,
    current_user: dict = Depends(get_current_user)
):
    """Sign a devis - accepts JSON body with signature and nom_signataire"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.devis.update_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["brouillon", "envoye"]}},
        {"$set": {"statut": "signe", "signature_client": data.signature, "nom_signataire": data.nom_signataire, "date_signature": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà signé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sign", "devis", devis_id)
    return {"message": "Devis signé", "date_signature": now}


@router.post("/{devis_id}/convert-to-facture")
async def convert_devis_to_facture(
    devis_id: str,
    auto_emit: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """
    Convert a signed devis to a facture (Pro/Enterprise feature)
    - Creates a new facture with all the devis data
    - Links the facture to the devis
    - Optionally emits the facture immediately
    """
    from plan_limits import check_feature
    
    # Check if auto_devis_to_facture feature is available (Pro+)
    has_feature = await check_feature(db, current_user["entreprise_id"], "auto_devis_to_facture")
    if not has_feature:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "feature_not_available",
                "message": "La conversion automatique devis → facture est disponible avec le plan Pro (79€/mois).",
                "feature": "auto_devis_to_facture",
                "required_plan": "pro"
            }
        )
    
    # Get the signed devis
    devis = await db.devis.find_one({
        "id": devis_id,
        "entreprise_id": current_user["entreprise_id"],
        "statut": "signe"
    }, {"_id": 0})
    
    if not devis:
        raise HTTPException(
            status_code=404, 
            detail="Devis non trouvé ou non signé. Seuls les devis signés peuvent être convertis."
        )
    
    # Check if already converted
    existing_facture = await db.factures.find_one({
        "devis_id": devis_id,
        "entreprise_id": current_user["entreprise_id"]
    })
    
    if existing_facture:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "already_converted",
                "message": "Ce devis a déjà été converti en facture.",
                "facture_id": existing_facture["id"],
                "numero_facture": existing_facture["numero_facture"]
            }
        )
    
    # Get next facture sequence
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_facture": 1}}
    )
    
    # Create facture from devis data
    facture_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    
    facture_dict = {
        "id": facture_id,
        "entreprise_id": current_user["entreprise_id"],
        "client_id": devis["client_id"],
        "devis_id": devis_id,  # Link to original devis
        "intervention_id": devis.get("intervention_id"),
        "numero_facture": numero_facture,
        "numero_devis_origine": devis["numero_devis"],
        "lignes": devis["lignes"],
        "total_ht": devis["total_ht"],
        "total_tva": devis["total_tva"],
        "total_ttc": devis["total_ttc"],
        "statut": "brouillon",
        "conditions_paiement": devis.get("conditions_paiement", "Paiement à réception"),
        "notes": devis.get("notes", ""),
        "created_at": now.isoformat(),
        "date_echeance": (now + timedelta(days=30)).isoformat(),
        "created_by": current_user["user_id"],
        "converted_from_devis": True
    }
    
    await db.factures.insert_one(facture_dict)
    
    # Update devis status to 'converti'
    await db.devis.update_one(
        {"id": devis_id},
        {
            "$set": {
                "statut": "converti",
                "facture_id": facture_id,
                "converted_at": now.isoformat()
            }
        }
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "convert_to_facture",
        "devis",
        devis_id,
        {"facture_id": facture_id, "numero_facture": numero_facture}
    )
    
    logger.info(f"Devis {devis['numero_devis']} converted to facture {numero_facture}")
    
    result = {
        "message": f"Devis converti en facture {numero_facture}",
        "facture_id": facture_id,
        "numero_facture": numero_facture,
        "devis_id": devis_id,
        "numero_devis": devis["numero_devis"]
    }
    
    # Optionally emit the facture immediately
    if auto_emit:
        from routers.factures import emit_facture_internal
        emit_result = await emit_facture_internal(facture_id, current_user)
        result["auto_emit"] = emit_result
    
    return result


@router.get("/{devis_id}/pdf")
async def get_devis_pdf(devis_id: str, auth: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Generate and return devis PDF"""
    devis = await db.devis.find_one({"id": devis_id, "entreprise_id": current_user["entreprise_id"]}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=devis_{devis['numero_devis']}.pdf"}
    )


@router.get("/{devis_id}/pdf-download")
async def download_devis_pdf(devis_id: str, token: str):
    """Download devis PDF with token auth (for browser download)"""
    # Verify token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    devis = await db.devis.find_one({"id": devis_id, "entreprise_id": user["entreprise_id"]}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=devis_{devis['numero_devis']}.pdf"}
    )
