import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Header from './components/Header';
import Homepage from './pages/Homepage';
import './index.css';

// Placeholder pages - will be implemented
const JobsPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Recherche d'emplois</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

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

const LoginPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Connexion</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

const RegisterPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Inscription</h1>
      <p className="text-slate-600 mt-2">Page en cours de développement...</p>
    </div>
  </div>
);

const CompanyRegisterPage = () => (
  <div className="pt-20 min-h-screen bg-slate-50">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold">Inscription Entreprise</h1>
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

function App() {
  const [user, setUser] = useState(null);

  const handleLogout = () => {
    setUser(null);
    // Will add Supabase logout here
  };

  return (
    <Router>
      <div className="min-h-screen">
        <Header user={user} onLogout={handleLogout} />
        
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/emplois" element={<JobsPage />} />
          <Route path="/emplois/:id" element={<JobDetailPage />} />
          <Route path="/entreprises" element={<CompaniesPage />} />
          <Route path="/entreprises/inscription" element={<CompanyRegisterPage />} />
          <Route path="/tarifs" element={<PricingPage />} />
          <Route path="/blog" element={<BlogPage />} />
          
          {/* Auth routes */}
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          
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
    </Router>
  );
}

export default App;
