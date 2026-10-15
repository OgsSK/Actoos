'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { BRAND } from '@/lib/brand';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn } = useAuth();

  const redirect = searchParams.get('redirect') || '/account';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirect);
    }
  }, [user, loading, redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push(redirect);
    } catch (err: any) {
      setError(err?.message || 'Identifiants incorrects');
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

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight mb-2">{BRAND.name}</h1>
          <p className="text-sm text-slate-500">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="Mot de passe"
              required
              autoComplete="current-password"
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
            Se connecter
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/auth/forgot" className="text-xs text-slate-500 hover:text-slate-900">
            Mot de passe oublié ?
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <Link href="/auth/register" className="font-medium text-slate-900 hover:underline">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}