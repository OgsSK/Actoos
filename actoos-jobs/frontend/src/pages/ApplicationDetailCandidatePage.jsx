import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Video, Target, Briefcase, Building2 } from 'lucide-react';
import { formatRelative } from '../lib/utils';

// ✅ Skeleton pour le détail de candidature
const ApplicationDetailSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-9 bg-slate-200 rounded w-24 mb-6" />
    <Card>
      <CardContent className="p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-slate-200 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="h-7 bg-slate-200 rounded w-3/4" />
            <div className="h-5 bg-slate-200 rounded w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 w-20 bg-slate-200 rounded-full" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
        <div className="pt-4 border-t">
          <div className="flex gap-3">
            <div className="h-10 bg-slate-200 rounded-xl w-32" />
            <div className="h-10 bg-slate-200 rounded-xl w-40" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

const ApplicationDetailCandidatePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchApplication = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        const { data, error } = await supabase
          .from('applications')
          .select('*, job:jobs(title, company:companies(name, logo_url))')
          .eq('id', id)
          .eq('candidate_id', user.id)
          .single();

        if (error) throw error;
        setApplication(data);
      } catch (err) {
        console.error(err);
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchApplication();
  }, [id, user]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ApplicationDetailSkeleton />
      </div>
    </div>
  );

  if (fetchError) return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-red-600">{t('common.error')}</p>
      </div>
    </div>
  );

  if (!application) return (
    <div className="pt-20 text-center">{t('applicationDetailCandidate.notFound')}</div>
  );

  const job = application.job;
  const statusLabel = t(`myApplications.status.${application.status}`, { defaultValue: application.status });
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    viewed: 'bg-blue-100 text-blue-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-green-100 text-green-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const statusColor = statusColors[application.status] || 'bg-yellow-100 text-yellow-700';

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/mes-candidatures">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" />{t('applicationDetailCandidate.back')}
          </Button>
        </Link>

        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden">
                {job?.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{job?.title || t('applicationDetailCandidate.jobDefault')}</h1>
                <p className="text-slate-600 flex items-center gap-1 mt-1">
                  <Briefcase className="w-4 h-4" /> {job?.company?.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={statusColor}>{statusLabel}</Badge>
                  <span className="text-xs text-slate-400">
                    {formatRelative(application.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {application.status === 'interview' && (
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
                {application.meeting_link && (
                  <a
                    href={application.meeting_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 text-sm font-medium"
                  >
                    <Video className="w-4 h-4" /> {t('applicationDetailCandidate.joinInterview')}
                  </a>
                )}
                <Link
                  to={`/preparation-entretien?job_id=${application.job_id}`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 text-sm font-medium"
                >
                  <Target className="w-4 h-4" /> {t('applicationDetailCandidate.prepareInterview')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplicationDetailCandidatePage;