"""
Final Comprehensive Test Suite for Actoos SaaS
Tests all critical flows: Marketing, Auth, Dashboard, CRUD, PWA
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"


class TestPlansAPI:
    """Test /api/plans endpoint - Public API for pricing page"""
    
    def test_get_plans_returns_3_plans(self):
        """GET /api/plans should return exactly 3 plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        assert len(plans) == 3
        
    def test_plans_have_correct_ids(self):
        """Plans should have startup, pro, enterprise IDs"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        plan_ids = [p['id'] for p in plans]
        assert 'startup' in plan_ids
        assert 'pro' in plan_ids
        assert 'enterprise' in plan_ids
        
    def test_plans_have_correct_prices(self):
        """Plans should have correct prices: 49€, 79€, 129€"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        prices = {p['id']: p['price'] for p in plans}
        assert prices['startup'] == 49.0
        assert prices['pro'] == 79.0
        assert prices['enterprise'] == 129.0
        
    def test_plans_have_limits(self):
        """Each plan should have limits defined"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        for plan in plans:
            assert 'limits' in plan
            assert 'max_technicians' in plan['limits']
            assert 'max_categories' in plan['limits']


class TestAuthAPI:
    """Test authentication endpoints"""
    
    def test_admin_login_success(self):
        """Admin login should succeed with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['user']['role'] == 'admin'
        assert data['user']['email'] == ADMIN_EMAIL
        
    def test_tech_login_success(self):
        """Technician login should succeed with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['user']['role'] == 'tech'
        
    def test_login_invalid_credentials(self):
        """Login should fail with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_login_returns_entreprise_info(self):
        """Login should return entreprise information"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        data = response.json()
        assert 'entreprise' in data
        assert 'plan' in data['entreprise']
        assert 'plan_limits' in data['entreprise']


class TestDashboardAPI:
    """Test dashboard endpoints (requires auth)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_dashboard_stats(self, admin_token):
        """GET /api/dashboard/stats should return stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Check expected fields
        assert 'interventions_today' in data or 'total_clients' in data
        
    def test_dashboard_alerts(self, admin_token):
        """GET /api/dashboard/alerts should return alerts list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_dashboard_recent(self, admin_token):
        """GET /api/dashboard/recent should return recent items"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/recent", headers=headers)
        assert response.status_code == 200


class TestClientsAPI:
    """Test clients CRUD endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_clients(self, admin_token):
        """GET /api/clients should return clients list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_and_get_client(self, admin_token):
        """Create client and verify it exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create client
        client_data = {
            "nom": "TEST_ClientFinal",
            "prenom": "Test",
            "email": "test_final@example.com",
            "telephone": "0612345678",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001",
            "type_client": "particulier"
        }
        create_response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        assert 'id' in created
        
        # Get client
        get_response = requests.get(f"{BASE_URL}/api/clients/{created['id']}", headers=headers)
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched['nom'] == "TEST_ClientFinal"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{created['id']}", headers=headers)


class TestInterventionsAPI:
    """Test interventions CRUD endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_interventions(self, admin_token):
        """GET /api/interventions should return interventions list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/interventions", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_today_interventions(self, admin_token):
        """GET /api/interventions/today should return today's interventions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/interventions/today", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestDevisAPI:
    """Test devis (quotes) endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_devis(self, admin_token):
        """GET /api/devis should return devis list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/devis", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestFacturesAPI:
    """Test factures (invoices) endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_factures(self, admin_token):
        """GET /api/factures should return factures list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/factures", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestTechniciansAPI:
    """Test technicians endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_technicians(self, admin_token):
        """GET /api/technicians should return technicians list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/technicians", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestCategoriesAPI:
    """Test categories endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_categories(self, admin_token):
        """GET /api/categories should return categories list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/categories", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAnalyticsAPI:
    """Test analytics endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_analytics_overview(self, admin_token):
        """GET /api/analytics/overview should return analytics data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200


class TestPlanUsageAPI:
    """Test plan usage/limits endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_plan_usage(self, admin_token):
        """GET /api/subscription/usage should return usage stats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/subscription/usage", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert 'technicians' in data or 'features' in data


class TestTechnicianAppAPI:
    """Test technician-specific endpoints"""
    
    @pytest.fixture
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json()['access_token']
    
    def test_tech_today_interventions(self, tech_token):
        """Technician should be able to get today's interventions"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        response = requests.get(f"{BASE_URL}/api/interventions/today", headers=headers)
        assert response.status_code == 200
        
    def test_tech_list_clients(self, tech_token):
        """Technician should be able to list clients"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200


class TestSitesAPI:
    """Test multi-sites endpoints (Enterprise feature)"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()['access_token']
    
    def test_list_sites(self, admin_token):
        """GET /api/sites should return sites list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/sites", headers=headers)
        # May return 403 if not Enterprise plan, or 200 with list
        assert response.status_code in [200, 403]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
