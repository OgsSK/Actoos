"""
Test Client Portal Features
- GET /api/portal/client/{token} - Dashboard client avec résumé devis/factures/interventions
- GET /api/portal/facture/{facture_id}?token=xxx - Détail facture pour client
- GET /api/portal/facture/{facture_id}/pdf?token=xxx - Téléchargement PDF facture
- GET /api/clients/{id}/portal-link - Génération du lien portail pour un client
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
CLIENT_PORTAL_TOKEN = "888cc62b-b06f-4107-b822-b2403ce8f1c0"
CLIENT_ID = "6fe0e90b-d4ba-4c1f-a173-ca3356cfca85"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def authenticated_client(api_client, admin_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


class TestClientPortalDashboard:
    """Tests for GET /api/portal/client/{token} - Client Dashboard"""
    
    def test_portal_dashboard_valid_token(self, api_client):
        """Test client portal dashboard with valid token returns all data"""
        response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "client" in data, "Response should contain 'client'"
        assert "entreprise" in data, "Response should contain 'entreprise'"
        assert "devis" in data, "Response should contain 'devis'"
        assert "factures" in data, "Response should contain 'factures'"
        assert "interventions" in data, "Response should contain 'interventions'"
        assert "summary" in data, "Response should contain 'summary'"
        
        # Verify client data
        client = data["client"]
        assert client.get("nom") == "Martin", f"Expected client nom 'Martin', got {client.get('nom')}"
        assert client.get("prenom") == "Pierre", f"Expected client prenom 'Pierre', got {client.get('prenom')}"
        assert client.get("portal_token") == CLIENT_PORTAL_TOKEN
        
        # Verify entreprise data
        entreprise = data["entreprise"]
        assert entreprise.get("nom") == "Test Plomberie SAS"
        
        # Verify summary structure
        summary = data["summary"]
        assert "total_devis" in summary
        assert "devis_en_attente" in summary
        assert "devis_signes" in summary
        assert "total_factures" in summary
        assert "factures_impayees" in summary
        assert "montant_du" in summary
        
        # Verify summary values are numbers
        assert isinstance(summary["total_devis"], int)
        assert isinstance(summary["montant_du"], (int, float))
        
        print(f"✓ Portal dashboard returned: {summary['total_devis']} devis, {summary['total_factures']} factures, {summary['montant_du']}€ due")
    
    def test_portal_dashboard_invalid_token(self, api_client):
        """Test client portal dashboard with invalid token returns 404"""
        invalid_token = str(uuid.uuid4())
        response = api_client.get(f"{BASE_URL}/api/portal/client/{invalid_token}")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid token correctly returns 404")
    
    def test_portal_dashboard_devis_list(self, api_client):
        """Test that devis list contains expected fields"""
        response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["devis"]) > 0:
            devis = data["devis"][0]
            assert "id" in devis
            assert "numero_devis" in devis
            assert "statut" in devis
            assert "total_ttc" in devis
            assert "created_at" in devis
            assert "token_client" in devis  # Important for signing
            print(f"✓ Devis list contains {len(data['devis'])} items with correct structure")
        else:
            print("⚠ No devis found for this client")
    
    def test_portal_dashboard_factures_list(self, api_client):
        """Test that factures list contains expected fields"""
        response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data["factures"]) > 0:
            facture = data["factures"][0]
            assert "id" in facture
            assert "numero_facture" in facture
            assert "statut" in facture
            assert "total_ttc" in facture
            assert "montant_paye" in facture
            assert "date_echeance" in facture
            print(f"✓ Factures list contains {len(data['factures'])} items with correct structure")
        else:
            print("⚠ No factures found for this client")


class TestPortalFactureDetail:
    """Tests for GET /api/portal/facture/{facture_id}?token=xxx"""
    
    def test_portal_facture_detail_valid(self, api_client):
        """Test getting facture detail with valid token"""
        # First get a facture ID from the dashboard
        dashboard_response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        assert dashboard_response.status_code == 200
        
        factures = dashboard_response.json().get("factures", [])
        if not factures:
            pytest.skip("No factures available for testing")
        
        facture_id = factures[0]["id"]
        
        # Get facture detail
        response = api_client.get(
            f"{BASE_URL}/api/portal/facture/{facture_id}",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "facture" in data
        assert "client" in data
        assert "entreprise" in data
        
        # Verify facture details
        facture = data["facture"]
        assert facture["id"] == facture_id
        assert "numero_facture" in facture
        assert "lignes" in facture
        assert "total_ttc" in facture
        
        print(f"✓ Facture detail returned for {facture['numero_facture']}")
    
    def test_portal_facture_detail_invalid_token(self, api_client):
        """Test getting facture detail with invalid token returns 401"""
        # Get a valid facture ID first
        dashboard_response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        factures = dashboard_response.json().get("factures", [])
        if not factures:
            pytest.skip("No factures available for testing")
        
        facture_id = factures[0]["id"]
        invalid_token = str(uuid.uuid4())
        
        response = api_client.get(
            f"{BASE_URL}/api/portal/facture/{facture_id}",
            params={"token": invalid_token}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid token correctly returns 401")
    
    def test_portal_facture_detail_wrong_client(self, api_client):
        """Test getting facture that doesn't belong to client returns 404"""
        # Use a random facture ID that doesn't exist
        fake_facture_id = str(uuid.uuid4())
        
        response = api_client.get(
            f"{BASE_URL}/api/portal/facture/{fake_facture_id}",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent facture correctly returns 404")


class TestPortalFacturePDF:
    """Tests for GET /api/portal/facture/{facture_id}/pdf?token=xxx"""
    
    def test_portal_facture_pdf_download(self, api_client):
        """Test downloading facture PDF with valid token"""
        # First get a facture ID from the dashboard
        dashboard_response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        assert dashboard_response.status_code == 200
        
        factures = dashboard_response.json().get("factures", [])
        if not factures:
            pytest.skip("No factures available for testing")
        
        facture_id = factures[0]["id"]
        
        # Download PDF
        response = api_client.get(
            f"{BASE_URL}/api/portal/facture/{facture_id}/pdf",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content.startswith(b"%PDF"), "Response should be a valid PDF"
        
        print(f"✓ PDF downloaded successfully ({len(response.content)} bytes)")
    
    def test_portal_facture_pdf_invalid_token(self, api_client):
        """Test downloading facture PDF with invalid token returns 401"""
        dashboard_response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        factures = dashboard_response.json().get("factures", [])
        if not factures:
            pytest.skip("No factures available for testing")
        
        facture_id = factures[0]["id"]
        invalid_token = str(uuid.uuid4())
        
        response = api_client.get(
            f"{BASE_URL}/api/portal/facture/{facture_id}/pdf",
            params={"token": invalid_token}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid token correctly returns 401 for PDF download")


class TestClientPortalLink:
    """Tests for GET /api/clients/{id}/portal-link"""
    
    def test_get_portal_link_existing_token(self, authenticated_client):
        """Test getting portal link for client with existing token"""
        response = authenticated_client.get(f"{BASE_URL}/api/clients/{CLIENT_ID}/portal-link")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "client_id" in data
        assert "client_name" in data
        assert "portal_token" in data
        assert "portal_url" in data
        
        assert data["client_id"] == CLIENT_ID
        assert data["portal_token"] == CLIENT_PORTAL_TOKEN
        assert data["portal_url"] == f"/portal/client/{CLIENT_PORTAL_TOKEN}"
        
        print(f"✓ Portal link returned: {data['portal_url']}")
    
    def test_get_portal_link_generates_token_for_new_client(self, authenticated_client):
        """Test that portal-link generates token for client without one"""
        # Create a new test client
        new_client_data = {
            "nom": "TEST_Portal_Client",
            "prenom": "Test",
            "email": f"test_portal_{uuid.uuid4().hex[:8]}@test.fr",
            "telephone": "0600000000",
            "adresse": "Test Address",
            "ville": "Paris",
            "code_postal": "75001",
            "type_client": "particulier"
        }
        
        create_response = authenticated_client.post(
            f"{BASE_URL}/api/clients",
            json=new_client_data
        )
        assert create_response.status_code == 200, f"Failed to create client: {create_response.text}"
        
        new_client_id = create_response.json()["id"]
        
        try:
            # Get portal link - should generate token
            response = authenticated_client.get(f"{BASE_URL}/api/clients/{new_client_id}/portal-link")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert data["client_id"] == new_client_id
            assert data["portal_token"] is not None
            assert len(data["portal_token"]) == 36  # UUID format
            assert data["portal_url"].startswith("/portal/client/")
            
            # Verify the token works
            portal_response = authenticated_client.get(
                f"{BASE_URL}/api/portal/client/{data['portal_token']}"
            )
            assert portal_response.status_code == 200
            
            print(f"✓ New portal token generated and verified: {data['portal_token']}")
        finally:
            # Cleanup - delete test client
            authenticated_client.delete(f"{BASE_URL}/api/clients/{new_client_id}")
    
    def test_get_portal_link_requires_auth(self):
        """Test that portal-link endpoint requires authentication"""
        # Use a fresh session without auth headers
        response = requests.get(f"{BASE_URL}/api/clients/{CLIENT_ID}/portal-link")
        
        # Accept both 401 (Not authenticated) and 403 (Forbidden)
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}"
        print("✓ Portal link endpoint correctly requires authentication")
    
    def test_get_portal_link_invalid_client(self, authenticated_client):
        """Test getting portal link for non-existent client returns 404"""
        fake_client_id = str(uuid.uuid4())
        
        response = authenticated_client.get(f"{BASE_URL}/api/clients/{fake_client_id}/portal-link")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Non-existent client correctly returns 404")


class TestPortalSummaryCalculations:
    """Tests for summary calculations in portal dashboard"""
    
    def test_summary_montant_du_calculation(self, api_client):
        """Test that montant_du is correctly calculated"""
        response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        
        assert response.status_code == 200
        data = response.json()
        
        factures = data["factures"]
        summary = data["summary"]
        
        # Calculate expected montant_du
        expected_montant_du = sum(
            (f.get("total_ttc", 0) - f.get("montant_paye", 0))
            for f in factures
            if f.get("statut") != "payee"
        )
        
        assert abs(summary["montant_du"] - expected_montant_du) < 0.01, \
            f"Expected montant_du {expected_montant_du}, got {summary['montant_du']}"
        
        print(f"✓ Montant dû correctly calculated: {summary['montant_du']}€")
    
    def test_summary_devis_counts(self, api_client):
        """Test that devis counts are correct"""
        response = api_client.get(f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}")
        
        assert response.status_code == 200
        data = response.json()
        
        devis = data["devis"]
        summary = data["summary"]
        
        # Verify total_devis
        assert summary["total_devis"] == len(devis), \
            f"Expected total_devis {len(devis)}, got {summary['total_devis']}"
        
        # Verify devis_en_attente
        expected_en_attente = sum(1 for d in devis if d.get("statut") in ["brouillon", "envoye"])
        assert summary["devis_en_attente"] == expected_en_attente, \
            f"Expected devis_en_attente {expected_en_attente}, got {summary['devis_en_attente']}"
        
        # Verify devis_signes
        expected_signes = sum(1 for d in devis if d.get("statut") == "signe")
        assert summary["devis_signes"] == expected_signes, \
            f"Expected devis_signes {expected_signes}, got {summary['devis_signes']}"
        
        print(f"✓ Devis counts correct: {summary['total_devis']} total, {summary['devis_en_attente']} pending, {summary['devis_signes']} signed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
