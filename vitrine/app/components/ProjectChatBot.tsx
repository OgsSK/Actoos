'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Mail, Eye, FileText, PanelRightClose, PanelRightOpen, X, Zap } from 'lucide-react';
import { Sandpack } from '@codesandbox/sandpack-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

export default function ProjectChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [previewCode, setPreviewCode] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [adjustInput, setAdjustInput] = useState('');
  const [agentProposedPreview, setAgentProposedPreview] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Détecter si l'agent a proposé l'aperçu
  useEffect(() => {
    const lastAssistantMsg = messages.filter(m => m.role === 'assistant').pop();
    if (lastAssistantMsg && lastAssistantMsg.content.includes("Je peux maintenant vous montrer un aperçu")) {
      setAgentProposedPreview(true);
    }
  }, [messages]);

  // États des boutons
  const canPreview = agentProposedPreview && !loading && !previewCode;
  const canQuote = previewCode && !loading;

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
      } else if (data.ready && data.proposal) {
        // Ignorer les devis non sollicités
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
      } else {
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!canPreview || previewCode || loading) return;
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-preview', role: 'designer', messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.previewCode && data.previewCode.trim().length > 0) {
        setPreviewCode(data.previewCode);
        setShowPreview(true);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '🖥️ Voici un aperçu interactif de votre projet. Vous pouvez le modifier directement dans le panneau de droite.' }]);
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Désolé, je n\'ai pas réussi à générer l\'aperçu. Voulez-vous que je vous propose un devis à la place ?' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de la génération de l\'aperçu.' }]);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleQuote = async () => {
    if (!canQuote || loading) return;
    setQuoteLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-proposal', role: 'commercial', messages: messages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.ready && data.proposal) {
        setProposal(data.proposal);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '📄 Voici votre devis personnalisé :' }]);
      } else {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Je n\'ai pas assez d\'informations pour le devis. Pouvez-vous me donner plus de détails sur votre projet ?' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de la génération du devis.' }]);
    } finally {
      setQuoteLoading(false);
    }
  };

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
        if (proposal) {
          const quoteRes = await fetch('/api/generate-proposal', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'generate-proposal', role: 'commercial', messages: messages.map(m => ({ role: m.role, content: m.content })) }),
          });
          const quoteData = await quoteRes.json();
          if (quoteData.ready && quoteData.proposal) setProposal(quoteData.proposal);
        }
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Aperçu mis à jour.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'ajustement.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.email) return;
    setLoading(true);
    try {
      let emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937"><h2>Nouveau projet depuis le chatbot</h2><p><strong>Client :</strong> ${formData.name} (${formData.email})</p><p><strong>Message :</strong> ${formData.message || '-'}</p>`;
      if (proposal) emailHtml += `<hr /><h3>📋 Devis</h3><pre>${JSON.stringify(proposal, null, 2)}</pre>`;
      if (previewCode) emailHtml += `<hr /><h3>🖥️ Code de la preview</h3><pre>${previewCode}</pre>`;
      emailHtml += `<hr /><h3>💬 Conversation</h3>${messages.map(m => `<div><strong>${m.role === 'user' ? 'Client' : 'Agent'}:</strong> ${m.content}</div>`).join('')}</div>`;
      const res = await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, message: formData.message, html: emailHtml }),
      });
      if (res.ok) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre demande a bien été transmise ! L\'équipe Actoos vous contactera dans les 24h.' }]);
        setProposal(null);
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'envoi.' }]);
    } finally {
      setLoading(false);
    }
  };

  const cleanResponse = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{[^}]*\}/g, '').trim();
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex gap-4 h-[700px]">
        {/* Panneau de chat */}
        <div className="flex-1 flex flex-col bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 overflow-hidden">
          {/* Barre d'outils */}
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
                onClick={handlePreview}
                disabled={!canPreview || previewLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  canPreview && !previewLoading
                    ? 'bg-[#D4AF37] text-white hover:bg-amber-500 shadow-lg shadow-amber-200'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Eye size={14} />
                {previewLoading ? 'Génération...' : 'Preview'}
              </button>
              <button
                onClick={handleQuote}
                disabled={!canQuote || quoteLoading}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  canQuote && !quoteLoading
                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <FileText size={14} />
                {quoteLoading ? 'Génération...' : 'Devis'}
              </button>
              {showPreview && (
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
                  title={showPreview ? 'Masquer la preview' : 'Afficher la preview'}
                >
                  {showPreview ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
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

            {/* Devis + formulaire */}
            {proposal && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={16} className="text-[#D4AF37]" />
                    <h3 className="font-bold text-lg text-slate-900">{proposal.title}</h3>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">{proposal.description}</p>
                  <div className="mb-4">
                    <h4 className="font-bold text-xs text-[#D4AF37] uppercase tracking-wider mb-2">🔧 Fonctionnalités</h4>
                    <ul className="space-y-1.5">
                      {proposal.features.map((f: string, i: number) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-bold text-xs text-[#D4AF37] uppercase tracking-wider mb-2">⚙️ Technologies</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {proposal.technologies.map((tech: string, i: number) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-50 rounded-full text-xs text-slate-600 border border-slate-200">{tech}</span>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Budget estimé</p>
                      <p className="font-bold text-slate-900">{proposal.budget}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Délai estimé</p>
                      <p className="font-bold text-slate-900">{proposal.timeline}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">* Le prix final dépendra des fonctionnalités spécifiques et du niveau de personnalisation du design.</p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl space-y-3">
                  <h4 className="font-bold text-sm text-slate-800">Finalisez votre demande</h4>
                  <input
                    type="text"
                    placeholder="Votre nom"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                  <input
                    type="email"
                    placeholder="Votre email"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                  <textarea
                    placeholder="Message (optionnel)"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37]"
                    rows={2}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                  <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    <input type="checkbox" checked readOnly className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]" />
                    <span>La conversation et la preview seront jointes automatiquement.</span>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !formData.name || !formData.email}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-200"
                  >
                    Envoyer ma demande
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Barre de saisie */}
          <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Écrivez votre message..."
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-all"
                disabled={loading}
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-xl disabled:opacity-50 hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200"
              >
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
              <button onClick={() => setShowPreview(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1">
              <Sandpack
                template="react"
                files={{ '/App.js': previewCode }}
                options={{ showNavigator: false, showTabs: false, editorHeight: '100%', editorWidthPercentage: 0 }}
                customSetup={{ dependencies: { 'react': '^18.0.0', 'react-dom': '^18.0.0' } }}
              />
            </div>
            <div className="p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adjustInput}
                  onChange={e => setAdjustInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAdjust(adjustInput); }}
                  placeholder="Modifier (ex: changer la couleur, ajouter un bouton…)"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37] transition-colors"
                />
                <button
                  onClick={() => handleAdjust(adjustInput)}
                  disabled={!adjustInput.trim() || loading}
                  className="bg-slate-100 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Ajuster
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}