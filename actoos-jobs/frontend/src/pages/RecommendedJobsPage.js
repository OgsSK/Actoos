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
  Star, ThumbsUp, TrendingUp,
} from 'lucide-react';

const RecommendedJobsPage = () => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { format } = useCurrencyFormatter();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !profile) return;
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, title, salary_min, salary_max, skills_required, is_remote, city_id, company:companies(name, logo_url), city:cities(name)')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;

        const candSkills = profile.candidate_profile?.skills || [];
        const candCity = profile.city_id;
        const candRemote = profile.candidate_profile?.is_open_to_remote || false;
        const candSalaryMin = profile.candidate_profile?.desired_salary_min;
        const candSalaryMax = profile.candidate_profile?.desired_salary_max;

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
        <Badge className="bg-green-100 text-green-700 border-0">
          <Star className="w-3 h-3 mr-1" />
          {t('candidateDashboard.selected.excellent', 'Excellent')}
        </Badge>
      );
    if (score >= 2)
      return (
        <Badge className="bg-blue-100 text-blue-700 border-0">
          <ThumbsUp className="w-3 h-3 mr-1" />
          {t('candidateDashboard.selected.good', 'Bon')}
        </Badge>
      );
    return (
      <Badge className="bg-slate-100 text-slate-600 border-0">
        <TrendingUp className="w-3 h-3 mr-1" />
        {t('candidateDashboard.selected.partial', 'Potentiel')}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/dashboard/candidat"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('applicationDetail.back')}
        </Link>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">
          {t('candidateDashboard.selected.title', 'Offres sélectionnées pour vous')}
        </h1>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            {t('candidateDashboard.selected.empty', 'Complétez votre profil pour voir des offres correspondant à vos critères.')}
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <Link
                to={`/emplois/${job.id}`}
                key={job.id}
                className="block p-5 bg-white rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 line-clamp-1">{job.title}</h3>
                    <p className="text-sm text-slate-500">{job.company?.name}</p>
                  </div>
                  {getBadge(job.matchScore)}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {job.city?.name || t('common.unspecified')}
                  </span>
                  {job.salary_min && job.salary_max && (
                    <span className="flex items-center gap-1">
                      <Banknote className="w-3 h-3" />
                      {format(job.salary_min)} – {format(job.salary_max)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendedJobsPage;