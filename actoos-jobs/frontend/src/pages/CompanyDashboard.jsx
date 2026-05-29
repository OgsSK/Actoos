import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Building2, Briefcase, Users, Eye, FileText, Plus, Settings,
  ChevronRight, TrendingUp, Clock, CheckCircle, XCircle, Loader2,
  Edit, Trash2, MoreVertical, Globe, Mail, Phone, MapPin, Calendar, AlertTriangle, X
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES } from '../lib/utils';

// ---------- Stats Card ----------
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
  <Card className="border-slate-200">
    <CardContent className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend !== undefined && (
            <p className={cn('text-xs mt-1 flex items-center gap-1', trend > 0 ? 'text-green-600' : 'text-slate-500')}>
              <TrendingUp className="w-3 h-3" />
              {trend > 0 ? '+' : ''}{trend}% ce mois
            </p>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
          color === 'blue' && 'bg-blue-100',
          color === 'green' && 'bg-green-100',
          color === 'purple' && 'bg-purple-100',
          color === 'orange' && 'bg-orange-100'
        )}>
          <Icon className={cn(
            'w-6 h-6',
            color === 'blue' && 'text-blue-600',
            color === 'green' && 'text-green-600',
            color === 'purple' && 'text-purple-600',
            color === 'orange' && 'text-orange-600'
          )} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ---------- Company Job Card ----------
const CompanyJobCard = ({ job, onEdit, onDelete, onToggleStatus }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
    active: { label: 'Publiée', color: 'bg-green-100 text-green-700' },
    paused: { label: 'En pause', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: 'Fermée', color: 'bg-red-100 text-red-700' },
    expired: { label: 'Expirée', color: 'bg-slate-100 text-slate-700' },
    pending: { label: 'En validation', color: 'bg-yellow-100 text-yellow-700' },
  };
  const status = statusConfig[job.status] || statusConfig.draft;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/emplois/${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1">
            {job.title}
          </Link>
          <Badge className={cn(status.color, 'border-0 text-xs w-fit')}>
            {status.label}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.city?.name || 'Non spécifié'}
          </span>
          <Badge className={cn(contractInfo.color, 'border-0 text-xs')}>
            {contractInfo.label}
          </Badge>
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {job.views_count || 0} vues
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {job.applications_count || 0} candidatures
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        <span className="text-xs text-slate-400">{formatRelative(job.created_at)}</span>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowMenu(!showMenu)}>
            <MoreVertical className="w-4 h-4" />
          </Button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 w-48 sm:top-full sm:mt-1 sm:bottom-auto sm:mb-0 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                <button
                  onClick={() => { onEdit(job); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4" />
                  Modifier
                </button>

                <Link
                  to={`/dashboard/entreprise/offres/${job.id}/candidatures`}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Users className="w-4 h-4" />
                  Voir les candidatures
                </Link>

                {job.status === 'active' ? (
                  <button
                    onClick={() => { onToggleStatus(job, 'paused'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-slate-50"
                  >
                    <Clock className="w-4 h-4" />
                    Mettre en pause
                  </button>
                ) : job.status === 'paused' ? (
                  <button
                    onClick={() => { onToggleStatus(job, 'active'); setShowMenu(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-600 hover:bg-slate-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Republier
                  </button>
                ) : null}

                <button
                  onClick={() => { onDelete(job); setShowMenu(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-slate-50"
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

// ---------- Application Card ----------
const ApplicationCard = ({ application }) => {
  const statusConfig = {
    pending: { label: 'Nouvelle', color: 'bg-blue-100 text-blue-700', icon: Clock },
    viewed: { label: 'Vue', color: 'bg-slate-100 text-slate-700', icon: Eye },
    shortlisted: { label: 'Présélectionné', color: 'bg-purple-100 text-purple-700', icon: CheckCircle },
    interview: { label: 'Entretien', color: 'bg-green-100 text-green-700', icon: Calendar },
    accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircle },
  };
  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Link
      to={`/dashboard/entreprise/candidatures/${application.id}`}
      className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-start sm:items-center gap-3 w-full min-w-0">
        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 shrink-0">
          <Users className="w-5 h-5 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 truncate">
            {application.candidate?.first_name} {application.candidate?.last_name}
          </p>
          <p className="text-sm text-slate-500 line-clamp-1">{application.job?.title}</p>
        </div>

        <Badge className={cn(status.color, 'gap-1 border-0 shrink-0 text-xs w-fit')}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      <span className="text-xs text-slate-400 w-full text-right sm:text-left sm:w-auto">
        {formatRelative(application.created_at)}
      </span>
    </Link>
  );
};

// ---------- Modale de résiliation ----------
const CancelSubscriptionModal = ({ isOpen, onClose, onConfirm, cancelling }) => {
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    onConfirm(reason);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="max-w-md w-full rounded-2xl bg-white shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              Résilier l'abonnement
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Vous êtes sur le point de résilier votre abonnement. Cette action est irréversible.
            </p>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Raison de la résiliation (optionnel)
              </label>
              <textarea
                rows={3}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm resize-none"
                placeholder="Dites-nous pourquoi vous partez..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700">
              <p className="font-medium mb-1">⚠️ Conséquences :</p>
              <ul className="list-disc list-inside space-y-1 text-red-600">
                <li>Votre plan sera rétrogradé en plan Gratuit</li>
                <li>Les fonctionnalités premium seront désactivées</li>
                <li>Cette action est immédiate</li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleConfirm}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirmer la résiliation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ---------- Main Dashboard ----------
const CompanyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    newApplications: 0
  });

  useEffect(() => {
    if (user) fetchCompanyData();
  }, [user]);

  const fetchCompanyData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: ownedCompany } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownedCompany) {
        setCompany(ownedCompany);

        const { data: jobsData } = await supabase
          .from('jobs')
          .select('*, city:cities(name)')
          .eq('company_id', ownedCompany.id)
          .order('created_at', { ascending: false })
          .limit(10);

        setJobs(jobsData || []);

        let appsData = [];

        if (jobsData?.length) {
          const { data } = await supabase
            .from('applications')
            .select(`
              *,
              candidate:users(first_name, last_name, email),
              job:jobs(title)
            `)
            .in('job_id', jobsData.map(j => j.id))
            .order('created_at', { ascending: false })
            .limit(10);

          appsData = data || [];
        }

        setApplications(appsData);

        const activeJobs = (jobsData || []).filter(j => j.status === 'active').length;
        const totalApplications = appsData.length;
        const newApplications = appsData.filter(app => app.status === 'pending').length;

        setStats({
          totalJobs: (jobsData || []).length,
          activeJobs,
          totalApplications,
          newApplications
        });
      } else {
        setCompany(null);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement du dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (job) => navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);

  const handleDeleteJob = async (job) => {
    if (!window.confirm(`Supprimer "${job.title}" ?`)) return;
    await supabase.from('jobs').delete().eq('id', job.id);
    setJobs(prev => prev.filter(j => j.id !== job.id));
    toast.success('Offre supprimée');
  };

  const handleToggleJobStatus = async (job, newStatus) => {
    try {
      const updates = { status: newStatus };

      if (newStatus === 'active' && !job.published_at) {
        updates.published_at = new Date().toISOString();
        updates.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      await supabase.from('jobs').update(updates).eq('id', job.id);
      setJobs(prev => prev.map(j => j.id === job.id ? { ...j, ...updates } : j));
      toast.success(newStatus === 'active' ? 'Offre publiée' : 'Statut mis à jour');
    } catch (err) {
      toast.error('Erreur');
    }
  };

  const handleCancelSubscription = async (reason) => {
    setCancelling(true);
    try {
      await apiFetch('/api/subscription/cancel', {
        method: 'POST',
        body: JSON.stringify({ user_id: user.id, reason })
      });
      toast.success('Abonnement résilié avec succès');
      setShowCancelModal(false);
      fetchCompanyData();
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la résiliation');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Créez votre profil entreprise</h1>
          <p className="text-slate-600 mb-8">
            Pour publier des offres et recevoir des candidatures, commencez par créer le profil de votre entreprise.
          </p>
          <Link to="/dashboard/entreprise/creer">
            <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              Créer mon entreprise
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20" data-testid="company-dashboard">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 min-w-0">
            <div className="w-16 h-16 shrink-0 bg-white rounded-xl flex items-center justify-center border border-slate-200">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-12 h-12 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">{company.name}</h1>
              <p className="text-slate-600">Espace recruteur</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Link to="/dashboard/entreprise/profil" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <Settings className="w-4 h-4 mr-2" />
                Profil entreprise
              </Button>
            </Link>
            <Link to="/dashboard/entreprise/offres/nouvelle" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle offre
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={Briefcase} label="Offres publiées" value={stats.activeJobs} color="blue" />
          <StatCard icon={FileText} label="Total candidatures" value={stats.totalApplications} color="green" />
          <StatCard icon={Users} label="Nouvelles candidatures" value={stats.newApplications} color="purple" />
          <StatCard icon={Eye} label="Vues totales" value={jobs.reduce((s, j) => s + (j.views_count || 0), 0)} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-slate-200">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Mes offres d'emploi</h2>
                  <p className="text-sm text-slate-500">{stats.totalJobs} offres au total</p>
                </div>
                <Link to="/dashboard/entreprise/offres" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                    Voir tout<ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <CardContent className="p-6">
                {jobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Aucune offre publiée</p>
                    <Link to="/dashboard/entreprise/offres/nouvelle">
                      <Button>Publier une offre</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <CompanyJobCard
                        key={job.id}
                        job={job}
                        onEdit={handleEditJob}
                        onDelete={handleDeleteJob}
                        onToggleStatus={handleToggleJobStatus}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-slate-200">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Candidatures récentes</h2>
                  <p className="text-sm text-slate-500">{stats.newApplications} nouvelles</p>
                </div>
                <Link to="/dashboard/entreprise/candidatures" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto">
                    Voir tout<ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>

              <CardContent className="p-4">
                {applications.length === 0 ? (
                  <div className="text-center py-6">
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Aucune candidature</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {applications.slice(0, 5).map(app => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Profil entreprise</h3>

                {!company.is_verified && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-sm text-yellow-700">
                    ⏳ Votre entreprise est en attente de validation. Vous pouvez préparer vos offres en brouillon. Une fois validée, vous pourrez les soumettre pour publication.
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  {company.industry && <p className="flex items-center gap-2 text-slate-600"><Building2 className="w-4 h-4 text-slate-400" />{company.industry}</p>}
                  {company.size && <p className="flex items-center gap-2 text-slate-600"><Users className="w-4 h-4 text-slate-400" />{company.size} employés</p>}
                  {company.website && (
                    <a
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline break-all"
                    >
                      <Globe className="w-4 h-4 shrink-0" />
                      {company.website}
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-blue-600 hover:underline break-all">
                      <Mail className="w-4 h-4 shrink-0" />
                      {company.email}
                    </a>
                  )}
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-blue-600 break-all">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      {company.phone}
                    </a>
                  )}
                  {company.founded_year && <p className="flex items-center gap-2 text-slate-600"><Calendar className="w-4 h-4 text-slate-400" />Créée en {company.founded_year}</p>}
                  {company.address && <p className="flex items-center gap-2 text-slate-600"><MapPin className="w-4 h-4 text-slate-400" />{company.address}</p>}
                </div>

                <Link to="/dashboard/entreprise/profil">
                  <Button variant="outline" className="w-full mt-4">Modifier le profil</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-0 text-sm px-3 py-1">
                    Plan actuel : {company.subscription_plan === 'free' ? 'Gratuit' : company.subscription_plan}
                  </Badge>
                  <Link to="/tarifs" className="w-full sm:w-auto">
                    <Button variant="ghost" size="sm" className="w-full sm:w-auto text-blue-600 hover:bg-blue-100">
                      Changer de plan
                    </Button>
                  </Link>
                </div>

                {company.subscription_plan !== 'free' && company.stripe_subscription_id ? (
                  <>
                    <p className="text-sm text-blue-800 mb-4">
                      Vous êtes actuellement sur le plan {company.subscription_plan}. Vous pouvez le résilier à tout moment.
                    </p>
                    <Button
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => setShowCancelModal(true)}
                    >
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      Résilier l'abonnement
                    </Button>
                  </>
                ) : company.subscription_plan === 'free' && company.cancellation_reason ? (
                  <div className="text-sm text-slate-700 mt-2">
                    <p className="font-medium">Raison de la dernière résiliation :</p>
                    <p className="italic mt-1">« {company.cancellation_reason} »</p>
                  </div>
                ) : (
                  <p className="text-sm text-blue-800">
                    Passez à un plan supérieur pour publier plus d'offres et accéder à des fonctionnalités avancées.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <CancelSubscriptionModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        cancelling={cancelling}
      />
    </div>
  );
};

export default CompanyDashboard;