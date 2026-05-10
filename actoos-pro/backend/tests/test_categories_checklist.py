"""
Test Categories and Checklist Features for Actoos SaaS
Tests for:
- GET /api/categories - returns 6 default categories with checklist_template
- GET /api/categories/{id} - returns specific category with items
- POST /api/interventions with categorie_id - creates intervention linked to category
- PUT /api/interventions/{id}/checklist - saves checklist responses
- GET /api/interventions/{id} - returns saved checklist_responses
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"


@pytest.fixture(scope="module")
def tech_token():
    """Get tech user authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TECH_EMAIL,
        "password": TECH_PASSWORD
    })
    assert response.status_code == 200, f"Tech login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin user authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def tech_headers(tech_token):
    """Headers with tech auth token"""
    return {"Authorization": f"Bearer {tech_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def client_id(tech_headers):
    """Get a client ID for creating interventions"""
    response = requests.get(f"{BASE_URL}/api/clients", headers=tech_headers)
    assert response.status_code == 200
    clients = response.json()
    assert len(clients) > 0, "No clients found"
    return clients[0]["id"]


class TestCategoriesEndpoints:
    """Test category-related endpoints"""
    
    def test_get_categories_returns_6_defaults(self, tech_headers):
        """Test 1: GET /api/categories returns 6 default categories with checklist_template"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=tech_headers)
        
        assert response.status_code == 200
        categories = response.json()
        
        # Should have exactly 6 default categories
        assert len(categories) == 6, f"Expected 6 categories, got {len(categories)}"
        
        # Verify expected category codes
        expected_codes = {"plomberie", "electricite", "nettoyage", "climatisation", "btp", "maintenance"}
        actual_codes = {cat["code"] for cat in categories}
        assert actual_codes == expected_codes, f"Missing categories: {expected_codes - actual_codes}"
        
        # Each category should have checklist_template
        for cat in categories:
            assert "checklist_template" in cat, f"Category {cat['code']} missing checklist_template"
            assert len(cat["checklist_template"]) > 0, f"Category {cat['code']} has empty checklist"
            assert "couleur" in cat, f"Category {cat['code']} missing couleur"
            assert "nom" in cat, f"Category {cat['code']} missing nom"
    
    def test_get_category_by_id(self, tech_headers):
        """Test 2: GET /api/categories/{id} returns specific category with items"""
        # First get all categories
        response = requests.get(f"{BASE_URL}/api/categories", headers=tech_headers)
        assert response.status_code == 200
        categories = response.json()
        
        # Get plomberie category
        plomberie = next((c for c in categories if c["code"] == "plomberie"), None)
        assert plomberie is not None, "Plomberie category not found"
        
        # Get specific category by ID
        response = requests.get(f"{BASE_URL}/api/categories/{plomberie['id']}", headers=tech_headers)
        assert response.status_code == 200
        
        category = response.json()
        assert category["id"] == plomberie["id"]
        assert category["code"] == "plomberie"
        assert category["nom"] == "Plomberie"
        
        # Verify checklist items
        checklist = category.get("checklist_template", [])
        assert len(checklist) == 7, f"Plomberie should have 7 checklist items, got {len(checklist)}"
        
        # Verify item structure
        for item in checklist:
            assert "id" in item
            assert "label" in item
            assert "type" in item
            assert item["type"] in ["checkbox", "text", "number", "photo", "signature"]
    
    def test_get_category_not_found(self, tech_headers):
        """Test GET /api/categories/{id} with invalid ID returns 404"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/categories/{fake_id}", headers=tech_headers)
        assert response.status_code == 404


class TestInterventionWithCategory:
    """Test intervention creation and checklist functionality"""
    
    @pytest.fixture
    def plomberie_category_id(self, tech_headers):
        """Get plomberie category ID"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=tech_headers)
        categories = response.json()
        plomberie = next((c for c in categories if c["code"] == "plomberie"), None)
        return plomberie["id"]
    
    def test_create_intervention_with_category(self, tech_headers, client_id, plomberie_category_id):
        """Test 3: POST /api/interventions with categorie_id creates linked intervention"""
        intervention_data = {
            "client_id": client_id,
            "titre": f"TEST_Category_Intervention_{uuid.uuid4().hex[:8]}",
            "description": "Test intervention with plomberie category",
            "date_prevue": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "categorie_id": plomberie_category_id
        }
        
        response = requests.post(f"{BASE_URL}/api/interventions", 
                                headers=tech_headers, json=intervention_data)
        
        assert response.status_code == 200, f"Failed to create intervention: {response.text}"
        
        intervention = response.json()
        assert intervention["categorie_id"] == plomberie_category_id
        assert intervention["titre"] == intervention_data["titre"]
        assert "id" in intervention
        
        # Store for cleanup
        return intervention["id"]
    
    def test_save_checklist_responses(self, tech_headers, client_id, plomberie_category_id):
        """Test 4: PUT /api/interventions/{id}/checklist saves responses"""
        # Create intervention first
        intervention_data = {
            "client_id": client_id,
            "titre": f"TEST_Checklist_Save_{uuid.uuid4().hex[:8]}",
            "date_prevue": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "categorie_id": plomberie_category_id
        }
        
        create_response = requests.post(f"{BASE_URL}/api/interventions", 
                                       headers=tech_headers, json=intervention_data)
        assert create_response.status_code == 200
        intervention_id = create_response.json()["id"]
        
        # Claim the intervention so tech can update it
        claim_response = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim",
                                      headers=tech_headers)
        assert claim_response.status_code == 200
        
        # Save checklist responses
        checklist_responses = [
            {"item_id": "plb_1", "label": "Coupure eau effectuee", "type": "checkbox", "checked": True},
            {"item_id": "plb_2", "label": "Fuite identifiee", "type": "checkbox", "checked": True},
            {"item_id": "plb_3", "label": "Test etancheite", "type": "checkbox", "checked": False},
            {"item_id": "plb_4", "label": "Pression (bar)", "type": "number", "value": "3.5"},
            {"item_id": "plb_7", "label": "Observations", "type": "text", "value": "Test observation"}
        ]
        
        response = requests.put(f"{BASE_URL}/api/interventions/{intervention_id}/checklist",
                               headers=tech_headers, json=checklist_responses)
        
        assert response.status_code == 200, f"Failed to save checklist: {response.text}"
        
        result = response.json()
        assert result["message"] == "Checklist mise à jour"
        assert len(result["responses"]) == 5
        
        # Verify responses have completed_at for checked/filled items
        for r in result["responses"]:
            if r["checked"] or r["value"]:
                assert r["completed_at"] is not None
        
        return intervention_id
    
    def test_get_intervention_with_checklist_responses(self, tech_headers, client_id, plomberie_category_id):
        """Test 5: GET /api/interventions/{id} returns saved checklist_responses"""
        # Create and setup intervention with checklist
        intervention_data = {
            "client_id": client_id,
            "titre": f"TEST_Checklist_Get_{uuid.uuid4().hex[:8]}",
            "date_prevue": (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z",
            "categorie_id": plomberie_category_id
        }
        
        create_response = requests.post(f"{BASE_URL}/api/interventions", 
                                       headers=tech_headers, json=intervention_data)
        intervention_id = create_response.json()["id"]
        
        # Claim intervention
        requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/claim",
                     headers=tech_headers)
        
        # Save checklist
        checklist_responses = [
            {"item_id": "plb_1", "label": "Coupure eau", "type": "checkbox", "checked": True},
            {"item_id": "plb_4", "label": "Pression", "type": "number", "value": "4.0"}
        ]
        requests.put(f"{BASE_URL}/api/interventions/{intervention_id}/checklist",
                    headers=tech_headers, json=checklist_responses)
        
        # GET intervention and verify checklist_responses
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}",
                               headers=tech_headers)
        
        assert response.status_code == 200
        
        intervention = response.json()
        assert intervention["categorie_id"] == plomberie_category_id
        assert "checklist_responses" in intervention
        assert len(intervention["checklist_responses"]) == 2
        
        # Verify specific values
        responses_by_id = {r["item_id"]: r for r in intervention["checklist_responses"]}
        assert responses_by_id["plb_1"]["checked"] == True
        assert responses_by_id["plb_4"]["value"] == "4.0"
    
    def test_verify_existing_intervention_checklist(self, tech_headers):
        """Verify the existing intervention d47285fd-e5b6-4084-ace4-e134b88617b2 has checklist"""
        intervention_id = "d47285fd-e5b6-4084-ace4-e134b88617b2"
        
        response = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}",
                               headers=tech_headers)
        
        assert response.status_code == 200
        
        intervention = response.json()
        assert intervention["categorie_id"] is not None
        assert "checklist_responses" in intervention
        assert len(intervention["checklist_responses"]) == 5, "Expected 5 checklist responses"


class TestCategoryColors:
    """Test that categories have proper colors for UI display"""
    
    def test_all_categories_have_colors(self, tech_headers):
        """Verify all 6 categories have distinct colors"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=tech_headers)
        categories = response.json()
        
        colors = set()
        for cat in categories:
            assert "couleur" in cat
            assert cat["couleur"].startswith("#"), f"Color should be hex: {cat['couleur']}"
            assert len(cat["couleur"]) == 7, f"Color should be #RRGGBB format: {cat['couleur']}"
            colors.add(cat["couleur"])
        
        # All colors should be distinct
        assert len(colors) == 6, "All categories should have distinct colors"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
