'use client';

import { useEffect, useState } from 'react';
import {
  LogOut, Mail, User as UserIcon, Shield, Lock,
  Globe, ArrowRight, Briefcase, Search, Pencil,
  GraduationCap, Check, Trash2,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ChangeEmailModal from '../components/ChangeEmailModal';
import ChangeNameModal from '../components/ChangeNameModal';
import DeleteAccountModal from '../components/DeleteAccountModal';

type Language = 'fr' | 'en';

interface ProductCard {
  id: string;
  name: string;
  descriptionFr: string;
  descriptionEn: string;
  url: string;
  discoverUrl: string;
  icon: LucideIcon;
  color: string;
  iconBg: string;
}

const PRODUCTS: ProductCard[] = [
  {
    id: 'teach',
    name: 'Kalanden',
    descriptionFr: 'Trouver un prof pour vos enfants',
    descriptionEn: 'Find a teacher for your children',
    url: process.env.NODE_ENV === 'production'
      ? 'https://teach.actoos.com'
      : 'http://localhost:3002',
    discoverUrl: process.env.NODE_ENV === 'production'
      ? 'https://teach.actoos.com'
      : 'http://localhost:3002',
    icon: GraduationCap,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  {
    id: 'studio',
    name: 'Actoos Studio',
    descriptionFr: 'Gérez vos projets custom et suivez leur avancement',
    descriptionEn: 'Manage your custom projects and track progress',
    url: process.env.NODE_ENV === 'production'
      ? 'https://actoos.com/studio/account'
      : 'http://localhost:3000/studio/account',
    discoverUrl: process.env.NODE_ENV === 'production'
      ? 'https://actoos.com'
      : 'http://localhost:3000',
    icon: Briefcase,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  {
    id: 'jobs',
    name: 'Actoos Jobs',
    descriptionFr: 'Candidatures, offres et recrutement',
    descriptionEn: 'Applications, offers and recruitment',
    url: process.env.NODE_ENV === 'production'
      ? 'https://jobs.actoos.com'
      : 'http://localhost:3000',
    discoverUrl: process.env.NODE_ENV === 'production'
      ? 'https://jobs.actoos.com'
      : 'http://localhost:3000',
    icon: Search,
    color: 'text-purple-600',
    iconBg: 'bg-purple-50',
  },
];

interface Translation {
  myProducts: string;
  discover: string;
  noProducts: string;
  noProductsDesc: string;
  open: string;
  discoverBtn: string;
  security: string;
  profile: string;
  logout: string;
  logoutDesc: string;
  signOutBtn: string;
  password: string;
  passwordSubtitle: string;
  emailLabel: string;
  fullName: string;
  language: string;
  languageSubtitle: string;
  edit: string;
  roles: string;
  roleAdmin: string;
  roleCompany: string;
  roleCandidate: string;
  roleTeacher: string;
  roleParent: string;
  roleStudioClient: string;
  noRoles: string;
  noRolesDesc: string;
  dangerZone: string;
  dangerZoneDesc: string;
  deleteAccount: string;
  footer: string;
}

const TRANSLATIONS: Record<Language, Translation> = {
  fr: {
    myProducts: 'Mes produits actifs',
    discover: 'Autres produits',
    noProducts: 'Vous n\'utilisez encore aucun produit Actoos.',
    noProductsDesc: 'Découvrez nos produits ci-dessous pour commencer.',
    open: 'Ouvrir',
    discoverBtn: 'Découvrir',
    security: 'Sécurité',
    profile: 'Mon profil',
    logout: 'Déconnexion',
    logoutDesc: 'Vous serez déconnecté de tous les produits Actoos sur ce navigateur.',
    signOutBtn: 'Se déconnecter',
    password: 'Mot de passe',
    passwordSubtitle: 'Modifié il y a peu',
    emailLabel: 'Adresse email',
    fullName: 'Nom complet',
    language: 'Langue d\'affichage',
    languageSubtitle: 'Langue d\'affichage de l\'interface',
    edit: 'Modifier',
    roles: 'Mes rôles Actoos',
    roleAdmin: 'Administrateur',
    roleCompany: 'Entreprise',
    roleCandidate: 'Candidat',
    roleTeacher: 'Enseignant',
    roleParent: 'Parent',
    roleStudioClient: 'Client Studio',
    noRoles: 'Aucun rôle spécifique',
    noRolesDesc: 'Vos rôles apparaîtront ici selon votre utilisation des produits Actoos.',
    dangerZone: 'Zone dangereuse',
    dangerZoneDesc: 'La suppression du compte est définitive et irréversible.',
    deleteAccount: 'Supprimer mon compte',
    footer: 'Actoos ID — Un compte pour tous vos produits',
  },
  en: {
    myProducts: 'My active products',
    discover: 'Other products',
    noProducts: 'You are not using any Actoos product yet.',
    noProductsDesc: 'Discover our products below to get started.',
    open: 'Open',
    discoverBtn: 'Discover',
    security: 'Security',
    profile: 'My profile',
    logout: 'Sign out',
    logoutDesc: 'You will be signed out of all Actoos products on this browser.',
    signOutBtn: 'Sign out',
    password: 'Password',
    passwordSubtitle: 'Recently changed',
    emailLabel: 'Email address',
    fullName: 'Full name',
    language: 'Display language',
    languageSubtitle: 'Interface display language',
    edit: 'Edit',
    roles: 'My Actoos roles',
    roleAdmin: 'Administrator',
    roleCompany: 'Company',
    roleCandidate: 'Candidate',
    roleTeacher: 'Teacher',
    roleParent: 'Parent',
    roleStudioClient: 'Studio Client',
    noRoles: 'No specific role',
    noRolesDesc: 'Your roles will appear here based on how you use Actoos products.',
    dangerZone: 'Danger zone',
    dangerZoneDesc: 'Account deletion is permanent and irreversible.',
    deleteAccount: 'Delete my account',
    footer: 'Actoos ID — One account for all your products',
  },
};

export default function AccountPage() {
  const { user, profile, loading, signOut, isAdmin, isCompany, isCandidate } = useAuth();
  const [language, setLanguage] = useState<Language>('fr');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showChangeName, setShowChangeName] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  // Produits utilisés (détection via Supabase)
  const [usedProducts, setUsedProducts] = useState<Set<string>>(new Set());
  const [usageLoading, setUsageLoading] = useState(true);

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

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/login';
    }
  }, [user, loading]);

  // Détection des produits utilisés
  useEffect(() => {
    if (!user?.id || !user?.email) return;

    let cancelled = false;

    async function checkUsage() {
      try {
        // 1. Vérifier d'abord si l'user est admin
        const { data: userRow } = await supabase
          .from('users')
          .select('is_admin, role')
          .eq('id', user!.id)
          .maybeSingle();

        const isAdminUser =
          userRow?.is_admin === true ||
          userRow?.role === 'admin';

        // 🔥 Si admin → tous les produits sont considérés comme "utilisés"
        if (isAdminUser) {
          if (cancelled) return;
          setUsedProducts(new Set(['teach', 'studio', 'jobs']));
          setUsageLoading(false);
          return;
        }

        // 2. Sinon → détection classique par données
        const [studioRes, jobsCandidateRes, jobsCompanyRes, teachTeacherRes, teachParentRes] = await Promise.all([
          supabase.from('projets').select('id', { count: 'exact', head: true }).eq('client_email', user!.email),
          supabase.from('candidate_profiles').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
          supabase.from('companies').select('id', { count: 'exact', head: true }).eq('owner_id', user!.id),
          supabase.from('teacher_profiles').select('id', { count: 'exact', head: true }).eq('id', user!.id),
          supabase.from('parent_profiles').select('id', { count: 'exact', head: true }).eq('id', user!.id),
        ]);

        if (cancelled) return;

        const used = new Set<string>();
        if ((studioRes.count || 0) > 0) used.add('studio');
        if ((jobsCandidateRes.count || 0) > 0 || (jobsCompanyRes.count || 0) > 0) used.add('jobs');
        if ((teachTeacherRes.count || 0) > 0 || (teachParentRes.count || 0) > 0) used.add('teach');

        setUsedProducts(used);
      } catch (err) {
        console.error('[Account] checkUsage failed:', err);
      } finally {
        if (!cancelled) setUsageLoading(false);
      }
    }

    checkUsage();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

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

  // Rôles détectés
  const roles: { label: string; color: string }[] = [];
  if (isAdmin) roles.push({ label: t.roleAdmin, color: 'bg-purple-50 text-purple-700' });
  if (isCompany) roles.push({ label: t.roleCompany, color: 'bg-blue-50 text-blue-700' });
  if (isCandidate) roles.push({ label: t.roleCandidate, color: 'bg-emerald-50 text-emerald-700' });
  if (usedProducts.has('teach')) roles.push({ label: t.roleTeacher, color: 'bg-emerald-50 text-emerald-700' });
  if (usedProducts.has('studio')) roles.push({ label: t.roleStudioClient, color: 'bg-blue-50 text-blue-700' });

  // Produits utilisés vs non utilisés
  const myProducts = PRODUCTS.filter(p => usedProducts.has(p.id));
  const discoverProducts = PRODUCTS.filter(p => !usedProducts.has(p.id));

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
          </div>
        </div>

        {/* MES PRODUITS */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.myProducts}
          </h2>

          {usageLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-slate-400" />
              <span className="text-sm text-slate-500">{language === 'fr' ? 'Chargement…' : 'Loading…'}</span>
            </div>
          ) : myProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm font-medium text-slate-900 mb-1">{t.noProducts}</p>
              <p className="text-xs text-slate-500">{t.noProductsDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myProducts.map(p => {
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
                        {language === 'fr' ? p.descriptionFr : p.descriptionEn}
                      </p>
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-blue-600 group-hover:text-blue-700">
                      {t.open}
                    </span>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </section>

        {/* AUTRES PRODUITS */}
        {discoverProducts.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              {t.discover}
            </h2>
            <div className="space-y-3">
              {discoverProducts.map(p => {
                const Icon = p.icon;
                return (
                  <a
                    key={p.id}
                    href={p.discoverUrl}
                    className="flex items-center gap-4 bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors group"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${p.iconBg}`}>
                      <Icon size={20} className={p.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base text-slate-900">
                        {p.name}
                      </h3>
                      <p className="text-xs mt-0.5 text-slate-500">
                        {language === 'fr' ? p.descriptionFr : p.descriptionEn}
                      </p>
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-slate-500 group-hover:text-emerald-600 transition-colors">
                      {t.discoverBtn}
                    </span>
                    <ArrowRight size={16} className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* MES RÔLES */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.roles}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            {roles.length === 0 ? (
              <div className="text-center py-2">
                <p className="text-sm text-slate-500 mb-1">{t.noRoles}</p>
                <p className="text-xs text-slate-400">{t.noRolesDesc}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {roles.map((r, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${r.color}`}
                  >
                    <Shield size={12} />
                    {r.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SÉCURITÉ */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.security}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <Row
              icon={Lock}
              title={t.password}
              subtitle={t.passwordSubtitle}
              action={
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {t.edit}
                </button>
              }
            />
          </div>
        </section>

        {/* PROFIL */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            {t.profile}
          </h2>
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
            <Row
              icon={UserIcon}
              title={t.fullName}
              subtitle={fullName}
              action={
                <button
                  onClick={() => setShowChangeName(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Pencil size={11} />{t.edit}
                </button>
              }
            />
            <Row
              icon={Mail}
              title={t.emailLabel}
              subtitle={user.email || ''}
              action={
                <button
                  onClick={() => setShowChangeEmail(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  {t.edit}
                </button>
              }
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

        {/* DÉCONNEXION */}
        <section>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 mb-1">{t.logout}</h3>
            <p className="text-sm text-slate-500 mb-4">{t.logoutDesc}</p>
            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 bg-red-50 text-red-700 px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
            >
              <LogOut size={15} />
              {t.signOutBtn}
            </button>
          </div>
        </section>

        {/* ZONE DANGEREUSE */}
        <section>
          <div className="bg-white rounded-2xl border border-red-200 p-5">
            <h3 className="font-semibold text-red-800 mb-1">{t.dangerZone}</h3>
            <p className="text-sm text-slate-500 mb-4">{t.dangerZoneDesc}</p>
            <button
              onClick={() => setShowDeleteAccount(true)}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors"
            >
              <Trash2 size={15} />
              {t.deleteAccount}
            </button>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="pt-4 pb-8 text-center">
          <p className="text-xs text-slate-400">{t.footer}</p>
        </footer>
      </main>

      {/* Modales */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        language={language}
      />
      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        language={language}
      />
      <ChangeNameModal
        isOpen={showChangeName}
        onClose={() => setShowChangeName(false)}
        language={language}
      />
      <DeleteAccountModal
        isOpen={showDeleteAccount}
        onClose={() => setShowDeleteAccount(false)}
        language={language}
      />
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