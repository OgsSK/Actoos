import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import ContactFollowerModal from '../components/ContactFollowerModal';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import {
  Loader2, ChevronLeft, User, Mail, Phone, MapPin, Briefcase, GraduationCap,
  Award, FileText, Flag, Globe, ExternalLink, AlertTriangle, Clock, Send,
  Star, Download, File, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';

const normalizeUrl = (url) => {
  if (!url) return '';
  let trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) trimmed = 'https://' + trimmed;
  return trimmed;
};

// ---- Squelettes ----
const ProfileHeaderSkeleton = () => (
  <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-10 text-white animate-pulse">
    <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 shrink-0" />
      <div className="flex-1 space-y-3">
        <div className="h-8 bg-white/20 rounded w-2/3" />
        <div className="h-5 bg-white/20 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-6 w-20 bg-white/20 rounded-full" />
          <div className="h-6 w-24 bg-white/20 rounded-full" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-5 w-32 bg-white/20 rounded" />
          <div className="h-5 w-24 bg-white/20 rounded" />
        </div>
      </div>
    </div>
  </div>
);

const TabContentSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-slate-200 rounded w-3/4" />
    <div className="h-4 bg-slate-200 rounded w-full" />
    <div className="h-4 bg-slate-200 rounded w-5/6" />
    <div className="h-4 bg-slate-200 rounded w-2/3" />
  </div>
);

const CandidatePublicProfilePage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const companyIdFromUrl = searchParams.get('company_id') || null;
  const { user: currentUser, profile: currentProfile, activeCompanyId } = useAuth();
  const navigate = useNavigate();
  const { format } = useCurrencyFormatter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [candidatePosts, setCandidatePosts] = useState([]);
  const [candidateDocuments, setCandidateDocuments] = useState([]);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [companyPlan, setCompanyPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(false);
  const companyIdForContact = companyIdFromUrl || activeCompanyId;
  const timeoutRef = useRef(null);

  // Plan entreprise
  useEffect(() => {
    if (!currentUser || !companyIdForContact) {
      setCompanyPlan('free');
      return;
    }
    setPlanLoading(true);
    supabase
      .from('companies')
      .select('subscription_plan')
      .eq('id', companyIdForContact)
      .single()
      .then(({ data }) => setCompanyPlan(data?.subscription_plan || 'free'))
      .catch(() => setCompanyPlan('free'))
      .finally(() => setPlanLoading(false));
  }, [currentUser, companyIdForContact]);

  // Profil (Supabase direct, pas d'apiFetch)
  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      setLoading(true);
      setFetchError(null);
      timeoutRef.current = setTimeout(() => {
        setFetchError('timeout');
        setLoading(false);
      }, 8000);

      try {
        const { data: userData, error: userErr } = await supabase
          .from('users').select('*').eq('id', id).single();
        if (userErr) throw userErr;
        if (!userData.is_active || userData.is_banned) {
          setSuspended(true);
          return;
        }

        const { data: candidateData, error: candidateErr } = await supabase
          .from('candidate_profiles').select('*').eq('user_id', id).single();
        if (candidateErr) throw candidateErr;

        let cityName = null;
        if (userData.city_id) {
          const { data: city } = await supabase
            .from('cities').select('name').eq('id', userData.city_id).single();
          cityName = city?.name || null;
        }

        setProfile({
          id: userData.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          phone: userData.phone,
          avatar_url: userData.avatar_url,
          city: cityName,
          title: candidateData.title,
          bio: candidateData.bio,
          experience_level: candidateData.experience_level,
          years_of_experience: candidateData.years_of_experience,
          is_available: candidateData.is_available,
          is_open_to_remote: candidateData.is_open_to_remote,
          desired_salary_min: candidateData.desired_salary_min,
          desired_salary_max: candidateData.desired_salary_max,
          skills: candidateData.skills || [],
          experience: candidateData.experience || [],
          education: candidateData.education || [],
          cv_url: candidateData.cv_url,
          links: candidateData.links || [],
        });
      } catch (err) {
        console.error(err);
        setFetchError(err.message);
      } finally {
        clearTimeout(timeoutRef.current);
        setLoading(false);
      }
    };
    fetchProfile();
    return () => clearTimeout(timeoutRef.current);
  }, [id]);

  // Posts & documents
  useEffect(() => {
    if (!id) return;
    supabase.from('candidate_posts').select('*').eq('user_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setCandidatePosts(data || []));
    supabase.from('candidate_documents').select('*').eq('user_id', id).order('created_at', { ascending: false })
      .then(({ data }) => setCandidateDocuments(data || []));
  }, [id]);

  const isBusinessPlan = companyPlan === 'business' || companyPlan === 'enterprise';
  const showContactButton = currentUser && currentUser.id !== id && isBusinessPlan && companyIdForContact;
  const isCurrentUserRestricted = !currentUser || !currentProfile?.is_active || currentProfile?.is_banned;

  const handleReport = async () => {
    if (!currentUser) { toast.error(t('candidateProfile.loginToReport')); return; }
    if (isCurrentUserRestricted) { toast.error(t('candidateProfile.cannotReport')); return; }
    const reason = window.prompt(t('candidateProfile.reportTitle'));
    if (!reason) return;
    setReporting(true);
    try {
      await apiFetch('/api/report', { method: 'POST', body: JSON.stringify({ reporter_id: currentUser.id, reported_item_type: 'candidate', reported_item_id: id, reason }) });
      toast.success(t('candidateProfile.reportSent'));
    } catch { toast.error(t('candidateProfile.reportError')); }
    finally { setReporting(false); }
  };

  const handleBack = () => {
    if (from === 'cv-bank') navigate('/dashboard/entreprise/cv-bank');
    else if (from === 'followers') navigate('/dashboard/entreprise/abonnes');
    else if (from === 'candidate-dashboard') navigate('/dashboard/candidat');
    else navigate(-1);
  };

  const availableTabs = useMemo(() => {
    if (!profile) return [];
    const tabs = [{ key: 'about', icon: User, label: t('companyDetail.about', 'À propos') }];
    if (profile.skills?.length > 0) tabs.push({ key: 'skills', icon: Award, label: t('candidateProfilePage.skills.sectionTitle') });
    if (profile.experience?.length > 0) tabs.push({ key: 'experience', icon: Briefcase, label: t('candidateProfilePage.experience.sectionTitle') });
    if (profile.education?.length > 0) tabs.push({ key: 'education', icon: GraduationCap, label: t('candidateProfilePage.education.sectionTitle') });
    if (profile.cv_url) tabs.push({ key: 'cv', icon: FileText, label: t('candidateProfilePage.cv.sectionTitle') });
    if (profile.links?.length > 0) tabs.push({ key: 'links', icon: Globe, label: t('candidateProfilePage.links.sectionTitle') });
    if (candidateDocuments.length > 0) tabs.push({ key: 'documents', icon: File, label: t('candidateProfilePage.documents.sectionTitle') });
    if (candidatePosts.length > 0) tabs.push({ key: 'posts', icon: File, label: t('candidateProfile.posts', 'Actualités') });
    return tabs;
  }, [profile, candidateDocuments, candidatePosts, t]);

  useEffect(() => {
    if (!availableTabs.find(tab => tab.key === activeTab)) setActiveTab(availableTabs[0]?.key || 'about');
  }, [availableTabs, activeTab]);

  // --- RENDU ---
  if (fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('common.error')}</h1>
          <p className="text-slate-600 mb-4">{fetchError}</p>
          <Button onClick={() => window.location.reload()}>{t('common.retry', 'Réessayer')}</Button>
        </div>
      </div>
    );
  }

  if (suspended) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('candidateProfile.suspendedTitle')}</h1>
          <p className="text-slate-600">{t('candidateProfile.suspendedDescription')}</p>
          <button onClick={handleBack} className="mt-6 inline-flex items-center text-sm text-slate-600 hover:text-slate-900">
            <ChevronLeft className="w-4 h-4 mr-1" />{t('candidateProfile.back')}
          </button>
        </div>
      </div>
    );
  }

  if (!loading && !profile) return <div className="pt-20 text-center">{t('candidateProfile.notFound')}</div>;

  const isLoading = loading || planLoading;
  const rawPhone = profile?.phone || '';
  const cleanPhone = rawPhone.replace(/\s/g, '');
  const telLink = cleanPhone ? `tel:${cleanPhone}` : null;
  const isPDF = profile?.cv_url && profile.cv_url.endsWith('.pdf');

  const enrichedFollower = profile ? {
    user_id: id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    email: profile.email,
    avatar_url: profile.avatar_url,
  } : null;

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">
        <button onClick={handleBack} className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 sm:mb-8 group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          {/* Bannière */}
          {isLoading ? <ProfileHeaderSkeleton /> : (
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-10 text-white">
              <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
                <div className="relative shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white/30 overflow-hidden bg-white">
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-14 h-14 m-auto text-blue-200 mt-5" />}
                  </div>
                  {profile.is_available && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 ring-2 ring-white"><Star className="w-4 h-4 fill-current" /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight break-words">{profile.first_name} {profile.last_name}</h1>
                  {profile.title && <p className="text-white/80 text-base sm:text-lg mt-1">{profile.title}</p>}
                  <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                    {profile.is_available && <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm"><Star className="w-3 h-3 mr-1 fill-current" /> {t('common.available')}</Badge>}
                    {profile.is_open_to_remote && <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">{t('candidateProfilePage.professionalProfile.openToRemote')}</Badge>}
                    {profile.experience_level && <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">{t(`experienceLevels.${profile.experience_level}`, profile.experience_level)}</Badge>}
                    {profile.years_of_experience > 0 && <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm"><Clock className="w-3 h-3 mr-1" />{profile.years_of_experience} {t('candidateProfilePage.professionalProfile.years', 'ans')}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <ContactRow icon={<Mail className="w-4 h-4" />} bg="bg-white/20" textColor="text-white/80"><a href={`mailto:${profile.email}`} className="hover:underline font-medium">{profile.email}</a></ContactRow>
                    {profile.phone && <ContactRow icon={<Phone className="w-4 h-4" />} bg="bg-white/20" textColor="text-white/80">{telLink ? <a href={telLink} className="hover:underline font-mono font-medium">{profile.phone}</a> : <span className="font-mono">{profile.phone}</span>}</ContactRow>}
                    {profile.city && <ContactRow icon={<MapPin className="w-4 h-4" />} bg="bg-white/20" textColor="text-white/80"><span>{profile.city}</span></ContactRow>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    {showContactButton && <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => setContactModalOpen(true)}><Send className="w-4 h-4 mr-2" />{t('companyFollowers.contact', 'Contacter')}</Button>}
                    <Button variant="outline" size="sm" onClick={handleReport} disabled={reporting || isCurrentUserRestricted} className="border-white/30 text-white hover:bg-white/10"><Flag className="w-4 h-4 mr-2" /> {t('candidateProfile.reportButton')}</Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Onglets */}
          {availableTabs.length > 1 && (
            <div className="border-b border-slate-200 overflow-x-auto">
              <div className="flex space-x-0 px-4 sm:px-8">
                {availableTabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
                    <tab.icon className="w-4 h-4" /><span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contenu */}
          <div className="p-5 sm:p-8">
            {isLoading ? <TabContentSkeleton /> : (
              <>
                {activeTab === 'about' && (
                  <div className="space-y-6">
                    {profile.bio && <div className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100"><h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">{t('companyDetail.about', 'À propos')}</h3><p className="text-slate-700 leading-relaxed text-base">{profile.bio}</p></div>}
                    {(profile.desired_salary_min || profile.desired_salary_max) && <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 px-4 py-2 rounded-xl text-sm font-medium">💰 {profile.desired_salary_min && profile.desired_salary_max ? `${format(profile.desired_salary_min)} – ${format(profile.desired_salary_max)}` : profile.desired_salary_min ? format(profile.desired_salary_min) : format(profile.desired_salary_max)}</div>}
                  </div>
                )}
                {activeTab === 'skills' && <div className="flex flex-wrap gap-3">{profile.skills.map(skill => <Badge key={skill} variant="secondary" className="px-4 py-2 text-sm bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">{skill}</Badge>)}</div>}
                {activeTab === 'experience' && (
                  <div className="pl-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {profile.experience.map((exp, idx) => (
                      <div key={idx} className="relative pb-8 last:pb-0">
                        <div className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full bg-blue-600 ring-4 ring-blue-50" />
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                          <p className="font-semibold text-slate-800 text-base sm:text-lg">{exp.title}</p>
                          <p className="text-slate-600 text-sm">{exp.company}</p>
                          <p className="text-xs text-slate-400 mt-1">{exp.start_date} – {exp.end_date || t('candidateProfile.present')}</p>
                          {exp.image_url && <img src={exp.image_url} alt="" className="mt-3 rounded-lg max-h-48 object-cover" />}
                          {exp.description && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{exp.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'education' && (
                  <div className="pl-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {profile.education.map((edu, idx) => (
                      <div key={idx} className="relative pb-8 last:pb-0">
                        <div className="absolute -left-[29px] top-1.5 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-purple-50" />
                        <div className="bg-white border border-slate-100 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                          <p className="font-semibold text-slate-800 text-base sm:text-lg">{edu.degree}</p>
                          <p className="text-slate-600 text-sm">{edu.school}</p>
                          <p className="text-xs text-slate-400 mt-1">{edu.year}</p>
                          {edu.image_url && <img src={edu.image_url} alt="" className="mt-3 rounded-lg max-h-48 object-cover" />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'cv' && profile.cv_url && (
                  <div>
                    {isPDF ? <div className="bg-white rounded-xl border border-slate-200 overflow-hidden"><iframe src={profile.cv_url} className="w-full h-[70vh] min-h-[500px]" title="CV" /></div> : <div className="text-center py-12 bg-slate-50 rounded-xl"><File className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-600 mb-4">{t('candidateProfile.previewNotAvailable')}</p></div>}
                    <div className="flex justify-center mt-4"><a href={profile.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-semibold transition-colors shadow-lg shadow-blue-200"><Download className="w-5 h-5" />{t('candidateProfile.downloadCV')}</a></div>
                  </div>
                )}
                {activeTab === 'links' && <div className="flex flex-wrap gap-3">{profile.links.map((link, index) => <a key={index} href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"><Globe className="w-4 h-4" />{link.label}<ExternalLink className="w-3 h-3" /></a>)}</div>}
                {activeTab === 'documents' && (
                  <div className="space-y-2">
                    {candidateDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3 min-w-0"><File className="w-5 h-5 text-slate-400 shrink-0" /><div className="min-w-0"><p className="text-sm font-medium truncate">{doc.name}</p><p className="text-xs text-slate-500 capitalize">{doc.file_type}</p></div></div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" onClick={() => { const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(doc.file_url); const isPDF = doc.file_url?.endsWith('.pdf'); if (isImage || isPDF) setPreviewDoc({ url: doc.file_url, name: doc.name, type: isPDF ? 'pdf' : 'image' }); else window.open(doc.file_url, '_blank'); }} className="h-9 w-9"><Eye className="w-4 h-4" /></Button>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer"><Button variant="ghost" size="icon" className="h-9 w-9"><Download className="w-4 h-4" /></Button></a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'posts' && (
                  <div className="space-y-4">
                    {candidatePosts.map(post => (
                      <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                        {post.title && <h3 className="font-semibold text-slate-900 text-lg">{post.title}</h3>}
                        <p className="text-slate-600 text-sm mt-2 whitespace-pre-wrap">{post.content}</p>
                        {post.image_url && <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-80 object-cover" />}
                        <p className="text-xs text-slate-400 mt-3">{new Date(post.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modale prévisualisation */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex justify-between items-center border-b"><h3 className="font-semibold truncate">{previewDoc.name}</h3><Button variant="ghost" size="icon" onClick={() => setPreviewDoc(null)}><X className="w-5 h-5" /></Button></div>
            <div className="p-4 flex justify-center">{previewDoc.type === 'pdf' ? <iframe src={previewDoc.url} className="w-full h-[70vh]" title="Aperçu PDF" /> : <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[70vh] object-contain rounded-lg" />}</div>
          </div>
        </div>
      )}

      {/* Modale contact */}
      {showContactButton && enrichedFollower && <ContactFollowerModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} follower={enrichedFollower} companyId={companyIdForContact} userId={currentUser.id} />}
    </div>
  );
};

const ContactRow = ({ icon, bg, textColor = 'text-slate-700', children }) => (
  <div className={`flex items-center gap-2 text-sm ${textColor}`}>
    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>{icon}</div>
    <div className="min-w-0">{children}</div>
  </div>
);

export default CandidatePublicProfilePage;