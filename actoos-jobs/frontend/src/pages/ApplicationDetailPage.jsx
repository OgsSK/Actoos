import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, ChevronLeft, Mail, Phone, MapPin, Calendar, Briefcase, User, FileText,
  ExternalLink, Trash2, Save, MessageSquare, Lightbulb,
  CheckCircle, XCircle, Clock, Plus, Send
} from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { planHasFeature } from '../lib/planLimits';

const getErrorMessage = (error, fallback = 'Une erreur est survenue') => {
  if (!error) return fallback;
  if (error.name === 'AbortError' || error.message?.toLowerCase().includes('aborted')) return null;
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  if (error.detail) return error.detail;
  return fallback;
};

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

const TABS = [
  { key: 'personal', label: 'Notes personnelles', icon: FileText },
  { key: 'questions', label: 'Questions', icon: MessageSquare },
  { key: 'answers', label: 'Réponses', icon: Lightbulb },
  { key: 'tips', label: 'Conseils', icon: Lightbulb },
];

const ApplicationDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const { user, activeCompanyId } = useAuth();
  const [application, setApplication] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [requestingDocs, setRequestingDocs] = useState(false);

  const [notes, setNotes] = useState({ personal: '', questions: '', answers: '', tips: '' });
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeNoteTab, setActiveNoteTab] = useState('personal');
  const [lastSavedMap, setLastSavedMap] = useState({});

  const [companyPlan, setCompanyPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(true);

  const [candidateDocuments, setCandidateDocuments] = useState([]);

  const [acceptMessage, setAcceptMessage] = useState('');
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const [selectedDocTypes, setSelectedDocTypes] = useState(['contract', 'id_card', 'diploma']);
  const [customDocFields, setCustomDocFields] = useState([]);
  const customDocIdRef = useRef(1);
  const [requestDocsMessage, setRequestDocsMessage] = useState('');

  const [showEditModal, setShowEditModal] = useState(false);
  const [editSelectedDocTypes, setEditSelectedDocTypes] = useState([]);
  const [editCustomDocFields, setEditCustomDocFields] = useState([]);
  const editDocIdRef = useRef(1);
  const [editMessage, setEditMessage] = useState('');

  const [finalizeMessage, setFinalizeMessage] = useState('');
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [finalizingHiring, setFinalizingHiring] = useState(false);

  const [notifyingOthers, setNotifyingOthers] = useState(false);
  const [showOtherCandidatesModal, setShowOtherCandidatesModal] = useState(false);
  const [otherCandidatesMessage, setOtherCandidatesMessage] = useState('');

  // ---- États pour Cal.com ----
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [proposal, setProposal] = useState({
    duration: 30,
    dateStart: '',
    dateEnd: '',
    timeStart: '09:00',
    timeEnd: '17:00',
    message: '',
  });
  const [proposing, setProposing] = useState(false);
  const [bookingUrl, setBookingUrl] = useState(null);
  const [cancellingProposed, setCancellingProposed] = useState(false);
  const [finishingProposed, setFinishingProposed] = useState(false);

  useEffect(() => {
    if (application?.booking_url) setBookingUrl(application.booking_url);
    else setBookingUrl(null);
  }, [application]);

  useEffect(() => {
    if (!activeCompanyId) {
      setCompanyPlan('free');
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    supabase
      .from('companies')
      .select('subscription_plan')
      .eq('id', activeCompanyId)
      .single()
      .then(({ data }) => {
        setCompanyPlan(data?.subscription_plan || 'free');
        setPlanLoading(false);
      })
      .catch(() => {
        setCompanyPlan('free');
        setPlanLoading(false);
      });
  }, [activeCompanyId]);

  const isProOrBusiness = planHasFeature(companyPlan, 'canUseInterviewTools');

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
    if (!user) return;
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('applications')
        .select('*, candidate:users(*), job:jobs(*, company:companies(name))')
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
        await reloadDocuments();
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
  }, [id, user]);

  const reloadDocuments = async () => {
    if (!id) return;
    const { data: docs } = await supabase
      .from('hiring_documents')
      .select('id, document_type, status, file_url, created_at')
      .eq('application_id', id)
      .order('created_at', { ascending: false });
    setCandidateDocuments(docs || []);
  };

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
    } catch (err) {
      console.error('saveNote', err);
      return false;
    }
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

  // ====================== ACTIONS ======================
  const handleStatusChange = async (newStatus, customMessage = '') => {
    setUpdating(true);
    let reason = null;
    if (newStatus === 'rejected') {
      reason = window.prompt(t('applicationDetail.toasts.rejectionPrompt'));
      if (reason === null) { setUpdating(false); return; }
    }
    try {
      const updates = { status: newStatus };
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
      } catch (emailError) { console.error("Erreur email notification :", emailError); }
      if (newStatus === 'accepted') {
        try {
          await apiFetch('/api/notify-accepted-candidate', {
            method: 'POST',
            body: JSON.stringify({
              candidate_email: application.candidate.email,
              candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
              job_title: application.job.title,
              company_name: application.job.company?.name || '',
              message: customMessage,
              language: i18n.language,
            }),
          });
        } catch (err) { console.error("Erreur email acceptation :", err); }
      }
      toast.success(t('applicationDetail.toasts.statusUpdated'));
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg) toast.error(msg);
    } finally { setUpdating(false); }
  };

  const handleProposeSlots = async () => {
    if (!proposal.dateStart || !proposal.dateEnd || !proposal.timeStart || !proposal.timeEnd) {
      toast.error(t('applicationDetail.selectDateRange'));
      return;
    }
    setProposing(true);
    try {
      const res = await apiFetch('/api/interviews/propose', {
        method: 'POST',
        body: JSON.stringify({
          application_id: application.id,
          company_id: activeCompanyId,
          duration_minutes: proposal.duration,
          date_start: proposal.dateStart,
          date_end: proposal.dateEnd,
          time_start: proposal.timeStart,
          time_end: proposal.timeEnd,
          message: proposal.message,
          language: i18n.language,
        }),
      });
      setBookingUrl(res.booking_url);
      setApplication(prev => ({ ...prev, booking_url: res.booking_url }));
      setShowProposeModal(false);
      toast.success(t('applicationDetail.bookingLinkCreated'));
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg) toast.error(msg);
    } finally { setProposing(false); }
  };

  const handleCancelProposedInterview = async () => {
    if (!window.confirm(t('applicationDetail.cancelProposedConfirm'))) return;
    setCancellingProposed(true);
    try {
      await apiFetch('/api/interviews/cancel', {
        method: 'POST',
        body: JSON.stringify({ application_id: application.id, company_id: activeCompanyId, language: i18n.language }),
      });
      setBookingUrl(null);
      setApplication(prev => ({ ...prev, booking_url: null }));
      toast.success(t('applicationDetail.interviewCancelled'));
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
    finally { setCancellingProposed(false); }
  };

  const handleFinishProposedInterview = async () => {
    if (!window.confirm(t('applicationDetail.finishProposedConfirm'))) return;
    setFinishingProposed(true);
    try {
      await apiFetch('/api/interviews/finish', {
        method: 'POST',
        body: JSON.stringify({ application_id: application.id, company_id: activeCompanyId, language: i18n.language }),
      });
      setBookingUrl(null);
      setApplication(prev => ({ ...prev, booking_url: null }));
      toast.success(t('applicationDetail.interviewFinished'));
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
    finally { setFinishingProposed(false); }
  };

  const handleRequestDocuments = async () => {
    const customNames = customDocFields.map(f => f.value.trim()).filter(Boolean);
    const typesToSend = [...selectedDocTypes, ...customNames];
    if (typesToSend.length === 0) { toast.error(t('applicationDetail.selectAtLeastOneDoc')); return; }
    setRequestingDocs(true);
    try {
      await apiFetch('/api/hiring/request-documents', {
        method: 'POST',
        body: JSON.stringify({
          application_id: application.id,
          candidate_email: application.candidate.email,
          candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
          job_title: application.job.title,
          company_name: application.job.company?.name || '',
          document_types: typesToSend,
          message: requestDocsMessage,
          language: i18n.language,
        }),
      });
      toast.success(t('applicationDetail.toasts.documentRequestSent'));
      setSelectedDocTypes(['contract', 'id_card', 'diploma']);
      setCustomDocFields([]);
      setRequestDocsMessage('');
      await reloadDocuments();
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
    finally { setRequestingDocs(false); }
  };

  const handleDeleteDocumentRequest = async (docId) => {
    if (!window.confirm(t('applicationDetail.deleteRequest'))) return;
    const { error } = await supabase.from('hiring_documents').delete().eq('id', docId);
    if (error) toast.error(error.message);
    else { toast.success(t('applicationDetail.confirmDeleteRequest')); await reloadDocuments(); }
  };

  const openEditModal = () => {
    const types = candidateDocuments.map(d => d.document_type);
    const standard = ['contract', 'id_card', 'diploma'];
    const standardSelected = standard.filter(t => types.includes(t));
    const customNames = types
      .filter(t => !standard.includes(t))
      .map(name => { const id = editDocIdRef.current++; return { id, value: name }; });
    setEditSelectedDocTypes(standardSelected);
    setEditCustomDocFields(customNames);
    setEditMessage('');
    setShowEditModal(true);
  };

  const handleEditDocuments = async () => {
    const customNames = editCustomDocFields.map(f => f.value.trim()).filter(Boolean);
    const typesToSend = [...editSelectedDocTypes, ...customNames];
    if (typesToSend.length === 0) { toast.error(t('applicationDetail.selectAtLeastOneDoc')); return; }
    setShowEditModal(false);
    try {
      await supabase.from('hiring_documents').delete().eq('application_id', application.id);
      await apiFetch('/api/hiring/request-documents', {
        method: 'POST',
        body: JSON.stringify({
          application_id: application.id,
          candidate_email: application.candidate.email,
          candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`,
          job_title: application.job.title,
          company_name: application.job.company?.name || '',
          document_types: typesToSend,
          message: editMessage,
          language: i18n.language,
        }),
      });
      toast.success(t('applicationDetail.requestModified'));
      await reloadDocuments();
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
  };

  const handleValidateDocument = async (docId, docType) => {
    try {
      const { error } = await supabase.from('hiring_documents').update({ status: 'validated' }).eq('id', docId);
      if (error) throw error;
      toast.success(t('applicationDetail.documentValidated'));
      await reloadDocuments();
      apiFetch('/api/notify-document-validated', {
        method: 'POST',
        body: JSON.stringify({ candidate_email: application.candidate.email, candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`, document_type: docType, language: i18n.language }),
      }).catch(console.error);
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
  };

  const handleRejectDocument = async (docId, docType) => {
    const reason = window.prompt(t('applicationDetail.rejectionReasonPrompt', 'Raison (optionnelle) :'));
    if (reason === null) return;
    try {
      const { error } = await supabase.from('hiring_documents').update({ status: 'rejected' }).eq('id', docId);
      if (error) throw error;
      toast.success(t('applicationDetail.documentRejected'));
      await reloadDocuments();
      apiFetch('/api/notify-document-rejected', {
        method: 'POST',
        body: JSON.stringify({ candidate_email: application.candidate.email, candidate_name: `${application.candidate.first_name} ${application.candidate.last_name}`, document_type: docType, reason: reason || '', language: i18n.language }),
      }).catch(console.error);
    } catch (err) { toast.error(err.message); }
  };

  const handleFinalizeHiring = async (message) => {
    setFinalizingHiring(true);
    try {
      await apiFetch('/api/hiring/finalize', {
        method: 'POST',
        body: JSON.stringify({ application_id: application.id, message: message, language: i18n.language }),
      });
      setApplication(prev => ({ ...prev, status: 'completed' }));
      toast.success(t('applicationDetail.finalizeSuccess', 'Recrutement finalisé !'));
      setFinalizeMessage('');
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
    finally { setFinalizingHiring(false); }
  };

  const handleNotifyOtherCandidates = async (message) => {
    setNotifyingOthers(true);
    try {
      const res = await apiFetch('/api/notify-other-candidates', {
        method: 'POST',
        body: JSON.stringify({ application_id: application.id, message: message, language: i18n.language }),
      });
      toast.success(t('applicationDetail.othersNotified', { count: res.count }, `${res.count} candidat(s) notifié(s)`));
      setOtherCandidatesMessage('');
    } catch (err) { const msg = getErrorMessage(err); if (msg) toast.error(msg); }
    finally { setNotifyingOthers(false); setShowOtherCandidatesModal(false); }
  };

  if (loading || planLoading) return <div className="pt-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  if (!application) return <div className="pt-20 text-center">{t('applicationDetail.notFound')}</div>;

  const candidate = application.candidate;
  const job = application.job;
  const statusLabel = t(`applicationDetail.status.${application.status}`, { defaultValue: application.status });
  const statusColors = {
    pending: 'bg-blue-100 text-blue-700', viewed: 'bg-slate-100 text-slate-700', shortlisted: 'bg-purple-100 text-purple-700',
    interview: 'bg-green-100 text-green-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700',
    completed: 'bg-green-200 text-green-800'
  };
  const statusColor = statusColors[application.status] || 'bg-slate-100 text-slate-700';

  const getDocumentLabel = (type) => {
    const labels = {
      contract: t('applicationDetail.docTypes.contract', 'Contrat signé'),
      id_card: t('applicationDetail.docTypes.id_card', "Pièce d'identité"),
      diploma: t('applicationDetail.docTypes.diploma', 'Diplôme'),
    };
    return labels[type] || type;
  };

  const totalDocs = candidateDocuments.length;
  const validatedDocs = candidateDocuments.filter(d => d.status === 'validated').length;
  const progressPercent = totalDocs > 0 ? Math.round((validatedDocs / totalDocs) * 100) : 0;
  const allDocsValidated = totalDocs > 0 && candidateDocuments.every(d => d.status === 'validated');

  const rawPhone = candidate?.phone || '';
  const cleanPhone = rawPhone.replace(/\s/g, '');
  const telLink = cleanPhone ? `tel:${cleanPhone}` : null;
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-0 bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise/candidatures"><Button variant="ghost" className="mb-6"><ChevronLeft className="w-4 h-4 mr-2" />{t('applicationDetail.back')}</Button></Link>

        {application.status === 'completed' && (
          <div className="bg-green-100 text-green-700 rounded-xl p-4 text-center mb-6">
            <CheckCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold">{t('applicationDetail.recruitmentCompleted', 'Recrutement finalisé')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start gap-6 mb-6">
                  <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                    {candidate?.avatar_url ? <img src={candidate.avatar_url} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-blue-600" />}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">{candidate?.first_name} {candidate?.last_name}</h1>
                    <p className="text-slate-600 flex items-center gap-2 mt-1"><Mail className="w-4 h-4" /> <a href={`mailto:${candidate?.email}`} className="text-blue-600 hover:underline">{candidate?.email}</a></p>
                    {candidate?.phone && (
                      <p className="text-slate-600 flex items-center gap-2 mt-1"><Phone className="w-4 h-4" /> {telLink ? <a href={telLink} className="text-blue-600 hover:underline font-mono">{candidate.phone}</a> : <span className="font-mono">{candidate.phone}</span>}</p>
                    )}
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

            {/* Bloc Notes d'entretien (toujours visible) */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" />{t('applicationDetail.interviewNotes')}</h3>
                <div className="flex flex-wrap gap-2 mb-4 border-b border-slate-200 pb-px">
                  {TABS.map(tab => (
                    <button key={tab.key} onClick={() => handleTabChange(tab.key)} className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeNoteTab === tab.key ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                      <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1" />{t(`notes.${tab.key}`)}
                    </button>
                  ))}
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                  {activeNoteTab === 'personal' && <EditableBlock title={t('notes.personal')} icon={FileText} content={notes.personal} onChange={(val) => setNotes(prev => ({ ...prev, personal: val }))} onSave={() => handleSaveNote('personal')} saving={savingNotes} onDelete={() => handleDeleteNote('personal')} lastSaved={lastSavedMap['personal']} t={t} />}
                  {activeNoteTab === 'questions' && <EditableBlock title={t('notes.questions')} icon={MessageSquare} content={notes.questions} onChange={(val) => setNotes(prev => ({ ...prev, questions: val }))} onSave={() => handleSaveNote('questions')} saving={savingNotes} onDelete={() => handleDeleteNote('questions')} lastSaved={lastSavedMap['questions']} t={t} />}
                  {activeNoteTab === 'answers' && <EditableBlock title={t('notes.answers')} icon={Lightbulb} content={notes.answers} onChange={(val) => setNotes(prev => ({ ...prev, answers: val }))} onSave={() => handleSaveNote('answers')} saving={savingNotes} onDelete={() => handleDeleteNote('answers')} lastSaved={lastSavedMap['answers']} t={t} />}
                  {activeNoteTab === 'tips' && <EditableBlock title={t('notes.tips')} icon={Lightbulb} content={notes.tips} onChange={(val) => setNotes(prev => ({ ...prev, tips: val }))} onSave={() => handleSaveNote('tips')} saving={savingNotes} onDelete={() => handleDeleteNote('tips')} lastSaved={lastSavedMap['tips']} t={t} />}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            <Card><CardContent className="p-6 text-center"><Badge className={`${statusColor} text-sm px-4 py-2`}>{statusLabel}</Badge><p className="text-xs text-slate-500 mt-2">{t('applicationDetail.receivedAt', { date: formatRelative(application.created_at) })}</p></CardContent></Card>

            {application.status !== 'completed' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">{t('applicationDetail.changeStatus')}</h3>
                  <div className="space-y-2">
                    {Object.entries(statusColors).filter(([key]) => key !== 'completed').map(([key]) => (
                      <button key={key} onClick={() => key === 'accepted' ? setShowAcceptModal(true) : handleStatusChange(key)} disabled={updating || application.status === key}
                        className={`w-full text-left px-4 py-2 rounded-xl text-sm font-medium transition-colors ${application.status === key ? 'bg-blue-50 text-blue-700 cursor-default' : 'hover:bg-slate-100 text-slate-700'}`}>
                        {t(`applicationDetail.status.${key}`)}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {isProOrBusiness && application.status === 'interview' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    {t('applicationDetail.scheduleInterview')}
                  </h3>

                  {bookingUrl ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm font-medium text-blue-900">
                          {t('applicationDetail.bookingLinkCreated')}
                        </p>
                        <a
                          href={bookingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-4 h-4" />
                          {t('applicationDetail.bookingLink')}
                        </a>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="w-full sm:flex-1 text-red-600 border-red-300 hover:bg-red-50 text-xs sm:text-sm px-2 sm:px-4"
                          onClick={handleCancelProposedInterview}
                          disabled={cancellingProposed}
                        >
                          {cancellingProposed ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                          <span className="truncate">{t('applicationDetail.cancelInterview')}</span>
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full sm:flex-1 text-slate-600 border-slate-300 hover:bg-slate-50 text-xs sm:text-sm px-2 sm:px-4"
                          onClick={handleFinishProposedInterview}
                          disabled={finishingProposed}
                        >
                          {finishingProposed ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                          <span className="truncate">{t('applicationDetail.finishInterview')}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowProposeModal(true)}
                      className="w-full"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      {t('applicationDetail.proposeSlots')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {application.status === 'accepted' && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">{t('applicationDetail.requestDocuments')}</h3>

                  <div className="space-y-2 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedDocTypes.includes('contract')} onChange={(e) => e.target.checked ? setSelectedDocTypes([...selectedDocTypes, 'contract']) : setSelectedDocTypes(selectedDocTypes.filter(t => t !== 'contract'))} className="rounded" />
                      <span className="text-sm">{t('applicationDetail.docTypes.contract', 'Contrat signé')}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedDocTypes.includes('id_card')} onChange={(e) => e.target.checked ? setSelectedDocTypes([...selectedDocTypes, 'id_card']) : setSelectedDocTypes(selectedDocTypes.filter(t => t !== 'id_card'))} className="rounded" />
                      <span className="text-sm">{t('applicationDetail.docTypes.id_card', "Pièce d'identité")}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedDocTypes.includes('diploma')} onChange={(e) => e.target.checked ? setSelectedDocTypes([...selectedDocTypes, 'diploma']) : setSelectedDocTypes(selectedDocTypes.filter(t => t !== 'diploma'))} className="rounded" />
                      <span className="text-sm">{t('applicationDetail.docTypes.diploma', 'Diplôme')}</span>
                    </label>
                  </div>

                  <div className="space-y-3 mb-4">
                    {customDocFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => {
                            const newFields = customDocFields.map((f, i) =>
                              i === index ? { ...f, value: e.target.value } : f
                            );
                            setCustomDocFields(newFields);
                          }}
                          placeholder={t('applicationDetail.customDocPlaceholder', 'Nom du document')}
                          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-0"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                          onClick={() => setCustomDocFields(prev => prev.filter(f => f.id !== field.id))}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        const id = customDocIdRef.current++;
                        setCustomDocFields(prev => [...prev, { id, value: '' }]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('applicationDetail.addDocument', 'Ajouter un document')}
                    </Button>
                  </div>

                  <textarea value={requestDocsMessage} onChange={(e) => setRequestDocsMessage(e.target.value)} placeholder={t('applicationDetail.documentRequestMessagePlaceholder')} className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4" rows={3} />
                  <Button onClick={handleRequestDocuments} disabled={requestingDocs} className="w-full bg-green-600 hover:bg-green-700 text-white">
                    {requestingDocs ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}{t('applicationDetail.sendDocumentRequest')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {candidateDocuments.length > 0 && (
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <h3 className="font-semibold text-slate-900 mb-4">{t('applicationDetail.documentsReceived')}</h3>

                  {totalDocs > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{t('applicationDetail.documentsProgress', { validated: validatedDocs, total: totalDocs }, `${validatedDocs}/${totalDocs} documents validés`)}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {candidateDocuments.map(doc => {
                      const isUploaded = doc.status === 'uploaded' || doc.status === 'validated';
                      const isPending = doc.status === 'pending';
                      const isAwaitingValidation = doc.status === 'uploaded';

                      let statusBadge = null;
                      if (doc.status === 'validated') statusBadge = (<Badge className="bg-green-100 text-green-700 border-0 text-xs"><CheckCircle className="w-3 h-3 mr-1" />{t('applicationDetail.validated')}</Badge>);
                      else if (doc.status === 'rejected') statusBadge = (<Badge className="bg-red-100 text-red-700 border-0 text-xs"><XCircle className="w-3 h-3 mr-1" />{t('applicationDetail.rejected')}</Badge>);
                      else if (isAwaitingValidation) statusBadge = (<Badge className="bg-blue-100 text-blue-700 border-0 text-xs"><Clock className="w-3 h-3 mr-1" />{t('applicationDetail.awaitingValidation')}</Badge>);
                      else if (isPending) statusBadge = (<Badge className="bg-yellow-100 text-yellow-700 border-0 text-xs"><Clock className="w-3 h-3 mr-1" />{t('candidateDocuments.status.pending', 'En attente')}</Badge>);

                      return (
                        <div key={doc.id} className="bg-slate-50 rounded-xl p-3 sm:p-4 border border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0"><FileText className="w-4 h-4 text-slate-500" /></div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">{getDocumentLabel(doc.document_type)}</p>
                                {isUploaded && doc.file_url && (
                                  <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs inline-flex items-center gap-1 mt-0.5"><FileText className="w-3 h-3" />{t('applicationDetail.view')}</a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">{statusBadge}</div>
                          </div>
                          {isAwaitingValidation && (
                            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-200/60">
                              <Button size="sm" variant="outline" className="text-green-600 border-green-300 hover:bg-green-50 flex-1 sm:flex-none" onClick={() => handleValidateDocument(doc.id, doc.document_type)}><CheckCircle className="w-4 h-4 mr-1" />{t('applicationDetail.validate')}</Button>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-none" onClick={() => handleRejectDocument(doc.id, doc.document_type)}><XCircle className="w-4 h-4 mr-1" />{t('applicationDetail.reject')}</Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 p-1 ml-auto" onClick={() => handleDeleteDocumentRequest(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          )}
                          {!isAwaitingValidation && (
                            <div className="flex justify-end mt-3 pt-3 border-t border-slate-200/60">
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 p-1" onClick={() => handleDeleteDocumentRequest(doc.id)}><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4"><Button variant="outline" size="sm" onClick={openEditModal}>{t('applicationDetail.editRequest')}</Button></div>
                </CardContent>
              </Card>
            )}

            {allDocsValidated && application.status === 'accepted' && (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    {t('applicationDetail.finalizeHiring', 'Finaliser l’embauche')}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    {t('applicationDetail.finalizeHelp', 'Tous les documents ont été validés. Vous pouvez finaliser le recrutement.')}
                  </p>
                  <Button
                    onClick={() => setShowFinalizeModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('applicationDetail.finalizeButton', 'Finaliser l’embauche')}
                  </Button>
                </CardContent>
              </Card>
            )}

            {application.status === 'completed' && (
              <Card className="border-slate-200 mt-4">
                <CardContent className="p-4">
                  <p className="text-sm text-slate-600 mb-3">
                    {t('applicationDetail.notifyOtherCandidatesHelp', 'Informer les autres candidats que le poste est pourvu.')}
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setShowOtherCandidatesModal(true)}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {t('applicationDetail.notifyOtherCandidates', 'Informer les autres candidats')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modales */}
      {showProposeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('applicationDetail.proposeInterviewTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('applicationDetail.duration')}</label>
                <select value={proposal.duration} onChange={(e) => setProposal({ ...proposal, duration: parseInt(e.target.value) })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                  <option value={30}>30 min</option><option value={45}>45 min</option><option value={60}>60 min</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">{t('applicationDetail.dateStart')}</label><input type="date" value={proposal.dateStart} onChange={(e) => setProposal({ ...proposal, dateStart: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" min={todayStr} /></div>
                <div><label className="block text-sm font-medium mb-1">{t('applicationDetail.dateEnd')}</label><input type="date" value={proposal.dateEnd} onChange={(e) => setProposal({ ...proposal, dateEnd: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" min={proposal.dateStart || todayStr} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">{t('applicationDetail.timeStart')}</label><input type="time" value={proposal.timeStart} onChange={(e) => setProposal({ ...proposal, timeStart: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
                <div><label className="block text-sm font-medium mb-1">{t('applicationDetail.timeEnd')}</label><input type="time" value={proposal.timeEnd} onChange={(e) => setProposal({ ...proposal, timeEnd: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">{t('applicationDetail.message')}</label><textarea value={proposal.message} onChange={(e) => setProposal({ ...proposal, message: e.target.value })} className="w-full border border-slate-200 rounded-lg p-3 text-sm" rows={3} placeholder={t('applicationDetail.messagePlaceholder')} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" onClick={() => setShowProposeModal(false)}>{t('common.cancel')}</Button>
              <Button className="bg-blue-600 text-white" onClick={handleProposeSlots} disabled={proposing}>{proposing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('common.confirm')}</Button>
            </div>
          </div>
        </div>
      )}

      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('applicationDetail.acceptTitle')}</h3>
            <textarea value={acceptMessage} onChange={(e) => setAcceptMessage(e.target.value)} placeholder={t('applicationDetail.acceptMessagePlaceholder')} className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4" rows={4} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowAcceptModal(false)}>{t('common.cancel', 'Annuler')}</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setShowAcceptModal(false); handleStatusChange('accepted', acceptMessage); setAcceptMessage(''); }}>{t('common.confirm', 'Confirmer')}</Button>
            </div>
          </div>
        </div>
      )}

      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('applicationDetail.finalizeModalTitle', 'Message au candidat')}</h3>
            <textarea value={finalizeMessage} onChange={(e) => setFinalizeMessage(e.target.value)} placeholder={t('applicationDetail.finalizeMessagePlaceholder', 'Votre message personnalisé (optionnel) – ex : Présentez-vous demain à 8h...')} className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4" rows={4} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowFinalizeModal(false)}>{t('common.cancel', 'Annuler')}</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={finalizingHiring} onClick={() => { setShowFinalizeModal(false); handleFinalizeHiring(finalizeMessage); }}>{finalizingHiring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('common.confirm', 'Confirmer')}</Button>
            </div>
          </div>
        </div>
      )}

      {showOtherCandidatesModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('applicationDetail.otherCandidatesModalTitle', 'Message aux autres candidats')}</h3>
            <textarea value={otherCandidatesMessage} onChange={(e) => setOtherCandidatesMessage(e.target.value)} placeholder={t('applicationDetail.otherCandidatesMessagePlaceholder', 'Ajouter un message personnalisé (optionnel)')} className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4" rows={4} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowOtherCandidatesModal(false)}>{t('common.cancel', 'Annuler')}</Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={notifyingOthers} onClick={() => handleNotifyOtherCandidates(otherCandidatesMessage)}>{notifyingOthers ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('applicationDetail.sendNotifications', 'Envoyer')}</Button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('applicationDetail.editRequest')}</h3>
            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={editSelectedDocTypes.includes('contract')} onChange={(e) => e.target.checked ? setEditSelectedDocTypes([...editSelectedDocTypes, 'contract']) : setEditSelectedDocTypes(editSelectedDocTypes.filter(t => t !== 'contract'))} /><span className="text-sm">{t('applicationDetail.docTypes.contract', 'Contrat signé')}</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editSelectedDocTypes.includes('id_card')} onChange={(e) => e.target.checked ? setEditSelectedDocTypes([...editSelectedDocTypes, 'id_card']) : setEditSelectedDocTypes(editSelectedDocTypes.filter(t => t !== 'id_card'))} /><span className="text-sm">{t('applicationDetail.docTypes.id_card', "Pièce d'identité")}</span></label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={editSelectedDocTypes.includes('diploma')} onChange={(e) => e.target.checked ? setEditSelectedDocTypes([...editSelectedDocTypes, 'diploma']) : setEditSelectedDocTypes(editSelectedDocTypes.filter(t => t !== 'diploma'))} /><span className="text-sm">{t('applicationDetail.docTypes.diploma', 'Diplôme')}</span></label>
            </div>
            <div className="space-y-3 mb-4">
              {editCustomDocFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <input type="text" value={field.value} onChange={(e) => { const newFields = editCustomDocFields.map((f, i) => i === index ? { ...f, value: e.target.value } : f); setEditCustomDocFields(newFields); }} placeholder={t('applicationDetail.customDocPlaceholder')} className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm min-w-0" />
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setEditCustomDocFields(prev => prev.filter(f => f.id !== field.id))}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={() => { const id = editDocIdRef.current++; setEditCustomDocFields(prev => [...prev, { id, value: '' }]); }}><Plus className="w-4 h-4 mr-2" />{t('applicationDetail.addDocument')}</Button>
            </div>
            <textarea value={editMessage} onChange={(e) => setEditMessage(e.target.value)} className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4" rows={3} placeholder={t('applicationDetail.documentRequestMessagePlaceholder')} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowEditModal(false)}>{t('common.cancel', 'Annuler')}</Button>
              <Button className="bg-blue-600 text-white" onClick={handleEditDocuments}>{t('common.confirm', 'Enregistrer')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationDetailPage;