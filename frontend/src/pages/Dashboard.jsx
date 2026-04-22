import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { formatDate, getStatusLabel, formatRelative } from '../lib/utils';
import {
  LayoutDashboard, Users, Calendar, FileText, Receipt, Settings, LogOut, Menu, X,
  Search, Bell, Plus, TrendingUp, AlertTriangle, Clock, CheckCircle, ChevronRight,
  Building2, UserCircle, ClipboardList, Wrench, CalendarDays, BarChart3, PieChart, FileSpreadsheet, Code, Download, Crown, MessageCircle, Upload
} from 'lucide-react';
import PlanUsageWidget from '../components/PlanUsageWidget';
import AdminInstallPrompt from '../components/AdminInstallPrompt';
import { useRealtimeEvents, EventType } from '../hooks/useRealtimeEvents';
import { ChatWidget, ChatButton, useChatUnread } from '../components/ChatWidget';

const Sidebar = ({ open, onClose, onShowInstallGuide }) => {
  const { user, entreprise, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // Check if app is already installed (standalone mode)
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Tableau de bord', path: '/dashboard', admin: true },
    { icon: CalendarDays, label: 'Planning', path: '/dashboard/planning', admin: true },
    { icon: Calendar, label: 'Interventions', path: '/dashboard/interventions', admin: true },
    { icon: Users, label: 'Clients', path: '/dashboard/clients', admin: true },
    { icon: FileText, label: 'Devis', path: '/dashboard/devis', admin: true },
    { icon: Receipt, label: 'Factures', path: '/dashboard/factures', admin: true },
    { icon: ClipboardList, label: 'Techniciens', path: '/dashboard/techniciens', admin: true },
    { icon: PieChart, label: 'Analytics', path: '/dashboard/analytics', admin: true },
    { icon: FileSpreadsheet, label: 'Relevés', path: '/dashboard/statements', admin: true },
    { icon: BarChart3, label: 'Rapports', path: '/dashboard/rapports', admin: true },
    { icon: Upload, label: 'Import', path: '/dashboard/import', admin: true },
    { icon: Code, label: 'API', path: '/dashboard/api-settings', admin: true },
    { icon: Settings, label: 'Paramètres', path: '/dashboard/settings', admin: true },
  ];

  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/branding/actoos-pro-logo.png" alt="ACTOOS PRO" className="w-10 h-10 rounded-lg object-contain" />
                <div>
                  <h1 className="font-bold text-lg">Actoos</h1>
                  <p className="text-xs text-slate-400 truncate max-w-[140px]">{entreprise?.nom}</p>
                </div>
              </div>
              <button onClick={onClose} className="lg:hidden p-1 hover:bg-slate-800 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 py-4">
            <nav className="px-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </ScrollArea>

          {/* User */}
          <div className="p-4 border-t border-slate-800">
            {/* Super Admin Link - Only for platform owner */}
            {user?.email?.toLowerCase().includes('salifkane612') && (
              <Link
                to="/super-admin"
                onClick={onClose}
                className="w-full flex items-center gap-3 px-3 py-2 mb-3 text-sm text-yellow-400 hover:bg-slate-800 rounded-lg transition-colors"
                data-testid="super-admin-link"
              >
                <Crown className="w-4 h-4" />
                <span>Super Admin</span>
              </Link>
            )}
            
            {/* Install App Button - Hidden if already installed */}
            {!isInstalled && (
              <button
                onClick={onShowInstallGuide}
                className="w-full flex items-center gap-3 px-3 py-2 mb-3 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                data-testid="install-app-sidebar-btn"
              >
                <Download className="w-4 h-4" />
                <span>Installer l'application</span>
              </button>
            )}
            
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                <UserCircle className="w-5 h-5 text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.prenom} {user?.nom}</p>
                <p className="text-xs text-slate-400 truncate">{user?.role === 'admin' ? 'Administrateur' : 'Technicien'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-slate-800 rounded-md"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

const TopBar = ({ onMenuClick, onShowInstallGuide, onShowChat, chatUnreadCount }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const { api, user } = useAuth();
  const navigate = useNavigate();
  
  // Check if demo account
  const isDemoAccount = user?.email === 'demo@actoos.com';
  
  // Check if app is already installed (standalone mode)
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dashboard/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 py-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0.75rem))' }}>
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 hover:bg-slate-100 rounded-md"
          data-testid="menu-toggle"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 sm:h-10 bg-slate-50 border-slate-200 text-sm"
              data-testid="global-search"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Chat Button */}
          <ChatButton onClick={onShowChat} unreadCount={chatUnreadCount} />
          
          {/* Install App Button - Mobile only, hidden if already installed */}
          {!isDemoAccount && !isInstalled && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onShowInstallGuide}
              className="lg:hidden p-2"
              data-testid="install-app-mobile-btn"
            >
              <Download className="w-5 h-5 text-slate-600" />
            </Button>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="bg-slate-900 hover:bg-slate-800" data-testid="quick-add-btn">
                <Plus className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Nouveau</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Créer</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/dashboard/clients/new')} data-testid="quick-add-client">
                <Users className="w-4 h-4 mr-2" />
                Client
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/interventions/new')} data-testid="quick-add-intervention">
                <Calendar className="w-4 h-4 mr-2" />
                Intervention
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/devis/new')} data-testid="quick-add-devis">
                <FileText className="w-4 h-4 mr-2" />
                Devis
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

// KPI Card Component
const KPICard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-100 text-slate-600',
  };

  return (
    <Card className="border-slate-200 hover:border-slate-300 transition-colors" data-testid={`kpi-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1 font-['Manrope']">{value}</p>
            {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            <TrendingUp className={`w-3 h-3 ${trend > 0 ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className={trend > 0 ? 'text-emerald-600' : 'text-red-600'}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
            <span className="text-slate-500">vs mois dernier</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Alert Card Component
const AlertCard = ({ alerts }) => {
  const navigate = useNavigate();
  
  const getAlertIcon = (type) => {
    switch (type) {
      case 'facture_retard': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'devis_expire': return <Clock className="w-4 h-4 text-amber-500" />;
      case 'intervention_retard': return <Clock className="w-4 h-4 text-amber-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleAlertClick = (alert) => {
    const id = alert.entity_id || alert.id;
    switch (alert.type) {
      case 'facture_retard':
        if (id) navigate(`/dashboard/factures/${id}`);
        else navigate('/dashboard/factures');
        break;
      case 'devis_expire':
      case 'devis_attente':
      case 'devis_attente_signature':
        if (id) navigate(`/dashboard/devis/${id}`);
        else navigate('/dashboard/devis');
        break;
      case 'intervention_retard':
        if (id) navigate(`/dashboard/interventions/${id}`);
        else navigate('/dashboard/interventions');
        break;
      default:
        // Default: navigate to the general page based on type
        if (alert.type?.includes('devis')) navigate('/dashboard/devis');
        else if (alert.type?.includes('facture')) navigate('/dashboard/factures');
        else if (alert.type?.includes('intervention')) navigate('/dashboard/interventions');
        break;
    }
  };

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Alertes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-slate-500 text-sm py-4">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Aucune alerte en cours
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Alertes
          <Badge variant="destructive" className="ml-auto">{alerts.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert, idx) => (
            <div 
              key={idx} 
              className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              onClick={() => handleAlertClick(alert)}
              data-testid={`alert-item-${idx}`}
            >
              {getAlertIcon(alert.type)}
              <span className="flex-1 truncate">{alert.message}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Recent Items Card Component
const RecentItemsCard = ({ title, items, type, viewAllPath, formatAmount }) => {
  const navigate = useNavigate();

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(viewAllPath)} data-testid={`view-all-${type}`}>
            Voir tout
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-4 px-4"
                onClick={() => navigate(`/dashboard/${type}/${item.id}`)}
                data-testid={`recent-${type}-${item.id}`}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {type === 'devis' ? item.numero_devis : item.numero_facture}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{item.client_nom}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{formatAmount(item.total_ttc)}</p>
                  <Badge variant="secondary" className={`status-${item.statut} text-xs`}>
                    {getStatusLabel(item.statut)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500 py-4">Aucun élément récent</p>
        )}
      </CardContent>
    </Card>
  );
};

// Main Dashboard Component
export const DashboardOverview = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [recent, setRecent] = useState({ devis: [], factures: [] });
  const [loading, setLoading] = useState(true);
  const { api, formatAmount, currencySymbol } = useAuth();

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, alertsRes, recentRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/alerts'),
        api.get('/dashboard/recent'),
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setRecent(recentRes.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Real-time updates via SSE
  const { isConnected } = useRealtimeEvents({
    enabled: true,
    showToasts: true,
    onInterventionChange: (eventType, data) => {
      // Refresh dashboard when any intervention changes
      console.log('[Dashboard] Intervention changed:', eventType, data);
      fetchData();
    },
    onDevisChange: (eventType, data) => {
      // Refresh dashboard when devis changes
      console.log('[Dashboard] Devis changed:', eventType, data);
      fetchData();
    },
    onFactureChange: (eventType, data) => {
      // Refresh dashboard when facture changes
      console.log('[Dashboard] Facture changed:', eventType, data);
      fetchData();
    },
    onSyncRequired: () => {
      // Full refresh requested
      fetchData();
    }
  });

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-overview">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 font-['Manrope']">Tableau de bord</h1>
        <p className="text-slate-500 mt-1">Vue d'ensemble de votre activité</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Interventions aujourd'hui"
          value={stats?.interventions_today || 0}
          subtitle={stats?.interventions_en_retard > 0 ? `${stats.interventions_en_retard} en retard` : null}
          icon={Calendar}
          color="blue"
        />
        <KPICard
          title="Devis en attente"
          value={stats?.devis_en_attente || 0}
          subtitle={formatAmount(stats?.montant_devis_attente || 0)}
          icon={FileText}
          color="amber"
        />
        <KPICard
          title="Factures impayées"
          value={stats?.factures_impayees || 0}
          subtitle={formatAmount(stats?.montant_factures_impayees || 0)}
          icon={Receipt}
          color="red"
        />
        <KPICard
          title="CA du mois"
          value={formatAmount(stats?.ca_mois || 0)}
          icon={TrendingUp}
          color="green"
        />
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Clients"
          value={stats?.total_clients || 0}
          icon={Users}
          color="slate"
        />
        <KPICard
          title="Techniciens actifs"
          value={stats?.total_techniciens || 0}
          icon={Building2}
          color="slate"
        />
        <KPICard
          title="Devis signés ce mois"
          value={stats?.devis_signes_mois || 0}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="En retard"
          value={stats?.interventions_en_retard || 0}
          icon={AlertTriangle}
          color={stats?.interventions_en_retard > 0 ? 'red' : 'slate'}
        />
      </div>

      {/* Alerts & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AlertCard alerts={alerts} />
        <RecentItemsCard
          title="Derniers devis"
          items={recent.devis}
          type="devis"
          viewAllPath="/dashboard/devis"
          formatAmount={formatAmount}
        />
        <RecentItemsCard
          title="Dernières factures"
          items={recent.factures}
          type="factures"
          viewAllPath="/dashboard/factures"
          formatAmount={formatAmount}
        />
      </div>

      {/* Plan Usage Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <PlanUsageWidget compact />
        </div>
      </div>
    </div>
  );
};

// Install Guide Modal Component
const InstallGuideModal = ({ isOpen, onClose }) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isDesktop = !isIOS && !isAndroid;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Download className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Installer Actoos</h2>
            <p className="text-slate-500 text-sm">
              {isIOS ? "Sur votre iPhone/iPad" : isAndroid ? "Sur votre Android" : "Sur votre ordinateur"}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {isIOS ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-slate-900">Ouvrez Safari</p>
                    <p className="text-sm text-slate-500">L'installation ne fonctionne que depuis Safari</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-slate-900">Appuyez sur Partager</p>
                    <p className="text-sm text-slate-500">L'icône ⬆️ en bas de l'écran</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-slate-900">"Sur l'écran d'accueil"</p>
                    <p className="text-sm text-slate-500">Faites défiler et sélectionnez cette option</p>
                  </div>
                </div>
              </>
            ) : isAndroid ? (
              <>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-slate-900">Ouvrez Chrome</p>
                    <p className="text-sm text-slate-500">L'installation fonctionne mieux avec Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-slate-900">Menu ⋮ en haut à droite</p>
                    <p className="text-sm text-slate-500">Appuyez sur les 3 points verticaux</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-slate-900">"Installer l'application"</p>
                    <p className="text-sm text-slate-500">Confirmez l'installation</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-slate-900">Cherchez l'icône ⊕</p>
                    <p className="text-sm text-slate-500">Dans la barre d'adresse de Chrome/Edge</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-slate-900">Cliquez sur "Installer"</p>
                    <p className="text-sm text-slate-500">Une fenêtre de confirmation apparaîtra</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-slate-900">Confirmez l'installation</p>
                    <p className="text-sm text-slate-500">L'app apparaît sur votre bureau</p>
                  </div>
                </div>
              </>
            )}
          </div>

          <Button onClick={onClose} className="w-full">
            J'ai compris
          </Button>
        </div>
      </div>
    </div>
  );
};

// Dashboard Layout Component
export const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { unreadCount: chatUnreadCount, refreshUnread: refreshChatUnread } = useChatUnread();
  
  // Check if this is the demo account
  const isDemoAccount = user?.email === 'demo@actoos.com';
  
  const handleExitDemo = () => {
    logout();
    // Use window.location to avoid React Router catching the redirect
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Demo Mode Banner */}
      {isDemoAccount && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">🎯 Mode Démonstration</span>
            <span className="text-xs text-blue-200 hidden sm:inline">- Explorez librement les fonctionnalités d'Actoos</span>
          </div>
          <button
            onClick={handleExitDemo}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-sm font-medium transition-colors"
          >
            Quitter la démo
          </button>
        </div>
      )}
      
      <Sidebar 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        onShowInstallGuide={() => setShowInstallGuide(true)}
      />
      
      <div className="lg:ml-64">
        <TopBar 
          onMenuClick={() => setSidebarOpen(true)} 
          onShowInstallGuide={() => setShowInstallGuide(true)}
          onShowChat={() => setShowChat(true)}
          chatUnreadCount={chatUnreadCount}
        />
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* PWA Install Prompt for Admin */}
      <AdminInstallPrompt />
      
      {/* Install Guide Modal */}
      <InstallGuideModal 
        isOpen={showInstallGuide} 
        onClose={() => setShowInstallGuide(false)} 
      />
      
      {/* Chat Widget */}
      <ChatWidget 
        isOpen={showChat} 
        onClose={() => {
          setShowChat(false);
          refreshChatUnread();
        }}
        isTech={false}
      />
    </div>
  );
};
