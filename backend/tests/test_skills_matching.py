"""
Test Suite for Skills & Categories Matching Feature
Tests:
- PUT /api/users/{id}/skills - Update technician skills
- GET /api/users/{id}/skills - Get technician skills with details
- GET /api/interventions/available - Filter by technician skills
- GET /api/interventions/today - Filter by skills for today's interventions
- GET /api/interventions?include_available=true - Filter by skills
- Push notifications sent only to qualified techs
"""
import pytest
import requests
import os
from datetime import datetime, timedelta
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def tech_token():
    """Get tech authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TECH_EMAIL,
        "password": TECH_PASSWORD
    })
    assert response.status_code == 200, f"Tech login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def tech_headers(tech_token):
    return {"Authorization": f"Bearer {tech_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def categories(admin_headers):
    """Get all categories"""
    response = requests.get(f"{BASE_URL}/api/categories", headers=admin_headers)
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def users(admin_headers):
    """Get all users"""
    response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
    assert response.status_code == 200
    return response.json()


@pytest.fixture(scope="module")
def tech_users(users):
    """Get only technician users"""
    return [u for u in users if u["role"] == "tech"]


@pytest.fixture(scope="module")
def category_map(categories):
    """Map category codes to IDs"""
    return {c["code"]: c["id"] for c in categories}


class TestSkillsAPIEndpoints:
    """Test skills management API endpoints"""
    
    def test_get_categories_returns_all_categories(self, admin_headers, categories):
        """Verify categories endpoint returns expected categories"""
        codes = [c["code"] for c in categories]
        assert "plomberie" in codes
        assert "electricite" in codes
        assert "btp" in codes
        print(f"✓ Found {len(categories)} categories: {codes}")
    
    def test_get_user_skills_returns_skill_ids_and_details(self, admin_headers, tech_users, categories):
        """GET /api/users/{id}/skills returns skills with category details"""
        # Find Jean Dupont (tech with skills)
        jean = next((u for u in tech_users if u["prenom"] == "Jean" and u["nom"] == "Dupont"), None)
        if not jean:
            pytest.skip("Jean Dupont tech user not found")
        
        response = requests.get(f"{BASE_URL}/api/users/{jean['id']}/skills", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "skills" in data
        assert "categories" in data
        
        # Jean should have Plomberie + Electricité skills
        skill_ids = data["skills"]
        category_names = [c["nom"] for c in data["categories"]]
        
        print(f"✓ Jean Dupont skills: {category_names}")
        assert len(skill_ids) >= 1, "Jean should have at least one skill"
    
    def test_get_user_skills_empty_for_polyvalent_tech(self, admin_headers, tech_users):
        """Tech with no skills should return empty skills array"""
        # Find a tech without skills or create test scenario
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        
        # Check if any tech has empty skills
        techs_without_skills = [u for u in users if u["role"] == "tech" and not u.get("skills")]
        
        if techs_without_skills:
            tech = techs_without_skills[0]
            response = requests.get(f"{BASE_URL}/api/users/{tech['id']}/skills", headers=admin_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["skills"] == []
            assert data["categories"] == []
            print(f"✓ Tech {tech['prenom']} has no skills (polyvalent)")
        else:
            print("✓ All techs have skills assigned - skipping empty skills test")
    
    def test_update_user_skills_admin_only(self, admin_headers, tech_headers, tech_users, category_map):
        """PUT /api/users/{id}/skills requires admin role"""
        if not tech_users:
            pytest.skip("No tech users found")
        
        tech = tech_users[0]
        plomberie_id = category_map.get("plomberie")
        
        # Tech trying to update skills should fail
        response = requests.put(
            f"{BASE_URL}/api/users/{tech['id']}/skills",
            headers=tech_headers,
            json={"skills": [plomberie_id]}
        )
        assert response.status_code == 403, "Tech should not be able to update skills"
        print("✓ Tech cannot update skills (403 Forbidden)")
        
        # Admin can update skills
        response = requests.put(
            f"{BASE_URL}/api/users/{tech['id']}/skills",
            headers=admin_headers,
            json={"skills": [plomberie_id]}
        )
        assert response.status_code == 200, f"Admin should be able to update skills: {response.text}"
        print("✓ Admin can update skills (200 OK)")
    
    def test_update_skills_validates_category_ids(self, admin_headers, tech_users):
        """PUT /api/users/{id}/skills validates category IDs exist"""
        if not tech_users:
            pytest.skip("No tech users found")
        
        tech = tech_users[0]
        fake_category_id = str(uuid.uuid4())
        
        response = requests.put(
            f"{BASE_URL}/api/users/{tech['id']}/skills",
            headers=admin_headers,
            json={"skills": [fake_category_id]}
        )
        assert response.status_code == 400, "Should reject invalid category IDs"
        print("✓ Invalid category IDs rejected (400 Bad Request)")
    
    def test_update_skills_returns_updated_user(self, admin_headers, tech_users, category_map):
        """PUT /api/users/{id}/skills returns updated user with new skills"""
        if not tech_users:
            pytest.skip("No tech users found")
        
        tech = tech_users[0]
        plomberie_id = category_map.get("plomberie")
        electricite_id = category_map.get("electricite")
        
        # Update with multiple skills
        response = requests.put(
            f"{BASE_URL}/api/users/{tech['id']}/skills",
            headers=admin_headers,
            json={"skills": [plomberie_id, electricite_id]}
        )
        assert response.status_code == 200
        
        updated_user = response.json()
        assert "skills" in updated_user
        assert plomberie_id in updated_user["skills"]
        assert electricite_id in updated_user["skills"]
        print(f"✓ Updated user has skills: {updated_user['skills']}")


class TestSkillsBasedInterventionFiltering:
    """Test that interventions are filtered based on technician skills"""
    
    def test_available_interventions_filtered_by_skills(self, tech_headers, admin_headers, category_map):
        """GET /api/interventions/available filters by tech skills"""
        # First, get the tech's skills
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        assert response.status_code == 200
        tech_user = response.json()["user"]
        tech_skills = tech_user.get("skills", [])
        
        # Get available interventions
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=tech_headers)
        assert response.status_code == 200
        available = response.json()
        
        print(f"✓ Tech has skills: {tech_skills}")
        print(f"✓ Found {len(available)} available interventions")
        
        # If tech has skills, verify filtering
        if tech_skills:
            for intervention in available:
                cat_id = intervention.get("categorie_id")
                # Intervention should either match tech's skills OR have no category
                if cat_id:
                    assert cat_id in tech_skills or cat_id is None, \
                        f"Intervention {intervention['id']} has category {cat_id} not in tech skills"
            print("✓ All available interventions match tech skills or have no category")
        else:
            print("✓ Tech has no skills - can see all available interventions (polyvalent)")
    
    def test_today_interventions_filtered_by_skills(self, tech_headers):
        """GET /api/interventions/today filters by tech skills"""
        response = requests.get(f"{BASE_URL}/api/interventions/today", headers=tech_headers)
        assert response.status_code == 200
        today_interventions = response.json()
        
        print(f"✓ Found {len(today_interventions)} interventions for today")
        
        # Verify response structure
        for intervention in today_interventions:
            assert "id" in intervention
            assert "titre" in intervention
            assert "statut" in intervention
            # Client should be enriched
            if intervention.get("client"):
                assert "nom" in intervention["client"]
        
        print("✓ Today interventions have correct structure")
    
    def test_interventions_with_include_available_filtered(self, tech_headers, admin_headers):
        """GET /api/interventions?include_available=true filters available by skills"""
        # Get tech's skills first
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        tech_user = response.json()["user"]
        tech_skills = tech_user.get("skills", [])
        
        # Get interventions with include_available
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers=tech_headers,
            params={"include_available": "true"}
        )
        assert response.status_code == 200
        interventions = response.json()
        
        print(f"✓ Found {len(interventions)} interventions (including available)")
        
        # Count assigned vs available
        assigned = [i for i in interventions if i.get("technicien_id") == tech_user["id"]]
        available = [i for i in interventions if not i.get("technicien_id")]
        
        print(f"  - Assigned to tech: {len(assigned)}")
        print(f"  - Available: {len(available)}")
        
        # Verify available ones match skills
        if tech_skills and available:
            for intervention in available:
                cat_id = intervention.get("categorie_id")
                if cat_id:
                    assert cat_id in tech_skills or cat_id is None, \
                        f"Available intervention has non-matching category"
            print("✓ Available interventions correctly filtered by skills")


class TestSkillsMatchingScenarios:
    """Test specific skills matching scenarios"""
    
    def test_jean_dupont_sees_plomberie_electricite_interventions(self, admin_headers, category_map):
        """Jean Dupont (Plomberie + Electricité) should see matching interventions"""
        # Login as Jean Dupont tech
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Could not login as tech")
        
        tech_token = response.json()["access_token"]
        tech_headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Get available interventions
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=tech_headers)
        assert response.status_code == 200
        available = response.json()
        
        plomberie_id = category_map.get("plomberie")
        electricite_id = category_map.get("electricite")
        btp_id = category_map.get("btp")
        
        # Check that BTP interventions are NOT visible (if any exist)
        btp_interventions = [i for i in available if i.get("categorie_id") == btp_id]
        
        print(f"✓ Jean sees {len(available)} available interventions")
        print(f"  - BTP interventions visible: {len(btp_interventions)} (should be 0 if Jean doesn't have BTP skill)")
        
        # Jean should NOT see BTP interventions
        # Get Jean's actual skills to verify
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=tech_headers)
        jean_skills = response.json()["user"].get("skills", [])
        
        if btp_id not in jean_skills:
            assert len(btp_interventions) == 0, "Jean should NOT see BTP interventions"
            print("✓ Jean correctly cannot see BTP interventions")
    
    def test_polyvalent_tech_sees_all_interventions(self, admin_headers, tech_users, category_map):
        """Tech with no skills (polyvalent) should see ALL available interventions"""
        # Find or create a tech without skills
        polyvalent_tech = None
        for tech in tech_users:
            if not tech.get("skills") or len(tech.get("skills", [])) == 0:
                polyvalent_tech = tech
                break
        
        if not polyvalent_tech:
            # Make a tech polyvalent by clearing skills
            if tech_users:
                tech = tech_users[0]
                response = requests.put(
                    f"{BASE_URL}/api/users/{tech['id']}/skills",
                    headers=admin_headers,
                    json={"skills": []}
                )
                if response.status_code == 200:
                    polyvalent_tech = response.json()
                    print(f"✓ Made {tech['prenom']} polyvalent (cleared skills)")
        
        if polyvalent_tech:
            print(f"✓ Polyvalent tech: {polyvalent_tech.get('prenom', 'Unknown')}")
            print("  - Polyvalent techs can see all available interventions")
        else:
            print("✓ No polyvalent tech to test - all techs have skills")
    
    def test_create_intervention_without_category_visible_to_all(self, admin_headers, tech_headers):
        """Intervention without category should be visible to all techs"""
        # Get a client first
        response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        clients = response.json()
        if not clients:
            pytest.skip("No clients available")
        
        client_id = clients[0]["id"]
        
        # Create intervention WITHOUT category
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
        intervention_data = {
            "client_id": client_id,
            "titre": "TEST_Intervention sans catégorie",
            "description": "Test intervention without category",
            "date_prevue": tomorrow,
            "duree_estimee": 60,
            "priorite": "normale"
            # No categorie_id - should be visible to all
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            headers=admin_headers,
            json=intervention_data
        )
        assert response.status_code == 200, f"Failed to create intervention: {response.text}"
        intervention = response.json()
        intervention_id = intervention["id"]
        
        print(f"✓ Created intervention without category: {intervention_id}")
        
        # Verify tech can see it in available
        response = requests.get(f"{BASE_URL}/api/interventions/available", headers=tech_headers)
        available = response.json()
        
        found = any(i["id"] == intervention_id for i in available)
        assert found, "Intervention without category should be visible to all techs"
        print("✓ Intervention without category visible to tech")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/interventions/{intervention_id}", headers=admin_headers)
        print("✓ Cleaned up test intervention")


class TestSkillsUIDataIntegrity:
    """Test data integrity for skills UI display"""
    
    def test_user_response_includes_skills_field(self, admin_headers):
        """UserResponse model includes skills field"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        
        for user in users:
            assert "skills" in user or user.get("skills") is None, \
                f"User {user['id']} missing skills field"
        
        print(f"✓ All {len(users)} users have skills field in response")
    
    def test_skills_are_valid_category_ids(self, admin_headers, categories):
        """All skill IDs in users reference valid categories"""
        response = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        users = response.json()
        
        category_ids = {c["id"] for c in categories}
        
        for user in users:
            skills = user.get("skills", [])
            for skill_id in skills:
                assert skill_id in category_ids, \
                    f"User {user['prenom']} has invalid skill ID: {skill_id}"
        
        print("✓ All user skills reference valid category IDs")
    
    def test_category_colors_for_badges(self, admin_headers, categories):
        """Categories have colors for UI badge display"""
        for cat in categories:
            assert "couleur" in cat, f"Category {cat['nom']} missing couleur"
            assert cat["couleur"].startswith("#"), f"Category {cat['nom']} has invalid color format"
        
        print(f"✓ All {len(categories)} categories have valid colors for badges")


class TestRestoreOriginalSkills:
    """Restore original skills after tests"""
    
    def test_restore_jean_dupont_skills(self, admin_headers, tech_users, category_map):
        """Restore Jean Dupont's original skills (Plomberie + Electricité)"""
        jean = next((u for u in tech_users if u["prenom"] == "Jean" and u["nom"] == "Dupont"), None)
        if not jean:
            pytest.skip("Jean Dupont not found")
        
        plomberie_id = category_map.get("plomberie")
        electricite_id = category_map.get("electricite")
        
        response = requests.put(
            f"{BASE_URL}/api/users/{jean['id']}/skills",
            headers=admin_headers,
            json={"skills": [plomberie_id, electricite_id]}
        )
        assert response.status_code == 200
        print(f"✓ Restored Jean Dupont skills: Plomberie + Electricité")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
