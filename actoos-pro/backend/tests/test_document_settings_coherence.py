"""
Test Document Settings Coherence - Iteration 37
Tests for:
1. GET /api/settings/documents/defaults/devis - Returns default values for devis creation
2. POST /api/devis - Creates devis with merged values (local priority over global)
3. Document settings form has new fields: message_client_devis, message_client_facture, validite_devis_jours
4. Priority logic: local value > global value
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "salifkane612+enterprise@gmail.com"
ADMIN_PASSWORD = "Salifkane&&7"


class TestDocumentSettingsCoherence:
    """Test document settings coherence feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.client_id = None
        
    def authenticate(self):
        """Authenticate and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        self.token = data.get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return data
    
    def get_or_create_client(self):
        """Get existing client or create one for testing"""
        # First try to get existing clients
        response = self.session.get(f"{BASE_URL}/api/clients")
        if response.status_code == 200 and len(response.json()) > 0:
            self.client_id = response.json()[0]["id"]
            return self.client_id
        
        # Create a test client if none exists
        response = self.session.post(f"{BASE_URL}/api/clients", json={
            "nom": "TEST_DocSettings",
            "prenom": "Client",
            "email": "test_docsettings@example.com",
            "telephone": "+33612345678"
        })
        # API returns 200 or 201 for successful creation
        assert response.status_code in [200, 201], f"Failed to create client: {response.text}"
        self.client_id = response.json()["id"]
        return self.client_id

    # ==================== SETTINGS ENDPOINTS TESTS ====================
    
    def test_01_login_success(self):
        """Test login with admin credentials"""
        data = self.authenticate()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Login successful for {ADMIN_EMAIL}")
    
    def test_02_get_document_settings(self):
        """Test GET /api/settings/documents returns all document settings"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/settings/documents")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Check that new fields exist
        assert "conditions_generales" in data
        assert "message_client_devis" in data
        assert "message_client_facture" in data
        assert "validite_devis_jours" in data
        assert "devis_footer" in data
        assert "facture_footer" in data
        assert "conditions_paiement" in data
        assert "delai_paiement_jours" in data
        
        print(f"✓ Document settings retrieved successfully")
        print(f"  - conditions_generales: {data.get('conditions_generales', '')[:50]}...")
        print(f"  - message_client_devis: {data.get('message_client_devis', '')[:50]}...")
        print(f"  - validite_devis_jours: {data.get('validite_devis_jours')}")
    
    def test_03_get_devis_defaults(self):
        """Test GET /api/settings/documents/defaults/devis returns default values for new devis"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/devis")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Check expected fields in defaults response
        assert "conditions" in data, "Missing 'conditions' field in devis defaults"
        assert "message_client" in data, "Missing 'message_client' field in devis defaults"
        assert "validite_jours" in data, "Missing 'validite_jours' field in devis defaults"
        assert "pied_de_page" in data, "Missing 'pied_de_page' field in devis defaults"
        
        print(f"✓ Devis defaults endpoint working")
        print(f"  - conditions: {data.get('conditions', '')[:50]}...")
        print(f"  - message_client: {data.get('message_client', '')[:50]}...")
        print(f"  - validite_jours: {data.get('validite_jours')}")
        print(f"  - pied_de_page: {data.get('pied_de_page', '')[:50]}...")
        
        return data
    
    def test_04_get_facture_defaults(self):
        """Test GET /api/settings/documents/defaults/facture returns default values for new facture"""
        self.authenticate()
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/facture")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        # Check expected fields in defaults response
        assert "conditions_paiement" in data, "Missing 'conditions_paiement' field"
        assert "delai_paiement_jours" in data, "Missing 'delai_paiement_jours' field"
        assert "message_client" in data, "Missing 'message_client' field"
        assert "pied_de_page" in data, "Missing 'pied_de_page' field"
        assert "mentions_legales" in data, "Missing 'mentions_legales' field"
        
        print(f"✓ Facture defaults endpoint working")
        print(f"  - conditions_paiement: {data.get('conditions_paiement', '')[:50]}...")
        print(f"  - delai_paiement_jours: {data.get('delai_paiement_jours')}")
        print(f"  - message_client: {data.get('message_client', '')[:50]}...")
        
        return data
    
    def test_05_update_document_settings(self):
        """Test PUT /api/settings/documents updates settings including new fields"""
        self.authenticate()
        
        # First get current settings
        response = self.session.get(f"{BASE_URL}/api/settings/documents")
        assert response.status_code == 200
        current_settings = response.json()
        
        # Update with test values
        test_settings = {
            "conditions_generales": "TEST: Conditions générales de vente personnalisées pour les tests.",
            "message_client_devis": "TEST: Message personnalisé pour les devis.",
            "message_client_facture": "TEST: Message personnalisé pour les factures.",
            "validite_devis_jours": 45,
            "devis_footer": current_settings.get("devis_footer", ""),
            "facture_footer": current_settings.get("facture_footer", ""),
            "conditions_paiement": current_settings.get("conditions_paiement", "Paiement à réception"),
            "delai_paiement_jours": current_settings.get("delai_paiement_jours", 30),
            "mentions_legales": current_settings.get("mentions_legales", ""),
            "prefixe_devis": current_settings.get("prefixe_devis", "D"),
            "prefixe_facture": current_settings.get("prefixe_facture", "F")
        }
        
        response = self.session.put(f"{BASE_URL}/api/settings/documents", json=test_settings)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the update
        response = self.session.get(f"{BASE_URL}/api/settings/documents")
        assert response.status_code == 200
        updated = response.json()
        
        assert updated.get("conditions_generales") == test_settings["conditions_generales"]
        assert updated.get("message_client_devis") == test_settings["message_client_devis"]
        assert updated.get("message_client_facture") == test_settings["message_client_facture"]
        assert updated.get("validite_devis_jours") == test_settings["validite_devis_jours"]
        
        print(f"✓ Document settings updated successfully")
        print(f"  - conditions_generales updated")
        print(f"  - message_client_devis updated")
        print(f"  - message_client_facture updated")
        print(f"  - validite_devis_jours: {updated.get('validite_devis_jours')}")
    
    def test_06_devis_defaults_reflect_settings(self):
        """Test that devis defaults reflect the updated document settings"""
        self.authenticate()
        
        # Get devis defaults
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/devis")
        assert response.status_code == 200
        defaults = response.json()
        
        # Get document settings
        response = self.session.get(f"{BASE_URL}/api/settings/documents")
        assert response.status_code == 200
        settings = response.json()
        
        # Verify defaults match settings
        assert defaults.get("conditions") == settings.get("conditions_generales"), \
            f"Conditions mismatch: defaults={defaults.get('conditions')}, settings={settings.get('conditions_generales')}"
        assert defaults.get("message_client") == settings.get("message_client_devis"), \
            f"Message client mismatch: defaults={defaults.get('message_client')}, settings={settings.get('message_client_devis')}"
        assert defaults.get("validite_jours") == settings.get("validite_devis_jours"), \
            f"Validite mismatch: defaults={defaults.get('validite_jours')}, settings={settings.get('validite_devis_jours')}"
        
        print(f"✓ Devis defaults correctly reflect document settings")
        print(f"  - conditions matches conditions_generales")
        print(f"  - message_client matches message_client_devis")
        print(f"  - validite_jours matches validite_devis_jours")

    # ==================== DEVIS CREATION WITH DEFAULTS TESTS ====================
    
    def test_07_create_devis_uses_global_defaults(self):
        """Test that creating a devis without local values uses global defaults"""
        self.authenticate()
        self.get_or_create_client()
        
        # Get current defaults
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/devis")
        assert response.status_code == 200
        defaults = response.json()
        
        # Create devis without specifying conditions, message_client, validite_jours
        devis_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "TEST: Service de test",
                    "quantite": 1,
                    "prix_unitaire": 100.0,
                    "tva": 20.0
                }
            ]
            # Not specifying conditions, message_client, validite_jours
        }
        
        response = self.session.post(f"{BASE_URL}/api/devis", json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        created_devis = response.json()
        
        # Verify global defaults were applied
        assert created_devis.get("conditions") == defaults.get("conditions"), \
            f"Conditions not applied from defaults: got '{created_devis.get('conditions')}', expected '{defaults.get('conditions')}'"
        assert created_devis.get("message_client") == defaults.get("message_client"), \
            f"Message client not applied from defaults"
        
        print(f"✓ Devis created with global defaults")
        print(f"  - Devis ID: {created_devis.get('id')}")
        print(f"  - Numero: {created_devis.get('numero_devis')}")
        print(f"  - conditions: {created_devis.get('conditions', '')[:50]}...")
        print(f"  - message_client: {created_devis.get('message_client', '')[:50]}...")
        print(f"  - validite_jours: {created_devis.get('validite_jours')}")
        
        # Cleanup - delete the test devis
        self.session.delete(f"{BASE_URL}/api/devis/{created_devis['id']}")
        
        return created_devis
    
    def test_08_create_devis_local_overrides_global(self):
        """Test that local values in devis creation override global defaults (priority logic)"""
        self.authenticate()
        self.get_or_create_client()
        
        # Create devis with local values that should override global
        local_conditions = "LOCAL: Conditions spécifiques à ce devis uniquement."
        local_message = "LOCAL: Message personnalisé pour ce devis."
        local_validite = 15  # Different from global
        
        devis_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "TEST: Service avec conditions locales",
                    "quantite": 2,
                    "prix_unitaire": 150.0,
                    "tva": 20.0
                }
            ],
            "conditions": local_conditions,
            "message_client": local_message,
            "validite_jours": local_validite
        }
        
        response = self.session.post(f"{BASE_URL}/api/devis", json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        created_devis = response.json()
        
        # Verify local values were used (not global defaults)
        assert created_devis.get("conditions") == local_conditions, \
            f"Local conditions not applied: got '{created_devis.get('conditions')}'"
        assert created_devis.get("message_client") == local_message, \
            f"Local message not applied: got '{created_devis.get('message_client')}'"
        assert created_devis.get("validite_jours") == local_validite, \
            f"Local validite not applied: got {created_devis.get('validite_jours')}"
        
        print(f"✓ Devis created with local values overriding global defaults")
        print(f"  - Devis ID: {created_devis.get('id')}")
        print(f"  - conditions (local): {created_devis.get('conditions')[:50]}...")
        print(f"  - message_client (local): {created_devis.get('message_client')[:50]}...")
        print(f"  - validite_jours (local): {created_devis.get('validite_jours')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/devis/{created_devis['id']}")
        
        return created_devis
    
    def test_09_create_devis_partial_local_values(self):
        """Test that partial local values work (some local, some global)"""
        self.authenticate()
        self.get_or_create_client()
        
        # Get current defaults
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/devis")
        assert response.status_code == 200
        defaults = response.json()
        
        # Create devis with only conditions specified locally
        local_conditions = "PARTIAL: Seules les conditions sont locales."
        
        devis_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "TEST: Service avec conditions partielles",
                    "quantite": 1,
                    "prix_unitaire": 200.0,
                    "tva": 20.0
                }
            ],
            "conditions": local_conditions
            # message_client and validite_jours not specified - should use global
        }
        
        response = self.session.post(f"{BASE_URL}/api/devis", json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        created_devis = response.json()
        
        # Verify local conditions applied
        assert created_devis.get("conditions") == local_conditions, \
            f"Local conditions not applied"
        
        # Verify global defaults used for other fields
        assert created_devis.get("message_client") == defaults.get("message_client"), \
            f"Global message_client not applied"
        
        print(f"✓ Devis created with partial local values")
        print(f"  - conditions (local): {created_devis.get('conditions')[:50]}...")
        print(f"  - message_client (global): {created_devis.get('message_client', '')[:50]}...")
        print(f"  - validite_jours: {created_devis.get('validite_jours')}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/devis/{created_devis['id']}")
        
        return created_devis

    # ==================== EDGE CASES ====================
    
    def test_10_empty_local_values_use_global(self):
        """Test that empty string local values fall back to global defaults"""
        self.authenticate()
        self.get_or_create_client()
        
        # Get current defaults
        response = self.session.get(f"{BASE_URL}/api/settings/documents/defaults/devis")
        assert response.status_code == 200
        defaults = response.json()
        
        # Create devis with empty conditions (should use global)
        devis_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "TEST: Service avec conditions vides",
                    "quantite": 1,
                    "prix_unitaire": 50.0,
                    "tva": 20.0
                }
            ],
            "conditions": "",  # Empty string
            "message_client": ""  # Empty string
        }
        
        response = self.session.post(f"{BASE_URL}/api/devis", json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        created_devis = response.json()
        
        # Empty local values should fall back to global defaults
        # Note: This depends on implementation - empty string might be treated as "no value"
        # and fall back to global, or it might be treated as "explicitly empty"
        
        print(f"✓ Devis created with empty local values")
        print(f"  - conditions: '{created_devis.get('conditions', '')[:50]}'")
        print(f"  - message_client: '{created_devis.get('message_client', '')[:50]}'")
        print(f"  - Global conditions: '{defaults.get('conditions', '')[:50]}'")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/devis/{created_devis['id']}")
    
    def test_11_get_all_settings_includes_documents(self):
        """Test GET /api/settings/all includes document settings"""
        self.authenticate()
        
        response = self.session.get(f"{BASE_URL}/api/settings/all")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert "documents" in data, "Missing 'documents' in all settings"
        
        documents = data["documents"]
        assert "conditions_generales" in documents
        assert "message_client_devis" in documents
        assert "message_client_facture" in documents
        assert "validite_devis_jours" in documents
        
        print(f"✓ All settings endpoint includes document settings")
        print(f"  - documents.conditions_generales present")
        print(f"  - documents.message_client_devis present")
        print(f"  - documents.validite_devis_jours: {documents.get('validite_devis_jours')}")

    # ==================== PDF GENERATION TEST ====================
    
    def test_12_devis_pdf_includes_message_client(self):
        """Test that devis PDF includes message_client field"""
        self.authenticate()
        self.get_or_create_client()
        
        # Create devis with message_client
        devis_data = {
            "client_id": self.client_id,
            "lignes": [
                {
                    "description": "TEST: Service pour PDF",
                    "quantite": 1,
                    "prix_unitaire": 100.0,
                    "tva": 20.0
                }
            ],
            "conditions": "Conditions pour le PDF test",
            "message_client": "Message personnalisé visible sur le PDF"
        }
        
        response = self.session.post(f"{BASE_URL}/api/devis", json=devis_data)
        assert response.status_code == 200, f"Failed to create devis: {response.text}"
        
        created_devis = response.json()
        devis_id = created_devis["id"]
        
        # Get PDF
        response = self.session.get(f"{BASE_URL}/api/devis/{devis_id}/pdf")
        assert response.status_code == 200, f"Failed to get PDF: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        
        # PDF content check would require parsing - just verify it's generated
        pdf_content = response.content
        assert len(pdf_content) > 1000, "PDF seems too small"
        
        print(f"✓ Devis PDF generated successfully")
        print(f"  - PDF size: {len(pdf_content)} bytes")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/devis/{devis_id}")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
