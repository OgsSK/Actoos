import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateProfilePage from './pages/CandidateProfilePage';
import CompanyDashboard from './pages/CompanyDashboard';
import CreateCompanyPage from './pages/CreateCompanyPage';
import CreateJobPage from './pages/CreateJobPage';
import AdminDashboard from './pages/AdminDashboard';
import CGUPage from './pages/CGUPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiesPage from './pages/CookiesPage';
import ContactPage from './pages/ContactPage';
import PricingPage from './pages/PricingPage';
import CompaniesPage from './pages/CompaniesPage';
import BlogPage from './pages/BlogPage';
import BlogArticlePage from './pages/BlogArticlePage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import InterviewPrep from './pages/InterviewPrep';
import CoverLetter from './pages/CoverLetter';
import ScheduleInterview from './pages/ScheduleInterview';
import SettingsPage from './pages/SettingsPage';
import MyApplicationsPage from './pages/MyApplicationsPage';
import SavedJobsPage from './pages/SavedJobsPage';
import JobAlertsPage from './pages/JobAlertsPage';
import CompanyProfilePage from './pages/CompanyProfilePage';
import CompanyJobsPage from './pages/CompanyJobsPage';
import CompanyApplicationsPage from './pages/CompanyApplicationsPage';
import CompanyDetailPage from './pages/CompanyDetailPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import CandidatePublicProfilePage from './pages/CandidatePublicProfilePage';
import ApplicationDetailCandidatePage from './pages/ApplicationDetailCandidatePage';
import NotificationsPage from './pages/NotificationsPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AboutPage from './pages/AboutPage';
import UnsubscribePage from './pages/UnsubscribePage'; // <-- AJOUTÉ
import CookieBanner from './components/CookieBanner';
import { Card, CardContent } from './components/ui/card';
import { Target, Eye, Shield, Zap, Heart, TrendingUp } from 'lucide-react';
import './index.css';
import FAQPage from './pages/FAQPage';
import CompanyTeamPage from './pages/CompanyTeamPage';
// ---------- Scroll to top on route change ----------
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// ---------- Protected Route wrapper ----------
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setForceShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (!user && !loading) {
    return <Navigate to="/connexion" replace />;
  }

  if (loading && !forceShow) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

// ---------- Dashboard router based on role ----------
const DashboardRouter = () => {
  const { isCompany, isCandidate, isAdmin } = useAuth();

  if (isAdmin) return <Navigate to="/admin" replace />;
  if (isCompany) return <Navigate to="/dashboard/entreprise" replace />;
  if (isCandidate) return <Navigate to="/dashboard/candidat" replace />;

  return <Navigate to="/dashboard/candidat" replace />;
};

const NotFoundPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="text-xl text-slate-600 mt-4">Page non trouvée</p>
    </div>
  </div>
);

// ---------- Main App Content ----------
const AppContent = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={signOut} />
      <ScrollToTop />
      <main className="flex-1">
        <Routes>
          {/* ---------- Public routes ---------- */}
          <Route path="/" element={<Homepage />} />
          <Route path="/emplois" element={<JobsPage />} />
          <Route path="/emplois/:id" element={<JobDetailPage />} />
          <Route path="/entreprises" element={<CompaniesPage />} />
          <Route path="/entreprises/inscription" element={<RegisterPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/paiement/succes" element={<PaymentSuccess />} />
          <Route path="/paiement/annule" element={<PaymentCancel />} />
          <Route path="/blog" element={<BlogPage />} />
          <Route path="/blog/:id" element={<BlogArticlePage />} />
          <Route path="/preparation-entretien" element={<InterviewPrep />} />
          <Route path="/lettre-motivation" element={<CoverLetter />} />
          <Route path="/planifier-entretien" element={<ScheduleInterview />} />
          <Route path="/entreprises/:id" element={<CompanyDetailPage />} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/dashboard/entreprise/equipe" element={<ProtectedRoute><CompanyTeamPage /></ProtectedRoute>} />
          {/* ---------- Legal pages ---------- */}
          <Route path="/cgu" element={<CGUPage />} />
          <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/contact" element={<ContactPage />} />

          {/* ---------- Auth routes ---------- */}
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />

          {/* ---------- Unsubscribe page (newsletter) ---------- */}
          <Route path="/desabonnement" element={<UnsubscribePage />} /> {/* <-- AJOUTÉ */}

          {/* ---------- Protected routes - Candidat ---------- */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRouter /></ProtectedRoute>} />
          <Route path="/dashboard/candidat" element={<ProtectedRoute><CandidateDashboard /></ProtectedRoute>} />
          <Route path="/profil" element={<ProtectedRoute><CandidateProfilePage /></ProtectedRoute>} />
          <Route path="/parametres" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/mes-candidatures" element={<ProtectedRoute><MyApplicationsPage /></ProtectedRoute>} />
          <Route path="/mes-candidatures/:id" element={<ProtectedRoute><ApplicationDetailCandidatePage /></ProtectedRoute>} />
          <Route path="/offres-sauvegardees" element={<ProtectedRoute><SavedJobsPage /></ProtectedRoute>} />
          <Route path="/alertes" element={<ProtectedRoute><JobAlertsPage /></ProtectedRoute>} />

          {/* ---------- Protected routes - Entreprise ---------- */}
          <Route path="/dashboard/entreprise" element={<ProtectedRoute><CompanyDashboard /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/creer" element={<ProtectedRoute><CreateCompanyPage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/offres/nouvelle" element={<ProtectedRoute><CreateJobPage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/offres/:id/modifier" element={<ProtectedRoute><CreateJobPage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/profil" element={<ProtectedRoute><CompanyProfilePage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/offres" element={<ProtectedRoute><CompanyJobsPage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/candidatures" element={<ProtectedRoute><CompanyApplicationsPage /></ProtectedRoute>} />
          <Route path="/dashboard/entreprise/candidatures/:id" element={<ProtectedRoute><ApplicationDetailPage /></ProtectedRoute>} />

          {/* ---------- Protected route - Voir profil candidat (recruteur) ---------- */}
          <Route path="/candidat/:id" element={<ProtectedRoute><CandidatePublicProfilePage /></ProtectedRoute>} />

          {/* ---------- Admin routes ---------- */}
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/*" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

          {/* ---------- Auth callback ---------- */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* ---------- 404 ---------- */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <CookieBanner />
      <Footer />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#fff',
            border: 'none',
          },
        }}
      />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;