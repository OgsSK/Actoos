"""
Comprehensive E2E Backend Tests for Actoos SaaS
Tests all critical CRUD operations and workflows
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


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
    
    def test_tech_login_success(self):
        """Test technician login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "tech"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401


@pytest.fixture
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def admin_headers(admin_token):
    """Get headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestDashboard:
    """Dashboard endpoint tests"""
    
    def test_dashboard_stats(self, admin_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        # Verify expected fields exist
        assert "interventions_today" in data or "total_clients" in data
    
    def test_dashboard_alerts(self, admin_headers):
        """Test dashboard alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=admin_headers)
        assert response.status_code == 200
        # Should return a list
        assert isinstance(response.json(), list)
    
    def test_dashboard_recent(self, admin_headers):
        """Test dashboard recent items endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/recent", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "devis" in data or "factures" in data


class TestClients:
    """Client CRUD tests"""
    
    def test_list_clients(self, admin_headers):
        """Test listing clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_client(self, admin_headers):
        """Test creating a new client"""
        client_data = {
            "nom": "TEST_E2E_Backend",
            "prenom": "Pytest",
            "email": "test_e2e_backend@example.com",
            "telephone": "0612345678",
            "adresse": "123 Test Street",
            "code_postal": "75001",
            "ville": "Paris",
            "type_client": "particulier"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=admin_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["nom"] == client_data["nom"]
        assert "id" in data
        return data["id"]
    
    def test_get_client(self, admin_headers):
        """Test getting a specific client"""
        # First get list to find a client
        list_response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        clients = list_response.json()
        if clients:
            client_id = clients[0]["id"]
            response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=admin_headers)
            assert response.status_code == 200
            assert response.json()["id"] == client_id


class TestInterventions:
    """Intervention CRUD tests"""
    
    def test_list_interventions(self, admin_headers):
        """Test listing interventions"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_intervention(self, admin_headers):
        """Test creating a new intervention"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        clients = clients_response.json()
        if not clients:
            pytest.skip("No clients available for intervention test")
        
        client_id = clients[0]["id"]
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_E2E_Intervention",
            "description": "Test intervention from pytest",
            "date_prevue": "2026-04-01T10:00:00Z",
            "duree_estimee": 60,
            "priorite": "normale",
            "adresse": "123 Test Street",
            "code_postal": "75001",
            "ville": "Paris"
        }
        response = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=admin_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["titre"] == intervention_data["titre"]
        assert "id" in data


class TestDevis:
    """Devis (Quote) CRUD tests"""
    
    def test_list_devis(self, admin_headers):
        """Test listing devis"""
        response = requests.get(f"{BASE_URL}/api/devis", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_create_devis(self, admin_headers):
        """Test creating a new devis"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        clients = clients_response.json()
        if not clients:
            pytest.skip("No clients available for devis test")
        
        client_id = clients[0]["id"]
        devis_data = {
            "client_id": client_id,
            "lignes": [
                {
                    "description": "Test service",
                    "quantite": 1,
                    "prix_unitaire": 100,
                    "tva": 20
                }
            ],
            "conditions": "Test conditions",
            "validite_jours": 30
        }
        response = requests.post(f"{BASE_URL}/api/devis", json=devis_data, headers=admin_headers)
        assert response.status_code in [200, 201]
        data = response.json()
        assert "id" in data
        assert "numero_devis" in data
    
    def test_get_devis_pdf(self, admin_headers):
        """Test downloading devis PDF"""
        # First get list to find a devis
        list_response = requests.get(f"{BASE_URL}/api/devis", headers=admin_headers)
        devis_list = list_response.json()
        if devis_list:
            devis_id = devis_list[0]["id"]
            response = requests.get(f"{BASE_URL}/api/devis/{devis_id}/pdf", headers=admin_headers)
            assert response.status_code == 200
            assert response.headers.get("content-type") == "application/pdf"


class TestFactures:
    """Facture (Invoice) CRUD tests"""
    
    def test_list_factures(self, admin_headers):
        """Test listing factures"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_facture_pdf(self, admin_headers):
        """Test downloading facture PDF"""
        # First get list to find a facture
        list_response = requests.get(f"{BASE_URL}/api/factures", headers=admin_headers)
        factures_list = list_response.json()
        if factures_list:
            facture_id = factures_list[0]["id"]
            response = requests.get(f"{BASE_URL}/api/factures/{facture_id}/pdf", headers=admin_headers)
            assert response.status_code == 200
            assert response.headers.get("content-type") == "application/pdf"


class TestCategories:
    """Categories CRUD tests"""
    
    def test_list_categories(self, admin_headers):
        """Test listing categories"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUsers:
    """Users management tests"""
    
    def test_list_users(self, admin_headers):
        """Test listing users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestEntreprise:
    """Entreprise settings tests"""
    
    def test_get_entreprise(self, admin_headers):
        """Test getting entreprise settings"""
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "nom" in data


class TestAnalytics:
    """Analytics endpoint tests"""
    
    def test_analytics_summary(self, admin_headers):
        """Test analytics summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/summary", headers=admin_headers, params={"period": "month"})
        assert response.status_code == 200
        data = response.json()
        # Should have revenue, interventions, clients, devis sections
        assert "revenue" in data or "interventions" in data
    
    def test_analytics_trends(self, admin_headers):
        """Test analytics trends endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/trends", headers=admin_headers, params={"metric": "revenue", "days": 30})
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestPlans:
    """Plans and subscription tests"""
    
    def test_list_plans(self, admin_headers):
        """Test listing available plans"""
        response = requests.get(f"{BASE_URL}/api/plans", headers=admin_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_get_usage(self, admin_headers):
        """Test getting usage stats"""
        response = requests.get(f"{BASE_URL}/api/usage", headers=admin_headers)
        assert response.status_code == 200


class TestCurrencyLocale:
    """Currency and locale tests"""
    
    def test_list_currencies(self, admin_headers):
        """Test listing available currencies"""
        response = requests.get(f"{BASE_URL}/api/currencies", headers=admin_headers)
        assert response.status_code == 200
        currencies = response.json()
        assert isinstance(currencies, list)
        # Should have EUR at minimum
        codes = [c["code"] for c in currencies]
        assert "EUR" in codes
    
    def test_list_locales(self, admin_headers):
        """Test listing available locales"""
        response = requests.get(f"{BASE_URL}/api/locales", headers=admin_headers)
        assert response.status_code == 200
        locales = response.json()
        assert isinstance(locales, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
