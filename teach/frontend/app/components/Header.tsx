'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu, X, LogOut, Settings, LayoutDashboard, GraduationCap,
  Heart, ChevronRight, Search,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { BRAND } from '@/lib/constants';
import LanguageSwitcher from './LanguageSwitcher';

const ACTOOS_ID_BASE =
  process.env.NODE_ENV === 'production'
    ? 'https://id.actoos.com'
    : 'http://localhost:3001';

// ⏱ Après ce délai, on n'attend plus authLoading : on affiche les boutons guest
const AUTH_SKELETON_TIMEOUT_MS = 800;

export default function Header() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { language } = useLanguage();
  const { isTeacher, isParent } = useTeachRole();
  const pathname = usePathname();

  const isFr = language === 'fr';
  const [mobileOpen, setMobileOpen] = useState(false);

  // ⏱ Timeout local : après 800 ms, on arrête d'afficher le skeleton
  const [authSkeletonExpired, setAuthSkeletonExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthSkeletonExpired(true), AUTH_SKELETON_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // Skeleton uniquement si on charge ET que le timeout n'a pas expiré
  const showAuthSkeleton = authLoading && !authSkeletonExpired;

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  async function handleSignOut() {
    await signOut();
    window.location.href = '/';
  }

  const displayName =
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name]
      .filter(Boolean)
      .join(' ') ||
    user?.email?.split('@')[0] ||
    '';

  const initials =
    (
      (user?.user_metadata?.first_name?.[0] ?? '') +
      (user?.user_metadata?.last_name?.[0] ?? '')
    ).toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?';

  const navLinks = [
    { href: '/teachers', label: isFr ? 'Trouver un prof' : 'Find a teacher' },
    ...(!showAuthSkeleton && !user
      ? [{
          href: '/register?role=teacher',
          label: isFr ? 'Devenir enseignant' : 'Become a teacher',
        }]
      : []),
  ];

  return (
    <>
      {/* ═══════════ BARRE PRINCIPALE ═══════════ */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* Logo + nav */}
          <div className="flex items-center gap-3 lg:gap-6 min-w-0">
            <Link href="/" prefetch className="flex items-center gap-2 shrink-0" aria-label={BRAND.name}>
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900">
                {BRAND.name}
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    prefetch
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
            <div className="w-px h-5 bg-slate-200 mx-1" />

            {showAuthSkeleton ? (
              <HeaderAuthSkeleton />
            ) : user ? (
              <UserDropdown
                initials={initials}
                displayName={displayName}
                email={user.email || ''}
                isTeacher={isTeacher}
                isParent={isParent}
                isFr={isFr}
                onSignOut={handleSignOut}
              />
            ) : (
              <>
                <Link
                  href="/login"
                  prefetch
                  className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </Link>
                <Link
                  href="/register"
                  prefetch
                  className="inline-flex items-center justify-center h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-full shadow-sm transition-colors"
                >
                  {isFr ? 'Créer un compte' : 'Create account'}
                </Link>
              </>
            )}
          </div>

          {/* Actions mobile */}
          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher variant="compact" />

            {showAuthSkeleton ? (
              <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse" />
            ) : user ? (
              <button
                onClick={() => setMobileOpen(true)}
                className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shadow-sm"
                aria-label="Mon compte"
              >
                {initials}
              </button>
            ) : null}

            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ═══════════ OVERLAY ═══════════ */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ═══════════ DRAWER MOBILE ═══════════ */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-white transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-2xl ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200 shrink-0">
          <Link href="/" prefetch onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900">
              {BRAND.name}
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 -mr-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          {showAuthSkeleton ? (
            <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-slate-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          ) : user ? (
            <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold tracking-tight shrink-0 ring-2 ring-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          ) : null}

          <nav className="px-3 py-2">
            {navLinks.map(item => (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <span>{item.label}</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            ))}
          </nav>

          <div className="px-3 py-3 space-y-1 border-t border-slate-100">
            {showAuthSkeleton ? (
              <div className="space-y-2">
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
              </div>
            ) : user ? (
              <>
                <DrawerLink href="/dashboard" icon={LayoutDashboard} onClick={() => setMobileOpen(false)}>
                  {isFr ? 'Mon espace' : 'My space'}
                </DrawerLink>
                {isParent && (
                  <DrawerLink href="/parent/profile/edit" icon={Heart} onClick={() => setMobileOpen(false)}>
                    {isFr ? 'Profil parent' : 'Parent profile'}
                  </DrawerLink>
                )}
                {isTeacher && (
                  <DrawerLink href="/teacher/profile/edit" icon={GraduationCap} onClick={() => setMobileOpen(false)}>
                    {isFr ? 'Profil enseignant' : 'Teacher profile'}
                  </DrawerLink>
                )}
                <DrawerLink href={`${ACTOOS_ID_BASE}/account`} icon={Settings} external>
                  {isFr ? 'Gérer mon compte' : 'Manage my account'}
                </DrawerLink>
              </>
            ) : (
              <div className="space-y-2 pt-1">
                <Link
                  href="/login"
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  {isFr ? 'Se connecter' : 'Sign in'}
                </Link>
                <Link
                  href="/register"
                  prefetch
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-4 py-3 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors"
                >
                  {isFr ? 'Créer un compte' : 'Create account'}
                </Link>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-6" />

          {!showAuthSkeleton && user && (
            <div className="border-t border-slate-200 p-4 shrink-0">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {isFr ? 'Se déconnecter' : 'Sign out'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════
   SKELETON AUTH
   ═══════════════════════════════════════════════════ */

function HeaderAuthSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-10 w-20 rounded-full bg-slate-100 animate-pulse" />
      <div className="h-10 w-32 rounded-full bg-slate-100 animate-pulse" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   USER DROPDOWN
   ═══════════════════════════════════════════════════ */

function UserDropdown({
  initials, displayName, email, isTeacher, isParent, isFr, onSignOut,
}: {
  initials: string;
  displayName: string;
  email: string;
  isTeacher: boolean;
  isParent: boolean;
  isFr: boolean;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!(target as any).closest?.('[data-user-dropdown]')) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('mousedown', close), 0);
    document.addEventListener('keydown', esc);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" data-user-dropdown>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Menu utilisateur"
        className={`w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold tracking-tight shadow-sm transition-all hover:bg-emerald-700 ring-2 ${
          open ? 'ring-emerald-200' : 'ring-transparent hover:ring-emerald-100'
        }`}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{email}</p>
              </div>
            </div>
          </div>

          <div className="py-1.5">
            <DropdownLink href="/dashboard" icon={LayoutDashboard}>
              {isFr ? 'Mon espace' : 'My space'}
            </DropdownLink>
            <DropdownLink href="/teachers" icon={Search}>
              {isFr ? 'Trouver un prof' : 'Find a teacher'}
            </DropdownLink>
            {isParent && (
              <DropdownLink href="/parent/profile/edit" icon={Heart}>
                {isFr ? 'Profil parent' : 'Parent profile'}
              </DropdownLink>
            )}
            {isTeacher && (
              <DropdownLink href="/teacher/profile/edit" icon={GraduationCap}>
                {isFr ? 'Profil enseignant' : 'Teacher profile'}
              </DropdownLink>
            )}
            <div className="my-1 border-t border-slate-100" />
            <DropdownLink href={`${ACTOOS_ID_BASE}/account`} icon={Settings} external>
              {isFr ? 'Gérer mon compte' : 'Manage my account'}
            </DropdownLink>
          </div>

          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100 text-left transition-colors"
          >
            <LogOut className="w-4 h-4" />
            {isFr ? 'Se déconnecter' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

function DropdownLink({
  href, icon: Icon, external, children,
}: {
  href: string;
  icon: React.ElementType;
  external?: boolean;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1.5 transition-colors"
      >
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">{children}</span>
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg mx-1.5 transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="flex-1">{children}</span>
    </Link>
  );
}

function DrawerLink({
  href, icon: Icon, external, onClick, children,
}: {
  href: string;
  icon: React.ElementType;
  external?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  if (external) {
    return (
      <a
        href={href}
        onClick={onClick}
        className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="flex-1">{children}</span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </a>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
    >
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="flex-1">{children}</span>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </Link>
  );
}