import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Lorsque l'URL contient le hash avec le token, Supabase le détecte automatiquement
    // et déclenche onAuthStateChange. On écoute ce changement pour rediriger.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // Redirige vers le dashboard (ou la page d'origine)
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        navigate('/connexion', { replace: true });
      }
    });

    // Nettoyage
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 text-white to-[#16213e]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#2563eb] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">Connexion en cours...</h1>
        <p className="text-blue-200">Veuillez patienter pendant que nous finalisons votre authentification.</p>
      </div>
    </div>
  );
};

export default AuthCallback;