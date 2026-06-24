import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, ChevronLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap, Award, FileText, Flag, Globe, ExternalLink, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const normalizeUrl = (url) => {
  if (!url) return '';
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  return trimmed;
};

const CandidatePublicProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user: currentUser, profile: currentProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reporting, setReporting] = useState(false);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const data = await apiFetch(`/api/candidate/${id}`);
      // Vérification : le profil candidat est-il suspendu ou banni ?
      if (data.is_active === false || data.is_banned === true) {
        setSuspended(true);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Erreur chargement profil candidat:', err);
      toast.error(t('candidateProfile.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUserRestricted = !currentUser || !currentProfile?.is_active || currentProfile?.is_banned;

  const handleReport = async () => {
    if (!currentUser) {
      toast.error(t('candidateProfile.loginToReport'));
      return;
    }
    if (isCurrentUserRestricted) {
      toast.error(t('candidateProfile.cannotReport'));
      return;
    }
    const reason = window.prompt(t('candidateProfile.reportTitle'));
    if (!reason) return;
    setReporting(true);
    try {
      await apiFetch('/api/report', {
        method: 'POST',
        body: JSON.stringify({
          reporter_id: currentUser.id,
          reported_item_type: 'candidate',
          reported_item_id: id,
          reason: reason
        }),
      });
      toast.success(t('candidateProfile.reportSent'));
    } catch (err) {
      toast.error(t('candidateProfile.reportError'));
    } finally {
      setReporting(false);
    }
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (suspended) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('candidateProfile.suspendedTitle')}</h1>
          <p className="text-slate-600">{t('candidateProfile.suspendedDescription')}</p>
          <Link to="/dashboard/entreprise/candidatures">
            <Button variant="outline" className="mt-6">{t('candidateProfile.back')}</Button>
          </Link>
        </div>
      </div>
    );
  }
  if (!profile) return <div className="pt-20 text-center">{t('candidateProfile.notFound')}</div>;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise/candidatures"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />{t('candidateProfile.back')}</Button></Link>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900">{profile.first_name} {profile.last_name}</h1>
                    <p className="text-slate-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {profile.email}</p>
                    {profile.phone && <p className="text-slate-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {profile.phone}</p>}
                    {profile.city && <p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {profile.city}</p>}
                    
                    {profile.links?.length > 0 && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">{t('profile.links.title')}</h3>
                        <div className="space-y-2">
                          {profile.links.map((link, index) => (
                            <a
                              key={index}
                              href={normalizeUrl(link.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                            >
                              <Globe className="w-4 h-4" />
                              {link.label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReport}
                        disabled={reporting || isCurrentUserRestricted}
                      >
                        <Flag className="w-4 h-4 mr-2" /> {t('candidateProfile.reportButton')}
                      </Button>
                    </div>
                  </div>
                </div>

                {profile.title && <h2 className="text-xl font-semibold text-slate-900 mb-2">{profile.title}</h2>}
                {profile.bio && <p className="text-slate-600 mb-6">{profile.bio}</p>}

                {profile.desired_salary_min && (
                  <p className="text-sm text-slate-500 mb-4">
                    {t('candidateProfile.salaryExpectations', { 
                      min: profile.desired_salary_min.toLocaleString(), 
                      max: profile.desired_salary_max?.toLocaleString() 
                    })}
                  </p>
                )}

                {profile.skills?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><Award className="w-5 h-5 text-blue-600" />{t('candidateProfile.skills')}</h3>
                    <div className="flex flex-wrap gap-2">{profile.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>
                  </div>
                )}

                {profile.experience?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><Briefcase className="w-5 h-5 text-blue-600" />{t('candidateProfile.experience')}</h3>
                    <div className="space-y-4">
                      {profile.experience.map((exp, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                          <p className="font-medium text-slate-800">{exp.title}</p>
                          <p className="text-sm text-slate-600">{exp.company} – {exp.start_date} à {exp.end_date || t('candidateProfile.present')}</p>
                          {exp.description && <p className="text-sm text-slate-500 mt-1">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {profile.education?.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-2"><GraduationCap className="w-5 h-5 text-blue-600" />{t('candidateProfile.education')}</h3>
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
                      <FileText className="w-4 h-4" /> {t('candidateProfile.downloadCV')}
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