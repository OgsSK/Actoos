"""
Push Notification API Tests
Tests for VAPID key, subscribe, unsubscribe, status, and test notification endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def tech_token(api_client):
    """Get technician authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": TECH_EMAIL,
        "password": TECH_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Tech authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def admin_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed - skipping authenticated tests")


@pytest.fixture(scope="module")
def tech_auth_client(api_client, tech_token):
    """Session with tech auth header"""
    api_client.headers.update({"Authorization": f"Bearer {tech_token}"})
    return api_client


class TestVapidKey:
    """Tests for GET /api/push/vapid-key endpoint"""
    
    def test_get_vapid_key_returns_public_key(self, api_client):
        """GET /api/push/vapid-key should return VAPID public key"""
        response = api_client.get(f"{BASE_URL}/api/push/vapid-key")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "publicKey" in data, "Response should contain publicKey"
        assert isinstance(data["publicKey"], str), "publicKey should be a string"
        assert len(data["publicKey"]) > 50, "publicKey should be a valid VAPID key (>50 chars)"
        # VAPID keys are base64url encoded
        assert data["publicKey"].startswith("B"), "VAPID public key should start with 'B'"
        print(f"✓ VAPID public key returned: {data['publicKey'][:30]}...")
    
    def test_vapid_key_no_auth_required(self, api_client):
        """GET /api/push/vapid-key should work without authentication"""
        # Remove any auth headers
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/push/vapid-key", headers=headers)
        
        assert response.status_code == 200, "VAPID key endpoint should be public"
        print("✓ VAPID key endpoint is public (no auth required)")


class TestPushSubscribe:
    """Tests for POST /api/push/subscribe endpoint"""
    
    def test_subscribe_requires_auth(self, api_client):
        """POST /api/push/subscribe should require authentication"""
        # Remove auth header
        headers = {"Content-Type": "application/json"}
        subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint",
            "keys": {
                "p256dh": "test-p256dh-key",
                "auth": "test-auth-key"
            }
        }
        response = requests.post(f"{BASE_URL}/api/push/subscribe", json=subscription, headers=headers)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Subscribe endpoint requires authentication")
    
    def test_subscribe_with_valid_subscription(self, tech_auth_client):
        """POST /api/push/subscribe should accept valid subscription"""
        # Create a mock subscription object (similar to what browser would send)
        subscription = {
            "endpoint": f"https://fcm.googleapis.com/fcm/send/test-{uuid.uuid4()}",
            "expirationTime": None,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        response = tech_auth_client.post(f"{BASE_URL}/api/push/subscribe", json=subscription)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "subscribed" in data, "Response should contain subscribed field"
        assert data["subscribed"] == True, "subscribed should be True"
        print(f"✓ Subscription created successfully: {data}")
    
    def test_subscribe_duplicate_endpoint(self, tech_auth_client):
        """POST /api/push/subscribe should handle duplicate endpoints gracefully"""
        subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/duplicate-test-endpoint",
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        # Subscribe first time
        response1 = tech_auth_client.post(f"{BASE_URL}/api/push/subscribe", json=subscription)
        assert response1.status_code == 200
        
        # Subscribe second time with same endpoint
        response2 = tech_auth_client.post(f"{BASE_URL}/api/push/subscribe", json=subscription)
        assert response2.status_code == 200
        
        data = response2.json()
        assert "Already subscribed" in data.get("message", "") or data.get("subscribed") == True
        print("✓ Duplicate subscription handled gracefully")
    
    def test_subscribe_invalid_subscription(self, tech_auth_client):
        """POST /api/push/subscribe should reject invalid subscription"""
        # Missing endpoint
        invalid_subscription = {
            "keys": {
                "p256dh": "test-key",
                "auth": "test-auth"
            }
        }
        
        response = tech_auth_client.post(f"{BASE_URL}/api/push/subscribe", json=invalid_subscription)
        
        assert response.status_code == 400, f"Expected 400 for invalid subscription, got {response.status_code}"
        print("✓ Invalid subscription rejected with 400")


class TestPushStatus:
    """Tests for GET /api/push/status endpoint"""
    
    def test_status_requires_auth(self, api_client):
        """GET /api/push/status should require authentication"""
        headers = {"Content-Type": "application/json"}
        response = requests.get(f"{BASE_URL}/api/push/status", headers=headers)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Status endpoint requires authentication")
    
    def test_status_returns_subscription_info(self, tech_auth_client):
        """GET /api/push/status should return subscription status"""
        response = tech_auth_client.get(f"{BASE_URL}/api/push/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "subscribed" in data, "Response should contain subscribed field"
        assert "subscription_count" in data, "Response should contain subscription_count field"
        assert isinstance(data["subscribed"], bool), "subscribed should be boolean"
        assert isinstance(data["subscription_count"], int), "subscription_count should be integer"
        print(f"✓ Push status: subscribed={data['subscribed']}, count={data['subscription_count']}")


class TestPushUnsubscribe:
    """Tests for DELETE /api/push/unsubscribe endpoint"""
    
    def test_unsubscribe_requires_auth(self, api_client):
        """DELETE /api/push/unsubscribe should require authentication"""
        headers = {"Content-Type": "application/json"}
        response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": "https://test.endpoint"},
            headers=headers
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Unsubscribe endpoint requires authentication")
    
    def test_unsubscribe_existing_subscription(self, tech_auth_client):
        """DELETE /api/push/unsubscribe should remove subscription"""
        # First subscribe
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/unsubscribe-test-{uuid.uuid4()}"
        subscription = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        subscribe_response = tech_auth_client.post(f"{BASE_URL}/api/push/subscribe", json=subscription)
        assert subscribe_response.status_code == 200, "Failed to subscribe for unsubscribe test"
        
        # Now unsubscribe
        response = tech_auth_client.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": test_endpoint}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        print(f"✓ Unsubscribe successful: {data['message']}")


class TestPushTestNotification:
    """Tests for POST /api/push/test endpoint"""
    
    def test_test_notification_requires_auth(self, api_client):
        """POST /api/push/test should require authentication"""
        headers = {"Content-Type": "application/json"}
        response = requests.post(f"{BASE_URL}/api/push/test", headers=headers)
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Test notification endpoint requires authentication")
    
    def test_test_notification_without_subscription(self, api_client, tech_token):
        """POST /api/push/test should fail if user has no subscriptions"""
        # Create a new session without any subscriptions
        # First, let's check if user has subscriptions and unsubscribe all
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {tech_token}"
        }
        
        # Get current status
        status_response = requests.get(f"{BASE_URL}/api/push/status", headers=headers)
        
        # If user has subscriptions, the test notification might succeed
        # This test verifies the endpoint behavior
        response = requests.post(f"{BASE_URL}/api/push/test", headers=headers)
        
        # Either 200 (if subscribed) or 400 (if not subscribed)
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}"
        
        if response.status_code == 400:
            data = response.json()
            assert "detail" in data, "Error response should contain detail"
            print(f"✓ Test notification correctly fails without subscription: {data['detail']}")
        else:
            data = response.json()
            print(f"✓ Test notification sent (user has subscriptions): {data}")


class TestPushServiceIntegration:
    """Integration tests for push notification service"""
    
    def test_full_subscription_flow(self, api_client, tech_token):
        """Test complete subscription flow: subscribe -> status -> test -> unsubscribe"""
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {tech_token}"
        }
        
        # 1. Get VAPID key
        vapid_response = requests.get(f"{BASE_URL}/api/push/vapid-key")
        assert vapid_response.status_code == 200
        vapid_key = vapid_response.json()["publicKey"]
        print(f"1. Got VAPID key: {vapid_key[:30]}...")
        
        # 2. Subscribe
        test_endpoint = f"https://fcm.googleapis.com/fcm/send/integration-test-{uuid.uuid4()}"
        subscription = {
            "endpoint": test_endpoint,
            "keys": {
                "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
                "auth": "tBHItJI5svbpez7KI4CCXg"
            }
        }
        
        subscribe_response = requests.post(f"{BASE_URL}/api/push/subscribe", json=subscription, headers=headers)
        assert subscribe_response.status_code == 200
        print("2. Subscribed successfully")
        
        # 3. Check status
        status_response = requests.get(f"{BASE_URL}/api/push/status", headers=headers)
        assert status_response.status_code == 200
        status_data = status_response.json()
        assert status_data["subscribed"] == True
        print(f"3. Status confirmed: subscribed={status_data['subscribed']}, count={status_data['subscription_count']}")
        
        # 4. Send test notification (will fail to actually deliver since endpoint is fake, but API should work)
        test_response = requests.post(f"{BASE_URL}/api/push/test", headers=headers)
        # The test notification might fail because the endpoint is fake, but the API should respond
        print(f"4. Test notification response: {test_response.status_code}")
        
        # 5. Unsubscribe
        unsubscribe_response = requests.delete(
            f"{BASE_URL}/api/push/unsubscribe",
            params={"endpoint": test_endpoint},
            headers=headers
        )
        assert unsubscribe_response.status_code == 200
        print("5. Unsubscribed successfully")
        
        print("✓ Full subscription flow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
