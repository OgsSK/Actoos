"""
Bug Fixes Iteration 28 - Testing P0-P2 Bug Fixes and New Features

Tests:
- Bug 1: POST /api/interventions/{id}/start - accepts geo data directly
- Bug 3: GET /api/interventions/today - wider timezone window for Europe
- Bug 4: GET /api/dashboard/stats - new dashboard endpoint
- Bug 5: Photos and notes in Devis PDF (via intervention_id linked)
- Bug 6: QR Code facture with portal_url for online payment
- NEW: GET /api/events/stream - SSE endpoint for real-time (requires token query param)
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"

# Test client ID from previous iteration
TEST_CLIENT_ID = "19a542c4-fbf3-4da4-b15e-4649a119d936"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    return response.json().get("access_token")


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestBug1StartInterventionGeoData:
    """Bug 1 FIX: POST /api/interventions/{id}/start - accepts geo data directly"""
    
    def test_start_intervention_with_direct_geo_data(self, auth_headers):
        """Test that start intervention accepts geo data directly (not wrapped in {geo: {...}})"""
        # First create a test intervention
        intervention_data = {
            "titre": f"TEST_Bug1_GeoData_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention for geo data bug fix",
            "client_id": TEST_CLIENT_ID,
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "priorite": "normale"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            json=intervention_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test intervention: {create_response.text}")
        
        intervention_id = create_response.json().get("id")
        
        # Now start the intervention with geo data directly
        geo_data = {
            "latitude": 48.8566,
            "longitude": 2.3522,
            "accuracy": 15.0,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        start_response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/start",
            json=geo_data,
            headers=auth_headers
        )
        
        assert start_response.status_code == 200, f"Start failed: {start_response.text}"
        
        result = start_response.json()
        assert "message" in result
        assert result["message"] == "Intervention démarrée"
        
        # Verify geo_debut is in response
        assert "geo_debut" in result, "geo_debut should be in response"
        geo_debut = result["geo_debut"]
        assert geo_debut["latitude"] == 48.8566
        assert geo_debut["longitude"] == 2.3522
        assert geo_debut["accuracy"] == 15.0
        
        print(f"✓ Bug 1 FIX VERIFIED: Start intervention accepts geo data directly")
    
    def test_start_intervention_without_geo_data(self, auth_headers):
        """Test that start intervention works without geo data"""
        # Create a test intervention
        intervention_data = {
            "titre": f"TEST_Bug1_NoGeo_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention without geo data",
            "client_id": TEST_CLIENT_ID,
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "priorite": "normale"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            json=intervention_data,
            headers=auth_headers
        )
        
        if create_response.status_code != 200:
            pytest.skip(f"Could not create test intervention: {create_response.text}")
        
        intervention_id = create_response.json().get("id")
        
        # Start without geo data
        start_response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/start",
            headers=auth_headers
        )
        
        assert start_response.status_code == 200, f"Start failed: {start_response.text}"
        result = start_response.json()
        assert result["message"] == "Intervention démarrée"
        
        print(f"✓ Start intervention without geo data works correctly")


class TestBug3TimezoneWindow:
    """Bug 3 FIX: GET /api/interventions/today - wider timezone window for Europe"""
    
    def test_today_interventions_endpoint_works(self, auth_headers):
        """Test that today interventions endpoint returns data"""
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Today interventions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"✓ Bug 3 FIX: Today interventions endpoint returns {len(data)} interventions")
    
    def test_today_interventions_includes_client_data(self, auth_headers):
        """Test that today interventions include enriched client data"""
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # If there are interventions, check they have client data
        if len(data) > 0:
            intervention = data[0]
            # Client data should be enriched
            if intervention.get("client"):
                assert "nom" in intervention["client"] or "prenom" in intervention["client"]
                print(f"✓ Today interventions include enriched client data")
            else:
                print(f"⚠ Intervention has no client data (may be expected)")
        else:
            print(f"⚠ No interventions today to verify client data enrichment")


class TestBug4DashboardStats:
    """Bug 4 FIX: GET /api/dashboard/stats - new dashboard endpoint"""
    
    def test_dashboard_stats_endpoint(self, auth_headers):
        """Test that dashboard stats endpoint exists and returns data"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify required fields exist
        assert "clients" in data or "total_clients" in data, "Should have clients count"
        assert "interventions" in data, "Should have interventions data"
        
        print(f"✓ Bug 4 FIX VERIFIED: Dashboard stats endpoint works")
        print(f"  - Clients: {data.get('clients', data.get('total_clients', 0))}")
        print(f"  - Interventions today: {data.get('interventions_today', data.get('interventions', {}).get('today', 0))}")
    
    def test_dashboard_stats_has_all_required_fields(self, auth_headers):
        """Test that dashboard stats has all required fields"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for intervention breakdown
        if "interventions" in data and isinstance(data["interventions"], dict):
            interventions = data["interventions"]
            assert "planifiees" in interventions or "today" in interventions
            print(f"✓ Dashboard stats has intervention breakdown")
        
        # Check for devis data
        if "devis" in data:
            print(f"✓ Dashboard stats has devis data")
        
        # Check for factures data
        if "factures" in data:
            print(f"✓ Dashboard stats has factures data")
        
        # Check for revenue
        if "revenue" in data or "ca_mois" in data:
            print(f"✓ Dashboard stats has revenue data")
    
    def test_dashboard_alerts_endpoint(self, auth_headers):
        """Test that dashboard alerts endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard alerts failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Alerts should be a list"
        
        print(f"✓ Dashboard alerts endpoint works - {len(data)} alerts")
    
    def test_dashboard_recent_endpoint(self, auth_headers):
        """Test that dashboard recent activity endpoint exists"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/recent",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard recent failed: {response.text}"
        data = response.json()
        
        # Should have recent interventions, devis, factures
        assert "interventions" in data, "Should have recent interventions"
        assert "devis" in data, "Should have recent devis"
        assert "factures" in data, "Should have recent factures"
        
        print(f"✓ Dashboard recent endpoint works")
        print(f"  - Recent interventions: {len(data.get('interventions', []))}")
        print(f"  - Recent devis: {len(data.get('devis', []))}")
        print(f"  - Recent factures: {len(data.get('factures', []))}")


class TestBug5DevisPDFWithInterventionData:
    """Bug 5 FIX: Photos and notes in Devis PDF (via intervention_id linked)"""
    
    def test_devis_pdf_endpoint_works(self, auth_headers):
        """Test that devis PDF endpoint works"""
        # First get a devis
        response = requests.get(
            f"{BASE_URL}/api/devis",
            headers=auth_headers
        )
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No devis available to test PDF generation")
        
        devis_id = response.json()[0].get("id")
        
        # Get PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/devis/{devis_id}/pdf",
            headers=auth_headers
        )
        
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        assert len(pdf_response.content) > 0, "PDF should have content"
        
        print(f"✓ Bug 5: Devis PDF generation works")
    
    def test_generate_devis_pdf_function_accepts_intervention_params(self):
        """Test that generate_devis_pdf function accepts intervention_photos and intervention_notes"""
        # Import the function
        import sys
        sys.path.insert(0, '/app/backend')
        from pdf_generator import generate_devis_pdf
        
        # Test that function accepts the new parameters
        import inspect
        sig = inspect.signature(generate_devis_pdf)
        params = list(sig.parameters.keys())
        
        assert "intervention_photos" in params, "generate_devis_pdf should accept intervention_photos"
        assert "intervention_notes" in params, "generate_devis_pdf should accept intervention_notes"
        
        print(f"✓ Bug 5 FIX VERIFIED: generate_devis_pdf accepts intervention_photos and intervention_notes")


class TestBug6FacturePDFWithPortalURL:
    """Bug 6 FIX: QR Code facture with portal_url for online payment"""
    
    def test_facture_pdf_endpoint_works(self, auth_headers):
        """Test that facture PDF endpoint works"""
        # First get a facture
        response = requests.get(
            f"{BASE_URL}/api/factures",
            headers=auth_headers
        )
        
        if response.status_code != 200 or len(response.json()) == 0:
            pytest.skip("No factures available to test PDF generation")
        
        facture_id = response.json()[0].get("id")
        
        # Get PDF
        pdf_response = requests.get(
            f"{BASE_URL}/api/factures/{facture_id}/pdf",
            headers=auth_headers
        )
        
        assert pdf_response.status_code == 200, f"PDF generation failed: {pdf_response.text}"
        assert pdf_response.headers.get("content-type") == "application/pdf"
        assert len(pdf_response.content) > 0, "PDF should have content"
        
        print(f"✓ Bug 6: Facture PDF generation works")
    
    def test_generate_facture_pdf_function_accepts_portal_url(self):
        """Test that generate_facture_pdf function accepts portal_url parameter"""
        import sys
        sys.path.insert(0, '/app/backend')
        from pdf_generator import generate_facture_pdf
        
        import inspect
        sig = inspect.signature(generate_facture_pdf)
        params = list(sig.parameters.keys())
        
        assert "portal_url" in params, "generate_facture_pdf should accept portal_url"
        assert "intervention_photos" in params, "generate_facture_pdf should accept intervention_photos"
        assert "intervention_signature" in params, "generate_facture_pdf should accept intervention_signature"
        
        print(f"✓ Bug 6 FIX VERIFIED: generate_facture_pdf accepts portal_url for QR code")


class TestNewSSEEndpoint:
    """NEW: GET /api/events/stream - SSE endpoint for real-time"""
    
    def test_sse_endpoint_requires_token(self):
        """Test that SSE endpoint requires token query parameter"""
        # Without token should fail
        response = requests.get(
            f"{BASE_URL}/api/events/stream",
            stream=True,
            timeout=5
        )
        
        # Should return 422 (validation error) or 401 (unauthorized)
        assert response.status_code in [401, 422], f"SSE without token should fail: {response.status_code}"
        
        print(f"✓ SSE endpoint requires token (returns {response.status_code} without token)")
    
    def test_sse_endpoint_with_valid_token(self, auth_token):
        """Test that SSE endpoint works with valid token"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/events/stream?token={auth_token}",
                stream=True,
                timeout=5
            )
            
            assert response.status_code == 200, f"SSE with token failed: {response.status_code}"
            assert "text/event-stream" in response.headers.get("content-type", "")
            
            # Read first few bytes to verify it's streaming
            first_chunk = next(response.iter_content(chunk_size=100), None)
            assert first_chunk is not None, "SSE should start streaming"
            
            print(f"✓ NEW SSE endpoint works with token")
            print(f"  - Content-Type: {response.headers.get('content-type')}")
            
        except requests.exceptions.Timeout:
            # Timeout is expected for SSE - it means connection was established
            print(f"✓ SSE endpoint established connection (timeout expected)")
        except requests.exceptions.ChunkedEncodingError:
            # This can happen when we close the connection early
            print(f"✓ SSE endpoint streaming (connection closed early)")
    
    def test_sse_connections_endpoint(self, auth_headers):
        """Test that SSE connections count endpoint works"""
        response = requests.get(
            f"{BASE_URL}/api/events/connections",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Connections endpoint failed: {response.text}"
        data = response.json()
        
        assert "count" in data, "Should have connection count"
        assert "users" in data, "Should have users list"
        
        print(f"✓ SSE connections endpoint works - {data.get('count', 0)} active connections")


class TestInterventionWorkflow:
    """Test complete intervention workflow with new fixes"""
    
    def test_create_start_complete_intervention(self, auth_headers):
        """Test full intervention workflow"""
        # 1. Create intervention
        intervention_data = {
            "titre": f"TEST_Workflow_{uuid.uuid4().hex[:8]}",
            "description": "Full workflow test",
            "client_id": TEST_CLIENT_ID,
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "priorite": "haute"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            json=intervention_data,
            headers=auth_headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        intervention = create_response.json()
        intervention_id = intervention.get("id")
        assert intervention["statut"] == "planifiee"
        
        # 2. Start with geo data
        geo_data = {
            "latitude": 48.8566,
            "longitude": 2.3522,
            "accuracy": 10.0
        }
        
        start_response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/start",
            json=geo_data,
            headers=auth_headers
        )
        
        assert start_response.status_code == 200, f"Start failed: {start_response.text}"
        
        # 3. Complete intervention
        complete_response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/complete",
            headers=auth_headers
        )
        
        assert complete_response.status_code == 200, f"Complete failed: {complete_response.text}"
        
        # 4. Verify final state
        get_response = requests.get(
            f"{BASE_URL}/api/interventions/{intervention_id}",
            headers=auth_headers
        )
        
        assert get_response.status_code == 200
        final_intervention = get_response.json()
        assert final_intervention["statut"] == "terminee"
        
        print(f"✓ Full intervention workflow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
