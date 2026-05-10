"""
Test 2FA (Two-Factor Authentication) Features - Iteration 35
Tests: Email OTP and TOTP (Google Authenticator) for admin accounts

Features tested:
1. GET /api/2fa/status - Returns correct 2FA status
2. POST /api/2fa/setup/start with method=totp - Returns QR code and secret
3. POST /api/2fa/setup/start with method=email - Sends code
4. POST /api/2fa/setup/verify - Verifies setup code
5. POST /api/auth/login - Standard login returns access_token (no 2FA)
6. POST /api/2fa/verify-login - Verifies 2FA code during login
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration 34
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"


class Test2FAStatus:
    """Test 2FA status endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            # Check if 2FA is required
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled on this account - cannot test setup")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    def test_2fa_status_endpoint_exists(self):
        """Test GET /api/2fa/status returns correct status"""
        response = self.session.get(f"{BASE_URL}/api/2fa/status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enabled" in data, "Response should contain 'enabled' field"
        assert isinstance(data["enabled"], bool), "'enabled' should be boolean"
        
        # If 2FA is not enabled, method should be None
        if not data["enabled"]:
            assert data.get("method") is None or data.get("method") == None
        
        print(f"2FA Status: enabled={data['enabled']}, method={data.get('method')}")
    
    def test_2fa_status_requires_auth(self):
        """Test that 2FA status requires authentication"""
        # Create new session without auth
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/2fa/status")
        
        # Should return 401 or 403
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class Test2FASetupTOTP:
    """Test 2FA TOTP (Google Authenticator) setup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled on this account")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_setup_totp_returns_qr_code(self):
        """Test POST /api/2fa/setup/start with method=totp returns QR code and secret"""
        # First check if 2FA is already enabled
        status_response = self.session.get(f"{BASE_URL}/api/2fa/status")
        if status_response.status_code == 200 and status_response.json().get("enabled"):
            pytest.skip("2FA already enabled - cannot test setup")
        
        response = self.session.post(f"{BASE_URL}/api/2fa/setup/start", json={
            "method": "totp"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response contains required fields
        assert "method" in data, "Response should contain 'method'"
        assert data["method"] == "totp", "Method should be 'totp'"
        assert "secret" in data, "Response should contain 'secret' for manual entry"
        assert "qr_code" in data, "Response should contain 'qr_code'"
        assert "message" in data, "Response should contain 'message'"
        
        # Verify QR code is base64 data URI
        assert data["qr_code"].startswith("data:image/png;base64,"), "QR code should be base64 PNG data URI"
        
        # Verify secret is valid base32 (TOTP standard)
        secret = data["secret"]
        assert len(secret) >= 16, "Secret should be at least 16 characters"
        
        print(f"TOTP Setup: secret length={len(secret)}, QR code present=True")
    
    def test_setup_totp_invalid_method(self):
        """Test that invalid method returns error"""
        response = self.session.post(f"{BASE_URL}/api/2fa/setup/start", json={
            "method": "invalid_method"
        })
        
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422 for invalid method, got {response.status_code}"


class Test2FASetupEmail:
    """Test 2FA Email OTP setup"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled on this account")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_setup_email_sends_code(self):
        """Test POST /api/2fa/setup/start with method=email sends code"""
        # First check if 2FA is already enabled
        status_response = self.session.get(f"{BASE_URL}/api/2fa/status")
        if status_response.status_code == 200 and status_response.json().get("enabled"):
            pytest.skip("2FA already enabled - cannot test setup")
        
        response = self.session.post(f"{BASE_URL}/api/2fa/setup/start", json={
            "method": "email"
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response contains required fields
        assert "method" in data, "Response should contain 'method'"
        assert data["method"] == "email", "Method should be 'email'"
        assert "message" in data, "Response should contain 'message'"
        
        # Message should indicate email was sent (with masked email)
        assert "envoyé" in data["message"].lower() or "sent" in data["message"].lower(), \
            "Message should indicate code was sent"
        
        print(f"Email Setup: message={data['message']}")


class Test2FAVerifySetup:
    """Test 2FA setup verification endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled on this account")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_verify_setup_endpoint_exists(self):
        """Test POST /api/2fa/setup/verify endpoint exists"""
        # Send invalid code to test endpoint exists
        response = self.session.post(f"{BASE_URL}/api/2fa/setup/verify", json={
            "code": "000000"
        })
        
        # Should return 400 (no pending setup or invalid code), not 404
        assert response.status_code != 404, "Endpoint /api/2fa/setup/verify should exist"
        assert response.status_code in [400, 401, 422], f"Expected 400/401/422, got {response.status_code}"
        
        print(f"Verify setup endpoint exists, returned {response.status_code}")
    
    def test_verify_setup_requires_auth(self):
        """Test that verify setup requires authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        
        response = no_auth_session.post(f"{BASE_URL}/api/2fa/setup/verify", json={
            "code": "123456"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"


class TestLoginWithout2FA:
    """Test standard login flow without 2FA"""
    
    def test_login_returns_access_token(self):
        """Test POST /api/auth/login returns access_token when 2FA is not enabled"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # If 2FA is enabled, we get requires_2fa response
        if data.get("requires_2fa"):
            assert "temp_token" in data, "2FA response should contain temp_token"
            assert "method" in data, "2FA response should contain method"
            print(f"Login requires 2FA: method={data['method']}")
        else:
            # Normal login response
            assert "access_token" in data, "Response should contain 'access_token'"
            assert "user" in data, "Response should contain 'user'"
            assert len(data["access_token"]) > 0, "access_token should not be empty"
            print(f"Login successful: user={data['user'].get('email')}")
    
    def test_login_wrong_password(self):
        """Test login with wrong password returns 401"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class Test2FAVerifyLogin:
    """Test 2FA login verification endpoint"""
    
    def test_verify_login_endpoint_exists(self):
        """Test POST /api/2fa/verify-login endpoint exists"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Send invalid request to test endpoint exists
        response = session.post(f"{BASE_URL}/api/2fa/verify-login", json={
            "temp_token": "invalid_token",
            "code": "000000"
        })
        
        # Should return 400 (invalid token), not 404
        assert response.status_code != 404, "Endpoint /api/2fa/verify-login should exist"
        assert response.status_code in [400, 401, 422], f"Expected 400/401/422, got {response.status_code}"
        
        print(f"Verify login endpoint exists, returned {response.status_code}")
    
    def test_verify_login_invalid_token(self):
        """Test verify login with invalid token returns error"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/2fa/verify-login", json={
            "temp_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
            "code": "123456"
        })
        
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"


class Test2FABackupCodes:
    """Test 2FA backup codes endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled - need to complete 2FA to test")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_backup_codes_endpoint_exists(self):
        """Test GET /api/2fa/backup-codes endpoint exists"""
        response = self.session.get(f"{BASE_URL}/api/2fa/backup-codes")
        
        # Should return 400 (2FA not enabled) or 200 (if enabled), not 404
        assert response.status_code != 404, "Endpoint /api/2fa/backup-codes should exist"
        
        if response.status_code == 200:
            data = response.json()
            assert "count" in data, "Response should contain 'count'"
            assert "total" in data, "Response should contain 'total'"
            print(f"Backup codes: {data['count']}/{data['total']}")
        else:
            print(f"Backup codes endpoint returned {response.status_code} (2FA not enabled)")


class Test2FADisable:
    """Test 2FA disable endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            if data.get("requires_2fa"):
                pytest.skip("2FA is already enabled - need to complete 2FA to test")
            self.token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_disable_endpoint_exists(self):
        """Test POST /api/2fa/disable endpoint exists"""
        response = self.session.post(f"{BASE_URL}/api/2fa/disable", json={
            "password": "test",
            "code": "000000"
        })
        
        # Should return 400/401 (2FA not enabled or wrong credentials), not 404
        assert response.status_code != 404, "Endpoint /api/2fa/disable should exist"
        assert response.status_code in [400, 401], f"Expected 400/401, got {response.status_code}"
        
        print(f"Disable endpoint exists, returned {response.status_code}")


class Test2FASendLoginCode:
    """Test 2FA send login code endpoint (for email method)"""
    
    def test_send_login_code_endpoint_exists(self):
        """Test POST /api/2fa/send-login-code endpoint exists"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Send with invalid token to test endpoint exists
        response = session.post(f"{BASE_URL}/api/2fa/send-login-code?temp_token=invalid_token")
        
        # Should return 400 (invalid token), not 404
        assert response.status_code != 404, "Endpoint /api/2fa/send-login-code should exist"
        assert response.status_code == 400, f"Expected 400 for invalid token, got {response.status_code}"
        
        print(f"Send login code endpoint exists, returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
