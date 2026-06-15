import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import HeaderPreferences from './HeaderPreferences';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

import {
  Briefcase,
  Menu,
  X,
  User,
  Building2,
  ChevronDown,
  LogOut,
  Settings,
  LayoutDashboard,
  Shield,
  Bell,
} from 'lucide-react';

import { cn } from '../lib/utils';

const Header = ({ user, onLogout }) => {
  const { t } = useTranslation();
  const { isAdmin, isCompany, isCandidate, profile } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const navLinks = useMemo(
    () => [
      { label: t('header.nav.jobs'), href: '/emplois' },
      { label: t('header.nav.companies'), href: '/entreprises' },
      ...(isCompany ? [{ label: t('header.nav.pricing'), href: '/tarifs' }] : []),
      { label: t('header.nav.blog'), href: '/blog' },
    ],
    [t, isCompany]
  );

  const getInitials = () => {
    if (!user) return '?';
    const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || '';
    const lastName = user.user_metadata?.last_name || '';
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    return initials || firstName.slice(0, 2).toUpperCase() || '?';
  };

  const displayEmail = user?.email || '';
  const profileLink = isCompany ? '/dashboard/entreprise/profil' : '/profil';

  const handleLogout = () => {
    setMobileMenuOpen(false);
    onLogout();
    navigate('/connexion');
  };

  // ----- STYLES DYNAMIQUES -----
  const headerClasses = cn(
    'sticky top-0 left-0 right-0 z-50 transition-all duration-300',
    'lg:bg-white/90 lg:backdrop-blur-xl lg:border-b lg:border-slate-200/50',
    scrolled
      ? 'lg:bg-white/80 lg:shadow-[0_1px_3px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)]'
      : 'lg:shadow-none',
    'bg-white border-b border-slate-100',
    scrolled && 'shadow-sm'
  );

  const containerClasses = cn(
    'mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300',
    scrolled ? 'py-2' : 'py-3'
  );

  const logoClasses = cn(
    'w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 text-white shadow-sm transition-all duration-300',
    scrolled && 'sm:w-8 sm:h-8 w-7 h-7'
  );

  const subtitleClasses = cn(
    'hidden sm:block text-[11px] leading-none mt-0.5 text-slate-400 font-normal transition-all duration-300',
    scrolled && 'sm:hidden'
  );

  return (
    <header className={headerClasses}>
      <div className={containerClasses}>
        {/* Barre principale */}
        <div className="flex items-center justify-between gap-3">
          {/* Logo + marque */}
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0 group">
            <div className={logoClasses}>
              <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:scale-110" />
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  'font-semibold text-sm sm:text-lg leading-none whitespace-nowrap text-slate-900 transition-all duration-300',
                  scrolled && 'sm:text-base'
                )}
              >
                {t('header.brand')}
              </span>
              <span className={subtitleClasses}>Talent marketplace</span>
            </div>
          </Link>

          {/* Mobile : sélecteurs + burger */}
          <div className="lg:hidden flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <HeaderPreferences isMobile />
              <LanguageSwitcher isMobile />
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg transition-all duration-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Desktop : actions utilisateur + dropdown nouvelle génération */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(profileLink)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 max-w-[260px] hover:bg-slate-50"
                >
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                      {getInitials()}
                    </div>
                    <span className="absolute bottom-0 right-0 block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white translate-x-1/4 translate-y-1/4" />
                  </div>
                  <div className="hidden xl:flex flex-col items-start min-w-0 text-left leading-tight">
                    <span className="text-sm font-medium truncate w-full text-slate-900">
                      {user.user_metadata?.first_name || t('header.user.defaultName')}
                    </span>
                    <span className="text-xs truncate w-full text-slate-400 font-normal">
                      {displayEmail}
                    </span>
                  </div>
                </button>

                {/* ====== DROPDOWN NOUVELLE GÉNÉRATION ====== */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full shrink-0 transition-all text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    sideOffset={12}
                    className={cn(
                      'dropdown-newgen',
                      'w-64 rounded-2xl border border-white/20 bg-white/70 backdrop-blur-3xl p-2',
                      'shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_2px_4px_rgba(0,0,0,0.02),0_12px_28px_-4px_rgba(0,0,0,0.08),0_0_0_0.5px_rgba(0,0,0,0.05)]',
                      'ring-1 ring-black/5',
                      'z-[9999]'
                    )}
                  >
                    {/* Dashboard */}
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:-translate-y-px focus:bg-white/60"
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <LayoutDashboard className="relative w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-slate-900">
                        {t('header.user.dashboard')}
                      </span>
                    </DropdownMenuItem>

                    {/* Profil */}
                    <DropdownMenuItem
                      onClick={() => navigate(profileLink)}
                      className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:-translate-y-px focus:bg-white/60"
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <User className="relative w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-slate-900">
                        {t('header.user.profile')}
                      </span>
                    </DropdownMenuItem>

                    {/* Alertes (candidat) */}
                    {isCandidate && (
                      <DropdownMenuItem
                        onClick={() => navigate('/alertes')}
                        className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:-translate-y-px focus:bg-white/60"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Bell className="relative w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                        <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-slate-900">
                          {t('header.user.createAlert')}
                        </span>
                      </DropdownMenuItem>
                    )}

                    {/* Paramètres */}
                    <DropdownMenuItem
                      onClick={() => navigate('/parametres')}
                      className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:-translate-y-px focus:bg-white/60"
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Settings className="relative w-4 h-4 mr-3 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-slate-900">
                        {t('header.user.settings')}
                      </span>
                    </DropdownMenuItem>

                    {/* Admin */}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="my-1.5 border-slate-200/50" />
                        <DropdownMenuItem
                          onClick={() => navigate('/admin')}
                          className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-white/60 hover:shadow-sm hover:-translate-y-px focus:bg-white/60"
                        >
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Shield className="relative w-4 h-4 mr-3 text-purple-400 group-hover:text-purple-500 transition-colors" />
                          <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-slate-900">
                            {t('header.user.admin')}
                          </span>
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Plan (entreprise) */}
                    {isCompany && (
                      <DropdownMenuItem
                        disabled
                        className="mt-1 opacity-100 !cursor-default rounded-xl px-3 py-2.5"
                      >
                        <Badge className="bg-blue-50/60 text-blue-600/80 border border-blue-100/50 backdrop-blur-sm text-xs font-medium px-2 py-0.5 rounded-lg">
                          {t('header.user.plan', { plan: profile?.subscription_plan || 'free' })}
                        </Badge>
                      </DropdownMenuItem>
                    )}

                    {/* Déconnexion */}
                    <DropdownMenuSeparator className="my-1.5 border-slate-200/50" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer group relative rounded-xl px-3 py-2.5 transition-all duration-200 hover:bg-red-50/80 hover:shadow-sm hover:-translate-y-px focus:bg-red-50/80"
                    >
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <LogOut className="relative w-4 h-4 mr-3 text-red-400 group-hover:text-red-500 transition-colors" />
                      <span className="relative font-medium tracking-tight text-slate-700 group-hover:text-red-600">
                        {t('header.user.logout')}
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/connexion">
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 font-medium"
                  >
                    {t('header.auth.login')}
                  </Button>
                </Link>
                <Link to="/inscription">
                  <Button className="rounded-full px-5 shadow-sm bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 font-medium">
                    {t('header.auth.register')}
                  </Button>
                </Link>
                <Link to="/inscription?type=entreprise">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full px-4 shrink-0 hidden xl:inline-flex border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-medium"
                  >
                    <Building2 className="w-4 h-4" />
                    {t('header.auth.companySpace')}
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Ligne secondaire desktop : navigation + langue/devise */}
      <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-t border-slate-100/70 pt-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <nav className="flex flex-wrap items-center gap-x-8 gap-y-2 min-w-0">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href;
            return (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'relative text-sm font-medium transition-all duration-200 whitespace-nowrap px-1 py-2 text-slate-500 hover:text-blue-600',
                  isActive && 'text-blue-600'
                )}
              >
                <span className="relative">
                  {link.label}
                  <span
                    className={cn(
                      'absolute -bottom-2 left-0 h-0.5 rounded-full transition-all duration-200',
                      isActive ? 'w-full bg-blue-600' : 'w-0'
                    )}
                  />
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
          <LanguageSwitcher isTransparent={false} />
          <HeaderPreferences isTransparent={false} />
        </div>
      </div>

      {/* ====== MENU MOBILE CORRIGÉ ====== */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[9999] transition-all duration-300',
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        {/* Panneau mobile – verre lisible */}
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-[86%] max-w-sm',
            'bg-white/70 backdrop-blur-xl',
            'border-l border-white/20',
            'shadow-[0_0_0_1px_rgba(255,255,255,0.2),-4px_0_20px_rgba(0,0,0,0.08)]',
            'ring-1 ring-black/5',
            'transition-all duration-300 ease-out',
            mobileMenuOpen ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          )}
        >
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full bg-slate-100/80 backdrop-blur-sm hover:bg-slate-200/80 transition-colors text-slate-500"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-5 py-5 pt-16 space-y-5 overflow-y-auto h-full">
            {/* Infos utilisateur */}
            {user && (
              <div className="flex items-center gap-3 pb-5 border-b border-slate-200/40">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm">
                  {getInitials()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.user_metadata?.first_name || t('header.user.defaultUser')}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{displayEmail}</p>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-xl px-4 py-3 text-[15px] font-medium transition-all',
                      isActive
                        ? 'bg-blue-50/60 text-blue-700'
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                    )}
                  >
                    <span>{link.label}</span>
                    <span className="text-xs opacity-40">→</span>
                  </Link>
                );
              })}
            </div>

            {/* Actions utilisateur */}
            <div className="pt-4 border-t border-slate-200/40 space-y-3">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl justify-start bg-slate-900 text-white hover:bg-slate-800">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t('header.user.dashboard')}
                    </Button>
                  </Link>
                  <Link to={profileLink} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl justify-start border-slate-200 text-slate-700 hover:bg-white/50">
                      <User className="w-4 h-4 mr-2" />
                      {t('header.user.profile')}
                    </Button>
                  </Link>
                  {isCandidate && (
                    <Link to="/alertes" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl justify-start border-slate-200 text-slate-700 hover:bg-white/50">
                        <Bell className="w-4 h-4 mr-2" />
                        {t('header.user.createAlert')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/parametres" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl justify-start border-slate-200 text-slate-700 hover:bg-white/50">
                      <Settings className="w-4 h-4 mr-2" />
                      {t('header.user.settings')}
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                      <Button
                        variant="outline"
                        className="w-full rounded-xl justify-start text-blue-700 border-blue-200 hover:bg-blue-50"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        {t('header.user.admin')}
                      </Button>
                    </Link>
                  )}
                  {isCompany && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 backdrop-blur-sm">
                      <p className="text-xs text-blue-700 font-medium mb-1">
                        {t('header.user.plan', { plan: profile?.subscription_plan || 'free' })}
                      </p>
                      <p className="text-xs text-blue-500/80">
                        {t('header.user.companySpace', 'Espace entreprise')}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-red-500 border-red-200 hover:bg-red-50 justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('header.user.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/connexion" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-white/50">
                      {t('header.auth.login')}
                    </Button>
                  </Link>
                  <Link to="/inscription" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                      {t('header.auth.register')}
                    </Button>
                  </Link>
                  <Link to="/inscription?type=entreprise" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-700 hover:bg-white/50">
                      <Building2 className="w-4 h-4 mr-2" />
                      {t('header.auth.companySpace')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;