'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Loader2, Copy, Check, Edit3, ChevronRight,
  Sparkles, Layout, Lightbulb, FileText, PanelRightClose,
  PanelLeftClose, Menu, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

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
  [key: string]: any;
}

// ----- UUID v4 -----
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ----- NETTOYAGE URLS DUPLIQUÉES (frontend) -----
function cleanUrlsForDisplay(text: string): string {
  // Séparer les URLs collées (ex: https://a.comhttps://a.com)
  text = text.replace(/(https?:\/\/[^\s]+?)(?=https?:\/\/)/g, '$1 ');
  const urlRegex = /https?:\/\/[^\s]+/g;
  const matches = text.match(urlRegex) || [];
  if (matches.length === 0) return text;

  // Dédupliquer
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();
  for (const url of matches) {
    const normalized = url.replace(/[.,;:!?]+$/, '').replace(/\/+$/, '');
    if (!seen.has(normalized)) {
      seen.add(normalized);
      uniqueUrls.push(normalized);
    }
  }

  // Supprimer les URLs du texte et réinsérer les uniques
  let result = text.replace(/https?:\/\/[^\s]+/g, '');
  result = result.replace(/\s+/g, ' ').trim();
  if (uniqueUrls.length > 0) {
    if (result.endsWith('.') || result.endsWith('!') || result.endsWith('?')) {
      result = result + ' ' + uniqueUrls.join(', ');
    } else {
      result = result + '. ' + uniqueUrls.join(', ');
    }
  }
  return result;
}

// ----- Rendu des URLs (avec nettoyage anti-doublon) -----
function renderMessageContent(text: string) {
  // Nettoyer les URLs dupliquées avant l'affichage
  text = cleanUrlsForDisplay(text);
  
  if (text.includes('<a href=')) {
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  }
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  const matches = text.match(urlRegex) || [];
  if (matches.length === 0) return <span>{text}</span>;
  const elements: React.ReactNode[] = [];
  parts.forEach((part, i) => {
    if (part) elements.push(<span key={`t-${i}`}>{part}</span>);
    if (i < matches.length) {
      elements.push(
        <a key={`l-${i}`} href={matches[i]} target="_blank" rel="noopener noreferrer"
           className="text-blue-500 underline hover:text-blue-700 break-all">
          {matches[i]}
        </a>
      );
    }
  });
  return <>{elements}</>;
}

// ----- Persistance -----
const STORAGE_KEY = 'actoos-chat-messages';

const isReload = () => {
  if (typeof window === 'undefined') return false;
  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (navEntries.length > 0) return navEntries[0].type === 'reload';
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
    // ignore
  }
};

const stepOrder = ['decrire', 'ajuster', 'soumettre'] as const;
type Step = (typeof stepOrder)[number];

// ----- Composant principal -----
export default function ProjectChatBot() {
  const { language } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentBrief, setCurrentBrief] = useState<ProjectBrief | null>(null);
  const [showBriefPanel, setShowBriefPanel] = useState(false);
  const [step, setStep] = useState<Step>('decrire');
  const [isMobile, setIsMobile] = useState(false);

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
    const welcomeText = t[language]?.chatWelcome || "Bonjour ! Je suis l'Agent Actoos. Décrivez votre projet...";
    const fresh = [
      {
        id: generateId(),
        role: 'assistant' as const,
        content: welcomeText,
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
      const timeout = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(timeout);
    }
  }, [loading]);

  // Chargement initial
  useEffect(() => {
    const saved = loadMessages();
    if (saved.length > 0) {
      const firstMsg = saved[0];
      const welcomeFr = t.fr?.chatWelcome;
      const welcomeEn = t.en?.chatWelcome;
      const isWelcome = (welcomeFr && firstMsg.content === welcomeFr) || (welcomeEn && firstMsg.content === welcomeEn);
      if (isWelcome && firstMsg.content !== t[language]?.chatWelcome) {
        saved[0] = { ...firstMsg, content: t[language]?.chatWelcome || welcomeFr || '' };
        saveMessages(saved);
      }
      setMessages(saved);
      const lastBriefMsg = [...saved].reverse().find((m) => m.type === 'briefing' && m.briefing);
      if (lastBriefMsg?.briefing) {
        setCurrentBrief(lastBriefMsg.briefing);
        setStep(saved.some((m) => m.content.includes('transmis')) ? 'soumettre' : 'ajuster');
      }
    } else {
      const welcomeText = t[language]?.chatWelcome || "Bonjour ! Je suis l'Agent Actoos…";
      setMessages([{ id: generateId(), role: 'assistant', content: welcomeText }]);
    }
  }, [language]);

  // Sauvegarde automatique
  useEffect(() => {
    if (messages.length > 0) saveMessages(messages);
  }, [messages]);

  const briefSummary = useMemo(() => {
    if (!currentBrief) return [];
    const entries: Array<{ label: string; value: string | JSX.Element }> = [];
    const ignoreKeys = new Set(['projectName', 'features', 'pages', 'roles', 'modules', 'integrations', 'constraints', 'stack']);
    for (const [key, val] of Object.entries(currentBrief)) {
      if (ignoreKeys.has(key)) continue;
      if (val === undefined || val === null) continue;
      if (key === 'maturityScore' || key === 'priorityScore') {
        entries.push({
          label: key === 'maturityScore' ? (t[language].maturity || 'Maturité') : (t[language].urgency || 'Urgence'),
          value: (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full">
                <div className="h-2 bg-[#D4AF37] rounded-full" style={{ width: `${(Number(val) / 10) * 100}%` }} />
              </div>
              <span className="text-xs font-bold">{String(val)}/10</span>
            </div>
          ),
        });
      } else if (typeof val === 'string' || typeof val === 'number') {
        entries.push({ label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: String(val) });
      } else if (Array.isArray(val)) {
        entries.push({ label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), value: val.join(', ') || '–' });
      }
    }
    return entries;
  }, [currentBrief, language]);

  // ----- Envoi (handleSend) -----
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
          language,
        }),
      });

      const data = await res.json();

      // Si le backend renvoie une erreur, on affiche un message d'attente
      if (data.error) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "I'm processing your request, please wait..." : "Je traite votre demande, patientez..." }]);
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
            } catch { }
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
      // Réponse textuelle (même si ready est false ou non)
      if (data.response) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
        return;
      }
      // Si rien, message d'attente
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "I'm still thinking..." : "Je réfléchis encore..." }]);
    } catch {
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "Connection issue, retrying..." : "Problème de connexion, réessai..." }]);
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
      content: language === 'en' ? "Here is your project brief. You can adjust it or click on the suggestions below." : "Voici le cadrage de votre projet. Vous pouvez l'ajuster ou cliquer sur les suggestions ci-dessous.",
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
          content: language === 'en' ? '💡 Suggestions:' : '💡 Suggestions :',
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
          language,
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
          language,
        }),
      });
      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "I'm processing your request..." : "Je traite votre demande..." }]);
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
            } catch { }
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
      if (data.response) {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: data.response }]);
        return;
      }
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "I'm still thinking..." : "Je réfléchis encore..." }]);
    } catch {
      setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? "Connection issue, retrying..." : "Problème de connexion, réessai..." }]);
    } finally {
      setLoading(false);
    }
  };

  // ----- Soumission du projet -----
  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitForm.name.trim() || !submitForm.email.trim()) return;

    setLoading(true);
    const clientToken = generateUUID();

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
          language,
        }),
      });
    } catch {
      // Ne pas bloquer si la sauvegarde échoue
    }

    try {
      const adminRes = await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: 'contact@actoos.com',
          subject: language === 'en' ? 'New project submitted - Actoos' : 'Nouveau projet soumis - Actoos',
          title: language === 'en' ? '📋 New project' : '📋 Nouveau projet',
          message: language === 'en'
            ? `A new project <strong>${currentBrief?.projectName || 'project'}</strong> has been submitted by ${submitForm.name} (${submitForm.email}).<br><br>${submitForm.message ? 'Message: ' + submitForm.message + '<br><br>' : ''}Please review the details in the admin panel.`
            : `Un nouveau projet <strong>${currentBrief?.projectName || 'projet'}</strong> a été soumis par ${submitForm.name} (${submitForm.email}).<br><br>${submitForm.message ? 'Message : ' + submitForm.message + '<br><br>' : ''}Veuillez consulter les détails dans le panneau d'administration.`,
          buttonText: language === 'en' ? 'View project' : 'Voir le projet',
          buttonUrl: `https://actoos.com/admin/projects/${clientToken}`,
          language,
        }),
      });
      const adminData = await adminRes.json();

      if (adminData.success) {
        await fetch('/api/send-project-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: submitForm.email,
            subject: language === 'en' ? 'Project received - Actoos' : 'Projet bien reçu - Actoos',
            title: language === 'en' ? '✨ Project received!' : '✨ Projet bien reçu !',
            message: language === 'en'
              ? `Hello ${submitForm.name},<br><br>We have received your project <strong>${currentBrief?.projectName || 'your project'}</strong>.<br><br>Our team will review it and get back to you within <strong>24 business hours</strong>.`
              : `Bonjour ${submitForm.name},<br><br>Nous avons bien reçu votre projet <strong>${currentBrief?.projectName || 'votre projet'}</strong>.<br><br>Notre équipe l'étudie avec attention et reviendra vers vous sous <strong>24h ouvrées</strong>.`,
            buttonText: language === 'en' ? 'Track my project' : 'Suivre mon projet',
            buttonUrl: `https://actoos.com/client/${clientToken}`,
            language,
          }),
        });

        setShowSubmitForm(false);
        setMessages(prev => [
          ...prev,
          {
            id: generateId(),
            role: 'assistant',
            content: `✅ ${language === 'en' ? 'Your project has been submitted. You will receive a response within 24 hours.' : 'Votre projet a été transmis à l\'équipe Actoos. Vous recevrez une réponse sous 24h.'}<br/><br/>🔗 <a href="https://actoos.com/client/${clientToken}" target="_blank" class="text-blue-500 underline">${language === 'en' ? 'Track progress here' : "Suivez l'avancement ici"}</a>`,
          },
        ]);
        setStep('soumettre');
      } else {
        setMessages((prev) => [...prev, { id: generateId(), role: 'assistant', content: language === 'en' ? 'Error sending. Please try again.' : "Erreur lors de l'envoi. Veuillez réessayer." }]);
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
                  <div className="font-bold text-slate-900 text-sm sm:text-base truncate">{t[language].chatTitle}</div>
                  <div className="text-[11px] sm:text-xs text-slate-500 truncate">{t[language].chatSubtitle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {currentBrief && (
                  <button
                    onClick={() => setShowBriefPanel((v) => !v)}
                    className="lg:hidden px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors flex items-center gap-1"
                    title={language === 'en' ? 'Show brief' : 'Afficher le brief'}
                  >
                    {showBriefPanel ? <X size={14} /> : <Menu size={14} />}
                    Brief
                  </button>
                )}
                {currentBrief && !isMobile && !showBriefPanel && (
                  <button
                    onClick={() => setShowBriefPanel(true)}
                    className="hidden lg:flex px-3 py-2 rounded-xl text-xs font-bold bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-colors items-center gap-1"
                    title={language === 'en' ? 'Show brief' : 'Afficher le brief'}
                  >
                    <Sparkles size={14} /> Brief
                  </button>
                )}
                <button
                  onClick={resetConversation}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {t[language].newProject}
                </button>
              </div>
            </div>

            {/* Étapes */}
            <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2 overflow-x-auto border-b border-slate-200/40 bg-white/20">
              <div className="flex items-center gap-2 sm:gap-4 min-w-max sm:min-w-0 sm:justify-center">
                {[t[language].stepDescribe, t[language].stepAdjust, t[language].stepSubmit].map((label, i) => {
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
                            {language === 'en' ? 'Cancel' : 'Annuler'}
                          </button>
                          <button onClick={saveEdit} disabled={!editContent.trim()} className="text-xs bg-[#D4AF37] text-white px-3 py-1 rounded-full disabled:opacity-50">
                            {language === 'en' ? 'Edit' : 'Modifier'}
                          </button>
                        </div>
                      </div>
                    ) : msg.type === 'briefing' && msg.briefing ? (
                      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#D4AF37]/30 shadow-lg shadow-amber-500/5">
                        <div className="flex items-center gap-2 mb-3">
                          <Layout size={18} className="text-[#D4AF37] shrink-0" />
                          <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">{msg.briefing.projectName || (language === 'en' ? 'Project Brief' : 'Cadrage du projet')}</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div><span className="text-slate-400">{language === 'en' ? 'Type:' : 'Type :'}</span> <strong className="block sm:inline">{msg.briefing.type}</strong></div>
                          <div><span className="text-slate-400">{language === 'en' ? 'Complexity:' : 'Complexité :'}</span> <strong className="block sm:inline">{msg.briefing.complexity}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">{language === 'en' ? 'Features:' : 'Fonctionnalités :'}</span> <strong className="block sm:inline break-words">{msg.briefing.features.join(', ')}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">{language === 'en' ? 'Pages:' : 'Pages :'}</span> <strong className="block sm:inline break-words">{msg.briefing.pages.join(', ')}</strong></div>
                          <div className="sm:col-span-2"><span className="text-slate-400">{language === 'en' ? 'Architecture:' : 'Architecture :'}</span> <strong className="block sm:inline break-words">{msg.briefing.architecture}</strong></div>
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
                          title={language === 'en' ? 'Copy' : 'Copier'}
                        >
                          {copiedId === msg.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                        </button>
                        {msg.role === 'user' && (
                          <button
                            onClick={() => handleEdit(msg)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 bg-white shadow-sm"
                            title={language === 'en' ? 'Edit' : 'Modifier'}
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
                    <span>{t[language].chatValidate}</span>
                  </button>
                </div>
              )}

              {/* Formulaire de soumission */}
              {showSubmitForm && (
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xl shadow-slate-500/5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-bold text-sm text-slate-800">{t[language].chatFinalize}</h4>
                    <button onClick={() => setShowSubmitForm(false)} className="text-slate-400 hover:text-slate-600 lg:hidden">
                      <PanelLeftClose size={16} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmitProject} className="space-y-3">
                    <input
                      name="name"
                      placeholder={t[language].chatPlaceholderName}
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37]"
                      value={submitForm.name}
                      onChange={(e) => setSubmitForm({ ...submitForm, name: e.target.value })}
                      required
                    />
                    <input
                      name="email"
                      type="email"
                      placeholder={t[language].chatPlaceholderEmail}
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37]"
                      value={submitForm.email}
                      onChange={(e) => setSubmitForm({ ...submitForm, email: e.target.value })}
                      required
                    />
                    <textarea
                      name="message"
                      placeholder={t[language].chatPlaceholderMessage}
                      className="w-full border border-slate-200 rounded-3xl px-3 py-3 text-sm outline-none focus:border-[#D4AF37] resize-none"
                      rows={3}
                      value={submitForm.message}
                      onChange={(e) => setSubmitForm({ ...submitForm, message: e.target.value })}
                    />
                    <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-3 rounded-3xl">
                      <input type="checkbox" checked readOnly className="mt-1 rounded border-slate-300 text-[#D4AF37] focus:ring-[#D4AF37]" />
                      <span>{t[language].chatAutoJoin}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button type="submit" className="flex-1 bg-[#D4AF37] text-white py-3 rounded-3xl font-bold text-sm disabled:opacity-50">
                        {t[language].chatSubmit}
                      </button>
                      <button type="button" onClick={() => setShowSubmitForm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-3xl font-bold text-sm">
                        {t[language].chatCancel}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Bouton Nouveau projet après soumission */}
              {step === 'soumettre' && (
                <div className="flex justify-center mt-4">
                  <button
                    onClick={resetConversation}
                    className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-3xl font-bold text-sm shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-all inline-flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    <span>{t[language].chatNewProject}</span>
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
                  placeholder={t[language].chatPlaceholderInput}
                  className="flex-1 bg-white border border-slate-200 rounded-3xl px-4 py-3 text-sm outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all min-w-0 shadow-sm"
                  disabled={loading}
                />
                <button
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white p-3 rounded-3xl disabled:opacity-50 shrink-0 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all"
                  aria-label={language === 'en' ? 'Send' : 'Envoyer'}
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
                  <span className="truncate">{t[language].chatBriefPanel}</span>
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

              <div className="rounded-3xl bg-[#D4AF37]/10 p-4 text-sm text-slate-700 leading-relaxed">
                {t[language].chatBriefHelp}
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}