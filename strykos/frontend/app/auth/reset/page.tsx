'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';

export default function ResetPage() {
  const router = useRouter();
  const { user, loading, updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Minimum 6 caractères.'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return; }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (err: any) {
      setError(err?.message || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-4" />
          <p className="text-sm mb-4">Lien invalide ou expiré.</p>
          <a href="/auth/forgot" className="text-slate-900 underline text-sm">Demander un nouveau lien</a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <CheckCircle size={32} className="text-emerald-600 mx-auto mb-4" />
          <p className="text-sm">Mot de passe mis à jour. Redirection…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <h1 className="text-2xl font-bold mb-2 text-center">Nouveau mot de passe</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Choisissez un mot de passe sécurisé.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Nouveau mot de passe"
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmer"
              required
              minLength={6}
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Enregistrer
          </button>
        </form>
      </div>
    </div>
  );
}