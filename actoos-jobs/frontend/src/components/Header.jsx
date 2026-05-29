import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from './ui/dropdown-menu';
import {
  Briefcase, Menu, X, User, Building2, ChevronDown,
  Bell, LogOut, Settings, LayoutDashboard, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Badge } from './ui/badge';

const Header = ({ user, onLogout }) => {
  const { isAdmin, isCompany, isCandidate, profile } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  

  const isHomepage = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Emplois', href: '/emplois' },
    { label: 'Entreprises', href: '/entreprises' },
    { label: 'Tarifs', href: '/tarifs' },
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
    isTransparent ? 'text-white' : 'text-slate-900'
  );

  const getInitials = () => {
    if (!user) return '?';
    const firstName = user.user_metadata?.first_name || user.email?.split('@')[0] || '';
    const lastName = user.user_metadata?.last_name || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || firstName.slice(0, 2).toUpperCase();
  };

  const displayEmail = user?.email || '';
  const profileLink = isCompany ? '/dashboard/entreprise/profil' : '/profil';

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
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300',
              isTransparent ? 'bg-white/20 backdrop-blur-sm' : 'bg-blue-600 text-white shadow-sm'
            )}>
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <span className={logoClasses}>Actoos Jobs</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href} className={linkClasses}>{link.label}</Link>
            ))}
          </nav>

          {/* Auth / User Menu */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-1">
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('relative', isTransparent ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
                >
                  <Bell className="w-5 h-5" />
                </Button>

                {/* Zone cliquable vers le profil */}
                <button
                  onClick={() => navigate(profileLink)}
                  className={cn(
                    'flex items-center gap-2.5 px-2 py-1.5 rounded-full transition-all duration-200',
                    isTransparent ? 'hover:bg-white/10' : 'hover:bg-slate-100'
                  )}
                >
                  <div className="relative w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {getInitials()}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className={cn('text-sm font-medium leading-tight', isTransparent ? 'text-white' : 'text-slate-900')}>
                      {user.user_metadata?.first_name || 'Compte'}
                    </span>
                    <span className={cn('text-xs leading-tight max-w-[140px] truncate', isTransparent ? 'text-white/70' : 'text-slate-500')}>
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
                      className={cn('rounded-full', isTransparent ? 'text-white hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100')}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-3" /> Tableau de bord
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(profileLink)}>
                      <User className="w-4 h-4 mr-3" /> Mon profil
                    </DropdownMenuItem>
                    {isCandidate && (
                      <DropdownMenuItem onClick={() => navigate('/alertes')}>
                        <Bell className="w-4 h-4 mr-3" /> Créer une alerte
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => navigate('/parametres')}>
                      <Settings className="w-4 h-4 mr-3" /> Paramètres
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="text-blue-600">
                          <Shield className="w-4 h-4 mr-3" /> Administration
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem disabled className="opacity-100 !cursor-default">
  <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
    Plan : {profile?.role === 'company' ? (profile?.subscription_plan || 'free') : '—'}
  </Badge>
</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-3" /> Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <Link to="/connexion"><Button variant="ghost" className={isTransparent ? 'text-white hover:bg-white/10' : ''}>Connexion</Button></Link>
                <Link to="/inscription"><Button className={isTransparent ? 'bg-white text-blue-900 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700 text-white shadow-sm'}>Inscription</Button></Link>
                <Link to="/entreprises/inscription"><Button variant="outline" className={cn('gap-2', isTransparent ? 'border-white/30 text-white hover:bg-white/10' : 'border-blue-600 text-blue-600 hover:bg-blue-50')}><Building2 className="w-4 h-4" /> Recruter</Button></Link>
              </>
            )}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn('lg:hidden p-2 rounded-lg transition-colors', isTransparent ? 'text-white hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100')}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[9999] transition-all duration-300',
          mobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={cn(
            'absolute right-0 top-0 bottom-0 w-4/5 max-w-sm bg-white shadow-2xl',
            'transition-transform duration-300 ease-out',
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="absolute top-4 right-4">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-6 space-y-4 pt-20 overflow-y-auto h-full">
            {/* Info utilisateur (non cliquable) */}
            {user && (
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {getInitials()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {user.user_metadata?.first_name || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
                </div>
              </div>
            )}

            {/* Navigation principale */}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block py-2.5 text-base text-slate-700 hover:text-blue-600 font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {/* Actions */}
            <div className="pt-4 border-t border-slate-100 space-y-2">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full" variant="default">
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Tableau de bord
                    </Button>
                  </Link>
                  <Link to={profileLink} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full" variant="outline">
                      <User className="w-4 h-4 mr-2" /> Mon profil
                    </Button>
                  </Link>
                  {isCandidate && (
                    <Link to="/alertes" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full" variant="outline">
                        <Bell className="w-4 h-4 mr-2" /> Créer une alerte
                      </Button>
                    </Link>
                  )}
                  <Link to="/parametres" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full" variant="outline">
                      <Settings className="w-4 h-4 mr-2" /> Paramètres
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => { setMobileMenuOpen(false); onLogout(); }}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/connexion" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">Connexion</Button>
                  </Link>
                  <Link to="/inscription" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">Inscription</Button>
                  </Link>
                  <Link to="/entreprises/inscription" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" className="w-full">
                      <Building2 className="w-4 h-4 mr-2" /> Espace Entreprise
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