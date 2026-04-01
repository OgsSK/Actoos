"""
NETTOYAGE COMPLET DES DONNÉES DE TEST - MongoDB Atlas Production
Supprime TOUTES les entreprises, utilisateurs et données associées créées par:
- Load Test 100
- Stress Test
- Tout autre test contenant "test", "stress", "load" dans l'email
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os

# MongoDB Atlas Production Connection String
# Récupérer depuis le backend déployé ou utiliser directement
MONGO_URL = os.getenv("MONGO_ATLAS_URL", "mongodb+srv://actoos-admin:Actoos2024Prod@actoos-cluster.xfvam8a.mongodb.net/actoos_production?retryWrites=true&w=majority")
DB_NAME = "actoos_production"

async def cleanup_test_data():
    print("=" * 70)
    print("🧹 NETTOYAGE COMPLET DES DONNÉES DE TEST - PRODUCTION")
    print("=" * 70)
    print(f"\n📡 Connexion à MongoDB Atlas...")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Vérifier la connexion
    try:
        await client.admin.command('ping')
        print("✅ Connexion établie!")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return
    
    stats = {
        "users_deleted": 0,
        "entreprises_deleted": 0,
        "clients_deleted": 0,
        "devis_deleted": 0,
        "factures_deleted": 0,
        "interventions_deleted": 0,
        "missions_deleted": 0,
        "sites_deleted": 0,
        "invitations_deleted": 0,
        "subscriptions_deleted": 0,
        "errors": []
    }
    
    # Patterns pour identifier les données de test
    test_patterns = [
        {"email": {"$regex": "test", "$options": "i"}},
        {"email": {"$regex": "stress", "$options": "i"}},
        {"email": {"$regex": "loadtest", "$options": "i"}},
        {"email": {"$regex": "@test-", "$options": "i"}},
        {"email": {"$regex": "demo@actoos.com", "$options": "i"}},  # Garder le compte demo
    ]
    
    entreprise_patterns = [
        {"nom": {"$regex": "LoadTest", "$options": "i"}},
        {"nom": {"$regex": "StressTest", "$options": "i"}},
        {"nom": {"$regex": "Test_", "$options": "i"}},
    ]
    
    # 1. Trouver toutes les entreprises de test
    print("\n🔍 Recherche des entreprises de test...")
    
    test_entreprise_ids = []
    for pattern in entreprise_patterns:
        cursor = db.entreprises.find(pattern, {"_id": 1})
        async for doc in cursor:
            test_entreprise_ids.append(doc["_id"])
    
    print(f"   Trouvé: {len(test_entreprise_ids)} entreprises de test")
    
    # 2. Supprimer les utilisateurs de test (sauf demo@actoos.com qu'on garde)
    print("\n👥 Suppression des utilisateurs de test...")
    
    user_filter = {
        "$or": [
            {"email": {"$regex": "test", "$options": "i"}},
            {"email": {"$regex": "stress", "$options": "i"}},
            {"email": {"$regex": "loadtest", "$options": "i"}},
            {"email": {"$regex": "@test-", "$options": "i"}},
        ],
        "email": {"$ne": "demo@actoos.com"}  # Ne pas supprimer le compte demo
    }
    
    result = await db.users.delete_many(user_filter)
    stats["users_deleted"] = result.deleted_count
    print(f"   ✅ {result.deleted_count} utilisateurs supprimés")
    
    # 3. Supprimer les entreprises de test
    print("\n🏢 Suppression des entreprises de test...")
    
    entreprise_filter = {"$or": entreprise_patterns}
    
    # D'abord récupérer les IDs pour nettoyer les données associées
    entreprise_ids_to_delete = []
    cursor = db.entreprises.find(entreprise_filter, {"_id": 1})
    async for doc in cursor:
        entreprise_ids_to_delete.append(doc["_id"])
    
    if entreprise_ids_to_delete:
        # Supprimer toutes les données associées à ces entreprises
        
        # Clients
        result = await db.clients.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["clients_deleted"] += result.deleted_count
        
        # Devis
        result = await db.devis.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["devis_deleted"] += result.deleted_count
        
        # Factures
        result = await db.factures.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["factures_deleted"] += result.deleted_count
        
        # Interventions
        result = await db.interventions.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["interventions_deleted"] += result.deleted_count
        
        # Missions
        result = await db.missions.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["missions_deleted"] += result.deleted_count
        
        # Sites
        result = await db.sites.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["sites_deleted"] += result.deleted_count
        
        # Invitations
        result = await db.invitations.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["invitations_deleted"] += result.deleted_count
        
        # Subscriptions
        result = await db.subscriptions.delete_many({"entreprise_id": {"$in": [str(eid) for eid in entreprise_ids_to_delete]}})
        stats["subscriptions_deleted"] += result.deleted_count
        
        # Enfin, supprimer les entreprises
        result = await db.entreprises.delete_many({"_id": {"$in": entreprise_ids_to_delete}})
        stats["entreprises_deleted"] = result.deleted_count
        print(f"   ✅ {result.deleted_count} entreprises supprimées")
    
    # 4. Supprimer également les clients orphelins avec des emails de test
    print("\n📋 Nettoyage des clients orphelins de test...")
    
    client_filter = {
        "$or": [
            {"email": {"$regex": "test", "$options": "i"}},
            {"email": {"$regex": "stress", "$options": "i"}},
            {"email": {"$regex": "clientstress", "$options": "i"}},
        ]
    }
    result = await db.clients.delete_many(client_filter)
    stats["clients_deleted"] += result.deleted_count
    print(f"   ✅ {result.deleted_count} clients orphelins supprimés")
    
    # 5. Rapport final
    print("\n" + "=" * 70)
    print("📊 RAPPORT DE NETTOYAGE")
    print("=" * 70)
    
    print(f"\n🗑️ Éléments supprimés:")
    print(f"   • Utilisateurs: {stats['users_deleted']}")
    print(f"   • Entreprises: {stats['entreprises_deleted']}")
    print(f"   • Clients: {stats['clients_deleted']}")
    print(f"   • Devis: {stats['devis_deleted']}")
    print(f"   • Factures: {stats['factures_deleted']}")
    print(f"   • Interventions: {stats['interventions_deleted']}")
    print(f"   • Missions: {stats['missions_deleted']}")
    print(f"   • Sites: {stats['sites_deleted']}")
    print(f"   • Invitations: {stats['invitations_deleted']}")
    print(f"   • Abonnements: {stats['subscriptions_deleted']}")
    
    total_deleted = sum(v for k, v in stats.items() if isinstance(v, int))
    print(f"\n📈 TOTAL: {total_deleted} éléments supprimés")
    
    # Vérifier ce qui reste
    print("\n🔍 Vérification de la base après nettoyage...")
    
    remaining_users = await db.users.count_documents({})
    remaining_entreprises = await db.entreprises.count_documents({})
    remaining_clients = await db.clients.count_documents({})
    
    print(f"   • Utilisateurs restants: {remaining_users}")
    print(f"   • Entreprises restantes: {remaining_entreprises}")
    print(f"   • Clients restants: {remaining_clients}")
    
    # Sauvegarder le rapport
    report = {
        "timestamp": datetime.now().isoformat(),
        "stats": stats,
        "total_deleted": total_deleted,
        "remaining": {
            "users": remaining_users,
            "entreprises": remaining_entreprises,
            "clients": remaining_clients
        }
    }
    
    import json
    with open("/app/test_reports/cleanup_report.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Rapport sauvegardé: /app/test_reports/cleanup_report.json")
    print("\n✅ NETTOYAGE TERMINÉ!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(cleanup_test_data())
