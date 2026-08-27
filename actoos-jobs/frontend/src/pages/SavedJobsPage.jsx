import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Loader2, ChevronLeft, Heart, MapPin, Banknote,
  RefreshCw, Building2
} from 'lucide-react';
import { CONTRACT_TYPES, formatSalaryPeriod } from '../lib/utils';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

// ✅ Skeleton pour une offre sauvegardée
const SavedJobSkeleton = () => (
  <Card className="animate-pulse">
    <CardContent className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-slate-200 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-slate-200 rounded w-3/4" />
          <div className="flex gap-2">
            <div className="h-4 bg-slate-200 rounded w-24" />
            <div className="h-4 bg-slate-200 rounded w-16" />
            <div className="h-4 bg-slate-200 rounded w-20" />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-5 w-16 bg-slate-200 rounded-full" />
          <div className="h-8 w-8 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const SavedJobsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrencyFormatter();

  const fetchSaved = () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('saved_jobs')
      .select('job:jobs(id, title, contract_type, salary_min, salary_max, salary_period, company:companies(name, logo_url), city:cities(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setJobs(data?.map(s => s.job).filter(Boolean) || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => { fetchSaved(); }, [user]);

  const handleRemove = async (jobId) => {
    await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
    setJobs(prev => prev.filter(j => j.id !== jobId));
  };

  const handleRefresh = () => {
    fetchSaved();
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="gap-1">
                <ChevronLeft className="w-4 h-4" />
                {t('savedJobs.back')}
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              {t('savedJobs.title')}
            </h1>
          </div>
          <Button variant="outline" onClick={handleRefresh} className="gap-2 w-full sm:w-auto">
            <RefreshCw className="w-4 h-4" /> {t('myApplications.refresh')}
          </Button>
        </div>

        {/* ✅ Squelettes pendant le chargement */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SavedJobSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Heart className="w-12 h-12 mx-auto mb-4" />
              {t('savedJobs.noSaved')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const contract = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
              return (
                <Card key={job.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Logo de l'entreprise */}
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {job.company?.logo_url ? (
                          <img
                            src={job.company.logo_url}
                            alt={job.company.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/emplois/${job.id}`}
                              className="font-medium hover:text-blue-600 text-sm sm:text-base line-clamp-2"
                            >
                              {job.title}
                            </Link>
                            <div className="text-xs sm:text-sm text-slate-500 flex flex-wrap gap-2 items-center mt-1">
                              <span>{job.company?.name}</span>
                              {job.city && (
                                <span className="flex items-center">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {job.city.name}
                                </span>
                              )}
                              {job.salary_min && job.salary_max && (
                                <span className="flex items-center gap-1">
                                  <Banknote className="w-3 h-3" />
                                  {format(job.salary_min)} – {format(job.salary_max)}
                                  {formatSalaryPeriod(job.salary_period, t)}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <Badge className={contract.color}>
                              {t(`contractTypes.${job.contract_type}`, { defaultValue: contract.label })}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemove(job.id)}
                              className="text-red-500 p-1"
                              title={t('savedJobs.remove')}
                            >
                              <Heart className="w-4 h-4 fill-current" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;