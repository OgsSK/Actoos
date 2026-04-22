"""
Stripe Subscription Service for ACTOOS PRO
Handles subscription plans, checkout sessions, and webhooks

TARIFS OFFICIELS ACTOOS PRO (Mise à jour 2026)
- Startup: 9,99€/mois ou 95,90€/an (-20%)
- Pro: 19,99€/mois ou 191,90€/an (-20%)
- Entreprise: 39,99€/mois ou 383,90€/an (-20%)
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)

# =============================================================================
# ACTOOS PRO - GRILLE TARIFAIRE OFFICIELLE
# =============================================================================
#
# TARIFS HT (Hors Taxes)
# - Mensuel: Prélèvement chaque mois
# - Annuel: -20% de réduction, engagement 12 mois
#
# Nom marchand sur relevés bancaires: ACTOOS PRO
# =============================================================================

SUBSCRIPTION_PLANS = {
    "startup": {
        "name": "Startup",
        "price": 9.99,  # Mensuel HT
        "price_annual": 95.90,  # Annuel HT (-20%)
        "price_per_extra_tech": 5.00,
        "currency": "eur",
        "description": "Pour indépendants et petites structures",
        "target_audience": "Artisans, auto-entrepreneurs, petites équipes",
        "features": [
            "1 administrateur",
            "3 techniciens inclus (+5€/tech supplémentaire)",
            "1 catégorie métier",
            "Gestion clients, devis, factures",
            "Planning interventions",
            "Signature électronique",
            "App terrain PWA",
            "Logo entreprise sur documents",
            "Paiement en ligne basique"
        ],
        # Limits
        "max_admins": 1,
        "max_technicians": 3,
        "max_categories": 1,
        "max_interventions_month": -1,
        # Features
        "multi_sites": False,
        "offline_mode": False,
        "geolocation": False,
        "auto_pdf_reports": False,
        "advanced_analytics": False,
        "white_label": False,
        "api_access": False,
        "advanced_branding": False,
        "smart_planning": False,
        "auto_devis_to_facture": False,
        "team_validation": False,
        "sms_included": 0
    },
    "pro": {
        "name": "Pro",
        "price": 19.99,  # Mensuel HT
        "price_annual": 191.90,  # Annuel HT (-20%)
        "price_per_extra_tech": 5.00,
        "currency": "eur",
        "description": "Pour PME et équipes en croissance",
        "target_audience": "PME, équipes structurées",
        "recommended": True,
        "features": [
            "3 administrateurs",
            "10 techniciens inclus (+5€/tech supplémentaire)",
            "Jusqu'à 4 catégories métier",
            "Tout Startup +",
            "Automatisation devis → facture",
            "Planning intelligent",
            "Statistiques activité",
            "Gestion équipes",
            "Historique complet clients",
            "Notifications automatiques",
            "App terrain: photos illimitées, géolocalisation, mode hors ligne",
            "Rapports d'intervention PDF automatiques",
            "Validation chef d'équipe",
            "Branding avancé",
            "Analytics avancés"
        ],
        # Limits
        "max_admins": 3,
        "max_technicians": 10,
        "max_categories": 4,
        "max_interventions_month": -1,
        # Features
        "multi_sites": False,
        "offline_mode": True,
        "geolocation": True,
        "auto_pdf_reports": True,
        "advanced_analytics": True,
        "white_label": False,
        "api_access": False,
        "advanced_branding": True,
        "smart_planning": True,
        "auto_devis_to_facture": True,
        "team_validation": True,
        "sms_included": 100
    },
    "enterprise": {
        "name": "Entreprise",
        "price": 39.99,  # Mensuel HT
        "price_annual": 383.90,  # Annuel HT (-20%)
        "price_per_extra_tech": 0,  # Techniciens illimités inclus
        "currency": "eur",
        "description": "Pour organisations avancées et besoins complexes",
        "target_audience": "Entreprises structurées, multi-équipes",
        "features": [
            "Administrateurs illimités",
            "Techniciens illimités",
            "Toutes les catégories métier",
            "Multi-sites",
            "Multi-équipes",
            "Permissions avancées / rôles personnalisés",
            "Reporting avancé, KPI personnalisés",
            "Export comptable",
            "Accès API",
            "Automatisations complètes",
            "Workflow personnalisable",
            "Formulaires dynamiques",
            "Validation multi-niveau",
            "Suivi GPS avancé",
            "Branding Premium",
            "PDF totalement personnalisables",
            "Portail client personnalisé",
            "Paiements récurrents",
            "Intégrations comptables",
            "Support prioritaire"
        ],
        # Limits
        "max_admins": -1,
        "max_technicians": -1,
        "max_categories": -1,
        "max_interventions_month": -1,
        # Features
        "multi_sites": True,
        "offline_mode": True,
        "geolocation": True,
        "auto_pdf_reports": True,
        "advanced_analytics": True,
        "white_label": True,
        "api_access": True,
        "advanced_branding": True,
        "smart_planning": True,
        "auto_devis_to_facture": True,
        "team_validation": True,
        "multi_teams": True,
        "custom_workflows": True,
        "dynamic_forms": True,
        "advanced_gps": True,
        "client_portal_custom": True,
        "recurring_payments": True,
        "accounting_export": True,
        "sms_included": -1
    }
}

# Backward compatibility
SUBSCRIPTION_PLANS["starter"] = SUBSCRIPTION_PLANS["startup"]


def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get plan details by ID"""
    if plan_id == "starter":
        plan_id = "startup"
    return SUBSCRIPTION_PLANS.get(plan_id)


def get_all_plans() -> Dict[str, Dict[str, Any]]:
    """Get all available plans (excluding legacy alias)"""
    return {k: v for k, v in SUBSCRIPTION_PLANS.items() if k != "starter"}


def get_plan_price(plan_id: str, billing_cycle: str = "monthly") -> float:
    """
    Get the price for a plan based on billing cycle.
    
    Args:
        plan_id: Plan identifier (startup, pro, enterprise)
        billing_cycle: 'monthly' or 'annual'
    
    Returns:
        Price in EUR (HT)
    """
    plan = get_plan(plan_id)
    if not plan:
        return 0.0
    
    if billing_cycle == "annual":
        return plan.get("price_annual", plan["price"] * 12 * 0.8)
    return plan["price"]


def validate_plan_limits(plan_id: str, current_technicians: int = 0) -> bool:
    """Validate if plan limits are respected"""
    plan = get_plan(plan_id)
    if not plan:
        return False
    
    max_tech = plan.get("max_technicians", 0)
    if max_tech > 0 and current_technicians > max_tech:
        return False
    
    return True


def has_feature(plan_id: str, feature: str) -> bool:
    """Check if a plan has a specific feature enabled"""
    plan = get_plan(plan_id)
    if not plan:
        return False
    return plan.get(feature, False)


def calculate_extra_technicians_cost(plan_id: str, extra_techs: int) -> float:
    """Calculate the monthly cost for extra technicians"""
    plan = get_plan(plan_id)
    if not plan:
        return 0.0
    
    price_per_extra = plan.get("price_per_extra_tech", 0)
    if price_per_extra == 0:  # Enterprise has unlimited techs
        return 0.0
    
    return extra_techs * price_per_extra


# Alias for export
PLANS = SUBSCRIPTION_PLANS
