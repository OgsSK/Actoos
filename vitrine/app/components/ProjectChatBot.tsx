'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles, Mail, Copy, Check, Edit3 } from 'lucide-react';

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

  // Supprime tout JSON parasite des réponses
  const cleanResponse = (text: string): string => {
    if (!text) return '';
    return text.replace(/\{[^}]*\}/g, '').trim();
  };

  // Scroll fluide
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  // Auto-focus après envoi
  useEffect(() => {
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [loading]);

  // Message de bienvenue
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: generateId(),
        role: 'assistant',
        content: 'Bonjour ! Je suis l\'assistant Actoos. Décrivez-moi votre projet, je suis là pour vous aider à concevoir votre logiciel sur mesure.',
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.ready) {
        setProposal(data.proposal);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '📄 Voici votre proposition personnalisée :' }]);
      } else {
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async () => {
    if (!editContent.trim() || !editingId) return;
    const editedIndex = messages.findIndex(m => m.id === editingId);
    if (editedIndex === -1) return;

    const truncatedMessages = messages.slice(0, editedIndex);
    const editedMsg: Message = { id: generateId(), role: 'user', content: editContent.trim() };
    const updatedMessages = [...truncatedMessages, editedMsg];
    setMessages(updatedMessages);
    setEditingId(null);
    setEditContent('');
    setProposal(null);
    setLoading(true);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
      } else if (data.ready) {
        setProposal(data.proposal);
        setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '📄 Voici votre proposition personnalisée :' }]);
      } else {
        const cleaned = cleanResponse(data.response || '');
        if (cleaned) {
          setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: cleaned }]);
        }
      }
    } catch {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleSubmitProject = async () => {
  if (!formData.name || !formData.email) return;
  setLoading(true);
  try {
    let emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937">
        <h2 style="color:#2563eb;border-bottom:2px solid #e5e7eb;padding-bottom:8px">Nouveau projet depuis le chatbot</h2>
        <p><strong>Client :</strong> ${formData.name} (${formData.email})</p>
        <p><strong>Message :</strong> ${formData.message || '-'}</p>
    `;

    if (includeConversation && proposal) {
      emailHtml += `
        <hr style="border:1px solid #e5e7eb;margin:20px 0" />
        <h3 style="color:#2563eb">📋 Proposition</h3>
        <table style="width:100%;border-collapse:collapse;margin:10px 0">
          <tr><td style="padding:6px;font-weight:bold">Titre</td><td>${proposal.title}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Description</td><td>${proposal.description}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Fonctionnalités</td><td>${proposal.features.map((f: string) => `• ${f}`).join('<br>')}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Technologies</td><td>${proposal.technologies.join(', ')}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Budget</td><td>${proposal.budget}</td></tr>
          <tr><td style="padding:6px;font-weight:bold">Délai</td><td>${proposal.timeline}</td></tr>
        </table>
        <hr style="border:1px solid #e5e7eb;margin:20px 0" />
        <h3 style="color:#2563eb">💬 Conversation</h3>
        ${messages.map(m => `
          <div style="margin-bottom:8px">
            <span style="font-weight:bold;color:${m.role === 'user' ? '#2563eb' : '#10b981'}">${m.role === 'user' ? '👤 Client' : '🤖 Assistant'}</span><br>
            <span style="background:#f9fafb;padding:4px 8px;border-radius:4px;display:inline-block;max-width:100%">${m.content}</span>
          </div>
        `).join('')}
      `;
    }

    emailHtml += `<hr style="border:1px solid #e5e7eb;margin:20px 0" /><p style="color:#6b7280;font-size:12px">Envoyé depuis le chatbot de la vitrine.</p></div>`;

    const res = await fetch('/api/send-project-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.name,
        email: formData.email,
        message: formData.message,
        html: emailHtml,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: '✅ Votre demande a bien été transmise ! L\'équipe Actoos vous contactera dans les 24h.' }]);
      setShowForm(false);
    } else {
      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur lors de l\'envoi.' }]);
    }
  } catch {
    setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden max-w-2xl mx-auto flex flex-col" style={{ height: '600px' }}>
      <div className="bg-slate-950 p-4 flex items-center space-x-3 shrink-0">
        <Sparkles size={20} className="text-[#D4AF37]" />
        <span className="text-white font-bold">Assistant Actoos</span>
      </div>

      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
            <div className="relative max-w-[85%]">
              {editingId === msg.id ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="w-full bg-slate-100 border border-[#D4AF37] rounded-xl px-4 py-3 text-sm outline-none"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={cancelEdit} className="text-xs text-slate-500 hover:text-slate-700">Annuler</button>
                    <button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full hover:bg-amber-500 disabled:opacity-50">Modifier</button>
                  </div>
                </div>
              ) : (
                <div className={`p-3 rounded-xl text-sm whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-slate-950 text-white rounded-br-md' : 'bg-slate-100 text-slate-800 rounded-bl-md'}`}>
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

        {proposal && !showForm && (
          <div className="pt-2 space-y-3">
            <div className="bg-white rounded-xl p-4 shadow-md border border-slate-100">
              <h3 className="font-bold text-lg mb-2">{proposal.title}</h3>
              <p className="text-slate-600 text-sm mb-3">{proposal.description}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {proposal.features.map((f: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-slate-100 rounded-full text-xs text-slate-600">{f}</span>
                ))}
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Budget : {proposal.budget}</span>
                <span>Délai : {proposal.timeline}</span>
              </div>
            </div>
            <button onClick={() => setShowForm(true)} className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2">
              <Mail size={16} />
              <span>Contacter Actoos pour ce projet</span>
            </button>
          </div>
        )}

        {showForm && (
          <div className="pt-2 space-y-3">
            <input type="text" placeholder="Votre nom" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input type="email" placeholder="Votre email" className="w-full border rounded-lg px-3 py-2 text-sm" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <textarea placeholder="Message (optionnel)" className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
            
            <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={includeConversation}
                onChange={(e) => setIncludeConversation(e.target.checked)}
                className="rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]"
              />
              <span>Joindre la conversation pour plus de contexte</span>
            </label>

            <button onClick={handleSubmitProject} className="w-full bg-[#10B981] text-white py-3 rounded-xl font-bold disabled:opacity-50" disabled={loading}>
              {loading ? 'Envoi...' : 'Envoyer ma demande'}
            </button>
            <button onClick={() => setShowForm(false)} className="w-full text-slate-500 py-2 text-sm hover:text-slate-700">Annuler</button>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex gap-2 bg-white shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Écrivez votre message..."
          className="flex-1 border rounded-xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] transition-colors"
          disabled={loading}
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="bg-slate-950 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-slate-900 transition-colors"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}