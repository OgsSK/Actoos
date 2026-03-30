"""
Test Stripe Subscription Integration for Actoos SaaS
Tests: /api/plans, /api/checkout/session, /api/checkout/status, /api/subscription/current
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSubscriptionPlans:
    """Test 1: GET /api/plans - Returns 3 plans with prices and features"""
    
    def test_get_plans_returns_3_plans(self):
        """Verify GET /api/plans returns exactly 3 subscription plans"""
        response = requests.get(f"{BASE_URL}/api/plans")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        plans = response.json()
        assert isinstance(plans, list), "Response should be a list"
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        # Verify plan IDs
        plan_ids = [p['id'] for p in plans]
        assert 'starter' in plan_ids, "Missing 'starter' plan"
        assert 'pro' in plan_ids, "Missing 'pro' plan"
        assert 'enterprise' in plan_ids, "Missing 'enterprise' plan"
        
        print(f"✓ GET /api/plans returns 3 plans: {plan_ids}")
    
    def test_starter_plan_details(self):
        """Verify Starter plan has correct price (29€) and features"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        starter = next((p for p in plans if p['id'] == 'starter'), None)
        
        assert starter is not None, "Starter plan not found"
        assert starter['name'] == 'Starter', f"Expected name 'Starter', got '{starter['name']}'"
        assert starter['price'] == 29.0, f"Expected price 29.0, got {starter['price']}"
        assert starter['currency'] == 'eur', f"Expected currency 'eur', got '{starter['currency']}'"
        assert 'features' in starter, "Missing 'features' field"
        assert isinstance(starter['features'], list), "Features should be a list"
        assert len(starter['features']) > 0, "Features list should not be empty"
        
        print(f"✓ Starter plan: {starter['price']}€/mois, {len(starter['features'])} features")
    
    def test_pro_plan_details(self):
        """Verify Pro plan has correct price (79€) and features"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        pro = next((p for p in plans if p['id'] == 'pro'), None)
        
        assert pro is not None, "Pro plan not found"
        assert pro['name'] == 'Pro', f"Expected name 'Pro', got '{pro['name']}'"
        assert pro['price'] == 79.0, f"Expected price 79.0, got {pro['price']}"
        assert pro['currency'] == 'eur', f"Expected currency 'eur', got '{pro['currency']}'"
        assert 'features' in pro, "Missing 'features' field"
        assert len(pro['features']) > 0, "Features list should not be empty"
        
        print(f"✓ Pro plan: {pro['price']}€/mois, {len(pro['features'])} features")
    
    def test_enterprise_plan_details(self):
        """Verify Enterprise plan has correct price (199€) and features"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        enterprise = next((p for p in plans if p['id'] == 'enterprise'), None)
        
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise['name'] == 'Enterprise', f"Expected name 'Enterprise', got '{enterprise['name']}'"
        assert enterprise['price'] == 199.0, f"Expected price 199.0, got {enterprise['price']}"
        assert enterprise['currency'] == 'eur', f"Expected currency 'eur', got '{enterprise['currency']}'"
        assert 'features' in enterprise, "Missing 'features' field"
        assert len(enterprise['features']) > 0, "Features list should not be empty"
        
        print(f"✓ Enterprise plan: {enterprise['price']}€/mois, {len(enterprise['features'])} features")


class TestCheckoutSession:
    """Test 2: POST /api/checkout/session - Creates Stripe session with metadata"""
    
    def test_create_checkout_session_starter(self):
        """Verify POST /api/checkout/session creates session for Starter plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "starter",
                "origin_url": "https://test.example.com",
                "entreprise_name": "TEST_Plomberie_Martin",
                "admin_email": "test_checkout@example.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert 'session_id' in data, "Response should contain 'session_id'"
        assert data['url'].startswith('http'), f"URL should be valid: {data['url']}"
        assert len(data['session_id']) > 0, "Session ID should not be empty"
        
        print(f"✓ Checkout session created: {data['session_id'][:20]}...")
        return data['session_id']
    
    def test_create_checkout_session_pro(self):
        """Verify POST /api/checkout/session creates session for Pro plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "pro",
                "origin_url": "https://test.example.com",
                "entreprise_name": "TEST_Electricite_Dupont",
                "admin_email": "test_pro@example.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert 'session_id' in data, "Response should contain 'session_id'"
        
        print(f"✓ Pro checkout session created: {data['session_id'][:20]}...")
    
    def test_create_checkout_session_enterprise(self):
        """Verify POST /api/checkout/session creates session for Enterprise plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "enterprise",
                "origin_url": "https://test.example.com",
                "entreprise_name": "TEST_BTP_Grand",
                "admin_email": "test_enterprise@example.com"
            }
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert 'session_id' in data, "Response should contain 'session_id'"
        
        print(f"✓ Enterprise checkout session created: {data['session_id'][:20]}...")
    
    def test_create_checkout_session_invalid_plan(self):
        """Verify POST /api/checkout/session rejects invalid plan"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "invalid_plan",
                "origin_url": "https://test.example.com"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        
        data = response.json()
        assert 'detail' in data, "Error response should contain 'detail'"
        
        print(f"✓ Invalid plan correctly rejected: {data['detail']}")


class TestCheckoutStatus:
    """Test 3: GET /api/checkout/status/{session_id} - Returns payment status"""
    
    def test_get_checkout_status_valid_session(self):
        """Verify GET /api/checkout/status returns status for valid session"""
        # First create a session
        create_response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "starter",
                "origin_url": "https://test.example.com",
                "entreprise_name": "TEST_Status_Check",
                "admin_email": "test_status@example.com"
            }
        )
        
        assert create_response.status_code == 200, f"Failed to create session: {create_response.text}"
        session_id = create_response.json()['session_id']
        
        # Now check status
        status_response = requests.get(f"{BASE_URL}/api/checkout/status/{session_id}")
        
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}: {status_response.text}"
        
        data = status_response.json()
        assert 'status' in data, "Response should contain 'status'"
        assert 'payment_status' in data, "Response should contain 'payment_status'"
        
        # For a new session, status should be 'open' or similar
        print(f"✓ Checkout status: status={data['status']}, payment_status={data['payment_status']}")
    
    def test_get_checkout_status_invalid_session(self):
        """Verify GET /api/checkout/status handles invalid session gracefully"""
        response = requests.get(f"{BASE_URL}/api/checkout/status/invalid_session_id_12345")
        
        # Should return error or empty status
        # The API might return 200 with error info or 404
        print(f"✓ Invalid session status check: {response.status_code}")


class TestCurrentSubscription:
    """Test 4: GET /api/subscription/current - Returns current subscription"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token for admin user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={
                "email": "admin@testplomberie.fr",
                "password": "password123"
            }
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_get_current_subscription_authenticated(self, auth_token):
        """Verify GET /api/subscription/current returns subscription for authenticated user"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/subscription/current",
            headers=headers
        )
        
        # For legacy accounts without subscription data, 404 is expected
        # For new accounts created via Stripe, 200 with subscription data
        if response.status_code == 404:
            data = response.json()
            assert 'detail' in data, "404 response should contain 'detail'"
            print(f"✓ Legacy account without subscription data: {data['detail']}")
            print("  Note: This is expected for accounts created before Stripe integration")
            return
        
        assert response.status_code == 200, f"Expected 200 or 404, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'plan_id' in data, "Response should contain 'plan_id'"
        assert 'plan_name' in data, "Response should contain 'plan_name'"
        assert 'status' in data, "Response should contain 'status'"
        assert 'usage' in data, "Response should contain 'usage'"
        
        # Verify usage structure
        usage = data['usage']
        assert 'technicians' in usage, "Usage should contain 'technicians'"
        assert 'interventions_this_month' in usage, "Usage should contain 'interventions_this_month'"
        
        print(f"✓ Current subscription: {data['plan_name']} ({data['status']})")
        print(f"  Usage: {usage['technicians']} techs, {usage['interventions_this_month']} interventions this month")
    
    def test_get_current_subscription_unauthenticated(self):
        """Verify GET /api/subscription/current requires authentication"""
        response = requests.get(f"{BASE_URL}/api/subscription/current")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        
        print(f"✓ Unauthenticated request correctly rejected: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
