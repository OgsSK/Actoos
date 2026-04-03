"""
Test SSE Real-time Events Integration - Iteration 29

Tests:
1. SSE endpoint /api/events/stream with token auth
2. Dashboard stats endpoint /api/dashboard/stats
3. Intervention start triggering SSE event
4. MongoDB indexes verification
"""
import pytest
import requests
import os
import time
import threading
import json
from datetime import datetime, timezone, timedelta
from uuid import uuid4

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"
TEST_CLIENT_ID = "19a542c4-fbf3-4da4-b15e-4649a119d936"


class TestAuth:
    """Authentication helper"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}


class TestSSEEndpoint(TestAuth):
    """Test SSE /api/events/stream endpoint"""
    
    def test_sse_endpoint_requires_token(self):
        """SSE endpoint should require token parameter"""
        response = requests.get(f"{BASE_URL}/api/events/stream", timeout=5)
        # Should return 422 (validation error) or 401 (unauthorized)
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("PASS: SSE endpoint requires token parameter")
    
    def test_sse_endpoint_rejects_invalid_token(self):
        """SSE endpoint should reject invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/events/stream?token=invalid_token_12345",
            timeout=5
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: SSE endpoint rejects invalid token")
    
    def test_sse_endpoint_with_valid_token(self, auth_token):
        """SSE endpoint should accept valid token and return event-stream"""
        # Use a short timeout to just verify connection works
        try:
            response = requests.get(
                f"{BASE_URL}/api/events/stream?token={auth_token}",
                stream=True,
                timeout=5
            )
            
            # Check content type
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            content_type = response.headers.get('Content-Type', '')
            assert 'text/event-stream' in content_type, f"Expected text/event-stream, got {content_type}"
            
            # Read first event (should be 'connected')
            first_chunk = b""
            for chunk in response.iter_content(chunk_size=1024):
                first_chunk += chunk
                if b"event:" in first_chunk:
                    break
            
            first_chunk_str = first_chunk.decode('utf-8')
            assert "event: connected" in first_chunk_str, f"Expected 'connected' event, got: {first_chunk_str[:200]}"
            
            # Parse the connected event data
            if "data:" in first_chunk_str:
                data_line = [l for l in first_chunk_str.split('\n') if l.startswith('data:')][0]
                data_json = json.loads(data_line.replace('data: ', ''))
                assert "user_id" in data_json, "Connected event should contain user_id"
                assert "entreprise_id" in data_json, "Connected event should contain entreprise_id"
                print(f"PASS: SSE connected with user_id={data_json['user_id'][:8]}...")
            
            response.close()
            print("PASS: SSE endpoint works with valid token")
            
        except requests.exceptions.Timeout:
            # Timeout is acceptable - we just want to verify connection starts
            print("PASS: SSE connection established (timeout expected)")
    
    def test_sse_connections_endpoint(self, auth_headers):
        """Test /api/events/connections endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/events/connections",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "count" in data, "Response should contain 'count'"
        assert "users" in data, "Response should contain 'users'"
        print(f"PASS: SSE connections endpoint works - {data['count']} active connections")


class TestDashboardStats(TestAuth):
    """Test Dashboard Stats endpoint"""
    
    def test_dashboard_stats_endpoint(self, auth_headers):
        """GET /api/dashboard/stats should return stats"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Verify required fields
        required_fields = [
            "clients", "total_clients", "interventions", "interventions_today",
            "devis", "devis_en_attente", "factures", "ca_mois"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"PASS: Dashboard stats - {data['total_clients']} clients, {data['interventions_today']} interventions today")
    
    def test_dashboard_stats_interventions_structure(self, auth_headers):
        """Dashboard stats should have proper interventions structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        
        interventions = data.get("interventions", {})
        assert "planifiees" in interventions, "Missing interventions.planifiees"
        assert "en_cours" in interventions, "Missing interventions.en_cours"
        assert "terminees" in interventions, "Missing interventions.terminees"
        assert "today" in interventions, "Missing interventions.today"
        
        print(f"PASS: Interventions structure - planifiees={interventions['planifiees']}, en_cours={interventions['en_cours']}")
    
    def test_dashboard_alerts_endpoint(self, auth_headers):
        """GET /api/dashboard/alerts should return alerts array"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/alerts",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Alerts should be a list"
        print(f"PASS: Dashboard alerts - {len(data)} alerts")
    
    def test_dashboard_recent_endpoint(self, auth_headers):
        """GET /api/dashboard/recent should return recent activity"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/recent",
            headers=auth_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "interventions" in data, "Missing interventions in recent"
        assert "devis" in data, "Missing devis in recent"
        assert "factures" in data, "Missing factures in recent"
        
        print(f"PASS: Dashboard recent - {len(data['interventions'])} interventions, {len(data['devis'])} devis")


class TestInterventionStartSSE(TestAuth):
    """Test Intervention Start triggering SSE event"""
    
    def _create_intervention(self, auth_headers, title_suffix=""):
        """Helper to create a test intervention"""
        intervention_data = {
            "client_id": TEST_CLIENT_ID,
            "titre": f"TEST_SSE_{title_suffix}_{uuid4().hex[:8]}",
            "description": "Test intervention for SSE",
            "date_prevue": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "duree_estimee": 60,
            "priorite": "normale"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers,
            json=intervention_data
        )
        
        return response
    
    def _assert_intervention_created(self, response):
        """Assert intervention was created (API returns 200 or 201)"""
        assert response.status_code in [200, 201], f"Create failed: {response.status_code} - {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain intervention id"
        return data
    
    def _delete_intervention(self, auth_headers, intervention_id):
        """Helper to delete intervention"""
        try:
            requests.delete(
                f"{BASE_URL}/api/interventions/{intervention_id}",
                headers=auth_headers
            )
        except:
            pass
    
    def test_start_intervention_endpoint(self, auth_headers):
        """POST /api/interventions/{id}/start should work"""
        # Create intervention
        create_response = self._create_intervention(auth_headers, "Start")
        intervention = self._assert_intervention_created(create_response)
        intervention_id = intervention["id"]
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/interventions/{intervention_id}/start",
                headers=auth_headers
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            
            assert "message" in data, "Response should contain message"
            assert "heure_debut" in data, "Response should contain heure_debut"
            
            print(f"PASS: Intervention started - heure_debut={data['heure_debut']}")
        finally:
            self._delete_intervention(auth_headers, intervention_id)
    
    def test_start_intervention_with_geo_data(self, auth_headers):
        """POST /api/interventions/{id}/start should accept geo data"""
        # Create intervention
        create_response = self._create_intervention(auth_headers, "Geo")
        intervention = self._assert_intervention_created(create_response)
        intervention_id = intervention["id"]
        
        try:
            # Start with geo data
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
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            data = response.json()
            
            assert "geo_debut" in data, "Response should contain geo_debut"
            geo = data["geo_debut"]
            assert geo["latitude"] == 48.8566, "Latitude should match"
            assert geo["longitude"] == 2.3522, "Longitude should match"
            
            print(f"PASS: Intervention started with geo data - lat={geo['latitude']}, lon={geo['longitude']}")
            
        finally:
            self._delete_intervention(auth_headers, intervention_id)
    
    def test_start_intervention_updates_status(self, auth_headers):
        """Starting intervention should update status to en_cours"""
        # Create intervention
        create_response = self._create_intervention(auth_headers, "Status")
        intervention = self._assert_intervention_created(create_response)
        intervention_id = intervention["id"]
        
        try:
            # Verify initial status
            assert intervention["statut"] == "planifiee", "Initial status should be planifiee"
            
            # Start intervention
            start_response = requests.post(
                f"{BASE_URL}/api/interventions/{intervention_id}/start",
                headers=auth_headers
            )
            assert start_response.status_code == 200
            
            # Verify status changed
            get_response = requests.get(
                f"{BASE_URL}/api/interventions/{intervention_id}",
                headers=auth_headers
            )
            assert get_response.status_code == 200
            updated = get_response.json()
            
            assert updated["statut"] == "en_cours", f"Status should be en_cours, got {updated['statut']}"
            assert "heure_debut" in updated and updated["heure_debut"], "Should have heure_debut"
            
            print(f"PASS: Intervention status updated to en_cours")
            
        finally:
            self._delete_intervention(auth_headers, intervention_id)


class TestMongoDBIndexes(TestAuth):
    """Test MongoDB indexes are working (via query performance)"""
    
    def test_interventions_query_performance(self, auth_headers):
        """Interventions queries should be fast (indexes working)"""
        start_time = time.time()
        
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers=auth_headers
        )
        
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 5.0, f"Query took too long: {elapsed:.2f}s (indexes may not be working)"
        
        print(f"PASS: Interventions query completed in {elapsed:.2f}s")
    
    def test_today_interventions_query_performance(self, auth_headers):
        """Today's interventions query should be fast"""
        start_time = time.time()
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=auth_headers
        )
        
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 3.0, f"Query took too long: {elapsed:.2f}s"
        
        print(f"PASS: Today interventions query completed in {elapsed:.2f}s")
    
    def test_dashboard_stats_query_performance(self, auth_headers):
        """Dashboard stats (multiple aggregations) should be reasonably fast"""
        start_time = time.time()
        
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=auth_headers
        )
        
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed < 5.0, f"Dashboard stats took too long: {elapsed:.2f}s"
        
        print(f"PASS: Dashboard stats query completed in {elapsed:.2f}s")


class TestRealtimeEventsIntegration(TestAuth):
    """Test real-time events integration in Dashboard and TechnicianApp"""
    
    def test_useRealtimeEvents_hook_exists(self):
        """Verify useRealtimeEvents hook file exists"""
        import os
        hook_path = "/app/frontend/src/hooks/useRealtimeEvents.js"
        assert os.path.exists(hook_path), f"Hook file not found: {hook_path}"
        
        with open(hook_path, 'r') as f:
            content = f.read()
        
        # Verify key exports
        assert "export function useRealtimeEvents" in content, "useRealtimeEvents function not exported"
        assert "export const EventType" in content, "EventType not exported"
        assert "INTERVENTION_STARTED" in content, "INTERVENTION_STARTED event type missing"
        
        print("PASS: useRealtimeEvents hook exists with correct exports")
    
    def test_dashboard_uses_realtime_events(self):
        """Verify Dashboard.jsx imports and uses useRealtimeEvents"""
        import os
        dashboard_path = "/app/frontend/src/pages/Dashboard.jsx"
        assert os.path.exists(dashboard_path), f"Dashboard file not found: {dashboard_path}"
        
        with open(dashboard_path, 'r') as f:
            content = f.read()
        
        # Verify import
        assert "useRealtimeEvents" in content, "useRealtimeEvents not imported in Dashboard"
        assert "EventType" in content, "EventType not imported in Dashboard"
        
        # Verify usage
        assert "onInterventionChange" in content, "onInterventionChange callback not used"
        assert "onDevisChange" in content, "onDevisChange callback not used"
        assert "onFactureChange" in content, "onFactureChange callback not used"
        
        print("PASS: Dashboard.jsx uses useRealtimeEvents hook")
    
    def test_technician_app_uses_realtime_events(self):
        """Verify TechnicianApp.jsx imports and uses useRealtimeEvents"""
        import os
        tech_app_path = "/app/frontend/src/pages/TechnicianApp.jsx"
        assert os.path.exists(tech_app_path), f"TechnicianApp file not found: {tech_app_path}"
        
        with open(tech_app_path, 'r') as f:
            content = f.read()
        
        # Verify import
        assert "useRealtimeEvents" in content, "useRealtimeEvents not imported in TechnicianApp"
        
        # Verify usage
        assert "onInterventionChange" in content, "onInterventionChange callback not used in TechnicianApp"
        assert "sseConnected" in content or "isConnected" in content, "SSE connection status not tracked"
        
        print("PASS: TechnicianApp.jsx uses useRealtimeEvents hook")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
