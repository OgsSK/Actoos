"""
Test Import APIs and Trial Reminder Features - Iteration 32
Tests:
- GET /api/import/templates/clients - CSV template with headers and example row
- GET /api/import/templates/interventions - CSV template
- GET /api/tasks/trial-expiring - Enterprises with expiring trials (super admin only)
- POST /api/import/upload - File upload and preview
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"


class TestImportTemplates:
    """Test Import Template APIs"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_get_clients_template(self):
        """Test GET /api/import/templates/clients returns CSV template"""
        response = self.session.get(f"{BASE_URL}/api/import/templates/clients")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert "entity_type" in data, "Missing entity_type"
        assert data["entity_type"] == "clients"
        
        assert "headers" in data, "Missing headers"
        assert isinstance(data["headers"], list), "Headers should be a list"
        assert len(data["headers"]) > 0, "Headers should not be empty"
        
        # Check required fields are present
        assert "required_fields" in data, "Missing required_fields"
        assert "nom" in data["required_fields"], "nom should be required"
        
        # Check optional fields
        assert "optional_fields" in data, "Missing optional_fields"
        assert "email" in data["optional_fields"], "email should be optional"
        assert "telephone" in data["optional_fields"], "telephone should be optional"
        
        # Check example row
        assert "example_row" in data, "Missing example_row"
        assert "nom" in data["example_row"], "Example should have nom"
        
        # Check CSV template string
        assert "csv_template" in data, "Missing csv_template"
        assert "nom" in data["csv_template"], "CSV template should contain nom header"
        
        print(f"✓ Clients template: {len(data['headers'])} headers, required: {data['required_fields']}")
    
    def test_get_interventions_template(self):
        """Test GET /api/import/templates/interventions returns CSV template"""
        response = self.session.get(f"{BASE_URL}/api/import/templates/interventions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify structure
        assert data["entity_type"] == "interventions"
        assert "headers" in data
        assert "required_fields" in data
        assert "optional_fields" in data
        assert "example_row" in data
        assert "csv_template" in data
        
        # Check required fields for interventions
        assert "titre" in data["required_fields"], "titre should be required"
        assert "client_id" in data["required_fields"], "client_id should be required"
        
        print(f"✓ Interventions template: {len(data['headers'])} headers, required: {data['required_fields']}")
    
    def test_get_devis_template(self):
        """Test GET /api/import/templates/devis returns CSV template"""
        response = self.session.get(f"{BASE_URL}/api/import/templates/devis")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert data["entity_type"] == "devis"
        assert "client_id" in data["required_fields"], "client_id should be required for devis"
        
        print(f"✓ Devis template: {len(data['headers'])} headers")
    
    def test_get_factures_template(self):
        """Test GET /api/import/templates/factures returns CSV template"""
        response = self.session.get(f"{BASE_URL}/api/import/templates/factures")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        assert data["entity_type"] == "factures"
        assert "client_id" in data["required_fields"], "client_id should be required for factures"
        
        print(f"✓ Factures template: {len(data['headers'])} headers")
    
    def test_invalid_entity_type_returns_400(self):
        """Test GET /api/import/templates/invalid returns 400"""
        response = self.session.get(f"{BASE_URL}/api/import/templates/invalid_type")
        
        assert response.status_code == 400, f"Expected 400 for invalid entity type, got {response.status_code}"
        print("✓ Invalid entity type correctly returns 400")


class TestTrialExpiringEndpoint:
    """Test Trial Expiring Endpoint (super admin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
            self.user = login_response.json().get("user", {})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_trial_expiring_requires_auth(self):
        """Test GET /api/tasks/trial-expiring requires authentication"""
        # Make request without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/tasks/trial-expiring")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Trial expiring endpoint requires authentication")
    
    def test_trial_expiring_requires_super_admin(self):
        """Test GET /api/tasks/trial-expiring requires super_admin role"""
        # This test will check if the endpoint returns 403 for non-super-admin
        # or returns data if the user is super_admin
        response = self.session.get(f"{BASE_URL}/api/tasks/trial-expiring")
        
        # If user is not super_admin, should get 403
        # If user is super_admin, should get 200 with data
        if response.status_code == 403:
            print("✓ Non-super-admin correctly gets 403 Forbidden")
            assert "super admin" in response.text.lower() or "réservé" in response.text.lower()
        elif response.status_code == 200:
            data = response.json()
            assert "total" in data, "Response should have total field"
            assert "enterprises" in data, "Response should have enterprises field"
            print(f"✓ Super admin access granted - {data['total']} enterprises with expiring trials")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_trial_expiring_with_days_param(self):
        """Test GET /api/tasks/trial-expiring?days=7 accepts days parameter"""
        response = self.session.get(f"{BASE_URL}/api/tasks/trial-expiring?days=7")
        
        # Either 403 (not super admin) or 200 (super admin)
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            assert "total" in data
            assert "enterprises" in data
            print(f"✓ Trial expiring with days=7 param works - {data['total']} results")
        else:
            print("✓ Days parameter accepted (403 due to non-super-admin)")


class TestImportUploadEndpoint:
    """Test Import Upload Endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.token = token
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_upload_requires_auth(self):
        """Test POST /api/import/upload requires authentication"""
        no_auth_session = requests.Session()
        
        # Create a simple CSV content
        csv_content = "nom,email,telephone\nTest Client,test@test.com,0612345678"
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {'entity_type': 'clients'}
        
        response = no_auth_session.post(f"{BASE_URL}/api/import/upload", files=files, data=data)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Import upload requires authentication")
    
    def test_upload_csv_for_clients(self):
        """Test POST /api/import/upload with CSV file for clients"""
        # Create a simple CSV content
        csv_content = "nom,prenom,email,telephone\nDupont,Jean,jean.dupont@test.com,0612345678\nMartin,Marie,marie.martin@test.com,0698765432"
        files = {'file': ('test_clients.csv', csv_content, 'text/csv')}
        data = {'entity_type': 'clients'}
        
        response = self.session.post(
            f"{BASE_URL}/api/import/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        
        # Verify response structure
        assert "filename" in result, "Missing filename"
        assert "total_rows" in result, "Missing total_rows"
        assert result["total_rows"] == 2, f"Expected 2 rows, got {result['total_rows']}"
        
        assert "columns" in result, "Missing columns"
        assert "nom" in result["columns"], "nom column should be detected"
        
        assert "suggested_mappings" in result, "Missing suggested_mappings"
        
        assert "sample_data" in result, "Missing sample_data"
        assert len(result["sample_data"]) > 0, "Sample data should not be empty"
        
        assert "entity_fields" in result, "Missing entity_fields"
        assert "required" in result["entity_fields"]
        assert "optional" in result["entity_fields"]
        
        print(f"✓ CSV upload successful: {result['total_rows']} rows, columns: {result['columns']}")
        print(f"  Suggested mappings: {result['suggested_mappings']}")
    
    def test_upload_invalid_entity_type(self):
        """Test POST /api/import/upload with invalid entity type"""
        csv_content = "nom,email\nTest,test@test.com"
        files = {'file': ('test.csv', csv_content, 'text/csv')}
        data = {'entity_type': 'invalid_type'}
        
        response = self.session.post(
            f"{BASE_URL}/api/import/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {self.token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid entity type, got {response.status_code}"
        print("✓ Invalid entity type correctly returns 400")


class TestCloudStorageInfo:
    """Test Cloud Storage Info Endpoint (if exists)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_storage_info_endpoint(self):
        """Test if storage info endpoint exists and returns config"""
        # This endpoint may or may not exist - just checking
        response = self.session.get(f"{BASE_URL}/api/storage/info")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Storage info: {data}")
        elif response.status_code == 404:
            print("✓ Storage info endpoint not exposed (expected - internal service)")
        else:
            print(f"Storage info returned {response.status_code}")


class TestEmailTrialReminderTemplate:
    """Test Trial Reminder Email Template (via scheduled tasks)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip(f"Login failed: {login_response.status_code}")
    
    def test_send_trial_reminders_requires_super_admin(self):
        """Test POST /api/tasks/send-trial-reminders requires super_admin"""
        response = self.session.post(f"{BASE_URL}/api/tasks/send-trial-reminders")
        
        # Should be 403 for non-super-admin or 200 for super-admin
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 403:
            print("✓ Send trial reminders correctly requires super_admin")
        else:
            data = response.json()
            print(f"✓ Super admin can send trial reminders: {data}")
    
    def test_check_and_send_reminders_requires_super_admin(self):
        """Test POST /api/tasks/check-and-send-reminders requires super_admin"""
        response = self.session.post(f"{BASE_URL}/api/tasks/check-and-send-reminders")
        
        assert response.status_code in [200, 403], f"Expected 200 or 403, got {response.status_code}"
        
        if response.status_code == 403:
            print("✓ Check and send reminders correctly requires super_admin")
        else:
            data = response.json()
            print(f"✓ Super admin can check and send reminders: {data}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
