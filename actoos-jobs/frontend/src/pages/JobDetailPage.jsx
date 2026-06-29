import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import ReportButton from '../components/ReportButton';

import { toast } from 'sonner';

import {
  MapPin,
  Building2,
  Banknote,
  Heart,
  Loader2,
  ChevronLeft,
  Briefcase,
} from 'lucide-react';

import { CONTRACT_TYPES } from '../lib/utils';

// ---------- SimpleJobCard (pour les suggestions) ----------
const SimpleJobCard = ({ job, t, format }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  return (
    <Link to={`/emplois/${job.id}`} className="block group h-full">
      <Card className="hover:shadow-md transition-shadow h-full">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              {job.company?.logo_url ? (
                <img src={job.company.logo_url} alt="" className="w-6 h-6 object-contain" />
              ) : (
                <Briefcase className="w-5 h-5 text-blue-600" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-slate-900 truncate group-hover:text-blue-600">
                {job.title}
              </h4>
              <p className="text-sm text-slate-500 truncate">{job.company?.name}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-500">
                {job.city?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />{job.city.name}
                  </span>
                )}
                <Badge className={`${contractInfo.color} text-xs shrink-0`}>{t(contractInfo.key)}</Badge>
                {job.salary_min && job.salary_max && (
                  <span className="font-medium text-slate-700 whitespace-nowrap">
                    {format(job.salary_min)} – {format(job.salary_max)}
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

const JobDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { format } = useCurrencyFormatter();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [similarJobs, setSimilarJobs] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const isCompany =
    user?.user_metadata?.role === 'company' ||
    user?.app_metadata?.role === 'company' ||
    user?.user_metadata?.account_type === 'company';

  const isOwner = user?.id && job?.company?.owner_id === user.id;

  // Réinitialisation à chaque changement d'id
  useEffect(() => {
    window.scrollTo(0, 0);
    setJob(null);
    setLoading(true);
    setSimilarJobs([]);
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (job && !isOwner) {
      supabase.rpc('increment_views_count', { row_id: job.id }).then(({ error }) => {
        if (error) console.error('Error incrementing views:', error);
      });
    }
  }, [job, isOwner]);

  useEffect(() => {
    if (user && job) {
      checkExistingApplication();
      checkIfSaved();
      if (!isOwner && !isCompany) {
        fetchMatchScore();
      }
    }
  }, [user, job, isOwner, isCompany]);

  const fetchJob = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          company:companies(*, owner:users(email)),
          city:cities(name),
          posted_by_user:users(email, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setJob(data);
    } catch (err) {
      console.error(err);
      toast.error(t('jobDetail.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const checkExistingApplication = async () => {
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('candidate_id', user.id)
      .maybeSingle();
    setHasApplied(!!data);
  };

  const checkIfSaved = async () => {
    const { data } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job.id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const fetchMatchScore = async () => {
    try {
      const res = await apiFetch(`/api/jobs/${job.id}/match-score?user_id=${user.id}`);
      if (res && res.score !== undefined) {
        setMatchScore(res.score);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Charger les offres similaires après le chargement de l'offre
  useEffect(() => {
    if (!job) return;
    setSimilarLoading(true);

    const fetchSimilar = async () => {
      try {
        const skills = job.skills_required || [];
        const categoryId = job.category_id;
        const contractType = job.contract_type;

        let query = supabase
          .from('jobs')
          .select('id, title, contract_type, salary_min, salary_max, company:companies(name, logo_url), city:cities(name)')
          .eq('status', 'active')
          .neq('id', job.id)
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(6);

        const conditions = [];
        if (categoryId) {
          conditions.push(`category_id.eq.${categoryId}`);
        }
        if (skills.length > 0) {
          conditions.push(`skills_required.ov.{${skills.join(',')}}`);
        }
        if (contractType) {
          conditions.push(`contract_type.eq.${contractType}`);
        }
        if (conditions.length > 0) {
          query = query.or(conditions.join(','));
        }

        const { data, error } = await query;
        if (error) throw error;
        setSimilarJobs(data || []);
      } catch (err) {
        console.error('Erreur chargement offres similaires:', err);
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchSimilar();
  }, [job]);

  const requireAuth = () => {
    if (!user) {
      toast.error(t('jobDetail.pleaseLogin'));
      window.location.href = '/connexion';
      return false;
    }
    return true;
  };

  const handleApply = async () => {
    if (!requireAuth()) return;
    if (isCompany) {
      toast.error(t('jobDetail.companyCannotApply'));
      return;
    }
    if (hasApplied) {
      toast.info(t('jobDetail.alreadyAppliedMessage'));
      return;
    }

    try {
      const { error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user.id,
          status: 'pending',
        });

      if (error) throw error;

      setHasApplied(true);
      toast.success(t('jobDetail.applicationSent'));

      try {
        const recruiterEmail = job.posted_by_user?.email || job.company?.owner?.email;
        const recruiterName = job.posted_by_user?.first_name
          ? `${job.posted_by_user.first_name} ${job.posted_by_user.last_name || ''}`
          : 'Recruteur';
        const candidateName = user.user_metadata?.first_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`
          : 'Un candidat';

        if (recruiterEmail) {
          await apiFetch('/api/notify-new-application', {
            method: 'POST',
            body: JSON.stringify({
              recruiter_email: recruiterEmail,
              recruiter_name: recruiterName,
              candidate_name: candidateName,
              job_title: job.title,
              company_name: job.company?.name || '',
            }),
          });
        }
      } catch (notifErr) {
        console.error("Échec de l'envoi de l'email de notification :", notifErr);
      }
    } catch (err) {
      console.error(err);
      toast.error(t('jobDetail.applicationError'));
    }
  };

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

  if (loading) {
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="pt-20 text-center">{t('jobDetail.notFoundMessage')}</div>
    );
  }

  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();

  return (
    <div key={id} className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8 overflow-x-hidden">
        <Link to="/emplois">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" /> {t('jobDetail.backToJobs')}
          </Button>
        </Link>

        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            {/* HEADER */}
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                {job.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-16 h-16 object-contain" />
                ) : (
                  <Building2 className="w-10 h-10 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0 w-full sm:w-auto">
                <div className="flex items-center flex-wrap gap-2 mb-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 break-words">{job.title}</h1>
                  {user?.role === 'candidate' && !isOwner && matchScore !== null && (
                    <Badge className="bg-blue-100 text-blue-700 text-sm px-3 py-1 shrink-0">
                      🎯 {t('jobDetail.matchScore', { score: matchScore })}
                    </Badge>
                  )}
                </div>
                <p className="text-lg text-slate-600">{job.company?.name}</p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Badge className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {job.city?.name || t('jobDetail.unspecified')}
                  </Badge>
                  <Badge className={contractInfo.color}>{t(contractInfo.key)}</Badge>
                  {job.salary_min && job.salary_max && (
                    <Badge variant="outline" className="flex items-center gap-1 whitespace-nowrap">
                      <Banknote className="w-3 h-3" />
                      {format(job.salary_min)} – {format(job.salary_max)}
                    </Badge>
                  )}
                  {isBoosted && (
                    <Badge className="bg-purple-100 text-purple-700 border border-purple-200 shrink-0">
                      🚀 {t('jobDetail.boosted')}
                    </Badge>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {!isOwner && !isCompany && !isAdmin && (
                  <>
                    {hasApplied ? (
                      <Badge className="bg-green-100 text-green-700 text-sm px-4 py-2 w-full sm:w-auto text-center shrink-0">
                        ✅ {t('jobDetail.alreadyApplied')}
                      </Badge>
                    ) : (
                      <Button
                        onClick={handleApply}
                        className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto text-white"
                      >
                        {t('jobDetail.apply')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleToggleSave}
                      className="w-full sm:w-auto"
                    >
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                    </Button>
                  </>
                )}
                {isOwner && (
                  <Badge variant="outline" className="text-sm w-full sm:w-auto text-center">
                    {t('jobDetail.yourOffer')}
                  </Badge>
                )}
              </div>

              {/* Signalement */}
              {!isOwner && user && !isAdmin && (
                <div className="w-full sm:w-auto mt-2 sm:mt-0">
                  <ReportButton itemType="job" itemId={job.id} reporterId={user.id} />
                </div>
              )}
            </div>

            {/* DESCRIPTION – avec gestion du responsive */}
            <div className="prose max-w-none break-words">
              <h2>{t('jobDetail.descriptionTitle')}</h2>
              <div className="whitespace-pre-line break-words">{job.description}</div>
              {job.responsibilities && (
                <>
                  <h3>{t('jobDetail.missionsTitle')}</h3>
                  <div className="whitespace-pre-line break-words">{job.responsibilities}</div>
                </>
              )}
              {job.requirements && (
                <>
                  <h3>{t('jobDetail.profileTitle')}</h3>
                  <div className="whitespace-pre-line break-words">{job.requirements}</div>
                </>
              )}
              {job.benefits && (
                <>
                  <h3>{t('jobDetail.benefitsTitle')}</h3>
                  <div className="whitespace-pre-line break-words">{job.benefits}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* OFFRES SIMILAIRES */}
        {similarLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : similarJobs.length > 0 ? (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {t('jobDetail.similarJobs', 'Offres similaires')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarJobs.map(simJob => (
                <SimpleJobCard key={simJob.id} job={simJob} t={t} format={format} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default JobDetailPage;