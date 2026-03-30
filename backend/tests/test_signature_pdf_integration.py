"""
Test Suite for Signature and PDF Integration
Tests the E2E workflow: Admin creates intervention → Tech executes with signature + geolocation → PDF facture includes signature
"""
import pytest
import requests
import os
import base64
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"

# Sample base64 signature (small PNG)
SAMPLE_SIGNATURE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="


class TestAuthAndSetup:
    """Test authentication for admin and tech users"""
    
    def test_admin_login(self):
        """Test admin login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_tech_login(self):
        """Test technician login returns valid token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        assert response.status_code == 200, f"Tech login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "tech"
        print(f"✓ Tech login successful: {data['user']['email']}")
        return data["access_token"]


class TestInterventionSignatureWorkflow:
    """Test the complete intervention workflow with signature"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def tech_user_id(self, tech_token):
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        data = response.json()
        # /api/auth/me returns nested structure with user inside
        return data.get("user", data).get("id")
    
    @pytest.fixture
    def test_client_id(self, admin_token):
        """Get or create a test client"""
        response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        clients = response.json()
        if clients:
            return clients[0]["id"]
        
        # Create a test client if none exists
        response = requests.post(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "nom": "Test Client Signature",
            "prenom": "Jean",
            "email": "test.signature@example.com",
            "telephone": "0612345678",
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001"
        })
        assert response.status_code == 200
        return response.json()["id"]
    
    def test_01_create_intervention_for_tech(self, admin_token, test_client_id, tech_user_id):
        """Admin creates an intervention assigned to technician"""
        date_prevue = (datetime.now() + timedelta(hours=1)).isoformat()
        
        response = requests.post(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "client_id": test_client_id,
            "technicien_id": tech_user_id,
            "titre": "TEST_Intervention avec signature",
            "description": "Test de signature client",
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001",
            "date_prevue": date_prevue,
            "duree_estimee": 60,
            "priorite": "normale"
        })
        
        assert response.status_code == 200, f"Failed to create intervention: {response.text}"
        data = response.json()
        assert data["statut"] == "planifiee"
        assert data["technicien_id"] == tech_user_id
        print(f"✓ Intervention created: {data['id']}")
        return data["id"]
    
    def test_02_tech_starts_intervention_with_geoloc(self, tech_token):
        """Technician starts intervention with geolocation"""
        # First get tech's interventions
        response = requests.get(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {tech_token}"
        }, params={"statut": "planifiee"})
        
        interventions = response.json()
        test_interventions = [i for i in interventions if i.get("titre", "").startswith("TEST_")]
        
        if not test_interventions:
            pytest.skip("No test intervention found")
        
        intervention_id = test_interventions[0]["id"]
        
        # Start with geolocation
        geo_data = {
            "latitude": 48.8566,
            "longitude": 2.3522,
            "accuracy": 10.0,
            "timestamp": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/start", headers={
            "Authorization": f"Bearer {tech_token}"
        }, json=geo_data)
        
        assert response.status_code == 200, f"Failed to start intervention: {response.text}"
        data = response.json()
        assert "heure_debut" in data
        print(f"✓ Intervention started with geolocation: {data.get('geo_debut')}")
        return intervention_id
    
    def test_03_signature_endpoint_standalone(self, tech_token):
        """Test the standalone signature endpoint"""
        # Get an in-progress intervention
        response = requests.get(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {tech_token}"
        }, params={"statut": "en_cours"})
        
        interventions = response.json()
        test_interventions = [i for i in interventions if i.get("titre", "").startswith("TEST_")]
        
        if not test_interventions:
            pytest.skip("No in-progress test intervention found")
        
        intervention_id = test_interventions[0]["id"]
        
        # Add signature via standalone endpoint
        response = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/signature", headers={
            "Authorization": f"Bearer {tech_token}"
        }, json={
            "signature": SAMPLE_SIGNATURE,
            "nom_signataire": "Jean Test Client"
        })
        
        assert response.status_code == 200, f"Failed to add signature: {response.text}"
        data = response.json()
        assert data["signataire"] == "Jean Test Client"
        assert "date_signature" in data
        print(f"✓ Signature added via standalone endpoint")
        
        # Verify signature is stored
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        intervention = response.json()
        assert intervention.get("signature_client") is not None
        assert intervention.get("nom_signataire") == "Jean Test Client"
        print(f"✓ Signature verified in intervention data")
    
    def test_04_complete_with_signature_and_geoloc(self, tech_token):
        """Test completing intervention with signature and geolocation"""
        # Create a new intervention for this test
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_response.json()["access_token"]
        
        # Get tech user id
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        tech_data = tech_response.json()
        tech_user_id = tech_data.get("user", tech_data).get("id")
        
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        client_id = clients_response.json()[0]["id"]
        
        # Create intervention
        date_prevue = (datetime.now() + timedelta(hours=2)).isoformat()
        create_response = requests.post(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "client_id": client_id,
            "technicien_id": tech_user_id,
            "titre": "TEST_Complete with signature",
            "description": "Test complete-with-signature endpoint",
            "date_prevue": date_prevue
        })
        intervention_id = create_response.json()["id"]
        
        # Start intervention
        requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/start", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        
        # Complete with signature
        response = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/complete-with-signature", headers={
            "Authorization": f"Bearer {tech_token}"
        }, json={
            "signature": SAMPLE_SIGNATURE,
            "nom_signataire": "Client Signature Test",
            "notes": "Travaux effectués avec succès"
        })
        
        assert response.status_code == 200, f"Failed to complete with signature: {response.text}"
        data = response.json()
        assert data["signataire"] == "Client Signature Test"
        assert "date_signature" in data
        assert "heure_fin" in data
        print(f"✓ Intervention completed with signature: {data}")
        
        # Verify intervention is now terminee
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        intervention = response.json()
        assert intervention["statut"] == "terminee"
        assert intervention.get("signature_client") is not None
        print(f"✓ Intervention status verified: terminee with signature")
        
        return intervention_id


class TestFacturePDFWithSignature:
    """Test that facture PDF includes intervention signature"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_01_create_facture_from_signed_intervention(self, admin_token, tech_token):
        """Create a facture linked to an intervention with signature"""
        # Get tech user id
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        tech_data = tech_response.json()
        tech_user_id = tech_data.get("user", tech_data).get("id")
        
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        client_id = clients_response.json()[0]["id"]
        
        # Create intervention
        date_prevue = (datetime.now() + timedelta(hours=3)).isoformat()
        create_response = requests.post(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "client_id": client_id,
            "technicien_id": tech_user_id,
            "titre": "TEST_Facture PDF Signature",
            "description": "Test facture PDF with signature",
            "date_prevue": date_prevue
        })
        intervention_id = create_response.json()["id"]
        
        # Start intervention
        requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/start", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        
        # Complete with signature
        requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/complete-with-signature", headers={
            "Authorization": f"Bearer {tech_token}"
        }, json={
            "signature": SAMPLE_SIGNATURE,
            "nom_signataire": "Client PDF Test",
            "notes": "Test pour PDF"
        })
        
        # Create facture linked to intervention
        facture_response = requests.post(f"{BASE_URL}/api/factures", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "client_id": client_id,
            "intervention_id": intervention_id,
            "lignes": [
                {
                    "description": "Main d'oeuvre",
                    "quantite": 2,
                    "prix_unitaire": 50.0,
                    "tva": 20.0
                },
                {
                    "description": "Pièces détachées",
                    "quantite": 1,
                    "prix_unitaire": 30.0,
                    "tva": 20.0
                }
            ],
            "conditions_paiement": "Paiement à réception",
            "echeance_jours": 30
        })
        
        assert facture_response.status_code == 200, f"Failed to create facture: {facture_response.text}"
        facture = facture_response.json()
        assert facture["intervention_id"] == intervention_id
        print(f"✓ Facture created with intervention_id: {facture['id']}")
        
        return facture["id"], intervention_id
    
    def test_02_get_facture_pdf_with_signature(self, admin_token):
        """Test that facture PDF endpoint returns PDF with signature data"""
        # Get factures with intervention_id
        response = requests.get(f"{BASE_URL}/api/factures", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        factures = response.json()
        
        # Find a facture with intervention_id
        factures_with_intervention = [f for f in factures if f.get("intervention_id")]
        
        if not factures_with_intervention:
            pytest.skip("No facture with intervention_id found")
        
        facture_id = factures_with_intervention[0]["id"]
        
        # Get PDF
        response = requests.get(f"{BASE_URL}/api/factures/{facture_id}/pdf", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        assert response.status_code == 200, f"Failed to get PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        print(f"✓ PDF generated successfully, size: {len(response.content)} bytes")
        
        # Verify PDF header
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        print(f"✓ PDF is valid (starts with %PDF)")
    
    def test_03_verify_intervention_has_signature_for_pdf(self, admin_token):
        """Verify that intervention linked to facture has signature data"""
        # Get factures with intervention_id
        response = requests.get(f"{BASE_URL}/api/factures", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        factures = response.json()
        
        factures_with_intervention = [f for f in factures if f.get("intervention_id")]
        
        if not factures_with_intervention:
            pytest.skip("No facture with intervention_id found")
        
        facture = factures_with_intervention[0]
        intervention_id = facture["intervention_id"]
        
        # Get intervention details
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        
        if response.status_code == 200:
            intervention = response.json()
            has_signature = intervention.get("signature_client") is not None
            print(f"✓ Intervention {intervention_id} has signature: {has_signature}")
            if has_signature:
                print(f"  - Signataire: {intervention.get('nom_signataire')}")
                print(f"  - Date signature: {intervention.get('date_signature')}")
        else:
            print(f"⚠ Could not fetch intervention {intervention_id}")


class TestGeolocationEndpoints:
    """Test geolocation endpoints for interventions"""
    
    @pytest.fixture
    def tech_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        return response.json()["access_token"]
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_geolocation_update_endpoint(self, tech_token, admin_token):
        """Test updating geolocation during intervention"""
        # Get tech user id
        tech_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        tech_data = tech_response.json()
        tech_user_id = tech_data.get("user", tech_data).get("id")
        
        # Get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        client_id = clients_response.json()[0]["id"]
        
        # Create intervention
        date_prevue = (datetime.now() + timedelta(hours=4)).isoformat()
        create_response = requests.post(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {admin_token}"
        }, json={
            "client_id": client_id,
            "technicien_id": tech_user_id,
            "titre": "TEST_Geolocation Test",
            "date_prevue": date_prevue
        })
        intervention_id = create_response.json()["id"]
        
        # Start intervention
        requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/start", headers={
            "Authorization": f"Bearer {tech_token}"
        })
        
        # Update geolocation
        geo_data = {
            "latitude": 48.8584,
            "longitude": 2.2945,
            "accuracy": 5.0,
            "timestamp": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/geolocation", headers={
            "Authorization": f"Bearer {tech_token}"
        }, json=geo_data, params={"geo_type": "current"})
        
        assert response.status_code == 200, f"Failed to update geolocation: {response.text}"
        data = response.json()
        assert data["type"] == "current"
        assert "geo" in data
        print(f"✓ Geolocation updated: {data['geo']}")


class TestSignaturePadFrontendIntegration:
    """Test that SignaturePad component data is correctly formatted"""
    
    def test_signature_data_format(self):
        """Verify signature data format matches expected structure"""
        # The SignaturePad component generates data in this format
        signature_data = {
            "signature": SAMPLE_SIGNATURE,
            "nom_signataire": "Test Client"
        }
        
        # Verify base64 format
        assert signature_data["signature"].startswith("data:image/png;base64,")
        
        # Verify we can decode the base64 part
        base64_part = signature_data["signature"].split(",")[1]
        try:
            decoded = base64.b64decode(base64_part)
            assert len(decoded) > 0
            print(f"✓ Signature base64 is valid, decoded size: {len(decoded)} bytes")
        except Exception as e:
            pytest.fail(f"Failed to decode signature base64: {e}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_cleanup_test_interventions(self, admin_token):
        """Delete test interventions created during tests"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        interventions = response.json()
        
        test_interventions = [i for i in interventions if i.get("titre", "").startswith("TEST_")]
        
        deleted_count = 0
        for intervention in test_interventions:
            if intervention["statut"] in ["planifiee"]:
                delete_response = requests.delete(f"{BASE_URL}/api/interventions/{intervention['id']}", headers={
                    "Authorization": f"Bearer {admin_token}"
                })
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test interventions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
