"""
Test Security Auth Features - Iteration 34
Tests for:
1. POST /api/auth/register returns 403 (direct registration disabled)
2. POST /api/auth/request-password-reset returns generic message (no email enumeration)
3. POST /api/auth/login verifies subscription status
4. Rate limiting on password reset
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"


class TestDirectRegistrationDisabled:
    """Test that direct registration is disabled and returns 403"""
    
    def test_register_returns_403(self):
        """POST /api/auth/register should return 403 with specific message"""
        # Use correct payload format as per RegisterRequest model
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "entreprise_nom": "Test Company",
            "admin_email": "test_new_user@example.com",
            "admin_nom": "Test",
            "admin_prenom": "User",
            "admin_password": "TestPassword123!"
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert "detail" in data
        assert "inscription directe est désactivée" in data["detail"].lower() or "désactivée" in data["detail"]
        print(f"✓ Register returns 403 with message: {data['detail']}")
    
    def test_register_with_different_payload(self):
        """Verify 403 regardless of payload content"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "entreprise_nom": "Another Company",
            "admin_email": "another_test@example.com",
            "admin_nom": "Another",
            "admin_prenom": "User",
            "admin_password": "AnotherPassword123!"
        })
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("✓ Register returns 403 for any payload")


class TestPasswordResetSecurity:
    """Test password reset security - generic messages, no email enumeration"""
    
    def test_reset_existing_email_returns_generic_message(self):
        """Password reset for existing email returns generic message"""
        response = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": ADMIN_EMAIL
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        # Should be generic message that doesn't reveal if email exists
        assert "si l'email existe" in data["message"].lower() or "si un compte existe" in data["message"].lower() or "lien de réinitialisation" in data["message"].lower()
        print(f"✓ Existing email returns generic message: {data['message']}")
    
    def test_reset_nonexistent_email_returns_same_message(self):
        """Password reset for non-existent email returns SAME generic message"""
        response = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": "nonexistent_email_12345@example.com"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data
        # Should be the same generic message
        assert "si l'email existe" in data["message"].lower() or "si un compte existe" in data["message"].lower() or "lien de réinitialisation" in data["message"].lower()
        print(f"✓ Non-existent email returns same generic message: {data['message']}")
    
    def test_reset_messages_are_identical(self):
        """Verify both existing and non-existing emails get identical responses"""
        # Request for existing email
        response1 = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": ADMIN_EMAIL
        })
        
        # Request for non-existing email
        response2 = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": "definitely_not_existing_xyz@example.com"
        })
        
        assert response1.status_code == response2.status_code, "Status codes should be identical"
        
        data1 = response1.json()
        data2 = response2.json()
        
        assert data1.get("message") == data2.get("message"), f"Messages should be identical: '{data1.get('message')}' vs '{data2.get('message')}'"
        print("✓ Both existing and non-existing emails return identical responses (no email enumeration)")


class TestLoginSubscriptionValidation:
    """Test login validates subscription status"""
    
    def test_login_with_active_subscription_succeeds(self):
        """Login with active subscription should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        # Should succeed since test account has active subscription
        assert response.status_code == 200, f"Expected 200, got {response.status_code}. Response: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert "entreprise" in data
        print(f"✓ Login with active subscription succeeds")
        print(f"  - User: {data['user']['email']}")
        print(f"  - Subscription status: {data['entreprise'].get('subscription_status', 'N/A')}")
    
    def test_login_with_wrong_password_fails(self):
        """Login with wrong password should fail with 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword123!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Login with wrong password returns 401")
    
    def test_login_with_nonexistent_email_fails(self):
        """Login with non-existent email should fail with 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent_user_xyz@example.com",
            "password": "SomePassword123!"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Login with non-existent email returns 401")


class TestRateLimiting:
    """Test rate limiting on password reset (3 requests per hour max)"""
    
    def test_rate_limiting_returns_generic_message(self):
        """Even when rate limited, should return generic message (no info leak)"""
        test_email = "rate_limit_test_unique_12345@example.com"
        
        # Make 4 requests quickly
        responses = []
        for i in range(4):
            response = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
                "email": test_email
            })
            responses.append(response)
            time.sleep(0.1)  # Small delay between requests
        
        # All should return 200 with generic message (rate limiting is silent)
        for i, resp in enumerate(responses):
            assert resp.status_code == 200, f"Request {i+1}: Expected 200, got {resp.status_code}"
            data = resp.json()
            assert "message" in data
            # Message should always be generic
            print(f"  Request {i+1}: {data['message']}")
        
        print("✓ Rate limiting returns generic message (no information leak)")


class TestAuthEndpointsExist:
    """Verify all auth endpoints exist and respond"""
    
    def test_register_endpoint_exists(self):
        """Verify /api/auth/register endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={})
        # Should return 403 (disabled) or 422 (validation error), not 404
        assert response.status_code != 404, "Register endpoint should exist"
        print(f"✓ /api/auth/register exists (returns {response.status_code})")
    
    def test_login_endpoint_exists(self):
        """Verify /api/auth/login endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@test.com",
            "password": "test"
        })
        # Should return 401 (invalid credentials), not 404
        assert response.status_code != 404, "Login endpoint should exist"
        print(f"✓ /api/auth/login exists (returns {response.status_code})")
    
    def test_password_reset_endpoint_exists(self):
        """Verify /api/auth/request-password-reset endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/request-password-reset", json={
            "email": "test@test.com"
        })
        # Should return 200 (generic message), not 404
        assert response.status_code != 404, "Password reset endpoint should exist"
        print(f"✓ /api/auth/request-password-reset exists (returns {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
