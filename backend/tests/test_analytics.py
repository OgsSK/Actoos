"""
Test Analytics Endpoints for Actoos
Tests revenue, interventions, technicians, clients, devis analytics and trends
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from previous iterations
ADMIN_EMAIL = "admin@testplomberie.fr"
ADMIN_PASSWORD = "password123"


class TestAnalyticsEndpoints:
    """Test all analytics API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Admin login failed: {login_response.status_code} - {login_response.text}")
        
        token = login_response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.admin_token = token
    
    # ==================== Revenue Analytics ====================
    def test_revenue_analytics_default_period(self):
        """Test GET /api/analytics/revenue with default period (month)"""
        response = self.session.get(f"{BASE_URL}/api/analytics/revenue")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "period" in data, "Missing 'period' field"
        assert data["period"] == "month", f"Expected period 'month', got '{data['period']}'"
        assert "current_revenue" in data, "Missing 'current_revenue' field"
        assert "growth_percent" in data, "Missing 'growth_percent' field"
        assert "pending_amount" in data, "Missing 'pending_amount' field"
        assert "pending_count" in data, "Missing 'pending_count' field"
        assert "overdue_amount" in data, "Missing 'overdue_amount' field"
        assert "overdue_count" in data, "Missing 'overdue_count' field"
        
        # Verify data types
        assert isinstance(data["current_revenue"], (int, float)), "current_revenue should be numeric"
        assert isinstance(data["growth_percent"], (int, float)), "growth_percent should be numeric"
        print(f"Revenue analytics: {data['current_revenue']}€, growth: {data['growth_percent']}%")
    
    def test_revenue_analytics_week_period(self):
        """Test GET /api/analytics/revenue with week period"""
        response = self.session.get(f"{BASE_URL}/api/analytics/revenue", params={"period": "week"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "week"
        print(f"Week revenue: {data['current_revenue']}€")
    
    def test_revenue_analytics_quarter_period(self):
        """Test GET /api/analytics/revenue with quarter period"""
        response = self.session.get(f"{BASE_URL}/api/analytics/revenue", params={"period": "quarter"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "quarter"
        print(f"Quarter revenue: {data['current_revenue']}€")
    
    def test_revenue_analytics_year_period(self):
        """Test GET /api/analytics/revenue with year period"""
        response = self.session.get(f"{BASE_URL}/api/analytics/revenue", params={"period": "year"})
        
        assert response.status_code == 200
        data = response.json()
        assert data["period"] == "year"
        print(f"Year revenue: {data['current_revenue']}€")
    
    # ==================== Intervention Analytics ====================
    def test_intervention_analytics(self):
        """Test GET /api/analytics/interventions"""
        response = self.session.get(f"{BASE_URL}/api/analytics/interventions")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "period" in data
        assert "total" in data, "Missing 'total' field"
        assert "completed" in data, "Missing 'completed' field"
        assert "in_progress" in data, "Missing 'in_progress' field"
        assert "planned" in data, "Missing 'planned' field"
        assert "cancelled" in data, "Missing 'cancelled' field"
        assert "completion_rate" in data, "Missing 'completion_rate' field"
        assert "by_status" in data, "Missing 'by_status' field"
        assert "by_priority" in data, "Missing 'by_priority' field"
        
        # Verify data types
        assert isinstance(data["total"], int), "total should be integer"
        assert isinstance(data["completion_rate"], (int, float)), "completion_rate should be numeric"
        assert isinstance(data["by_status"], dict), "by_status should be dict"
        
        print(f"Interventions: {data['total']} total, {data['completed']} completed, {data['completion_rate']}% rate")
    
    def test_intervention_analytics_by_period(self):
        """Test intervention analytics with different periods"""
        for period in ["week", "month", "quarter", "year"]:
            response = self.session.get(f"{BASE_URL}/api/analytics/interventions", params={"period": period})
            assert response.status_code == 200, f"Failed for period {period}"
            data = response.json()
            assert data["period"] == period
    
    # ==================== Technician Performance ====================
    def test_technician_performance(self):
        """Test GET /api/analytics/technicians"""
        response = self.session.get(f"{BASE_URL}/api/analytics/technicians")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should be a list of technicians
        assert isinstance(data, list), "Response should be a list"
        
        # If there are technicians, verify structure
        if len(data) > 0:
            tech = data[0]
            assert "technician_id" in tech, "Missing 'technician_id' field"
            assert "name" in tech, "Missing 'name' field"
            assert "interventions_completed" in tech, "Missing 'interventions_completed' field"
            assert "interventions_assigned" in tech, "Missing 'interventions_assigned' field"
            assert "completion_rate" in tech, "Missing 'completion_rate' field"
            
            print(f"Top technician: {tech['name']} - {tech['interventions_completed']} completed, {tech['completion_rate']}% rate")
        else:
            print("No technicians found (expected if no tech users exist)")
    
    # ==================== Client Analytics ====================
    def test_client_analytics(self):
        """Test GET /api/analytics/clients"""
        response = self.session.get(f"{BASE_URL}/api/analytics/clients")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "period" in data
        assert "total_clients" in data, "Missing 'total_clients' field"
        assert "new_clients" in data, "Missing 'new_clients' field"
        assert "top_clients" in data, "Missing 'top_clients' field"
        assert "by_type" in data, "Missing 'by_type' field"
        
        # Verify data types
        assert isinstance(data["total_clients"], int), "total_clients should be integer"
        assert isinstance(data["new_clients"], int), "new_clients should be integer"
        assert isinstance(data["top_clients"], list), "top_clients should be list"
        assert isinstance(data["by_type"], dict), "by_type should be dict"
        
        # Verify top_clients structure if any exist
        if len(data["top_clients"]) > 0:
            client = data["top_clients"][0]
            assert "client_id" in client, "Missing 'client_id' in top_clients"
            assert "name" in client, "Missing 'name' in top_clients"
            assert "total_revenue" in client, "Missing 'total_revenue' in top_clients"
            assert "invoice_count" in client, "Missing 'invoice_count' in top_clients"
            print(f"Top client: {client['name']} - {client['total_revenue']}€")
        
        print(f"Clients: {data['total_clients']} total, {data['new_clients']} new this period")
    
    # ==================== Devis Analytics ====================
    def test_devis_analytics(self):
        """Test GET /api/analytics/devis"""
        response = self.session.get(f"{BASE_URL}/api/analytics/devis")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "period" in data
        assert "total_count" in data, "Missing 'total_count' field"
        assert "total_amount" in data, "Missing 'total_amount' field"
        assert "signed_count" in data, "Missing 'signed_count' field"
        assert "signed_amount" in data, "Missing 'signed_amount' field"
        assert "conversion_rate" in data, "Missing 'conversion_rate' field"
        assert "by_status" in data, "Missing 'by_status' field"
        
        # Verify data types
        assert isinstance(data["total_count"], int), "total_count should be integer"
        assert isinstance(data["conversion_rate"], (int, float)), "conversion_rate should be numeric"
        
        print(f"Devis: {data['total_count']} total, {data['signed_count']} signed, {data['conversion_rate']}% conversion")
    
    # ==================== Trends ====================
    def test_trends_revenue(self):
        """Test GET /api/analytics/trends with revenue metric"""
        response = self.session.get(f"{BASE_URL}/api/analytics/trends", params={"metric": "revenue", "days": 30})
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Response should be a list of daily data points
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 30, f"Expected 30 days of data, got {len(data)}"
        
        # Verify structure of each data point
        if len(data) > 0:
            point = data[0]
            assert "date" in point, "Missing 'date' field"
            assert "label" in point, "Missing 'label' field"
            assert "value" in point, "Missing 'value' field"
            
            # Verify date format (YYYY-MM-DD)
            assert len(point["date"]) == 10, f"Invalid date format: {point['date']}"
        
        print(f"Trends: {len(data)} data points, latest value: {data[-1]['value'] if data else 'N/A'}")
    
    def test_trends_interventions(self):
        """Test GET /api/analytics/trends with interventions metric"""
        response = self.session.get(f"{BASE_URL}/api/analytics/trends", params={"metric": "interventions", "days": 30})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 30
    
    def test_trends_devis(self):
        """Test GET /api/analytics/trends with devis metric"""
        response = self.session.get(f"{BASE_URL}/api/analytics/trends", params={"metric": "devis", "days": 30})
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 30
    
    def test_trends_invalid_metric(self):
        """Test GET /api/analytics/trends with invalid metric returns 400"""
        response = self.session.get(f"{BASE_URL}/api/analytics/trends", params={"metric": "invalid"})
        
        assert response.status_code == 400, f"Expected 400 for invalid metric, got {response.status_code}"
    
    def test_trends_custom_days(self):
        """Test GET /api/analytics/trends with custom days parameter"""
        response = self.session.get(f"{BASE_URL}/api/analytics/trends", params={"metric": "revenue", "days": 7})
        
        assert response.status_code == 200
        data = response.json()
        # Days outside 7-365 range should default to 30
        assert len(data) == 7, f"Expected 7 days, got {len(data)}"
    
    # ==================== Summary ====================
    def test_analytics_summary(self):
        """Test GET /api/analytics/summary - comprehensive summary"""
        response = self.session.get(f"{BASE_URL}/api/analytics/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify response structure
        assert "period" in data
        assert "revenue" in data, "Missing 'revenue' section"
        assert "interventions" in data, "Missing 'interventions' section"
        assert "clients" in data, "Missing 'clients' section"
        assert "devis" in data, "Missing 'devis' section"
        
        # Verify each section has expected fields
        assert "current_revenue" in data["revenue"], "Missing current_revenue in revenue section"
        assert "total" in data["interventions"], "Missing total in interventions section"
        assert "total_clients" in data["clients"], "Missing total_clients in clients section"
        assert "total_count" in data["devis"], "Missing total_count in devis section"
        
        print(f"Summary: Revenue={data['revenue']['current_revenue']}€, Interventions={data['interventions']['total']}, Clients={data['clients']['total_clients']}, Devis={data['devis']['total_count']}")
    
    def test_analytics_summary_with_period(self):
        """Test GET /api/analytics/summary with different periods"""
        for period in ["week", "month", "quarter", "year"]:
            response = self.session.get(f"{BASE_URL}/api/analytics/summary", params={"period": period})
            assert response.status_code == 200, f"Failed for period {period}"
            data = response.json()
            assert data["period"] == period


class TestAnalyticsAuthorization:
    """Test that analytics endpoints are admin-only"""
    
    def test_analytics_requires_auth(self):
        """Test that analytics endpoints require authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        endpoints = [
            "/api/analytics/revenue",
            "/api/analytics/interventions",
            "/api/analytics/technicians",
            "/api/analytics/clients",
            "/api/analytics/devis",
            "/api/analytics/trends",
            "/api/analytics/summary"
        ]
        
        for endpoint in endpoints:
            response = session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"Expected 401/403 for {endpoint} without auth, got {response.status_code}"
        
        print("All analytics endpoints correctly require authentication")
    
    def test_analytics_admin_only(self):
        """Test that analytics endpoints are admin-only (tech users should get 403)"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login as tech user
        tech_login = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "tech@testplomberie.fr",
            "password": "technicien123"
        })
        
        if tech_login.status_code != 200:
            pytest.skip("Tech user login failed - skipping admin-only test")
        
        token = tech_login.json().get("access_token")
        session.headers.update({"Authorization": f"Bearer {token}"})
        
        endpoints = [
            "/api/analytics/revenue",
            "/api/analytics/interventions",
            "/api/analytics/technicians",
            "/api/analytics/clients",
            "/api/analytics/devis",
            "/api/analytics/trends",
            "/api/analytics/summary"
        ]
        
        for endpoint in endpoints:
            response = session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 403, f"Expected 403 for tech user on {endpoint}, got {response.status_code}"
        
        print("All analytics endpoints correctly restricted to admin only")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
