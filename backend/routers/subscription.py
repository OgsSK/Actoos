"""
Subscription routes - Plans, checkout, and Stripe webhooks
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import secrets
import logging

from auth import get_current_user, get_password_hash
from dependencies import db, serialize_doc
from subscription_service import SUBSCRIPTION_PLANS, get_plan, get_all_plans
from plan_limits import get_usage_stats, get_entreprise_limits

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Subscription"])


@router.post("/sync-plan-limits")
async def sync_plan_limits(current_user: dict = Depends(get_current_user)):
    """Synchronize plan_limits with current plan definition (admin action)"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    plan_id = entreprise.get("plan", "startup")
    plan = get_plan(plan_id)
    
    if not plan:
        plan = get_plan("startup")
        plan_id = "startup"
    
    # Build new plan_limits from plan definition
    new_limits = {
        "max_admins": plan.get("max_admins", 1),
        "max_technicians": plan.get("max_technicians", 3),
        "max_interventions_month": plan.get("max_interventions_month", -1),
        "max_categories": plan.get("max_categories", 1),
        "multi_sites": plan.get("multi_sites", False),
        "offline_mode": plan.get("offline_mode", False),
        "geolocation": plan.get("geolocation", False),
        "auto_pdf_reports": plan.get("auto_pdf_reports", False),
        "advanced_analytics": plan.get("advanced_analytics", False),
        "white_label": plan.get("white_label", False),
        "api_access": plan.get("api_access", False),
        "advanced_branding": plan.get("advanced_branding", False),
        "smart_planning": plan.get("smart_planning", False),
        "auto_devis_to_facture": plan.get("auto_devis_to_facture", False),
        "team_validation": plan.get("team_validation", False),
        "sms_included": plan.get("sms_included", 0)
    }
    
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {
            "$set": {
                "plan": plan_id,
                "plan_name": plan.get("name"),
                "plan_limits": new_limits
            }
        }
    )
    
    logger.info(f"Plan limits synced for entreprise {current_user['entreprise_id']} to plan {plan_id}")
    
    return {
        "message": f"Limites synchronisées avec le plan {plan.get('name')}",
        "plan": plan_id,
        "limits": new_limits
    }


@router.get("/usage")
async def get_plan_usage(current_user: dict = Depends(get_current_user)):
    """Get current plan usage and limits"""
    usage = await get_usage_stats(db, current_user["entreprise_id"])
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1, "plan_name": 1}
    )
    
    return {
        "plan": entreprise.get("plan", "starter") if entreprise else "starter",
        "plan_name": entreprise.get("plan_name", "Starter") if entreprise else "Starter",
        "usage": usage
    }


@router.get("/plans")
async def list_subscription_plans():
    """List all available subscription plans (public endpoint)"""
    plans = []
    for plan_id, plan_data in get_all_plans().items():
        plans.append({
            "id": plan_id,
            "name": plan_data["name"],
            "price": plan_data["price"],
            "price_per_extra_tech": plan_data.get("price_per_extra_tech", 5),
            "currency": plan_data["currency"],
            "description": plan_data["description"],
            "features": plan_data["features"],
            "recommended": plan_data.get("recommended", False),
            "limits": {
                "max_admins": plan_data.get("max_admins", 1),
                "max_technicians": plan_data.get("max_technicians", 3),
                "max_categories": plan_data.get("max_categories", 1)
            }
        })
    return plans


@router.post("/checkout/session")
async def create_checkout_session(
    request: Request,
    plan_id: str,
    origin_url: str,
    entreprise_name: Optional[str] = None,
    admin_email: Optional[str] = None
):
    """Create a Stripe checkout session for subscription"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    # Validate plan
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    # Build URLs
    success_url = f"{origin_url}/signup/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/signup?cancelled=true"
    
    # Initialize Stripe
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Create checkout session with plan amount
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency=plan["currency"],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "entreprise_name": entreprise_name or "",
            "admin_email": admin_email or "",
            "type": "subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create pending payment transaction
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "plan_id": plan_id,
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": plan["currency"],
        "status": "pending",
        "payment_status": "initiated",
        "entreprise_name": entreprise_name,
        "admin_email": admin_email,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created checkout session for plan {plan_id}: {session.session_id}")
    
    return {
        "url": session.url,
        "session_id": session.session_id
    }


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, request: Request):
    """Get status of a checkout session"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction in database
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if transaction:
        update_data = {
            "status": status.status,
            "payment_status": status.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If payment is successful and not already processed
        if status.payment_status == "paid" and transaction.get("payment_status") != "paid":
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
            
            # Create the entreprise account
            if transaction.get("entreprise_name") and transaction.get("admin_email"):
                await create_entreprise_from_subscription(
                    transaction["entreprise_name"],
                    transaction["admin_email"],
                    transaction["plan_id"],
                    session_id
                )
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
    
    return {
        "status": status.status,
        "payment_status": status.payment_status,
        "amount_total": status.amount_total,
        "currency": status.currency
    }


async def create_entreprise_from_subscription(
    entreprise_name: str,
    admin_email: str,
    plan_id: str,
    session_id: str
):
    """Create entreprise and admin user after successful subscription payment"""
    # Check if already created (idempotency)
    existing = await db.entreprises.find_one({"stripe_session_id": session_id})
    if existing:
        logger.info(f"Entreprise already created for session {session_id}")
        return existing["id"]
    
    # Create entreprise
    entreprise_id = str(uuid.uuid4())
    plan = get_plan(plan_id)
    
    entreprise_doc = {
        "id": entreprise_id,
        "nom": entreprise_name,
        "email": admin_email,
        "plan": plan_id,
        "plan_name": plan["name"] if plan else "Starter",
        "plan_limits": {
            "max_technicians": plan.get("max_technicians", 3) if plan else 3,
            "max_interventions_month": plan.get("max_interventions_month", 100) if plan else 100,
            "max_categories": plan.get("max_categories", 1) if plan else 1
        },
        "stripe_session_id": session_id,
        "subscription_status": "active",
        "subscription_started_at": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.entreprises.insert_one(entreprise_doc)
    
    # Create admin user with temporary password
    temp_password = secrets.token_urlsafe(12)
    admin_id = str(uuid.uuid4())
    
    admin_doc = {
        "id": admin_id,
        "entreprise_id": entreprise_id,
        "email": admin_email,
        "password_hash": get_password_hash(temp_password),
        "nom": "Admin",
        "prenom": entreprise_name,
        "role": "admin",
        "statut": "actif",
        "must_change_password": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    
    # Send welcome email with credentials
    try:
        from email_service import send_email
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Bienvenue sur Actoos!</h1>
            <p>Félicitations, votre compte <strong>{entreprise_name}</strong> a été créé avec succès.</p>
            <p>Voici vos identifiants de connexion :</p>
            <div style="background: #f1f5f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email :</strong> {admin_email}</p>
                <p><strong>Mot de passe temporaire :</strong> {temp_password}</p>
            </div>
            <p style="color: #dc2626;">Veuillez changer votre mot de passe lors de votre première connexion.</p>
            <p>Plan souscrit : <strong>{plan["name"] if plan else "Starter"}</strong></p>
            <a href="#" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                Accéder à mon espace
            </a>
        </div>
        """
        await send_email(
            to_email=admin_email,
            subject=f"Bienvenue sur Actoos - Votre compte {entreprise_name}",
            html_content=html_content
        )
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")
    
    logger.info(f"Created entreprise {entreprise_name} ({entreprise_id}) with admin {admin_email}")
    return entreprise_id


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=stripe_api_key, webhook_url=webhook_url)
    
    # Get request body
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        
        logger.info(f"Webhook event: {webhook_response.event_type}, session: {webhook_response.session_id}")
        
        # Update transaction based on event
        if webhook_response.session_id:
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id}
            )
            
            if transaction:
                update_data = {
                    "webhook_event": webhook_response.event_type,
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                
                if webhook_response.payment_status == "paid" and transaction.get("payment_status") != "paid":
                    update_data["paid_at"] = datetime.now(timezone.utc).isoformat()
                    
                    # Create entreprise if not already done
                    if transaction.get("entreprise_name") and transaction.get("admin_email"):
                        await create_entreprise_from_subscription(
                            transaction["entreprise_name"],
                            transaction["admin_email"],
                            transaction["plan_id"],
                            webhook_response.session_id
                        )
                
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": update_data}
                )
        
        return {"received": True}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription/current")
async def get_current_subscription(current_user: dict = Depends(get_current_user)):
    """Get current entreprise subscription details"""
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1, "plan_name": 1, "plan_limits": 1, "subscription_status": 1, "subscription_started_at": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Get current usage
    tech_count = await db.users.count_documents({
        "entreprise_id": current_user["entreprise_id"],
        "role": "tech",
        "statut": "actif"
    })
    
    # Count interventions this month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    intervention_count = await db.interventions.count_documents({
        "entreprise_id": current_user["entreprise_id"],
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    plan = get_plan(entreprise.get("plan", "starter"))
    
    return {
        "plan_id": entreprise.get("plan", "starter"),
        "plan_name": entreprise.get("plan_name", "Starter"),
        "status": entreprise.get("subscription_status", "active"),
        "started_at": entreprise.get("subscription_started_at"),
        "limits": entreprise.get("plan_limits", {}),
        "current_plan_details": plan,
        "usage": {
            "technicians": tech_count,
            "interventions_this_month": intervention_count
        }
    }
