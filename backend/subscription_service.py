"""
Stripe Subscription Service for Actoos SaaS
Handles subscription plans, checkout sessions, and webhooks
"""
import logging
import os
from datetime import datetime, timezone
from typing import Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)

# =============================================================================
# ACTOOS OFFICIAL SUBSCRIPTION PLANS (Version Finale)
# =============================================================================
#
# Key Logic:
# 1. Client chooses subscription → 2. Chooses categories → 3. Actoos activates features
#
# Pricing for extra technicians: +5€/mois/technicien (all plans)
# =============================================================================

SUBSCRIPTION_PLANS = {
    "startup": {
        "name": "Startup",
        "price": 49.00,
        "price_per_extra_tech": 5.00,
        "currency": "eur",
        "description": "Pour artisans, auto-entrepreneurs et petites équipes",
        "features": [
            "1 administrateur",
            "3 techniciens inclus (+5€/tech)",
            "1 catégorie au choix (BTP, Nettoyage, Maintenance...)",
            "Gestion clients, devis, factures",
            "Planning interventions",
            "Signature électronique",
            "App terrain PWA (missions, checklist, photos, signature)",
            "Logo entreprise sur documents",
            "Paiement en ligne basique"
        ],
        # Limits
        "max_admins": 1,
        "max_technicians": 3,  # Included, can add more at 5€/tech
        "max_categories": 1,
        "max_interventions_month": -1,  # unlimited
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
        "price": 79.00,
        "price_per_extra_tech": 5.00,
        "currency": "eur",
        "description": "Pour PME en croissance",
        "recommended": True,
        "features": [
            "3 administrateurs",
            "10 techniciens inclus (+5€/tech)",
            "Jusqu'à 4 catégories",
            "Tout Startup +",
            "Automatisation devis → facture",
            "Planning intelligent",
            "Statistiques activité",
            "Gestion équipes",
            "Historique complet clients",
            "Notifications automatiques",
            "App terrain: photos illimitées, géolocalisation, mode hors ligne",
            "Rapports d'intervention PDF auto",
            "Validation chef d'équipe",
            "Branding avancé (couleurs, templates, emails)",
            "Paiement complet (acompte, direct)",
            "Analytics: CA, rentabilité, performance"
        ],
        # Limits
        "max_admins": 3,
        "max_technicians": 10,  # Included, can add more at 5€/tech
        "max_categories": 4,
        "max_interventions_month": -1,
        # Features
        "multi_sites": False,  # Still Enterprise only
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
        "name": "Enterprise",
        "price": 129.00,
        "price_per_extra_tech": 0,  # Unlimited included
        "currency": "eur",
        "description": "Entreprises structurées et multi-équipes",
        "features": [
            "Administrateurs illimités",
            "Techniciens illimités",
            "Toutes les catégories",
            "Multi-sites",
            "Multi-équipes",
            "Permissions avancées / rôles personnalisés",
            "Reporting avancé, KPI personnalisés",
            "Export comptable",
            "API accès",
            "Automatisations complètes",
            "Workflow personnalisable",
            "Formulaires dynamiques",
            "Validation multi-niveau",
            "Suivi GPS avancé",
            "Branding Premium (quasi white-label)",
            "PDF totalement personnalisables",
            "Portail client personnalisé",
            "Abonnements clients finaux",
            "Paiements récurrents",
            "Intégrations comptables",
            "Support dédié 24/7"
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

# For backward compatibility with existing code
SUBSCRIPTION_PLANS["starter"] = SUBSCRIPTION_PLANS["startup"]

def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get plan details by ID"""
    # Handle legacy "starter" name
    if plan_id == "starter":
        plan_id = "startup"
    return SUBSCRIPTION_PLANS.get(plan_id)

def get_all_plans() -> Dict[str, Dict[str, Any]]:
    """Get all available plans (excluding legacy alias)"""
    return {k: v for k, v in SUBSCRIPTION_PLANS.items() if k != "starter"}

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
