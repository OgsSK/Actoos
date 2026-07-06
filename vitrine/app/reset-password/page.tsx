'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';
import { ArrowLeft, Loader2, Mail } from 'lucide-react';

export default function ResetPasswordPage() {
  const { language, setLanguage } = useLanguage();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) {
      setError(error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">
              ACTOOS<span className="text-[#D4AF37]">.</span>
            </span>
          </Link>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <button onClick={() => setLanguage('fr')} className={`${language === 'fr' ? 'text-slate-900 underline' : 'hover:text-black'}`}>FR</button>
              <button onClick={() => setLanguage('en')} className={`${language === 'en' ? 'text-slate-900 underline' : 'hover:text-black'}`}>EN</button>
            </div>
            <Link href="/login" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
              <ArrowLeft size={18} />
              <span>{t[language]?.back || 'Retour'}</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 max-w-md mx-auto">
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-950 mb-8 text-center">
          {language === 'en' ? 'Reset your password' : 'Réinitialiser le mot de passe'}
        </h1>

        {success ? (
          <div className="bg-green-50 rounded-2xl p-8 text-center space-y-4">
            <Mail size={48} className="text-green-500 mx-auto" />
            <h2 className="font-bold text-xl text-green-700">
              {language === 'en' ? 'Check your email' : 'Vérifiez vos emails'}
            </h2>
            <p className="text-slate-600 text-sm">
              {language === 'en'
                ? 'If an account exists with this email, you will receive a reset link shortly.'
                : 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation dans quelques instants.'}
            </p>
            <Link href="/login" className="text-[#D4AF37] font-bold hover:underline">
              {language === 'en' ? 'Back to login' : 'Retour à la connexion'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm">{error}</div>
            )}

            <p className="text-sm text-slate-500 text-center">
              {language === 'en'
                ? "Enter your email address and we'll send you a password reset link."
                : 'Entrez votre adresse email et nous vous enverrons un lien de réinitialisation.'}
            </p>

            <input
              type="email"
              placeholder={t[language]?.contactPlaceholderEmail || 'Email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37]"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {language === 'en' ? 'Send reset link' : 'Envoyer le lien'}
            </button>

            <div className="text-center">
              <Link href="/login" className="text-sm text-slate-400 hover:text-slate-600 hover:underline">
                {language === 'en' ? 'Back to login' : 'Retour à la connexion'}
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}