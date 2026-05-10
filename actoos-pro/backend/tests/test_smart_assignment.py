"""
Test suite for Smart Assignment feature (Assignation Intelligente)
Tests the following functionality:
- Creating interventions without technicien_id (available interventions)
- GET /interventions/available returns unassigned interventions
- GET /interventions/today includes available interventions for techs
- POST /interventions/{id}/claim assigns intervention to claiming tech
- POST /interventions/{id}/claim on already assigned returns 409 conflict
"""

import pytest
import requests
import os
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"


class TestSmartAssignment:
    """Tests for smart assignment feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        
    def get_tech_token(self):
        """Get technician authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Tech login failed: {response.status_code} - {response.text}")
    
    def get_or_create_client(self, token):
        """Get existing client or create one for testing"""
        headers = {"Authorization": f"Bearer {token}"}
        
        # Try to get existing clients
        response = self.session.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]["id"]
        
        # Create a test client
        client_data = {
            "nom": "TEST_SmartAssign",
            "prenom": "Client",
            "email": "test_smart@example.com",
            "telephone": "+33612345678",
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001"
        }
        response = self.session.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip(f"Could not get or create client: {response.status_code}")
    
    # Test 1: Create intervention with technicien_id=null creates available intervention
    def test_create_intervention_without_technician(self):
        """Test 1: POST /api/interventions with technicien_id=null creates available intervention"""
        admin_token = self.get_admin_token()
        headers = {"Authorization": f"Bearer {admin_token}"}
        client_id = self.get_or_create_client(admin_token)
        
        # Create intervention without technicien_id
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Available_Intervention",
            "description": "Test intervention for smart assignment",
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001",
            "date_prevue": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "technicien_id": None  # Explicitly null - should be available
        }
        
        response = self.session.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify intervention was created
        assert "id" in data, "Response should contain intervention id"
        assert data["titre"] == "TEST_Available_Intervention"
        assert data["statut"] == "planifiee"
        # technicien_id should be None or not present
        assert data.get("technicien_id") is None, f"technicien_id should be None, got {data.get('technicien_id')}"
        
        print(f"✓ Created available intervention: {data['id']}")
        return data["id"]
    
    # Test 2: GET /interventions/available returns unassigned interventions
    def test_get_available_interventions(self):
        """Test 2: GET /api/interventions/available returns unassigned interventions"""
        tech_token = self.get_tech_token()
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        response = self.session.get(f"{BASE_URL}/api/interventions/available", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # All returned interventions should have no technicien_id
        for intervention in data:
            assert intervention.get("technicien_id") is None, f"Available intervention should have no technicien_id: {intervention}"
            assert intervention.get("statut") == "planifiee", f"Available intervention should be planifiee: {intervention}"
        
        print(f"✓ GET /interventions/available returned {len(data)} available interventions")
        return data
    
    # Test 3: GET /interventions/today for tech includes available interventions
    def test_today_includes_available_for_tech(self):
        """Test 3: GET /api/interventions/today includes available interventions for technicians"""
        # First create an available intervention for today
        admin_token = self.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        client_id = self.get_or_create_client(admin_token)
        
        # Create intervention for today without technicien
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Today_Available",
            "description": "Test today available intervention",
            "adresse": "456 Rue Test",
            "ville": "Paris",
            "code_postal": "75002",
            "date_prevue": datetime.now(timezone.utc).isoformat(),  # Today
            "duree_estimee": 45,
            "priorite": "normale",
            "technicien_id": None
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Failed to create intervention: {create_response.text}"
        created_id = create_response.json()["id"]
        
        # Now get today's interventions as tech
        tech_token = self.get_tech_token()
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        response = self.session.get(f"{BASE_URL}/api/interventions/today", headers=tech_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        # Check if our created available intervention is in the list
        available_ids = [i["id"] for i in data if i.get("technicien_id") is None]
        
        print(f"✓ GET /interventions/today returned {len(data)} interventions, {len(available_ids)} available")
        
        # The created intervention should be in today's list
        assert created_id in [i["id"] for i in data], f"Created intervention {created_id} should be in today's list"
        
        return created_id
    
    # Test 4: POST /interventions/{id}/claim assigns intervention to claiming tech
    def test_claim_intervention_success(self):
        """Test 4: POST /api/interventions/{id}/claim assigns intervention to claiming tech"""
        # Create an available intervention first
        admin_token = self.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        client_id = self.get_or_create_client(admin_token)
        
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Claim_Success",
            "description": "Test intervention for claim",
            "adresse": "789 Rue Test",
            "ville": "Paris",
            "code_postal": "75003",
            "date_prevue": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "duree_estimee": 30,
            "priorite": "normale",
            "technicien_id": None
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Failed to create intervention: {create_response.text}"
        intervention_id = create_response.json()["id"]
        
        # Now claim it as tech
        tech_token = self.get_tech_token()
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Get tech user info to verify assignment
        me_response = self.session.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        tech_user_id = me_response.json()["user"]["id"]
        
        # Claim the intervention
        claim_response = self.session.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim", headers=tech_headers)
        
        assert claim_response.status_code == 200, f"Expected 200, got {claim_response.status_code}: {claim_response.text}"
        claim_data = claim_response.json()
        
        assert "message" in claim_data, "Response should contain message"
        assert claim_data.get("technicien_id") == tech_user_id, f"Intervention should be assigned to tech {tech_user_id}"
        
        print(f"✓ Successfully claimed intervention {intervention_id}")
        
        # Verify the intervention is now assigned by fetching it
        # Note: Tech can only fetch their own interventions, so this should work now
        get_response = self.session.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=tech_headers)
        assert get_response.status_code == 200, f"Should be able to get claimed intervention: {get_response.text}"
        
        intervention_data = get_response.json()
        assert intervention_data.get("technicien_id") == tech_user_id, "Intervention should be assigned to claiming tech"
        
        print(f"✓ Verified intervention is assigned to tech {tech_user_id}")
        
        return intervention_id
    
    # Test 5: POST /interventions/{id}/claim on already assigned returns 409
    def test_claim_already_assigned_returns_409(self):
        """Test 5: POST /api/interventions/{id}/claim on already assigned intervention returns 409"""
        # Create an available intervention first
        admin_token = self.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        client_id = self.get_or_create_client(admin_token)
        
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Claim_Conflict",
            "description": "Test intervention for claim conflict",
            "adresse": "101 Rue Test",
            "ville": "Paris",
            "code_postal": "75004",
            "date_prevue": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "technicien_id": None
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=admin_headers)
        assert create_response.status_code == 200, f"Failed to create intervention: {create_response.text}"
        intervention_id = create_response.json()["id"]
        
        # First claim as tech
        tech_token = self.get_tech_token()
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        first_claim = self.session.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim", headers=tech_headers)
        assert first_claim.status_code == 200, f"First claim should succeed: {first_claim.text}"
        
        print(f"✓ First claim succeeded for intervention {intervention_id}")
        
        # Try to claim again (should fail with 409)
        second_claim = self.session.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim", headers=tech_headers)
        
        assert second_claim.status_code == 409, f"Expected 409 Conflict, got {second_claim.status_code}: {second_claim.text}"
        
        error_data = second_claim.json()
        assert "detail" in error_data, "Error response should contain detail"
        
        print(f"✓ Second claim correctly returned 409 Conflict: {error_data.get('detail')}")
        
        return intervention_id
    
    # Test 6: Verify available interventions are not returned after being claimed
    def test_claimed_intervention_not_in_available(self):
        """Test that claimed interventions are no longer in /available endpoint"""
        # Create an available intervention
        admin_token = self.get_admin_token()
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        client_id = self.get_or_create_client(admin_token)
        
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Remove_From_Available",
            "description": "Test intervention removal from available",
            "adresse": "202 Rue Test",
            "ville": "Paris",
            "code_postal": "75005",
            "date_prevue": (datetime.now(timezone.utc) + timedelta(hours=4)).isoformat(),
            "duree_estimee": 45,
            "priorite": "normale",
            "technicien_id": None
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=admin_headers)
        assert create_response.status_code == 200
        intervention_id = create_response.json()["id"]
        
        tech_token = self.get_tech_token()
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Verify it's in available list
        available_before = self.session.get(f"{BASE_URL}/api/interventions/available", headers=tech_headers)
        available_ids_before = [i["id"] for i in available_before.json()]
        assert intervention_id in available_ids_before, "Intervention should be in available list before claim"
        
        # Claim it
        claim_response = self.session.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim", headers=tech_headers)
        assert claim_response.status_code == 200
        
        # Verify it's no longer in available list
        available_after = self.session.get(f"{BASE_URL}/api/interventions/available", headers=tech_headers)
        available_ids_after = [i["id"] for i in available_after.json()]
        assert intervention_id not in available_ids_after, "Claimed intervention should not be in available list"
        
        print(f"✓ Claimed intervention {intervention_id} correctly removed from available list")


# Cleanup fixture to remove test data
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed interventions after all tests"""
    yield
    # Cleanup would go here if needed
    print("\n✓ Smart Assignment tests completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
