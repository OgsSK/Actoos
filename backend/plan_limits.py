"""
Plan Limits Service - Validates subscription limits before operations
Based on Official Actoos Plans (Startup 49€, Pro 79€, Enterprise 149€)
"""
from fastapi import HTTPException
from datetime import datetime, timezone
from typing import Optional
import logging

from subscription_service import get_plan, has_feature

logger = logging.getLogger(__name__)


async def get_entreprise_limits(db, entreprise_id: str) -> dict:
    """Get the current plan limits for an entreprise"""
    entreprise = await db.entreprises.find_one(
        {"id": entreprise_id},
        {"_id": 0, "plan": 1, "plan_limits": 1}
    )
    
    if not entreprise:
        # Default to Startup plan limits
        return {
            "max_admins": 1,
            "max_technicians": 3,
            "max_interventions_month": -1,
            "max_categories": 1,
            "multi_sites": False,
            "offline_mode": False,
            "geolocation": False,
            "auto_pdf_reports": False,
            "advanced_analytics": False,
            "white_label": False,
            "api_access": False,
            "sms_included": 0
        }
    
    # Get from plan_limits if stored, otherwise from plan definition
    if entreprise.get("plan_limits"):
        return entreprise["plan_limits"]
    
    plan = get_plan(entreprise.get("plan", "startup"))
    if not plan:
        plan = get_plan("startup")
    
    return {
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


async def check_technician_limit(db, entreprise_id: str) -> dict:
    """Check if entreprise can add more technicians"""
    limits = await get_entreprise_limits(db, entreprise_id)
    max_tech = limits.get("max_technicians", 3)
    
    # -1 means unlimited
    if max_tech == -1:
        return {"allowed": True, "current": 0, "max": -1}
    
    current_count = await db.users.count_documents({
        "entreprise_id": entreprise_id,
        "role": "tech",
        "statut": {"$ne": "desactive"}
    })
    
    return {
        "allowed": current_count < max_tech,
        "current": current_count,
        "max": max_tech,
        "message": f"Limite de {max_tech} techniciens atteinte. Passez à un plan supérieur pour en ajouter plus."
    }


async def check_intervention_limit(db, entreprise_id: str) -> dict:
    """Check if entreprise can create more interventions this month"""
    limits = await get_entreprise_limits(db, entreprise_id)
    max_interventions = limits.get("max_interventions_month", 100)
    
    # -1 means unlimited
    if max_interventions == -1:
        return {"allowed": True, "current": 0, "max": -1}
    
    # Count interventions created this month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    
    current_count = await db.interventions.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    return {
        "allowed": current_count < max_interventions,
        "current": current_count,
        "max": max_interventions,
        "message": f"Limite de {max_interventions} interventions/mois atteinte. Passez à un plan supérieur pour plus d'interventions."
    }


async def check_category_limit(db, entreprise_id: str) -> dict:
    """Check if entreprise can create more categories"""
    limits = await get_entreprise_limits(db, entreprise_id)
    max_categories = limits.get("max_categories", 1)
    
    # -1 means unlimited
    if max_categories == -1:
        return {"allowed": True, "current": 0, "max": -1}
    
    current_count = await db.categories.count_documents({
        "entreprise_id": entreprise_id
    })
    
    return {
        "allowed": current_count < max_categories,
        "current": current_count,
        "max": max_categories,
        "message": f"Limite de {max_categories} catégorie(s) atteinte. Passez à un plan supérieur pour plus de catégories."
    }


async def check_api_access(db, entreprise_id: str) -> bool:
    """Check if entreprise has API access (Enterprise only)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("api_access", False)


async def check_white_label(db, entreprise_id: str) -> bool:
    """Check if entreprise has white label access (Enterprise only)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("white_label", False)


async def check_multi_sites(db, entreprise_id: str) -> bool:
    """Check if entreprise has multi-sites access (Enterprise only)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("multi_sites", False)


async def check_offline_mode(db, entreprise_id: str) -> bool:
    """Check if entreprise has offline mode access (Pro and Enterprise)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("offline_mode", False)


async def check_geolocation(db, entreprise_id: str) -> bool:
    """Check if entreprise has geolocation access (Pro and Enterprise)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("geolocation", False)


async def check_advanced_analytics(db, entreprise_id: str) -> bool:
    """Check if entreprise has advanced analytics (Pro and Enterprise)"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get("advanced_analytics", False)


async def check_feature(db, entreprise_id: str, feature: str) -> bool:
    """Generic feature check based on plan"""
    limits = await get_entreprise_limits(db, entreprise_id)
    return limits.get(feature, False)


async def get_usage_stats(db, entreprise_id: str) -> dict:
    """Get current usage statistics for the entreprise"""
    limits = await get_entreprise_limits(db, entreprise_id)
    
    # Count technicians
    tech_count = await db.users.count_documents({
        "entreprise_id": entreprise_id,
        "role": "tech",
        "statut": {"$ne": "desactive"}
    })
    
    # Count interventions this month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    intervention_count = await db.interventions.count_documents({
        "entreprise_id": entreprise_id,
        "created_at": {"$gte": first_of_month.isoformat()}
    })
    
    # Count categories
    category_count = await db.categories.count_documents({
        "entreprise_id": entreprise_id
    })
    
    return {
        "technicians": {
            "current": tech_count,
            "max": limits.get("max_technicians", 3),
            "percentage": (tech_count / limits.get("max_technicians", 3) * 100) if limits.get("max_technicians", 3) > 0 else 0
        },
        "interventions_month": {
            "current": intervention_count,
            "max": limits.get("max_interventions_month", -1),
            "percentage": 0  # Unlimited interventions in all plans
        },
        "categories": {
            "current": category_count,
            "max": limits.get("max_categories", 1),
            "percentage": (category_count / limits.get("max_categories", 1) * 100) if limits.get("max_categories", 1) > 0 else 0
        },
        "features": {
            # Plan-specific features
            "multi_sites": limits.get("multi_sites", False),
            "offline_mode": limits.get("offline_mode", False),
            "geolocation": limits.get("geolocation", False),
            "auto_pdf_reports": limits.get("auto_pdf_reports", False),
            "advanced_analytics": limits.get("advanced_analytics", False),
            "advanced_branding": limits.get("advanced_branding", False),
            "smart_planning": limits.get("smart_planning", False),
            "auto_devis_to_facture": limits.get("auto_devis_to_facture", False),
            "team_validation": limits.get("team_validation", False),
            "white_label": limits.get("white_label", False),
            "api_access": limits.get("api_access", False),
            "sms_included": limits.get("sms_included", 0)
        }
    }


def raise_limit_error(check_result: dict):
    """Raise HTTPException if limit is reached"""
    if not check_result["allowed"]:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "plan_limit_exceeded",
                "message": check_result["message"],
                "current": check_result["current"],
                "max": check_result["max"]
            }
        )
