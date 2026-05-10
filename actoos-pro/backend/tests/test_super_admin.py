"""
Super Admin API Tests
Tests for the Super Admin dashboard feature - platform owner access only
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
AUTHORIZED_USER = {
    "email": "salifkane612+enterprise@gmail.com",
    "password": "Salifkane&&7"
}

UNAUTHORIZED_USER = {
    "email": "admin@testplomberie.fr",
    "password": "password123"
}


@pytest.fixture(scope="module")
def authorized_token():
    """Get token for authorized super admin user (salifkane612)"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=AUTHORIZED_USER,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not authenticate authorized user: {response.text}")


@pytest.fixture(scope="module")
def unauthorized_token():
    """Get token for unauthorized user (non-salifkane612)"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=UNAUTHORIZED_USER,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not authenticate unauthorized user: {response.text}")


class TestSuperAdminAccess:
    """Test that Super Admin endpoints are properly restricted"""
    
    def test_stats_requires_auth(self):
        """Test that /super-admin/stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_entreprises_requires_auth(self):
        """Test that /super-admin/entreprises requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/entreprises")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_revenue_requires_auth(self):
        """Test that /super-admin/revenue requires authentication"""
        response = requests.get(f"{BASE_URL}/api/super-admin/revenue")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_stats_forbidden_for_non_super_admin(self, unauthorized_token):
        """Test that non-salifkane612 users get 403 on /super-admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        data = response.json()
        assert "super administrateur" in data.get("detail", "").lower() or "accès" in data.get("detail", "").lower()
    
    def test_entreprises_forbidden_for_non_super_admin(self, unauthorized_token):
        """Test that non-salifkane612 users get 403 on /super-admin/entreprises"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises",
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_revenue_forbidden_for_non_super_admin(self, unauthorized_token):
        """Test that non-salifkane612 users get 403 on /super-admin/revenue"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {unauthorized_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


class TestSuperAdminStats:
    """Test /super-admin/stats endpoint for authorized users"""
    
    def test_stats_returns_200_for_super_admin(self, authorized_token):
        """Test that authorized user can access /super-admin/stats"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_stats_contains_entreprises_data(self, authorized_token):
        """Test that stats response contains entreprises data"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "entreprises" in data
        assert "total" in data["entreprises"]
        assert "by_plan" in data["entreprises"]
        assert "by_status" in data["entreprises"]
        assert isinstance(data["entreprises"]["total"], int)
        assert data["entreprises"]["total"] >= 0
    
    def test_stats_contains_users_data(self, authorized_token):
        """Test that stats response contains users data"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert "total" in data["users"]
        assert "admins" in data["users"]
        assert "technicians" in data["users"]
    
    def test_stats_contains_revenue_data(self, authorized_token):
        """Test that stats response contains revenue data (MRR)"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "revenue" in data
        assert "mrr" in data["revenue"]
        assert "currency" in data["revenue"]
        assert data["revenue"]["currency"] == "EUR"
    
    def test_stats_contains_cancellations_data(self, authorized_token):
        """Test that stats response contains cancellations data"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "cancellations" in data
        assert "total" in data["cancellations"]
        assert "recent" in data["cancellations"]
    
    def test_stats_contains_activity_data(self, authorized_token):
        """Test that stats response contains activity data"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/stats",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "activity" in data
        assert "total_interventions" in data["activity"]
        assert "total_devis" in data["activity"]
        assert "total_factures" in data["activity"]


class TestSuperAdminEntreprises:
    """Test /super-admin/entreprises endpoint"""
    
    def test_entreprises_returns_200_for_super_admin(self, authorized_token):
        """Test that authorized user can access /super-admin/entreprises"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_entreprises_returns_list(self, authorized_token):
        """Test that entreprises endpoint returns a list"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "entreprises" in data
        assert "total" in data
        assert isinstance(data["entreprises"], list)
        assert isinstance(data["total"], int)
    
    def test_entreprises_contains_required_fields(self, authorized_token):
        """Test that each entreprise has required fields"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises?limit=5",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if data["entreprises"]:
            ent = data["entreprises"][0]
            assert "id" in ent
            assert "nom" in ent
            assert "email" in ent
            assert "plan" in ent
            assert "subscription_status" in ent
            assert "user_count" in ent
    
    def test_entreprises_filter_by_plan(self, authorized_token):
        """Test filtering entreprises by plan"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises?plan=enterprise",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned entreprises should have enterprise plan
        for ent in data["entreprises"]:
            assert ent["plan"] == "enterprise", f"Expected enterprise plan, got {ent['plan']}"
    
    def test_entreprises_filter_by_status(self, authorized_token):
        """Test filtering entreprises by status"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises?status=active",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # All returned entreprises should have active status
        for ent in data["entreprises"]:
            assert ent["subscription_status"] == "active", f"Expected active status, got {ent['subscription_status']}"
    
    def test_entreprises_pagination(self, authorized_token):
        """Test entreprises pagination"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises?limit=2&skip=0",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "limit" in data
        assert "skip" in data
        assert data["limit"] == 2
        assert len(data["entreprises"]) <= 2


class TestSuperAdminRevenue:
    """Test /super-admin/revenue endpoint"""
    
    def test_revenue_returns_200_for_super_admin(self, authorized_token):
        """Test that authorized user can access /super-admin/revenue"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    def test_revenue_contains_mrr(self, authorized_token):
        """Test that revenue response contains MRR"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "current_mrr" in data
        assert "arr" in data
        assert isinstance(data["current_mrr"], (int, float))
        assert data["arr"] == data["current_mrr"] * 12
    
    def test_revenue_contains_subscription_breakdown(self, authorized_token):
        """Test that revenue response contains subscription breakdown by plan"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "active_subscriptions" in data
        assert "by_plan" in data
        assert "startup" in data["by_plan"]
        assert "pro" in data["by_plan"]
        assert "enterprise" in data["by_plan"]
    
    def test_revenue_contains_monthly_trend(self, authorized_token):
        """Test that revenue response contains monthly trend data"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "monthly_trend" in data
        assert isinstance(data["monthly_trend"], list)
        if data["monthly_trend"]:
            assert "month" in data["monthly_trend"][0]
            assert "estimated_mrr" in data["monthly_trend"][0]


class TestSuperAdminEntrepriseDetails:
    """Test /super-admin/entreprises/{id} endpoint"""
    
    def test_get_entreprise_details(self, authorized_token):
        """Test getting details of a specific entreprise"""
        # First get list of entreprises
        list_response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises?limit=1",
            headers={"Authorization": f"Bearer {authorized_token}"}
        )
        assert list_response.status_code == 200
        entreprises = list_response.json()["entreprises"]
        
        if entreprises:
            ent_id = entreprises[0]["id"]
            
            # Get details
            response = requests.get(
                f"{BASE_URL}/api/super-admin/entreprises/{ent_id}",
                headers={"Authorization": f"Bearer {authorized_token}"}
            )
            assert response.status_code == 200
            data = response.json()
            
            assert "entreprise" in data
            assert "users" in data
            assert "stats" in data
            assert data["entreprise"]["id"] == ent_id


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
