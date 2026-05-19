'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Zap, Copy, Check, Edit3, ChevronRight, Sparkles, Layout, Lightbulb, FileText, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  type?: 'text' | 'briefing' | 'suggestions';
  briefing?: ProjectBrief;
  suggestions?: string[];
}

interface ProjectBrief {
  type: string;
  features: string[];
  pages: string[];
  roles: string[];
  complexity: string;
  architecture: string;
  projectName?: string;
  objective?: string;
  modules?: string[];
  stack?: string[];
  priority?: string;
}

interface DevisForm {
  name: string;
  prenom: string;
  email: string;
  project: string;
  description: string;
}

export default function ProjectChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<ProjectBrief | null>(null);
  const [showBriefPanel, setShowBriefPanel] = useState(true);
  const [step, setStep] = useState<'decrire' | 'ajuster' | 'soumettre'>('decrire');

  const [showDevisForm, setShowDevisForm] = useState(false);
  const [devisForm, setDevisForm] = useState<DevisForm>({
    name: '', prenom: '', email: '', project: '', description: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => { if (!loading) setTimeout(() => inputRef.current?.focus(), 50); }, [loading]);

  // Message de bienvenue
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet en une phrase, je vous aide à le structurer et à l'affiner.",
      }]);
    }
  }, []);

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
      } else if (data.briefing) {
        // Réponse structurée avec briefing
        const brief: ProjectBrief = data.briefing;
        setCurrentBrief(brief);
        setStep('ajuster');

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Voici le cadrage de votre projet **${brief.projectName || messageContent}**. Vous pouvez l'ajuster ou cliquer sur les suggestions ci-dessous.`,
          type: 'briefing',
          briefing: brief,
          suggestions: data.suggestions || [],
        };
        setMessages(prev => [...prev, assistantMsg]);

        // Ajouter les suggestions comme message séparé
        if (data.suggestions && data.suggestions.length > 0) {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: '💡 Suggestions :',
            type: 'suggestions',
            suggestions: data.suggestions,
          }]);
        }
      } else if (data.response) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  // Gérer le clic sur une suggestion
  const handleSuggestionClick = async (suggestion: string) => {
    setMessages(prev => [...prev, { id: generateId(), role: 'user', content: suggestion }]);
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-brief',
          role: 'analyst',
          currentBrief,
          modification: suggestion,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data.briefing) {
        setCurrentBrief(data.briefing);
        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: `Brief mis à jour avec votre modification.`,
          type: 'briefing',
          briefing: data.briefing,
          suggestions: data.suggestions || [],
        };
        setMessages(prev => [...prev, assistantMsg]);
        if (data.suggestions && data.suggestions.length > 0) {
          setMessages(prev => [...prev, {
            id: generateId(),
            role: 'assistant',
            content: '💡 Nouvelles suggestions :',
            type: 'suggestions',
            suggestions: data.suggestions,
          }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'ajustement.' }]);
    } finally { setLoading(false); }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };

  const handleEdit = (msg: Message) => { setEditingId(msg.id); setEditContent(msg.content); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };
  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const editedIndex = messages.findIndex(m => m.id === editingId);
    if (editedIndex === -1) return;
    const truncated = messages.slice(0, editedIndex);
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
      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.response) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally { setLoading(false); }
  };

  const handleSubmitProject = async () => {
    if (!devisForm.name.trim() || !devisForm.email.trim()) return;
    setLoading(true);
    try {
      const html = `<h2>Projet finalisé</h2>
        <p><strong>Client :</strong> ${devisForm.name} ${devisForm.prenom || ''}</p>
        <p><strong>Email :</strong> ${devisForm.email}</p>
        <p><strong>Projet :</strong> ${devisForm.project}</p>
        <p><strong>Description :</strong> ${devisForm.description || '-'}</p>
        <h3>Brief structuré</h3>
        <pre>${JSON.stringify(currentBrief, null, 2)}</pre>
        <h3>Conversation</h3>
        <pre>${messages.map(m => `[${m.role}] ${m.content}`).join('\n')}</pre>`;
      await fetch('/api/send-project-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: devisForm.name, email: devisForm.email, message: devisForm.description, html }) });
      setShowDevisForm(false);
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre projet a été transmis à l\'équipe Actoos. Vous recevrez une réponse sous 24h.' }]);
      setStep('soumettre');
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de l'envoi." }]);
    } finally { setLoading(false); }
  };

  const openSubmitForm = () => {
    setShowDevisForm(true);
    setDevisForm(prev => ({ ...prev, project: currentBrief?.projectName || '' }));
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex gap-4">
        {/* Panneau principal (chat) */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden h-[650px]">
          {/* Barre d'étapes */}
          <div className="flex items-center justify-center gap-6 p-4 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
            <div className={`flex items-center gap-2 text-sm font-bold ${step === 'decrire' ? 'text-[#D4AF37]' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#D4AF37] text-white text-xs">1</span>
              Décrire
            </div>
            <ChevronRight size={16} className="text-slate-300" />
            <div className={`flex items-center gap-2 text-sm font-bold ${step === 'ajuster' ? 'text-[#D4AF37]' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#D4AF37] text-white text-xs">2</span>
              Ajuster
            </div>
            <ChevronRight size={16} className="text-slate-300" />
            <div className={`flex items-center gap-2 text-sm font-bold ${step === 'soumettre' ? 'text-[#D4AF37]' : 'text-slate-400'}`}>
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-[#D4AF37] text-white text-xs">3</span>
              Soumettre
            </div>
          </div>

          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                <div className="relative max-w-[90%]">
                  {editingId === msg.id ? (
                    <div className="flex flex-col gap-2">
                      <input value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }} className="w-full bg-white border border-[#D4AF37] rounded-xl px-4 py-3 text-sm outline-none" autoFocus />
                      <div className="flex justify-end gap-2">
                        <button onClick={cancelEdit} className="text-xs text-slate-500">Annuler</button>
                        <button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full">Modifier</button>
                      </div>
                    </div>
                  ) : msg.type === 'briefing' && msg.briefing ? (
                    <div className="bg-white rounded-2xl p-5 border border-[#D4AF37]/30 shadow-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Layout size={18} className="text-[#D4AF37]" />
                        <h3 className="font-bold text-slate-900">{msg.briefing.projectName || 'Cadrage du projet'}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-400">Type :</span> <strong>{msg.briefing.type}</strong></div>
                        <div><span className="text-slate-400">Complexité :</span> <strong>{msg.briefing.complexity}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Fonctionnalités :</span> <strong>{msg.briefing.features.join(', ')}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Pages :</span> <strong>{msg.briefing.pages.join(', ')}</strong></div>
                        <div className="col-span-2"><span className="text-slate-400">Architecture :</span> <strong>{msg.briefing.architecture}</strong></div>
                      </div>
                      {msg.content && <p className="mt-2 text-sm text-slate-500">{msg.content}</p>}
                    </div>
                  ) : msg.type === 'suggestions' && msg.suggestions ? (
                    <div className="flex flex-wrap gap-2">
                      {msg.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(s)}
                          className="px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-sm font-medium hover:bg-[#D4AF37]/20 transition-colors"
                        >
                          <Lightbulb size={14} className="inline mr-1" />{s}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-md shadow-md'
                        : 'bg-white/80 backdrop-blur-sm text-slate-700 rounded-bl-md border border-slate-200/80'
                    }`}>
                      {msg.content}
                    </div>
                  )}
                  {editingId !== msg.id && msg.type !== 'suggestions' && msg.type !== 'briefing' && (
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

            {/* Bouton de soumission */}
            {currentBrief && !showDevisForm && (
              <div className="flex justify-center mt-4">
                <button onClick={openSubmitForm} className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-200 hover:scale-105 transition-all">
                  <FileText size={16} className="inline mr-2" />
                  Valider et transmettre à Actoos
                </button>
              </div>
            )}

            {/* Formulaire de soumission */}
            {showDevisForm && (
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                <h4 className="font-bold text-sm text-slate-800">Finaliser la transmission</h4>
                <form onSubmit={handleSubmitProject} className="space-y-3">
                  <input name="name" placeholder="Nom *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.name} onChange={e => setDevisForm({ ...devisForm, name: e.target.value })} required />
                  <input name="prenom" placeholder="Prénom (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.prenom} onChange={e => setDevisForm({ ...devisForm, prenom: e.target.value })} />
                  <input name="email" type="email" placeholder="Email *" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" value={devisForm.email} onChange={e => setDevisForm({ ...devisForm, email: e.target.value })} required />
                  <textarea name="description" placeholder="Message (optionnel)" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]" rows={2} value={devisForm.description} onChange={e => setDevisForm({ ...devisForm, description: e.target.value })} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-sm">Soumettre</button>
                    <button type="button" onClick={() => setShowDevisForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Barre de saisie */}
          <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl shrink-0">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Décrivez votre projet..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-all" disabled={loading} />
              <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-xl disabled:opacity-50">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Panneau de brief (à droite, optionnel) */}
        {currentBrief && showBriefPanel && (
          <div className="w-80 bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 p-5 space-y-4 h-fit sticky top-24">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Sparkles size={16} className="text-[#D4AF37]" /> Brief vivant</h3>
              <button onClick={() => setShowBriefPanel(false)} className="text-slate-400 hover:text-slate-600"><PanelRightClose size={16} /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-slate-400">Nom :</span> <strong>{currentBrief.projectName || 'À définir'}</strong></div>
              <div><span className="text-slate-400">Type :</span> <strong>{currentBrief.type}</strong></div>
              <div><span className="text-slate-400">Objectif :</span> <strong>{currentBrief.objective || 'À définir'}</strong></div>
              <div><span className="text-slate-400">Modules :</span> <strong>{currentBrief.modules?.join(', ') || 'À définir'}</strong></div>
              <div><span className="text-slate-400">Pages :</span> <strong>{currentBrief.pages.join(', ')}</strong></div>
              <div><span className="text-slate-400">Stack :</span> <strong>{currentBrief.stack?.join(', ') || 'À définir'}</strong></div>
              <div><span className="text-slate-400">Complexité :</span> <span className={`px-2 py-0.5 rounded-full text-xs ${
                currentBrief.complexity === 'Élevé' ? 'bg-red-100 text-red-600' : currentBrief.complexity === 'Moyen' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
              }`}>{currentBrief.complexity}</span></div>
              <div><span className="text-slate-400">Priorité :</span> <strong>{currentBrief.priority || 'Standard'}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}