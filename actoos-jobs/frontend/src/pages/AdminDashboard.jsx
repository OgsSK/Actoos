import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Layers,
  LayoutDashboard,
  CreditCard,
  Sparkles,
  Edit,
  Save,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, EXPERIENCE_LEVELS } from '../lib/utils';

const StatCard = ({ icon: Icon, label, value, trend, color = 'blue', onClick }) => (
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
              {trend}% ce mois
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

const JobModerationCard = ({ job, onApprove, onReject, onSuspend, onDelete }) => {
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
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    active: { label: 'Active', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    suspended: { label: 'Suspendue', color: 'bg-red-100 text-red-700', icon: Ban },
    rejected: { label: 'Rejetée', color: 'bg-slate-100 text-slate-700', icon: XCircle },
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
        toast.error("Impossible de charger les détails");
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
              Voir l'offre
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
              {job.city?.name || 'Non spécifié'}
            </span>
            <Badge className={cn(contractInfo.color, 'border-0 text-xs')}>
              {contractInfo.label}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Publié {formatRelative(job.created_at)} par {job.posted_by_user?.email}
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
          {showDetails ? 'Masquer les détails' : 'Afficher les détails'}
        </Button>
      </div>

      {showDetails && jobDetails && (
        <div className="mt-2 p-4 bg-slate-50 rounded-xl text-sm space-y-3 border border-slate-100">
          <div>
            <strong>Description :</strong>
            <p className="whitespace-pre-line">{jobDetails.description}</p>
          </div>
          {jobDetails.requirements && (
            <div>
              <strong>Profil recherché :</strong>
              <p className="whitespace-pre-line">{jobDetails.requirements}</p>
            </div>
          )}
          {jobDetails.responsibilities && (
            <div>
              <strong>Missions :</strong>
              <p className="whitespace-pre-line">{jobDetails.responsibilities}</p>
            </div>
          )}
          {jobDetails.benefits && (
            <div>
              <strong>Avantages :</strong>
              <p className="whitespace-pre-line">{jobDetails.benefits}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {jobDetails.skills_required?.length > 0 && (
              <div>
                <strong>Compétences :</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {jobDetails.skills_required.map((skill) => (
                    <Badge key={skill} className="bg-blue-50 text-blue-700 text-xs">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <strong>Expérience :</strong> {EXPERIENCE_LEVELS[jobDetails.experience_level]?.label || 'Non spécifié'}
            </div>
            {jobDetails.salary_min && jobDetails.salary_max && (
              <div>
                <strong>Salaire :</strong> {jobDetails.salary_min.toLocaleString('fr-FR')} - {jobDetails.salary_max.toLocaleString('fr-FR')} FCFA
              </div>
            )}
            <div>
              <strong>Postes :</strong> {jobDetails.positions_count}
            </div>
            {jobDetails.application_deadline && (
              <div>
                <strong>Date limite :</strong> {new Date(jobDetails.application_deadline).toLocaleDateString('fr-FR')}
              </div>
            )}
            <div>
              <strong>Télétravail :</strong> {jobDetails.is_remote ? 'Oui' : 'Non'}
            </div>
            <div>
              <strong>Urgent :</strong> {jobDetails.is_urgent ? 'Oui' : 'Non'}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
        {job.status === 'pending' && (
          <>
            {!job.company?.is_verified && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-full sm:w-auto">
                L'entreprise n'est pas encore vérifiée.
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
              Approuver
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
              onClick={() => onReject(job)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
          </>
        )}

        {job.status === 'draft' && (
          <>
            {!job.company?.is_verified && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-lg w-full sm:w-auto">
                L'entreprise n'est pas encore vérifiée.
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
              Publier l'offre
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
            Suspendre
          </Button>
        )}

        {job.status === 'suspended' && (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-green-600 hover:bg-green-50 hover:text-green-700 min-h-[44px]"
            onClick={() => onApprove(job)}
          >
            <Check className="w-4 h-4 mr-1" />
            Réactiver
          </Button>
        )}

        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
          onClick={() => setActionType('delete')}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Supprimer
        </Button>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'suspend' ? "Suspendre l'offre" : "Supprimer l'offre"}
            </h3>
            <label className="block text-sm font-medium mb-2">Raison (optionnelle)</label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setActionType(null)}>
                Annuler
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 min-h-[44px]" onClick={confirmAction}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {menu}
    </div>
  );
};

const CompanyValidationCard = ({ company, onApprove, onReject, onSuspend, onDelete, onViewJobs }) => {
  const menuButtonRef = useRef(null);
  const [showMenu, setShowMenu] = useState(false);
  const [reason, setReason] = useState('');
  const [actionType, setActionType] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const statusConfig = {
    false: { label: 'Non vérifiée', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    true: { label: 'Vérifiée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
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
    } else if (actionType === 'suspend') {
      await onSuspend(company, reason);
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
                Voir le site
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
              Voir les offres ({company.jobs_count || 0})
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
            {company.size && <span>• {company.size} employés</span>}
            {company.city?.name && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {company.city.name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Créée {formatRelative(company.created_at)} • {company.jobs_count || 0} offres
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
              Valider
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
              onClick={() => setActionType('reject')}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Rejeter
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700 min-h-[44px]"
            onClick={() => setActionType('suspend')}
          >
            <Ban className="w-4 h-4 mr-1" />
            Suspendre
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="w-full sm:w-auto text-red-600 hover:bg-red-50 hover:text-red-700 min-h-[44px]"
          onClick={() => setActionType('delete')}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Supprimer l'entreprise
        </Button>
      </div>

      {actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-4">
              {actionType === 'reject' ? "Rejeter l'entreprise" : actionType === 'suspend' ? "Suspendre l'entreprise" : "Supprimer l'entreprise"}
            </h3>
            {actionType !== 'delete' && (
              <>
                <label className="block text-sm font-medium mb-2">Raison (optionnelle)</label>
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
                ⚠️ Cette action est irréversible. Toutes les offres et données associées seront supprimées.
              </p>
            )}
            <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
              <Button variant="outline" className="min-h-[44px]" onClick={() => setActionType(null)}>
                Annuler
              </Button>
              <Button className="bg-red-600 text-white hover:bg-red-700 min-h-[44px]" onClick={confirmAction}>
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {menu}
    </div>
  );
};

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

const AdminDashboard = () => {
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

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error('Accès non autorisé');
      navigate('/');
      return;
    }
    if (user && isAdmin) {
      fetchData();
      fetchSubscribers();
    }
  }, [user, isAdmin, authLoading, navigate]);

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
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`*, company:companies(id, name, logo_url, is_verified), city:cities(name), posted_by_user:users!jobs_posted_by_fkey(email)`)
        .order('created_at', { ascending: false })
        .limit(100);

      setJobs(jobsData || []);

      const { data: companiesData } = await supabase
        .from('companies')
        .select(`*, city:cities(name), jobs:jobs(count)`)
        .order('created_at', { ascending: false })
        .limit(100);

      const companiesWithCount = (companiesData || []).map((c) => ({
        ...c,
        jobs_count: c.jobs?.[0]?.count || 0,
      }));
      setCompanies(companiesWithCount);

      const { data: usersData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

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
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Données actualisées');
  };

  const handleApproveJob = async (job) => {
    if (!job.company?.is_verified) {
      toast.error("L'entreprise n'est pas encore vérifiée. Veuillez d'abord valider l'entreprise.");
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

      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'active' } : j)));
      setStats((s) => ({ ...s, pendingJobs: Math.max(0, s.pendingJobs - 1), activeJobs: s.activeJobs + 1 }));
      toast.success('Offre approuvée');
    } catch (error) {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleRejectJob = async (job) => {
    if (!window.confirm('Rejeter cette offre ?')) return;
    try {
      await supabase.from('jobs').update({ status: 'rejected' }).eq('id', job.id);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'rejected' } : j)));
      setStats((s) => ({ ...s, pendingJobs: Math.max(0, s.pendingJobs - 1) }));
      toast.success('Offre rejetée');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSuspendJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/suspend-job', {
        method: 'POST',
        body: JSON.stringify({ id: job.id, reason }),
      });
      setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, status: 'suspended' } : j)));
      setStats((s) => ({ ...s, activeJobs: Math.max(0, s.activeJobs - 1) }));
      toast.success('Offre suspendue et email envoyé');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteJob = async (job, reason = '') => {
    try {
      await apiFetch('/api/admin/delete-job', {
        method: 'POST',
        body: JSON.stringify({ id: job.id, reason }),
      });
      setJobs((prev) => prev.filter((j) => j.id !== job.id));
      toast.success('Offre supprimée et email envoyé');
      fetchData();
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleApproveCompany = async (company) => {
    try {
      await apiFetch('/api/admin/verify-company', {
        method: 'POST',
        body: JSON.stringify({ id: company.id }),
      });
      setCompanies((prev) => prev.map((c) => (c.id === company.id ? { ...c, is_verified: true } : c)));
      setStats((s) => ({
        ...s,
        pendingCompanies: Math.max(0, s.pendingCompanies - 1),
        verifiedCompanies: s.verifiedCompanies + 1,
      }));
      toast.success('Entreprise validée et email envoyé');
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleRejectCompany = async (company, reason = '') => {
    try {
      await apiFetch('/api/admin/reject-company', {
        method: 'POST',
        body: JSON.stringify({ id: company.id, reason }),
      });
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, is_verified: false, is_active: false } : c))
      );
      setStats((s) => ({ ...s, pendingCompanies: Math.max(0, s.pendingCompanies - 1) }));
      toast.success('Entreprise rejetée et email envoyé');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSuspendCompany = async (company, reason = '') => {
    try {
      await apiFetch('/api/admin/suspend-company', {
        method: 'POST',
        body: JSON.stringify({ id: company.id, reason }),
      });
      setCompanies((prev) =>
        prev.map((c) => (c.id === company.id ? { ...c, is_active: false, is_verified: false } : c))
      );
      setStats((s) => ({ ...s, verifiedCompanies: Math.max(0, s.verifiedCompanies - 1) }));
      toast.success('Entreprise suspendue et email envoyé');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteCompany = async (company) => {
    if (!window.confirm(`Supprimer définitivement l'entreprise "${company.name}" ?`)) return;
    try {
      await apiFetch(`/api/admin/delete-company/${company.id}`, { method: 'DELETE' });
      setCompanies((prev) => prev.filter((c) => c.id !== company.id));
      toast.success('Entreprise supprimée');
    } catch (error) {
      console.error('Delete company error:', error);
      toast.error(error.message || 'Erreur');
    }
  };

  const handleViewCompanyJobs = (company) => {
    setActiveTab('jobs');
    setJobFilter('all');
    setSearchQuery(company.name);
  };

  const handleToggleUserRole = async (userId, newRole) => {
    try {
      const { error } = await supabase.from('users').update({ role: newRole }).eq('id', userId);
      if (error) throw error;
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
      toast.success("Rôle mis à jour. L'utilisateur doit se reconnecter pour voir son nouvel espace.");
    } catch (error) {
      console.error('Erreur changement de rôle:', error);
      toast.error(error.message || 'Erreur lors du changement de rôle');
    }
  };

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await apiFetch('/api/admin/toggle-user-status', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, is_active: !currentStatus }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u)));
      toast.success(currentStatus ? 'Compte suspendu' : 'Compte réactivé');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleBanUser = async (userId) => {
    if (!window.confirm('Bannir définitivement cet utilisateur ?')) return;
    try {
      await apiFetch('/api/admin/ban-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, reason: 'Violation des règles' }),
      });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: false, is_banned: true } : u)));
      toast.success('Utilisateur banni');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Supprimer définitivement cet utilisateur ? Cette action est irréversible.')) return;
    try {
      await apiFetch(`/api/admin/delete-user/${userId}`, { method: 'DELETE' });
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success('Utilisateur supprimé définitivement');
      fetchData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      await apiFetch(`/api/admin/reports/${reportId}?status=${newStatus}`, { method: 'PATCH' });
      setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)));
      toast.success('Signalement mis à jour');
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleSuspendReportedItem = async (report) => {
    const reason = window.prompt('Raison de la suspension (optionnelle) :');
    if (reason === null) return;

    try {
      if (report.reported_item_type === 'job') {
        await apiFetch('/api/admin/suspend-job', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason }),
        });
        toast.success('Offre suspendue et email envoyé');
      } else {
        await apiFetch('/api/admin/suspend-company', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason }),
        });
        toast.success('Entreprise suspendue et email envoyé');
      }
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleDeleteReportedItem = async (report) => {
    const itemLabel = report.reported_item_type === 'job' ? "l'offre" : "l'entreprise";
    if (!window.confirm(`Supprimer définitivement ${itemLabel} ?`)) return;

    try {
      if (report.reported_item_type === 'job') {
        await apiFetch('/api/admin/delete-job', {
          method: 'POST',
          body: JSON.stringify({ id: report.reported_item_id, reason: 'Signalement traité' }),
        });
        toast.success('Offre supprimée et email envoyé');
      } else {
        await apiFetch(`/api/admin/delete-company/${report.reported_item_id}`, { method: 'DELETE' });
        toast.success('Entreprise supprimée et email envoyé');
      }
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Erreur');
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
    }

    if (!userIdToBan) {
      toast.error("Impossible de trouver l'utilisateur à bannir");
      return;
    }

    if (!window.confirm('Bannir définitivement cet utilisateur ?')) return;

    try {
      await apiFetch('/api/admin/ban-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userIdToBan, reason: 'Signalement traité' }),
      });
      toast.success('Utilisateur banni et email envoyé');
      fetchData();
    } catch (error) {
      toast.error(error.message || 'Erreur');
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.content) {
      toast.error('Veuillez remplir le sujet et le contenu.');
      return;
    }
    setSendingNewsletter(true);
    try {
      const res = await apiFetch('/api/admin/send-newsletter', {
        method: 'POST',
        body: JSON.stringify(newsletter),
      });
      if (res.success) {
        toast.success(res.message);
        setNewsletter({ subject: '', content: '' });
      } else {
        toast.error(res.message || 'Erreur');
      }
    } catch (err) {
      toast.error('Erreur réseau');
    } finally {
      setSendingNewsletter(false);
    }
  };

  const handleGenerateBlog = async () => {
    if (!blogForm.title.trim()) {
      toast.error('Le titre est requis pour générer un article');
      return;
    }
    setGenerating(true);
    try {
      await apiFetch('/api/admin/blog/generate', {
        method: 'POST',
        body: JSON.stringify(blogForm),
      });
      toast.success('Article généré avec succès');
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
      toast.error(err.message || 'Erreur lors de la génération');
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
      toast.success('Article mis à jour');
      setEditingSlug(null);
      fetchBlogPosts();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

  const handleDeleteBlog = async (slug) => {
    if (!window.confirm('Supprimer cet article ?')) return;
    try {
      await apiFetch(`/api/admin/blog/${slug}`, { method: 'DELETE' });
      toast.success('Article supprimé');
      fetchBlogPosts();
    } catch (err) {
      toast.error(err.message || 'Erreur');
    }
  };

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

  if (authLoading || loading) {
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <div className="w-14 h-14 shrink-0 bg-blue-600 text-white rounded-2xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900">Administration</h1>
              <p className="text-slate-600">Gérez les offres, entreprises et utilisateurs</p>
            </div>
          </div>

          <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="w-full sm:w-auto gap-2 min-h-[44px]">
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard
            icon={Clock}
            label="Offres en attente"
            value={stats.pendingJobs}
            color="yellow"
            onClick={() => {
              setActiveTab('jobs');
              setJobFilter('pending');
            }}
          />
          <StatCard icon={Briefcase} label="Offres actives" value={stats.activeJobs} color="green" />
          <StatCard
            icon={AlertTriangle}
            label="Entreprises en attente"
            value={stats.pendingCompanies}
            color="yellow"
            onClick={() => {
              setActiveTab('companies');
              setCompanyFilter('unverified');
            }}
          />
          <StatCard icon={Building2} label="Entreprises vérifiées" value={stats.verifiedCompanies} color="green" />
          <StatCard icon={Users} label="Candidats" value={stats.totalCandidates} color="blue" />
          <StatCard icon={FileText} label="Candidatures" value={stats.totalApplications} color="purple" />
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>
            <LayoutDashboard className="w-4 h-4" />
            Vue d'ensemble
          </TabButton>
          <TabButton active={activeTab === 'jobs'} onClick={() => setActiveTab('jobs')} count={stats.pendingJobs}>
            <Briefcase className="w-4 h-4" />
            Modération offres
          </TabButton>
          <TabButton active={activeTab === 'companies'} onClick={() => setActiveTab('companies')} count={stats.pendingCompanies}>
            <Building2 className="w-4 h-4" />
            Validation entreprises
          </TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
            <Users className="w-4 h-4" />
            Utilisateurs
          </TabButton>
          <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} count={reports.filter((r) => r.status === 'pending').length}>
            <Flag className="w-4 h-4" />
            Signalements
          </TabButton>
          <TabButton active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>
            <CreditCard className="w-4 h-4" />
            Abonnements
          </TabButton>
          <TabButton active={activeTab === 'newsletter'} onClick={() => setActiveTab('newsletter')}>
            <Mail className="w-4 h-4" />
            Newsletter
          </TabButton>
          <TabButton active={activeTab === 'blog'} onClick={() => setActiveTab('blog')}>
            <FileText className="w-4 h-4" />
            Blog
          </TabButton>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
                <div>
                  <CardTitle className="text-lg">Offres en attente</CardTitle>
                  <CardDescription>À modérer</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('jobs'); setJobFilter('pending'); }} className="min-h-[44px]">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {jobs.filter((j) => j.status === 'pending' || j.status === 'draft').slice(0, 5).map((job) => (
                  <JobModerationCard
                    key={job.id}
                    job={job}
                    onApprove={handleApproveJob}
                    onReject={handleRejectJob}
                    onSuspend={handleSuspendJob}
                    onDelete={handleDeleteJob}
                  />
                ))}
                {jobs.filter((j) => j.status === 'pending' || j.status === 'draft').length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune offre en attente</p>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 gap-4">
                <div>
                  <CardTitle className="text-lg">Entreprises en attente</CardTitle>
                  <CardDescription>À valider</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setActiveTab('companies'); setCompanyFilter('unverified'); }} className="min-h-[44px]">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {companies.filter((c) => c.is_verified !== true).slice(0, 5).map((company) => (
                  <CompanyValidationCard
                    key={company.id}
                    company={company}
                    onApprove={handleApproveCompany}
                    onReject={handleRejectCompany}
                    onSuspend={handleSuspendCompany}
                    onDelete={handleDeleteCompany}
                    onViewJobs={handleViewCompanyJobs}
                  />
                ))}
                {companies.filter((c) => c.is_verified !== true).length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucune entreprise en attente</p>
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
                    placeholder="Rechercher une offre..."
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
                    <option value="all">Tous les statuts</option>
                    <option value="pending">En attente</option>
                    <option value="draft">Brouillon</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspendue</option>
                    <option value="rejected">Rejetée</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
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
                  {searchQuery ? 'Aucune offre trouvée' : 'Aucune offre'}
                </p>
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
                    placeholder="Rechercher une entreprise..."
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
                    <option value="all">Tous les statuts</option>
                    <option value="unverified">Non vérifiée</option>
                    <option value="verified">Vérifiée</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <CompanyValidationCard
                    key={company.id}
                    company={company}
                    onApprove={handleApproveCompany}
                    onReject={handleRejectCompany}
                    onSuspend={handleSuspendCompany}
                    onDelete={handleDeleteCompany}
                    onViewJobs={handleViewCompanyJobs}
                  />
                ))
              ) : (
                <p className="text-center text-slate-500 py-12">
                  {searchQuery ? 'Aucune entreprise trouvée' : 'Aucune entreprise'}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Gestion des utilisateurs
              </CardTitle>
              <CardDescription>Modifier les rôles, suspendre, bannir ou supprimer des comptes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {u.email}
                        </p>
                        <Badge className={cn(
                          'mt-1',
                          u.is_banned ? 'bg-red-100 text-red-700' : u.is_active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          {u.is_banned ? 'Banni' : u.is_active ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <select
                          value={u.role}
                          onChange={(e) => handleToggleUserRole(u.id, e.target.value)}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm w-full sm:w-auto min-h-[44px] bg-white"
                        >
                          <option value="candidate">Candidat</option>
                          <option value="company">Entreprise</option>
                          <option value="admin">Admin</option>
                        </select>

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto min-h-[44px]"
                          onClick={() => handleToggleUserActive(u.id, u.is_active)}
                        >
                          {u.is_active ? <UserX className="w-4 h-4 mr-1" /> : <UserCheck className="w-4 h-4 mr-1" />}
                          {u.is_active ? 'Suspendre' : 'Réactiver'}
                        </Button>

                        {!u.is_banned && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full sm:w-auto text-red-600 hover:bg-red-50 min-h-[44px]"
                            onClick={() => handleBanUser(u.id)}
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            Bannir
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto text-red-600 hover:bg-red-50 min-h-[44px]"
                          onClick={() => handleDeleteUser(u.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-slate-500 py-8">Aucun utilisateur trouvé</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'reports' && (
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="w-5 h-5" />
                Signalements
              </CardTitle>
              <CardDescription>Examinez et traitez les signalements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun signalement</p>
                ) : (
                  reports.map((report) => {
                    const isJobReport = report.reported_item_type === 'job';
                    const itemLabel = isJobReport ? 'Offre' : 'Entreprise';

                    return (
                      <div
                        key={report.id}
                        className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-2xl"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            Signalé par {report.reporter?.email || 'Anonyme'}
                          </p>
                          <p className="text-sm text-slate-500">
                            Type : {itemLabel} • Raison : {report.reason}
                          </p>
                          <Badge
                            className={cn(
                              'mt-2',
                              report.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : report.status === 'reviewed'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            )}
                          >
                            {report.status === 'pending' ? 'En attente' : report.status === 'reviewed' ? 'Vu' : 'Résolu'}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => handleUpdateReportStatus(report.id, 'reviewed')}
                            disabled={report.status !== 'pending'}
                          >
                            Marquer vu
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px]"
                            onClick={() => handleUpdateReportStatus(report.id, 'resolved')}
                            disabled={report.status === 'resolved'}
                          >
                            Résolu
                          </Button>

                          {isJobReport ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 hover:bg-yellow-50 min-h-[44px]"
                                onClick={() => handleSuspendReportedItem(report)}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Suspendre l'offre
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 min-h-[44px]"
                                onClick={() => handleDeleteReportedItem(report)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Supprimer l'offre
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-yellow-600 hover:bg-yellow-50 min-h-[44px]"
                                onClick={() => handleSuspendReportedItem(report)}
                              >
                                <Ban className="w-4 h-4 mr-1" />
                                Suspendre l'entreprise
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:bg-red-50 min-h-[44px]"
                                onClick={() => handleDeleteReportedItem(report)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Supprimer l'entreprise
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 min-h-[44px]"
                            onClick={() => handleBanReportedUser(report)}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Bannir l'utilisateur
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Abonnements actifs / résiliés
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble de tous les abonnements entreprise
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-slate-50">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium">Entreprise</th>
                        <th className="text-left py-3 px-4 font-medium">Plan</th>
                        <th className="text-left py-3 px-4 font-medium">Ancien plan</th>
                        <th className="text-left py-3 px-4 font-medium">Stripe Sub ID</th>
                        <th className="text-left py-3 px-4 font-medium">Expiration</th>
                        <th className="text-left py-3 px-4 font-medium">Raison résiliation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100">
                          <td className="py-3 px-4 font-medium">{c.name}</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                c.subscription_plan === 'pro'
                                  ? 'bg-blue-100 text-blue-700'
                                  : c.subscription_plan === 'business'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-slate-100 text-slate-700'
                              }
                            >
                              {c.subscription_plan || 'free'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {c.previous_subscription_plan ? (
                              <Badge className="bg-amber-100 text-amber-700">{c.previous_subscription_plan}</Badge>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500">
                            {c.stripe_subscription_id || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {c.subscription_expires_at
                              ? new Date(c.subscription_expires_at).toLocaleDateString('fr-FR')
                              : '-'}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-500 max-w-[200px] truncate" title={c.cancellation_reason}>
                            {c.cancellation_reason || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Dernières résiliations
                </CardTitle>
                <CardDescription>Entreprises ayant résilié leur plan payant</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCancellations ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : cancellations.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">Aucune résiliation enregistrée.</p>
                ) : (
                  <div className="space-y-3">
                    {cancellations.map((c) => (
                      <div key={c.id} className="p-4 bg-slate-50 rounded-2xl">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{c.name}</p>
                            <p className="text-sm text-slate-600">
                              Plan après résiliation : <Badge className="bg-slate-200 text-slate-700">{c.subscription_plan}</Badge>
                              {c.previous_subscription_plan && (
                                <>
                                  {' '}← depuis <Badge className="bg-amber-100 text-amber-700">{c.previous_subscription_plan}</Badge>
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
                  Envoyer une newsletter
                </CardTitle>
                <CardDescription>Envoyez un email à tous les abonnés</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sujet</label>
                  <Input
                    value={newsletter.subject}
                    onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                    placeholder="Sujet de l'email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Contenu (HTML)</label>
                  <textarea
                    rows={10}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-500"
                    value={newsletter.content}
                    onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                    placeholder="<h1>Titre</h1><p>Votre message...</p>"
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
                  Envoyer la newsletter
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Abonnés ({subscribers.length})
                </CardTitle>
                <CardDescription>Liste des inscrits à la newsletter</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSubscribers ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : subscribers.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">Aucun abonné pour le moment.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-2 font-medium">Email</th>
                          <th className="text-left py-2 font-medium">Statut</th>
                          <th className="text-left py-2 font-medium">Inscription</th>
                          <th className="text-left py-2 font-medium">Désabonnement</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribers.map((sub) => (
                          <tr key={sub.id} className="border-b last:border-0">
                            <td className="py-2">{sub.email}</td>
                            <td className="py-2">
                              <Badge className={sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                {sub.is_active ? 'Actif' : 'Désabonné'}
                              </Badge>
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
                  Générer un article avec l'IA
                </CardTitle>
                <CardDescription>Créez du contenu optimisé pour votre audience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Titre *</label>
                    <Input
                      value={blogForm.title}
                      onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                      placeholder="Ex: Comment réussir son entretien d'embauche"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Mots-clés</label>
                    <Input
                      value={blogForm.keywords}
                      onChange={(e) => setBlogForm({ ...blogForm, keywords: e.target.value })}
                      placeholder="Ex: recrutement, carrière, conseils"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Audience</label>
                    <select
                      value={blogForm.audience}
                      onChange={(e) => setBlogForm({ ...blogForm, audience: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white"
                    >
                      <option value="all">Tous</option>
                      <option value="candidate">Candidats</option>
                      <option value="recruiter">Recruteurs</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Catégorie</label>
                    <select
                      value={blogForm.category}
                      onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                      className="w-full h-10 px-3 py-2 border border-slate-200 rounded-md bg-white"
                    >
                      <option value="Carrière">Carrière</option>
                      <option value="Recrutement">Recrutement</option>
                      <option value="Technologie">Technologie</option>
                      <option value="Entrepreneuriat">Entrepreneuriat</option>
                      <option value="Conseils">Conseils</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Auteur</label>
                    <Input
                      value={blogForm.author}
                      onChange={(e) => setBlogForm({ ...blogForm, author: e.target.value })}
                      placeholder="Équipe Actoos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Temps de lecture</label>
                    <Input
                      value={blogForm.read_time}
                      onChange={(e) => setBlogForm({ ...blogForm, read_time: e.target.value })}
                      placeholder="5 min"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGenerateBlog}
                  disabled={generating || !blogForm.title.trim()}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Générer l'article
                </Button>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Articles ({blogPosts.length})
                </CardTitle>
                <CardDescription>Gérez les articles du blog</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBlog ? (
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                ) : blogPosts.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">Aucun article pour le moment.</p>
                ) : (
                  <div className="space-y-3">
                    {blogPosts.map((post) => (
                      <div key={post.id} className="p-4 bg-slate-50 rounded-2xl">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-slate-900">{post.title}</h3>
                            <p className="text-sm text-slate-500">
                              {post.category} • {post.audience === 'candidate' ? 'Candidats' : post.audience === 'recruiter' ? 'Recruteurs' : 'Tous'} • {post.author}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{post.excerpt}</p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingSlug(post.slug);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => handleDeleteBlog(post.slug)}
                            >
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
                              <Button
                                size="sm"
                                onClick={() => handleUpdateBlog(post.slug, { title: post.title, content: post.content })}
                                className="bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <Save className="w-4 h-4 mr-1" /> Enregistrer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSlug(null)}
                              >
                                Annuler
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
      </div>
    </div>
  );
};

export default AdminDashboard;