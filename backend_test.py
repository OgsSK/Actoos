#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class FieldCommandAPITester:
    def __init__(self, base_url="https://date-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.entreprise_id = None
        self.client_id = None
        self.intervention_id = None
        self.devis_id = None
        self.facture_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                if response.text:
                    try:
                        error_data = response.json()
                        details += f", Error: {error_data.get('detail', response.text[:100])}"
                    except:
                        details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            
            if success and response.text:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return {}

    def test_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        register_data = {
            "entreprise_nom": f"Test Plomberie Pro {timestamp}",
            "entreprise_email": f"contact{timestamp}@testplomberie.fr",
            "entreprise_telephone": "0123456789",
            "admin_email": f"admin{timestamp}@testplomberie.fr",
            "admin_nom": "Dupont",
            "admin_prenom": "Jean",
            "admin_password": "testpassword123"
        }
        
        response = self.run_test(
            "Register Enterprise",
            "POST",
            "auth/register",
            200,
            data=register_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.entreprise_id = response['user']['entreprise_id']
            return True
        return False

    def test_login(self):
        """Test login with test credentials"""
        login_data = {
            "email": "test@fieldcommand.fr",
            "password": "testpassword123"
        }
        
        response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if response and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            self.entreprise_id = response['user']['entreprise_id']
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return bool(response)

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        return bool(response)

    def test_dashboard_alerts(self):
        """Test dashboard alerts"""
        response = self.run_test(
            "Dashboard Alerts",
            "GET",
            "dashboard/alerts",
            200
        )
        return bool(response)

    def test_create_client(self):
        """Test client creation"""
        client_data = {
            "nom": "Martin",
            "prenom": "Pierre",
            "email": "pierre.martin@email.com",
            "telephone": "0123456789",
            "adresse": "123 Rue de la Paix",
            "ville": "Paris",
            "code_postal": "75001",
            "type_client": "particulier",
            "notes": "Client test"
        }
        
        response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        
        if response and 'id' in response:
            self.client_id = response['id']
            return True
        return False

    def test_list_clients(self):
        """Test list clients"""
        response = self.run_test(
            "List Clients",
            "GET",
            "clients",
            200
        )
        return isinstance(response, list)

    def test_get_client(self):
        """Test get specific client"""
        if not self.client_id:
            self.log_test("Get Client", False, "No client ID available")
            return False
            
        response = self.run_test(
            "Get Client",
            "GET",
            f"clients/{self.client_id}",
            200
        )
        return bool(response)

    def test_create_intervention(self):
        """Test intervention creation"""
        if not self.client_id:
            self.log_test("Create Intervention", False, "No client ID available")
            return False
            
        intervention_data = {
            "client_id": self.client_id,
            "titre": "Réparation fuite",
            "description": "Réparation d'une fuite dans la salle de bain",
            "date_prevue": (datetime.now() + timedelta(days=1)).isoformat(),
            "adresse_intervention": "123 Rue de la Paix, 75001 Paris",
            "type_intervention": "depannage",
            "priorite": "normale"
        }
        
        response = self.run_test(
            "Create Intervention",
            "POST",
            "interventions",
            200,
            data=intervention_data
        )
        
        if response and 'id' in response:
            self.intervention_id = response['id']
            return True
        return False

    def test_list_interventions(self):
        """Test list interventions"""
        response = self.run_test(
            "List Interventions",
            "GET",
            "interventions",
            200
        )
        return isinstance(response, list)

    def test_create_devis(self):
        """Test devis creation"""
        if not self.client_id:
            self.log_test("Create Devis", False, "No client ID available")
            return False
            
        devis_data = {
            "client_id": self.client_id,
            "intervention_id": self.intervention_id,
            "lignes": [
                {
                    "description": "Réparation fuite robinet",
                    "quantite": 1,
                    "prix_unitaire": 150.0,
                    "tva": 20
                },
                {
                    "description": "Pièce de rechange",
                    "quantite": 2,
                    "prix_unitaire": 25.0,
                    "tva": 20
                }
            ],
            "conditions": "Paiement à 30 jours",
            "validite_jours": 30,
            "message_client": "Merci de votre confiance"
        }
        
        response = self.run_test(
            "Create Devis",
            "POST",
            "devis",
            200,
            data=devis_data
        )
        
        if response and 'id' in response:
            self.devis_id = response['id']
            return True
        return False

    def test_list_devis(self):
        """Test list devis"""
        response = self.run_test(
            "List Devis",
            "GET",
            "devis",
            200
        )
        return isinstance(response, list)

    def test_get_devis(self):
        """Test get specific devis"""
        if not self.devis_id:
            self.log_test("Get Devis", False, "No devis ID available")
            return False
            
        response = self.run_test(
            "Get Devis",
            "GET",
            f"devis/{self.devis_id}",
            200
        )
        return bool(response)

    def test_send_devis(self):
        """Test send devis"""
        if not self.devis_id:
            self.log_test("Send Devis", False, "No devis ID available")
            return False
            
        response = self.run_test(
            "Send Devis",
            "POST",
            f"devis/{self.devis_id}/send",
            200
        )
        return bool(response)

    def test_sign_devis(self):
        """Test sign devis"""
        if not self.devis_id:
            self.log_test("Sign Devis", False, "No devis ID available")
            return False
            
        # Use query parameters for signature
        url = f"{self.base_url}/api/devis/{self.devis_id}/sign?signature=test_signature&nom_signataire=Test User"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.post(url, headers=headers)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if not success and response.text:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', response.text[:100])}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Sign Devis", success, details)
            return success
            
        except Exception as e:
            self.log_test("Sign Devis", False, f"Exception: {str(e)}")
            return False

    def test_create_facture_from_devis(self):
        """Test create facture from devis"""
        if not self.devis_id:
            self.log_test("Create Facture from Devis", False, "No devis ID available")
            return False
            
        facture_data = {
            "devis_id": self.devis_id
        }
        
        response = self.run_test(
            "Create Facture from Devis",
            "POST",
            "factures/from-devis",
            200,
            data=facture_data
        )
        
        if response and 'id' in response:
            self.facture_id = response['id']
            return True
        return False

    def test_list_factures(self):
        """Test list factures"""
        response = self.run_test(
            "List Factures",
            "GET",
            "factures",
            200
        )
        return isinstance(response, list)

    def test_portal_devis(self):
        """Test client portal devis access"""
        if not self.devis_id:
            self.log_test("Portal Devis Access", False, "No devis ID available")
            return False
            
        # First get the devis to get the token
        devis_response = self.run_test(
            "Get Devis for Portal Token",
            "GET",
            f"devis/{self.devis_id}",
            200
        )
        
        if not devis_response or 'token_client' not in devis_response:
            self.log_test("Portal Devis Access", False, "No client token available")
            return False
            
        token_client = devis_response['token_client']
        
        # Test portal access without authentication
        url = f"{self.base_url}/api/portal/devis/{token_client}"
        
        try:
            response = requests.get(url)  # No auth headers for portal
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if not success and response.text:
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', response.text[:100])}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_test("Portal Devis Access", success, details)
            return success
            
        except Exception as e:
            self.log_test("Portal Devis Access", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print(f"🚀 Starting FieldCommand API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 50)
        
        # Try login first, if fails try register
        if not self.test_login():
            print("Login failed, trying registration...")
            if not self.test_register():
                print("❌ Both login and registration failed. Cannot continue.")
                return False
        
        # Authentication tests
        self.test_get_me()
        
        # Dashboard tests
        self.test_dashboard_stats()
        self.test_dashboard_alerts()
        
        # Client tests
        if self.test_create_client():
            self.test_list_clients()
            self.test_get_client()
        
        # Intervention tests
        if self.test_create_intervention():
            self.test_list_interventions()
        
        # Devis tests
        if self.test_create_devis():
            self.test_list_devis()
            self.test_get_devis()
            self.test_send_devis()
            self.test_sign_devis()
            
            # Portal tests
            self.test_portal_devis()
            
            # Facture tests
            if self.test_create_facture_from_devis():
                self.test_list_factures()
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print(f"📊 Test Summary")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {self.tests_run - self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r['success']]
        if failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = FieldCommandAPITester()
    
    try:
        tester.run_all_tests()
        success = tester.print_summary()
        return 0 if success else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())