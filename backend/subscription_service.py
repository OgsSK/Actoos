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

# Subscription Plans - Fixed on backend for security
SUBSCRIPTION_PLANS = {
    "starter": {
        "name": "Starter",
        "price": 29.00,
        "currency": "eur",
        "description": "Idéal pour les petites équipes",
        "features": [
            "Jusqu'à 3 techniciens",
            "100 interventions/mois",
            "1 catégorie de service",
            "Support email"
        ],
        "max_technicians": 3,
        "max_interventions_month": 100,
        "max_categories": 1
    },
    "pro": {
        "name": "Pro",
        "price": 79.00,
        "currency": "eur",
        "description": "Pour les entreprises en croissance",
        "features": [
            "Jusqu'à 10 techniciens",
            "Interventions illimitées",
            "Toutes les catégories",
            "SMS inclus (100/mois)",
            "Support prioritaire"
        ],
        "max_technicians": 10,
        "max_interventions_month": -1,  # unlimited
        "max_categories": -1,  # unlimited
        "sms_included": 100
    },
    "enterprise": {
        "name": "Enterprise",
        "price": 199.00,
        "currency": "eur",
        "description": "Solution complète multi-sites",
        "features": [
            "Techniciens illimités",
            "Interventions illimitées",
            "Toutes les catégories",
            "SMS illimités",
            "White-labeling complet",
            "Support dédié 24/7",
            "API accès"
        ],
        "max_technicians": -1,  # unlimited
        "max_interventions_month": -1,
        "max_categories": -1,
        "sms_included": -1,
        "white_label": True,
        "api_access": True
    }
}

def get_plan(plan_id: str) -> Optional[Dict[str, Any]]:
    """Get plan details by ID"""
    return SUBSCRIPTION_PLANS.get(plan_id)

def get_all_plans() -> Dict[str, Dict[str, Any]]:
    """Get all available plans"""
    return SUBSCRIPTION_PLANS

def validate_plan_limits(plan_id: str, current_technicians: int = 0) -> bool:
    """Validate if plan limits are respected"""
    plan = get_plan(plan_id)
    if not plan:
        return False
    
    max_tech = plan.get("max_technicians", 0)
    if max_tech > 0 and current_technicians > max_tech:
        return False
    
    return True
