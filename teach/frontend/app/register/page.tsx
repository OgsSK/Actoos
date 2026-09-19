'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  User,
  Loader2,
  ArrowLeft,
  GraduationCap,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

type Role = 'teacher' | 'parent';

const AUTH_FORM_TIMEOUT_MS = 800;

function RegisterForm() {
  const { user, loading, signUp } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as Role | null;
  const isFr = language === 'fr';

  const [role, setRole] = useState<Role>(roleParam || 'parent');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const showSpinner = loading && !authTimeoutExpired;

  useEffect(() => {
    if (!loading && user) {
      window.location.href = '/dashboard';
    }
  }, [user, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const result = await signUp({
        email,
        password,
        firstName,
        lastName,
        role: 'candidate',
        language,
        extraMetadata: { teach_role: role },
      });

      const userId = result?.user?.id;
      if (userId) {
        if (role === 'teacher') {
          await supabase.from('teacher_profiles').insert({
            id: userId,
            verification_status: 'pending',
          });
        } else {
          await supabase.from('parent_profiles').insert({ id: userId });
        }

        try {
          fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                action: 'welcome',
                user_id: userId,
                role,
              }),
            }
          ).catch((err) => console.warn('[Email welcome] Non envoyé:', err));
        } catch (err) {
          console.warn('[Email welcome] Non envoyé:', err);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);
    } catch (err: any) {
      console.error('Signup error:', err);
      const msg = err?.message || '';
      if (
        msg.includes('already registered') ||
        msg.includes('already been registered')
      ) {
        setError(
          isFr
            ? 'Cet email est déjà utilisé.'
            : 'This email is already in use.'
        );
      } else {
        setError(
          msg ||
            (isFr
              ? 'Une erreur est survenue. Réessayez.'
              : 'Something went wrong. Try again.')
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isParent = role === 'parent';

  // 🎨 Deux identités visuelles distinctes
  // Parent = rouge (marque principale) / Enseignant = bleu (éducatif, professionnel)
  const accent = isParent
    ? {
        // 🔴 PARENT — Rouge marque
        ring: 'focus:border-red-500 focus:ring-4 focus:ring-red-500/10',
        gradientFrom: 'from-red-500',
        gradientTo: 'to-red-600',
        shadow: 'shadow-red-500/30',
        blob1: 'rgba(239,68,68,0.4)',
        blob2: 'rgba(239,68,68,0.15)',
        welcomeText: 'text-red-400',
        accentText: 'text-red-400',
        // Sélecteur
        selectedBorder: 'border-red-500',
        selectedShadow: 'shadow-red-500/10',
        selectedIconBg: 'bg-red-100',
        selectedIconText: 'text-red-500',
        selectedText: 'text-red-600',
        // Icône focus inputs
        inputFocusIcon: 'group-focus-within:text-red-500',
        // Lien "Se connecter"
        linkHover: 'text-red-500 hover:text-red-600',
        // Icône succès
        successIcon: 'from-red-500 to-red-600',
        successShadow: 'shadow-red-500/30',
      }
    : {
        // 🔵 ENSEIGNANT — Bleu éducatif
        ring: 'focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10',
        gradientFrom: 'from-blue-500',
        gradientTo: 'to-blue-600',
        shadow: 'shadow-blue-500/30',
        blob1: 'rgba(59,130,246,0.4)',
        blob2: 'rgba(59,130,246,0.15)',
        welcomeText: 'text-blue-400',
        accentText: 'text-blue-400',
        // Sélecteur
        selectedBorder: 'border-blue-500',
        selectedShadow: 'shadow-blue-500/10',
        selectedIconBg: 'bg-blue-100',
        selectedIconText: 'text-blue-600',
        selectedText: 'text-blue-700',
        // Icône focus inputs
        inputFocusIcon: 'group-focus-within:text-blue-500',
        // Lien "Se connecter"
        linkHover: 'text-blue-500 hover:text-blue-600',
        // Icône succès
        successIcon: 'from-blue-500 to-blue-600',
        successShadow: 'shadow-blue-500/30',
      };

  if (showSpinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffafa]">
        <Loader2 size={24} className="animate-spin text-red-500" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-white">
        <div className="relative hidden lg:flex flex-col justify-between bg-slate-900 text-white overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)
              `,
              backgroundSize: '56px 56px',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
            style={{
              background: `radial-gradient(circle, ${accent.blob1} 0%, rgba(0,0,0,0) 70%)`,
            }}
          />
          <div className="relative z-10 p-10 lg:p-14">
            <Link
              href="/"
              prefetch
              className="font-bold text-xl tracking-tight text-white inline-block"
            >
              {BRAND.name}
            </Link>
          </div>
          <div className="relative z-10 px-10 lg:px-14 max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05]">
              {isFr ? (
                <>
                  Bienvenue dans
                  <br />
                  <span className={accent.accentText}>la famille.</span>
                </>
              ) : (
                <>
                  Welcome to
                  <br />
                  <span className={accent.accentText}>the family.</span>
                </>
              )}
            </h1>
          </div>
          <div className="relative z-10 p-10 lg:p-14 text-xs text-slate-500">
            © {new Date().getFullYear()} {BRAND.name}.
          </div>
        </div>

        <div className="flex flex-col bg-[#fffafa]">
          <div className="flex items-center justify-between px-6 lg:px-12 py-6">
            <Link
              href="/"
              prefetch
              className="lg:hidden font-bold text-lg tracking-tight text-slate-900"
            >
              {BRAND.name}
            </Link>
            <Link
              href="/"
              prefetch
              className="hidden lg:inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft size={12} />
              {isFr ? 'Accueil' : 'Home'}
            </Link>
            <LanguageSwitcher />
          </div>

          <div className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
            <div className="w-full max-w-md text-center">
              <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${accent.successIcon} flex items-center justify-center mx-auto mb-6 shadow-xl ${accent.successShadow}`}>
                <CheckCircle2 size={36} className="text-white" strokeWidth={2.5} />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                {isFr ? 'Compte créé.' : 'Account created.'}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-6">
                {isFr
                  ? 'Bienvenue sur Kalanden. Nous vous redirigeons vers votre espace.'
                  : 'Welcome to Kalanden. Redirecting you to your space.'}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 text-xs text-slate-500">
                <Loader2 size={12} className="animate-spin" />
                {isFr ? 'Redirection…' : 'Redirecting…'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">

      {/* ═══════════ COLONNE GAUCHE — BRANDING ═══════════ */}
      <div className="relative hidden lg:flex flex-col justify-between bg-slate-900 text-white overflow-hidden">

        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
          }}
        />

        <div
          aria-hidden="true"
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${accent.blob1} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full transition-colors duration-700"
          style={{
            background: `radial-gradient(circle, ${accent.blob2} 0%, rgba(0,0,0,0) 70%)`,
          }}
        />

        <div className="relative z-10 p-10 lg:p-14">
          <Link
            href="/"
            prefetch
            className="font-bold text-xl tracking-tight text-white inline-block"
          >
            {BRAND.name}
          </Link>
        </div>

        <div className="relative z-10 px-10 lg:px-14 max-w-xl">
          <p
            className={`text-xs uppercase tracking-widest ${accent.welcomeText} mb-6 transition-colors`}
          >
            {isParent
              ? isFr
                ? 'Côté parents'
                : 'For parents'
              : isFr
                ? 'Côté enseignants'
                : 'For teachers'}
          </p>

          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05] mb-6">
            {isParent
              ? isFr
                ? (
                    <>
                      Trouvez le prof
                      <br />
                      <span className={accent.accentText}>
                        qui fera la différence.
                      </span>
                    </>
                  )
                : (
                    <>
                      Find the teacher
                      <br />
                      <span className={accent.accentText}>
                        who makes a difference.
                      </span>
                    </>
                  )
              : isFr
                ? (
                    <>
                      Donnez des cours,
                      <br />
                      <span className={accent.accentText}>
                        recevez des demandes.
                      </span>
                    </>
                  )
                : (
                    <>
                      Give lessons,
                      <br />
                      <span className={accent.accentText}>
                        receive requests.
                      </span>
                    </>
                  )}
          </h1>

          <p className="text-base text-slate-300 leading-relaxed mb-10 max-w-md">
            {isParent
              ? isFr
                ? 'Filtrez, consultez, contactez. Tout est gratuit pour les familles.'
                : 'Filter, browse, contact. All free for families.'
              : isFr
                ? 'Créez votre profil, fixez vos tarifs, recevez des demandes de parents près de chez vous.'
                : 'Create your profile, set your rates, receive requests from parents near you.'}
          </p>

          <ul className="space-y-4 max-w-md">
            {(isParent
              ? [
                  { fr: 'Profils vérifiés', en: 'Verified profiles' },
                  {
                    fr: 'Contact direct avec le prof',
                    en: 'Direct contact with teachers',
                  },
                  {
                    fr: 'Sans engagement, sans abonnement',
                    en: 'No commitment, no subscription',
                  },
                ]
              : [
                  {
                    fr: 'Profil gratuit et visible',
                    en: 'Free and visible profile',
                  },
                  { fr: 'Vous fixez vos tarifs', en: 'You set your rates' },
                  {
                    fr: 'Les parents vous contactent directement',
                    en: 'Parents contact you directly',
                  },
                ]
            ).map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-slate-300"
              >
                <CheckCircle2
                  size={16}
                  className={`shrink-0 mt-0.5 transition-colors ${accent.accentText}`}
                />
                <span>{isFr ? item.fr : item.en}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 p-10 lg:p-14 text-xs text-slate-500">
          © {new Date().getFullYear()} {BRAND.name}.{' '}
          {isFr ? 'Tous droits réservés.' : 'All rights reserved.'}
        </div>
      </div>

      {/* ═══════════ COLONNE DROITE — FORMULAIRE ═══════════ */}
      <div className="flex flex-col bg-[#fffafa]">

        <div className="flex items-center justify-between px-6 lg:px-12 py-6">
          <Link
            href="/"
            prefetch
            className="lg:hidden font-bold text-lg tracking-tight text-slate-900"
          >
            {BRAND.name}
          </Link>
          <Link
            href="/"
            prefetch
            className="hidden lg:inline-flex items-center gap-2 text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={12} />
            {isFr ? 'Retour à l’accueil' : 'Back to home'}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 lg:px-12 pb-12">
          <div className="w-full max-w-md">

            <div className="mb-8">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight text-slate-900">
                {isFr ? 'Créer votre compte.' : 'Create your account.'}
              </h2>
            </div>

            {/* ─── Sélecteur de rôle ─── */}
            <div className="mb-7">
              <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-3">
                {isFr ? 'Je suis…' : 'I am…'}
              </label>
              <div className="grid grid-cols-2 gap-3">

                {/* 🔴 PARENT */}
                <button
                  type="button"
                  onClick={() => setRole('parent')}
                  className={`group relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    isParent
                      ? 'border-red-500 bg-white shadow-lg shadow-red-500/10 -translate-y-0.5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isParent ? 'bg-red-100' : 'bg-slate-100'
                    }`}
                  >
                    <Users
                      size={20}
                      className={isParent ? 'text-red-500' : 'text-slate-500'}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        isParent ? 'text-red-600' : 'text-slate-700'
                      }`}
                    >
                      {isFr ? 'Parent' : 'Parent'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      {isFr ? 'Je cherche un prof' : 'I’m looking for a teacher'}
                    </p>
                  </div>
                </button>

                {/* 🔵 ENSEIGNANT */}
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`group relative flex flex-col items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    !isParent
                      ? 'border-blue-500 bg-white shadow-lg shadow-blue-500/10 -translate-y-0.5'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      !isParent ? 'bg-blue-100' : 'bg-slate-100'
                    }`}
                  >
                    <GraduationCap
                      size={20}
                      className={!isParent ? 'text-blue-600' : 'text-slate-500'}
                    />
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold transition-colors ${
                        !isParent ? 'text-blue-700' : 'text-slate-700'
                      }`}
                    >
                      {isFr ? 'Enseignant' : 'Teacher'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                      {isFr ? 'Je donne des cours' : 'I give lessons'}
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ─── Formulaire ─── */}
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-2">
                    {isFr ? 'Prénom' : 'First name'}
                  </label>
                  <div className="relative group">
                    <User
                      size={16}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-slate-400 ${accent.inputFocusIcon}`}
                    />
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder={isFr ? 'Votre prénom' : 'Your first name'}
                      required
                      autoComplete="given-name"
                      className={`w-full h-12 pl-10 pr-3 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:outline-none ${accent.ring} border-slate-200 hover:border-slate-300`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-2">
                    {isFr ? 'Nom' : 'Last name'}
                  </label>
                  <div className="relative group">
                    <User
                      size={16}
                      className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-slate-400 ${accent.inputFocusIcon}`}
                    />
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder={isFr ? 'Votre nom' : 'Your last name'}
                      required
                      autoComplete="family-name"
                      className={`w-full h-12 pl-10 pr-3 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:outline-none ${accent.ring} border-slate-200 hover:border-slate-300`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-slate-400 ${accent.inputFocusIcon}`}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    required
                    autoComplete="email"
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:outline-none ${accent.ring} border-slate-200 hover:border-slate-300`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-2">
                  {isFr ? 'Mot de passe' : 'Password'}
                </label>
                <div className="relative group">
                  <Lock
                    size={16}
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors text-slate-400 ${accent.inputFocusIcon}`}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={isFr ? 'Min. 6 caractères' : 'Min. 6 characters'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-all focus:outline-none ${accent.ring} border-slate-200 hover:border-slate-300`}
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className={`w-full h-12 rounded-xl text-white font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 bg-gradient-to-b ${accent.gradientFrom} ${accent.gradientTo} hover:shadow-lg ${accent.shadow} active:scale-[0.99] hover:-translate-y-0.5`}
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting
                  ? isFr
                    ? 'Création en cours…'
                    : 'Creating account…'
                  : isFr
                    ? 'Créer mon compte'
                    : 'Create my account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                {isFr ? 'Déjà un compte ?' : 'Already have an account?'}{' '}
                <Link
                  href="/login"
                  prefetch
                  className={`font-semibold transition-colors ${accent.linkHover}`}
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </Link>
              </p>
            </div>

            <p className="text-xs text-slate-400 text-center mt-6 leading-relaxed max-w-sm mx-auto">
              {isFr
                ? 'En créant un compte, vous acceptez nos conditions d’utilisation et notre politique de confidentialité.'
                : 'By creating an account, you accept our terms of use and privacy policy.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#fffafa]">
          <Loader2 size={24} className="animate-spin text-red-500" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}