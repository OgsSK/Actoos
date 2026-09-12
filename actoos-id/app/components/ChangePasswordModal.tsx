'use client';

import { useState, useMemo } from 'react';
import { X, Lock, Loader2, Eye, EyeOff, CheckCircle, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Changer le mot de passe',
    subtitle: 'Choisissez un mot de passe fort et unique.',
    currentPassword: 'Mot de passe actuel',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    cancel: 'Annuler',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    success: 'Mot de passe mis à jour avec succès.',
    errTooShort: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
    errMismatch: 'Les deux mots de passe ne correspondent pas.',
    errSame: "Le nouveau mot de passe doit être différent de l'ancien.",
    errWrongCurrent: 'Le mot de passe actuel est incorrect.',
    errGeneric: 'Une erreur est survenue. Veuillez réessayer.',
    errMissing: 'Veuillez remplir tous les champs.',
    errRules: 'Le mot de passe ne respecte pas toutes les règles.',
    strengthLabel: 'Fiabilité',
    strengthVeryWeak: 'Très faible',
    strengthWeak: 'Faible',
    strengthMedium: 'Moyen',
    strengthStrong: 'Fort',
    strengthVeryStrong: 'Très fort',
    rulesTitle: 'Le mot de passe doit contenir :',
    ruleLength: 'Au moins 8 caractères',
    ruleUppercase: 'Au moins une majuscule',
    ruleNumber: 'Au moins un chiffre',
    ruleSpecial: 'Un caractère spécial recommandé',
  },
  en: {
    title: 'Change password',
    subtitle: 'Choose a strong and unique password.',
    currentPassword: 'Current password',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    success: 'Password updated successfully.',
    errTooShort: 'New password must be at least 8 characters.',
    errMismatch: 'The two passwords do not match.',
    errSame: 'New password must be different from the current one.',
    errWrongCurrent: 'Current password is incorrect.',
    errGeneric: 'Something went wrong. Please try again.',
    errMissing: 'Please fill in all fields.',
    errRules: 'Password does not meet all requirements.',
    strengthLabel: 'Strength',
    strengthVeryWeak: 'Very weak',
    strengthWeak: 'Weak',
    strengthMedium: 'Medium',
    strengthStrong: 'Strong',
    strengthVeryStrong: 'Very strong',
    rulesTitle: 'Password must contain:',
    ruleLength: 'At least 8 characters',
    ruleUppercase: 'At least one uppercase letter',
    ruleNumber: 'At least one number',
    ruleSpecial: 'One special character (recommended)',
  },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export default function ChangePasswordModal({ isOpen, onClose, language }: Props) {
  const { user, signIn, updatePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const t = T[language];

  // 🎯 Analyse du mot de passe
  const analysis = useMemo(() => {
    const hasLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

    // Score 0-5
    let score = 0;
    if (hasLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    // Pénalité si très court
    if (newPassword.length > 0 && newPassword.length < 6) score = Math.min(score, 1);

    return {
      hasLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
      hasSpecial,
      score,
      isEmpty: newPassword.length === 0,
    };
  }, [newPassword]);

  // Règles strictes : longueur, majuscule, chiffre
  const isValid = analysis.hasLength && analysis.hasUppercase && analysis.hasNumber;

  // Couleur / label selon score
  const strengthInfo = (() => {
    if (analysis.isEmpty) return null;
    if (analysis.score <= 1) return { label: t.strengthVeryWeak, color: 'bg-red-500', textColor: 'text-red-600' };
    if (analysis.score === 2) return { label: t.strengthWeak, color: 'bg-orange-500', textColor: 'text-orange-600' };
    if (analysis.score === 3) return { label: t.strengthMedium, color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (analysis.score === 4) return { label: t.strengthStrong, color: 'bg-emerald-500', textColor: 'text-emerald-600' };
    return { label: t.strengthVeryStrong, color: 'bg-emerald-600', textColor: 'text-emerald-700' };
  })();

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t.errMissing);
      return;
    }
    if (!isValid) {
      setError(t.errRules);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.errMismatch);
      return;
    }
    if (newPassword === currentPassword) {
      setError(t.errSame);
      return;
    }
    if (!user?.email) {
      setError(t.errGeneric);
      return;
    }

    setLoading(true);
    try {
      // 1. Vérifier le mot de passe actuel
      try {
        await signIn({ email: user.email, password: currentPassword });
      } catch {
        setError(t.errWrongCurrent);
        setLoading(false);
        return;
      }

      // 2. Mettre à jour le mot de passe
      await updatePassword(newPassword);

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1800);
    } catch (err: any) {
      console.error('[ChangePasswordModal]', err);
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('different')) {
        setError(t.errSame);
      } else {
        setError(msg || t.errGeneric);
      }
    } finally {
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
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">{t.title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={26} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-900">{t.success}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Mot de passe actuel */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t.currentPassword}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Nouveau mot de passe */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t.newPassword}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              {/* 🎯 Barre de fiabilité */}
              {!analysis.isEmpty && strengthInfo && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-slate-500">{t.strengthLabel}</span>
                    <span className={`text-[11px] font-semibold ${strengthInfo.textColor}`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                    {[0, 1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-colors duration-300 ${
                          i < analysis.score ? strengthInfo.color : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 🎯 Règles du mot de passe */}
              {!analysis.isEmpty && (
                <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                  <p className="text-[11px] font-medium text-slate-600 mb-2">{t.rulesTitle}</p>
                  <ul className="space-y-1.5">
                    <RuleItem passed={analysis.hasLength} label={t.ruleLength} />
                    <RuleItem passed={analysis.hasUppercase} label={t.ruleUppercase} />
                    <RuleItem passed={analysis.hasNumber} label={t.ruleNumber} />
                    <RuleItem passed={analysis.hasSpecial} label={t.ruleSpecial} optional />
                  </ul>
                </div>
              )}
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                {t.confirmPassword}
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={`w-full border rounded-lg pl-9 pr-10 py-2.5 text-sm outline-none focus:ring-2 transition-colors ${
                    confirmPassword && confirmPassword !== newPassword
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
                  }`}
                />
                {confirmPassword && confirmPassword === newPassword && (
                  <Check size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
                )}
              </div>
            </div>

            {/* Erreur */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Actions */}
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
                disabled={loading || !isValid || newPassword !== confirmPassword}
                className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
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

// ---------- Sous-composant RuleItem ----------
function RuleItem({ passed, label, optional }: { passed: boolean; label: string; optional?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          passed
            ? 'bg-emerald-100'
            : optional
            ? 'bg-slate-200'
            : 'bg-red-100'
        }`}
      >
        {passed ? (
          <Check size={9} className="text-emerald-600" strokeWidth={3} />
        ) : (
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              optional ? 'bg-slate-400' : 'bg-red-400'
            }`}
          />
        )}
      </span>
      <span
        className={`${
          passed
            ? 'text-slate-700'
            : optional
            ? 'text-slate-400'
            : 'text-red-600'
        }`}
      >
        {label}
      </span>
    </li>
  );
}