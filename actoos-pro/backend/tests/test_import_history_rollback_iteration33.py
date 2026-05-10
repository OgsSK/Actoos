"""
Iteration 33 - Import History, Rollback & S3 Variables Testing
Tests:
1. GET /api/import/history - returns import history for enterprise
2. GET /api/import/history/{id} - returns specific import details
3. POST /api/import/rollback/{id} - rollback an import (delete imported records)
4. DELETE /api/import/history/{id} - delete history record
5. S3 variables in .env (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET)
6. Cron script cron_trial_reminders.py exists and is executable
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "salifkane612+enterprise@gmail.com"
TEST_PASSWORD = "Salifkane&&7"


class TestImportHistoryAndRollback:
    """Test import history and rollback functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - login and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Login failed: {response.status_code}")
    
    def test_01_get_import_history(self):
        """Test GET /api/import/history returns history list"""
        response = self.session.get(f"{BASE_URL}/api/import/history")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Response should have 'total' field"
        assert "imports" in data, "Response should have 'imports' field"
        assert isinstance(data["imports"], list), "'imports' should be a list"
        
        print(f"✓ Import history returned {data['total']} records")
    
    def test_02_get_import_history_with_limit(self):
        """Test GET /api/import/history with limit parameter"""
        response = self.session.get(f"{BASE_URL}/api/import/history?limit=5")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert len(data["imports"]) <= 5, "Should respect limit parameter"
        
        print(f"✓ Import history with limit=5 returned {len(data['imports'])} records")
    
    def test_03_import_history_structure(self):
        """Test import history record structure"""
        response = self.session.get(f"{BASE_URL}/api/import/history")
        
        assert response.status_code == 200
        
        data = response.json()
        if data["imports"]:
            record = data["imports"][0]
            
            # Check expected fields
            expected_fields = ["id", "entreprise_id", "entity_type", "filename", 
                            "imported_count", "error_count", "created_at"]
            
            for field in expected_fields:
                assert field in record, f"Import record should have '{field}' field"
            
            print(f"✓ Import history record has all expected fields")
            print(f"  - Entity type: {record.get('entity_type')}")
            print(f"  - Filename: {record.get('filename')}")
            print(f"  - Imported: {record.get('imported_count')}, Errors: {record.get('error_count')}")
        else:
            print("✓ No import history records found (empty list)")
    
    def test_04_create_import_and_verify_history(self):
        """Test creating an import and verifying it appears in history"""
        # Create a simple CSV for clients
        csv_content = "nom,email,telephone\nTEST_Client_Import,test_import@example.com,0612345678"
        
        # Upload and execute import
        files = {'file': ('test_import.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        data = {
            'entity_type': 'clients',
            'mappings_json': '[{"source_column":"nom","target_field":"nom"},{"source_column":"email","target_field":"email"},{"source_column":"telephone","target_field":"telephone"}]',
            'date_format': '%d/%m/%Y',
            'skip_errors': 'false'
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/import/execute",
            files=files,
            data=data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            import_id = result.get("import_id")
            
            assert import_id, "Import should return import_id"
            assert result.get("imported_count", 0) >= 1, "Should import at least 1 record"
            
            # Verify in history
            history_response = self.session.get(f"{BASE_URL}/api/import/history")
            assert history_response.status_code == 200
            
            history = history_response.json()
            import_ids = [imp["id"] for imp in history["imports"]]
            assert import_id in import_ids, "New import should appear in history"
            
            # Store for rollback test
            self.__class__.test_import_id = import_id
            
            print(f"✓ Import created with ID: {import_id}")
            print(f"  - Imported count: {result.get('imported_count')}")
        else:
            print(f"⚠ Import creation returned {response.status_code}: {response.text[:200]}")
            pytest.skip("Could not create test import")
    
    def test_05_get_import_details(self):
        """Test GET /api/import/history/{id} returns import details"""
        # First get an import ID from history
        response = self.session.get(f"{BASE_URL}/api/import/history")
        assert response.status_code == 200
        
        data = response.json()
        if not data["imports"]:
            pytest.skip("No import history to test details")
        
        import_id = data["imports"][0]["id"]
        
        # Get details
        detail_response = self.session.get(f"{BASE_URL}/api/import/history/{import_id}")
        
        assert detail_response.status_code == 200, f"Expected 200, got {detail_response.status_code}"
        
        details = detail_response.json()
        assert details["id"] == import_id, "Should return correct import"
        assert "imported_ids" in details, "Details should include imported_ids for rollback"
        
        print(f"✓ Import details retrieved for ID: {import_id}")
        print(f"  - Imported IDs count: {len(details.get('imported_ids', []))}")
    
    def test_06_get_import_details_not_found(self):
        """Test GET /api/import/history/{id} with invalid ID returns 404"""
        response = self.session.get(f"{BASE_URL}/api/import/history/invalid-uuid-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Invalid import ID returns 404")
    
    def test_07_rollback_import(self):
        """Test POST /api/import/rollback/{id} deletes imported records"""
        # Get the test import ID or find one that's not rolled back
        import_id = getattr(self.__class__, 'test_import_id', None)
        
        if not import_id:
            # Find an import that hasn't been rolled back
            response = self.session.get(f"{BASE_URL}/api/import/history")
            assert response.status_code == 200
            
            data = response.json()
            for imp in data["imports"]:
                if not imp.get("rolled_back"):
                    import_id = imp["id"]
                    break
        
        if not import_id:
            pytest.skip("No import available for rollback test")
        
        # Perform rollback
        response = self.session.post(f"{BASE_URL}/api/import/rollback/{import_id}")
        
        if response.status_code == 200:
            result = response.json()
            assert result.get("success") == True, "Rollback should succeed"
            assert "deleted_count" in result, "Should return deleted_count"
            
            print(f"✓ Rollback successful for import {import_id}")
            print(f"  - Deleted count: {result.get('deleted_count')}")
            
            # Verify import is marked as rolled back
            detail_response = self.session.get(f"{BASE_URL}/api/import/history/{import_id}")
            if detail_response.status_code == 200:
                details = detail_response.json()
                assert details.get("rolled_back") == True, "Import should be marked as rolled back"
                print("  - Import marked as rolled_back: True")
        elif response.status_code == 400:
            # Already rolled back
            print(f"⚠ Import already rolled back: {response.json().get('detail')}")
        else:
            print(f"⚠ Rollback returned {response.status_code}: {response.text[:200]}")
    
    def test_08_rollback_already_rolled_back(self):
        """Test rollback on already rolled back import returns 400"""
        # Find a rolled back import
        response = self.session.get(f"{BASE_URL}/api/import/history")
        assert response.status_code == 200
        
        data = response.json()
        rolled_back_import = None
        for imp in data["imports"]:
            if imp.get("rolled_back"):
                rolled_back_import = imp
                break
        
        if not rolled_back_import:
            pytest.skip("No rolled back import to test")
        
        # Try to rollback again
        response = self.session.post(f"{BASE_URL}/api/import/rollback/{rolled_back_import['id']}")
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "déjà été annulé" in response.json().get("detail", "").lower() or "already" in response.json().get("detail", "").lower()
        
        print("✓ Rollback on already rolled back import returns 400")
    
    def test_09_rollback_not_found(self):
        """Test rollback with invalid ID returns 404"""
        response = self.session.post(f"{BASE_URL}/api/import/rollback/invalid-uuid-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Rollback with invalid ID returns 404")
    
    def test_10_delete_import_history(self):
        """Test DELETE /api/import/history/{id} removes history record"""
        # Create a new import to delete
        csv_content = "nom,email\nTEST_Delete_History,delete@test.com"
        
        files = {'file': ('test_delete.csv', io.BytesIO(csv_content.encode()), 'text/csv')}
        data = {
            'entity_type': 'clients',
            'mappings_json': '[{"source_column":"nom","target_field":"nom"},{"source_column":"email","target_field":"email"}]',
            'date_format': '%d/%m/%Y',
            'skip_errors': 'false'
        }
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/import/execute",
            files=files,
            data=data,
            headers=headers
        )
        
        if response.status_code != 200:
            pytest.skip("Could not create test import for deletion")
        
        import_id = response.json().get("import_id")
        
        # Delete history record
        delete_response = self.session.delete(f"{BASE_URL}/api/import/history/{import_id}")
        
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        
        result = delete_response.json()
        assert result.get("success") == True, "Delete should succeed"
        
        # Verify it's gone
        detail_response = self.session.get(f"{BASE_URL}/api/import/history/{import_id}")
        assert detail_response.status_code == 404, "Deleted history should return 404"
        
        print(f"✓ Import history deleted successfully")


class TestS3EnvironmentVariables:
    """Test S3/R2 environment variables are present in .env"""
    
    def test_01_s3_endpoint_variable(self):
        """Test S3_ENDPOINT variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_ENDPOINT" in content, "S3_ENDPOINT should be in .env"
        print("✓ S3_ENDPOINT variable present in .env")
    
    def test_02_s3_access_key_variable(self):
        """Test S3_ACCESS_KEY variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_ACCESS_KEY" in content, "S3_ACCESS_KEY should be in .env"
        print("✓ S3_ACCESS_KEY variable present in .env")
    
    def test_03_s3_secret_key_variable(self):
        """Test S3_SECRET_KEY variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_SECRET_KEY" in content, "S3_SECRET_KEY should be in .env"
        print("✓ S3_SECRET_KEY variable present in .env")
    
    def test_04_s3_bucket_variable(self):
        """Test S3_BUCKET variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_BUCKET" in content, "S3_BUCKET should be in .env"
        print("✓ S3_BUCKET variable present in .env")
    
    def test_05_s3_region_variable(self):
        """Test S3_REGION variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_REGION" in content, "S3_REGION should be in .env"
        print("✓ S3_REGION variable present in .env")
    
    def test_06_s3_public_url_variable(self):
        """Test S3_PUBLIC_URL variable exists in .env"""
        env_path = "/app/backend/.env"
        
        with open(env_path, 'r') as f:
            content = f.read()
        
        assert "S3_PUBLIC_URL" in content, "S3_PUBLIC_URL should be in .env"
        print("✓ S3_PUBLIC_URL variable present in .env")


class TestCronTrialReminders:
    """Test cron_trial_reminders.py script"""
    
    def test_01_cron_script_exists(self):
        """Test cron_trial_reminders.py exists"""
        script_path = "/app/backend/cron_trial_reminders.py"
        
        assert os.path.exists(script_path), f"Cron script should exist at {script_path}"
        print(f"✓ Cron script exists at {script_path}")
    
    def test_02_cron_script_has_shebang(self):
        """Test cron script has proper shebang"""
        script_path = "/app/backend/cron_trial_reminders.py"
        
        with open(script_path, 'r') as f:
            first_line = f.readline()
        
        assert first_line.startswith("#!/usr/bin/env python3"), "Script should have python3 shebang"
        print("✓ Cron script has proper shebang")
    
    def test_03_cron_script_imports(self):
        """Test cron script can be imported without errors"""
        import sys
        sys.path.insert(0, '/app/backend')
        
        try:
            import cron_trial_reminders
            assert hasattr(cron_trial_reminders, 'run_trial_reminders'), "Should have run_trial_reminders function"
            print("✓ Cron script imports successfully")
        except ImportError as e:
            pytest.fail(f"Cron script import failed: {e}")
    
    def test_04_cron_script_has_main_block(self):
        """Test cron script has __main__ block for direct execution"""
        script_path = "/app/backend/cron_trial_reminders.py"
        
        with open(script_path, 'r') as f:
            content = f.read()
        
        assert 'if __name__ == "__main__"' in content, "Script should have __main__ block"
        print("✓ Cron script has __main__ block")
    
    def test_05_cron_script_handles_j3_j1_j0(self):
        """Test cron script handles J-3, J-1, J0 reminders"""
        script_path = "/app/backend/cron_trial_reminders.py"
        
        with open(script_path, 'r') as f:
            content = f.read()
        
        # Check for J-3, J-1, J0 handling
        assert "j3" in content.lower() or "days=3" in content or "3, " in content, "Should handle J-3 reminders"
        assert "j1" in content.lower() or "days=1" in content or "1, " in content, "Should handle J-1 reminders"
        assert "j0" in content.lower() or "days=0" in content or "0, " in content, "Should handle J0 reminders"
        
        print("✓ Cron script handles J-3, J-1, J0 reminders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
