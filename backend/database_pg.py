"""
PostgreSQL Database Layer for ACTOOS PRO
High-performance async database with connection pooling
Replaces MongoDB for better performance and scalability
"""
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import (
    String, Text, Boolean, Integer, Float, DateTime, ForeignKey,
    JSON, Enum as SQLEnum, Index, select, update, delete, func, and_, or_
)
from sqlalchemy.dialects.postgresql import UUID
import enum

logger = logging.getLogger(__name__)

# ============================================================
# DATABASE CONNECTION
# ============================================================

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

# Build async database URL
def get_database_url() -> str:
    if DATABASE_URL:
        # Convert postgres:// to postgresql+asyncpg://
        url = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://")
        url = url.replace("postgresql://", "postgresql+asyncpg://")
        return url
    return ""

# Create async engine with connection pooling for high performance
engine = None
async_session_factory = None

async def init_database():
    """Initialize database connection pool"""
    global engine, async_session_factory
    
    db_url = get_database_url()
    if not db_url:
        logger.warning("DATABASE_URL not set - PostgreSQL disabled")
        return False
    
    try:
        engine = create_async_engine(
            db_url,
            echo=False,  # Set to True for SQL debugging
            pool_size=20,  # Connection pool size
            max_overflow=30,  # Extra connections when pool is full
            pool_timeout=30,  # Timeout waiting for connection
            pool_recycle=1800,  # Recycle connections after 30 min
            pool_pre_ping=True,  # Verify connections before use
        )
        
        async_session_factory = async_sessionmaker(
            engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Test connection
        async with engine.begin() as conn:
            await conn.execute(select(func.now()))
        
        logger.info("PostgreSQL connection pool initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL: {e}")
        return False

async def close_database():
    """Close database connection pool"""
    global engine
    if engine:
        await engine.dispose()
        logger.info("PostgreSQL connection pool closed")

@asynccontextmanager
async def get_db_session():
    """Get database session with automatic cleanup"""
    if not async_session_factory:
        raise RuntimeError("Database not initialized")
    
    session = async_session_factory()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()


# ============================================================
# ENUMS
# ============================================================

class UserRole(enum.Enum):
    admin = "admin"
    technicien = "technicien"
    super_admin = "super_admin"

class UserStatut(enum.Enum):
    actif = "actif"
    inactif = "inactif"
    en_attente = "en_attente"

class InterventionStatut(enum.Enum):
    planifiee = "planifiee"
    en_cours = "en_cours"
    terminee = "terminee"
    annulee = "annulee"
    disponible = "disponible"
    reclamee = "reclamee"

class InterventionPriorite(enum.Enum):
    basse = "basse"
    normale = "normale"
    haute = "haute"
    urgente = "urgente"

class DevisStatut(enum.Enum):
    brouillon = "brouillon"
    envoye = "envoye"
    signe = "signe"
    refuse = "refuse"
    expire = "expire"

class FactureStatut(enum.Enum):
    brouillon = "brouillon"
    envoyee = "envoyee"
    payee = "payee"
    partielle = "partielle"
    en_retard = "en_retard"
    annulee = "annulee"

class ClientType(enum.Enum):
    particulier = "particulier"
    professionnel = "professionnel"

class PlanType(enum.Enum):
    free = "free"
    startup = "startup"
    pro = "pro"
    enterprise = "enterprise"


# ============================================================
# BASE MODEL
# ============================================================

class Base(DeclarativeBase):
    pass


# ============================================================
# MODELS
# ============================================================

class Entreprise(Base):
    __tablename__ = "entreprises"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    nom: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    telephone: Mapped[Optional[str]] = mapped_column(String(50))
    adresse: Mapped[Optional[str]] = mapped_column(Text)
    ville: Mapped[Optional[str]] = mapped_column(String(100))
    code_postal: Mapped[Optional[str]] = mapped_column(String(20))
    siret: Mapped[Optional[str]] = mapped_column(String(50))
    tva_intra: Mapped[Optional[str]] = mapped_column(String(50))
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    couleur_primaire: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    
    # Plan & Limites
    plan: Mapped[str] = mapped_column(String(20), default="free")
    plan_limits: Mapped[Dict] = mapped_column(JSON, default=dict)
    
    # Stripe
    stripe_customer_id: Mapped[Optional[str]] = mapped_column(String(255))
    stripe_subscription_id: Mapped[Optional[str]] = mapped_column(String(255))
    subscription_status: Mapped[str] = mapped_column(String(20), default="active")
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Séquences
    sequence_devis: Mapped[int] = mapped_column(Integer, default=1)
    sequence_facture: Mapped[int] = mapped_column(Integer, default=1)
    
    # Settings
    payment_settings: Mapped[Dict] = mapped_column(JSON, default=dict)
    
    # Demo
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Indexes
    __table_args__ = (
        Index("idx_entreprises_stripe", "stripe_customer_id"),
        Index("idx_entreprises_plan", "plan"),
    )


class User(Base):
    __tablename__ = "users"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenom: Mapped[Optional[str]] = mapped_column(String(100))
    telephone: Mapped[Optional[str]] = mapped_column(String(50))
    role: Mapped[str] = mapped_column(String(20), default="technicien")
    statut: Mapped[str] = mapped_column(String(20), default="actif")
    
    # Technicien specific
    skills: Mapped[List] = mapped_column(JSON, default=list)
    specialites: Mapped[List] = mapped_column(JSON, default=list)
    
    # 2FA
    two_factor_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    two_factor_secret: Mapped[Optional[str]] = mapped_column(Text)
    
    # Session
    derniere_connexion: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_users_entreprise", "entreprise_id"),
        Index("idx_users_email", "email"),
        Index("idx_users_role", "entreprise_id", "role"),
    )


class Client(Base):
    __tablename__ = "clients"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    telephone: Mapped[Optional[str]] = mapped_column(String(50))
    adresse: Mapped[Optional[str]] = mapped_column(Text)
    ville: Mapped[Optional[str]] = mapped_column(String(100))
    code_postal: Mapped[Optional[str]] = mapped_column(String(20))
    type_client: Mapped[str] = mapped_column(String(20), default="particulier")
    notes: Mapped[Optional[str]] = mapped_column(Text)
    portal_token: Mapped[str] = mapped_column(UUID(as_uuid=False), default=lambda: str(uuid.uuid4()))
    tags: Mapped[List] = mapped_column(JSON, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_clients_entreprise", "entreprise_id"),
        Index("idx_clients_portal_token", "portal_token"),
    )


class Category(Base):
    __tablename__ = "categories"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    couleur: Mapped[str] = mapped_column(String(7), default="#3B82F6")
    icone: Mapped[Optional[str]] = mapped_column(String(50))
    checklist: Mapped[List] = mapped_column(JSON, default=list)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_categories_entreprise", "entreprise_id"),
    )


class Intervention(Base):
    __tablename__ = "interventions"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id", ondelete="SET NULL"))
    technicien_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"))
    categorie_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("categories.id", ondelete="SET NULL"))
    
    titre: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    adresse: Mapped[Optional[str]] = mapped_column(Text)
    ville: Mapped[Optional[str]] = mapped_column(String(100))
    code_postal: Mapped[Optional[str]] = mapped_column(String(20))
    
    date_prevue: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    heure_debut: Mapped[Optional[str]] = mapped_column(String(10))
    duree_estimee: Mapped[int] = mapped_column(Integer, default=60)
    
    statut: Mapped[str] = mapped_column(String(20), default="planifiee")
    priorite: Mapped[str] = mapped_column(String(20), default="normale")
    
    notes_internes: Mapped[Optional[str]] = mapped_column(Text)
    notes_technicien: Mapped[Optional[str]] = mapped_column(Text)
    rapport: Mapped[Optional[str]] = mapped_column(Text)
    
    photos: Mapped[List] = mapped_column(JSON, default=list)
    checklist_completed: Mapped[List] = mapped_column(JSON, default=list)
    
    signature_client: Mapped[Optional[str]] = mapped_column(Text)
    nom_signataire: Mapped[Optional[str]] = mapped_column(String(100))
    date_signature: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    date_debut_reelle: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    date_fin_reelle: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    
    __table_args__ = (
        Index("idx_interventions_entreprise", "entreprise_id"),
        Index("idx_interventions_date", "entreprise_id", "date_prevue"),
        Index("idx_interventions_statut", "entreprise_id", "statut"),
        Index("idx_interventions_technicien", "entreprise_id", "technicien_id"),
    )


class Devis(Base):
    __tablename__ = "devis"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    intervention_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("interventions.id", ondelete="SET NULL"))
    technicien_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    
    numero_devis: Mapped[str] = mapped_column(String(50), nullable=False)
    statut: Mapped[str] = mapped_column(String(20), default="brouillon")
    
    total_ht: Mapped[float] = mapped_column(Float, default=0)
    total_tva: Mapped[float] = mapped_column(Float, default=0)
    total_ttc: Mapped[float] = mapped_column(Float, default=0)
    
    lignes: Mapped[List] = mapped_column(JSON, default=list)
    
    conditions: Mapped[Optional[str]] = mapped_column(Text)
    message_client: Mapped[Optional[str]] = mapped_column(Text)
    validite_jours: Mapped[int] = mapped_column(Integer, default=30)
    date_expiration: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    token_client: Mapped[str] = mapped_column(UUID(as_uuid=False), unique=True, default=lambda: str(uuid.uuid4()))
    signature_client: Mapped[Optional[str]] = mapped_column(Text)
    nom_signataire: Mapped[Optional[str]] = mapped_column(String(100))
    date_signature: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_devis_entreprise", "entreprise_id"),
        Index("idx_devis_token", "token_client"),
    )


class Facture(Base):
    __tablename__ = "factures"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id", ondelete="RESTRICT"), nullable=False)
    devis_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("devis.id", ondelete="SET NULL"))
    intervention_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("interventions.id", ondelete="SET NULL"))
    technicien_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    
    numero_facture: Mapped[str] = mapped_column(String(50), nullable=False)
    statut: Mapped[str] = mapped_column(String(20), default="brouillon")
    
    total_ht: Mapped[float] = mapped_column(Float, default=0)
    total_tva: Mapped[float] = mapped_column(Float, default=0)
    total_ttc: Mapped[float] = mapped_column(Float, default=0)
    montant_paye: Mapped[float] = mapped_column(Float, default=0)
    
    lignes: Mapped[List] = mapped_column(JSON, default=list)
    
    conditions_paiement: Mapped[Optional[str]] = mapped_column(Text)
    echeance_jours: Mapped[int] = mapped_column(Integer, default=30)
    date_echeance: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    date_paiement: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    mode_paiement: Mapped[Optional[str]] = mapped_column(String(50))
    
    token_client: Mapped[str] = mapped_column(UUID(as_uuid=False), default=lambda: str(uuid.uuid4()))
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_factures_entreprise", "entreprise_id"),
        Index("idx_factures_statut", "entreprise_id", "statut"),
    )


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    facture_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("factures.id", ondelete="CASCADE"), nullable=False)
    montant: Mapped[float] = mapped_column(Float, nullable=False)
    mode_paiement: Mapped[Optional[str]] = mapped_column(String(50))
    reference: Mapped[Optional[str]] = mapped_column(String(255))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    date_paiement: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_invoice_payments_facture", "facture_id"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    entity_type: Mapped[Optional[str]] = mapped_column(String(50))
    entity_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    details: Mapped[Dict] = mapped_column(JSON, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_audit_logs_entreprise", "entreprise_id", "timestamp"),
    )


class TechInvite(Base):
    __tablename__ = "tech_invites"
    
    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    entreprise_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("entreprises.id", ondelete="CASCADE"), nullable=False)
    telephone: Mapped[str] = mapped_column(String(50), nullable=False)
    nom: Mapped[Optional[str]] = mapped_column(String(100))
    prenom: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255))
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_by: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    
    __table_args__ = (
        Index("idx_tech_invites_entreprise", "entreprise_id"),
        Index("idx_tech_invites_code", "code"),
    )


# ============================================================
# DATABASE HELPER FUNCTIONS
# ============================================================

def model_to_dict(model: Base) -> Dict[str, Any]:
    """Convert SQLAlchemy model to dictionary"""
    result = {}
    for column in model.__table__.columns:
        value = getattr(model, column.name)
        if isinstance(value, datetime):
            result[column.name] = value.isoformat()
        elif isinstance(value, enum.Enum):
            result[column.name] = value.value
        else:
            result[column.name] = value
    return result


async def create_tables():
    """Create all tables in database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
