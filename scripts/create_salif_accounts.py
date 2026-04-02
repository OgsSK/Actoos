"""
Script pour créer les comptes Salif Kane en production
À exécuter après déploiement sur Railway

Usage:
  python create_salif_accounts.py <MONGO_URL>

Exemple:
  python create_salif_accounts.py "mongodb+srv://user:pass@cluster.mongodb.net/actoos"
"""

import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone
import uuid

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_accounts(mongo_url: str, db_name: str = "actoos"):
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    password_hash = pwd_context.hash("Salifkane&&7")
    now = datetime.now(timezone.utc).isoformat()
    
    plans = [
        {
            "plan_id": "startup",
            "plan_name": "Startup",
            "entreprise_nom": "Actoos Startup",
            "admin_email": "salifkane612+startup@gmail.com",
            "limits": {
                "max_admins": 1, "max_technicians": 3, "max_categories": 1,
                "max_interventions_month": -1, "multi_sites": False,
                "offline_mode": False, "geolocation": False, "auto_pdf_reports": False,
                "advanced_analytics": False, "white_label": False, "api_access": False,
                "advanced_branding": False, "smart_planning": False,
                "auto_devis_to_facture": False, "team_validation": False, "sms_included": 0
            }
        },
        {
            "plan_id": "pro",
            "plan_name": "Pro", 
            "entreprise_nom": "Actoos Pro",
            "admin_email": "salifkane612+pro@gmail.com",
            "limits": {
                "max_admins": 3, "max_technicians": 10, "max_categories": 3,
                "max_interventions_month": -1, "multi_sites": True,
                "offline_mode": True, "geolocation": True, "auto_pdf_reports": True,
                "advanced_analytics": True, "white_label": False, "api_access": False,
                "advanced_branding": False, "smart_planning": True,
                "auto_devis_to_facture": True, "team_validation": False, "sms_included": 50
            }
        },
        {
            "plan_id": "enterprise",
            "plan_name": "Enterprise",
            "entreprise_nom": "Actoos Enterprise", 
            "admin_email": "salifkane612+enterprise@gmail.com",
            "limits": {
                "max_admins": -1, "max_technicians": -1, "max_categories": -1,
                "max_interventions_month": -1, "multi_sites": True,
                "offline_mode": True, "geolocation": True, "auto_pdf_reports": True,
                "advanced_analytics": True, "white_label": True, "api_access": True,
                "advanced_branding": True, "smart_planning": True,
                "auto_devis_to_facture": True, "team_validation": True, "sms_included": 200
            }
        }
    ]
    
    created = []
    
    for plan in plans:
        entreprise_id = str(uuid.uuid4())
        admin_id = str(uuid.uuid4())
        tech_id = str(uuid.uuid4())
        
        # Check if exists
        existing = await db.users.find_one({"email": plan["admin_email"]})
        if existing:
            print(f"⚠️  {plan['admin_email']} existe déjà, suppression...")
            await db.users.delete_many({"email": plan["admin_email"]})
            await db.entreprises.delete_many({"email": plan["admin_email"]})
        
        tech_email = f"salifkane726+{plan['plan_id']}@gmail.com"
        await db.users.delete_many({"email": tech_email})
        
        # Create entreprise
        await db.entreprises.insert_one({
            "id": entreprise_id,
            "nom": plan["entreprise_nom"],
            "email": plan["admin_email"],
            "telephone": "",
            "sequence_devis": 1,
            "sequence_facture": 1,
            "couleur_primaire": "#2563EB",
            "plan": plan["plan_id"],
            "plan_name": plan["plan_name"],
            "plan_limits": plan["limits"],
            "subscription_status": "active",
            "created_at": now
        })
        
        # Create admin
        await db.users.insert_one({
            "id": admin_id,
            "entreprise_id": entreprise_id,
            "email": plan["admin_email"],
            "nom": "Kane",
            "prenom": "Salif",
            "password_hash": password_hash,
            "role": "admin",
            "statut": "actif",
            "created_at": now
        })
        
        # Create tech
        await db.users.insert_one({
            "id": tech_id,
            "entreprise_id": entreprise_id,
            "email": tech_email,
            "nom": "Tech",
            "prenom": f"Actoos {plan['plan_name']}",
            "password_hash": password_hash,
            "role": "tech",
            "statut": "actif",
            "created_at": now
        })
        
        created.append({
            "plan": plan["plan_name"],
            "admin": plan["admin_email"],
            "tech": tech_email
        })
        print(f"✅ {plan['plan_name']} créé")
    
    print("\n" + "="*60)
    print("COMPTES CRÉÉS AVEC SUCCÈS!")
    print("="*60)
    for c in created:
        print(f"\n📦 {c['plan']}:")
        print(f"   Admin: {c['admin']}")
        print(f"   Tech:  {c['tech']}")
    print(f"\n🔑 Mot de passe (tous): Salifkane&&7")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python create_salif_accounts.py <MONGO_URL> [DB_NAME]")
        print("Exemple: python create_salif_accounts.py 'mongodb+srv://...' actoos")
        sys.exit(1)
    
    mongo_url = sys.argv[1]
    db_name = sys.argv[2] if len(sys.argv) > 2 else "actoos"
    
    asyncio.run(create_accounts(mongo_url, db_name))
