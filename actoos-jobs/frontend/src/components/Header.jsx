import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { Button } from './ui/button';
import { Badge } from './ui/badge';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';

import {
  Briefcase, Menu, X, User, Building2, ChevronDown,
  LogOut, Settings, LayoutDashboard, Shield, Bell
} from 'lucide-react';

import { cn } from '../lib/utils';

const Header = ({ user, onLogout }) => {
  const { isAdmin, isCompany, isCandidate, profile } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isHomepage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navLinks = [
    { label: 'Emplois', href: '/emplois' },
    { label: 'Entreprises', href: '/entreprises' },
    // ✅ Tarifs uniquement pour les entreprises connectées
    ...(isCompany ? [{ label: 'Tarifs', href: '/tarifs' }] : []),
    { label: 'Blog', href: '/blog' },
  ];

  const isTransparent = isHomepage && !scrolled;

  const headerClasses = cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
    isTransparent
      ? 'bg-transparent'
      : 'bg-white shadow-sm border-b border-slate-200'
  );

  const linkClasses = cn(
    'text-sm font-medium transition-colors duration-200',
    isTransparent
      ? 'text-white/90 hover:text-white'
      : 'text-slate-700 hover:text-blue-600'
  );

  const logoClasses = cn(
    'font-bold text-xl transition-colors',
    isTransparent
      ? 'text-white'
      : 'text-slate-900'
  );

  const getInitials = () => {
    if (!user) return '?';

    const firstName =
      user.user_metadata?.first_name ||
      user.email?.split('@')[0] ||
      '';

    const lastName = user.user_metadata?.last_name || '';

    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    return initials || firstName.slice(0, 2).toUpperCase() || '?';
  };

  const displayEmail = user?.email || '';

  const profileLink = isCompany
    ? '/dashboard/entreprise/profil'
    : '/profil';

  const handleLogout = () => {
    setMobileMenuOpen(false);
    onLogout();
  };

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
                isTransparent
                  ? 'bg-white/20 backdrop-blur-sm'
                  : 'bg-blue-600 text-white shadow-sm'
              )}
            >
              <Briefcase className="w-6 h-6 text-white" />
            </div>

            <span className={logoClasses}>
              Actoos Jobs
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={linkClasses}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-1">

                {/* Profile Button */}
                <button
                  onClick={() => navigate(profileLink)}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-full transition-all duration-200',
                    isTransparent
                      ? 'hover:bg-white/10'
                      : 'hover:bg-slate-100'
                  )}
                >
                  <div className="relative inline-flex shrink-0">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {getInitials()}
                    </div>

                    <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-green-500 ring-2 ring-white translate-x-1/4 translate-y-1/4" />
                  </div>

                  <div className="flex flex-col items-start">
                    <span
                      className={cn(
                        'text-sm font-medium leading-tight',
                        isTransparent
                          ? 'text-white'
                          : 'text-slate-900'
                      )}
                    >
                      {user.user_metadata?.first_name || 'Compte'}
                    </span>

                    <span
                      className={cn(
                        'text-xs leading-tight max-w-[140px] truncate',
                        isTransparent
                          ? 'text-white/70'
                          : 'text-slate-500'
                      )}
                    >
                      {displayEmail}
                    </span>
                  </div>
                </button>

                {/* Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'rounded-full',
                        isTransparent
                          ? 'text-white hover:bg-white/10'
                          : 'text-slate-600 hover:bg-slate-100'
                      )}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-[9999] text-slate-900"
                  >
                    <DropdownMenuItem
                      onClick={() => navigate('/dashboard')}
                      className="cursor-pointer rounded-xl px-3 py-2 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-3" />
                      Tableau de bord
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate(profileLink)}
                      className="cursor-pointer rounded-xl px-3 py-2 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <User className="w-4 h-4 mr-3" />
                      Mon profil
                    </DropdownMenuItem>

                    {isCandidate && (
                      <DropdownMenuItem
                        onClick={() => navigate('/alertes')}
                        className="cursor-pointer rounded-xl px-3 py-2 focus:bg-slate-100 focus:text-slate-900"
                      >
                        <Bell className="w-4 h-4 mr-3" />
                        Créer une alerte
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={() => navigate('/parametres')}
                      className="cursor-pointer rounded-xl px-3 py-2 focus:bg-slate-100 focus:text-slate-900"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Paramètres
                    </DropdownMenuItem>

                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator className="my-2" />

                        <DropdownMenuItem
                          onClick={() => navigate('/admin')}
                          className="cursor-pointer rounded-xl px-3 py-2 text-blue-600 focus:bg-blue-50 focus:text-blue-700"
                        >
                          <Shield className="w-4 h-4 mr-3" />
                          Administration
                        </DropdownMenuItem>
                      </>
                    )}

                    {isCompany && (
                      <DropdownMenuItem
                        disabled
                        className="mt-1 opacity-100 !cursor-default rounded-xl px-3 py-2"
                      >
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                          Plan : {profile?.subscription_plan || 'free'}
                        </Badge>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer rounded-xl px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/connexion">
                  <Button
                    variant="ghost"
                    className={
                      isTransparent
                        ? 'text-white hover:bg-white/10'
                        : ''
                    }
                  >
                    Connexion
                  </Button>
                </Link>

                <Link to="/inscription">
                  <Button
                    className={
                      isTransparent
                        ? 'bg-white text-blue-900 hover:bg-blue-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                    }
                  >
                    Inscription
                  </Button>
                </Link>

                <Link to="/entreprises/inscription">
                  <Button
                    variant="outline"
                    className={cn(
                      'gap-2',
                      isTransparent
                        ? 'border-white/30 text-white hover:bg-white/10'
                        : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                    )}
                  >
                    <Building2 className="w-4 h-4" />
                    Recruter
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              'lg:hidden p-2 rounded-lg transition-colors',
              isTransparent
                ? 'text-white hover:bg-white/10'
                : 'text-slate-700 hover:bg-slate-100'
            )}
          >
            {mobileMenuOpen
              ? <X className="w-6 h-6" />
              : <Menu className="w-6 h-6" />
            }
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[9999] transition-all duration-300',
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl transition-transform duration-300',
            mobileMenuOpen
              ? 'translate-x-0'
              : 'translate-x-full'
          )}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="px-6 py-6 pt-20 space-y-4 overflow-y-auto h-full">

            {/* User Info */}
            {user && (
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {getInitials()}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.user_metadata?.first_name || 'Utilisateur'}
                  </p>

                  <p className="text-xs text-slate-500 truncate">
                    {displayEmail}
                  </p>
                </div>
              </div>
            )}

            {/* Navigation */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2.5 text-base text-slate-700 hover:text-blue-600 font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">

              {user ? (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Tableau de bord
                    </Button>
                  </Link>

                  <Link
                    to={profileLink}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Mon profil
                    </Button>
                  </Link>

                  <Link
                    to="/parametres"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Paramètres
                    </Button>
                  </Link>

                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link
                    to="/connexion"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      Connexion
                    </Button>
                  </Link>

                  <Link
                    to="/inscription"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button className="w-full">
                      Inscription
                    </Button>
                  </Link>

                  <Link
                    to="/entreprises/inscription"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="outline"
                      className="w-full"
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Espace Entreprise
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