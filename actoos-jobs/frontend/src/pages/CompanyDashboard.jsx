import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Building2, Briefcase, Users, Eye, FileText, Plus, Settings,
  ChevronRight, TrendingUp, Clock, CheckCircle, XCircle, Loader2,
  Edit, Trash2, MoreVertical, Globe, Mail, Phone, MapPin, Calendar
} from 'lucide-react';
import { cn, formatRelative, formatDate, CONTRACT_TYPES } from '../lib/utils';

// Stats Card
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
  <Card className="border-slate-200">
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
          color === 'purple' && 'bg-purple-100',
          color === 'orange' && 'bg-orange-100',
        )}>
          <Icon className={cn(
            'w-6 h-6',
            color === 'blue' && 'text-blue-600',
            color === 'green' && 'text-green-600',
            color === 'purple' && 'text-purple-600',
            color === 'orange' && 'text-orange-600',
          )} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// Job Card for Company
const CompanyJobCard = ({ job, onEdit, onDelete, onToggleStatus }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const [showMenu, setShowMenu] = useState(false);

  const statusConfig = {
    draft: { label: 'Brouillon', color: 'bg-slate-100 text-slate-700' },
    active: { label: 'Publiée', color: 'bg-green-100 text-green-700' },
    paused: { label: 'En pause', color: 'bg-yellow-100 text-yellow-700' },
    closed: { label: 'Fermée', color: 'bg-red-100 text-red-700' },
    expired: { label: 'Expirée', color: 'bg-slate-100 text-slate-700' },
  };

  const status = statusConfig[job.status] || statusConfig.draft;

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link 
            to={`/emplois/${job.id}`}
            className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1"
          >
            {job.title}
          </Link>
          <Badge className={cn(status.color, 'border-0 text-xs')}>
            {status.label}
          </Badge>
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
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
      
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400 hidden sm:block">
          {formatRelative(job.created_at)}
        </span>
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
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

// Application Card
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
      className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
    >
      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-slate-200">
        <Users className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900">
          {application.candidate?.first_name} {application.candidate?.last_name}
        </p>
        <p className="text-sm text-slate-500 line-clamp-1">
          {application.job?.title}
        </p>
      </div>
      <Badge className={cn(status.color, 'gap-1 border-0')}>
        <StatusIcon className="w-3 h-3" />
        {status.label}
      </Badge>
      <span className="text-xs text-slate-400 hidden sm:block">
        {formatRelative(application.created_at)}
      </span>
    </Link>
  );
};

// Main Company Dashboard
const CompanyDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    totalApplications: 0,
    newApplications: 0,
  });

  useEffect(() => {
    if (user) {
      fetchCompanyData();
    }
  }, [user]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      // Get company membership
      const { data: membership } = await supabase
        .from('company_members')
        .select(`
          *,
          company:companies(*)
        `)
        .eq('user_id', user.id)
        .single();

      if (!membership?.company) {
        // User doesn't have a company yet
        setLoading(false);
        return;
      }

      setCompany(membership.company);

      // Fetch jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          *,
          city:cities(name)
        `)
        .eq('company_id', membership.company.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setJobs(jobsData || []);

      // Fetch recent applications
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:users(first_name, last_name, email),
          job:jobs(title)
        `)
        .in('job_id', (jobsData || []).map(j => j.id))
        .order('created_at', { ascending: false })
        .limit(10);

      setApplications(appsData || []);

      // Calculate stats
      const activeJobs = (jobsData || []).filter(j => j.status === 'active').length;
      const newApps = (appsData || []).filter(a => a.status === 'pending').length;

      setStats({
        totalJobs: (jobsData || []).length,
        activeJobs,
        totalApplications: (appsData || []).length,
        newApplications: newApps,
      });

    } catch (error) {
      console.error('Error fetching company data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (job) => {
    navigate(`/dashboard/entreprise/offres/${job.id}/modifier`);
  };

  const handleDeleteJob = async (job) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${job.title}" ?`)) return;
    
    try {
      await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);
      
      setJobs(jobs.filter(j => j.id !== job.id));
      toast.success('Offre supprimée');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleToggleJobStatus = async (job, newStatus) => {
    try {
      await supabase
        .from('jobs')
        .update({ 
          status: newStatus,
          published_at: newStatus === 'active' ? new Date().toISOString() : job.published_at
        })
        .eq('id', job.id);
      
      setJobs(jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
      toast.success(newStatus === 'active' ? 'Offre publiée' : 'Offre mise en pause');
    } catch (error) {
      console.error('Error updating job status:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // No company yet - show setup
  if (!company) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            Créez votre profil entreprise
          </h1>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Pour publier des offres et recevoir des candidatures, commencez par créer le profil de votre entreprise.
          </p>
          <Link to="/dashboard/entreprise/creer">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center border border-slate-200">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.name} className="w-12 h-12 object-contain" />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
              <p className="text-slate-600">Espace recruteur</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/dashboard/entreprise/profil">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Profil entreprise
              </Button>
            </Link>
            <Link to="/dashboard/entreprise/offres/nouvelle">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle offre
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Briefcase}
            label="Offres publiées"
            value={stats.activeJobs}
            color="blue"
          />
          <StatCard
            icon={FileText}
            label="Total candidatures"
            value={stats.totalApplications}
            color="green"
          />
          <StatCard
            icon={Users}
            label="Nouvelles candidatures"
            value={stats.newApplications}
            color="purple"
          />
          <StatCard
            icon={Eye}
            label="Vues totales"
            value={jobs.reduce((sum, j) => sum + (j.views_count || 0), 0)}
            color="orange"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Jobs List */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Mes offres d'emploi</h2>
                  <p className="text-sm text-slate-500">{stats.totalJobs} offres au total</p>
                </div>
                <Link to="/dashboard/entreprise/offres">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
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
                    {jobs.map((job) => (
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Applications */}
            <Card className="border-slate-200">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Candidatures récentes</h2>
                  <p className="text-sm text-slate-500">{stats.newApplications} nouvelles</p>
                </div>
                <Link to="/dashboard/entreprise/candidatures">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
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
                    {applications.slice(0, 5).map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Company Info Card */}
            <Card className="border-slate-200">
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Profil entreprise</h3>
                <div className="space-y-3 text-sm">
                  {company.industry && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      {company.industry}
                    </p>
                  )}
                  {company.size && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Users className="w-4 h-4 text-slate-400" />
                      {company.size} employés
                    </p>
                  )}
                  {company.website && (
                    <a 
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      {company.website}
                    </a>
                  )}
                  {company.email && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {company.email}
                    </p>
                  )}
                </div>
                <Link to="/dashboard/entreprise/profil">
                  <Button variant="outline" className="w-full mt-4">
                    Modifier le profil
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Subscription */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-blue-100 text-blue-700 border-0">
                    {company.subscription_plan === 'free' ? 'Plan Gratuit' : company.subscription_plan}
                  </Badge>
                </div>
                <p className="text-sm text-blue-800 mb-4">
                  Passez à un plan supérieur pour accéder à plus de fonctionnalités et mettre vos offres en avant.
                </p>
                <Link to="/tarifs">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Voir les plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyDashboard;
