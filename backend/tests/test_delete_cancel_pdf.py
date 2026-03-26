"""
Test suite for DELETE endpoints, Cancel intervention, PDF downloads, and Dashboard stats
Features tested:
- DELETE /api/devis/{id} (brouillon/envoye only)
- DELETE /api/interventions/{id} (non-started only)
- DELETE /api/factures/{id} (brouillon only)
- DELETE /api/users/{id} (technicians without active interventions)
- POST /api/interventions/{id}/cancel
- GET /api/devis/{id}/pdf-download?token=xxx
- GET /api/factures/{id}/pdf-download?token=xxx
- Dashboard stats: interventions_today counts only today
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        return data["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        """Create authenticated session"""
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_login_success(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        print("PASS: Admin login successful")


class TestDevisDelete:
    """Test DELETE /api/devis/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_delete_devis_brouillon(self, api_client):
        """Test deleting a devis in brouillon status"""
        # First get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        assert clients_resp.status_code == 200
        clients = clients_resp.json()
        
        if not clients:
            # Create a client if none exists
            client_resp = api_client.post(f"{BASE_URL}/api/clients", json={
                "nom": "TEST_DeleteDevis",
                "prenom": "Client",
                "email": "test_delete_devis@test.com",
                "telephone": "0600000001"
            })
            assert client_resp.status_code == 200
            client_id = client_resp.json()["id"]
        else:
            client_id = clients[0]["id"]
        
        # Create a devis in brouillon status
        devis_resp = api_client.post(f"{BASE_URL}/api/devis", json={
            "client_id": client_id,
            "lignes": [{"description": "Test item", "quantite": 1, "prix_unitaire": 100, "tva": 20}],
            "validite_jours": 30
        })
        assert devis_resp.status_code == 200
        devis = devis_resp.json()
        devis_id = devis["id"]
        assert devis["statut"] == "brouillon"
        print(f"Created devis {devis['numero_devis']} in brouillon status")
        
        # Delete the devis
        delete_resp = api_client.delete(f"{BASE_URL}/api/devis/{devis_id}")
        assert delete_resp.status_code == 200
        assert "supprimé" in delete_resp.json()["message"].lower()
        print("PASS: Devis in brouillon status deleted successfully")
        
        # Verify it's deleted
        get_resp = api_client.get(f"{BASE_URL}/api/devis/{devis_id}")
        assert get_resp.status_code == 404
        print("PASS: Deleted devis returns 404")
    
    def test_delete_devis_envoye(self, api_client):
        """Test deleting a devis in envoye status"""
        # Get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        client_id = clients_resp.json()[0]["id"]
        
        # Create and send a devis
        devis_resp = api_client.post(f"{BASE_URL}/api/devis", json={
            "client_id": client_id,
            "lignes": [{"description": "Test item envoye", "quantite": 1, "prix_unitaire": 150, "tva": 20}],
            "validite_jours": 30
        })
        devis_id = devis_resp.json()["id"]
        
        # Send the devis
        send_resp = api_client.post(f"{BASE_URL}/api/devis/{devis_id}/send")
        assert send_resp.status_code == 200
        print("Devis sent successfully")
        
        # Delete the sent devis
        delete_resp = api_client.delete(f"{BASE_URL}/api/devis/{devis_id}")
        assert delete_resp.status_code == 200
        print("PASS: Devis in envoye status deleted successfully")
    
    def test_cannot_delete_signed_devis(self, api_client):
        """Test that signed devis cannot be deleted"""
        # Get existing signed devis
        devis_resp = api_client.get(f"{BASE_URL}/api/devis", params={"statut": "signe"})
        signed_devis = devis_resp.json()
        
        if signed_devis:
            devis_id = signed_devis[0]["id"]
            delete_resp = api_client.delete(f"{BASE_URL}/api/devis/{devis_id}")
            assert delete_resp.status_code == 400
            print("PASS: Cannot delete signed devis (400 returned)")
        else:
            print("SKIP: No signed devis to test deletion restriction")


class TestInterventionDeleteAndCancel:
    """Test DELETE and Cancel for interventions"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_delete_planifiee_intervention(self, api_client):
        """Test deleting a planned intervention"""
        # Get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        client_id = clients_resp.json()[0]["id"]
        
        # Create intervention
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
        intervention_resp = api_client.post(f"{BASE_URL}/api/interventions", json={
            "client_id": client_id,
            "titre": "TEST_Delete Intervention",
            "description": "Test intervention for deletion",
            "date_prevue": tomorrow,
            "duree_estimee": 60,
            "priorite": "normale"
        })
        assert intervention_resp.status_code == 200
        intervention = intervention_resp.json()
        intervention_id = intervention["id"]
        assert intervention["statut"] == "planifiee"
        print(f"Created intervention in planifiee status")
        
        # Delete the intervention
        delete_resp = api_client.delete(f"{BASE_URL}/api/interventions/{intervention_id}")
        assert delete_resp.status_code == 200
        print("PASS: Planned intervention deleted successfully")
        
        # Verify deletion
        get_resp = api_client.get(f"{BASE_URL}/api/interventions/{intervention_id}")
        assert get_resp.status_code == 404
        print("PASS: Deleted intervention returns 404")
    
    def test_cancel_intervention(self, api_client):
        """Test canceling an intervention"""
        # Get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        client_id = clients_resp.json()[0]["id"]
        
        # Create intervention
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
        intervention_resp = api_client.post(f"{BASE_URL}/api/interventions", json={
            "client_id": client_id,
            "titre": "TEST_Cancel Intervention",
            "description": "Test intervention for cancellation",
            "date_prevue": tomorrow,
            "duree_estimee": 60,
            "priorite": "normale"
        })
        intervention_id = intervention_resp.json()["id"]
        
        # Cancel the intervention
        cancel_resp = api_client.post(f"{BASE_URL}/api/interventions/{intervention_id}/cancel")
        assert cancel_resp.status_code == 200
        assert "annulée" in cancel_resp.json()["message"].lower()
        print("PASS: Intervention canceled successfully")
        
        # Verify status changed
        get_resp = api_client.get(f"{BASE_URL}/api/interventions/{intervention_id}")
        assert get_resp.status_code == 200
        assert get_resp.json()["statut"] == "annulee"
        print("PASS: Intervention status is now 'annulee'")
    
    def test_cannot_delete_started_intervention(self, api_client):
        """Test that started interventions cannot be deleted"""
        # Get interventions in en_cours status
        interventions_resp = api_client.get(f"{BASE_URL}/api/interventions", params={"statut": "en_cours"})
        started_interventions = interventions_resp.json()
        
        if started_interventions:
            intervention_id = started_interventions[0]["id"]
            delete_resp = api_client.delete(f"{BASE_URL}/api/interventions/{intervention_id}")
            assert delete_resp.status_code == 400
            print("PASS: Cannot delete started intervention (400 returned)")
        else:
            print("SKIP: No started interventions to test deletion restriction")


class TestFactureDelete:
    """Test DELETE /api/factures/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_delete_brouillon_facture(self, api_client):
        """Test deleting a facture in brouillon status"""
        # Get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        client_id = clients_resp.json()[0]["id"]
        
        # Create a facture in brouillon status
        facture_resp = api_client.post(f"{BASE_URL}/api/factures", json={
            "client_id": client_id,
            "lignes": [{"description": "Test facture item", "quantite": 1, "prix_unitaire": 200, "tva": 20}],
            "echeance_jours": 30
        })
        assert facture_resp.status_code == 200
        facture = facture_resp.json()
        facture_id = facture["id"]
        assert facture["statut"] == "brouillon"
        print(f"Created facture {facture['numero_facture']} in brouillon status")
        
        # Delete the facture
        delete_resp = api_client.delete(f"{BASE_URL}/api/factures/{facture_id}")
        assert delete_resp.status_code == 200
        print("PASS: Facture in brouillon status deleted successfully")
        
        # Verify deletion
        get_resp = api_client.get(f"{BASE_URL}/api/factures/{facture_id}")
        assert get_resp.status_code == 404
        print("PASS: Deleted facture returns 404")
    
    def test_cannot_delete_emise_facture(self, api_client):
        """Test that emise factures cannot be deleted"""
        # Get factures in emise status
        factures_resp = api_client.get(f"{BASE_URL}/api/factures", params={"statut": "emise"})
        emise_factures = factures_resp.json()
        
        if emise_factures:
            facture_id = emise_factures[0]["id"]
            delete_resp = api_client.delete(f"{BASE_URL}/api/factures/{facture_id}")
            assert delete_resp.status_code == 400
            print("PASS: Cannot delete emise facture (400 returned)")
        else:
            print("SKIP: No emise factures to test deletion restriction")


class TestUserDelete:
    """Test DELETE /api/users/{id} endpoint"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_invite_and_delete_technician(self, api_client):
        """Test inviting and then deleting a technician"""
        # Invite a new technician
        invite_resp = api_client.post(f"{BASE_URL}/api/auth/invite", json={
            "email": f"test_delete_tech_{datetime.now().timestamp()}@test.com",
            "nom": "TEST_DeleteTech",
            "prenom": "Technician",
            "telephone": "0600000099"
        })
        assert invite_resp.status_code == 200
        user_id = invite_resp.json()["user_id"]
        print(f"Invited technician with ID: {user_id}")
        
        # Delete the technician
        delete_resp = api_client.delete(f"{BASE_URL}/api/users/{user_id}")
        assert delete_resp.status_code == 200
        print("PASS: Technician deleted successfully")
        
        # Verify deletion
        get_resp = api_client.get(f"{BASE_URL}/api/users/{user_id}")
        assert get_resp.status_code == 404
        print("PASS: Deleted technician returns 404")


class TestPDFDownload:
    """Test PDF download endpoints with token authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_devis_pdf_download(self, api_client, auth_token):
        """Test downloading devis PDF with token"""
        # Get a devis
        devis_resp = api_client.get(f"{BASE_URL}/api/devis")
        devis_list = devis_resp.json()
        
        if devis_list:
            devis_id = devis_list[0]["id"]
            # Download PDF with token
            pdf_resp = requests.get(f"{BASE_URL}/api/devis/{devis_id}/pdf-download", params={"token": auth_token})
            assert pdf_resp.status_code == 200
            assert pdf_resp.headers.get("content-type") == "application/pdf"
            assert "attachment" in pdf_resp.headers.get("content-disposition", "")
            print(f"PASS: Devis PDF downloaded successfully ({len(pdf_resp.content)} bytes)")
        else:
            print("SKIP: No devis available for PDF download test")
    
    def test_facture_pdf_download(self, api_client, auth_token):
        """Test downloading facture PDF with token"""
        # Get a facture
        factures_resp = api_client.get(f"{BASE_URL}/api/factures")
        factures_list = factures_resp.json()
        
        if factures_list:
            facture_id = factures_list[0]["id"]
            # Download PDF with token
            pdf_resp = requests.get(f"{BASE_URL}/api/factures/{facture_id}/pdf-download", params={"token": auth_token})
            assert pdf_resp.status_code == 200
            assert pdf_resp.headers.get("content-type") == "application/pdf"
            assert "attachment" in pdf_resp.headers.get("content-disposition", "")
            print(f"PASS: Facture PDF downloaded successfully ({len(pdf_resp.content)} bytes)")
        else:
            print("SKIP: No factures available for PDF download test")
    
    def test_pdf_download_invalid_token(self):
        """Test PDF download with invalid token returns 401"""
        # Try with invalid token
        pdf_resp = requests.get(f"{BASE_URL}/api/devis/fake-id/pdf-download", params={"token": "invalid-token"})
        assert pdf_resp.status_code == 401
        print("PASS: Invalid token returns 401")


class TestDashboardStats:
    """Test dashboard stats - interventions_today counts only today"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def api_client(self, auth_token):
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"
        })
        return session
    
    def test_dashboard_stats_structure(self, api_client):
        """Test dashboard stats returns expected fields"""
        stats_resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        
        # Check required fields
        required_fields = [
            "interventions_today",
            "interventions_en_retard",
            "devis_en_attente",
            "devis_expires",
            "factures_impayees",
            "factures_en_retard",
            "ca_mois",
            "total_clients",
            "total_techniciens"
        ]
        
        for field in required_fields:
            assert field in stats, f"Missing field: {field}"
        
        print(f"PASS: Dashboard stats structure correct")
        print(f"  - interventions_today: {stats['interventions_today']}")
        print(f"  - devis_expires: {stats['devis_expires']}")
        print(f"  - factures_en_retard: {stats['factures_en_retard']}")
    
    def test_interventions_today_count(self, api_client):
        """Test that interventions_today counts only today's interventions"""
        # Get current stats
        stats_resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        initial_count = stats_resp.json()["interventions_today"]
        
        # Get a client
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        client_id = clients_resp.json()[0]["id"]
        
        # Create intervention for today
        today = datetime.now().replace(hour=14, minute=0, second=0, microsecond=0).isoformat()
        intervention_resp = api_client.post(f"{BASE_URL}/api/interventions", json={
            "client_id": client_id,
            "titre": "TEST_Today Intervention",
            "description": "Test intervention for today",
            "date_prevue": today,
            "duree_estimee": 60,
            "priorite": "normale"
        })
        assert intervention_resp.status_code == 200
        intervention_id = intervention_resp.json()["id"]
        
        # Check stats again
        stats_resp = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        new_count = stats_resp.json()["interventions_today"]
        
        assert new_count == initial_count + 1, f"Expected {initial_count + 1}, got {new_count}"
        print(f"PASS: interventions_today incremented from {initial_count} to {new_count}")
        
        # Cleanup - delete the test intervention
        api_client.delete(f"{BASE_URL}/api/interventions/{intervention_id}")
    
    def test_dashboard_alerts(self, api_client):
        """Test dashboard alerts endpoint"""
        alerts_resp = api_client.get(f"{BASE_URL}/api/dashboard/alerts")
        assert alerts_resp.status_code == 200
        alerts = alerts_resp.json()
        assert isinstance(alerts, list)
        print(f"PASS: Dashboard alerts returned {len(alerts)} alerts")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
