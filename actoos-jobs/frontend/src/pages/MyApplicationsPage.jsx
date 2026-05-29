import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, FileText, RefreshCw } from 'lucide-react';
import { formatRelative } from '../lib/utils';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  viewed: { label: 'Vue', color: 'bg-blue-100 text-blue-700' },
  shortlisted: { label: 'Présélectionné', color: 'bg-purple-100 text-purple-700' },
  interview: { label: 'Entretien', color: 'bg-green-100 text-green-700' },
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-700' },
};

const MyApplicationsPage = () => {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchApplications = () => {
    setLoading(true);
    supabase
      .from('applications')
      .select('*, job:jobs(title, company:companies(name))')
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
            <Link to="/dashboard"><Button variant="ghost"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>
            <h1 className="text-2xl font-bold text-slate-900">Mes candidatures</h1>
          </div>
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Actualiser
          </Button>
        </div>
        {applications.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-slate-500"><FileText className="w-12 h-12 mx-auto mb-4" />Aucune candidature.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => {
              const status = statusConfig[app.status] || statusConfig.pending;
              return (
                <Link key={app.id} to={`/mes-candidatures/${app.id}`} className="block">
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium hover:text-blue-600">{app.job?.title || 'Offre'}</p>
                        <p className="text-sm text-slate-500">{app.job?.company?.name}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <Badge className={status.color}>{status.label}</Badge>
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