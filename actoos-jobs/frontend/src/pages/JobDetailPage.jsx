import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import ReportButton from '../components/ReportButton';
import ShareButton from '../components/ShareButton';
import { toast } from 'sonner';
import {
  MapPin, Building2, Banknote, Heart, Loader2, ChevronLeft,
  Briefcase, CheckCircle, Clock, Send,
  Users, GraduationCap, Globe, Eye
} from 'lucide-react';
import { CONTRACT_TYPES, EXPERIENCE_LEVELS, formatSalaryPeriod } from '../lib/utils';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

// ✅ Fonction de formatage des nombres (10K, 1.2M, etc.)
const formatCount = (num) => {
  if (!num || num < 10000) return num?.toString() || '0';
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${val}M`;
  }
  const val = (num / 1000).toFixed(1).replace(/\.0$/, '');
  return `${val}K`;
};

// Skeleton pour l'en-tête
const JobHeaderSkeleton = () => (
  <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100 animate-pulse">
    <div className="p-6 sm:p-8 border-b border-slate-100">
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-7 bg-slate-100 rounded w-3/4" />
          <div className="h-5 bg-slate-100 rounded w-1/2" />
          <div className="flex gap-2">
            <div className="h-6 bg-slate-100 rounded w-20" />
            <div className="h-6 bg-slate-100 rounded w-16" />
            <div className="h-6 bg-slate-100 rounded w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-9 bg-slate-100 rounded w-24" />
          <div className="h-9 bg-slate-100 rounded w-9" />
        </div>
      </div>
    </div>
    <div className="p-6 sm:p-8 space-y-4">
      <div className="h-4 bg-slate-100 rounded w-1/4" />
      <div className="h-4 bg-slate-100 rounded w-full" />
      <div className="h-4 bg-slate-100 rounded w-5/6" />
      <div className="h-4 bg-slate-100 rounded w-2/3" />
    </div>
  </div>
);

/* ---------- Carte offre similaire ---------- */
const SimpleJobCard = ({ job, t, format, applicationStatus }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  return (
    <Link to={`/emplois/${job.id}`} className="block group w-full h-full relative">
      {applicationStatus && applicationStatus !== 'rejected' && applicationStatus !== 'withdrawn' && (
        <Badge className="absolute top-2 left-2 bg-emerald-50 text-emerald-700 text-xs font-medium z-10 rounded-full px-3 py-1 border border-emerald-200 shadow-sm">
          {t('jobs.alreadyAppliedBadge', 'Postulé')}
        </Badge>
      )}
      <Card className="hover:shadow-md transition-shadow h-full overflow-hidden">
        <CardContent className="p-3 sm:p-4 flex flex-col h-full min-w-0">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 overflow-hidden">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Briefcase className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-slate-900 group-hover:text-blue-600 text-sm sm:text-base truncate">
                {job.title}
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 truncate">{job.company?.name}</p>
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1.5 text-xs text-slate-500">
                {job.city?.name && (
                  <span className="flex items-center gap-0.5 truncate max-w-[60px] sm:max-w-none">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{job.city.name}</span>
                  </span>
                )}
                <Badge className={`${contractInfo.color} text-xs shrink-0`}>{t(contractInfo.key)}</Badge>
                {job.salary_min && job.salary_max && (
                  <span className="font-medium text-slate-700 text-[11px] sm:text-sm flex flex-wrap items-center gap-0.5">
                    {format(job.salary_min)} – {format(job.salary_max)}
                    <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                      {formatSalaryPeriod(job.salary_period, t)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

// ---------- Composant principal ----------
const JobDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { format } = useCurrencyFormatter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarApplications, setSimilarApplications] = useState({});

  // ✅ Ref pour éviter les doubles incréments (StrictMode)
  const hasRecordedView = useRef(false);

  const isCompany = user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company' || user?.user_metadata?.account_type === 'company';
  const isOwner = user?.id && job?.company?.owner_id === user.id;

  // Chargement initial
  useEffect(() => {
    window.scrollTo(0, 0);
    setJob(null);
    setLoading(true);
    setSimilarJobs([]);
    fetchJob();
    // Réinitialiser le flag pour une nouvelle offre
    hasRecordedView.current = false;
  }, [id]);

  // ✅ Incrémentation des vues – version PRO avec retour du compteur
  useEffect(() => {
    if (!job || isOwner) return;
    if (hasRecordedView.current) {
      console.log('⏳ Vue déjà comptée pour', job.title);
      return;
    }

    const recordView = async () => {
      let incremented = false;
      let newCount = null;

      if (user) {
        // Utilisateur connecté : utiliser la table job_views
        try {
          console.log('📊 Tentative d\'incrément via RPC pour', job.title);
          const { data, error } = await supabase.rpc('increment_view_if_not_exists', {
            p_job_id: job.id,
            p_user_id: user.id
          });
          if (error) throw error;
          // Si la RPC retourne le nouveau compteur (nombre)
          if (typeof data === 'number') {
            incremented = true;
            newCount = data;
            console.log('✅ Vue enregistrée via RPC, nouveau compteur :', newCount);
          } else if (data === true) {
            // Fallback si la RPC retourne un booléen (ancienne version)
            incremented = true;
            // Dans ce cas, on devra récupérer le compteur après
          } else {
            console.log('⏳ Vue déjà existante (RPC) pour', job.title);
          }
        } catch (err) {
          console.error('Erreur RPC:', err);
          // Fallback localStorage
          const viewedJobs = JSON.parse(localStorage.getItem('viewedJobs') || '[]');
          if (!viewedJobs.includes(job.id)) {
            try {
              const { error } = await supabase.rpc('increment_views_count', { row_id: job.id });
              if (error) throw error;
              viewedJobs.push(job.id);
              localStorage.setItem('viewedJobs', JSON.stringify(viewedJobs));
              incremented = true;
              console.log('✅ Vue enregistrée en local (fallback) pour', job.title);
            } catch (err2) {
              console.error('Erreur fallback:', err2);
            }
          }
        }
      } else {
        // Utilisateur non connecté : localStorage
        const viewedJobs = JSON.parse(localStorage.getItem('viewedJobs') || '[]');
        if (!viewedJobs.includes(job.id)) {
          try {
            const { error } = await supabase.rpc('increment_views_count', { row_id: job.id });
            if (error) throw error;
            viewedJobs.push(job.id);
            localStorage.setItem('viewedJobs', JSON.stringify(viewedJobs));
            incremented = true;
            console.log('✅ Vue enregistrée en local pour', job.title);
          } catch (err) {
            console.error('Erreur incrément views (localStorage):', err);
          }
        }
      }

      // ✅ Mise à jour de l'affichage si une vue a été comptée
      if (incremented) {
        if (newCount !== null) {
          // On a déjà le nouveau compteur via la RPC
          setJob(prev => ({ ...prev, views_count: newCount }));
          console.log('🔄 Compteur mis à jour directement :', newCount);
        } else {
          // Sinon, on le récupère en base (fallback ou ancienne RPC)
          try {
            const { data, error } = await supabase
              .from('jobs')
              .select('views_count')
              .eq('id', job.id)
              .single();
            if (!error && data) {
              setJob(prev => ({ ...prev, views_count: data.views_count }));
              console.log('🔄 Compteur mis à jour après requête :', data.views_count);
            }
          } catch (err) {
            console.error('Erreur lors du rafraîchissement du compteur:', err);
          }
        }
      }
    };

    recordView();
    hasRecordedView.current = true; // on marque comme compté pour cette offre

  }, [job, isOwner, user]);

  // Vérification des candidatures et favoris
  useEffect(() => {
    if (user && job) {
      checkExistingApplication();
      checkIfSaved();
    }
  }, [user, job]);

  // ---------- REQUÊTE pour récupérer l'offre ----------
  const fetchJob = async () => {
    setLoading(true);
    try {
      let jobData;
      // Tentative avec views_count et cover_url
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            address,
            views_count,
            cover_url,
            company:companies(*),
            city:cities(name),
            posted_by_user:users(email, first_name, last_name)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        jobData = data;
      } catch (err) {
        console.warn('views_count or cover_url column may not exist, retrying without them', err);
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            *,
            address,
            company:companies(*),
            city:cities(name),
            posted_by_user:users(email, first_name, last_name)
          `)
          .eq('id', id)
          .single();
        if (error) throw error;
        jobData = { ...data, views_count: 0, cover_url: null };
      }

      // Compter les favoris
      let favoritesCount = 0;
      if (jobData) {
        const { count, error: countError } = await supabase
          .from('saved_jobs')
          .select('id', { count: 'exact', head: true })
          .eq('job_id', jobData.id);
        if (!countError) favoritesCount = count || 0;
      }

      setJob({ ...jobData, favorites_count: favoritesCount });
    } catch (err) {
      console.error(err);
      toast.error(t('jobDetail.notFound'));
    } finally {
      setLoading(false);
    }
  };

  // ---------- Vérification candidature existante ----------
  const checkExistingApplication = async () => {
    if (!user) return;
    setLoadingApplication(true);
    const { data } = await supabase
      .from('applications')
      .select('status')
      .eq('job_id', job.id)
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setApplicationStatus(data ? data.status : null);
    setLoadingApplication(false);
  };

  // ---------- Vérification si l'offre est en favoris ----------
  const checkIfSaved = async () => {
    const { data } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job.id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  // ---------- Chargement des offres similaires ----------
  useEffect(() => {
    if (!job) return;
    setSimilarLoading(true);
    const fetchSimilar = async () => {
      try {
        const skills = job.skills_required || [],
              categoryId = job.category_id,
              contractType = job.contract_type;
        let query = supabase
          .from('jobs')
          .select('id, title, contract_type, salary_min, salary_max, salary_period, company:companies(name, logo_url), city:cities(name)')
          .eq('status', 'active')
          .neq('id', job.id)
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(6);

        const conditions = [];
        if (categoryId) conditions.push(`category_id.eq.${categoryId}`);
        if (skills.length > 0) conditions.push(`skills_required.ov.{${skills.join(',')}}`);
        if (contractType) conditions.push(`contract_type.eq.${contractType}`);
        if (conditions.length > 0) query = query.or(conditions.join(','));

        const { data, error } = await query;
        if (error) throw error;
        setSimilarJobs(data || []);

        if (user && data?.length) {
          const { data: apps } = await supabase
            .from('applications')
            .select('job_id, status')
            .eq('candidate_id', user.id)
            .in('job_id', data.map(j => j.id));
          const map = {};
          (apps || []).forEach(a => map[a.job_id] = a.status);
          setSimilarApplications(map);
        } else {
          setSimilarApplications({});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSimilarLoading(false);
      }
    };
    fetchSimilar();
  }, [job, user]);

  // ---------- Utilitaires d'authentification ----------
  const requireAuth = () => {
    if (!user) {
      toast.error(t('jobDetail.pleaseLogin'));
      window.location.href = '/connexion';
      return false;
    }
    return true;
  };

  // ---------- Gestion de la candidature ----------
  const handleApply = async () => {
    if (!requireAuth()) return;
    if (isCompany) {
      toast.error(t('jobDetail.companyCannotApply'));
      return;
    }
    if (applicationStatus === 'accepted' || applicationStatus === 'completed') {
      toast.info(t('jobDetail.alreadyAppliedMessage'));
      return;
    }
    try {
      if (applicationStatus === 'rejected' || applicationStatus === 'withdrawn') {
        await supabase
          .from('applications')
          .update({ status: 'pending' })
          .eq('job_id', job.id)
          .eq('candidate_id', user.id);
      } else {
        await supabase
          .from('applications')
          .insert({ job_id: job.id, candidate_id: user.id, status: 'pending' });
      }
      setApplicationStatus('pending');
      toast.success(t('jobDetail.applicationSent'));

      // Envoi d'une notification au recruteur (asynchrone)
      setTimeout(async () => {
        const recruiterEmail = job.posted_by_user?.email || job.company?.owner?.email;
        const recruiterName = job.posted_by_user?.first_name
          ? `${job.posted_by_user.first_name} ${job.posted_by_user.last_name || ''}`
          : 'Recruteur';
        const candidateName = user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : 'Un candidat';
        if (recruiterEmail) {
          try {
            await fetch(`${BASE_URL}/api/notify-new-application`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recruiter_email: recruiterEmail,
                recruiter_name: recruiterName,
                candidate_name: candidateName,
                job_title: job.title,
                company_name: job.company?.name || ''
              })
            });
          } catch (err) {
            console.warn('Notification échouée:', err);
          }
        }
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error(t('jobDetail.applicationError'));
    }
  };

  // ---------- Gestion des favoris ----------
  const handleToggleSave = async () => {
    if (!requireAuth()) return;
    if (isCompany) {
      toast.error(t('jobDetail.companyCannotSaveFavorites'));
      return;
    }
    try {
      if (isSaved) {
        await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', job.id);
        setIsSaved(false);
        toast.success(t('jobDetail.removedFromFavorites'));
      } else {
        await supabase
          .from('saved_jobs')
          .insert({ user_id: user.id, job_id: job.id });
        setIsSaved(true);
        toast.success(t('jobDetail.savedToFavorites'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('jobDetail.errorSaving'));
    }
  };

  // États de chargement et d'absence d'offre
  if (loading) return <JobHeaderSkeleton />;
  if (!job) return <div className="pt-20 text-center">{t('jobDetail.notFoundMessage')}</div>;

  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();
  const hasCover = !!job.cover_url;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        <Link to="/emplois" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 group">
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          {t('jobDetail.backToJobs')}
        </Link>

        {/* Carte principale */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {/* === IMAGE DE COUVERTURE === */}
          {hasCover && (
            <div className="relative w-full h-48 sm:h-56 md:h-64 overflow-hidden">
              <img
                src={job.cover_url}
                alt="Couverture"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
            </div>
          )}

          <div className="p-6 sm:p-8 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                {job.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 sm:w-10 sm:h-10 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-2 text-slate-600 text-lg">
                  <Link to={`/entreprises/${job.company?.id}`} className="font-medium hover:text-blue-600 transition-colors">
                    {job.company?.name}
                  </Link>
                  {job.company?.is_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Badge className="bg-slate-100 text-slate-700 border-0">
                    <MapPin className="w-3.5 h-3.5 mr-1" />{job.city?.name || t('jobDetail.unspecified')}
                  </Badge>
                  {job.address && (
                    <Badge className="bg-slate-50 text-slate-600 border border-slate-200">
                      <MapPin className="w-3.5 h-3.5 mr-1" />
                      {job.address}
                    </Badge>
                  )}
                  <Badge className={`${contractInfo.color} border-0`}>{t(contractInfo.key)}</Badge>
                  {job.salary_min && job.salary_max && (
                    <Badge variant="outline" className="border-slate-200 text-slate-700">
                      <Banknote className="w-3.5 h-3.5 mr-1" />
                      {format(job.salary_min)} – {format(job.salary_max)}
                      {formatSalaryPeriod(job.salary_period, t)}
                    </Badge>
                  )}
                  {isBoosted && <Badge className="bg-purple-100 text-purple-700 border-purple-200">🚀 {t('jobDetail.boosted')}</Badge>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                {!isOwner && !isCompany && !isAdmin && (
                  <>
                    {user && loadingApplication ? (
                      <div className="flex items-center justify-center w-28 h-9">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : applicationStatus && applicationStatus !== 'rejected' && applicationStatus !== 'withdrawn' ? (
                      <Badge className="bg-emerald-50 text-emerald-700 whitespace-nowrap px-3 py-1 text-xs font-medium rounded-full border border-emerald-200 shadow-sm">
                        <CheckCircle className="w-3 h-3 mr-1 inline" />
                        {t('jobDetail.alreadyApplied')}
                      </Badge>
                    ) : (
                      <Button
                        onClick={handleApply}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all duration-200 rounded-xl"
                        size="sm"
                      >
                        <Send className="w-4 h-4 mr-1.5" />
                        {applicationStatus ? t('jobDetail.reapply', 'Repostuler') : t('jobDetail.apply', 'Postuler')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleSave}
                      className={isSaved ? 'bg-red-50 text-red-600 border-red-200' : ''}
                      aria-label={isSaved ? t('jobDetail.saved', 'Sauvegardé') : t('jobDetail.save', 'Sauvegarder')}
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                    </Button>
                  </>
                )}
                {isOwner && <Badge variant="outline" className="text-sm whitespace-nowrap">{t('jobDetail.yourOffer')}</Badge>}
                {!isOwner && user && !isAdmin && <ReportButton itemType="job" itemId={job.id} reporterId={user.id} />}
              </div>
            </div>

            {/* ✅ Statistiques : uniquement les icônes + chiffres formatés */}
            <div className="flex items-center gap-4 mt-4 text-sm text-slate-500 border-t border-slate-100 pt-4">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {formatCount(job.views_count)}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {formatCount(job.favorites_count)}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <ShareButton
                url={window.location.origin + `/emplois/${job.id}`}
                title={job.title}
                text={t('jobDetail.shareText', { title: job.title, company: job.company?.name })}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div className="prose prose-slate max-w-none">
              <h2 className="text-xl font-semibold text-slate-900">{t('jobDetail.descriptionTitle')}</h2>
              <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.description}</div>

              {job.responsibilities && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mt-6">{t('jobDetail.missionsTitle')}</h3>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.responsibilities}</div>
                </>
              )}
              {job.requirements && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mt-6">{t('jobDetail.profileTitle')}</h3>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.requirements}</div>
                </>
              )}
              {job.benefits && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mt-6">{t('jobDetail.benefitsTitle')}</h3>
                  <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">{job.benefits}</div>
                </>
              )}

              {job.skills_required && job.skills_required.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mt-6">{t('createJob.sections.skills')}</h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.skills_required.map((skill) => (
                      <Badge key={skill} className="bg-blue-50 text-blue-700 border border-blue-200">{skill}</Badge>
                    ))}
                  </div>
                </>
              )}

              {job.eligibility_criteria?.languages?.length > 0 && (
                <>
                  <h3 className="text-lg font-semibold text-slate-900 mt-6">
                    <Globe className="w-5 h-5 inline mr-2 text-blue-600" />
                    {t('createJob.sections.languages', 'Langues requises')}
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {job.eligibility_criteria.languages.map((lang) => (
                      <Badge key={lang.code} className="bg-purple-50 text-purple-700 border border-purple-200">
                        {lang.code}
                        <span className="ml-1 text-xs text-purple-500">- {t(`languageLevel.${lang.level}`, lang.level)}</span>
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {job.positions_count > 0 && (
                <div className="flex items-center gap-2 mt-6 text-slate-700">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{t('createJob.labels.positionsCount')} : {job.positions_count}</span>
                </div>
              )}

              {job.experience_level && (
                <div className="flex items-center gap-2 mt-6 text-slate-700">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{t('createJob.labels.experienceLevel')} : {t(EXPERIENCE_LEVELS[job.experience_level]?.key || job.experience_level)}</span>
                </div>
              )}

              {job.is_remote && (
                <div className="flex items-center gap-2 mt-6 text-slate-700">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">{t('createJob.labels.remote')} : {job.remote_type === 'full' ? t('createJob.options.remoteFull') : job.remote_type === 'partial' ? t('createJob.options.remoteHybrid') : t('createJob.options.remoteOccasional')}</span>
                </div>
              )}

              {job.is_urgent && (
                <div className="flex items-center gap-2 mt-6 text-red-600">
                  <Clock className="w-5 h-5" />
                  <span className="font-medium">{t('createJob.labels.urgent')}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Offres similaires */}
        {similarLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
        ) : similarJobs.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">{t('jobDetail.similarJobs', 'Offres similaires')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {similarJobs.map(simJob => (
                <SimpleJobCard
                  key={simJob.id}
                  job={simJob}
                  t={t}
                  format={format}
                  applicationStatus={similarApplications[simJob.id] || null}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JobDetailPage;