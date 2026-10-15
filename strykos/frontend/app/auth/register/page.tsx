'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { BRAND } from '@/lib/brand';

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, signUp } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/account');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signUp({ email, password, firstName, lastName });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('already')) {
        setError('Cet email est déjà utilisé.');
      } else {
        setError(msg || 'Erreur lors de la création du compte');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold mb-2">Compte créé !</h1>
          <p className="text-sm text-slate-500 mb-6">
            Vérifiez votre boîte mail pour confirmer votre adresse.
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-slate-900 text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-slate-800"
          >
            Aller à la connexion
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-2">{BRAND.name}</h1>
          <p className="text-sm text-slate-500">Créer un compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Prénom"
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Nom"
                required
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
              />
            </div>
          </div>

          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mot de passe (min. 6 caractères)"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Créer mon compte
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            En créant un compte, vous acceptez nos{' '}
            <Link href="/cgv" className="underline">CGV</Link> et notre{' '}
            <Link href="/confidentialite" className="underline">politique de confidentialité</Link>.
          </p>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Déjà un compte ?{' '}
            <Link href="/auth/login" className="font-medium text-slate-900 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}