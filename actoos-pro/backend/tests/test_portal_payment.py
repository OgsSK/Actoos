"""
Test Portal Payment (Stripe) Feature
Tests for online invoice payment via Stripe from client portal
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
CLIENT_PORTAL_TOKEN = "888cc62b-b06f-4107-b822-b2403ce8f1c0"

# Factures for testing (from client portal data)
# F2026-00005: 120€ - emise status
FACTURE_WITH_AMOUNT = "3140c862-594e-4866-8235-af47d794cc57"  # 120€
# F2026-00006: 0€ - emise status
FACTURE_ZERO_AMOUNT = "c8808e39-fcc2-43aa-84f7-199f023e946f"  # 0€
# F2026-00004: 300€ - emise status
FACTURE_300_AMOUNT = "cf8923c7-9a52-40d9-8ee3-8149acafb7ec"  # 300€
# F2026-00001: 180€ - emise status
FACTURE_180_AMOUNT = "6240ecd6-6093-46f5-a06a-1cc84ef8f158"  # 180€


class TestPortalPaymentEndpoints:
    """Test POST /api/portal/facture/{id}/pay endpoint"""
    
    def test_payment_endpoint_returns_stripe_url(self):
        """Test that payment endpoint returns valid Stripe checkout URL"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/pay",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain 'url'"
        assert "session_id" in data, "Response should contain 'session_id'"
        assert "amount" in data, "Response should contain 'amount'"
        
        # Verify Stripe URL format
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL should be Stripe checkout: {data['url']}"
        
        # Verify session_id format (starts with cs_test_ for test mode)
        assert data["session_id"].startswith("cs_test_"), f"Session ID should start with cs_test_: {data['session_id']}"
        
        # Verify amount
        assert data["amount"] == 120.0, f"Amount should be 120.0, got {data['amount']}"
        
        print(f"✓ Payment endpoint returned valid Stripe URL for 120€ facture")
    
    def test_payment_endpoint_rejects_zero_amount(self):
        """Test that payment endpoint rejects factures with 0€ amount"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_ZERO_AMOUNT}/pay",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Response should contain 'detail'"
        assert "montant" in data["detail"].lower() or "payer" in data["detail"].lower(), \
            f"Error message should mention amount: {data['detail']}"
        
        print(f"✓ Payment endpoint correctly rejects 0€ facture: {data['detail']}")
    
    def test_payment_endpoint_requires_valid_token(self):
        """Test that payment endpoint requires valid client portal token"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/pay",
            params={"token": "invalid-token-12345"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ Payment endpoint correctly rejects invalid token")
    
    def test_payment_endpoint_requires_token(self):
        """Test that payment endpoint requires token parameter"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/pay"
        )
        
        # Should return 422 (validation error) or 401 (unauthorized)
        assert response.status_code in [401, 422], f"Expected 401 or 422, got {response.status_code}: {response.text}"
        
        print(f"✓ Payment endpoint requires token parameter")
    
    def test_payment_endpoint_rejects_nonexistent_facture(self):
        """Test that payment endpoint rejects non-existent facture"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/nonexistent-facture-id/pay",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        
        print(f"✓ Payment endpoint correctly rejects non-existent facture")
    
    def test_payment_for_300_euro_facture(self):
        """Test payment endpoint for 300€ facture"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_300_AMOUNT}/pay",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["amount"] == 300.0, f"Amount should be 300.0, got {data['amount']}"
        assert data["url"].startswith("https://checkout.stripe.com")
        
        print(f"✓ Payment endpoint returned valid Stripe URL for 300€ facture")


class TestPaymentStatusEndpoint:
    """Test GET /api/portal/facture/{id}/payment-status endpoint"""
    
    def test_payment_status_requires_valid_token(self):
        """Test that payment status endpoint requires valid token"""
        response = requests.get(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/payment-status",
            params={
                "token": "invalid-token",
                "session_id": "cs_test_fake_session"
            }
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        
        print(f"✓ Payment status endpoint requires valid token")
    
    def test_payment_status_requires_session_id(self):
        """Test that payment status endpoint requires session_id"""
        response = requests.get(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/payment-status",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        # Should return 422 (validation error) for missing session_id
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        
        print(f"✓ Payment status endpoint requires session_id parameter")


class TestClientPortalData:
    """Test client portal data includes factures with correct payment info"""
    
    def test_portal_returns_factures_with_amounts(self):
        """Test that client portal returns factures with amount info"""
        response = requests.get(
            f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}"
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "factures" in data, "Response should contain 'factures'"
        
        factures = data["factures"]
        assert len(factures) > 0, "Should have at least one facture"
        
        # Check facture structure
        for facture in factures:
            assert "id" in facture, "Facture should have 'id'"
            assert "numero_facture" in facture, "Facture should have 'numero_facture'"
            assert "statut" in facture, "Facture should have 'statut'"
            assert "total_ttc" in facture, "Facture should have 'total_ttc'"
            assert "montant_paye" in facture, "Facture should have 'montant_paye'"
        
        # Find factures with different amounts
        zero_amount_factures = [f for f in factures if f["total_ttc"] == 0]
        positive_amount_factures = [f for f in factures if f["total_ttc"] > 0]
        
        print(f"✓ Portal returns {len(factures)} factures")
        print(f"  - {len(zero_amount_factures)} with 0€ amount")
        print(f"  - {len(positive_amount_factures)} with positive amount")
    
    def test_portal_summary_includes_amount_due(self):
        """Test that portal summary includes total amount due"""
        response = requests.get(
            f"{BASE_URL}/api/portal/client/{CLIENT_PORTAL_TOKEN}"
        )
        
        assert response.status_code == 200
        
        data = response.json()
        assert "summary" in data, "Response should contain 'summary'"
        
        summary = data["summary"]
        assert "montant_du" in summary, "Summary should contain 'montant_du'"
        assert summary["montant_du"] >= 0, "Amount due should be >= 0"
        
        print(f"✓ Portal summary shows {summary['montant_du']}€ due")


class TestStripeConfiguration:
    """Test Stripe configuration is properly set"""
    
    def test_stripe_api_key_configured(self):
        """Test that Stripe API key is configured (by checking payment works)"""
        response = requests.post(
            f"{BASE_URL}/api/portal/facture/{FACTURE_WITH_AMOUNT}/pay",
            params={"token": CLIENT_PORTAL_TOKEN}
        )
        
        # If Stripe is not configured, we'd get a 500 error
        assert response.status_code != 500, "Stripe should be configured"
        
        if response.status_code == 200:
            data = response.json()
            # Test mode uses cs_test_ prefix
            assert "cs_test_" in data.get("session_id", ""), "Should be in Stripe test mode"
            print(f"✓ Stripe is configured in TEST mode")
        else:
            print(f"⚠ Payment returned {response.status_code}: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
