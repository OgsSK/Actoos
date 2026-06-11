'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Calendar, DollarSign, MessageSquare, RefreshCw,
  Upload, FileText, Send, Download, Activity, Eye, Trash2, Edit3, X, Check
} from 'lucide-react';

const CALENDLY_URL = 'https://calendly.com/contact-actoos/30min';

function normalizeStatus(value: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
}

const getClientStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  const map: Record<string, string> = {
    nouveau: 'Nouveau', contacté: 'En discussion', devis_envoyé: 'Devis envoyé',
    en_cours: 'En cours', gagné: 'Accepté', perdu: 'Refusé', livré: 'Livré', terminé: 'Terminé',
  };
  return map[normalized] || 'En attente';
};

const getClientPaymentStatus = (status: string) => {
  const normalized = normalizeStatus(status);
  const map: Record<string, string> = {
    aucun: 'Non payé', devis_envoyé: 'Devis envoyé', acompte_payé: 'Acompte payé',
    partiel: 'Partiellement payé', complet: 'Payé', remboursé: 'Remboursé', litige: 'Litige', annulé: 'Annulé',
  };
  return map[normalized] || 'Non payé';
};

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

  // Édition / suppression commentaires
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // Notifications client
  const [clientLastRead, setClientLastRead] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('client_last_read') || new Date().toISOString() : new Date().toISOString()
  );

  // Prévisualisation fichier
  const [previewFile, setPreviewFile] = useState<any>(null);

  // Calendly
  const [showCalendly, setShowCalendly] = useState(false);

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

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setMessageLoading(true);
    try {
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'contact@actoos.com', name: projet?.client_name || 'Client', email: projet?.client_email || '', message,
          html: `<h2>Message de ${projet?.client_name || 'un client'}</h2><p>${message}</p>`,
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
    if (!confirm('Supprimer ce fichier ?')) return;
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
    } catch (err) { alert('Erreur lors de la modification'); }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      loadComments(projet?.id);
    } catch (err) { alert('Erreur lors de la suppression'); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-2 border-[#D4AF37] border-t-transparent" /></div>;
  if (!projet) return <div className="min-h-screen flex items-center justify-center p-4"><div className="text-center"><h1 className="text-2xl font-black text-slate-900">Projet introuvable</h1><p className="text-slate-500 mt-2">Le lien est invalide ou le projet n'existe plus.</p><a href="/" className="text-[#D4AF37] font-bold mt-4 inline-block">Retour à l'accueil</a></div></div>;

  const conversation = normalizeConversation(projet.conversation);
  const unreadCount = comments.filter(c => c.author !== 'client' && c.created_at > clientLastRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center"><RefreshCw size={20} className="text-white" /></div>
            <div><span className="font-black text-xl">Espace client<span className="text-[#D4AF37]">.</span></span><span className="text-[10px] text-slate-400 block">Actoos</span></div>
          </div>
          <a href="/" className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-2"><ArrowLeft size={16} /> Accueil</a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-black text-slate-900">{projet.brief?.projectName || 'Votre projet'}</h1>
            <p className="text-slate-500 text-sm mt-1">Suivez l'avancement de votre projet</p>
          </div>
          <button onClick={() => loadProject(true)} className="px-4 py-2 rounded-xl bg-white border shadow-sm text-sm font-bold flex items-center gap-2 hover:bg-slate-50"><RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualiser</button>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowCalendly(true)} className="inline-flex items-center gap-2 bg-white rounded-2xl px-4 py-3 text-sm font-bold shadow-sm border hover:bg-slate-50 transition-colors"><Calendar size={16} className="text-[#D4AF37]" /> Prendre rendez-vous</button>
          {projet.payment_link && <a href={projet.payment_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white rounded-2xl px-4 py-3 text-sm font-bold shadow-sm border hover:bg-slate-50 transition-colors"><DollarSign size={16} className="text-green-500" /> Paiement</a>}
        </div>

        {/* Timeline des étapes */}
        {projet.steps && Array.isArray(projet.steps) && projet.steps.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h2 className="font-bold text-lg mb-4">📈 Avancement du projet</h2>
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
                  <div>
                    <p className={`text-sm ${step.status === 'terminé' ? 'text-green-700 line-through' : step.status === 'en_cours' ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                      {step.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {step.status === 'terminé' ? 'Terminé' : step.status === 'en_cours' ? 'En cours' : 'À faire'}
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
            <p className="text-sm text-green-700 font-medium">✅ Projet accepté</p>
            <p className="text-sm text-green-600 mt-1">L'équipe Actoos va prendre contact avec vous pour la suite.</p>
          </div>
        )}
        {projet.archived && projet.status === 'perdu' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm text-amber-700 font-medium">⏳ Projet en attente de décision</p>
          </div>
        )}
        {projet.status === 'perdu' && !projet.archived && projet.decision_message && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <p className="text-sm text-red-700 font-medium">❌ Projet refusé</p>
            <p className="text-sm text-red-600 mt-1">Raison : {projet.decision_message}</p>
          </div>
        )}

        {/* Statut / Paiement / Complexité / Mise à jour */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border"><span className="text-xs text-slate-400">Statut</span><p className="font-bold text-sm mt-1">{getClientStatus(projet.status)}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border"><span className="text-xs text-slate-400">Paiement</span><p className="font-bold text-sm mt-1">{getClientPaymentStatus(projet.payment_status)}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border"><span className="text-xs text-slate-400">Complexité</span><p className="font-bold text-sm mt-1">{projet.brief?.complexity || 'Non spécifiée'}</p></div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border"><span className="text-xs text-slate-400">Mise à jour</span><p className="font-bold text-sm mt-1">{lastSyncAt ? lastSyncAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p></div>
        </div>
                {/* Barre de progression du paiement */}
        {projet.payment_amount > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-[#D4AF37]" /> Progression du paiement
            </h3>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${(projet.paid_amount || 0) >= projet.payment_amount ? 'bg-green-500' : 'bg-[#D4AF37]'}`}
                    style={{ width: `${Math.min(((projet.paid_amount || 0) / projet.payment_amount) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-slate-500">{projet.paid_amount || 0}€ payés</span>
                  <span className="text-xs text-slate-500">{projet.payment_amount}€ attendus</span>
                </div>
              </div>
              <span className={`ml-4 text-xs font-bold px-3 py-1 rounded-full ${(projet.paid_amount || 0) >= projet.payment_amount ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {(projet.paid_amount || 0) >= projet.payment_amount ? '✅ Payé' : '⚠️ Acompte'}
              </span>
            </div>
            {(projet.paid_amount || 0) < projet.payment_amount && (
              <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">
                Reste à payer : <strong className="text-amber-600">{(projet.payment_amount - (projet.paid_amount || 0)).toFixed(2)}€</strong>
              </p>
            )}
          </div>
        )}

        {/* Onglets */}
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 shadow-sm w-fit">
          <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>📊 Dashboard</button>
          <button onClick={() => setActiveTab('fichiers')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'fichiers' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>📁 Fichiers</button>
          <button onClick={() => setActiveTab('commentaires')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'commentaires' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
            💬 Commentaires
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
            )}
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            {projet.client_message && <div className="bg-white rounded-2xl p-5 shadow-sm border"><p className="text-xs text-slate-400 mb-2">Votre demande</p><p className="text-sm text-slate-700 whitespace-pre-wrap">{projet.client_message}</p></div>}
            {projet.brief && <div className="bg-white rounded-2xl p-5 shadow-sm border"><h2 className="font-bold text-lg mb-4">📋 Détails du projet</h2><div className="grid grid-cols-2 gap-4">{Object.entries(projet.brief).filter(([key]) => !['features', 'stack'].includes(key)).map(([key, value]) => <div key={key}><span className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><p className="font-medium text-sm">{value?.toString() || '-'}</p></div>)}</div></div>}
            {conversation.length > 0 && <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4"><h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> Conversation</h2><div className="space-y-3 max-h-80 overflow-y-auto">{conversation.map((msg: any, i: number) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#D4AF37] text-white' : 'bg-slate-50 border'}`}><div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? 'Vous' : 'Actoos'}</div>{msg.content}</div></div>)}</div></div>}
            <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4"><h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> Envoyer un message</h2>{messageSent && <p className="text-emerald-600 text-sm font-medium">✅ Message envoyé avec succès.</p>}<textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Votre message..." className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-[#D4AF37] resize-none" rows={4} /><button onClick={handleSendMessage} disabled={!message.trim() || messageLoading} className="bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-amber-500 transition-colors">{messageLoading ? 'Envoi...' : 'Envoyer'}</button></div>
          </>
        )}

        {activeTab === 'fichiers' && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
            <h2 className="font-bold text-lg flex items-center gap-2"><Upload size={18} className="text-[#D4AF37]" /> Fichiers du projet</h2>
            <div className="flex gap-2">
              <input type="text" value={uploadMessage} onChange={e => setUploadMessage(e.target.value)} placeholder="Message (optionnel) – ex : Voici mon logo" className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#D4AF37]" />
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-white rounded-xl font-bold text-sm cursor-pointer hover:bg-amber-500 transition-colors">
                <Upload size={16} /> Déposer
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-sm text-slate-500">Upload en cours...</p>}
            <div className="space-y-2">
              {files.length === 0 && <p className="text-sm text-slate-400">Aucun fichier pour le moment.</p>}
              {files.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('fr-FR')} · {f.uploaded_by === 'client' ? 'Vous' : 'Équipe'}</p>
                      {f.message && <p className="text-xs text-slate-500 italic mt-1">"{f.message}"</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
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
            <h2 className="font-bold text-lg flex items-center gap-2"><MessageSquare size={18} className="text-[#D4AF37]" /> Commentaires</h2>
            <div className="flex gap-2">
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Ajouter un commentaire..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]" onKeyDown={e => { if (e.key === 'Enter') handleAddComment(); }} />
              <button onClick={handleAddComment} disabled={!commentText.trim() || commentSending} className="bg-[#D4AF37] text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"><Send size={16} /></button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {comments.length === 0 && <p className="text-sm text-slate-400">Aucun commentaire pour le moment.</p>}
              {comments.map((c: any) => (
                <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm ${c.author === 'client' ? 'bg-[#D4AF37] text-white' : 'bg-slate-50 border'}`}>
                    {editingCommentId === c.id ? (
                      <div className="flex flex-col gap-2">
                        <input value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" autoFocus onKeyDown={async (e) => { if (e.key === 'Enter') await handleEditComment(c.id, editCommentContent); if (e.key === 'Escape') setEditingCommentId(null); }} />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingCommentId(null)} className="text-xs text-white/70 hover:text-white">Annuler</button>
                          <button onClick={() => handleEditComment(c.id, editCommentContent)} className="text-xs bg-white/20 px-2 py-1 rounded">Enregistrer</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                          {c.author === 'client' ? 'Vous' : 'Actoos'}
                          <span>· {new Date(c.created_at).toLocaleString('fr-FR')}</span>
                          {c.edited_at && <span className="text-amber-300">(modifié)</span>}
                        </div>
                        <p>{c.content}</p>
                        {c.author === 'client' && new Date(c.created_at) > new Date(Date.now() - 5 * 60 * 1000) && (
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }} className="text-xs text-white/70 hover:text-white flex items-center gap-1"><Edit3 size={12} /> Modifier</button>
                            <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-white/70 hover:text-white flex items-center gap-1"><Trash2 size={12} /> Supprimer</button>
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
                <div className="text-center py-12 text-slate-400">Aperçu non disponible pour ce type de fichier. <a href={previewFile.url} target="_blank" className="text-[#D4AF37] font-bold">Télécharger</a></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Calendly */}
      {showCalendly && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCalendly(false)}>
    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center" onClick={e => e.stopPropagation()}>
      <Calendar size={48} className="text-[#D4AF37] mx-auto mb-4" />
      <h3 className="text-xl font-black mb-2">Prendre rendez-vous</h3>
      <p className="text-slate-500 mb-6">Notre agenda s'ouvre dans une nouvelle fenêtre.</p>
      <a
        href="https://calendly.com/contact-actoos/30min"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition-colors"
      >
        <Calendar size={18} /> Ouvrir le calendrier
      </a>
      <button onClick={() => setShowCalendly(false)} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
        Fermer
      </button>
    </div>
  </div>
)}
    </div>
  );
}// Force redeploy
