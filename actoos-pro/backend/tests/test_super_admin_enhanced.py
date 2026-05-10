"""
Super Admin Enhanced Features Tests
Tests for: Communication, Coupons, CSV Export, Trial Extension, Status Change, Discount Application
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN = {
    "email": "salifkane612+enterprise@gmail.com",
    "password": "Salifkane&&7"
}

REGULAR_USER = {
    "email": "demo@actoos.com",
    "password": "demo2024"
}


@pytest.fixture(scope="module")
def super_admin_token():
    """Get token for super admin user"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=SUPER_ADMIN,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not authenticate super admin: {response.text}")


@pytest.fixture(scope="module")
def regular_user_token():
    """Get token for regular user (non-super admin)"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json=REGULAR_USER,
        headers={"Content-Type": "application/json"}
    )
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Could not authenticate regular user: {response.text}")


@pytest.fixture(scope="module")
def test_entreprise_id(super_admin_token):
    """Get an entreprise ID for testing"""
    response = requests.get(
        f"{BASE_URL}/api/super-admin/entreprises?limit=1",
        headers={"Authorization": f"Bearer {super_admin_token}"}
    )
    if response.status_code == 200:
        entreprises = response.json().get("entreprises", [])
        if entreprises:
            return entreprises[0]["id"]
    pytest.skip("No entreprise found for testing")


# ==================== ACCESS CONTROL TESTS ====================

class TestAccessControl:
    """Test that all enhanced endpoints require super admin access"""
    
    def test_coupons_requires_super_admin(self, regular_user_token):
        """Regular user cannot access coupons endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/coupons",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_communicate_requires_super_admin(self, regular_user_token):
        """Regular user cannot send communications"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/communicate",
            json={"subject": "Test", "message": "Test"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_export_requires_super_admin(self, regular_user_token):
        """Regular user cannot export CSV"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/export/entreprises",
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_extend_trial_requires_super_admin(self, regular_user_token, test_entreprise_id):
        """Regular user cannot extend trial"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/extend-trial",
            json={"days": 14},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_change_status_requires_super_admin(self, regular_user_token, test_entreprise_id):
        """Regular user cannot change status"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
    
    def test_apply_coupon_requires_super_admin(self, regular_user_token, test_entreprise_id):
        """Regular user cannot apply coupon"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/apply-coupon",
            json={"discount_type": "percentage", "discount_value": 10},
            headers={"Authorization": f"Bearer {regular_user_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"


# ==================== COUPON TESTS ====================

class TestCoupons:
    """Test coupon creation and management"""
    
    def test_create_coupon_with_auto_code(self, super_admin_token):
        """Create coupon with auto-generated code"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/coupons",
            json={
                "discount_type": "percentage",
                "discount_value": 15,
                "max_uses": 10,
                "description": "Test coupon auto code"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "coupon" in data
        assert data["coupon"]["code"].startswith("PROMO")
        assert data["coupon"]["discount_value"] == 15
        assert data["coupon"]["discount_type"] == "percentage"
    
    def test_create_coupon_with_custom_code(self, super_admin_token):
        """Create coupon with custom code"""
        unique_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
        response = requests.post(
            f"{BASE_URL}/api/super-admin/coupons",
            json={
                "code": unique_code,
                "discount_type": "fixed",
                "discount_value": 20,
                "max_uses": 5,
                "description": "Test coupon custom code"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["coupon"]["code"] == unique_code
        assert data["coupon"]["discount_type"] == "fixed"
    
    def test_create_duplicate_coupon_fails(self, super_admin_token):
        """Creating coupon with existing code should fail"""
        # First create a coupon
        unique_code = f"DUP{uuid.uuid4().hex[:6].upper()}"
        requests.post(
            f"{BASE_URL}/api/super-admin/coupons",
            json={"code": unique_code, "discount_type": "percentage", "discount_value": 10},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        
        # Try to create with same code
        response = requests.post(
            f"{BASE_URL}/api/super-admin/coupons",
            json={"code": unique_code, "discount_type": "percentage", "discount_value": 20},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_list_coupons(self, super_admin_token):
        """List all coupons"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/coupons",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "coupons" in data
        assert isinstance(data["coupons"], list)
    
    def test_list_coupons_active_only(self, super_admin_token):
        """List only active coupons"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/coupons?active_only=true",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        for coupon in data["coupons"]:
            assert coupon["active"] == True


# ==================== COMMUNICATION TESTS ====================

class TestCommunication:
    """Test communication system"""
    
    def test_send_communication_single(self, super_admin_token, test_entreprise_id):
        """Send communication to single entreprise"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/communicate",
            json={
                "target": "single",
                "entreprise_ids": [test_entreprise_id],
                "subject": "Test Communication",
                "message": "This is a test message from super admin",
                "send_email": False,  # Don't actually send email in test
                "send_notification": True
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "sent_count" in data
        assert data["sent_count"] >= 1
    
    def test_send_communication_requires_subject(self, super_admin_token, test_entreprise_id):
        """Communication requires subject"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/communicate",
            json={
                "target": "single",
                "entreprise_ids": [test_entreprise_id],
                "message": "Test message"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_send_communication_requires_message(self, super_admin_token, test_entreprise_id):
        """Communication requires message"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/communicate",
            json={
                "target": "single",
                "entreprise_ids": [test_entreprise_id],
                "subject": "Test subject"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_get_communications_history(self, super_admin_token):
        """Get communications history"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/communications",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "communications" in data


# ==================== CSV EXPORT TESTS ====================

class TestCSVExport:
    """Test CSV export functionality"""
    
    def test_export_entreprises_csv(self, super_admin_token):
        """Export entreprises as CSV"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/export/entreprises",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "text/csv" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        
        # Check CSV content
        content = response.text
        assert "ID" in content
        assert "Nom" in content
        assert "Email" in content
        assert "Plan" in content
    
    def test_export_with_plan_filter(self, super_admin_token):
        """Export entreprises filtered by plan"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/export/entreprises?plan=enterprise",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
    
    def test_export_with_status_filter(self, super_admin_token):
        """Export entreprises filtered by status"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/export/entreprises?status=active",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")


# ==================== TRIAL EXTENSION TESTS ====================

class TestTrialExtension:
    """Test trial extension functionality"""
    
    def test_extend_trial(self, super_admin_token, test_entreprise_id):
        """Extend trial period"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/extend-trial",
            json={"days": 14},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "14" in data["message"]
        assert "new_trial_end" in data
    
    def test_extend_trial_invalid_days(self, super_admin_token, test_entreprise_id):
        """Extend trial with invalid days should fail"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/extend-trial",
            json={"days": 100},  # Max is 90
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_extend_trial_nonexistent_entreprise(self, super_admin_token):
        """Extend trial for nonexistent entreprise should fail"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/nonexistent-id/extend-trial",
            json={"days": 14},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ==================== STATUS CHANGE TESTS ====================

class TestStatusChange:
    """Test status change functionality"""
    
    def test_change_status_to_suspended(self, super_admin_token, test_entreprise_id):
        """Change entreprise status to suspended"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/status",
            json={"status": "suspended", "reason": "Test suspension"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "suspended" in data["message"].lower()
    
    def test_change_status_to_active(self, super_admin_token, test_entreprise_id):
        """Change entreprise status back to active"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/status",
            json={"status": "active", "reason": "Reactivation after test"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "active" in data["message"].lower()
    
    def test_change_status_invalid(self, super_admin_token, test_entreprise_id):
        """Change to invalid status should fail"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/status",
            json={"status": "invalid_status"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
    
    def test_change_status_nonexistent_entreprise(self, super_admin_token):
        """Change status for nonexistent entreprise should fail"""
        response = requests.put(
            f"{BASE_URL}/api/super-admin/entreprises/nonexistent-id/status",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ==================== APPLY COUPON/DISCOUNT TESTS ====================

class TestApplyDiscount:
    """Test applying discounts to entreprises"""
    
    def test_apply_percentage_discount(self, super_admin_token, test_entreprise_id):
        """Apply percentage discount to entreprise"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/apply-coupon",
            json={
                "discount_type": "percentage",
                "discount_value": 20,
                "duration_months": 3,
                "reason": "Test discount"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "20%" in data["message"]
        assert "3 mois" in data["message"]
    
    def test_apply_fixed_discount(self, super_admin_token, test_entreprise_id):
        """Apply fixed discount to entreprise"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}/apply-coupon",
            json={
                "discount_type": "fixed",
                "discount_value": 10,
                "duration_months": 1,
                "reason": "Test fixed discount"
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data
        assert "10€" in data["message"]
    
    def test_apply_discount_nonexistent_entreprise(self, super_admin_token):
        """Apply discount to nonexistent entreprise should fail"""
        response = requests.post(
            f"{BASE_URL}/api/super-admin/entreprises/nonexistent-id/apply-coupon",
            json={
                "discount_type": "percentage",
                "discount_value": 10,
                "duration_months": 1
            },
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


# ==================== ENTREPRISE DETAILS TESTS ====================

class TestEntrepriseDetails:
    """Test detailed entreprise view"""
    
    def test_get_entreprise_details_complete(self, super_admin_token, test_entreprise_id):
        """Get complete details of an entreprise"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # Check all required fields
        assert "entreprise" in data
        assert "users" in data
        assert "stats" in data
        
        # Check stats structure
        stats = data["stats"]
        assert "interventions" in stats
        assert "devis" in stats
        assert "factures" in stats
        assert "clients" in stats
    
    def test_get_entreprise_details_includes_users(self, super_admin_token, test_entreprise_id):
        """Entreprise details include user list"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/entreprises/{test_entreprise_id}",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "users" in data
        assert isinstance(data["users"], list)
        
        # Users should not include password_hash
        for user in data["users"]:
            assert "password_hash" not in user


# ==================== FEEDBACKS & CANCELLATIONS TESTS ====================

class TestFeedbacksAndCancellations:
    """Test feedbacks and cancellations endpoints"""
    
    def test_get_feedbacks(self, super_admin_token):
        """Get feedbacks list"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/feedbacks",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "feedbacks" in data
        assert "counts" in data
    
    def test_get_cancellations(self, super_admin_token):
        """Get cancellations list"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/cancellations",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "cancellations" in data
        assert "total" in data


# ==================== REVENUE DETAILS TESTS ====================

class TestRevenueDetails:
    """Test detailed revenue endpoint"""
    
    def test_revenue_by_plan(self, super_admin_token):
        """Revenue includes breakdown by plan"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "by_plan" in data
        assert "startup" in data["by_plan"]
        assert "pro" in data["by_plan"]
        assert "enterprise" in data["by_plan"]
        
        # Each plan should have count and mrr
        for plan in ["startup", "pro", "enterprise"]:
            assert "count" in data["by_plan"][plan]
            assert "mrr" in data["by_plan"][plan]
    
    def test_revenue_by_billing_cycle(self, super_admin_token):
        """Revenue includes breakdown by billing cycle"""
        response = requests.get(
            f"{BASE_URL}/api/super-admin/revenue",
            headers={"Authorization": f"Bearer {super_admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "by_billing_cycle" in data
        assert "monthly" in data["by_billing_cycle"]
        assert "yearly" in data["by_billing_cycle"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
