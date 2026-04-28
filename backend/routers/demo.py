"""
Router pour le mode démonstration ACTOOS PRO
- Réinitialisation automatique des données
- Gestion cohérente du plan démo (simule Enterprise)
- Actions simulées (emails, SMS, etc.)
"""

from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone, timedelta
import uuid
import os
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/demo", tags=["demo"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'actoos')]

# Import auth utilities
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from auth import get_password_hash, get_current_user

# Configuration du mode démo
DEMO_EMAIL = "demo@actoos.com"
DEMO_PASSWORD = "demo2024"
DEMO_PLAN = "enterprise"  # Le plan simulé en démo

# Données de démonstration initiales
DEMO_SEED_DATA = {
    "clients": [
        {
            "nom": "Dupont",
            "prenom": "Jean",
            "email": "jean.dupont@exemple.com",
            "telephone": "+33 6 12 34 56 78",
            "adresse": "45 Avenue des Champs-Élysées",
            "ville": "Paris",
            "code_postal": "75008",
            "notes": "Client fidèle depuis 2023"
        },
        {
            "nom": "Martin",
            "prenom": "Sophie",
            "email": "sophie.martin@exemple.com",
            "telephone": "+33 6 98 76 54 32",
            "adresse": "12 Rue de la Paix",
            "ville": "Lyon",
            "code_postal": "69002",
            "notes": "Contrat maintenance annuel"
        },
        {
            "nom": "Bernard",
            "prenom": "Pierre",
            "email": "pierre.bernard@exemple.com",
            "telephone": "+33 6 55 44 33 22",
            "adresse": "8 Place Bellecour",
            "ville": "Lyon",
            "code_postal": "69001",
            "notes": ""
        }
    ],
    "categories": [
        {"nom": "Maintenance", "description": "Interventions de maintenance préventive", "couleur": "#3B82F6"},
        {"nom": "Dépannage", "description": "Interventions d'urgence", "couleur": "#EF4444"},
        {"nom": "Installation", "description": "Installation de nouveaux équipements", "couleur": "#22C55E"},
        {"nom": "Diagnostic", "description": "Diagnostic et expertise", "couleur": "#F59E0B"}
    ],
    "techniciens": [
        {
            "nom": "Leroy",
            "prenom": "Marc",
            "email": "marc.leroy@demo-tech.com",
            "telephone": "+33 6 11 22 33 44",
            "specialites": ["Maintenance", "Dépannage"]
        }
    ]
}


async def get_demo_entreprise():
    """Récupère l'entreprise démo"""
    return await db.entreprises.find_one({"is_demo": True})


async def reset_demo_data(entreprise_id: str):
    """
    Réinitialise toutes les données de l'entreprise démo
    Garde l'entreprise et l'admin, supprime le reste
    """
    # Supprimer toutes les données transactionnelles
    await db.interventions.delete_many({"entreprise_id": entreprise_id})
    await db.devis.delete_many({"entreprise_id": entreprise_id})
    await db.factures.delete_many({"entreprise_id": entreprise_id})
    await db.photos.delete_many({"entreprise_id": entreprise_id})
    await db.chat_messages.delete_many({"entreprise_id": entreprise_id})
    await db.audit_logs.delete_many({"entreprise_id": entreprise_id})
    await db.import_history.delete_many({"entreprise_id": entreprise_id})
    
    # Supprimer clients, catégories, techniciens (sauf admin)
    await db.clients.delete_many({"entreprise_id": entreprise_id})
    await db.categories.delete_many({"entreprise_id": entreprise_id})
    await db.users.delete_many({
        "entreprise_id": entreprise_id,
        "role": "technicien"
    })
    
    # Recréer les données de seed
    now = datetime.now(timezone.utc).isoformat()
    
    # Catégories
    for cat in DEMO_SEED_DATA["categories"]:
        await db.categories.insert_one({
            "id": str(uuid.uuid4()),
            "nom": cat["nom"],
            "description": cat["description"],
            "couleur": cat.get("couleur", "#6B7280"),
            "entreprise_id": entreprise_id,
            "created_at": now
        })
    
    # Clients
    client_ids = []
    for client in DEMO_SEED_DATA["clients"]:
        client_id = str(uuid.uuid4())
        client_ids.append(client_id)
        await db.clients.insert_one({
            "id": client_id,
            "nom": client["nom"],
            "prenom": client["prenom"],
            "email": client["email"],
            "telephone": client["telephone"],
            "adresse": client["adresse"],
            "ville": client["ville"],
            "code_postal": client["code_postal"],
            "notes": client.get("notes", ""),
            "entreprise_id": entreprise_id,
            "created_at": now
        })
    
    # Technicien démo
    tech_id = str(uuid.uuid4())
    for tech in DEMO_SEED_DATA["techniciens"]:
        await db.users.insert_one({
            "id": tech_id,
            "email": tech["email"],
            "password_hash": get_password_hash("demo2024"),
            "nom": tech["nom"],
            "prenom": tech["prenom"],
            "telephone": tech.get("telephone", ""),
            "role": "technicien",
            "statut": "actif",
            "is_active": True,
            "entreprise_id": entreprise_id,
            "specialites": tech.get("specialites", []),
            "is_demo": True,
            "created_at": now
        })
    
    # Créer quelques interventions de démonstration
    categories = await db.categories.find({"entreprise_id": entreprise_id}).to_list(10)
    cat_maintenance = next((c for c in categories if c["nom"] == "Maintenance"), categories[0] if categories else None)
    cat_depannage = next((c for c in categories if c["nom"] == "Dépannage"), categories[0] if categories else None)
    
    # Intervention planifiée pour aujourd'hui
    today = datetime.now(timezone.utc).replace(hour=14, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)
    
    interventions = [
        {
            "id": str(uuid.uuid4()),
            "titre": "Maintenance préventive - Climatisation",
            "description": "Vérification annuelle du système de climatisation",
            "client_id": client_ids[0] if client_ids else None,
            "technicien_id": tech_id,
            "categorie_id": cat_maintenance["id"] if cat_maintenance else None,
            "statut": "planifiee",
            "priorite": "normale",
            "date_prevue": today.isoformat(),
            "duree_estimee": 120,
            "adresse": "45 Avenue des Champs-Élysées",
            "ville": "Paris",
            "code_postal": "75008",
            "entreprise_id": entreprise_id,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "titre": "Dépannage urgent - Fuite d'eau",
            "description": "Fuite sous l'évier de la cuisine",
            "client_id": client_ids[1] if len(client_ids) > 1 else client_ids[0] if client_ids else None,
            "technicien_id": tech_id,
            "categorie_id": cat_depannage["id"] if cat_depannage else None,
            "statut": "planifiee",
            "priorite": "haute",
            "date_prevue": tomorrow.isoformat(),
            "duree_estimee": 60,
            "adresse": "12 Rue de la Paix",
            "ville": "Lyon",
            "code_postal": "69002",
            "entreprise_id": entreprise_id,
            "created_at": now
        },
        {
            "id": str(uuid.uuid4()),
            "titre": "Installation terminée - Chaudière",
            "description": "Installation nouvelle chaudière gaz",
            "client_id": client_ids[2] if len(client_ids) > 2 else client_ids[0] if client_ids else None,
            "technicien_id": tech_id,
            "categorie_id": cat_maintenance["id"] if cat_maintenance else None,
            "statut": "terminee",
            "priorite": "normale",
            "date_prevue": yesterday.isoformat(),
            "date_debut": yesterday.isoformat(),
            "date_fin": (yesterday + timedelta(hours=3)).isoformat(),
            "duree_estimee": 180,
            "adresse": "8 Place Bellecour",
            "ville": "Lyon",
            "code_postal": "69001",
            "entreprise_id": entreprise_id,
            "created_at": (yesterday - timedelta(days=2)).isoformat()
        }
    ]
    
    for intervention in interventions:
        await db.interventions.insert_one(intervention)
    
    # Créer un devis de démonstration (brouillon)
    devis_id = str(uuid.uuid4())
    await db.devis.insert_one({
        "id": devis_id,
        "numero": "D-DEMO-001",
        "client_id": client_ids[0] if client_ids else None,
        "intervention_id": None,
        "lignes": [
            {
                "description": "Main d'oeuvre - Installation",
                "quantite": 3,
                "prix_unitaire": 65.00,
                "tva": 20
            },
            {
                "description": "Fournitures diverses",
                "quantite": 1,
                "prix_unitaire": 150.00,
                "tva": 20
            }
        ],
        "statut": "brouillon",
        "devise": "EUR",
        "taux_change_eur": 1.0,
        "notes": "Devis de démonstration",
        "conditions": "Validité 30 jours",
        "entreprise_id": entreprise_id,
        "created_at": now,
        "date_validite": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    })
    
    return {
        "clients": len(client_ids),
        "categories": len(DEMO_SEED_DATA["categories"]),
        "techniciens": len(DEMO_SEED_DATA["techniciens"]),
        "interventions": len(interventions),
        "devis": 1
    }


@router.post("/init")
async def init_demo_session():
    """
    Initialise une nouvelle session démo
    - Réinitialise toutes les données
    - Retourne les infos de connexion
    """
    entreprise = await get_demo_entreprise()
    
    if not entreprise:
        raise HTTPException(
            status_code=404, 
            detail="Compte démo non configuré. Contactez l'administrateur."
        )
    
    # Réinitialiser les données
    reset_stats = await reset_demo_data(entreprise["id"])
    
    # Mettre à jour le timestamp de dernière réinitialisation
    await db.entreprises.update_one(
        {"id": entreprise["id"]},
        {"$set": {
            "demo_last_reset": datetime.now(timezone.utc).isoformat(),
            "demo_session_count": (entreprise.get("demo_session_count", 0) or 0) + 1
        }}
    )
    
    return {
        "success": True,
        "message": "Session démo initialisée",
        "plan": DEMO_PLAN,
        "reset_stats": reset_stats,
        "credentials": {
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        }
    }


@router.get("/status")
async def get_demo_status(current_user: dict = Depends(get_current_user)):
    """
    Retourne le statut du mode démo pour l'utilisateur courant
    """
    # Fetch user from database to get email and is_demo flag
    user = await db.users.find_one({"id": current_user.get("user_id")}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user.get("entreprise_id")}, {"_id": 0})
    
    # Check if user is demo account
    is_demo_user = (
        (user and user.get("email") == DEMO_EMAIL) or 
        (user and user.get("is_demo")) or
        (entreprise and entreprise.get("is_demo"))
    )
    
    if not is_demo_user:
        return {
            "is_demo": False,
            "message": None
        }
    
    return {
        "is_demo": True,
        "plan_simulated": DEMO_PLAN,
        "last_reset": entreprise.get("demo_last_reset") if entreprise else None,
        "session_count": entreprise.get("demo_session_count") or 0 if entreprise else 0,
        "restrictions": {
            "emails_simulated": True,
            "sms_simulated": True,
            "whatsapp_simulated": True,
            "stripe_disabled": True,
            "data_not_persistent": True
        },
        "message": {
            "title": "Mode démonstration actif",
            "description": "Vous explorez actuellement une version simulée du dashboard administrateur.",
            "details": "Certaines actions (emails, notifications, signatures) sont simulées pour vous permettre de tester l'application en toute sécurité.",
            "cta": "Pour accéder à l'ensemble des fonctionnalités et à l'application technicien, veuillez activer un abonnement."
        }
    }


@router.post("/simulate-action")
async def simulate_demo_action(
    action_type: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Simule une action en mode démo (email, SMS, etc.)
    Retourne un message de succès sans effectuer l'action réelle
    """
    # Fetch user and entreprise to check demo status
    user = await db.users.find_one({"id": current_user.get("user_id")}, {"_id": 0})
    entreprise = await db.entreprises.find_one({"id": current_user.get("entreprise_id")}, {"_id": 0})
    
    is_demo_user = (
        (user and user.get("email") == DEMO_EMAIL) or 
        (user and user.get("is_demo")) or
        (entreprise and entreprise.get("is_demo"))
    )
    
    if not is_demo_user:
        raise HTTPException(status_code=403, detail="Non autorisé")
    
    simulated_actions = {
        "send_email": {
            "success": True,
            "message": "Email simulé avec succès",
            "demo_note": "En production, un email serait envoyé au client."
        },
        "send_sms": {
            "success": True,
            "message": "SMS simulé avec succès",
            "demo_note": "En production, un SMS serait envoyé au client."
        },
        "send_whatsapp": {
            "success": True,
            "message": "Message WhatsApp simulé avec succès",
            "demo_note": "En production, un message WhatsApp serait envoyé."
        },
        "process_payment": {
            "success": False,
            "message": "Paiements désactivés en mode démo",
            "demo_note": "Souscrivez à un abonnement pour activer les paiements."
        },
        "export_data": {
            "success": True,
            "message": "Export simulé avec succès",
            "demo_note": "En production, vos données seraient exportées."
        }
    }
    
    if action_type not in simulated_actions:
        return {
            "success": True,
            "message": f"Action '{action_type}' simulée",
            "demo_note": "Cette action est simulée en mode démo."
        }
    
    return simulated_actions[action_type]


@router.get("/feature-check/{feature}")
async def check_demo_feature(
    feature: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Vérifie si une fonctionnalité est disponible en mode démo
    et retourne le message approprié
    """
    # Fonctionnalités bloquées en démo avec messages personnalisés
    blocked_features = {
        "stripe_checkout": {
            "available": False,
            "message": "Passez à un abonnement pour gérer vos paiements en ligne.",
            "upgrade_plan": "startup"
        },
        "real_emails": {
            "available": False,
            "message": "Les emails sont simulés en mode démo. Souscrivez pour envoyer de vrais emails.",
            "upgrade_plan": "startup"
        },
        "real_sms": {
            "available": False,
            "message": "Les SMS sont simulés en mode démo. Souscrivez pour envoyer de vrais SMS.",
            "upgrade_plan": "pro"
        },
        "api_access": {
            "available": False,
            "message": "L'accès API est réservé aux abonnés. Passez au plan Pro ou Entreprise.",
            "upgrade_plan": "pro"
        },
        "white_label": {
            "available": False,
            "message": "Le white-labeling est disponible avec le plan Entreprise.",
            "upgrade_plan": "enterprise"
        },
        "data_export": {
            "available": False,
            "message": "L'export de données est réservé aux abonnés.",
            "upgrade_plan": "startup"
        }
    }
    
    # Fonctionnalités autorisées en démo (pour tester)
    allowed_features = [
        "create_client", "create_intervention", "create_devis",
        "view_dashboard", "view_planning", "view_analytics",
        "signature_pad", "photo_upload", "pdf_preview"
    ]
    
    if feature in allowed_features:
        return {
            "available": True,
            "message": None,
            "is_demo": True
        }
    
    if feature in blocked_features:
        return {
            "available": blocked_features[feature]["available"],
            "message": blocked_features[feature]["message"],
            "upgrade_plan": blocked_features[feature]["upgrade_plan"],
            "is_demo": True
        }
    
    # Par défaut, autoriser mais signaler que c'est simulé
    return {
        "available": True,
        "message": "Cette fonctionnalité est simulée en mode démo.",
        "is_demo": True
    }
