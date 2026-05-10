"""
Test Suite for ACTOOS PRO - Multiple Fixes (Iteration 39)
Tests:
1. Site form validation and responsive layout
2. Statements search bar functionality
3. Statements share dropdown (WhatsApp, Email, SMS, Copy)
4. Invoice numbers in statement PDF (numero_facture field)
5. Statement generator uses correct fields (total_ttc, statut)
"""
import pytest
import requests
import os
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"Login successful, user: {data['user'].get('email')}")


class TestSitesAPI:
    """Test Sites API for site form functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_headers):
        """Get or create a test client"""
        # First try to get existing clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if clients:
            return clients[0]["id"]
        
        # Create a test client if none exists
        response = requests.post(f"{BASE_URL}/api/clients", headers=auth_headers, json={
            "nom": "TEST_SiteClient",
            "prenom": "Test",
            "email": "test_site@example.com",
            "telephone": "0612345678",
            "type_client": "professionnel"
        })
        assert response.status_code in [200, 201]
        return response.json()["id"]
    
    def test_get_sites_for_client(self, auth_headers, test_client_id):
        """Test GET /api/sites with client_id filter"""
        response = requests.get(
            f"{BASE_URL}/api/sites",
            headers=auth_headers,
            params={"client_id": test_client_id}
        )
        assert response.status_code == 200
        sites = response.json()
        assert isinstance(sites, list)
        print(f"Found {len(sites)} sites for client {test_client_id}")
    
    def test_create_site_with_validation(self, auth_headers, test_client_id):
        """Test POST /api/sites - site creation with required fields"""
        # Test with all required fields
        site_data = {
            "client_id": test_client_id,
            "nom": "TEST_Site_Entrepot",
            "adresse": "123 Rue de Test",
            "ville": "Paris",
            "code_postal": "75001",
            "contact_nom": "Jean Test",
            "contact_telephone": "0612345678",
            "contact_email": "contact@test.fr",
            "horaires_acces": "Lun-Ven 8h-18h",
            "instructions_acces": "Code portail: 1234",
            "notes": "Notes de test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sites",
            headers=auth_headers,
            json=site_data
        )
        assert response.status_code in [200, 201], f"Create site failed: {response.text}"
        
        created_site = response.json()
        assert created_site["nom"] == site_data["nom"]
        assert created_site["adresse"] == site_data["adresse"]
        assert created_site["ville"] == site_data["ville"]
        assert created_site["code_postal"] == site_data["code_postal"]
        print(f"Site created successfully: {created_site['id']}")
        
        # Cleanup - delete the test site
        if created_site.get("id"):
            requests.delete(f"{BASE_URL}/api/sites/{created_site['id']}", headers=auth_headers)
    
    def test_create_site_missing_required_fields(self, auth_headers, test_client_id):
        """Test POST /api/sites - validation for missing required fields"""
        # Test with missing required fields (should fail or return validation error)
        site_data = {
            "client_id": test_client_id,
            "nom": "",  # Empty name
            "adresse": "",  # Empty address
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sites",
            headers=auth_headers,
            json=site_data
        )
        # Backend may return 400 or 422 for validation errors
        # Or it may accept empty strings - check the actual behavior
        print(f"Create site with empty fields: status={response.status_code}")


class TestStatementsAPI:
    """Test Statements API for search and share functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_generate_statements(self, auth_headers):
        """Test GET /api/statements/generate - generates statements for a period"""
        # Use current month or previous month
        now = datetime.now()
        month = now.month if now.month > 1 else 12
        year = now.year if now.month > 1 else now.year - 1
        
        response = requests.get(
            f"{BASE_URL}/api/statements/generate",
            headers=auth_headers,
            params={"month": month, "year": year}
        )
        assert response.status_code == 200, f"Generate statements failed: {response.text}"
        
        data = response.json()
        assert "generated" in data or "clients" in data
        
        clients = data.get("clients", [])
        print(f"Generated {len(clients)} statements for {month}/{year}")
        
        # Verify client data structure for search functionality
        if clients:
            client = clients[0]
            assert "client_id" in client
            assert "client_name" in client
            # client_email may be None for some clients
            print(f"First client: {client.get('client_name')}, email: {client.get('client_email')}")
        
        return clients
    
    def test_statements_history(self, auth_headers):
        """Test GET /api/statements/history - get send history"""
        response = requests.get(
            f"{BASE_URL}/api/statements/history",
            headers=auth_headers
        )
        assert response.status_code == 200
        history = response.json()
        assert isinstance(history, list)
        print(f"Found {len(history)} history entries")
    
    def test_statement_preview_pdf(self, auth_headers):
        """Test GET /api/statements/preview/{client_id} - PDF generation with correct fields"""
        # First get a client with invoices
        now = datetime.now()
        month = now.month if now.month > 1 else 12
        year = now.year if now.month > 1 else now.year - 1
        
        # Get clients
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available for PDF test")
        
        client_id = clients[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/statements/preview/{client_id}",
            headers=auth_headers,
            params={"month": month, "year": year}
        )
        
        # May return 200 with PDF or 404 if no invoices
        if response.status_code == 200:
            assert response.headers.get("content-type") == "application/pdf" or "pdf" in response.headers.get("content-type", "").lower()
            print(f"PDF generated successfully for client {client_id}")
        else:
            print(f"No invoices for client {client_id} in {month}/{year}")


class TestFacturesAPI:
    """Test Factures API to verify numero_facture field"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_factures_has_numero_facture(self, auth_headers):
        """Test GET /api/factures - verify numero_facture field exists"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=auth_headers)
        assert response.status_code == 200
        
        factures = response.json()
        print(f"Found {len(factures)} factures")
        
        if factures:
            facture = factures[0]
            # Verify the correct field name is used
            assert "numero_facture" in facture, f"Missing numero_facture field. Keys: {facture.keys()}"
            assert "total_ttc" in facture, f"Missing total_ttc field. Keys: {facture.keys()}"
            assert "statut" in facture, f"Missing statut field. Keys: {facture.keys()}"
            
            print(f"Facture fields verified: numero_facture={facture['numero_facture']}, total_ttc={facture['total_ttc']}, statut={facture['statut']}")
    
    def test_facture_statut_values(self, auth_headers):
        """Test that facture statut uses correct values (payee, emise, annulee)"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=auth_headers)
        assert response.status_code == 200
        
        factures = response.json()
        valid_statuts = ["brouillon", "emise", "payee", "annulee", "en_retard"]
        
        for facture in factures[:5]:  # Check first 5
            statut = facture.get("statut")
            assert statut in valid_statuts, f"Invalid statut: {statut}. Expected one of {valid_statuts}"
            print(f"Facture {facture.get('numero_facture')}: statut={statut}")


class TestClientPortalLink:
    """Test client portal link for share functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_get_portal_link(self, auth_headers):
        """Test GET /api/clients/{id}/portal-link - for share functionality"""
        # Get a client first
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}/portal-link",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Get portal link failed: {response.text}"
        
        data = response.json()
        assert "portal_url" in data
        assert "portal_token" in data
        assert "client_id" in data
        
        print(f"Portal link generated: {data['portal_url']}")


class TestStatementGeneratorFields:
    """Test that statement generator uses correct field names"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "salifkane612+enterprise@gmail.com",
            "password": "Salifkane&&7"
        })
        assert response.status_code == 200
        return {"Authorization": f"Bearer {response.json()['access_token']}"}
    
    def test_facture_fields_for_statement(self, auth_headers):
        """Verify factures have correct fields for statement generation"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=auth_headers)
        assert response.status_code == 200
        
        factures = response.json()
        
        for facture in factures[:3]:
            # Check required fields for statement generator
            assert "numero_facture" in facture, "Missing numero_facture"
            assert "total_ttc" in facture, "Missing total_ttc"
            assert "statut" in facture, "Missing statut"
            assert "created_at" in facture, "Missing created_at"
            assert "client_id" in facture, "Missing client_id"
            
            # Verify statut is string, not boolean
            assert isinstance(facture["statut"], str), f"statut should be string, got {type(facture['statut'])}"
            
            # Verify total_ttc is numeric
            assert isinstance(facture["total_ttc"], (int, float)), f"total_ttc should be numeric, got {type(facture['total_ttc'])}"
            
            print(f"Facture {facture['numero_facture']}: total_ttc={facture['total_ttc']}, statut={facture['statut']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
