'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, MessageSquare, RefreshCw,
  Upload, FileText, Send, Download, Activity, Eye, Trash2, Edit3, X, Check
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';
import BookingModal from '../../components/BookingModal';

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
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-client-project?token=${encodeURIComponent(token)}&_=${uniqueParam}`, {
        headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.error) {
        setProjet(null);
      } else {
        // ✅ Nettoyer le rendez-vous s'il est passé
        if (data.booking_id && data.booking_start && new Date(data.booking_start) < new Date()) {
          fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/clean-booking', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: data.id }),
          }).catch(() => {});
          // Mettre à jour l'état local immédiatement
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
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-comments?project_id=${projectId}`);
      const data = await res.json();
      setComments(Array.isArray(data) ? data : []);
    } catch { setComments([]); }
  };

  const loadFiles = async (projectId: string) => {
    try {
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-files?project_id=${projectId}`);
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
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/cancel-booking', {
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
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/add-comment', {
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
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/upload-file', {
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
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-file', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId }),
      });
      loadFiles(projet?.id);
    } catch (err) { console.error(err); }
  };

  const handleEditComment = async (id: string, content: string) => {
    if (!content.trim()) return;
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/edit-comment', {
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
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadComments(projet?.id);
    } catch (err) { alert(t[language].clientErrorDeleteComment); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4AF37] border-t-transparent" /></div>;
  if (!projet) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-black text-slate-900">{t[language].clientNotFoundTitle}</h1>
        <p className="text-slate-500 mt-2">{t[language].clientNotFoundDesc}</p>
        <a href="/" className="text-[#D4AF37] font-bold mt-4 inline-block">{t[language].clientBackHome}</a>
      </div>
    </div>
  );

  const conversation = normalizeConversation(projet.conversation);
  const unreadCount = comments.filter(c => c.author !== 'client' && c.created_at > clientLastRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      {/* Navbar compacte et responsive */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center shrink-0">
              <RefreshCw size={18} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-black text-lg sm:text-xl leading-tight">
                {t[language].clientSpaceTitle}<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[10px] text-slate-400 block">Actoos</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center space-x-2 sm:space-x-4 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-slate-400">
              <button onClick={() => setLanguage('fr')} className={`${language === 'fr' ? 'text-slate-900 underline' : 'hover:text-black'}`}>FR</button>
              <button onClick={() => setLanguage('en')} className={`${language === 'en' ? 'text-slate-900 underline' : 'hover:text-black'}`}>EN</button>
            </div>
            <a href="/" className="text-slate-400 hover:text-slate-600 font-bold flex items-center gap-1 text-xs sm:text-sm">
              <ArrowLeft size={16} className="shrink-0" />
              <span className="hidden sm:inline">{t[language].clientBackHome}</span>
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* En-tête du projet */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 break-words">
              {projet.brief?.projectName || t[language].clientYourProject}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{t[language].clientFollowProgress}</p>
          </div>
          <button onClick={() => loadProject(true)} className="shrink-0 px-3 py-2 rounded-xl bg-white border shadow-sm text-sm font-bold flex items-center gap-1 hover:bg-slate-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{t[language].clientRefresh}</span>
          </button>
        </div>

        {/* Actions : rendez-vous uniquement */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {projet.booking_id ? (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#D4AF37]/30 w-full">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                <Calendar size={18} className="text-[#D4AF37]" />
                {t[language].clientUpcomingAppointment}
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>{t[language].clientDate} :</strong>{" "}
                  {new Date(projet.booking_start).toLocaleDateString(
                    language === 'fr' ? 'fr-FR' : 'en-US',
                    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                  )}
                </p>
                <p>
                  <strong>{t[language].clientTime} :</strong>{" "}
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
                    className="inline-flex items-center gap-1 text-[#D4AF37] font-bold hover:underline"
                  >
                    {t[language].clientJoinMeeting}
                  </a>
                )}
              </div>
              <button
                onClick={() => handleCancelBooking(projet.id, projet.booking_id)}
                className="mt-4 bg-red-50 text-red-700 px-4 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors w-full sm:w-auto"
              >
                {t[language].clientCancelAppointment}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBooking(true)}
              className="inline-flex items-center justify-center gap-2 bg-white rounded-2xl px-5 py-3 text-sm font-bold shadow-sm border hover:bg-slate-50 transition-colors w-full sm:w-auto"
            >
              <Calendar size={16} className="text-[#D4AF37]" /> {t[language].clientSchedule}
            </button>
          )}
        </div>

        {/* Timeline des étapes */}
        {projet.steps && Array.isArray(projet.steps) && projet.steps.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h2 className="font-bold text-lg mb-4">📈 {t[language].clientProgressTitle}</h2>
            <div className="space-y-3">
              {projet.steps.map((step: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.status === 'terminé' ? 'bg-green-500 text-white' :
                    step.status === 'en_cours' ? 'bg-[#D4AF37] text-white animate-pulse' :
                    'bg-slate-200 text-slate-400'
                  }`}>
                    {step.status === 'terminé' ? '✓' : step.status === 'en_cours' ? '●' : idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm truncate ${step.status === 'terminé' ? 'text-green-700 line-through' : step.status === 'en_cours' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
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

        {/* Messages acceptation/refus */}
        {projet.status === 'gagné' && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-sm text-green-700 font-medium">✅ {t[language].clientAcceptedTitle}</p>
            <p className="text-sm text-green-600 mt-1">{t[language].clientAcceptedDesc}</p>
          </div>
        )}
        {projet.archived && projet.status === 'perdu' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700 font-medium">⏳ {t[language].clientPendingTitle}</p>
          </div>
        )}
        {projet.status === 'perdu' && !projet.archived && projet.decision_message && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700 font-medium">❌ {t[language].clientRefusedTitle}</p>
            <p className="text-sm text-red-600 mt-1">{t[language].clientRefusedReason}: {projet.decision_message}</p>
          </div>
        )}

        {/* Statut / Paiement / Complexité / Mise à jour */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border">
            <span className="text-xs text-slate-400">{t[language].clientStatus}</span>
            <p className="font-bold text-sm mt-1 truncate">{getClientStatus(projet.status, language)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border">
            <span className="text-xs text-slate-400">{t[language].clientPayment}</span>
            <p className="font-bold text-sm mt-1 truncate">{getClientPaymentStatus(projet.payment_status, language)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border">
            <span className="text-xs text-slate-400">{t[language].clientComplexity}</span>
            <p className="font-bold text-sm mt-1 truncate">{projet.brief?.complexity || t[language].clientUnspecified}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border">
            <span className="text-xs text-slate-400">{t[language].clientLastUpdate}</span>
            <p className="font-bold text-sm mt-1 truncate">
              {lastSyncAt ? lastSyncAt.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
            </p>
          </div>
        </div>

        {/* Barre de progression du paiement supprimée */}

        {/* Onglets – défilement horizontal sur mobile */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 pb-1">
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 shadow-sm w-fit min-w-max px-4 sm:px-0">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>📊 {t[language].clientTabDashboard}</button>
            <button onClick={() => setActiveTab('fichiers')} className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'fichiers' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>📁 {t[language].clientTabFiles}</button>
            <button onClick={() => setActiveTab('commentaires')} className={`px-4 sm:px-5 py-2 rounded-xl text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === 'commentaires' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
              💬 {t[language].clientTabComments}
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Contenu des onglets */}
        {activeTab === 'dashboard' && (
          <>
            {projet.client_message && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border">
                <p className="text-xs text-slate-400 mb-2">{t[language].clientYourRequest}</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{projet.client_message}</p>
              </div>
            )}
            {projet.brief && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border">
                <h2 className="font-bold text-lg mb-4">📋 {t[language].clientProjectDetails}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(projet.brief).filter(([key]) => !['features', 'stack'].includes(key)).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <p className="font-medium text-sm break-words">{value?.toString() || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {conversation.length > 0 && (
              <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
                <h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> {t[language].clientConversation}</h2>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {conversation.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#D4AF37] text-white' : 'bg-slate-50 border'}`}>
                        <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? t[language].clientYou : 'Actoos'}</div>
                        <div className="break-words">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> {t[language].clientSendMessage}</h2>
              {messageSent && <p className="text-emerald-600 text-sm font-medium">✅ {t[language].clientMessageSent}</p>}
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={t[language].clientMessagePlaceholder} className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37] resize-none" rows={4} />
              <button onClick={handleSendMessage} disabled={!message.trim() || messageLoading} className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-amber-500 transition-colors w-full sm:w-auto">
                {messageLoading ? t[language].clientSending : t[language].clientSend}
              </button>
            </div>
          </>
        )}

        {activeTab === 'fichiers' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><Upload size={18} className="text-[#D4AF37]" /> {t[language].clientFilesTitle}</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input type="text" value={uploadMessage} onChange={e => setUploadMessage(e.target.value)} placeholder={t[language].clientUploadMessagePlaceholder} className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D4AF37]" />
              <label className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-amber-500 transition-colors">
                <Upload size={16} /> {t[language].clientUpload}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-sm text-slate-500">{t[language].clientUploading}</p>}
            <div className="space-y-2">
              {files.length === 0 && <p className="text-sm text-slate-400">{t[language].clientNoFiles}</p>}
              {files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{f.name}</p>
                      <p className="text-xs text-slate-400 truncate">{new Date(f.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {f.uploaded_by === 'client' ? t[language].clientYou : t[language].clientTeam}</p>
                      {f.message && <p className="text-xs text-slate-500 italic mt-1 truncate">"{f.message}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setPreviewFile(f)} className="p-2 hover:bg-slate-200 rounded-lg"><Eye size={16} className="text-slate-500" /></button>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded-lg"><Download size={16} className="text-[#D4AF37]" /></a>
                    {f.uploaded_by === 'client' && (
                      <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commentaires' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> {t[language].clientCommentsTitle}</h2>
            <div className="flex gap-2">
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={t[language].clientCommentPlaceholder} className="flex-1 min-w-0 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]" onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
              <button onClick={handleAddComment} disabled={!commentText.trim() || commentSending} className="bg-[#D4AF37] text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50 shrink-0"><Send size={16} /></button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-slate-400">{t[language].clientNoComments}</p>}
              {comments.map((c: any) => (
                <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl text-sm ${c.author === 'client' ? 'bg-[#D4AF37] text-white' : 'bg-slate-50 border'}`}>
                    {editingCommentId === c.id ? (
                      <div className="flex flex-col gap-2">
                        <input value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" autoFocus onKeyDown={async (e) => { if (e.key === 'Enter') await handleEditComment(c.id, editCommentContent); if (e.key === 'Escape') setEditingCommentId(null); }} />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-white/70 hover:text-white">{t[language].clientCancel}</button>
                          <button onClick={() => handleEditComment(c.id, editCommentContent)} className="text-xs bg-white/20 px-2 py-1 rounded">{t[language].clientSave}</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs opacity-70 mb-1 flex items-center gap-2 flex-wrap">
                          {c.author === 'client' ? t[language].clientYou : t[language].clientTeam}
                          <span>· {new Date(c.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                          {c.edited_at && <span className="text-amber-300">({t[language].clientEdited})</span>}
                        </div>
                        <p className="break-words">{c.content}</p>
                        {c.author === 'client' && new Date(c.created_at) > new Date(Date.now() - 5 * 60 * 1000) && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }} className="text-xs text-white/70 hover:text-white flex items-center gap-1"><Edit3 size={12} /> {t[language].clientEdit}</button>
                            <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-white/70 hover:text-white flex items-center gap-1"><Trash2 size={12} /> {t[language].clientDelete}</button>
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

      {/* Modal prévisualisation fichier */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <span className="font-bold">{previewFile.name}</span>
              <button onClick={() => setPreviewFile(null)}><X size={20} /></button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {previewFile.type?.startsWith('image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-w-full" />
              ) : previewFile.type === 'application/pdf' ? (
                <iframe src={previewFile.url} className="w-full h-96" title={previewFile.name} />
              ) : (
                <div className="text-center py-12 text-slate-400">{t[language].clientPreviewUnavailable} <a href={previewFile.url} target="_blank" className="text-[#D4AF37] font-bold">{t[language].clientDownload}</a></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BookingModal pour la prise de rendez-vous */}
      {showBooking && projet && (
        <BookingModal
          clientName={projet.client_name}
          clientEmail={projet.client_email}
          projectName={projet.brief?.projectName}
          projectId={projet.id}
          onClose={() => setShowBooking(false)}
          onBooked={() => { loadProject(true); setShowBooking(false); }}
        />
      )}
    </div>
  );
}