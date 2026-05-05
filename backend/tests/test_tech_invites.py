"""
Test suite for Technician Invitation APIs (Iteration 46)
Tests: POST /invite, GET /invites, DELETE /invites/{id}, POST /invites/{id}/resend
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"


class TestTechnicianInvites:
    """Test technician invitation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code} - {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_invite_ids = []
        
        yield
        
        # Cleanup: Cancel any test invites created
        for invite_id in self.created_invite_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/users/invites/{invite_id}")
            except:
                pass
    
    def test_01_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print(f"✓ Login successful, got access token")
    
    def test_02_get_invites_list(self):
        """Test GET /api/users/invites returns list of pending invitations"""
        response = self.session.get(f"{BASE_URL}/api/users/invites")
        assert response.status_code == 200, f"Failed to get invites: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /invites returned {len(data)} invitations")
        
        # If there are invites, verify structure
        if len(data) > 0:
            invite = data[0]
            assert "id" in invite, "Invite should have id"
            assert "telephone" in invite, "Invite should have telephone"
            assert "nom" in invite, "Invite should have nom"
            assert "prenom" in invite, "Invite should have prenom"
            assert "status" in invite, "Invite should have status"
            print(f"✓ Invite structure verified: {invite.get('prenom')} {invite.get('nom')}")
    
    def test_03_create_sms_invite(self):
        """Test POST /api/users/invite creates a new SMS invitation"""
        # Use unique phone number to avoid conflicts
        unique_phone = f"+336{int(time.time()) % 100000000:08d}"
        
        invite_data = {
            "telephone": unique_phone,
            "nom": "TEST_Technicien",
            "prenom": "TEST_Nouveau",
            "email": "test_tech@example.com",
            "send_sms": False  # Don't actually send SMS in test
        }
        
        response = self.session.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        
        # Could be 200 or 201 for creation
        assert response.status_code in [200, 201], f"Failed to create invite: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have invite id"
        assert "invite_code" in data, "Response should have invite_code"
        assert len(data["invite_code"]) == 6, "Invite code should be 6 digits"
        assert data["status"] == "pending", "Status should be pending"
        
        # Store for cleanup
        self.created_invite_ids.append(data["id"])
        
        print(f"✓ Created invite with code: {data['invite_code']}")
        print(f"  - ID: {data['id']}")
        print(f"  - Phone: {data['telephone']}")
        print(f"  - Expires: {data['expires_at']}")
        
        return data["id"]
    
    def test_04_create_invite_duplicate_phone_fails(self):
        """Test that creating invite with existing phone fails"""
        # First create an invite
        unique_phone = f"+336{int(time.time()) % 100000000:08d}"
        
        invite_data = {
            "telephone": unique_phone,
            "nom": "TEST_Duplicate",
            "prenom": "TEST_Check",
            "send_sms": False
        }
        
        # Create first invite
        response1 = self.session.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        if response1.status_code in [200, 201]:
            self.created_invite_ids.append(response1.json()["id"])
        
        # Try to create duplicate
        response2 = self.session.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        assert response2.status_code == 400, f"Duplicate invite should fail: {response2.status_code}"
        print(f"✓ Duplicate phone correctly rejected: {response2.json().get('detail', '')}")
    
    def test_05_cancel_invite(self):
        """Test DELETE /api/users/invites/{id} cancels an invitation"""
        # First create an invite
        unique_phone = f"+336{int(time.time()) % 100000000:08d}"
        
        create_response = self.session.post(f"{BASE_URL}/api/users/invite", json={
            "telephone": unique_phone,
            "nom": "TEST_ToCancel",
            "prenom": "TEST_Cancel",
            "send_sms": False
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create invite to cancel: {create_response.text}")
        
        invite_id = create_response.json()["id"]
        
        # Cancel the invite
        delete_response = self.session.delete(f"{BASE_URL}/api/users/invites/{invite_id}")
        assert delete_response.status_code == 200, f"Failed to cancel invite: {delete_response.text}"
        
        data = delete_response.json()
        assert "message" in data
        print(f"✓ Invite cancelled successfully: {data['message']}")
        
        # Verify it's no longer in pending list
        list_response = self.session.get(f"{BASE_URL}/api/users/invites")
        invites = list_response.json()
        pending_ids = [i["id"] for i in invites if i.get("status") == "pending"]
        assert invite_id not in pending_ids, "Cancelled invite should not be in pending list"
        print(f"✓ Cancelled invite not in pending list")
    
    def test_06_resend_invite(self):
        """Test POST /api/users/invites/{id}/resend resends SMS"""
        # First create an invite
        unique_phone = f"+336{int(time.time()) % 100000000:08d}"
        
        create_response = self.session.post(f"{BASE_URL}/api/users/invite", json={
            "telephone": unique_phone,
            "nom": "TEST_ToResend",
            "prenom": "TEST_Resend",
            "send_sms": False
        })
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Could not create invite to resend: {create_response.text}")
        
        invite_id = create_response.json()["id"]
        self.created_invite_ids.append(invite_id)
        
        # Resend the invite
        resend_response = self.session.post(f"{BASE_URL}/api/users/invites/{invite_id}/resend")
        assert resend_response.status_code == 200, f"Failed to resend invite: {resend_response.text}"
        
        data = resend_response.json()
        assert "message" in data
        assert "new_expires_at" in data, "Should return new expiration time"
        print(f"✓ Invite resent successfully")
        print(f"  - New expiration: {data['new_expires_at']}")
    
    def test_07_cancel_nonexistent_invite_fails(self):
        """Test cancelling non-existent invite returns 404"""
        fake_id = "nonexistent-invite-id-12345"
        response = self.session.delete(f"{BASE_URL}/api/users/invites/{fake_id}")
        assert response.status_code == 404, f"Should return 404 for non-existent invite: {response.status_code}"
        print(f"✓ Non-existent invite correctly returns 404")
    
    def test_08_resend_nonexistent_invite_fails(self):
        """Test resending non-existent invite returns 404"""
        fake_id = "nonexistent-invite-id-12345"
        response = self.session.post(f"{BASE_URL}/api/users/invites/{fake_id}/resend")
        assert response.status_code == 404, f"Should return 404 for non-existent invite: {response.status_code}"
        print(f"✓ Non-existent invite resend correctly returns 404")
    
    def test_09_invite_requires_phone_for_sms(self):
        """Test that SMS invite requires phone number"""
        invite_data = {
            "telephone": "",  # Empty phone
            "nom": "TEST_NoPhone",
            "prenom": "TEST_NoPhone",
            "send_sms": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/users/invite", json=invite_data)
        # Should fail validation
        assert response.status_code in [400, 422], f"Should reject empty phone: {response.status_code}"
        print(f"✓ Empty phone correctly rejected")
    
    def test_10_get_users_list(self):
        """Test GET /api/users returns list of users"""
        response = self.session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200, f"Failed to get users: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /users returned {len(data)} users")
        
        # Verify user structure
        if len(data) > 0:
            user = data[0]
            assert "id" in user
            assert "email" in user
            assert "nom" in user
            assert "prenom" in user
            print(f"✓ User structure verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
