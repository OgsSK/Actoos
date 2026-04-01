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
async def sync_plan_limits(
    plan_override: str = None,
    current_user: dict = Depends(get_current_user)
):
    """Synchronize plan_limits with current plan definition (admin action)
    
    If plan_override is provided, it will set that plan.
    Options: startup, pro, enterprise
    """
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Use override if provided, else use current plan, else default to startup
    plan_id = plan_override or entreprise.get("plan") or "startup"
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
    
    # Map plan ID to proper display name
    plan_id = entreprise.get("plan", "starter") if entreprise else "starter"
    plan_names = {
        "startup": "Startup",
        "starter": "Startup",
        "pro": "Pro",
        "enterprise": "Enterprise"
    }
    plan_display_name = plan_names.get(plan_id, "Startup")
    
    return {
        "plan": plan_id,
        "plan_name": entreprise.get("plan_name") or plan_display_name,
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
    """Create a Stripe checkout session for subscription with 14-day free trial"""
    import stripe
    
    # Validate plan
    plan = get_plan(plan_id)
    if not plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    # Get Stripe API key
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = stripe_api_key
    
    # Build URLs
    success_url = f"{origin_url}/signup/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/signup?cancelled=true"
    
    try:
        # Create or retrieve Stripe Price for this plan
        # First, check if we have a price ID stored
        price_id = plan.get("stripe_price_id")
        
        if not price_id:
            # Create a product and price in Stripe
            product = stripe.Product.create(
                name=f"Actoos {plan['name']}",
                description=plan.get("description", f"Abonnement {plan['name']}")
            )
            
            price = stripe.Price.create(
                product=product.id,
                unit_amount=int(plan["price"] * 100),  # Stripe uses cents
                currency=plan["currency"],
                recurring={"interval": "month"}
            )
            price_id = price.id
        
        # Create checkout session with subscription and trial
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            subscription_data={
                "trial_period_days": 14,  # 14 days free trial
                "metadata": {
                    "plan_id": plan_id,
                    "plan_name": plan["name"],
                    "entreprise_name": entreprise_name or "",
                    "admin_email": admin_email or ""
                }
            },
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "plan_id": plan_id,
                "plan_name": plan["name"],
                "entreprise_name": entreprise_name or "",
                "admin_email": admin_email or "",
                "type": "subscription"
            },
            customer_email=admin_email if admin_email else None,
            allow_promotion_codes=True
        )
        
        # Create pending payment transaction
        transaction = {
            "id": str(uuid.uuid4()),
            "session_id": session.id,
            "plan_id": plan_id,
            "plan_name": plan["name"],
            "amount": plan["price"],
            "currency": plan["currency"],
            "status": "pending",
            "payment_status": "trial",
            "entreprise_name": entreprise_name,
            "admin_email": admin_email,
            "trial_ends_at": None,  # Will be set by webhook
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.payment_transactions.insert_one(transaction)
        
        logger.info(f"Created subscription checkout session for plan {plan_id}: {session.id}")
        
        return {
            "url": session.url,
            "session_id": session.id
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@router.post("/finalize-signup/{session_id}")
async def finalize_signup(
    session_id: str,
    categories: list[str] = [],
    password: Optional[str] = None,
    phone: Optional[str] = None,
    referral_source: Optional[str] = None
):
    """Finalize signup with additional data (categories, custom password, phone, referral source)"""
    # Find the transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id})
    if not transaction:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    if transaction.get("payment_status") != "paid":
        raise HTTPException(status_code=400, detail="Le paiement n'a pas été confirmé")
    
    # Find the entreprise created from this session
    entreprise = await db.entreprises.find_one({"stripe_session_id": session_id})
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Validate categories against plan limits
    plan = get_plan(transaction.get("plan_id", "startup"))
    max_categories = plan.get("max_categories", 1) if plan else 1
    
    if max_categories != -1 and len(categories) > max_categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Votre plan est limité à {max_categories} catégorie(s)"
        )
    
    # Update entreprise with categories and referral source
    update_data = {
        "categories": categories,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if phone:
        update_data["telephone"] = phone
    
    if referral_source:
        update_data["referral_source"] = referral_source
    
    await db.entreprises.update_one(
        {"id": entreprise["id"]},
        {"$set": update_data}
    )
    
    # If custom password provided, update the admin user
    if password:
        admin = await db.users.find_one({
            "entreprise_id": entreprise["id"],
            "role": "admin"
        })
        if admin:
            await db.users.update_one(
                {"id": admin["id"]},
                {
                    "$set": {
                        "password_hash": get_password_hash(password),
                        "must_change_password": False
                    }
                }
            )
    
    # Create category documents for each selected category
    for cat_id in categories:
        cat_details = get_category_details(cat_id)
        category_doc = {
            "id": str(uuid.uuid4()),
            "entreprise_id": entreprise["id"],
            "code": cat_id,
            "nom": cat_details.get("nom", cat_id),
            "description": cat_details.get("description", ""),
            "icone": cat_details.get("icone", "folder"),
            "couleur": cat_details.get("couleur", "#3B82F6"),
            "checklist_template": cat_details.get("checklist_template", []),
            "actif": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        # Upsert to avoid duplicates
        await db.categories.update_one(
            {"entreprise_id": entreprise["id"], "code": cat_id},
            {"$set": category_doc},
            upsert=True
        )
    
    logger.info(f"Finalized signup for entreprise {entreprise['id']} with {len(categories)} categories")
    
    return {
        "success": True,
        "entreprise_id": entreprise["id"],
        "categories": categories
    }


def get_category_name(cat_id: str) -> str:
    """Get category name from ID"""
    category_names = {
        "btp": "BTP & Travaux",
        "nettoyage": "Nettoyage Professionnel",
        "maintenance": "Maintenance & SAV",
        "decoration": "Décoration & Aménagement",
        "electricite": "Électricité",
        "plomberie": "Plomberie & CVC",
        "espaces-verts": "Espaces Verts & Extérieur",
        "securite": "Sécurité & Installation",
        "multiservices": "Services Techniques Multi-services",
        "specialises": "Services Spécialisés"
    }
    return category_names.get(cat_id, cat_id)


def get_category_details(cat_id: str) -> dict:
    """Get full category details including checklist template"""
    categories = {
        "btp": {
            "nom": "BTP & Travaux",
            "description": "Maçonnerie, rénovation, gros et second œuvre",
            "icone": "hard-hat",
            "couleur": "#F97316",
            "checklist_template": [
                {"id": "btp_1", "label": "Zone de travail sécurisée", "type": "checkbox", "required": True},
                {"id": "btp_2", "label": "Matériaux vérifiés", "type": "checkbox", "required": True},
                {"id": "btp_3", "label": "Travaux conformes au devis", "type": "checkbox", "required": True},
                {"id": "btp_4", "label": "Nettoyage du chantier", "type": "checkbox", "required": True},
                {"id": "btp_5", "label": "Photo avant travaux", "type": "photo", "required": False},
                {"id": "btp_6", "label": "Photo après travaux", "type": "photo", "required": False},
                {"id": "btp_7", "label": "Observations", "type": "text", "required": False}
            ]
        },
        "nettoyage": {
            "nom": "Nettoyage Professionnel",
            "description": "Services de propreté et entretien",
            "icone": "sparkles",
            "couleur": "#14B8A6",
            "checklist_template": [
                {"id": "net_1", "label": "Sols nettoyés", "type": "checkbox", "required": True},
                {"id": "net_2", "label": "Vitres nettoyées", "type": "checkbox", "required": False},
                {"id": "net_3", "label": "Sanitaires désinfectés", "type": "checkbox", "required": True},
                {"id": "net_4", "label": "Poubelles vidées", "type": "checkbox", "required": True},
                {"id": "net_5", "label": "Produits utilisés", "type": "text", "required": False},
                {"id": "net_6", "label": "Photo avant", "type": "photo", "required": False},
                {"id": "net_7", "label": "Photo après", "type": "photo", "required": False}
            ]
        },
        "maintenance": {
            "nom": "Maintenance & SAV",
            "description": "Contrats d'entretien et dépannage",
            "icone": "wrench",
            "couleur": "#3B82F6",
            "checklist_template": [
                {"id": "mnt_1", "label": "Diagnostic effectué", "type": "checkbox", "required": True},
                {"id": "mnt_2", "label": "Pièces remplacées", "type": "text", "required": False},
                {"id": "mnt_3", "label": "Tests de fonctionnement", "type": "checkbox", "required": True},
                {"id": "mnt_4", "label": "Prochaine maintenance prévue", "type": "text", "required": False},
                {"id": "mnt_5", "label": "Photo équipement", "type": "photo", "required": False},
                {"id": "mnt_6", "label": "Observations techniques", "type": "text", "required": False}
            ]
        },
        "decoration": {
            "nom": "Décoration & Aménagement",
            "description": "Design intérieur et aménagement",
            "icone": "paint-bucket",
            "couleur": "#EC4899",
            "checklist_template": [
                {"id": "dec_1", "label": "Protection des sols/meubles", "type": "checkbox", "required": True},
                {"id": "dec_2", "label": "Préparation des surfaces", "type": "checkbox", "required": True},
                {"id": "dec_3", "label": "Application conforme au devis", "type": "checkbox", "required": True},
                {"id": "dec_4", "label": "Finitions vérifiées", "type": "checkbox", "required": True},
                {"id": "dec_5", "label": "Photo avant", "type": "photo", "required": False},
                {"id": "dec_6", "label": "Photo après", "type": "photo", "required": False},
                {"id": "dec_7", "label": "Commentaires client", "type": "text", "required": False}
            ]
        },
        "electricite": {
            "nom": "Électricité",
            "description": "Installation et dépannage électrique",
            "icone": "zap",
            "couleur": "#EAB308",
            "checklist_template": [
                {"id": "elec_1", "label": "Coupure du courant effectuée", "type": "checkbox", "required": True},
                {"id": "elec_2", "label": "Vérification du tableau", "type": "checkbox", "required": True},
                {"id": "elec_3", "label": "Test de continuité", "type": "checkbox", "required": False},
                {"id": "elec_4", "label": "Mise à la terre vérifiée", "type": "checkbox", "required": True},
                {"id": "elec_5", "label": "Tension mesurée (V)", "type": "number", "required": False},
                {"id": "elec_6", "label": "Photo du tableau", "type": "photo", "required": False},
                {"id": "elec_7", "label": "Observations", "type": "text", "required": False}
            ]
        },
        "plomberie": {
            "nom": "Plomberie & CVC",
            "description": "Plomberie, chauffage, climatisation",
            "icone": "droplet",
            "couleur": "#2563EB",
            "checklist_template": [
                {"id": "plb_1", "label": "Coupure d'eau effectuée", "type": "checkbox", "required": True},
                {"id": "plb_2", "label": "Fuite identifiée et réparée", "type": "checkbox", "required": True},
                {"id": "plb_3", "label": "Test d'étanchéité réalisé", "type": "checkbox", "required": True},
                {"id": "plb_4", "label": "Pression vérifiée (bar)", "type": "number", "required": False},
                {"id": "plb_5", "label": "Photo avant", "type": "photo", "required": False},
                {"id": "plb_6", "label": "Photo après", "type": "photo", "required": False},
                {"id": "plb_7", "label": "Observations", "type": "text", "required": False}
            ]
        },
        "espaces-verts": {
            "nom": "Espaces Verts & Extérieur",
            "description": "Jardinage et paysagisme",
            "icone": "tree",
            "couleur": "#22C55E",
            "checklist_template": [
                {"id": "ev_1", "label": "Tonte effectuée", "type": "checkbox", "required": False},
                {"id": "ev_2", "label": "Taille des haies/arbustes", "type": "checkbox", "required": False},
                {"id": "ev_3", "label": "Désherbage", "type": "checkbox", "required": False},
                {"id": "ev_4", "label": "Arrosage vérifié", "type": "checkbox", "required": False},
                {"id": "ev_5", "label": "Évacuation des déchets verts", "type": "checkbox", "required": True},
                {"id": "ev_6", "label": "Photo du résultat", "type": "photo", "required": False},
                {"id": "ev_7", "label": "Observations", "type": "text", "required": False}
            ]
        },
        "securite": {
            "nom": "Sécurité & Installation",
            "description": "Alarmes et vidéosurveillance",
            "icone": "shield",
            "couleur": "#EF4444",
            "checklist_template": [
                {"id": "sec_1", "label": "Installation conforme", "type": "checkbox", "required": True},
                {"id": "sec_2", "label": "Tests des capteurs", "type": "checkbox", "required": True},
                {"id": "sec_3", "label": "Test de l'alarme", "type": "checkbox", "required": True},
                {"id": "sec_4", "label": "Configuration du système", "type": "checkbox", "required": True},
                {"id": "sec_5", "label": "Formation utilisateur", "type": "checkbox", "required": True},
                {"id": "sec_6", "label": "Photo installation", "type": "photo", "required": False},
                {"id": "sec_7", "label": "Codes d'accès remis", "type": "text", "required": False}
            ]
        },
        "multiservices": {
            "nom": "Services Techniques Multi-services",
            "description": "Homme toutes mains et petits travaux",
            "icone": "settings",
            "couleur": "#64748B",
            "checklist_template": [
                {"id": "ms_1", "label": "Travaux effectués conformément à la demande", "type": "checkbox", "required": True},
                {"id": "ms_2", "label": "Matériel/outils utilisés", "type": "text", "required": False},
                {"id": "ms_3", "label": "Zone de travail nettoyée", "type": "checkbox", "required": True},
                {"id": "ms_4", "label": "Photo avant", "type": "photo", "required": False},
                {"id": "ms_5", "label": "Photo après", "type": "photo", "required": False},
                {"id": "ms_6", "label": "Observations", "type": "text", "required": False}
            ]
        },
        "specialises": {
            "nom": "Services Spécialisés",
            "description": "Dératisation, inspection, services niche",
            "icone": "star",
            "couleur": "#A855F7",
            "checklist_template": [
                {"id": "sp_1", "label": "Inspection initiale effectuée", "type": "checkbox", "required": True},
                {"id": "sp_2", "label": "Traitement appliqué", "type": "text", "required": False},
                {"id": "sp_3", "label": "Zones traitées", "type": "text", "required": False},
                {"id": "sp_4", "label": "Recommandations client", "type": "text", "required": False},
                {"id": "sp_5", "label": "Photo documentation", "type": "photo", "required": False},
                {"id": "sp_6", "label": "Prochaine intervention prévue", "type": "text", "required": False}
            ]
        }
    }
    return categories.get(cat_id, {"nom": cat_id, "checklist_template": []})


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
        
        # Handle both paid and trialing statuses
        should_create = (
            status.payment_status in ("paid", "trialing", "active") and 
            transaction.get("payment_status") not in ("paid", "trialing", "active")
        )
        
        if should_create:
            update_data["activated_at"] = datetime.now(timezone.utc).isoformat()
            
            # Create the entreprise account
            if transaction.get("entreprise_name") and transaction.get("admin_email"):
                is_trial = status.payment_status == "trialing"
                await create_entreprise_from_subscription(
                    transaction["entreprise_name"],
                    transaction["admin_email"],
                    transaction["plan_id"],
                    session_id,
                    is_trial=is_trial
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
    session_id: str,
    is_trial: bool = False
):
    """Create entreprise and admin user after successful subscription payment or trial start"""
    # Check if already created (idempotency)
    existing = await db.entreprises.find_one({"stripe_session_id": session_id})
    if existing:
        logger.info(f"Entreprise already created for session {session_id}")
        return existing["id"]
    
    # Create entreprise
    entreprise_id = str(uuid.uuid4())
    plan = get_plan(plan_id) or get_plan("startup")
    
    # Build COMPLETE plan_limits from plan definition
    plan_limits = {
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
    
    entreprise_doc = {
        "id": entreprise_id,
        "nom": entreprise_name,
        "email": admin_email,
        "plan": plan_id,
        "plan_name": plan["name"] if plan else "Starter",
        "plan_limits": plan_limits,
        "stripe_session_id": session_id,
        "subscription_status": "trialing" if is_trial else "active",
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
                
                # Handle both paid and trialing statuses
                should_create = (
                    webhook_response.payment_status in ("paid", "trialing", "active") and 
                    transaction.get("payment_status") not in ("paid", "trialing", "active")
                )
                
                if should_create:
                    update_data["activated_at"] = datetime.now(timezone.utc).isoformat()
                    
                    # Create entreprise if not already done
                    if transaction.get("entreprise_name") and transaction.get("admin_email"):
                        is_trial = webhook_response.payment_status == "trialing"
                        await create_entreprise_from_subscription(
                            transaction["entreprise_name"],
                            transaction["admin_email"],
                            transaction["plan_id"],
                            webhook_response.session_id,
                            is_trial=is_trial
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



@router.post("/cancel")
async def cancel_subscription(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Cancel the current subscription with feedback"""
    import stripe
    
    # Parse request body for feedback
    try:
        body = await request.json()
        cancel_reason = body.get("reason", "")
        cancel_feedback = body.get("feedback", "")
    except:
        cancel_reason = ""
        cancel_feedback = ""
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = stripe_api_key
    
    # Get entreprise
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "stripe_subscription_id": 1, "nom": 1, "email": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription_id = entreprise.get("stripe_subscription_id")
    
    # Save cancellation feedback
    await db.cancellation_feedback.insert_one({
        "id": str(uuid.uuid4()),
        "entreprise_id": current_user["entreprise_id"],
        "entreprise_nom": entreprise.get("nom"),
        "user_email": current_user.get("email"),
        "reason": cancel_reason,
        "feedback": cancel_feedback,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    logger.info(f"Cancellation feedback saved: {cancel_reason} - {entreprise.get('nom')}")
    
    if not subscription_id:
        # No Stripe subscription - just reset the plan to free/none
        await db.entreprises.update_one(
            {"id": current_user["entreprise_id"]},
            {"$set": {
                "plan": None,
                "subscription_status": "cancelled",
                "cancel_at_period_end": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {
            "success": True,
            "message": "Votre abonnement a été annulé."
        }
    
    try:
        # Cancel the subscription at period end (user keeps access until end of billing period)
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        # Update entreprise status
        await db.entreprises.update_one(
            {"id": current_user["entreprise_id"]},
            {"$set": {
                "subscription_status": "canceling",
                "cancel_at_period_end": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        logger.info(f"Subscription {subscription_id} marked for cancellation for {entreprise.get('nom')}")
        
        return {
            "success": True,
            "message": "Votre abonnement sera annulé à la fin de la période en cours.",
            "cancel_at": subscription.cancel_at
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error canceling subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@router.post("/reactivate")
async def reactivate_subscription(current_user: dict = Depends(get_current_user)):
    """Reactivate a subscription that was set to cancel"""
    import stripe
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = stripe_api_key
    
    # Get entreprise
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "stripe_subscription_id": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    subscription_id = entreprise.get("stripe_subscription_id")
    
    if not subscription_id:
        raise HTTPException(status_code=400, detail="Aucun abonnement trouvé")
    
    try:
        # Reactivate subscription
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=False
        )
        
        # Update entreprise status
        await db.entreprises.update_one(
            {"id": current_user["entreprise_id"]},
            {"$set": {
                "subscription_status": "active",
                "cancel_at_period_end": False,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "success": True,
            "message": "Votre abonnement a été réactivé."
        }
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error reactivating subscription: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")



@router.post("/update-extras")
async def update_extra_technicians(current_user: dict = Depends(get_current_user)):
    """Update subscription with extra technicians billing"""
    import stripe
    from plan_limits import check_technician_limit, get_entreprise_limits
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        # If no Stripe, just return the current count
        tech_info = await check_technician_limit(db, current_user["entreprise_id"])
        return {"success": True, "extra_count": tech_info.get("extra_count", 0), "extra_cost": tech_info.get("extra_cost", 0)}
    
    stripe.api_key = stripe_api_key
    
    # Get entreprise
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "stripe_subscription_id": 1, "nom": 1, "plan": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    # Calculate extra technicians
    tech_info = await check_technician_limit(db, current_user["entreprise_id"])
    extra_count = tech_info.get("extra_count", 0)
    price_per_extra = tech_info.get("price_per_extra", 5)
    
    # Update entreprise record with extra info
    await db.entreprises.update_one(
        {"id": current_user["entreprise_id"]},
        {"$set": {
            "extra_technicians": extra_count,
            "extra_technicians_cost": extra_count * price_per_extra,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    subscription_id = entreprise.get("stripe_subscription_id")
    
    if subscription_id and extra_count > 0:
        try:
            # Get the subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Check if there's already an extra technician line item
            extra_item = None
            for item in subscription.get("items", {}).get("data", []):
                if item.get("price", {}).get("metadata", {}).get("type") == "extra_tech":
                    extra_item = item
                    break
            
            if extra_item:
                # Update existing line item quantity
                stripe.SubscriptionItem.modify(
                    extra_item["id"],
                    quantity=extra_count
                )
            else:
                # Create a price for extra technicians if needed
                extra_tech_price = stripe.Price.create(
                    unit_amount=int(price_per_extra * 100),
                    currency="eur",
                    recurring={"interval": "month"},
                    product_data={
                        "name": "Technicien supplémentaire",
                        "metadata": {"type": "extra_tech"}
                    },
                    metadata={"type": "extra_tech"}
                )
                
                # Add new line item
                stripe.SubscriptionItem.create(
                    subscription=subscription_id,
                    price=extra_tech_price.id,
                    quantity=extra_count
                )
            
            logger.info(f"Updated extra technicians for {entreprise.get('nom')}: {extra_count} techs")
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating extras: {str(e)}")
            # Non-blocking - just log the error
    
    return {
        "success": True,
        "extra_count": extra_count,
        "extra_cost": extra_count * price_per_extra,
        "message": f"{extra_count} technicien(s) supplémentaire(s) (+{extra_count * price_per_extra}€/mois)" if extra_count > 0 else "Aucun technicien supplémentaire"
    }


@router.get("/billing-summary")
async def get_billing_summary(current_user: dict = Depends(get_current_user)):
    """Get current billing summary including extras"""
    from plan_limits import check_technician_limit, get_entreprise_limits
    from subscription_service import get_plan
    
    # Get entreprise info
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1, "nom": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    plan_id = entreprise.get("plan", "startup")
    plan = get_plan(plan_id)
    
    # Get technician info
    tech_info = await check_technician_limit(db, current_user["entreprise_id"])
    
    base_price = plan.get("price", 0) if plan else 0
    extra_cost = tech_info.get("extra_cost", 0)
    total_monthly = base_price + extra_cost
    
    return {
        "plan_name": plan.get("name", "Startup") if plan else "Startup",
        "base_price": base_price,
        "technicians": {
            "included": tech_info.get("max", 3),
            "current": tech_info.get("current", 0),
            "extra": tech_info.get("extra_count", 0),
            "price_per_extra": tech_info.get("price_per_extra", 5),
            "extra_cost": extra_cost
        },
        "total_monthly": total_monthly,
        "currency": "EUR"
    }



@router.post("/change-plan")
async def change_subscription_plan(
    request: Request,
    new_plan_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Change subscription plan (upgrade or downgrade)
    - Upgrade: Immediate change with prorated billing
    - Downgrade: Takes effect at end of current billing period
    """
    import stripe
    from subscription_service import get_plan, PLANS
    
    stripe_api_key = os.environ.get('STRIPE_API_KEY')
    if not stripe_api_key:
        raise HTTPException(status_code=500, detail="Stripe non configuré")
    
    stripe.api_key = stripe_api_key
    
    # Validate new plan
    new_plan = get_plan(new_plan_id)
    if not new_plan:
        raise HTTPException(status_code=400, detail="Plan invalide")
    
    # Get entreprise
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "stripe_subscription_id": 1, "stripe_customer_id": 1, "plan": 1, "nom": 1}
    )
    
    if not entreprise:
        raise HTTPException(status_code=404, detail="Entreprise non trouvée")
    
    current_plan_id = entreprise.get("plan", "startup")
    current_plan = get_plan(current_plan_id)
    
    if current_plan_id == new_plan_id:
        raise HTTPException(status_code=400, detail="Vous êtes déjà sur ce plan")
    
    subscription_id = entreprise.get("stripe_subscription_id")
    
    if not subscription_id:
        raise HTTPException(status_code=400, detail="Aucun abonnement actif. Veuillez d'abord souscrire à un plan.")
    
    # Determine if upgrade or downgrade
    current_price = current_plan.get("price", 0) if current_plan else 0
    new_price = new_plan.get("price", 0)
    is_upgrade = new_price > current_price
    
    try:
        # Get current subscription
        subscription = stripe.Subscription.retrieve(subscription_id)
        
        # Get or create price for new plan
        # First check if we have an existing price
        new_price_id = None
        
        # Create a new price for the plan
        product = stripe.Product.create(
            name=f"Actoos {new_plan['name']}",
            description=new_plan.get("description", f"Abonnement {new_plan['name']}")
        )
        
        price = stripe.Price.create(
            product=product.id,
            unit_amount=int(new_plan["price"] * 100),
            currency=new_plan.get("currency", "eur"),
            recurring={"interval": "month"}
        )
        new_price_id = price.id
        
        # Get the main subscription item (excluding extra technicians)
        main_item = None
        for item in subscription.get("items", {}).get("data", []):
            if item.get("price", {}).get("metadata", {}).get("type") != "extra_tech":
                main_item = item
                break
        
        if not main_item:
            raise HTTPException(status_code=400, detail="Impossible de trouver l'élément d'abonnement principal")
        
        if is_upgrade:
            # UPGRADE: Immediate change with prorated billing
            stripe.SubscriptionItem.modify(
                main_item["id"],
                price=new_price_id,
                proration_behavior="create_prorations"  # Charge the difference immediately
            )
            
            # Update entreprise immediately
            await db.entreprises.update_one(
                {"id": current_user["entreprise_id"]},
                {"$set": {
                    "plan": new_plan_id,
                    "plan_name": new_plan["name"],
                    "plan_limits": new_plan.get("limits", {}),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"Upgrade: {entreprise.get('nom')} from {current_plan_id} to {new_plan_id}")
            
            return {
                "success": True,
                "type": "upgrade",
                "message": f"Félicitations ! Vous êtes passé au plan {new_plan['name']}. Les nouvelles fonctionnalités sont disponibles immédiatement.",
                "effective_immediately": True,
                "new_plan": new_plan["name"],
                "prorated": True
            }
        else:
            # DOWNGRADE: Takes effect at end of billing period
            stripe.SubscriptionItem.modify(
                main_item["id"],
                price=new_price_id,
                proration_behavior="none"  # No proration for downgrades
            )
            
            # Schedule the plan change for end of period
            await db.entreprises.update_one(
                {"id": current_user["entreprise_id"]},
                {"$set": {
                    "scheduled_plan_change": {
                        "new_plan_id": new_plan_id,
                        "new_plan_name": new_plan["name"],
                        "effective_at": subscription.current_period_end
                    },
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Calculate when it takes effect
            from datetime import datetime as dt
            effective_date = dt.fromtimestamp(subscription.current_period_end)
            
            logger.info(f"Downgrade scheduled: {entreprise.get('nom')} from {current_plan_id} to {new_plan_id}, effective {effective_date}")
            
            return {
                "success": True,
                "type": "downgrade",
                "message": f"Votre passage au plan {new_plan['name']} prendra effet à la fin de votre période de facturation actuelle.",
                "effective_immediately": False,
                "effective_date": effective_date.strftime("%d/%m/%Y"),
                "new_plan": new_plan["name"],
                "note": "Vous conservez l'accès à toutes les fonctionnalités de votre plan actuel jusqu'à cette date."
            }
            
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error changing plan: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Erreur Stripe: {str(e)}")


@router.get("/available-plans")
async def get_available_plans_for_change(current_user: dict = Depends(get_current_user)):
    """Get available plans for subscription change with pricing comparison"""
    from subscription_service import get_plan, PLANS
    
    # Get current plan
    entreprise = await db.entreprises.find_one(
        {"id": current_user["entreprise_id"]},
        {"_id": 0, "plan": 1}
    )
    
    current_plan_id = entreprise.get("plan", "startup") if entreprise else "startup"
    current_plan = get_plan(current_plan_id)
    current_price = current_plan.get("price", 0) if current_plan else 0
    
    available_plans = []
    for plan_id, plan_data in PLANS.items():
        plan_info = {
            "id": plan_id,
            "name": plan_data["name"],
            "price": plan_data["price"],
            "currency": plan_data.get("currency", "eur"),
            "description": plan_data.get("description", ""),
            "is_current": plan_id == current_plan_id,
            "limits": plan_data.get("limits", {})
        }
        
        if plan_id != current_plan_id:
            if plan_data["price"] > current_price:
                plan_info["change_type"] = "upgrade"
                plan_info["change_note"] = "Changement immédiat avec facturation au prorata"
            else:
                plan_info["change_type"] = "downgrade"
                plan_info["change_note"] = "Prend effet à la fin de la période actuelle"
            
            plan_info["price_difference"] = plan_data["price"] - current_price
        
        available_plans.append(plan_info)
    
    return {
        "current_plan": current_plan_id,
        "plans": available_plans
    }
