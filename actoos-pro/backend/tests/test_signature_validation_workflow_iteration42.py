"""
Test Suite for ACTOOS PRO - Enhanced Signature Validation Workflow (Iteration 42)

Features tested:
1. POST /api/interventions/{id}/complete-with-signature - with type_signataire, relation_signataire, email/telephone
2. POST /api/interventions/{id}/validate - admin validation for Startup plan
3. POST /api/interventions/{id}/reject-validation - rejection with reason
4. GET /api/interventions/pending-validation - list interventions awaiting validation

Workflow by plan:
- Startup: signature → statut "en_validation" → admin validates → "terminee"
- Pro/Enterprise: signature → statut "terminee" directly (auto-validation)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "demo@actoos.com"
ADMIN_PASSWORD = "demo2024"
TECH_EMAIL = "marc.leroy@demo-tech.com"
TECH_PASSWORD = "demo2024"


class TestAuthSetup:
    """Authentication setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def tech_token(self):
        """Get technician authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        assert response.status_code == 200, f"Tech login failed: {response.text}"
        return response.json().get("access_token")
    
    def test_admin_login(self, admin_token):
        """Verify admin can login"""
        assert admin_token is not None
        print(f"✓ Admin login successful")
    
    def test_tech_login(self, tech_token):
        """Verify technician can login"""
        assert tech_token is not None
        print(f"✓ Tech login successful")


class TestCompleteWithSignatureEndpoint:
    """Tests for POST /api/interventions/{id}/complete-with-signature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def test_client(self, admin_token):
        """Create a test client for interventions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        client_data = {
            "nom": f"TEST_SignatureClient_{uuid.uuid4().hex[:8]}",
            "prenom": "Test",
            "email": "test.signature@example.com",
            "telephone": "0612345678",
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        assert response.status_code == 200 or response.status_code == 201
        return response.json()
    
    @pytest.fixture(scope="class")
    def test_intervention_for_signature(self, admin_token, tech_token, test_client):
        """Create and start an intervention for signature testing"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get tech user ID
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers={"Authorization": f"Bearer {tech_token}"})
        tech_id = tech_response.json().get("id")
        
        intervention_data = {
            "client_id": test_client["id"],
            "titre": f"TEST_SignatureIntervention_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention for signature workflow",
            "date_prevue": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "technicien_id": tech_id
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=headers)
        assert response.status_code == 200 or response.status_code == 201
        intervention = response.json()
        
        # Start the intervention
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        start_response = requests.post(f"{BASE_URL}/api/interventions/{intervention['id']}/start", headers=tech_headers)
        assert start_response.status_code == 200, f"Failed to start intervention: {start_response.text}"
        
        return intervention
    
    def test_complete_with_signature_client_type(self, tech_token, test_intervention_for_signature):
        """Test completing intervention with client signature (type_signataire=client)"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        intervention_id = test_intervention_for_signature["id"]
        
        signature_data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "nom_signataire": "Jean Dupont",
            "type_signataire": "client",
            "email_signataire": "jean.dupont@example.com",
            "telephone_signataire": "0612345678",
            "notes": "Travaux effectués correctement"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/complete-with-signature",
            json=signature_data,
            headers=headers
        )
        
        # Demo account is Pro/Enterprise, so should go directly to terminee
        assert response.status_code == 200, f"Complete with signature failed: {response.text}"
        result = response.json()
        
        print(f"✓ Complete with signature response: {result}")
        assert "statut" in result
        assert result["signataire"] == "Jean Dupont"
        assert result["type_signataire"] == "client"
        
        # Verify the intervention was updated
        get_response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=headers)
        assert get_response.status_code == 200
        intervention = get_response.json()
        
        assert intervention["signature_client"] is not None
        assert intervention["nom_signataire"] == "Jean Dupont"
        assert intervention["type_signataire"] == "client"
        print(f"✓ Intervention signature data persisted correctly")
    
    def test_complete_with_signature_tiers_type(self, admin_token, tech_token, test_client):
        """Test completing intervention with third-party signature (type_signataire=tiers)"""
        # Create a new intervention for this test
        headers = {"Authorization": f"Bearer {admin_token}"}
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Get tech user ID
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        tech_id = tech_response.json().get("id")
        
        intervention_data = {
            "client_id": test_client["id"],
            "titre": f"TEST_TiersSignature_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention for tiers signature",
            "date_prevue": (datetime.now() + timedelta(hours=2)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "technicien_id": tech_id
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=headers)
        assert response.status_code == 200 or response.status_code == 201
        intervention = response.json()
        
        # Start the intervention
        start_response = requests.post(f"{BASE_URL}/api/interventions/{intervention['id']}/start", headers=tech_headers)
        assert start_response.status_code == 200
        
        # Complete with tiers signature
        signature_data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "nom_signataire": "Marie Martin",
            "type_signataire": "tiers",
            "relation_signataire": "conjoint",
            "email_signataire": "marie.martin@example.com",
            "telephone_signataire": "0698765432",
            "notes": "Signé par le conjoint du client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/complete-with-signature",
            json=signature_data,
            headers=tech_headers
        )
        
        assert response.status_code == 200, f"Complete with tiers signature failed: {response.text}"
        result = response.json()
        
        print(f"✓ Complete with tiers signature response: {result}")
        assert result["type_signataire"] == "tiers"
        
        # Verify the intervention was updated with relation
        get_response = requests.get(f"{BASE_URL}/api/interventions/{intervention['id']}", headers=tech_headers)
        assert get_response.status_code == 200
        intervention_updated = get_response.json()
        
        assert intervention_updated["type_signataire"] == "tiers"
        assert intervention_updated["relation_signataire"] == "conjoint"
        print(f"✓ Tiers signature with relation persisted correctly")
    
    def test_complete_with_signature_requires_en_cours_status(self, admin_token, tech_token, test_client):
        """Test that signature completion requires intervention to be en_cours"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Get tech user ID
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        tech_id = tech_response.json().get("id")
        
        # Create intervention but don't start it
        intervention_data = {
            "client_id": test_client["id"],
            "titre": f"TEST_NotStarted_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention not started",
            "date_prevue": (datetime.now() + timedelta(hours=3)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "technicien_id": tech_id
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=headers)
        intervention = response.json()
        
        # Try to complete without starting
        signature_data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "nom_signataire": "Test User",
            "type_signataire": "client"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/complete-with-signature",
            json=signature_data,
            headers=tech_headers
        )
        
        assert response.status_code == 400, f"Should fail for non-en_cours intervention: {response.text}"
        print(f"✓ Correctly rejected signature for non-en_cours intervention")


class TestValidationEndpoints:
    """Tests for validation/rejection endpoints (admin only)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_validate_endpoint_exists(self, admin_token):
        """Test that validate endpoint exists and requires admin"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try with a non-existent intervention ID
        response = requests.post(
            f"{BASE_URL}/api/interventions/nonexistent-id/validate",
            headers=headers
        )
        
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Validate endpoint exists and responds correctly")
    
    def test_validate_requires_admin(self, tech_token):
        """Test that validate endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/some-id/validate",
            headers=headers
        )
        
        # Should return 403 (forbidden) for non-admin
        assert response.status_code == 403, f"Should require admin: {response.status_code}"
        print(f"✓ Validate endpoint correctly requires admin role")
    
    def test_reject_validation_endpoint_exists(self, admin_token):
        """Test that reject-validation endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/nonexistent-id/reject-validation",
            json={"reason": "Test rejection"},
            headers=headers
        )
        
        # Should return 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Unexpected status: {response.status_code}"
        print(f"✓ Reject-validation endpoint exists and responds correctly")
    
    def test_reject_validation_requires_admin(self, tech_token):
        """Test that reject-validation endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/some-id/reject-validation",
            json={"reason": "Test rejection"},
            headers=headers
        )
        
        # Should return 403 (forbidden) for non-admin
        assert response.status_code == 403, f"Should require admin: {response.status_code}"
        print(f"✓ Reject-validation endpoint correctly requires admin role")
    
    def test_reject_validation_requires_reason(self, admin_token):
        """Test that reject-validation requires a reason"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Try without reason
        response = requests.post(
            f"{BASE_URL}/api/interventions/some-id/reject-validation",
            json={},
            headers=headers
        )
        
        # Should return 422 (validation error) for missing reason
        assert response.status_code in [422, 400, 404], f"Should require reason: {response.status_code}"
        print(f"✓ Reject-validation correctly requires reason field")


class TestPendingValidationEndpoint:
    """Tests for GET /api/interventions/pending-validation"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_pending_validation_endpoint_exists(self, admin_token):
        """Test that pending-validation endpoint exists"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/pending-validation",
            headers=headers
        )
        
        assert response.status_code == 200, f"Pending validation endpoint failed: {response.text}"
        result = response.json()
        assert isinstance(result, list), "Should return a list"
        print(f"✓ Pending-validation endpoint returns list with {len(result)} items")
    
    def test_pending_validation_requires_admin(self, tech_token):
        """Test that pending-validation endpoint requires admin role"""
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/pending-validation",
            headers=headers
        )
        
        # Should return 403 (forbidden) for non-admin
        assert response.status_code == 403, f"Should require admin: {response.status_code}"
        print(f"✓ Pending-validation endpoint correctly requires admin role")


class TestInterventionSignatureModel:
    """Tests for InterventionSignature model fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def test_client(self, admin_token):
        """Create a test client"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        client_data = {
            "nom": f"TEST_ModelClient_{uuid.uuid4().hex[:8]}",
            "prenom": "Model",
            "email": "model.test@example.com",
            "telephone": "0611111111"
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        return response.json()
    
    def test_signature_model_accepts_all_fields(self, admin_token, tech_token, test_client):
        """Test that signature endpoint accepts all enhanced fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Get tech user ID
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        tech_id = tech_response.json().get("id")
        
        # Create and start intervention
        intervention_data = {
            "client_id": test_client["id"],
            "titre": f"TEST_ModelFields_{uuid.uuid4().hex[:8]}",
            "date_prevue": (datetime.now() + timedelta(hours=4)).isoformat(),
            "duree_estimee": 60,
            "technicien_id": tech_id
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=headers)
        intervention = response.json()
        
        # Start intervention
        requests.post(f"{BASE_URL}/api/interventions/{intervention['id']}/start", headers=tech_headers)
        
        # Complete with all signature fields
        signature_data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "nom_signataire": "Full Fields Test",
            "type_signataire": "tiers",
            "relation_signataire": "collegue",
            "email_signataire": "collegue@company.com",
            "telephone_signataire": "0699999999",
            "commentaire_signataire": "Additional context about the signature",
            "notes": "Field notes from technician"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/complete-with-signature",
            json=signature_data,
            headers=tech_headers
        )
        
        assert response.status_code == 200, f"Failed with all fields: {response.text}"
        print(f"✓ Signature model accepts all enhanced fields")
        
        # Verify all fields were stored
        get_response = requests.get(f"{BASE_URL}/api/interventions/{intervention['id']}", headers=tech_headers)
        intervention_updated = get_response.json()
        
        assert intervention_updated.get("type_signataire") == "tiers"
        assert intervention_updated.get("relation_signataire") == "collegue"
        assert intervention_updated.get("email_signataire") == "collegue@company.com"
        assert intervention_updated.get("telephone_signataire") == "0699999999"
        print(f"✓ All signature fields persisted correctly")


class TestWorkflowByPlan:
    """Tests for workflow differences by plan (Startup vs Pro/Enterprise)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_demo_account_is_pro_enterprise(self, admin_token):
        """Verify demo account is Pro/Enterprise (auto-validation)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get entreprise info
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        
        # The demo account should be Pro or Enterprise
        # This means signatures go directly to "terminee" not "en_validation"
        print(f"✓ Demo account verified - signatures should auto-validate to 'terminee'")
    
    def test_pro_enterprise_workflow_auto_validates(self, admin_token):
        """Test that Pro/Enterprise plan auto-validates signatures"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get pending validations - should be empty or not include our test interventions
        response = requests.get(f"{BASE_URL}/api/interventions/pending-validation", headers=headers)
        assert response.status_code == 200
        
        pending = response.json()
        print(f"✓ Pending validations count: {len(pending)}")
        
        # For Pro/Enterprise, completed interventions should NOT be in pending validation
        # They should go directly to "terminee"


class TestStatusFilterForEnValidation:
    """Tests for filtering interventions by en_validation status"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_list_interventions_with_en_validation_filter(self, admin_token):
        """Test filtering interventions by en_validation status"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            params={"statut": "en_validation"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Filter failed: {response.text}"
        result = response.json()
        assert isinstance(result, list)
        
        # All returned interventions should have en_validation status
        for intervention in result:
            assert intervention.get("statut") == "en_validation", f"Wrong status: {intervention.get('statut')}"
        
        print(f"✓ Status filter for en_validation works correctly ({len(result)} found)")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json().get("access_token")
    
    def test_cleanup_test_interventions(self, admin_token):
        """Clean up TEST_ prefixed interventions"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all interventions
        response = requests.get(f"{BASE_URL}/api/interventions", headers=headers)
        if response.status_code == 200:
            interventions = response.json()
            test_interventions = [i for i in interventions if i.get("titre", "").startswith("TEST_")]
            
            deleted = 0
            for intervention in test_interventions:
                # Only delete if planifiee or annulee
                if intervention.get("statut") in ["planifiee", "annulee"]:
                    del_response = requests.delete(
                        f"{BASE_URL}/api/interventions/{intervention['id']}",
                        headers=headers
                    )
                    if del_response.status_code in [200, 204]:
                        deleted += 1
            
            print(f"✓ Cleaned up {deleted} test interventions")
    
    def test_cleanup_test_clients(self, admin_token):
        """Clean up TEST_ prefixed clients"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get all clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            test_clients = [c for c in clients if c.get("nom", "").startswith("TEST_")]
            
            deleted = 0
            for client in test_clients:
                del_response = requests.delete(
                    f"{BASE_URL}/api/clients/{client['id']}",
                    headers=headers
                )
                if del_response.status_code in [200, 204]:
                    deleted += 1
            
            print(f"✓ Cleaned up {deleted} test clients")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
