"""
Test Partial Payments Feature - Iteration 43
Tests for:
- POST /api/factures/{id}/pay - record partial/full payment
- GET /api/factures/{id}/payments - payment history
- Status transitions: emise -> partiel -> payee
- Frontend Admin: badge 'Paiement partiel', 'Payé'/'Reste dû' amounts
- Frontend Client Portal: 'Reste dû' column, 'Payer X€' button
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "demo@actoos.com"
ADMIN_PASSWORD = "demo2024"

# Test facture ID from main agent context
TEST_FACTURE_PARTIAL_ID = "35dab91a-a66b-4e65-9e22-b5d079396faa"


def get_auth_session():
    """Create authenticated session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if login_response.status_code == 200:
        data = login_response.json()
        token = data.get("access_token") or data.get("token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    return None


class TestPartialPaymentsBackend:
    """Backend API tests for partial payments feature"""
    
    @pytest.fixture(autouse=True, scope="class")
    def setup_class(self, request):
        """Setup test session with authentication for all tests in class"""
        request.cls.session = get_auth_session()
        if not request.cls.session:
            pytest.skip("Authentication failed")
    
    def test_01_auth_login_success(self):
        """Test admin login works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data or "token" in data
        assert "user" in data
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_02_list_factures(self):
        """Test listing factures"""
        response = self.session.get(f"{BASE_URL}/api/factures")
        assert response.status_code == 200, f"Failed: {response.text}"
        factures = response.json()
        assert isinstance(factures, list)
        print(f"✓ Listed {len(factures)} factures")
        
        # Check for partial status factures
        partial_factures = [f for f in factures if f.get("statut") == "partiel"]
        print(f"  - Found {len(partial_factures)} factures with 'partiel' status")
    
    def test_03_list_factures_filter_partiel(self):
        """Test filtering factures by 'partiel' status"""
        response = self.session.get(f"{BASE_URL}/api/factures", params={"statut": "partiel"})
        assert response.status_code == 200, f"Failed: {response.text}"
        factures = response.json()
        
        # All returned factures should have partiel status
        for f in factures:
            assert f.get("statut") == "partiel", f"Expected 'partiel' status, got {f.get('statut')}"
        
        print(f"✓ Filter by 'partiel' status works - {len(factures)} factures found")
    
    def test_04_get_facture_detail(self):
        """Test getting facture detail with payment info"""
        response = self.session.get(f"{BASE_URL}/api/factures/{TEST_FACTURE_PARTIAL_ID}")
        
        if response.status_code == 404:
            pytest.skip(f"Test facture {TEST_FACTURE_PARTIAL_ID} not found")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        facture = response.json()
        
        # Verify required fields for partial payments
        assert "total_ttc" in facture, "Missing total_ttc field"
        assert "montant_paye" in facture, "Missing montant_paye field"
        assert "statut" in facture, "Missing statut field"
        
        total_ttc = facture.get("total_ttc", 0)
        montant_paye = facture.get("montant_paye", 0)
        reste_du = total_ttc - montant_paye
        
        print(f"✓ Facture detail retrieved:")
        print(f"  - Numero: {facture.get('numero_facture')}")
        print(f"  - Statut: {facture.get('statut')}")
        print(f"  - Total TTC: {total_ttc}€")
        print(f"  - Montant payé: {montant_paye}€")
        print(f"  - Reste dû: {reste_du}€")
    
    def test_05_get_payment_history(self):
        """Test getting payment history for a facture"""
        response = self.session.get(f"{BASE_URL}/api/factures/{TEST_FACTURE_PARTIAL_ID}/payments")
        
        if response.status_code == 404:
            pytest.skip(f"Test facture {TEST_FACTURE_PARTIAL_ID} not found")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "facture_id" in data, "Missing facture_id in response"
        assert "total_ttc" in data, "Missing total_ttc in response"
        assert "montant_paye" in data, "Missing montant_paye in response"
        assert "reste_a_payer" in data, "Missing reste_a_payer in response"
        assert "statut" in data, "Missing statut in response"
        assert "payments" in data, "Missing payments list in response"
        
        payments = data.get("payments", [])
        print(f"✓ Payment history retrieved:")
        print(f"  - Total TTC: {data.get('total_ttc')}€")
        print(f"  - Montant payé: {data.get('montant_paye')}€")
        print(f"  - Reste à payer: {data.get('reste_a_payer')}€")
        print(f"  - Statut: {data.get('statut')}")
        print(f"  - Number of payments: {len(payments)}")
        
        for p in payments:
            print(f"    - {p.get('montant')}€ via {p.get('mode_paiement')} on {p.get('recorded_at')}")
    
    def test_06_create_and_emit_facture(self):
        """Create and emit a test facture for payment testing"""
        # First get a client
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available for testing")
        
        client = clients_response.json()[0]
        client_id = client.get("id")
        
        # Create a test facture
        facture_data = {
            "client_id": client_id,
            "lignes": [
                {
                    "description": "TEST_Service de test paiement partiel",
                    "quantite": 1,
                    "prix_unitaire": 300.0,
                    "tva": 20
                }
            ],
            "echeance_jours": 30,
            "conditions_paiement": "Test paiement partiel"
        }
        
        response = self.session.post(f"{BASE_URL}/api/factures", json=facture_data)
        assert response.status_code == 200, f"Failed to create facture: {response.text}"
        
        facture = response.json()
        facture_id = facture.get("id")
        
        print(f"✓ Created test facture: {facture.get('numero_facture')}")
        print(f"  - ID: {facture_id}")
        print(f"  - Total TTC: {facture.get('total_ttc')}€")
        
        # Emit the facture
        emit_response = self.session.post(f"{BASE_URL}/api/factures/{facture_id}/emit")
        assert emit_response.status_code == 200, f"Failed to emit: {emit_response.text}"
        
        # Verify status changed to 'emise'
        get_response = self.session.get(f"{BASE_URL}/api/factures/{facture_id}")
        assert get_response.status_code == 200
        updated_facture = get_response.json()
        assert updated_facture.get("statut") == "emise"
        
        print(f"✓ Emitted facture - Status: {updated_facture.get('statut')}")
        
        # Store for next tests
        self.__class__.test_facture_id = facture_id
        self.__class__.test_facture_total = updated_facture.get("total_ttc")
    
    def test_07_record_partial_payment(self):
        """Test recording a partial payment"""
        if not hasattr(self.__class__, 'test_facture_id'):
            pytest.skip("No test facture created")
        
        facture_id = self.__class__.test_facture_id
        total_ttc = self.__class__.test_facture_total
        
        # Record a partial payment (100€)
        payment_amount = 100.0
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={
                "montant": payment_amount,
                "mode_paiement": "especes",
                "reference": "TEST_REF_001",
                "notes": "Test partial payment"
            }
        )
        
        assert pay_response.status_code == 200, f"Payment failed: {pay_response.text}"
        payment_result = pay_response.json()
        
        # Verify response
        assert "payment_id" in payment_result
        assert payment_result.get("montant_paye") == payment_amount
        assert payment_result.get("reste_a_payer") == round(total_ttc - payment_amount, 2)
        assert payment_result.get("statut") == "partiel"
        assert payment_result.get("is_fully_paid") == False
        
        print(f"✓ Recorded partial payment:")
        print(f"  - Payment ID: {payment_result.get('payment_id')}")
        print(f"  - Montant payé: {payment_result.get('montant_paye')}€")
        print(f"  - Reste à payer: {payment_result.get('reste_a_payer')}€")
        print(f"  - Statut: {payment_result.get('statut')}")
        
        # Verify facture status changed to 'partiel'
        get_response = self.session.get(f"{BASE_URL}/api/factures/{facture_id}")
        assert get_response.status_code == 200
        updated_facture = get_response.json()
        assert updated_facture.get("statut") == "partiel"
        assert updated_facture.get("montant_paye") == payment_amount
        
        print(f"✓ Facture status updated to 'partiel'")
        
        self.__class__.partial_paid_amount = payment_amount
    
    def test_08_record_second_partial_payment(self):
        """Test recording a second partial payment"""
        if not hasattr(self.__class__, 'test_facture_id'):
            pytest.skip("No test facture created")
        
        facture_id = self.__class__.test_facture_id
        total_ttc = self.__class__.test_facture_total
        first_payment = self.__class__.partial_paid_amount
        
        # Record second partial payment (100€)
        payment_amount = 100.0
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={
                "montant": payment_amount,
                "mode_paiement": "carte",
                "reference": "TEST_REF_002"
            }
        )
        
        assert pay_response.status_code == 200, f"Payment failed: {pay_response.text}"
        payment_result = pay_response.json()
        
        expected_total_paid = first_payment + payment_amount
        assert payment_result.get("montant_paye") == expected_total_paid
        assert payment_result.get("statut") == "partiel"
        
        print(f"✓ Second partial payment recorded:")
        print(f"  - Total paid: {payment_result.get('montant_paye')}€")
        print(f"  - Remaining: {payment_result.get('reste_a_payer')}€")
        
        self.__class__.partial_paid_amount = expected_total_paid
    
    def test_09_record_final_payment_completes_facture(self):
        """Test that recording final payment marks facture as 'payee'"""
        if not hasattr(self.__class__, 'test_facture_id'):
            pytest.skip("No test facture created")
        
        facture_id = self.__class__.test_facture_id
        total_ttc = self.__class__.test_facture_total
        paid_so_far = self.__class__.partial_paid_amount
        
        # Pay remaining amount
        remaining = total_ttc - paid_so_far
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={
                "montant": remaining,
                "mode_paiement": "virement",
                "reference": "TEST_REF_FINAL"
            }
        )
        
        assert pay_response.status_code == 200, f"Payment failed: {pay_response.text}"
        result = pay_response.json()
        
        assert result.get("statut") == "payee"
        assert result.get("is_fully_paid") == True
        assert result.get("reste_a_payer") == 0
        
        print(f"✓ Final payment completed:")
        print(f"  - Statut: {result.get('statut')}")
        print(f"  - Is fully paid: {result.get('is_fully_paid')}")
        
        # Verify facture status
        get_response = self.session.get(f"{BASE_URL}/api/factures/{facture_id}")
        assert get_response.status_code == 200
        assert get_response.json().get("statut") == "payee"
        
        print(f"✓ Facture status is 'payee'")
    
    def test_10_payment_history_shows_all_payments(self):
        """Test payment history shows all recorded payments"""
        if not hasattr(self.__class__, 'test_facture_id'):
            pytest.skip("No test facture created")
        
        facture_id = self.__class__.test_facture_id
        
        history_response = self.session.get(f"{BASE_URL}/api/factures/{facture_id}/payments")
        assert history_response.status_code == 200
        history = history_response.json()
        
        # Should have 3 payments
        payments = history.get("payments", [])
        assert len(payments) >= 3, f"Expected at least 3 payments, got {len(payments)}"
        
        print(f"✓ Payment history shows {len(payments)} payments")
        for p in payments:
            print(f"  - {p.get('montant')}€ via {p.get('mode_paiement')}")
    
    def test_11_payment_on_paid_facture_rejected(self):
        """Test that payment on already paid facture is rejected"""
        if not hasattr(self.__class__, 'test_facture_id'):
            pytest.skip("No test facture created")
        
        facture_id = self.__class__.test_facture_id
        
        # Try to pay again
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={"montant": 10.0, "mode_paiement": "especes"}
        )
        
        assert pay_response.status_code == 400
        print(f"✓ Payment on paid facture correctly rejected")
    
    def test_12_payment_validation_negative_amount(self):
        """Test that negative payment amounts are rejected"""
        # Create a new facture for this test
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available")
        
        client = clients_response.json()[0]
        
        facture_data = {
            "client_id": client.get("id"),
            "lignes": [{"description": "TEST_Negative test", "quantite": 1, "prix_unitaire": 100.0, "tva": 20}],
            "echeance_jours": 30
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/factures", json=facture_data)
        facture = create_response.json()
        facture_id = facture.get("id")
        
        # Emit
        self.session.post(f"{BASE_URL}/api/factures/{facture_id}/emit")
        
        # Try negative payment
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={"montant": -50.0, "mode_paiement": "especes"}
        )
        
        assert pay_response.status_code == 400
        print(f"✓ Negative payment correctly rejected")
    
    def test_13_payment_validation_exceeds_remaining(self):
        """Test that payment exceeding remaining amount is rejected"""
        # Create a small facture
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200 or not clients_response.json():
            pytest.skip("No clients available")
        
        client = clients_response.json()[0]
        
        facture_data = {
            "client_id": client.get("id"),
            "lignes": [{"description": "TEST_Exceed test", "quantite": 1, "prix_unitaire": 50.0, "tva": 20}],
            "echeance_jours": 30
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/factures", json=facture_data)
        facture = create_response.json()
        facture_id = facture.get("id")
        total_ttc = facture.get("total_ttc")  # 60€
        
        # Emit
        self.session.post(f"{BASE_URL}/api/factures/{facture_id}/emit")
        
        # Try to pay more than total
        pay_response = self.session.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={"montant": total_ttc + 100, "mode_paiement": "especes"}
        )
        
        assert pay_response.status_code == 400
        print(f"✓ Payment exceeding remaining correctly rejected")
    
    def test_14_cleanup_test_factures(self):
        """Cleanup test factures created during testing"""
        # Get all factures with TEST_ prefix in description
        factures_response = self.session.get(f"{BASE_URL}/api/factures")
        if factures_response.status_code != 200:
            return
        
        factures = factures_response.json()
        deleted = 0
        
        for f in factures:
            # Check if any ligne has TEST_ prefix
            lignes = f.get("lignes", [])
            is_test = any("TEST_" in l.get("description", "") for l in lignes)
            
            if is_test and f.get("statut") == "brouillon":
                try:
                    delete_response = self.session.delete(f"{BASE_URL}/api/factures/{f.get('id')}")
                    if delete_response.status_code == 200:
                        deleted += 1
                except:
                    pass
        
        print(f"✓ Cleaned up {deleted} test factures (brouillon only)")


class TestClientPortalPayments:
    """Test client portal payment features"""
    
    def test_01_portal_dashboard_shows_remaining_amounts(self):
        """Test that portal dashboard returns remaining amount for factures"""
        # First login as admin to get a client portal token
        session = get_auth_session()
        if not session:
            pytest.skip("Admin login failed")
        
        # Get clients to find one with portal_token
        clients_response = session.get(f"{BASE_URL}/api/clients")
        if clients_response.status_code != 200:
            pytest.skip("Could not get clients")
        
        clients = clients_response.json()
        client_with_token = None
        
        for c in clients:
            if c.get("portal_token"):
                client_with_token = c
                break
        
        if not client_with_token:
            # Generate portal token for first client
            if clients:
                link_response = session.get(f"{BASE_URL}/api/portal/link/{clients[0].get('id')}")
                if link_response.status_code == 200:
                    client_with_token = {
                        "id": clients[0].get("id"),
                        "portal_token": link_response.json().get("portal_token")
                    }
        
        if not client_with_token:
            pytest.skip("No client with portal token available")
        
        portal_token = client_with_token.get("portal_token")
        
        # Access client portal dashboard (no auth needed)
        portal_response = requests.get(f"{BASE_URL}/api/portal/client/{portal_token}")
        
        if portal_response.status_code != 200:
            pytest.skip(f"Portal access failed: {portal_response.status_code}")
        
        portal_data = portal_response.json()
        
        # Check factures have montant_paye field
        factures = portal_data.get("factures", [])
        print(f"✓ Portal dashboard accessible")
        print(f"  - Found {len(factures)} factures")
        
        for f in factures:
            assert "total_ttc" in f, "Missing total_ttc in portal facture"
            
            montant_paye = f.get("montant_paye", 0) or 0
            total_ttc = f.get("total_ttc", 0)
            reste_du = total_ttc - montant_paye
            
            if f.get("statut") == "partiel":
                print(f"  - Facture {f.get('numero_facture')}: {montant_paye}€ paid, {reste_du}€ remaining")
                assert montant_paye > 0, "Partial facture should have some payment"
                assert reste_du > 0, "Partial facture should have remaining amount"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
