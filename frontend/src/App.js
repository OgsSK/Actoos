import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Auth Pages
import { LoginPage, RegisterPage, ActivatePage } from "./pages/AuthPages";

// Dashboard Pages
import { DashboardLayout, DashboardOverview } from "./pages/Dashboard";
import { ClientsList, ClientForm, ClientDetail } from "./pages/Clients";
import { InterventionsList, InterventionForm, InterventionDetail } from "./pages/Interventions";
import { DevisList, DevisForm, DevisDetail } from "./pages/Devis";
import { FacturesList, FactureDetail } from "./pages/Factures";
import { TechniciensList } from "./pages/Techniciens";
import { SettingsPage } from "./pages/Settings";
import { PlanningPage } from "./pages/Planning";

// Technician App
import { TechnicianApp } from "./pages/TechnicianApp";

// Client Portal
import { ClientPortalDevis } from "./pages/ClientPortal";

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Dashboard Routes Wrapper
const DashboardRoutes = () => {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </ProtectedRoute>
  );
};

// Home Redirect
const HomeRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Redirect technicians to tech app, admins to dashboard
    if (user?.role === 'tech') {
      return <Navigate to="/tech" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Home */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/activate" element={<ActivatePage />} />

          {/* Client Portal (Public) */}
          <Route path="/portal/devis/:token" element={<ClientPortalDevis />} />

          {/* Technician App */}
          <Route path="/tech" element={
            <ProtectedRoute>
              <TechnicianApp />
            </ProtectedRoute>
          } />

          {/* Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardRoutes />}>
            <Route index element={<DashboardOverview />} />
            
            {/* Clients */}
            <Route path="clients" element={<ClientsList />} />
            <Route path="clients/new" element={<ClientForm />} />
            <Route path="clients/:id" element={<ClientDetail />} />
            <Route path="clients/:id/edit" element={<ClientForm />} />
            
            {/* Interventions */}
            <Route path="interventions" element={<InterventionsList />} />
            <Route path="interventions/new" element={<InterventionForm />} />
            <Route path="interventions/:id" element={<InterventionDetail />} />
            <Route path="interventions/:id/edit" element={<InterventionForm />} />
            
            {/* Devis */}
            <Route path="devis" element={<DevisList />} />
            <Route path="devis/new" element={<DevisForm />} />
            <Route path="devis/:id" element={<DevisDetail />} />
            <Route path="devis/:id/edit" element={<DevisForm />} />
            
            {/* Factures */}
            <Route path="factures" element={<FacturesList />} />
            <Route path="factures/:id" element={<FactureDetail />} />
            
            {/* Techniciens */}
            <Route path="techniciens" element={<TechniciensList />} />
            
            {/* Planning */}
            <Route path="planning" element={<PlanningPage />} />
            
            {/* Settings */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
