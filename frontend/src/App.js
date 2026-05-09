import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { DemoProvider } from "./contexts/DemoContext";
import { Toaster } from "./components/ui/sonner";
import useManifestSwitcher from "./hooks/useManifestSwitcher";
import CookieConsent from "./components/CookieConsent";

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

// Manifest switcher component
const ManifestSwitcher = () => {
  useManifestSwitcher();
  return null;
};

// Auth Pages
import { LoginPage, RegisterPage, ActivatePage, ForgotPasswordPage, ResetPasswordPage } from "./pages/AuthPages";

// Dashboard Pages
import { DashboardLayout, DashboardOverview } from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import { ClientsList, ClientForm, ClientDetail } from "./pages/Clients";
import { InterventionsList, InterventionForm, InterventionDetail } from "./pages/Interventions";
import { DevisList, DevisForm, DevisDetail } from "./pages/Devis";
import { FacturesList, FactureDetail, FactureForm } from "./pages/Factures";
import { TechniciensList } from "./pages/Techniciens";
import { SettingsPage } from "./pages/Settings";
import { PlanningPage } from "./pages/Planning";
import { RapportsPage } from "./pages/Rapports";
import Analytics from "./pages/Analytics";
import Statements from "./pages/Statements";
import APISettings from "./pages/APISettings";

// Technician App
import { TechnicianApp } from "./pages/TechnicianApp";

// Client Portal
import { ClientPortalDevis, ClientPortalDashboard } from "./pages/ClientPortal";

// Marketing Pages (Site de vente)
import { SignupSuccessPage } from "./pages/Pricing";
import PricingPage from "./pages/PricingPage";
import SignupPage from "./pages/SignupPage";
import LandingPage from "./pages/LandingPage";
import FeaturesPage from "./pages/FeaturesPage";
import SectorsPage from "./pages/SectorsPage";
import DemoPage from "./pages/DemoPage";

// Legal Pages
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import CookiesPage from "./pages/CookiesPage";
import LegalPage from "./pages/LegalPage";

// Corporate Vitrine
import CorporatePage from "./pages/CorporatePage";

// Data Import
import DataImport from "./pages/DataImport";

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

// Technician Route - Redirects admins to dashboard
const TechnicianRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

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

  // Allow techs and admins to access technician app
  // Admins can use it for testing/demo purposes
  return children;
};

// Admin Route - Redirects techs to /tech
const AdminRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();

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

  // If user is tech, redirect to tech app
  if (user?.role === 'tech') {
    return <Navigate to="/tech" replace />;
  }

  return children;
};

// Dashboard Routes Wrapper - Only for admins
const DashboardRoutes = () => {
  return (
    <AdminRoute>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </AdminRoute>
  );
};

// Home Redirect - Smart routing based on context
const HomeRedirect = () => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  // If authenticated, redirect to appropriate dashboard
  if (isAuthenticated) {
    if (user?.role === 'tech') {
      return <Navigate to="/tech" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Check if app is running as installed PWA (standalone mode)
  const isPWA = window.matchMedia('(display-mode: standalone)').matches 
    || window.navigator.standalone // iOS Safari
    || document.referrer.includes('android-app://'); // Android TWA
  
  // If running as PWA, go directly to login
  if (isPWA) {
    return <Navigate to="/login" replace />;
  }

  // For web browsers, show the landing page (marketing site)
  return <LandingPage />;
};

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <OfflineProvider>
          <DemoProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ManifestSwitcher />
            <Routes>
              {/* Home */}
              <Route path="/" element={<HomeRedirect />} />

            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/activate" element={<ActivatePage />} />

            {/* Pricing and Signup (Public) */}
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/signup/success" element={<SignupSuccessPage />} />
            
            {/* Marketing Pages (Public) */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/sectors" element={<SectorsPage />} />
            <Route path="/demo" element={<DemoPage />} />

            {/* Legal Pages (Public) */}
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/legal" element={<LegalPage />} />

            {/* Corporate Vitrine (actoos.com) */}
            <Route path="/corporate" element={<CorporatePage />} />

            {/* Client Portal (Public) */}
            <Route path="/portal/devis/:token" element={<ClientPortalDevis />} />
            <Route path="/portal/client/:token" element={<ClientPortalDashboard />} />

            {/* Super Admin Dashboard (Platform Owner Only) */}
            <Route path="/super-admin" element={
              <ProtectedRoute>
                <SuperAdminDashboard />
              </ProtectedRoute>
            } />

            {/* Technician App - Only for techs, redirects admins */}
            <Route path="/tech" element={
              <TechnicianRoute>
                <TechnicianApp />
              </TechnicianRoute>
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
              <Route path="factures/new" element={<FactureForm />} />
              <Route path="factures/:id" element={<FactureDetail />} />
              
              {/* Techniciens */}
              <Route path="techniciens" element={<TechniciensList />} />
              
              {/* Planning */}
              <Route path="planning" element={<PlanningPage />} />
              
              {/* Rapports */}
              <Route path="rapports" element={<RapportsPage />} />
              
              {/* Analytics */}
              <Route path="analytics" element={<Analytics />} />
              
              {/* Statements */}
              <Route path="statements" element={<Statements />} />
              
              {/* API Settings */}
              <Route path="api-settings" element={<APISettings />} />
              
              {/* Data Import */}
              <Route path="import" element={<DataImport />} />
              
              {/* Settings */}
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
        <CookieConsent />
        </DemoProvider>
      </OfflineProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
