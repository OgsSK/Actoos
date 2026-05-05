import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '../components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Building2, Users, TrendingUp, DollarSign, AlertTriangle, Search,
  BarChart3, Activity, MessageSquare, XCircle, CheckCircle, Clock,
  RefreshCw, Eye, Pencil, Trash2, Crown, Loader2, LogOut, ArrowLeft,
  Star, ThumbsDown, Bug, Lightbulb, ChevronRight, Mail, Bell, Send,
  Download, Gift, Calendar, CreditCard, UserPlus, ArrowUpRight,
  ArrowDownRight, Percent, Filter, MoreVertical, Play, Pause,
  FileText, PieChart, Menu
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { api, user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [revenue, setRevenue] = useState(null);
  const [coupons, setCoupons] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modals
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [showCommunicate, setShowCommunicate] = useState(false);
  const [showExtendTrial, setShowExtendTrial] = useState(false);
  const [showApplyDiscount, setShowApplyDiscount] = useState(false);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  const [showChangeStatus, setShowChangeStatus] = useState(false);
  
  // Communication form
  const [commTarget, setCommTarget] = useState('single');
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [commSendEmail, setCommSendEmail] = useState(true);
  const [commSendNotif, setCommSendNotif] = useState(true);
  
  // Other forms
  const [trialDays, setTrialDays] = useState(14);
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState(10);
  const [discountMonths, setDiscountMonths] = useState(1);
  const [newStatus, setNewStatus] = useState('active');
  const [statusReason, setStatusReason] = useState('');
  
  // Coupon form
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState('percentage');
  const [couponValue, setCouponValue] = useState(10);
  const [couponMaxUses, setCouponMaxUses] = useState(-1);
  
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, entreprisesRes, feedbacksRes, cancellationsRes, revenueRes, couponsRes] = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/entreprises?limit=200'),
        api.get('/super-admin/feedbacks?limit=50'),
        api.get('/super-admin/cancellations?days=30'),
        api.get('/super-admin/revenue'),
        api.get('/super-admin/coupons')
      ]);
      
      setStats(statsRes.data);
      setEntreprises(entreprisesRes.data.entreprises || []);
      setFeedbacks(feedbacksRes.data.feedbacks || []);
      setCancellations(cancellationsRes.data.cancellations || []);
      setRevenue(revenueRes.data);
      setCoupons(couponsRes.data.coupons || []);
      
      // Load growth data
      try {
        const growthRes = await api.get('/super-admin/growth?months=6');
        setGrowth(growthRes.data);
      } catch (e) {
        console.log('Growth data not available');
      }
      
    } catch (error) {
      console.error('Error loading super admin data:', error);
      console.error('Error details:', error.response?.data);
      if (error.response?.status === 403) {
        toast.error('Accès non autorisé - Vous devez être super admin');
        navigate('/dashboard');
      } else if (error.response?.status === 401) {
        toast.error('Session expirée - Reconnectez-vous');
      } else {
        toast.error(`Erreur: ${error.response?.data?.detail || error.message || 'Chargement impossible'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  const handleViewDetails = async (entreprise) => {
    try {
      const res = await api.get(`/super-admin/entreprises/${entreprise.id}`);
      setSelectedEntreprise(res.data);
      setShowDetails(true);
    } catch (error) {
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const handleUpdatePlan = async (entrepriseId, newPlan) => {
    try {
      await api.put(`/super-admin/entreprises/${entrepriseId}/plan`, { plan: newPlan });
      toast.success('Plan mis à jour');
      loadData();
      setShowEditPlan(false);
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedEntreprise) return;
    try {
      await api.put(`/super-admin/entreprises/${selectedEntreprise.id || selectedEntreprise.entreprise?.id}/status`, { 
        status: newStatus,
        reason: statusReason 
      });
      toast.success('Statut mis à jour');
      loadData();
      setShowChangeStatus(false);
      setStatusReason('');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleExtendTrial = async () => {
    if (!selectedEntreprise) return;
    try {
      await api.put(`/super-admin/entreprises/${selectedEntreprise.id || selectedEntreprise.entreprise?.id}/extend-trial`, { 
        days: trialDays 
      });
      toast.success(`Période d'essai prolongée de ${trialDays} jours`);
      loadData();
      setShowExtendTrial(false);
    } catch (error) {
      toast.error('Erreur lors de la prolongation');
    }
  };

  const handleApplyDiscount = async () => {
    if (!selectedEntreprise) return;
    try {
      await api.post(`/super-admin/entreprises/${selectedEntreprise.id || selectedEntreprise.entreprise?.id}/apply-coupon`, {
        discount_type: discountType,
        discount_value: discountValue,
        duration_months: discountMonths,
        reason: 'Réduction Super Admin'
      });
      toast.success('Réduction appliquée');
      loadData();
      setShowApplyDiscount(false);
    } catch (error) {
      toast.error('Erreur lors de l\'application');
    }
  };

  const handleSendCommunication = async () => {
    if (!commSubject || !commMessage) {
      toast.error('Sujet et message requis');
      return;
    }
    
    try {
      const payload = {
        target: commTarget,
        subject: commSubject,
        message: commMessage,
        send_email: commSendEmail,
        send_notification: commSendNotif
      };
      
      if (commTarget === 'single' && selectedEntreprise) {
        payload.entreprise_ids = [selectedEntreprise.id || selectedEntreprise.entreprise?.id];
      } else if (commTarget === 'plan') {
        payload.plan = filterPlan !== 'all' ? filterPlan : 'startup';
      }
      
      const res = await api.post('/super-admin/communicate', payload);
      toast.success(res.data.message);
      setShowCommunicate(false);
      setCommSubject('');
      setCommMessage('');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };

  const handleCreateCoupon = async () => {
    try {
      await api.post('/super-admin/coupons', {
        code: couponCode || undefined,
        discount_type: couponType,
        discount_value: couponValue,
        max_uses: couponMaxUses,
        description: `Coupon ${couponValue}${couponType === 'percentage' ? '%' : '€'}`
      });
      toast.success('Coupon créé');
      loadData();
      setShowCreateCoupon(false);
      setCouponCode('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/super-admin/export/entreprises', {
        responseType: 'blob',
        params: {
          plan: filterPlan !== 'all' ? filterPlan : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined
        }
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `entreprises_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Export téléchargé');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    } finally {
      setExporting(false);
    }
  };

  const filteredEntreprises = entreprises.filter(ent => {
    const matchesSearch = !searchQuery || 
      ent.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ent.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || ent.plan === filterPlan;
    const matchesStatus = filterStatus === 'all' || ent.subscription_status === filterStatus;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getPlanBadge = (plan) => {
    const styles = {
      startup: 'bg-slate-700 text-slate-200 border border-slate-600',
      pro: 'bg-blue-900/50 text-blue-300 border border-blue-700',
      enterprise: 'bg-purple-900/50 text-purple-300 border border-purple-700'
    };
    const labels = { startup: 'Startup', pro: 'Pro', enterprise: 'Entreprise' };
    const prices = { startup: '19,99€', pro: '49,99€', enterprise: '89,99€' };
    return (
      <Badge className={styles[plan] || styles.startup}>
        {labels[plan] || plan} ({prices[plan] || '?'})
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-900/50 text-green-300 border border-green-700',
      trial: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
      cancelled: 'bg-red-900/50 text-red-300 border border-red-700',
      past_due: 'bg-orange-900/50 text-orange-300 border border-orange-700',
      suspended: 'bg-slate-700 text-slate-300 border border-slate-600'
    };
    const labels = {
      active: 'Actif', trial: 'Essai', cancelled: 'Résilié',
      past_due: 'Impayé', suspended: 'Suspendu'
    };
    return (
      <Badge className={styles[status] || styles.active}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-slate-400">Chargement du dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-3 sm:px-4 lg:px-8 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white px-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline ml-2">Dashboard</span>
            </Button>
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h1 className="text-base sm:text-lg font-bold">Super Admin</h1>
            </div>
          </div>
          
          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              disabled={exporting}
              className="border-slate-600 text-slate-300"
            >
              <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-pulse' : ''}`} />
              Export CSV
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setCommTarget('all');
                setShowCommunicate(true);
              }}
              className="border-slate-600 text-slate-300"
            >
              <Mail className="w-4 h-4 mr-2" />
              Communiquer
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {/* Mobile menu */}
          <div className="flex md:hidden items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-600 text-slate-300 px-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 px-2">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                <DropdownMenuItem 
                  onClick={handleExport}
                  disabled={exporting}
                  className="text-slate-300 focus:bg-slate-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => {
                    setCommTarget('all');
                    setShowCommunicate(true);
                  }}
                  className="text-slate-300 focus:bg-slate-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Communiquer
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-700" />
                <DropdownMenuItem 
                  onClick={() => setShowCreateCoupon(true)}
                  className="text-slate-300 focus:bg-slate-700"
                >
                  <Gift className="w-4 h-4 mr-2" />
                  Créer coupon
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20">
        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-slate-400 text-xs sm:text-sm">Entreprises</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats?.entreprises?.total || 0}</p>
                  <p className="text-xs text-green-400">+{stats?.entreprises?.recent_signups || 0} ce mois</p>
                </div>
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-slate-400 text-xs sm:text-sm">Utilisateurs</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {stats?.users?.admins || 0}A · {stats?.users?.technicians || 0}T
                  </p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-slate-400 text-xs sm:text-sm">MRR</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{revenue?.current_mrr || stats?.revenue?.mrr || 0}€</p>
                  <p className="text-xs text-slate-400">ARR: {revenue?.arr || (stats?.revenue?.mrr || 0) * 12}€</p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-slate-400 text-xs sm:text-sm">Résiliations</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{stats?.cancellations?.total || 0}</p>
                  <p className="text-xs text-red-400">{stats?.cancellations?.recent || 0} cette sem.</p>
                </div>
                <XCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Hidden on mobile */}
        <div className="hidden sm:grid grid-cols-3 lg:grid-cols-6 gap-3">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <Activity className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.activity?.total_interventions || 0}</p>
              <p className="text-xs text-slate-400">Interventions</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <FileText className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.activity?.total_devis || 0}</p>
              <p className="text-xs text-slate-400">Devis</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <CreditCard className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.activity?.total_factures || 0}</p>
              <p className="text-xs text-slate-400">Factures</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <UserPlus className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.users?.active_today || 0}</p>
              <p className="text-xs text-slate-400">Actifs</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <Calendar className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats?.entreprises?.by_billing?.yearly || 0}</p>
              <p className="text-xs text-slate-400">Annuels</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-3 text-center">
              <Gift className="w-5 h-5 text-pink-400 mx-auto mb-1" />
              <p className="text-lg font-bold">{coupons.length}</p>
              <p className="text-xs text-slate-400">Coupons</p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2 px-3 sm:px-6">
            <CardTitle className="text-white text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
              <span>Répartition par plan</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateCoupon(true)}
                className="border-slate-600 text-xs hidden sm:flex"
              >
                <Gift className="w-3 h-3 mr-1" />
                Créer coupon
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
              <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden flex">
                {stats?.entreprises?.by_plan && stats?.entreprises?.total > 0 && (
                  <>
                    <div 
                      className="bg-slate-500 h-full flex items-center justify-center text-xs font-medium" 
                      style={{ width: `${(stats.entreprises.by_plan.startup / stats.entreprises.total) * 100}%` }}
                    >
                      {stats.entreprises.by_plan.startup > 0 && stats.entreprises.by_plan.startup}
                    </div>
                    <div 
                      className="bg-blue-500 h-full flex items-center justify-center text-xs font-medium" 
                      style={{ width: `${(stats.entreprises.by_plan.pro / stats.entreprises.total) * 100}%` }}
                    >
                      {stats.entreprises.by_plan.pro > 0 && stats.entreprises.by_plan.pro}
                    </div>
                    <div 
                      className="bg-purple-500 h-full flex items-center justify-center text-xs font-medium" 
                      style={{ width: `${(stats.entreprises.by_plan.enterprise / stats.entreprises.total) * 100}%` }}
                    >
                      {stats.entreprises.by_plan.enterprise > 0 && stats.entreprises.by_plan.enterprise}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm justify-center sm:justify-start">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-slate-500" />
                  S: {stats?.entreprises?.by_plan?.startup || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-blue-500" />
                  P: {stats?.entreprises?.by_plan?.pro || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 sm:w-3 sm:h-3 rounded bg-purple-500" />
                  E: {stats?.entreprises?.by_plan?.enterprise || 0}
                </span>
              </div>
            </div>
            
            {/* Revenue by plan - Hidden on mobile */}
            {revenue?.by_plan && (
              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 text-center hidden sm:grid">
                <div className="p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-xs">Startup</p>
                  <p className="text-base sm:text-lg font-bold">{revenue.by_plan.startup?.mrr || 0}€</p>
                </div>
                <div className="p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-xs">Pro</p>
                  <p className="text-base sm:text-lg font-bold">{revenue.by_plan.pro?.mrr || 0}€</p>
                </div>
                <div className="p-2 sm:p-3 bg-slate-700/50 rounded-lg">
                  <p className="text-slate-400 text-xs">Enterprise</p>
                  <p className="text-base sm:text-lg font-bold">{revenue.by_plan.enterprise?.mrr || 0}€</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="entreprises" className="space-y-3 sm:space-y-4">
          <TabsList className="bg-slate-800 flex-wrap h-auto p-1 gap-1">
            <TabsTrigger value="entreprises" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-2 sm:px-3">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden xs:inline">Entreprises</span>
              <span className="xs:hidden">Ent.</span>
              <span className="ml-1">({entreprises.length})</span>
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-2 sm:px-3">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Feedbacks</span>
              <span className="sm:hidden">FB</span>
              <span className="ml-1">({feedbacks.length})</span>
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-2 sm:px-3">
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Résiliations</span>
              <span className="sm:hidden">Rés.</span>
              <span className="ml-1">({cancellations.length})</span>
            </TabsTrigger>
            <TabsTrigger value="coupons" className="data-[state=active]:bg-slate-700 text-xs sm:text-sm px-2 sm:px-3">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span>Coupons</span>
              <span className="ml-1">({coupons.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Entreprises Tab */}
          <TabsContent value="entreprises" className="space-y-3 sm:space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher par nom ou email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800 border-slate-700 text-white"
                />
              </div>
              <Select value={filterPlan} onValueChange={setFilterPlan}>
                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="startup">Startup</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Entreprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="trial">Essai</SelectItem>
                  <SelectItem value="cancelled">Résilié</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-3">
              {filteredEntreprises.map((ent) => (
                <Card key={ent.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-white truncate">{ent.nom}</p>
                        <p className="text-xs text-slate-400 truncate">{ent.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getPlanBadge(ent.plan)}
                          {getStatusBadge(ent.subscription_status)}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          {ent.user_count || 0} users · {ent.intervention_count || 0} interv.
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem onClick={() => handleViewDetails(ent)} className="text-slate-300">
                            <Eye className="w-4 h-4 mr-2" />
                            Détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedEntreprise(ent); setShowEditPlan(true); }} className="text-slate-300">
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier plan
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedEntreprise(ent); setCommTarget('single'); setShowCommunicate(true); }} className="text-slate-300">
                            <Mail className="w-4 h-4 mr-2" />
                            Message
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {filteredEntreprises.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Aucune entreprise trouvée
                </div>
              )}
            </div>

            {/* Desktop Table */}
            <Card className="bg-slate-800 border-slate-700 overflow-hidden hidden sm:block">
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800">
                      <TableHead className="text-slate-400">Entreprise</TableHead>
                      <TableHead className="text-slate-400">Plan</TableHead>
                      <TableHead className="text-slate-400">Statut</TableHead>
                      <TableHead className="text-slate-400 hidden lg:table-cell">Utilisateurs</TableHead>
                      <TableHead className="text-slate-400 hidden lg:table-cell">Activité</TableHead>
                      <TableHead className="text-slate-400 hidden md:table-cell">Inscrit le</TableHead>
                      <TableHead className="text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntreprises.map((ent) => (
                      <TableRow key={ent.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-white">{ent.nom}</p>
                            <p className="text-xs text-slate-400">{ent.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {getPlanBadge(ent.plan)}
                            {ent.billing_cycle === 'yearly' && (
                              <Badge variant="outline" className="ml-1 text-xs border-green-600 text-green-400">
                                Annuel
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(ent.subscription_status)}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <span className="text-white">{ent.user_count || 0}</span>
                            <span className="text-slate-400 text-xs ml-1">
                              ({ent.admin_count || 0}A / {ent.tech_count || 0}T)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-xs text-slate-400">
                            <div>{ent.intervention_count || 0} interv.</div>
                            <div>{ent.devis_count || 0} devis · {ent.facture_count || 0} fact.</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm hidden md:table-cell">{formatDate(ent.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewDetails(ent)}
                              className="text-slate-400 hover:text-white h-8 w-8 p-0"
                              title="Voir détails"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEntreprise(ent);
                                setShowEditPlan(true);
                              }}
                              className="text-slate-400 hover:text-white h-8 w-8 p-0"
                              title="Modifier plan"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedEntreprise(ent);
                                setCommTarget('single');
                                setShowCommunicate(true);
                              }}
                              className="text-slate-400 hover:text-white h-8 w-8 p-0"
                              title="Envoyer message"
                            >
                              <Mail className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {filteredEntreprises.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  Aucune entreprise trouvée
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Feedbacks Tab */}
          <TabsContent value="feedbacks" className="space-y-4">
            {feedbacks.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun feedback pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {feedbacks.map((fb) => (
                  <Card key={fb.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {fb.type === 'bug' && <Bug className="w-4 h-4 text-red-400" />}
                            {fb.type === 'feature_request' && <Lightbulb className="w-4 h-4 text-yellow-400" />}
                            {fb.type === 'feedback' && <MessageSquare className="w-4 h-4 text-blue-400" />}
                            {fb.type === 'cancellation_reason' && <ThumbsDown className="w-4 h-4 text-red-400" />}
                            <Badge variant="outline" className="text-xs">
                              {fb.type || 'feedback'}
                            </Badge>
                            {fb.rating && (
                              <div className="flex items-center gap-0.5">
                                {[1,2,3,4,5].map(i => (
                                  <Star 
                                    key={i} 
                                    className={`w-3 h-3 ${i <= fb.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="font-medium text-white">{fb.subject || 'Sans sujet'}</p>
                          <p className="text-sm text-slate-300 mt-1">{fb.message}</p>
                          <p className="text-xs text-slate-500 mt-2">
                            {fb.user_email} · {formatDate(fb.created_at)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cancellations Tab */}
          <TabsContent value="cancellations" className="space-y-4">
            {cancellations.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
                  <p>Aucune résiliation ce mois-ci</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cancellations.map((cancel) => (
                  <Card key={cancel.id} className="bg-slate-800 border-slate-700 border-l-4 border-l-red-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{cancel.nom}</p>
                          <p className="text-sm text-slate-400">{cancel.email}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Plan: {cancel.plan} · Résilié le {formatDate(cancel.cancelled_at)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedEntreprise(cancel);
                              setNewStatus('active');
                              setShowChangeStatus(true);
                            }}
                            className="border-green-600 text-green-500 hover:bg-green-900/20"
                          >
                            Réactiver
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Coupons Tab */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCoupon(true)} className="bg-purple-600 hover:bg-purple-700">
                <Gift className="w-4 h-4 mr-2" />
                Créer un coupon
              </Button>
            </div>
            
            {coupons.length === 0 ? (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="py-12 text-center text-slate-400">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Aucun coupon créé</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {coupons.map((coupon) => (
                  <Card key={coupon.id} className="bg-slate-800 border-slate-700">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <code className="text-lg font-bold text-purple-400">{coupon.code}</code>
                        <Badge className={coupon.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}>
                          {coupon.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-white">
                        {coupon.discount_value}{coupon.discount_type === 'percentage' ? '%' : '€'}
                        <span className="text-sm font-normal text-slate-400 ml-2">de réduction</span>
                      </p>
                      <div className="mt-2 text-sm text-slate-400">
                        <p>Utilisations: {coupon.current_uses} / {coupon.max_uses === -1 ? '∞' : coupon.max_uses}</p>
                        {coupon.expires_at && <p>Expire: {formatDate(coupon.expires_at)}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedEntreprise?.entreprise?.nom}
            </DialogTitle>
          </DialogHeader>
          {selectedEntreprise && (
            <div className="space-y-6">
              {/* Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-xs">Plan</p>
                  <p className="font-medium">{selectedEntreprise.entreprise?.plan_name || selectedEntreprise.entreprise?.plan}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-xs">Statut</p>
                  <p className="font-medium">{selectedEntreprise.entreprise?.subscription_status}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-xs">Inscrit le</p>
                  <p className="font-medium">{formatDate(selectedEntreprise.entreprise?.created_at)}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-xs">Facturation</p>
                  <p className="font-medium">{selectedEntreprise.entreprise?.billing_cycle === 'yearly' ? 'Annuelle' : 'Mensuelle'}</p>
                </div>
              </div>
              
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedEntreprise.stats?.interventions || 0}</p>
                  <p className="text-xs text-slate-400">Interventions</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedEntreprise.stats?.devis || 0}</p>
                  <p className="text-xs text-slate-400">Devis</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedEntreprise.stats?.factures || 0}</p>
                  <p className="text-xs text-slate-400">Factures</p>
                </div>
                <div className="p-3 bg-slate-700/50 rounded-lg text-center">
                  <p className="text-2xl font-bold">{selectedEntreprise.stats?.clients || 0}</p>
                  <p className="text-xs text-slate-400">Clients</p>
                </div>
              </div>
              
              {/* Users */}
              <div>
                <h4 className="font-medium mb-3">Utilisateurs ({selectedEntreprise.users?.length || 0})</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedEntreprise.users?.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {u.role === 'admin' ? 'Admin' : 'Tech'}
                        </Badge>
                        <span>{u.prenom} {u.nom}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-slate-400">{u.email}</p>
                        <p className="text-xs text-slate-500">Dernière connexion: {formatDateTime(u.last_login)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-700">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setShowEditPlan(true);
                  }}
                  className="border-slate-600"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Modifier plan
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setNewStatus(selectedEntreprise.entreprise?.subscription_status || 'active');
                    setShowChangeStatus(true);
                  }}
                  className="border-slate-600"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Changer statut
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setShowExtendTrial(true);
                  }}
                  className="border-slate-600"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Prolonger essai
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setShowApplyDiscount(true);
                  }}
                  className="border-slate-600"
                >
                  <Percent className="w-4 h-4 mr-2" />
                  Appliquer réduction
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setShowDetails(false);
                    setCommTarget('single');
                    setShowCommunicate(true);
                  }}
                  className="border-slate-600"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Envoyer message
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Modal */}
      <Dialog open={showEditPlan} onOpenChange={setShowEditPlan}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Modifier le plan</DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedEntreprise?.nom || selectedEntreprise?.entreprise?.nom}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {['startup', 'pro', 'enterprise'].map(plan => (
              <Button
                key={plan}
                variant="outline"
                className={`w-full justify-between ${
                  (selectedEntreprise?.plan || selectedEntreprise?.entreprise?.plan) === plan 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-slate-600'
                }`}
                onClick={() => handleUpdatePlan(
                  selectedEntreprise?.id || selectedEntreprise?.entreprise?.id, 
                  plan
                )}
              >
                <span>{getPlanBadge(plan)}</span>
                <span className="text-slate-400">
                  {plan === 'startup' ? '19,99€/mois' : plan === 'pro' ? '49,99€/mois' : '89,99€/mois'}
                </span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Status Modal */}
      <Dialog open={showChangeStatus} onOpenChange={setShowChangeStatus}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nouveau statut</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="trial">Essai</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                  <SelectItem value="cancelled">Résilié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Raison (optionnel)</Label>
              <Textarea 
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Raison du changement..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangeStatus(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleUpdateStatus}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Modal */}
      <Dialog open={showExtendTrial} onOpenChange={setShowExtendTrial}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Prolonger la période d'essai</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de jours</Label>
              <Input 
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 14)}
                min={1}
                max={90}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtendTrial(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleExtendTrial}>
              Prolonger de {trialDays} jours
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Discount Modal */}
      <Dialog open={showApplyDiscount} onOpenChange={setShowApplyDiscount}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Appliquer une réduction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type de réduction</Label>
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur</Label>
              <Input 
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(parseInt(e.target.value) || 0)}
                min={1}
                max={discountType === 'percentage' ? 100 : 1000}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Durée (mois)</Label>
              <Input 
                type="number"
                value={discountMonths}
                onChange={(e) => setDiscountMonths(parseInt(e.target.value) || 1)}
                min={1}
                max={12}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDiscount(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleApplyDiscount}>
              Appliquer {discountValue}{discountType === 'percentage' ? '%' : '€'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Modal */}
      <Dialog open={showCommunicate} onOpenChange={setShowCommunicate}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Envoyer une communication
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Destinataires</Label>
              <Select value={commTarget} onValueChange={setCommTarget}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Entreprise sélectionnée</SelectItem>
                  <SelectItem value="plan">Toutes les entreprises d'un plan</SelectItem>
                  <SelectItem value="all">Toutes les entreprises actives</SelectItem>
                </SelectContent>
              </Select>
              {commTarget === 'single' && selectedEntreprise && (
                <p className="text-sm text-slate-400 mt-1">
                  → {selectedEntreprise.nom || selectedEntreprise.entreprise?.nom}
                </p>
              )}
            </div>
            
            <div>
              <Label>Sujet</Label>
              <Input 
                value={commSubject}
                onChange={(e) => setCommSubject(e.target.value)}
                placeholder="Sujet du message..."
                className="bg-slate-700 border-slate-600"
              />
            </div>
            
            <div>
              <Label>Message</Label>
              <Textarea 
                value={commMessage}
                onChange={(e) => setCommMessage(e.target.value)}
                placeholder="Votre message..."
                rows={5}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={commSendEmail} onCheckedChange={setCommSendEmail} />
                <Label className="text-sm">Envoyer par email</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={commSendNotif} onCheckedChange={setCommSendNotif} />
                <Label className="text-sm">Notification in-app</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommunicate(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleSendCommunication} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Modal */}
      <Dialog open={showCreateCoupon} onOpenChange={setShowCreateCoupon}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Créer un coupon
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code (optionnel, généré automatiquement si vide)</Label>
              <Input 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="PROMO2024"
                className="bg-slate-700 border-slate-600 uppercase"
              />
            </div>
            <div>
              <Label>Type de réduction</Label>
              <Select value={couponType} onValueChange={setCouponType}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                  <SelectItem value="fixed">Montant fixe (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valeur</Label>
              <Input 
                type="number"
                value={couponValue}
                onChange={(e) => setCouponValue(parseInt(e.target.value) || 0)}
                min={1}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label>Utilisations max (-1 = illimité)</Label>
              <Input 
                type="number"
                value={couponMaxUses}
                onChange={(e) => setCouponMaxUses(parseInt(e.target.value))}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCoupon(false)} className="border-slate-600">
              Annuler
            </Button>
            <Button onClick={handleCreateCoupon} className="bg-purple-600 hover:bg-purple-700">
              Créer le coupon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
