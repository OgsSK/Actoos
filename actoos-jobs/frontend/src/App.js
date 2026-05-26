import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Homepage from './pages/Homepage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import JobsPage from './pages/JobsPage';
import CandidateDashboard from './pages/CandidateDashboard';
import CandidateProfilePage from './pages/CandidateProfilePage';
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

// Placeholder pages
const JobDetailPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Détail de l'offre</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

const CompaniesPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Entreprises</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

const PricingPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Tarifs</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

const BlogPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Blog & Conseils</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
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
    <div className="min-h-screen">
      <Header user={user} onLogout={signOut} />
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Homepage />} />
        <Route path="/emplois" element={<JobsPage />} />
        <Route path="/emplois/:id" element={<JobDetailPage />} />
        <Route path="/entreprises" element={<CompaniesPage />} />
        <Route path="/entreprises/inscription" element={<RegisterPage />} />
        <Route path="/tarifs" element={<PricingPage />} />
        <Route path="/blog" element={<BlogPage />} />
        
        {/* Auth routes */}
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
        
        {/* Protected routes */}
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
