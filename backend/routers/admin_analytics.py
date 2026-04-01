"""
Admin Analytics Router - Business Intelligence pour Actoos
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from dependencies import db
from auth import get_current_user
from collections import Counter

router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

async def require_super_admin(current_user: dict = Depends(get_current_user)):
    """
    Vérifie que l'utilisateur est un super admin (email spécifique)
    En production, utilisez une liste d'emails autorisés ou un rôle spécial
    """
    # Récupérer l'email de l'utilisateur depuis la DB
    user = await db.users.find_one(
        {"id": current_user["user_id"]},
        {"_id": 0, "email": 1}
    )
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    
    user_email = user.get("email", "")
    
    # Liste des emails super admin (à configurer en production)
    # En production, ces emails seront dans une variable d'environnement
    import os
    super_admin_env = os.environ.get("SUPER_ADMIN_EMAILS", "")
    super_admin_emails = [
        "admin@actoos.com",
        "admin@test-pro.com",  # Pour tests
    ]
    if super_admin_env:
        super_admin_emails.extend(super_admin_env.split(","))
    
    if user_email not in super_admin_emails:
        raise HTTPException(
            status_code=403, 
            detail="Accès réservé aux administrateurs Actoos"
        )
    
    current_user["email"] = user_email
    return current_user


@router.get("/overview")
async def get_analytics_overview(current_user: dict = Depends(require_super_admin)):
    """
    Vue d'ensemble des métriques business
    """
    now = datetime.now(timezone.utc)
    thirty_days_ago = (now - timedelta(days=30)).isoformat()
    seven_days_ago = (now - timedelta(days=7)).isoformat()
    
    # Comptages globaux
    total_entreprises = await db.entreprises.count_documents({})
    total_users = await db.users.count_documents({})
    
    # Entreprises par plan
    plans_pipeline = [
        {"$group": {"_id": "$plan", "count": {"$sum": 1}}}
    ]
    plans_result = await db.entreprises.aggregate(plans_pipeline).to_list(None)
    plans_distribution = {p["_id"] or "trial": p["count"] for p in plans_result}
    
    # Inscriptions récentes (30 jours)
    new_entreprises_30d = await db.entreprises.count_documents({
        "created_at": {"$gte": thirty_days_ago}
    })
    
    # Inscriptions récentes (7 jours)
    new_entreprises_7d = await db.entreprises.count_documents({
        "created_at": {"$gte": seven_days_ago}
    })
    
    # Statuts d'abonnement
    status_pipeline = [
        {"$group": {"_id": "$subscription_status", "count": {"$sum": 1}}}
    ]
    status_result = await db.entreprises.aggregate(status_pipeline).to_list(None)
    subscription_status = {s["_id"] or "unknown": s["count"] for s in status_result}
    
    return {
        "overview": {
            "total_entreprises": total_entreprises,
            "total_users": total_users,
            "new_entreprises_30d": new_entreprises_30d,
            "new_entreprises_7d": new_entreprises_7d
        },
        "plans_distribution": plans_distribution,
        "subscription_status": subscription_status
    }


@router.get("/referral-sources")
async def get_referral_sources(current_user: dict = Depends(require_super_admin)):
    """
    Analyse des sources d'acquisition - Comment les utilisateurs ont connu Actoos
    """
    pipeline = [
        {"$match": {"referral_source": {"$exists": True, "$ne": None, "$ne": ""}}},
        {"$group": {"_id": "$referral_source", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    result = await db.entreprises.aggregate(pipeline).to_list(None)
    
    # Compter aussi ceux sans source
    total = await db.entreprises.count_documents({})
    with_source = sum(r["count"] for r in result)
    
    sources = [{"source": r["_id"], "count": r["count"]} for r in result]
    sources.append({"source": "Non renseigné", "count": total - with_source})
    
    return {
        "referral_sources": sources,
        "total_entreprises": total,
        "response_rate": round((with_source / total * 100), 1) if total > 0 else 0
    }


@router.get("/cancellation-feedback")
async def get_cancellation_feedback(
    limit: int = 100,
    current_user: dict = Depends(require_super_admin)
):
    """
    Analyse des raisons de résiliation
    """
    # Récupérer tous les feedbacks
    feedbacks = await db.cancellation_feedback.find(
        {},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(None)
    
    # Agrégation par raison
    reason_pipeline = [
        {"$group": {"_id": "$reason", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    reasons_result = await db.cancellation_feedback.aggregate(reason_pipeline).to_list(None)
    
    # Mapper les codes vers des labels lisibles
    reason_labels = {
        "too_expensive": "Trop cher",
        "not_enough_features": "Fonctionnalités insuffisantes",
        "switching_competitor": "Passage à un concurrent",
        "business_closed": "Fermeture de l'entreprise",
        "temporary_pause": "Pause temporaire",
        "technical_issues": "Problèmes techniques",
        "poor_support": "Support insatisfaisant",
        "other": "Autre"
    }
    
    reasons_summary = [
        {
            "reason_code": r["_id"],
            "reason_label": reason_labels.get(r["_id"], r["_id"]),
            "count": r["count"]
        }
        for r in reasons_result
    ]
    
    total_cancellations = await db.cancellation_feedback.count_documents({})
    
    return {
        "total_cancellations": total_cancellations,
        "reasons_summary": reasons_summary,
        "recent_feedbacks": feedbacks[:20]  # Les 20 plus récents avec détails
    }


@router.get("/signup-funnel")
async def get_signup_funnel(
    days: int = 30,
    current_user: dict = Depends(require_super_admin)
):
    """
    Analyse du funnel d'inscription par jour
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date.isoformat()}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "signups": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    result = await db.entreprises.aggregate(pipeline).to_list(None)
    
    daily_signups = [
        {"date": r["_id"], "signups": r["signups"]}
        for r in result
    ]
    
    return {
        "period_days": days,
        "total_signups": sum(r["signups"] for r in daily_signups),
        "daily_signups": daily_signups
    }


@router.get("/conversion-rates")
async def get_conversion_rates(current_user: dict = Depends(require_super_admin)):
    """
    Taux de conversion trial -> paid
    """
    # Total trials
    total_trials = await db.entreprises.count_documents({
        "subscription_status": {"$in": ["trialing", "active", "cancelled", "canceling"]}
    })
    
    # Conversions (active subscriptions)
    active_subscriptions = await db.entreprises.count_documents({
        "subscription_status": "active",
        "stripe_subscription_id": {"$exists": True, "$ne": None}
    })
    
    # Churned (cancelled)
    churned = await db.entreprises.count_documents({
        "subscription_status": {"$in": ["cancelled", "canceling"]}
    })
    
    # Still trialing
    still_trialing = await db.entreprises.count_documents({
        "subscription_status": "trialing"
    })
    
    conversion_rate = round((active_subscriptions / total_trials * 100), 1) if total_trials > 0 else 0
    churn_rate = round((churned / total_trials * 100), 1) if total_trials > 0 else 0
    
    return {
        "total_trials": total_trials,
        "active_subscriptions": active_subscriptions,
        "churned": churned,
        "still_trialing": still_trialing,
        "conversion_rate": conversion_rate,
        "churn_rate": churn_rate
    }


@router.get("/revenue-by-plan")
async def get_revenue_by_plan(current_user: dict = Depends(require_super_admin)):
    """
    Revenus estimés par plan (MRR)
    """
    plan_prices = {
        "startup": 49,
        "pro": 79,
        "enterprise": 149
    }
    
    pipeline = [
        {"$match": {
            "subscription_status": "active",
            "plan": {"$in": list(plan_prices.keys())}
        }},
        {"$group": {"_id": "$plan", "count": {"$sum": 1}}}
    ]
    
    result = await db.entreprises.aggregate(pipeline).to_list(None)
    
    revenue_breakdown = []
    total_mrr = 0
    
    for plan in plan_prices:
        count = next((r["count"] for r in result if r["_id"] == plan), 0)
        mrr = count * plan_prices[plan]
        total_mrr += mrr
        revenue_breakdown.append({
            "plan": plan,
            "subscribers": count,
            "price": plan_prices[plan],
            "mrr": mrr
        })
    
    return {
        "revenue_breakdown": revenue_breakdown,
        "total_mrr": total_mrr,
        "arr": total_mrr * 12
    }


@router.get("/setup-demo-account")
async def setup_demo_account(secret_key: str):
    """
    Crée le compte démo et supprime les comptes test
    Protégé par une clé secrète (à appeler une seule fois)
    """
    # Clé secrète pour protéger cet endpoint
    import os
    expected_key = os.environ.get("ADMIN_SETUP_KEY", "actoos-setup-2024-secret")
    
    if secret_key != expected_key:
        raise HTTPException(status_code=403, detail="Clé invalide")
    
    from auth import get_password_hash
    import uuid
    
    results = {
        "deleted_test_accounts": [],
        "deleted_test_entreprises": [],
        "demo_account_created": False,
        "errors": []
    }
    
    # 1. Supprimer les comptes test
    test_emails = [
        "admin@test-pro.com",
        "admin@test-startup.com", 
        "admin@test-enterprise.com"
    ]
    
    for email in test_emails:
        try:
            # Trouver l'utilisateur test
            test_user = await db.users.find_one({"email": email})
            if test_user:
                entreprise_id = test_user.get("entreprise_id")
                
                # Supprimer l'utilisateur
                await db.users.delete_one({"email": email})
                results["deleted_test_accounts"].append(email)
                
                # Supprimer l'entreprise associée et toutes ses données
                if entreprise_id:
                    await db.entreprises.delete_one({"id": entreprise_id})
                    await db.users.delete_many({"entreprise_id": entreprise_id})
                    await db.clients.delete_many({"entreprise_id": entreprise_id})
                    await db.interventions.delete_many({"entreprise_id": entreprise_id})
                    await db.devis.delete_many({"entreprise_id": entreprise_id})
                    await db.factures.delete_many({"entreprise_id": entreprise_id})
                    await db.categories.delete_many({"entreprise_id": entreprise_id})
                    results["deleted_test_entreprises"].append(entreprise_id)
        except Exception as e:
            results["errors"].append(f"Erreur suppression {email}: {str(e)}")
    
    # 2. Créer ou mettre à jour le compte démo
    try:
        demo_email = "demo@actoos.com"
        demo_password = "demo2024"
        
        # Vérifier si le compte démo existe déjà
        existing_demo = await db.users.find_one({"email": demo_email})
        
        if existing_demo:
            results["demo_account_created"] = "already_exists"
        else:
            # Créer l'entreprise démo
            demo_entreprise_id = str(uuid.uuid4())
            demo_entreprise = {
                "id": demo_entreprise_id,
                "nom": "Entreprise Démo",
                "email": demo_email,
                "telephone": "+33 1 23 45 67 89",
                "adresse": "123 Rue de la Démo",
                "ville": "Paris",
                "code_postal": "75001",
                "pays": "France",
                "siret": "12345678901234",
                "tva_number": "FR12345678901",
                "plan": "enterprise",
                "plan_limits": {
                    "max_admins": 99,
                    "max_technicians": 99,
                    "max_categories": 99,
                    "max_interventions_month": -1,
                    "multi_sites": True,
                    "offline_mode": True,
                    "geolocation": True,
                    "auto_pdf_reports": True,
                    "advanced_analytics": True,
                    "white_label": True,
                    "api_access": True,
                    "advanced_branding": True,
                    "smart_planning": True,
                    "sms_notifications": True,
                    "custom_fields": True,
                    "priority_support": True
                },
                "is_demo": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            await db.entreprises.insert_one(demo_entreprise)
            
            # Créer l'utilisateur admin démo
            demo_user_id = str(uuid.uuid4())
            demo_user = {
                "id": demo_user_id,
                "email": demo_email,
                "password_hash": get_password_hash(demo_password),
                "nom": "Utilisateur",
                "prenom": "Démo",
                "role": "admin",
                "entreprise_id": demo_entreprise_id,
                "is_active": True,
                "is_demo": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(demo_user)
            
            # Créer quelques données de démonstration
            # Catégorie
            demo_category = {
                "id": str(uuid.uuid4()),
                "nom": "Maintenance",
                "description": "Interventions de maintenance",
                "entreprise_id": demo_entreprise_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.categories.insert_one(demo_category)
            
            # Client démo
            demo_client = {
                "id": str(uuid.uuid4()),
                "nom": "Dupont",
                "prenom": "Jean",
                "email": "jean.dupont@demo.com",
                "telephone": "+33 6 12 34 56 78",
                "adresse": "45 Avenue des Champs",
                "ville": "Paris",
                "code_postal": "75008",
                "entreprise_id": demo_entreprise_id,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.clients.insert_one(demo_client)
            
            results["demo_account_created"] = True
    except Exception as e:
        results["errors"].append(f"Erreur création démo: {str(e)}")
    
    return results
