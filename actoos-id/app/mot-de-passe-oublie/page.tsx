'use client';

import { useState, useEffect } from 'react';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Mot de passe oublié',
    subtitle: "Entrez votre email, nous vous enverrons un lien de réinitialisation.",
    email: 'Email',
    submit: 'Envoyer le lien',
    sending: 'Envoi…',
    back: 'Retour à la connexion',
    successTitle: 'Vérifiez vos emails',
    successMessage: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.',
    error: "Erreur lors de l'envoi. Veuillez réessayer.",
    backHome: 'Retour à actoos.com',
  },
  en: {
    title: 'Forgot password',
    subtitle: 'Enter your email, we will send you a reset link.',
    email: 'Email',
    submit: 'Send reset link',
    sending: 'Sending…',
    back: 'Back to login',
    successTitle: 'Check your inbox',
    successMessage: 'If an account exists with this email, you will receive a reset link shortly.',
    error: 'Error sending. Please try again.',
    backHome: 'Back to actoos.com',
  },
};

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [language, setLanguage] = useState<Language>('fr');
  const [email, setEmail] = useState('');
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

  const t = T[language];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || t.error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      {/* Sélecteur de langue */}
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
        <div className="text-center mb-8">
          <img src="/logo-icon.png" alt="Actoos" className="h-14 w-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold text-slate-900">{t.successTitle}</h2>
            <p className="text-sm text-slate-500 leading-relaxed">{t.successMessage}</p>
            <a
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft size={14} />
              {t.back}
            </a>
          </div>
        ) : (
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
              {submitting ? t.sending : t.submit}
            </button>

            <div className="text-center">
              <a
                href="/login"
                className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
              >
                <ArrowLeft size={12} />
                {t.back}
              </a>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <a href="https://actoos.com" className="text-xs text-slate-400 hover:text-slate-600">
            {t.backHome}
          </a>
        </div>
      </div>
    </div>
  );
}