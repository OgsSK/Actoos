import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Users } from 'lucide-react';
import { formatRelative } from '../lib/utils';

const statusConfig = {
  pending: { label: 'Nouvelle', color: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Vue', color: 'bg-slate-100 text-slate-700' },
  shortlisted: { label: 'Présélectionné', color: 'bg-purple-100 text-purple-700' },
  interview: { label: 'Entretien', color: 'bg-green-100 text-green-700' },
  accepted: { label: 'Accepté', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-700' },
};

const CompanyApplicationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    setLoading(true);
    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (!company) {
      setApplications([]);
      setLoading(false);
      return;
    }

    const { data: jobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('company_id', company.id);

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
              Retour
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">Toutes les candidatures</h1>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-4" />
              Aucune candidature.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.pending;
              return (
                <Link
                  key={app.id}
                  to={`/dashboard/entreprise/candidatures/${app.id}`}
                  className="block"
                >
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900">
                          {app.candidate?.first_name} {app.candidate?.last_name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">
                          {app.job?.title}
                        </p>
                      </div>
                      <Badge className={status.color}>{status.label}</Badge>
                      <span className="text-xs text-slate-400 hidden sm:block">
                        {formatRelative(app.created_at)}
                      </span>
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

export default CompanyApplicationsPage;