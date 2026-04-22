"""
Test Suite for Iteration 30 - Chat, Devis Signature, PWA Manifest
Features tested:
1. Chat Backend: GET /api/chat/conversations - Liste des conversations
2. Chat Backend: GET /api/chat/messages/{user_id} - Messages d'une conversation
3. Chat Backend: POST /api/chat/messages - Envoyer un message
4. Chat Backend: GET /api/chat/unread-count - Compteur messages non lus
5. Devis Backend: GET /api/devis?created_by_tech=true - Liste devis du tech (MISSING PARAM)
6. Devis Backend: POST /api/devis/{id}/sign - Signature client du devis
7. PWA: manifest.json avec couleur verte #22C55E et nouveaux icons
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"
TEST_CLIENT_ID = "19a542c4-fbf3-4da4-b15e-4649a119d936"


class TestAuthentication:
    """Authentication tests to get token for subsequent tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, f"No access_token in response: {data.keys()}"
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data, f"Expected access_token in response: {data.keys()}"
        assert "user" in data
        print(f"✓ Login successful for {ADMIN_EMAIL}")


class TestChatConversations:
    """Test Chat Conversations endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_conversations_endpoint_exists(self, auth_headers):
        """Test GET /api/chat/conversations endpoint exists and returns 200"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/chat/conversations returns 200")
    
    def test_get_conversations_returns_list(self, auth_headers):
        """Test conversations endpoint returns a list"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Conversations endpoint returns list with {len(data)} items")
    
    def test_get_conversations_structure(self, auth_headers):
        """Test conversation structure if any exist"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Note: May be empty if no technicians exist
        if len(data) > 0:
            conv = data[0]
            expected_fields = ["user_id", "user_name", "role"]
            for field in expected_fields:
                assert field in conv, f"Missing field: {field}"
            print(f"✓ Conversation structure valid: {list(conv.keys())}")
        else:
            print("✓ No conversations (no technicians) - this is expected per agent context")


class TestChatMessages:
    """Test Chat Messages endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_get_messages_endpoint_exists(self, auth_headers):
        """Test GET /api/chat/messages/{user_id} endpoint exists"""
        # Use a dummy user_id - should return empty list or 200
        dummy_user_id = "test-user-123"
        response = requests.get(f"{BASE_URL}/api/chat/messages/{dummy_user_id}", headers=auth_headers)
        # Should return 200 with empty list, not 404
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ GET /api/chat/messages/{dummy_user_id} returns 200 with list")
    
    def test_post_message_endpoint_exists(self, auth_headers):
        """Test POST /api/chat/messages endpoint exists"""
        # Try to send a message (may fail if no recipient, but endpoint should exist)
        response = requests.post(
            f"{BASE_URL}/api/chat/messages",
            headers=auth_headers,
            json={
                "content": "Test message from iteration 30",
                "recipient_id": None  # Broadcast
            }
        )
        # Should return 200 for broadcast message
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Message should have an id"
        assert "content" in data, "Message should have content"
        print(f"✓ POST /api/chat/messages works - message id: {data.get('id', 'N/A')[:8]}...")
    
    def test_post_message_structure(self, auth_headers):
        """Test message response structure"""
        response = requests.post(
            f"{BASE_URL}/api/chat/messages",
            headers=auth_headers,
            json={
                "content": "Test message structure check",
                "recipient_id": None
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_fields = ["id", "sender_id", "sender_name", "content", "created_at"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Message structure valid: {list(data.keys())}")


class TestChatUnreadCount:
    """Test Chat Unread Count endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_unread_count_endpoint_exists(self, auth_headers):
        """Test GET /api/chat/unread-count endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/chat/unread-count", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/chat/unread-count returns 200")
    
    def test_unread_count_structure(self, auth_headers):
        """Test unread count response structure"""
        response = requests.get(f"{BASE_URL}/api/chat/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "unread_count" in data, "Missing unread_count field"
        assert isinstance(data["unread_count"], int), "unread_count should be integer"
        print(f"✓ Unread count: {data['unread_count']}")


class TestDevisListWithTechFilter:
    """Test Devis list with created_by_tech filter"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_devis_list_endpoint_exists(self, auth_headers):
        """Test GET /api/devis endpoint exists"""
        response = requests.get(f"{BASE_URL}/api/devis", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ GET /api/devis returns 200")
    
    def test_devis_list_with_statut_filter(self, auth_headers):
        """Test GET /api/devis?statut=envoye works"""
        response = requests.get(f"{BASE_URL}/api/devis?statut=envoye", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/devis?statut=envoye returns {len(data)} devis")
    
    def test_devis_list_created_by_tech_param_NOT_IMPLEMENTED(self, auth_headers):
        """
        Test GET /api/devis?created_by_tech=true
        NOTE: This parameter is NOT implemented in the backend!
        The frontend TechnicianApp.jsx expects this but backend doesn't support it.
        """
        response = requests.get(f"{BASE_URL}/api/devis?created_by_tech=true", headers=auth_headers)
        # The endpoint will return 200 but ignore the parameter
        assert response.status_code == 200
        
        # Check if the parameter is actually being used
        # For tech users, the backend filters by technicien_id automatically
        # But created_by_tech param is not explicitly handled
        print("⚠ GET /api/devis?created_by_tech=true - Parameter NOT implemented in backend")
        print("  Backend filters by technicien_id for tech users automatically")
        print("  The created_by_tech parameter is ignored")


class TestDevisSignature:
    """Test Devis Signature endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def auth_headers(self, admin_token):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_sign_devis_endpoint_exists(self, auth_headers):
        """Test POST /api/devis/{id}/sign endpoint exists"""
        # Use a non-existent devis ID to test endpoint existence
        fake_devis_id = "non-existent-devis-id"
        response = requests.post(
            f"{BASE_URL}/api/devis/{fake_devis_id}/sign",
            headers=auth_headers,
            json={
                "signature": "data:image/png;base64,test",
                "nom_signataire": "Test Signataire"
            }
        )
        # Should return 404 for non-existent devis, not 405 (method not allowed)
        assert response.status_code in [404, 422], f"Expected 404 or 422, got {response.status_code}: {response.text}"
        print(f"✓ POST /api/devis/{{id}}/sign endpoint exists (returns {response.status_code} for non-existent devis)")
    
    def test_sign_devis_requires_signature_param(self, auth_headers):
        """Test that sign endpoint requires signature parameter"""
        fake_devis_id = "non-existent-devis-id"
        response = requests.post(
            f"{BASE_URL}/api/devis/{fake_devis_id}/sign",
            headers=auth_headers,
            json={"nom_signataire": "Test"}  # Missing signature
        )
        # Should return 422 for missing required parameter
        assert response.status_code == 422, f"Expected 422 for missing signature, got {response.status_code}"
        print(f"✓ Sign endpoint validates required signature parameter")
    
    def test_sign_devis_requires_nom_signataire_param(self, auth_headers):
        """Test that sign endpoint requires nom_signataire parameter"""
        fake_devis_id = "non-existent-devis-id"
        response = requests.post(
            f"{BASE_URL}/api/devis/{fake_devis_id}/sign",
            headers=auth_headers,
            json={"signature": "data:image/png;base64,test"}  # Missing nom_signataire
        )
        # Should return 422 for missing required parameter
        assert response.status_code == 422, f"Expected 422 for missing nom_signataire, got {response.status_code}"
        print(f"✓ Sign endpoint validates required nom_signataire parameter")
    
    def test_sign_devis_with_real_devis(self, auth_headers):
        """Test signing a real devis with JSON body (as frontend does)"""
        # First, get a client to create a devis
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200
        clients = response.json()
        
        if not clients:
            pytest.skip("No clients available to create test devis")
        
        client_id = clients[0]["id"]
        
        # Create a test devis
        response = requests.post(f"{BASE_URL}/api/devis", headers=auth_headers, json={
            "client_id": client_id,
            "lignes": [
                {"description": "TEST_ITERATION30_SIGN Service", "quantite": 1, "prix_unitaire": 100, "tva": 20}
            ],
            "conditions": "Test conditions",
            "validite_jours": 30
        })
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        devis = response.json()
        devis_id = devis["id"]
        
        # Sign the devis using JSON body (as frontend does)
        response = requests.post(
            f"{BASE_URL}/api/devis/{devis_id}/sign",
            headers=auth_headers,
            json={
                "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "nom_signataire": "TEST_ITERATION30_Signataire"
            }
        )
        assert response.status_code == 200, f"Failed to sign devis: {response.text}"
        data = response.json()
        assert "message" in data
        assert "date_signature" in data
        print(f"✓ Successfully signed devis {devis_id[:8]}... with JSON body")


class TestPWAManifest:
    """Test PWA Manifest configuration"""
    
    def test_manifest_exists(self):
        """Test manifest.json is accessible"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ manifest.json is accessible")
    
    def test_manifest_theme_color_green(self):
        """Test manifest has green theme_color #22C55E"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        theme_color = manifest.get("theme_color", "")
        
        assert theme_color.upper() == "#22C55E", f"Expected theme_color #22C55E, got {theme_color}"
        print(f"✓ manifest.json theme_color is {theme_color}")
    
    def test_manifest_has_icons(self):
        """Test manifest has icons array"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        icons = manifest.get("icons", [])
        
        assert len(icons) > 0, "Manifest should have icons"
        print(f"✓ manifest.json has {len(icons)} icons")
    
    def test_manifest_has_required_fields(self):
        """Test manifest has required PWA fields"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        required_fields = ["name", "short_name", "start_url", "display", "theme_color", "background_color"]
        
        for field in required_fields:
            assert field in manifest, f"Missing required field: {field}"
        
        print(f"✓ manifest.json has all required fields: {required_fields}")
    
    def test_manifest_name_actoos_pro(self):
        """Test manifest name contains ACTOOS PRO"""
        response = requests.get(f"{BASE_URL}/manifest.json")
        assert response.status_code == 200
        
        manifest = response.json()
        name = manifest.get("name", "")
        short_name = manifest.get("short_name", "")
        
        assert "ACTOOS" in name.upper() or "ACTOOS" in short_name.upper(), \
            f"Name should contain ACTOOS: name={name}, short_name={short_name}"
        print(f"✓ manifest.json name: {name}, short_name: {short_name}")


class TestChatEndpointsRequireAuth:
    """Test that chat endpoints require authentication"""
    
    def test_conversations_requires_auth(self):
        """Test GET /api/chat/conversations requires auth"""
        response = requests.get(f"{BASE_URL}/api/chat/conversations")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/chat/conversations requires authentication")
    
    def test_messages_requires_auth(self):
        """Test GET /api/chat/messages/{id} requires auth"""
        response = requests.get(f"{BASE_URL}/api/chat/messages/test-id")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/chat/messages/{{id}} requires authentication")
    
    def test_post_message_requires_auth(self):
        """Test POST /api/chat/messages requires auth"""
        response = requests.post(f"{BASE_URL}/api/chat/messages", json={"content": "test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ POST /api/chat/messages requires authentication")
    
    def test_unread_count_requires_auth(self):
        """Test GET /api/chat/unread-count requires auth"""
        response = requests.get(f"{BASE_URL}/api/chat/unread-count")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ GET /api/chat/unread-count requires authentication")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
