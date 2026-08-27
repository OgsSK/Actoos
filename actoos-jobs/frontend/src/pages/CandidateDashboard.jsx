import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import UserMessages from '../components/UserMessages';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import {
  User, Briefcase, FileText, Heart, Bell, Settings, ChevronRight,
  MapPin, Calendar, Clock, Eye, CheckCircle, XCircle, Loader2,
  TrendingUp, Target, BookOpen, Upload, Mail, Building2,
  Sparkles, Banknote, Star, ThumbsUp,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, formatSalaryPeriod } from '../lib/utils';
import { toast } from 'sonner';

// ---------- Stats Card ----------
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
                {trend > 0 ? '+' : ''}{t('candidateDashboard.stats.trend', { trend })}
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

// ---------- Application Card ----------
const ApplicationCard = ({ application }) => {
  const { t } = useTranslation();
  const statusIcons = { pending: Clock, viewed: Eye, shortlisted: Target, interview: Calendar, accepted: CheckCircle, rejected: XCircle };
  const statusColors = { pending: 'bg-yellow-100 text-yellow-700', viewed: 'bg-blue-100 text-blue-700', shortlisted: 'bg-purple-100 text-purple-700', interview: 'bg-green-100 text-green-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
  const statusLabel = t(`myApplications.status.${application.status}`, { defaultValue: application.status });
  const StatusIcon = statusIcons[application.status] || Clock;
  const statusColor = statusColors[application.status] || 'bg-yellow-100 text-yellow-700';
  const logoUrl = application.job?.company?.logo_url;
  return (
    <Link to={`/mes-candidatures/${application.id}`} className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="flex items-start gap-3 w-full min-w-0">
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-900 line-clamp-2">{application.job?.title || t('candidateDashboard.applications.defaultJobTitle')}</p>
          <p className="text-sm text-slate-500 line-clamp-1">{application.job?.company?.name || t('candidateDashboard.applications.defaultCompany')}</p>
        </div>
        <Badge className={cn(statusColor, 'gap-1 border-0 shrink-0 text-xs w-fit')}><StatusIcon className="w-3 h-3" />{statusLabel}</Badge>
      </div>
      <span className="text-xs text-slate-400">{formatRelative(application.created_at)}</span>
    </Link>
  );
};

// ---------- Saved Job Card ----------
const SavedJobCard = ({ job, onRemove }) => {
  const { t } = useTranslation();
  const { format } = useCurrencyFormatter();
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const logoUrl = job.company?.logo_url;
  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden">
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <Link to={`/emplois/${job.id}`} className="font-medium text-slate-900 hover:text-blue-600 line-clamp-2">{job.title}</Link>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
            <span className="line-clamp-1">{job.company?.name || t('candidateDashboard.applications.defaultCompany')}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city?.name || t('candidateDashboard.savedJobs.unspecifiedLocation')}</span>
            {job.salary_min && job.salary_max && (
              <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{format(job.salary_min)} – {format(job.salary_max)}{formatSalaryPeriod(job.salary_period, t)}</span>
            )}
          </div>
        </div>
        <Badge className={cn(contractInfo.color, 'border-0 shrink-0 text-xs')}>{contractInfo.label}</Badge>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => onRemove(job.id)} className="text-slate-400 hover:text-red-500 min-h-[44px] px-3"><Heart className="w-4 h-4 fill-current" /></Button>
      </div>
    </div>
  );
};

// ---------- Profile Completion Widget ----------
const ProfileCompletionWidget = ({ completion }) => {
  const { t } = useTranslation();
  const strokeColor = completion >= 80 ? '#22c55e' : completion >= 50 ? '#f59e0b' : '#3b82f6';
  const messageKey = completion < 50 ? 'low' : completion < 80 ? 'medium' : 'high';
  return (
    <Card className="border-slate-200 overflow-hidden">
      <CardHeader className="pb-2"><CardTitle className="text-base">{t('candidateDashboard.profileCompletion.title')}</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative w-20 h-20 shrink-0 mx-auto sm:mx-0">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle cx="40" cy="40" r="35" stroke="#e2e8f0" strokeWidth="6" fill="none" />
              <circle cx="40" cy="40" r="35" stroke={strokeColor} strokeWidth="6" fill="none" strokeDasharray={`${completion * 2.2} 220`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl font-bold text-slate-900">{completion}%</span></div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">{t(`candidateDashboard.profileCompletion.messages.${messageKey}`)}</p>
            <Link to="/profil"><Button size="sm" variant="outline" className="min-h-[44px]">{t('candidateDashboard.profileCompletion.completeProfile')}<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------- Main Dashboard ----------
const CandidateDashboard = () => {
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const { format } = useCurrencyFormatter();
  const [applications, setApplications] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hiringDocuments, setHiringDocuments] = useState([]);

  // --- Offres recommandées (calcul local) ---
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

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
    checks.forEach(check => { if (check) score++; });
    return Math.round((score / checks.length) * 100);
  }, [profile]);

  useEffect(() => { if (user) fetchData(); }, [user]);

  // 🔥 Recommandations personnalisées (matching local)
  useEffect(() => {
    if (!user || !profile) return;
    const fetchRecommended = async () => {
      setLoadingRecommended(true);
      try {
        const { data: jobs, error } = await supabase
          .from('jobs')
          .select('id, title, salary_min, salary_max, salary_period, skills_required, is_remote, city_id, company:companies(name, logo_url), city:cities(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const candSkills = profile.candidate_profile?.skills || [];
        const candCity = profile.city_id;
        const candRemote = profile.candidate_profile?.is_open_to_remote || false;
        const candSalaryMin = profile.candidate_profile?.desired_salary_min;
        const candSalaryMax = profile.candidate_profile?.desired_salary_max;

        const scored = jobs
          .filter(job => {
            const jobSkills = job.skills_required || [];
            const commonSkills = jobSkills.filter(skill => candSkills.includes(skill));
            if (commonSkills.length === 0) return false;

            if (candCity) {
              const sameCity = job.city_id === candCity;
              const remoteOk = job.is_remote && candRemote;
              if (!sameCity && !remoteOk) return false;
            }

            if (candSalaryMin && candSalaryMax && job.salary_min && job.salary_max) {
              if (candSalaryMin > job.salary_max || candSalaryMax < job.salary_min) return false;
            }
            return true;
          })
          .map(job => {
            const jobSkills = job.skills_required || [];
            const commonSkills = jobSkills.filter(skill => candSkills.includes(skill));
            return { ...job, matchScore: commonSkills.length };
          })
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 6);

        setRecommendedJobs(scored);
      } catch (err) {
        console.error(err);
        toast.error("Impossible de charger les recommandations.");
      } finally {
        setLoadingRecommended(false);
      }
    };

    fetchRecommended();
  }, [user, profile]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data: appsData } = await supabase.from('applications').select('*, job:jobs(id, title, contract_type, company:companies(name, logo_url), city:cities(name))').eq('candidate_id', user.id).order('created_at', { ascending: false }).limit(5);
      setApplications(appsData || []);

      const { data: savedData } = await supabase.from('saved_jobs').select('*, job:jobs(id, title, contract_type, salary_min, salary_max, salary_period, company:companies(name, logo_url), city:cities(name))').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
      setSavedJobs(savedData?.map(s => s.job).filter(Boolean) || []);

      const { count } = await supabase.from('job_alerts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_active', true);
      setAlertsCount(count || 0);

      const { data: docsData, error: docsError } = await supabase.from('hiring_documents').select('id, document_type, status, file_url, application_id, created_at').eq('candidate_id', user.id).order('created_at', { ascending: false });
      if (!docsError) {
        const appIds = docsData.map(d => d.application_id).filter(Boolean);
        let jobsMap = {};
        if (appIds.length > 0) {
          const { data: apps } = await supabase.from('applications').select('id, job:jobs(title)').in('id', appIds);
          apps?.forEach(app => { jobsMap[app.id] = app.job?.title || 'Offre inconnue'; });
        }
        setHiringDocuments(docsData.map(doc => ({ ...doc, jobTitle: jobsMap[doc.application_id] || 'Offre inconnue' })));
      } else {
        setHiringDocuments([]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedJob = async (jobId) => {
    await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
    setSavedJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const getTip = (completion) => {
    const tips = t(completion < 60 ? 'candidateDashboard.dailyTip.low' : 'candidateDashboard.dailyTip.high', { returnObjects: true });
    return tips?.length ? tips[Math.floor(Math.random() * tips.length)] : '';
  };

  if (authLoading || loading) return <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center min-w-0">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-8 h-8 text-blue-600" />}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 truncate">{t('candidateDashboard.greeting', { name: profile?.first_name || 'Candidat' })}</h1>
              <p className="text-slate-600 mt-1">{t('candidateDashboard.activityPreview')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <Link to="/profil" className="w-full"><Button variant="outline" className="w-full min-h-[44px]"><User className="w-4 h-4 mr-2" />{t('candidateDashboard.myProfile')}</Button></Link>
            <Link to="/emplois" className="w-full"><Button className="w-full min-h-[44px] bg-blue-600 text-white hover:bg-blue-700"><Briefcase className="w-4 h-4 mr-2" />{t('candidateDashboard.searchJobs')}</Button></Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <StatCard icon={FileText} label={t('candidateDashboard.stats.applications')} value={applications.length} color="blue" />
          <StatCard icon={Heart} label={t('candidateDashboard.stats.savedJobs')} value={savedJobs.length} color="purple" />
          <StatCard icon={Bell} label={t('candidateDashboard.stats.activeAlerts')} value={alertsCount} color="orange" />
          <StatCard icon={Target} label={t('candidateDashboard.stats.completionRate')} value={`${profileCompletion}%`} color="green" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          <div className="xl:col-span-2 space-y-6">
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2">
                <div><CardTitle className="text-lg">{t('candidateDashboard.applications.title')}</CardTitle><CardDescription>{t('candidateDashboard.applications.description')}</CardDescription></div>
                <Link to="/mes-candidatures" className="w-full sm:w-auto"><Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">{t('candidateDashboard.applications.viewAll')}<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {applications.length === 0 ? (
                  <div className="text-center py-8"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 mb-4">{t('candidateDashboard.applications.empty')}</p><Link to="/emplois"><Button className="min-h-[44px]">{t('candidateDashboard.applications.findJob')}</Button></Link></div>
                ) : (
                  <div className="space-y-3">{applications.map(app => <ApplicationCard key={app.id} application={app} />)}</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2">
                <div><CardTitle className="text-lg">{t('candidateDashboard.savedJobs.title')}</CardTitle><CardDescription>{t('candidateDashboard.savedJobs.description')}</CardDescription></div>
                <Link to="/offres-sauvegardees" className="w-full sm:w-auto"><Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">{t('candidateDashboard.savedJobs.viewAll')}<ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {savedJobs.length === 0 ? (
                  <div className="text-center py-8"><Heart className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 mb-4">{t('candidateDashboard.savedJobs.empty')}</p><Link to="/emplois"><Button variant="outline" className="min-h-[44px]">{t('candidateDashboard.savedJobs.browseJobs')}</Button></Link></div>
                ) : (
                  <div className="space-y-3">{savedJobs.map(job => <SavedJobCard key={job.id} job={job} onRemove={handleRemoveSavedJob} />)}</div>
                )}
              </CardContent>
            </Card>

            {/* 🔥 Offres recommandées (personnalisées) */}
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-2">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-blue-600" />{t('candidateDashboard.selected.title', 'Offres sélectionnées pour vous')}</CardTitle>
                  <CardDescription>{t('candidateDashboard.selected.subtitle', 'Basé sur votre profil et vos préférences')}</CardDescription>
                </div>
                <Link to="/dashboard/candidat/offres-recommandees" className="w-full sm:w-auto">
                  <Button variant="ghost" size="sm" className="w-full sm:w-auto min-h-[44px]">
                    {t('candidateDashboard.selected.viewAll', 'Voir toutes les offres')}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {loadingRecommended ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                ) : recommendedJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600 mb-4">{t('candidateDashboard.selected.empty', 'Complétez votre profil pour voir des offres correspondant à vos critères.')}</p>
                    <Link to="/profil"><Button variant="outline" className="min-h-[44px]">{t('candidateDashboard.selected.completeProfile', 'Compléter mon profil')}</Button></Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recommendedJobs.map(job => (
                      <Link to={`/emplois/${job.id}`} key={job.id} className="block p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-900 line-clamp-1">{job.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-1">{job.company?.name}</p>
                          </div>
                          <Badge className={job.matchScore >= 3 ? 'bg-green-100 text-green-700 border-0' : job.matchScore >= 2 ? 'bg-blue-100 text-blue-700 border-0' : 'bg-slate-100 text-slate-600 border-0'}>
                            {job.matchScore >= 3 && <><Star className="w-3 h-3 mr-1" />{t('candidateDashboard.selected.excellent', 'Excellent')}</>}
                            {job.matchScore === 2 && <><ThumbsUp className="w-3 h-3 mr-1" />{t('candidateDashboard.selected.good', 'Bon')}</>}
                            {job.matchScore === 1 && <><TrendingUp className="w-3 h-3 mr-1" />{t('candidateDashboard.selected.partial', 'Potentiel')}</>}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city?.name || t('common.unspecified')}</span>
                          {job.salary_min && job.salary_max && (
                            <span className="flex items-center gap-1"><Banknote className="w-3 h-3" />{format(job.salary_min)} – {format(job.salary_max)}{formatSalaryPeriod(job.salary_period, t)}</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="pb-2"><CardTitle className="text-lg flex items-center gap-2"><Mail className="w-5 h-5 text-blue-600" />{t('candidateDashboard.adminMessages.title')}</CardTitle><CardDescription>{t('candidateDashboard.adminMessages.description')}</CardDescription></CardHeader>
              <CardContent className="p-4 sm:p-6"><UserMessages userId={user?.id} /></CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <ProfileCompletionWidget completion={profileCompletion} />
            <Card className="border-slate-200 overflow-hidden">
              <CardHeader className="pb-2"><CardTitle className="text-base">{t('candidateDashboard.quickActions.title')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Link to="/profil" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"><div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><Upload className="w-5 h-5 text-blue-600" /></div><div className="min-w-0"><p className="font-medium text-slate-900">{t('candidateDashboard.quickActions.updateCV')}</p><p className="text-xs text-slate-500">{t('candidateDashboard.quickActions.updateCVDesc')}</p></div></Link>
                <Link to="/alertes" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"><div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-green-600" /></div><div className="min-w-0"><p className="font-medium text-slate-900">{t('candidateDashboard.quickActions.createAlert')}</p><p className="text-xs text-slate-500">{t('candidateDashboard.quickActions.createAlertDesc')}</p></div></Link>
                {/* Nouveau lien Mes suivis */}
                <Link to="/dashboard/candidat/suivis" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <Bell className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{t('candidateDashboard.quickActions.followedCompanies', 'Mes suivis')}</p>
                    <p className="text-xs text-slate-500">{t('candidateDashboard.quickActions.followedCompaniesDesc', 'Entreprises que vous suivez')}</p>
                  </div>
                </Link>
                <Link to="/parametres" className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]"><div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0"><Settings className="w-5 h-5 text-slate-600" /></div><div className="min-w-0"><p className="font-medium text-slate-900">{t('candidateDashboard.quickActions.settings')}</p><p className="text-xs text-slate-500">{t('candidateDashboard.quickActions.settingsDesc')}</p></div></Link>
                {/* Voir mon profil public */}
                <Link to={`/candidat/${user.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors min-h-[56px]">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                    <Eye className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {t('candidateDashboard.quickActions.viewPublicProfile', 'Voir mon profil public')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('candidateDashboard.quickActions.viewPublicProfileDesc', 'Aperçu visible par les recruteurs')}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
            {hiringDocuments.length > 0 && (
              <Card className="border-slate-200 overflow-hidden">
                <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />{t('candidateDashboard.hiringDocuments.title')}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{t('candidateDashboard.hiringDocuments.pendingCount', { count: hiringDocuments.filter(d => d.status === 'pending').length })}</p>
                  <Link to="/documents"><Button variant="outline" className="w-full min-h-[44px]"><Upload className="w-4 h-4 mr-2" />{t('candidateDashboard.hiringDocuments.uploadDocs')}</Button></Link>
                </CardContent>
              </Card>
            )}
            <Card className="border-blue-200 bg-blue-50 overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0"><BookOpen className="w-5 h-5 text-blue-600" /></div>
                  <div><h4 className="font-medium text-blue-900">{t('candidateDashboard.dailyTip.title')}</h4><p className="text-sm text-blue-700 mt-1">{getTip(profileCompletion)}</p></div>
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