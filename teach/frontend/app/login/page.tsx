'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import LanguageSwitcher from '@/app/components/LanguageSwitcher';

// ⏱ Après ce délai, on affiche le formulaire même si authLoading est encore true
const AUTH_FORM_TIMEOUT_MS = 800;

function LoginForm() {
  const { user, loading, signIn, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect');
  const isFr = language === 'fr';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ⏱ Timeout local : on n'attend pas authLoading indéfiniment
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  const showSpinner = loading && !authTimeoutExpired;

  useEffect(() => {
    if (!loading && user) {
      const target = redirect ? decodeURIComponent(redirect) : '/dashboard';
      window.location.href = target;
    }
  }, [user, loading, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    console.log('🟢 [Login] SUBMIT DÉMARRE pour', email);

    try {
      // ✅ FIX : on appelle Supabase DIRECTEMENT, sans passer par authCore.signIn
      // qui fait un appel à une API locale (localhost:8001) qui n'existe pas.
      const t0 = Date.now();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      console.log('🟢 [Login] signInWithPassword retour en', Date.now() - t0, 'ms');

      if (signInError) {
        console.error('🔴 [Login] Erreur:', signInError);
        throw signInError;
      }

      if (!data?.session) {
        console.error('🔴 [Login] Pas de session dans la réponse');
        throw new Error(isFr ? 'Connexion échouée' : 'Login failed');
      }

      console.log('🟢 [Login] Session OK, vérification suspension...');

      // 🚫 Vérifier si le compte est suspendu AVANT de rediriger
      const userId = data.session.user?.id;
      if (userId) {
        const { data: userRow } = await supabase
          .from('users')
          .select('suspended_at')
          .eq('id', userId)
          .maybeSingle();

        if (userRow?.suspended_at) {
          console.log('🔴 [Login] Compte suspendu → /suspended');
          window.location.href = '/suspended';
          return;
        }
      }

      console.log('🟢 [Login] Compte OK, redirection...');

      // Rafraîchit le profil (optionnel, non bloquant)
      try {
        refreshProfile?.();
      } catch (e) {
        console.warn('[Login] refreshProfile error:', e);
      }

      const target = redirect ? decodeURIComponent(redirect) : '/dashboard';
      window.location.href = target;
    } catch (err: any) {
      console.error('🔴 [Login] Exception:', err);
      const msg = err?.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError(isFr ? 'Email ou mot de passe incorrect.' : 'Invalid email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setError(isFr ? 'Confirmez votre email avant de vous connecter.' : 'Confirm your email first.');
      } else if (msg.includes('Too many requests')) {
        setError(isFr ? 'Trop de tentatives. Réessayez dans quelques minutes.' : 'Too many attempts. Try again later.');
      } else {
        setError(msg || (isFr ? 'Identifiants incorrects' : 'Invalid credentials'));
      }
    } finally {
      setSubmitting(false);
      console.log('🟢 [Login] Submit terminé');
    }
  };

  if (showSpinner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={24} className="animate-spin text-slate-400" />
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
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.4) 0%, rgba(16,185,129,0) 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0) 70%)',
          }}
        />

        <div className="relative z-10 p-10 lg:p-14">
          <Link href="/" prefetch className="font-bold text-xl tracking-tight text-white inline-block">
            {BRAND.name}
          </Link>
        </div>

        <div className="relative z-10 px-10 lg:px-14 max-w-xl">
          <p className="text-xs uppercase tracking-widest text-emerald-400/80 mb-6">
            {isFr ? 'Bienvenue' : 'Welcome'}
          </p>
          <h1 className="text-4xl xl:text-5xl font-bold tracking-tight leading-[1.05] mb-6">
            {isFr ? (
              <>
                Le bon prof.
                <br />
                <span className="text-emerald-400">Au bon moment.</span>
              </>
            ) : (
              <>
                The right teacher.
                <br />
                <span className="text-emerald-400">At the right time.</span>
              </>
            )}
          </h1>
          <p className="text-base text-slate-300 leading-relaxed mb-10 max-w-md">
            {isFr
              ? `Retrouvez votre espace ${BRAND.name}, vos profs sauvegardés, et vos échanges en cours.`
              : `Access your ${BRAND.name} space, saved teachers, and current conversations.`}
          </p>

          <ul className="space-y-4 max-w-md">
            {[
              { fr: 'Profils vérifiés, contact direct', en: 'Verified profiles, direct contact' },
              { fr: 'Gratuit pour les parents', en: 'Free for parents' },
              { fr: 'Sans engagement, sans abonnement', en: 'No commitment, no subscription' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
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
      <div className="flex flex-col bg-slate-50">

        <div className="flex items-center justify-between px-6 lg:px-12 py-6">
          <Link href="/" prefetch className="lg:hidden font-bold text-lg tracking-tight text-slate-900">
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

            <div className="mb-10">
              <p className="text-xs uppercase tracking-widest text-emerald-600 font-medium mb-3">
                {isFr ? 'Connexion' : 'Sign in'}
              </p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-3">
                {isFr ? 'Content de vous revoir.' : 'Good to see you again.'}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                {isFr
                  ? 'Entrez vos identifiants pour continuer.'
                  : 'Enter your credentials to continue.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium mb-2">
                  Email
                </label>
                <div className="relative group">
                  <Mail
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 pointer-events-none transition-colors"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    required
                    autoComplete="email"
                    className="w-full h-12 pl-10 pr-4 border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <label className="block text-xs uppercase tracking-widest text-slate-500 font-medium">
                    {isFr ? 'Mot de passe' : 'Password'}
                  </label>
                  <Link
                    href="/forgot-password"
                    prefetch
                    className="text-xs text-slate-500 hover:text-emerald-600 transition-colors"
                  >
                    {isFr ? 'Oublié ?' : 'Forgot?'}
                  </Link>
                </div>
                <div className="relative group">
                  <Lock
                    size={15}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 pointer-events-none transition-colors"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="w-full h-12 pl-10 pr-4 border border-slate-200 bg-white text-sm focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10 transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50/60 p-3.5 text-sm text-red-800">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {isFr ? 'Se connecter' : 'Sign in'}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                {isFr ? 'Pas encore de compte ?' : 'No account yet?'}{' '}
                <Link
                  href="/register"
                  prefetch
                  className="font-semibold text-emerald-600 border-b border-emerald-600 pb-0.5 hover:text-emerald-700 hover:border-emerald-700 transition-colors"
                >
                  {isFr ? "S'inscrire" : 'Sign up'}
                </Link>
              </p>
            </div>

            <p className="text-xs text-slate-400 text-center mt-8 leading-relaxed max-w-sm mx-auto">
              {isFr
                ? 'En continuant, vous acceptez nos conditions d’utilisation et notre politique de confidentialité.'
                : 'By continuing, you accept our terms of use and privacy policy.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}