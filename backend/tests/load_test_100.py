"""
Load Test: 100 entreprises simultanées avec workflow complet
- Création entreprise + admin
- Création clients, devis, factures, interventions
- Test API concurrentes
"""
import asyncio
import aiohttp
import time
import random
import string
from datetime import datetime, timedelta
import json

API_URL = "https://actoos-production.up.railway.app/api"

# Statistiques globales
stats = {
    "entreprises_created": 0,
    "clients_created": 0,
    "devis_created": 0,
    "factures_created": 0,
    "interventions_created": 0,
    "errors": [],
    "response_times": [],
    "start_time": None,
    "end_time": None
}

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def random_phone():
    return f"+324{random.randint(10000000, 99999999)}"

async def create_entreprise(session, index):
    """Créer une entreprise avec admin"""
    company_name = f"LoadTest_{index:03d}_{random_string(4)}"
    email = f"admin{index}@loadtest-{random_string(4)}.com"
    
    payload = {
        "entreprise_nom": company_name,
        "entreprise_email": f"contact@{company_name.lower()}.com",
        "entreprise_telephone": random_phone(),
        "admin_email": email,
        "admin_password": "LoadTest123!",
        "admin_nom": f"Admin{index}",
        "admin_prenom": "Test"
    }
    
    start = time.time()
    try:
        async with session.post(f"{API_URL}/auth/register", json=payload) as resp:
            elapsed = time.time() - start
            stats["response_times"].append(elapsed)
            
            if resp.status == 200:
                data = await resp.json()
                stats["entreprises_created"] += 1
                return {"email": email, "token": data.get("access_token"), "index": index}
            else:
                error_text = await resp.text()
                stats["errors"].append(f"Entreprise {index}: {resp.status} - {error_text[:100]}")
                return None
    except Exception as e:
        stats["errors"].append(f"Entreprise {index}: {str(e)[:100]}")
        return None

async def run_workflow(session, entreprise_data):
    """Exécuter le workflow complet pour une entreprise"""
    if not entreprise_data:
        return
    
    token = entreprise_data["token"]
    index = entreprise_data["index"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Créer 2-3 clients
    client_ids = []
    for i in range(random.randint(2, 3)):
        payload = {
            "nom": f"Client_{index}_{i}",
            "prenom": f"Test{i}",
            "email": f"client{index}_{i}@test.com",
            "telephone": random_phone(),
            "adresse": f"{random.randint(1, 100)} Rue Test",
            "code_postal": f"{random.randint(1000, 9999)}",
            "ville": random.choice(["Bruxelles", "Liège", "Anvers", "Gand", "Namur"])
        }
        
        start = time.time()
        try:
            async with session.post(f"{API_URL}/clients", json=payload, headers=headers) as resp:
                elapsed = time.time() - start
                stats["response_times"].append(elapsed)
                
                if resp.status == 200:
                    data = await resp.json()
                    client_ids.append(data.get("id"))
                    stats["clients_created"] += 1
        except Exception as e:
            stats["errors"].append(f"Client {index}_{i}: {str(e)[:50]}")
    
    if not client_ids:
        return
    
    # 2. Créer 1-2 devis par client
    devis_ids = []
    for client_id in client_ids[:2]:
        payload = {
            "client_id": client_id,
            "lignes": [
                {
                    "description": f"Service {random_string(5)}",
                    "quantite": random.randint(1, 5),
                    "prix_unitaire": random.randint(50, 500),
                    "tva": 21
                }
            ],
            "conditions": "Paiement 30 jours",
            "validite_jours": 30
        }
        
        start = time.time()
        try:
            async with session.post(f"{API_URL}/devis", json=payload, headers=headers) as resp:
                elapsed = time.time() - start
                stats["response_times"].append(elapsed)
                
                if resp.status == 200:
                    data = await resp.json()
                    devis_ids.append(data.get("id"))
                    stats["devis_created"] += 1
        except Exception as e:
            stats["errors"].append(f"Devis {index}: {str(e)[:50]}")
    
    # 3. Convertir un devis en facture
    if devis_ids:
        devis_id = devis_ids[0]
        start = time.time()
        try:
            async with session.post(f"{API_URL}/devis/{devis_id}/convert-to-facture", headers=headers) as resp:
                elapsed = time.time() - start
                stats["response_times"].append(elapsed)
                
                if resp.status == 200:
                    stats["factures_created"] += 1
        except Exception as e:
            stats["errors"].append(f"Facture {index}: {str(e)[:50]}")
    
    # 4. Créer 1-2 interventions
    for client_id in client_ids[:2]:
        date_intervention = (datetime.now() + timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
        payload = {
            "client_id": client_id,
            "titre": f"Intervention {random_string(5)}",
            "description": "Test intervention",
            "date_prevue": date_intervention,
            "heure_debut": f"{random.randint(8, 16):02d}:00",
            "duree_estimee": random.randint(30, 180),
            "adresse": f"{random.randint(1, 100)} Rue Test",
            "code_postal": "1000",
            "ville": "Bruxelles"
        }
        
        start = time.time()
        try:
            async with session.post(f"{API_URL}/interventions", json=payload, headers=headers) as resp:
                elapsed = time.time() - start
                stats["response_times"].append(elapsed)
                
                if resp.status == 200:
                    stats["interventions_created"] += 1
        except Exception as e:
            stats["errors"].append(f"Intervention {index}: {str(e)[:50]}")

async def main():
    print("=" * 60)
    print("🚀 TEST DE CHARGE - 100 ENTREPRISES SIMULTANÉES")
    print("=" * 60)
    
    stats["start_time"] = time.time()
    
    # Configuration du connector avec limites
    connector = aiohttp.TCPConnector(limit=50, limit_per_host=30)
    timeout = aiohttp.ClientTimeout(total=60)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Phase 1: Création des 100 entreprises (par batches de 20)
        print("\n📦 Phase 1: Création de 100 entreprises...")
        entreprises = []
        
        for batch_start in range(0, 100, 20):
            batch_end = min(batch_start + 20, 100)
            print(f"  Batch {batch_start}-{batch_end}...")
            
            tasks = [create_entreprise(session, i) for i in range(batch_start, batch_end)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for r in results:
                if r and not isinstance(r, Exception):
                    entreprises.append(r)
            
            # Petite pause entre les batches
            await asyncio.sleep(0.5)
        
        print(f"  ✅ {len(entreprises)}/100 entreprises créées")
        
        # Phase 2: Exécution du workflow pour chaque entreprise (par batches de 10)
        print("\n⚙️ Phase 2: Exécution workflow complet...")
        
        for batch_start in range(0, len(entreprises), 10):
            batch = entreprises[batch_start:batch_start + 10]
            print(f"  Workflow batch {batch_start}-{batch_start + len(batch)}...")
            
            tasks = [run_workflow(session, e) for e in batch]
            await asyncio.gather(*tasks, return_exceptions=True)
            
            await asyncio.sleep(0.3)
    
    stats["end_time"] = time.time()
    
    # Rapport final
    print("\n" + "=" * 60)
    print("📊 RAPPORT DE TEST DE CHARGE")
    print("=" * 60)
    
    duration = stats["end_time"] - stats["start_time"]
    
    print(f"\n⏱️ Durée totale: {duration:.2f} secondes")
    print(f"\n📈 Résultats:")
    print(f"  • Entreprises créées: {stats['entreprises_created']}/100")
    print(f"  • Clients créés: {stats['clients_created']}")
    print(f"  • Devis créés: {stats['devis_created']}")
    print(f"  • Factures créées: {stats['factures_created']}")
    print(f"  • Interventions créées: {stats['interventions_created']}")
    
    if stats["response_times"]:
        avg_time = sum(stats["response_times"]) / len(stats["response_times"])
        max_time = max(stats["response_times"])
        min_time = min(stats["response_times"])
        print(f"\n⚡ Performance API:")
        print(f"  • Temps moyen: {avg_time*1000:.0f}ms")
        print(f"  • Temps min: {min_time*1000:.0f}ms")
        print(f"  • Temps max: {max_time*1000:.0f}ms")
        print(f"  • Requêtes totales: {len(stats['response_times'])}")
        print(f"  • Requêtes/seconde: {len(stats['response_times'])/duration:.1f}")
    
    error_count = len(stats["errors"])
    print(f"\n❌ Erreurs: {error_count}")
    if error_count > 0 and error_count <= 10:
        for err in stats["errors"][:10]:
            print(f"  • {err}")
    elif error_count > 10:
        print(f"  (Affichage des 10 premières sur {error_count})")
        for err in stats["errors"][:10]:
            print(f"  • {err}")
    
    # Calcul du score
    total_ops = (stats['entreprises_created'] + stats['clients_created'] + 
                 stats['devis_created'] + stats['factures_created'] + 
                 stats['interventions_created'])
    success_rate = (total_ops / max(total_ops + error_count, 1)) * 100
    
    print(f"\n🎯 Score global: {success_rate:.1f}% de succès")
    
    if success_rate >= 95:
        print("✅ TEST RÉUSSI - Application prête pour la production!")
    elif success_rate >= 80:
        print("⚠️ TEST ACCEPTABLE - Quelques optimisations recommandées")
    else:
        print("❌ TEST ÉCHOUÉ - Corrections nécessaires avant déploiement")
    
    # Sauvegarder le rapport
    report = {
        "timestamp": datetime.now().isoformat(),
        "duration_seconds": duration,
        "stats": {
            "entreprises": stats["entreprises_created"],
            "clients": stats["clients_created"],
            "devis": stats["devis_created"],
            "factures": stats["factures_created"],
            "interventions": stats["interventions_created"]
        },
        "performance": {
            "avg_response_ms": sum(stats["response_times"]) / len(stats["response_times"]) * 1000 if stats["response_times"] else 0,
            "total_requests": len(stats["response_times"]),
            "requests_per_second": len(stats["response_times"]) / duration if duration > 0 else 0
        },
        "errors_count": error_count,
        "success_rate": success_rate
    }
    
    with open("/app/test_reports/load_test_100.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Rapport sauvegardé: /app/test_reports/load_test_100.json")

if __name__ == "__main__":
    asyncio.run(main())
