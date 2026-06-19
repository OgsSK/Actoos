import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { CountriesProvider } from './contexts/CountriesContext'; // ← Ajouté
import Header from './components/Header';
import Footer from './components/Footer';
import GeoBanner from './components/GeoBanner';
import CookieBanner from './components/CookieBanner';
import { Card, CardContent } from './components/ui/card';
import { Target, Eye, Shield, Zap, Heart, TrendingUp, Loader2 } from 'lucide-react';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import './index.css';

// ---------- Lazy-loaded pages ----------
const Homepage = lazy(() => import('./pages/Homepage'));
const JobsPage = lazy(() => import('./pages/JobsPage'));
const JobDetailPage = lazy(() => import('./pages/JobDetailPage'));
const CompaniesPage = lazy(() => import('./pages/CompaniesPage'));
const CompanyDetailPage = lazy(() => import('./pages/CompanyDetailPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const BlogPage = lazy(() => import('./pages/BlogPage'));
const BlogArticlePage = lazy(() => import('./pages/BlogArticlePage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CandidateDashboard = lazy(() => import('./pages/CandidateDashboard'));
const CandidateProfilePage = lazy(() => import('./pages/CandidateProfilePage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MyApplicationsPage = lazy(() => import('./pages/MyApplicationsPage'));
const ApplicationDetailCandidatePage = lazy(() => import('./pages/ApplicationDetailCandidatePage'));
const SavedJobsPage = lazy(() => import('./pages/SavedJobsPage'));
const JobAlertsPage = lazy(() => import('./pages/JobAlertsPage'));
const CompanyDashboard = lazy(() => import('./pages/CompanyDashboard'));
const CreateCompanyPage = lazy(() => import('./pages/CreateCompanyPage'));
const CreateJobPage = lazy(() => import('./pages/CreateJobPage'));
const CompanyProfilePage = lazy(() => import('./pages/CompanyProfilePage'));
const CompanyJobsPage = lazy(() => import('./pages/CompanyJobsPage'));
const CompanyApplicationsPage = lazy(() => import('./pages/CompanyApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('./pages/ApplicationDetailPage'));
const CandidatePublicProfilePage = lazy(() => import('./pages/CandidatePublicProfilePage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const InterviewPrep = lazy(() => import('./pages/InterviewPrep'));
const CoverLetter = lazy(() => import('./pages/CoverLetter'));
const ScheduleInterview = lazy(() => import('./pages/ScheduleInterview'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const CGUPage = lazy(() => import('./pages/CGUPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const CookiesPage = lazy(() => import('./pages/CookiesPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const UnsubscribePage = lazy(() => import('./pages/UnsubscribePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
// const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage')); // ← Désactivé temporairement

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
        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          }
        >
          <Routes>
            {/* ---------- Public routes ---------- */}
            <Route path="/" element={<Homepage />} />
            <Route path="/emplois" element={<JobsPage />} />
            <Route path="/emplois/:id" element={<JobDetailPage />} />
            <Route path="/entreprises" element={<CompaniesPage />} />
            <Route path="/entreprises/inscription" element={<RegisterPage />} />
            <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
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

            {/* ---------- Legal pages ---------- */}
            <Route path="/cgu" element={<CGUPage />} />
            <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
            <Route path="/cookies" element={<CookiesPage />} />
            <Route path="/contact" element={<ContactPage />} />

            {/* ---------- Auth routes ---------- */}
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/inscription" element={<RegisterPage />} />

            {/* ---------- Unsubscribe page (newsletter) ---------- */}
            <Route path="/desabonnement" element={<UnsubscribePage />} />

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
        </Suspense>
      </main>
      <GeoBanner />
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
    <I18nextProvider i18n={i18n}>
      <Router>
        <AuthProvider>
          <PreferencesProvider>
            <CountriesProvider>   {/* ← Nouveau provider */}
              <AppContent />
            </CountriesProvider>
          </PreferencesProvider>
        </AuthProvider>
      </Router>
    </I18nextProvider>
  );
}

export default App;