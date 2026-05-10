"""
Test suite for Technician App P0 Bug Fixes
Tests:
1. Tech login and authentication
2. Tech can create interventions (POST /api/interventions)
3. Tech can create devis (POST /api/devis)
4. Verify devis total calculation
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"


class TestTechAuthentication:
    """Test technician authentication"""
    
    def test_tech_login_success(self):
        """Test that technician can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        assert "access_token" in data, "No access token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "tech", f"Expected role 'tech', got '{data['user']['role']}'"
        assert data["user"]["email"] == TECH_EMAIL
        
        print(f"Tech login successful: {data['user']['prenom']} {data['user']['nom']}")
    
    def test_tech_login_wrong_password(self):
        """Test that wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestTechInterventionCreation:
    """Test technician can create interventions (P0 Bug #2)"""
    
    @pytest.fixture
    def tech_token(self):
        """Get tech authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Tech login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_id(self, tech_token):
        """Get a client ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {tech_token}"}
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No clients available")
        return response.json()[0]["id"]
    
    def test_tech_can_create_intervention(self, tech_token, client_id):
        """Test that technician can create an intervention"""
        payload = {
            "client_id": client_id,
            "titre": f"TEST_Tech_Intervention_{datetime.now().strftime('%H%M%S')}",
            "description": "Created by technician via API test",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001",
            "date_prevue": datetime.now().isoformat() + "Z",
            "duree_estimee": 60,
            "priorite": "normale"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers={"Authorization": f"Bearer {tech_token}"},
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create intervention: {response.text}"
        data = response.json()
        
        assert "id" in data, "No ID in response"
        assert data["titre"] == payload["titre"], "Titre mismatch"
        assert data["statut"] == "planifiee", f"Expected status 'planifiee', got '{data['statut']}'"
        
        print(f"Intervention created: {data['id']}")
        
        # Note: Tech can create interventions but may not see them if not assigned
        # The intervention is created without technicien_id, so tech won't see it in their list
        # This is expected behavior - admin assigns technicians to interventions
    
    def test_tech_can_list_interventions(self, tech_token):
        """Test that technician can list their interventions"""
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers={"Authorization": f"Bearer {tech_token}"}
        )
        
        assert response.status_code == 200, f"Failed to list interventions: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} interventions")


class TestTechDevisCreation:
    """Test technician can create devis (P0 Bug #2)"""
    
    @pytest.fixture
    def tech_token(self):
        """Get tech authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Tech login failed")
        return response.json()["access_token"]
    
    @pytest.fixture
    def client_id(self, tech_token):
        """Get a client ID for testing"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {tech_token}"}
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No clients available")
        return response.json()[0]["id"]
    
    def test_tech_can_create_devis(self, tech_token, client_id):
        """Test that technician can create a devis"""
        payload = {
            "client_id": client_id,
            "lignes": [
                {"description": "Main d'oeuvre", "quantite": 2, "prix_unitaire": 50, "tva": 20},
                {"description": "Pièces détachées", "quantite": 1, "prix_unitaire": 30, "tva": 20}
            ],
            "conditions": "Paiement à réception",
            "validite_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/devis",
            headers={"Authorization": f"Bearer {tech_token}"},
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        data = response.json()
        
        assert "id" in data, "No ID in response"
        assert "numero_devis" in data, "No numero_devis in response"
        assert data["statut"] == "brouillon", f"Expected status 'brouillon', got '{data['statut']}'"
        
        # Verify technicien_id is set to current user
        assert data.get("technicien_id") is not None, "technicien_id should be set for tech-created devis"
        
        print(f"Devis created: {data['numero_devis']}")
    
    def test_devis_total_calculation(self, tech_token, client_id):
        """Test that devis total TTC is calculated correctly"""
        # 100€ HT + 20% TVA = 120€ TTC
        payload = {
            "client_id": client_id,
            "lignes": [
                {"description": "Service", "quantite": 1, "prix_unitaire": 100, "tva": 20}
            ],
            "conditions": "Test",
            "validite_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/devis",
            headers={"Authorization": f"Bearer {tech_token}"},
            json=payload
        )
        
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        data = response.json()
        
        # Verify calculations
        assert data["total_ht"] == 100.0, f"Expected total_ht 100.0, got {data['total_ht']}"
        assert data["total_tva"] == 20.0, f"Expected total_tva 20.0, got {data['total_tva']}"
        assert data["total_ttc"] == 120.0, f"Expected total_ttc 120.0, got {data['total_ttc']}"
        
        print(f"Devis totals correct: HT={data['total_ht']}, TVA={data['total_tva']}, TTC={data['total_ttc']}")
    
    def test_tech_can_list_devis(self, tech_token):
        """Test that technician can list their devis"""
        response = requests.get(
            f"{BASE_URL}/api/devis",
            headers={"Authorization": f"Bearer {tech_token}"}
        )
        
        assert response.status_code == 200, f"Failed to list devis: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} devis")


class TestTechClientsAccess:
    """Test technician can access clients"""
    
    @pytest.fixture
    def tech_token(self):
        """Get tech authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Tech login failed")
        return response.json()["access_token"]
    
    def test_tech_can_list_clients(self, tech_token):
        """Test that technician can list clients"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {tech_token}"}
        )
        
        assert response.status_code == 200, f"Failed to list clients: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one client"
        
        # Verify client structure
        client = data[0]
        assert "id" in client
        assert "nom" in client
        
        print(f"Found {len(data)} clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
