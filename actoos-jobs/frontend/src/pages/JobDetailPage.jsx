import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  MapPin, Briefcase, Building2, Clock, Banknote, Calendar,
  CheckCircle, Heart, Share2, Loader2, ChevronLeft, Flag
} from 'lucide-react';
import { formatRelative, formatDate, CONTRACT_TYPES } from '../lib/utils';

const JobDetailPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [id]);

  useEffect(() => {
    if (user && job) {
      checkExistingApplication();
      checkIfSaved();
    }
  }, [user, job]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, company:companies(*), city:cities(name)')
        .eq('id', id)
        .single();
      if (error) throw error;
      setJob(data);
    } catch (err) {
      console.error('Error fetching job:', err);
      toast.error('Offre introuvable');
    } finally {
      setLoading(false);
    }
  };

  const checkExistingApplication = async () => {
    const { data } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', job.id)
      .eq('candidate_id', user.id)
      .maybeSingle();
    setHasApplied(!!data);
  };

  const checkIfSaved = async () => {
    const { data } = await supabase
      .from('saved_jobs')
      .select('id')
      .eq('user_id', user.id)
      .eq('job_id', job.id)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour postuler');
      return;
    }
    if (hasApplied) {
      toast.info('Vous avez déjà postulé à cette offre');
      return;
    }
    try {
      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        candidate_id: user.id,
        status: 'pending',
      });
      if (error) throw error;
      setHasApplied(true);
      toast.success('Candidature envoyée avec succès !');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi de la candidature');
      console.error(err);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour sauvegarder');
      return;
    }
    if (isSaved) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', job.id);
      setIsSaved(false);
      toast.success('Offre retirée des favoris');
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: job.id });
      setIsSaved(true);
      toast.success('Offre sauvegardée');
    }
  };

  const handleReport = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour signaler');
      return;
    }
    const reason = window.prompt('Pourquoi signalez-vous cette offre ?');
    if (!reason) return;
    setReporting(true);
    try {
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: user.id,
          reported_item_type: 'job',
          reported_item_id: job.id,
          reason: reason
        }),
      });
      toast.success('Signalement envoyé. Merci !');
    } catch (err) {
      toast.error("Erreur lors de l'envoi du signalement");
    } finally {
      setReporting(false);
    }
  };

  const isOwner = user?.id && job?.company?.owner_id === user.id;

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!job) return <div className="pt-20 text-center">Offre non trouvée.</div>;

  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/emplois"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />Retour aux offres</Button></Link>

        <Card className="rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="flex items-start gap-6 mb-8">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
                {job.company?.logo_url ? <img src={job.company.logo_url} alt={job.company.name} className="w-16 h-16 object-contain" /> : <Building2 className="w-10 h-10 text-slate-400" />}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">{job.title}</h1>
                <p className="text-lg text-slate-600">{job.company?.name}</p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <Badge className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.city?.name}</Badge>
                  <Badge className={contractInfo.color}>{contractInfo.label}</Badge>
                  {job.salary_min && job.salary_max && (
                    <Badge variant="outline" className="flex items-center gap-1"><Banknote className="w-3 h-3" />{job.salary_min.toLocaleString('fr-FR')} - {job.salary_max.toLocaleString('fr-FR')} FCFA</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isOwner ? (
                  <>
                    {hasApplied ? (
                      <Badge className="bg-green-100 text-green-700 text-sm px-4 py-2">✅ Déjà postulé</Badge>
                    ) : (
                      <Button onClick={handleApply} className="bg-blue-600 text-white hover:bg-blue-700">Postuler</Button>
                    )}
                    <Button variant="outline" size="icon" onClick={handleToggleSave}>
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current text-red-500' : ''}`} />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleReport} disabled={reporting}>
                      <Flag className="w-5 h-5 text-slate-400 hover:text-red-500" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="outline" className="text-sm">Votre offre</Badge>
                )}
              </div>
            </div>

            <div className="prose max-w-none">
              <h2>Description du poste</h2>
              <p>{job.description}</p>
              {job.responsibilities && <><h3>Missions</h3><p>{job.responsibilities}</p></>}
              {job.requirements && <><h3>Profil recherché</h3><p>{job.requirements}</p></>}
              {job.benefits && <><h3>Avantages</h3><p>{job.benefits}</p></>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JobDetailPage;