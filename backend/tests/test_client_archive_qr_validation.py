"""
Test Client Archive/Restore/Permanent Delete and QR Validation Features
Iteration 40 - ACTOOS PRO

Features tested:
1. DELETE /api/clients/{id} - Archives client (soft delete)
2. POST /api/clients/{id}/restore - Restores archived client
3. DELETE /api/clients/{id}/permanent - Permanently deletes client (requires archived first)
4. GET /api/clients?archived_only=true - Lists only archived clients
5. GET /api/clients/archived/count - Returns count of archived clients
6. GET /api/entreprise/qr-validation - Validates company info for QR code
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClientArchiveFeatures:
    """Test client archive, restore, and permanent delete functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.test_client_id = None
        yield
        
        # Cleanup: Try to delete test client if created
        if self.test_client_id:
            try:
                # First archive it
                self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}")
                # Then permanently delete
                self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}/permanent")
            except:
                pass
    
    def test_01_create_test_client(self):
        """Create a test client for archive testing"""
        unique_id = str(uuid.uuid4())[:8]
        client_data = {
            "nom": f"TEST_Archive_{unique_id}",
            "prenom": "TestClient",
            "email": f"test_archive_{unique_id}@test.com",
            "telephone": "0612345678",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001",
            "type_client": "particulier"
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["nom"] == client_data["nom"]
        assert data.get("archived") == False, "New client should not be archived"
        
        self.test_client_id = data["id"]
        print(f"✓ Created test client: {self.test_client_id}")
        return data["id"]
    
    def test_02_archive_client(self):
        """Test archiving a client (soft delete)"""
        # First create a client
        client_id = self.test_01_create_test_client()
        
        # Archive the client
        response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        assert response.status_code == 200, f"Failed to archive client: {response.text}"
        
        data = response.json()
        assert data.get("archived") == True, "Response should indicate client is archived"
        assert "message" in data
        print(f"✓ Client archived successfully: {data.get('message')}")
        
        # Verify client is now archived by fetching it
        get_response = self.session.get(f"{BASE_URL}/api/clients/{client_id}")
        assert get_response.status_code == 200
        client_data = get_response.json()
        assert client_data.get("archived") == True, "Client should be marked as archived"
        print(f"✓ Verified client is archived")
    
    def test_03_list_archived_clients(self):
        """Test listing only archived clients"""
        # Create and archive a client first
        client_id = self.test_01_create_test_client()
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        
        # List archived clients only
        response = self.session.get(f"{BASE_URL}/api/clients", params={"archived_only": True})
        assert response.status_code == 200, f"Failed to list archived clients: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All returned clients should be archived
        for client in data:
            assert client.get("archived") == True, f"Client {client.get('id')} should be archived"
        
        print(f"✓ Listed {len(data)} archived clients")
    
    def test_04_archived_count(self):
        """Test getting count of archived clients"""
        response = self.session.get(f"{BASE_URL}/api/clients/archived/count")
        assert response.status_code == 200, f"Failed to get archived count: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain 'count' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert data["count"] >= 0, "Count should be non-negative"
        
        print(f"✓ Archived clients count: {data['count']}")
    
    def test_05_restore_client(self):
        """Test restoring an archived client"""
        # Create and archive a client
        client_id = self.test_01_create_test_client()
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        
        # Restore the client
        response = self.session.post(f"{BASE_URL}/api/clients/{client_id}/restore")
        assert response.status_code == 200, f"Failed to restore client: {response.text}"
        
        data = response.json()
        assert data.get("archived") == False, "Response should indicate client is not archived"
        print(f"✓ Client restored successfully: {data.get('message')}")
        
        # Verify client is no longer archived
        get_response = self.session.get(f"{BASE_URL}/api/clients/{client_id}")
        assert get_response.status_code == 200
        client_data = get_response.json()
        assert client_data.get("archived") == False, "Client should not be archived after restore"
        print(f"✓ Verified client is restored")
    
    def test_06_restore_non_archived_client_fails(self):
        """Test that restoring a non-archived client fails"""
        # Create a client (not archived)
        client_id = self.test_01_create_test_client()
        
        # Try to restore (should fail)
        response = self.session.post(f"{BASE_URL}/api/clients/{client_id}/restore")
        assert response.status_code == 400, f"Should fail to restore non-archived client: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Correctly rejected restore of non-archived client: {data.get('detail')}")
    
    def test_07_permanent_delete_requires_archive(self):
        """Test that permanent delete requires client to be archived first"""
        # Create a client (not archived)
        client_id = self.test_01_create_test_client()
        
        # Try to permanently delete (should fail)
        response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}/permanent")
        assert response.status_code == 400, f"Should fail to permanently delete non-archived client: {response.text}"
        
        data = response.json()
        assert "detail" in data
        print(f"✓ Correctly rejected permanent delete of non-archived client: {data.get('detail')}")
    
    def test_08_permanent_delete_archived_client(self):
        """Test permanently deleting an archived client"""
        # Create and archive a client
        client_id = self.test_01_create_test_client()
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        
        # Permanently delete
        response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}/permanent")
        assert response.status_code == 200, f"Failed to permanently delete client: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "deleted_data" in data, "Response should contain deleted_data summary"
        print(f"✓ Client permanently deleted: {data.get('message')}")
        print(f"  Deleted data: {data.get('deleted_data')}")
        
        # Verify client no longer exists
        get_response = self.session.get(f"{BASE_URL}/api/clients/{client_id}")
        assert get_response.status_code == 404, "Client should not exist after permanent delete"
        print(f"✓ Verified client no longer exists")
        
        # Clear test_client_id since it's deleted
        self.test_client_id = None
    
    def test_09_active_clients_exclude_archived(self):
        """Test that active clients list excludes archived clients"""
        # Create and archive a client
        unique_id = str(uuid.uuid4())[:8]
        client_data = {
            "nom": f"TEST_ExcludeArchived_{unique_id}",
            "prenom": "Test",
            "email": f"test_exclude_{unique_id}@test.com",
            "telephone": "0612345678",
            "type_client": "particulier"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = create_response.json()["id"]
        self.test_client_id = client_id
        
        # Archive the client
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        
        # List active clients (default, no archived_only param)
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        
        data = response.json()
        client_ids = [c["id"] for c in data]
        
        # Archived client should not be in active list
        assert client_id not in client_ids, "Archived client should not appear in active clients list"
        print(f"✓ Archived client correctly excluded from active clients list")


class TestQRValidation:
    """Test QR code validation endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_01_qr_validation_endpoint(self):
        """Test QR validation endpoint returns proper structure"""
        response = self.session.get(f"{BASE_URL}/api/entreprise/qr-validation")
        assert response.status_code == 200, f"Failed to get QR validation: {response.text}"
        
        data = response.json()
        
        # Check required fields in response
        assert "is_valid" in data, "Response should contain 'is_valid'"
        assert "missing_required" in data, "Response should contain 'missing_required'"
        assert "missing_recommended" in data, "Response should contain 'missing_recommended'"
        assert "message" in data, "Response should contain 'message'"
        assert "can_generate_qr" in data, "Response should contain 'can_generate_qr'"
        assert "entreprise_data" in data, "Response should contain 'entreprise_data'"
        
        print(f"✓ QR validation endpoint returns proper structure")
        print(f"  is_valid: {data['is_valid']}")
        print(f"  can_generate_qr: {data['can_generate_qr']}")
        print(f"  missing_required: {data['missing_required']}")
        print(f"  missing_recommended: {data['missing_recommended']}")
    
    def test_02_qr_validation_required_fields(self):
        """Test QR validation checks required fields"""
        response = self.session.get(f"{BASE_URL}/api/entreprise/qr-validation")
        assert response.status_code == 200
        
        data = response.json()
        
        # Required fields should be: nom, email, telephone, adresse, ville, code_postal
        required_field_names = {"nom", "email", "telephone", "adresse", "ville", "code_postal"}
        
        # Check that missing_required contains proper structure
        for missing in data.get("missing_required", []):
            assert "field" in missing, "Missing field should have 'field' key"
            assert "label" in missing, "Missing field should have 'label' key"
            assert missing["field"] in required_field_names, f"Unexpected required field: {missing['field']}"
        
        print(f"✓ QR validation checks correct required fields")
    
    def test_03_qr_validation_recommended_fields(self):
        """Test QR validation checks recommended fields"""
        response = self.session.get(f"{BASE_URL}/api/entreprise/qr-validation")
        assert response.status_code == 200
        
        data = response.json()
        
        # Recommended fields should be: iban, siret
        recommended_field_names = {"iban", "siret"}
        
        # Check that missing_recommended contains proper structure
        for missing in data.get("missing_recommended", []):
            assert "field" in missing, "Missing field should have 'field' key"
            assert "label" in missing, "Missing field should have 'label' key"
            assert missing["field"] in recommended_field_names, f"Unexpected recommended field: {missing['field']}"
        
        print(f"✓ QR validation checks correct recommended fields")
    
    def test_04_qr_validation_entreprise_data(self):
        """Test QR validation returns entreprise data summary"""
        response = self.session.get(f"{BASE_URL}/api/entreprise/qr-validation")
        assert response.status_code == 200
        
        data = response.json()
        entreprise_data = data.get("entreprise_data", {})
        
        # Check entreprise_data structure
        assert "nom" in entreprise_data, "entreprise_data should contain 'nom'"
        assert "email" in entreprise_data, "entreprise_data should contain 'email'"
        assert "has_iban" in entreprise_data, "entreprise_data should contain 'has_iban'"
        assert "has_siret" in entreprise_data, "entreprise_data should contain 'has_siret'"
        
        # has_iban and has_siret should be booleans
        assert isinstance(entreprise_data["has_iban"], bool), "has_iban should be boolean"
        assert isinstance(entreprise_data["has_siret"], bool), "has_siret should be boolean"
        
        print(f"✓ QR validation returns entreprise data summary")
        print(f"  nom: {entreprise_data.get('nom')}")
        print(f"  email: {entreprise_data.get('email')}")
        print(f"  has_iban: {entreprise_data.get('has_iban')}")
        print(f"  has_siret: {entreprise_data.get('has_siret')}")


class TestClientArchiveFullFlow:
    """Test complete archive flow: archive -> check archived list -> restore -> check active list"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with admin credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.test_client_id = None
        yield
        
        # Cleanup
        if self.test_client_id:
            try:
                self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}")
                self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}/permanent")
            except:
                pass
    
    def test_full_archive_restore_flow(self):
        """Test complete archive flow: create -> archive -> verify in archived list -> restore -> verify in active list"""
        unique_id = str(uuid.uuid4())[:8]
        
        # Step 1: Create client
        client_data = {
            "nom": f"TEST_FullFlow_{unique_id}",
            "prenom": "FlowTest",
            "email": f"test_flow_{unique_id}@test.com",
            "telephone": "0612345678",
            "type_client": "particulier"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        assert create_response.status_code == 200
        client_id = create_response.json()["id"]
        self.test_client_id = client_id
        print(f"✓ Step 1: Created client {client_id}")
        
        # Step 2: Verify client is in active list
        active_response = self.session.get(f"{BASE_URL}/api/clients")
        assert active_response.status_code == 200
        active_ids = [c["id"] for c in active_response.json()]
        assert client_id in active_ids, "New client should be in active list"
        print(f"✓ Step 2: Client is in active list")
        
        # Step 3: Archive client
        archive_response = self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        assert archive_response.status_code == 200
        assert archive_response.json().get("archived") == True
        print(f"✓ Step 3: Client archived")
        
        # Step 4: Verify client is NOT in active list
        active_response = self.session.get(f"{BASE_URL}/api/clients")
        assert active_response.status_code == 200
        active_ids = [c["id"] for c in active_response.json()]
        assert client_id not in active_ids, "Archived client should not be in active list"
        print(f"✓ Step 4: Client not in active list")
        
        # Step 5: Verify client IS in archived list
        archived_response = self.session.get(f"{BASE_URL}/api/clients", params={"archived_only": True})
        assert archived_response.status_code == 200
        archived_ids = [c["id"] for c in archived_response.json()]
        assert client_id in archived_ids, "Archived client should be in archived list"
        print(f"✓ Step 5: Client is in archived list")
        
        # Step 6: Restore client
        restore_response = self.session.post(f"{BASE_URL}/api/clients/{client_id}/restore")
        assert restore_response.status_code == 200
        assert restore_response.json().get("archived") == False
        print(f"✓ Step 6: Client restored")
        
        # Step 7: Verify client is back in active list
        active_response = self.session.get(f"{BASE_URL}/api/clients")
        assert active_response.status_code == 200
        active_ids = [c["id"] for c in active_response.json()]
        assert client_id in active_ids, "Restored client should be in active list"
        print(f"✓ Step 7: Client is back in active list")
        
        # Step 8: Verify client is NOT in archived list
        archived_response = self.session.get(f"{BASE_URL}/api/clients", params={"archived_only": True})
        assert archived_response.status_code == 200
        archived_ids = [c["id"] for c in archived_response.json()]
        assert client_id not in archived_ids, "Restored client should not be in archived list"
        print(f"✓ Step 8: Client not in archived list")
        
        print(f"\n✓ FULL ARCHIVE/RESTORE FLOW COMPLETED SUCCESSFULLY")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
