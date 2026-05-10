"""
Test Suite for Iteration 31 - Pricing Updates & Currency Snapshot
Tests:
1. API /api/plans - verify correct prices (9.99€, 19.99€, 39.99€) and annual prices (95.90€, 191.90€, 383.90€)
2. API /api/checkout/session - verify Stripe session creation with billing_cycle monthly and yearly
3. Devis creation with currency snapshot (devise and taux_change_eur fields)
4. Facture creation with currency snapshot
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com').rstrip('/')

# Test credentials
TEST_EMAIL = "salifkane612+enterprise@gmail.com"
TEST_PASSWORD = "Salifkane&&7"


class TestPricingPlans:
    """Test subscription plans pricing"""
    
    def test_plans_endpoint_returns_correct_prices(self):
        """Verify /api/plans returns the updated ACTOOS PRO prices"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        plans = response.json()
        assert len(plans) == 3, f"Expected 3 plans, got {len(plans)}"
        
        # Create a dict for easy lookup
        plans_dict = {p['id']: p for p in plans}
        
        # Verify Startup plan
        startup = plans_dict.get('startup')
        assert startup is not None, "Startup plan not found"
        assert startup['price'] == 9.99, f"Startup monthly price should be 9.99, got {startup['price']}"
        assert startup['price_annual'] == 95.90, f"Startup annual price should be 95.90, got {startup['price_annual']}"
        assert startup['currency'] == 'eur', f"Currency should be 'eur', got {startup['currency']}"
        print(f"✓ Startup plan: {startup['price']}€/month, {startup['price_annual']}€/year")
        
        # Verify Pro plan
        pro = plans_dict.get('pro')
        assert pro is not None, "Pro plan not found"
        assert pro['price'] == 19.99, f"Pro monthly price should be 19.99, got {pro['price']}"
        assert pro['price_annual'] == 191.90, f"Pro annual price should be 191.90, got {pro['price_annual']}"
        assert pro['recommended'] == True, "Pro plan should be marked as recommended"
        print(f"✓ Pro plan: {pro['price']}€/month, {pro['price_annual']}€/year (recommended)")
        
        # Verify Enterprise plan
        enterprise = plans_dict.get('enterprise')
        assert enterprise is not None, "Enterprise plan not found"
        assert enterprise['price'] == 39.99, f"Enterprise monthly price should be 39.99, got {enterprise['price']}"
        assert enterprise['price_annual'] == 383.90, f"Enterprise annual price should be 383.90, got {enterprise['price_annual']}"
        print(f"✓ Enterprise plan: {enterprise['price']}€/month, {enterprise['price_annual']}€/year")
    
    def test_annual_discount_is_20_percent(self):
        """Verify annual prices reflect 20% discount"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        
        for plan in plans:
            monthly = plan['price']
            annual = plan['price_annual']
            expected_annual = round(monthly * 12 * 0.8, 2)  # 20% discount
            
            # Allow small floating point differences
            assert abs(annual - expected_annual) < 0.1, \
                f"Plan {plan['id']}: Annual price {annual} doesn't match expected {expected_annual} (20% off {monthly * 12})"
            
            discount_percent = round((1 - annual / (monthly * 12)) * 100, 1)
            print(f"✓ {plan['name']}: {monthly}€/month × 12 = {monthly * 12}€ → {annual}€/year ({discount_percent}% discount)")


class TestCheckoutSession:
    """Test Stripe checkout session creation"""
    
    def test_checkout_session_monthly(self):
        """Test creating checkout session with monthly billing"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "pro",
                "origin_url": "https://date-1.preview.emergentagent.com",
                "entreprise_name": "TEST_ITERATION31_Monthly",
                "admin_email": "test_monthly@example.com",
                "billing_cycle": "monthly"
            }
        )
        
        # Stripe might fail if not configured, but we check the endpoint works
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Response should contain Stripe checkout URL"
            assert "session_id" in data, "Response should contain session_id"
            print(f"✓ Monthly checkout session created: {data.get('session_id', 'N/A')[:20]}...")
        elif response.status_code == 500 and "Stripe non configuré" in response.text:
            pytest.skip("Stripe not configured - skipping checkout test")
        else:
            # Check if it's a Stripe error (which means the endpoint works)
            print(f"Checkout response: {response.status_code} - {response.text[:200]}")
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_checkout_session_yearly(self):
        """Test creating checkout session with yearly billing"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "startup",
                "origin_url": "https://date-1.preview.emergentagent.com",
                "entreprise_name": "TEST_ITERATION31_Yearly",
                "admin_email": "test_yearly@example.com",
                "billing_cycle": "yearly"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, "Response should contain Stripe checkout URL"
            assert "session_id" in data, "Response should contain session_id"
            print(f"✓ Yearly checkout session created: {data.get('session_id', 'N/A')[:20]}...")
        elif response.status_code == 500 and "Stripe non configuré" in response.text:
            pytest.skip("Stripe not configured - skipping checkout test")
        else:
            print(f"Checkout response: {response.status_code} - {response.text[:200]}")
            assert response.status_code in [200, 400], f"Unexpected status: {response.status_code}"
    
    def test_checkout_invalid_plan(self):
        """Test checkout with invalid plan returns error"""
        response = requests.post(
            f"{BASE_URL}/api/checkout/session",
            params={
                "plan_id": "invalid_plan",
                "origin_url": "https://date-1.preview.emergentagent.com",
                "billing_cycle": "monthly"
            }
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid plan, got {response.status_code}"
        print("✓ Invalid plan correctly rejected with 400")


class TestCurrencySnapshot:
    """Test currency snapshot on devis and factures"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if response.status_code != 200:
            pytest.skip(f"Authentication failed: {response.status_code}")
        return response.json().get("access_token")
    
    @pytest.fixture(scope="class")
    def test_client_id(self, auth_token):
        """Get or create a test client"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # List existing clients
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            if clients:
                return clients[0]["id"]
        
        # Create a test client
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers=headers,
            json={
                "nom": "TEST_ITERATION31_Client",
                "prenom": "Currency",
                "email": "test_currency@example.com",
                "telephone": "+33600000000"
            }
        )
        if response.status_code == 201:
            return response.json()["id"]
        
        pytest.skip("Could not get or create test client")
    
    def test_devis_creation_includes_currency_snapshot(self, auth_token, test_client_id):
        """Test that creating a devis captures currency snapshot"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a devis
        devis_data = {
            "client_id": test_client_id,
            "lignes": [
                {
                    "description": "TEST_ITERATION31 - Service test",
                    "quantite": 1,
                    "prix_unitaire": 100.00,
                    "tva": 20.0
                }
            ],
            "validite_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/devis",
            headers=headers,
            json=devis_data
        )
        
        assert response.status_code == 200, f"Failed to create devis: {response.status_code} - {response.text}"
        
        devis = response.json()
        
        # Verify currency snapshot fields exist
        assert "devise" in devis, "Devis should have 'devise' field for currency snapshot"
        assert "taux_change_eur" in devis, "Devis should have 'taux_change_eur' field for exchange rate snapshot"
        
        print(f"✓ Devis created with currency snapshot: devise={devis['devise']}, taux_change_eur={devis['taux_change_eur']}")
        
        # Verify the devis ID for cleanup
        return devis["id"]
    
    def test_facture_creation_includes_currency_snapshot(self, auth_token, test_client_id):
        """Test that creating a facture captures currency snapshot"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a facture
        facture_data = {
            "client_id": test_client_id,
            "lignes": [
                {
                    "description": "TEST_ITERATION31 - Facture test",
                    "quantite": 2,
                    "prix_unitaire": 50.00,
                    "tva": 20.0
                }
            ],
            "echeance_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/factures",
            headers=headers,
            json=facture_data
        )
        
        assert response.status_code == 200, f"Failed to create facture: {response.status_code} - {response.text}"
        
        facture = response.json()
        
        # Verify currency snapshot fields exist
        assert "devise" in facture, "Facture should have 'devise' field for currency snapshot"
        assert "taux_change_eur" in facture, "Facture should have 'taux_change_eur' field for exchange rate snapshot"
        
        print(f"✓ Facture created with currency snapshot: devise={facture['devise']}, taux_change_eur={facture['taux_change_eur']}")
        
        return facture["id"]
    
    def test_devis_preserves_currency_on_retrieval(self, auth_token, test_client_id):
        """Test that retrieving a devis returns the original currency snapshot"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a devis
        devis_data = {
            "client_id": test_client_id,
            "lignes": [
                {
                    "description": "TEST_ITERATION31 - Currency preservation test",
                    "quantite": 1,
                    "prix_unitaire": 200.00,
                    "tva": 20.0
                }
            ],
            "validite_jours": 30
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/devis",
            headers=headers,
            json=devis_data
        )
        
        assert create_response.status_code == 200
        created_devis = create_response.json()
        devis_id = created_devis["id"]
        original_devise = created_devis["devise"]
        original_taux = created_devis["taux_change_eur"]
        
        # Retrieve the devis
        get_response = requests.get(
            f"{BASE_URL}/api/devis/{devis_id}",
            headers=headers
        )
        
        assert get_response.status_code == 200
        retrieved_devis = get_response.json()
        
        # Verify currency snapshot is preserved
        assert retrieved_devis["devise"] == original_devise, \
            f"Currency should be preserved: expected {original_devise}, got {retrieved_devis['devise']}"
        assert retrieved_devis["taux_change_eur"] == original_taux, \
            f"Exchange rate should be preserved: expected {original_taux}, got {retrieved_devis['taux_change_eur']}"
        
        print(f"✓ Devis currency snapshot preserved on retrieval: devise={retrieved_devis['devise']}, taux={retrieved_devis['taux_change_eur']}")


class TestSubscriptionService:
    """Test subscription service functions"""
    
    def test_subscription_plans_structure(self):
        """Verify subscription plans have all required fields"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        required_fields = ['id', 'name', 'price', 'price_annual', 'currency', 'description', 'features', 'limits']
        
        for plan in plans:
            for field in required_fields:
                assert field in plan, f"Plan {plan.get('id', 'unknown')} missing required field: {field}"
            
            # Verify limits structure
            limits = plan['limits']
            assert 'max_admins' in limits, f"Plan {plan['id']} missing max_admins in limits"
            assert 'max_technicians' in limits, f"Plan {plan['id']} missing max_technicians in limits"
            assert 'max_categories' in limits, f"Plan {plan['id']} missing max_categories in limits"
        
        print("✓ All plans have required structure")
    
    def test_plan_features_not_empty(self):
        """Verify each plan has features listed"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        
        plans = response.json()
        
        for plan in plans:
            assert len(plan['features']) > 0, f"Plan {plan['id']} should have features"
            print(f"✓ {plan['name']} has {len(plan['features'])} features")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
