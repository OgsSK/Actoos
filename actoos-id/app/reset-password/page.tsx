'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, Loader2, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

const T = {
  fr: {
    title: 'Nouveau mot de passe',
    subtitle: 'Choisissez un mot de passe fort et unique.',
    newPassword: 'Nouveau mot de passe',
    confirmPassword: 'Confirmer le nouveau mot de passe',
    cancel: 'Retour à la connexion',
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    success: 'Mot de passe mis à jour',
    successDetail: 'Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.',
    redirecting: 'Redirection…',
    errTooShort: 'Le mot de passe doit contenir au moins 8 caractères.',
    errMismatch: 'Les deux mots de passe ne correspondent pas.',
    errRules: 'Le mot de passe ne respecte pas toutes les règles.',
    errGeneric: 'Une erreur est survenue. Veuillez réessayer.',
    errInvalidLink: 'Lien invalide ou expiré. Veuillez demander un nouveau lien.',
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
    title: 'New password',
    subtitle: 'Choose a strong and unique password.',
    newPassword: 'New password',
    confirmPassword: 'Confirm new password',
    cancel: 'Back to login',
    save: 'Save',
    saving: 'Saving…',
    success: 'Password updated',
    successDetail: 'You can now log in with your new password.',
    redirecting: 'Redirecting…',
    errTooShort: 'Password must be at least 8 characters.',
    errMismatch: 'The two passwords do not match.',
    errRules: 'Password does not meet all requirements.',
    errGeneric: 'Something went wrong. Please try again.',
    errInvalidLink: 'Invalid or expired link. Please request a new one.',
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

function ResetPasswordForm() {
  const { user, loading, updatePassword, signOut } = useAuth();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<Language>('fr');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  // Charge la langue
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('actoos-id-language');
    if (stored === 'fr' || stored === 'en') setLanguage(stored);
  }, []);

  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') localStorage.setItem('actoos-id-language', lang);
  };

  // Vérifie que le lien de recovery est valide (session présente)
  useEffect(() => {
    if (loading) return;
    // Le middleware @supabase/ssr échange automatiquement le code
    // Donc si on a un user, c'est que le lien est valide
    setLinkChecked(true);
  }, [loading, user]);

  const t = T[language];

  // Analyse du mot de passe (même logique que ChangePasswordModal)
  const analysis = (() => {
    const hasLength = newPassword.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    let score = 0;
    if (hasLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    if (newPassword.length > 0 && newPassword.length < 6) score = Math.min(score, 1);
    return { hasLength, hasUppercase, hasNumber, hasSpecial, score, isEmpty: newPassword.length === 0 };
  })();

  const isValid = analysis.hasLength && analysis.hasUppercase && analysis.hasNumber;

  const strengthInfo = (() => {
    if (analysis.isEmpty) return null;
    if (analysis.score <= 1) return { label: t.strengthVeryWeak, color: 'bg-red-500', textColor: 'text-red-600' };
    if (analysis.score === 2) return { label: t.strengthWeak, color: 'bg-orange-500', textColor: 'text-orange-600' };
    if (analysis.score === 3) return { label: t.strengthMedium, color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (analysis.score === 4) return { label: t.strengthStrong, color: 'bg-emerald-500', textColor: 'text-emerald-600' };
    return { label: t.strengthVeryStrong, color: 'bg-emerald-600', textColor: 'text-emerald-700' };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isValid) {
      setError(t.errRules);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.errMismatch);
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      setSuccess(true);
      // Déconnexion pour forcer une reconnexion propre
      setTimeout(async () => {
        await signOut();
        window.location.href = '/login';
      }, 2000);
    } catch (err: any) {
      console.error('[ResetPassword]', err);
      setError(err?.message || t.errGeneric);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !linkChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
        </div>
      </div>
    );
  }

  // Pas de session → lien invalide
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={26} className="text-red-600" />
          </div>
          <p className="text-sm text-slate-700 mb-6">{t.errInvalidLink}</p>
          <a
            href="/mot-de-passe-oublie"
            className="inline-block bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            {language === 'fr' ? 'Demander un nouveau lien' : 'Request a new link'}
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-sm">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={26} className="text-emerald-600" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">{t.success}</h1>
          <p className="text-sm text-slate-500 mb-2">{t.successDetail}</p>
          <p className="text-xs text-slate-400">{t.redirecting}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 relative">
      <div className="absolute top-4 right-4 flex items-center gap-0.5">
        <button
          onClick={() => changeLanguage('fr')}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >FR</button>
        <span className="text-slate-300 text-xs">/</span>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
        >EN</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full shadow-sm">
        <div className="text-center mb-8">
          <img src="/logo-icon.png" alt="Actoos" className="h-14 w-14 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-500">{t.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nouveau mot de passe */}
          <div>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder={t.newPassword}
                required
                autoComplete="new-password"
                className="w-full border border-slate-200 rounded-lg pl-10 pr-10 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Barre de fiabilité */}
            {!analysis.isEmpty && strengthInfo && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-slate-500">{t.strengthLabel}</span>
                  <span className={`text-[11px] font-semibold ${strengthInfo.textColor}`}>{strengthInfo.label}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex gap-0.5">
                  {[0, 1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-colors duration-300 ${i < analysis.score ? strengthInfo.color : 'bg-slate-100'}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Règles */}
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
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder={t.confirmPassword}
              required
              autoComplete="new-password"
              className={`w-full border rounded-lg pl-10 pr-10 py-3 text-sm outline-none focus:ring-2 transition-colors ${
                confirmPassword && confirmPassword !== newPassword
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/10'
              }`}
            />
            {confirmPassword && confirmPassword === newPassword && (
              <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600" />
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !isValid || newPassword !== confirmPassword}
            className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? t.saving : t.save}
          </button>

          <div className="text-center">
            <a
              href="/login"
              className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1"
            >
              <ArrowLeft size={12} />
              {t.cancel}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sous-composant RuleItem
function RuleItem({ passed, label, optional }: { passed: boolean; label: string; optional?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-[11px]">
      <span
        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          passed ? 'bg-emerald-100' : optional ? 'bg-slate-200' : 'bg-red-100'
        }`}
      >
        {passed ? (
          <Check size={9} className="text-emerald-600" strokeWidth={3} />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full ${optional ? 'bg-slate-400' : 'bg-red-400'}`} />
        )}
      </span>
      <span className={passed ? 'text-slate-700' : optional ? 'text-slate-400' : 'text-red-600'}>
        {label}
      </span>
    </li>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}