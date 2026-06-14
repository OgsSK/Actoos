import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Users, Trash2 } from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { toast } from 'sonner';

const CompanyApplicationsPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && activeCompanyId) fetchApplications();
  }, [user, activeCompanyId]);

  const fetchApplications = async () => {
    if (!activeCompanyId) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', activeCompanyId);

    if (!jobs?.length) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const jobIds = jobs.map(j => j.id);

    const { data } = await supabase
      .from('applications')
      .select('*, candidate:users(first_name, last_name, email), job:jobs(title)')
      .in('job_id', jobIds)
      .order('created_at', { ascending: false });

    setApplications(data || []);
    setLoading(false);
  };

  const handleDeleteApplication = async (appId) => {
    if (!window.confirm(t('companyApplications.deleteConfirm'))) return;

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', appId);

      if (error) throw error;

      toast.success(t('companyApplications.toasts.deleted'));
      setApplications((prev) => prev.filter((app) => app.id !== appId));
    } catch (err) {
      console.error(err);
      toast.error(err.message || t('companyApplications.toasts.deleteError'));
    }
  };

  if (loading) {
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/dashboard/entreprise">
            <Button variant="ghost">
              <ChevronLeft className="w-4 h-4 mr-2" />
              {t('companyApplications.back')}
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{t('companyApplications.title')}</h1>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4" />
              {t('companyApplications.noApplications')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const statusLabel = t(`companyApplications.status.${app.status}`, { defaultValue: app.status });
              const statusColors = {
                pending: 'bg-blue-100 text-blue-700',
                viewed: 'bg-slate-100 text-slate-700',
                shortlisted: 'bg-purple-100 text-purple-700',
                interview: 'bg-green-100 text-green-700',
                accepted: 'bg-green-100 text-green-700',
                rejected: 'bg-red-100 text-red-700',
              };
              const statusColor = statusColors[app.status] || 'bg-slate-100 text-slate-700';

              return (
                <Card key={app.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Link
                      to={`/dashboard/entreprise/candidatures/${app.id}`}
                      className="flex-1 min-w-0 flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {app.job?.title}
                        </p>
                      </div>
                      <Badge className={statusColor}>{statusLabel}</Badge>
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {formatRelative(app.created_at)}
                      </span>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteApplication(app.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('companyApplications.deleteButton')}
                    </Button>
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

export default CompanyApplicationsPage;