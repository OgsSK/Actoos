'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function ResetForm() {
  const { user, loading, updatePassword, signOut } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isFr = language === 'fr';

  useEffect(() => {
    if (loading) return;
    if (!user) setError(isFr ? 'Lien invalide ou expiré.' : 'Invalid or expired link.');
  }, [user, loading, isFr]);

  const analysis = (() => {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return { hasLength, hasUppercase, hasNumber, isValid: hasLength && hasUppercase && hasNumber };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!analysis.isValid) { setError(isFr ? 'Le mot de passe ne respecte pas les règles.' : 'Password does not meet requirements.'); return; }
    if (password !== confirm) { setError(isFr ? 'Les mots de passe ne correspondent pas.' : 'Passwords do not match.'); return; }

    setSubmitting(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(async () => { await signOut(); window.location.href = '/login'; }, 2000);
    } catch (err: any) {
      setError(err?.message || (isFr ? 'Erreur' : 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-500" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} className="text-red-600" />
          </div>
          <p className="text-sm text-slate-700 mb-6">{error}</p>
          <button onClick={() => router.push('/mot-de-passe-oublie')}
            className="inline-block bg-red-500 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-red-600">
            {isFr ? 'Demander un nouveau lien' : 'Request a new link'}
          </button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            {isFr ? 'Mot de passe mis à jour' : 'Password updated'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr ? 'Vous pouvez maintenant vous connecter.' : 'You can now sign in.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 pt-20">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {isFr ? 'Nouveau mot de passe' : 'New password'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={show ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} required
                placeholder={isFr ? 'Nouveau mot de passe' : 'New password'}
                className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10" />
              <button type="button" onClick={() => setShow(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <ul className="mt-2 space-y-1 text-[11px]">
                <li className={analysis.hasLength ? 'text-emerald-600' : 'text-slate-400'}>
                  {analysis.hasLength ? '✓' : '○'} {isFr ? '8 caractères min' : '8 characters min'}
                </li>
                <li className={analysis.hasUppercase ? 'text-emerald-600' : 'text-slate-400'}>
                  {analysis.hasUppercase ? '✓' : '○'} {isFr ? 'Une majuscule' : 'One uppercase'}
                </li>
                <li className={analysis.hasNumber ? 'text-emerald-600' : 'text-slate-400'}>
                  {analysis.hasNumber ? '✓' : '○'} {isFr ? 'Un chiffre' : 'One number'}
                </li>
              </ul>
            )}
          </div>

          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type={show ? 'text' : 'password'} value={confirm}
              onChange={e => setConfirm(e.target.value)} required
              placeholder={isFr ? 'Confirmer' : 'Confirm'}
              className={`w-full border rounded-lg pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 transition-colors ${
                confirm && confirm !== password
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-slate-200 focus:border-red-500 focus:ring-red-500/10'
              }`} />
            {confirm && confirm === password && (
              <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={submitting || !analysis.isValid || password !== confirm}
            className="w-full bg-red-500 text-white rounded-lg py-3 font-medium text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {isFr ? 'Enregistrer' : 'Save'}
          </button>

          <div className="text-center">
            <a href="/login" className="text-xs text-slate-500 hover:text-red-600 inline-flex items-center gap-1">
              <ArrowLeft size={12} />
              {isFr ? 'Retour à la connexion' : 'Back to login'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-500" />
      </div>
    }>
      <ResetForm />
    </Suspense>
  );
}