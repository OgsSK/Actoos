'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Send, Loader2, Zap, Copy, Check, Edit3, ChevronRight,
  Sparkles, Layout, Lightbulb, FileText, PanelRightClose,
  X, Menu
} from 'lucide-react';

// ----- Types -----
interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  type?: 'text' | 'briefing' | 'suggestions';
  briefing?: ProjectBrief;
  suggestions?: string[];
}

interface ProjectBrief {
  projectName?: string;
  objective?: string;
  type: string;
  features: string[];
  pages: string[];
  roles: string[];
  modules?: string[];
  complexity: string;
  architecture: string;
  stack?: string[];
  priority?: string;
}

// ----- Persistance intelligente (survit aux navigations, pas au refresh) -----
const STORAGE_KEY = 'actoos-chat-messages';

const isReload = () => {
  if (typeof window === 'undefined') return false;
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntries.length > 0) {
    return navEntries[0].type === 'reload';
  }
  return (performance as any).navigation?.type === 1;
};

const loadMessages = (): Message[] => {
  if (typeof window === 'undefined') return [];
  if (isReload()) {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
};

const saveMessages = (msgs: Message[]) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs)); } catch { /* plein */ }
};

// ----- Composant -----
export default function ProjectChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<ProjectBrief | null>(null);
  const [showBriefPanel, setShowBriefPanel] = useState(true);
  const [step, setStep] = useState<'decrire' | 'ajuster' | 'soumettre'>('decrire');

  // Mobile : panneau brief en overlay
  const [mobileBriefOpen, setMobileBriefOpen] = useState(false);

  // Formulaire de soumission
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitForm, setSubmitForm] = useState({ name: '', email: '', message: '' });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  // Scroll
  useEffect(() => {
    if (chatContainerRef.current)
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, showSubmitForm]);

  useEffect(() => { if (!loading) setTimeout(() => inputRef.current?.focus(), 50); }, [loading]);

  // Chargement initial
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
      const lastBriefMsg = [...saved].reverse().find(m => m.type === 'briefing' && m.briefing);
      if (lastBriefMsg?.briefing) {
        setCurrentBrief(lastBriefMsg.briefing);
        setStep(saved.some(m => m.content.includes('transmis')) ? 'soumettre' : 'ajuster');
      }
    } else {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet en une phrase, je vous aide à le structurer et à l'affiner."
      }]);
    }
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  // ----- Envoi / discussion -----
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
        return;
      }

      if (data.briefing) {
        handleBriefingResponse(data);
        return;
      }

      const rawResponse = data.response || '';
      if (!rawResponse) return;

      let parsed: any = null;
      try {
        parsed = JSON.parse(rawResponse);
      } catch {
        const jsonMatch = rawResponse.match(/\{[\s\S]*"briefing"[\s\S]*\}/);
        if (jsonMatch) {
          try { parsed = JSON.parse(jsonMatch[0]); } catch { /* ignore */ }
        }
      }

      if (parsed?.briefing) {
        handleBriefingResponse(parsed);
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: rawResponse }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBriefingResponse = (data: any) => {
    const brief: ProjectBrief = data.briefing;
    setCurrentBrief(brief);
    setStep('ajuster');

    const assistantMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: `Voici le cadrage de votre projet. Vous pouvez l'ajuster ou cliquer sur les suggestions ci-dessous.`,
      type: 'briefing',
      briefing: brief,
      suggestions: data.suggestions || [],
    };
    setMessages(prev => [...prev, assistantMsg]);

    if (data.suggestions?.length) {
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'assistant',
        content: '💡 Suggestions :',
        type: 'suggestions',
        suggestions: data.suggestions,
      }]);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: suggestion }]);
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-brief', role: 'analyst',
          currentBrief, modification: suggestion,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          handleBriefingResponse(data);
          return;
        } else if (data.response) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
          return;
        }
      }
      
      console.warn('adjust-brief failed, fallback to chat');
      await handleSend(suggestion);
    } catch (err) {
      console.error('Suggestion click error', err);
      await handleSend(suggestion);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };
  const handleEdit = (msg: Message) => { setEditingId(msg.id); setEditContent(msg.content); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };
  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const idx = messages.findIndex(m => m.id === editingId);
    if (idx === -1) return;
    const truncated = messages.slice(0, idx);
    const editedMsg: Message = { id: generateId(), role: 'user', content: editContent.trim() };
    const updatedMessages = [...truncated, editedMsg];
    setMessages(updatedMessages); setEditingId(null); setEditContent('');
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', role: 'analyst', messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.error) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      else if (data.briefing) handleBriefingResponse(data);
      else if (data.response) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
    } catch { setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]); }
    finally { setLoading(false); }
  };

  // ----- Soumission finale -----
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.name.trim() || !submitForm.email.trim()) return;
    setLoading(true);
    try {
      const html = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1f2937; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5D78E 100%); padding: 32px 24px; text-align: center;">
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">✨ Nouveau projet</h1>
            <p style="color: #475569; margin: 8px 0 0; font-size: 14px;">Soumis depuis l'Agent Actoos</p>
          </div>
          <div style="padding: 24px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b; width: 120px;">Client</td><td style="padding: 8px 12px; color: #0f172a;">${submitForm.name}</td></tr>
              <tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b;">Email</td><td style="padding: 8px 12px; color: #0f172a;">${submitForm.email}</td></tr>
              ${submitForm.message ? `<tr><td style="padding: 8px 12px; font-weight: 600; color: #64748b;">Message</td><td style="padding: 8px 12px; color: #0f172a;">${submitForm.message}</td></tr>` : ''}
            </table>
            ${currentBrief ? `
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">📋</span> Brief structuré
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b; width: 130px;">Nom du projet</td><td style="padding: 6px 8px; color: #0f172a; font-weight: 600;">${currentBrief.projectName || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Objectif</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.objective || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Type</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.type}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Complexité</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.complexity}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Fonctionnalités</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.features.join(', ')}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Pages</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.pages.join(', ')}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Rôles</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.roles.join(', ')}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Modules</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.modules?.join(', ') || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Architecture</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.architecture}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Stack</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.stack?.join(', ') || 'N/A'}</td></tr>
                <tr><td style="padding: 6px 8px; font-weight: 600; color: #64748b;">Priorité</td><td style="padding: 6px 8px; color: #0f172a;">${currentBrief.priority || 'Standard'}</td></tr>
              </table>
            </div>
            ` : ''}
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 16px; display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">💬</span> Conversation
              </h2>
              ${messages.map(m => `
                <div style="margin-bottom: 12px; padding: 10px 14px; background: ${m.role === 'user' ? '#D4AF37' : '#ffffff'}; color: ${m.role === 'user' ? '#ffffff' : '#0f172a'}; border-radius: 12px; border: 1px solid ${m.role === 'user' ? '#D4AF37' : '#e5e7eb'};">
                  <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: ${m.role === 'user' ? '#fef3c7' : '#64748b'};">${m.role === 'user' ? '👤 Client' : '🤖 Agent Actoos'}</div>
                  <div style="font-size: 14px; line-height: 1.5;">${m.content}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Envoyé depuis la vitrine Actoos • <a href="https://actoos.com" style="color: #D4AF37;">actoos.com</a></p>
          </div>
        </div>
      `;

      // 1. Envoi à Actoos
      const res = await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: submitForm.name, email: submitForm.email, message: submitForm.message, html }),
      });
      const data = await res.json();

      if (data.success) {
        // Email de confirmation au visiteur
        await fetch('/api/send-project-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: submitForm.name,
            email: submitForm.email,
            to: submitForm.email,
            html: `
              <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
                <div style="background: linear-gradient(135deg, #D4AF37 0%, #F5D78E 100%); padding: 24px; text-align: center; border-radius: 16px 16px 0 0;">
                  <h1 style="color: #0f172a; margin: 0; font-size: 20px;">✨ Projet bien reçu !</h1>
                </div>
                <div style="padding: 24px; background: #ffffff; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
                  <p>Bonjour ${submitForm.name},</p>
                  <p>Nous avons bien reçu votre projet <strong>${currentBrief?.projectName || 'votre projet'}</strong>.</p>
                  <p>Notre équipe l'étudie avec attention et reviendra vers vous sous <strong>24h ouvrées</strong>.</p>
                  <p>En attendant, vous pouvez nous contacter à tout moment :</p>
                  <p>📧 <a href="mailto:contact@actoos.com" style="color: #D4AF37;">contact@actoos.com</a></p>
                  <p>À très bientôt,</p>
                  <p><strong>L'équipe Actoos</strong></p>
                </div>
              </div>
            `,
          }),
        });

        setShowSubmitForm(false);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre projet a été transmis à l\'équipe Actoos. Vous recevrez une réponse sous 24h.' }]);
        setStep('soumettre');
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de l'envoi. Veuillez réessayer." }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur de connexion." }]);
    } finally { setLoading(false); }
  };

  // ----- Rendu -----
  return (
    <div className="max-w-7xl mx-auto p-2 md:p-4">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Chat */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[32px] md:rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden h-[calc(100vh-120px)] md:h-[650px]">
          {/* Étapes compactes + boutons */}
          <div className="flex items-center justify-between px-3 py-2 md:p-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
            <div className="flex items-center gap-1 md:gap-4 flex-1">
              {['Décrire', 'Ajuster', 'Soumettre'].map((label, i) => (
                <div key={label} className="flex items-center gap-1 md:gap-2">
                  <div className={`flex items-center gap-1 text-[10px] md:text-sm font-bold ${step === (i === 0 ? 'decrire' : i === 1 ? 'ajuster' : 'soumettre') ? 'text-[#D4AF37]' : 'text-slate-400'}`}>
                    <span className={`w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center ${step === (i === 0 ? 'decrire' : i === 1 ? 'ajuster' : 'soumettre') ? 'bg-[#D4AF37] text-white' : 'bg-slate-200 text-slate-400'} text-[10px] md:text-xs`}>{i + 1}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < 2 && <ChevronRight size={12} className="text-slate-300 hidden sm:block" />}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Bouton Brief (mobile : ouvre l'overlay) */}
              {currentBrief && (
                <button
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setMobileBriefOpen(true);
                    } else {
                      setShowBriefPanel(!showBriefPanel);
                    }
                  }}
                  className="px-2 py-1 md:px-3 md:py-1.5 rounded-xl text-[10px] md:text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-1"
                  title="Afficher le brief"
                >
                  <Sparkles size={12} className="md:w-4 md:h-4" /> Brief
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className="relative max-w-[92%] md:max-w-[85%]">
                  {editingId === msg.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }} className="w-full bg-white border border-[#D4AF37] rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm outline-none" autoFocus />
                      <div className="flex justify-end gap-2"><button onClick={cancelEdit} className="text-xs text-slate-500">Annuler</button><button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full">Modifier</button></div>
                    </div>
                  ) : msg.type === 'briefing' && msg.briefing ? (
                    <div className="bg-white rounded-2xl p-3 md:p-5 border border-[#D4AF37]/30 shadow-lg">
                      <div className="flex items-center gap-2 mb-2 md:mb-3"><Layout size={16} className="text-[#D4AF37]" /><h3 className="font-bold text-sm md:text-lg text-slate-900">{msg.briefing.projectName || 'Cadrage du projet'}</h3></div>
                      <div className="grid grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
                        <div><span className="text-slate-400">Type :</span> <strong>{msg.briefing.type}</strong></div>
                        <div><span className="text-slate-400">Complexité :</span> <strong>{msg.briefing.complexity}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Fonctionnalités :</span> <strong>{msg.briefing.features.join(', ')}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Pages :</span> <strong>{msg.briefing.pages.join(', ')}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Architecture :</span> <strong>{msg.briefing.architecture}</strong></div>
                      </div>
                    </div>
                  ) : msg.type === 'suggestions' && msg.suggestions ? (
                    <div className="flex flex-wrap gap-1.5 md:gap-2">
                      {msg.suggestions.map((s, i) => (
                        <button key={i} onClick={() => handleSuggestionClick(s)} className="px-2 py-1 md:px-3 md:py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-xs md:text-sm font-medium hover:bg-[#D4AF37]/20 transition-colors">
                          <Lightbulb size={12} className="inline mr-1" />{s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-2.5 md:p-3.5 rounded-2xl text-xs md:text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-md shadow-md' : 'bg-white/80 backdrop-blur-sm text-slate-700 rounded-bl-md border border-slate-200/80'}`}>
                      {msg.content}
                    </div>
                  )}
                  {editingId !== msg.id && msg.type !== 'suggestions' && msg.type !== 'briefing' && (
                    <div className="absolute -bottom-5 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Copier">
                        {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                      </button>
                      {msg.role === 'user' && (
                        <button onClick={() => handleEdit(msg)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Modifier"><Edit3 size={12} /></button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/80 p-2 md:p-3 rounded-2xl rounded-bl-md border border-slate-200/80">
                  <div className="flex space-x-1.5"><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
                </div>
              </div>
            )}

            {/* Bouton Valider */}
            {currentBrief && !showSubmitForm && step !== 'soumettre' && (
              <div className="flex justify-center mt-4">
                <button onClick={() => setShowSubmitForm(true)} className="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-amber-200 hover:scale-105 transition-all">
                  <FileText size={14} className="inline mr-1 md:mr-2" />Valider et transmettre à Actoos
                </button>
              </div>
            )}

            {/* Formulaire de soumission */}
            {showSubmitForm && (
              <div className="bg-white rounded-2xl p-3 md:p-5 border border-slate-200/80 shadow-xl space-y-2 md:space-y-3">
                <h4 className="font-bold text-xs md:text-sm text-slate-800">Finaliser la transmission</h4>
                <form onSubmit={handleSubmitProject} className="space-y-2 md:space-y-3">
                  <input name="name" placeholder="Nom *" className="w-full border border-slate-200 rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm outline-none focus:border-[#D4AF37]" value={submitForm.name} onChange={e => setSubmitForm({ ...submitForm, name: e.target.value })} required />
                  <input name="email" type="email" placeholder="Email *" className="w-full border border-slate-200 rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm outline-none focus:border-[#D4AF37]" value={submitForm.email} onChange={e => setSubmitForm({ ...submitForm, email: e.target.value })} required />
                  <textarea name="message" placeholder="Message (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2 md:py-2.5 text-xs md:text-sm outline-none focus:border-[#D4AF37]" rows={2} value={submitForm.message} onChange={e => setSubmitForm({ ...submitForm, message: e.target.value })} />
                  <div className="flex items-center gap-2 text-xs md:text-sm text-slate-600 bg-slate-50 p-2 md:p-3 rounded-lg">
                    <input type="checkbox" checked readOnly className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]" />
                    <span>La conversation et le brief seront joints automatiquement.</span>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-xs md:text-sm">Soumettre</button>
                    <button type="button" onClick={() => setShowSubmitForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-xs md:text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}

            {/* Bouton Nouveau projet (après soumission) */}
            {step === 'soumettre' && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => {
                    setMessages([{
                      id: generateId(),
                      role: 'assistant',
                      content: "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet en une phrase, je vous aide à le structurer et à l'affiner."
                    }]);
                    setCurrentBrief(null);
                    setStep('decrire');
                    setShowSubmitForm(false);
                    setSubmitForm({ name: '', email: '', message: '' });
                    setShowBriefPanel(true);
                  }}
                  className="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-xs md:text-sm shadow-lg shadow-green-200 hover:scale-105 transition-all"
                >
                  <Sparkles size={14} className="inline mr-1 md:mr-2" />Démarrer un nouveau projet
                </button>
              </div>
            )}
          </div>

          {/* Barre de saisie */}
          <div className="p-2 md:p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl shrink-0">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Décrivez votre projet..." className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 md:px-4 md:py-3 text-sm outline-none focus:border-[#D4AF37] transition-all" disabled={loading} />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-2.5 md:p-3 rounded-xl disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Panneau Brief desktop */}
        {currentBrief && showBriefPanel && (
          <div className="hidden md:block w-80 bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 p-5 space-y-4 h-fit sticky top-24">
            <BriefContent brief={currentBrief} onClose={() => setShowBriefPanel(false)} />
          </div>
        )}

        {/* Overlay Brief mobile */}
        {mobileBriefOpen && currentBrief && (
          <div className="fixed inset-0 z-50 md:hidden bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl relative max-h-[80vh] overflow-y-auto">
              <button onClick={() => setMobileBriefOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={18} /></button>
              <BriefContent brief={currentBrief} onClose={() => setMobileBriefOpen(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Petit composant pour le contenu du brief (réutilisé desktop + mobile)
function BriefContent({ brief, onClose }: { brief: ProjectBrief; onClose: () => void }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2"><Sparkles size={16} className="text-[#D4AF37]" /> Brief vivant</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><PanelRightClose size={16} /></button>
      </div>
      <div className="space-y-3 text-sm">
        <div><span className="text-slate-400">Nom :</span> <strong>{brief.projectName || 'À définir'}</strong></div>
        <div><span className="text-slate-400">Type :</span> <strong>{brief.type}</strong></div>
        <div><span className="text-slate-400">Objectif :</span> <strong>{brief.objective || 'À définir'}</strong></div>
        <div><span className="text-slate-400">Modules :</span> <strong>{brief.modules?.join(', ') || 'À définir'}</strong></div>
        <div><span className="text-slate-400">Pages :</span> <strong>{brief.pages.join(', ')}</strong></div>
        <div><span className="text-slate-400">Stack :</span> <strong>{brief.stack?.join(', ') || 'À définir'}</strong></div>
        <div><span className="text-slate-400">Complexité :</span> <span className={`px-2 py-0.5 rounded-full text-xs ${brief.complexity === 'Élevé' ? 'bg-red-100 text-red-600' : brief.complexity === 'Moyen' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>{brief.complexity}</span></div>
        <div><span className="text-slate-400">Priorité :</span> <strong>{brief.priority || 'Standard'}</strong></div>
      </div>
    </>
  );
}