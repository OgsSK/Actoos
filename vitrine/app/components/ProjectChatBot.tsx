'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Loader2, Copy, Check, Edit3, ChevronRight,
  Sparkles, Layout, Lightbulb, FileText, PanelRightClose,
  PanelLeftClose, Menu, X,
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
  targetUsers?: string;
  sector?: string;
  type: string;
  features: string[];
  pages: string[];
  roles: string[];
  modules?: string[];
  integrations?: string[];
  constraints?: string[];
  complexity: string;
  maturityScore?: number;
  priorityScore?: number;
  architecture: string;
  stack?: string[];
  priority?: string;
}

// ----- Rendu des URLs cliquables -----
function renderMessageContent(text: string) {
  // Si le texte contient déjà un lien HTML, on le rend tel quel
  if (text.includes('<a href=')) {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  }

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];

  return (
    <>
      {parts.map((part, i) => {
        if (i < matches.length) {
          return (
            <span key={i}>
              {part}
              <a
                href={matches[i]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline hover:text-blue-700 break-all"
              >
                {matches[i]}
              </a>
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ----- Persistance intelligente -----
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
  } catch {
    return [];
  }
};

const saveMessages = (msgs: Message[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
  } catch {
    // plein / indisponible
  }
};

const initialAssistantMessage: Message = {
  id: 'initial-message',
  role: 'assistant',
  content:
    "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet en une phrase, je vous aide à le structurer et à l'affiner.",
};

const stepOrder = ['decrire', 'ajuster', 'soumettre'] as const;
type Step = (typeof stepOrder)[number];

// ----- Composant -----
export default function ProjectChatBot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<ProjectBrief | null>(null);
  const [showBriefPanel, setShowBriefPanel] = useState(false);
  const [step, setStep] = useState<Step>('decrire');
  const [isMobile, setIsMobile] = useState(false);

  // Formulaire de soumission
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitForm, setSubmitForm] = useState({ name: '', email: '', message: '' });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

  // Détection mobile
  useEffect(() => {
    const update = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setShowBriefPanel(false);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const resetConversation = () => {
    const fresh = [
      {
        id: generateId(),
        role: 'assistant' as const,
        content:
          "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet en une phrase, je vous aide à le structurer et à l'affiner.",
      },
    ];
    setMessages(fresh);
    setCurrentBrief(null);
    setStep('decrire');
    setShowSubmitForm(false);
    setSubmitForm({ name: '', email: '', message: '' });
    setShowBriefPanel(!isMobile);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  // Scroll & focus
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, showSubmitForm]);

  useEffect(() => {
    if (!loading) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [loading]);

  // Chargement initial
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      setMessages(saved);
      const lastBriefMsg = [...saved].reverse().find((m) => m.type === 'briefing' && m.briefing);
      if (lastBriefMsg?.briefing) {
        setCurrentBrief(lastBriefMsg.briefing);
        setStep(saved.some((m) => m.content.includes('transmis')) ? 'soumettre' : 'ajuster');
      }
    } else {
      setMessages([initialAssistantMessage]);
    }
  }, []);

  // Sauvegarde automatique
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  const briefSummary = useMemo(() => {
    if (!currentBrief) return [] as Array<{ label: string; value: string | JSX.Element }>;
    return [
      { label: 'Secteur', value: currentBrief.sector || 'Non spécifié' },
      { label: 'Type', value: currentBrief.type },
      { label: 'Objectif', value: currentBrief.objective || 'À définir' },
      { label: 'Public cible', value: currentBrief.targetUsers || 'À définir' },
      { label: 'Modules', value: currentBrief.modules?.join(', ') || 'À définir' },
      { label: 'Pages', value: currentBrief.pages.join(', ') },
      { label: 'Stack', value: currentBrief.stack?.join(', ') || 'À définir' },
      { label: 'Complexité', value: currentBrief.complexity },
      { label: 'Priorité', value: currentBrief.priority || 'Standard' },
      { 
        label: 'Maturité', 
        value: currentBrief.maturityScore ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full">
              <div className="h-2 bg-[#D4AF37] rounded-full" style={{ width: `${(currentBrief.maturityScore / 10) * 100}%` }} />
            </div>
            <span className="text-xs font-bold">{currentBrief.maturityScore}/10</span>
          </div>
        ) : 'N/A'
      },
      { 
        label: 'Urgence', 
        value: currentBrief.priorityScore ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-200 rounded-full">
              <div className="h-2 bg-[#D4AF37] rounded-full" style={{ width: `${(currentBrief.priorityScore / 10) * 100}%` }} />
            </div>
            <span className="text-xs font-bold">{currentBrief.priorityScore}/10</span>
          </div>
        ) : 'N/A'
      },
    ];
  }, [currentBrief]);

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          role: 'analyst',
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
        return;
      }

      // Extraction robuste du briefing (JSON) même entouré de texte ou markdown
      const tryParseBriefing = (text: string) => {
        if (!text) return null;
        try {
          const parsed = JSON.parse(text);
          if (parsed.briefing) return parsed;
        } catch {
          const match = text.match(/\{[\s\S]*"briefing"[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed.briefing) return parsed;
            } catch {}
          }
        }
        return null;
      };

      const rawResponse = data.response || '';

      const briefing = tryParseBriefing(rawResponse);
      if (briefing) {
        handleBriefingResponse(briefing);
        return;
      }

      if (data.briefing) {
        handleBriefingResponse(data);
        return;
      }

      if (rawResponse && !rawResponse.startsWith('{')) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: rawResponse }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
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
      content: "Voici le cadrage de votre projet. Vous pouvez l'ajuster ou cliquer sur les suggestions ci-dessous.",
      type: 'briefing',
      briefing: brief,
      suggestions: data.suggestions || [],
    };

    setMessages((prev) => [...prev, assistantMsg]);

    if (data.suggestions?.length) {
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: 'assistant',
          content: '💡 Suggestions :',
          type: 'suggestions',
          suggestions: data.suggestions,
        },
      ]);
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setMessages((prev) => [...prev, { id: generateId(), role: 'user', content: suggestion }]);
    setLoading(true);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'adjust-brief',
          role: 'analyst',
          currentBrief,
          modification: suggestion,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.briefing) {
          handleBriefingResponse(data);
          return;
        }
        if (data.response) {
          setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
          return;
        }
      }

      await handleSend(suggestion);
    } catch {
      await handleSend(suggestion);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2000);
    });
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
    const idx = messages.findIndex((m) => m.id === editingId);
    if (idx === -1) return;

    const truncated = messages.slice(0, idx);
    const editedMsg: Message = { id: generateId(), role: 'user', content: editContent.trim() };
    const updatedMessages = [...truncated, editedMsg];
    setMessages(updatedMessages);
    setEditingId(null);
    setEditContent('');
    setLoading(true);

    try {
      const res = await fetch('/api/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'chat',
          role: 'analyst',
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: `Erreur : ${data.error}` }]);
        return;
      }

      const tryParseBriefing = (text: string) => {
        if (!text) return null;
        try {
          const parsed = JSON.parse(text);
          if (parsed.briefing) return parsed;
        } catch {
          const match = text.match(/\{[\s\S]*"briefing"[\s\S]*\}/);
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed.briefing) return parsed;
            } catch {}
          }
        }
        return null;
      };

      const rawResponse = data.response || '';
      const briefing = tryParseBriefing(rawResponse);
      if (briefing) {
        handleBriefingResponse(briefing);
        return;
      }

      if (data.briefing) {
        handleBriefingResponse(data);
        return;
      }

      if (rawResponse && !rawResponse.startsWith('{')) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: rawResponse }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Soumission finale -----
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.name.trim() || !submitForm.email.trim()) return;

    setLoading(true);
    const clientToken = crypto.randomUUID();
    
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/handle-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-project',
          client_name: submitForm.name,
          client_email: submitForm.email,
          client_message: submitForm.message,
          brief: currentBrief,
          client_token: clientToken,
          conversation: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
    } catch {
      // Ne pas bloquer l'envoi si la sauvegarde échoue
    }
    
    try {
      const html = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #1f2937; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px 24px; text-align: center;">
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
              ${messages
                .map(
                  (m) => `
                <div style="margin-bottom: 12px; padding: 10px 14px; background: ${m.role === 'user' ? '#D4AF37' : '#ffffff'}; color: ${m.role === 'user' ? '#ffffff' : '#0f172a'}; border-radius: 12px; border: 1px solid ${m.role === 'user' ? '#D4AF37' : '#e5e7eb'};">
                  <div style="font-size: 11px; font-weight: 600; margin-bottom: 4px; color: ${m.role === 'user' ? '#fef3c7' : '#64748b'};">${m.role === 'user' ? '👤 Client' : '🤖 Agent Actoos'}</div>
                  <div style="font-size: 14px; line-height: 1.5;">${m.content}</div>
                </div>
              `,
                )
                .join('')}
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">Envoyé depuis la vitrine Actoos • <a href="https://actoos.com" style="color: #D4AF37;">actoos.com</a></p>
          </div>
        </div>
      `;

      const res = await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submitForm.name,
          email: submitForm.email,
          message: submitForm.message,
          to: 'contact@actoos.com',
          html,
        }),
      });
      const data = await res.json();

      if (data.success) {
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
    <p>🔗 Suivez l'avancement de votre projet ici :<br>
      <a href="${window.location.origin}/client/${clientToken}" style="color: #D4AF37; font-weight: bold;">${window.location.origin}/client/${clientToken}</a>
    </p>
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
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `✅ Votre projet a été transmis à l'équipe Actoos. Vous recevrez une réponse sous 24h.\n\n🔗 Suivez l'avancement ici : ${window.location.origin}/client/${clientToken}`,
          },
        ]);
        setStep('soumettre');
      } else {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: "Erreur lors de l'envoi. Veuillez réessayer." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
    } finally {
      setLoading(false);
    }
  };

  const currentStepIndex = stepOrder.indexOf(step);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-100/80 to-white py-3 sm:py-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          {/* Chat */}
          <div className="flex-1 min-w-0 flex flex-col bg-white/60 backdrop-blur-2xl rounded-[40px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.1)] border border-white/80 overflow-hidden min-h-[calc(100dvh-1.5rem)] lg:min-h-[650px] transition-all duration-300">
            {/* Header */}
            <div className="sticky top-0 z-20 flex items-center justify-between gap-3 p-3 sm:p-4 border-b border-slate-200/50 bg-white/50 backdrop-blur-xl">
              <div className="flex items-center gap-2 min-w-0">
                <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-2xl bg-[#D4AF37]/10 text-[#D4AF37] shrink-0">
                  <Sparkles size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 text-sm sm:text-base truncate">Agent Actoos</div>
                  <div className="text-[11px] sm:text-xs text-slate-500 truncate">Structuration de projet guidée</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentBrief && (
                  <button
                    onClick={() => setShowBriefPanel((v) => !v)}
                    className="lg:hidden px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-1"
                    title="Afficher le brief"
                  >
                    {showBriefPanel ? <X size={14} /> : <Menu size={14} />}
                    Brief
                  </button>
                )}
                {currentBrief && !isMobile && !showBriefPanel && (
                  <button
                    onClick={() => setShowBriefPanel(true)}
                    className="hidden lg:flex px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors items-center gap-1"
                    title="Afficher le brief"
                  >
                    <Sparkles size={14} /> Brief
                  </button>
                )}
                <button
                  onClick={resetConversation}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Nouveau
                </button>
              </div>
            </div>

            {/* Étapes */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 overflow-x-auto border-b border-slate-200/40 bg-white/20">
              <div className="flex items-center gap-2 sm:gap-4 min-w-max sm:min-w-0 sm:justify-center">
                {['Décrire', 'Ajuster', 'Soumettre'].map((label, i) => {
                  const active = currentStepIndex === i;
                  const done = currentStepIndex > i;
                  return (
                    <div key={label} className="flex items-center gap-2 shrink-0">
                      <div className={`flex items-center gap-2 text-[11px] sm:text-sm font-bold ${active ? 'text-[#D4AF37]' : done ? 'text-emerald-600' : 'text-slate-400'}`}>
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${active ? 'bg-[#D4AF37] text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}
                        >
                          {i + 1}
                        </span>
                        <span>{label}</span>
                      </div>
                      {i < 2 && <ChevronRight size={16} className="text-slate-300" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} group`}>
                  <div className="relative max-w-[92%] sm:max-w-[86%] lg:max-w-[90%] animate-fade-in-up">
                    {editingId === msg.id ? (
                      <div className="flex flex-col gap-2">
                        <input
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              saveEdit();
                            }
                            if (e.key === 'Escape') cancelEdit();
                          }}
                          className="w-full bg-white border border-[#D4AF37] rounded-3xl px-4 py-3 text-sm outline-none shadow-sm"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={cancelEdit} className="text-xs text-slate-500">
                            Annuler
                          </button>
                          <button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full disabled:opacity-50">
                            Modifier
                          </button>
                        </div>
                      </div>
                    ) : msg.type === 'briefing' && msg.briefing ? (
                      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D4AF37]/30 shadow-lg shadow-amber-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <Layout size={18} className="text-[#D4AF37] shrink-0" />
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{msg.briefing.projectName || 'Cadrage du projet'}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div><span className="text-slate-400">Type :</span> <strong className="block sm:inline">{msg.briefing.type}</strong></div>
                          <div><span className="text-slate-400">Complexité :</span> <strong className="block sm:inline">{msg.briefing.complexity}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">Fonctionnalités :</span> <strong className="block sm:inline break-words">{msg.briefing.features.join(', ')}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">Pages :</span> <strong className="block sm:inline break-words">{msg.briefing.pages.join(', ')}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">Architecture :</span> <strong className="block sm:inline break-words">{msg.briefing.architecture}</strong></div>
                        </div>
                      </div>
                    ) : msg.type === 'suggestions' && msg.suggestions ? (
                      <div className="flex flex-wrap gap-2">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={`${msg.id}-${i}`}
                            onClick={() => handleSuggestionClick(s)}
                            className="px-3 py-2 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-sm font-medium hover:bg-[#D4AF37]/20 transition-colors inline-flex items-center gap-1 max-w-full"
                          >
                            <Lightbulb size={14} className="shrink-0" />
                            <span className="break-words text-left">{s}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`p-3.5 rounded-3xl text-sm whitespace-pre-wrap break-words leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-br from-[#D4AF37] to-amber-500 text-white rounded-br-xl shadow-md shadow-amber-500/10'
                            : 'bg-white/90 backdrop-blur-sm text-slate-700 rounded-bl-xl border border-slate-200/80 shadow-sm'
                        }`}
                      >
                        {renderMessageContent(msg.content)}
                      </div>
                    )}

                    {editingId !== msg.id && msg.type !== 'suggestions' && msg.type !== 'briefing' && (
                      <div className="absolute -bottom-7 right-0 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white shadow-sm"
                          title="Copier"
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                        {msg.role === 'user' && (
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white shadow-sm"
                            title="Modifier"
                          >
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
                  <div className="bg-white/90 p-3 rounded-3xl rounded-bl-xl border border-slate-200/80 shadow-sm">
                    <div className="flex space-x-1.5">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton Valider */}
              {currentBrief && !showSubmitForm && step !== 'soumettre' && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setShowSubmitForm(true)}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white rounded-3xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <FileText size={16} />
                    <span>Valider et transmettre à Actoos</span>
                  </button>
                </div>
              )}

              {/* Formulaire de soumission */}
              {showSubmitForm && (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xl shadow-slate-500/5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-sm text-slate-800">Finaliser la transmission</h4>
                    <button onClick={() => setShowSubmitForm(false)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                      <PanelLeftClose size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitProject} className="space-y-3">
                    <input
                      name="name"
                      placeholder="Nom *"
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37]"
                      value={submitForm.name}
                      onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                      required
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder="Email *"
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37]"
                      value={submitForm.email}
                      onChange={(e) => setSubmitForm({ ...submitForm, email: e.target.value })}
                      required
                    />
                    <textarea
                      name="message"
                      placeholder="Message (optionnel)"
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37] resize-none"
                      rows={3}
                      value={submitForm.message}
                      onChange={(e) => setSubmitForm({ ...submitForm, message: e.target.value })}
                    />
                    <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-3xl">
                      <input type="checkbox" checked readOnly className="mt-1 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]" />
                      <span>La conversation et le brief seront joints automatiquement.</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-3 rounded-3xl font-bold text-sm disabled:opacity-50">
                        Soumettre
                      </button>
                      <button type="button" onClick={() => setShowSubmitForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-3xl font-bold text-sm">
                        Annuler
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bouton Nouveau projet (après soumission) */}
              {step === 'soumettre' && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={resetConversation}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-3xl font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>Démarrer un nouveau projet</span>
                  </button>
                </div>
              )}
            </div>

            {/* Barre de saisie */}
            <div className="p-3 sm:p-4 border-t border-slate-200/50 bg-white/60 backdrop-blur-xl shrink-0 sticky bottom-0">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Décrivez votre projet..."
                  className="flex-1 bg-white border border-slate-200 rounded-3xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all min-w-0 shadow-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-3xl disabled:opacity-50 shrink-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
                  aria-label="Envoyer"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Panneau Brief */}
          {currentBrief && showBriefPanel && (
            <aside className="w-full lg:w-80 bg-white/60 backdrop-blur-2xl rounded-[40px] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] border border-white/80 p-4 sm:p-5 space-y-4 lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-900 flex items-center gap-2 min-w-0">
                  <Sparkles size={16} className="text-[#D4AF37] shrink-0" />
                  <span className="truncate">Brief vivant</span>
                </h3>
                <button onClick={() => setShowBriefPanel(false)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                  <X size={16} />
                </button>
                <button onClick={() => setShowBriefPanel(false)} className="hidden lg:inline-flex text-slate-400 hover:text-slate-600">
                  <PanelRightClose size={16} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {briefSummary.map((item) => (
                  <div key={item.label} className="rounded-3xl bg-slate-50/80 p-3">
                    <div className="text-slate-400 text-xs mb-1">{item.label}</div>
                    <div className="text-slate-900 font-semibold break-words">{item.value}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const res = await fetch('/api/generate-proposal', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'innovation',
                        messages: messages.map(m => ({ role: m.role, content: m.content })),
                      }),
                    });
                    const data = await res.json();
                    if (data.response) {
                      setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
                    }
                  } catch {
                    setMessages(prev => [...prev, { id: generateId(), role: 'assistant', content: 'Erreur de connexion.' }]);
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full mt-3 px-4 py-2.5 bg-purple-50 text-purple-700 rounded-3xl font-medium text-sm hover:bg-purple-100 transition-colors flex items-center justify-center gap-2"
              >
                <Lightbulb size={16} />
                Améliorer le projet
              </button>

              <div className="rounded-3xl bg-[#D4AF37]/10 p-4 text-sm text-slate-700 leading-relaxed">
                Le brief reste modifiable pendant l'échange. Sur mobile, il se replie pour laisser la place au chat.
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}