import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Homepage from './pages/Homepage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
import './index.css';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/connexion" replace />;
  }
  
  return children;
};

const AboutPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">A propos d'Actoos Jobs</h1>
      <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
        <p className="text-slate-600 leading-relaxed">
          Actoos Jobs est la plateforme de recrutement nouvelle generation. Notre mission est de 
          connecter les meilleurs talents avec les entreprises qui recrutent, en simplifiant et modernisant 
          le processus de recherche d'emploi et de recrutement.
        </p>
        <p className="text-slate-600 leading-relaxed">
          Fondee en 2026, notre equipe est composee de professionnels passionnes par l'innovation 
          et le developpement du marche de l'emploi a l'international.
        </p>
        <h2 className="text-xl font-semibold text-slate-900 pt-4">Notre vision</h2>
        <p className="text-slate-600 leading-relaxed">
          Devenir la reference en matiere de recrutement en Afrique francophone, en offrant une experience 
          utilisateur exceptionnelle et des outils innovants pour les candidats et les entreprises.
        </p>
      </div>
    </div>
  </div>
);

const NotFoundPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-slate-300">404</h1>
      <p className="text-xl text-slate-600 mt-4">Page non trouvée</p>
    </div>
  </div>
);

// Main App with Auth
const AppContent = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <Header user={user} onLogout={signOut} />
      
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/emplois" element={<JobsPage />} />
          <Route path="/emplois/:id" element={<JobDetailPage />} />
          <Route path="/entreprises" element={<CompaniesPage />} />
          <Route path="/entreprises/inscription" element={<RegisterPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          
          {/* Legal pages */}
          <Route path="/cgu" element={<CGUPage />} />
          <Route path="/confidentialite" element={<PrivacyPolicyPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/a-propos" element={<AboutPage />} />
          
          {/* Auth routes */}
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          
          {/* Protected routes - Candidat */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <CandidateDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/candidat" element={
            <ProtectedRoute>
              <CandidateDashboard />
            </ProtectedRoute>
          } />
          <Route path="/profil" element={
            <ProtectedRoute>
              <CandidateProfilePage />
            </ProtectedRoute>
          } />
          
          {/* Protected routes - Entreprise */}
          <Route path="/dashboard/entreprise" element={
            <ProtectedRoute>
              <CompanyDashboard />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/entreprise/creer" element={
            <ProtectedRoute>
              <CreateCompanyPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/entreprise/offres/nouvelle" element={
            <ProtectedRoute>
              <CreateJobPage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard/entreprise/offres/:id/modifier" element={
            <ProtectedRoute>
              <CreateJobPage />
            </ProtectedRoute>
          } />
          
          {/* Admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          
          {/* Auth callback for OAuth */}
          <Route path="/auth/callback" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Connexion en cours...</p>
              </div>
            </div>
          } />
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <Footer />

      {/* Toast notifications */}
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
