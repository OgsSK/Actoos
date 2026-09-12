'use client';

import { useEffect, useState } from 'react';
import {
  LogOut, Mail, User as UserIcon, Shield, Lock, Monitor,
  Globe, ArrowRight, Briefcase, Search, Pencil,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type Language = 'fr' | 'en';

interface ProductCard {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
  disabled?: boolean;
}

interface Translation {
  hello: string;
  myProducts: string;
  security: string;
  profile: string;
  logout: string;
  logoutDesc: string;
  signOutBtn: string;
  password: string;
  passwordSubtitle: string;
  twoFactor: string;
  twoFactorSubtitle: string;
  sessions: string;
  sessionsSubtitle: string;
  fullName: string;
  language: string;
  languageSubtitle: string;
  edit: string;
  activate: string;
  view: string;
  soon: string;
  roleAdmin: string;
  roleCompany: string;
  roleCandidate: string;
  roleUser: string;
  footer: string;
  studioDesc: string;
  jobsDesc: string;
}

const TRANSLATIONS: Record<Language, Translation> = {
  fr: {
    hello: 'Bonjour',
    myProducts: 'Mes produits',
    security: 'Sécurité',
    profile: 'Mon profil',
    logout: 'Déconnexion',
    logoutDesc: 'Vous serez déconnecté de tous les produits Actoos sur ce navigateur.',
    signOutBtn: 'Se déconnecter',
    password: 'Mot de passe',
    passwordSubtitle: 'Modifié il y a peu',
    twoFactor: 'Authentification à deux facteurs',
    twoFactorSubtitle: 'Protégez votre compte avec un code de sécurité',
    sessions: 'Sessions actives',
    sessionsSubtitle: 'Appareils connectés à votre compte',
    fullName: 'Nom complet',
    language: "Langue d'affichage",
    languageSubtitle: "Langue d'affichage de l'interface",
    edit: 'Modifier',
    activate: 'Activer',
    view: 'Voir',
    soon: 'Bientôt',
    roleAdmin: 'Administrateur',
    roleCompany: 'Entreprise',
    roleCandidate: 'Candidat',
    roleUser: 'Utilisateur',
    footer: 'Actoos ID — Un compte pour tous vos produits',
    studioDesc: 'Gérez vos projets custom et suivez leur avancement',
    jobsDesc: 'Candidatures, offres et recrutement',
  },
  en: {
    hello: 'Hello',
    myProducts: 'My products',
    security: 'Security',
    profile: 'My profile',
    logout: 'Sign out',
    logoutDesc: 'You will be signed out of all Actoos products on this browser.',
    signOutBtn: 'Sign out',
    password: 'Password',
    passwordSubtitle: 'Recently changed',
    twoFactor: 'Two-factor authentication',
    twoFactorSubtitle: 'Protect your account with a security code',
    sessions: 'Active sessions',
    sessionsSubtitle: 'Devices connected to your account',
    fullName: 'Full name',
    language: 'Display language',
    languageSubtitle: 'Interface display language',
    edit: 'Edit',
    activate: 'Enable',
    view: 'View',
    soon: 'Soon',
    roleAdmin: 'Administrator',
    roleCompany: 'Company',
    roleCandidate: 'Candidate',
    roleUser: 'User',
    footer: 'Actoos ID — One account for all your products',
    studioDesc: 'Manage your custom projects and track progress',
    jobsDesc: 'Applications, offers and recruitment',
  },
};

export default function AccountPage() {
  const { user, profile, loading, signOut, isAdmin, isCompany, isCandidate } = useAuth();
  const [language, setLanguage] = useState<Language>('fr');

  // Charge la langue depuis localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('actoos-id-language');
    if (stored === 'fr' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  // Persiste le changement de langue
  const changeLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('actoos-id-language', lang);
    }
  };

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const t = TRANSLATIONS[language];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
      </div>
    );
  }

  if (!user) return null;

  const fullName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.firstName || profile?.lastName || user.email?.split('@')[0] || 'Utilisateur';

  const initials = (() => {
    const f = profile?.firstName?.[0] || '';
    const l = profile?.lastName?.[0] || '';
    return (f + l).toUpperCase() || user.email?.[0]?.toUpperCase() || '?';
  })();

  const roleLabel = isAdmin
    ? t.roleAdmin
    : isCompany
    ? t.roleCompany
    : isCandidate
    ? t.roleCandidate
    : t.roleUser;

  // Produits : uniquement les produits finis et en production
  const products: ProductCard[] = [
    {
      id: 'studio',
      name: 'Actoos Studio',
      description: t.studioDesc,
      url: 'https://actoos.com/studio/account',
      icon: Briefcase,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      id: 'jobs',
      name: 'Actoos Jobs',
      description: t.jobsDesc,
      url: 'https://jobs.actoos.com',
      icon: Search,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">

      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Actoos" className="h-8 w-8 object-contain" />
            <span className="font-bold text-base tracking-tight">Actoos ID</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="https://actoos.com" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Vitrine
            </a>
            <a href="https://jobs.actoos.com" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Jobs
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* En-tête profil */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
              {fullName}
            </h1>
            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1 truncate">
              <Mail size={13} />
              {user.email}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              <Shield size={12} />
              {roleLabel}
            </div>
          </div>
        </div>

        {/* Mes produits */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.myProducts}
          </h2>
          <div className="space-y-3">
            {products.map(p => {
              const Icon = p.icon;
              return (
                <a
                  key={p.id}
                  href={p.url}
                  className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors group"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.iconBg}`}>
                    <Icon size={20} className={p.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base text-slate-900">
                      {p.name}
                    </h3>
                    <p className="text-xs mt-0.5 text-slate-500">
                      {p.description}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </a>
              );
            })}
          </div>
        </section>

        {/* Sécurité */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.security}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <Row
              icon={Lock}
              title={t.password}
              subtitle={t.passwordSubtitle}
              action={<button className="text-xs font-medium text-blue-600 hover:text-blue-700">{t.edit}</button>}
            />
            <Row
              icon={Shield}
              title={t.twoFactor}
              subtitle={t.twoFactorSubtitle}
              action={<button className="text-xs font-medium text-blue-600 hover:text-blue-700">{t.activate}</button>}
            />
            <Row
              icon={Monitor}
              title={t.sessions}
              subtitle={t.sessionsSubtitle}
              action={<button className="text-xs font-medium text-blue-600 hover:text-blue-700">{t.view}</button>}
            />
          </div>
        </section>

        {/* Profil */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.profile}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <Row
              icon={UserIcon}
              title={t.fullName}
              subtitle={fullName}
              action={<button className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"><Pencil size={11} />{t.edit}</button>}
            />
            <Row
              icon={Globe}
              title={t.language}
              subtitle={t.languageSubtitle}
              action={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => changeLanguage('fr')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${language === 'fr' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >FR</button>
                  <button
                    onClick={() => changeLanguage('en')}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${language === 'en' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >EN</button>
                </div>
              }
            />
          </div>
        </section>

        {/* Déconnexion */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">{t.logout}</h3>
            <p className="text-sm text-slate-500 mb-4">
              {t.logoutDesc}
            </p>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={15} />
              {t.signOutBtn}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 pb-8 text-center">
          <p className="text-xs text-slate-400">{t.footer}</p>
        </footer>
      </main>
    </div>
  );
}

// ---------- Sous-composant Row ----------
function Row({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 p-4">
      <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{title}</p>
        {subtitle && <p className="text-xs text-slate-500 truncate mt-0.5">{subtitle}</p>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}