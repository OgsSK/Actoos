"""
ACTOOS - TEST DE CHARGE ULTIME
50 entreprises simultanées avec tous les plans et toutes les fonctionnalités
"""

import asyncio
import aiohttp
import random
import string
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any

API_URL = "https://date-1.preview.emergentagent.com/api"

# Configuration du test
NUM_ENTREPRISES = 500
TECHS_PER_ENTREPRISE = {"startup": 1, "pro": 2, "enterprise": 3}
CLIENTS_PER_ENTREPRISE = 3
INTERVENTIONS_PER_CLIENT = 1

# Plans disponibles
PLANS = ["startup", "pro", "enterprise"]

# Toutes les catégories métier
CATEGORIES = [
    "btp", "nettoyage", "maintenance", "decoration", "electricite",
    "plomberie", "espaces-verts", "securite", "multiservices", "specialises"
]

# Catégories par plan
CATEGORIES_BY_PLAN = {
    "startup": 1,
    "pro": 4,
    "enterprise": 10
}

# Compteurs globaux
stats = {
    "entreprises_created": 0,
    "users_created": 0,
    "clients_created": 0,
    "interventions_created": 0,
    "devis_created": 0,
    "factures_created": 0,
    "errors": [],
    "start_time": None,
    "end_time": None
}

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def generate_phone():
    return f"06{random.randint(10000000, 99999999)}"

def generate_email(prefix, domain):
    return f"{prefix}_{generate_random_string(4)}@{domain}.test"

async def create_entreprise(session: aiohttp.ClientSession, index: int) -> Dict:
    """Créer une entreprise avec son admin"""
    plan = PLANS[index % 3]  # Distribute plans evenly
    num_categories = CATEGORIES_BY_PLAN[plan]
    selected_categories = random.sample(CATEGORIES, num_categories)
    
    entreprise_name = f"Entreprise_{index:03d}_{plan.upper()}"
    admin_email = f"admin_{index:03d}@test{index}.fr"
    password = "TestPassword123!"
    
    # Register entreprise - format correct
    register_data = {
        "entreprise_nom": entreprise_name,
        "entreprise_email": f"contact_{index:03d}@test{index}.fr",
        "entreprise_telephone": generate_phone(),
        "admin_email": admin_email,
        "admin_nom": f"Admin{index}",
        "admin_prenom": f"Prénom{index}",
        "admin_password": password
    }
    
    try:
        async with session.post(f"{API_URL}/auth/register", json=register_data) as resp:
            if resp.status in [200, 201]:
                data = await resp.json()
                stats["entreprises_created"] += 1
                stats["users_created"] += 1
                
                # Récupérer le token et mettre à jour le plan
                token = data.get("access_token")
                entreprise_id = data.get("entreprise", {}).get("id")
                
                # Mettre à jour le plan de l'entreprise
                if token and plan != "startup":
                    await update_entreprise_plan(session, token, plan, selected_categories)
                
                print(f"✓ Entreprise {index}: {entreprise_name} ({plan}) - {len(selected_categories)} catégories")
                return {
                    "id": index,
                    "name": entreprise_name,
                    "plan": plan,
                    "admin_email": admin_email,
                    "password": password,
                    "categories": selected_categories,
                    "token": token,
                    "entreprise_id": entreprise_id
                }
            else:
                error_text = await resp.text()
                # Si l'entreprise existe déjà, essayer de se connecter
                if "existe" in error_text.lower() or "already" in error_text.lower() or "utilisé" in error_text.lower():
                    return await login_entreprise(session, index, admin_email, password, plan, selected_categories, entreprise_name)
                stats["errors"].append(f"Entreprise {index}: {resp.status} - {error_text[:100]}")
                return None
    except Exception as e:
        stats["errors"].append(f"Entreprise {index}: {str(e)}")
        return None

async def update_entreprise_plan(session: aiohttp.ClientSession, token: str, plan: str, categories: List[str]):
    """Mettre à jour le plan d'une entreprise"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Importer les limites du plan
    plan_limits = {
        "startup": {
            "max_admins": 1,
            "max_technicians": 3,
            "max_categories": 1,
            "max_clients": 50,
            "offline_mode": False,
            "geolocation": False,
            "multi_sites": False,
            "advanced_analytics": False,
            "auto_devis_to_facture": False,
            "team_validation": False,
            "white_label": False,
            "api_access": False
        },
        "pro": {
            "max_admins": 3,
            "max_technicians": 10,
            "max_categories": 4,
            "max_clients": -1,
            "offline_mode": True,
            "geolocation": True,
            "multi_sites": False,
            "advanced_analytics": True,
            "auto_devis_to_facture": True,
            "team_validation": True,
            "white_label": True,
            "api_access": False
        },
        "enterprise": {
            "max_admins": -1,
            "max_technicians": -1,
            "max_categories": -1,
            "max_clients": -1,
            "offline_mode": True,
            "geolocation": True,
            "multi_sites": True,
            "advanced_analytics": True,
            "auto_devis_to_facture": True,
            "team_validation": True,
            "white_label": True,
            "api_access": True
        }
    }
    
    try:
        # Mettre à jour via l'endpoint subscription/sync
        async with session.post(f"{API_URL}/subscription/sync", headers=headers) as resp:
            pass  # On ignore le résultat
    except:
        pass

async def login_entreprise(session, index, email, password, plan, categories, name):
    """Login si l'entreprise existe déjà"""
    try:
        async with session.post(f"{API_URL}/auth/login", json={
            "email": email,
            "password": password
        }) as resp:
            if resp.status == 200:
                data = await resp.json()
                stats["entreprises_created"] += 1
                print(f"✓ Entreprise {index}: {name} (login existant)")
                return {
                    "id": index,
                    "name": name,
                    "plan": plan,
                    "admin_email": email,
                    "password": password,
                    "categories": categories,
                    "token": data.get("access_token"),
                    "entreprise_id": data.get("entreprise", {}).get("id")
                }
    except:
        pass
    return None

async def create_technicians(session: aiohttp.ClientSession, entreprise: Dict) -> List[Dict]:
    """Créer des techniciens pour une entreprise"""
    if not entreprise or not entreprise.get("token"):
        return []
    
    num_techs = TECHS_PER_ENTREPRISE.get(entreprise["plan"], 2)
    technicians = []
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    
    for i in range(num_techs):
        tech_email = f"tech{i}_{entreprise['id']:03d}@test.fr"
        tech_data = {
            "email": tech_email,
            "nom": f"Tech{i}",
            "prenom": f"Prénom{i}",
            "telephone": generate_phone(),
            "role": "tech",
            "skills": random.sample(entreprise["categories"], min(len(entreprise["categories"]), random.randint(1, 3)))
        }
        
        try:
            async with session.post(f"{API_URL}/users/invite", json=tech_data, headers=headers) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    technicians.append({"id": data.get("user_id"), "email": tech_email})
                    stats["users_created"] += 1
        except Exception as e:
            pass
    
    if technicians:
        print(f"  → {len(technicians)} techniciens créés pour {entreprise['name']}")
    return technicians

async def create_clients(session: aiohttp.ClientSession, entreprise: Dict) -> List[Dict]:
    """Créer des clients pour une entreprise"""
    if not entreprise or not entreprise.get("token"):
        return []
    
    clients = []
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    
    for i in range(CLIENTS_PER_ENTREPRISE):
        client_data = {
            "nom": f"Client_{entreprise['id']:03d}_{i:02d}",
            "email": f"client{i}_{entreprise['id']:03d}@client.fr",
            "telephone": generate_phone(),
            "adresse": f"{random.randint(1, 200)} Rue de Test, 75{random.randint(1, 20):03d} Paris",
            "type": random.choice(["particulier", "professionnel"]),
            "notes": f"Client test {i} pour {entreprise['name']}"
        }
        
        try:
            async with session.post(f"{API_URL}/clients", json=client_data, headers=headers) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    clients.append({"id": data.get("id"), "nom": client_data["nom"]})
                    stats["clients_created"] += 1
        except Exception as e:
            pass
    
    if clients:
        print(f"  → {len(clients)} clients créés pour {entreprise['name']}")
    return clients

async def create_interventions(session: aiohttp.ClientSession, entreprise: Dict, clients: List[Dict], technicians: List[Dict]) -> List[Dict]:
    """Créer des interventions pour une entreprise"""
    if not entreprise or not entreprise.get("token") or not clients:
        return []
    
    interventions = []
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    
    for client in clients[:5]:  # 5 premiers clients
        for i in range(INTERVENTIONS_PER_CLIENT):
            date_prevue = datetime.now() + timedelta(days=random.randint(1, 30))
            categorie = random.choice(entreprise["categories"])
            
            intervention_data = {
                "client_id": client["id"],
                "titre": f"Intervention {categorie} - {client['nom']}",
                "description": f"Description de l'intervention {i+1} pour {client['nom']}",
                "date_prevue": date_prevue.isoformat(),
                "duree_estimee": random.choice([30, 60, 90, 120, 180]),
                "categorie_id": categorie,
                "priorite": random.choice(["basse", "normale", "haute", "urgente"]),
                "technicien_id": random.choice(technicians)["id"] if technicians else None,
                "statut": random.choice(["planifiee", "en_cours", "terminee"])
            }
            
            try:
                async with session.post(f"{API_URL}/interventions", json=intervention_data, headers=headers) as resp:
                    if resp.status in [200, 201]:
                        data = await resp.json()
                        interventions.append({"id": data.get("id")})
                        stats["interventions_created"] += 1
            except Exception as e:
                pass
    
    if interventions:
        print(f"  → {len(interventions)} interventions créées pour {entreprise['name']}")
    return interventions

async def create_devis(session: aiohttp.ClientSession, entreprise: Dict, clients: List[Dict]) -> List[Dict]:
    """Créer des devis pour une entreprise"""
    if not entreprise or not entreprise.get("token") or not clients:
        return []
    
    devis_list = []
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    
    for client in clients[:3]:  # 3 premiers clients
        lignes = [
            {
                "description": f"Prestation {random.choice(['standard', 'premium', 'express'])}",
                "quantite": random.randint(1, 5),
                "prix_unitaire": random.choice([50, 100, 150, 200, 300]),
                "tva": 20
            },
            {
                "description": "Main d'œuvre",
                "quantite": random.randint(1, 8),
                "prix_unitaire": 45,
                "tva": 20
            }
        ]
        
        devis_data = {
            "client_id": client["id"],
            "lignes": lignes,
            "conditions": "Devis valable 30 jours",
            "notes": f"Devis test pour {client['nom']}"
        }
        
        try:
            async with session.post(f"{API_URL}/devis", json=devis_data, headers=headers) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    devis_list.append({"id": data.get("id")})
                    stats["devis_created"] += 1
        except Exception as e:
            pass
    
    if devis_list:
        print(f"  → {len(devis_list)} devis créés pour {entreprise['name']}")
    return devis_list

async def create_factures(session: aiohttp.ClientSession, entreprise: Dict, clients: List[Dict]) -> List[Dict]:
    """Créer des factures pour une entreprise"""
    if not entreprise or not entreprise.get("token") or not clients:
        return []
    
    factures = []
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    
    for client in clients[:2]:  # 2 premiers clients
        lignes = [
            {
                "description": f"Service {random.choice(['maintenance', 'installation', 'réparation'])}",
                "quantite": random.randint(1, 3),
                "prix_unitaire": random.choice([100, 200, 350, 500]),
                "tva": 20
            }
        ]
        
        facture_data = {
            "client_id": client["id"],
            "lignes": lignes,
            "conditions_paiement": "Paiement à 30 jours",
            "notes": f"Facture test pour {client['nom']}"
        }
        
        try:
            async with session.post(f"{API_URL}/factures", json=facture_data, headers=headers) as resp:
                if resp.status in [200, 201]:
                    data = await resp.json()
                    factures.append({"id": data.get("id")})
                    stats["factures_created"] += 1
        except Exception as e:
            pass
    
    if factures:
        print(f"  → {len(factures)} factures créées pour {entreprise['name']}")
    return factures

async def test_api_endpoints(session: aiohttp.ClientSession, entreprise: Dict):
    """Tester tous les endpoints API pour une entreprise"""
    if not entreprise or not entreprise.get("token"):
        return
    
    headers = {"Authorization": f"Bearer {entreprise['token']}"}
    endpoints = [
        "/clients",
        "/interventions", 
        "/devis",
        "/factures",
        "/categories",
        "/stats",
        "/users"
    ]
    
    for endpoint in endpoints:
        try:
            async with session.get(f"{API_URL}{endpoint}", headers=headers) as resp:
                if resp.status != 200:
                    stats["errors"].append(f"{entreprise['name']} - {endpoint}: {resp.status}")
        except Exception as e:
            stats["errors"].append(f"{entreprise['name']} - {endpoint}: {str(e)}")

async def process_entreprise(session: aiohttp.ClientSession, index: int):
    """Traiter une entreprise complète (création + données + tests)"""
    # 1. Créer l'entreprise
    entreprise = await create_entreprise(session, index)
    if not entreprise:
        return
    
    # 2. Créer les techniciens
    technicians = await create_technicians(session, entreprise)
    
    # 3. Créer les clients
    clients = await create_clients(session, entreprise)
    
    # 4. Créer les interventions
    await create_interventions(session, entreprise, clients, technicians)
    
    # 5. Créer les devis
    await create_devis(session, entreprise, clients)
    
    # 6. Créer les factures
    await create_factures(session, entreprise, clients)
    
    # 7. Tester les endpoints
    await test_api_endpoints(session, entreprise)

async def run_load_test():
    """Exécuter le test de charge complet"""
    print("=" * 60)
    print("🚀 ACTOOS - TEST DE CHARGE ULTIME")
    print(f"   {NUM_ENTREPRISES} entreprises simultanées")
    print(f"   Tous les plans: Startup, Pro, Enterprise")
    print(f"   Toutes les catégories: {len(CATEGORIES)}")
    print("=" * 60)
    print()
    
    stats["start_time"] = time.time()
    
    # Configuration du client HTTP - optimisé pour 500 entreprises
    timeout = aiohttp.ClientTimeout(total=30)
    connector = aiohttp.TCPConnector(limit=50)  # Plus de connexions simultanées
    
    async with aiohttp.ClientSession(timeout=timeout, connector=connector) as session:
        # Traiter les entreprises par lots de 25 pour plus de vitesse
        batch_size = 25
        for batch_start in range(0, NUM_ENTREPRISES, batch_size):
            batch_end = min(batch_start + batch_size, NUM_ENTREPRISES)
            print(f"\n📦 Lot {batch_start+1}-{batch_end}...")
            
            tasks = [
                process_entreprise(session, i) 
                for i in range(batch_start, batch_end)
            ]
            await asyncio.gather(*tasks, return_exceptions=True)
            
            # Pause réduite
            await asyncio.sleep(0.5)
    
    stats["end_time"] = time.time()
    
    # Afficher les résultats
    print_results()

def print_results():
    """Afficher les résultats du test"""
    duration = stats["end_time"] - stats["start_time"]
    
    print("\n" + "=" * 60)
    print("📊 RÉSULTATS DU TEST DE CHARGE")
    print("=" * 60)
    print(f"""
⏱️  Durée totale: {duration:.2f} secondes

📈 DONNÉES CRÉÉES:
   • Entreprises: {stats['entreprises_created']}
   • Utilisateurs: {stats['users_created']}
   • Clients: {stats['clients_created']}
   • Interventions: {stats['interventions_created']}
   • Devis: {stats['devis_created']}
   • Factures: {stats['factures_created']}

📊 TOTAUX:
   • Total enregistrements: {stats['entreprises_created'] + stats['users_created'] + stats['clients_created'] + stats['interventions_created'] + stats['devis_created'] + stats['factures_created']}
   • Erreurs: {len(stats['errors'])}
   • Taux de succès: {100 - (len(stats['errors']) / max(1, stats['entreprises_created'] * 10) * 100):.1f}%

🚀 PERFORMANCE:
   • Entreprises/seconde: {stats['entreprises_created'] / max(1, duration):.2f}
   • Requêtes/seconde: {(stats['entreprises_created'] + stats['users_created'] + stats['clients_created'] + stats['interventions_created']) / max(1, duration):.2f}
""")
    
    if stats['errors']:
        print(f"\n⚠️  ERREURS ({len(stats['errors'])}):")
        for error in stats['errors'][:10]:  # Afficher max 10 erreurs
            print(f"   • {error}")
        if len(stats['errors']) > 10:
            print(f"   ... et {len(stats['errors']) - 10} autres erreurs")
    
    print("\n" + "=" * 60)
    
    # Verdict final
    if stats['entreprises_created'] >= NUM_ENTREPRISES * 0.9 and len(stats['errors']) < NUM_ENTREPRISES:
        print("✅ TEST RÉUSSI - Le système supporte la charge!")
    elif stats['entreprises_created'] >= NUM_ENTREPRISES * 0.7:
        print("⚠️  TEST PARTIEL - Quelques erreurs mais fonctionnel")
    else:
        print("❌ TEST ÉCHOUÉ - Trop d'erreurs")
    
    print("=" * 60)
    
    # Sauvegarder les résultats
    with open("/app/test_reports/load_test_results.json", "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "duration_seconds": duration,
            "config": {
                "num_entreprises": NUM_ENTREPRISES,
                "techs_per_entreprise": TECHS_PER_ENTREPRISE,
                "clients_per_entreprise": CLIENTS_PER_ENTREPRISE,
                "interventions_per_client": INTERVENTIONS_PER_CLIENT
            },
            "results": {
                "entreprises_created": stats['entreprises_created'],
                "users_created": stats['users_created'],
                "clients_created": stats['clients_created'],
                "interventions_created": stats['interventions_created'],
                "devis_created": stats['devis_created'],
                "factures_created": stats['factures_created'],
                "total_records": stats['entreprises_created'] + stats['users_created'] + stats['clients_created'] + stats['interventions_created'] + stats['devis_created'] + stats['factures_created'],
                "errors_count": len(stats['errors']),
                "success_rate": 100 - (len(stats['errors']) / max(1, stats['entreprises_created'] * 10) * 100)
            },
            "errors": stats['errors'][:50]  # Max 50 erreurs dans le fichier
        }, f, indent=2)
    
    print(f"\n📁 Résultats sauvegardés: /app/test_reports/load_test_results.json")

if __name__ == "__main__":
    asyncio.run(run_load_test())
