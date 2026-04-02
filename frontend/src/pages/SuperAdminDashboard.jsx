import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '../components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '../components/ui/table';
import {
  Building2, Users, TrendingUp, DollarSign, AlertTriangle, Search,
  BarChart3, Activity, MessageSquare, XCircle, CheckCircle, Clock,
  RefreshCw, Eye, Pencil, Trash2, Crown, Loader2, LogOut, ArrowLeft,
  Star, ThumbsDown, Bug, Lightbulb, ChevronRight
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedEntreprise, setSelectedEntreprise] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditPlan, setShowEditPlan] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, entreprisesRes, feedbacksRes, cancellationsRes] = await Promise.all([
        api.get('/super-admin/stats'),
        api.get('/super-admin/entreprises?limit=100'),
        api.get('/super-admin/feedbacks?limit=50'),
        api.get('/super-admin/cancellations?days=30')
      ]);
      
      setStats(statsRes.data);
      setEntreprises(entreprisesRes.data.entreprises || []);
      setFeedbacks(feedbacksRes.data.feedbacks || []);
      setCancellations(cancellationsRes.data.cancellations || []);
    } catch (error) {
      console.error('Error loading super admin data:', error);
      if (error.response?.status === 403) {
        toast.error('Accès non autorisé');
        navigate('/dashboard');
      } else {
        toast.error('Erreur lors du chargement des données');
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

  const handleUpdateStatus = async (entrepriseId, newStatus) => {
    try {
      await api.put(`/super-admin/entreprises/${entrepriseId}/status`, { status: newStatus });
      toast.success('Statut mis à jour');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
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

  const getPlanBadge = (plan) => {
    const styles = {
      startup: 'bg-slate-100 text-slate-700',
      pro: 'bg-blue-100 text-blue-700',
      enterprise: 'bg-purple-100 text-purple-700'
    };
    const labels = { startup: 'Startup', pro: 'Pro', enterprise: 'Entreprise' };
    return (
      <Badge className={styles[plan] || styles.startup}>
        {labels[plan] || plan}
      </Badge>
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-yellow-100 text-yellow-700',
      cancelled: 'bg-red-100 text-red-700',
      past_due: 'bg-orange-100 text-orange-700',
      suspended: 'bg-slate-100 text-slate-700'
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700 px-4 lg:px-8 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-slate-700" />
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-yellow-500" />
              <h1 className="text-lg font-bold">Super Admin</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={refreshing}
              className="border-slate-600 text-slate-300"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Entreprises</p>
                  <p className="text-2xl font-bold text-white">{stats?.entreprises?.total || 0}</p>
                  <p className="text-xs text-green-400">+{stats?.entreprises?.recent_signups || 0} ce mois</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Utilisateurs</p>
                  <p className="text-2xl font-bold text-white">{stats?.users?.total || 0}</p>
                  <p className="text-xs text-slate-400">
                    {stats?.users?.admins || 0} admins · {stats?.users?.technicians || 0} techs
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">MRR</p>
                  <p className="text-2xl font-bold text-white">{stats?.revenue?.mrr || 0}€</p>
                  <p className="text-xs text-slate-400">ARR: {(stats?.revenue?.mrr || 0) * 12}€</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Résiliations</p>
                  <p className="text-2xl font-bold text-white">{stats?.cancellations?.total || 0}</p>
                  <p className="text-xs text-red-400">{stats?.cancellations?.recent || 0} cette semaine</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Activity className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats?.activity?.total_interventions || 0}</p>
              <p className="text-xs text-slate-400">Interventions totales</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats?.activity?.interventions_this_month || 0}</p>
              <p className="text-xs text-slate-400">Ce mois</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats?.activity?.total_devis || 0}</p>
              <p className="text-xs text-slate-400">Devis</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats?.activity?.total_factures || 0}</p>
              <p className="text-xs text-slate-400">Factures</p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-base">Répartition par plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden flex">
                {stats?.entreprises?.by_plan && (
                  <>
                    <div 
                      className="bg-slate-500 h-full" 
                      style={{ width: `${(stats.entreprises.by_plan.startup / stats.entreprises.total) * 100}%` }}
                      title="Startup"
                    />
                    <div 
                      className="bg-blue-500 h-full" 
                      style={{ width: `${(stats.entreprises.by_plan.pro / stats.entreprises.total) * 100}%` }}
                      title="Pro"
                    />
                    <div 
                      className="bg-purple-500 h-full" 
                      style={{ width: `${(stats.entreprises.by_plan.enterprise / stats.entreprises.total) * 100}%` }}
                      title="Entreprise"
                    />
                  </>
                )}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-slate-500" />
                  Startup: {stats?.entreprises?.by_plan?.startup || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  Pro: {stats?.entreprises?.by_plan?.pro || 0}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-500" />
                  Entreprise: {stats?.entreprises?.by_plan?.enterprise || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="entreprises" className="space-y-4">
          <TabsList className="bg-slate-800">
            <TabsTrigger value="entreprises" className="data-[state=active]:bg-slate-700">
              <Building2 className="w-4 h-4 mr-2" />
              Entreprises
            </TabsTrigger>
            <TabsTrigger value="feedbacks" className="data-[state=active]:bg-slate-700">
              <MessageSquare className="w-4 h-4 mr-2" />
              Feedbacks ({feedbacks.length})
            </TabsTrigger>
            <TabsTrigger value="cancellations" className="data-[state=active]:bg-slate-700">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Résiliations ({cancellations.length})
            </TabsTrigger>
          </TabsList>

          {/* Entreprises Tab */}
          <TabsContent value="entreprises" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Rechercher..."
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
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-slate-800">
                    <TableHead className="text-slate-400">Entreprise</TableHead>
                    <TableHead className="text-slate-400">Plan</TableHead>
                    <TableHead className="text-slate-400">Statut</TableHead>
                    <TableHead className="text-slate-400">Utilisateurs</TableHead>
                    <TableHead className="text-slate-400">Créé le</TableHead>
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
                      <TableCell>{getPlanBadge(ent.plan)}</TableCell>
                      <TableCell>{getStatusBadge(ent.subscription_status)}</TableCell>
                      <TableCell className="text-slate-300">{ent.user_count || 0}</TableCell>
                      <TableCell className="text-slate-400 text-sm">{formatDate(ent.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewDetails(ent)}
                            className="text-slate-400 hover:text-white"
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
                            className="text-slate-400 hover:text-white"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
                  <p>Aucune résiliation ce mois-ci 🎉</p>
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleUpdateStatus(cancel.id, 'active')}
                          className="border-green-600 text-green-500 hover:bg-green-900/20"
                        >
                          Réactiver
                        </Button>
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
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedEntreprise?.entreprise?.nom}
            </DialogTitle>
          </DialogHeader>
          {selectedEntreprise && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-sm">Plan</p>
                  <p className="font-medium">{selectedEntreprise.entreprise?.plan_name}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-sm">Statut</p>
                  <p className="font-medium">{selectedEntreprise.entreprise?.subscription_status}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-sm">Interventions</p>
                  <p className="font-medium">{selectedEntreprise.stats?.interventions || 0}</p>
                </div>
                <div className="p-3 bg-slate-700 rounded-lg">
                  <p className="text-slate-400 text-sm">Clients</p>
                  <p className="font-medium">{selectedEntreprise.stats?.clients || 0}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Utilisateurs ({selectedEntreprise.users?.length || 0})</h4>
                <div className="space-y-2">
                  {selectedEntreprise.users?.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {u.role === 'admin' ? 'Admin' : 'Tech'}
                        </Badge>
                        <span>{u.prenom} {u.nom}</span>
                      </div>
                      <span className="text-sm text-slate-400">{u.email}</span>
                    </div>
                  ))}
                </div>
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
                className={`w-full justify-start ${
                  (selectedEntreprise?.plan || selectedEntreprise?.entreprise?.plan) === plan 
                    ? 'border-blue-500 bg-blue-900/20' 
                    : 'border-slate-600'
                }`}
                onClick={() => handleUpdatePlan(
                  selectedEntreprise?.id || selectedEntreprise?.entreprise?.id, 
                  plan
                )}
              >
                {getPlanBadge(plan)}
                <span className="ml-2">{plan === 'startup' ? '29€/mois' : plan === 'pro' ? '79€/mois' : '199€/mois'}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminDashboard;
