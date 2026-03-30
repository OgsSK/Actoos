"""
Portal routes - Client portal for viewing quotes, invoices, and payments
"""
from fastapi import APIRouter, HTTPException, Depends, Response, Request
from datetime import datetime, timezone
import uuid
import os
import logging

from auth import get_current_user
from dependencies import db, serialize_doc
from pdf_generator import generate_devis_pdf, generate_facture_pdf

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/portal", tags=["Portal"])


# ==================== DEVIS PORTAL ====================
@router.get("/devis/{token}")
async def get_portal_devis(token: str):
    """Get devis for client portal (no auth required)"""
    devis = await db.devis.find_one({"token_client": token}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": devis["entreprise_id"]}, {"_id": 0, "nom": 1, "adresse": 1, "telephone": 1, "email": 1, "logo_url": 1})
    
    return {
        "devis": serialize_doc(devis),
        "client": serialize_doc(client) if client else None,
        "entreprise": serialize_doc(entreprise) if entreprise else None
    }


@router.post("/devis/{token}/sign")
async def sign_portal_devis(token: str, signature: str, nom_signataire: str):
    """Sign devis from client portal (no auth required)"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.devis.update_one(
        {"token_client": token, "statut": {"$in": ["brouillon", "envoye"]}},
        {"$set": {"statut": "signe", "signature_client": signature, "nom_signataire": nom_signataire, "date_signature": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Devis non trouvé ou déjà signé")
    
    return {"message": "Devis signé avec succès", "date_signature": now}


@router.get("/devis/{token}/pdf")
async def get_portal_devis_pdf(token: str):
    """Get devis PDF from client portal (no auth required)"""
    devis = await db.devis.find_one({"token_client": token}, {"_id": 0})
    if not devis:
        raise HTTPException(status_code=404, detail="Devis non trouvé")
    
    client = await db.clients.find_one({"id": devis["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": devis["entreprise_id"]}, {"_id": 0})
    
    pdf_bytes = generate_devis_pdf(devis, client or {}, entreprise or {})
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=devis_{devis['numero_devis']}.pdf"}
    )


# ==================== CLIENT DASHBOARD ====================
@router.get("/client/{token}")
async def get_client_portal_dashboard(token: str):
    """Get client dashboard with all their documents (no auth required)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Accès non autorisé")
    
    entreprise = await db.entreprises.find_one(
        {"id": client["entreprise_id"]}, 
        {"_id": 0, "nom": 1, "adresse": 1, "ville": 1, "code_postal": 1, "telephone": 1, "email": 1, "logo_url": 1, "couleur_primaire": 1}
    )
    
    # Get all devis for this client
    devis_cursor = db.devis.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "numero_devis": 1, "statut": 1, "total_ttc": 1, "created_at": 1, "date_expiration": 1, "token_client": 1}
    ).sort("created_at", -1).limit(50)
    devis_list = await devis_cursor.to_list(length=50)
    
    # Get all factures for this client
    factures_cursor = db.factures.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "numero_facture": 1, "statut": 1, "total_ttc": 1, "montant_paye": 1, "created_at": 1, "date_echeance": 1}
    ).sort("created_at", -1).limit(50)
    factures_list = await factures_cursor.to_list(length=50)
    
    # Get recent interventions for this client
    interventions_cursor = db.interventions.find(
        {"client_id": client["id"]},
        {"_id": 0, "id": 1, "titre": 1, "statut": 1, "date_debut": 1, "date_fin": 1}
    ).sort("date_debut", -1).limit(20)
    interventions_list = await interventions_cursor.to_list(length=20)
    
    # Calculate summary stats
    total_devis = len(devis_list)
    devis_en_attente = sum(1 for d in devis_list if d.get("statut") in ["brouillon", "envoye"])
    devis_signes = sum(1 for d in devis_list if d.get("statut") == "signe")
    
    total_factures = len(factures_list)
    factures_impayees = sum(1 for f in factures_list if f.get("statut") in ["brouillon", "emise"])
    montant_du = sum((f.get("total_ttc", 0) - f.get("montant_paye", 0)) for f in factures_list if f.get("statut") != "payee")
    
    return {
        "client": serialize_doc(client),
        "entreprise": serialize_doc(entreprise) if entreprise else None,
        "devis": [serialize_doc(d) for d in devis_list],
        "factures": [serialize_doc(f) for f in factures_list],
        "interventions": [serialize_doc(i) for i in interventions_list],
        "summary": {
            "total_devis": total_devis,
            "devis_en_attente": devis_en_attente,
            "devis_signes": devis_signes,
            "total_factures": total_factures,
            "factures_impayees": factures_impayees,
            "montant_du": round(montant_du, 2)
        }
    }


# ==================== FACTURE PORTAL ====================
@router.get("/facture/{facture_id}")
async def get_portal_facture(facture_id: str, token: str):
    """Get facture for client portal (requires client token)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    entreprise = await db.entreprises.find_one(
        {"id": facture["entreprise_id"]}, 
        {"_id": 0, "nom": 1, "adresse": 1, "ville": 1, "code_postal": 1, "telephone": 1, "email": 1, "logo_url": 1, "siret": 1, "tva_intra": 1}
    )
    
    return {
        "facture": serialize_doc(facture),
        "client": serialize_doc(client),
        "entreprise": serialize_doc(entreprise) if entreprise else None
    }


@router.get("/facture/{facture_id}/pdf")
async def get_portal_facture_pdf(facture_id: str, token: str):
    """Get facture PDF from client portal (requires client token)"""
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
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
        client, 
        entreprise or {},
        intervention_photos=intervention_photos,
        intervention_signature=intervention_signature
    )
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=facture_{facture['numero_facture']}.pdf"}
    )


# ==================== PORTAL PAYMENT (STRIPE) ====================
@router.post("/facture/{facture_id}/pay")
async def create_facture_payment_session(
    facture_id: str,
    token: str,
    request: Request
):
    """Create a Stripe checkout session to pay a facture from client portal"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Verify client token
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    # Get facture
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    # Check if already paid
    if facture.get("statut") == "payee":
        raise HTTPException(status_code=400, detail="Cette facture est déjà payée")
    
    # Get entreprise info
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
    # Calculate amount due
    amount_due = facture.get("total_ttc", 0) - facture.get("montant_paye", 0)
    if amount_due <= 0:
        raise HTTPException(status_code=400, detail="Aucun montant à payer")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Paiement non configuré")
    
    # Build URLs
    base_url = str(request.base_url).rstrip('/')
    origin = request.headers.get('origin', base_url.replace('/api', ''))
    
    success_url = f"{origin}/portal/client/{token}?payment=success&facture={facture_id}"
    cancel_url = f"{origin}/portal/client/{token}?payment=cancelled&facture={facture_id}"
    
    # Initialize Stripe
    webhook_url = f"{base_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session
    checkout_request = CheckoutSessionRequest(
        amount=float(amount_due),
        currency="eur",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "facture_payment",
            "facture_id": facture_id,
            "facture_numero": facture.get("numero_facture", ""),
            "client_id": client["id"],
            "client_name": f"{client.get('nom', '')} {client.get('prenom', '')}".strip(),
            "entreprise_id": facture["entreprise_id"],
            "entreprise_name": entreprise.get("nom", "") if entreprise else ""
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "type": "facture_payment",
        "facture_id": facture_id,
        "facture_numero": facture.get("numero_facture", ""),
        "client_id": client["id"],
        "entreprise_id": facture["entreprise_id"],
        "amount": amount_due,
        "currency": "eur",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created payment session for facture {facture.get('numero_facture')}: {session.session_id}")
    
    return {
        "url": session.url,
        "session_id": session.session_id,
        "amount": amount_due
    }


@router.get("/facture/{facture_id}/payment-status")
async def get_facture_payment_status(facture_id: str, token: str, session_id: str, request: Request):
    """Check payment status for a facture"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    # Verify client token
    client = await db.clients.find_one({"portal_token": token}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=401, detail="Accès non autorisé")
    
    # Get facture
    facture = await db.factures.find_one(
        {"id": facture_id, "client_id": client["id"]},
        {"_id": 0}
    )
    if not facture:
        raise HTTPException(status_code=404, detail="Facture non trouvée")
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Paiement non configuré")
    
    base_url = str(request.base_url).rstrip('/')
    webhook_url = f"{base_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # If paid, update facture
    if status.payment_status == "paid":
        await process_facture_payment(facture_id, session_id, status.amount_total / 100)
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "facture_statut": facture.get("statut")
    }


async def process_facture_payment(facture_id: str, session_id: str, amount_paid: float):
    """Process a successful facture payment"""
    # Check if already processed (idempotency)
    existing = await db.payment_transactions.find_one({
        "session_id": session_id,
        "payment_status": "paid"
    })
    if existing:
        logger.info(f"Payment already processed for session {session_id}")
        return
    
    # Get facture
    facture = await db.factures.find_one({"id": facture_id}, {"_id": 0})
    if not facture:
        logger.error(f"Facture not found: {facture_id}")
        return
    
    # Update facture
    new_montant_paye = facture.get("montant_paye", 0) + amount_paid
    total_ttc = facture.get("total_ttc", 0)
    
    update_data = {
        "montant_paye": new_montant_paye,
        "date_paiement": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Mark as paid if fully paid
    if new_montant_paye >= total_ttc:
        update_data["statut"] = "payee"
    
    await db.factures.update_one(
        {"id": facture_id},
        {"$set": update_data}
    )
    
    # Update transaction
    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": "complete",
            "payment_status": "paid",
            "paid_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send confirmation email
    client = await db.clients.find_one({"id": facture["client_id"]}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": facture["entreprise_id"]}, {"_id": 0})
    
    if client and client.get("email"):
        try:
            await send_payment_confirmation_email(facture, client, entreprise, amount_paid)
        except Exception as e:
            logger.warning(f"Failed to send payment confirmation email: {e}")
    
    logger.info(f"Processed payment for facture {facture.get('numero_facture')}: {amount_paid}€")


async def send_payment_confirmation_email(facture: dict, client: dict, entreprise: dict, amount: float):
    """Send payment confirmation email to client"""
    try:
        from email_service import send_email
        
        client_name = f"{client.get('prenom', '')} {client.get('nom', '')}".strip()
        entreprise_name = entreprise.get("nom", "L'entreprise") if entreprise else "L'entreprise"
        
        subject = f"Confirmation de paiement - Facture {facture.get('numero_facture')}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">Paiement reçu</h2>
            <p>Bonjour {client_name},</p>
            <p>Nous avons bien reçu votre paiement de <strong>{amount:.2f}€</strong> pour la facture <strong>{facture.get('numero_facture')}</strong>.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Facture:</strong> {facture.get('numero_facture')}</p>
                <p style="margin: 5px 0;"><strong>Montant payé:</strong> {amount:.2f}€</p>
                <p style="margin: 5px 0;"><strong>Date:</strong> {datetime.now().strftime('%d/%m/%Y à %H:%M')}</p>
            </div>
            <p>Merci pour votre confiance.</p>
            <p>Cordialement,<br/>{entreprise_name}</p>
        </div>
        """
        
        await send_email(
            to_email=client["email"],
            subject=subject,
            html_content=html_content,
            from_name=entreprise_name
        )
        
        # Log communication
        await db.communications.insert_one({
            "id": str(uuid.uuid4()),
            "entreprise_id": facture["entreprise_id"],
            "client_id": client["id"],
            "type": "email",
            "sujet": subject,
            "destinataire": client["email"],
            "preview": f"Confirmation de paiement de {amount:.2f}€ pour la facture {facture.get('numero_facture')}",
            "status": "sent",
            "date_envoi": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        logger.error(f"Error sending payment confirmation email: {e}")


# ==================== CLIENT PORTAL LINK ====================
@router.get("/link/{client_id}")
async def get_client_portal_link(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get the portal link for a client (admin only)"""
    client = await db.clients.find_one(
        {"id": client_id, "entreprise_id": current_user["entreprise_id"]},
        {"_id": 0, "id": 1, "portal_token": 1, "nom": 1, "prenom": 1}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    # Generate portal_token if not exists
    if not client.get("portal_token"):
        portal_token = str(uuid.uuid4())
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"portal_token": portal_token}}
        )
        client["portal_token"] = portal_token
    
    return {
        "client_id": client["id"],
        "client_name": f"{client.get('nom', '')} {client.get('prenom', '')}".strip(),
        "portal_token": client["portal_token"],
        "portal_url": f"/portal/client/{client['portal_token']}"
    }
