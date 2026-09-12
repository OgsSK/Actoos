'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, User, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Créer un compte',
    subtitle: 'Rejoignez Actoos en 30 secondes',
    firstName: 'Prénom',
    lastName: 'Nom',
    email: 'Email',
    password: 'Mot de passe (min. 6 caractères)',
    createAccount: 'Créer mon compte',
    alreadyAccount: 'Déjà un compte ?',
    signIn: 'Se connecter',
    back: 'Retour à actoos.com',
    errorSignup: 'Erreur lors de la création du compte',
    successTitle: 'Compte créé !',
    successMessage: 'Vérifiez votre boîte mail pour confirmer votre adresse.',
    redirecting: 'Redirection…',
    loading: 'Vérification de votre session…',
    terms: 'En créant un compte, vous acceptez nos conditions générales et notre politique de confidentialité.',
  },
  en: {
    title: 'Create an account',
    subtitle: 'Join Actoos in 30 seconds',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    password: 'Password (min. 6 characters)',
    createAccount: 'Create my account',
    alreadyAccount: 'Already have an account?',
    signIn: 'Sign in',
    back: 'Back to actoos.com',
    errorSignup: 'Error creating account',
    successTitle: 'Account created!',
    successMessage: 'Check your inbox to confirm your email address.',
    redirecting: 'Redirecting…',
    loading: 'Checking your session…',
    terms: 'By creating an account, you agree to our terms of service and privacy policy.',
  },
};

function RegisterForm() {
  const { user, loading, signUp } = useAuth();

  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');

  const [language, setLanguage] = useState<Language>('fr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
    if (!loading && user) {
      const target = redirect ? decodeURIComponent(redirect) : '/account';
      window.location.href = target;
    }
  }, [user, loading, redirect]);

  const t = T[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signUp({
        email,
        password,
        firstName,
        lastName,
        // Pas de rôle : Actoos ID = identité pure.
        // Le rôle sera défini dans chaque produit (Jobs, Studio, etc.)
        language,
      });
      setSuccess(true);
      const target = redirect ? decodeURIComponent(redirect) : '/account';
      setTimeout(() => {
        window.location.href = target;
      }, 2000);
    } catch (err: any) {
      setError(err?.message || t.errorSignup);
    } finally {
      setSubmitting(false);
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

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-600 text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">{t.successTitle}</h1>
          <p className="text-sm text-slate-500 mb-2">{t.successMessage}</p>
          <p className="text-xs text-slate-400">{t.redirecting}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      <div className="absolute top-4 right-4 flex items-center gap-0.5">
        <button
          onClick={() => changeLanguage('fr')}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >FR</button>
        <span className="text-slate-300 text-xs">/</span>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >EN</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-6">
          <img src="/logo-icon.png" alt="Actoos" className="h-14 w-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder={t.firstName}
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
            </div>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder={t.lastName}
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
            </div>
          </div>

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
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
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
            {t.createAccount}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-4 leading-relaxed">
          {t.terms}
        </p>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {t.alreadyAccount}{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              {t.signIn}
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}