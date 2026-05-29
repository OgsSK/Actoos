import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, FileText, Flag, Globe, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CandidatePublicProfilePage = () => {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [candidate, setCandidate] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      const { data: userData } = await supabase
        .from('users')
        .select('*, city:cities(name)')
        .eq('id', id)
        .single();
      const { data: cp } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', id)
        .maybeSingle();
      setCandidate(userData);
      setProfile(cp || {});
      setLoading(false);
    };
    fetchCandidate();
  }, [id]);

  const handleReport = async () => {
    if (!currentUser) {
      toast.error('Veuillez vous connecter pour signaler');
      return;
    }
    const reason = window.prompt('Pourquoi signalez-vous ce candidat ?');
    if (!reason) return;
    setReporting(true);
    try {
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: currentUser.id,
          reported_item_type: 'candidate',
          reported_item_id: candidate.id,
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

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!candidate) return <div className="pt-20 text-center">Candidat introuvable.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise/candidatures"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />Retour</Button></Link>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                    {candidate?.avatar_url ? (
                      <img src={candidate.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">{candidate.first_name} {candidate.last_name}</h1>
                    <p className="text-slate-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {candidate.email}</p>
                    {candidate.phone && <p className="text-slate-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {candidate.phone}</p>}
                    {candidate.city && <p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {candidate.city.name}</p>}
                    
                    {/* Liens (cliquables) */}
                    <div className="flex flex-wrap gap-3 mt-3">
                      {profile.linkedin_url && (
                        <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                          <Globe className="w-4 h-4" /> LinkedIn
                        </a>
                      )}
                      {profile.portfolio_url && (
                        <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">
                          <ExternalLink className="w-4 h-4" /> Portfolio
                        </a>
                      )}
                    </div>

                    {/* Bouton Signaler */}
                    <div className="mt-4">
                      <Button variant="outline" size="sm" onClick={handleReport} disabled={reporting}>
                        <Flag className="w-4 h-4 mr-2" /> Signaler ce candidat
                      </Button>
                    </div>
                  </div>
                </div>

                {profile.title && <h2 className="text-xl font-semibold text-slate-900 mb-2">{profile.title}</h2>}
                {profile.bio && <p className="text-slate-600 mb-6">{profile.bio}</p>}

                {profile.desired_salary_min && (
                  <p className="text-sm text-slate-500 mb-4">
                    Prétentions salariales : {profile.desired_salary_min.toLocaleString()} - {profile.desired_salary_max?.toLocaleString()} FCFA
                  </p>
                )}

                {profile.skills?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-blue-600" />Compétences</h3>
                    <div className="flex flex-wrap gap-2">{profile.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>
                  </div>
                )}

                {profile.experience?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><Briefcase className="w-5 h-5 text-blue-600" />Expériences</h3>
                    <div className="space-y-4">
                      {profile.experience.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                          <p className="font-medium text-slate-800">{exp.title}</p>
                          <p className="text-sm text-slate-600">{exp.company} – {exp.start_date} à {exp.end_date || 'présent'}</p>
                          {exp.description && <p className="text-sm text-slate-500 mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.education?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><GraduationCap className="w-5 h-5 text-blue-600" />Formation</h3>
                    <div className="space-y-4">
                      {profile.education.map((edu, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                          <p className="font-medium text-slate-800">{edu.degree}</p>
                          <p className="text-sm text-slate-600">{edu.school} – {edu.year}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.cv_url && (
                  <div className="mt-4">
                    <a href={profile.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-100">
                      <FileText className="w-4 h-4" /> Télécharger le CV
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidatePublicProfilePage;