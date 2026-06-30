import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Briefcase,
  MapPin,
  Eye,
  FileText,
  Loader2,
  ChevronLeft,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  Send,
  XCircle,
  Zap,
  Building2,
} from 'lucide-react';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';

const statusIcons = {
  draft: FileText,
  active: CheckCircle,
  paused: Clock,
  closed: XCircle,
  expired: Clock,
  pending: Clock,
};

const statusColors = {
  draft: 'bg-slate-100 text-slate-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  closed: 'bg-red-100 text-red-700',
  expired: 'bg-slate-100 text-slate-700',
  pending: 'bg-yellow-100 text-yellow-700',
};

const JobCard = ({ job, onEdit, onDelete, onToggleStatus, onFreeBoost, isBusinessPlan, companyLogo }) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuButtonRef = useRef(null);

  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const statusLabel = t(`companyJobs.status.${job.status}`, { defaultValue: job.status });
  const StatusIcon = statusIcons[job.status] || FileText;

  const updateMenuPosition = () => {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = isBusinessPlan ? 310 : 260;
    const padding = 12;
    const gap = 8;
    const left = Math.max(
      padding,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - padding)
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const top =
      spaceBelow >= menuHeight || spaceBelow >= spaceAbove
        ? rect.bottom + gap
        : Math.max(padding, rect.top - menuHeight - gap);
    setMenuPos({ top, left });
  };

  const openMenu = () => {
    if (!showMenu) updateMenuPosition();
    setShowMenu((prev) => !prev);
  };

  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    const reposition = () => updateMenuPosition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', close, true);
    };
  }, [showMenu]);

  const menu = showMenu
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] w-[240px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-slate-200 py-1 overflow-hidden"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <button
              onClick={() => { onEdit(job); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <Edit className="w-4 h-4" />
              {t('companyJobs.menu.edit')}
            </button>

            {job.status === 'active' && (
              <>
                <button
                  onClick={() => { onToggleStatus(job, 'paused'); setShowMenu(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-yellow-600 hover:bg-slate-50"
                >
                  <Clock className="w-4 h-4" />
                  {t('companyJobs.menu.pause')}
                </button>
                {isBusinessPlan && (
                  <button
                    onClick={() => { setShowMenu(false); onFreeBoost(job); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-slate-50"
                  >
                    <Zap className="w-4 h-4" />
                    {t('companyJobs.menu.boost')}
                  </button>
                )}
              </>
            )}

            {job.status === 'paused' && (
              <button
                onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"
              >
                <CheckCircle className="w-4 h-4" />
                {t('companyJobs.menu.reactivate')}
              </button>
            )}

            {(job.status === 'draft' || job.status === 'closed' || job.status === 'expired') && (
              <button
                onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-green-600 hover:bg-slate-50"
              >
                <Send className="w-4 h-4" />
                {t('companyJobs.menu.publish')}
              </button>
            )}

            <button
              onClick={() => { onDelete(job); setShowMenu(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-slate-50"
            >
              <Trash2 className="w-4 h-4" />
              {t('companyJobs.menu.delete')}
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-200 transition-colors overflow-visible">
      <div className="flex items-start gap-3">
        {/* Logo de l'entreprise */}
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="w-full h-full object-cover" />
          ) : (
            <Building2 className="w-6 h-6 text-slate-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link
              to={`/emplois/${job.id}`}
              className="font-semibold text-slate-900 hover:text-blue-600 text-sm sm:text-base"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {job.title}
            </Link>

            <Badge className={`${statusColors[job.status] || ''} border-0 text-xs flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusLabel}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500">
            {job.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.city.name}
              </span>
            )}

            <Badge className={`${contractInfo.color} border-0 text-xs`}>
              {contractInfo.label}
            </Badge>

            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {t('companyJobs.views', { count: job.views_count || 0 })}
            </span>

            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {t('companyJobs.applications', { count: job.applications_count || 0 })}
            </span>
          </div>

          <p className="text-xs text-slate-400 mt-2">
            {formatRelative(job.created_at)}
          </p>
        </div>

        <div className="shrink-0">
          <Button
            ref={menuButtonRef}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={openMenu}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mt-4">
        <Button
          variant="outline"
          className="w-full sm:w-auto min-h-[44px]"
          onClick={() => onEdit(job)}
        >
          <Edit className="w-4 h-4 mr-2" />
          {t('companyJobs.menu.edit')}
        </Button>

        <Button
          variant="outline"
          className="w-full sm:w-auto text-red-600 hover:bg-red-50 min-h-[44px]"
          onClick={() => onDelete(job)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('companyJobs.menu.delete')}
        </Button>
      </div>

      {menu}
    </div>
  );
};

const CompanyJobsPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    if (user && activeCompanyId) {
      fetchJobs();
      // Récupérer l'entreprise pour le plan ET le logo
      supabase
        .from('companies')
        .select('subscription_plan, logo_url')
        .eq('id', activeCompanyId)
        .single()
        .then(({ data }) => setCompany(data));
    } else if (!activeCompanyId) {
      setJobs([]);
      setLoading(false);
    }
  }, [user, activeCompanyId]);

  const fetchJobs = async () => {
    if (!activeCompanyId) {
      setJobs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await supabase
      .from('jobs')
      .select('*, city:cities(name)')
      .eq('company_id', activeCompanyId)
      .order('created_at', { ascending: false });

    setJobs(data || []);
    setLoading(false);
  };

  const handleEditJob = (job) => {
    navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);
  };

  const handleDeleteJob = async (job) => {
    if (!window.confirm(t('companyJobs.confirmDelete', { title: job.title }))) return;

    try {
      await supabase.from('jobs').delete().eq('id', job.id);
      setJobs(jobs.filter((j) => j.id !== job.id));
      toast.success(t('companyJobs.toasts.deleted'));
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error(t('companyJobs.toasts.deleteError'));
    }
  };

  const handleToggleJobStatus = async (job, newStatus) => {
    try {
      const updates = { status: newStatus };

      if (newStatus === 'active' && !job.published_at) {
        updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      await supabase.from('jobs').update(updates).eq('id', job.id);
      setJobs(jobs.map((j) => (j.id === job.id ? { ...j, ...updates } : j)));
      toast.success(newStatus === 'active' ? t('companyJobs.toasts.published') : t('companyJobs.toasts.statusUpdated'));
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error(t('companyJobs.toasts.updateError'));
    }
  };

  const handleFreeBoost = async (job) => {
    try {
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id, subscription_plan, last_free_boost_at')
        .eq('owner_id', user.id)
        .single();

      if (companyError || !companyData) throw new Error(t('companyJobs.toasts.companyNotFound'));

      if (companyData.subscription_plan !== 'business') {
        toast.error(t('companyJobs.toasts.boostBusinessOnly'));
        return;
      }

      const now = new Date();
      if (companyData.last_free_boost_at) {
        const lastBoost = new Date(companyData.last_free_boost_at);
        const diffDays = (now - lastBoost) / (1000 * 60 * 60 * 24);
        if (diffDays < 30) {
          const daysLeft = Math.ceil(30 - diffDays);
          toast.error(t('companyJobs.toasts.boostAlreadyUsed', { days: daysLeft }));
          return;
        }
      }

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('id, status, company_id')
        .eq('id', job.id)
        .single();

      if (jobError || !jobData || jobData.status !== 'active' || jobData.company_id !== companyData.id) {
        toast.error(t('companyJobs.toasts.jobNotEligible'));
        return;
      }

      const boostedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateJobError } = await supabase
        .from('jobs')
        .update({ boosted_until: boostedUntil })
        .eq('id', job.id);

      if (updateJobError) throw updateJobError;

      const { error: updateCompanyError } = await supabase
        .from('companies')
        .update({ last_free_boost_at: now.toISOString() })
        .eq('id', companyData.id);

      if (updateCompanyError) throw updateCompanyError;

      toast.success(t('companyJobs.toasts.boostActivated'));
      fetchJobs();
    } catch (err) {
      console.error('Erreur boost gratuit:', err);
      toast.error(err.message || t('companyJobs.toasts.boostError'));
    }
  };

  const isBusinessPlan = company?.subscription_plan === 'business';
  const companyLogo = company?.logo_url;

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex justify-center items-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard/entreprise">
              <Button variant="ghost" className="min-h-[44px]">
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t('companyJobs.back')}
              </Button>
            </Link>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">
              {t('companyJobs.title')}
            </h1>
          </div>

          <Link to="/dashboard/entreprise/offres/nouvelle" className="w-full sm:w-auto">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto min-h-[44px]">
              <Plus className="w-4 h-4 mr-2" />
              {t('companyJobs.newOffer')}
            </Button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200">
            <CardContent className="p-8 text-center">
              <Briefcase className="w-14 h-14 mx-auto mb-4 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                {t('companyJobs.noJobs.title')}
              </h2>
              <p className="text-slate-500 mb-6">
                {t('companyJobs.noJobs.message')}
              </p>
              <Link to="/dashboard/entreprise/offres/nouvelle">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('companyJobs.noJobs.createButton')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onEdit={handleEditJob}
                onDelete={handleDeleteJob}
                onToggleStatus={handleToggleJobStatus}
                onFreeBoost={handleFreeBoost}
                isBusinessPlan={isBusinessPlan}
                companyLogo={companyLogo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyJobsPage;