import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Loader2, MapPin, Banknote, ChevronLeft,
  Star, ThumbsUp, TrendingUp, Briefcase, CheckCircle
} from 'lucide-react';
import { formatSalaryPeriod, CONTRACT_TYPES } from '../lib/utils';

// ✅ Skeleton pour une offre recommandée
const RecommendedJobSkeleton = () => (
  <div className="block p-5 bg-white rounded-xl border border-slate-200 animate-pulse">
    <div className="flex items-start justify-between gap-4 mb-2">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-slate-100 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-6 w-20 bg-slate-100 rounded-full" />
    </div>
    <div className="flex items-center gap-2">
      <div className="h-4 bg-slate-100 rounded w-24" />
      <div className="h-4 bg-slate-100 rounded w-32" />
    </div>
  </div>
);

const RecommendedJobsPage = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { format } = useCurrencyFormatter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appliedStatuses, setAppliedStatuses] = useState({});

  useEffect(() => {
    if (!user || !profile) {
      setLoading(false);
      return;
    }
    
    const fetchJobs = async () => {
      setLoading(true);
      try {
        // ✅ Récupérer toutes les offres actives d'un coup avec salary_period
        const { data, error } = await supabase
          .from('jobs')
          .select('id, title, salary_min, salary_max, salary_period, skills_required, is_remote, city_id, contract_type, company:companies(name, logo_url), city:cities(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        if (!data || data.length === 0) {
          setJobs([]);
          return;
        }

        // ✅ Récupérer les préférences du candidat
        const candSkills = profile.candidate_profile?.skills || [];
        const candCity = profile.city_id;
        const candRemote = profile.candidate_profile?.is_open_to_remote || false;
        const candSalaryMin = profile.candidate_profile?.desired_salary_min;
        const candSalaryMax = profile.candidate_profile?.desired_salary_max;

        // ✅ Filtrer et scorer côté client
        const filtered = data
          .filter(job => {
            const jobSkills = job.skills_required || [];
            const common = jobSkills.filter(skill => candSkills.includes(skill));
            if (common.length === 0) return false;

            const sameCity = candCity && job.city_id === candCity;
            const remoteOk = job.is_remote && candRemote;
            if (!sameCity && !remoteOk) return false;

            if (candSalaryMin && candSalaryMax && job.salary_min && job.salary_max) {
              if (candSalaryMin > job.salary_max || candSalaryMax < job.salary_min) return false;
            }
            return true;
          })
          .map(job => {
            const jobSkills = job.skills_required || [];
            const common = jobSkills.filter(skill => candSkills.includes(skill));
            return { ...job, matchScore: common.length };
          })
          .sort((a, b) => b.matchScore - a.matchScore);

        setJobs(filtered);

        // ✅ Récupérer les statuts de candidature pour ces offres
        if (filtered.length > 0) {
          const jobIds = filtered.map(j => j.id);
          const { data: apps, error: appsErr } = await supabase
            .from('applications')
            .select('job_id, status')
            .eq('candidate_id', user.id)
            .in('job_id', jobIds);
          if (!appsErr && apps) {
            const map = {};
            apps.forEach(app => { map[app.job_id] = app.status; });
            setAppliedStatuses(map);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchJobs();
  }, [user, profile]);

  const getBadge = (score) => {
    if (score >= 3)
      return (
        <Badge className="bg-green-100 text-green-700 border-0 flex items-center gap-1">
          <Star className="w-3 h-3" />
          {t('candidateDashboard.selected.excellent', 'Excellent')}
        </Badge>
      );
    if (score >= 2)
      return (
        <Badge className="bg-blue-100 text-blue-700 border-0 flex items-center gap-1">
          <ThumbsUp className="w-3 h-3" />
          {t('candidateDashboard.selected.good', 'Bon')}
        </Badge>
      );
    return (
      <Badge className="bg-slate-100 text-slate-600 border-0 flex items-center gap-1">
        <TrendingUp className="w-3 h-3" />
        {t('candidateDashboard.selected.partial', 'Potentiel')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/dashboard/candidat"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 group"
        >
          <ChevronLeft className="w-4 h-4 mr-1 group-hover:-translate-x-1 transition-transform" />
          {t('applicationDetail.back')}
        </Link>
        
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('candidateDashboard.selected.title', 'Offres sélectionnées pour vous')}
            </h1>
            <p className="text-slate-600 mt-1">
              {t('candidateDashboard.selected.subtitle', 'Basé sur votre profil et vos compétences')}
            </p>
          </div>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <RecommendedJobSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              {t('candidateDashboard.selected.emptyTitle', 'Aucune offre recommandée')}
            </h3>
            <p className="text-slate-600 max-w-md mx-auto">
              {t('candidateDashboard.selected.empty', 'Complétez votre profil pour voir des offres correspondant à vos critères.')}
            </p>
            <Link to="/profil" className="mt-6 inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                {t('candidateDashboard.selected.completeProfile', 'Compléter mon profil')}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => {
              const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
              const isApplied = appliedStatuses[job.id] && appliedStatuses[job.id] !== 'rejected' && appliedStatuses[job.id] !== 'withdrawn';
              return (
                <Link
                  to={`/emplois/${job.id}`}
                  key={job.id}
                  className="block bg-white rounded-2xl border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all duration-200 p-5 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-base sm:text-lg truncate">
                            {job.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1">{job.company?.name}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {getBadge(job.matchScore)}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-slate-500">
                        <span className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-xs">
                          <MapPin className="w-3 h-3" />
                          {job.city?.name || t('common.unspecified')}
                        </span>
                        <Badge className={`${contractInfo.color} border-0 text-xs`}>
                          {t(contractInfo.key)}
                        </Badge>
                        {job.salary_min && job.salary_max && (
                          <span className="flex items-center gap-1 bg-blue-50 text-blue-800 px-2.5 py-1 rounded-xl text-xs font-semibold whitespace-nowrap">
                            <Banknote className="w-3 h-3 text-blue-600" />
                            {format(job.salary_min)} – {format(job.salary_max)}
                            <span className="text-[9px] text-blue-500 font-normal ml-0.5">
                              {formatSalaryPeriod(job.salary_period, t)}
                            </span>
                          </span>
                        )}
                        {isApplied && (
                          <Badge className="bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-200 shadow-sm px-2 py-0.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {t('jobs.alreadyAppliedBadge')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedJobsPage;