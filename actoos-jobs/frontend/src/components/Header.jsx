import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
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
  const { isAdmin, isCompany, isCandidate, activeCompanyId } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeCompanyPlan, setActiveCompanyPlan] = useState(null);
  const [activeCompanyCycle, setActiveCompanyCycle] = useState(null);
  const [activeCompanyName, setActiveCompanyName] = useState(null); // ← nouveau

  const location = useLocation();
  const navigate = useNavigate();

  // Charger le plan, le cycle et le nom de l'entreprise active
  useEffect(() => {
    if (!isCompany || !activeCompanyId) {
      setActiveCompanyPlan(null);
      setActiveCompanyCycle(null);
      setActiveCompanyName(null);
      return;
    }
    supabase
      .from('companies')
      .select('subscription_plan, billing_cycle, name')
      .eq('id', activeCompanyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setActiveCompanyPlan(data.subscription_plan || 'free');
          setActiveCompanyCycle(data.billing_cycle || null);
          setActiveCompanyName(data.name || null);
        } else {
          setActiveCompanyPlan(null);
          setActiveCompanyCycle(null);
          setActiveCompanyName(null);
        }
      });
  }, [isCompany, activeCompanyId]);

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

  // Composant pour la section "Entreprise active" dans le dropdown
  const ActiveCompanyInfo = () => {
    if (!isCompany || !activeCompanyId) return null;
    return (
      <div className="px-3 py-2 border-b border-slate-100 mb-1">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-sm font-medium text-slate-900 truncate">
            {activeCompanyName || t('header.user.company', 'Entreprise')}
          </span>
        </div>
        {activeCompanyPlan && (
          <div className="ml-6">
            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">
              {t(`pricing.plans.${activeCompanyPlan}.name`, { defaultValue: activeCompanyPlan })}
              {activeCompanyCycle && (
                <span className="ml-1 opacity-75">
                  · {activeCompanyCycle === 'monthly' ? t('pricing.toggle.monthly') : t('pricing.toggle.annual')}
                </span>
              )}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-shadow duration-300',
        'bg-white border-b border-slate-200',
        scrolled ? 'shadow-sm' : ''
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          {/* ---- Logo + navigation desktop ---- */}
          <div className="flex items-center gap-3 lg:gap-3 min-w-0 flex-shrink-0">
            <Link to="/" className="flex items-center shrink-0 gap-2" title={t('header.brand')}>
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <Briefcase className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-slate-900 sm:hidden">
                {t('header.brand')}
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={cn(
                    'px-2.5 py-2 text-sm font-medium rounded-lg transition-colors',
                    location.pathname === link.href
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* ---- Espace flexible ---- */}
          <div className="flex-1 hidden lg:block" />

          {/* ---- Actions desktop ---- */}
          <div className="hidden lg:flex items-center gap-1.5 shrink-0">
            <HeaderPreferences isTransparent={false} />
            <LanguageSwitcher isTransparent={false} />

            <div className="w-px h-5 bg-slate-200 mx-1" />

            {user ? (
              <div className="flex items-center gap-1.5">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
                    <LayoutDashboard className="w-4 h-4 mr-1.5" />
                    {t('header.user.dashboard')}
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full p-1 hover:bg-slate-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                        {getInitials()}
                      </div>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" sideOffset={8} className="w-56 rounded-2xl border border-slate-200/60 bg-white/95 backdrop-blur-xl p-2 shadow-xl">
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {user.user_metadata?.first_name || t('header.user.defaultName')}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                    </div>

                    {/* Entreprise active et plan */}
                    <ActiveCompanyInfo />

                    <DropdownMenuItem onClick={() => navigate(profileLink)} className="cursor-pointer rounded-lg">
                      <User className="w-4 h-4 mr-2.5 text-slate-400" />
                      {t('header.user.profile')}
                    </DropdownMenuItem>

                    {isCandidate && (
                      <DropdownMenuItem onClick={() => navigate('/alertes')} className="cursor-pointer rounded-lg">
                        <Bell className="w-4 h-4 mr-2.5 text-slate-400" />
                        {t('header.user.createAlert')}
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem onClick={() => navigate('/parametres')} className="cursor-pointer rounded-lg">
                      <Settings className="w-4 h-4 mr-2.5 text-slate-400" />
                      {t('header.user.settings')}
                    </DropdownMenuItem>

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="cursor-pointer rounded-lg">
                          <Shield className="w-4 h-4 mr-2.5 text-purple-400" />
                          {t('header.user.admin')}
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer rounded-lg text-red-600 hover:!text-red-700 hover:!bg-red-50">
                      <LogOut className="w-4 h-4 mr-2.5" />
                      {t('header.user.logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link to="/connexion">
                  <Button variant="ghost" size="sm" className="rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium">
                    {t('header.auth.login')}
                  </Button>
                </Link>
                <Link to="/inscription">
                  <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium">
                    {t('header.auth.register')}
                  </Button>
                </Link>
                <Link to="/inscription?type=entreprise">
                  <Button variant="outline" size="sm" className="rounded-full border-slate-300 text-slate-700 hover:bg-slate-50 font-medium">
                    <Building2 className="w-4 h-4 mr-1" />
                    {t('header.auth.companySpace')}
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* ---- Actions mobile ---- */}
          <div className="lg:hidden flex items-center gap-2">
            {user ? (
              <Link to="/dashboard" className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold shadow-sm">
                {getInitials()}
              </Link>
            ) : (
              <Link to="/connexion">
                <Button variant="ghost" size="sm" className="rounded-full text-slate-600">
                  <User className="w-4 h-4" />
                  <span className="ml-1 hidden xs:inline">{t('header.auth.login')}</span>
                </Button>
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Menu mobile ---- */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[9999]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <span className="font-bold text-lg text-slate-900">{t('header.brand')}</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {user && (
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
                    {getInitials()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.user_metadata?.first_name || t('header.user.defaultUser')}
                    </p>
                    <p className="text-xs text-slate-500">{displayEmail}</p>
                  </div>
                </div>
              )}

              {/* Entreprise active en mobile */}
              {isCompany && activeCompanyId && (
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
                  <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activeCompanyName || t('header.user.company', 'Entreprise')}
                    </p>
                    {activeCompanyPlan && (
                      <Badge className="mt-1 bg-blue-100 text-blue-700 border-0 text-xs font-medium">
                        {t(`pricing.plans.${activeCompanyPlan}.name`, { defaultValue: activeCompanyPlan })}
                        {activeCompanyCycle && (
                          <span className="ml-1 opacity-75">
                            · {activeCompanyCycle === 'monthly' ? t('pricing.toggle.monthly') : t('pricing.toggle.annual')}
                          </span>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <nav className="space-y-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'block px-3 py-2.5 rounded-lg text-sm font-medium',
                      location.pathname === link.href
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="pt-4 border-t border-slate-100 space-y-2">
                {user ? (
                  <>
                    <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button className="w-full justify-start rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        {t('header.user.dashboard')}
                      </Button>
                    </Link>
                    <Link to={profileLink} onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full justify-start rounded-xl">
                        <User className="w-4 h-4 mr-2" />
                        {t('header.user.profile')}
                      </Button>
                    </Link>
                    {isCandidate && (
                      <Link to="/alertes" onClick={() => setMobileMenuOpen(false)} className="block">
                        <Button variant="outline" className="w-full justify-start rounded-xl">
                          <Bell className="w-4 h-4 mr-2" />
                          {t('header.user.createAlert')}
                        </Button>
                      </Link>
                    )}
                    <Link to="/parametres" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full justify-start rounded-xl">
                        <Settings className="w-4 h-4 mr-2" />
                        {t('header.user.settings')}
                      </Button>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block">
                        <Button variant="outline" className="w-full justify-start rounded-xl text-purple-700 border-purple-200">
                          <Shield className="w-4 h-4 mr-2" />
                          {t('header.user.admin')}
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="outline"
                      className="w-full justify-start rounded-xl text-red-500 border-red-200 hover:bg-red-50"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('header.user.logout')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/connexion" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full rounded-xl">
                        {t('header.auth.login')}
                      </Button>
                    </Link>
                    <Link to="/inscription" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">
                        {t('header.auth.register')}
                      </Button>
                    </Link>
                    <Link to="/inscription?type=entreprise" onClick={() => setMobileMenuOpen(false)} className="block">
                      <Button variant="outline" className="w-full rounded-xl">
                        <Building2 className="w-4 h-4 mr-2" />
                        {t('header.auth.companySpace')}
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <HeaderPreferences isMobile />
                <LanguageSwitcher isMobile />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;