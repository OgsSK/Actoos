import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Shield, Building2, Briefcase, Users, Eye, FileText,
  CheckCircle, XCircle, Clock, AlertTriangle, Search,
  MoreVertical, Trash2, Ban, Check, RefreshCw, Loader2,
  TrendingUp, ChevronRight, Filter, Calendar, MapPin, Mail,
  UserX, UserCheck, Flag
} from 'lucide-react';
import { cn, formatRelative, formatDate, CONTRACT_TYPES } from '../lib/utils';

// ---------- Stats Card ----------
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

// ---------- Job Moderation Card (responsive) ----------
const JobModerationCard = ({ job, onApprove, onReject, onSuspend, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(null);
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    suspended: { label: 'Suspendue', color: 'bg-red-100 text-red-700', icon: Ban },
    rejected: { label: 'Rejetee', color: 'bg-slate-100 text-slate-700', icon: XCircle },
  };

  const status = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const handleActionWithReason = (action) => {
    setActionType(action);
    setReason('');
  };

  const confirmAction = async () => {
    if (actionType === 'suspend') {
      await onSuspend(job, reason);
    } else if (actionType === 'delete') {
      await onDelete(job, reason);
    }
    setActionType(null);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors" data-testid={`job-card-${job.id}`}>
      <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
        {job.company?.logo_url ? (
          <img src={job.company.logo_url} alt={job.company.name} className="w-8 h-8 object-contain" />
        ) : (
          <Briefcase className="w-6 h-6 text-slate-400" />
        )}
      </div>

      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-900 truncate">{job.title}</h3>
          <Badge className={cn(status.color, 'border-0 text-xs gap-1')}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
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

      <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto justify-end">
        {job.status === 'pending' && (
          <>
            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onApprove(job)}>
              <Check className="w-4 h-4 mr-1" /> Approuver
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => onReject(job)}>
              <XCircle className="w-4 h-4 mr-1" /> Rejeter
            </Button>
          </>
        )}
        {job.status === 'active' && (
          <Button size="sm" variant="outline" className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700" onClick={() => handleActionWithReason('suspend')}>
            <Ban className="w-4 h-4 mr-1" /> Suspendre
          </Button>
        )}
        {job.status === 'suspended' && (
          <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onApprove(job)}>
            <Check className="w-4 h-4 mr-1" /> Reactiver
          </Button>
        )}
        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleActionWithReason('delete')}>
          <Trash2 className="w-4 h-4 mr-1" /> Supprimer
        </Button>

        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="w-4 h-4" />
          </Button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 w-48 sm:top-full sm:mt-1 sm:bottom-auto sm:mb-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                <Link to={`/emplois/${job.id}`} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Eye className="w-4 h-4" /> Voir l'offre
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'suspend' ? "Suspendre l'offre" : "Supprimer l'offre"}
            </h3>
            <label className="block text-sm font-medium mb-2">Raison (optionnelle)</label>
            <textarea className="w-full border rounded-lg p-2 mb-4" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionType(null)}>Annuler</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmAction}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Company Validation Card (responsive) ----------
const CompanyValidationCard = ({ company, onApprove, onReject, onSuspend }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(null);

  const statusConfig = {
    false: { label: 'Non vérifiée', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    true: { label: 'Vérifiée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const status = statusConfig[company.is_verified ? 'true' : 'false'] || statusConfig.false;
  const StatusIcon = status.icon;

  const handleActionWithReason = (action) => {
    setActionType(action);
    setReason('');
  };

  const confirmAction = async () => {
    if (actionType === 'reject') {
      await onReject(company, reason);
    } else if (actionType === 'suspend') {
      await onSuspend(company, reason);
    }
    setActionType(null);
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-blue-200 transition-colors" data-testid={`company-card-${company.id}`}>
      <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
        {company.logo_url ? (
          <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain rounded" />
        ) : (
          <Building2 className="w-7 h-7 text-slate-400" />
        )}
      </div>

      <div className="flex-1 min-w-0 w-full sm:w-auto">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-slate-900">{company.name}</h3>
          <Badge className={cn(status.color, 'border-0 text-xs gap-1')}>
            <StatusIcon className="w-3 h-3" />
            {status.label}
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
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

      <div className="flex flex-col sm:flex-row gap-2 shrink-0 w-full sm:w-auto justify-end">
        {!company.is_verified ? (
          <>
            <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => onApprove(company)}>
              <Check className="w-4 h-4 mr-1" /> Valider
            </Button>
            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleActionWithReason('reject')}>
              <XCircle className="w-4 h-4 mr-1" /> Rejeter
            </Button>
          </>
        ) : (
          <Button size="sm" variant="outline" className="text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700" onClick={() => handleActionWithReason('suspend')}>
            <Ban className="w-4 h-4 mr-1" /> Suspendre
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
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <Eye className="w-4 h-4" /> Voir le site
                  </a>
                )}
                <button onClick={() => setShowMenu(false)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <FileText className="w-4 h-4" /> Voir les offres
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'reject' ? "Rejeter l'entreprise" : "Suspendre l'entreprise"}
            </h3>
            <label className="block text-sm font-medium mb-2">Raison (optionnelle)</label>
            <textarea className="w-full border rounded-lg p-2 mb-4" rows="3" value={reason} onChange={(e) => setReason(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionType(null)}>Annuler</Button>
              <Button className="bg-red-600 text-white hover:bg-red-700" onClick={confirmAction}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Tabs Component ----------
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

// ---------- Main Admin Dashboard ----------
const AdminDashboard = () => {
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    pendingJobs: 0, activeJobs: 0,
    pendingCompanies: 0, verifiedCompanies: 0,
    totalCandidates: 0, totalApplications: 0,
  });
  const [jobs, setJobs] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [loadingCancellations, setLoadingCancellations] = useState(true);

  const [jobFilter, setJobFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  const [newsletter, setNewsletter] = useState({ subject: '', content: '' });
  const [sendingNewsletter, setSendingNewsletter] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Acces non autorise');
      navigate('/');
      return;
    }
    if (user && isAdmin) fetchData();
  }, [user, isAdmin, authLoading]);

  useEffect(() => {
    const fetchCancellations = async () => {
      try {
        const res = await apiFetch('/api/admin/cancellations');
        if (res.success && Array.isArray(res.cancellations)) {
          setCancellations(res.cancellations);
        }
      } catch (err) {
        console.error('Erreur chargement résiliations:', err);
      } finally {
        setLoadingCancellations(false);
      }
    };
    if (isAdmin) fetchCancellations();
  }, [isAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: jobsData } = await supabase.from('jobs').select(`*, company:companies(id, name, logo_url), city:cities(name), posted_by_user:users!jobs_posted_by_fkey(email)`).order('created_at', { ascending: false }).limit(100);
      setJobs(jobsData || []);

      const { data: companiesData } = await supabase.from('companies').select(`*, city:cities(name), jobs:jobs(count)`).order('created_at', { ascending: false }).limit(100);
      const companiesWithCount = (companiesData || []).map(c => ({ ...c, jobs_count: c.jobs?.[0]?.count || 0 }));
      setCompanies(companiesWithCount);

      const { data: usersData } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(100);
      setUsers(usersData || []);

      try {
        const reportsRes = await apiFetch('/api/admin/reports');
        if (reportsRes.success && Array.isArray(reportsRes.reports)) {
          setReports(reportsRes.reports);
        } else {
          setReports([]);
        }
      } catch (e) {
        console.error(e);
        setReports([]);
      }

      const pendingJobs = (jobsData || []).filter(j => j.status === 'pending' || j.status === 'draft').length;
      const activeJobs = (jobsData || []).filter(j => j.status === 'active').length;
      const pendingCompanies = companiesWithCount.filter(c => c.is_verified === false).length;
      const verifiedCompanies = companiesWithCount.filter(c => c.is_verified === true).length;
      const { count: candidatesCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'candidate');
      const { count: applicationsCount } = await supabase.from('applications').select('*', { count: 'exact', head: true });

      setStats({ pendingJobs, activeJobs, pendingCompanies, verifiedCompanies, totalCandidates: candidatesCount || 0, totalApplications: applicationsCount || 0 });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); toast.success('Donnees actualisees'); };

  const handleApproveJob = async (job) => {
    try {
      await supabase.from('jobs').update({ status: 'active', published_at: new Date().toISOString(), expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', job.id);
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'active' } : j));
      setStats(s => ({ ...s, pendingJobs: s.pendingJobs - 1, activeJobs: s.activeJobs + 1 }));
      toast.success('Offre approuvee');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleRejectJob = async (job) => {
    if (!window.confirm('Rejeter cette offre ?')) return;
    try {
      await supabase.from('jobs').update({ status: 'rejected' }).eq('id', job.id);
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'rejected' } : j));
      setStats(s => ({ ...s, pendingJobs: s.pendingJobs - 1 }));
      toast.success('Offre rejetee');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleSuspendJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/suspend-job', { method: 'POST', body: JSON.stringify({ id: job.id, reason }) });
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: 'suspended' } : j));
      setStats(s => ({ ...s, activeJobs: s.activeJobs - 1 }));
      toast.success('Offre suspendue et email envoyé');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleDeleteJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/delete-job', { method: 'POST', body: JSON.stringify({ id: job.id, reason }) });
      setJobs(jobs.filter(j => j.id !== job.id));
      toast.success('Offre supprimée et email envoyé');
      fetchData();
    } catch (error) { toast.error('Erreur'); }
  };

  const handleApproveCompany = async (company) => {
    try {
      await apiFetch('/api/admin/verify-company', { method: 'POST', body: JSON.stringify({ id: company.id }) });
      setCompanies(companies.map(c => c.id === company.id ? { ...c, is_verified: true } : c));
      setStats(s => ({ ...s, pendingCompanies: s.pendingCompanies - 1, verifiedCompanies: s.verifiedCompanies + 1 }));
      toast.success('Entreprise validée et email envoyé');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleRejectCompany = async (company, reason = '') => {
    try {
      await apiFetch('/api/admin/reject-company', { method: 'POST', body: JSON.stringify({ id: company.id, reason }) });
      setCompanies(companies.map(c => c.id === company.id ? { ...c, is_verified: false, is_active: false } : c));
      setStats(s => ({ ...s, pendingCompanies: s.pendingCompanies - 1 }));
      toast.success('Entreprise rejetée et email envoyé');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleSuspendCompany = async (company, reason = '') => {
    try {
      await apiFetch('/api/admin/suspend-company', { method: 'POST', body: JSON.stringify({ id: company.id, reason }) });
      setCompanies(companies.map(c => c.id === company.id ? { ...c, is_active: false, is_verified: false } : c));
      setStats(s => ({ ...s, verifiedCompanies: s.verifiedCompanies - 1 }));
      toast.success('Entreprise suspendue et email envoyé');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleToggleUserRole = async (userId, newRole) => {
    try {
      await supabase.from('users').update({ role: newRole }).eq('id', userId);
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success('Rôle mis à jour');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await apiFetch('/api/admin/toggle-user-status', { method: 'POST', body: JSON.stringify({ user_id: userId, is_active: !currentStatus }) });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
      toast.success(currentStatus ? 'Compte suspendu' : 'Compte réactivé');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Bannir définitivement cet utilisateur ?')) return;
    try {
      await apiFetch('/api/admin/ban-user', { method: 'POST', body: JSON.stringify({ user_id: userId, reason: 'Violation des règles' }) });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: false, is_banned: true } : u));
      toast.success('Utilisateur banni');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      await apiFetch(`/api/admin/reports/${reportId}?status=${newStatus}`, { method: 'PATCH' });
      setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      toast.success('Signalement mis à jour');
    } catch (error) { toast.error('Erreur'); }
  };

  const handleSendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.content) { toast.error('Veuillez remplir le sujet et le contenu.'); return; }
    setSendingNewsletter(true);
    try {
      const res = await apiFetch('/api/admin/send-newsletter', { method: 'POST', body: JSON.stringify(newsletter) });
      if (res.success) { toast.success(res.message); setNewsletter({ subject: '', content: '' }); }
      else toast.error(res.message || 'Erreur');
    } catch (err) { toast.error('Erreur réseau'); }
    finally { setSendingNewsletter(false); }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = searchQuery === '' || job.title.toLowerCase().includes(searchQuery.toLowerCase()) || job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = jobFilter === 'all' || job.status === jobFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = searchQuery === '' || company.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (companyFilter === 'all') return matchesSearch;
    if (companyFilter === 'verified') return matchesSearch && company.is_verified === true;
    if (companyFilter === 'unverified') return matchesSearch && company.is_verified !== true;
    return matchesSearch;
  });

  if (authLoading || loading) return <div className="min-h-screen pt-20 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
              <p className="text-slate-600">Gerez les offres, entreprises et utilisateurs</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="gap-2">
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} /> Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard icon={Clock} label="Offres en attente" value={stats.pendingJobs} color="yellow" onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }} />
          <StatCard icon={Briefcase} label="Offres actives" value={stats.activeJobs} color="green" />
          <StatCard icon={AlertTriangle} label="Entreprises en attente" value={stats.pendingCompanies} color="yellow" onClick={() => { setActiveTab('companies'); setCompanyFilter('unverified'); }} />
          <StatCard icon={Building2} label="Entreprises verifiees" value={stats.verifiedCompanies} color="green" />
          <StatCard icon={Users} label="Candidats" value={stats.totalCandidates} color="blue" />
          <StatCard icon={FileText} label="Candidatures" value={stats.totalApplications} color="purple" />
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Vue d'ensemble</TabButton>
          <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} count={stats.pendingJobs}>Modération offres</TabButton>
          <TabButton active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} count={stats.pendingCompanies}>Validation entreprises</TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Utilisateurs</TabButton>
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} count={reports.filter(r => r.status === 'pending').length}>
            <Flag className="w-4 h-4" /> Signalements
          </TabButton>
          <TabButton active={activeTab === 'cancellations'} onClick={() => setActiveTab('cancellations')}>
            <AlertTriangle className="w-4 h-4" /> Résiliations
          </TabButton>
          <TabButton active={activeTab === 'newsletter'} onClick={() => setActiveTab('newsletter')}><Mail className="w-4 h-4" /> Newsletter</TabButton>
        </div>

        {activeTab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-lg">Offres en attente</CardTitle><CardDescription>A moderer</CardDescription></div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }}>Voir tout<ChevronRight className="w-4 h-4 ml-1" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.filter(j => j.status === 'pending' || j.status === 'draft').slice(0, 5).map(job => (
                  <JobModerationCard key={job.id} job={job} onApprove={handleApproveJob} onReject={handleRejectJob} onSuspend={handleSuspendJob} onDelete={handleDeleteJob} />
                ))}
                {jobs.filter(j => j.status === 'pending' || j.status === 'draft').length === 0 && <p className="text-center text-slate-500 py-8">Aucune offre en attente</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-lg">Entreprises en attente</CardTitle><CardDescription>A valider</CardDescription></div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('companies'); setCompanyFilter('unverified'); }}>Voir tout<ChevronRight className="w-4 h-4 ml-1" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {companies.filter(c => c.is_verified !== true).slice(0, 5).map(company => (
                  <CompanyValidationCard key={company.id} company={company} onApprove={handleApproveCompany} onReject={handleRejectCompany} onSuspend={handleSuspendCompany} />
                ))}
                {companies.filter(c => c.is_verified !== true).length === 0 && <p className="text-center text-slate-500 py-8">Aucune entreprise en attente</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'jobs' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Rechercher une offre..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
                <div className="flex flex-col sm:flex-row gap-2"><Filter className="w-4 h-4 text-slate-400" /><select value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"><option value="all">Tous les statuts</option><option value="pending">En attente</option><option value="draft">Brouillon</option><option value="active">Active</option><option value="suspended">Suspendue</option><option value="rejected">Rejetee</option></select></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredJobs.length > 0 ? filteredJobs.map(job => <JobModerationCard key={job.id} job={job} onApprove={handleApproveJob} onReject={handleRejectJob} onSuspend={handleSuspendJob} onDelete={handleDeleteJob} />) : <p className="text-center text-slate-500 py-12">{searchQuery ? 'Aucune offre trouvee' : 'Aucune offre'}</p>}
            </CardContent>
          </Card>
        )}

        {activeTab === 'companies' && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><Input placeholder="Rechercher une entreprise..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
                <div className="flex flex-col sm:flex-row gap-2"><Filter className="w-4 h-4 text-slate-400" /><select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white"><option value="all">Tous les statuts</option><option value="unverified">Non vérifiée</option><option value="verified">Vérifiée</option></select></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCompanies.length > 0 ? filteredCompanies.map(company => <CompanyValidationCard key={company.id} company={company} onApprove={handleApproveCompany} onReject={handleRejectCompany} onSuspend={handleSuspendCompany} />) : <p className="text-center text-slate-500 py-12">{searchQuery ? 'Aucune entreprise trouvee' : 'Aucune entreprise'}</p>}
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card>
            <CardHeader><CardTitle>Gestion des utilisateurs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map(u => (
                  <div key={u.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-white border rounded-xl gap-3">
                    <div>
                      <p className="font-medium">{u.first_name} {u.last_name}</p>
                      <p className="text-sm text-slate-500">{u.email} • {u.role} {u.is_banned ? '(Banni)' : u.is_active ? '' : '(Suspendu)'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto justify-end">
                      <select value={u.role} onChange={(e) => handleToggleUserRole(u.id, e.target.value)} className="border rounded px-2 py-1 text-sm">
                        <option value="candidate">Candidat</option>
                        <option value="company">Entreprise</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button size="sm" variant="outline" onClick={() => handleToggleUserActive(u.id, u.is_active)}>
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        {u.is_active ? 'Suspendre' : 'Réactiver'}
                      </Button>
                      {!u.is_banned && (
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleBanUser(u.id)}>
                          <Ban className="w-4 h-4" /> Bannir
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'reports' && (
          <Card>
            <CardHeader><CardTitle>Signalements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun signalement</p>
                ) : (
                  reports.map(report => (
                    <div key={report.id} className="flex flex-col sm:flex-row items-center justify-between p-3 bg-white border rounded-xl gap-3">
                      <div>
                        <p className="font-medium">{report.reporter?.email || 'Anonyme'}</p>
                        <p className="text-sm text-slate-500">
                          Type: {report.reported_item_type} | Raison: {report.reason}
                        </p>
                        <Badge className={report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}>
                          {report.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        <Button size="sm" variant="outline" onClick={() => handleUpdateReportStatus(report.id, 'reviewed')}>Marquer vu</Button>
                        <Button size="sm" variant="outline" onClick={() => handleUpdateReportStatus(report.id, 'resolved')}>Résolu</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'cancellations' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Résiliations d'abonnement</CardTitle>
              <CardDescription>Entreprises ayant résilié leur plan payant</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCancellations ? (
                <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
              ) : cancellations.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">Aucune résiliation enregistrée.</p>
              ) : (
                <div className="space-y-3">
                  {cancellations.map((c) => (
                    <div key={c.id} className="p-3 bg-slate-50 rounded-xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-slate-900">{c.name}</p>
                          <p className="text-sm text-slate-600">
                            Plan : <Badge className="bg-slate-200 text-slate-700">{c.subscription_plan}</Badge>
                          </p>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(c.updated_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      {c.cancellation_reason && (
                        <div className="mt-2 text-sm text-slate-600 italic">
                          « {c.cancellation_reason} »
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'newsletter' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Envoyer une newsletter</CardTitle>
              <CardDescription>Envoyez un email à tous les abonnés</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Sujet</label><Input value={newsletter.subject} onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })} placeholder="Sujet de l'email" /></div>
              <div><label className="block text-sm font-medium mb-1">Contenu (HTML)</label><textarea rows={10} className="w-full border border-slate-200 rounded-lg p-3 text-sm" value={newsletter.content} onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })} placeholder="<h1>Titre</h1><p>Votre message...</p>" /></div>
              <Button onClick={handleSendNewsletter} disabled={sendingNewsletter} className="bg-blue-600 text-white hover:bg-blue-700">
                {sendingNewsletter ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}Envoyer la newsletter
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;