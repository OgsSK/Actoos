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

  // Détection du scroll
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // état initial
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

  // Fond du header : opaque en haut, légèrement transparent au scroll
  const headerClasses = cn(
    'sticky top-0 left-0 right-0 z-50 transition-all duration-300',
    scrolled
      ? 'bg-white/55 backdrop-blur-lg border-b border-slate-200/40 shadow-sm'
      : 'bg-white border-b border-slate-200/80 shadow-[0_8px_30px_rgb(15,23,42,0.06)]'
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

  return (
    <header className={headerClasses}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* === LIGNE PRINCIPALE (mobile first) === */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-3 min-h-[64px]">
          {/* Logo + marque */}
          <Link to="/" className="flex items-center gap-2 shrink-0 min-w-0 group">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 bg-blue-600 text-white shadow-sm group-hover:bg-blue-700 transition-colors">
              <Briefcase className="w-5 h-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base sm:text-lg leading-none whitespace-nowrap text-slate-900">
                {t('header.brand')}
              </span>
              <span className="hidden sm:block text-[11px] leading-none mt-0.5 text-slate-500">
                Talent marketplace
              </span>
            </div>
          </Link>

          {/* Actions desktop (à partir de lg) */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(profileLink)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-2 transition-all duration-200 max-w-[280px] hover:bg-slate-100"
                >
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                      {getInitials()}
                    </div>
                    <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white translate-x-1/4 translate-y-1/4" />
                  </div>
                  <div className="hidden xl:flex flex-col items-start min-w-0 text-left leading-tight">
                    <span className="text-sm font-semibold truncate w-full text-slate-900">
                      {user.user_metadata?.first_name || t('header.user.defaultName')}
                    </span>
                    <span className="text-xs truncate w-full text-slate-500">
                      {displayEmail}
                    </span>
                  </div>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full shrink-0 transition-all text-slate-600 hover:bg-slate-100"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-[9999] text-slate-900"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3" />
                      {t('header.user.dashboard')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate(profileLink)}
                      className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <User className="w-4 h-4 mr-3" />
                      {t('header.user.profile')}
                    </DropdownMenuItem>
                    {isCandidate && (
                      <DropdownMenuItem
                        onClick={() => navigate('/alertes')}
                        className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-slate-100 focus:text-slate-900"
                      >
                        <Bell className="w-4 h-4 mr-3" />
                        {t('header.user.createAlert')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => navigate('/parametres')}
                      className="cursor-pointer rounded-xl px-3 py-2.5 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      {t('header.user.settings')}
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="my-2" />
                        <DropdownMenuItem
                          onClick={() => navigate('/admin')}
                          className="cursor-pointer rounded-xl px-3 py-2.5 text-blue-600 focus:bg-blue-50 focus:text-blue-700"
                        >
                          <Shield className="w-4 h-4 mr-3" />
                          {t('header.user.admin')}
                        </DropdownMenuItem>
                      </>
                    )}
                    {isCompany && (
                      <DropdownMenuItem
                        disabled
                        className="mt-1 opacity-100 !cursor-default rounded-xl px-3 py-2.5"
                      >
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          {t('header.user.plan', { plan: profile?.subscription_plan || 'free' })}
                        </Badge>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer rounded-xl px-3 py-2.5 text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      {t('header.user.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/connexion">
                  <Button
                    variant="ghost"
                    className="rounded-full px-4 text-slate-700 hover:bg-slate-100"
                  >
                    {t('header.auth.login')}
                  </Button>
                </Link>
                <Link to="/inscription">
                  <Button className="rounded-full px-5 shadow-sm bg-blue-600 text-white hover:bg-blue-700">
                    {t('header.auth.register')}
                  </Button>
                </Link>
                <Link to="/inscription?type=entreprise">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-full px-4 shrink-0 hidden xl:inline-flex border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <Building2 className="w-4 h-4" />
                    {t('header.auth.companySpace')}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Bouton menu mobile */}
          <div className="lg:hidden flex items-center gap-2 shrink-0 ml-auto">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2.5 rounded-xl transition-all duration-200 ring-1 text-slate-700 bg-white ring-slate-200 hover:bg-slate-50"
              aria-label="Ouvrir le menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* === LIGNE SECONDAIRE : navigation + langue/devise (desktop uniquement) === */}
        <div className="hidden lg:flex items-center justify-between gap-4 pb-3 border-t border-slate-100 pt-3">
          <nav className="flex flex-wrap items-center gap-x-8 gap-y-2 min-w-0">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'relative text-sm font-medium transition-all duration-200 whitespace-nowrap px-1 py-2 text-slate-700 hover:text-blue-600',
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

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <LanguageSwitcher isTransparent={false} />
            <HeaderPreferences isTransparent={false} />
          </div>
        </div>
      </div>

      {/* === MENU MOBILE (inchangé) === */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[9999] transition-all duration-300',
          mobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-[86%] max-w-sm bg-white shadow-2xl transition-transform duration-300 border-l border-slate-200',
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="absolute top-4 right-4">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-slate-100 transition-colors"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="px-5 py-5 pt-16 space-y-5 overflow-y-auto h-full">
            {/* Langue + Devise */}
            <div className="space-y-3 pb-5 border-b border-slate-100">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <LanguageSwitcher isTransparent={false} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <HeaderPreferences isTransparent={false} />
              </div>
            </div>

            {user && (
              <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
                <div className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">
                  {getInitials()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {user.user_metadata?.first_name || t('header.user.defaultUser')}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                </div>
              </div>
            )}

            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center justify-between rounded-2xl px-4 py-3 text-[15px] font-medium transition-all',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                    )}
                  >
                    <span>{link.label}</span>
                    <span className="text-xs opacity-60">→</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl justify-start">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      {t('header.user.dashboard')}
                    </Button>
                  </Link>
                  <Link to={profileLink} onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl justify-start">
                      <User className="w-4 h-4 mr-2" />
                      {t('header.user.profile')}
                    </Button>
                  </Link>
                  {isCandidate && (
                    <Link to="/alertes" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl justify-start">
                        <Bell className="w-4 h-4 mr-2" />
                        {t('header.user.createAlert')}
                      </Button>
                    </Link>
                  )}
                  <Link to="/parametres" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl justify-start">
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
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
                      <p className="text-xs text-blue-700 font-medium mb-1">
                        {t('header.user.plan', { plan: profile?.subscription_plan || 'free' })}
                      </p>
                      <p className="text-xs text-blue-600/80">
                        {t('header.user.companySpace', 'Espace entreprise')}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full rounded-xl text-red-600 border-red-200 hover:bg-red-50 justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {t('header.user.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/connexion" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl">
                      {t('header.auth.login')}
                    </Button>
                  </Link>
                  <Link to="/inscription" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full rounded-xl">
                      {t('header.auth.register')}
                    </Button>
                  </Link>
                  <Link to="/inscription?type=entreprise" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full rounded-xl">
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