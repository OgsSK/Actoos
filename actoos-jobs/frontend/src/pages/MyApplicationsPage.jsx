import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, FileText, RefreshCw, Banknote } from 'lucide-react'; // Import Banknote
import { formatRelative } from '../lib/utils';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter'; // 👈 Hook de formatage

const MyApplicationsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { format } = useCurrencyFormatter(); // 👈 Initialisation

  const statusConfig = {
    pending: { label: t('myApplications.status.pending'), color: 'bg-yellow-100 text-yellow-700' },
    viewed: { label: t('myApplications.status.viewed'), color: 'bg-blue-100 text-blue-700' },
    shortlisted: { label: t('myApplications.status.shortlisted'), color: 'bg-purple-100 text-purple-700' },
    interview: { label: t('myApplications.status.interview'), color: 'bg-green-100 text-green-700' },
    accepted: { label: t('myApplications.status.accepted'), color: 'bg-green-100 text-green-700' },
    rejected: { label: t('myApplications.status.rejected'), color: 'bg-red-100 text-red-700' },
  };

  const fetchApplications = () => {
    setLoading(true);
    supabase
      .from('applications')
      // Ajout de salary_min et salary_max dans la jointure job
      .select('*, job:jobs(title, salary_min, salary_max, company:companies(name))')
      .eq('candidate_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setApplications(data || []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const handleRefresh = () => {
    fetchApplications();
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/dashboard"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />{t('myApplications.back')}</Button></Link>
            <h1 className="text-2xl font-bold text-slate-900">{t('myApplications.title')}</h1>
          </div>
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" /> {t('myApplications.refresh')}
          </Button>
        </div>
        {applications.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-4" />{t('myApplications.noApplications')}</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.pending;
              // Récupération des infos salaire
              const salaryMin = app.job?.salary_min;
              const salaryMax = app.job?.salary_max;
              const hasSalary = salaryMin != null && salaryMax != null;

              return (
                <Link key={app.id} to={`/mes-candidatures/${app.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium hover:text-blue-600">{app.job?.title || t('myApplications.jobDefault')}</p>
                        <p className="text-sm text-slate-500">{app.job?.company?.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className={status.color}>{status.label}</Badge>
                          {hasSalary && (
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <Banknote className="w-3 h-3" />
                              {format(salaryMin)} – {format(salaryMax)}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{formatRelative(app.created_at)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyApplicationsPage;