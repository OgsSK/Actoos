'use client';

import { useState, useEffect } from 'react';

import { ArrowLeft, Mail, Lock, User, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { user, loading, signUp } = useAuth();
 

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'candidate' | 'company'>('candidate');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      window.location.href = process.env.NEXT_PUBLIC_STUDIO_URL || 'https://actoos.com/studio/account';
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signUp({ email, password, firstName, lastName, role, language: 'fr' });
      setSuccess(true);
      setTimeout(() => {
        window.location.href = process.env.NEXT_PUBLIC_STUDIO_URL || 'https://actoos.com/studio/account';
      }, 2000);
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la création du compte');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-emerald-600 text-2xl">✓</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Compte créé !</h1>
          <p className="text-sm text-slate-500 mb-2">
            Vérifiez votre boîte mail pour confirmer votre adresse.
          </p>
          <p className="text-xs text-slate-400">Redirection…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Créer un compte</h1>
          <p className="text-sm text-slate-500">Rejoignez Actoos en 30 secondes</p>
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
                className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
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
              placeholder="Email"
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
              placeholder="Mot de passe (min. 6 caractères)"
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Je suis :</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('candidate')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  role === 'candidate'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Candidat
              </button>
              <button
                type="button"
                onClick={() => setRole('company')}
                className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  role === 'company'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Entreprise
              </button>
            </div>
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
            Créer mon compte
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            Déjà un compte ?{' '}
            <a href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Se connecter
            </a>
          </p>
        </div>

        <div className="mt-4 text-center">
          <a href="https://actoos.com" className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1">
            <ArrowLeft size={12} />
            Retour à actoos.com
          </a>
        </div>
      </div>
    </div>
  );
}