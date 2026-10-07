'use client';

import { useState } from 'react';
import { X, Mail, Lock, Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: "Changer d'adresse email",
    subtitle: 'Un email de confirmation sera envoyé à vos deux adresses.',
    currentEmail: 'Email actuel',
    newEmail: 'Nouvel email',
    password: 'Mot de passe actuel',
    passwordHint: 'Pour valider, entrez votre mot de passe.',
    cancel: 'Annuler',
    save: 'Envoyer la confirmation',
    saving: 'Envoi…',
    success: 'Email de confirmation envoyé.',
    successDetail: 'Vérifiez votre nouvelle et ancienne adresse pour valider.',
    errMissing: 'Veuillez remplir tous les champs.',
    errInvalidEmail: 'Adresse email invalide.',
    errSame: "Le nouvel email doit être différent de l'actuel.",
    errWrongPassword: 'Mot de passe incorrect.',
    errAlreadyUsed: 'Cet email est déjà utilisé.',
    errGeneric: 'Une erreur est survenue.',
  },
  en: {
    title: 'Change email address',
    subtitle: 'A confirmation email will be sent to both addresses.',
    currentEmail: 'Current email',
    newEmail: 'New email',
    password: 'Current password',
    passwordHint: 'Enter your password to confirm.',
    cancel: 'Cancel',
    save: 'Send confirmation',
    saving: 'Sending…',
    success: 'Confirmation email sent.',
    successDetail: 'Check your new and old address to validate.',
    errMissing: 'Please fill in all fields.',
    errInvalidEmail: 'Invalid email address.',
    errSame: 'New email must be different from current one.',
    errWrongPassword: 'Incorrect password.',
    errAlreadyUsed: 'This email is already in use.',
    errGeneric: 'Something went wrong.',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function ChangeEmailModal({ isOpen, onClose, language }: Props) {
  const { user, signIn, updateEmail } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = T[language];
  const currentEmail = user?.email || '';

  const reset = () => {
    setNewEmail(''); setPassword(''); setShowPassword(false); setError(''); setSuccess(false);
  };

  const handleClose = () => { if (loading) return; reset(); onClose(); };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newEmail || !password) { setError(t.errMissing); return; }
    if (!isValidEmail(newEmail)) { setError(t.errInvalidEmail); return; }
    if (newEmail.toLowerCase() === currentEmail.toLowerCase()) { setError(t.errSame); return; }
    if (!user?.email) { setError(t.errGeneric); return; }

    setLoading(true);
    try {
      try { await signIn({ email: user.email, password }); }
      catch { setError(t.errWrongPassword); setLoading(false); return; }

      await updateEmail(newEmail);
      setSuccess(true);
      setTimeout(handleClose, 3000);
    } catch (err: any) {
      const msg = (err?.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('used') || msg.includes('registered')) {
        setError(t.errAlreadyUsed);
      } else if (msg.includes('password')) {
        setError(t.errWrongPassword);
      } else {
        setError(err?.message || t.errGeneric);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Mail size={18} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900 mb-2">{t.success}</p>
            <p className="text-xs text-slate-500 leading-relaxed">{t.successDetail}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.currentEmail}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="email" value={currentEmail} disabled
                  className="w-full border border-slate-100 bg-slate-50 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.newEmail}</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  required placeholder="nouveau@exemple.com"
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">{t.password}</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)} required
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10" />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{t.passwordHint}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleClose} disabled={loading}
                className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 disabled:opacity-50">
                {t.cancel}
              </button>
              <button type="submit" disabled={loading || !newEmail || !password}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? t.saving : t.save}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}