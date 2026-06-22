import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import MessageSender from '../components/MessageSender';
import {
  Shield,
  Building2,
  Briefcase,
  Users,
  Eye,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Search,
  MoreVertical,
  Trash2,
  Ban,
  Check,
  RefreshCw,
  Loader2,
  TrendingUp,
  ChevronRight,
  Filter,
  MapPin,
  Mail,
  UserX,
  UserCheck,
  Flag,
  UserCog,
  LayoutDashboard,
  CreditCard,
  Sparkles,
  Edit,
  Save,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';
import { getPlanLimit, getExpirationDays } from '../lib/planLimits';

// ---------- Stats Card ----------
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue', onClick }) => {
  const { t } = useTranslation();
  return (
    <Card
      className={cn(
        'border-slate-200 transition-all overflow-hidden',
        onClick && 'cursor-pointer hover:shadow-lg hover:border-blue-300'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-slate-500 truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{value}</p>
            {trend !== undefined && (
              <p
                className={cn(
                  'text-xs mt-1 flex items-center gap-1',
                  trend > 0 ? 'text-green-600' : 'text-slate-500'
                )}
              >
                <TrendingUp className="w-3 h-3" />
                {trend > 0 ? '+' : ''}
                {t('adminDashboard.stats.trend', { trend })}
              </p>
            )}
          </div>
          <div
            className={cn(
              'w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0',
              color === 'blue' && 'bg-blue-100',
              color === 'green' && 'bg-green-100',
              color === 'yellow' && 'bg-yellow-100',
              color === 'red' && 'bg-red-100',
              color === 'purple' && 'bg-purple-100'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 sm:w-6 sm:h-6',
                color === 'blue' && 'text-blue-600',
                color === 'green' && 'text-green-600',
                color === 'yellow' && 'text-yellow-600',
                color === 'red' && 'text-red-600',
                color === 'purple' && 'text-purple-600'
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Job Moderation Card (avec onReactivate) ----------
const JobModerationCard = ({ job, onApprove, onReject, onSuspend, onDelete, onReactivate }) => {
  const { t } = useTranslation();
  const menuButtonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [showDetails, setShowDetails] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  const statusConfig = {
    pending: { label: t('adminDashboard.jobs.status.pending'), color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    active: { label: t('adminDashboard.jobs.status.active'), color: 'bg-green-100 text-green-700', icon: CheckCircle },
    suspended: { label: t('adminDashboard.jobs.status.suspended'), color: 'bg-red-100 text-red-700', icon: Ban },
    rejected: { label: t('adminDashboard.jobs.status.rejected'), color: 'bg-slate-100 text-slate-700', icon: XCircle },
  };

  const status = statusConfig[job.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  const updateMenuPosition = () => {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 120;
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

  const confirmAction = async () => {
    if (actionType === 'suspend') {
      await onSuspend(job, reason);
    } else if (actionType === 'delete') {
      await onDelete(job, reason);
    }
    setActionType(null);
  };

  const handleToggleDetails = async () => {
    if (!showDetails) {
      setLoadingDetails(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('description, requirements, responsibilities, benefits, skills_required, contract_type, experience_level, salary_min, salary_max, positions_count, application_deadline, is_remote, is_urgent')
          .eq('id', job.id)
          .single();
        if (error) throw error;
        setJobDetails(data);
      } catch (err) {
        toast.error(t('adminDashboard.jobs.detailsError'));
      } finally {
        setLoadingDetails(false);
      }
    }
    setShowDetails(!showDetails);
  };

  const menu = showMenu
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] w-[240px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-1"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            <Link
              to={`/emplois/${job.id}`}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => setShowMenu(false)}
            >
              <Eye className="w-4 h-4" />
              {t('adminDashboard.jobs.viewJob')}
            </Link>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div
      className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-colors overflow-visible"
      data-testid={`job-card-${job.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          {job.company?.logo_url ? (
            <img src={job.company.logo_url} alt={job.company.name} className="w-8 h-8 object-contain" />
          ) : (
            <Briefcase className="w-6 h-6 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3
              className="font-semibold text-slate-900 text-sm sm:text-base"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {job.title}
            </h3>
            <Badge className={cn(status.color, 'border-0 text-xs gap-1 w-fit')}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {job.company?.name || 'Entreprise'}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.city?.name || t('adminDashboard.jobs.detailsUnspecified')}
            </span>
            <Badge className={cn(contractInfo.color, 'border-0 text-xs')}>
              {contractInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('adminDashboard.jobs.publishedBy', { date: formatRelative(job.created_at), email: job.posted_by_user?.email })}
          </p>
        </div>
        <div className="shrink-0">
          <Button variant="ghost" size="icon" onClick={openMenu} ref={menuButtonRef} className="h-9 w-9">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-start">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleDetails}
          className="text-blue-600 hover:text-blue-700"
        >
          {loadingDetails ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
          {showDetails ? t('adminDashboard.jobs.hideDetails') : t('adminDashboard.jobs.showDetails')}
        </Button>
      </div>

      {showDetails && jobDetails && (
        <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm space-y-3 border border-slate-100">
          <div>
            <strong>{t('adminDashboard.jobs.detailsDescription')}</strong>
            <p className="whitespace-pre-line">{jobDetails.description}</p>
          </div>
          {jobDetails.requirements && (
            <div>
              <strong>{t('adminDashboard.jobs.detailsRequirements')}</strong>
              <p className="whitespace-pre-line">{jobDetails.requirements}</p>
            </div>
          )}
          {jobDetails.responsibilities && (
            <div>
              <strong>{t('adminDashboard.jobs.detailsMissions')}</strong>
              <p className="whitespace-pre-line">{jobDetails.responsibilities}</p>
            </div>
          )}
          {jobDetails.benefits && (
            <div>
              <strong>{t('adminDashboard.jobs.detailsBenefits')}</strong>
              <p className="whitespace-pre-line">{jobDetails.benefits}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {jobDetails.skills_required?.length > 0 && (
              <div>
                <strong>{t('adminDashboard.jobs.detailsSkills')}</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobDetails.skills_required.map((skill) => (
                    <Badge key={skill} className="bg-blue-50 text-blue-700 text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <strong>{t('adminDashboard.jobs.detailsExperience')}</strong> {t(`experienceLevels.${jobDetails.experience_level}`, { defaultValue: jobDetails.experience_level || t('adminDashboard.jobs.detailsUnspecified') })}
            </div>
            {jobDetails.salary_min && jobDetails.salary_max && (
              <div>
                <strong>{t('adminDashboard.jobs.detailsSalary')}</strong> {jobDetails.salary_min.toLocaleString('fr-FR')} - {jobDetails.salary_max.toLocaleString('fr-FR')} FCFA
              </div>
            )}
            <div>
              <strong>{t('adminDashboard.jobs.detailsPositions')}</strong> {jobDetails.positions_count}
            </div>
            {jobDetails.application_deadline && (
              <div>
                <strong>{t('adminDashboard.jobs.detailsDeadline')}</strong> {new Date(jobDetails.application_deadline).toLocaleDateString('fr-FR')}
              </div>
            )}
            <div>
              <strong>{t('adminDashboard.jobs.detailsRemote')}</strong> {jobDetails.is_remote ? t('adminDashboard.jobs.detailsYes') : t('adminDashboard.jobs.detailsNo')}
            </div>
            <div>
              <strong>{t('adminDashboard.jobs.detailsUrgent')}</strong> {jobDetails.is_urgent ? t('adminDashboard.jobs.detailsYes') : t('adminDashboard.jobs.detailsNo')}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
        {job.status === 'pending' && (
          <>
            {!job.company?.is_verified && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-full sm:w-auto">
                {t('adminDashboard.jobs.companyNotVerified')}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-green-600 hover:bg-green-50 hover:text-green-700 min-h-[44px]"
              onClick={() => onApprove(job)}
              disabled={!job.company?.is_verified}
            >
              <Check className="w-4 h-4 mr-1" />
              {t('adminDashboard.jobs.approve')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
              onClick={() => onReject(job)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {t('adminDashboard.jobs.reject')}
            </Button>
          </>
        )}

        {job.status === 'draft' && (
          <>
            {!job.company?.is_verified && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-full sm:w-auto">
                {t('adminDashboard.jobs.companyNotVerified')}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-blue-600 hover:bg-blue-50 hover:text-blue-700 min-h-[44px]"
              onClick={() => onApprove(job)}
              disabled={!job.company?.is_verified}
            >
              <Check className="w-4 h-4 mr-1" />
              {t('adminDashboard.jobs.publish')}
            </Button>
          </>
        )}

        {job.status === 'active' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 min-h-[44px]"
            onClick={() => setActionType('suspend')}
          >
            <Ban className="w-4 h-4 mr-1" />
            {t('adminDashboard.jobs.suspend')}
          </Button>
        )}

        {job.status === 'suspended' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-green-600 hover:bg-green-50 hover:text-green-700 min-h-[44px]"
            onClick={() => onReactivate(job)}
          >
            <Check className="w-4 h-4 mr-1" />
            {t('adminDashboard.jobs.reactivate')}
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
          onClick={() => setActionType('delete')}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('adminDashboard.jobs.delete')}
        </Button>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'suspend' ? t('adminDashboard.jobs.suspendModalTitle') : t('adminDashboard.jobs.deleteModalTitle')}
            </h3>
            <label className="block text-sm font-medium mb-2">{t('adminDashboard.jobs.reasonLabel')}</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setActionType(null)}>
                {t('adminDashboard.jobs.cancel')}
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 min-h-[44px]" onClick={confirmAction}>
                {t('adminDashboard.jobs.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {menu}
    </div>
  );
};

// ---------- Company Validation Card ----------
const CompanyValidationCard = ({ company, onApprove, onReject, onDelete, onViewJobs, onSuspendWithDuration }) => {
  const { t } = useTranslation();
  const menuButtonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const statusConfig = {
    false: { label: t('adminDashboard.companies.status.unverified'), color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    true: { label: t('adminDashboard.companies.status.verified'), color: 'bg-green-100 text-green-700', icon: CheckCircle },
  };

  const status = statusConfig[company.is_verified ? 'true' : 'false'] || statusConfig.false;
  const StatusIcon = status.icon;

  const updateMenuPosition = () => {
    if (!menuButtonRef.current) return;
    const rect = menuButtonRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 120;
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

  const confirmAction = async () => {
    if (actionType === 'reject') {
      await onReject(company, reason);
    } else if (actionType === 'delete') {
      await onDelete(company);
    }
    setActionType(null);
  };

  const menu = showMenu
    ? createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowMenu(false)} />
          <div
            className="fixed z-[9999] w-[240px] max-w-[calc(100vw-24px)] bg-white rounded-xl shadow-2xl border border-slate-200 py-1"
            style={{ top: menuPos.top, left: menuPos.left }}
          >
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Eye className="w-4 h-4" />
                {t('adminDashboard.companies.viewSite')}
              </a>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                if (onViewJobs) onViewJobs(company);
              }}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
            >
              <FileText className="w-4 h-4" />
              {t('adminDashboard.companies.viewOffers', { count: company.jobs_count || 0 })}
            </button>
          </div>
        </>,
        document.body
      )
    : null;

  return (
    <div
      className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-200 transition-colors"
      data-testid={`company-card-${company.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
          {company.logo_url ? (
            <img src={company.logo_url} alt={company.name} className="w-10 h-10 object-contain rounded" />
          ) : (
            <Building2 className="w-7 h-7 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{company.name}</h3>
            <Badge className={cn(status.color, 'border-0 text-xs gap-1 w-fit')}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-slate-500">
            {company.industry && <span>{company.industry}</span>}
            {company.size && <span>• {t('adminDashboard.companies.employees', { size: company.size })}</span>}
            {company.city?.name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {company.city.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('adminDashboard.companies.createdAt', { date: formatRelative(company.created_at) })} • {t('adminDashboard.companies.offersCount', { count: company.jobs_count || 0 })}
          </p>
        </div>
        <div className="shrink-0">
          <Button variant="ghost" size="icon" onClick={openMenu} ref={menuButtonRef} className="h-9 w-9">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
        {!company.is_verified ? (
          <>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-green-600 hover:bg-green-50 hover:text-green-700 min-h-[44px]"
              onClick={() => onApprove(company)}
            >
              <Check className="w-4 h-4 mr-1" />
              {t('adminDashboard.companies.validate')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
              onClick={() => setActionType('reject')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {t('adminDashboard.companies.reject')}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 min-h-[44px]"
            onClick={() => onSuspendWithDuration(company)}
            disabled={!company.is_active}
          >
            <Ban className="w-4 h-4 mr-1" />
            {t('adminDashboard.companies.suspend')}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
          onClick={() => setActionType('delete')}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('adminDashboard.companies.deleteCompany')}
        </Button>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'reject' ? t('adminDashboard.companies.rejectModalTitle') : t('adminDashboard.companies.deleteModalTitle')}
            </h3>
            {actionType === 'reject' && (
              <>
                <label className="block text-sm font-medium mb-2">{t('adminDashboard.jobs.reasonLabel')}</label>
                <textarea
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </>
            )}
            {actionType === 'delete' && (
              <p className="text-sm text-red-600 mb-4">
                {t('adminDashboard.companies.deleteWarning')}
              </p>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setActionType(null)}>
                {t('adminDashboard.companies.cancel')}
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 min-h-[44px]" onClick={confirmAction}>
                {t('adminDashboard.companies.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {menu}
    </div>
  );
};

// ---------- Tabs ----------
const TabButton = ({ active, onClick, children, count }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]',
      active ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'
    )}
  >
    {children}
    {count !== undefined && (
      <span
        className={cn(
          'px-2 py-0.5 text-xs rounded-full',
          active ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
        )}
      >
        {count}
      </span>
    )}
  </button>
);

// ---------- Main Admin Dashboard ----------
const AdminDashboard = () => {
  const { t, i18n } = useTranslation();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    pendingJobs: 0,
    activeJobs: 0,
    pendingCompanies: 0,
    verifiedCompanies: 0,
    totalCandidates: 0,
    totalApplications: 0,
  });

  const ITEMS_PER_PAGE = 20;
  const [jobs, setJobs] = useState([]);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsHasMore, setJobsHasMore] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesHasMore, setCompaniesHasMore] = useState(true);

  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersHasMore, setUsersHasMore] = useState(true);

  const [reports, setReports] = useState([]);
  const [cancellations, setCancellations] = useState([]);
  const [loadingCancellations, setLoadingCancellations] = useState(true);

  const [jobFilter, setJobFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  const [newsletter, setNewsletter] = useState({ subject: '', content: '' });
  const [sendingNewsletter, setSendingNewsletter] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);

  const [blogPosts, setBlogPosts] = useState([]);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [blogForm, setBlogForm] = useState({
    title: '',
    keywords: '',
    audience: 'all',
    category: 'Carrière',
    read_time: '5 min',
    author: 'Équipe Actoos',
    icon: 'FileText',
    color: 'blue'
  });
  const [editingSlug, setEditingSlug] = useState(null);

  const [suspendModal, setSuspendModal] = useState({ open: false, userId: null });
  const [suspendDuration, setSuspendDuration] = useState(0);
  const [suspendReason, setSuspendReason] = useState('');

  const [companySuspendModal, setCompanySuspendModal] = useState({ open: false, companyId: null });
  const [companySuspendDuration, setCompanySuspendDuration] = useState(0);
  const [companySuspendReason, setCompanySuspendReason] = useState('');

  const [roleRequests, setRoleRequests] = useState([]);

  const roleLabel = (role) => t(`adminDashboard.roleLabels.${role}`, { defaultValue: role || t('adminDashboard.roleLabels.unknown') });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error(t('adminDashboard.unauthorized'));
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchInitialData();
      fetchSubscribers();
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchRoleRequests();
  }, [isAdmin]);

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

  const fetchSubscribers = async () => {
    setLoadingSubscribers(true);
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('subscribed_at', { ascending: false });
    if (!error) setSubscribers(data || []);
    setLoadingSubscribers(false);
  };

  const fetchBlogPosts = async () => {
    setLoadingBlog(true);
    try {
      const res = await apiFetch('/api/blog/posts');
      setBlogPosts(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      setBlogPosts([]);
    } finally {
      setLoadingBlog(false);
    }
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'blog') {
      fetchBlogPosts();
    }
  }, [isAdmin, activeTab]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`*, company:companies(id, name, logo_url, is_verified, subscription_plan), city:cities(name), posted_by_user:users!jobs_posted_by_fkey(email)`)
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_PAGE);
      setJobs(jobsData || []);
      setJobsPage(1);
      setJobsHasMore((jobsData || []).length === ITEMS_PER_PAGE);

      const { data: companiesData } = await supabase
        .from('companies')
        .select(`*, city:cities(name), jobs:jobs(count)`)
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_PAGE);
      const companiesWithCount = (companiesData || []).map((c) => ({
        ...c,
        jobs_count: c.jobs?.[0]?.count || 0,
      }));
      setCompanies(companiesWithCount);
      setCompaniesPage(1);
      setCompaniesHasMore((companiesData || []).length === ITEMS_PER_PAGE);

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(ITEMS_PER_PAGE);
      setUsers(usersData || []);
      setUsersPage(1);
      setUsersHasMore((usersData || []).length === ITEMS_PER_PAGE);

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

      const pendingJobs = (jobsData || []).filter((j) => j.status === 'pending' || j.status === 'draft').length;
      const activeJobs = (jobsData || []).filter((j) => j.status === 'active').length;
      const pendingCompanies = companiesWithCount.filter((c) => c.is_verified === false).length;
      const verifiedCompanies = companiesWithCount.filter((c) => c.is_verified === true).length;

      const { count: candidatesCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'candidate');

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
      toast.error(t('adminDashboard.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  const loadMoreJobs = async () => {
    const nextPage = jobsPage + 1;
    const from = (nextPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const { data } = await supabase
      .from('jobs')
      .select(`..., company:companies(id, name, logo_url, is_verified, subscription_plan), city:cities(name), posted_by_user:users!jobs_posted_by_fkey(email)`)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (data) {
      setJobs((prev) => [...prev, ...data]);
      setJobsPage(nextPage);
      if (data.length < ITEMS_PER_PAGE) setJobsHasMore(false);
    } else {
      setJobsHasMore(false);
    }
  };

  const loadMoreCompanies = async () => {
    const nextPage = companiesPage + 1;
    const from = (nextPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const { data } = await supabase
      .from('companies')
      .select(`*, city:cities(name), jobs:jobs(count)`)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (data) {
      const enriched = data.map((c) => ({
        ...c,
        jobs_count: c.jobs?.[0]?.count || 0,
      }));
      setCompanies((prev) => [...prev, ...enriched]);
      setCompaniesPage(nextPage);
      if (data.length < ITEMS_PER_PAGE) setCompaniesHasMore(false);
    } else {
      setCompaniesHasMore(false);
    }
  };

  const loadMoreUsers = async () => {
    const nextPage = usersPage + 1;
    const from = (nextPage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    if (data) {
      setUsers((prev) => [...prev, ...data]);
      setUsersPage(nextPage);
      if (data.length < ITEMS_PER_PAGE) setUsersHasMore(false);
    } else {
      setUsersHasMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInitialData();
    setRefreshing(false);
    toast.success(t('adminDashboard.dataRefreshed'));
  };

  // ---------- Role requests ----------
  const handleRoleRequest = async (requestId, action) => {
    const message = action === 'reject'
      ? window.prompt(t('adminDashboard.jobs.reasonLabel'))
      : null;

    const { error } = await supabase.rpc('handle_role_request', {
      p_request_id: requestId,
      p_action: action,
      p_admin_message: message || null,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    const requestData = roleRequests.find(r => r.id === requestId);
    if (requestData) {
      try {
        await apiFetch('/api/admin/send-role-change-email', {
          method: 'POST',
          body: JSON.stringify({
            email: requestData.user_email,
            first_name: requestData.user_first_name || t('adminDashboard.roleLabels.unknown'),
            action: action,
            requested_role: requestData.requested_role,
            admin_message: message || null,
            language: i18n.language,
          }),
        });
      } catch (err) {
        console.error('Erreur envoi email:', err);
      }
    }

    toast.success(action === 'approve' ? t('adminDashboard.roleRequests.approvedToast') : t('adminDashboard.roleRequests.rejectedToast'));
    fetchRoleRequests();
  };

  const fetchRoleRequests = async () => {
    const { data, error } = await supabase.rpc('get_pending_role_requests');
    if (error) {
      console.error('Erreur RPC:', error);
      setRoleRequests([]);
    } else {
      const enriched = data
        ? await Promise.all(data.map(async (r) => {
            const { data: userData } = await supabase
              .from('users')
              .select('email, first_name, last_name')
              .eq('id', r.user_id)
              .single();
            return { ...r, user: userData || { email: '', first_name: '', last_name: '' } };
          }))
        : [];
      setRoleRequests(enriched);
    }
  };

  // ---------- Job handlers ----------
  const handleApproveJob = async (job) => {
    if (!job.company?.is_verified) {
      toast.error(t('adminDashboard.jobs.approveCompanyFirst'));
      return;
    }
    const plan = job.company?.subscription_plan || 'free';
    const limit = getPlanLimit(plan);
    const { count: activeCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', job.company_id)
      .eq('status', 'active');

    if (activeCount >= limit) {
      toast.error(t('adminDashboard.jobs.approveLimitReached', { limit }));
      return;
    }

    try {
      await supabase
        .from('jobs')
        .update({
          status: 'active',
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', job.id);

      try {
        await apiFetch('/api/send-job-alerts', { method: 'POST' });
      } catch (err) {
        console.error('Erreur envoi alertes emploi:', err);
      }

      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'active' } : j)));
      setStats((s) => ({ ...s, pendingJobs: Math.max(0, s.pendingJobs - 1), activeJobs: s.activeJobs + 1 }));
      toast.success(t('adminDashboard.jobs.approvedToast'));

      // Envoyer l'email au recruteur
      if (job.posted_by_user?.email) {
        try {
          await apiFetch('/api/notify-job-approved', {
            method: 'POST',
            body: JSON.stringify({
              email: job.posted_by_user.email,
              first_name: job.posted_by_user.first_name || 'Recruteur',
              job_title: job.title,
              language: i18n.language,
            }),
          });
        } catch (emailError) {
          console.error('Erreur envoi email validation offre:', emailError);
        }
      }
    } catch (error) {
      toast.error(t('adminDashboard.jobs.approveError'));
    }
  };

  const handleRejectJob = async (job) => {
    if (!window.confirm(t('adminDashboard.jobs.rejectConfirm'))) return;
    try {
      await supabase.from('jobs').update({ status: 'rejected' }).eq('id', job.id);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'rejected' } : j)));
      setStats((s) => ({ ...s, pendingJobs: Math.max(0, s.pendingJobs - 1) }));
      toast.success(t('adminDashboard.jobs.rejectedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  const handleSuspendJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/suspend-job', {
        method: 'POST',
        body: JSON.stringify({ id: job.id, reason, language: i18n.language }),
      });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'suspended' } : j)));
      setStats((s) => ({ ...s, activeJobs: Math.max(0, s.activeJobs - 1) }));
      toast.success(t('adminDashboard.jobs.suspendedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  const handleDeleteJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/delete-job', {
        method: 'POST',
        body: JSON.stringify({ id: job.id, reason, language: i18n.language }),
      });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success(t('adminDashboard.jobs.deletedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  // Réactivation d'offre suspendue (modifié pour utiliser l'API dédiée)
  const handleReactivateJob = async (job) => {
    if (!job.company?.is_verified) {
      toast.error(t('adminDashboard.jobs.approveCompanyFirst'));
      return;
    }
    const plan = job.company?.subscription_plan || 'free';
    const limit = getPlanLimit(plan);
    const { count: activeCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', job.company_id)
      .eq('status', 'active');

    if (activeCount >= limit) {
      toast.error(t('adminDashboard.jobs.approveLimitReached', { limit }));
      return;
    }

    try {
      // 1. Mise à jour via le backend (bypass RLS)
      await apiFetch('/api/admin/reactivate-job', {
        method: 'POST',
        body: JSON.stringify({ id: job.id, language: i18n.language }),
      });

      // 2. Mise à jour locale de l'état
      setJobs(prev => prev.map(j => (j.id === job.id ? { ...j, status: 'active', suspended_until: null } : j)));
      setStats(s => ({ ...s, activeJobs: s.activeJobs + 1 }));

      // 3. Envoi de l'email de réactivation
      if (job.posted_by_user?.email) {
        try {
          await apiFetch('/api/notify-job-reactivated', {
            method: 'POST',
            body: JSON.stringify({
              email: job.posted_by_user.email,
              first_name: job.posted_by_user.first_name || 'Recruteur',
              job_title: job.title,
              language: i18n.language,
            }),
          });
        } catch (emailError) {
          console.error('Erreur email réactivation:', emailError);
        }
      }

      toast.success(t('adminDashboard.jobs.reactivatedToast'));
    } catch (error) {
      console.error('Erreur réactivation :', error);
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  // ---------- Company handlers ----------
  const handleApproveCompany = async (company) => {
    try {
      await apiFetch('/api/admin/verify-company', {
        method: 'POST',
        body: JSON.stringify({ id: company.id, language: i18n.language }),
      });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, is_verified: true } : c)));
      setStats((s) => ({
        ...s,
        pendingCompanies: Math.max(0, s.pendingCompanies - 1),
        verifiedCompanies: s.verifiedCompanies + 1,
      }));
      toast.success(t('adminDashboard.companies.validatedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.companies.validateError'));
    }
  };

  const handleRejectCompany = async (company, reason = '') => {
    try {
      await apiFetch('/api/admin/reject-company', {
        method: 'POST',
        body: JSON.stringify({ id: company.id, reason, language: i18n.language }),
      });
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, is_verified: false, is_active: false } : c))
      );
      setStats((s) => ({ ...s, pendingCompanies: Math.max(0, s.pendingCompanies - 1) }));
      toast.success(t('adminDashboard.companies.rejectedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.companies.genericError'));
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!window.confirm(t('adminDashboard.companies.deleteConfirm', { name: company.name }))) return;
    try {
      await apiFetch(`/api/admin/delete-company/${company.id}?language=${i18n.language}`, { method: 'DELETE' });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      toast.success(t('adminDashboard.companies.deletedToast'));
    } catch (error) {
      console.error('Delete company error:', error);
      toast.error(error.message || t('adminDashboard.companies.genericError'));
    }
  };

  const handleViewCompanyJobs = (company) => {
    setActiveTab('jobs');
    setJobFilter('all');
    setSearchQuery(company.name);
  };

  // ---------- User handlers ----------
  const handleToggleUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success(t('adminDashboard.users.roleUpdated'));
    } catch (error) {
      console.error('Erreur changement de rôle:', error);
      toast.error(error.message || t('adminDashboard.users.roleUpdateError'));
    }
  };

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await apiFetch('/api/admin/toggle-user-status', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, is_active: !currentStatus, language: i18n.language }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)));
      toast.success(currentStatus ? t('adminDashboard.users.suspendedToast') : t('adminDashboard.users.reactivatedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm(t('adminDashboard.users.banConfirm'))) return;
    try {
      await apiFetch('/api/admin/ban-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason: 'Violation des règles', language: i18n.language }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: false, is_banned: true } : u)));
      toast.success(t('adminDashboard.users.bannedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.jobs.genericError'));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm(t('adminDashboard.users.deleteConfirm'))) return;
    try {
      await apiFetch(`/api/admin/delete-user/${userId}?language=${i18n.language}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success(t('adminDashboard.users.deletedToast'));
    } catch (error) {
      toast.error(t('adminDashboard.users.deleteError'));
    }
  };

  const handleSuspendUser = async () => {
    if (!suspendModal.userId) return;
    try {
      const res = await apiFetch('/api/admin/suspend-user', {
        method: 'POST',
        body: JSON.stringify({
          user_id: suspendModal.userId,
          duration_days: suspendDuration === 0 ? null : suspendDuration,
          reason: suspendReason || null,
          language: i18n.language,
        }),
      });
      if (res.success) {
        setUsers(prev => prev.map(u => u.id === suspendModal.userId ? { ...u, is_active: false } : u));
        toast.success(t('adminDashboard.users.suspendedToast'));
      } else {
        toast.error(res.message || t('adminDashboard.jobs.genericError'));
      }
      setSuspendModal({ open: false, userId: null });
    } catch (error) {
      toast.error(error.message || t('adminDashboard.jobs.genericError'));
    }
  };

  const handleSuspendCompanyWithDuration = async () => {
    if (!companySuspendModal.companyId) return;
    try {
      const res = await apiFetch('/api/admin/suspend-company', {
        method: 'POST',
        body: JSON.stringify({
          id: companySuspendModal.companyId,
          reason: companySuspendReason || null,
          duration_days: companySuspendDuration === 0 ? null : companySuspendDuration,
          language: i18n.language,
        }),
      });
      if (res.success) {
        setCompanies(prev => prev.map(c => c.id === companySuspendModal.companyId ? { ...c, is_active: false } : c));
        toast.success(t('adminDashboard.companies.suspendedToast'));
      } else {
        toast.error(res.message || t('adminDashboard.jobs.genericError'));
      }
      setCompanySuspendModal({ open: false, companyId: null });
    } catch (error) {
      toast.error(error.message || t('adminDashboard.jobs.genericError'));
    }
  };

  // ---------- Report handlers ----------
  const handleUpdateReportStatus = async (reportId, newStatus) => {
    const { error } = await supabase.rpc('update_report_status', {
      report_id: reportId,
      new_status: newStatus,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setReports(prev => prev.map(r => (r.id === reportId ? { ...r, status: newStatus } : r)));
      toast.success(t('adminDashboard.reports.updatedToast'));
    }
  };

  const handleSuspendReportedItem = async (report) => {
    const reason = window.prompt(t('adminDashboard.jobs.reasonLabel'));
    if (reason === null) return;
    try {
      if (report.reported_item_type === 'job') {
        await apiFetch('/api/admin/suspend-job', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason, language: i18n.language }),
        });
        toast.success(t('adminDashboard.reports.suspendedToast'));
      } else {
        await apiFetch('/api/admin/suspend-company', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason, language: i18n.language }),
        });
        toast.success(t('adminDashboard.reports.companySuspendedToast'));
      }
      fetchInitialData();
    } catch (error) {
      toast.error(error.message || t('adminDashboard.jobs.genericError'));
    }
  };

  const handleDeleteReportedItem = async (report) => {
    const itemLabel = report.reported_item_type === 'job' ? "l'offre" : "l'entreprise";
    if (!window.confirm(`Supprimer définitivement ${itemLabel} ?`)) return;
    try {
      if (report.reported_item_type === 'job') {
        await apiFetch('/api/admin/delete-job', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason: 'Signalement traité', language: i18n.language }),
        });
        toast.success(t('adminDashboard.reports.deletedToast'));
      } else {
        await apiFetch(`/api/admin/delete-company/${report.reported_item_id}?language=${i18n.language}`, { method: 'DELETE' });
        toast.success(t('adminDashboard.reports.companyDeletedToast'));
      }
      fetchInitialData();
    } catch (error) {
      toast.error(error.message || t('adminDashboard.jobs.genericError'));
    }
  };

  const handleBanReportedUser = async (report) => {
    let userIdToBan = null;
    if (report.reported_item_type === 'job') {
      const { data: job } = await supabase
        .from('jobs')
        .select('posted_by')
        .eq('id', report.reported_item_id)
        .single();
      userIdToBan = job?.posted_by;
    } else if (report.reported_item_type === 'company') {
      const { data: company } = await supabase
        .from('companies')
        .select('owner_id')
        .eq('id', report.reported_item_id)
        .single();
      userIdToBan = company?.owner_id;
    } else if (report.reported_item_type === 'candidate') {
      userIdToBan = report.reported_item_id;
    }
    if (!userIdToBan) {
      toast.error(t('adminDashboard.reports.banError'));
      return;
    }
    if (!window.confirm(t('adminDashboard.reports.banConfirm'))) return;
    try {
      await apiFetch('/api/admin/ban-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userIdToBan, reason: 'Signalement traité', language: i18n.language }),
      });
      toast.success(t('adminDashboard.reports.bannedToast'));
      fetchInitialData();
    } catch (error) {
      toast.error(error.message || t('adminDashboard.jobs.genericError'));
    }
  };

  // ---------- Newsletter handlers ----------
  const handleToggleSubscriber = async (sub) => {
    const { error } = await supabase.rpc('toggle_subscriber_active', {
      sub_id: sub.id,
      activate: !sub.is_active,
    });
    if (!error) {
      setSubscribers(prev =>
        prev.map(s => (s.id === sub.id ? { ...s, is_active: !sub.is_active } : s))
      );
      toast.success(t('adminDashboard.newsletter.toggledToast'));
    } else {
      toast.error(error.message);
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.content) {
      toast.error(t('adminDashboard.newsletter.fillRequired'));
      return;
    }
    setSendingNewsletter(true);
    try {
      const res = await apiFetch('/api/admin/send-newsletter', {
        method: 'POST',
        body: JSON.stringify({
          ...newsletter,
          language: i18n.language,
        }),
      });
      if (res.success) {
        toast.success(t('adminDashboard.newsletter.sentSuccess', { count: res.sent, total: res.total }));
        setNewsletter({ subject: '', content: '' });
      } else {
        toast.error(res.message || t('adminDashboard.jobs.genericError'));
      }
    } catch (err) {
      toast.error(t('adminDashboard.newsletter.networkError'));
    } finally {
      setSendingNewsletter(false);
    }
  };

  // ---------- Blog handlers ----------
  const handleGenerateBlog = async () => {
    if (!blogForm.title.trim()) {
      toast.error(t('adminDashboard.blog.titleRequired'));
      return;
    }
    setGenerating(true);
    try {
      await apiFetch('/api/admin/blog/generate', {
        method: 'POST',
        body: JSON.stringify(blogForm),
      });
      toast.success(t('adminDashboard.blog.generatedToast'));
      setBlogForm({
        title: '',
        keywords: '',
        audience: 'all',
        category: 'Carrière',
        read_time: '5 min',
        author: 'Équipe Actoos',
        icon: 'FileText',
        color: 'blue'
      });
      fetchBlogPosts();
    } catch (err) {
      toast.error(err.message || t('adminDashboard.blog.generateError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateBlog = async (slug, updates) => {
    try {
      await apiFetch(`/api/admin/blog/${slug}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      toast.success(t('adminDashboard.blog.updatedToast'));
      setEditingSlug(null);
      fetchBlogPosts();
    } catch (err) {
      toast.error(err.message || t('adminDashboard.blog.updateError'));
    }
  };

  const handleDeleteBlog = async (slug) => {
    if (!window.confirm(t('adminDashboard.blog.deleteConfirm'))) return;
    try {
      await apiFetch(`/api/admin/blog/${slug}`, { method: 'DELETE' });
      toast.success(t('adminDashboard.blog.deletedToast'));
      fetchBlogPosts();
    } catch (err) {
      toast.error(err.message || t('adminDashboard.blog.deleteError'));
    }
  };

  // ---------- Filtres locaux ----------
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === '' ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = jobFilter === 'all' || job.status === jobFilter;
    return matchesSearch && matchesFilter;
  });

  const filteredCompanies = companies.filter((company) => {
    const matchesSearch = searchQuery === '' || company.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (companyFilter === 'all') return matchesSearch;
    if (companyFilter === 'verified') return matchesSearch && company.is_verified === true;
    if (companyFilter === 'unverified') return matchesSearch && company.is_verified !== true;
    return matchesSearch;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header + bouton refresh */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">{t('adminDashboard.title')}</h1>
              <p className="text-slate-600">{t('adminDashboard.subtitle')}</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto gap-2 min-h-[44px]">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            {t('adminDashboard.refresh')}
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={Clock} label={t('adminDashboard.stats.pendingJobs')} value={stats.pendingJobs} color="yellow" onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }} />
          <StatCard icon={Briefcase} label={t('adminDashboard.stats.activeJobs')} value={stats.activeJobs} color="green" />
          <StatCard icon={AlertTriangle} label={t('adminDashboard.stats.pendingCompanies')} value={stats.pendingCompanies} color="yellow" onClick={() => { setActiveTab('companies'); setCompanyFilter('unverified'); }} />
          <StatCard icon={Building2} label={t('adminDashboard.stats.verifiedCompanies')} value={stats.verifiedCompanies} color="green" />
          <StatCard icon={Users} label={t('adminDashboard.stats.candidates')} value={stats.totalCandidates} color="blue" />
          <StatCard icon={FileText} label={t('adminDashboard.stats.applications')} value={stats.totalApplications} color="purple" />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard className="w-4 h-4" />
            {t('adminDashboard.tabs.overview')}
          </TabButton>
          <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} count={stats.pendingJobs}>
            <Briefcase className="w-4 h-4" />
            {t('adminDashboard.tabs.jobs')}
          </TabButton>
          <TabButton active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} count={stats.pendingCompanies}>
            <Building2 className="w-4 h-4" />
            {t('adminDashboard.tabs.companies')}
          </TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            <Users className="w-4 h-4" />
            {t('adminDashboard.tabs.users')}
          </TabButton>
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} count={reports.filter((r) => r.status === 'pending').length}>
            <Flag className="w-4 h-4" />
            {t('adminDashboard.tabs.reports')}
          </TabButton>
          <TabButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
            <CreditCard className="w-4 h-4" />
            {t('adminDashboard.tabs.subscriptions')}
          </TabButton>
          <TabButton active={activeTab === 'newsletter'} onClick={() => setActiveTab('newsletter')}>
            <Mail className="w-4 h-4" />
            {t('adminDashboard.tabs.newsletter')}
          </TabButton>
          <TabButton active={activeTab === 'blog'} onClick={() => setActiveTab('blog')}>
            <FileText className="w-4 h-4" />
            {t('adminDashboard.tabs.blog')}
          </TabButton>
          <TabButton active={activeTab === 'message-companies'} onClick={() => setActiveTab('message-companies')}>
            <Building2 className="w-4 h-4" />
            {t('adminDashboard.tabs.messageCompanies')}
          </TabButton>
          <TabButton active={activeTab === 'message-candidates'} onClick={() => setActiveTab('message-candidates')}>
            <Users className="w-4 h-4" />
            {t('adminDashboard.tabs.messageCandidates')}
          </TabButton>
          <TabButton active={activeTab === 'roleRequests'} onClick={() => setActiveTab('roleRequests')} count={roleRequests.length}>
            <UserCog className="w-4 h-4" />
            {t('adminDashboard.tabs.roleRequests')}
          </TabButton>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
                <div>
                  <CardTitle className="text-lg">{t('adminDashboard.overview.pendingJobsTitle')}</CardTitle>
                  <CardDescription>{t('adminDashboard.overview.pendingJobsDesc')}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }} className="min-h-[44px]">
                  {t('adminDashboard.overview.viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {jobs.filter((j) => j.status === 'pending' || j.status === 'draft').slice(0, 5).map((job) => (
                      <JobModerationCard key={job.id} job={job} onApprove={handleApproveJob} onReject={handleRejectJob} onSuspend={handleSuspendJob} onDelete={handleDeleteJob} onReactivate={handleReactivateJob} />
                    ))}
                    {jobs.filter((j) => j.status === 'pending' || j.status === 'draft').length === 0 && (
                      <p className="text-center text-slate-500 py-8">{t('adminDashboard.overview.noPendingJobs')}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
                <div>
                  <CardTitle className="text-lg">{t('adminDashboard.overview.pendingCompaniesTitle')}</CardTitle>
                  <CardDescription>{t('adminDashboard.overview.pendingCompaniesDesc')}</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('companies'); setCompanyFilter('unverified'); }} className="min-h-[44px]">
                  {t('adminDashboard.overview.viewAll')}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {companies.filter((c) => c.is_verified !== true).slice(0, 5).map((company) => (
                      <CompanyValidationCard key={company.id} company={company} onApprove={handleApproveCompany} onReject={handleRejectCompany} onDelete={handleDeleteCompany} onViewJobs={handleViewCompanyJobs} onSuspendWithDuration={(company) => setCompanySuspendModal({ open: true, companyId: company.id })} />
                    ))}
                    {companies.filter((c) => c.is_verified !== true).length === 0 && (
                      <p className="text-center text-slate-500 py-8">{t('adminDashboard.overview.noPendingCompanies')}</p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'jobs' && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={t('adminDashboard.jobs.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={jobFilter}
                    onChange={(e) => setJobFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white w-full"
                  >
                    <option value="all">{t('adminDashboard.jobs.filterAll')}</option>
                    <option value="pending">{t('adminDashboard.jobs.filterPending')}</option>
                    <option value="draft">{t('adminDashboard.jobs.filterDraft')}</option>
                    <option value="active">{t('adminDashboard.jobs.filterActive')}</option>
                    <option value="suspended">{t('adminDashboard.jobs.filterSuspended')}</option>
                    <option value="rejected">{t('adminDashboard.jobs.filterRejected')}</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {filteredJobs.length > 0 ? (
                    filteredJobs.map((job) => (
                      <JobModerationCard key={job.id} job={job} onApprove={handleApproveJob} onReject={handleRejectJob} onSuspend={handleSuspendJob} onDelete={handleDeleteJob} onReactivate={handleReactivateJob} />
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-12">
                      {searchQuery ? t('adminDashboard.jobs.noJobsFound') : t('adminDashboard.jobs.noJobs')}
                    </p>
                  )}
                  {!loading && jobsHasMore && filteredJobs.length === jobsPage * ITEMS_PER_PAGE && (
                    <div className="text-center mt-4">
                      <Button onClick={loadMoreJobs}>{t('adminDashboard.jobs.loadMore')}</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'companies' && (
          <Card className="overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3">
                <div className="flex-1 relative min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder={t('adminDashboard.companies.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="h-10 px-3 py-2 border border-slate-200 rounded-md text-sm bg-white w-full"
                  >
                    <option value="all">{t('adminDashboard.companies.filterAll')}</option>
                    <option value="unverified">{t('adminDashboard.companies.filterUnverified')}</option>
                    <option value="verified">{t('adminDashboard.companies.filterVerified')}</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <>
                  {filteredCompanies.length > 0 ? (
                    filteredCompanies.map((company) => (
                      <CompanyValidationCard key={company.id} company={company} onApprove={handleApproveCompany} onReject={handleRejectCompany} onDelete={handleDeleteCompany} onViewJobs={handleViewCompanyJobs} onSuspendWithDuration={(company) => setCompanySuspendModal({ open: true, companyId: company.id })} />
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-12">
                      {searchQuery ? t('adminDashboard.companies.noCompaniesFound') : t('adminDashboard.companies.noCompanies')}
                    </p>
                  )}
                  {!loading && companiesHasMore && filteredCompanies.length === companiesPage * ITEMS_PER_PAGE && (
                    <div className="text-center mt-4">
                      <Button onClick={loadMoreCompanies}>{t('adminDashboard.companies.loadMore')}</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                {t('adminDashboard.users.title')}
              </CardTitle>
              <CardDescription>{t('adminDashboard.users.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {users.length > 0 ? (
                    users.map((u) => (
                      <div key={u.id} className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{u.first_name} {u.last_name}</p>
                            <p className="text-sm text-slate-500 truncate">{u.email}</p>
                            <Badge className={cn(
                              'mt-1',
                              u.is_banned ? 'bg-red-100 text-red-700' : u.is_active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            )}>
                              {u.is_banned ? t('adminDashboard.users.status.banned') : u.is_active ? t('adminDashboard.users.status.active') : t('adminDashboard.users.status.suspended')}
                            </Badge>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <select
                              value={u.role}
                              onChange={(e) => handleToggleUserRole(u.id, e.target.value)}
                              className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full sm:w-auto min-h-[44px] bg-white"
                            >
                              <option value="candidate">{t('adminDashboard.users.roles.candidate')}</option>
                              <option value="company">{t('adminDashboard.users.roles.company')}</option>
                              <option value="admin">{t('adminDashboard.users.roles.admin')}</option>
                            </select>
                            <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]" onClick={() => setSuspendModal({ open: true, userId: u.id })} disabled={!u.is_active}>
                              <UserX className="w-4 h-4 mr-1" />
                              {t('adminDashboard.users.actions.suspend')}
                            </Button>
                            {!u.is_active && (
                              <Button size="sm" variant="outline" className="w-full sm:w-auto min-h-[44px]" onClick={() => handleToggleUserActive(u.id, u.is_active)}>
                                <UserCheck className="w-4 h-4 mr-1" />
                                {t('adminDashboard.users.actions.reactivate')}
                              </Button>
                            )}
                            {!u.is_banned && (
                              <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:bg-red-50 min-h-[44px]" onClick={() => handleBanUser(u.id)}>
                                <Ban className="w-4 h-4 mr-1" />
                                {t('adminDashboard.users.actions.ban')}
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="w-full sm:w-auto text-red-600 hover:bg-red-50 min-h-[44px]" onClick={() => handleDeleteUser(u.id)}>
                              <Trash2 className="w-4 h-4 mr-1" />
                              {t('adminDashboard.users.actions.delete')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-slate-500 py-8">{t('adminDashboard.users.noUsers')}</p>
                  )}
                  {!loading && usersHasMore && users.length === usersPage * ITEMS_PER_PAGE && (
                    <div className="text-center mt-4">
                      <Button onClick={loadMoreUsers}>{t('adminDashboard.users.loadMore')}</Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'reports' && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                {t('adminDashboard.reports.title')}
              </CardTitle>
              <CardDescription>{t('adminDashboard.reports.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">{t('adminDashboard.reports.noReports')}</p>
                  ) : (
                    reports.map((report) => {
                      const isJobReport = report.reported_item_type === 'job';
                      const isCompanyReport = report.reported_item_type === 'company';
                      const isCandidateReport = report.reported_item_type === 'candidate';

                      return (
                        <div key={report.id} className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={
                                isJobReport ? 'bg-blue-100 text-blue-700' :
                                isCompanyReport ? 'bg-purple-100 text-purple-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {isJobReport ? t('adminDashboard.reports.badges.job') : isCompanyReport ? t('adminDashboard.reports.badges.company') : t('adminDashboard.reports.badges.candidate')}
                              </Badge>
                              <p className="font-semibold text-slate-900 truncate">
                                {t('adminDashboard.reports.reportedBy', { email: report.reporter?.email || 'Anonyme' })}
                              </p>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">{t('adminDashboard.reports.reason', { reason: report.reason })}</p>
                            <Badge className={cn(
                              'mt-2',
                              report.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              report.status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {report.status === 'pending' ? t('adminDashboard.reports.status.pending') : report.status === 'reviewed' ? t('adminDashboard.reports.status.reviewed') : t('adminDashboard.reports.status.resolved')}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                            <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleUpdateReportStatus(report.id, 'reviewed')} disabled={report.status !== 'pending'}>
                              {t('adminDashboard.reports.markReviewed')}
                            </Button>
                            <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleUpdateReportStatus(report.id, 'resolved')} disabled={report.status === 'resolved'}>
                              {t('adminDashboard.reports.markResolved')}
                            </Button>
                            {!isCandidateReport && (
                              <>
                                <Button size="sm" variant="outline" className="text-yellow-600 hover:bg-yellow-50 min-h-[44px]" onClick={() => handleSuspendReportedItem(report)}>
                                  <Ban className="w-4 h-4 mr-1" />
                                  {isJobReport ? t('adminDashboard.reports.suspendJob') : t('adminDashboard.reports.suspendCompany')}
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 min-h-[44px]" onClick={() => handleDeleteReportedItem(report)}>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {isJobReport ? t('adminDashboard.reports.deleteJob') : t('adminDashboard.reports.deleteCompany')}
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50 min-h-[44px]" onClick={() => handleBanReportedUser(report)}>
                              <UserX className="w-4 h-4 mr-1" />
                              {t('adminDashboard.reports.banUser')}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  {t('adminDashboard.subscriptions.title')}
                </CardTitle>
                <CardDescription>{t('adminDashboard.subscriptions.description')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-slate-50">
                        <tr>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.company')}</th>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.plan')}</th>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.previousPlan')}</th>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.stripeSubId')}</th>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.expiration')}</th>
                          <th className="text-left py-3 px-4 font-medium">{t('adminDashboard.subscriptions.table.cancellationReason')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((c) => (
                          <tr key={c.id} className="border-b border-slate-100">
                            <td className="py-3 px-4 font-medium">{c.name}</td>
                            <td className="py-3 px-4">
                              <Badge className={
                                c.subscription_plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                                c.subscription_plan === 'business' ? 'bg-purple-100 text-purple-700' :
                                'bg-slate-100 text-slate-700'
                              }>
                                {c.subscription_plan || 'free'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">
                              {c.previous_subscription_plan ? (
                                <Badge className="bg-amber-100 text-amber-700">{c.previous_subscription_plan}</Badge>
                              ) : '-'}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500">{c.stripe_subscription_id || '-'}</td>
                            <td className="py-3 px-4">
                              {c.subscription_expires_at ? new Date(c.subscription_expires_at).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate" title={c.cancellation_reason}>
                              {c.cancellation_reason || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  {t('adminDashboard.subscriptions.cancellationsTitle')}
                </CardTitle>
                <CardDescription>{t('adminDashboard.subscriptions.cancellationsDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCancellations ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : cancellations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">{t('adminDashboard.subscriptions.noCancellations')}</p>
                ) : (
                  <div className="space-y-3">
                    {cancellations.map((c) => (
                      <div key={c.id} className="p-4 bg-slate-50 rounded-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{c.name}</p>
                            <p className="text-sm text-slate-600">
                              {t('adminDashboard.subscriptions.cancelledFrom')} <Badge className="bg-slate-200 text-slate-700">{c.subscription_plan}</Badge>
                              {c.previous_subscription_plan && (
                                <>
                                  {' '}{t('adminDashboard.subscriptions.toFrom')} <Badge className="bg-amber-100 text-amber-700">{c.previous_subscription_plan}</Badge>
                                </>
                              )}
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
          </div>
        )}

        {activeTab === 'newsletter' && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  {t('adminDashboard.newsletter.sendTitle')}
                </CardTitle>
                <CardDescription>{t('adminDashboard.newsletter.sendDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.newsletter.subjectLabel')}</label>
                  <Input
                    value={newsletter.subject}
                    onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                    placeholder={t('adminDashboard.newsletter.subjectPlaceholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.newsletter.contentLabel')}</label>
                  <textarea
                    rows={10}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={newsletter.content}
                    onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                    placeholder={t('adminDashboard.newsletter.contentPlaceholder')}
                  />
                </div>
                <Button
                  onClick={handleSendNewsletter}
                  disabled={sendingNewsletter}
                  className="bg-blue-600 text-white hover:bg-blue-700 min-h-[44px] w-full sm:w-auto"
                >
                  {sendingNewsletter ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {t('adminDashboard.newsletter.sendButton')}
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('adminDashboard.newsletter.subscribersTitle', { count: subscribers.length })}
                </CardTitle>
                <CardDescription>{t('adminDashboard.newsletter.subscribersDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSubscribers ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : subscribers.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">{t('adminDashboard.newsletter.noSubscribers')}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 font-medium">{t('adminDashboard.newsletter.table.email')}</th>
                          <th className="text-left py-2 font-medium">{t('adminDashboard.newsletter.table.status')}</th>
                          <th className="text-left py-2 font-medium">{t('adminDashboard.newsletter.table.actions')}</th>
                          <th className="text-left py-2 font-medium">{t('adminDashboard.newsletter.table.subscribed')}</th>
                          <th className="text-left py-2 font-medium">{t('adminDashboard.newsletter.table.unsubscribed')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.map((sub) => (
                          <tr key={sub.id} className="border-b last:border-0">
                            <td className="py-2">{sub.email}</td>
                            <td className="py-2">
                              <Badge className={sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {sub.is_active ? t('adminDashboard.newsletter.statusActive') : t('adminDashboard.newsletter.statusUnsubscribed')}
                              </Badge>
                            </td>
                            <td className="py-2">
                              <Button size="sm" variant="outline" onClick={() => handleToggleSubscriber(sub)}>
                                {sub.is_active ? t('adminDashboard.newsletter.deactivate') : t('adminDashboard.newsletter.reactivate')}
                              </Button>
                            </td>
                            <td className="py-2">{new Date(sub.subscribed_at).toLocaleDateString()}</td>
                            <td className="py-2">{sub.unsubscribed_at ? new Date(sub.unsubscribed_at).toLocaleDateString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t('adminDashboard.blog.generateTitle')}
                </CardTitle>
                <CardDescription>{t('adminDashboard.blog.generateDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.titleLabel')}</label>
                    <Input value={blogForm.title} onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })} placeholder={t('adminDashboard.blog.titlePlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.keywordsLabel')}</label>
                    <Input value={blogForm.keywords} onChange={(e) => setBlogForm({ ...blogForm, keywords: e.target.value })} placeholder={t('adminDashboard.blog.keywordsPlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.audienceLabel')}</label>
                    <select value={blogForm.audience} onChange={(e) => setBlogForm({ ...blogForm, audience: e.target.value })} className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white">
                      <option value="all">{t('adminDashboard.blog.audienceAll')}</option>
                      <option value="candidate">{t('adminDashboard.blog.audienceCandidates')}</option>
                      <option value="recruiter">{t('adminDashboard.blog.audienceRecruiters')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.categoryLabel')}</label>
                    <select value={blogForm.category} onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })} className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white">
                      <option value="Carrière">{t('adminDashboard.blog.categories.carriere')}</option>
                      <option value="Recrutement">{t('adminDashboard.blog.categories.recrutement')}</option>
                      <option value="Technologie">{t('adminDashboard.blog.categories.technologie')}</option>
                      <option value="Entrepreneuriat">{t('adminDashboard.blog.categories.entrepreneuriat')}</option>
                      <option value="Conseils">{t('adminDashboard.blog.categories.conseils')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.authorLabel')}</label>
                    <Input value={blogForm.author} onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })} placeholder={t('adminDashboard.blog.authorPlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('adminDashboard.blog.readTimeLabel')}</label>
                    <Input value={blogForm.read_time} onChange={(e) => setBlogForm({ ...blogForm, read_time: e.target.value })} placeholder={t('adminDashboard.blog.readTimePlaceholder')} />
                  </div>
                </div>
                <Button onClick={handleGenerateBlog} disabled={generating || !blogForm.title.trim()} className="bg-blue-600 text-white hover:bg-blue-700">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  {t('adminDashboard.blog.generateButton')}
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  {t('adminDashboard.blog.articlesTitle', { count: blogPosts.length })}
                </CardTitle>
                <CardDescription>{t('adminDashboard.blog.articlesDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBlog ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : blogPosts.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">{t('adminDashboard.blog.noArticles')}</p>
                ) : (
                  <div className="space-y-3">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-slate-900">{post.title}</h3>
                            <p className="text-sm text-slate-500">
                              {post.category} • {post.audience === 'candidate' ? t('adminDashboard.blog.audienceCandidates') : post.audience === 'recruiter' ? t('adminDashboard.blog.audienceRecruiters') : t('adminDashboard.blog.audienceAll')} • {post.author}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{post.excerpt}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="outline" onClick={() => setEditingSlug(post.slug)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleDeleteBlog(post.slug)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {editingSlug === post.slug && (
                          <div className="mt-4 space-y-3 border-t pt-4">
                            <Input
                              value={post.title}
                              onChange={(e) => {
                                const updated = blogPosts.map(p => p.slug === post.slug ? { ...p, title: e.target.value } : p);
                                setBlogPosts(updated);
                              }}
                              placeholder="Titre"
                            />
                            <textarea
                              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                              rows="4"
                              value={post.content}
                              onChange={(e) => {
                                const updated = blogPosts.map(p => p.slug === post.slug ? { ...p, content: e.target.value } : p);
                                setBlogPosts(updated);
                              }}
                              placeholder="Contenu HTML"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleUpdateBlog(post.slug, { title: post.title, content: post.content })} className="bg-blue-600 text-white hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-1" /> {t('adminDashboard.blog.save')}
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingSlug(null)}>
                                {t('adminDashboard.blog.cancel')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'message-companies' && <MessageSender role="company" />}
        {activeTab === 'message-candidates' && <MessageSender role="candidate" />}

        {activeTab === 'roleRequests' && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="w-5 h-5" />
                {t('adminDashboard.roleRequests.title')}
              </CardTitle>
              <CardDescription>{t('adminDashboard.roleRequests.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roleRequests.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">{t('adminDashboard.roleRequests.noRequests')}</p>
                ) : (
                  roleRequests.map((r) => (
                    <div key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {r.user?.first_name} {r.user?.last_name} ({r.user?.email})
                          </p>
                          <div className="text-sm text-slate-600">
                            {t('adminDashboard.roleRequests.from')} <Badge>{roleLabel(r.actual_role)}</Badge> {t('adminDashboard.roleRequests.to')} <Badge className="bg-blue-100 text-blue-700">{roleLabel(r.requested_role)}</Badge>
                          </div>
                          {r.reason && <p className="text-sm text-slate-500 mt-1">« {r.reason} »</p>}
                          <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleString('fr-FR')}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleRoleRequest(r.id, 'approve')}>
                            {t('adminDashboard.roleRequests.approve')}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleRoleRequest(r.id, 'reject')}>
                            {t('adminDashboard.roleRequests.reject')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modals suspend user/company */}
        {suspendModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold mb-4">{t('adminDashboard.users.suspendModalTitle')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.users.suspendDurationLabel')}</label>
                  <select
                    value={suspendDuration}
                    onChange={(e) => setSuspendDuration(Number(e.target.value))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
                  >
                    <option value={0}>{t('adminDashboard.users.durationIndefinite')}</option>
                    <option value={1}>{t('adminDashboard.users.duration1day')}</option>
                    <option value={7}>{t('adminDashboard.users.duration7days')}</option>
                    <option value={30}>{t('adminDashboard.users.duration30days')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.users.suspendReasonLabel')}</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                    rows={2}
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setSuspendModal({ open: false, userId: null })}>{t('adminDashboard.users.cancel')}</Button>
                <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleSuspendUser}>{t('adminDashboard.users.confirm')}</Button>
              </div>
            </div>
          </div>
        )}

        {companySuspendModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold mb-4">{t('adminDashboard.companies.suspendModalTitle')}</h3>
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">
                {t('adminDashboard.companies.suspendWarning')}
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.companies.suspendDurationLabel')}</label>
                  <select
                    value={companySuspendDuration}
                    onChange={(e) => setCompanySuspendDuration(Number(e.target.value))}
                    className="w-full h-10 border border-slate-200 rounded-xl px-3 bg-white"
                  >
                    <option value={0}>{t('adminDashboard.companies.durationIndefinite')}</option>
                    <option value={1}>{t('adminDashboard.companies.duration1day')}</option>
                    <option value={7}>{t('adminDashboard.companies.duration7days')}</option>
                    <option value={30}>{t('adminDashboard.companies.duration30days')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t('adminDashboard.companies.suspendReasonLabel')}</label>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                    rows={2}
                    value={companySuspendReason}
                    onChange={(e) => setCompanySuspendReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setCompanySuspendModal({ open: false, companyId: null })}>{t('adminDashboard.companies.cancel')}</Button>
                <Button className="bg-red-600 text-white hover:bg-red-700" onClick={handleSuspendCompanyWithDuration}>{t('adminDashboard.companies.confirm')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;