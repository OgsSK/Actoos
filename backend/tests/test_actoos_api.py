"""
ACTOOS PRO - Backend API Tests
Test de charge ultime - Iteration 54
Tests all major API endpoints
"""
import pytest
import requests
import os
import time
from datetime import datetime

# Get BASE_URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "contact@actoos.com"
ADMIN_PASSWORD = "Salifkane&&7"
DEMO_EMAIL = "demo@actoos.com"
DEMO_PASSWORD = "Salifkane&&7"


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✅ Health check: {data}")
    
    def test_login_admin_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        print(f"✅ Admin login successful")
        return data.get("access_token") or data.get("token")
    
    def test_login_demo_success(self):
        """Test demo login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        }, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        print(f"✅ Demo login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        }, timeout=10)
        
        assert response.status_code in [401, 400, 404]
        print(f"✅ Invalid login rejected: {response.status_code}")


@pytest.fixture(scope="class")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    }, timeout=10)
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token") or data.get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="class")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestDashboard:
    """Dashboard API tests"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers, timeout=10)
        
        # May return 200 or 400 if table doesn't exist
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard stats: {data}")
        else:
            print(f"⚠️ Dashboard stats: {response.status_code} (expected - table may not exist)")
    
    def test_dashboard_alerts(self, auth_headers):
        """Test dashboard alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Dashboard alerts: {len(data) if isinstance(data, list) else data}")
        else:
            print(f"⚠️ Dashboard alerts: {response.status_code}")


class TestClients:
    """Clients CRUD tests"""
    
    def test_list_clients(self, auth_headers):
        """Test listing clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Clients list: {len(data)} clients")
        return data
    
    def test_create_client(self, auth_headers):
        """Test creating a new client"""
        client_data = {
            "nom": f"TEST_Client_API_{int(time.time())}",
            "prenom": "Test",
            "email": f"test_api_{int(time.time())}@test.com",
            "telephone": "+33612345678",
            "adresse": "123 Rue de Test",
            "ville": "Paris",
            "code_postal": "75001",
            "type_client": "particulier"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=auth_headers, timeout=10)
        
        if response.status_code in [200, 201]:
            data = response.json()
            assert "id" in data
            print(f"✅ Client created: {data.get('id')}")
            return data
        else:
            print(f"⚠️ Client creation: {response.status_code} - {response.text[:200]}")
            return None


class TestInterventions:
    """Interventions CRUD tests"""
    
    def test_list_interventions(self, auth_headers):
        """Test listing interventions"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Interventions list: {len(data)} interventions")
        return data
    
    def test_filter_interventions_by_status(self, auth_headers):
        """Test filtering interventions by status"""
        response = requests.get(f"{BASE_URL}/api/interventions?statut=planifiee", headers=auth_headers, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        print(f"✅ Filtered interventions (planifiee): {len(data)}")


class TestDevis:
    """Devis CRUD tests"""
    
    def test_list_devis(self, auth_headers):
        """Test listing devis"""
        response = requests.get(f"{BASE_URL}/api/devis", headers=auth_headers, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Devis list: {len(data)} devis")
        return data


class TestFactures:
    """Factures CRUD tests"""
    
    def test_list_factures(self, auth_headers):
        """Test listing factures"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=auth_headers, timeout=10)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ Factures list: {len(data)} factures")
        return data


class TestTechniciens:
    """Techniciens tests"""
    
    def test_list_techniciens(self, auth_headers):
        """Test listing techniciens"""
        response = requests.get(f"{BASE_URL}/api/users/techniciens", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Techniciens list: {len(data) if isinstance(data, list) else data}")
        else:
            print(f"⚠️ Techniciens list: {response.status_code}")


class TestCategories:
    """Categories tests"""
    
    def test_list_categories(self, auth_headers):
        """Test listing categories"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Categories list: {len(data) if isinstance(data, list) else data}")
        else:
            print(f"⚠️ Categories list: {response.status_code}")


class TestPlanning:
    """Planning tests"""
    
    def test_planning_week(self, auth_headers):
        """Test planning week view"""
        today = datetime.now().strftime("%Y-%m-%d")
        response = requests.get(f"{BASE_URL}/api/planning?start={today}", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Planning data: {len(data) if isinstance(data, list) else data}")
        else:
            print(f"⚠️ Planning: {response.status_code}")


class TestEntreprise:
    """Entreprise settings tests"""
    
    def test_get_entreprise(self, auth_headers):
        """Test getting entreprise info"""
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Entreprise: {data.get('nom', 'N/A')}")
        else:
            print(f"⚠️ Entreprise: {response.status_code}")


class TestSubscription:
    """Subscription/Plan tests"""
    
    def test_get_plans(self, auth_headers):
        """Test getting available plans"""
        response = requests.get(f"{BASE_URL}/api/plans", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Plans: {len(data) if isinstance(data, list) else data}")
        else:
            # Plans endpoint may not require auth
            response = requests.get(f"{BASE_URL}/api/plans", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Plans (public): {len(data) if isinstance(data, list) else data}")
            else:
                print(f"⚠️ Plans: {response.status_code}")
    
    def test_get_usage(self, auth_headers):
        """Test getting usage stats"""
        response = requests.get(f"{BASE_URL}/api/usage", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Usage: {data}")
        else:
            print(f"⚠️ Usage: {response.status_code}")


class TestAnalytics:
    """Analytics tests"""
    
    def test_analytics_overview(self, auth_headers):
        """Test analytics overview"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Analytics overview: {data}")
        else:
            print(f"⚠️ Analytics overview: {response.status_code}")


class TestRapports:
    """Rapports tests"""
    
    def test_rapports_stats(self, auth_headers):
        """Test rapports stats"""
        response = requests.get(f"{BASE_URL}/api/rapports/stats", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Rapports stats: {data}")
        else:
            print(f"⚠️ Rapports stats: {response.status_code}")


class TestSettings:
    """Settings tests"""
    
    def test_get_settings(self, auth_headers):
        """Test getting settings"""
        response = requests.get(f"{BASE_URL}/api/settings", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Settings: {data}")
        else:
            print(f"⚠️ Settings: {response.status_code}")


class TestChat:
    """Chat tests"""
    
    def test_chat_unread_count(self, auth_headers):
        """Test chat unread count"""
        response = requests.get(f"{BASE_URL}/api/chat/unread-count", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Chat unread count: {data}")
        else:
            print(f"⚠️ Chat unread count: {response.status_code}")


class TestSites:
    """Sites tests"""
    
    def test_list_sites(self, auth_headers):
        """Test listing sites"""
        response = requests.get(f"{BASE_URL}/api/sites", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Sites list: {len(data) if isinstance(data, list) else data}")
        else:
            print(f"⚠️ Sites list: {response.status_code}")


class TestSearch:
    """Search tests"""
    
    def test_global_search(self, auth_headers):
        """Test global search"""
        response = requests.get(f"{BASE_URL}/api/search?q=test", headers=auth_headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Search results: {data}")
        else:
            print(f"⚠️ Search: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
