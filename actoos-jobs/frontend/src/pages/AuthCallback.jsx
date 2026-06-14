import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        navigate('/connexion', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 text-white to-[#16213e]">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#2563eb] mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-white mb-2">{t('authCallback.title')}</h1>
        <p className="text-blue-200">{t('authCallback.message')}</p>
      </div>
    </div>
  );
};

export default AuthCallback;