import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext'; // ← ajouté
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, ChevronLeft, Mail, Phone, MapPin, Calendar, Briefcase, User, FileText,
  ExternalLink, Video, Sparkles, RefreshCw, Trash2, Save, MessageSquare, Lightbulb,
  CheckCircle
} from 'lucide-react';
import { formatRelative } from '../lib/utils';

/* ---------- Bloc éditable avec gestion du curseur ---------- */
const EditableBlock = ({ title, icon: Icon, content, onChange, onSave, saving, onDelete, lastSaved, t }) => {
  const editableRef = useRef(null);
  const cursorPosRef = useRef(null);

  const saveCursorPosition = () => {
    const el = editableRef.current;
    if (!el) return;
    const selection = window.getSelection();
    if (selection.rangeCount > 0 && el.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const preRange = document.createRange();
      preRange.selectNodeContents(el);
      preRange.setEnd(range.startContainer, range.startOffset);
      cursorPosRef.current = preRange.toString().length;
    }
  };

  useEffect(() => {
    const el = editableRef.current;
    if (!el || cursorPosRef.current === null) return;
    try {
      const range = document.createRange();
      const textNodes = [];
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      let node;
      while ((node = walk.nextNode())) textNodes.push(node);

      let charCount = 0;
      let targetNode = null;
      let targetOffset = 0;
      for (const tn of textNodes) {
        if (charCount + tn.length >= cursorPosRef.current) {
          targetNode = tn;
          targetOffset = cursorPosRef.current - charCount;
          break;
        }
        charCount += tn.length;
      }
      if (targetNode) {
        range.setStart(targetNode, Math.min(targetOffset, targetNode.length));
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } catch (e) { /* ignore */ }
    cursorPosRef.current = null;
  }, [content]);

  const handleInput = (e) => {
    saveCursorPosition();
    onChange(e.currentTarget.textContent);
  };

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <Icon className="w-4 h-4 text-blue-600" /> {title}
        </h4>
        <div className="flex gap-1">
          {content && (
            <Button variant="ghost" size="sm" onClick={onDelete} title={t('common.delete')}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <div
        ref={editableRef}
        contentEditable
        suppressContentEditableWarning
        dir="ltr"
        onInput={handleInput}
        className="w-full text-sm border border-slate-100 rounded-lg p-3 whitespace-pre-wrap
                   focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        style={{
          height: '200px',
          overflowY: 'scroll',
          direction: 'ltr',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          scrollbarColor: '#cbd5e1 #f1f5f9',
        }}
      >
        {content}
      </div>
      {lastSaved && (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> {t('common.savedAt', { time: lastSaved })}
        </p>
      )}
    </div>
  );
};

/* ---------- Onglets ---------- */
const TABS = [
  { key: 'personal', label: 'Notes personnelles', icon: FileText },
  { key: 'questions', label: 'Questions', icon: MessageSquare },
  { key: 'answers', label: 'Réponses', icon: Sparkles },
  { key: 'tips', label: 'Conseils', icon: Lightbulb },
];

const ApplicationDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user, profile, signOut } = useAuth(); // ← extraction de profile et signOut
  const navigate = useNavigate();                 // ← ajouté pour la redirection
  const [application, setApplication] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  const [notes, setNotes] = useState({ personal: '', questions: '', answers: '', tips: '' });
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeNoteTab, setActiveNoteTab] = useState('personal');
  const [lastSavedMap, setLastSavedMap] = useState({});

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generatingAnswers, setGeneratingAnswers] = useState(false);
  const [generatingTips, setGeneratingTips] = useState(false);

  // Vérification du compte utilisateur (suspension / bannissement)
  useEffect(() => {
    if (!user) return;
    if (!profile?.is_active || profile?.is_banned) {
      signOut();
      navigate('/connexion?reason=suspended', { replace: true });
    }
  }, [user, profile, signOut, navigate]);

  const getLocalNotes = () => {
    try { return JSON.parse(localStorage.getItem(`app_notes_${id}`) || '{}'); }
    catch { return {}; }
  };
  const saveLocalNotes = (partial) => {
    const current = getLocalNotes();
    const merged = { ...current, ...partial };
    localStorage.setItem(`app_notes_${id}`, JSON.stringify(merged));
  };

  useEffect(() => {
    if (!user || !profile?.is_active || profile?.is_banned) return; // ne charge pas si restreint

    const fetchData = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, candidate:users(*), job:jobs(*)')
        .eq('id', id)
        .single();
      if (!error && data) {
        setApplication(data);
        const { data: cp } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('user_id', data.candidate.id)
          .maybeSingle();
        setCandidateProfile(cp || {});

        const { data: notesData } = await supabase
          .from('application_notes')
          .select('note_type, content, updated_at')
          .eq('application_id', id);
        const newNotes = { ...notes };
        const savedMap = {};
        if (notesData) {
          notesData.forEach(n => {
            if (TABS.find(tab => tab.key === n.note_type)) {
              newNotes[n.note_type] = n.content || '';
              savedMap[n.note_type] = new Date(n.updated_at).toLocaleTimeString();
            }
          });
        }
        const local = getLocalNotes();
        for (const key of Object.keys(newNotes)) {
          if (!newNotes[key] && local[key]) newNotes[key] = local[key];
        }
        setNotes(newNotes);
        setLastSavedMap(savedMap);
        saveLocalNotes(newNotes);
      }
      setLoading(false);
    };
    fetchData();
  }, [id, user, profile]);

  const saveNote = useCallback(async (type, content) => {
    if (!id) return false;
    saveLocalNotes({ [type]: content });
    try {
      const { error } = await supabase.from('application_notes').upsert({
        application_id: id,
        note_type: type,
        content,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'application_id,note_type' });
      if (error) throw error;
      setLastSavedMap(prev => ({ ...prev, [type]: new Date().toLocaleTimeString() }));
      return true;
    } catch (err) { console.error('saveNote', err); return false; }
  }, [id]);

  const handleSaveNote = async (type) => {
    setSavingNotes(true);
    await saveNote(type, notes[type]);
    setSavingNotes(false);
    toast.success(t('applicationDetail.toasts.noteSaved'));
  };

  const handleDeleteNote = async (type) => {
    setNotes(prev => ({ ...prev, [type]: '' }));
    saveLocalNotes({ [type]: '' });
    await supabase.from('application_notes').delete().eq('application_id', id).eq('note_type', type);
    setLastSavedMap(prev => ({ ...prev, [type]: null }));
    toast.success(t('applicationDetail.toasts.noteDeleted'));
  };

  useEffect(() => {
    if (!id) return;
    const timer = setTimeout(() => saveNote(activeNoteTab, notes[activeNoteTab]), 2000);
    return () => clearTimeout(timer);
  }, [notes[activeNoteTab], activeNoteTab, id, saveNote]);

  const handleTabChange = (tab) => {
    saveNote(activeNoteTab, notes[activeNoteTab]);
    setActiveNoteTab(tab);
  };

  const handleGenerate = async (type) => {
    const setGen = { questions: setGeneratingQuestions, answers: setGeneratingAnswers, tips: setGeneratingTips }[type];
    setGen(true);
    try {
      let context = buildInterviewContext();
      if (type === 'answers' && notes.questions?.trim()) {
        context = `QUESTIONS À POSER :\n${notes.questions}\n\nCONTEXTE :\n${context}`;
      }
      const res = await apiFetch('/api/ai/agent', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: `interview-${type}`,
          text: context,
          language: i18n.language,
        }),
      });
      const newContent = res.result;
      setNotes(prev => ({ ...prev, [type]: newContent }));
      await saveNote(type, newContent);
      toast.success(t('applicationDetail.toasts.questionsGenerated'));
    } catch (err) { toast.error(err.message); }
    finally { setGen(false); }
  };

  const buildInterviewContext = () => {
    const job = application?.job;
    const profile = candidateProfile;
    if (!job) return '';
    return `
Poste : ${job.title || ''}
Description : ${job.description || ''}
Exigences : ${job.requirements || ''}
Missions : ${job.responsibilities || ''}
Compétences requises : ${(job.skills_required || []).join(', ')}

Profil candidat :
- Titre : ${profile?.title || ''}
- Compétences : ${(profile?.skills || []).join(', ')}
- Expérience : ${(profile?.experience || []).map(e => `${e.title} chez ${e.company}`).join('; ') || 'Non spécifiée'}
- Formation : ${(profile?.education || []).map(e => e.title).join(', ') || 'Non spécifiée'}
- Bio : ${profile?.bio || ''}`.trim();
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    let reason = null;
    if (newStatus === 'rejected') {
      reason = window.prompt(t('applicationDetail.toasts.rejectionPrompt'));
      if (reason === null) { setUpdating(false); return; }
    }
    try {
      const updates = { status: newStatus };
      if (newStatus === 'interview' && !application.meeting_link)
        updates.meeting_link = `https://meet.jit.si/actoos-interview-${application.id}`;
      const { error } = await supabase.from('applications').update(updates).eq('id', id);
      if (error) throw error;
      setApplication(prev => ({ ...prev, ...updates }));
      try {
        await apiFetch('/api/notify-status-change', {
          method: 'POST',
          body: JSON.stringify({
            candidate_email: application.candidate.email,
            candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
            job_title: application.job.title,
            new_status: newStatus,
            company_name: application.job.company?.name || '',
            reason: reason || '',
            language: i18n.language,
          }),
        });
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email de notification :", emailError);
      }
      toast.success(t('applicationDetail.toasts.statusUpdated'));
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

  const handleSendEmail = async (type) => {
    let link = '';
    if (type === 'jitsi') link = application?.meeting_link;
    else if (type === 'calendly') link = 'https://calendly.com/actoos/entretien';
    if (!link) return;
    setSendingEmail(true);
    try {
      await apiFetch('/api/send-interview-link', {
        method: 'POST',
        body: JSON.stringify({
          email: application.candidate.email,
          candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
          job_title: application.job.title,
          meeting_link: link,
          company_name: application.job.company?.name || '',
          language: i18n.language,
        })
      });
      toast.success(t('applicationDetail.toasts.emailSent'));
    } catch (err) { toast.error(err.message); }
    finally { setSendingEmail(false); }
  };

  if (loading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!application) return <div className="pt-20 text-center">{t('applicationDetail.notFound')}</div>;

  const candidate = application.candidate;
  const job = application.job;
  const statusLabel = t(`applicationDetail.status.${application.status}`, { defaultValue: application.status });
  const statusColors = {
    pending: 'bg-blue-100 text-blue-700', viewed: 'bg-slate-100 text-slate-700', shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-green-100 text-green-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
  };
  const statusColor = statusColors[application.status] || 'bg-slate-100 text-slate-700';

  return (
    <div className="min-h-0 bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise/candidatures"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />{t('applicationDetail.back')}</Button></Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Colonne de gauche (profil + notes) */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                    {candidate?.avatar_url ? <img src={candidate.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">{candidate?.first_name} {candidate?.last_name}</h1>
                    <p className="text-slate-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> {candidate?.email}</p>
                    {candidate?.phone && <p className="text-slate-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {candidate.phone}</p>}
                    {candidate?.city?.name && <p className="text-slate-600 flex items-center gap-2 mt-1"><MapPin className="w-4 h-4" /> {candidate.city.name}</p>}
                    {candidate?.id && (
                      <Link to={`/candidat/${candidate.id}`} className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:underline text-sm">
                        <ExternalLink className="w-4 h-4" /> {t('applicationDetail.viewFullProfile')}
                      </Link>
                    )}
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

            {/* Bloc Notes avec onglets */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" /> {t('applicationDetail.interviewNotes')}
                </h3>

                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 pb-px">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                        activeNoteTab === tab.key
                          ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />
                      {t(`notes.${tab.key}`)}
                    </button>
                  ))}
                </div>

                <div className="max-h-[60vh] overflow-y-auto">
                  {activeNoteTab === 'personal' && (
                    <EditableBlock title={t('notes.personal')} icon={FileText} content={notes.personal}
                      onChange={(val) => setNotes(prev => ({ ...prev, personal: val }))}
                      onSave={() => handleSaveNote('personal')} saving={savingNotes}
                      onDelete={() => handleDeleteNote('personal')} lastSaved={lastSavedMap['personal']} t={t} />
                  )}
                  {activeNoteTab === 'questions' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleGenerate('questions')} disabled={generatingQuestions}>
                          {generatingQuestions ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                          {t('applicationDetail.generateQuestions')}
                        </Button>
                      </div>
                      <EditableBlock title={t('notes.questions')} icon={MessageSquare} content={notes.questions}
                        onChange={(val) => setNotes(prev => ({ ...prev, questions: val }))}
                        onSave={() => handleSaveNote('questions')} saving={savingNotes}
                        onDelete={() => handleDeleteNote('questions')} lastSaved={lastSavedMap['questions']} t={t} />
                    </div>
                  )}
                  {activeNoteTab === 'answers' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleGenerate('answers')} disabled={generatingAnswers || !notes.questions}>
                          {generatingAnswers ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                          {t('applicationDetail.generateAnswers')}
                        </Button>
                      </div>
                      <EditableBlock title={t('notes.answers')} icon={Sparkles} content={notes.answers}
                        onChange={(val) => setNotes(prev => ({ ...prev, answers: val }))}
                        onSave={() => handleSaveNote('answers')} saving={savingNotes}
                        onDelete={() => handleDeleteNote('answers')} lastSaved={lastSavedMap['answers']} t={t} />
                    </div>
                  )}
                  {activeNoteTab === 'tips' && (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => handleGenerate('tips')} disabled={generatingTips}>
                          {generatingTips ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Sparkles className="w-4 h-4 mr-1" />}
                          {t('applicationDetail.generateTips')}
                        </Button>
                      </div>
                      <EditableBlock title={t('notes.tips')} icon={Lightbulb} content={notes.tips}
                        onChange={(val) => setNotes(prev => ({ ...prev, tips: val }))}
                        onSave={() => handleSaveNote('tips')} saving={savingNotes}
                        onDelete={() => handleDeleteNote('tips')} lastSaved={lastSavedMap['tips']} t={t} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne de droite : statut et entretien */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Badge className={`${statusColor} text-sm px-4 py-2`}>{statusLabel}</Badge>
                <p className="text-xs text-slate-500 mt-2">{t('applicationDetail.receivedAt', { date: formatRelative(application.created_at) })}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4">{t('applicationDetail.changeStatus')}</h3>
                <div className="space-y-2">
                  {Object.entries(statusColors).map(([key]) => (
                    <button
                      key={key}
                      onClick={() => handleStatusChange(key)}
                      disabled={updating || application.status === key}
                      className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        application.status === key ? 'bg-blue-50 text-blue-700 cursor-default' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {t(`applicationDetail.status.${key}`)}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Section Entretien avec boutons améliorés */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" /> {t('applicationDetail.scheduleInterview')}
                </h3>
                <div className="space-y-6">
                  {/* Étape 1 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
                      <h4 className="text-sm font-medium text-slate-800">{t('applicationDetail.step1ChooseSlot')}</h4>
                    </div>
                    <div className="flex flex-wrap gap-2 ml-8">
                      <a href="https://calendly.com/actoos/entretien" target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-700">
                        <Calendar className="w-4 h-4" /> {t('applicationDetail.openCalendly')}
                      </a>
                      <Button variant="outline" size="sm" onClick={() => handleSendEmail('calendly')} disabled={sendingEmail}>
                        <Mail className="w-4 h-4 mr-1" /> {t('applicationDetail.sendEmail')}
                      </Button>
                    </div>
                  </div>

                  {/* Étape 2 */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
                      <h4 className="text-sm font-medium text-slate-800">{t('applicationDetail.step2CreateLink')}</h4>
                    </div>
                    <div className="ml-8 space-y-3">
                      {application.meeting_link ? (
                        <>
                          <div className="bg-blue-50 rounded-xl p-3 text-sm break-all">
                            <a href={application.meeting_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                              {application.meeting_link}
                            </a>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <a href={application.meeting_link} target="_blank" rel="noopener noreferrer"
                               className="inline-flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-green-700">
                              <Video className="w-4 h-4" /> {t('applicationDetail.joinMeeting')}
                            </a>
                            <Button variant="outline" size="sm" onClick={() => handleSendEmail('jitsi')} disabled={sendingEmail}>
                              <Mail className="w-4 h-4 mr-1" /> {t('applicationDetail.sendEmail')}
                            </Button>
                          </div>
                          <input type="text" placeholder={t('applicationDetail.newRoomPlaceholder')} value={customRoomName}
                                 onChange={(e) => setCustomRoomName(e.target.value)}
                                 className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={updating}
                              onClick={handleCreateMeeting}
                              className="flex-1 min-w-0 inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 overflow-hidden"
                            >
                              <RefreshCw className="w-4 h-4 shrink-0" />
                              <span className="btn-marquee flex-1 min-w-0">
                                <span>{t('applicationDetail.updateLink')}</span>
                              </span>
                            </button>
                            <Button variant="outline" size="sm" className="text-red-600" onClick={handleDeleteMeeting} disabled={updating}>
                              <Trash2 className="w-4 h-4" /> {t('applicationDetail.deleteLink')}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <input type="text" placeholder={t('applicationDetail.roomPlaceholder')} value={customRoomName}
                                 onChange={(e) => setCustomRoomName(e.target.value)}
                                 className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2" />
                          <Button variant="outline" className="w-full" onClick={handleCreateMeeting} disabled={updating}>
                            {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                            {t('applicationDetail.generateJitsiLink')}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;