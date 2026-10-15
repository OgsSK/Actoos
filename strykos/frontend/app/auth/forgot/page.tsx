'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function ForgotPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await resetPassword(email);
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Mot de passe oublié</h1>
          <p className="text-sm text-slate-500">
            Entrez votre email, nous vous enverrons un lien de réinitialisation.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <h2 className="text-base font-semibold">Vérifiez vos emails</h2>
            <p className="text-sm text-slate-500">
              Si un compte existe avec cet email, vous recevrez un lien sous peu.
            </p>
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:underline"
            >
              <ArrowLeft size={14} /> Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Envoyer le lien
            </button>

            <div className="text-center">
              <Link href="/auth/login" className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1">
                <ArrowLeft size={12} /> Retour à la connexion
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}