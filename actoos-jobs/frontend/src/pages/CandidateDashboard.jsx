import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import UserMessages from '../components/UserMessages';
import {
  User,
  Briefcase,
  FileText,
  Heart,
  Bell,
  Settings,
  ChevronRight,
  MapPin,
  Calendar,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Target,
  BookOpen,
  Upload,
  Mail
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES } from '../lib/utils';

// ---------- Stats Card ----------
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
  <Card className="border-slate-200 overflow-hidden">
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
            color === 'purple' && 'bg-purple-100',
            color === 'orange' && 'bg-orange-100'
          )}
        >
          <Icon
            className={cn(
              'w-5 h-5 sm:w-6 sm:h-6',
              color === 'blue' && 'text-blue-600',
              color === 'green' && 'text-green-600',
              color === 'purple' && 'text-purple-600',
              color === 'orange' && 'text-orange-600'
            )}
          />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ---------- Application Card ----------
const ApplicationCard = ({ application }) => {
  const statusConfig = {
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    viewed: { label: 'Vue', color: 'bg-blue-100 text-blue-700', icon: Eye },
    shortlisted: { label: 'Présélectionné', color: 'bg-purple-100 text-purple-700', icon: Target },
    interview: { label: 'Entretien', color: 'bg-green-100 text-green-700', icon: Calendar },
    accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    rejected: { label: 'Refusée', color: 'bg-red-100 text-red-700', icon: XCircle },
  };

  const status = statusConfig[application.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <Link
      to={`/mes-candidatures/${application.id}`}
      className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors"
    >
      <div className="flex items-start gap-3 w-full min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 line-clamp-2">
            {application.job?.title || "Offre d'emploi"}
          </p>
          <p className="text-sm text-slate-500 line-clamp-1">
            {application.job?.company?.name || 'Entreprise'}
          </p>
        </div>

        <Badge className={cn(status.color, 'gap-1 border-0 shrink-0 text-xs w-fit')}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </Badge>
      </div>

      <span className="text-xs text-slate-400">{formatRelative(application.created_at)}</span>
    </Link>
  );
};

// ---------- Saved Job Card ----------
const SavedJobCard = ({ job, onRemove }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0">
          <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
        </div>

        <div className="flex-1 min-w-0">
          <Link
            to={`/emplois/${job.id}`}
            className="font-medium text-slate-900 hover:text-blue-600 line-clamp-2"
          >
            {job.title}
          </Link>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
            <span className="line-clamp-1">{job.company?.name || 'Entreprise'}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {job.city?.name || 'Non spécifié'}
            </span>
          </div>
        </div>

        <Badge className={cn(contractInfo.color, 'border-0 shrink-0 text-xs')}>
          {contractInfo.label}
        </Badge>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(job.id)}
          className="text-slate-400 hover:text-red-500 min-h-[44px] px-3"
        >
          <Heart className="w-4 h-4 fill-current" />
        </Button>
      </div>
    </div>
  );
};

// ---------- Profile Completion Widget ----------
const ProfileCompletionWidget = ({ completion }) => {
  const strokeColor =
    completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#3b82f6';

  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Complétude du profil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative w-20 h-20 shrink-0 mx-auto sm:mx-0">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="35" stroke="#e2e8f0" strokeWidth="6" fill="none" />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke={strokeColor}
                strokeWidth="6"
                fill="none"
                strokeDasharray={`${completion * 2.2} 220`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold text-slate-900">{completion}%</span>
            </div>
          </div>

          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">
              {completion < 50 && 'Complétez votre profil pour attirer plus de recruteurs'}
              {completion >= 50 && completion < 80 && 'Bon début ! Ajoutez plus de détails'}
              {completion >= 80 && 'Excellent ! Votre profil est presque complet'}
            </p>
            <Link to="/profil">
              <Button size="sm" variant="outline" className="min-h-[44px]">
                Compléter mon profil
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Main Dashboard ----------
const CandidateDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;

    let score = 0;
    const checks = [
      profile.first_name && profile.last_name,
      profile.candidate_profile?.title,
      profile.candidate_profile?.bio,
      profile.candidate_profile?.cv_url,
      profile.candidate_profile?.skills?.length > 0,
      profile.candidate_profile?.experience?.length > 0,
      profile.candidate_profile?.education?.length > 0,
      profile.phone,
      profile.city_id,
    ];

    checks.forEach((check) => {
      if (check) score += 1;
    });

    return Math.round((score / checks.length) * 100);
  }, [profile]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(
            id,
            title,
            contract_type,
            company:companies(name, logo_url),
            city:cities(name)
          )
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setApplications(appsData || []);

      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select(`
          *,
          job:jobs(
            id,
            title,
            contract_type,
            company:companies(name, logo_url),
            city:cities(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSavedJobs(savedData?.map((s) => s.job).filter(Boolean) || []);

      const { count } = await supabase
        .from('job_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_active', true);

      setAlertsCount(count || 0);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedJob = async (jobId) => {
    try {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (error) {
      console.error('Error removing saved job:', error);
    }
  };

  const getTip = (completion) => {
    const lowProfileTips = [
      'Ajoutez une photo de profil : les profils avec photo reçoivent plus de contacts.',
      'Renseignez votre titre professionnel pour apparaître dans les recherches.',
      'Complétez votre CV pour postuler en un clic.',
      'Indiquez vos compétences clés pour être trouvé plus facilement.',
    ];

    const highProfileTips = [
      'Mettez à jour votre CV régulièrement pour refléter vos dernières expériences.',
      'Activez les alertes emploi pour ne rien manquer.',
      'Ajoutez des exemples de réalisations dans vos expériences.',
      'Partagez votre profil sur LinkedIn pour augmenter votre visibilité.',
    ];

    const tips = completion < 60 ? lowProfileTips : highProfileTips;
    return tips[Math.floor(Math.random() * tips.length)];
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center min-w-0">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-blue-600" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">
                Bonjour, {profile?.first_name || 'Candidat'} 👋
              </h1>
              <p className="text-slate-600 mt-1">Voici un aperçu de votre activité</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <Link to="/profil" className="w-full">
              <Button variant="outline" className="w-full min-h-[44px]">
                <User className="w-4 h-4 mr-2" />
                Mon profil
              </Button>
            </Link>
            <Link to="/emplois" className="w-full">
              <Button className="w-full min-h-[44px] bg-blue-600 text-white hover:bg-blue-700">
                <Briefcase className="w-4 h-4 mr-2" />
                Rechercher
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={FileText} label="Candidatures" value={applications.length} color="blue" />
          <StatCard icon={Heart} label="Offres sauvegardées" value={savedJobs.length} color="purple" />
          <StatCard icon={Bell} label="Alertes actives" value={alertsCount} color="orange" />
          <StatCard
            icon={Target}
            label="Taux de complétude"
            value={`${profileCompletion}%`}
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Recent Applications */}
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2">
                <div>
                  <CardTitle className="text-lg">Mes candidatures</CardTitle>
                  <CardDescription>Suivez l'état de vos candidatures</CardDescription>
                </div>
                <Link to="/mes-candidatures" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Aucune candidature pour le moment</p>
                    <Link to="/emplois">
                      <Button className="min-h-[44px]">Trouver un emploi</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {applications.map((app) => (
                      <ApplicationCard key={app.id} application={app} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Saved Jobs */}
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2">
                <div>
                  <CardTitle className="text-lg">Offres sauvegardées</CardTitle>
                  <CardDescription>Les offres qui vous intéressent</CardDescription>
                </div>
                <Link to="/offres-sauvegardees" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {savedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Aucune offre sauvegardée</p>
                    <Link to="/emplois">
                      <Button variant="outline" className="min-h-[44px]">
                        Parcourir les offres
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedJobs.map((job) => (
                      <SavedJobCard key={job.id} job={job} onRemove={handleRemoveSavedJob} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✅ Messages de l'administration */}
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Messages de l'administration
                </CardTitle>
                <CardDescription>Communications importantes de l'équipe Actoos</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <UserMessages userId={user?.id} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <ProfileCompletionWidget completion={profileCompletion} />

            {/* Quick Actions */}
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link
                  to="/profil"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"
                >
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">Mettre à jour mon CV</p>
                    <p className="text-xs text-slate-500">Téléchargez votre dernier CV</p>
                  </div>
                </Link>

                <Link
                  to="/alertes"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">Créer une alerte</p>
                    <p className="text-xs text-slate-500">Recevez les offres par email</p>
                  </div>
                </Link>

                <Link
                  to="/parametres"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">Paramètres</p>
                    <p className="text-xs text-slate-500">Gérez votre compte</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-blue-200 bg-blue-50 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Conseil du jour</h4>
                    <p className="text-sm text-blue-700 mt-1">{getTip(profileCompletion)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;