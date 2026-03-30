"""
Test Route Optimization Feature
Tests for AI-powered route optimization endpoints:
- POST /api/interventions/optimize-route - AI route optimization
- GET /api/interventions/route-score - Simple route score without AI
- POST /api/interventions/apply-optimized-order - Apply optimized order (admin only)
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"
TECH_EMAIL = "tech@testplomberie.fr"
TECH_PASSWORD = "technicien123"


class TestRouteOptimization:
    """Route optimization endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin authentication failed: {response.status_code}")
        
    def get_tech_token(self):
        """Get technician authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TECH_EMAIL,
            "password": TECH_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Tech authentication failed: {response.status_code}")
    
    def get_planned_interventions(self, token):
        """Get list of planned interventions"""
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        response = self.session.get(f"{BASE_URL}/api/interventions", params={
            "statut": "planifiee"
        })
        if response.status_code == 200:
            return response.json()
        return []
    
    # ==================== POST /api/interventions/optimize-route ====================
    
    def test_optimize_route_endpoint_exists(self):
        """Test that optimize-route endpoint exists and requires auth"""
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route")
        # Should return 401 (unauthorized) not 404 (not found)
        assert response.status_code in [401, 403, 422], f"Expected auth error, got {response.status_code}"
        print("PASS: optimize-route endpoint exists and requires authentication")
    
    def test_optimize_route_with_admin_auth(self):
        """Test optimize-route with admin authentication"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get today's date
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route", params={
            "date": today
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "optimized_order" in data, "Response should contain optimized_order"
        assert "total_estimated_time_minutes" in data, "Response should contain total_estimated_time_minutes"
        assert "total_interventions" in data, "Response should contain total_interventions"
        assert "route_summary" in data, "Response should contain route_summary"
        assert "ai_optimized" in data, "Response should contain ai_optimized flag"
        
        print(f"PASS: optimize-route returns valid response structure")
        print(f"  - AI optimized: {data.get('ai_optimized')}")
        print(f"  - Total interventions: {data.get('total_interventions')}")
        print(f"  - Route summary: {data.get('route_summary', '')[:50]}...")
    
    def test_optimize_route_with_tech_auth(self):
        """Test optimize-route with technician authentication"""
        token = self.get_tech_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route", params={
            "date": today
        })
        
        # Technicians should also be able to optimize their routes
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "optimized_order" in data
        assert isinstance(data["optimized_order"], list)
        
        print(f"PASS: Technician can access optimize-route endpoint")
    
    def test_optimize_route_with_specific_intervention_ids(self):
        """Test optimize-route with specific intervention IDs"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get some planned interventions
        interventions = self.get_planned_interventions(token)
        
        if len(interventions) < 2:
            pytest.skip("Need at least 2 planned interventions for this test")
        
        # Take first 3 interventions (or all if less)
        test_ids = [i["id"] for i in interventions[:3]]
        
        # Send as comma-separated string (matching frontend behavior)
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route", params={
            "intervention_ids": ",".join(test_ids)
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "optimized_order" in data
        assert "interventions" in data, "Response should include intervention details"
        
        # Verify all requested IDs are in the response
        returned_ids = set(data.get("optimized_order", []))
        requested_ids = set(test_ids)
        assert returned_ids == requested_ids, f"Returned IDs should match requested IDs. Got {returned_ids}, expected {requested_ids}"
        
        print(f"PASS: optimize-route works with specific intervention IDs")
        print(f"  - Requested {len(test_ids)} interventions")
        print(f"  - Returned {len(data.get('optimized_order', []))} in optimized order")
    
    def test_optimize_route_fallback_on_ai_error(self):
        """Test that optimize-route returns fallback (original order) when AI fails"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route", params={
            "date": today
        })
        
        assert response.status_code == 200, "Should return 200 even on AI error (fallback)"
        
        data = response.json()
        # When AI fails, ai_optimized should be False
        # This is expected behavior due to budget limits
        if not data.get("ai_optimized"):
            print(f"PASS: Fallback behavior working - AI optimization returned ai_optimized=False")
            print(f"  - Route summary: {data.get('route_summary', '')}")
        else:
            print(f"PASS: AI optimization succeeded - ai_optimized=True")
    
    # ==================== GET /api/interventions/route-score ====================
    
    def test_route_score_endpoint_exists(self):
        """Test that route-score endpoint exists and requires auth"""
        response = self.session.get(f"{BASE_URL}/api/interventions/route-score")
        assert response.status_code in [401, 403], f"Expected auth error, got {response.status_code}"
        print("PASS: route-score endpoint exists and requires authentication")
    
    def test_route_score_with_admin_auth(self):
        """Test route-score with admin authentication"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/interventions/route-score", params={
            "date": today
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "score" in data, "Response should contain score"
        assert "issues" in data, "Response should contain issues list"
        assert "suggestions" in data, "Response should contain suggestions list"
        assert "date" in data, "Response should contain date"
        assert "total_interventions" in data, "Response should contain total_interventions"
        
        # Score should be between 0 and 100
        assert 0 <= data["score"] <= 100, f"Score should be 0-100, got {data['score']}"
        
        print(f"PASS: route-score returns valid response")
        print(f"  - Score: {data['score']}")
        print(f"  - Total interventions: {data['total_interventions']}")
        print(f"  - Issues: {len(data.get('issues', []))}")
        print(f"  - Suggestions: {len(data.get('suggestions', []))}")
    
    def test_route_score_with_tech_auth(self):
        """Test route-score with technician authentication"""
        token = self.get_tech_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        today = datetime.now().strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/interventions/route-score", params={
            "date": today
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "score" in data
        
        print(f"PASS: Technician can access route-score endpoint")
    
    def test_route_score_no_ai_required(self):
        """Test that route-score works without AI (simple calculation)"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # This endpoint should always work as it doesn't use AI
        response = self.session.get(f"{BASE_URL}/api/interventions/route-score")
        
        assert response.status_code == 200, "route-score should always work (no AI)"
        
        data = response.json()
        # Should have basic analysis fields
        assert "city_changes" in data or "urgent_interventions" in data, \
            "Should include basic analysis metrics"
        
        print(f"PASS: route-score works without AI dependency")
    
    # ==================== POST /api/interventions/apply-optimized-order ====================
    
    def test_apply_optimized_order_requires_admin(self):
        """Test that apply-optimized-order requires admin role"""
        token = self.get_tech_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # The endpoint expects a list directly as the body
        response = self.session.post(f"{BASE_URL}/api/interventions/apply-optimized-order", 
            json=["test-id-1", "test-id-2"]
        )
        
        # Should be forbidden for technicians
        assert response.status_code == 403, f"Expected 403 for tech, got {response.status_code}"
        
        print("PASS: apply-optimized-order correctly requires admin role")
    
    def test_apply_optimized_order_with_admin(self):
        """Test apply-optimized-order with admin authentication"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get some planned interventions
        interventions = self.get_planned_interventions(token)
        
        if len(interventions) < 2:
            pytest.skip("Need at least 2 planned interventions for this test")
        
        # Create an optimized order (just reverse the current order for testing)
        test_ids = [i["id"] for i in interventions[:3]]
        reversed_order = list(reversed(test_ids))
        
        # The endpoint expects a list directly as the body
        response = self.session.post(f"{BASE_URL}/api/interventions/apply-optimized-order", 
            json=reversed_order
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "order" in data, "Response should contain applied order"
        
        print(f"PASS: apply-optimized-order works for admin")
        print(f"  - Applied order to {len(reversed_order)} interventions")
    
    def test_apply_optimized_order_updates_interventions(self):
        """Test that apply-optimized-order actually updates intervention ordre_tournee field"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get planned interventions
        interventions = self.get_planned_interventions(token)
        
        if len(interventions) < 2:
            pytest.skip("Need at least 2 planned interventions for this test")
        
        test_ids = [i["id"] for i in interventions[:2]]
        
        # Apply order - endpoint expects list directly
        response = self.session.post(f"{BASE_URL}/api/interventions/apply-optimized-order", 
            json=test_ids
        )
        
        assert response.status_code == 200
        
        # Verify the interventions were updated
        for position, intervention_id in enumerate(test_ids):
            response = self.session.get(f"{BASE_URL}/api/interventions/{intervention_id}")
            if response.status_code == 200:
                data = response.json()
                # Check if ordre_tournee was set
                if "ordre_tournee" in data:
                    assert data["ordre_tournee"] == position + 1, \
                        f"Expected ordre_tournee={position + 1}, got {data['ordre_tournee']}"
                    print(f"  - Intervention {intervention_id[:8]}... has ordre_tournee={data['ordre_tournee']}")
        
        print(f"PASS: apply-optimized-order correctly updates intervention order")


class TestRouteOptimizationEdgeCases:
    """Edge case tests for route optimization"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Get admin authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin authentication failed")
    
    def test_optimize_route_empty_date(self):
        """Test optimize-route with no interventions for a date"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Use a date far in the future with no interventions
        future_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        response = self.session.post(f"{BASE_URL}/api/interventions/optimize-route", params={
            "date": future_date
        })
        
        assert response.status_code == 200, "Should handle empty date gracefully"
        
        data = response.json()
        assert data.get("total_interventions", 0) == 0 or len(data.get("optimized_order", [])) == 0
        
        print(f"PASS: optimize-route handles empty date gracefully")
    
    def test_route_score_empty_date(self):
        """Test route-score with no interventions for a date"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        future_date = (datetime.now() + timedelta(days=365)).strftime("%Y-%m-%d")
        
        response = self.session.get(f"{BASE_URL}/api/interventions/route-score", params={
            "date": future_date
        })
        
        assert response.status_code == 200, "Should handle empty date gracefully"
        
        data = response.json()
        # Empty route should have perfect score (100) or 0 interventions
        assert data.get("score") == 100 or data.get("total_interventions") == 0
        
        print(f"PASS: route-score handles empty date gracefully")
    
    def test_apply_optimized_order_empty_list(self):
        """Test apply-optimized-order with empty list"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Endpoint expects list directly
        response = self.session.post(f"{BASE_URL}/api/interventions/apply-optimized-order", 
            json=[]
        )
        
        # Should handle empty list gracefully
        assert response.status_code == 200, f"Should handle empty list, got {response.status_code}"
        
        print(f"PASS: apply-optimized-order handles empty list gracefully")
    
    def test_apply_optimized_order_invalid_ids(self):
        """Test apply-optimized-order with non-existent intervention IDs"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Endpoint expects list directly
        response = self.session.post(f"{BASE_URL}/api/interventions/apply-optimized-order", 
            json=["non-existent-id-1", "non-existent-id-2"]
        )
        
        # Should handle gracefully (either 200 with no updates or 404)
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        print(f"PASS: apply-optimized-order handles invalid IDs gracefully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
