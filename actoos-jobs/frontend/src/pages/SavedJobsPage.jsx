import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Heart, MapPin, Banknote } from 'lucide-react';
import { CONTRACT_TYPES } from '../lib/utils';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

const SavedJobsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrencyFormatter();

  const fetchSaved = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_jobs')
      .select('job:jobs(id, title, contract_type, salary_min, salary_max, company:companies(name), city:cities(name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setJobs(data?.map(s => s.job).filter(Boolean) || []);
    setLoading(false);
  };

  useEffect(() => { fetchSaved(); }, [user]);

  const handleRemove = async (jobId) => {
    await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
    fetchSaved();
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />{t('savedJobs.back')}</Button></Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('savedJobs.title')}</h1>
        </div>
        {jobs.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500"><Heart className="w-12 h-12 mx-auto mb-4" />{t('savedJobs.noSaved')}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const contract = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
              return (
                <Card key={job.id}><CardContent className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <Link to={`/emplois/${job.id}`} className="font-medium hover:text-blue-600">{job.title}</Link>
                    <div className="text-sm text-slate-500 flex flex-wrap gap-2 items-center">
                      <span>{job.company?.name}</span>
                      {job.city && <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" />{job.city.name}</span>}
                      {job.salary_min && job.salary_max && (
                        <span className="flex items-center">
                          <Banknote className="w-3 h-3 mr-1" />
                          {format(job.salary_min)} – {format(job.salary_max)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge className={contract.color}>
                    {t(`contractTypes.${job.contract_type}`, { defaultValue: contract.label })}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(job.id)}
                    className="text-red-500"
                  >
                    <Heart className="w-4 h-4 fill-current" />
                  </Button>
                </CardContent></Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedJobsPage;