import React, { useState, useEffect, useMemo } from 'react';
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
import { Progress } from '../components/ui/progress';
import {
  Building2, Users, TrendingUp, DollarSign, AlertTriangle, Search,
  BarChart3, Activity, MessageSquare, XCircle, CheckCircle, Clock,
  RefreshCw, Eye, Pencil, Trash2, Crown, Loader2, LogOut, ArrowLeft,
  Star, ThumbsDown, Bug, Lightbulb, ChevronRight, Mail, Bell, Send,
  Download, Gift, Calendar, CreditCard, UserPlus, ArrowUpRight,
  ArrowDownRight, Percent, Filter, MoreVertical, Play, Pause,
  FileText, PieChart, Menu, Plane, Gauge, Radio, Shield, Settings,
  AlertCircle, TrendingDown, Zap, Target, Database, Server, Globe,
  ChevronDown, ChevronUp, HelpCircle, Banknote, Receipt, Package
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

// Cancellation reasons mapping
const CANCELLATION_REASONS = {
  'too_expensive': { label: 'Trop cher', icon: Banknote, color: 'text-red-600 bg-red-50' },
  'not_used': { label: 'Pas assez utilisé', icon: Clock, color: 'text-orange-600 bg-orange-50' },
  'missing_features': { label: 'Fonctionnalités manquantes', icon: Package, color: 'text-yellow-600 bg-yellow-50' },
  'other_software': { label: 'Autre logiciel', icon: Globe, color: 'text-blue-600 bg-blue-50' },
  'business_closed': { label: 'Fermeture activité', icon: Building2, color: 'text-gray-600 bg-gray-50' },
  'temporary_pause': { label: 'Pause temporaire', icon: Pause, color: 'text-purple-600 bg-purple-50' },
  'other': { label: 'Autre raison', icon: HelpCircle, color: 'text-slate-600 bg-slate-50' }
};

// Plan colors
const PLAN_COLORS = {
  startup: { bg: 'bg-emerald-500', text: 'text-emerald-700', light: 'bg-emerald-50', border: 'border-emerald-200' },
  pro: { bg: 'bg-blue-500', text: 'text-blue-700', light: 'bg-blue-50', border: 'border-blue-200' },
  enterprise: { bg: 'bg-purple-500', text: 'text-purple-700', light: 'bg-purple-50', border: 'border-purple-200' },
  trial: { bg: 'bg-amber-500', text: 'text-amber-700', light: 'bg-amber-50', border: 'border-amber-200' }
};

const PLAN_PRICES = { startup: 19.99, pro: 49.99, enterprise: 89.99 };

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [entreprises, setEntreprises] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [cancellationReasons, setCancellationReasons] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [interventions, setInterventions] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  // Modals
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [showCommunicate, setShowCommunicate] = useState(false);
  const [showCreateCoupon, setShowCreateCoupon] = useState(false);
  
  // Forms
  const [commSubject, setCommSubject] = useState('');
  const [commMessage, setCommMessage] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponValue, setCouponValue] = useState(10);
  
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [
        entreprisesRes, 
        usersRes, 
        feedbacksRes, 
        couponsRes,
        interventionsRes,
        cancellationReasonsRes
      ] = await Promise.all([
        supabase.from('entreprises').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('feedbacks').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('coupons').select('*').order('created_at', { ascending: false }),
        supabase.from('interventions').select('id, status, created_at').limit(1000),
        supabase.from('cancellation_reasons').select('*').order('created_at', { ascending: false })
      ]);
      
      const allEntreprises = entreprisesRes.data || [];
      const allUsers = usersRes.data || [];
      const allInterventions = interventionsRes.data || [];
      const allCancellationReasons = cancellationReasonsRes.data || [];
      
      // Calculate comprehensive stats
      const now = new Date();
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      
      // Entreprises stats
      const totalEntreprises = allEntreprises.length;
      const activeEntreprises = allEntreprises.filter(e => e.subscription_status !== 'cancelled').length;
      const trialEntreprises = allEntreprises.filter(e => e.subscription_status === 'trial' || e.plan === 'trial').length;
      const cancelledEntreprises = allEntreprises.filter(e => e.subscription_status === 'cancelled');
      const recentSignups = allEntreprises.filter(e => new Date(e.created_at) >= thirtyDaysAgo).length;
      
      // By plan
      const byPlan = {
        startup: allEntreprises.filter(e => e.plan === 'startup' && e.subscription_status !== 'cancelled').length,
        pro: allEntreprises.filter(e => e.plan === 'pro' && e.subscription_status !== 'cancelled').length,
        enterprise: allEntreprises.filter(e => e.plan === 'enterprise' && e.subscription_status !== 'cancelled').length,
        trial: trialEntreprises
      };
      
      // Revenue
      const mrr = allEntreprises.reduce((sum, e) => {
        if (e.subscription_status === 'cancelled') return sum;
        return sum + (PLAN_PRICES[e.plan] || 0);
      }, 0);
      
      // Users stats
      const admins = allUsers.filter(u => u.role === 'admin').length;
      const technicians = allUsers.filter(u => u.role === 'tech' || u.role === 'technicien').length;
      const activeToday = allUsers.filter(u => u.last_login && new Date(u.last_login) >= todayStart).length;
      
      // Cancellation stats
      const recentCancellations = cancelledEntreprises.filter(e => new Date(e.updated_at) >= sevenDaysAgo).length;
      
      // Cancellation reasons aggregation
      const reasonsCount = {};
      allCancellationReasons.forEach(r => {
        reasonsCount[r.reason] = (reasonsCount[r.reason] || 0) + 1;
      });
      
      setStats({
        entreprises: {
          total: totalEntreprises,
          active: activeEntreprises,
          trial: trialEntreprises,
          cancelled: cancelledEntreprises.length,
          recent_signups: recentSignups,
          by_plan: byPlan
        },
        users: {
          total: allUsers.length,
          admins,
          technicians,
          active_today: activeToday
        },
        revenue: {
          mrr: Math.round(mrr * 100) / 100,
          arr: Math.round(mrr * 12 * 100) / 100
        },
        cancellations: {
          total: cancelledEntreprises.length,
          recent: recentCancellations,
          reasons: reasonsCount
        },
        activity: {
          total_interventions: allInterventions.length,
          interventions_today: allInterventions.filter(i => new Date(i.created_at) >= todayStart).length
        }
      });
      
      setEntreprises(allEntreprises);
      setUsers(allUsers);
      setFeedbacks(feedbacksRes.data || []);
      setCoupons(couponsRes.data || []);
      setInterventions(allInterventions);
      setCancellations(cancelledEntreprises);
      setCancellationReasons(allCancellationReasons);
      
    } catch (error) {
      console.error('Error loading super admin data:', error);
      toast.error('Erreur lors du chargement des données');
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

  // Filter entreprises
  const filteredEntreprises = useMemo(() => {
    return entreprises.filter(e => {
      const matchesSearch = !searchQuery || 
        e.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlan = filterPlan === 'all' || e.plan === filterPlan;
      const matchesStatus = filterStatus === 'all' || e.subscription_status === filterStatus;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [entreprises, searchQuery, filterPlan, filterStatus]);

  const handleExport = () => {
    const headers = ['Nom', 'Email', 'Plan', 'Statut', 'MRR', 'Créé le'];
    const rows = entreprises.map(e => [
      e.nom,
      e.email,
      e.plan,
      e.subscription_status || 'active',
      PLAN_PRICES[e.plan] || 0,
      new Date(e.created_at).toLocaleDateString('fr-FR')
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `actoos-entreprises-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Export téléchargé');
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Chargement du Cockpit...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      {/* Header - Cockpit Style */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo & Title */}
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Plane className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">Control Center</h1>
                  <p className="text-xs text-slate-500">ACTOOS PRO • Super Admin</p>
                </div>
              </div>
            </div>
            
            {/* Center - Status Indicators */}
            <div className="hidden lg:flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-sm text-slate-600">Système opérationnel</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
                <Database className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{stats?.entreprises?.total || 0} entreprises</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">{formatCurrency(stats?.revenue?.mrr || 0)}/mois</span>
              </div>
            </div>
            
            {/* Right - Actions */}
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                className="hidden sm:flex"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={logout}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-4 lg:px-6 py-6">
        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Gauge className="w-4 h-4 mr-2" />
              Vue d'ensemble
            </TabsTrigger>
            <TabsTrigger value="entreprises" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Building2 className="w-4 h-4 mr-2" />
              Entreprises ({stats?.entreprises?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="users" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Utilisateurs ({stats?.users?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="rounded-lg data-[state=active]:bg-red-500 data-[state=active]:text-white">
              <XCircle className="w-4 h-4 mr-2" />
              Résiliations ({stats?.cancellations?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedbacks ({feedbacks.length})
            </TabsTrigger>
            <TabsTrigger value="coupons" className="rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
              <Gift className="w-4 h-4 mr-2" />
              Coupons ({coupons.length})
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            {/* Main KPIs - Cockpit Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* MRR Card */}
              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm font-medium">Revenue Mensuel</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.revenue?.mrr || 0)}</p>
                      <p className="text-emerald-200 text-sm mt-1">ARR: {formatCurrency(stats?.revenue?.arr || 0)}</p>
                    </div>
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Entreprises Card */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Entreprises</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.entreprises?.total || 0}</p>
                      <p className="text-emerald-600 text-sm mt-1 flex items-center">
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                        +{stats?.entreprises?.recent_signups || 0} ce mois
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Users Card */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Utilisateurs</p>
                      <p className="text-3xl font-bold text-slate-900 mt-1">{stats?.users?.total || 0}</p>
                      <p className="text-slate-500 text-sm mt-1">
                        {stats?.users?.admins || 0} admins • {stats?.users?.technicians || 0} techs
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cancellations Card */}
              <Card className={`border shadow-sm ${stats?.cancellations?.recent > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`text-sm font-medium ${stats?.cancellations?.recent > 0 ? 'text-red-600' : 'text-slate-500'}`}>Résiliations</p>
                      <p className={`text-3xl font-bold mt-1 ${stats?.cancellations?.recent > 0 ? 'text-red-700' : 'text-slate-900'}`}>
                        {stats?.cancellations?.total || 0}
                      </p>
                      <p className={`text-sm mt-1 ${stats?.cancellations?.recent > 0 ? 'text-red-500' : 'text-slate-500'}`}>
                        {stats?.cancellations?.recent || 0} cette semaine
                      </p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats?.cancellations?.recent > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                      <XCircle className={`w-6 h-6 ${stats?.cancellations?.recent > 0 ? 'text-red-600' : 'text-slate-500'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Plan Distribution & Cancellation Reasons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Plan Distribution */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-emerald-600" />
                    Répartition par Plan
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Visual bars */}
                  <div className="space-y-3">
                    {[
                      { name: 'Enterprise', key: 'enterprise', price: '89,99€' },
                      { name: 'Pro', key: 'pro', price: '49,99€' },
                      { name: 'Startup', key: 'startup', price: '19,99€' },
                      { name: 'Trial', key: 'trial', price: 'Gratuit' }
                    ].map(plan => {
                      const count = stats?.entreprises?.by_plan?.[plan.key] || 0;
                      const total = stats?.entreprises?.active || 1;
                      const percent = Math.round((count / total) * 100);
                      return (
                        <div key={plan.key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${PLAN_COLORS[plan.key]?.bg}`} />
                              <span className="font-medium text-slate-700">{plan.name}</span>
                              <span className="text-slate-400">{plan.price}</span>
                            </div>
                            <span className="font-semibold text-slate-900">{count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${PLAN_COLORS[plan.key]?.bg} transition-all duration-500`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Revenue breakdown */}
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mb-2">Contribution au MRR</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className={`p-3 rounded-lg ${PLAN_COLORS.enterprise.light} ${PLAN_COLORS.enterprise.border} border`}>
                        <p className="text-xs text-purple-600 font-medium">Enterprise</p>
                        <p className="text-lg font-bold text-purple-700">
                          {formatCurrency((stats?.entreprises?.by_plan?.enterprise || 0) * 89.99)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${PLAN_COLORS.pro.light} ${PLAN_COLORS.pro.border} border`}>
                        <p className="text-xs text-blue-600 font-medium">Pro</p>
                        <p className="text-lg font-bold text-blue-700">
                          {formatCurrency((stats?.entreprises?.by_plan?.pro || 0) * 49.99)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${PLAN_COLORS.startup.light} ${PLAN_COLORS.startup.border} border`}>
                        <p className="text-xs text-emerald-600 font-medium">Startup</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {formatCurrency((stats?.entreprises?.by_plan?.startup || 0) * 19.99)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cancellation Reasons */}
              <Card className="bg-white border border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    Raisons de Résiliation
                  </CardTitle>
                  <CardDescription>Analyse des motifs d'annulation</CardDescription>
                </CardHeader>
                <CardContent>
                  {Object.keys(stats?.cancellations?.reasons || {}).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(stats?.cancellations?.reasons || {}).map(([reason, count]) => {
                        const reasonData = CANCELLATION_REASONS[reason] || CANCELLATION_REASONS['other'];
                        const Icon = reasonData.icon;
                        const total = stats?.cancellations?.total || 1;
                        const percent = Math.round((count / total) * 100);
                        return (
                          <div key={reason} className={`p-3 rounded-lg ${reasonData.color} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                              <Icon className="w-5 h-5" />
                              <div>
                                <p className="font-medium">{reasonData.label}</p>
                                <p className="text-sm opacity-75">{percent}% des résiliations</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">Aucune résiliation enregistrée</p>
                      <p className="text-sm text-slate-400 mt-1">Excellent ! Vos clients sont satisfaits.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  Activité Récente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats?.activity?.interventions_today || 0}</p>
                    <p className="text-sm text-slate-500">Interventions aujourd'hui</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <FileText className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats?.activity?.total_interventions || 0}</p>
                    <p className="text-sm text-slate-500">Total interventions</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <UserPlus className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{stats?.users?.active_today || 0}</p>
                    <p className="text-sm text-slate-500">Utilisateurs actifs</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl text-center">
                    <MessageSquare className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-slate-900">{feedbacks.length}</p>
                    <p className="text-sm text-slate-500">Feedbacks reçus</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ENTREPRISES TAB */}
          <TabsContent value="entreprises" className="space-y-4">
            {/* Filters */}
            <Card className="bg-white border border-slate-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Rechercher par nom ou email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les plans</SelectItem>
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="trial">Essai</SelectItem>
                      <SelectItem value="cancelled">Annulé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Entreprises Table */}
            <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Utilisateurs</TableHead>
                    <TableHead>MRR</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntreprises.map((entreprise) => {
                    const userCount = users.filter(u => u.entreprise_id === entreprise.id).length;
                    return (
                      <TableRow key={entreprise.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{entreprise.nom || 'Sans nom'}</p>
                            <p className="text-sm text-slate-500">{entreprise.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${PLAN_COLORS[entreprise.plan]?.light} ${PLAN_COLORS[entreprise.plan]?.text} border-0`}>
                            {entreprise.plan?.charAt(0).toUpperCase() + entreprise.plan?.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entreprise.subscription_status === 'cancelled' ? (
                            <Badge variant="destructive">Annulé</Badge>
                          ) : entreprise.subscription_status === 'trial' ? (
                            <Badge className="bg-amber-50 text-amber-700">Essai</Badge>
                          ) : (
                            <Badge className="bg-emerald-50 text-emerald-700">Actif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">{userCount}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-slate-900">
                            {entreprise.subscription_status === 'cancelled' ? '-' : formatCurrency(PLAN_PRICES[entreprise.plan] || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500">{formatDate(entreprise.created_at)}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedEntreprise(entreprise); setShowDetails(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedEntreprise(entreprise); setShowEditPlan(true); }}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Changer plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedEntreprise(entreprise); setShowCommunicate(true); }}>
                                <Mail className="w-4 h-4 mr-2" />
                                Contacter
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredEntreprises.length === 0 && (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">Aucune entreprise trouvée</p>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users" className="space-y-4">
            <Card className="bg-white border border-slate-200 shadow-sm overflow-hidden">
              <CardHeader>
                <CardTitle>Tous les Utilisateurs</CardTitle>
                <CardDescription>{users.length} utilisateurs au total</CardDescription>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const ent = entreprises.find(e => e.id === u.entreprise_id);
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{u.nom || u.email}</p>
                            <p className="text-sm text-slate-500">{u.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={u.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}>
                            {u.role === 'admin' ? 'Admin' : 'Technicien'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-600">{ent?.nom || '-'}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-slate-500">{formatDate(u.created_at)}</span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* CANCELLATIONS TAB */}
          <TabsContent value="cancellations" className="space-y-4">
            {/* Cancellation Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
                      <XCircle className="w-7 h-7 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Résiliations</p>
                      <p className="text-3xl font-bold text-slate-900">{stats?.cancellations?.total || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Cette Semaine</p>
                      <p className="text-3xl font-bold text-slate-900">{stats?.cancellations?.recent || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-slate-200">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Taux de Churn</p>
                      <p className="text-3xl font-bold text-slate-900">
                        {stats?.entreprises?.total ? Math.round((stats.cancellations.total / stats.entreprises.total) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Reasons Breakdown */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Analyse des Raisons de Résiliation
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(stats?.cancellations?.reasons || {}).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(CANCELLATION_REASONS).map(([key, data]) => {
                      const count = stats?.cancellations?.reasons?.[key] || 0;
                      const Icon = data.icon;
                      return (
                        <div key={key} className={`p-4 rounded-xl border ${data.color.replace('text-', 'border-').replace('bg-', '')}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg ${data.color} flex items-center justify-center`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{data.label}</p>
                              <p className="text-sm text-slate-500">{count} résiliation{count > 1 ? 's' : ''}</p>
                            </div>
                            <span className="text-2xl font-bold text-slate-700">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <p className="text-xl font-medium text-slate-700">Aucune résiliation</p>
                    <p className="text-slate-500 mt-2">Vos clients sont satisfaits ! Continuez ainsi.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancelled Entreprises List */}
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle>Entreprises Résiliées</CardTitle>
              </CardHeader>
              <CardContent>
                {cancellations.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entreprise</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Date résiliation</TableHead>
                        <TableHead>Raison</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cancellations.map((c) => {
                        const reason = cancellationReasons.find(r => r.entreprise_id === c.id);
                        const reasonData = reason ? CANCELLATION_REASONS[reason.reason] : null;
                        return (
                          <TableRow key={c.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{c.nom}</p>
                                <p className="text-sm text-slate-500">{c.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{c.plan}</Badge>
                            </TableCell>
                            <TableCell>{formatDate(c.updated_at)}</TableCell>
                            <TableCell>
                              {reasonData ? (
                                <Badge className={reasonData.color}>{reasonData.label}</Badge>
                              ) : (
                                <span className="text-slate-400">Non spécifiée</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center py-8 text-slate-500">Aucune entreprise résiliée</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FEEDBACKS TAB */}
          <TabsContent value="feedbacks" className="space-y-4">
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                  Feedbacks Utilisateurs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedbacks.length > 0 ? (
                  <div className="space-y-4">
                    {feedbacks.map((fb) => (
                      <div key={fb.id} className="p-4 bg-slate-50 rounded-xl">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-slate-900">{fb.user_email || 'Anonyme'}</p>
                            <p className="text-sm text-slate-500">{formatDate(fb.created_at)}</p>
                          </div>
                          <Badge className={
                            fb.type === 'bug' ? 'bg-red-50 text-red-700' :
                            fb.type === 'feature' ? 'bg-blue-50 text-blue-700' :
                            'bg-emerald-50 text-emerald-700'
                          }>
                            {fb.type === 'bug' ? 'Bug' : fb.type === 'feature' ? 'Suggestion' : 'Feedback'}
                          </Badge>
                        </div>
                        <p className="text-slate-700">{fb.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun feedback pour le moment</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* COUPONS TAB */}
          <TabsContent value="coupons" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCoupon(true)} className="bg-emerald-600 hover:bg-emerald-700">
                <Gift className="w-4 h-4 mr-2" />
                Créer un coupon
              </Button>
            </div>
            <Card className="bg-white border border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-emerald-600" />
                  Coupons de Réduction
                </CardTitle>
              </CardHeader>
              <CardContent>
                {coupons.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Réduction</TableHead>
                        <TableHead>Utilisations</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créé le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.map((coupon) => (
                        <TableRow key={coupon.id}>
                          <TableCell>
                            <code className="bg-slate-100 px-2 py-1 rounded font-mono">{coupon.code}</code>
                          </TableCell>
                          <TableCell>
                            {coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                          </TableCell>
                          <TableCell>
                            {coupon.uses || 0} / {coupon.max_uses === -1 ? '∞' : coupon.max_uses}
                          </TableCell>
                          <TableCell>
                            <Badge className={coupon.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                              {coupon.active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(coupon.created_at)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <Gift className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">Aucun coupon créé</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Entreprise Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de l'Entreprise</DialogTitle>
          </DialogHeader>
          {selectedEntreprise && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Nom</Label>
                  <p className="font-medium">{selectedEntreprise.nom}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Email</Label>
                  <p className="font-medium">{selectedEntreprise.email}</p>
                </div>
                <div>
                  <Label className="text-slate-500">Plan</Label>
                  <Badge className={`${PLAN_COLORS[selectedEntreprise.plan]?.light} ${PLAN_COLORS[selectedEntreprise.plan]?.text}`}>
                    {selectedEntreprise.plan}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-500">Statut</Label>
                  <Badge className={selectedEntreprise.subscription_status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}>
                    {selectedEntreprise.subscription_status || 'active'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-500">Créé le</Label>
                  <p>{formatDate(selectedEntreprise.created_at)}</p>
                </div>
                <div>
                  <Label className="text-slate-500">MRR</Label>
                  <p className="font-medium">{formatCurrency(PLAN_PRICES[selectedEntreprise.plan] || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Plan Dialog */}
      <Dialog open={showEditPlan} onOpenChange={setShowEditPlan}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le Plan</DialogTitle>
            <DialogDescription>Modifier le plan de {selectedEntreprise?.nom}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {['startup', 'pro', 'enterprise'].map(plan => (
                <button
                  key={plan}
                  onClick={async () => {
                    try {
                      await supabase.from('entreprises').update({ plan }).eq('id', selectedEntreprise.id);
                      toast.success('Plan mis à jour');
                      setShowEditPlan(false);
                      loadData();
                    } catch (e) {
                      toast.error('Erreur lors de la mise à jour');
                    }
                  }}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    selectedEntreprise?.plan === plan 
                      ? `${PLAN_COLORS[plan].border} ${PLAN_COLORS[plan].light}` 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium capitalize">{plan}</p>
                  <p className="text-sm text-slate-500">{PLAN_PRICES[plan]}€/mois</p>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Communicate Dialog */}
      <Dialog open={showCommunicate} onOpenChange={setShowCommunicate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contacter l'Entreprise</DialogTitle>
            <DialogDescription>Envoyer un message à {selectedEntreprise?.nom}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sujet</Label>
              <Input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} placeholder="Sujet du message" />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea value={commMessage} onChange={(e) => setCommMessage(e.target.value)} rows={5} placeholder="Votre message..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCommunicate(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              toast.success('Message envoyé');
              setShowCommunicate(false);
              setCommSubject('');
              setCommMessage('');
            }}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Coupon Dialog */}
      <Dialog open={showCreateCoupon} onOpenChange={setShowCreateCoupon}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Code du coupon</Label>
              <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="EX: PROMO20" />
            </div>
            <div>
              <Label>Réduction (%)</Label>
              <Input type="number" value={couponValue} onChange={(e) => setCouponValue(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateCoupon(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
              try {
                await supabase.from('coupons').insert({
                  code: couponCode,
                  type: 'percentage',
                  value: couponValue,
                  max_uses: -1,
                  active: true
                });
                toast.success('Coupon créé');
                setShowCreateCoupon(false);
                setCouponCode('');
                setCouponValue(10);
                loadData();
              } catch (e) {
                toast.error('Erreur lors de la création');
              }
            }}>
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
