import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  User, Briefcase, FileText, Heart, Bell, Settings, ChevronRight,
  MapPin, Calendar, Clock, Eye, CheckCircle, XCircle, Loader2,
  TrendingUp, Target, BookOpen, Upload
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES } from '../lib/utils';

// Stats Card
const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
  <Card className="border-slate-200">
    <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {trend && (
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

// Application Card
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
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
        <Briefcase className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/emplois/${application.job_id}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1">
          {application.job?.title || 'Offre d\'emploi'}
        </Link>
        <p className="text-sm text-slate-500">{application.job?.company?.name || 'Entreprise'}</p>
      </div>
      <Badge className={cn(status.color, 'gap-1 border-0')}>
        <StatusIcon className="w-3 h-3" />
        {status.label}
      </Badge>
      <span className="text-xs text-slate-400 hidden sm:block">
        {formatRelative(application.created_at)}
      </span>
    </div>
  );
};

// Saved Job Card
const SavedJobCard = ({ job, onRemove }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-slate-200">
        <Briefcase className="w-6 h-6 text-slate-400" />
      </div>
      <div className="flex-1 min-w-0">
        <Link to={`/emplois/${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-1">
          {job.title}
        </Link>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>{job.company?.name}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {job.city?.name}
          </span>
        </div>
      </div>
      <Badge className={cn(contractInfo.color, 'border-0')}>
        {contractInfo.label}
      </Badge>
      <Button variant="ghost" size="sm" onClick={() => onRemove(job.id)} className="text-slate-400 hover:text-red-500">
        <Heart className="w-4 h-4 fill-current" />
      </Button>
    </div>
  );
};

// Profile Completion Card
const ProfileCompletion = ({ profile }) => {
  const calculateCompletion = () => {
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
    checks.forEach(check => { if (check) score += 1; });
    return Math.round((score / checks.length) * 100);
  };

  const completion = calculateCompletion();

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Complétude du profil</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke="#e2e8f0"
                strokeWidth="6"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="35"
                stroke={completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#3b82f6'}
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
            <p className="text-sm text-slate-600 mb-2">
              {completion < 50 && 'Complétez votre profil pour attirer plus de recruteurs'}
              {completion >= 50 && completion < 80 && 'Bon début ! Ajoutez plus de détails'}
              {completion >= 80 && 'Excellent ! Votre profil est presque complet'}
            </p>
            <Link to="/profil">
              <Button size="sm" variant="outline">
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

// Main Dashboard
const CandidateDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch applications
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(
            id, title, contract_type,
            company:companies(name, logo_url),
            city:cities(name)
          )
        `)
        .eq('candidate_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setApplications(appsData || []);

      // Fetch saved jobs
      const { data: savedData } = await supabase
        .from('saved_jobs')
        .select(`
          *,
          job:jobs(
            id, title, contract_type,
            company:companies(name, logo_url),
            city:cities(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setSavedJobs(savedData?.map(s => s.job).filter(Boolean) || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedJob = async (jobId) => {
    try {
      await supabase
        .from('saved_jobs')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId);
      
      setSavedJobs(prev => prev.filter(j => j.id !== jobId));
    } catch (error) {
      console.error('Error removing saved job:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Bonjour, {profile?.first_name || 'Candidat'} 👋
            </h1>
            <p className="text-slate-600 mt-1">
              Voici un aperçu de votre activité
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/profil">
              <Button variant="outline">
                <User className="w-4 h-4 mr-2" />
                Mon profil
              </Button>
            </Link>
            <Link to="/emplois">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Briefcase className="w-4 h-4 mr-2" />
                Rechercher
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={FileText}
            label="Candidatures"
            value={applications.length}
            color="blue"
          />
          <StatCard
            icon={Eye}
            label="Vues du profil"
            value="24"
            trend={12}
            color="green"
          />
          <StatCard
            icon={Heart}
            label="Offres sauvegardées"
            value={savedJobs.length}
            color="purple"
          />
          <StatCard
            icon={Bell}
            label="Alertes actives"
            value="2"
            color="orange"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Applications */}
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Mes candidatures</CardTitle>
                  <CardDescription>Suivez l'état de vos candidatures</CardDescription>
                </div>
                <Link to="/mes-candidatures">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {applications.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Aucune candidature pour le moment</p>
                    <Link to="/emplois">
                      <Button>Trouver un emploi</Button>
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
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Offres sauvegardées</CardTitle>
                  <CardDescription>Les offres qui vous intéressent</CardDescription>
                </div>
                <Link to="/offres-sauvegardees">
                  <Button variant="ghost" size="sm">
                    Voir tout
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {savedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">Aucune offre sauvegardée</p>
                    <Link to="/emplois">
                      <Button variant="outline">Parcourir les offres</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedJobs.map((job) => (
                      <SavedJobCard
                        key={job.id}
                        job={job}
                        onRemove={handleRemoveSavedJob}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Profile Completion */}
            <ProfileCompletion profile={profile} />

            {/* Quick Actions */}
            <Card className="border-slate-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to="/profil" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Upload className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Mettre à jour mon CV</p>
                    <p className="text-xs text-slate-500">Téléchargez votre dernier CV</p>
                  </div>
                </Link>
                <Link to="/alertes" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Créer une alerte</p>
                    <p className="text-xs text-slate-500">Recevez les offres par email</p>
                  </div>
                </Link>
                <Link to="/parametres" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Settings className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Paramètres</p>
                    <p className="text-xs text-slate-500">Gérez votre compte</p>
                  </div>
                </Link>
              </CardContent>
            </Card>

            {/* Tips */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900">Conseil du jour</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Un profil complet avec photo augmente vos chances d'être contacté de 40%.
                    </p>
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
