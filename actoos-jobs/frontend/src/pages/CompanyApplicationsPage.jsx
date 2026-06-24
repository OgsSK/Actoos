import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Users, Trash2, AlertTriangle } from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { toast } from 'sonner';

const CompanyApplicationsPage = () => {
  const { t } = useTranslation();
  const { user, profile, activeCompanyId, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  // Vérification du compte utilisateur et de l'entreprise
  useEffect(() => {
    if (!user) return;
    if (!profile?.is_active || profile?.is_banned) {
      signOut();
      navigate('/connexion?reason=suspended', { replace: true });
      return;
    }
    if (activeCompanyId) {
      supabase
        .from('companies')
        .select('is_active')
        .eq('id', activeCompanyId)
        .single()
        .then(({ data }) => {
          setCompany(data);
          if (data && !data.is_active) {
            toast.error(t('companyApplications.companySuspended'));
            navigate('/dashboard/entreprise');
          }
        });
    }
  }, [user, profile, activeCompanyId, signOut, navigate, t]);

  useEffect(() => {
    if (user && activeCompanyId && profile?.is_active && !profile?.is_banned && company?.is_active !== false) {
      fetchApplications();
    } else if (!activeCompanyId) {
      setApplications([]);
      setLoading(false);
    }
  }, [user, activeCompanyId, profile, company]);

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

  const isAccountRestricted = !profile?.is_active || profile?.is_banned;
  const isCompanyInactive = company && !company.is_active;

  if (isAccountRestricted || isCompanyInactive) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {isAccountRestricted ? t('companyApplications.accountSuspended') : t('companyApplications.companySuspended')}
          </h1>
          <p className="text-slate-600">
            {t('companyApplications.suspendedDescription')}
          </p>
          <Link to="/dashboard/entreprise">
            <Button variant="outline" className="mt-6">
              {t('companyApplications.backToDashboard')}
            </Button>
          </Link>
        </div>
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