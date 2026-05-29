import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, Video, Target, Briefcase, Building2 } from 'lucide-react';
import { formatRelative } from '../lib/utils';

const statusConfig = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  viewed: { label: 'Vue', color: 'bg-blue-100 text-blue-700' },
  shortlisted: { label: 'Présélectionné', color: 'bg-purple-100 text-purple-700' },
  interview: { label: 'Entretien', color: 'bg-green-100 text-green-700' },
  accepted: { label: 'Acceptée', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusée', color: 'bg-red-100 text-red-700' },
};

const ApplicationDetailCandidatePage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('applications')
      .select('*, job:jobs(title, company:companies(name, logo_url))')
      .eq('id', id)
      .eq('candidate_id', user.id)
      .single()
      .then(({ data }) => {
        setApplication(data);
        setLoading(false);
      });
  }, [id, user]);

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!application) return <div className="pt-20 text-center">Candidature introuvable.</div>;

  const job = application.job;
  const status = statusConfig[application.status] || statusConfig.pending;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link to="/mes-candidatures">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" />Retour à mes candidatures
          </Button>
        </Link>

        <Card>
          <CardContent className="p-6 sm:p-8 space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                {job?.company?.logo_url ? (
                  <img src={job.company.logo_url} alt={job.company.name} className="w-12 h-12 object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-slate-900">{job?.title || 'Offre'}</h1>
                <p className="text-slate-600 flex items-center gap-1 mt-1">
                  <Briefcase className="w-4 h-4" /> {job?.company?.name}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={status.color}>{status.label}</Badge>
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
                    <Video className="w-4 h-4" /> Rejoindre l'entretien
                  </a>
                )}
                <Link
                  to={`/preparation-entretien?job_id=${application.job_id}`}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 text-sm text-white font-medium"
                >
                  <Target className="w-4 h-4" /> Préparer l'entretien
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