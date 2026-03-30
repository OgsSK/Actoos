"""
Factures (Invoices) routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, Response
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from models import FactureCreate, FactureFromDevis
from auth import get_current_user, require_admin, decode_token
from dependencies import db, serialize_doc, log_action, calculate_totals
from pdf_generator import generate_facture_pdf
from email_service import send_facture_email, send_relance_email
import communication_log

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/factures", tags=["Factures"])


@router.post("")
async def create_facture(data: FactureCreate, current_user: dict = Depends(get_current_user)):
    """Create a new facture"""
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_facture": 1}}
    )
    
    # Calculate totals
    lignes = [l.model_dump() for l in data.lignes]
    total_ht, total_tva, total_ttc = calculate_totals(lignes)
    
    facture_dict = data.model_dump()
    facture_dict["lignes"] = lignes
    facture_dict["id"] = str(uuid.uuid4())
    facture_dict["entreprise_id"] = current_user["entreprise_id"]
    facture_dict["technicien_id"] = current_user["user_id"] if current_user["role"] == "tech" else None
    facture_dict["numero_facture"] = numero_facture
    facture_dict["statut"] = "brouillon"
    facture_dict["total_ht"] = total_ht
    facture_dict["total_tva"] = total_tva
    facture_dict["total_ttc"] = total_ttc
    facture_dict["montant_paye"] = 0
    facture_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    facture_dict["date_echeance"] = (datetime.now(timezone.utc) + timedelta(days=data.echeance_jours)).isoformat()
    
    await db.factures.insert_one(facture_dict)
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "facture", facture_dict["id"])
    
    return serialize_doc(facture_dict)


@router.post("/from-devis")
async def create_facture_from_devis(data: FactureFromDevis, current_user: dict = Depends(get_current_user)):
    """Create facture from signed devis"""
    devis = await db.devis.find_one(
        {"id": data.devis_id, "entreprise_id": current_user["entreprise_id"], "statut": "signe"},
        {"_id": 0}
    )
    if not devis:
        raise HTTPException(status_code=404, detail="Devis signé non trouvé")
    
    # Get next sequence number
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Update sequence
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$inc": {"sequence_facture": 1}}
    )
    
    facture_dict = {
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "client_id": devis["client_id"],
        "devis_id": devis["id"],
        "intervention_id": devis.get("intervention_id"),
        "technicien_id": devis.get("technicien_id"),
        "numero_facture": numero_facture,
        "lignes": devis["lignes"],
        "statut": "emise",
        "total_ht": devis["total_ht"],
        "total_tva": devis["total_tva"],
        "total_ttc": devis["total_ttc"],
        "montant_paye": 0,
        "conditions_paiement": "Paiement à réception de facture",
        "echeance_jours": 30,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "date_echeance": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    }
    
    await db.factures.insert_one(facture_dict)
    
    # Update devis status
    await db.devis.update_one({"id": data.devis_id}, {"$set": {"statut": "facture"}})
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "create", "facture", facture_dict["id"], {"from_devis": data.devis_id})
    
    return serialize_doc(facture_dict)


@router.get("")
async def list_factures(
    statut: Optional[str] = None,
    client_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """List all factures"""
    query = {"entreprise_id": current_user["entreprise_id"]}
    
    if statut:
        query["statut"] = statut
    if client_id:
        query["client_id"] = client_id
    
    factures = await db.factures.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with client names
    for f in factures:
        client = await db.clients.find_one({"id": f["client_id"]}, {"_id": 0, "nom": 1, "prenom": 1})
        f["client_nom"] = f"{client.get('nom', '')} {client.get('prenom', '')}" if client else ""
    
    return [serialize_doc(f) for f in factures]


@router.get("/{facture_id}")
async def get_facture(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific facture"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    facture["client"] = serialize_doc(client) if client else None
    
    return serialize_doc(facture)


@router.post("/{facture_id}/emit")
async def emit_facture(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Emit a facture and send email to client"""
    # Get facture before update
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": "brouillon"},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà émise")
    
    # Update status
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": {"statut": "emise"}}
    )
    
    # Get client and entreprise for email
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Generate PDF
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    # Send email with PDF
    email_result = {"status": "skipped", "message": "Email non envoyé"}
    if client and client.get("email"):
        email_result = await send_facture_email(facture, client, entreprise or {}, pdf_bytes)
        
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
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "emit", "facture", facture_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Facture émise",
        "email": email_result
    }


@router.post("/{facture_id}/pay")
async def mark_facture_paid(
    facture_id: str,
    montant: float,
    mode_paiement: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mark facture as paid"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    new_montant_paye = facture.get("montant_paye", 0) + montant
    update = {
        "montant_paye": new_montant_paye,
        "date_paiement": datetime.now(timezone.utc).isoformat()
    }
    if mode_paiement:
        update["mode_paiement"] = mode_paiement
    
    if new_montant_paye >= facture["total_ttc"]:
        update["statut"] = "payee"
    
    await db.factures.update_one({"id": facture_id}, {"$set": update})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "pay", "facture", facture_id, {"montant": montant})
    
    return {"message": "Paiement enregistré", "montant_paye": new_montant_paye, "statut": update.get("statut", facture["statut"])}


@router.get("/{facture_id}/pdf")
async def get_facture_pdf(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Generate and return facture PDF"""
    facture = await db.factures.find_one({"id": facture_id, "entreprise_id": current_user["entreprise_id"]}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=facture_{facture['numero_facture']}.pdf"}
    )


@router.get("/{facture_id}/pdf-download")
async def download_facture_pdf(facture_id: str, token: str):
    """Download facture PDF with token auth (for browser download)"""
    # Verify token
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé")
    
    facture = await db.factures.find_one({"id": facture_id, "entreprise_id": user["entreprise_id"]}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_facture_pdf(facture, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=facture_{facture['numero_facture']}.pdf"}
    )


@router.delete("/{facture_id}")
async def delete_facture(facture_id: str, current_user: dict = Depends(require_admin)):
    """Delete a facture (admin only, only brouillon status)"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if facture["statut"] != "brouillon":
        raise HTTPException(status_code=400, detail="Seules les factures en brouillon peuvent être supprimées")
    
    await db.factures.delete_one({"id": facture_id})
    await log_action(current_user["entreprise_id"], current_user["user_id"], "delete", "facture", facture_id)
    
    return {"message": "Facture supprimée"}


@router.post("/{facture_id}/relance")
async def send_relance(facture_id: str, current_user: dict = Depends(get_current_user)):
    """Send payment reminder email for unpaid facture"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["emise", "en_retard"]}},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà payée")
    
    # Calculate days overdue
    date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
    jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
    
    # Get client and entreprise
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client or not client.get("email"):
        raise HTTPException(status_code=400, detail="Le client n'a pas d'adresse email")
    
    # Send reminder email
    email_result = await send_relance_email(facture, client, entreprise or {}, jours_retard)
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "relance", "facture", facture_id, {"email_sent": email_result.get("status") == "success"})
    
    return {
        "message": "Relance envoyée",
        "jours_retard": jours_retard,
        "email": email_result
    }
