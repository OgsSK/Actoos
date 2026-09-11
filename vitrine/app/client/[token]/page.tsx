'use client';
import { SUPABASE_FUNCTIONS_URL } from '../../../lib/supabase-functions';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, MessageSquare, RefreshCw,
  Upload, FileText, Send, Download, Eye, Trash2, Edit3, X, Clock
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';
import BookingModal from '../../components/BookingModal';


// ----- Helpers -----
function normalizeStatus(value: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
}

function getClientStatus(status: string, lang: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, Record<string, string>> = {
    nouveau: { fr: 'Nouveau', en: 'New' },
    contacté: { fr: 'En discussion', en: 'In discussion' },
    devis_envoyé: { fr: 'Devis envoyé', en: 'Quote sent' },
    en_cours: { fr: 'En cours', en: 'In progress' },
    gagné: { fr: 'Accepté', en: 'Accepted' },
    perdu: { fr: 'Refusé', en: 'Refused' },
    livré: { fr: 'Livré', en: 'Delivered' },
    terminé: { fr: 'Terminé', en: 'Completed' },
  };
  return labels[normalized]?.[lang] || (lang === 'fr' ? 'En attente' : 'Pending');
}

function getClientPaymentStatus(status: string, lang: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, Record<string, string>> = {
    aucun: { fr: 'Non payé', en: 'Unpaid' },
    devis_envoyé: { fr: 'Devis envoyé', en: 'Quote sent' },
    acompte_payé: { fr: 'Acompte payé', en: 'Deposit paid' },
    partiel: { fr: 'Partiellement payé', en: 'Partially paid' },
    complet: { fr: 'Payé', en: 'Paid' },
    remboursé: { fr: 'Remboursé', en: 'Refunded' },
    litige: { fr: 'Litige', en: 'Dispute' },
    annulé: { fr: 'Annulé', en: 'Cancelled' },
  };
  return labels[normalized]?.[lang] || (lang === 'fr' ? 'Non payé' : 'Unpaid');
}

function normalizeConversation(value: any) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  if (Array.isArray(value.messages)) return value.messages;
  if (Array.isArray(value.chat)) return value.chat;
  return [];
}

// Statuts pour lesquels le client a un accès complet (RDV, messages, fichiers, commentaires)
const ACCEPTED_STATUSES = ['gagné', 'en_cours', 'livré', 'terminé'];

const PROJECT_TYPE_LABELS: Record<string, { fr: string; en: string }> = {
  'site-vitrine': { fr: 'Site vitrine', en: 'Showcase website' },
  'e-commerce': { fr: 'E-commerce', en: 'E-commerce' },
  'application-mobile': { fr: 'Application mobile', en: 'Mobile app' },
  'application-web': { fr: 'Application web', en: 'Web app' },
  'logiciel-saas': { fr: 'Logiciel SaaS', en: 'SaaS software' },
  'autre': { fr: 'Autre', en: 'Other' },
};

function getProjectTypeLabel(value: string, lang: 'fr' | 'en'): string {
  if (!value) return '';
  const label = PROJECT_TYPE_LABELS[value];
  return label ? label[lang] : value;
}

// ----- Composant principal -----
export default function ClientSpacePage() {
  const { language, setLanguage } = useLanguage();

  const params = useParams<{ token: string }>();
  const routeToken = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : '';

  const [token, setToken] = useState(routeToken || '');
  const [projet, setProjet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fichiers' | 'commentaires'>('dashboard');
  const [commentText, setCommentText] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  const [clientLastRead, setClientLastRead] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('client_last_read') || new Date().toISOString() : new Date().toISOString()
  );

  const [previewFile, setPreviewFile] = useState<any>(null);
  const [showBooking, setShowBooking] = useState(false);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token') || '';
    const effectiveToken = routeToken || urlToken;
    if (effectiveToken && effectiveToken !== token) setToken(effectiveToken);
  }, [routeToken, token]);

  const loadProject = useCallback(async (silent = false) => {
    if (!token) return;
    if (silent) setRefreshing(true);
    else setLoading(true);
    const uniqueParam = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-client-project?token=${encodeURIComponent(token)}&_=${uniqueParam}`, {
        headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        setProjet(null);
      } else {
        if (data.booking_id && data.booking_start && new Date(data.booking_start) < new Date()) {
          fetch(`${SUPABASE_FUNCTIONS_URL}/clean-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: data.id }),
          }).catch(() => {});
          data.booking_id = null;
          data.booking_start = null;
          data.booking_link = null;
        }
        setProjet(data);
        setLastSyncAt(new Date());
        loadComments(data.id);
        loadFiles(data.id);
      }
    } catch (err) { console.error('Erreur fetch client:', err); } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [token]);

  const loadComments = async (projectId: string) => {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-comments?project_id=${projectId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { setComments([]); }
  };

  const loadFiles = async (projectId: string) => {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-files?project_id=${projectId}`);
      const data = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch { setFiles([]); }
  };

  useEffect(() => { loadProject(false); }, [loadProject]);
  useEffect(() => {
    const interval = setInterval(() => loadProject(true), 4000);
    const onFocus = () => loadProject(true);
    const onVisible = () => { if (!document.hidden) loadProject(true); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onVisible); };
  }, [loadProject]);

  useEffect(() => {
    if (activeTab === 'commentaires') {
      const now = new Date().toISOString();
      localStorage.setItem('client_last_read', now);
      setClientLastRead(now);
    }
  }, [activeTab]);

  const handleCancelBooking = async (projectId: string, bookingId: string) => {
    if (!confirm(t[language].clientCancelAppointmentConfirm)) return;
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/cancel-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, project_id: projectId }),
      });
      const data = await res.json();
      if (data.success) {
        loadProject(true);
      } else {
        alert(data.error || t[language].clientErrorCancelAppointment);
      }
    } catch (err) {
      alert(t[language].clientErrorCancelAppointment);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setMessageLoading(true);
    try {
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'contact@actoos.com', name: projet?.client_name || 'Client', email: projet?.client_email || '', message,
          html: `<h2>${t[language].clientMessageFrom} ${projet?.client_name || 'un client'}</h2><p>${message}</p>`,
        }),
      });
      setMessageSent(true); setMessage('');
      loadProject(true);
    } catch (err) { console.error(err); } finally { setMessageLoading(false); }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setCommentSending(true);
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/add-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projet?.id, author: 'client', content: commentText }),
      });
      setCommentText('');
      loadComments(projet?.id);
    } catch (err) { console.error(err); } finally { setCommentSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('project_id', projet?.id);
      if (uploadMessage.trim()) formData.append('message', uploadMessage.trim());
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/upload-file`, {
        method: 'POST', body: formData,
      });
      if (res.ok) {
        setUploadMessage('');
        loadFiles(projet?.id);
      }
    } catch (err) { console.error(err); } finally { setUploading(false); }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm(t[language].clientDeleteFileConfirm)) return;
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-file`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId }),
      });
      loadFiles(projet?.id);
    } catch (err) { console.error(err); }
  };

  const handleEditComment = async (id: string, content: string) => {
    if (!content.trim()) return;
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/edit-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content, author: 'client' }),
      });
      setEditingCommentId(null);
      setEditCommentContent('');
      loadComments(projet?.id);
    } catch (err) { alert(t[language].clientErrorEditComment); }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm(t[language].clientDeleteCommentConfirm)) return;
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadComments(projet?.id);
    } catch (err) { alert(t[language].clientErrorDeleteComment); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
    </div>
  );

  if (!projet) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-white">
      <div className="text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">{t[language].clientNotFoundTitle}</h1>
        <p className="text-slate-500 text-sm mb-6">{t[language].clientNotFoundDesc}</p>
        <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          {t[language].clientBackHome}
        </a>
      </div>
    </div>
  );

  const conversation = normalizeConversation(projet.conversation);
  const unreadCount = comments.filter(c => c.author !== 'client' && c.created_at > clientLastRead).length;

  const projectTitle = projet.project_name || projet.projectName || projet.brief?.projectName || t[language].clientYourProject;
  const projectDescription = projet.client_message || projet.brief?.objective || '';
  const projectTypeRaw = projet.project_type || projet.brief?.type || '';
  const projectTypeLabel = getProjectTypeLabel(projectTypeRaw, language);
  const projectBudget = projet.budget || '';
  const hasBrief = !!projet.brief;
  const hasGeneralInfo = !!(projectTitle || projectTypeLabel || projectBudget);

  // 🔒 Verrou d'accès : RDV, messages, fichiers, commentaires uniquement si accepté
  const statusNormalized = normalizeStatus(projet.status || '');
  const isAccepted = ACCEPTED_STATUSES.includes(statusNormalized);
  const isRefused = statusNormalized === 'perdu';
  const isPending = !isAccepted && !isRefused;

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-2.5 min-w-0">
            <img src="/logo-icon.png" alt="Actoos" className="h-8 w-8 object-contain shrink-0" />
            <span className="font-bold text-base tracking-tight text-slate-900 truncate">
              {t[language].clientSpaceTitle}
            </span>
          </a>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >FR</button>
              <span className="text-slate-300 text-xs">/</span>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >EN</button>
            </div>
            <a href="/" className="hidden sm:flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={15} />
              <span>{t[language].clientBackHome}</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* En-tête */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 break-words">
              {projectTitle}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t[language].clientFollowProgress}</p>
          </div>
          <button
            onClick={() => loadProject(true)}
            className="shrink-0 px-4 py-2 rounded-full bg-white border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t[language].clientRefresh}</span>
          </button>
        </div>

        {/* 🟡 Bandeau d'attente (projet pas encore accepté) */}
        {isPending && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
            <Clock size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800">
                {language === 'en' ? 'Project under review' : "Projet en cours d'étude"}
              </p>
              <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                {language === 'en'
                  ? 'Our team is reviewing your project. Detailed tracking (messages, files, appointments) will be available once your project is accepted.'
                  : "Notre équipe étudie votre projet. Le suivi détaillé (messages, fichiers, rendez-vous) sera disponible dès que votre projet sera accepté."}
              </p>
            </div>
          </div>
        )}

        {/* 🔒 Rendez-vous — uniquement si projet accepté */}
        {isAccepted && (
          <div>
            {projet.booking_id ? (
              <div className="bg-white rounded-2xl p-5 border border-blue-200">
                <h3 className="font-semibold text-base flex items-center gap-2 mb-4 text-slate-900">
                  <Calendar size={16} className="text-blue-600" />
                  {t[language].clientUpcomingAppointment}
                </h3>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p>
                    <strong className="text-slate-900">{t[language].clientDate} :</strong>{" "}
                    {new Date(projet.booking_start).toLocaleDateString(
                      language === 'fr' ? 'fr-FR' : 'en-US',
                      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                  <p>
                    <strong className="text-slate-900">{t[language].clientTime} :</strong>{" "}
                    {new Date(projet.booking_start).toLocaleTimeString(
                      language === 'fr' ? 'fr-FR' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </p>
                  {projet.booking_link && (
                    <a
                      href={projet.booking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-700"
                    >
                      {t[language].clientJoinMeeting}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleCancelBooking(projet.id, projet.booking_id)}
                  className="mt-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                >
                  {t[language].clientCancelAppointment}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowBooking(true)}
                className="inline-flex items-center gap-2 bg-white rounded-full px-5 py-2.5 text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <Calendar size={15} className="text-blue-600" />
                {t[language].clientSchedule}
              </button>
            )}
          </div>
        )}

        {/* Étapes */}
        {projet.steps && Array.isArray(projet.steps) && projet.steps.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200">
            <h2 className="font-semibold text-base mb-4 text-slate-900">
              {t[language].clientProgressTitle}
            </h2>
            <div className="space-y-3">
              {projet.steps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step.status === 'terminé' ? 'bg-emerald-500 text-white' :
                    step.status === 'en_cours' ? 'bg-blue-600 text-white animate-pulse' :
                    'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}>
                    {step.status === 'terminé' ? '✓' : step.status === 'en_cours' ? '●' : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${
                      step.status === 'terminé' ? 'text-emerald-700 line-through' :
                      step.status === 'en_cours' ? 'text-slate-900 font-medium' :
                      'text-slate-400'
                    }`}>
                      {step.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {step.status === 'terminé' ? t[language].clientStepCompleted :
                       step.status === 'en_cours' ? t[language].clientStepInProgress :
                       t[language].clientStepTodo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages d'état */}
        {projet.status === 'gagné' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-sm font-medium text-emerald-800">{t[language].clientAcceptedTitle}</p>
            <p className="text-xs text-emerald-700 mt-1">{t[language].clientAcceptedDesc}</p>
          </div>
        )}
        {projet.archived && projet.status === 'perdu' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800">{t[language].clientPendingTitle}</p>
          </div>
        )}
        {projet.status === 'perdu' && !projet.archived && projet.decision_message && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-medium text-red-800">{t[language].clientRefusedTitle}</p>
            <p className="text-xs text-red-700 mt-1">
              {t[language].clientRefusedReason} : {projet.decision_message}
            </p>
          </div>
        )}

        {/* Cartes statut */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <span className="text-xs text-slate-400">{t[language].clientStatus}</span>
            <p className="font-medium text-sm mt-1 truncate text-slate-900">{getClientStatus(projet.status, language)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <span className="text-xs text-slate-400">{t[language].clientPayment}</span>
            <p className="font-medium text-sm mt-1 truncate text-slate-900">{getClientPaymentStatus(projet.payment_status, language)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <span className="text-xs text-slate-400">{t[language].clientLastUpdate}</span>
            <p className="font-medium text-sm mt-1 truncate text-slate-900">
              {lastSyncAt ? lastSyncAt.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        </div>

        {/* 🔒 Onglets — Fichiers/Commentaires uniquement si projet accepté */}
        {isAccepted && (
          <>
            <div className="border-b border-slate-200">
              <div className="flex items-center gap-1 -mb-px">
                {[
                  { id: 'dashboard', label: t[language].clientTabDashboard, badge: null },
                  { id: 'fichiers', label: t[language].clientTabFiles, badge: null },
                  { id: 'commentaires', label: t[language].clientTabComments, badge: unreadCount },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                      {tab.badge !== null && tab.badge > 0 && (
                        <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Dashboard (toujours visible) */}
        {activeTab === 'dashboard' && (
          <>
            {projectDescription ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <p className="text-xs text-slate-400 mb-2">
                  {language === 'en' ? 'Project description' : 'Description du projet'}
                </p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{projectDescription}</p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-5 border border-dashed border-slate-200 text-center text-sm text-slate-400">
                {language === 'en' ? 'No description provided.' : 'Aucune description fournie.'}
              </div>
            )}

            {hasGeneralInfo && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <h2 className="font-semibold text-base mb-4 text-slate-900">
                  {language === 'en' ? 'General information' : 'Informations générales'}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  {projectTitle && (
                    <div>
                      <span className="text-xs text-slate-400">{language === 'en' ? 'Title' : 'Titre'}</span>
                      <p className="font-medium text-slate-900 break-words mt-0.5">{projectTitle}</p>
                    </div>
                  )}
                  {projectTypeLabel && (
                    <div>
                      <span className="text-xs text-slate-400">{language === 'en' ? 'Type' : 'Type'}</span>
                      <p className="font-medium text-slate-900 mt-0.5">{projectTypeLabel}</p>
                    </div>
                  )}
                  {projectBudget && (
                    <div>
                      <span className="text-xs text-slate-400">{language === 'en' ? 'Budget' : 'Budget'}</span>
                      <p className="font-medium text-slate-900 mt-0.5">{projectBudget} €</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasBrief && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200">
                <h2 className="font-semibold text-base mb-4 text-slate-900">{t[language].clientProjectDetails}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(projet.brief).filter(([key]) => !['features', 'stack'].includes(key)).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <p className="font-medium text-sm break-words text-slate-900 mt-0.5">{value?.toString() || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {conversation.length > 0 && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                <h2 className="font-semibold text-base flex items-center gap-2 text-slate-900">
                  <MessageSquare size={16} className="text-blue-600" />
                  {t[language].clientConversation}
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {conversation.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                        msg.role === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}>
                        <div className={`text-xs mb-1 ${msg.role === 'user' ? 'opacity-80' : 'text-slate-400'}`}>
                          {msg.role === 'user' ? t[language].clientYou : 'Actoos'}
                        </div>
                        <div className="break-words">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 🔒 Formulaire d'envoi de message — uniquement si projet accepté */}
            {isAccepted && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                <h2 className="font-semibold text-base flex items-center gap-2 text-slate-900">
                  <MessageSquare size={16} className="text-blue-600" />
                  {t[language].clientSendMessage}
                </h2>
                {messageSent && (
                  <p className="text-emerald-600 text-xs font-medium">{t[language].clientMessageSent}</p>
                )}
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={t[language].clientMessagePlaceholder}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none transition-colors"
                  rows={4}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!message.trim() || messageLoading}
                  className="bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-slate-800 transition-colors"
                >
                  {messageLoading ? t[language].clientSending : t[language].clientSend}
                </button>
              </div>
            )}
          </>
        )}

        {/* Fichiers (uniquement si accepté) */}
        {isAccepted && activeTab === 'fichiers' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2 text-slate-900">
              <Upload size={16} className="text-blue-600" />
              {t[language].clientFilesTitle}
            </h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={uploadMessage}
                onChange={e => setUploadMessage(e.target.value)}
                placeholder={t[language].clientUploadMessagePlaceholder}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg font-medium text-sm cursor-pointer hover:bg-slate-800 transition-colors">
                <Upload size={14} />
                {t[language].clientUpload}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-xs text-slate-500">{t[language].clientUploading}</p>}
            <div className="space-y-2">
              {files.length === 0 && <p className="text-sm text-slate-400">{t[language].clientNoFiles}</p>}
              {files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-slate-900">{f.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {new Date(f.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {f.uploaded_by === 'client' ? t[language].clientYou : t[language].clientTeam}
                      </p>
                      {f.message && <p className="text-xs text-slate-500 italic mt-1 truncate">"{f.message}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setPreviewFile(f)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Eye size={15} className="text-slate-500" />
                    </button>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                      <Download size={15} className="text-blue-600" />
                    </a>
                    {f.uploaded_by === 'client' && (
                      <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={15} className="text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commentaires (uniquement si accepté) */}
        {isAccepted && activeTab === 'commentaires' && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
            <h2 className="font-semibold text-base flex items-center gap-2 text-slate-900">
              <MessageSquare size={16} className="text-blue-600" />
              {t[language].clientCommentsTitle}
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={t[language].clientCommentPlaceholder}
                className="flex-1 min-w-0 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }}
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || commentSending}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50 shrink-0 hover:bg-slate-800 transition-colors"
              >
                <Send size={15} />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-slate-400">{t[language].clientNoComments}</p>}
              {comments.map((c: any) => (
                <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                    c.author === 'client'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-50 border border-slate-200 text-slate-700'
                  }`}>
                    {editingCommentId === c.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editCommentContent}
                          onChange={e => setEditCommentContent(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
                          autoFocus
                          onKeyDown={async (e) => {
                            if (e.key === 'Enter') await handleEditComment(c.id, editCommentContent);
                            if (e.key === 'Escape') setEditingCommentId(null);
                          }}
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-white/80 hover:text-white">
                            {t[language].clientCancel}
                          </button>
                          <button onClick={() => handleEditComment(c.id, editCommentContent)} className="text-xs bg-white/20 px-2 py-1 rounded hover:bg-white/30">
                            {t[language].clientSave}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={`text-xs mb-1 flex items-center gap-2 flex-wrap ${c.author === 'client' ? 'opacity-80' : 'text-slate-400'}`}>
                          <span>{c.author === 'client' ? t[language].clientYou : t[language].clientTeam}</span>
                          <span>· {new Date(c.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                          {c.edited_at && <span>({t[language].clientEdited})</span>}
                        </div>
                        <p className="break-words">{c.content}</p>
                        {c.author === 'client' && new Date(c.created_at) > new Date(Date.now() - 5 * 60 * 1000) && (
                          <div className="flex gap-2 mt-1.5">
                            <button
                              onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }}
                              className="text-xs opacity-80 hover:opacity-100 flex items-center gap-1"
                            >
                              <Edit3 size={11} /> {t[language].clientEdit}
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="text-xs opacity-80 hover:opacity-100 flex items-center gap-1"
                            >
                              <Trash2 size={11} /> {t[language].clientDelete}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Prévisualisation */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <span className="font-medium text-sm text-slate-900 truncate">{previewFile.name}</span>
              <button onClick={() => setPreviewFile(null)} className="p-1 text-slate-400 hover:text-slate-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {previewFile.type?.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full rounded-lg" />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe src={previewFile.url} className="w-full h-96 rounded-lg" title={previewFile.name} />
              ) : (
                <div className="text-center py-12 text-sm text-slate-400">
                  {t[language].clientPreviewUnavailable}{' '}
                  <a href={previewFile.url} target="_blank" className="text-blue-600 font-medium hover:underline">
                    {t[language].clientDownload}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BookingModal (uniquement si accepté) */}
      {isAccepted && showBooking && projet && (
        <BookingModal
          clientName={projet.client_name}
          clientEmail={projet.client_email}
          projectName={projet.brief?.projectName || projet.projectName || projet.project_name}
          projectId={projet.id}
          onClose={() => setShowBooking(false)}
          onBooked={() => { loadProject(true); setShowBooking(false); }}
        />
      )}
    </div>
  );
}