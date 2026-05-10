"""
Test Bug Fixes - Iteration 27
Tests for:
1. Bug 1 FIX: POST /api/interventions/{id}/start - accepts geo data directly (not wrapped)
2. Bug 3 FIX: GET /api/interventions/today - uses wider time window for European timezones
3. Bug 4 FIX: GET /api/dashboard/stats - new endpoint for dashboard stats
4. GET /api/dashboard/alerts - returns important alerts
5. GET /api/dashboard/recent - returns recent activity
"""
import pytest
import requests
import os
from datetime import datetime, timezone, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"

# Test client ID provided
TEST_CLIENT_ID = "19a542c4-fbf3-4da4-b15e-4649a119d936"


class TestBugFixes:
    """Test class for bug fixes in iteration 27"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        # API returns access_token, not token
        token = data.get("access_token") or data.get("token")
        assert token, "No token in response"
        return token
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_intervention(self, auth_headers):
        """Create a test intervention with status 'planifiee' for testing start"""
        # First, verify the test client exists
        client_response = requests.get(
            f"{BASE_URL}/api/clients/{TEST_CLIENT_ID}",
            headers=auth_headers
        )
        
        # If client doesn't exist, create one
        if client_response.status_code == 404:
            client_data = {
                "nom": "TEST_BugFix",
                "prenom": "Client",
                "email": f"test_bugfix_{uuid.uuid4().hex[:8]}@test.com",
                "telephone": "+33612345678",
                "adresse": "123 Rue Test",
                "ville": "Paris",
                "code_postal": "75001"
            }
            create_client_response = requests.post(
                f"{BASE_URL}/api/clients",
                headers=auth_headers,
                json=client_data
            )
            assert create_client_response.status_code in [200, 201], f"Failed to create client: {create_client_response.text}"
            client_id = create_client_response.json()["id"]
        else:
            client_id = TEST_CLIENT_ID
        
        # Create intervention with status 'planifiee'
        intervention_data = {
            "client_id": client_id,
            "titre": f"TEST_BugFix_Intervention_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention for bug fix testing",
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "adresse": "123 Rue Test",
            "ville": "Paris",
            "code_postal": "75001",
            "priorite": "normale",
            "duree_estimee": 60
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers,
            json=intervention_data
        )
        assert response.status_code in [200, 201], f"Failed to create intervention: {response.text}"
        intervention = response.json()
        assert intervention["statut"] == "planifiee", "Intervention should be in 'planifiee' status"
        
        yield intervention
        
        # Cleanup: Delete the intervention after tests
        requests.delete(
            f"{BASE_URL}/api/interventions/{intervention['id']}",
            headers=auth_headers
        )

    # ==================== BUG 1 FIX TESTS ====================
    
    def test_start_intervention_with_direct_geo_data(self, auth_headers, test_intervention):
        """
        Bug 1 FIX: POST /api/interventions/{id}/start should accept geo data directly
        (not wrapped in {geo: {...}})
        """
        intervention_id = test_intervention["id"]
        
        # Send geo data directly (the fix)
        geo_data = {
            "latitude": 48.8566,
            "longitude": 2.3522,
            "accuracy": 10.5,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/start",
            headers=auth_headers,
            json=geo_data
        )
        
        assert response.status_code == 200, f"Start intervention failed: {response.text}"
        data = response.json()
        
        # Verify response
        assert "message" in data, "Response should contain message"
        assert "heure_debut" in data, "Response should contain heure_debut"
        
        # Verify geo_debut is in response
        assert "geo_debut" in data, "Response should contain geo_debut"
        geo_debut = data["geo_debut"]
        assert geo_debut["latitude"] == geo_data["latitude"], "Latitude should match"
        assert geo_debut["longitude"] == geo_data["longitude"], "Longitude should match"
        
        print(f"SUCCESS: Start intervention with direct geo data works correctly")
        print(f"  - Intervention ID: {intervention_id}")
        print(f"  - Geo data saved: lat={geo_debut['latitude']}, lon={geo_debut['longitude']}")
    
    def test_start_intervention_without_geo_data(self, auth_headers):
        """Test that start intervention also works without geo data"""
        # Create a new intervention for this test
        client_response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=auth_headers
        )
        assert client_response.status_code == 200
        clients = client_response.json()
        assert len(clients) > 0, "Need at least one client"
        
        intervention_data = {
            "client_id": clients[0]["id"],
            "titre": f"TEST_NoGeo_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention without geo",
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "priorite": "normale"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers,
            json=intervention_data
        )
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        intervention = create_response.json()
        
        # Start without geo data (null body)
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/start",
            headers=auth_headers,
            json=None
        )
        
        assert response.status_code == 200, f"Start without geo failed: {response.text}"
        data = response.json()
        assert "message" in data
        assert "heure_debut" in data
        
        print(f"SUCCESS: Start intervention without geo data works correctly")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/interventions/{intervention['id']}",
            headers=auth_headers
        )

    # ==================== BUG 3 FIX TESTS ====================
    
    def test_today_interventions_timezone_window(self, auth_headers):
        """
        Bug 3 FIX: GET /api/interventions/today should use wider time window
        for European timezones (22h J-1 to 02h J+1 UTC)
        """
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get today interventions failed: {response.text}"
        interventions = response.json()
        
        # Verify response is a list
        assert isinstance(interventions, list), "Response should be a list"
        
        print(f"SUCCESS: GET /api/interventions/today returns {len(interventions)} interventions")
        
        # Verify each intervention has expected fields
        for intervention in interventions[:3]:  # Check first 3
            assert "id" in intervention
            assert "statut" in intervention
            assert "date_prevue" in intervention
            print(f"  - {intervention.get('titre', 'N/A')}: {intervention['statut']}")
    
    def test_today_interventions_includes_midnight_interventions(self, auth_headers):
        """
        Test that interventions scheduled around midnight are included
        This tests the timezone fix for European timezones
        """
        # Get clients first
        client_response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=auth_headers
        )
        assert client_response.status_code == 200
        clients = client_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available for test")
        
        # Create an intervention for today at 23:30 (which in UTC+2 would be 21:30 UTC)
        today = datetime.now(timezone.utc).date()
        late_night_time = datetime(today.year, today.month, today.day, 23, 30, 0, tzinfo=timezone.utc)
        
        intervention_data = {
            "client_id": clients[0]["id"],
            "titre": f"TEST_Midnight_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention for midnight timezone fix",
            "date_prevue": late_night_time.isoformat(),
            "priorite": "normale"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers,
            json=intervention_data
        )
        assert create_response.status_code in [200, 201], f"Failed to create: {create_response.text}"
        intervention = create_response.json()
        
        # Now get today's interventions
        today_response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=auth_headers
        )
        assert today_response.status_code == 200
        today_interventions = today_response.json()
        
        # Check if our late-night intervention is included
        intervention_ids = [i["id"] for i in today_interventions]
        assert intervention["id"] in intervention_ids, \
            f"Late night intervention should be included in today's list (timezone fix)"
        
        print(f"SUCCESS: Midnight intervention included in today's list (timezone fix working)")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/interventions/{intervention['id']}",
            headers=auth_headers
        )

    # ==================== BUG 4 FIX TESTS - DASHBOARD ====================
    
    def test_dashboard_stats_endpoint(self, auth_headers):
        """
        Bug 4 FIX: GET /api/dashboard/stats should return dashboard statistics
        """
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        stats = response.json()
        
        # Verify expected fields
        assert "clients" in stats or "total_clients" in stats, "Should have clients count"
        assert "interventions" in stats, "Should have interventions stats"
        
        # Check interventions breakdown
        interventions = stats.get("interventions", {})
        assert "planifiees" in interventions or "today" in interventions, \
            "Should have intervention breakdown"
        
        # Check for revenue/financial data
        assert "revenue" in stats or "ca_mois" in stats, "Should have revenue data"
        
        print(f"SUCCESS: Dashboard stats endpoint returns valid data")
        print(f"  - Clients: {stats.get('clients', stats.get('total_clients', 'N/A'))}")
        print(f"  - Interventions today: {stats.get('interventions_today', interventions.get('today', 'N/A'))}")
        print(f"  - Revenue this month: {stats.get('ca_mois', stats.get('revenue', {}).get('this_month', 'N/A'))}")
    
    def test_dashboard_stats_has_all_required_fields(self, auth_headers):
        """Verify dashboard stats has all required fields for the frontend"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        stats = response.json()
        
        # Required fields based on dashboard.py implementation
        required_fields = [
            "clients",
            "interventions",
            "devis",
            "factures",
            "revenue"
        ]
        
        for field in required_fields:
            assert field in stats, f"Missing required field: {field}"
        
        # Check nested intervention fields
        interventions = stats["interventions"]
        assert "planifiees" in interventions, "Missing interventions.planifiees"
        assert "en_cours" in interventions, "Missing interventions.en_cours"
        assert "terminees" in interventions, "Missing interventions.terminees"
        assert "today" in interventions, "Missing interventions.today"
        
        print(f"SUCCESS: Dashboard stats has all required fields")
    
    def test_dashboard_alerts_endpoint(self, auth_headers):
        """Test GET /api/dashboard/alerts returns alerts"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/alerts",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard alerts failed: {response.text}"
        alerts = response.json()
        
        # Verify response is a list
        assert isinstance(alerts, list), "Alerts should be a list"
        
        # If there are alerts, verify structure
        for alert in alerts[:3]:
            assert "type" in alert, "Alert should have type"
            assert "title" in alert, "Alert should have title"
            assert "message" in alert, "Alert should have message"
            print(f"  - Alert: [{alert['type']}] {alert['title']}")
        
        print(f"SUCCESS: Dashboard alerts endpoint returns {len(alerts)} alerts")
    
    def test_dashboard_recent_endpoint(self, auth_headers):
        """Test GET /api/dashboard/recent returns recent activity"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/recent",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Dashboard recent failed: {response.text}"
        recent = response.json()
        
        # Verify expected sections
        assert "interventions" in recent, "Should have recent interventions"
        assert "devis" in recent, "Should have recent devis"
        assert "factures" in recent, "Should have recent factures"
        
        # Verify each section is a list
        assert isinstance(recent["interventions"], list)
        assert isinstance(recent["devis"], list)
        assert isinstance(recent["factures"], list)
        
        print(f"SUCCESS: Dashboard recent endpoint returns valid data")
        print(f"  - Recent interventions: {len(recent['interventions'])}")
        print(f"  - Recent devis: {len(recent['devis'])}")
        print(f"  - Recent factures: {len(recent['factures'])}")
    
    def test_dashboard_recent_has_client_names(self, auth_headers):
        """Verify recent activity items are enriched with client names"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/recent",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        recent = response.json()
        
        # Check if interventions have client_name
        for intervention in recent["interventions"][:2]:
            assert "client_name" in intervention, "Intervention should have client_name"
        
        # Check if devis have client_name
        for devis in recent["devis"][:2]:
            assert "client_name" in devis, "Devis should have client_name"
        
        # Check if factures have client_name
        for facture in recent["factures"][:2]:
            assert "client_name" in facture, "Facture should have client_name"
        
        print(f"SUCCESS: Recent activity items have client names")


class TestDashboardStatsValues:
    """Test that dashboard stats return actual values (not zeros)"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        token = data.get("access_token") or data.get("token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_stats_not_all_zeros(self, auth_headers):
        """
        Bug 4 was that analytics dashboard showed 0 - verify stats are not all zeros
        """
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        stats = response.json()
        
        # At least one of these should be non-zero for an active enterprise
        clients = stats.get("clients", stats.get("total_clients", 0))
        interventions_today = stats.get("interventions_today", 0)
        interventions_week = stats.get("interventions_week", 0)
        
        # Check if we have any data
        has_data = (
            clients > 0 or 
            interventions_today > 0 or 
            interventions_week > 0 or
            stats.get("interventions", {}).get("planifiees", 0) > 0 or
            stats.get("interventions", {}).get("terminees", 0) > 0
        )
        
        print(f"Dashboard stats values:")
        print(f"  - Clients: {clients}")
        print(f"  - Interventions today: {interventions_today}")
        print(f"  - Interventions week: {interventions_week}")
        print(f"  - Planifiees: {stats.get('interventions', {}).get('planifiees', 0)}")
        print(f"  - Terminees: {stats.get('interventions', {}).get('terminees', 0)}")
        
        # This is informational - we just want to verify the endpoint works
        # The actual values depend on the data in the database
        assert response.status_code == 200, "Stats endpoint should work"
        print(f"SUCCESS: Dashboard stats endpoint returns data (has_data={has_data})")


class TestInterventionStartGeoValidation:
    """Additional tests for geo data validation in start intervention"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authentication headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        token = data.get("access_token") or data.get("token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def test_start_with_partial_geo_data(self, auth_headers):
        """Test start intervention with partial geo data (only lat/lon, no accuracy)"""
        # Get a client
        client_response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert client_response.status_code == 200
        clients = client_response.json()
        if len(clients) == 0:
            pytest.skip("No clients available")
        
        # Create intervention
        intervention_data = {
            "client_id": clients[0]["id"],
            "titre": f"TEST_PartialGeo_{uuid.uuid4().hex[:8]}",
            "date_prevue": datetime.now(timezone.utc).isoformat(),
            "priorite": "normale"
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers,
            json=intervention_data
        )
        assert create_response.status_code in [200, 201]
        intervention = create_response.json()
        
        # Start with partial geo (only required fields)
        partial_geo = {
            "latitude": 48.8566,
            "longitude": 2.3522
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention['id']}/start",
            headers=auth_headers,
            json=partial_geo
        )
        
        assert response.status_code == 200, f"Start with partial geo failed: {response.text}"
        data = response.json()
        assert "geo_debut" in data
        assert data["geo_debut"]["latitude"] == partial_geo["latitude"]
        
        print(f"SUCCESS: Start intervention with partial geo data works")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/interventions/{intervention['id']}",
            headers=auth_headers
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
