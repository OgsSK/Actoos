"""
Comprehensive Test Suite for Actoos SaaS Multi-tenant Field Service Management
Tests: Authentication, CRUD operations, Plan limits, Subscriptions, Portal, PWA

Test credentials:
- Admin: admin@testplomberie.fr / password123
- Tech: tech@testplomberie.fr / technicien123
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://date-1.preview.emergentagent.com')

# Test data prefixes for cleanup
TEST_PREFIX = "TEST_COMPREHENSIVE_"


class TestAuthentication:
    """Test authentication flows: login admin, login tech, logout"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == "admin@testplomberie.fr"
        assert "entreprise" in data
        
    def test_tech_login_success(self):
        """Test technician login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech@testplomberie.fr",
            "password": "technicien123"
        })
        assert response.status_code == 200, f"Tech login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "tech"
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # First login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["email"] == "admin@testplomberie.fr"


class TestPlansAndSubscription:
    """Test subscription plans and billing"""
    
    def test_list_plans(self):
        """Test /api/plans returns all 3 plans with correct prices"""
        response = requests.get(f"{BASE_URL}/api/plans")
        assert response.status_code == 200
        plans = response.json()
        
        # Should have 3 plans
        assert len(plans) >= 3
        
        # Check plan names and prices
        plan_dict = {p["id"]: p for p in plans}
        
        assert "startup" in plan_dict
        assert plan_dict["startup"]["price"] == 49.0
        assert plan_dict["startup"]["limits"]["max_technicians"] == 3
        assert plan_dict["startup"]["limits"]["max_categories"] == 1
        
        assert "pro" in plan_dict
        assert plan_dict["pro"]["price"] == 79.0
        assert plan_dict["pro"]["limits"]["max_technicians"] == 10
        assert plan_dict["pro"]["limits"]["max_categories"] == 4
        
        assert "enterprise" in plan_dict
        assert plan_dict["enterprise"]["price"] == 149.0
        
    def test_get_usage(self):
        """Test /api/usage returns current plan usage"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/usage",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan" in data
        assert "usage" in data
        
    def test_billing_summary(self):
        """Test /api/billing-summary returns billing info"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/billing-summary",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "plan_name" in data
        assert "base_price" in data
        assert "technicians" in data
        assert "total_monthly" in data
        
    def test_available_plans_for_change(self):
        """Test /api/available-plans returns plans for upgrade/downgrade"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        token = login_resp.json()["access_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/available-plans",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "current_plan" in data
        assert "plans" in data


class TestClientsCRUD:
    """Test Clients CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_create_client(self):
        """Test creating a new client"""
        client_data = {
            "nom": f"{TEST_PREFIX}Client",
            "prenom": "Test",
            "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com",
            "telephone": "0612345678",
            "adresse": "123 Test Street",
            "ville": "Paris",
            "code_postal": "75001"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/clients",
            json=client_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        assert data["nom"] == client_data["nom"]
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=self.headers)
        
    def test_list_clients(self):
        """Test listing clients"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_get_client(self):
        """Test getting a specific client"""
        # First create a client
        client_data = {
            "nom": f"{TEST_PREFIX}GetClient",
            "prenom": "Test",
            "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com"
        }
        create_resp = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.headers)
        client_id = create_resp.json()["id"]
        
        # Get the client
        response = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200
        assert response.json()["id"] == client_id
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        
    def test_update_client(self):
        """Test updating a client"""
        # Create client
        client_data = {
            "nom": f"{TEST_PREFIX}UpdateClient",
            "prenom": "Before",
            "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com"
        }
        create_resp = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.headers)
        client_id = create_resp.json()["id"]
        
        # Update client
        update_data = {
            "nom": f"{TEST_PREFIX}UpdateClient",
            "prenom": "After",
            "email": client_data["email"]
        }
        response = requests.put(f"{BASE_URL}/api/clients/{client_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        assert response.json()["prenom"] == "After"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        
    def test_delete_client(self):
        """Test deleting a client"""
        # Create client
        client_data = {
            "nom": f"{TEST_PREFIX}DeleteClient",
            "prenom": "Test",
            "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com"
        }
        create_resp = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.headers)
        client_id = create_resp.json()["id"]
        
        # Delete client
        response = requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        assert response.status_code == 200
        
        # Verify deleted
        get_resp = requests.get(f"{BASE_URL}/api/clients/{client_id}", headers=self.headers)
        assert get_resp.status_code == 404


class TestInterventionsCRUD:
    """Test Interventions CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and create test client"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get existing clients
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_resp.json()
        if clients:
            self.client_id = clients[0]["id"]
        else:
            # Create a test client
            client_data = {
                "nom": f"{TEST_PREFIX}InterventionClient",
                "prenom": "Test",
                "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com"
            }
            create_resp = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=self.headers)
            self.client_id = create_resp.json()["id"]
            
    def test_create_intervention(self):
        """Test creating a new intervention"""
        intervention_data = {
            "client_id": self.client_id,
            "titre": f"{TEST_PREFIX}Intervention",
            "description": "Test intervention description",
            "date_prevue": (datetime.now() + timedelta(days=1)).isoformat(),
            "priorite": "normale"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/interventions",
            json=intervention_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create intervention failed: {response.text}"
        data = response.json()
        assert data["titre"] == intervention_data["titre"]
        assert data["statut"] == "planifiee"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/interventions/{data['id']}", headers=self.headers)
        
    def test_list_interventions(self):
        """Test listing interventions"""
        response = requests.get(f"{BASE_URL}/api/interventions", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_intervention_workflow(self):
        """Test intervention workflow: create -> start -> complete"""
        # Create intervention
        intervention_data = {
            "client_id": self.client_id,
            "titre": f"{TEST_PREFIX}WorkflowIntervention",
            "description": "Test workflow",
            "date_prevue": datetime.now().isoformat(),
            "priorite": "haute"
        }
        create_resp = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=self.headers)
        assert create_resp.status_code == 200
        intervention_id = create_resp.json()["id"]
        
        # Start intervention
        start_resp = requests.post(f"{BASE_URL}/api/interventions/{intervention_id}/start", headers=self.headers)
        assert start_resp.status_code == 200
        
        # Verify status changed
        get_resp = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=self.headers)
        assert get_resp.json()["statut"] == "en_cours"
        
        # Complete intervention
        complete_resp = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/complete",
            headers=self.headers
        )
        assert complete_resp.status_code == 200
        
        # Verify completed
        get_resp2 = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=self.headers)
        assert get_resp2.json()["statut"] == "terminee"
        
    def test_cancel_intervention(self):
        """Test cancelling an intervention"""
        # Create intervention
        intervention_data = {
            "client_id": self.client_id,
            "titre": f"{TEST_PREFIX}CancelIntervention",
            "description": "To be cancelled",
            "date_prevue": (datetime.now() + timedelta(days=1)).isoformat()
        }
        create_resp = requests.post(f"{BASE_URL}/api/interventions", json=intervention_data, headers=self.headers)
        intervention_id = create_resp.json()["id"]
        
        # Cancel intervention
        cancel_resp = requests.post(
            f"{BASE_URL}/api/interventions/{intervention_id}/cancel",
            params={"motif": "Test cancellation"},
            headers=self.headers
        )
        assert cancel_resp.status_code == 200
        
        # Verify cancelled
        get_resp = requests.get(f"{BASE_URL}/api/interventions/{intervention_id}", headers=self.headers)
        assert get_resp.json()["statut"] == "annulee"


class TestDevisCRUD:
    """Test Devis (Quotes) CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get client"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get existing clients
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_resp.json()
        if clients:
            self.client_id = clients[0]["id"]
        else:
            pytest.skip("No clients available for devis tests")
            
    def test_create_devis(self):
        """Test creating a new devis"""
        devis_data = {
            "client_id": self.client_id,
            "objet": f"{TEST_PREFIX}Devis Test",
            "lignes": [
                {
                    "description": "Service de test",
                    "quantite": 1,
                    "prix_unitaire": 100.0,
                    "tva": 20.0
                }
            ],
            "validite_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/devis",
            json=devis_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create devis failed: {response.text}"
        data = response.json()
        assert "numero_devis" in data
        assert data["statut"] == "brouillon"
        assert data["total_ttc"] == 120.0  # 100 + 20% TVA
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/devis/{data['id']}", headers=self.headers)
        
    def test_list_devis(self):
        """Test listing devis"""
        response = requests.get(f"{BASE_URL}/api/devis", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_devis_workflow(self):
        """Test devis workflow: create -> send -> sign"""
        # Create devis
        devis_data = {
            "client_id": self.client_id,
            "objet": f"{TEST_PREFIX}Workflow Devis",
            "lignes": [
                {
                    "description": "Service workflow",
                    "quantite": 2,
                    "prix_unitaire": 50.0,
                    "tva": 20.0
                }
            ],
            "validite_jours": 30
        }
        create_resp = requests.post(f"{BASE_URL}/api/devis", json=devis_data, headers=self.headers)
        assert create_resp.status_code == 200
        devis_id = create_resp.json()["id"]
        
        # Send devis
        send_resp = requests.post(f"{BASE_URL}/api/devis/{devis_id}/send", headers=self.headers)
        assert send_resp.status_code == 200
        
        # Verify status changed
        get_resp = requests.get(f"{BASE_URL}/api/devis/{devis_id}", headers=self.headers)
        assert get_resp.json()["statut"] == "envoye"
        
        # Sign devis
        sign_resp = requests.post(
            f"{BASE_URL}/api/devis/{devis_id}/sign",
            params={"signature": "data:image/png;base64,test", "nom_signataire": "Test Signer"},
            headers=self.headers
        )
        assert sign_resp.status_code == 200
        
        # Verify signed
        get_resp2 = requests.get(f"{BASE_URL}/api/devis/{devis_id}", headers=self.headers)
        assert get_resp2.json()["statut"] == "signe"
        
    def test_get_devis_pdf(self):
        """Test generating devis PDF"""
        # Get existing devis
        list_resp = requests.get(f"{BASE_URL}/api/devis", headers=self.headers)
        devis_list = list_resp.json()
        if not devis_list:
            pytest.skip("No devis available for PDF test")
            
        devis_id = devis_list[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/devis/{devis_id}/pdf", headers=self.headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"


class TestFacturesCRUD:
    """Test Factures (Invoices) CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get client"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get existing clients
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_resp.json()
        if clients:
            self.client_id = clients[0]["id"]
        else:
            pytest.skip("No clients available for facture tests")
            
    def test_create_facture(self):
        """Test creating a new facture"""
        facture_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "Service facturé",
                    "quantite": 1,
                    "prix_unitaire": 200.0,
                    "tva": 20.0
                }
            ],
            "echeance_jours": 30
        }
        
        response = requests.post(
            f"{BASE_URL}/api/factures",
            json=facture_data,
            headers=self.headers
        )
        assert response.status_code == 200, f"Create facture failed: {response.text}"
        data = response.json()
        assert "numero_facture" in data
        assert data["statut"] == "brouillon"
        assert data["total_ttc"] == 240.0  # 200 + 20% TVA
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/factures/{data['id']}", headers=self.headers)
        
    def test_list_factures(self):
        """Test listing factures"""
        response = requests.get(f"{BASE_URL}/api/factures", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_facture_workflow(self):
        """Test facture workflow: create -> emit -> pay"""
        # Create facture
        facture_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "Service workflow facture",
                    "quantite": 1,
                    "prix_unitaire": 100.0,
                    "tva": 20.0
                }
            ],
            "echeance_jours": 30
        }
        create_resp = requests.post(f"{BASE_URL}/api/factures", json=facture_data, headers=self.headers)
        assert create_resp.status_code == 200
        facture_id = create_resp.json()["id"]
        
        # Emit facture
        emit_resp = requests.post(f"{BASE_URL}/api/factures/{facture_id}/emit", headers=self.headers)
        assert emit_resp.status_code == 200
        
        # Verify status changed
        get_resp = requests.get(f"{BASE_URL}/api/factures/{facture_id}", headers=self.headers)
        assert get_resp.json()["statut"] == "emise"
        
        # Pay facture
        pay_resp = requests.post(
            f"{BASE_URL}/api/factures/{facture_id}/pay",
            params={"montant": 120.0, "mode_paiement": "carte"},
            headers=self.headers
        )
        assert pay_resp.status_code == 200
        
        # Verify paid
        get_resp2 = requests.get(f"{BASE_URL}/api/factures/{facture_id}", headers=self.headers)
        assert get_resp2.json()["statut"] == "payee"
        
    def test_get_facture_pdf(self):
        """Test generating facture PDF"""
        # Get existing factures
        list_resp = requests.get(f"{BASE_URL}/api/factures", headers=self.headers)
        factures = list_resp.json()
        if not factures:
            pytest.skip("No factures available for PDF test")
            
        facture_id = factures[0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/factures/{facture_id}/pdf", headers=self.headers)
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"


class TestCategories:
    """Test Categories CRUD and plan limits"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_list_categories(self):
        """Test listing categories"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_create_category(self):
        """Test creating a category"""
        category_data = {
            "code": f"test_{uuid.uuid4().hex[:8]}",
            "nom": f"{TEST_PREFIX}Category",
            "description": "Test category",
            "icone": "wrench",
            "couleur": "#FF5733",
            "checklist_template": [
                {"id": "test_1", "label": "Test item", "type": "checkbox", "required": True}
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            json=category_data,
            headers=self.headers
        )
        # May fail due to plan limits - that's expected behavior
        if response.status_code == 403:
            data = response.json()
            assert "plan_limit_exceeded" in str(data) or "limit" in str(data).lower()
        else:
            assert response.status_code == 200
            # Cleanup
            cat_id = response.json()["id"]
            requests.delete(f"{BASE_URL}/api/categories/{cat_id}", headers=self.headers)


class TestEntrepriseSettings:
    """Test Entreprise settings and branding"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_entreprise(self):
        """Test getting entreprise info"""
        response = requests.get(f"{BASE_URL}/api/entreprise", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "nom" in data
        assert "id" in data
        
    def test_update_entreprise(self):
        """Test updating entreprise settings"""
        update_data = {
            "telephone": "0123456789"
        }
        response = requests.put(
            f"{BASE_URL}/api/entreprise",
            json=update_data,
            headers=self.headers
        )
        assert response.status_code == 200
        
    def test_update_branding_color(self):
        """Test updating branding color"""
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "#3B82F6"},
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["couleur_primaire"] == "#3B82F6"
        
    def test_update_branding_invalid_color(self):
        """Test updating branding with invalid color"""
        response = requests.put(
            f"{BASE_URL}/api/entreprise/branding",
            params={"couleur_primaire": "invalid"},
            headers=self.headers
        )
        assert response.status_code == 400


class TestPortal:
    """Test Client Portal endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get client with portal token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get clients
        clients_resp = requests.get(f"{BASE_URL}/api/clients", headers=self.headers)
        clients = clients_resp.json()
        if clients:
            self.client_id = clients[0]["id"]
            # Get portal link
            portal_resp = requests.get(
                f"{BASE_URL}/api/clients/{self.client_id}/portal-link",
                headers=self.headers
            )
            if portal_resp.status_code == 200:
                self.portal_token = portal_resp.json().get("portal_token")
            else:
                self.portal_token = None
        else:
            self.client_id = None
            self.portal_token = None
            
    def test_get_portal_link(self):
        """Test getting client portal link"""
        if not self.client_id:
            pytest.skip("No client available")
            
        response = requests.get(
            f"{BASE_URL}/api/clients/{self.client_id}/portal-link",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "portal_token" in data
        assert "portal_url" in data
        
    def test_portal_dashboard(self):
        """Test client portal dashboard"""
        if not self.portal_token:
            pytest.skip("No portal token available")
            
        response = requests.get(f"{BASE_URL}/api/portal/client/{self.portal_token}")
        assert response.status_code == 200
        data = response.json()
        assert "client" in data
        assert "devis" in data
        assert "factures" in data
        assert "summary" in data


class TestTechnicianPWA:
    """Test Technician PWA endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as technician"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech@testplomberie.fr",
            "password": "technicien123"
        })
        if login_resp.status_code == 200:
            self.token = login_resp.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
            
    def test_get_today_interventions(self):
        """Test getting today's interventions for technician"""
        if not self.token:
            pytest.skip("Tech login failed")
            
        response = requests.get(
            f"{BASE_URL}/api/interventions/today",
            headers=self.headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        
    def test_get_available_interventions(self):
        """Test getting available (unassigned) interventions"""
        if not self.token:
            pytest.skip("Tech login failed")
            
        response = requests.get(
            f"{BASE_URL}/api/interventions/available",
            headers=self.headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestUsers:
    """Test Users management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login as admin"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_list_users(self):
        """Test listing users"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        # Should have at least admin and tech
        assert len(users) >= 1
        
    def test_invite_technician(self):
        """Test inviting a technician"""
        invite_data = {
            "email": f"{TEST_PREFIX.lower()}{uuid.uuid4().hex[:8]}@test.com",
            "nom": f"{TEST_PREFIX}Tech",
            "prenom": "Invited",
            "telephone": "0612345678"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/auth/invite",
            json=invite_data,
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert "invite_token" in data


class TestAPIEndpoints:
    """Test various API endpoints are responding"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@testplomberie.fr",
            "password": "password123"
        })
        self.token = login_resp.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_currencies_endpoint(self):
        """Test /api/currencies endpoint"""
        response = requests.get(f"{BASE_URL}/api/currencies")
        assert response.status_code == 200
        
    def test_locales_endpoint(self):
        """Test /api/locales endpoint"""
        response = requests.get(f"{BASE_URL}/api/locales")
        assert response.status_code == 200
        
    def test_sms_status_endpoint(self):
        """Test /api/sms/status endpoint"""
        response = requests.get(f"{BASE_URL}/api/sms/status", headers=self.headers)
        assert response.status_code == 200
        
    def test_public_api_info(self):
        """Test /api/public-api/info endpoint"""
        response = requests.get(f"{BASE_URL}/api/public-api/info")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data


class TestStressTest:
    """Stress test: Create multiple enterprises simulation"""
    
    def test_plans_endpoint_multiple_calls(self):
        """Test plans endpoint handles multiple calls"""
        for i in range(10):
            response = requests.get(f"{BASE_URL}/api/plans")
            assert response.status_code == 200
            
    def test_auth_endpoint_multiple_calls(self):
        """Test auth endpoint handles multiple login attempts"""
        for i in range(5):
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@testplomberie.fr",
                "password": "password123"
            })
            assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
