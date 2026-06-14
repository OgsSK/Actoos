import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, ChevronLeft, Mail, Phone, MapPin, Calendar, Briefcase, User, FileText,
  ExternalLink, Video, Sparkles, RefreshCw, Trash2, Save, MessageSquare, Lightbulb,
  Edit, Eye
} from 'lucide-react';
import { formatRelative } from '../lib/utils';

// ---------- InterviewBlock component ----------
const InterviewBlock = ({ title, icon: Icon, content, onChange, onGenerate, generating, disabled, emptyMessage, t }) => {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1">
          <Icon className="w-4 h-4" /> {title}
        </h4>
        <div className="flex gap-1">
          {content && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(!editing)}
              title={editing ? t('applicationDetail.readMode') : t('applicationDetail.editMode')}
            >
              {editing ? <Eye className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerate}
            disabled={generating || disabled}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : t('applicationDetail.generate')}
          </Button>
        </div>
      </div>
      {content ? (
        editing ? (
          <textarea
            className="w-full text-sm border border-slate-200 rounded-xl p-3 min-h-[120px] max-h-[200px] overflow-y-scroll resize-y"
            value={content}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <div className="w-full text-sm border border-slate-200 rounded-xl p-3 min-h-[120px] max-h-[200px] overflow-y-scroll bg-white whitespace-pre-wrap">
            {content}
          </div>
        )
      ) : (
        <p className="text-xs text-slate-400 italic bg-slate-50 p-3 rounded-xl">
          {emptyMessage}
        </p>
      )}
      {content && !editing && (
        <p className="text-xs text-slate-400 mt-1">✏️ {t('applicationDetail.clickToEdit')}</p>
      )}
    </div>
  );
};

const ApplicationDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generatingTips, setGeneratingTips] = useState(false);
  const [interviewQuestions, setInterviewQuestions] = useState('');
  const [interviewAnswers, setInterviewAnswers] = useState('');
  const [interviewTips, setInterviewTips] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const fetchApplication = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, candidate:users(*), job:jobs(*)')
        .eq('id', id)
        .single();
      if (!error && data) {
        setApplication(data);
        const { data: cp } = await supabase.from('candidate_profiles').select('*').eq('user_id', data.candidate.id).maybeSingle();
        setCandidateProfile(cp || {});
      }
      setLoading(false);
    };
    fetchApplication();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    let reason = null;
    if (newStatus === 'rejected') {
      reason = window.prompt(t('applicationDetail.toasts.rejectionPrompt'));
      if (reason === null) {
        setUpdating(false);
        return;
      }
    }
    try {
      const updates = { status: newStatus };
      if (newStatus === 'interview' && !application.meeting_link) {
        updates.meeting_link = `https://meet.jit.si/actoos-interview-${application.id}`;
      }
      const { error } = await supabase.from('applications').update(updates).eq('id', id);
      if (error) throw error;
      setApplication(prev => ({ ...prev, ...updates }));
      toast.success(t('applicationDetail.toasts.statusUpdated'));

      if (newStatus !== 'pending') {
        const cleanJobTitle = (application.job.title || '').replace(/\n/g, ' ').substring(0, 60);
        const companyName = application.job.company?.name || '';
        try {
          await apiFetch('/api/notify-status-change', {
            method: 'POST',
            body: JSON.stringify({
              candidate_email: application.candidate.email,
              candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
              job_title: cleanJobTitle,
              new_status: newStatus,
              company_name: companyName,
              reason: reason
            })
          });
        } catch (notifErr) {
          console.error("Échec de l'envoi de l'email :", notifErr);
        }
      }
    } catch (err) {
      toast.error(t('applicationDetail.toasts.updateError'));
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateMeeting = async () => {
    const room = customRoomName.trim() || `actoos-interview-${application.id}`;
    const meetingLink = `https://meet.jit.si/${room}`;
    setUpdating(true);
    try {
      const { error } = await supabase.from('applications').update({ meeting_link: meetingLink }).eq('id', id);
      if (error) throw error;
      setApplication(prev => ({ ...prev, meeting_link: meetingLink }));
      setCustomRoomName('');
      toast.success(t('applicationDetail.toasts.linkUpdated'));
    } catch (err) { toast.error(t('applicationDetail.toasts.updateError')); }
    finally { setUpdating(false); }
  };

  const handleDeleteMeeting = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase.from('applications').update({ meeting_link: null }).eq('id', id);
      if (error) throw error;
      setApplication(prev => ({ ...prev, meeting_link: null }));
      toast.success(t('applicationDetail.toasts.linkDeleted'));
    } catch (err) { toast.error(t('applicationDetail.toasts.updateError')); }
    finally { setUpdating(false); }
  };

  const buildInterviewContext = () => {
    const job = application?.job;
    const profile = candidateProfile;
    if (!job) return '';
    return `
Poste : ${job.title || ''}
Description du poste : ${job.description || ''}
Exigences : ${job.requirements || ''}
Missions : ${job.responsibilities || ''}
Avantages : ${job.benefits || ''}
Compétences requises : ${(job.skills_required || []).join(', ')}

Profil du candidat :
- Titre : ${profile?.title || ''}
- Compétences : ${(profile?.skills || []).join(', ')}
- Expérience : ${(profile?.experience || []).map(e => `${e.title} chez ${e.company}`).join('; ') || 'Non spécifiée'}
- Formation : ${(profile?.education || []).map(e => e.title).join(', ') || 'Non spécifiée'}
- Bio : ${profile?.bio || ''}
    `.trim();
  };

  const handleGenerateQuestions = async () => {
    setGeneratingQuestions(true);
    const context = buildInterviewContext();
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'interview-questions',
          text: context,
          context: ''
        })
      });
      setInterviewQuestions(res.result);
      toast.success(t('applicationDetail.toasts.questionsGenerated'));
    } catch (err) { toast.error(err.message || t('applicationDetail.toasts.aiError')); }
    finally { setGeneratingQuestions(false); }
  };

  const handleGenerateAnswers = async () => {
    if (!interviewQuestions) {
      toast.error(t('applicationDetail.toasts.needQuestionsFirst'));
      return;
    }
    setGeneratingAnswers(true);
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'interview-answers',
          text: interviewQuestions
        })
      });
      setInterviewAnswers(res.result);
      toast.success(t('applicationDetail.toasts.answersGenerated'));
    } catch (err) { toast.error(err.message || t('applicationDetail.toasts.aiError')); }
    finally { setGeneratingAnswers(false); }
  };

  const handleGenerateTips = async () => {
    setGeneratingTips(true);
    const context = buildInterviewContext();
    try {
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: 'interview-tips',
          text: context
        })
      });
      setInterviewTips(res.result);
      toast.success(t('applicationDetail.toasts.tipsGenerated'));
    } catch (err) { toast.error(err.message || t('applicationDetail.toasts.aiError')); }
    finally { setGeneratingTips(false); }
  };

  const handleSaveNotes = async () => {
    const notes = `Questions :\n${interviewQuestions}\n\nRéponses :\n${interviewAnswers}\n\nConseils :\n${interviewTips}`;
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('applications').update({ notes }).eq('id', id);
      if (error) throw error;
      toast.success(t('applicationDetail.savedNotes'));
    } catch (err) { toast.error(t('applicationDetail.toasts.saveError')); }
    finally { setSavingNotes(false); }
  };

  const handleSendEmail = async (type) => {
    let link = '';
    if (type === 'jitsi') link = application?.meeting_link;
    else if (type === 'calendly') link = 'https://calendly.com/actoos/entretien';
    if (!link) return;
    setSendingEmail(true);
    try {
      const res = await apiFetch('/api/send-interview-link', {
        method: 'POST',
        body: JSON.stringify({
          email: application.candidate.email,
          candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
          job_title: application.job.title,
          meeting_link: link,
          company_name: application.job.company?.name || ''
        })
      });
      toast.success(res.message);
    } catch (err) {
      toast.error(err.message || t('applicationDetail.toasts.emailError'));
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!application) return <div className="pt-20 text-center">{t('applicationDetail.notFound')}</div>;

  const candidate = application.candidate;
  const job = application.job;
  const statusLabel = t(`applicationDetail.status.${application.status}`, { defaultValue: application.status });
  const statusColors = {
    pending: 'bg-blue-100 text-blue-700',
    viewed: 'bg-slate-100 text-slate-700',
    shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-green-100 text-green-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };
  const statusColor = statusColors[application.status] || 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise/candidatures"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />{t('applicationDetail.back')}</Button></Link>

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
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">{candidate?.first_name} {candidate?.last_name}</h1>
                    <p className="text-slate-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {candidate?.email}</p>
                    {candidate?.phone && <p className="text-slate-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {candidate.phone}</p>}
                    {candidate?.city?.name && <p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {candidate.city.name}</p>}
                    <Link to={`/candidat/${candidate.id}`} className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:underline text-sm"><ExternalLink className="w-4 h-4" /> {t('applicationDetail.viewFullProfile')}</Link>
                  </div>
                </div>

                {candidateProfile && (
                  <div className="space-y-4 text-sm">
                    {candidateProfile.title && <p className="font-medium text-slate-700">{candidateProfile.title}</p>}
                    {candidateProfile.bio && <p className="text-slate-600">{candidateProfile.bio}</p>}
                    {candidateProfile.skills?.length > 0 && <div className="flex flex-wrap gap-2">{candidateProfile.skills.map(skill => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card><CardContent className="p-6"><h2 className="text-lg font-semibold text-slate-900 mb-2">{t('applicationDetail.jobTitle')}</h2><Link to={`/emplois/${job?.id}`} className="text-blue-600 hover:underline flex items-center gap-2"><Briefcase className="w-4 h-4" /> {job?.title}</Link></CardContent></Card>
            {application.cover_letter && <Card><CardContent className="p-6"><h2 className="text-lg font-semibold text-slate-900 mb-2">{t('applicationDetail.coverLetter')}</h2><p className="text-slate-600 whitespace-pre-wrap">{application.cover_letter}</p></CardContent></Card>}
            {candidateProfile?.cv_url && <Card><CardContent className="p-6"><h2 className="text-lg font-semibold text-slate-900 mb-2">{t('applicationDetail.cv')}</h2><a href={candidateProfile.cv_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl hover:bg-blue-100"><FileText className="w-4 h-4" /> {t('applicationDetail.viewCV')}</a></CardContent></Card>}
          </div>

          {/* Panneau latéral */}
          <div className="space-y-6">
            <Card><CardContent className="p-6 text-center"><Badge className={`${statusColor} text-sm px-4 py-2`}>{statusLabel}</Badge><p className="text-xs text-slate-500 mt-2">{t('applicationDetail.receivedAt', { date: formatRelative(application.created_at) })}</p></CardContent></Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('applicationDetail.changeStatus')}</h3>
                <div className="space-y-2">
                  {Object.entries(statusColors).map(([key, colorClass]) => {
                    const label = t(`applicationDetail.status.${key}`);
                    return (
                      <button key={key} onClick={() => handleStatusChange(key)} disabled={updating || application.status === key}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${application.status === key ? 'bg-blue-50 text-blue-700 cursor-default' : 'hover:bg-slate-100 text-slate-700'}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> {t('applicationDetail.scheduleInterview')}</h3>
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span><h4 className="text-sm font-medium text-slate-800">{t('applicationDetail.step1ChooseSlot')}</h4></div>
                  <div className="ml-8 flex flex-wrap gap-2">
                    <a href="https://calendly.com/actoos/entretien" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm text-white hover:bg-blue-700"><Calendar className="w-4 h-4" /> {t('applicationDetail.openCalendly')}</a>
                    <Button variant="outline" size="sm" onClick={() => handleSendEmail('calendly')} disabled={sendingEmail}><Mail className="w-4 h-4 mr-1" /> {t('applicationDetail.sendEmail')}</Button>
                  </div>
                </div>
                <div className="mb-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span><h4 className="text-sm font-medium text-slate-800">{t('applicationDetail.step2CreateLink')}</h4></div>
                  <div className="ml-8 space-y-3">
                    {application.meeting_link ? (
                      <>
                        <div className="bg-blue-50 rounded-xl p-3 text-sm break-all"><a href={application.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">{application.meeting_link}</a></div>
                        <div className="flex gap-2">
                          <a href={application.meeting_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700"><Video className="w-4 h-4" /> {t('applicationDetail.joinMeeting')}</a>
                          <Button variant="outline" size="sm" onClick={() => handleSendEmail('jitsi')} disabled={sendingEmail}><Mail className="w-4 h-4 mr-1" /> {t('applicationDetail.sendEmail')}</Button>
                        </div>
                        <input type="text" placeholder={t('applicationDetail.newRoomPlaceholder')} value={customRoomName} onChange={(e) => setCustomRoomName(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={handleCreateMeeting} disabled={updating}><RefreshCw className="w-4 h-4 mr-1" /> {t('applicationDetail.updateLink')}</Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={handleDeleteMeeting} disabled={updating}><Trash2 className="w-4 h-4" /> {t('applicationDetail.deleteLink')}</Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <input type="text" placeholder={t('applicationDetail.roomPlaceholder')} value={customRoomName} onChange={(e) => setCustomRoomName(e.target.value)} className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                        <Button variant="outline" className="w-full" onClick={handleCreateMeeting} disabled={updating}>{updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />} {t('applicationDetail.generateJitsiLink')}</Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section Préparer l'entretien améliorée */}
            <Card>
              <CardContent className="p-6 space-y-5">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                  {t('applicationDetail.prepareInterview')}
                </h3>

                <InterviewBlock
                  title={t('applicationDetail.questions')}
                  icon={MessageSquare}
                  content={interviewQuestions}
                  onChange={setInterviewQuestions}
                  onGenerate={handleGenerateQuestions}
                  generating={generatingQuestions}
                  emptyMessage={t('applicationDetail.emptyQuestions')}
                  t={t}
                />

                <InterviewBlock
                  title={t('applicationDetail.answers')}
                  icon={Sparkles}
                  content={interviewAnswers}
                  onChange={setInterviewAnswers}
                  onGenerate={handleGenerateAnswers}
                  generating={generatingAnswers}
                  disabled={!interviewQuestions}
                  emptyMessage={t('applicationDetail.emptyAnswers')}
                  t={t}
                />

                <InterviewBlock
                  title={t('applicationDetail.tips')}
                  icon={Lightbulb}
                  content={interviewTips}
                  onChange={setInterviewTips}
                  onGenerate={handleGenerateTips}
                  generating={generatingTips}
                  emptyMessage={t('applicationDetail.emptyTips')}
                  t={t}
                />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSaveNotes}
                  disabled={!interviewQuestions && !interviewAnswers && !interviewTips || savingNotes}
                >
                  {savingNotes ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {t('applicationDetail.saveNotes')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;