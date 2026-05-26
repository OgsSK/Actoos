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
  Search, Bell, LogOut, Settings, LayoutDashboard, Shield
} from 'lucide-react';
import { cn } from '../lib/utils';

const Header = ({ user, onLogout }) => {
  const { isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're on homepage
  const isHomepage = location.pathname === '/';

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Emplois', href: '/emplois' },
    { label: 'Entreprises', href: '/entreprises' },
    { label: 'Tarifs', href: '/tarifs' },
    { label: 'Blog', href: '/blog' },
  ];

  const headerClasses = cn(
    'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
    scrolled || !isHomepage
      ? 'bg-white shadow-sm border-b border-slate-200'
      : 'bg-transparent'
  );

  const linkClasses = cn(
    'text-sm font-medium transition-colors',
    scrolled || !isHomepage
      ? 'text-slate-700 hover:text-blue-600'
      : 'text-white/90 hover:text-white'
  );

  const logoClasses = cn(
    'font-bold text-xl transition-colors',
    scrolled || !isHomepage ? 'text-slate-900' : 'text-white'
  );

  return (
    <header className={headerClasses}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              scrolled || !isHomepage ? 'bg-blue-600' : 'bg-white/20'
            )}>
              <Briefcase className={cn(
                'w-6 h-6',
                scrolled || !isHomepage ? 'text-white' : 'text-white'
              )} />
            </div>
            <span className={logoClasses}>Actoos Jobs</span>
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

          {/* Auth Buttons / User Menu */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  className={scrolled || !isHomepage ? '' : 'text-white hover:bg-white/10'}
                >
                  <Bell className="w-5 h-5" />
                </Button>

                {/* User dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className={cn(
                        'gap-2',
                        scrolled || !isHomepage ? '' : 'text-white hover:bg-white/10'
                      )}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-medium">{user.name || 'Mon compte'}</span>
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Tableau de bord
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profil')}>
                      <User className="w-4 h-4 mr-2" />
                      Mon profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/parametres')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Parametres
                    </DropdownMenuItem>
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate('/admin')} className="text-blue-600">
                          <Shield className="w-4 h-4 mr-2" />
                          Administration
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onLogout} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Deconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/connexion">
                  <Button 
                    variant="ghost"
                    className={scrolled || !isHomepage ? '' : 'text-white hover:bg-white/10'}
                  >
                    Connexion
                  </Button>
                </Link>
                <Link to="/inscription">
                  <Button className={cn(
                    scrolled || !isHomepage 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-white text-blue-900 hover:bg-blue-50'
                  )}>
                    Inscription
                  </Button>
                </Link>
                <Link to="/entreprises/inscription">
                  <Button 
                    variant="outline"
                    className={cn(
                      scrolled || !isHomepage 
                        ? 'border-blue-600 text-blue-600 hover:bg-blue-50' 
                        : 'border-white/30 text-white hover:bg-white/10'
                    )}
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Recruter
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={cn(
              'lg:hidden p-2 rounded-lg',
              scrolled || !isHomepage 
                ? 'text-slate-700 hover:bg-slate-100' 
                : 'text-white hover:bg-white/10'
            )}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 animate-slide-down">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="block py-2 text-slate-700 hover:text-blue-600 font-medium"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            
            <div className="pt-4 border-t border-slate-200 space-y-3">
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="w-full">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Tableau de bord
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full text-red-600 border-red-200"
                    onClick={onLogout}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
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
                      <Building2 className="w-4 h-4 mr-2" />
                      Espace Entreprise
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
