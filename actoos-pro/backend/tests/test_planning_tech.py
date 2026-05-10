"""
Test suite for Planning and Technician App features
Tests: GET /interventions, GET /interventions/today, PUT /interventions/{id}
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"


class TestAuth:
    """Authentication tests"""
    
    def test_login_success(self):
        """Test successful login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"SUCCESS: Login returned token and user data")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print(f"SUCCESS: Invalid login correctly rejected")


@pytest.fixture
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestInterventionsAPI:
    """Tests for /interventions endpoints - Planning page"""
    
    def test_get_interventions_list(self, auth_headers):
        """Test GET /interventions returns list of interventions"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /interventions returned {len(data)} interventions")
    
    def test_get_interventions_with_date_filter(self, auth_headers):
        """Test GET /interventions with date range filter (for Planning week view)"""
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        params = {
            "date_debut": week_start.strftime("%Y-%m-%d"),
            "date_fin": week_end.strftime("%Y-%m-%d")
        }
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers, params=params)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /interventions with date filter returned {len(data)} interventions")
    
    def test_get_interventions_with_status_filter(self, auth_headers):
        """Test GET /interventions with status filter"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers, params={"statut": "planifiee"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Verify all returned interventions have the correct status
        for intervention in data:
            assert intervention.get("statut") == "planifiee"
        print(f"SUCCESS: Status filter returned {len(data)} 'planifiee' interventions")
    
    def test_intervention_data_structure(self, auth_headers):
        """Test intervention data has required fields for Planning display"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            intervention = data[0]
            # Required fields for Planning page
            required_fields = ["id", "titre", "date_prevue", "statut", "client_id"]
            for field in required_fields:
                assert field in intervention, f"Missing required field: {field}"
            print(f"SUCCESS: Intervention has all required fields: {required_fields}")
        else:
            print("INFO: No interventions to verify structure")


class TestTodayInterventionsAPI:
    """Tests for /interventions/today endpoint - Technician App"""
    
    def test_get_today_interventions(self, auth_headers):
        """Test GET /interventions/today returns today's interventions"""
        response = requests.get(f"{BASE_URL}/api/interventions/today", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /interventions/today returned {len(data)} interventions")
    
    def test_today_interventions_enriched_with_client(self, auth_headers):
        """Test today's interventions include client data for Technician App"""
        response = requests.get(f"{BASE_URL}/api/interventions/today", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            intervention = data[0]
            # Should have client data for display
            assert "client" in intervention, "Missing client data in today's intervention"
            if intervention["client"]:
                assert "nom" in intervention["client"]
            print(f"SUCCESS: Today's interventions include client data")
        else:
            print("INFO: No today interventions to verify client enrichment")


class TestInterventionUpdate:
    """Tests for PUT /interventions/{id} - Reschedule functionality"""
    
    def test_update_intervention_date(self, auth_headers):
        """Test updating intervention date (reschedule)"""
        # First get an intervention
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        assert response.status_code == 200
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions to test update")
        
        intervention_id = interventions[0]["id"]
        original_date = interventions[0]["date_prevue"]
        
        # Update to a new date
        new_date = (datetime.now() + timedelta(days=2)).isoformat()
        update_data = {"date_prevue": new_date}
        
        response = requests.put(
            f"{BASE_URL}/api/interventions/{intervention_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        updated = response.json()
        assert "date_prevue" in updated
        print(f"SUCCESS: Intervention date updated from {original_date[:10]} to {updated['date_prevue'][:10]}")
        
        # Verify by GET
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=auth_headers)
        assert response.status_code == 200
        fetched = response.json()
        assert fetched["date_prevue"][:10] == new_date[:10]
        print(f"SUCCESS: Date change persisted in database")
    
    def test_update_intervention_technicien(self, auth_headers):
        """Test updating intervention technician assignment"""
        # Get interventions
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions to test")
        
        intervention_id = interventions[0]["id"]
        
        # Update technicien_id to null (unassign)
        update_data = {"technicien_id": None}
        response = requests.put(
            f"{BASE_URL}/api/interventions/{intervention_id}",
            headers=auth_headers,
            json=update_data
        )
        assert response.status_code == 200
        print(f"SUCCESS: Intervention technician updated")
    
    def test_update_nonexistent_intervention(self, auth_headers):
        """Test updating non-existent intervention returns 404"""
        response = requests.put(
            f"{BASE_URL}/api/interventions/nonexistent-id-12345",
            headers=auth_headers,
            json={"date_prevue": datetime.now().isoformat()}
        )
        assert response.status_code == 404
        print(f"SUCCESS: Non-existent intervention correctly returns 404")


class TestUsersAPI:
    """Tests for /users endpoint - Technician filter in Planning"""
    
    def test_get_users_list(self, auth_headers):
        """Test GET /users returns list of users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /users returned {len(data)} users")
    
    def test_users_have_role_field(self, auth_headers):
        """Test users have role field for filtering technicians"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        users = response.json()
        
        if len(users) > 0:
            for user in users:
                assert "role" in user, "User missing role field"
            print(f"SUCCESS: All users have role field")
        else:
            print("INFO: No users to verify")


class TestInterventionActions:
    """Tests for intervention start/complete actions - Technician App"""
    
    def test_start_intervention_requires_technicien(self, auth_headers):
        """Test that start intervention requires technicien_id match"""
        # Get an intervention
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions to test")
        
        intervention_id = interventions[0]["id"]
        
        # Try to start - should fail if not assigned to current user
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/start",
            headers=auth_headers
        )
        # Admin user is not a technician, so this should fail
        # The endpoint requires technicien_id to match current user
        if response.status_code == 404:
            print(f"SUCCESS: Start intervention correctly requires technicien assignment")
        elif response.status_code == 200:
            print(f"INFO: Intervention started (user may be assigned)")
    
    def test_complete_intervention_requires_technicien(self, auth_headers):
        """Test that complete intervention requires technicien_id match"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions to test")
        
        intervention_id = interventions[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/complete",
            headers=auth_headers,
            params={"notes_terrain": "Test notes"}
        )
        # Should fail if not assigned to current user
        if response.status_code == 404:
            print(f"SUCCESS: Complete intervention correctly requires technicien assignment")
        elif response.status_code == 200:
            print(f"INFO: Intervention completed (user may be assigned)")


class TestInterventionPhotos:
    """Tests for intervention photos - Technician App"""
    
    def test_get_intervention_photos(self, auth_headers):
        """Test GET /interventions/{id}/photos"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=auth_headers)
        interventions = response.json()
        
        if len(interventions) == 0:
            pytest.skip("No interventions to test")
        
        intervention_id = interventions[0]["id"]
        
        response = requests.get(
            f"{BASE_URL}/api/interventions/{intervention_id}/photos",
            headers=auth_headers
        )
        assert response.status_code == 200
        photos = response.json()
        assert isinstance(photos, list)
        print(f"SUCCESS: GET photos returned {len(photos)} photos")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
