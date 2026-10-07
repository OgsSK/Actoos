'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const isFr = language === 'fr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || (isFr ? 'Erreur lors de l\'envoi' : 'Error sending'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 pt-20">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {isFr ? 'Mot de passe oublié' : 'Forgot password'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr ? 'Entrez votre email pour recevoir un lien de réinitialisation.' : 'Enter your email to receive a reset link.'}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <p className="text-sm text-slate-700">
              {isFr
                ? 'Si un compte existe avec cet email, vous recevrez un lien dans quelques instants.'
                : 'If an account exists with this email, you will receive a link shortly.'}
            </p>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700">
              <ArrowLeft size={14} />
              {isFr ? 'Retour à la connexion' : 'Back to login'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder={isFr ? 'Email' : 'Email'}
                className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-red-500 text-white rounded-lg py-3 font-medium text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {isFr ? 'Envoyer le lien' : 'Send link'}
            </button>

            <div className="text-center pt-2">
              <Link href="/login" className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1">
                <ArrowLeft size={12} />
                {isFr ? 'Retour à la connexion' : 'Back to login'}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}