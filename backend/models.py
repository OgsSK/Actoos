"""
Pydantic Models for Field Service Management SaaS
Multi-tenant architecture with entreprise_id isolation
"""
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import Optional, List, Literal
from datetime import datetime, timezone
import uuid

def generate_id() -> str:
    return str(uuid.uuid4())

def now_utc() -> datetime:
    return datetime.now(timezone.utc)

# ==================== ENTREPRISE ====================
# Supported currencies
SUPPORTED_CURRENCIES = {
    "EUR": {"symbol": "€", "name": "Euro", "position": "after", "decimal_separator": ",", "thousands_separator": " "},
    "USD": {"symbol": "$", "name": "US Dollar", "position": "before", "decimal_separator": ".", "thousands_separator": ","},
    "XOF": {"symbol": "CFA", "name": "Franc CFA", "position": "after", "decimal_separator": ",", "thousands_separator": " "},
    "GBP": {"symbol": "£", "name": "British Pound", "position": "before", "decimal_separator": ".", "thousands_separator": ","},
    "CHF": {"symbol": "CHF", "name": "Swiss Franc", "position": "after", "decimal_separator": ".", "thousands_separator": "'"},
    "CAD": {"symbol": "$", "name": "Canadian Dollar", "position": "before", "decimal_separator": ".", "thousands_separator": ","},
    "MAD": {"symbol": "DH", "name": "Dirham Marocain", "position": "after", "decimal_separator": ",", "thousands_separator": " "},
}

SUPPORTED_LOCALES = ["fr-FR", "en-US", "en-GB", "fr-CA", "fr-MA"]

class EntrepriseBase(BaseModel):
    nom: str
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[str] = None
    siret: Optional[str] = None
    tva_intra: Optional[str] = None
    logo_url: Optional[str] = None
    conditions_generales: Optional[str] = None
    couleur_primaire: str = "#2563EB"
    devise: str = "EUR"  # Currency code (EUR, USD, XOF, etc.)
    locale: str = "fr-FR"  # Locale for formatting

class EntrepriseCreate(EntrepriseBase):
    pass

class Entreprise(EntrepriseBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    sequence_devis: int = 1
    sequence_facture: int = 1
    created_at: datetime = Field(default_factory=now_utc)

# ==================== USER ====================
class UserBase(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    telephone: Optional[str] = None
    role: Literal["admin", "tech"] = "tech"
    skills: List[str] = []  # List of categorie_id representing technician skills

class UserCreate(UserBase):
    password: str

class UserInvite(BaseModel):
    email: EmailStr
    nom: str
    prenom: str
    telephone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserPasswordReset(BaseModel):
    email: EmailStr

class UserSetPassword(BaseModel):
    token: str
    new_password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    password_hash: str
    statut: Literal["actif", "invite", "desactive"] = "actif"
    derniere_connexion: Optional[datetime] = None
    created_at: datetime = Field(default_factory=now_utc)

class UserResponse(BaseModel):
    id: str
    entreprise_id: str
    email: str
    nom: str
    prenom: str
    telephone: Optional[str] = None
    role: str
    statut: str
    skills: List[str] = []  # List of categorie_id for technician skills
    derniere_connexion: Optional[str] = None
    created_at: str

class UserSkillsUpdate(BaseModel):
    skills: List[str]  # List of categorie_id to assign

# ==================== CLIENT ====================
class ClientBase(BaseModel):
    nom: str
    prenom: Optional[str] = None
    email: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    type_client: Literal["particulier", "professionnel"] = "particulier"
    notes: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class Client(ClientBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    portal_token: str = Field(default_factory=generate_id)  # Token for client portal access
    created_at: datetime = Field(default_factory=now_utc)

class ClientResponse(ClientBase):
    id: str
    entreprise_id: str
    portal_token: Optional[str] = None
    created_at: str
    # Archive fields
    archived: Optional[bool] = False
    archived_at: Optional[str] = None
    archived_by: Optional[str] = None
    restored_at: Optional[str] = None
    restored_by: Optional[str] = None

# ==================== SITE (Multi-site support) ====================
class SiteBase(BaseModel):
    """Site/Location belonging to a client (e.g., warehouse, factory, office)"""
    nom: str  # e.g., "Entrepôt Nord", "Siège social"
    adresse: str
    ville: str
    code_postal: str
    contact_nom: Optional[str] = None  # On-site contact person
    contact_telephone: Optional[str] = None
    contact_email: Optional[str] = None
    horaires_acces: Optional[str] = None  # e.g., "Lun-Ven 8h-18h"
    instructions_acces: Optional[str] = None  # e.g., "Code portail: 1234"
    notes: Optional[str] = None
    actif: bool = True

class SiteCreate(SiteBase):
    client_id: str

class SiteUpdate(BaseModel):
    nom: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    contact_nom: Optional[str] = None
    contact_telephone: Optional[str] = None
    contact_email: Optional[str] = None
    horaires_acces: Optional[str] = None
    instructions_acces: Optional[str] = None
    notes: Optional[str] = None
    actif: Optional[bool] = None

class Site(SiteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    client_id: str
    entreprise_id: str
    created_at: datetime = Field(default_factory=now_utc)

class SiteResponse(SiteBase):
    id: str
    client_id: str
    entreprise_id: str
    created_at: str

# ==================== CATEGORIE ====================
class ChecklistItem(BaseModel):
    id: str = Field(default_factory=generate_id)
    label: str
    type: Literal["checkbox", "text", "number", "photo", "signature"] = "checkbox"
    required: bool = False
    description: Optional[str] = None

class CategorieBase(BaseModel):
    code: str  # e.g., "plomberie", "electricite", "nettoyage"
    nom: str
    description: Optional[str] = None
    icone: Optional[str] = None  # e.g., "wrench", "zap", "sparkles"
    couleur: str = "#3B82F6"  # hex color
    checklist_template: List[ChecklistItem] = []

class CategorieCreate(CategorieBase):
    pass

class Categorie(CategorieBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    active: bool = True
    created_at: datetime = Field(default_factory=now_utc)

class ChecklistResponse(BaseModel):
    item_id: str
    label: str
    type: str
    value: Optional[str] = None  # For text/number
    checked: Optional[bool] = None  # For checkbox
    photo_url: Optional[str] = None  # For photo type
    completed_at: Optional[datetime] = None

# ==================== INTERVENTION ====================
class InterventionBase(BaseModel):
    client_id: str
    titre: str
    description: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    date_prevue: datetime
    duree_estimee: int = 60  # minutes
    priorite: Literal["basse", "normale", "haute", "urgente"] = "normale"
    notes_internes: Optional[str] = None
    categorie_id: Optional[str] = None
    site_id: Optional[str] = None  # Link to specific client site

class InterventionCreate(InterventionBase):
    technicien_id: Optional[str] = None

class InterventionUpdate(BaseModel):
    titre: Optional[str] = None
    description: Optional[str] = None
    adresse: Optional[str] = None
    ville: Optional[str] = None
    code_postal: Optional[str] = None
    date_prevue: Optional[datetime] = None
    duree_estimee: Optional[int] = None
    priorite: Optional[Literal["basse", "normale", "haute", "urgente"]] = None
    statut: Optional[Literal["planifiee", "en_cours", "terminee", "annulee"]] = None
    technicien_id: Optional[str] = None
    notes_internes: Optional[str] = None
    notes_terrain: Optional[str] = None
    heure_debut: Optional[datetime] = None
    heure_fin: Optional[datetime] = None
    categorie_id: Optional[str] = None
    site_id: Optional[str] = None  # Link to specific client site
    checklist_responses: Optional[List[ChecklistResponse]] = None
    # Geolocation
    geo_debut: Optional[dict] = None  # {"latitude": float, "longitude": float, "accuracy": float}
    geo_fin: Optional[dict] = None
    # Client signature at completion
    signature_client: Optional[str] = None  # Base64 image
    nom_signataire: Optional[str] = None
    date_signature: Optional[datetime] = None

class InterventionSignature(BaseModel):
    """Model for capturing client signature at intervention completion"""
    signature: str = Field(..., description="Base64 encoded signature image")
    nom_signataire: str = Field(..., description="Name of the person signing")
    notes: Optional[str] = None

class InterventionGeoLocation(BaseModel):
    """Model for geolocation data"""
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    timestamp: Optional[str] = None

class Intervention(InterventionBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    technicien_id: Optional[str] = None
    statut: Literal["planifiee", "en_cours", "terminee", "annulee"] = "planifiee"
    notes_terrain: Optional[str] = None
    photos: List[str] = []
    heure_debut: Optional[datetime] = None
    heure_fin: Optional[datetime] = None
    devis_id: Optional[str] = None
    facture_id: Optional[str] = None
    checklist_responses: List[ChecklistResponse] = []
    created_at: datetime = Field(default_factory=now_utc)

# ==================== DEVIS ====================
class LigneDevis(BaseModel):
    description: str
    quantite: float = 1
    prix_unitaire: float
    tva: float = 20.0

class DevisBase(BaseModel):
    client_id: str
    intervention_id: Optional[str] = None
    lignes: List[LigneDevis] = []
    conditions: Optional[str] = None
    validite_jours: int = 30
    message_client: Optional[str] = None

class DevisCreate(DevisBase):
    pass

class DevisUpdate(BaseModel):
    lignes: Optional[List[LigneDevis]] = None
    conditions: Optional[str] = None
    validite_jours: Optional[int] = None
    message_client: Optional[str] = None
    statut: Optional[Literal["brouillon", "envoye", "signe", "refuse", "expire", "facture"]] = None

class Devis(DevisBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    technicien_id: Optional[str] = None
    numero_devis: str = ""
    statut: Literal["brouillon", "envoye", "signe", "refuse", "expire", "facture"] = "brouillon"
    total_ht: float = 0
    total_tva: float = 0
    total_ttc: float = 0
    # Currency snapshot - captures currency at document creation time
    devise: str = "EUR"  # Currency code when document was created
    taux_change_eur: float = 1.0  # Exchange rate to EUR at creation time
    token_client: str = Field(default_factory=lambda: str(uuid.uuid4()))
    signature_client: Optional[str] = None
    date_signature: Optional[datetime] = None
    nom_signataire: Optional[str] = None
    pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)
    date_expiration: Optional[datetime] = None

# ==================== FACTURE ====================
class FactureBase(BaseModel):
    client_id: str
    devis_id: Optional[str] = None
    intervention_id: Optional[str] = None
    lignes: List[LigneDevis] = []
    conditions_paiement: Optional[str] = None
    echeance_jours: int = 30
    mode_paiement: Optional[str] = None

class FactureCreate(FactureBase):
    pass

class FactureFromDevis(BaseModel):
    devis_id: str

class Facture(FactureBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    technicien_id: Optional[str] = None
    numero_facture: str = ""
    statut: Literal["brouillon", "emise", "payee", "en_retard", "annulee"] = "brouillon"
    total_ht: float = 0
    total_tva: float = 0
    total_ttc: float = 0
    montant_paye: float = 0
    date_paiement: Optional[datetime] = None
    # Currency snapshot - captures currency at document creation time
    devise: str = "EUR"  # Currency code when document was created
    taux_change_eur: float = 1.0  # Exchange rate to EUR at creation time
    pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)
    date_echeance: Optional[datetime] = None

# ==================== AUDIT LOG ====================
class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    user_id: str
    action: str
    entity: str
    entity_id: str
    details: Optional[dict] = None
    timestamp: datetime = Field(default_factory=now_utc)

# ==================== PHOTO ====================
class Photo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    intervention_id: str
    storage_path: str
    original_filename: str
    content_type: str
    type_photo: Literal["avant", "apres", "defaut", "autre"] = "autre"
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=now_utc)
    is_deleted: bool = False

# ==================== SYNC ====================
class SyncAction(BaseModel):
    action_type: Literal["create", "update"]
    entity: str
    entity_id: str
    data: dict
    local_timestamp: datetime

class SyncRequest(BaseModel):
    actions: List[SyncAction]
    last_sync: Optional[datetime] = None

# ==================== AUTH ====================
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    entreprise: Optional[dict] = None

class RegisterRequest(BaseModel):
    entreprise_nom: str
    entreprise_email: Optional[str] = None
    entreprise_telephone: Optional[str] = None
    admin_email: EmailStr
    admin_nom: str
    admin_prenom: str
    admin_password: str
    referral_source: Optional[str] = None  # Comment avez-vous connu Actoos?

# ==================== COMMUNICATION LOG ====================
class CommunicationLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=generate_id)
    entreprise_id: str
    client_id: str
    type: Literal["email", "sms"]
    direction: Literal["outgoing", "incoming"] = "outgoing"
    subject: Optional[str] = None  # For emails
    recipient: str  # Email address or phone number
    content_preview: Optional[str] = None  # First 200 chars of message
    status: Literal["sent", "delivered", "failed", "pending"] = "sent"
    error_message: Optional[str] = None
    related_entity: Optional[str] = None  # e.g., "devis", "facture", "intervention"
    related_entity_id: Optional[str] = None
    sent_by: Optional[str] = None  # User ID who triggered the send
    created_at: datetime = Field(default_factory=now_utc)
