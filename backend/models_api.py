"""
API Key and Webhook management for third-party integrations
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class APIKeyCreate(BaseModel):
    name: str = Field(..., description="Nom descriptif de la clé API")
    permissions: List[str] = Field(default=["read"], description="Permissions: read, write, webhook")
    expires_in_days: Optional[int] = Field(default=None, description="Expiration en jours (null = jamais)")

class APIKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str  # First 8 characters for identification
    permissions: List[str]
    created_at: str
    expires_at: Optional[str]
    last_used_at: Optional[str]
    is_active: bool

class WebhookCreate(BaseModel):
    url: str = Field(..., description="URL de callback HTTPS")
    events: List[str] = Field(..., description="Événements à écouter")
    secret: Optional[str] = Field(default=None, description="Secret pour signature HMAC")
    description: Optional[str] = None

class WebhookResponse(BaseModel):
    id: str
    url: str
    events: List[str]
    description: Optional[str]
    is_active: bool
    created_at: str
    last_triggered_at: Optional[str]
    failure_count: int

class WebhookEvent(BaseModel):
    event_type: str
    payload: dict
    timestamp: str
    webhook_id: str
    delivery_id: str

# Available webhook events
WEBHOOK_EVENTS = [
    "intervention.created",
    "intervention.updated", 
    "intervention.started",
    "intervention.completed",
    "intervention.cancelled",
    "devis.created",
    "devis.sent",
    "devis.signed",
    "facture.created",
    "facture.emitted",
    "facture.paid",
    "client.created",
    "client.updated",
]

# API permissions
API_PERMISSIONS = {
    "read": "Lecture des données (clients, interventions, devis, factures)",
    "write": "Création et modification des données",
    "webhook": "Gestion des webhooks",
    "admin": "Accès complet (incluant gestion des clés API)"
}
