'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Mail, Copy, Check, Edit3, Zap } from 'lucide-react';

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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [includeConversation, setIncludeConversation] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const cleanResponse = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{[^}]*\}/g, '').trim();
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => { if (!loading) setTimeout(() => inputRef.current?.focus(), 50); }, [loading]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: generateId(), role: 'assistant', content: 'Bonjour ! Je suis l\'assistant Actoos. Décrivez-moi votre projet.' }]);
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
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.ready) {
        setProposal(data.proposal);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '📄 Voici votre proposition personnalisée :' }]);
      } else {
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
      }
    } catch { setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]); }
    finally { setLoading(false); }
  };

  const handleEdit = (msg: Message) => { setEditingId(msg.id); setEditContent(msg.content); };
  const cancelEdit = () => { setEditingId(null); setEditContent(''); };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const editedIndex = messages.findIndex(m => m.id === editingId);
    if (editedIndex === -1) return;
    const truncatedMessages = messages.slice(0, editedIndex);
    const editedMsg: Message = { id: generateId(), role: 'user', content: editContent.trim() };
    const updatedMessages = [...truncatedMessages, editedMsg];
    setMessages(updatedMessages); setEditingId(null); setEditContent(''); setProposal(null);
    setLoading(true);
    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.ready) {
        setProposal(data.proposal);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '📄 Voici votre proposition personnalisée :' }]);
      } else {
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
      }
    } catch { setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]); }
    finally { setLoading(false); }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); });
  };

  const handleAdjustProposal = () => handleSend('Peux-tu ajuster ce devis ?');

  const handleSubmitProject = async () => {
    if (!formData.name || !formData.email) return;
    setLoading(true);
    try {
      let emailHtml = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937"><h2 style="color:#2563eb;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Nouveau projet depuis le chatbot</h2><p><strong>Client :</strong> ${formData.name} (${formData.email})</p><p><strong>Message :</strong> ${formData.message || '-'}</p>`;
      if (includeConversation && proposal) {
        emailHtml += `<hr style="border:1px solid #e5e7eb;margin:20px 0" /><h3 style="color:#2563eb">📋 Proposition</h3><table style="width:100%;border-collapse:collapse;margin:10px 0"><tr><td style="padding:6px;font-weight:bold">Titre</td><td>${proposal.title}</td></tr><tr><td style="padding:6px;font-weight:bold">Description</td><td>${proposal.description}</td></tr><tr><td style="padding:6px;font-weight:bold">Fonctionnalités</td><td>${proposal.features.map((f: string) => `• ${f}`).join('<br>')}</td></tr><tr><td style="padding:6px;font-weight:bold">Technologies</td><td>${proposal.technologies.join(', ')}</td></tr><tr><td style="padding:6px;font-weight:bold">Budget</td><td>${proposal.budget}</td></tr><tr><td style="padding:6px;font-weight:bold">Délai</td><td>${proposal.timeline}</td></tr></table><hr style="border:1px solid #e5e7eb;margin:20px 0" /><h3 style="color:#2563eb">💬 Conversation</h3>${messages.map(m => `<div style="margin-bottom:8px"><span style="font-weight:bold;color:${m.role === 'user' ? '#2563eb' : '#10b981'}">${m.role === 'user' ? '👤 Client' : '🤖 Assistant'}</span><br><span style="background:#f9fafb;padding:4px 8px;border-radius:4px;display:inline-block;max-width:100%">${m.content}</span></div>`).join('')}`;
      }
      emailHtml += `<hr style="border:1px solid #e5e7eb;margin:20px 0" /><p style="color:#6b7280;font-size:12px">Envoyé depuis le chatbot de la vitrine.</p></div>`;
      const res = await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, email: formData.email, message: formData.message, html: emailHtml }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre demande a bien été transmise ! L\'équipe Actoos vous contactera dans les 24h.' }]);
        setShowForm(false); setProposal(null);
      } else setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'envoi.' }]);
    } catch { setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]); }
    finally { setLoading(false); }
  };

  return (
    <div className="relative max-w-2xl mx-auto">
      {/* Conteneur flottant glassmorphism */}
      <div className="relative bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 ring-1 ring-black/5 overflow-hidden flex flex-col" style={{ height: '620px' }}>
        {/* Orbe de lumière décoratif */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#D4AF37]/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-sky-400/10 rounded-full blur-[80px] pointer-events-none" />

        {/* En-tête */}
        <div className="relative z-10 p-4 flex items-center space-x-3 border-b border-slate-200/50 bg-white/40 backdrop-blur-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <span className="text-slate-900 font-bold text-lg tracking-tight">Assistant Actoos</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-green-600 font-medium">En ligne</span>
            </div>
          </div>
          <div className="ml-auto flex items-center space-x-2">
            <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">IA</span>
            <Sparkles size={14} className="text-[#D4AF37]" />
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="relative z-10 flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group animate-fade-in`}>
              <div className="relative max-w-[85%]">
                {editingId === msg.id ? (
                  <div className="flex flex-col gap-2">
                    <input value={editContent} onChange={e => setEditContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === 'Escape') cancelEdit(); }} className="w-full bg-white border border-[#D4AF37] rounded-xl px-4 py-3 text-sm outline-none" autoFocus />
                    <div className="flex justify-end gap-2"><button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700">Annuler</button><button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full hover:bg-amber-500 disabled:opacity-50">Modifier</button></div>
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-md shadow-md shadow-amber-200'
                      : 'bg-white/80 backdrop-blur-sm text-slate-700 rounded-bl-md border border-slate-200/80 shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                )}
                {editingId !== msg.id && (
                  <div className="absolute -bottom-6 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(msg.content, msg.id)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Copier">{copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}</button>
                    {msg.role === 'user' && <button onClick={() => handleEdit(msg)} className="p-1 rounded text-slate-400 hover:text-slate-600 bg-white shadow-sm" title="Modifier"><Edit3 size={12} /></button>}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-fade-in">
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-2xl rounded-bl-md border border-slate-200/80 shadow-sm">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {proposal && !showForm && (
            <div className="pt-2 space-y-3 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xl">
                <div className="flex items-center space-x-2 mb-3"><Sparkles size={16} className="text-[#D4AF37]" /><h3 className="font-bold text-lg text-slate-900">{proposal.title}</h3></div>
                <p className="text-slate-600 text-sm mb-4 leading-relaxed">{proposal.description}</p>
                <div className="mb-4"><h4 className="font-bold text-xs text-[#D4AF37] uppercase tracking-wider mb-2">🔧 Fonctionnalités</h4><ul className="space-y-1.5">{proposal.features.map((f: string, i: number) => (<li key={i} className="text-sm text-slate-600 flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span><span>{f}</span></li>))}</ul></div>
                <div className="mb-4"><h4 className="font-bold text-xs text-[#D4AF37] uppercase tracking-wider mb-2">⚙️ Technologies</h4><div className="flex flex-wrap gap-1.5">{proposal.technologies.map((tech: string, i: number) => (<span key={i} className="px-2.5 py-1 bg-slate-50 rounded-full text-xs text-slate-600 border border-slate-200">{tech}</span>))}</div></div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100"><div><p className="text-xs text-slate-400 mb-0.5">Budget estimé</p><p className="font-bold text-slate-900">{proposal.budget}</p></div><div><p className="text-xs text-slate-400 mb-0.5">Délai estimé</p><p className="font-bold text-slate-900">{proposal.timeline}</p></div></div>
                <p className="text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-100">* Le prix final dépendra des fonctionnalités spécifiques et du niveau de personnalisation du design.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowForm(true)} className="flex-1 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200"><Mail size={16} /><span>Contacter Actoos</span></button>
                <button onClick={handleAdjustProposal} className="flex-1 bg-white text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 hover:bg-slate-50 transition-all border border-slate-200 shadow-sm"><Edit3 size={16} /><span>Ajuster le devis</span></button>
              </div>
            </div>
          )}

          {showForm && (
            <div className="pt-2 space-y-3 animate-fade-in">
              <input type="text" placeholder="Votre nom" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] transition-colors" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
              <input type="email" placeholder="Votre email" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] transition-colors" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              <textarea placeholder="Message (optionnel)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D4AF37] transition-colors" rows={2} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
              <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" checked={includeConversation} onChange={(e) => setIncludeConversation(e.target.checked)} className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]" /><span>Joindre la conversation pour plus de contexte</span></label>
              <button onClick={handleSubmitProject} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:from-green-400 hover:to-emerald-400 transition-all shadow-lg shadow-green-200" disabled={loading}>{loading ? 'Envoi...' : 'Envoyer ma demande'}</button>
              <button onClick={() => setShowForm(false)} className="w-full text-slate-500 py-2 text-sm hover:text-slate-700 transition-colors">Annuler</button>
            </div>
          )}
        </div>

        {/* Barre de saisie */}
        <div className="relative z-10 p-4 border-t border-slate-200/50 bg-white/40 backdrop-blur-xl">
          <div className="flex gap-2">
            <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Écrivez votre message..." className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-all" disabled={loading} />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()} className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-xl disabled:opacity-50 hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200"><Send size={18} /></button>
          </div>
          <p className="text-[9px] text-slate-400 text-center mt-2">Propulsé par l'IA • Réponses en temps réel</p>
        </div>
      </div>
    </div>
  );
}