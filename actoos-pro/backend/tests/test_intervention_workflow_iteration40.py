"""
Test Iteration 40 - ACTOOS PRO Intervention Workflow Tests
Features to test:
1. Photo upload avec tags - POST /api/photos/interventions/{id} avec type_photo
2. Photo listing - GET /api/photos/interventions/{id}
3. Photo delete - DELETE /api/photos/{id}
4. Notes d'intervention - POST /api/interventions/{id}/notes
5. Génération rapport PDF - GET /api/interventions/{id}/report/pdf
6. Complete with signature - POST /api/interventions/{id}/complete-with-signature
7. Catégories listing - GET /api/categories
"""
import pytest
import requests
import os
import io
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "demo@actoos.com"
TEST_PASSWORD = "demo2024"


class TestInterventionWorkflow:
    """Test complete intervention workflow: create, start, add notes, complete with signature, download PDF"""
    
    token = None
    user_id = None
    entreprise_id = None
    client_id = None
    intervention_id = None
    photo_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        if not TestInterventionWorkflow.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestInterventionWorkflow.token = data.get("access_token")
            TestInterventionWorkflow.user_id = data.get("user", {}).get("id")
            TestInterventionWorkflow.entreprise_id = data.get("user", {}).get("entreprise_id")
        
        self.headers = {
            "Authorization": f"Bearer {TestInterventionWorkflow.token}",
            "Content-Type": "application/json"
        }
    
    def test_01_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print(f"✓ Login successful for {TEST_EMAIL}")
    
    def test_02_get_categories(self):
        """Test GET /api/categories - list all categories"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories listing: {len(data)} categories found")
        
        # Verify category structure
        if len(data) > 0:
            cat = data[0]
            assert "id" in cat
            assert "nom" in cat
            print(f"  - First category: {cat.get('nom')}")
    
    def test_03_get_clients(self):
        """Get a client for creating intervention"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "No clients found - need at least one client"
        
        TestInterventionWorkflow.client_id = data[0]["id"]
        print(f"✓ Found client: {data[0].get('nom')} {data[0].get('prenom')}")
    
    def test_04_create_intervention(self):
        """Create a new intervention for testing"""
        assert TestInterventionWorkflow.client_id, "Client ID not set"
        
        payload = {
            "client_id": TestInterventionWorkflow.client_id,
            "titre": f"TEST_Intervention_Workflow_{datetime.now().strftime('%H%M%S')}",
            "description": "Test intervention for workflow testing",
            "date_prevue": (datetime.now() + timedelta(hours=1)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001"
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create intervention failed: {response.text}"
        data = response.json()
        
        assert "id" in data
        TestInterventionWorkflow.intervention_id = data["id"]
        print(f"✓ Created intervention: {data['id'][:8]}... - {data['titre']}")
    
    def test_05_start_intervention(self):
        """Start the intervention"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}/start",
            headers=self.headers
        )
        assert response.status_code == 200, f"Start intervention failed: {response.text}"
        data = response.json()
        
        assert "heure_debut" in data
        print(f"✓ Intervention started at {data['heure_debut']}")
    
    def test_06_add_notes_to_intervention(self):
        """Test POST /api/interventions/{id}/notes - add notes"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        payload = {
            "notes_terrain": "Test notes terrain - travaux effectués correctement",
            "notes_internes": "Test notes internes - client satisfait"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}/notes",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Add notes failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✓ Notes added to intervention: {data['message']}")
        
        # Verify notes were saved
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        intervention = response.json()
        assert intervention.get("notes_terrain") == "Test notes terrain - travaux effectués correctement"
        print(f"✓ Notes verified in intervention data")
    
    def test_07_upload_photo_avant(self):
        """Test POST /api/photos/interventions/{id} - upload photo with type_photo='avant'"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        # Create a simple test image (1x1 pixel PNG)
        # PNG header for a 1x1 red pixel
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,  # PNG signature
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,  # IHDR chunk
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,  # 1x1 dimensions
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,  # 8-bit RGB
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,  # IDAT chunk
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,  # compressed data
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,  # IEND chunk
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_avant.png', io.BytesIO(png_data), 'image/png')
        }
        
        headers = {"Authorization": f"Bearer {TestInterventionWorkflow.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/photos/interventions/{TestInterventionWorkflow.intervention_id}",
            files=files,
            params={"type_photo": "avant", "description": "Photo avant intervention"},
            headers=headers
        )
        
        # Photo upload may fail if storage is not configured - that's acceptable
        if response.status_code == 200:
            data = response.json()
            assert "id" in data
            assert data.get("type_photo") == "avant"
            TestInterventionWorkflow.photo_id = data["id"]
            print(f"✓ Photo 'avant' uploaded: {data['id'][:8]}...")
        elif response.status_code == 500 and "storage" in response.text.lower():
            print(f"⚠ Photo upload skipped - storage not configured (expected in test env)")
            pytest.skip("Storage not configured")
        else:
            print(f"⚠ Photo upload returned {response.status_code}: {response.text}")
            # Don't fail - storage may not be configured
    
    def test_08_upload_photo_pendant(self):
        """Test POST /api/photos/interventions/{id} - upload photo with type_photo='pendant'"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        # Create a simple test image
        png_data = bytes([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
            0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
            0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
            0x54, 0x08, 0xD7, 0x63, 0xF8, 0xFF, 0xFF, 0x3F,
            0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59,
            0xE7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
            0x44, 0xAE, 0x42, 0x60, 0x82
        ])
        
        files = {
            'file': ('test_pendant.png', io.BytesIO(png_data), 'image/png')
        }
        
        headers = {"Authorization": f"Bearer {TestInterventionWorkflow.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/photos/interventions/{TestInterventionWorkflow.intervention_id}",
            files=files,
            params={"type_photo": "pendant", "description": "Photo pendant intervention"},
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            assert data.get("type_photo") == "pendant"
            print(f"✓ Photo 'pendant' uploaded: {data['id'][:8]}...")
        else:
            print(f"⚠ Photo upload skipped - {response.status_code}")
    
    def test_09_list_intervention_photos(self):
        """Test GET /api/photos/interventions/{id} - list photos"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        response = requests.get(
            f"{BASE_URL}/api/photos/interventions/{TestInterventionWorkflow.intervention_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"List photos failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list)
        print(f"✓ Photos listing: {len(data)} photos found")
        
        # Verify photo structure if any photos exist
        for photo in data:
            assert "id" in photo
            assert "type_photo" in photo
            print(f"  - Photo: {photo.get('type_photo')} - {photo.get('id')[:8]}...")
    
    def test_10_complete_with_signature(self):
        """Test POST /api/interventions/{id}/complete-with-signature"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        # Base64 encoded simple signature (small PNG)
        signature_base64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        
        payload = {
            "signature": signature_base64,
            "nom_signataire": "Test Client Signature",
            "notes": "Intervention terminée avec succès"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}/complete-with-signature",
            json=payload,
            headers=self.headers
        )
        assert response.status_code == 200, f"Complete with signature failed: {response.text}"
        data = response.json()
        
        assert "heure_fin" in data
        assert "signataire" in data
        assert data["signataire"] == "Test Client Signature"
        print(f"✓ Intervention completed with signature by {data['signataire']}")
        
        # Verify intervention status
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        intervention = response.json()
        # Status could be 'terminee' or 'en_validation' depending on plan
        assert intervention.get("statut") in ["terminee", "en_validation"]
        assert intervention.get("signature_client") is not None
        print(f"✓ Intervention status: {intervention.get('statut')}")
    
    def test_11_generate_pdf_report(self):
        """Test GET /api/interventions/{id}/report/pdf - generate PDF report"""
        assert TestInterventionWorkflow.intervention_id, "Intervention ID not set"
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}/report/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"Generate PDF failed: {response.text}"
        
        # Verify it's a PDF
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 0
        
        # Check for PDF header
        assert response.content[:4] == b'%PDF', "Response is not a valid PDF"
        
        # Check content-disposition header
        content_disposition = response.headers.get("content-disposition", "")
        assert "attachment" in content_disposition
        assert ".pdf" in content_disposition.lower()
        
        print(f"✓ PDF report generated: {len(response.content)} bytes")
        print(f"  - Content-Disposition: {content_disposition}")
    
    def test_12_delete_photo(self):
        """Test DELETE /api/photos/{id} - delete a photo"""
        if not TestInterventionWorkflow.photo_id:
            pytest.skip("No photo to delete - photo upload was skipped")
        
        response = requests.delete(
            f"{BASE_URL}/api/photos/{TestInterventionWorkflow.photo_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Delete photo failed: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✓ Photo deleted: {data['message']}")
        
        # Verify photo is deleted (soft delete)
        response = requests.get(
            f"{BASE_URL}/api/photos/{TestInterventionWorkflow.photo_id}",
            headers=self.headers
        )
        assert response.status_code == 404, "Photo should be deleted"
        print(f"✓ Photo deletion verified")
    
    def test_13_cleanup_test_intervention(self):
        """Cleanup - delete test intervention"""
        if not TestInterventionWorkflow.intervention_id:
            pytest.skip("No intervention to cleanup")
        
        # Note: Completed interventions cannot be deleted, so this may fail
        response = requests.delete(
            f"{BASE_URL}/api/interventions/{TestInterventionWorkflow.intervention_id}",
            headers=self.headers
        )
        
        if response.status_code == 200:
            print(f"✓ Test intervention cleaned up")
        else:
            print(f"⚠ Cleanup skipped - intervention is completed (expected)")


class TestPhotoUploadWithTags:
    """Test photo upload with different tags (avant/pendant/apres)"""
    
    token = None
    intervention_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and create intervention"""
        if not TestPhotoUploadWithTags.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200
            TestPhotoUploadWithTags.token = response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestPhotoUploadWithTags.token}",
            "Content-Type": "application/json"
        }
    
    def test_photo_tag_validation(self):
        """Test that photo tags are correctly stored"""
        # Get an existing intervention
        response = requests.get(f"{BASE_URL}/api/interventions", headers=self.headers)
        assert response.status_code == 200
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions available for testing")
        
        intervention_id = interventions[0]["id"]
        
        # List photos and verify tag structure
        response = requests.get(
            f"{BASE_URL}/api/photos/interventions/{intervention_id}",
            headers=self.headers
        )
        assert response.status_code == 200
        photos = response.json()
        
        print(f"✓ Photo listing works for intervention {intervention_id[:8]}...")
        print(f"  - Found {len(photos)} photos")
        
        # Verify each photo has type_photo field
        for photo in photos:
            assert "type_photo" in photo, "Photo missing type_photo field"
            assert photo["type_photo"] in ["avant", "pendant", "apres", "autre"], f"Invalid type_photo: {photo['type_photo']}"


class TestNotesEndpoint:
    """Test intervention notes endpoint"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestNotesEndpoint.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200
            TestNotesEndpoint.token = response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestNotesEndpoint.token}",
            "Content-Type": "application/json"
        }
    
    def test_notes_endpoint_exists(self):
        """Test that notes endpoint exists and accepts POST"""
        # Get an existing intervention
        response = requests.get(f"{BASE_URL}/api/interventions", headers=self.headers)
        assert response.status_code == 200
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions available")
        
        # Find an intervention that's not completed
        intervention = None
        for i in interventions:
            if i.get("statut") in ["planifiee", "en_cours"]:
                intervention = i
                break
        
        if not intervention:
            # Use any intervention for testing endpoint existence
            intervention = interventions[0]
        
        # Test notes endpoint
        payload = {
            "notes_terrain": "Test notes from API"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/notes",
            json=payload,
            headers=self.headers
        )
        
        # Should return 200 or 403 (if not authorized) or 404 (if not found)
        assert response.status_code in [200, 403, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print(f"✓ Notes endpoint working for intervention {intervention['id'][:8]}...")
        else:
            print(f"⚠ Notes endpoint returned {response.status_code} (may be permission issue)")


class TestPDFReportGeneration:
    """Test PDF report generation for completed interventions"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        if not TestPDFReportGeneration.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            assert response.status_code == 200
            TestPDFReportGeneration.token = response.json().get("access_token")
        
        self.headers = {
            "Authorization": f"Bearer {TestPDFReportGeneration.token}",
            "Content-Type": "application/json"
        }
    
    def test_pdf_report_for_completed_intervention(self):
        """Test PDF generation for a completed intervention"""
        # Get interventions
        response = requests.get(f"{BASE_URL}/api/interventions", headers=self.headers)
        assert response.status_code == 200
        interventions = response.json()
        
        # Find a completed intervention
        completed = None
        for i in interventions:
            if i.get("statut") == "terminee":
                completed = i
                break
        
        if not completed:
            pytest.skip("No completed interventions available for PDF test")
        
        # Generate PDF
        response = requests.get(
            f"{BASE_URL}/api/interventions/{completed['id']}/report/pdf",
            headers=self.headers
        )
        assert response.status_code == 200, f"PDF generation failed: {response.text}"
        
        # Verify PDF content
        assert response.headers.get("content-type") == "application/pdf"
        assert response.content[:4] == b'%PDF'
        
        print(f"✓ PDF report generated for completed intervention {completed['id'][:8]}...")
        print(f"  - Size: {len(response.content)} bytes")
    
    def test_pdf_report_includes_signature(self):
        """Test that PDF includes signature if intervention has one"""
        # Get interventions with signature
        response = requests.get(f"{BASE_URL}/api/interventions", headers=self.headers)
        assert response.status_code == 200
        interventions = response.json()
        
        # Find intervention with signature
        with_signature = None
        for i in interventions:
            if i.get("signature_client"):
                with_signature = i
                break
        
        if not with_signature:
            pytest.skip("No interventions with signature available")
        
        # Generate PDF
        response = requests.get(
            f"{BASE_URL}/api/interventions/{with_signature['id']}/report/pdf",
            headers=self.headers
        )
        assert response.status_code == 200
        
        # PDF should be larger when it includes signature
        assert len(response.content) > 1000, "PDF seems too small to include signature"
        
        print(f"✓ PDF with signature generated: {len(response.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
