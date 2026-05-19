'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send, Loader2, Eye, FileText, PanelRightClose, PanelRightOpen,
  X, Zap, Copy, Check, Edit3, Plus, Trash2, FolderKanban
} from 'lucide-react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { useProject, ProjectModule } from '../context/ProjectContext';

// --- Interfaces ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface DevisForm {
  name: string;
  prenom: string;
  email: string;
  project: string;
  description: string;
}

interface PreviewProject {
  project: string;
  projectName: string;
  description: string;
}

export default function ProjectChatBot() {
  // --- États locaux ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);

  // Devis
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState<DevisForm>({
    name: '', prenom: '', email: '', project: '', description: '',
  });

  // Formulaire de génération de conception
  const [showPreviewForm, setShowPreviewForm] = useState(false);
  const [previewProject, setPreviewProject] = useState<PreviewProject>({
    project: '', projectName: '', description: '',
  });

  // Formulaire final de projet
  const [showFinalForm, setShowFinalForm] = useState(false);
  const [finalForm, setFinalForm] = useState({ name: '', email: '', message: '' });

  // Copie & Édition
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Modules du projet (contexte)
  const { modules, addModule, removeModule, updateModule } = useProject();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  // --- Scroll & focus ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  useEffect(() => {
    if (!loading) setTimeout(() => inputRef.current?.focus(), 50);
  }, [loading]);

  // Message de bienvenue
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: "Bonjour ! Je suis l'agent Actoos. Décrivez-moi votre projet.",
      }]);
    }
  }, []);

  // --- Envoi normal (chat) ---
  const handleSend = async (content?: string) => {
    const messageContent = content || input.trim();
    if (!messageContent || loading) return;

    const userMsg: Message = { id: generateId(), role: 'user', content: messageContent };
    setInput('');
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          role: 'analyst',
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.response) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Copie ---
  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // --- Édition ---
  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };
  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const editedIndex = messages.findIndex(m => m.id === editingId);
    if (editedIndex === -1) return;
    const truncated = messages.slice(0, editedIndex);
    const editedMsg: Message = { id: generateId(), role: 'user', content: editContent.trim() };
    const updatedMessages = [...truncated, editedMsg];
    setMessages(updatedMessages);
    setEditingId(null);
    setEditContent('');
    setPreviewCode('');
    setShowPreview(false);
    setPreviewReady(false);
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          role: 'analyst',
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.response) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Devis ---
  const openDevisForm = () => {
    setShowDevisForm(true);
    setShowPreviewForm(false);
    setShowFinalForm(false);
    setDevisForm({ name: '', prenom: '', email: '', project: '', description: '' });
  };
  const handleDevisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devisForm.name.trim() || !devisForm.email.trim() || !devisForm.project.trim()) return;
    setLoading(true);
    try {
      const html = `
        <h2>Demande de devis</h2>
        <p><strong>Nom :</strong> ${devisForm.name} ${devisForm.prenom || ''}</p>
        <p><strong>Email :</strong> ${devisForm.email}</p>
        <p><strong>Projet :</strong> ${devisForm.project}</p>
        <p><strong>Description :</strong> ${devisForm.description || '-'}</p>
      `;
      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: devisForm.name, email: devisForm.email, message: devisForm.description, html }),
      });
      setShowDevisForm(false);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre demande de devis a bien été transmise.' }]);
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de l'envoi." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Conception (Preview) ---
  const openPreviewForm = () => {
  setShowPreviewForm(true);
  setShowDevisForm(false);
  setShowFinalForm(false);
  setPreviewProject({ project: '', projectName: '', description: '' });
  setPreviewReady(false);
  setPreviewCode('');     // ← Réinitialiser l'ancien code
  setShowPreview(false);  // ← Fermer la preview précédente
};
  const handlePreviewGenerate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!previewProject.project.trim()) return;

  setShowPreviewForm(false);
  setPreviewLoading(true);
  setPreviewCode(''); // Réinitialiser l'ancien code
  setShowPreview(false);
  setPreviewReady(false);

  const summary = `Projet : ${previewProject.project}. Nom : ${previewProject.projectName}. Description : ${previewProject.description}.`;
  const userMsg: Message = { id: generateId(), role: 'user', content: summary };
  const newMessages = [...messages, userMsg];
  setMessages(newMessages);
  setLoading(true); // Bloquer le chat pendant la génération

  try {
    const res = await fetch('/api/generate-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate-preview',
        role: 'designer',
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json();
    if (data.previewCode && data.previewCode.trim().length > 0) {
      setPreviewCode(data.previewCode);
      setShowPreview(true);
      setPreviewReady(true);
      // Ne pas ajouter de message dans le chat
    } else {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Désolé, je n'ai pas pu générer l'aperçu. Veuillez réessayer avec plus de détails." }]);
    }
  } catch {
    setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de la génération." }]);
  } finally {
    setLoading(false);
    setPreviewLoading(false);
  }
};

  const handleAdjust = async (modification: string) => {
    if (!modification.trim() || !previewCode || loading) return;
    setAdjustInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-preview',
          role: 'frontend',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          currentCode: previewCode,
          modification,
        }),
      });
      const data = await res.json();
      if (data.previewCode) setPreviewCode(data.previewCode);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Aperçu mis à jour.' }]);
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de l'ajustement." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModule = () => {
    const moduleName = prompt('Nom du module (ex: Dashboard admin)');
    if (moduleName && previewCode) {
      addModule(moduleName, previewCode);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `✅ Module "${moduleName}" enregistré.` }]);
    }
  };

  const loadModule = (mod: ProjectModule) => {
    setPreviewCode(mod.code);
    setShowPreview(true);
    setPreviewReady(true);
  };

  // --- Soumission du projet final ---
  const openFinalForm = () => {
    if (modules.length === 0) {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Vous n'avez pas encore enregistré de module. Générez une conception et enregistrez-la d'abord." }]);
      return;
    }
    setShowFinalForm(true);
    setShowDevisForm(false);
    setShowPreviewForm(false);
    setFinalForm({ name: '', email: '', message: '' });
  };
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalForm.name.trim() || !finalForm.email.trim() || modules.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/submit-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalForm.name,
          email: finalForm.email,
          message: finalForm.message,
          modules: modules.map(m => ({ name: m.name, code: m.code })),
          conversation: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (res.ok) {
        setShowFinalForm(false);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Projet complet soumis avec succès. L\'équipe Actoos vous contactera.' }]);
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de la soumission." }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  // --- Rendu ---
  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex gap-4 h-[700px]">
        {/* --- PANEAU CHAT --- */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden">
          {/* Barre d'outils */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <span className="font-bold text-lg">Agent Actoos</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-green-600 font-medium">En ligne</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={openPreviewForm} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-[#D4AF37] text-white hover:bg-amber-500 shadow">
                <Eye size={14} /> Conception
              </button>
              <button onClick={openDevisForm} className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow">
                <FileText size={14} /> Devis
              </button>
              <button onClick={openFinalForm} disabled={modules.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  modules.length > 0 ? 'bg-green-500 text-white hover:bg-green-600 shadow' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FolderKanban size={14} /> Finaliser
              </button>
              {previewCode && !showPreview && (
                <button onClick={() => setShowPreview(true)} className="p-2 rounded-xl bg-slate-100" title="Rouvrir la conception">
                  <Eye size={18} />
                </button>
              )}
              {showPreview && (
                <button onClick={() => setShowPreview(!showPreview)} className="p-2 rounded-xl bg-slate-100">
                  {showPreview ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className="relative max-w-[85%]">
                  {editingId === msg.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                        if (e.key === 'Escape') cancelEdit();
                      }} className="w-full bg-white border border-[#D4AF37] rounded-xl px-4 py-3 text-sm outline-none" autoFocus />
                      <div className="flex justify-end gap-2">
                        <button onClick={cancelEdit} className="text-xs text-slate-500">Annuler</button>
                        <button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full">Modifier</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      msg.role === 'user' ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-md shadow-md' : 'bg-white/80 backdrop-blur-sm text-slate-700 rounded-bl-md border border-slate-200/80'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {editingId !== msg.id && (
                    <div className="absolute -bottom-6 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Copier">
                        {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                      {msg.role === 'user' && (
                        <button onClick={() => handleEdit(msg)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Modifier">
                          <Edit3 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/80 p-3 rounded-2xl rounded-bl-md border border-slate-200/80">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Formulaire Devis */}
            {showDevisForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Demande de devis</h4>
                <form onSubmit={handleDevisSubmit} className="space-y-3">
                  <input name="name" placeholder="Nom *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.name} onChange={e => setDevisForm({ ...devisForm, name: e.target.value })} required />
                  <input name="prenom" placeholder="Prénom (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.prenom} onChange={e => setDevisForm({ ...devisForm, prenom: e.target.value })} />
                  <input name="email" type="email" placeholder="Email *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.email} onChange={e => setDevisForm({ ...devisForm, email: e.target.value })} required />
                  <input name="project" placeholder="Votre projet *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.project} onChange={e => setDevisForm({ ...devisForm, project: e.target.value })} required />
                  <textarea name="description" placeholder="Description" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" rows={2} value={devisForm.description} onChange={e => setDevisForm({ ...devisForm, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-sm">Soumettre</button>
                    <button type="button" onClick={() => setShowDevisForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {/* Formulaire de conception */}
            {showPreviewForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Générer une conception</h4>
                <p className="text-xs text-slate-500">Décrivez votre projet pour générer un prototype interactif.</p>
                <form onSubmit={handlePreviewGenerate} className="space-y-3">
                  <input name="project" placeholder="Projet *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={previewProject.project} onChange={e => setPreviewProject({ ...previewProject, project: e.target.value })} required />
                  <input name="projectName" placeholder="Nom du projet" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={previewProject.projectName} onChange={e => setPreviewProject({ ...previewProject, projectName: e.target.value })} />
                  <textarea name="description" placeholder="Description" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" rows={2} value={previewProject.description} onChange={e => setPreviewProject({ ...previewProject, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-sm">Générer</button>
                    <button type="button" onClick={() => setShowPreviewForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {/* Formulaire final de soumission du projet */}
            {showFinalForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Finaliser le projet ({modules.length} module(s))</h4>
                <form onSubmit={handleFinalSubmit} className="space-y-3">
                  <input name="name" placeholder="Nom *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={finalForm.name} onChange={e => setFinalForm({ ...finalForm, name: e.target.value })} required />
                  <input name="email" type="email" placeholder="Email *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={finalForm.email} onChange={e => setFinalForm({ ...finalForm, email: e.target.value })} required />
                  <textarea name="message" placeholder="Message (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" rows={2} value={finalForm.message} onChange={e => setFinalForm({ ...finalForm, message: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold text-sm">Soumettre le projet</button>
                    <button type="button" onClick={() => setShowFinalForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Barre de saisie */}
          <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl shrink-0">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Écrivez votre message..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-all" disabled={loading} />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-xl disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* --- PANEAU DROIT (Preview + Modules) --- */}
        <div className="w-[560px] flex flex-col gap-4">
          {/* Squelette de chargement */}
          {previewLoading && !previewCode && (
            <div className="flex-1 bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 flex items-center justify-center">
              <div className="text-center p-10">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D4AF37] border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-600 font-medium">Génération en cours...</p>
              </div>
            </div>
          )}

          {/* Preview active */}
{showPreview && previewCode && (
  <div className="flex-1 bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden flex flex-col min-h-0" style={{ height: '100%' }}>
    <div className="p-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl flex items-center justify-between shrink-0">
      <span className="font-bold text-sm text-slate-700">🖥️ Conception interactive</span>
      <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
    </div>
    <div className="flex-1" style={{ minHeight: 0, height: '100%' }}>
              <SandpackProvider template="react" files={{ "/App.js": previewCode }} customSetup={{ dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" } }} style={{ height: "100%" }}>
                <SandpackPreview showNavigator={false} showOpenInCodeSandbox={false} showRefreshButton={false} style={{ height: "100%" }} />
              </SandpackProvider>
    </div>
    <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl space-y-2 shrink-0">
      <div className="flex gap-2">
        <input
          type="text"
          value={adjustInput}
          onChange={e => setAdjustInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdjust(adjustInput); }}
          placeholder="Modifier..."
          className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
        />
        <button onClick={() => handleAdjust(adjustInput)} disabled={!adjustInput.trim() || loading} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm">
          Ajuster
        </button>
      </div>
      <button onClick={handleSaveModule} className="w-full bg-green-500 text-white py-2 rounded-xl font-bold text-sm">
        Enregistrer dans le projet
      </button>
    </div>
  </div>
)}

          {/* Modules enregistrés */}
          {modules.length > 0 && (
            <div className="bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 p-4 space-y-2 max-h-48 overflow-y-auto">
              <h4 className="font-bold text-sm text-slate-700 flex items-center gap-2"><FolderKanban size={16} /> Modules ({modules.length})</h4>
              {modules.map(mod => (
                <div key={mod.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                  <button onClick={() => loadModule(mod)} className="text-sm font-medium text-slate-700 hover:text-[#D4AF37] text-left flex-1 truncate">{mod.name}</button>
                  <button onClick={() => removeModule(mod.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}