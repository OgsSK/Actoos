"""
Test Suite for ACTOOS PRO Pricing Plans - Iteration 44
Tests pricing consistency across backend APIs and plan limits

TARIFS OFFICIELS ACTOOS PRO (2026):
- Startup: 49€/mois ou 470,40€/an (-20%)
- Pro: 79€/mois ou 758,40€/an (-20%)
- Entreprise: 149€/mois ou 1430,40€/an (-20%)

LIMITES PAR PLAN:
- Startup: 1 admin, 3 techniciens, 1 catégorie, 0 SMS
- Pro: 3 admins, 10 techniciens, 4 catégories, 50 SMS
- Entreprise: Illimité admins, Illimité techniciens, Toutes catégories, 500 SMS
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "demo@actoos.com"
TEST_PASSWORD = "demo2024"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for demo account"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestPlansEndpoint:
    """Test /api/plans endpoint - Public endpoint for plan listing"""
    
    def test_plans_endpoint_returns_200(self, api_client):
        """Test that /api/plans returns 200 OK"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/plans returns 200 OK")
    
    def test_plans_returns_three_plans(self, api_client):
        """Test that /api/plans returns exactly 3 plans"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        plan_ids = [p["id"] for p in plans]
        assert "startup" in plan_ids, "Missing startup plan"
        assert "pro" in plan_ids, "Missing pro plan"
        assert "enterprise" in plan_ids, "Missing enterprise plan"
        print("✓ /api/plans returns 3 plans: startup, pro, enterprise")
    
    def test_startup_plan_price_49(self, api_client):
        """Test Startup plan monthly price is 49€"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        startup = next((p for p in plans if p["id"] == "startup"), None)
        assert startup is not None, "Startup plan not found"
        assert startup["price"] == 49.0, f"Expected 49€, got {startup['price']}€"
        print("✓ Startup plan price: 49€/mois")
    
    def test_pro_plan_price_79(self, api_client):
        """Test Pro plan monthly price is 79€"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        assert pro["price"] == 79.0, f"Expected 79€, got {pro['price']}€"
        print("✓ Pro plan price: 79€/mois")
    
    def test_enterprise_plan_price_149(self, api_client):
        """Test Enterprise plan monthly price is 149€"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise["price"] == 149.0, f"Expected 149€, got {enterprise['price']}€"
        print("✓ Enterprise plan price: 149€/mois")
    
    def test_startup_annual_price_470_40(self, api_client):
        """Test Startup plan annual price is 470.40€ (-20%)"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        startup = next((p for p in plans if p["id"] == "startup"), None)
        assert startup is not None, "Startup plan not found"
        assert startup["price_annual"] == 470.4, f"Expected 470.40€, got {startup['price_annual']}€"
        print("✓ Startup annual price: 470.40€/an (-20%)")
    
    def test_pro_annual_price_758_40(self, api_client):
        """Test Pro plan annual price is 758.40€ (-20%)"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        assert pro["price_annual"] == 758.4, f"Expected 758.40€, got {pro['price_annual']}€"
        print("✓ Pro annual price: 758.40€/an (-20%)")
    
    def test_enterprise_annual_price_1430_40(self, api_client):
        """Test Enterprise plan annual price is 1430.40€ (-20%)"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise["price_annual"] == 1430.4, f"Expected 1430.40€, got {enterprise['price_annual']}€"
        print("✓ Enterprise annual price: 1430.40€/an (-20%)")


class TestPlanLimits:
    """Test plan limits are correctly defined"""
    
    def test_startup_limits(self, api_client):
        """Test Startup plan limits: 1 admin, 3 techs, 1 category"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        startup = next((p for p in plans if p["id"] == "startup"), None)
        assert startup is not None, "Startup plan not found"
        
        limits = startup.get("limits", {})
        assert limits.get("max_admins") == 1, f"Expected 1 admin, got {limits.get('max_admins')}"
        assert limits.get("max_technicians") == 3, f"Expected 3 techs, got {limits.get('max_technicians')}"
        assert limits.get("max_categories") == 1, f"Expected 1 category, got {limits.get('max_categories')}"
        print("✓ Startup limits: 1 admin, 3 techniciens, 1 catégorie")
    
    def test_pro_limits(self, api_client):
        """Test Pro plan limits: 3 admins, 10 techs, 4 categories"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        
        limits = pro.get("limits", {})
        assert limits.get("max_admins") == 3, f"Expected 3 admins, got {limits.get('max_admins')}"
        assert limits.get("max_technicians") == 10, f"Expected 10 techs, got {limits.get('max_technicians')}"
        assert limits.get("max_categories") == 4, f"Expected 4 categories, got {limits.get('max_categories')}"
        print("✓ Pro limits: 3 admins, 10 techniciens, 4 catégories")
    
    def test_enterprise_limits_unlimited(self, api_client):
        """Test Enterprise plan limits: unlimited (-1)"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        
        limits = enterprise.get("limits", {})
        assert limits.get("max_admins") == -1, f"Expected -1 (unlimited), got {limits.get('max_admins')}"
        assert limits.get("max_technicians") == -1, f"Expected -1 (unlimited), got {limits.get('max_technicians')}"
        assert limits.get("max_categories") == -1, f"Expected -1 (unlimited), got {limits.get('max_categories')}"
        print("✓ Enterprise limits: illimité admins, illimité techniciens, toutes catégories")


class TestUsageEndpoint:
    """Test /api/usage endpoint - Authenticated endpoint for current usage"""
    
    def test_usage_endpoint_requires_auth(self, api_client):
        """Test that /api/usage requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/usage")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ /api/usage requires authentication")
    
    def test_usage_endpoint_returns_200_with_auth(self, api_client, auth_token):
        """Test that /api/usage returns 200 with valid token"""
        response = api_client.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ /api/usage returns 200 with valid token")
    
    def test_usage_returns_plan_info(self, api_client, auth_token):
        """Test that /api/usage returns plan information"""
        response = api_client.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        assert "plan" in data, "Missing 'plan' field"
        assert "plan_name" in data, "Missing 'plan_name' field"
        assert "usage" in data, "Missing 'usage' field"
        print(f"✓ /api/usage returns plan info: {data.get('plan_name')}")
    
    def test_usage_returns_correct_limits_for_enterprise(self, api_client, auth_token):
        """Test that demo account (Enterprise) has unlimited limits"""
        response = api_client.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        # Demo account should be on Enterprise plan
        assert data.get("plan") == "enterprise", f"Expected enterprise plan, got {data.get('plan')}"
        
        usage = data.get("usage", {})
        
        # Check technicians limit is unlimited (-1)
        tech_max = usage.get("technicians", {}).get("max")
        assert tech_max == -1, f"Expected -1 (unlimited) for technicians, got {tech_max}"
        
        # Check categories limit is unlimited (-1)
        cat_max = usage.get("categories", {}).get("max")
        assert cat_max == -1, f"Expected -1 (unlimited) for categories, got {cat_max}"
        
        print("✓ Enterprise plan has unlimited limits (-1)")
    
    def test_usage_returns_sms_included(self, api_client, auth_token):
        """Test that /api/usage returns SMS included count"""
        response = api_client.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        data = response.json()
        
        features = data.get("usage", {}).get("features", {})
        sms_included = features.get("sms_included")
        
        # Enterprise should have 500 SMS
        assert sms_included == 500, f"Expected 500 SMS for Enterprise, got {sms_included}"
        print("✓ Enterprise plan has 500 SMS/mois inclus")


class TestPlanFeatures:
    """Test plan features are correctly defined"""
    
    def test_pro_has_50_sms(self, api_client):
        """Test Pro plan has 50 SMS/mois"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        
        features = pro.get("features", [])
        has_50_sms = any("50 SMS" in f for f in features)
        assert has_50_sms, "Pro plan should include '50 SMS/mois inclus'"
        print("✓ Pro plan includes 50 SMS/mois")
    
    def test_enterprise_has_500_sms(self, api_client):
        """Test Enterprise plan has 500 SMS/mois"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        
        features = enterprise.get("features", [])
        has_500_sms = any("500 SMS" in f for f in features)
        assert has_500_sms, "Enterprise plan should include '500 SMS/mois inclus'"
        print("✓ Enterprise plan includes 500 SMS/mois")
    
    def test_pro_has_4_categories_in_features(self, api_client):
        """Test Pro plan features mention 4 categories"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        
        features = pro.get("features", [])
        has_4_categories = any("4 catégorie" in f.lower() for f in features)
        assert has_4_categories, "Pro plan should mention '4 catégories'"
        print("✓ Pro plan features mention 4 catégories")
    
    def test_enterprise_has_unlimited_categories_in_features(self, api_client):
        """Test Enterprise plan features mention unlimited categories"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        
        features = enterprise.get("features", [])
        has_unlimited = any("toutes" in f.lower() or "illimité" in f.lower() for f in features)
        assert has_unlimited, "Enterprise plan should mention unlimited categories"
        print("✓ Enterprise plan features mention unlimited categories")


class TestExtraTechnicianPricing:
    """Test extra technician pricing"""
    
    def test_startup_extra_tech_price_5(self, api_client):
        """Test Startup extra technician price is 5€"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        startup = next((p for p in plans if p["id"] == "startup"), None)
        assert startup is not None, "Startup plan not found"
        
        extra_price = startup.get("price_per_extra_tech")
        assert extra_price == 5.0, f"Expected 5€, got {extra_price}€"
        print("✓ Startup extra tech price: 5€/mois")
    
    def test_pro_extra_tech_price_5(self, api_client):
        """Test Pro extra technician price is 5€"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        pro = next((p for p in plans if p["id"] == "pro"), None)
        assert pro is not None, "Pro plan not found"
        
        extra_price = pro.get("price_per_extra_tech")
        assert extra_price == 5.0, f"Expected 5€, got {extra_price}€"
        print("✓ Pro extra tech price: 5€/mois")
    
    def test_enterprise_extra_tech_price_0(self, api_client):
        """Test Enterprise extra technician price is 0€ (included)"""
        response = api_client.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        enterprise = next((p for p in plans if p["id"] == "enterprise"), None)
        assert enterprise is not None, "Enterprise plan not found"
        
        extra_price = enterprise.get("price_per_extra_tech")
        assert extra_price == 0, f"Expected 0€ (included), got {extra_price}€"
        print("✓ Enterprise extra tech price: 0€ (inclus)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
