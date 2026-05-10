"""
Test suite for PWA and SMS features
Tests: PWA manifest, Service Worker, SMS API endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "admin@testplomberie.fr"
TEST_PASSWORD = "password123"


class TestPWAFeatures:
    """Tests for PWA manifest and service worker"""
    
    def test_manifest_accessible(self):
        """Test that manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Manifest not accessible: {response.status_code}"
        print("PASS: manifest.json is accessible")
    
    def test_manifest_valid_json(self):
        """Test that manifest.json is valid JSON"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        assert "name" in manifest, "Manifest missing 'name'"
        assert "short_name" in manifest, "Manifest missing 'short_name'"
        assert "icons" in manifest, "Manifest missing 'icons'"
        assert "start_url" in manifest, "Manifest missing 'start_url'"
        assert "display" in manifest, "Manifest missing 'display'"
        print("PASS: manifest.json is valid with required fields")
    
    def test_manifest_content(self):
        """Test manifest content values"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        manifest = response.json()
        
        assert manifest["name"] == "FieldCommand - Gestion d'Interventions"
        assert manifest["short_name"] == "FieldCommand"
        assert manifest["start_url"] == "/tech"
        assert manifest["display"] == "standalone"
        assert manifest["theme_color"] == "#0F172A"
        assert manifest["lang"] == "fr-FR"
        print("PASS: manifest.json content is correct")
    
    def test_service_worker_accessible(self):
        """Test that sw.js is accessible"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200, f"Service worker not accessible: {response.status_code}"
        print("PASS: sw.js is accessible")
    
    def test_service_worker_content(self):
        """Test that sw.js contains expected content"""
        response = requests.get(f"{BASE_URL}/sw.js")
        assert response.status_code == 200
        
        content = response.text
        assert "CACHE_NAME" in content, "Service worker missing CACHE_NAME"
        assert "install" in content, "Service worker missing install event"
        assert "activate" in content, "Service worker missing activate event"
        assert "fetch" in content, "Service worker missing fetch event"
        print("PASS: sw.js contains expected service worker code")


class TestSMSAPIEndpoints:
    """Tests for SMS API endpoints (Twilio integration)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Get existing intervention
        interventions_response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers=self.headers
        )
        if interventions_response.status_code == 200 and interventions_response.json():
            self.intervention_id = interventions_response.json()[0]["id"]
        else:
            self.intervention_id = None
    
    def test_sms_status_endpoint(self):
        """Test GET /api/sms/status returns Twilio configuration status"""
        response = requests.get(
            f"{BASE_URL}/api/sms/status",
            headers=self.headers
        )
        assert response.status_code == 200, f"SMS status failed: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response missing 'configured' field"
        assert isinstance(data["configured"], bool), "'configured' should be boolean"
        
        # Since Twilio is not configured, expect false
        assert data["configured"] == False, "Twilio should not be configured"
        print(f"PASS: SMS status endpoint works - configured: {data['configured']}")
    
    def test_sms_intervention_reminder_endpoint_exists(self):
        """Test POST /api/sms/intervention/{id}/reminder endpoint exists"""
        if not self.intervention_id:
            pytest.skip("No intervention available for testing")
        
        response = requests.post(
            f"{BASE_URL}/api/sms/intervention/{self.intervention_id}/reminder",
            headers=self.headers
        )
        
        # Should return 200 with error message about Twilio not configured
        assert response.status_code == 200, f"SMS reminder endpoint failed: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response missing 'message' field"
        assert "sms" in data, "Response missing 'sms' field"
        assert data["sms"]["status"] == "error", "Expected error status for unconfigured Twilio"
        assert "Twilio not configured" in data["sms"]["message"], "Expected Twilio not configured message"
        print("PASS: SMS intervention reminder endpoint works (Twilio not configured)")
    
    def test_sms_devis_notification_endpoint_exists(self):
        """Test POST /api/sms/devis/{id}/notification endpoint exists"""
        # First create a devis
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available for testing")
        
        client_id = clients_response.json()[0]["id"]
        
        # Create devis
        devis_response = requests.post(
            f"{BASE_URL}/api/devis",
            headers=self.headers,
            json={
                "client_id": client_id,
                "lignes": [{"description": "Test SMS", "quantite": 1, "prix_unitaire": 100, "tva": 20}],
                "validite_jours": 30
            }
        )
        assert devis_response.status_code == 200, f"Failed to create devis: {devis_response.text}"
        devis_id = devis_response.json()["id"]
        
        # Test SMS notification
        response = requests.post(
            f"{BASE_URL}/api/sms/devis/{devis_id}/notification",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"SMS devis notification failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "sms" in data
        assert data["sms"]["status"] == "error"
        assert "Twilio not configured" in data["sms"]["message"]
        print("PASS: SMS devis notification endpoint works (Twilio not configured)")
    
    def test_sms_facture_notification_endpoint_exists(self):
        """Test POST /api/sms/facture/{id}/notification endpoint exists"""
        # First create a facture
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available for testing")
        
        client_id = clients_response.json()[0]["id"]
        
        # Create facture
        facture_response = requests.post(
            f"{BASE_URL}/api/factures",
            headers=self.headers,
            json={
                "client_id": client_id,
                "lignes": [{"description": "Test SMS", "quantite": 1, "prix_unitaire": 100, "tva": 20}],
                "echeance_jours": 30,
                "conditions_paiement": "Test"
            }
        )
        assert facture_response.status_code == 200, f"Failed to create facture: {facture_response.text}"
        facture_id = facture_response.json()["id"]
        
        # Test SMS notification
        response = requests.post(
            f"{BASE_URL}/api/sms/facture/{facture_id}/notification",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"SMS facture notification failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "sms" in data
        assert data["sms"]["status"] == "error"
        assert "Twilio not configured" in data["sms"]["message"]
        print("PASS: SMS facture notification endpoint works (Twilio not configured)")
    
    def test_sms_facture_reminder_endpoint_exists(self):
        """Test POST /api/sms/facture/{id}/reminder endpoint exists"""
        # Get existing factures
        factures_response = requests.get(f"{BASE_URL}/api/factures", headers=self.headers)
        if factures_response.status_code != 200 or not factures_response.json():
            pytest.skip("No factures available for testing")
        
        # Find an emitted facture
        facture_id = None
        for facture in factures_response.json():
            if facture["statut"] in ["emise", "en_retard"]:
                facture_id = facture["id"]
                break
        
        if not facture_id:
            # Create and emit a facture
            clients_response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
            if clients_response.status_code != 200 or not clients_response.json():
                pytest.skip("No clients available for testing")
            
            client_id = clients_response.json()[0]["id"]
            
            facture_response = requests.post(
                f"{BASE_URL}/api/factures",
                headers=self.headers,
                json={
                    "client_id": client_id,
                    "lignes": [{"description": "Test SMS Reminder", "quantite": 1, "prix_unitaire": 100, "tva": 20}],
                    "echeance_jours": 30,
                    "conditions_paiement": "Test"
                }
            )
            facture_id = facture_response.json()["id"]
            
            # Emit the facture
            requests.post(f"{BASE_URL}/api/factures/{facture_id}/emit", headers=self.headers)
        
        # Test SMS reminder
        response = requests.post(
            f"{BASE_URL}/api/sms/facture/{facture_id}/reminder",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"SMS facture reminder failed: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert "sms" in data
        assert "jours_retard" in data
        assert data["sms"]["status"] == "error"
        assert "Twilio not configured" in data["sms"]["message"]
        print("PASS: SMS facture reminder endpoint works (Twilio not configured)")


class TestTechnicianAppAPI:
    """Tests for Technician App API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def test_interventions_today_endpoint(self):
        """Test GET /api/interventions/today for technician app"""
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=self.headers
        )
        assert response.status_code == 200, f"Today interventions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Today interventions endpoint works - {len(data)} interventions")
    
    def test_interventions_week_filter(self):
        """Test GET /api/interventions with date range for week view"""
        from datetime import datetime, timedelta
        
        today = datetime.now()
        # Get start of week (Monday)
        start_of_week = today - timedelta(days=today.weekday())
        end_of_week = start_of_week + timedelta(days=6)
        
        date_debut = start_of_week.strftime("%Y-%m-%d")
        date_fin = end_of_week.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers=self.headers,
            params={"date_debut": date_debut, "date_fin": date_fin}
        )
        assert response.status_code == 200, f"Week interventions failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Week interventions filter works - {len(data)} interventions from {date_debut} to {date_fin}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
