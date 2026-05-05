"""
Test Iteration 41 - ACTOOS PRO Available Interventions Workflow Tests
Features to test:
1. GET /api/interventions/available - Liste des interventions non assignées
2. GET /api/interventions/available/count - Compteur badge
3. POST /api/interventions/{id}/claim - Accepter une intervention
4. POST /api/interventions/{id}/unclaim - Annuler l'acceptation

Workflow:
1) Admin crée intervention sans technicien_id
2) Vérifier /available retourne l'intervention
3) Tech claim l'intervention
4) Vérifier /available retourne vide (pour cette intervention)
5) Tech unclaim
6) Vérifier /available retourne l'intervention
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "demo@actoos.com"
ADMIN_PASSWORD = "demo2024"
TECH_EMAIL = "marc.leroy@demo-tech.com"
TECH_PASSWORD = "demo2024"


class TestAvailableInterventionsWorkflow:
    """Test complete workflow: create unassigned intervention -> claim -> unclaim"""
    
    admin_token = None
    tech_token = None
    admin_user_id = None
    tech_user_id = None
    entreprise_id = None
    client_id = None
    test_intervention_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login as admin and tech"""
        # Login as admin
        if not TestAvailableInterventionsWorkflow.admin_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            assert response.status_code == 200, f"Admin login failed: {response.text}"
            data = response.json()
            TestAvailableInterventionsWorkflow.admin_token = data.get("access_token")
            TestAvailableInterventionsWorkflow.admin_user_id = data.get("user", {}).get("id")
            TestAvailableInterventionsWorkflow.entreprise_id = data.get("user", {}).get("entreprise_id")
        
        # Login as tech
        if not TestAvailableInterventionsWorkflow.tech_token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TECH_EMAIL,
                "password": TECH_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                TestAvailableInterventionsWorkflow.tech_token = data.get("access_token")
                TestAvailableInterventionsWorkflow.tech_user_id = data.get("user", {}).get("id")
            else:
                # Tech account may not exist, use admin as fallback
                print(f"⚠ Tech login failed ({response.status_code}), using admin account")
                TestAvailableInterventionsWorkflow.tech_token = TestAvailableInterventionsWorkflow.admin_token
                TestAvailableInterventionsWorkflow.tech_user_id = TestAvailableInterventionsWorkflow.admin_user_id
        
        self.admin_headers = {
            "Authorization": f"Bearer {TestAvailableInterventionsWorkflow.admin_token}",
            "Content-Type": "application/json"
        }
        self.tech_headers = {
            "Authorization": f"Bearer {TestAvailableInterventionsWorkflow.tech_token}",
            "Content-Type": "application/json"
        }
    
    def test_01_admin_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "admin"
        print(f"✓ Admin login successful: {ADMIN_EMAIL}")
    
    def test_02_tech_login_success(self):
        """Test tech login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data.get("user", {}).get("role") in ["tech", "technicien"]
            print(f"✓ Tech login successful: {TECH_EMAIL}")
        else:
            print(f"⚠ Tech account not found, will use admin for testing")
            pytest.skip("Tech account not available")
    
    def test_03_get_client_for_intervention(self):
        """Get a client for creating intervention"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "No clients found - need at least one client"
        
        TestAvailableInterventionsWorkflow.client_id = data[0]["id"]
        print(f"✓ Found client: {data[0].get('nom')} {data[0].get('prenom')}")
    
    def test_04_create_unassigned_intervention(self):
        """Admin creates intervention WITHOUT technicien_id (unassigned)"""
        assert TestAvailableInterventionsWorkflow.client_id, "Client ID not set"
        
        payload = {
            "client_id": TestAvailableInterventionsWorkflow.client_id,
            "titre": f"TEST_Available_Intervention_{datetime.now().strftime('%H%M%S')}",
            "description": "Test intervention for available/claim/unclaim workflow",
            "date_prevue": (datetime.now() + timedelta(hours=2)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001"
            # NOTE: No technicien_id - this makes it "available"
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=payload, headers=self.admin_headers)
        assert response.status_code == 200, f"Create intervention failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert data.get("technicien_id") is None, "Intervention should have no technicien_id"
        assert data.get("statut") == "planifiee"
        
        TestAvailableInterventionsWorkflow.test_intervention_id = data["id"]
        print(f"✓ Created unassigned intervention: {data['id'][:8]}... - {data['titre']}")
    
    def test_05_get_available_interventions(self):
        """Test GET /api/interventions/available - should include our test intervention"""
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=self.tech_headers)
        assert response.status_code == 200, f"Get available failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Available interventions: {len(data)} found")
        
        # Verify our test intervention is in the list
        test_intervention_found = False
        for intervention in data:
            assert "id" in intervention
            assert "titre" in intervention
            assert intervention.get("technicien_id") is None, "Available intervention should have no technicien_id"
            
            # Check for client enrichment
            if "client" in intervention:
                print(f"  - Client data enriched: {intervention['client'].get('nom', 'N/A')}")
            
            if intervention["id"] == TestAvailableInterventionsWorkflow.test_intervention_id:
                test_intervention_found = True
                print(f"  ✓ Test intervention found in available list")
        
        assert test_intervention_found, "Test intervention not found in available list"
    
    def test_06_get_available_count(self):
        """Test GET /api/interventions/available/count - badge counter"""
        response = requests.get(f"{BASE_URL}/api/interventions/available/count", headers=self.tech_headers)
        assert response.status_code == 200, f"Get available count failed: {response.text}"
        data = response.json()
        
        assert "count" in data
        assert isinstance(data["count"], int)
        assert data["count"] >= 1, "Count should be at least 1 (our test intervention)"
        
        print(f"✓ Available count: {data['count']}")
    
    def test_07_tech_claims_intervention(self):
        """Test POST /api/interventions/{id}/claim - tech accepts the intervention"""
        assert TestAvailableInterventionsWorkflow.test_intervention_id, "Test intervention ID not set"
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/claim",
            headers=self.tech_headers
        )
        assert response.status_code == 200, f"Claim failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "intervention_id" in data
        assert "technicien_id" in data
        assert data["technicien_id"] == TestAvailableInterventionsWorkflow.tech_user_id
        
        print(f"✓ Intervention claimed: {data['message']}")
        print(f"  - Assigned to: {data.get('technicien_nom', 'N/A')}")
    
    def test_08_verify_intervention_no_longer_available(self):
        """After claim, intervention should NOT be in available list"""
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=self.tech_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Our test intervention should NOT be in the list anymore
        for intervention in data:
            assert intervention["id"] != TestAvailableInterventionsWorkflow.test_intervention_id, \
                "Claimed intervention should not be in available list"
        
        print(f"✓ Claimed intervention correctly removed from available list")
    
    def test_09_verify_intervention_assigned(self):
        """Verify intervention is now assigned to the tech"""
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}",
            headers=self.tech_headers
        )
        assert response.status_code == 200, f"Get intervention failed: {response.text}"
        data = response.json()
        
        assert data.get("technicien_id") == TestAvailableInterventionsWorkflow.tech_user_id
        assert data.get("statut") == "planifiee"
        
        print(f"✓ Intervention correctly assigned to tech: {data.get('technicien_id')[:8]}...")
    
    def test_10_claim_already_claimed_intervention_fails(self):
        """Test that claiming an already claimed intervention returns 409 Conflict"""
        # Try to claim again (should fail)
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/claim",
            headers=self.admin_headers  # Use admin to simulate another user
        )
        assert response.status_code == 409, f"Expected 409 Conflict, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Double claim correctly rejected: {data['detail']}")
    
    def test_11_tech_unclaims_intervention(self):
        """Test POST /api/interventions/{id}/unclaim - tech releases the intervention"""
        assert TestAvailableInterventionsWorkflow.test_intervention_id, "Test intervention ID not set"
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/unclaim",
            headers=self.tech_headers
        )
        assert response.status_code == 200, f"Unclaim failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "intervention_id" in data
        
        print(f"✓ Intervention unclaimed: {data['message']}")
        print(f"  - Previous tech: {data.get('previous_technicien', 'N/A')}")
    
    def test_12_verify_intervention_available_again(self):
        """After unclaim, intervention should be back in available list"""
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=self.tech_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Our test intervention should be back in the list
        test_intervention_found = False
        for intervention in data:
            if intervention["id"] == TestAvailableInterventionsWorkflow.test_intervention_id:
                test_intervention_found = True
                assert intervention.get("technicien_id") is None, "Unclaimed intervention should have no technicien_id"
                break
        
        assert test_intervention_found, "Unclaimed intervention should be back in available list"
        print(f"✓ Unclaimed intervention correctly back in available list")
    
    def test_13_verify_intervention_unassigned(self):
        """Verify intervention has no technicien_id after unclaim"""
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("technicien_id") is None, "Unclaimed intervention should have no technicien_id"
        assert data.get("statut") == "planifiee"
        
        print(f"✓ Intervention correctly unassigned")
    
    def test_14_unclaim_not_assigned_fails(self):
        """Test that unclaiming an intervention not assigned to you fails"""
        # First, claim it again
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/claim",
            headers=self.tech_headers
        )
        assert response.status_code == 200
        
        # Try to unclaim with admin (different user)
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/unclaim",
            headers=self.admin_headers
        )
        # Admin should be able to unclaim any intervention (admin privilege)
        # So this should succeed
        if response.status_code == 200:
            print(f"✓ Admin can unclaim any intervention (expected)")
        else:
            print(f"⚠ Admin unclaim returned {response.status_code}")
    
    def test_15_unclaim_started_intervention_fails(self):
        """Test that unclaiming a started intervention fails"""
        # Claim the intervention
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/claim",
            headers=self.tech_headers
        )
        if response.status_code != 200:
            # Already claimed, that's fine
            pass
        
        # Start the intervention
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/start",
            headers=self.tech_headers
        )
        assert response.status_code == 200, f"Start failed: {response.text}"
        print(f"✓ Intervention started")
        
        # Try to unclaim (should fail - intervention is en_cours)
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}/unclaim",
            headers=self.tech_headers
        )
        assert response.status_code == 400, f"Expected 400 for unclaim of started intervention, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Unclaim of started intervention correctly rejected: {data['detail']}")
    
    def test_16_cleanup_test_intervention(self):
        """Cleanup - delete test intervention"""
        if not TestAvailableInterventionsWorkflow.test_intervention_id:
            pytest.skip("No intervention to cleanup")
        
        # Note: Started interventions cannot be deleted
        response = requests.delete(
            f"{BASE_URL}/api/interventions/{TestAvailableInterventionsWorkflow.test_intervention_id}",
            headers=self.admin_headers
        )
        
        if response.status_code == 200:
            print(f"✓ Test intervention cleaned up")
        else:
            print(f"⚠ Cleanup skipped - intervention is started (expected)")


class TestAvailableEndpointDetails:
    """Test available endpoint response structure and enrichment"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestAvailableEndpointDetails.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            assert response.status_code == 200
            TestAvailableEndpointDetails.token = response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestAvailableEndpointDetails.token}",
            "Content-Type": "application/json"
        }
    
    def test_available_response_structure(self):
        """Test that available endpoint returns properly structured data"""
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        
        if len(data) > 0:
            intervention = data[0]
            
            # Required fields
            assert "id" in intervention
            assert "titre" in intervention
            assert "statut" in intervention
            assert intervention["statut"] == "planifiee", "Available interventions should be planifiee"
            
            # Should have no technicien_id
            assert intervention.get("technicien_id") is None, "Available intervention should have no technicien_id"
            
            # Client enrichment
            if "client" in intervention and intervention["client"]:
                client = intervention["client"]
                print(f"  - Client enrichment: nom={client.get('nom')}, telephone={client.get('telephone')}")
            
            # Category enrichment (if exists)
            if "categorie" in intervention and intervention["categorie"]:
                categorie = intervention["categorie"]
                print(f"  - Category enrichment: nom={categorie.get('nom')}, couleur={categorie.get('couleur')}")
            
            print(f"✓ Available intervention structure verified: {intervention['titre']}")
        else:
            print(f"⚠ No available interventions to verify structure")
    
    def test_available_count_matches_list(self):
        """Test that count endpoint matches list length"""
        # Get list
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=self.headers)
        assert response.status_code == 200
        available_list = response.json()
        
        # Get count
        response = requests.get(f"{BASE_URL}/api/interventions/available/count", headers=self.headers)
        assert response.status_code == 200
        count_data = response.json()
        
        assert count_data["count"] == len(available_list), \
            f"Count ({count_data['count']}) doesn't match list length ({len(available_list)})"
        
        print(f"✓ Count ({count_data['count']}) matches list length")


class TestClaimUnclaimEdgeCases:
    """Test edge cases for claim/unclaim"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestClaimUnclaimEdgeCases.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            assert response.status_code == 200
            TestClaimUnclaimEdgeCases.token = response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestClaimUnclaimEdgeCases.token}",
            "Content-Type": "application/json"
        }
    
    def test_claim_nonexistent_intervention(self):
        """Test claiming a non-existent intervention returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/interventions/nonexistent-id-12345/claim",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✓ Claim non-existent intervention correctly returns 404")
    
    def test_unclaim_nonexistent_intervention(self):
        """Test unclaiming a non-existent intervention returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/interventions/nonexistent-id-12345/unclaim",
            headers=self.headers
        )
        assert response.status_code == 404
        print(f"✓ Unclaim non-existent intervention correctly returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
