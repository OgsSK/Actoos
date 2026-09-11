'use client';

import { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const LOGIN_URL = 'https://jobs.actoos.com/connexion';

export default function StudioGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirection vers le portail d'identité
      window.location.href = `${LOGIN_URL}?redirect=${encodeURIComponent(window.location.href)}`;
    }
  }, [user, loading]);

  // Pendant le chargement de la session
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
          <p className="text-xs text-slate-400">Vérification de votre session…</p>
        </div>
      </div>
    );
  }

  // Pas connecté → on attend la redirection (le useEffect s'en occupe)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-sm text-slate-500 mb-3">Vous devez être connecté.</p>
          <a
            href={LOGIN_URL}
            className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Se connecter
          </a>
        </div>
      </div>
    );
  }

  // Connecté → afficher la page
  return <>{children}</>;
}