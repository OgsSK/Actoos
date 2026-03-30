"""
Devis (Quotes) routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from typing import Optional
from datetime import datetime, timezone, timedelta
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
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_devis", 1)
    year = datetime.now().year
    numero_devis = f"D{year}-{seq:05d}"
    
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
    """Mark devis as sent and send email to client"""
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
        {"$set": {"statut": "envoye"}}
    )
    
    # Get client and entreprise for email
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Generate PDF
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    # Send email with PDF
    email_result = {"status": "skipped", "message": "Email non envoyé"}
    if client and client.get("email"):
        # Get base URL from request
        base_url = str(request.base_url).rstrip('/')
        # Remove /api suffix if present
        if '/api' in base_url:
            base_url = base_url.rsplit('/api', 1)[0]
        
        email_result = await send_devis_email(devis, client, entreprise or {}, pdf_bytes, base_url)
        
        # Log communication
        if email_result.get("_log_data"):
            log_data = email_result.pop("_log_data")
            await communication_log.log_email(
                entreprise_id=current_user["entreprise_id"],
                client_id=client["id"],
                recipient_email=log_data["recipient"],
                subject=log_data["subject"],
                content_preview=log_data["content_preview"],
                status="sent" if email_result.get("status") == "success" else "failed",
                error_message=email_result.get("message") if email_result.get("status") != "success" else None,
                related_entity=log_data["related_entity"],
                related_entity_id=log_data["related_entity_id"],
                sent_by=current_user["user_id"]
            )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "send", "devis", devis_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Devis envoyé",
        "token_client": devis["token_client"],
        "email": email_result
    }


@router.post("/{devis_id}/sign")
async def sign_devis(
    devis_id: str,
    signature: str,
    nom_signataire: str,
    current_user: dict = Depends(get_current_user)
):
    """Sign a devis"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.devis.update_one(
        {"id": devis_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["brouillon", "envoye"]}},
        {"$set": {"statut": "signe", "signature_client": signature, "nom_signataire": nom_signataire, "date_signature": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà signé")
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "sign", "devis", devis_id)
    return {"message": "Devis signé", "date_signature": now}


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
