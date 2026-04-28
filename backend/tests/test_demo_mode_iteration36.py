"""
Test Demo Mode Features - Iteration 36
Tests for ACTOOS PRO demo mode:
- Demo init endpoint (POST /api/demo/init)
- Demo status endpoint (GET /api/demo/status)
- Demo login flow
- Demo data reset
- Demo feature-check endpoint
- Demo simulate-action endpoint
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com').rstrip('/')

# Demo credentials
DEMO_EMAIL = "demo@actoos.com"
DEMO_PASSWORD = "demo2024"


class TestDemoInit:
    """Test POST /api/demo/init endpoint"""
    
    def test_demo_init_success(self):
        """Test that demo init resets data and returns success"""
        response = requests.post(f"{BASE_URL}/api/demo/init")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        assert data.get("message") == "Session démo initialisée"
        assert data.get("plan") == "enterprise"
        
        # Check reset_stats
        reset_stats = data.get("reset_stats", {})
        assert "clients" in reset_stats
        assert "categories" in reset_stats
        assert "techniciens" in reset_stats
        assert "interventions" in reset_stats
        assert "devis" in reset_stats
        
        # Check credentials returned
        credentials = data.get("credentials", {})
        assert credentials.get("email") == DEMO_EMAIL
        assert credentials.get("password") == DEMO_PASSWORD
        
        print(f"✓ Demo init successful: {reset_stats}")
    
    def test_demo_init_creates_seed_data(self):
        """Test that demo init creates expected seed data"""
        response = requests.post(f"{BASE_URL}/api/demo/init")
        
        assert response.status_code == 200
        data = response.json()
        
        reset_stats = data.get("reset_stats", {})
        assert reset_stats.get("clients") == 3, "Expected 3 demo clients"
        assert reset_stats.get("categories") == 4, "Expected 4 demo categories"
        assert reset_stats.get("techniciens") == 1, "Expected 1 demo technician"
        assert reset_stats.get("interventions") == 3, "Expected 3 demo interventions"
        assert reset_stats.get("devis") == 1, "Expected 1 demo devis"
        
        print(f"✓ Demo seed data created correctly")


class TestDemoLogin:
    """Test demo login flow"""
    
    def test_demo_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data.get("token_type") == "bearer"
        
        # Check user data
        user = data.get("user", {})
        assert user.get("email") == DEMO_EMAIL
        assert user.get("role") == "admin"
        
        # Check entreprise data
        entreprise = data.get("entreprise", {})
        assert entreprise.get("is_demo") == True
        assert entreprise.get("plan") == "enterprise"
        
        print(f"✓ Demo login successful, user: {user.get('prenom')} {user.get('nom')}")
        return data.get("access_token")
    
    def test_demo_login_wrong_password(self):
        """Test login with wrong password fails"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": "wrongpassword"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Demo login with wrong password correctly rejected")


class TestDemoStatus:
    """Test GET /api/demo/status endpoint"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Demo login failed")
    
    def test_demo_status_authenticated(self, demo_token):
        """Test demo status returns correct info when authenticated as demo user"""
        response = requests.get(
            f"{BASE_URL}/api/demo/status",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("is_demo") == True
        assert data.get("plan_simulated") == "enterprise"
        
        # Check restrictions
        restrictions = data.get("restrictions", {})
        assert restrictions.get("emails_simulated") == True
        assert restrictions.get("sms_simulated") == True
        assert restrictions.get("whatsapp_simulated") == True
        assert restrictions.get("stripe_disabled") == True
        assert restrictions.get("data_not_persistent") == True
        
        # Check message
        message = data.get("message", {})
        assert "title" in message
        assert "description" in message
        assert "details" in message
        assert "cta" in message
        
        print(f"✓ Demo status correct: plan={data.get('plan_simulated')}, session_count={data.get('session_count')}")
    
    def test_demo_status_non_demo_user(self):
        """Test demo status returns is_demo=false for non-demo users"""
        # First login with a non-demo account (if available)
        # For now, test without auth - should fail
        response = requests.get(f"{BASE_URL}/api/demo/status")
        
        # Without auth, should return 403 or 401
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Demo status correctly requires authentication")


class TestDemoFeatureCheck:
    """Test GET /api/demo/feature-check/{feature} endpoint"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Demo login failed")
    
    def test_allowed_feature_create_client(self, demo_token):
        """Test that create_client feature is allowed in demo"""
        response = requests.get(
            f"{BASE_URL}/api/demo/feature-check/create_client",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("available") == True
        assert data.get("is_demo") == True
        print("✓ create_client feature allowed in demo")
    
    def test_blocked_feature_stripe_checkout(self, demo_token):
        """Test that stripe_checkout feature is blocked in demo"""
        response = requests.get(
            f"{BASE_URL}/api/demo/feature-check/stripe_checkout",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("available") == False
        assert "message" in data
        assert data.get("upgrade_plan") == "startup"
        print(f"✓ stripe_checkout feature blocked: {data.get('message')}")
    
    def test_blocked_feature_api_access(self, demo_token):
        """Test that api_access feature is blocked in demo"""
        response = requests.get(
            f"{BASE_URL}/api/demo/feature-check/api_access",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("available") == False
        assert data.get("upgrade_plan") == "pro"
        print(f"✓ api_access feature blocked: {data.get('message')}")


class TestDemoSimulateAction:
    """Test POST /api/demo/simulate-action endpoint"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo auth token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Demo login failed")
    
    def test_simulate_send_email(self, demo_token):
        """Test simulating email send"""
        response = requests.post(
            f"{BASE_URL}/api/demo/simulate-action?action_type=send_email",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "simulé" in data.get("message", "").lower()
        print(f"✓ Email simulation: {data.get('message')}")
    
    def test_simulate_send_sms(self, demo_token):
        """Test simulating SMS send"""
        response = requests.post(
            f"{BASE_URL}/api/demo/simulate-action?action_type=send_sms",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        print(f"✓ SMS simulation: {data.get('message')}")
    
    def test_simulate_process_payment(self, demo_token):
        """Test that payment processing is blocked in demo"""
        response = requests.post(
            f"{BASE_URL}/api/demo/simulate-action?action_type=process_payment",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == False
        assert "désactivé" in data.get("message", "").lower()
        print(f"✓ Payment blocked: {data.get('message')}")


class TestDemoDataVerification:
    """Test that demo data is correctly created"""
    
    @pytest.fixture
    def demo_token(self):
        """Get demo auth token after init"""
        # First init demo
        requests.post(f"{BASE_URL}/api/demo/init")
        
        # Then login
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}
        )
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Demo login failed")
    
    def test_demo_clients_created(self, demo_token):
        """Test that demo clients are created"""
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have at least 3 demo clients
        clients = data if isinstance(data, list) else data.get("clients", [])
        assert len(clients) >= 3, f"Expected at least 3 clients, got {len(clients)}"
        
        # Check client names
        client_names = [c.get("nom") for c in clients]
        assert "Dupont" in client_names or any("Dupont" in str(n) for n in client_names)
        
        print(f"✓ Demo clients created: {len(clients)} clients")
    
    def test_demo_interventions_created(self, demo_token):
        """Test that demo interventions are created"""
        response = requests.get(
            f"{BASE_URL}/api/interventions",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        interventions = data if isinstance(data, list) else data.get("interventions", [])
        assert len(interventions) >= 3, f"Expected at least 3 interventions, got {len(interventions)}"
        
        print(f"✓ Demo interventions created: {len(interventions)} interventions")
    
    def test_demo_devis_created(self, demo_token):
        """Test that demo devis is created"""
        response = requests.get(
            f"{BASE_URL}/api/devis",
            headers={"Authorization": f"Bearer {demo_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        devis_list = data if isinstance(data, list) else data.get("devis", [])
        assert len(devis_list) >= 1, f"Expected at least 1 devis, got {len(devis_list)}"
        
        print(f"✓ Demo devis created: {len(devis_list)} devis")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
