'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Actoos ID',
    subtitle: 'Un compte pour tous vos produits',
    email: 'Email',
    password: 'Mot de passe',
    forgotPassword: 'Mot de passe oublié ?',
    signIn: 'Se connecter',
    or: 'ou',
    continueGoogle: 'Continuer avec Google',
    noAccount: "Pas encore de compte ?",
    signUp: 'Créer un compte',
    back: 'Retour à actoos.com',
    errorInvalid: 'Identifiants incorrects',
    errorGoogle: 'Erreur Google',
    loading: 'Vérification de votre session…',
  },
  en: {
    title: 'Actoos ID',
    subtitle: 'One account for all your products',
    email: 'Email',
    password: 'Password',
    forgotPassword: 'Forgot password?',
    signIn: 'Sign in',
    or: 'or',
    continueGoogle: 'Continue with Google',
    noAccount: "Don't have an account?",
    signUp: 'Create an account',
    back: 'Back to actoos.com',
    errorInvalid: 'Invalid credentials',
    errorGoogle: 'Google error',
    loading: 'Checking your session…',
  },
};

function LanguageToggle({ language, setLanguage }: { language: Language; setLanguage: (l: Language) => void }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-0.5">
      <button
        onClick={() => setLanguage('fr')}
        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
      >FR</button>
      <span className="text-slate-300 text-xs">/</span>
      <button
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
      >EN</button>
    </div>
  );
}

function LoginForm() {
  const { user, loading, signIn, signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const addAccount = searchParams.get('addAccount') === '1';

  const [language, setLanguage] = useState<Language>('fr');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Charge la langue depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('actoos-id-language');
    if (stored === 'fr' || stored === 'en') setLanguage(stored);
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') localStorage.setItem('actoos-id-language', lang);
  };

  useEffect(() => {
    // Ne pas rediriger si on ajoute un compte (on veut afficher le formulaire)
    if (addAccount) return;
    if (!loading && user) {
      const target = redirect ? decodeURIComponent(redirect) : '/account';
      window.location.href = target;
    }
  }, [user, loading, redirect, addAccount]);

  const t = T[language];

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setSubmitting(true);
  try {
    // Login via API route serveur (compatible Safari)
    const res = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    const target = redirect ? decodeURIComponent(redirect) : '/account';
    window.location.href = target;
  } catch (err: any) {
    setError(err?.message || t.errorInvalid);
  } finally {
    setSubmitting(false);
  }
};

  const handleGoogle = async () => {
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || t.errorGoogle);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
          <p className="text-xs text-slate-400">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      <LanguageToggle language={language} setLanguage={changeLanguage} />

      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <img src="/logo-icon.png" alt="Actoos" className="h-14 w-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t.email}
              required
              autoComplete="email"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t.password}
              required
              autoComplete="current-password"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
          </div>

          <div className="text-right">
            <a href="/mot-de-passe-oublie" className="text-xs text-slate-500 hover:text-blue-600 transition-colors">
              {t.forgotPassword}
            </a>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t.signIn}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 uppercase">{t.or}</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full border border-slate-200 text-slate-700 rounded-lg py-3 font-medium text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t.continueGoogle}
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {t.noAccount}{' '}
            <a href="/register" className="font-medium text-blue-600 hover:text-blue-700">
              {t.signUp}
            </a>
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="https://actoos.com" className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
            <ArrowLeft size={12} />
            {t.back}
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}