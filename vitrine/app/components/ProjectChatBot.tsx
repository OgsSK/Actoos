'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Mail, Eye, FileText, PanelRightClose, PanelRightOpen, X, Zap, Save } from 'lucide-react';
import { Sandpack } from '@codesandbox/sandpack-react';

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

interface PreviewForm {
  project: string;
  projectName: string;
  description: string;
}

interface PreviewSubmitForm {
  name: string;
  email: string;
  message: string;
}

export default function ProjectChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewCode, setPreviewCode] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');

  // Devis
  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState<DevisForm>({
    name: '',
    prenom: '',
    email: '',
    project: '',
    description: '',
  });
  const [devisSent, setDevisSent] = useState(false);

  // Preview
  const [showPreviewForm, setShowPreviewForm] = useState(false);
  const [previewProject, setPreviewProject] = useState<PreviewForm>({
    project: '',
    projectName: '',
    description: '',
  });
  const [showSubmitPreviewForm, setShowSubmitPreviewForm] = useState(false);
  const [previewSubmit, setPreviewSubmit] = useState<PreviewSubmitForm>({
    name: '',
    email: '',
    message: '',
  });
  const [previewReady, setPreviewReady] = useState(false); // pour afficher le bouton "Soumettre"

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => { if (!loading) setTimeout(() => inputRef.current?.focus(), 50); }, [loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: generateId(), role: 'assistant', content: 'Bonjour ! Je suis l\'agent Actoos. Décrivez-moi votre projet.' }]);
    }
  }, []);

  // Conversation normale
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', role: 'analyst', messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
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

  // ----- DEVIS -----
  const openDevisForm = () => {
    setShowDevisForm(true);
    setDevisSent(false);
    setDevisForm({ name: '', prenom: '', email: '', project: '', description: '' });
  };

  const handleDevisSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devisForm.name.trim() || !devisForm.email.trim() || !devisForm.project.trim()) return;

    setLoading(true);
    try {
      // Envoyer les informations par email (via l'API send-project-email)
      const html = `
        <h2>Demande de devis</h2>
        <p><strong>Nom :</strong> ${devisForm.name} ${devisForm.prenom || ''}</p>
        <p><strong>Email :</strong> ${devisForm.email}</p>
        <p><strong>Projet :</strong> ${devisForm.project}</p>
        <p><strong>Description :</strong> ${devisForm.description || '-'}</p>
      `;
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: devisForm.name,
          email: devisForm.email,
          message: devisForm.description,
          html,
        }),
      });
      setDevisSent(true);
      setShowDevisForm(false);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre demande de devis a bien été transmise. Un agent vous contactera pour finaliser le devis.' }]);
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'envoi.' }]);
    } finally {
      setLoading(false);
    }
  };

  // ----- PREVIEW -----
  const openPreviewForm = () => {
    setShowPreviewForm(true);
    setPreviewProject({ project: '', projectName: '', description: '' });
    setShowSubmitPreviewForm(false);
    setPreviewReady(false);
  };

  const handlePreviewGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewProject.project.trim()) return;

    setShowPreviewForm(false);
    setLoading(true);

    const summary = `Projet : ${previewProject.project}. Nom : ${previewProject.projectName}. Description : ${previewProject.description}.`;
    const userMsg: Message = { id: generateId(), role: 'user', content: summary };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-preview', role: 'designer', messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.previewCode && data.previewCode.trim().length > 0) {
        setPreviewCode(data.previewCode);
        setShowPreview(true);
        setPreviewReady(true); // active le bouton Soumettre
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '🖥️ Voici l\'aperçu interactif. Vous pouvez le modifier dans le panneau de droite, puis soumettre lorsque vous êtes satisfait.' }]);
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Désolé, je n\'ai pas pu générer l\'aperçu. Veuillez réessayer avec plus de détails.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de la génération de l\'aperçu.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Ajustement de la preview
  const handleAdjust = async (modification: string) => {
    if (!modification.trim() || !previewCode || loading) return;
    setAdjustInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-preview',
          role: 'frontend',
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          currentCode: previewCode,
          modification,
        }),
      });
      const data = await res.json();
      if (data.previewCode) {
        setPreviewCode(data.previewCode);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Aperçu mis à jour.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'ajustement.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Soumission de la preview
  const handlePreviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewSubmit.name.trim() || !previewSubmit.email.trim()) return;

    setLoading(true);
    try {
      const html = `
        <h2>Soumission d'un aperçu interactif</h2>
        <p><strong>Nom :</strong> ${previewSubmit.name}</p>
        <p><strong>Email :</strong> ${previewSubmit.email}</p>
        <p><strong>Message :</strong> ${previewSubmit.message || '-'}</p>
        <h3>Code de la preview</h3>
        <pre>${previewCode}</pre>
        <h3>Conversation</h3>
        ${messages.map(m => `<p><strong>${m.role === 'user' ? 'Client' : 'Agent'}:</strong> ${m.content}</p>`).join('')}
      `;
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: previewSubmit.name,
          email: previewSubmit.email,
          message: previewSubmit.message,
          html,
        }),
      });
      setShowSubmitPreviewForm(false);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre aperçu a été soumis. L\'équipe Actoos vous contactera.' }]);
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'envoi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex gap-4 h-[700px]">
        {/* Panneau de chat */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden">
          <div className="p-4 flex items-center gap-3 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
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
              <button
                onClick={openPreviewForm}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all bg-[#D4AF37] text-white hover:bg-amber-500 shadow-lg shadow-amber-200"
              >
                <Eye size={14} />
                Preview
              </button>
              <button
                onClick={openDevisForm}
                className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all bg-slate-900 text-white hover:bg-slate-800 shadow-lg"
              >
                <FileText size={14} />
                Devis
              </button>
              {showPreview && (
                <button onClick={() => setShowPreview(!showPreview)} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200">
                  {showPreview ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              )}
            </div>
          </div>

          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className="max-w-[85%]">
                  <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-md shadow-md'
                      : 'bg-white/80 backdrop-blur-sm text-slate-700 rounded-bl-md border border-slate-200/80'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/80 p-3 rounded-2xl rounded-bl-md border border-slate-200/80">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {/* Mini-formulaire Devis */}
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

            {/* Mini-formulaire Preview */}
            {showPreviewForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Générer un aperçu</h4>
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

            {/* Formulaire de soumission de la preview (après ajustement) */}
            {showSubmitPreviewForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Soumettre l'aperçu</h4>
                <form onSubmit={handlePreviewSubmit} className="space-y-3">
                  <input name="name" placeholder="Nom *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={previewSubmit.name} onChange={e => setPreviewSubmit({ ...previewSubmit, name: e.target.value })} required />
                  <input name="email" type="email" placeholder="Email *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={previewSubmit.email} onChange={e => setPreviewSubmit({ ...previewSubmit, email: e.target.value })} required />
                  <textarea name="message" placeholder="Message (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" rows={2} value={previewSubmit.message} onChange={e => setPreviewSubmit({ ...previewSubmit, message: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold text-sm">Envoyer</button>
                    <button type="button" onClick={() => setShowSubmitPreviewForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Écrivez votre message..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-all" disabled={loading} />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-xl disabled:opacity-50 hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200">
                <Send size={18} />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-2">Propulsé par l'IA • Réponses en temps réel</p>
          </div>
        </div>

        {/* Panneau de preview */}
        {showPreview && previewCode && (
          <div className="w-[500px] bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl flex items-center justify-between">
              <span className="font-bold text-sm text-slate-700">🖥️ Aperçu interactif</span>
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="flex-1">
              <Sandpack
                template="react"
                files={{ '/App.js': previewCode }}
                options={{ showNavigator: false, showTabs: false, editorHeight: '100%', editorWidthPercentage: 0 }}
                customSetup={{ dependencies: { 'react': '^18.0.0', 'react-dom': '^18.0.0' } }}
              />
            </div>
            <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl space-y-2">
              <div className="flex gap-2">
                <input type="text" value={adjustInput} onChange={e => setAdjustInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdjust(adjustInput); }} placeholder="Modifier (ex: changer la couleur, ajouter un bouton…)" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37] transition-colors" />
                <button onClick={() => handleAdjust(adjustInput)} disabled={!adjustInput.trim() || loading} className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50">
                  Ajuster
                </button>
              </div>
              {previewReady && (
                <button onClick={() => setShowSubmitPreviewForm(true)} className="w-full bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-sm">
                  Soumettre l'aperçu
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}