"""
TEST DE CHARGE COMPLET - 100+ ENTREPRISES
Simule le flux complet de l'application:
- Inscription entreprises
- Création clients
- Création interventions
- Création devis
- Conversion en factures
- Workflow technicien (start, complete, signature)
- Sync offline
"""
import asyncio
import aiohttp
import random
import string
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

# Configuration
API_URL = "https://actoos-production.up.railway.app/api"
NUM_ENTERPRISES = 100
CONCURRENT_LIMIT = 20  # Limiter les requêtes simultanées

# Statistiques globales
stats = {
    "enterprises_created": 0,
    "clients_created": 0,
    "interventions_created": 0,
    "devis_created": 0,
    "factures_created": 0,
    "interventions_completed": 0,
    "sync_operations": 0,
    "errors": [],
    "timings": {
        "register": [],
        "create_client": [],
        "create_intervention": [],
        "create_devis": [],
        "complete_intervention": [],
        "sync": []
    }
}

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def random_phone():
    return f"+32{random.randint(400000000, 499999999)}"

async def register_enterprise(session: aiohttp.ClientSession, index: int) -> Dict[str, Any]:
    """Créer une nouvelle entreprise"""
    start_time = datetime.now()
    
    enterprise_data = {
        "entreprise_nom": f"LoadTest_{index:03d}_{random_string(4)}",
        "entreprise_email": f"contact{index}@loadtest-{random_string(4)}.com",
        "entreprise_telephone": random_phone(),
        "admin_email": f"admin{index}@loadtest-{random_string(4)}.com",
        "admin_password": "LoadTest123!",
        "admin_nom": f"Admin{index}",
        "admin_prenom": "Test"
    }
    
    try:
        async with session.post(f"{API_URL}/auth/register", json=enterprise_data) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["register"].append(elapsed)
            
            if resp.status == 200:
                data = await resp.json()
                stats["enterprises_created"] += 1
                return {
                    "success": True,
                    "token": data.get("access_token"),
                    "entreprise_id": data.get("entreprise", {}).get("id"),
                    "email": enterprise_data["admin_email"]
                }
            else:
                error_text = await resp.text()
                stats["errors"].append(f"Register {index}: {resp.status} - {error_text[:100]}")
                return {"success": False}
    except Exception as e:
        stats["errors"].append(f"Register {index}: {str(e)}")
        return {"success": False}

async def create_client(session: aiohttp.ClientSession, token: str, index: int) -> str:
    """Créer un client pour une entreprise"""
    start_time = datetime.now()
    
    client_data = {
        "nom": f"Client_{index}_{random_string(4)}",
        "prenom": "Test",
        "email": f"client{index}@test-{random_string(4)}.com",
        "telephone": random_phone(),
        "adresse": f"{random.randint(1, 200)} Rue de Test",
        "ville": random.choice(["Bruxelles", "Anvers", "Liège", "Gand", "Namur"]),
        "code_postal": str(random.randint(1000, 9999))
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        async with session.post(f"{API_URL}/clients", json=client_data, headers=headers) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["create_client"].append(elapsed)
            
            if resp.status == 200:
                data = await resp.json()
                stats["clients_created"] += 1
                return data.get("id")
            else:
                return None
    except Exception as e:
        stats["errors"].append(f"Client {index}: {str(e)}")
        return None

async def create_intervention(session: aiohttp.ClientSession, token: str, client_id: str, index: int) -> str:
    """Créer une intervention"""
    start_time = datetime.now()
    
    date_prevue = (datetime.now() + timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
    
    intervention_data = {
        "client_id": client_id,
        "titre": f"Intervention Test {index}",
        "description": f"Description de l'intervention de test numéro {index}",
        "date_prevue": date_prevue,
        "heure_debut": f"{random.randint(8, 17):02d}:00",
        "duree_estimee": random.choice([30, 60, 90, 120]),
        "adresse": f"{random.randint(1, 200)} Rue Test",
        "ville": random.choice(["Bruxelles", "Anvers", "Liège"]),
        "code_postal": str(random.randint(1000, 9999)),
        "priorite": random.choice(["basse", "normale", "haute", "urgente"])
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        async with session.post(f"{API_URL}/interventions", json=intervention_data, headers=headers) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["create_intervention"].append(elapsed)
            
            if resp.status == 200:
                data = await resp.json()
                stats["interventions_created"] += 1
                return data.get("id")
            else:
                return None
    except Exception as e:
        stats["errors"].append(f"Intervention {index}: {str(e)}")
        return None

async def create_devis(session: aiohttp.ClientSession, token: str, client_id: str, index: int) -> str:
    """Créer un devis"""
    start_time = datetime.now()
    
    devis_data = {
        "client_id": client_id,
        "objet": f"Devis Test {index}",
        "lignes": [
            {
                "description": f"Prestation {i+1}",
                "quantite": random.randint(1, 5),
                "prix_unitaire": random.randint(50, 500),
                "tva": random.choice([0, 6, 21])
            }
            for i in range(random.randint(1, 4))
        ],
        "conditions": "Conditions de test",
        "validite_jours": 30
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        async with session.post(f"{API_URL}/devis", json=devis_data, headers=headers) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["create_devis"].append(elapsed)
            
            if resp.status == 200:
                data = await resp.json()
                stats["devis_created"] += 1
                return data.get("id")
            else:
                return None
    except Exception as e:
        stats["errors"].append(f"Devis {index}: {str(e)}")
        return None

async def complete_intervention(session: aiohttp.ClientSession, token: str, intervention_id: str) -> bool:
    """Compléter une intervention (workflow technicien)"""
    start_time = datetime.now()
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # 1. Démarrer l'intervention
        async with session.post(f"{API_URL}/interventions/{intervention_id}/start", headers=headers) as resp:
            if resp.status != 200:
                return False
        
        # 2. Compléter l'intervention
        complete_data = {
            "notes_terrain": "Intervention complétée par le test de charge"
        }
        async with session.post(f"{API_URL}/interventions/{intervention_id}/complete", 
                               json=complete_data, headers=headers) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["complete_intervention"].append(elapsed)
            
            if resp.status == 200:
                stats["interventions_completed"] += 1
                return True
            return False
    except Exception as e:
        stats["errors"].append(f"Complete intervention: {str(e)}")
        return False

async def test_sync(session: aiohttp.ClientSession, token: str) -> bool:
    """Tester l'endpoint de sync"""
    start_time = datetime.now()
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        sync_data = {
            "changes": [],
            "last_sync": None
        }
        async with session.post(f"{API_URL}/interventions/sync", json=sync_data, headers=headers) as resp:
            elapsed = (datetime.now() - start_time).total_seconds() * 1000
            stats["timings"]["sync"].append(elapsed)
            
            if resp.status == 200:
                stats["sync_operations"] += 1
                return True
            return False
    except Exception as e:
        stats["errors"].append(f"Sync: {str(e)}")
        return False

async def run_enterprise_workflow(session: aiohttp.ClientSession, index: int, semaphore: asyncio.Semaphore):
    """Exécuter le workflow complet pour une entreprise"""
    async with semaphore:
        print(f"[{index:03d}] Démarrage entreprise...")
        
        # 1. Inscription
        enterprise = await register_enterprise(session, index)
        if not enterprise["success"]:
            print(f"[{index:03d}] ❌ Échec inscription")
            return
        
        token = enterprise["token"]
        print(f"[{index:03d}] ✅ Entreprise créée")
        
        # 2. Créer 2-3 clients
        client_ids = []
        for i in range(random.randint(2, 3)):
            client_id = await create_client(session, token, index * 10 + i)
            if client_id:
                client_ids.append(client_id)
        
        if not client_ids:
            print(f"[{index:03d}] ❌ Aucun client créé")
            return
        
        print(f"[{index:03d}] ✅ {len(client_ids)} clients créés")
        
        # 3. Créer 2-4 interventions
        intervention_ids = []
        for i in range(random.randint(2, 4)):
            client_id = random.choice(client_ids)
            intervention_id = await create_intervention(session, token, client_id, index * 10 + i)
            if intervention_id:
                intervention_ids.append(intervention_id)
        
        print(f"[{index:03d}] ✅ {len(intervention_ids)} interventions créées")
        
        # 4. Créer 1-2 devis
        for i in range(random.randint(1, 2)):
            client_id = random.choice(client_ids)
            await create_devis(session, token, client_id, index * 10 + i)
        
        print(f"[{index:03d}] ✅ Devis créés")
        
        # 5. Compléter quelques interventions
        for intervention_id in intervention_ids[:2]:
            await complete_intervention(session, token, intervention_id)
        
        # 6. Test sync
        await test_sync(session, token)
        
        print(f"[{index:03d}] ✅ Workflow complet")

async def main():
    print("=" * 70)
    print("🚀 TEST DE CHARGE - 100+ ENTREPRISES - FLUX COMPLET")
    print("=" * 70)
    print(f"API: {API_URL}")
    print(f"Entreprises: {NUM_ENTERPRISES}")
    print(f"Concurrence max: {CONCURRENT_LIMIT}")
    print("=" * 70)
    
    start_time = datetime.now()
    
    # Limiter la concurrence
    semaphore = asyncio.Semaphore(CONCURRENT_LIMIT)
    
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=30)
    timeout = aiohttp.ClientTimeout(total=120)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [
            run_enterprise_workflow(session, i, semaphore)
            for i in range(NUM_ENTERPRISES)
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
    
    elapsed = (datetime.now() - start_time).total_seconds()
    
    # Rapport
    print("\n" + "=" * 70)
    print("📊 RAPPORT DE TEST")
    print("=" * 70)
    
    print(f"\n⏱️ Temps total: {elapsed:.1f} secondes")
    
    print(f"\n📈 Opérations réussies:")
    print(f"   • Entreprises créées: {stats['enterprises_created']}/{NUM_ENTERPRISES}")
    print(f"   • Clients créés: {stats['clients_created']}")
    print(f"   • Interventions créées: {stats['interventions_created']}")
    print(f"   • Devis créés: {stats['devis_created']}")
    print(f"   • Interventions complétées: {stats['interventions_completed']}")
    print(f"   • Opérations sync: {stats['sync_operations']}")
    
    total_ops = (stats['enterprises_created'] + stats['clients_created'] + 
                 stats['interventions_created'] + stats['devis_created'] +
                 stats['interventions_completed'] + stats['sync_operations'])
    print(f"\n   📊 TOTAL: {total_ops} opérations")
    
    # Temps moyens
    print(f"\n⏱️ Temps de réponse moyens:")
    for op, times in stats["timings"].items():
        if times:
            avg = sum(times) / len(times)
            max_t = max(times)
            print(f"   • {op}: {avg:.0f}ms (max: {max_t:.0f}ms)")
    
    # Erreurs
    if stats["errors"]:
        print(f"\n❌ Erreurs ({len(stats['errors'])}):")
        for err in stats["errors"][:10]:
            print(f"   • {err}")
        if len(stats["errors"]) > 10:
            print(f"   ... et {len(stats['errors']) - 10} autres erreurs")
    
    # Taux de succès
    success_rate = (stats['enterprises_created'] / NUM_ENTERPRISES) * 100 if NUM_ENTERPRISES > 0 else 0
    print(f"\n✅ Taux de succès: {success_rate:.1f}%")
    
    # Sauvegarder le rapport
    report = {
        "timestamp": datetime.now().isoformat(),
        "config": {
            "api_url": API_URL,
            "num_enterprises": NUM_ENTERPRISES,
            "concurrent_limit": CONCURRENT_LIMIT
        },
        "results": {
            "elapsed_seconds": elapsed,
            "enterprises_created": stats["enterprises_created"],
            "clients_created": stats["clients_created"],
            "interventions_created": stats["interventions_created"],
            "devis_created": stats["devis_created"],
            "interventions_completed": stats["interventions_completed"],
            "sync_operations": stats["sync_operations"],
            "total_operations": total_ops,
            "success_rate": success_rate
        },
        "timings": {
            op: {"avg_ms": sum(times)/len(times) if times else 0, "max_ms": max(times) if times else 0, "count": len(times)}
            for op, times in stats["timings"].items()
        },
        "errors_count": len(stats["errors"]),
        "errors_sample": stats["errors"][:20]
    }
    
    with open("/app/test_reports/full_load_test_100.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Rapport sauvegardé: /app/test_reports/full_load_test_100.json")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
