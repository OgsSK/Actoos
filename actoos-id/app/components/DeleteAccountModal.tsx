'use client';

import { useState } from 'react';
import { X, Trash2, Loader2, AlertTriangle, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Supprimer mon compte',
    warning: 'Cette action est définitive et irréversible.',
    warningDetail: 'Toutes vos données seront supprimées : projets, candidatures, fichiers, commentaires. Vous ne pourrez pas les récupérer.',
    confirmText: 'Pour confirmer, tapez SUPPRIMER en majuscules :',
    confirmWord: 'SUPPRIMER',
    password: 'Mot de passe',
    cancel: 'Annuler',
    delete: 'Supprimer définitivement',
    deleting: 'Suppression…',
    errConfirm: 'Vous devez taper SUPPRIMER pour confirmer.',
    errWrongPassword: 'Mot de passe incorrect.',
    errGeneric: 'Une erreur est survenue. Veuillez réessayer.',
    errMissing: 'Veuillez remplir tous les champs.',
  },
  en: {
    title: 'Delete my account',
    warning: 'This action is permanent and irreversible.',
    warningDetail: 'All your data will be deleted: projects, applications, files, comments. You will not be able to recover them.',
    confirmText: 'To confirm, type DELETE in uppercase:',
    confirmWord: 'DELETE',
    password: 'Password',
    cancel: 'Cancel',
    delete: 'Delete permanently',
    deleting: 'Deleting…',
    errConfirm: 'You must type DELETE to confirm.',
    errWrongPassword: 'Incorrect password.',
    errGeneric: 'Something went wrong. Please try again.',
    errMissing: 'Please fill in all fields.',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function DeleteAccountModal({ isOpen, onClose, language }: Props) {
  const { user, signIn, signOut } = useAuth();
  const [confirmWord, setConfirmWord] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const t = T[language];

  const reset = () => {
    setConfirmWord('');
    setPassword('');
    setShowPassword(false);
    setError('');
  };

  const handleClose = () => {
    if (loading) return;
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!confirmWord || !password) {
      setError(t.errMissing);
      return;
    }
    if (confirmWord !== t.confirmWord) {
      setError(t.errConfirm);
      return;
    }
    if (!user?.email) {
      setError(t.errGeneric);
      return;
    }

    setLoading(true);
    try {
      // 1. Vérifier le mot de passe
      try {
        await signIn({ email: user.email, password });
      } catch {
        setError(t.errWrongPassword);
        setLoading(false);
        return;
      }

      // 2. Supprimer le compte via l'API backend de Jobs
      //    (la seule qui a les droits admin côté Supabase)
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ||
        'https://actoos-jobs-api.onrender.com';

      const res = await fetch(`${API_URL}/api/user/delete-account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || data.error || 'Delete failed');
      }

      // 3. Déconnexion + redirection
      await signOut();
      window.location.href = '/login';
    } catch (err: any) {
      console.error('[DeleteAccountModal]', err);
      setError(err?.message || t.errGeneric);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl border-t-4 border-red-500"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
            </div>
          </div>
          <button onClick={handleClose} disabled={loading} className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{t.warning}</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{t.warningDetail}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Confirmation textuelle */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {t.confirmText}
            </label>
            <input
              type="text"
              value={confirmWord}
              onChange={e => setConfirmWord(e.target.value)}
              placeholder={t.confirmWord}
              required
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-colors font-mono"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              {t.password}
            </label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || confirmWord !== t.confirmWord || !password}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? t.deleting : t.delete}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}