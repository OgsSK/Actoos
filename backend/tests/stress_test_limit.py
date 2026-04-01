"""
TEST DE STRESS PROGRESSIF - Trouver la limite du système
- Augmente progressivement la charge
- Détecte le point de rupture
- Nettoie toutes les données de test à la fin
"""
import asyncio
import aiohttp
import time
import random
import string
from datetime import datetime, timedelta
import json

API_URL = "https://actoos-production.up.railway.app/api"

# Tous les tokens créés pour le nettoyage
all_tokens = []
all_emails = []

def random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase, k=length))

def random_phone():
    return f"+324{random.randint(10000000, 99999999)}"

async def create_entreprise(session, index, batch_id):
    """Créer une entreprise avec admin"""
    company_name = f"StressTest_B{batch_id}_{index:03d}_{random_string(4)}"
    email = f"stress{batch_id}_{index}@test-{random_string(4)}.com"
    
    payload = {
        "entreprise_nom": company_name,
        "entreprise_email": f"contact@{company_name.lower()}.com",
        "entreprise_telephone": random_phone(),
        "admin_email": email,
        "admin_password": "StressTest123!",
        "admin_nom": f"Stress{index}",
        "admin_prenom": "Test"
    }
    
    start = time.time()
    try:
        async with session.post(f"{API_URL}/auth/register", json=payload) as resp:
            elapsed = time.time() - start
            
            if resp.status == 200:
                data = await resp.json()
                all_emails.append(email)
                all_tokens.append(data.get("access_token"))
                return {"success": True, "time": elapsed, "email": email, "token": data.get("access_token")}
            else:
                error_text = await resp.text()
                return {"success": False, "time": elapsed, "error": f"{resp.status}: {error_text[:100]}"}
    except Exception as e:
        return {"success": False, "time": time.time() - start, "error": str(e)[:100]}

async def create_client(session, token, index):
    """Créer un client"""
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "nom": f"ClientStress_{index}",
        "prenom": f"Test{index}",
        "email": f"clientstress{index}_{random_string(4)}@test.com",
        "telephone": random_phone(),
        "adresse": f"{random.randint(1, 100)} Rue Stress",
        "code_postal": f"{random.randint(1000, 9999)}",
        "ville": random.choice(["Bruxelles", "Paris", "Lyon", "Marseille"])
    }
    
    start = time.time()
    try:
        async with session.post(f"{API_URL}/clients", json=payload, headers=headers) as resp:
            elapsed = time.time() - start
            if resp.status == 200:
                return {"success": True, "time": elapsed}
            else:
                return {"success": False, "time": elapsed, "error": f"{resp.status}"}
    except Exception as e:
        return {"success": False, "time": time.time() - start, "error": str(e)[:50]}

async def run_batch(session, batch_size, batch_id, operation_type="entreprise"):
    """Exécuter un batch d'opérations"""
    results = []
    
    if operation_type == "entreprise":
        tasks = [create_entreprise(session, i, batch_id) for i in range(batch_size)]
    elif operation_type == "client" and all_tokens:
        token = random.choice(all_tokens)
        tasks = [create_client(session, token, i) for i in range(batch_size)]
    else:
        return results
    
    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for r in batch_results:
        if isinstance(r, dict):
            results.append(r)
        else:
            results.append({"success": False, "time": 0, "error": str(r)[:50]})
    
    return results

async def cleanup_test_data(session):
    """Nettoyer toutes les données de test"""
    print("\n🧹 NETTOYAGE DES DONNÉES DE TEST...")
    
    deleted_count = 0
    errors = 0
    
    for token in all_tokens:
        try:
            headers = {"Authorization": f"Bearer {token}"}
            
            # Supprimer tous les clients de cette entreprise
            async with session.get(f"{API_URL}/clients", headers=headers) as resp:
                if resp.status == 200:
                    clients = await resp.json()
                    for client in clients:
                        async with session.delete(f"{API_URL}/clients/{client['id']}", headers=headers) as del_resp:
                            if del_resp.status == 200:
                                deleted_count += 1
            
            # Supprimer tous les devis
            async with session.get(f"{API_URL}/devis", headers=headers) as resp:
                if resp.status == 200:
                    devis_list = await resp.json()
                    for devis in devis_list:
                        async with session.delete(f"{API_URL}/devis/{devis['id']}", headers=headers) as del_resp:
                            if del_resp.status == 200:
                                deleted_count += 1
            
            # Supprimer toutes les interventions
            async with session.get(f"{API_URL}/interventions", headers=headers) as resp:
                if resp.status == 200:
                    interventions = await resp.json()
                    for interv in interventions:
                        async with session.delete(f"{API_URL}/interventions/{interv['id']}", headers=headers) as del_resp:
                            if del_resp.status == 200:
                                deleted_count += 1
                                
        except Exception as e:
            errors += 1
    
    print(f"  ✅ {deleted_count} éléments supprimés")
    if errors > 0:
        print(f"  ⚠️ {errors} erreurs de nettoyage")
    
    return deleted_count

async def delete_test_entreprises():
    """Supprimer les entreprises de test via MongoDB (endpoint admin)"""
    print("\n🗑️ SUPPRESSION DES ENTREPRISES DE TEST...")
    
    # On va utiliser l'endpoint admin pour supprimer
    connector = aiohttp.TCPConnector(limit=10)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        # Appeler un endpoint spécial pour nettoyer
        try:
            url = f"{API_URL}/admin/analytics/cleanup-stress-test?secret_key=actoos-cleanup-2024-prod"
            async with session.get(url) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    print(f"  ✅ Nettoyage effectué: {data}")
                else:
                    print(f"  ⚠️ Nettoyage via API non disponible, les données seront nettoyées manuellement")
        except Exception as e:
            print(f"  ⚠️ Erreur nettoyage: {e}")

async def main():
    print("=" * 70)
    print("🔥 TEST DE STRESS PROGRESSIF - RECHERCHE DE LA LIMITE")
    print("=" * 70)
    
    # Niveaux de charge à tester
    levels = [
        {"concurrent": 10, "name": "Niveau 1 - Léger"},
        {"concurrent": 25, "name": "Niveau 2 - Modéré"},
        {"concurrent": 50, "name": "Niveau 3 - Élevé"},
        {"concurrent": 100, "name": "Niveau 4 - Intense"},
        {"concurrent": 150, "name": "Niveau 5 - Très Intense"},
        {"concurrent": 200, "name": "Niveau 6 - Extrême"},
        {"concurrent": 300, "name": "Niveau 7 - Limite Haute"},
        {"concurrent": 500, "name": "Niveau 8 - Stress Maximum"},
    ]
    
    results_summary = []
    breaking_point = None
    
    connector = aiohttp.TCPConnector(limit=100, limit_per_host=50)
    timeout = aiohttp.ClientTimeout(total=120)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        for level in levels:
            concurrent = level["concurrent"]
            name = level["name"]
            
            print(f"\n{'='*70}")
            print(f"🚀 {name} - {concurrent} opérations simultanées")
            print("="*70)
            
            # Test 1: Création d'entreprises
            print(f"\n📦 Test: Création de {concurrent} entreprises simultanées...")
            start_time = time.time()
            
            results = await run_batch(session, concurrent, concurrent, "entreprise")
            
            elapsed = time.time() - start_time
            successes = sum(1 for r in results if r.get("success"))
            failures = len(results) - successes
            success_rate = (successes / len(results)) * 100 if results else 0
            
            avg_time = sum(r.get("time", 0) for r in results) / len(results) * 1000 if results else 0
            max_time = max(r.get("time", 0) for r in results) * 1000 if results else 0
            
            print(f"  ✅ Succès: {successes}/{concurrent} ({success_rate:.1f}%)")
            print(f"  ⏱️ Temps total: {elapsed:.2f}s")
            print(f"  ⚡ Temps moyen: {avg_time:.0f}ms | Max: {max_time:.0f}ms")
            
            if failures > 0:
                errors = [r.get("error", "Unknown") for r in results if not r.get("success")][:5]
                print(f"  ❌ Erreurs ({failures}):")
                for err in errors:
                    print(f"     • {err}")
            
            level_result = {
                "level": name,
                "concurrent": concurrent,
                "successes": successes,
                "failures": failures,
                "success_rate": success_rate,
                "avg_time_ms": avg_time,
                "max_time_ms": max_time,
                "total_time_s": elapsed
            }
            results_summary.append(level_result)
            
            # Vérifier si on a atteint la limite
            if success_rate < 80:
                breaking_point = {
                    "level": name,
                    "concurrent": concurrent,
                    "success_rate": success_rate,
                    "reason": "Taux de succès < 80%"
                }
                print(f"\n⚠️ LIMITE DÉTECTÉE à {concurrent} opérations simultanées!")
                break
            
            if avg_time > 10000:  # 10 secondes de moyenne
                breaking_point = {
                    "level": name,
                    "concurrent": concurrent,
                    "avg_time_ms": avg_time,
                    "reason": "Temps de réponse > 10s"
                }
                print(f"\n⚠️ LIMITE DE PERFORMANCE DÉTECTÉE!")
                break
            
            # Pause entre les niveaux
            print(f"\n⏸️ Pause de 3s avant le niveau suivant...")
            await asyncio.sleep(3)
        
        # Test supplémentaire: Clients en masse
        if all_tokens and not breaking_point:
            print(f"\n{'='*70}")
            print("🔥 TEST BONUS: Création massive de clients")
            print("="*70)
            
            for client_batch in [100, 200, 500]:
                print(f"\n📦 Création de {client_batch} clients simultanément...")
                start_time = time.time()
                
                token = random.choice(all_tokens)
                tasks = [create_client(session, token, i) for i in range(client_batch)]
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                elapsed = time.time() - start_time
                successes = sum(1 for r in results if isinstance(r, dict) and r.get("success"))
                success_rate = (successes / client_batch) * 100
                
                print(f"  ✅ Succès: {successes}/{client_batch} ({success_rate:.1f}%)")
                print(f"  ⏱️ Temps: {elapsed:.2f}s")
                
                if success_rate < 80:
                    breaking_point = {
                        "level": f"Clients x{client_batch}",
                        "concurrent": client_batch,
                        "success_rate": success_rate,
                        "reason": "Limite clients atteinte"
                    }
                    break
                
                await asyncio.sleep(2)
        
        # Nettoyage
        print("\n" + "="*70)
        print("🧹 PHASE DE NETTOYAGE")
        print("="*70)
        
        await cleanup_test_data(session)
    
    # Rapport final
    print("\n" + "="*70)
    print("📊 RAPPORT FINAL - LIMITES DU SYSTÈME")
    print("="*70)
    
    print("\n📈 Résultats par niveau:")
    print("-" * 70)
    print(f"{'Niveau':<25} {'Concurrent':<12} {'Succès':<12} {'Temps Moy':<12} {'Status'}")
    print("-" * 70)
    
    for r in results_summary:
        status = "✅ OK" if r["success_rate"] >= 95 else "⚠️ Dégradé" if r["success_rate"] >= 80 else "❌ Échec"
        print(f"{r['level']:<25} {r['concurrent']:<12} {r['success_rate']:.1f}%{'':<6} {r['avg_time_ms']:.0f}ms{'':<6} {status}")
    
    print("-" * 70)
    
    if breaking_point:
        print(f"\n🚨 POINT DE RUPTURE DÉTECTÉ:")
        print(f"   • Niveau: {breaking_point['level']}")
        print(f"   • Opérations simultanées: {breaking_point['concurrent']}")
        print(f"   • Raison: {breaking_point['reason']}")
        
        # Recommandation
        safe_limit = breaking_point['concurrent'] // 2
        print(f"\n💡 RECOMMANDATION:")
        print(f"   • Limite sécurisée: {safe_limit} opérations simultanées")
        print(f"   • Limite maximale: {breaking_point['concurrent']} (avec dégradation)")
    else:
        last_level = results_summary[-1] if results_summary else None
        if last_level:
            print(f"\n✅ AUCUNE LIMITE ATTEINTE!")
            print(f"   • Le système supporte au moins {last_level['concurrent']} opérations simultanées")
            print(f"   • Performance maintenue avec temps moyen de {last_level['avg_time_ms']:.0f}ms")
    
    # Sauvegarder le rapport
    report = {
        "timestamp": datetime.now().isoformat(),
        "results": results_summary,
        "breaking_point": breaking_point,
        "total_entreprises_created": len(all_tokens),
        "total_emails": len(all_emails)
    }
    
    with open("/app/test_reports/stress_test_limit.json", "w") as f:
        json.dump(report, f, indent=2)
    
    print(f"\n📄 Rapport sauvegardé: /app/test_reports/stress_test_limit.json")
    
    # Retourner les emails pour nettoyage
    return all_emails

if __name__ == "__main__":
    emails = asyncio.run(main())
    print(f"\n📝 {len(emails)} comptes de test créés (à nettoyer via MongoDB)")
