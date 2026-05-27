import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Shield, Building2, Briefcase, Users, Eye, FileText, 
  CheckCircle, XCircle, Clock, AlertTriangle, Search,
  MoreVertical, Trash2, Ban, Check, RefreshCw, Loader2,
  TrendingUp, ChevronRight, Filter, Calendar, MapPin
} from 'lucide-react';
import { cn, formatRelative, formatDate, CONTRACT_TYPES } from '../lib/utils';

// Stats Card
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue', onClick }) => (
  <Card 
    className={cn(
      "border-slate-200 transition-all",
      onClick && "cursor-pointer hover:shadow-lg hover:border-blue-300"
    )}
    onClick={onClick}
  >
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend !== undefined && (
            <p className={cn(
              'text-xs mt-1 flex items-center gap-1',
              trend > 0 ? 'text-green-600' : 'text-slate-500'
            )}>
              <TrendingUp className="w-3 h-3" />
              {trend > 0 ? '+' : ''}{trend}% ce mois
            </p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          color === 'blue' && 'bg-blue-100',
          color === 'green' && 'bg-green-100',
          color === 'yellow' && 'bg-yellow-100',
          color === 'red' && 'bg-red-100',
          color === 'purple' && 'bg-purple-100',
        )}>
          <Icon className={cn(
            'w-6 h-6',
            color === 'blue' && 'text-blue-600',
            color === 'green' && 'text-green-600',
            color === 'yellow' && 'text-yellow-600',
            color === 'red' && 'text-red-600',
            color === 'purple' && 'text-purple-600',
          )} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Job Moderation Card
const JobModerationCard = ({ job, onApprove, onReject, onSuspend, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    suspended: { label: 'Suspendue', color: 'bg-red-100 text-red-700', icon: Ban },
    rejected: { label: 'Rejetee', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  };

  const status = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors" data-testid={`job-card-${job.id}`}>
      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
        {job.company?.logo_url ? (
          <img src={job.company.logo_url} alt={job.company.name} className="w-8 h-8 object-contain" />
        ) : (
          <Briefcase className="w-6 h-6 text-slate-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-900 truncate">{job.title}</h3>
          <Badge className={cn(status.color, 'border-0 text-xs gap-1')}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Building2 className="w-3 h-3" />
            {job.company?.name || 'Entreprise'}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.city?.name || 'Non specifie'}
          </span>
          <Badge className={cn(contractInfo.color, 'border-0 text-xs')}>
            {contractInfo.label}
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Publie {formatRelative(job.created_at)} par {job.posted_by_user?.email}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {job.status === 'pending' && (
          <>
            <Button 
              size="sm" 
              variant="outline"
              className="text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={() => onApprove(job)}
              data-testid={`approve-job-${job.id}`}
            >
              <Check className="w-4 h-4 mr-1" />
              Approuver
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onReject(job)}
              data-testid={`reject-job-${job.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
          </>
        )}
        {job.status === 'active' && (
          <Button 
            size="sm" 
            variant="outline"
            className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
            onClick={() => onSuspend(job)}
          >
            <Ban className="w-4 h-4 mr-1" />
            Suspendre
          </Button>
        )}
        {job.status === 'suspended' && (
          <Button 
            size="sm" 
            variant="outline"
            className="text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={() => onApprove(job)}
          >
            <Check className="w-4 h-4 mr-1" />
            Reactiver
          </Button>
        )}
        
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                <Link
                  to={`/emplois/${job.id}`}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="w-4 h-4" />
                  Voir l'offre
                </Link>
                <button
                  onClick={() => { onDelete(job); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Company Validation Card
const CompanyValidationCard = ({ company, onApprove, onReject, onSuspend }) => {
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    verified: { label: 'Verifiee', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    suspended: { label: 'Suspendue', color: 'bg-red-100 text-red-700', icon: Ban },
    rejected: { label: 'Rejetee', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  };

  const status = statusConfig[company.verification_status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors" data-testid={`company-card-${company.id}`}>
      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain rounded" />
        ) : (
          <Building2 className="w-7 h-7 text-slate-400" />
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-900">{company.name}</h3>
          <Badge className={cn(status.color, 'border-0 text-xs gap-1')}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          {company.industry && <span>{company.industry}</span>}
          {company.size && <span>• {company.size} employes</span>}
          {company.city?.name && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {company.city.name}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Cree {formatRelative(company.created_at)} • {company.jobs_count || 0} offres
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {company.verification_status === 'pending' && (
          <>
            <Button 
              size="sm" 
              variant="outline"
              className="text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={() => onApprove(company)}
              data-testid={`approve-company-${company.id}`}
            >
              <Check className="w-4 h-4 mr-1" />
              Valider
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onReject(company)}
              data-testid={`reject-company-${company.id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
          </>
        )}
        {company.verification_status === 'verified' && (
          <Button 
            size="sm" 
            variant="outline"
            className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
            onClick={() => onSuspend(company)}
          >
            <Ban className="w-4 h-4 mr-1" />
            Suspendre
          </Button>
        )}
        {company.verification_status === 'suspended' && (
          <Button 
            size="sm" 
            variant="outline"
            className="text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={() => onApprove(company)}
          >
            <Check className="w-4 h-4 mr-1" />
            Reactiver
          </Button>
        )}
        
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="w-4 h-4" />
                    Voir le site
                  </a>
                )}
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="w-4 h-4" />
                  Voir les offres
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Tabs Component
const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2",
      active 
        ? "bg-blue-100 text-blue-700" 
        : "text-slate-600 hover:bg-slate-100"
    )}
  >
    {children}
    {count !== undefined && (
      <span className={cn(
        "px-2 py-0.5 text-xs rounded-full",
        active ? "bg-blue-200 text-blue-800" : "bg-slate-200 text-slate-600"
      )}>
        {count}
      </span>
    )}
  </button>
);

// Main Admin Dashboard
const AdminDashboard = () => {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data
  const [stats, setStats] = useState({
    pendingJobs: 0,
    activeJobs: 0,
    pendingCompanies: 0,
    verifiedCompanies: 0,
    totalCandidates: 0,
    totalApplications: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  // Filter states
  const [jobFilter, setJobFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Acces non autorise');
      navigate('/');
      return;
    }
    
    if (user && isAdmin) {
      fetchData();
    }
  }, [user, isAdmin, authLoading]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch jobs with company info
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(id, name, logo_url),
          city:cities(name),
          posted_by_user:users!jobs_posted_by_fkey(email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      setJobs(jobsData || []);

      // Fetch companies with job count
      const { data: companiesData } = await supabase
        .from('companies')
        .select(`
          *,
          city:cities(name),
          jobs:jobs(count)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const companiesWithCount = (companiesData || []).map(c => ({
        ...c,
        jobs_count: c.jobs?.[0]?.count || 0
      }));
      setCompanies(companiesWithCount);

      // Fetch stats
      const pendingJobs = (jobsData || []).filter(j => j.status === 'pending' || j.status === 'draft').length;
      const activeJobs = (jobsData || []).filter(j => j.status === 'active').length;
      const pendingCompanies = companiesWithCount.filter(c => c.verification_status === 'pending').length;
      const verifiedCompanies = companiesWithCount.filter(c => c.verification_status === 'verified').length;

      // Count candidates
      const { count: candidatesCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'candidate');

      // Count applications
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      setStats({
        pendingJobs,
        activeJobs,
        pendingCompanies,
        verifiedCompanies,
        totalCandidates: candidatesCount || 0,
        totalApplications: applicationsCount || 0,
      });

    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Donnees actualisees');
  };

  // Job Actions
  const handleApproveJob = async (job) => {
    try {
      await supabase
        .from('jobs')
        .update({ 
          status: 'active',
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', job.id);

      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'active' } : j));
      setStats(s => ({ ...s, pendingJobs: s.pendingJobs - 1, activeJobs: s.activeJobs + 1 }));
      toast.success('Offre approuvee');
    } catch (error) {
      console.error('Error approving job:', error);
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectJob = async (job) => {
    if (!window.confirm('Rejeter cette offre ?')) return;
    
    try {
      await supabase
        .from('jobs')
        .update({ status: 'rejected' })
        .eq('id', job.id);

      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'rejected' } : j));
      setStats(s => ({ ...s, pendingJobs: s.pendingJobs - 1 }));
      toast.success('Offre rejetee');
    } catch (error) {
      console.error('Error rejecting job:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const handleSuspendJob = async (job) => {
    if (!window.confirm('Suspendre cette offre ?')) return;
    
    try {
      await supabase
        .from('jobs')
        .update({ status: 'suspended' })
        .eq('id', job.id);

      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'suspended' } : j));
      setStats(s => ({ ...s, activeJobs: s.activeJobs - 1 }));
      toast.success('Offre suspendue');
    } catch (error) {
      console.error('Error suspending job:', error);
      toast.error('Erreur lors de la suspension');
    }
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Supprimer definitivement "${job.title}" ?`)) return;
    
    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      setJobs(jobs.filter(j => j.id !== job.id));
      toast.success('Offre supprimee');
      fetchData(); // Refresh stats
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  // Company Actions
  const handleApproveCompany = async (company) => {
    try {
      await supabase
        .from('companies')
        .update({ verification_status: 'verified' })
        .eq('id', company.id);

      setCompanies(companies.map(c => c.id === company.id ? { ...c, verification_status: 'verified' } : c));
      setStats(s => ({ 
        ...s, 
        pendingCompanies: s.pendingCompanies - 1, 
        verifiedCompanies: s.verifiedCompanies + 1 
      }));
      toast.success('Entreprise validee');
    } catch (error) {
      console.error('Error approving company:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRejectCompany = async (company) => {
    if (!window.confirm('Rejeter cette entreprise ?')) return;
    
    try {
      await supabase
        .from('companies')
        .update({ verification_status: 'rejected' })
        .eq('id', company.id);

      setCompanies(companies.map(c => c.id === company.id ? { ...c, verification_status: 'rejected' } : c));
      setStats(s => ({ ...s, pendingCompanies: s.pendingCompanies - 1 }));
      toast.success('Entreprise rejetee');
    } catch (error) {
      console.error('Error rejecting company:', error);
      toast.error('Erreur lors du rejet');
    }
  };

  const handleSuspendCompany = async (company) => {
    if (!window.confirm('Suspendre cette entreprise ?')) return;
    
    try {
      await supabase
        .from('companies')
        .update({ verification_status: 'suspended' })
        .eq('id', company.id);

      setCompanies(companies.map(c => c.id === company.id ? { ...c, verification_status: 'suspended' } : c));
      setStats(s => ({ ...s, verifiedCompanies: s.verifiedCompanies - 1 }));
      toast.success('Entreprise suspendue');
    } catch (error) {
      console.error('Error suspending company:', error);
      toast.error('Erreur lors de la suspension');
    }
  };

  // Filtering
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = jobFilter === 'all' || job.status === jobFilter;
    
    return matchesSearch && matchesFilter;
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = searchQuery === '' || 
      company.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = companyFilter === 'all' || company.verification_status === companyFilter;
    
    return matchesSearch && matchesFilter;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
              <p className="text-slate-600">Gerez les offres et entreprises</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            icon={Clock}
            label="Offres en attente"
            value={stats.pendingJobs}
            color="yellow"
            onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }}
          />
          <StatCard
            icon={Briefcase}
            label="Offres actives"
            value={stats.activeJobs}
            color="green"
            onClick={() => { setActiveTab('jobs'); setJobFilter('active'); }}
          />
          <StatCard
            icon={AlertTriangle}
            label="Entreprises en attente"
            value={stats.pendingCompanies}
            color="yellow"
            onClick={() => { setActiveTab('companies'); setCompanyFilter('pending'); }}
          />
          <StatCard
            icon={Building2}
            label="Entreprises verifiees"
            value={stats.verifiedCompanies}
            color="green"
            onClick={() => { setActiveTab('companies'); setCompanyFilter('verified'); }}
          />
          <StatCard
            icon={Users}
            label="Candidats"
            value={stats.totalCandidates}
            color="blue"
          />
          <StatCard
            icon={FileText}
            label="Candidatures"
            value={stats.totalApplications}
            color="purple"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton 
            active={activeTab === 'overview'} 
            onClick={() => setActiveTab('overview')}
          >
            Vue d'ensemble
          </TabButton>
          <TabButton 
            active={activeTab === 'jobs'} 
            onClick={() => setActiveTab('jobs')}
            count={stats.pendingJobs}
          >
            Moderation offres
          </TabButton>
          <TabButton 
            active={activeTab === 'companies'} 
            onClick={() => setActiveTab('companies')}
            count={stats.pendingCompanies}
          >
            Validation entreprises
          </TabButton>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent Pending Jobs */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Offres en attente</CardTitle>
                  <CardDescription>A moderer</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }}
                >
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.filter(j => j.status === 'pending' || j.status === 'draft').slice(0, 5).map(job => (
                  <JobModerationCard
                    key={job.id}
                    job={job}
                    onApprove={handleApproveJob}
                    onReject={handleRejectJob}
                    onSuspend={handleSuspendJob}
                    onDelete={handleDeleteJob}
                  />
                ))}
                {jobs.filter(j => j.status === 'pending' || j.status === 'draft').length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune offre en attente</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Pending Companies */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Entreprises en attente</CardTitle>
                  <CardDescription>A valider</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => { setActiveTab('companies'); setCompanyFilter('pending'); }}
                >
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {companies.filter(c => c.verification_status === 'pending').slice(0, 5).map(company => (
                  <CompanyValidationCard
                    key={company.id}
                    company={company}
                    onApprove={handleApproveCompany}
                    onReject={handleRejectCompany}
                    onSuspend={handleSuspendCompany}
                  />
                ))}
                {companies.filter(c => c.verification_status === 'pending').length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune entreprise en attente</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'jobs' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher une offre..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="job-search-input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
                    data-testid="job-filter-select"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="draft">Brouillon</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspendue</option>
                    <option value="rejected">Rejetee</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <JobModerationCard
                    key={job.id}
                    job={job}
                    onApprove={handleApproveJob}
                    onReject={handleRejectJob}
                    onSuspend={handleSuspendJob}
                    onDelete={handleDeleteJob}
                  />
                ))
              ) : (
                <p className="text-center text-slate-500 py-12">
                  {searchQuery ? 'Aucune offre trouvee' : 'Aucune offre'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'companies' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher une entreprise..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="company-search-input"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"
                    data-testid="company-filter-select"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="verified">Verifiee</option>
                    <option value="suspended">Suspendue</option>
                    <option value="rejected">Rejetee</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map(company => (
                  <CompanyValidationCard
                    key={company.id}
                    company={company}
                    onApprove={handleApproveCompany}
                    onReject={handleRejectCompany}
                    onSuspend={handleSuspendCompany}
                  />
                ))
              ) : (
                <p className="text-center text-slate-500 py-12">
                  {searchQuery ? 'Aucune entreprise trouvee' : 'Aucune entreprise'}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
