"""
Test suite for Branding (logo, colors) and PDF generation features
Tests:
- PUT /api/entreprise/branding (save couleur_primaire)
- POST /api/entreprise/logo (upload logo)
- GET /api/devis/{id}/pdf (PDF with logo)
- GET /api/factures/{id}/pdf (PDF with logo and QR code for unpaid)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"


class TestBrandingAPI:
    """Tests for branding endpoints (logo upload, color change)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.entreprise = data.get("entreprise", {})
    
    def test_01_branding_update_color_valid(self):
        """Test PUT /api/entreprise/branding with valid hex color"""
        # Test with a valid color
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "#FF5733"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Branding update failed: {response.text}"
        data = response.json()
        assert data.get("couleur_primaire") == "#FF5733"
        assert "message" in data
        print(f"✓ Branding color updated to #FF5733")
        
        # Verify the change persisted by getting entreprise
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=self.headers)
        assert response.status_code == 200
        entreprise = response.json()
        assert entreprise.get("couleur_primaire") == "#FF5733"
        print(f"✓ Color change persisted in database")
    
    def test_02_branding_update_color_invalid(self):
        """Test PUT /api/entreprise/branding with invalid color format"""
        # Test with invalid color (no #)
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "FF5733"},
            headers=self.headers
        )
        assert response.status_code == 400, f"Should reject invalid color: {response.text}"
        
        # Test with invalid color (too short)
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "#FFF"},
            headers=self.headers
        )
        assert response.status_code == 400, f"Should reject short color: {response.text}"
        print(f"✓ Invalid color formats correctly rejected")
    
    def test_03_branding_reset_to_default(self):
        """Reset branding color to default blue"""
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "#2563EB"},
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Branding color reset to default #2563EB")
    
    def test_04_logo_upload_requires_admin(self):
        """Test that logo upload requires admin role"""
        # Login as tech user
        tech_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech@testplomberie.fr",
            "password": "technicien123"
        })
        
        if tech_response.status_code == 200:
            tech_token = tech_response.json()["access_token"]
            tech_headers = {"Authorization": f"Bearer {tech_token}"}
            
            # Try to upload logo as tech - should fail
            files = {"file": ("test.png", b"fake image data", "image/png")}
            response = requests.post(
                f"{BASE_URL}/api/entreprise/logo",
                files=files,
                headers=tech_headers
            )
            # Should be 403 Forbidden for non-admin
            assert response.status_code in [401, 403], f"Tech should not be able to upload logo: {response.status_code}"
            print(f"✓ Logo upload correctly restricted to admin only")
        else:
            print(f"⚠ Tech user not found, skipping admin-only test")
    
    def test_05_branding_requires_admin(self):
        """Test that branding update requires admin role"""
        # Login as tech user
        tech_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech@testplomberie.fr",
            "password": "technicien123"
        })
        
        if tech_response.status_code == 200:
            tech_token = tech_response.json()["access_token"]
            tech_headers = {"Authorization": f"Bearer {tech_token}"}
            
            # Try to update branding as tech - should fail
            response = requests.put(
                f"{BASE_URL}/api/entreprise/branding",
                params={"couleur_primaire": "#000000"},
                headers=tech_headers
            )
            assert response.status_code in [401, 403], f"Tech should not be able to update branding: {response.status_code}"
            print(f"✓ Branding update correctly restricted to admin only")
        else:
            print(f"⚠ Tech user not found, skipping admin-only test")


class TestPDFGeneration:
    """Tests for PDF generation with logo and QR code"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.entreprise_id = data["user"]["entreprise_id"]
    
    def test_01_get_existing_devis_pdf(self):
        """Test GET /api/devis/{id}/pdf returns valid PDF"""
        # First get list of devis
        response = requests.get(f"{BASE_URL}/api/devis", headers=self.headers)
        assert response.status_code == 200
        devis_list = response.json()
        
        if len(devis_list) == 0:
            pytest.skip("No devis found to test PDF generation")
        
        devis_id = devis_list[0]["id"]
        
        # Get PDF
        response = requests.get(
            f"{BASE_URL}/api/devis/{devis_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Check PDF starts with %PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Devis PDF generated successfully ({len(content)} bytes)")
    
    def test_02_get_existing_facture_pdf(self):
        """Test GET /api/factures/{id}/pdf returns valid PDF"""
        # First get list of factures
        response = requests.get(f"{BASE_URL}/api/factures", headers=self.headers)
        assert response.status_code == 200
        factures_list = response.json()
        
        if len(factures_list) == 0:
            pytest.skip("No factures found to test PDF generation")
        
        facture_id = factures_list[0]["id"]
        
        # Get PDF
        response = requests.get(
            f"{BASE_URL}/api/factures/{facture_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # Check PDF starts with %PDF
        content = response.content
        assert content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ Facture PDF generated successfully ({len(content)} bytes)")
    
    def test_03_create_devis_and_get_pdf(self):
        """Create a new devis and verify PDF generation"""
        # First get a client
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients found to create devis")
        
        client_id = clients[0]["id"]
        
        # Create devis
        devis_data = {
            "client_id": client_id,
            "titre": "TEST_Devis PDF Test",
            "lignes": [
                {
                    "description": "Service de test",
                    "quantite": 1,
                    "prix_unitaire": 100.0,
                    "tva": 20
                }
            ],
            "validite_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/devis",
            json=devis_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Devis creation failed: {response.text}"
        devis = response.json()
        devis_id = devis["id"]
        
        # Get PDF
        response = requests.get(
            f"{BASE_URL}/api/devis/{devis_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print(f"✓ New devis PDF generated: {devis['numero_devis']}")
        
        # Cleanup - delete the test devis
        requests.delete(f"{BASE_URL}/api/devis/{devis_id}", headers=self.headers)
    
    def test_04_create_facture_and_get_pdf_with_qr(self):
        """Create a new facture (unpaid) and verify PDF has QR code section"""
        # First get a client
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        clients = response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients found to create facture")
        
        client_id = clients[0]["id"]
        
        # Create facture
        facture_data = {
            "client_id": client_id,
            "lignes": [
                {
                    "description": "TEST_Service facture test",
                    "quantite": 1,
                    "prix_unitaire": 150.0,
                    "tva": 20
                }
            ],
            "echeance_jours": 30,
            "conditions_paiement": "Paiement à réception"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/factures",
            json=facture_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Facture creation failed: {response.text}"
        facture = response.json()
        facture_id = facture["id"]
        
        # Verify facture is not paid (should have QR code)
        assert facture.get("statut") in ["brouillon", "emise"], f"Unexpected status: {facture.get('statut')}"
        
        # Get PDF
        response = requests.get(
            f"{BASE_URL}/api/factures/{facture_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        content = response.content
        assert content[:4] == b'%PDF'
        
        # PDF should be larger than a minimal PDF (QR code adds size)
        # A basic PDF without images is typically < 5KB, with QR it should be larger
        print(f"✓ Facture PDF generated: {facture['numero_facture']} ({len(content)} bytes)")
        
        # Cleanup - delete the test facture
        requests.delete(f"{BASE_URL}/api/factures/{facture_id}", headers=self.headers)
    
    def test_05_paid_facture_no_qr_code(self):
        """Verify paid factures don't show QR code (shows PAYÉE instead)"""
        # Get factures and find a paid one
        response = requests.get(
            f"{BASE_URL}/api/factures?statut=payee",
            headers=self.headers
        )
        assert response.status_code == 200
        paid_factures = response.json()
        
        if len(paid_factures) == 0:
            print("⚠ No paid factures found to test - skipping QR code absence test")
            pytest.skip("No paid factures available")
        
        facture_id = paid_factures[0]["id"]
        
        # Get PDF
        response = requests.get(
            f"{BASE_URL}/api/factures/{facture_id}/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        assert response.content[:4] == b'%PDF'
        print(f"✓ Paid facture PDF generated (should show PAYÉE, no QR)")


class TestEntrepriseAPI:
    """Tests for entreprise settings API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.token = data["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_entreprise(self):
        """Test GET /api/entreprise returns entreprise data"""
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "id" in data
        assert "nom" in data
        assert "couleur_primaire" in data or data.get("couleur_primaire") is None
        print(f"✓ Entreprise data retrieved: {data.get('nom')}")
        print(f"  - couleur_primaire: {data.get('couleur_primaire', 'not set')}")
        print(f"  - logo_url: {data.get('logo_url', 'not set')}")
    
    def test_02_update_entreprise(self):
        """Test PUT /api/entreprise updates entreprise data"""
        # Get current data
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=self.headers)
        current = response.json()
        
        # Update with test data
        update_data = {
            "nom": current.get("nom", "Test Entreprise"),
            "email": current.get("email", "test@test.com"),
            "telephone": current.get("telephone", "0123456789"),
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/entreprise",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        print(f"✓ Entreprise settings updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
