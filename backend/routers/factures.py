"""
Factures (Invoices) routes - CRUD and workflow operations
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from typing import Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging
import os

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
    from currency_utils import get_exchange_rate
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id, "entreprise_id": current_user["entreprise_id"]})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Get next sequence number and currency info
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    seq = entreprise.get("sequence_facture", 1)
    year = datetime.now().year
    numero_facture = f"F{year}-{seq:05d}"
    
    # Capture currency snapshot at document creation time
    devise = entreprise.get("devise", "EUR")
    taux_change_eur = get_exchange_rate(devise, "EUR")
    
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
    facture_dict["devise"] = devise  # Currency snapshot
    facture_dict["taux_change_eur"] = taux_change_eur  # Exchange rate snapshot
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
    
    # Inherit currency from devis (preserve historical currency)
    # If devis doesn't have currency info (old document), use current entreprise currency
    devise = devis.get("devise", entreprise.get("devise", "EUR"))
    taux_change_eur = devis.get("taux_change_eur", 1.0)
    
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
        "devise": devise,  # Inherited from devis
        "taux_change_eur": taux_change_eur,  # Inherited from devis
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
async def emit_facture(facture_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Emit a facture and send notification to client"""
    # Build base URL for portal link
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    return await emit_facture_internal(facture_id, current_user, base_url)


async def emit_facture_internal(facture_id: str, current_user: dict, base_url: str = None):
    """Internal function to emit a facture (can be called from other modules)"""
    from notification_service import NotificationService
    
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
        {"$set": {"statut": "emise", "date_emission": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get client and entreprise
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Fetch intervention photos and signature if linked
    intervention_photos = None
    intervention_signature = None
    
    if facture.get("intervention_id"):
        intervention = await db.interventions.find_one(
            {"id": facture["intervention_id"]},
            {"_id": 0, "photos": 1, "signature_client": 1, "nom_signataire": 1, "date_signature": 1}
        )
        if intervention:
            intervention_photos = intervention.get("photos", [])
            if intervention.get("signature_client"):
                intervention_signature = {
                    "signature_client": intervention.get("signature_client"),
                    "nom_signataire": intervention.get("nom_signataire"),
                    "date_signature": intervention.get("date_signature")
                }
    
    # Build portal URL for QR code payment (online invoice payment page)
    portal_url = None
    if base_url and facture.get('token_client'):
        portal_url = f"{base_url}/paiement/{facture_id}?token={facture.get('token_client', '')}"
    
    # Generate PDF with photos and signature
    pdf_bytes = generate_facture_pdf(
        facture, 
        client or {}, 
        entreprise or {},
        portal_url=portal_url,
        intervention_photos=intervention_photos,
        intervention_signature=intervention_signature
    )
    
    # Build PDF URL for WhatsApp
    pdf_url = f"/api/factures/{facture_id}/pdf"
    
    # Send notification via preferred channel (WhatsApp > SMS > Email)
    notification_result = {"status": "skipped", "channels": []}
    if client:
        notification_result = await NotificationService.send_notification(
            entreprise_id=current_user["entreprise_id"],
            notification_type="facture",
            client=client,
            data=facture,
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
                        subject=f"Facture {facture.get('numero', facture_id[:8])}",
                        content_preview="Nouvelle facture émise",
                        status="sent",
                        related_entity="facture",
                        related_entity_id=facture_id,
                        sent_by=current_user["user_id"]
                    )
                elif channel in ["whatsapp", "sms"]:
                    await communication_log.log_sms(
                        entreprise_id=current_user["entreprise_id"],
                        client_id=client["id"],
                        recipient_phone=client.get("telephone", ""),
                        message=f"Notification facture {facture.get('numero', '')} via {channel.upper()}",
                        status="sent",
                        message_id=channel_info.get("result", {}).get("message_id"),
                        related_entity="facture",
                        related_entity_id=facture_id,
                        sent_by=current_user["user_id"]
                    )
    
    await log_action(current_user["entreprise_id"], current_user["user_id"], "emit", "facture", facture_id, {
        "notification_status": notification_result.get("status"),
        "channels": [c.get("channel") for c in notification_result.get("details", {}).get("channels", [])]
    })
    
    return {
        "message": "Facture émise",
        "notification": notification_result
    }


@router.post("/{facture_id}/pay")
async def record_payment(
    facture_id: str,
    montant: float,
    mode_paiement: str = "especes",
    reference: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Record a payment (partial or full) for an invoice.
    
    This creates a payment record in invoice_payments and updates the invoice totals.
    Status automatically transitions:
    - If paid >= total: 'payee'
    - If paid > 0 but < total: 'partiel' (partial)
    """
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if facture["statut"] in ["payee", "annulee"]:
        raise HTTPException(status_code=400, detail="Cette facture est déjà payée ou annulée")
    
    # Validate payment amount
    remaining = facture["total_ttc"] - facture.get("montant_paye", 0)
    if montant <= 0:
        raise HTTPException(status_code=400, detail="Le montant doit être positif")
    if montant > remaining + 0.01:  # Small tolerance for rounding
        raise HTTPException(status_code=400, detail=f"Le montant dépasse le solde restant ({remaining:.2f}€)")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Create payment record
    payment_record = {
        "id": str(uuid.uuid4()),
        "facture_id": facture_id,
        "entreprise_id": current_user["entreprise_id"],
        "montant": montant,
        "mode_paiement": mode_paiement,
        "reference": reference,
        "notes": notes,
        "recorded_by": current_user["user_id"],
        "recorded_at": now,
        "source": "manual"
    }
    await db.invoice_payments.insert_one(payment_record)
    
    # Update invoice totals
    new_montant_paye = facture.get("montant_paye", 0) + montant
    new_remaining = facture["total_ttc"] - new_montant_paye
    
    # Determine new status
    if new_remaining <= 0.01:  # Fully paid (with small tolerance)
        new_statut = "payee"
        date_paiement = now
    elif new_montant_paye > 0:
        new_statut = "partiel"
        date_paiement = facture.get("date_paiement")  # Keep original if exists
    else:
        new_statut = facture["statut"]
        date_paiement = facture.get("date_paiement")
    
    update = {
        "montant_paye": new_montant_paye,
        "statut": new_statut,
        "updated_at": now
    }
    if new_statut == "payee":
        update["date_paiement"] = date_paiement
    
    await db.factures.update_one({"id": facture_id}, {"$set": update})
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "payment", 
        "facture", 
        facture_id, 
        {
            "montant": montant, 
            "mode": mode_paiement,
            "new_total_paye": new_montant_paye,
            "statut": new_statut
        }
    )
    
    return {
        "message": "Paiement enregistré",
        "payment_id": payment_record["id"],
        "montant_paye": round(new_montant_paye, 2),
        "reste_a_payer": round(max(0, new_remaining), 2),
        "statut": new_statut,
        "is_fully_paid": new_statut == "payee"
    }


@router.get("/{facture_id}/payments")
async def get_payment_history(
    facture_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all payment records for an invoice"""
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    payments = await db.invoice_payments.find(
        {"facture_id": facture_id},
        {"_id": 0}
    ).sort("recorded_at", -1).to_list(100)
    
    # Enrich with user names
    for p in payments:
        user = await db.users.find_one({"id": p["recorded_by"]}, {"_id": 0, "prenom": 1, "nom": 1})
        p["recorded_by_name"] = f"{user.get('prenom', '')} {user.get('nom', '')}" if user else "Système"
    
    return {
        "facture_id": facture_id,
        "total_ttc": facture["total_ttc"],
        "montant_paye": facture.get("montant_paye", 0),
        "reste_a_payer": round(facture["total_ttc"] - facture.get("montant_paye", 0), 2),
        "statut": facture["statut"],
        "payments": [serialize_doc(p) for p in payments]
    }


@router.delete("/{facture_id}/payments/{payment_id}")
async def cancel_payment(
    facture_id: str,
    payment_id: str,
    current_user: dict = Depends(require_admin)
):
    """Cancel a payment record (admin only) - reverses the payment"""
    payment = await db.invoice_payments.find_one(
        {"id": payment_id, "facture_id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    facture = await db.factures.find_one({"id": facture_id}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    if facture["statut"] == "annulee":
        raise HTTPException(status_code=400, detail="Impossible d'annuler un paiement sur une facture annulée")
    
    now = datetime.now(timezone.utc).isoformat()
    
    # Reverse the payment
    new_montant_paye = max(0, facture.get("montant_paye", 0) - payment["montant"])
    new_remaining = facture["total_ttc"] - new_montant_paye
    
    # Determine new status
    if new_montant_paye <= 0:
        new_statut = "emise" if facture.get("date_emission") else "brouillon"
    else:
        new_statut = "partiel"
    
    # Update facture
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": {
            "montant_paye": new_montant_paye,
            "statut": new_statut,
            "updated_at": now
        }}
    )
    
    # Mark payment as cancelled instead of deleting (for audit trail)
    await db.invoice_payments.update_one(
        {"id": payment_id},
        {"$set": {
            "cancelled": True,
            "cancelled_at": now,
            "cancelled_by": current_user["user_id"]
        }}
    )
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "cancel_payment",
        "facture",
        facture_id,
        {"payment_id": payment_id, "montant": payment["montant"]}
    )
    
    return {
        "message": "Paiement annulé",
        "montant_paye": round(new_montant_paye, 2),
        "reste_a_payer": round(new_remaining, 2),
        "statut": new_statut
    }


@router.get("/{facture_id}/payments/{payment_id}/receipt")
async def get_payment_receipt_pdf(
    facture_id: str,
    payment_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate and return a payment receipt PDF (Reçu de paiement)"""
    from pdf_generator import generate_payment_receipt_pdf
    
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    payment = await db.invoice_payments.find_one(
        {"id": payment_id, "facture_id": facture_id},
        {"_id": 0}
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement non trouvé")
    
    if payment.get("cancelled"):
        raise HTTPException(status_code=400, detail="Ce paiement a été annulé")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_payment_receipt_pdf(payment, facture, client, entreprise)
    
    await log_action(
        current_user["entreprise_id"],
        current_user["user_id"],
        "download_receipt",
        "payment",
        payment_id,
        {"facture_id": facture_id}
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=recu_paiement_{payment_id[:8]}.pdf"}
    )


@router.get("/{facture_id}/pdf")
async def get_facture_pdf(facture_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Generate and return facture PDF with intervention photos and signature"""
    facture = await db.factures.find_one({"id": facture_id, "entreprise_id": current_user["entreprise_id"]}, {"_id": 0})
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    # Fetch intervention photos and signature if linked
    intervention_photos = None
    intervention_signature = None
    
    if facture.get("intervention_id"):
        intervention = await db.interventions.find_one(
            {"id": facture["intervention_id"]},
            {"_id": 0, "photos": 1, "signature_client": 1, "nom_signataire": 1, "date_signature": 1}
        )
        if intervention:
            intervention_photos = intervention.get("photos", [])
            if intervention.get("signature_client"):
                intervention_signature = {
                    "signature_client": intervention.get("signature_client"),
                    "nom_signataire": intervention.get("nom_signataire"),
                    "date_signature": intervention.get("date_signature")
                }
    
    # Build portal URL for QR code payment
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    portal_url = f"{base_url}/paiement/{facture_id}?token={facture.get('token_client', '')}"
    
    pdf_bytes = generate_facture_pdf(
        facture, 
        client or {}, 
        entreprise or {},
        portal_url=portal_url,
        intervention_photos=intervention_photos,
        intervention_signature=intervention_signature
    )
    
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
    
    # Fetch intervention photos and signature if linked
    intervention_photos = None
    intervention_signature = None
    
    if facture.get("intervention_id"):
        intervention = await db.interventions.find_one(
            {"id": facture["intervention_id"]},
            {"_id": 0, "photos": 1, "signature_client": 1, "nom_signataire": 1, "date_signature": 1}
        )
        if intervention:
            intervention_photos = intervention.get("photos", [])
            if intervention.get("signature_client"):
                intervention_signature = {
                    "signature_client": intervention.get("signature_client"),
                    "nom_signataire": intervention.get("nom_signataire"),
                    "date_signature": intervention.get("date_signature")
                }
    
    pdf_bytes = generate_facture_pdf(
        facture, 
        client or {}, 
        entreprise or {},
        intervention_photos=intervention_photos,
        intervention_signature=intervention_signature
    )
    
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
async def send_relance(facture_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """
    Send payment reminder for unpaid or partially paid invoice.
    The reminder includes only the REMAINING amount to pay.
    """
    from notification_service import NotificationService
    
    facture = await db.factures.find_one(
        {"id": facture_id, "entreprise_id": current_user["entreprise_id"], "statut": {"$in": ["emise", "partiel", "en_retard"]}},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée ou déjà payée")
    
    # Calculate remaining amount
    montant_paye = facture.get("montant_paye", 0)
    reste_a_payer = round(facture["total_ttc"] - montant_paye, 2)
    
    if reste_a_payer <= 0:
        raise HTTPException(status_code=400, detail="Cette facture est déjà entièrement payée")
    
    # Calculate days overdue
    date_echeance = datetime.fromisoformat(facture.get("date_echeance", datetime.now(timezone.utc).isoformat()).replace('Z', '+00:00'))
    jours_retard = max(0, (datetime.now(timezone.utc) - date_echeance).days)
    
    # Get client and entreprise
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user["entreprise_id"]}, {"_id": 0})
    
    if not client:
        raise HTTPException(status_code=400, detail="Client non trouvé")
    
    # Build portal URL for payment
    base_url = str(request.base_url).rstrip('/')
    if '/api' in base_url:
        base_url = base_url.rsplit('/api', 1)[0]
    
    # Get or create client token for portal access
    if not facture.get("token_client"):
        token_client = str(uuid.uuid4())[:12]
        await db.factures.update_one({"id": facture_id}, {"$set": {"token_client": token_client}})
    else:
        token_client = facture.get("token_client")
    
    portal_url = f"{base_url}/paiement/{facture_id}?token={token_client}"
    
    # Add custom payment link if configured
    lien_paiement = entreprise.get("lien_paiement_externe") or facture.get("lien_paiement_externe") or portal_url
    
    # Prepare reminder data with remaining amount
    reminder_data = {
        **facture,
        "reste_a_payer": reste_a_payer,
        "montant_paye": montant_paye,
        "jours_retard": jours_retard,
        "lien_paiement": lien_paiement,
        "is_partial": montant_paye > 0
    }
    
    # Send notification via preferred channels
    notification_result = await NotificationService.send_notification(
        entreprise_id=current_user["entreprise_id"],
        notification_type="relance",
        client=client,
        data=reminder_data,
        entreprise=entreprise
    )
    
    # Update reminder tracking
    now = datetime.now(timezone.utc).isoformat()
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": {"last_reminder_sent": now}, "$inc": {"reminder_count": 1}}
    )
    
    # Log communication
    if notification_result.get("status") == "success":
        for channel_info in notification_result.get("details", {}).get("channels", []):
            channel = channel_info.get("channel")
            if channel == "email":
                await communication_log.log_email(
                    entreprise_id=current_user["entreprise_id"],
                    client_id=client["id"],
                    recipient_email=client.get("email", ""),
                    subject=f"Rappel - Facture {facture.get('numero_facture', facture_id[:8])} - {reste_a_payer:.2f}€",
                    content_preview=f"Rappel paiement: {reste_a_payer:.2f}€ restant",
                    status="sent",
                    related_entity="facture",
                    related_entity_id=facture_id,
                    sent_by=current_user["user_id"]
                )
            elif channel in ["whatsapp", "sms"]:
                await communication_log.log_sms(
                    entreprise_id=current_user["entreprise_id"],
                    client_id=client["id"],
                    recipient_phone=client.get("telephone", ""),
                    message=f"Relance facture {facture.get('numero_facture', '')} - {reste_a_payer:.2f}€ via {channel.upper()}",
                    status="sent",
                    message_id=channel_info.get("result", {}).get("message_id"),
                    related_entity="facture",
                    related_entity_id=facture_id,
                    sent_by=current_user["user_id"]
                )
    
    await log_action(
        current_user["entreprise_id"], 
        current_user["user_id"], 
        "relance", 
        "facture", 
        facture_id, 
        {
            "reste_a_payer": reste_a_payer,
            "jours_retard": jours_retard,
            "channels": [c.get("channel") for c in notification_result.get("details", {}).get("channels", [])]
        }
    )
    
    return {
        "message": "Relance envoyée",
        "reste_a_payer": reste_a_payer,
        "montant_paye": montant_paye,
        "jours_retard": jours_retard,
        "notification": notification_result
    }
