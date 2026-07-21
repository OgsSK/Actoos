// CompanyDashboard.js
import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import DashboardSkeleton from '../components/DashboardSkeleton';
import {
  Building2, Briefcase, Users, Eye, FileText, Plus, Settings,
  ChevronRight, TrendingUp, Clock, CheckCircle, XCircle, Loader2,
  Edit, Trash2, MoreVertical, Globe, Mail, Phone, MapPin, Calendar,
  AlertTriangle, X, Send, Undo2, CreditCard, Layers, Banknote, Sparkles,
  Crown, Search, RefreshCw, Zap, UserPlus, ArrowRight, Star,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES } from '../lib/utils';
import { getPlanLimit, getExpirationDays, planHasFeature } from '../lib/planLimits';

const UserMessages = lazy(() => import('../components/UserMessages'));

// ---------- StatCard ----------
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => {
  const { t } = useTranslation();
  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-500 truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {trend !== undefined && (
              <p className={cn('text-xs mt-1 flex items-center gap-1', trend > 0 ? 'text-green-600' : 'text-slate-500')}>
                <TrendingUp className="w-3 h-3" />
                {trend > 0 ? '+' : ''}{t('companyDashboard.stats.trend', { trend })}
              </p>
            )}
          </div>
          <div className={cn('w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0', color === 'blue' && 'bg-blue-100', color === 'green' && 'bg-green-100', color === 'purple' && 'bg-purple-100', color === 'orange' && 'bg-orange-100')}>
            <Icon className={cn('w-5 h-5 sm:w-6 sm:h-6', color === 'blue' && 'text-blue-600', color === 'green' && 'text-green-600', color === 'purple' && 'text-purple-600', color === 'orange' && 'text-orange-600')} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- CompanyJobCard ----------
const CompanyJobCard = ({ job, onEdit, onDelete, onToggleStatus, onSubmitForReview, onCancelSubmission, isCompanyVerified, isBusinessPlan, onFreeBoost, companyLogo }) => {
  const { t } = useTranslation();
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const buttonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const { format } = useCurrencyFormatter();
  const { prefs } = usePreferencesContext();

  const now = new Date();
  const isExpired = job.status === 'active' && job.expires_at && new Date(job.expires_at) < now;
  const effectiveStatus = isExpired ? 'expired' : job.status;

  const statusLabel = t(`companyDashboard.status.${effectiveStatus}`, { defaultValue: effectiveStatus });
  const statusColors = { draft: 'bg-slate-100 text-slate-700', pending: 'bg-yellow-100 text-yellow-700', active: 'bg-green-100 text-green-700', paused: 'bg-yellow-100 text-yellow-700', closed: 'bg-red-100 text-red-700', expired: 'bg-slate-100 text-slate-700', rejected: 'bg-red-100 text-red-700' };
  const statusColor = statusColors[effectiveStatus] || 'bg-slate-100 text-slate-700';

  const updateMenuPosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const estimatedMenuHeight = 280;
    const gap = 8;
    const viewportPadding = 12;
    const left = Math.max(viewportPadding, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - viewportPadding));
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top = spaceBelow >= estimatedMenuHeight || spaceBelow >= spaceAbove ? rect.bottom + gap : Math.max(viewportPadding, rect.top - estimatedMenuHeight - gap);
    setMenuPos({ top, left });
  };
  const openMenu = () => { if (!showMenu) updateMenuPosition(); setShowMenu(prev => !prev); };
  useEffect(() => { if (!showMenu) return; const close = () => setShowMenu(false); const reposition = () => updateMenuPosition(); window.addEventListener('resize', reposition); window.addEventListener('scroll', close, true); return () => { window.removeEventListener('resize', reposition); window.removeEventListener('scroll', close, true); }; }, [showMenu]);

  const menu = showMenu ? createPortal(
    <>
      <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
      <div className="fixed z-[9999] w-[240px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-1" style={{ top: menuPos.top, left: menuPos.left }}>
        {(effectiveStatus === 'draft' || effectiveStatus === 'rejected') && (
          <button onClick={() => { onEdit(job); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"><Edit className="w-4 h-4" />{t('companyDashboard.jobCard.menu.edit')}</button>
        )}
        <Link to="/dashboard/entreprise/candidatures" onClick={() => setShowMenu(false)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"><Users className="w-4 h-4" />{t('companyDashboard.jobCard.menu.viewApplications')}</Link>
        {(effectiveStatus === 'draft' || effectiveStatus === 'rejected') && (
          <button onClick={() => { if (!isCompanyVerified) { toast.error(t('companyDashboard.toasts.companyNotVerifiedMenu')); setShowMenu(false); return; } onSubmitForReview(job); setShowMenu(false); }} disabled={!isCompanyVerified} className={cn('w-full flex items-center gap-2 px-4 py-3 text-sm', isCompanyVerified ? 'text-blue-600 hover:bg-slate-50' : 'text-slate-400 cursor-not-allowed')}><Send className="w-4 h-4" />{isCompanyVerified ? t('companyDashboard.jobCard.menu.submitForValidation') : t('companyDashboard.jobCard.menu.validationRequired')}</button>
        )}
        {effectiveStatus === 'pending' && (
          <button onClick={() => { onCancelSubmission(job); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-amber-600 hover:bg-slate-50"><Undo2 className="w-4 h-4" />{t('companyDashboard.jobCard.menu.cancelSubmission')}</button>
        )}
        {effectiveStatus === 'active' && isBusinessPlan && (
          <button onClick={() => { onFreeBoost(job.id); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-purple-600 hover:bg-purple-50"><Sparkles className="w-4 h-4" />{t('companyDashboard.jobCard.menu.freeBoost')}</button>
        )}
        {effectiveStatus === 'active' && (
          <button onClick={() => { onToggleStatus(job, 'paused'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-yellow-600 hover:bg-slate-50"><Clock className="w-4 h-4" />{t('companyDashboard.jobCard.menu.pause')}</button>
        )}
        {effectiveStatus === 'paused' && (
          <button onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"><CheckCircle className="w-4 h-4" />{t('companyDashboard.jobCard.menu.republish')}</button>
        )}
        {effectiveStatus === 'expired' && (
          <button onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"><RefreshCw className="w-4 h-4" />{t('companyJobs.menu.reactivate')}</button>
        )}
        {effectiveStatus === 'closed' && (
          <button onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"><Send className="w-4 h-4" />{t('companyDashboard.jobCard.menu.publish')}</button>
        )}
        {effectiveStatus !== 'pending' && (
          <button onClick={() => { onDelete(job); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" />{t('companyDashboard.jobCard.menu.delete')}</button>
        )}
      </div>
    </>, document.body) : null;

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link to={`/emplois/${job.id}`} className="font-semibold text-slate-900 hover:text-blue-600 text-sm sm:text-base" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{job.title}</Link>
            <Badge className={cn(statusColor, 'border-0 text-xs w-fit')}>{statusLabel}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-slate-500">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city?.name || t('companyDashboard.jobCard.unspecifiedLocation')}</span>
            <Badge className={cn(contractInfo.color, 'border-0 text-xs')}>{contractInfo.label}</Badge>
            {job.salary_min && job.salary_max && (
              <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{format(job.salary_min)} – {format(job.salary_max)}</span>
            )}
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{t('companyDashboard.jobCard.views', { count: job.views_count || 0 })}</span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{t('companyDashboard.jobCard.applications', { count: job.applications_count || 0 })}</span>
          </div>
        </div>
        <div className="shrink-0"><Button ref={buttonRef} type="button" variant="ghost" size="icon" onClick={openMenu} className="h-9 w-9"><MoreVertical className="w-4 h-4" /></Button></div>
      </div>
      <div className="text-xs text-slate-400">{formatRelative(job.created_at)}</div>
      {menu}
    </div>
  );
};

// ---------- ApplicationCard ----------
const ApplicationCard = ({ application }) => {
  const { t } = useTranslation();
  const statusIcons = { pending: Clock, viewed: Eye, shortlisted: CheckCircle, interview: Calendar, accepted: CheckCircle, rejected: XCircle };
  const statusColors = { pending: 'bg-blue-100 text-blue-700', viewed: 'bg-slate-100 text-slate-700', shortlisted: 'bg-purple-100 text-purple-700', interview: 'bg-green-100 text-green-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
  const statusLabel = t(`companyDashboard.applicationStatus.${application.status}`, { defaultValue: application.status });
  const StatusIcon = statusIcons[application.status] || Clock;
  const statusColor = statusColors[application.status] || 'bg-slate-100 text-slate-700';
  
  return (
    <Link to={`/dashboard/entreprise/candidatures/${application.id}`} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="flex items-start gap-3 w-full min-w-0">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
          {application.candidate?.avatar_url ? (
            <img src={application.candidate.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 line-clamp-2">{application.candidate?.first_name} {application.candidate?.last_name}</p>
          <p className="text-sm text-slate-500 line-clamp-1">{application.job?.title}</p>
        </div>
        <Badge className={cn(statusColor, 'gap-1 border-0 shrink-0 text-xs w-fit')}><StatusIcon className="w-3 h-3" />{statusLabel}</Badge>
      </div>
      <span className="text-xs text-slate-400">{formatRelative(application.created_at)}</span>
    </Link>
  );
};

// ---------- CancelSubscriptionModal ----------
const CancelSubscriptionModal = ({ isOpen, onClose, onConfirm, cancelling }) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const handleConfirm = () => { onConfirm(reason); };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="max-w-md w-full rounded-2xl bg-white shadow-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 min-w-0"><AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />{t('companyDashboard.cancelModal.title')}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0"><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">{t('companyDashboard.cancelModal.description')}</p>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t('companyDashboard.cancelModal.reasonLabel')}</label><textarea rows={3} className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('companyDashboard.cancelModal.reasonPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} /></div>
            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700"><p className="font-medium mb-1">{t('companyDashboard.cancelModal.consequencesTitle')}</p><ul className="list-disc list-inside space-y-1 text-red-600">{(t('companyDashboard.cancelModal.consequences', { returnObjects: true }) || []).map((item, idx) => (<li key={idx}>{item}</li>))}</ul></div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onClose}>{t('companyDashboard.cancelModal.cancelButton')}</Button>
            <Button className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm} disabled={cancelling}>{cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('companyDashboard.cancelModal.confirmButton')}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- Dashboard principal ----------
const CompanyDashboard = () => {
  const { t, i18n } = useTranslation(); // ✅ ajout de i18n
  const { user, activeCompanyId, setActiveCompanyId, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [stats, setStats] = useState({ totalJobs: 0, activeJobs: 0, totalApplications: 0, newApplications: 0 });
  const [pendingDocsCount, setPendingDocsCount] = useState(0);
  const hasLoaded = useRef(false);

  const [primaryCompanyId, setPrimaryCompanyId] = useState(
    () => localStorage.getItem('actoosPrimaryCompanyId') || null
  );

  const [followersSummary, setFollowersSummary] = useState({ total: 0, followers: [] });
  const [loadingFollowers, setLoadingFollowers] = useState(false);

  // ✅ Fonction de traduction de l'industrie
  const getTranslatedIndustry = (industryFr) => {
    if (!industryFr) return null;
    const frenchT = i18n.getFixedT('fr');
    const frenchIndustries = frenchT('createCompany.industries', { returnObjects: true }) || [];
    const currentIndustries = t('createCompany.industries', { returnObjects: true }) || [];
    const index = frenchIndustries.indexOf(industryFr);
    if (index !== -1 && index < currentIndustries.length) {
      return currentIndustries[index];
    }
    return industryFr;
  };

  const fetchUserCompanies = useCallback(async () => {
    if (!user) return [];
    const { data: owned } = await supabase.from('companies').select('*').eq('owner_id', user.id);
    const { data: memberships } = await supabase.from('company_members').select('company:companies(*)').eq('user_id', user.id).eq('status', 'active');
    const memberCompanies = (memberships || []).map(m => m.company).filter(Boolean);
    const all = [...(owned || []), ...memberCompanies];
    return all.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  }, [user]);

  const handleSwitchCompany = (companyId) => {
    setActiveCompanyId(companyId);
    fetchCompanyData(companyId);
  };

  const handleSetPrimaryCompany = () => {
    if (!activeCompanyId) return;
    const currentPrimary = localStorage.getItem('actoosPrimaryCompanyId');
    if (currentPrimary === activeCompanyId) {
      localStorage.removeItem('actoosPrimaryCompanyId');
      setPrimaryCompanyId(null);
      toast.success(t('companyDashboard.primaryCompanyRemoved'));
    } else {
      localStorage.setItem('actoosPrimaryCompanyId', activeCompanyId);
      setPrimaryCompanyId(activeCompanyId);
      toast.success(t('companyDashboard.primaryCompanySet'));
    }
  };

  const fetchCompanyData = async (companyId) => {
    setLoading(true);
    try {
      if (!companyId) return;
      const { data: comp } = await supabase.from('companies').select('*').eq('id', companyId).single();
      if (!comp) return;
      setCompany(comp);

      const now = new Date().toISOString();
      const { count: activeJobsCount } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', comp.id)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gte.${now}`);

      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*, city:cities(name)')
        .eq('company_id', comp.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setJobs(jobsData || []);

      let appsData = [];
      if (jobsData?.length) {
        const { data } = await supabase
          .from('applications')
          .select(`*, candidate:users(first_name, last_name, email, avatar_url), job:jobs(title)`)
          .in('job_id', jobsData.map(j => j.id))
          .order('created_at', { ascending: false })
          .limit(10);
        appsData = data || [];
      }
      setApplications(appsData);

      const { count: docsCount, error: docsError } = await supabase
        .from('hiring_documents')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'uploaded');

      if (docsError) {
        console.error('Erreur comptage documents:', docsError);
        setPendingDocsCount(0);
      } else {
        setPendingDocsCount(docsCount || 0);
      }

      setStats({
        totalJobs: jobsData?.length || 0,
        activeJobs: activeJobsCount || 0,
        totalApplications: appsData.length,
        newApplications: appsData.filter(app => app.status === 'pending').length,
      });
    } catch (err) {
      console.error(err);
      toast.error(t('companyDashboard.toasts.loadError'));
    } finally {
      setLoading(false);
    }
  };

  // Effet de chargement initial
  useEffect(() => {
    if (!user || hasLoaded.current) return;
    hasLoaded.current = true;
    const load = async () => {
      const userCompanies = await fetchUserCompanies();
      setCompanies(userCompanies);
      if (userCompanies.length === 0) { setLoading(false); return; }

      const targetId = primaryCompanyId && userCompanies.find(c => c.id === primaryCompanyId)
        ? primaryCompanyId
        : activeCompanyId && userCompanies.find(c => c.id === activeCompanyId)
          ? activeCompanyId
          : userCompanies[0].id;

      setActiveCompanyId(targetId);
      await fetchCompanyData(targetId);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUserCompanies().then(updated => setCompanies(updated));
    }
  }, [activeCompanyId, company?.subscription_plan, fetchUserCompanies]);

  const plan = company?.subscription_plan || 'free';
  const isBusinessPlan = plan === 'business' || plan === 'enterprise';
  const showFollowersWidget = plan === 'pro' || isBusinessPlan;

const fetchFollowersSummary = useCallback(async () => {
  if (!company || !showFollowersWidget) return;
  setLoadingFollowers(true);
  try {
    const { data, error } = await supabase
      .from('company_followers')
      .select(`
        user_id,
        created_at,
        user:users ( first_name, last_name, avatar_url )
      `)
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) throw error;

    const followers = data.map(f => ({
      user_id: f.user_id,
      first_name: f.user?.first_name,
      last_name: f.user?.last_name,
      avatar_url: f.user?.avatar_url,
      followed_at: f.created_at,
    }));

    setFollowersSummary({ total: data.length, followers });
  } catch (err) {
    console.error('Erreur chargement abonnés:', err);
    setFollowersSummary({ total: 0, followers: [] });
  } finally {
    setLoadingFollowers(false);
  }
}, [company, showFollowersWidget]);

  useEffect(() => {
    fetchFollowersSummary();
  }, [fetchFollowersSummary]);

  const handleEditJob = (job) => navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);
  const handleDeleteJob = async (job) => { if (!window.confirm(t('companyDashboard.toasts.deleteConfirm', { title: job.title }))) return; await supabase.from('jobs').delete().eq('id', job.id); setJobs(prev => prev.filter(j => j.id !== job.id)); toast.success(t('companyDashboard.toasts.jobDeleted')); };
  
  const handleToggleJobStatus = async (job, newStatus) => {
    if (newStatus === 'active' && (job.status === 'draft' || job.status === 'rejected')) {
      toast.error(t('companyDashboard.toasts.submitForValidationRequired', 'Cette offre doit être soumise pour validation avant publication.'));
      return;
    }
    if (newStatus === 'active') {
      const { count: activeCount } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active');
      const limit = getPlanLimit(plan, 'jobs');
      if (activeCount >= limit) { toast.error(t('companyDashboard.toasts.limitReached', { limit })); return; }
    }
    try {
      const updates = { status: newStatus };
      if (newStatus === 'active') {
        if (!job.published_at) updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + getExpirationDays(plan) * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from('jobs').update(updates).eq('id', job.id);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, ...updates } : j)));
      toast.success(newStatus === 'active' ? t('companyDashboard.toasts.offerPublished') : t('companyDashboard.toasts.statusUpdated'));
    } catch (err) { console.error(err); toast.error(t('companyDashboard.toasts.updateError')); }
  };

  const handleSubmitForReview = async (job) => {
    if (!company?.is_verified) { toast.error(t('companyDashboard.toasts.companyNotVerified')); return; }
    const { count: activeCount } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'active');
    const { count: pendingCount } = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', company.id).eq('status', 'pending');
    const limit = getPlanLimit(plan, 'jobs');
    if ((activeCount || 0) + (pendingCount || 0) >= limit) { toast.error(t('companyDashboard.toasts.limitReachedDetailed', { limit, total: (activeCount || 0) + (pendingCount || 0) })); return; }
    try {
      await supabase.from('jobs').update({ status: 'pending' }).eq('id', job.id);
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: 'pending' } : j)));
      toast.success(t('companyDashboard.toasts.submittedForValidation'));
      try { await apiFetch('/api/notify-admin-new-job', { method: 'POST', body: JSON.stringify({ job_title: job.title, company_name: company.name, company_email: company.email || user.email }) }); } catch (err) { console.error('Erreur notification admin job:', err); }
    } catch (err) { toast.error(t('companyDashboard.toasts.submissionError')); }
  };

  const handleCancelSubmission = async (job) => { try { await supabase.from('jobs').update({ status: 'draft' }).eq('id', job.id); setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: 'draft' } : j))); toast.success(t('companyDashboard.toasts.submissionCancelled')); } catch (err) { toast.error(t('companyDashboard.toasts.updateError')); } };

  const handleCancelSubscription = async (reason) => {
    setCancelling(true);
    try {
      await apiFetch('/api/subscription/cancel', { method: 'POST', body: JSON.stringify({ user_id: user.id, company_id: company?.id, reason }) });
      toast.success(t('companyDashboard.toasts.subscriptionCancelled'));
      setShowCancelModal(false);
      await fetchCompanyData(company.id);
      await refreshProfile();
      const updatedCompanies = await fetchUserCompanies();
      setCompanies(updatedCompanies);
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('DOWNGRADE_BLOCKED:')) {
        const numbers = msg.match(/\d+/g);
        if (numbers && numbers.length >= 3) toast.error(t('pricing.downgradeBlocked', { active: numbers[numbers.length - 2], limit: numbers[numbers.length - 1] }));
        else toast.error(t('pricing.downgradeBlocked', { active: '?', limit: '?' }));
      } else toast.error(err.message || t('companyDashboard.toasts.cancelError'));
    } finally {
      setCancelling(false);
    }
  };

  const handleFreeBoost = async (jobId) => {
    try {
      await apiFetch('/api/boost/free', { method: 'POST', body: JSON.stringify({ job_id: jobId, user_id: user.id }) });
      toast.success(t('companyDashboard.toasts.boostActivated'));
      fetchCompanyData(activeCompanyId);
    } catch (err) {
      if (err.status === 429) toast.error(t('companyDashboard.toasts.boostAlreadyUsed'));
      else toast.error(t('companyDashboard.toasts.boostError'));
    }
  };

  const handleOpenPortal = () => { window.location.href = '/tarifs'; };

  const jobsLimit = getPlanLimit(plan, 'jobs');
  const planLabel = plan === 'free' ? t('pricing.free') : plan.charAt(0).toUpperCase() + plan.slice(1);

  const ownedCompaniesCount = companies.filter(c => c.owner_id === user?.id).length;
  const hasBusinessCompany = companies.some(c => c.owner_id === user?.id && (c.subscription_plan === 'business' || c.subscription_plan === 'enterprise'));
  const canCreateCompany = hasBusinessCompany || ownedCompaniesCount === 0;

  const hasCVBank = planHasFeature(plan, 'canAccessCvBank');
  const activeJobsCount = stats.activeJobs;

  if (loading) return <DashboardSkeleton />;

  if (companies.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6"><Building2 className="w-10 h-10 text-blue-600" /></div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('companyDashboard.noCompany.title')}</h1>
          <p className="text-slate-600 mb-8">{t('companyDashboard.noCompany.subtitle')}</p>
          <Link to="/dashboard/entreprise/creer"><Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 min-h-[44px]"><Plus className="w-5 h-5 mr-2" />{t('companyDashboard.noCompany.createButton')}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20" data-testid="company-dashboard">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-6">
          <Layers className="w-5 h-5 text-slate-600" />
          <select value={activeCompanyId || ''} onChange={(e) => handleSwitchCompany(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-4 py-2 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-blue-500">
            {companies.map(c => (<option key={c.id} value={c.id}>{c.name} {c.owner_id === user.id ? t('companyDashboard.companySelector.owner') : t('companyDashboard.companySelector.member')}</option>))}
          </select>

          {activeCompanyId && (
            <Button
              variant="ghost"
              size="sm"
              className={activeCompanyId === primaryCompanyId ? 'text-amber-500' : 'text-slate-400 hover:text-amber-500'}
              onClick={handleSetPrimaryCompany}
              title={activeCompanyId === primaryCompanyId ? t('companyDashboard.removeAsPrimary') : t('companyDashboard.setAsPrimary')}
            >
              <Star className={`w-4 h-4 ${activeCompanyId === primaryCompanyId ? 'fill-amber-500' : ''}`} />
            </Button>
          )}

          {canCreateCompany ? (
            <Link to="/dashboard/entreprise/creer" className="ml-auto">
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1" /> {t('companyDashboard.companySelector.newCompany')}
              </Button>
            </Link>
          ) : (
            <div className="ml-auto text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-full overflow-hidden whitespace-nowrap max-w-[200px] sm:max-w-none"
                 title={t('companyDashboard.multiCompanyLocked', 'Multi-entreprise réservé au plan Business')}>
              <span
                style={{
                  display: 'inline-block',
                  paddingLeft: '100%',
                  animation: 'marquee 10s linear infinite',
                }}
                className="sm:animate-none sm:pl-0"
              >
                🔒 {t('companyDashboard.multiCompanyLocked', 'Multi-entreprise réservé au plan Business')}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <div className="w-16 h-16 shrink-0 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              {company?.logo_url ? (<img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />) : (<Building2 className="w-8 h-8 text-slate-400" />)}
            </div>
            <div className="min-w-0"><h1 className="text-2xl font-bold text-slate-900 truncate">{company?.name}</h1><p className="text-slate-600">{t('companyDashboard.header.title')}</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <Link to="/dashboard/entreprise/profil" className="w-full">
              <Button variant="outline" className="w-full min-h-[44px]">
                <Settings className="w-4 h-4 mr-2" />{t('companyDashboard.profileButton')}
              </Button>
            </Link>

            <Link to={`/entreprises/${activeCompanyId}?from=company-dashboard`} className="w-full">
              <Button variant="outline" className="w-full min-h-[44px]">
                <Eye className="w-4 h-4 mr-2" />
                {t('candidateDashboard.quickActions.viewPublicProfile', 'Voir ma vitrine')}
              </Button>
            </Link>

            <Link to="/dashboard/entreprise/offres/nouvelle" className="w-full">
              <Button className="w-full min-h-[44px] bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />{t('companyDashboard.newOfferButton')}
              </Button>
            </Link>
          </div>
        </div>

        {isBusinessPlan && (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Crown className="w-8 h-8 text-yellow-300" />
              <div>
                <h2 className="font-bold text-lg">{t('companyDashboard.businessBanner.title', 'Plan Business')}</h2>
                <p className="text-white/80 text-sm">{t('companyDashboard.businessBanner.subtitle', 'Accès illimité à toutes les fonctionnalités premium')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-white/20 text-white border-0"><Sparkles className="w-3 h-3 mr-1" />{t('companyDashboard.businessBanner.boost', '1 boost gratuit / mois')}</Badge>
              <Badge className="bg-white/20 text-white border-0"><Search className="w-3 h-3 mr-1" />{t('companyDashboard.businessBanner.cvBank', 'CV Bank illimitée')}</Badge>
            </div>
          </div>
        )}

        {!isBusinessPlan && plan === 'pro' && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-200" />
              <div>
                <h2 className="font-bold text-lg">{t('companyDashboard.proBanner.title', 'Plan Pro')}</h2>
                <p className="text-white/80 text-sm">{t('companyDashboard.proBanner.subtitle', 'Des outils avancés pour vos recrutements')}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-white/20 text-white border-0"><FileText className="w-3 h-3 mr-1" />{t('companyDashboard.proBanner.interviewTools', 'Outils entretien')}</Badge>
              <Badge className="bg-white/20 text-white border-0"><Sparkles className="w-3 h-3 mr-1" />{t('companyDashboard.proBanner.aiNotes', 'Notes IA')}</Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={Briefcase} label={t('companyDashboard.stats.publishedJobs')} value={stats.activeJobs} color="blue" />
          <StatCard icon={FileText} label={t('companyDashboard.stats.totalApplications')} value={stats.totalApplications} color="green" />
          <StatCard icon={Users} label={t('companyDashboard.stats.newApplications')} value={stats.newApplications} color="purple" />
          <StatCard icon={Eye} label={t('companyDashboard.stats.totalViews')} value={jobs.reduce((s, j) => s + (j.views_count || 0), 0)} color="orange" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="border-slate-200 overflow-visible">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-slate-900">{t('companyDashboard.jobsSection.title')}</h2><p className="text-sm text-slate-500">{t('companyDashboard.jobsSection.totalOffers', { count: stats.totalJobs })}</p></div>
                <Link to="/dashboard/entreprise/offres" className="w-full sm:w-auto"><Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">{t('companyDashboard.jobsSection.viewAll')}<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
              </div>
              <CardContent className="p-4 sm:p-6">
                {jobs.length === 0 ? (
                  <div className="text-center py-8"><Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 mb-4">{t('companyDashboard.jobsSection.noOffers')}</p><Link to="/dashboard/entreprise/offres/nouvelle"><Button className="min-h-[44px]">{t('companyDashboard.jobsSection.publishButton')}</Button></Link></div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <CompanyJobCard key={job.id} job={job} onEdit={handleEditJob} onDelete={handleDeleteJob} onToggleStatus={handleToggleJobStatus} onSubmitForReview={handleSubmitForReview} onCancelSubmission={handleCancelSubmission} isCompanyVerified={company?.is_verified ?? false} isBusinessPlan={isBusinessPlan} onFreeBoost={handleFreeBoost} companyLogo={company?.logo_url} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div><h2 className="text-lg font-semibold text-slate-900">{t('companyDashboard.applicationsSection.title')}</h2><p className="text-sm text-slate-500">{t('companyDashboard.applicationsSection.newCount', { count: stats.newApplications })}</p></div>
                <Link to="/dashboard/entreprise/candidatures" className="w-full sm:w-auto"><Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">{t('companyDashboard.applicationsSection.viewAll')}<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
              </div>
              <CardContent className="p-4">{applications.length === 0 ? (<div className="text-center py-6"><Users className="w-10 h-10 text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">{t('companyDashboard.applicationsSection.noApplications')}</p></div>) : (<div className="space-y-2">{applications.slice(0, 5).map(app => (<ApplicationCard key={app.id} application={app} />))}</div>)}</CardContent>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('companyDashboard.companyProfileCard.title')}</h3>
                {!company?.is_verified && <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">{t('companyDashboard.companyProfileCard.pendingValidation')}</div>}
                <div className="space-y-3 text-sm">
                  {/* ✅ Industrie traduite */}
                  {company?.industry && <p className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4 text-slate-400" />{getTranslatedIndustry(company.industry)}</p>}
                  {company?.size && <p className="flex items-center gap-2 text-slate-600"><Users className="w-4 h-4 text-slate-400" />{t('companyDashboard.companyProfileCard.employees', { size: company.size })}</p>}
                  {company?.website && <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline break-all"><Globe className="w-4 h-4 shrink-0" />{company.website}</a>}
                  {company?.email && <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-blue-600 hover:underline break-all"><Mail className="w-4 h-4 shrink-0" />{company.email}</a>}
                  {company?.phone && <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 break-all"><Phone className="w-4 h-4 text-slate-400 shrink-0" />{company.phone}</a>}
                  {company?.founded_year && <p className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-slate-400" />{t('companyDashboard.companyProfileCard.founded', { year: company.founded_year })}</p>}
                  {company?.address && <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" />{company.address}</p>}
                </div>
                <Link to="/dashboard/entreprise/profil"><Button variant="outline" className="w-full mt-4 min-h-[44px]">{t('companyDashboard.companyProfileCard.editProfile')}</Button></Link>
              </CardContent>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
              <CardHeader><CardTitle>{t('companyDashboard.adminMessages.title')}</CardTitle></CardHeader>
              <CardContent>
                <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>}>
                  <UserMessages userId={user.id} />
                </Suspense>
              </CardContent>
            </Card>

            {showFollowersWidget && (
              <Card className="border-slate-200 overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    {t('companyDashboard.followers.title', 'Mes abonnés')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingFollowers ? (
                    <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-blue-600" /></div>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-slate-900 mb-2">{followersSummary.total}</p>
                      <p className="text-sm text-slate-500 mb-4">{t('companyDashboard.followers.total', 'abonnés')}</p>
                      {followersSummary.followers.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {followersSummary.followers.map(follower => (
                            <div key={follower.user_id} className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
                                {follower.avatar_url ? (<img src={follower.avatar_url} alt="" className="w-full h-full object-cover" />) : (<UserPlus className="w-4 h-4 m-2 text-slate-400" />)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{follower.first_name} {follower.last_name}</p>
                                <p className="text-xs text-slate-400">{formatRelative(follower.followed_at)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <Link to={`/dashboard/entreprise/abonnes?company_id=${company.id}`}><Button variant="outline" size="sm" className="w-full">{t('companyDashboard.followers.viewAll', 'Voir tous les abonnés')}<ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {hasCVBank && (
              <Card className="border-purple-200 bg-purple-50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Crown className="w-5 h-5 text-purple-600" /><h3 className="font-semibold text-purple-900">{t('companyDashboard.cvBank.title', 'Banque de CV')}</h3></div>
                  <p className="text-sm text-purple-700 mb-4">{t('companyDashboard.cvBank.desc', 'Accédez à notre vivier de talents disponibles.')}</p>
                  <Link to="/dashboard/entreprise/cv-bank"><Button variant="outline" className="w-full border-purple-300 text-purple-700 hover:bg-purple-100"><Search className="w-4 h-4 mr-2" />{t('companyDashboard.cvBank.browse', 'Parcourir les CV')}</Button></Link>
                </CardContent>
              </Card>
            )}

            {pendingDocsCount > 0 && (
              <Card className="border-blue-200 bg-blue-50 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><FileText className="w-5 h-5 text-blue-600" /><h3 className="font-semibold text-blue-900">{t('companyDashboard.pendingDocuments.title', 'Documents à valider')}</h3></div>
                  <p className="text-sm text-blue-700">{t('companyDashboard.pendingDocuments.count', { count: pendingDocsCount }, `${pendingDocsCount} document(s) en attente de validation.`)}</p>
                  <Link to="/dashboard/entreprise/candidatures"><Button variant="outline" size="sm" className="mt-2 w-full border-blue-300 text-blue-700 hover:bg-blue-100">{t('companyDashboard.pendingDocuments.viewApplications', 'Voir les candidatures')}</Button></Link>
                </CardContent>
              </Card>
            )}

            <Card className="border-blue-200 bg-blue-50 overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-sm px-3 py-1">
                    {t('companyDashboard.subscriptionCard.currentPlan', { plan: planLabel })}
                  </Badge>
                  {company?.billing_cycle && (
                    <span className="text-sm text-slate-600 ml-2">
                      · {company.billing_cycle === 'monthly' ? t('pricing.toggle.monthly') : t('pricing.toggle.annual')}
                    </span>
                  )}
                  <Link to="/tarifs" className="w-full sm:w-auto"><Button variant="ghost" size="sm" className="w-full sm:w-auto text-blue-600 hover:bg-blue-100 min-h-[44px]">{t('companyDashboard.subscriptionCard.changePlan')}</Button></Link>
                </div>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-slate-600 mb-1"><span>{t('companyDashboard.subscriptionCard.activeOffers')}</span><span>{activeJobsCount} / {jobsLimit === Infinity ? '∞' : jobsLimit}</span></div>
                  <div className="w-full bg-blue-100 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${jobsLimit === Infinity ? 100 : Math.min(100, (activeJobsCount / jobsLimit) * 100)}%` }} /></div>
                </div>
                {plan !== 'free' && company?.stripe_subscription_id ? (
                  <>
                    <p className="text-sm text-blue-800 mb-4">{t('companyDashboard.subscriptionCard.activePlanMessage', { plan: planLabel })}</p>
                    <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100 min-h-[44px] mb-4" onClick={handleOpenPortal}>
                      <CreditCard className="w-4 h-4 mr-2" />{t('companyDashboard.subscriptionCard.manageSubscription')}
                    </Button>
                    {/* Lien discret de résiliation */}
                    <button
                      type="button"
                      onClick={() => setShowCancelModal(true)}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors underline underline-offset-2 ml-1"
                    >
                      {t('companyDashboard.subscriptionCard.cancelSubscription')}
                    </button>
                  </>
                ) : plan === 'free' && company?.cancellation_reason ? (
                  <div className="text-sm text-slate-700 mt-2"><p className="font-medium">{t('companyDashboard.subscriptionCard.lastCancelReason')}</p><p className="italic mt-1">{t('companyDashboard.subscriptionCard.cancelReasonQuote', { reason: company.cancellation_reason })}</p></div>
                ) : (
                  <p className="text-sm text-blue-800">{t('companyDashboard.subscriptionCard.freePlanMessage')}</p>
                )}
                {isBusinessPlan && <p className="text-sm text-purple-700 mt-2">{t('companyDashboard.subscriptionCard.freeBoostMessage')}</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CancelSubscriptionModal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} onConfirm={handleCancelSubscription} cancelling={cancelling} />
    </div>
  );
};

export default CompanyDashboard;