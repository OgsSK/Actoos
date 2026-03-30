"""
API Key and Webhook management for third-party integrations
"""
from pydantic import BaseModel, Field, EmailStr
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


# ==================== EXTERNAL API MODELS ====================
class APIClientCreate(BaseModel):
    """Model for creating a client via external API"""
    nom: str = Field(..., description="Nom du client")
    prenom: Optional[str] = Field(default="", description="Prénom du client")
    email: Optional[EmailStr] = Field(default=None, description="Email du client")
    telephone: Optional[str] = Field(default=None, description="Téléphone du client")
    adresse: Optional[str] = Field(default=None, description="Adresse")
    code_postal: Optional[str] = Field(default=None, description="Code postal")
    ville: Optional[str] = Field(default=None, description="Ville")
    notes: Optional[str] = Field(default=None, description="Notes internes")
    external_id: Optional[str] = Field(default=None, description="ID dans le système externe (ERP/CRM)")

class APIClientUpdate(BaseModel):
    """Model for updating a client via external API"""
    nom: Optional[str] = None
    prenom: Optional[str] = None
    email: Optional[EmailStr] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    code_postal: Optional[str] = None
    ville: Optional[str] = None
    notes: Optional[str] = None
    external_id: Optional[str] = None

class APIInterventionCreate(BaseModel):
    """Model for creating an intervention via external API"""
    client_id: str = Field(..., description="ID du client Actoos")
    titre: str = Field(..., description="Titre de l'intervention")
    description: Optional[str] = Field(default=None, description="Description détaillée")
    date_prevue: str = Field(..., description="Date prévue (ISO 8601)")
    adresse: Optional[str] = Field(default=None, description="Adresse si différente du client")
    ville: Optional[str] = Field(default=None, description="Ville si différente du client")
    code_postal: Optional[str] = Field(default=None, description="Code postal si différent")
    duree_estimee: Optional[int] = Field(default=60, description="Durée estimée en minutes")
    priorite: Optional[str] = Field(default="normale", description="Priorité: basse, normale, haute, urgente")
    technicien_id: Optional[str] = Field(default=None, description="ID du technicien assigné")
    categorie_id: Optional[str] = Field(default=None, description="ID de la catégorie")
    notes_internes: Optional[str] = Field(default=None, description="Notes internes")
    external_id: Optional[str] = Field(default=None, description="ID dans le système externe")

class APIInterventionUpdate(BaseModel):
    """Model for updating an intervention via external API"""
    titre: Optional[str] = None
    description: Optional[str] = None
    date_prevue: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    duree_estimee: Optional[int] = None
    priorite: Optional[str] = None
    technicien_id: Optional[str] = None
    categorie_id: Optional[str] = None
    notes_internes: Optional[str] = None
    statut: Optional[str] = None
    external_id: Optional[str] = None


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
