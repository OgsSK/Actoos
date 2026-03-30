"""
Test suite for Signup Flow - Plans, Categories, and Checkout
Tests the multi-step signup process for Actoos SaaS
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestPlansEndpoint:
    """Tests for /api/plans endpoint - Plan listing and pricing"""
    
    def test_plans_endpoint_returns_200(self):
        """GET /api/plans should return 200"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("SUCCESS: /api/plans returns 200")
    
    def test_plans_returns_three_plans(self):
        """Should return exactly 3 plans: startup, pro, enterprise"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        plan_ids = [p['id'] for p in plans]
        assert 'startup' in plan_ids, "Missing startup plan"
        assert 'pro' in plan_ids, "Missing pro plan"
        assert 'enterprise' in plan_ids, "Missing enterprise plan"
        print("SUCCESS: All 3 plans returned (startup, pro, enterprise)")
    
    def test_startup_plan_price_49(self):
        """Startup plan should cost 49€"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        startup = next((p for p in plans if p['id'] == 'startup'), None)
        assert startup is not None, "Startup plan not found"
        assert startup['price'] == 49.0, f"Expected 49€, got {startup['price']}€"
        assert startup['currency'] == 'eur', f"Expected EUR, got {startup['currency']}"
        print("SUCCESS: Startup plan price is 49€")
    
    def test_pro_plan_price_79(self):
        """Pro plan should cost 79€"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        pro = next((p for p in plans if p['id'] == 'pro'), None)
        assert pro is not None, "Pro plan not found"
        assert pro['price'] == 79.0, f"Expected 79€, got {pro['price']}€"
        assert pro.get('recommended') == True, "Pro plan should be marked as recommended"
        print("SUCCESS: Pro plan price is 79€ and marked as recommended")
    
    def test_enterprise_plan_price_129(self):
        """Enterprise plan should cost 129€"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        enterprise = next((p for p in plans if p['id'] == 'enterprise'), None)
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise['price'] == 129.0, f"Expected 129€, got {enterprise['price']}€"
        print("SUCCESS: Enterprise plan price is 129€")
    
    def test_startup_plan_limits(self):
        """Startup plan should have correct limits: 1 admin, 3 techs, 1 category"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        startup = next((p for p in plans if p['id'] == 'startup'), None)
        limits = startup.get('limits', {})
        
        assert limits.get('max_admins') == 1, f"Expected 1 admin, got {limits.get('max_admins')}"
        assert limits.get('max_technicians') == 3, f"Expected 3 techs, got {limits.get('max_technicians')}"
        assert limits.get('max_categories') == 1, f"Expected 1 category, got {limits.get('max_categories')}"
        print("SUCCESS: Startup plan limits correct (1 admin, 3 techs, 1 category)")
    
    def test_pro_plan_limits(self):
        """Pro plan should have correct limits: 3 admins, 10 techs, 4 categories"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        pro = next((p for p in plans if p['id'] == 'pro'), None)
        limits = pro.get('limits', {})
        
        assert limits.get('max_admins') == 3, f"Expected 3 admins, got {limits.get('max_admins')}"
        assert limits.get('max_technicians') == 10, f"Expected 10 techs, got {limits.get('max_technicians')}"
        assert limits.get('max_categories') == 4, f"Expected 4 categories, got {limits.get('max_categories')}"
        print("SUCCESS: Pro plan limits correct (3 admins, 10 techs, 4 categories)")
    
    def test_enterprise_plan_unlimited(self):
        """Enterprise plan should have unlimited (-1) for all limits"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        enterprise = next((p for p in plans if p['id'] == 'enterprise'), None)
        limits = enterprise.get('limits', {})
        
        assert limits.get('max_admins') == -1, f"Expected unlimited admins (-1), got {limits.get('max_admins')}"
        assert limits.get('max_technicians') == -1, f"Expected unlimited techs (-1), got {limits.get('max_technicians')}"
        assert limits.get('max_categories') == -1, f"Expected unlimited categories (-1), got {limits.get('max_categories')}"
        print("SUCCESS: Enterprise plan has unlimited limits (-1)")
    
    def test_plans_have_features_list(self):
        """Each plan should have a features list"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        for plan in plans:
            assert 'features' in plan, f"Plan {plan['id']} missing features"
            assert isinstance(plan['features'], list), f"Plan {plan['id']} features should be a list"
            assert len(plan['features']) > 0, f"Plan {plan['id']} should have at least one feature"
        
        print("SUCCESS: All plans have features lists")


class TestCheckoutSession:
    """Tests for /api/checkout/session endpoint - Stripe checkout creation"""
    
    def test_checkout_session_requires_plan_id(self):
        """POST /api/checkout/session should require plan_id"""
        response = requests.post(f"{BASE_URL}/api/checkout/session")
        # Should fail without plan_id
        assert response.status_code in [400, 422], f"Expected 400/422 without plan_id, got {response.status_code}"
        print("SUCCESS: Checkout session requires plan_id parameter")
    
    def test_checkout_session_invalid_plan(self):
        """POST /api/checkout/session should reject invalid plan_id"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "invalid_plan",
                "origin_url": "https://test.com"
            }
        )
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("SUCCESS: Checkout session rejects invalid plan_id")
    
    def test_checkout_session_creates_for_valid_plan(self):
        """POST /api/checkout/session should create session for valid plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "startup",
                "origin_url": "https://test.com",
                "entreprise_name": "TEST_Plomberie",
                "admin_email": "test@testplomberie.fr"
            }
        )
        
        # Should return 200 with session URL
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'url' in data, "Response should contain checkout URL"
        assert 'session_id' in data, "Response should contain session_id"
        assert 'stripe.com' in data['url'] or 'checkout' in data['url'], "URL should be Stripe checkout"
        
        print(f"SUCCESS: Checkout session created with URL: {data['url'][:50]}...")


class TestFinalizeSignup:
    """Tests for /api/finalize-signup endpoint"""
    
    def test_finalize_signup_requires_session_id(self):
        """POST /api/finalize-signup should require valid session_id"""
        response = requests.post(f"{BASE_URL}/api/finalize-signup/invalid_session")
        assert response.status_code == 404, f"Expected 404 for invalid session, got {response.status_code}"
        print("SUCCESS: Finalize signup requires valid session_id")


class TestCategoryValidation:
    """Tests for category limits validation in subscription service"""
    
    def test_startup_category_limit_enforced(self):
        """Startup plan should enforce 1 category limit"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        startup = next((p for p in plans if p['id'] == 'startup'), None)
        max_categories = startup['limits']['max_categories']
        
        assert max_categories == 1, f"Startup should allow only 1 category, got {max_categories}"
        print("SUCCESS: Startup plan enforces 1 category limit")
    
    def test_pro_category_limit_enforced(self):
        """Pro plan should enforce 4 category limit"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        pro = next((p for p in plans if p['id'] == 'pro'), None)
        max_categories = pro['limits']['max_categories']
        
        assert max_categories == 4, f"Pro should allow 4 categories, got {max_categories}"
        print("SUCCESS: Pro plan enforces 4 category limit")
    
    def test_enterprise_unlimited_categories(self):
        """Enterprise plan should allow unlimited categories"""
        response = requests.get(f"{BASE_URL}/api/plans")
        plans = response.json()
        
        enterprise = next((p for p in plans if p['id'] == 'enterprise'), None)
        max_categories = enterprise['limits']['max_categories']
        
        assert max_categories == -1, f"Enterprise should allow unlimited categories (-1), got {max_categories}"
        print("SUCCESS: Enterprise plan allows unlimited categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
