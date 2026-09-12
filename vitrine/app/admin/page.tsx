'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, BarChart3, Calendar, DollarSign, Eye, EyeOff,
  FileText, LayoutDashboard, LogOut, Mail, MessageSquare,
  RefreshCw, Search, TrendingUp, Users, X,
  Activity, PieChart as PieChartIcon, Target, CheckCircle, Archive, Trash2,
  Download, Upload, Send, Edit3, Eye as EyeIcon, Plus
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../../lib/translations';
import BookingModal from '../components/BookingModal';
import StepPickerModal from '../components/StepPickerModal';
import { SUPABASE_FUNCTIONS_URL } from '../../lib/supabase-functions';

const COLORS = ['#0F172A', '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

function normalizeStatus(value: string) {
  return (value || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_');
}

function normalizeConversation(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  if (Array.isArray(value.messages)) return value.messages;
  return [];
}

function getStatusLabel(status: string, lang: string) {
  const labels: Record<string, Record<string, string>> = {
    nouveau: { fr: 'Nouveau', en: 'New' },
    contacté: { fr: 'Contacté', en: 'Contacted' },
    devis_envoyé: { fr: 'Devis envoyé', en: 'Quote sent' },
    en_cours: { fr: 'En cours', en: 'In progress' },
    gagné: { fr: 'Gagné', en: 'Won' },
    perdu: { fr: 'Perdu', en: 'Lost' },
    livré: { fr: 'Livré', en: 'Delivered' },
    terminé: { fr: 'Terminé', en: 'Completed' },
  };
  const statusKey = normalizeStatus(status);
  return labels[statusKey]?.[lang] || status;
}

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    nouveau: 'bg-blue-50 text-blue-700', contacté: 'bg-amber-50 text-amber-700',
    devis_envoyé: 'bg-purple-50 text-purple-700', en_cours: 'bg-cyan-50 text-cyan-700',
    gagné: 'bg-green-50 text-green-700', perdu: 'bg-red-50 text-red-700',
    livré: 'bg-emerald-50 text-emerald-700', terminé: 'bg-gray-50 text-gray-700',
  };
  return map[normalizeStatus(status)] || 'bg-gray-50 text-gray-700';
}

function getClientPaymentStatus(status: string, lang: string) {
  const normalized = normalizeStatus(status);
  const labels: Record<string, Record<string, string>> = {
    aucun: { fr: 'Non payé', en: 'Unpaid' },
    devis_envoyé: { fr: 'Devis envoyé', en: 'Quote sent' },
    acompte_payé: { fr: 'Acompte payé', en: 'Deposit paid' },
    partiel: { fr: 'Partiellement payé', en: 'Partially paid' },
    complet: { fr: 'Payé', en: 'Paid' },
  };
  return labels[normalized]?.[lang] || (lang === 'fr' ? 'Non payé' : 'Unpaid');
}

// Retourne le titre du projet en essayant tous les champs possibles
function getProjectTitle(projet: any, untitled: string): string {
  if (!projet) return untitled;
  return (
    projet.project_name ||
    projet.projectName ||
    projet.brief?.projectName ||
    projet.brief?.project_name ||
    projet.brief?.title ||
    untitled
  );
}

export default function AdminPage() {
  const { language, setLanguage } = useLanguage();
  const { user: authUser, loading: authLoading, isAdmin: authIsAdmin, signOut: authSignOut } = useAuth();
  const [projets, setProjets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [emailForm, setEmailForm] = useState<any>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [token, setToken] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projets' | 'decision' | 'termines' | 'corbeille' | 'messages' | 'fichiers'>('dashboard');
  const [mounted, setMounted] = useState(false);

  const [showAddStepsModal, setShowAddStepsModal] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  const [showBooking, setShowBooking] = useState(false);
  const [bookingProject, setBookingProject] = useState<any>(null);

  const [allComments, setAllComments] = useState<any[]>([]);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('admin_last_read') || new Date().toISOString() : new Date().toISOString()
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [allFiles, setAllFiles] = useState<any[]>([]);

  // Suivi des projets déjà vus par l'admin (persisté dans localStorage)
  const [viewedProjectIds, setViewedProjectIds] = useState<Set<string>>(new Set());

  // Charger depuis localStorage au démarrage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('admin_viewed_projects');
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) setViewedProjectIds(new Set(arr));
    } catch { /* ignore */ }
  }, []);

  const markProjectAsViewed = (id: string) => {
    if (!id) return;
    setViewedProjectIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem('admin_viewed_projects', JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const isProjectUnviewed = (id: string) => !!id && !viewedProjectIds.has(id);

  // Filtres onglet "Terminés"
  const [completedSearch, setCompletedSearch] = useState('');
  const [completedPaymentFilter, setCompletedPaymentFilter] = useState<'all' | 'aucun' | 'acompte_payé' | 'complet'>('all');
  const [completedDateFrom, setCompletedDateFrom] = useState('');
  const [completedDateTo, setCompletedDateTo] = useState('');
  const [completedSort, setCompletedSort] = useState<'recent' | 'oldest' | 'name' | 'amount'>('recent');

  const [detailTab, setDetailTab] = useState('details');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [selectedComments, setSelectedComments] = useState<any[]>([]);
  const [adminComment, setAdminComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const urlToken = new URLSearchParams(window.location.search).get('token');
    const stored = localStorage.getItem('admin_token');
    const finalToken = urlToken || stored || '';
    if (finalToken) {
      setToken(finalToken);
      setIsAuthenticated(true);
    }
  }, []);

  // Auto-authentification via Actoos ID (si user connecté et rôle admin)
  useEffect(() => {
    if (authLoading) return;
    if (authIsAdmin && authUser) {
      setIsAuthenticated(true);
      setToken('actoos-id-session');
    }
  }, [authLoading, authIsAdmin, authUser]);

  const loadProjects = async () => {
    setLoading(true);
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-projects?_=${unique}`, {
        headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      });
      const data = await res.json();
      const projectsData = Array.isArray(data) ? data : [];
      const now = new Date();
      for (const p of projectsData) {
        if (p.booking_id && p.booking_start && new Date(p.booking_start) < now) {
          fetch(`${SUPABASE_FUNCTIONS_URL}/clean-booking`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: p.id }),
          }).catch(() => {});
          p.booking_id = null;
          p.booking_start = null;
          p.booking_link = null;
        }
      }
      setProjets(projectsData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-all-comments`);
      const data = await res.json();
      setAllComments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const loadAllFiles = async () => {
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-all-files`);
      const data = await res.json();
      setAllFiles(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    setUnreadCount(allComments.filter(c => c.author === 'client' && c.created_at > lastReadTimestamp).length);
  }, [allComments, lastReadTimestamp]);

  useEffect(() => {
    if (isAuthenticated) {
      loadProjects();
      loadComments();
      loadAllFiles();
      const interval = setInterval(() => {
        loadProjects();
        loadComments();
        loadAllFiles();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const markAsRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem('admin_last_read', now);
    setLastReadTimestamp(now);
  };

  useEffect(() => {
    if (selectedProject) {
      fetch(`${SUPABASE_FUNCTIONS_URL}/get-files?project_id=${selectedProject.id}`)
        .then(res => res.json())
        .then(data => setSelectedFiles(Array.isArray(data) ? data : []));
      fetch(`${SUPABASE_FUNCTIONS_URL}/get-comments?project_id=${selectedProject.id}`)
        .then(res => res.json())
        .then(data => setSelectedComments(Array.isArray(data) ? data : []));
    }
  }, [selectedProject]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Salifkane&&7') {
      localStorage.setItem('admin_token', 'actoos-admin-2026');
      setToken('actoos-admin-2026'); setIsAuthenticated(true);
    } else { alert(t[language].adminLoginError); }
  };

  const handleLogout = async () => {
    localStorage.removeItem('admin_token');
    setToken('');
    setIsAuthenticated(false);
    setPassword('');
    setProjets([]);
    // Si connecté via Actoos ID, on déconnecte aussi la session
    if (authUser) {
      try { await authSignOut(); } catch {}
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status: normalizeStatus(status) }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, status: normalizeStatus(status) } : p));
    } catch (err) { alert(t[language].adminError); } finally { setActionLoading(null); }
  };

  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    setActionLoading(id);
    try {
      const updates: any = { payment_status: normalizeStatus(paymentStatus) };
      const projet = projets.find(p => p.id === id);
      if (!projet) return;

      if (normalizeStatus(paymentStatus) === 'complet') {
        if (projet.payment_amount) {
          updates.paid_amount = projet.payment_amount;
        }
      } else if (normalizeStatus(paymentStatus) === 'acompte_payé') {
        const amountStr = prompt('Montant payé (€) ?', (projet.payment_amount - (projet.paid_amount || 0)).toString());
        if (amountStr) {
          const amount = parseFloat(amountStr);
          if (!isNaN(amount) && amount > 0) {
            updates.paid_amount = (projet.paid_amount || 0) + amount;
          }
        }
      }

      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, ...updates }),
      });

      setProjets(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    } catch (err) {
      alert(t[language].adminError);
    } finally {
      setActionLoading(null);
    }
  };

  const updateMaturity = async (id: string, value: number) => {
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, maturityScore: value }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, brief: { ...p.brief, maturityScore: value } } : p));
    } catch (err) { console.error(err); }
  };

  const handleDecision = async (projet: any, action: 'accept' | 'archive' | 'refuse') => {
    const projLang = projet.language || 'fr';

    if (action === 'refuse') {
      const reason = prompt(t[language].adminRefuseReasonPrompt);
      if (!reason) return;
      if (!confirm(t[language].adminRefuseConfirm)) return;
      setActionLoading(projet.id);
      try {
        await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'refuse', decision_message: reason }),
        });

        await fetch('/api/send-project-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email,
            subject: projLang === 'en' ? 'Update about your project' : 'Suite de votre projet',
            title: projLang === 'en' ? 'Project update' : 'Suite de votre projet',
            message: projLang === 'en'
              ? `Hello ${projet.client_name},<br><br>After careful review, we regret to inform you that we cannot move forward with your project <strong>${getProjectTitle(projet, 'your project')}</strong> at this time.<br><br>Reason: ${reason}<br><br>Feel free to reach out if you have any questions.`
              : `Bonjour ${projet.client_name},<br><br>Après étude approfondie, nous sommes au regret de ne pas donner suite à votre projet <strong>${getProjectTitle(projet, 'votre projet')}</strong> pour le moment.<br><br>Motif : ${reason}<br><br>N'hésitez pas à nous contacter si vous avez des questions.`,
            buttonText: projLang === 'en' ? 'Contact us' : 'Nous contacter',
            buttonUrl: 'mailto:contact@actoos.com',
            language: projLang,
          }),
        });

        setProjets(prev => prev.filter(p => p.id !== projet.id));
      } catch (err) { alert(t[language].adminError); } finally { setActionLoading(null); }

    } else if (action === 'accept') {
      setActionLoading(projet.id);
      try {
        await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'accept' }),
        });
        const clientLink = `https://actoos.com/client/${projet.client_token}`;

        await fetch('/api/send-project-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email,
            subject: projLang === 'en' ? 'Your project has been accepted!' : 'Votre projet a été accepté !',
            title: projLang === 'en' ? 'Project accepted!' : 'Projet accepté !',
            message: projLang === 'en'
              ? `Hello ${projet.client_name},<br><br>We are pleased to inform you that your project <strong>${getProjectTitle(projet, 'your project')}</strong> has been accepted!<br><br>Our team will contact you shortly to discuss the next steps.`
              : `Bonjour ${projet.client_name},<br><br>Nous avons le plaisir de vous annoncer que votre projet <strong>${getProjectTitle(projet, 'votre projet')}</strong> a été accepté !<br><br>Notre équipe vous contactera très prochainement pour échanger sur les prochaines étapes.`,
            buttonText: projLang === 'en' ? 'View my project' : 'Voir mon projet',
            buttonUrl: clientLink,
            language: projLang,
          }),
        });

        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, status: 'gagné' } : p));
      } catch (err) { alert(t[language].adminError); } finally { setActionLoading(null); }

    } else if (action === 'archive') {
      if (!confirm(t[language].adminArchiveConfirm)) return;
      setActionLoading(projet.id);
      try {
        await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'archive' }),
        });
        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, archived: true, status: 'perdu' } : p));
      } catch (err) { alert(t[language].adminError); } finally { setActionLoading(null); }
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action: 'restore' }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, archived: false, status: 'nouveau' } : p));
    } catch (err) { alert(t[language].adminError); } finally { setActionLoading(null); }
  };

  const relancer = async (projet: any) => {
    setActionLoading(projet.id);
    const projLang = projet.language || 'fr';
    try {
      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: projet.client_email,
          subject: projLang === 'en' ? 'Follow-up - Actoos' : 'Relance - Actoos',
          title: projLang === 'en' ? 'Follow-up' : 'Relance',
          message: projLang === 'en'
            ? `Hello ${projet.client_name},<br><br>${t[projLang].adminFollowUpBody} <strong>${getProjectTitle(projet, t[projLang].adminYourProject)}</strong>.`
            : `Bonjour ${projet.client_name},<br><br>${t[projLang].adminFollowUpBody} <strong>${getProjectTitle(projet, t[projLang].adminYourProject)}</strong>.`,
          buttonText: projLang === 'en' ? 'View project' : 'Voir le projet',
          buttonUrl: `https://actoos.com/client/${projet.client_token}`,
          language: projLang,
        }),
      });
      alert(`${t[language].adminFollowUpSent} ${projet.client_email}`);
    } catch { alert(t[language].adminError); } finally { setActionLoading(null); }
  };

  const createPaymentLink = async (projet: any) => {
    const amount = prompt(t[language].adminPaymentAmount, projet.payment_amount || '1000');
    if (!amount) return;
    setActionLoading(projet.id);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/create-payment-link`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          currency: 'eur',
          description: getProjectTitle(projet, t[language].adminProject),
          metadata: { projet_id: projet.id },
        }),
      });
      const data = await res.json();
      if (data.url) {
        await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, payment_link: data.url, payment_amount: parseFloat(amount), payment_status: 'devis_envoyé' }),
        });
        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, payment_link: data.url, payment_amount: parseFloat(amount), payment_status: 'devis_envoyé' } : p));

        const projLang = projet.language || 'fr';
        await fetch('/api/send-project-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email,
            subject: projLang === 'en' ? 'Payment link - Actoos' : 'Lien de paiement - Actoos',
            title: projLang === 'en' ? 'Payment link' : 'Lien de paiement',
            message: projLang === 'en'
              ? `Hello ${projet.client_name},<br><br>Here is your payment link: <a href="${data.url}">Pay ${amount}€</a>`
              : `Bonjour ${projet.client_name},<br><br>Voici votre lien de paiement : <a href="${data.url}">Payer ${amount}€</a>`,
            buttonText: projLang === 'en' ? 'Pay now' : 'Payer maintenant',
            buttonUrl: data.url,
            language: projLang,
          }),
        });

        alert(t[language].adminPaymentLinkCreated);
      }
    } catch { alert(t[language].adminError); } finally { setActionLoading(null); }
  };

  const openEmailForm = (projet: any) => setEmailForm({ projet, subject: `${t[language].adminEmailDefaultSubject} ${getProjectTitle(projet, t[language].adminProject)}`, body: '' });

  const sendEmailToClient = async () => {
    if (!emailForm) return;
    setEmailSending(true);
    const projLang = emailForm.projet.language || 'fr';
    try {
      await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.projet.client_email,
          subject: emailForm.subject,
          title: projLang === 'en' ? 'Message from Actoos' : 'Message de Actoos',
          message: emailForm.body,
          buttonText: projLang === 'en' ? 'View project' : 'Voir le projet',
          buttonUrl: `https://actoos.com/client/${emailForm.projet.client_token}`,
          language: projLang,
        }),
      });
      alert(t[language].adminEmailSent); setEmailForm(null);
    } catch { alert(t[language].adminError); } finally { setEmailSending(false); }
  };

  const handleCancelBooking = async (projectId: string, bookingId: string) => {
    if (!confirm(t[language].adminCancelAppointmentConfirm)) return;
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/cancel-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId, project_id: projectId }),
      });
      const data = await res.json();
      if (data.success) {
        loadProjects();
        if (selectedProject && selectedProject.id === projectId) {
          setSelectedProject((prev: any) => ({ ...prev, booking_id: null, booking_start: null, booking_link: null }));
        }
      } else {
        alert(data.error || t[language].adminError);
      }
    } catch (err) {
      alert(t[language].adminError);
    }
  };

  const handleResetDecision = async (projet: any) => {
    if (!confirm(t[language].adminResetDecisionConfirm)) return;
    setActionLoading(projet.id);
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: projet.id, status: 'nouveau' }),
      });
      setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, status: 'nouveau' } : p));
    } catch (err) {
      alert(t[language].adminError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeletePermanently = async (projet: any) => {
    if (!confirm(t[language].adminDeletePermanentlyConfirm)) return;
    setActionLoading(projet.id);
    try {
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: projet.id, action: 'delete' }),
      });
      const data = await res.json();
      if (data.success) {
        setProjets(prev => prev.filter(p => p.id !== projet.id));
      } else {
        alert(t[language].adminError);
      }
    } catch (err) {
      alert(t[language].adminError);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAdminComment = async () => {
    if (!adminComment.trim() || !selectedProject) return;
    setCommentSending(true);
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/add-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProject.id, author: 'agent', content: adminComment }),
      });
      setAdminComment('');
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setCommentSending(false); }
  };

  const handleEditAdminComment = async (id: string, content: string) => {
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/edit-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content, author: 'agent' }),
      });
      setEditingCommentId(null);
      setEditCommentContent('');
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { alert(t[language].adminErrorEditingComment); }
  };

  const handleDeleteAdminComment = async (id: string) => {
    if (!confirm(t[language].adminDeleteCommentConfirm)) return;
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-comment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { alert(t[language].adminErrorDeletingComment); }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm(t[language].adminDeleteFileConfirm)) return;
    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/delete-file`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId }),
      });
      if (selectedProject) {
        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/get-files?project_id=${selectedProject.id}`);
        const data = await res.json();
        setSelectedFiles(Array.isArray(data) ? data : []);
      }
      loadAllFiles();
    } catch (err) { console.error(err); }
  };

  // ⬇️ Nouveau : ajout d'étapes depuis la bibliothèque
  const handleAddStepsFromLibrary = async (stepNames: string[]) => {
    if (!currentProjectId || stepNames.length === 0) return;
    const projet = projets.find(p => p.id === currentProjectId);
    if (!projet) return;

    const existingSteps = Array.isArray(projet.steps) ? projet.steps : [];
    const newSteps = stepNames.map(name => ({ name, status: 'à_faire' }));
    const updatedSteps = [...existingSteps, ...newSteps];

    try {
      await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: currentProjectId, steps: updatedSteps }),
      });
      setProjets(prev => prev.map(p => p.id === currentProjectId ? { ...p, steps: updatedSteps } : p));
      if (selectedProject && selectedProject.id === currentProjectId) {
        setSelectedProject({ ...selectedProject, steps: updatedSteps });
      }
      setShowAddStepsModal(false);
      setCurrentProjectId(null);
    } catch (err) {
      alert(t[language].adminError);
    }
  };

  const filteredProjets = projets.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchSearch = p.client_name?.toLowerCase().includes(search) || p.client_email?.toLowerCase().includes(search) || getProjectTitle(p, '').toLowerCase().includes(search) || p.brief?.sector?.toLowerCase().includes(search);
    const excludedStatuses = ['nouveau', 'perdu', 'terminé'];
    const matchStatus = !excludedStatuses.includes(normalizeStatus(p.status)) && (statusFilter === 'all' || p.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const archivedProjets = projets.filter(p => p.archived === true);
  const activeProjets = projets.filter(p => !p.archived);

  const completedProjets = activeProjets.filter(p => normalizeStatus(p.status) === 'terminé');
  const completedCount = completedProjets.length;

  const filteredCompletedProjets = (() => {
    const q = completedSearch.trim().toLowerCase();
    let list = activeProjets.filter(p => normalizeStatus(p.status) === 'terminé');

    if (q) {
      list = list.filter(p =>
        p.client_name?.toLowerCase().includes(q) ||
        p.client_email?.toLowerCase().includes(q) ||
        getProjectTitle(p, '').toLowerCase().includes(q)
      );
    }

    if (completedPaymentFilter !== 'all') {
      list = list.filter(p => normalizeStatus(p.payment_status || 'aucun') === completedPaymentFilter);
    }

    if (completedDateFrom) {
      const from = new Date(completedDateFrom).getTime();
      list = list.filter(p => new Date(p.created_at).getTime() >= from);
    }
    if (completedDateTo) {
      const to = new Date(completedDateTo).getTime() + 24 * 60 * 60 * 1000;
      list = list.filter(p => new Date(p.created_at).getTime() <= to);
    }

    list = [...list].sort((a, b) => {
      if (completedSort === 'recent') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (completedSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (completedSort === 'name') return getProjectTitle(a, '').localeCompare(getProjectTitle(b, ''));
      if (completedSort === 'amount') return (b.payment_amount || 0) - (a.payment_amount || 0);
      return 0;
    });

    return list;
  })();

  const stats = {
    total: activeProjets.length,
    thisMonth: activeProjets.filter(p => { const d = new Date(p.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    avgMaturity: activeProjets.length > 0 ? Math.round(activeProjets.reduce((sum, p) => sum + (p.brief?.maturityScore || 0), 0) / activeProjets.length) : 0,
    avgPriority: activeProjets.length > 0 ? Math.round(activeProjets.reduce((sum, p) => sum + (p.brief?.priorityScore || 0), 0) / activeProjets.length) : 0,
  };

  const pendingDecisions = activeProjets.filter(p =>
    p.status === 'nouveau' && isProjectUnviewed(p.id)
  ).length;

  const pendingProjects = activeProjets.filter(p => {
    const s = normalizeStatus(p.status);
    const isActiveStatus = s === 'gagné' || s === 'en_cours' || s === 'livré' || s === 'contacté' || s === 'devis_envoyé';
    return isActiveStatus && isProjectUnviewed(p.id);
  }).length;

  const archivedCount = archivedProjets.length;

  const trendData = (() => {
    const months: Record<string, number> = {};
    activeProjets.forEach(p => { const d = new Date(p.created_at); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; months[key] = (months[key] || 0) + 1; });
    return Object.entries(months).sort().map(([name, count]) => ({ name, projets: count }));
  })();

  const statusDistribution = (() => {
    const dist: Record<string, number> = {};
    activeProjets.forEach(p => { const s = normalizeStatus(p.status) || 'nouveau'; dist[s] = (dist[s] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  })();

  const sectorDistribution = (() => {
    const dist: Record<string, number> = {};
    activeProjets.forEach(p => { const s = p.brief?.sector || t[language].adminUnspecified; dist[s] = (dist[s] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  })();

  if (!mounted) return null;

  // Pendant le chargement de la session Actoos ID
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-900" />
          <p className="text-xs text-slate-400">Vérification de votre session…</p>
        </div>
      </div>
    );
  }

  // ========== ÉCRAN DE LOGIN ==========
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-4">
              <LayoutDashboard size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">{t[language].adminCockpitTitle}</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t[language].adminPasswordPlaceholder}
                className="w-full border border-slate-200 rounded-lg px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-slate-900 text-white rounded-lg py-3 font-medium text-sm hover:bg-slate-800 transition-colors"
            >
              {t[language].adminLoginButton}
            </button>

            {/* Séparateur + lien Actoos ID */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400 uppercase tracking-wide">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <a
              href="https://jobs.actoos.com/connexion"
              className="block w-full text-center border border-slate-200 text-slate-700 rounded-lg py-3 font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Se connecter avec Actoos ID
            </a>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              Connectez-vous avec votre compte Actoos (role admin requis).
              Une fois connecté, revenez sur cette page pour accéder au dashboard.
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ========== DASHBOARD ==========
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center shrink-0">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-base leading-tight text-slate-900 block truncate">
                {t[language].adminCockpitShort}
              </span>
              <span className="text-[10px] text-slate-400 block">Actoos Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >FR</button>
              <span className="text-slate-300 text-xs">/</span>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >EN</button>
            </div>
            <a href="/" className="text-slate-500 hover:text-slate-900 flex items-center gap-1.5 text-sm transition-colors">
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">{t[language].adminHome}</span>
            </a>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-600 flex items-center gap-1.5 text-sm transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">{t[language].adminLogout}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ONGLETS */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="overflow-x-auto -mx-6 sm:mx-0">
          <div className="border-b border-slate-200 min-w-max sm:min-w-0 px-6 sm:px-0">
            <div className="flex items-center gap-1 -mb-px">
              {[
                { id: 'dashboard', label: t[language].adminTabDashboard, badge: 0 },
                { id: 'projets', label: t[language].adminTabProjects, badge: pendingProjects },
                { id: 'decision', label: t[language].adminTabDecision, badge: pendingDecisions },
                { id: 'termines', label: `${t[language].adminTabCompleted || (language === 'fr' ? 'Terminés' : 'Completed')} (${completedCount})`, badge: 0 },
                { id: 'corbeille', label: `${t[language].adminTabTrash} (${archivedCount})`, badge: 0 },
                { id: 'messages', label: t[language].adminTabMessages, badge: unreadCount },
                { id: 'fichiers', label: t[language].adminTabFiles, badge: 0 },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (tab.id === 'messages') markAsRead();
                    }}
                    className={`relative px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                    {tab.badge > 0 && !isActive && (
                      <span className="ml-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ========== DASHBOARD ========== */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: t[language].adminTotal, value: stats.total, icon: FileText, color: 'blue' },
                { label: t[language].adminThisMonth, value: stats.thisMonth, icon: TrendingUp, color: 'emerald' },
                { label: t[language].adminAvgMaturity, value: `${stats.avgMaturity}/10`, icon: BarChart3, color: 'amber' },
                { label: t[language].adminAvgPriority, value: `${stats.avgPriority}/10`, icon: Users, color: 'purple' }
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      s.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                      s.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                      s.color === 'amber' ? 'bg-amber-50 text-amber-600' :
                      'bg-purple-50 text-purple-600'
                    }`}>
                      <s.icon size={18} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-slate-900 leading-none">{s.value}</p>
                      <p className="text-xs text-slate-400 mt-1.5">{s.label}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-slate-900">
                  <Activity size={15} className="text-blue-600" />
                  {t[language].adminMonthlyEvolution}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="projets" stroke="#0F172A" strokeWidth={2} dot={{ r: 3, fill: '#0F172A' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-slate-900">
                  <PieChartIcon size={15} className="text-blue-600" />
                  {t[language].adminStatuses}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl p-5 border border-slate-200">
                <h3 className="font-semibold text-sm mb-4 flex items-center gap-2 text-slate-900">
                  <Target size={15} className="text-blue-600" />
                  {t[language].adminSectors}
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={sectorDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {sectorDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* ========== PROJETS ========== */}
        {activeTab === 'projets' && (
          <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
              <Search size={16} className="text-slate-400 mt-1 sm:mt-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t[language].adminSearchPlaceholder}
                className="flex-1 min-w-[200px] bg-white rounded-lg px-3 py-2.5 text-sm outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-white rounded-lg px-3 py-2.5 text-sm border border-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                <option value="all">{t[language].adminAllStatuses}</option>
                <option value="contacté">{getStatusLabel('contacté', language)}</option>
                <option value="devis_envoyé">{getStatusLabel('devis_envoyé', language)}</option>
                <option value="en_cours">{getStatusLabel('en_cours', language)}</option>
                <option value="livré">{getStatusLabel('livré', language)}</option>
              </select>
              <button
                onClick={loadProjects}
                disabled={loading}
                className="px-4 py-2.5 bg-white rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50 text-slate-700"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                {t[language].adminRefresh}
              </button>
              <button
                onClick={() => { caches?.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(); }}
                className="px-4 py-2.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} />
                {t[language].adminClearCache}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjets.filter(p => !p.archived).map(projet => (
                <div key={projet.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="flex items-center gap-2">
                        {isProjectUnviewed(projet.id) && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-blue-500 animate-pulse" title={language === 'fr' ? 'Nouveau' : 'New'} />
                        )}
                        <h3 className="font-semibold text-base truncate text-slate-900">{getProjectTitle(projet, t[language].adminUntitled)}</h3>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">{projet.client_name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(projet.status)}`}>
                      {getStatusLabel(projet.status, language)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
                    <Mail size={12} />
                    <span className="truncate">{projet.client_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                    <Calendar size={12} />
                    {new Date(projet.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' })}
                  </div>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">{t[language].adminMaturity}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${(projet.brief?.maturityScore || 0) * 10}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{projet.brief?.maturityScore || 0}/10</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-400">{t[language].adminPriority}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-900 rounded-full transition-all" style={{ width: `${(projet.brief?.priorityScore || 0) * 10}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{projet.brief?.priorityScore || 0}/10</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={projet.brief?.maturityScore || 0}
                      onChange={(e) => updateMaturity(projet.id, parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-slate-900 [&::-webkit-slider-thumb]:rounded-full"
                    />
                  </div>

                  {/* ÉTAPES */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-1.5">{t[language].adminProjectSteps}</p>
                    {((projet.steps && Array.isArray(projet.steps) ? projet.steps : []) as { name: string; status: string }[]).map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <button
                          onClick={async () => {
                            const newSteps = [...(projet.steps || [])];
                            newSteps[idx] = { ...newSteps[idx], status: newSteps[idx].status === 'terminé' ? 'à_faire' : newSteps[idx].status === 'en_cours' ? 'terminé' : 'en_cours' };
                            await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: newSteps }),
                            });
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] shrink-0 transition-colors ${
                            step.status === 'terminé' ? 'bg-emerald-500 border-emerald-500 text-white' :
                            step.status === 'en_cours' ? 'bg-slate-900 border-slate-900 text-white' :
                            'border-slate-300 bg-white'
                          }`}
                        >
                          {step.status === 'terminé' ? '✓' : step.status === 'en_cours' ? '●' : ''}
                        </button>
                        <input
                          type="text"
                          value={step.name}
                          onChange={e => {
                            const newSteps = [...(projet.steps || [])];
                            newSteps[idx] = { ...newSteps[idx], name: e.target.value };
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          onBlur={async () => {
                            await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: projet.steps }),
                            });
                          }}
                          className="flex-1 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500 transition-colors bg-white"
                        />
                        <button
                          onClick={async () => {
                            const newSteps = (projet.steps || []).filter((_: any, i: number) => i !== idx);
                            await fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: newSteps }),
                            });
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-3 mt-2">
                      <button
                        onClick={() => {
                          setCurrentProjectId(projet.id);
                          setShowAddStepsModal(true);
                        }}
                        className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1"
                      >
                        <Plus size={12} />
                        {t[language].adminAddMultipleSteps || 'Ajouter des étapes'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={projet.payment_status || 'aucun'}
                      onChange={e => updatePaymentStatus(projet.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-white cursor-pointer"
                    >
                      <option value="aucun">{t[language].adminPaymentNone}</option>
                      <option value="acompte_payé">{t[language].adminPaymentDeposit}</option>
                      <option value="complet">{t[language].adminPaymentFull}</option>
                    </select>
                    <span className="text-xs text-slate-400">{projet.brief?.sector || '-'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <select
                      value={projet.status || 'nouveau'}
                      onChange={e => updateStatus(projet.id, e.target.value)}
                      className="text-xs border border-slate-200 rounded px-2 py-1 outline-none bg-white cursor-pointer"
                    >
                      {projet.status === 'nouveau' && <option value="nouveau">{getStatusLabel('nouveau', language)}</option>}
                      <option value="contacté">{getStatusLabel('contacté', language)}</option>
                      <option value="devis_envoyé">{getStatusLabel('devis_envoyé', language)}</option>
                      <option value="en_cours">{getStatusLabel('en_cours', language)}</option>
                      <option value="livré">{getStatusLabel('livré', language)}</option>
                      <option value="terminé">{getStatusLabel('terminé', language)}</option>
                      {projet.status === 'perdu' && <option value="perdu">{getStatusLabel('perdu', language)}</option>}
                    </select>

                    <div className="flex items-center gap-0.5">
                      <button onClick={() => relancer(projet)} title={t[language].adminFollowUp} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><RefreshCw size={14} /></button>
                      {projet.booking_id ? (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 px-1">
                          <Calendar size={12} />
                          <span>
                            {new Date(projet.booking_start).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
                          </span>
                          <button onClick={() => handleCancelBooking(projet.id, projet.booking_id)} className="text-red-500 hover:text-red-700" title={t[language].adminCancelAppointment}>
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setBookingProject(projet); setShowBooking(true); }}
                          title={t[language].adminSchedule}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <Calendar size={14} />
                        </button>
                      )}
                      <button onClick={() => createPaymentLink(projet)} title={t[language].adminPaymentLink} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><DollarSign size={14} /></button>
                      <button onClick={() => openEmailForm(projet)} title={t[language].adminSendEmail} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><Mail size={14} /></button>
                      <button onClick={() => { setSelectedProject(projet); markProjectAsViewed(projet.id); }} title={t[language].adminViewDetails} className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"><EyeIcon size={14} /></button>
                      <button
                        onClick={() => handleResetDecision(projet)}
                        disabled={projet.status === 'en_cours' || projet.status === 'livré'}
                        title={t[language].adminResetDecision}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RefreshCw size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePermanently(projet)}
                        title={t[language].adminDeletePermanently}
                        className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ========== DÉCISION ========== */}
        {activeTab === 'decision' && (
          <>
            {pendingDecisions > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => {
                    const unseenIds = activeProjets.filter(p => p.status === 'nouveau' && isProjectUnviewed(p.id)).map(p => p.id);
                    unseenIds.forEach(id => markProjectAsViewed(id));
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                >
                  {language === 'fr' ? 'Tout marquer comme vu' : 'Mark all as viewed'}
                </button>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeProjets.filter(p => p.status === 'nouveau').map(projet => (
                <div key={projet.id} className="bg-white rounded-xl p-5 border border-slate-200">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-base text-slate-900">{getProjectTitle(projet, t[language].adminUntitled)}</h3>
                    {isProjectUnviewed(projet.id) && (
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500 text-white">
                        {language === 'fr' ? 'NOUVEAU' : 'NEW'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-4">{projet.client_name} · {projet.client_email}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSelectedProject(projet); markProjectAsViewed(projet.id); }}
                      className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-slate-200 transition-colors"
                    >
                      <EyeIcon size={13} /> {language === 'fr' ? 'Voir' : 'View'}
                    </button>
                    <button onClick={() => handleDecision(projet, 'accept')} className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors"><CheckCircle size={13} /> {t[language].adminAccept}</button>
                    <button onClick={() => handleDecision(projet, 'archive')} className="flex-1 bg-amber-500 text-white py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-amber-600 transition-colors"><Archive size={13} /> {t[language].adminArchive}</button>
                    <button onClick={() => handleDecision(projet, 'refuse')} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium text-xs flex items-center justify-center gap-1 hover:bg-red-700 transition-colors"><Trash2 size={13} /> {t[language].adminRefuse}</button>
                  </div>
                </div>
              ))}
              {activeProjets.filter(p => p.status === 'nouveau').length === 0 && (
                <div className="col-span-full text-center py-12 text-slate-400 text-sm">{t[language].adminNoDecision}</div>
              )}
            </div>
          </>
        )}

        {/* ========== TERMINÉS ========== */}
        {activeTab === 'termines' && (
          <>
            {/* Barre de filtres */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <div className="flex items-center gap-2 flex-1 w-full">
                  <Search size={16} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={completedSearch}
                    onChange={e => setCompletedSearch(e.target.value)}
                    placeholder={language === 'fr' ? 'Rechercher un client, un projet…' : 'Search a client, a project…'}
                    className="flex-1 bg-slate-50 rounded-lg px-3 py-2.5 text-sm outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                  />
                </div>
                <select
                  value={completedSort}
                  onChange={e => setCompletedSort(e.target.value as any)}
                  className="bg-white rounded-lg px-3 py-2.5 text-sm border border-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <option value="recent">{language === 'fr' ? 'Plus récents' : 'Most recent'}</option>
                  <option value="oldest">{language === 'fr' ? 'Plus anciens' : 'Oldest'}</option>
                  <option value="name">{language === 'fr' ? 'Nom du projet' : 'Project name'}</option>
                  <option value="amount">{language === 'fr' ? 'Montant' : 'Amount'}</option>
                </select>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  value={completedPaymentFilter}
                  onChange={e => setCompletedPaymentFilter(e.target.value as any)}
                  className="bg-white rounded-lg px-3 py-2 text-sm border border-slate-200 outline-none focus:border-blue-500 transition-colors cursor-pointer"
                >
                  <option value="all">{language === 'fr' ? 'Tous paiements' : 'All payments'}</option>
                  <option value="aucun">{language === 'fr' ? 'Non payé' : 'Unpaid'}</option>
                  <option value="acompte_payé">{language === 'fr' ? 'Acompte payé' : 'Deposit paid'}</option>
                  <option value="complet">{language === 'fr' ? 'Payé' : 'Paid'}</option>
                </select>

                <div className="flex items-center gap-1.5 text-sm text-slate-600">
                  <span className="text-xs text-slate-400">{language === 'fr' ? 'Du' : 'From'}</span>
                  <input
                    type="date"
                    value={completedDateFrom}
                    onChange={e => setCompletedDateFrom(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-2 text-sm border border-slate-200 outline-none focus:border-blue-500 transition-colors"
                  />
                  <span className="text-xs text-slate-400">{language === 'fr' ? 'au' : 'to'}</span>
                  <input
                    type="date"
                    value={completedDateTo}
                    onChange={e => setCompletedDateTo(e.target.value)}
                    className="bg-white rounded-lg px-2.5 py-2 text-sm border border-slate-200 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                {(completedSearch || completedPaymentFilter !== 'all' || completedDateFrom || completedDateTo) && (
                  <button
                    onClick={() => {
                      setCompletedSearch('');
                      setCompletedPaymentFilter('all');
                      setCompletedDateFrom('');
                      setCompletedDateTo('');
                    }}
                    className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 underline transition-colors"
                  >
                    {language === 'fr' ? 'Réinitialiser les filtres' : 'Reset filters'}
                  </button>
                )}
              </div>
            </div>

            {/* Résultat */}
            <div className="text-xs text-slate-400">
              {filteredCompletedProjets.length === 0
                ? (language === 'fr' ? 'Aucun projet terminé ne correspond.' : 'No completed project matches.')
                : `${filteredCompletedProjets.length} ${language === 'fr'
                    ? (filteredCompletedProjets.length > 1 ? 'projets' : 'projet')
                    : (filteredCompletedProjets.length > 1 ? 'projects' : 'project')}`}
            </div>

            {/* Liste */}
            <div className="space-y-3">
              {filteredCompletedProjets.map(projet => (
                <div
                  key={projet.id}
                  className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold text-sm text-slate-900 truncate">
                        {getProjectTitle(projet, t[language].adminUntitled)}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                        {getStatusLabel(projet.status, language)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{projet.client_name} · {projet.client_email}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {language === 'fr' ? 'Créé le' : 'Created on'}{' '}
                      {new Date(projet.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div>
                      <span className="text-slate-400">Paiement :</span>{' '}
                      <span className="font-medium text-slate-700">{getClientPaymentStatus(projet.payment_status, language)}</span>
                    </div>
                    {projet.payment_amount && (
                      <div>
                        <span className="text-slate-400">Montant :</span>{' '}
                        <span className="font-medium text-slate-700">{projet.payment_amount} €</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setSelectedProject(projet); markProjectAsViewed(projet.id); }}
                      title={t[language].adminViewDetails}
                      className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <EyeIcon size={15} />
                    </button>
                    <button
                      onClick={() => openEmailForm(projet)}
                      title={t[language].adminSendEmail}
                      className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Mail size={15} />
                    </button>
                    <button
                      onClick={() => handleResetDecision(projet)}
                      title={language === 'fr' ? 'Remettre en cours' : 'Back to in progress'}
                      className="p-2 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <RefreshCw size={15} />
                    </button>
                    <button
                      onClick={() => handleDeletePermanently(projet)}
                      title={t[language].adminDeletePermanently}
                      className="p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ========== CORBEILLE ========== */}
        {activeTab === 'corbeille' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {archivedProjets.map(projet => (
              <div key={projet.id} className="bg-white rounded-xl p-5 border border-slate-200 opacity-75">
                <h3 className="font-semibold text-base mb-1 text-slate-900">{getProjectTitle(projet, t[language].adminUntitled)}</h3>
                <p className="text-sm text-slate-500 mb-4">{projet.client_name} · {projet.client_email}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore(projet.id)} className="flex-1 bg-slate-900 text-white py-2 rounded-lg font-medium text-xs hover:bg-slate-800 transition-colors">{t[language].adminRestore}</button>
                  <button onClick={() => handleDecision(projet, 'refuse')} className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium text-xs hover:bg-red-700 transition-colors">{t[language].adminDelete}</button>
                </div>
              </div>
            ))}
            {archivedProjets.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400 text-sm">{t[language].adminTrashEmpty}</div>
            )}
          </div>
        )}

        {/* ========== MESSAGES ========== */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t[language].adminRecentMessages}</h2>
              <button onClick={loadComments} className="px-4 py-2 bg-white rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700">
                <RefreshCw size={14} />
                {t[language].adminRefresh}
              </button>
            </div>
            {Object.entries(
              allComments.reduce((acc: Record<string, any[]>, c) => {
                if (!acc[c.project_id]) acc[c.project_id] = [];
                acc[c.project_id].push(c);
                return acc;
              }, {})
            ).map(([projectId, comments]) => (
              <div key={projectId} className="bg-white rounded-xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-base text-slate-900">{comments[0].project_name}</h3>
                    <p className="text-sm text-slate-500">{comments[0].client_name}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const reply = prompt(t[language].adminReplyPrompt);
                      if (!reply) return;
                      await fetch(`${SUPABASE_FUNCTIONS_URL}/add-comment`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_id: projectId, author: 'agent', content: reply }),
                      });
                      loadComments();
                    }}
                    className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-800 transition-colors"
                  >
                    {t[language].adminReply}
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        c.author === 'client'
                          ? 'bg-blue-50 text-slate-800 border border-blue-100'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}>
                        <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">
                          <span>{c.author === 'client' ? 'Client' : 'Agent'}</span>
                          <span>· {new Date(c.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                          {c.edited_at && <span>({t[language].adminEdited})</span>}
                        </div>
                        <p>{c.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========== FICHIERS ========== */}
        {activeTab === 'fichiers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{t[language].adminAllFiles}</h2>
              <button onClick={loadAllFiles} className="px-4 py-2 bg-white rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700">
                <RefreshCw size={14} />
                {t[language].adminRefresh}
              </button>
            </div>
            <div className="space-y-2">
              {allFiles.length === 0 && <p className="text-slate-400 text-sm">{t[language].adminNoFiles}</p>}
              {allFiles.map((f: any) => (
                <div key={f.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-200 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText size={16} className="text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate text-slate-900">{f.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {f.client_name} · {f.project_name} · {new Date(f.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')}
                        {f.message && <span className="italic ml-2">"{f.message}"</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-100 rounded transition-colors"><Download size={15} className="text-blue-600" /></a>
                    <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========== MODALE DÉTAILS ========== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-slate-900">{getProjectTitle(selectedProject, t[language].adminDetailsTitle)}</h2>
              <button onClick={() => setSelectedProject(null)} className="p-1 text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <span className="text-xs text-slate-400">{t[language].adminClient}</span>
                <p className="font-medium text-sm text-slate-900 mt-0.5">{selectedProject.client_name}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400">{t[language].adminEmail}</span>
                <p className="font-medium text-sm text-slate-900 mt-0.5">{selectedProject.client_email}</p>
              </div>
            </div>

            <div className="border-b border-slate-200 mb-6">
              <div className="flex items-center gap-1 -mb-px overflow-x-auto">
                {['details', 'fichiers', 'commentaires'].map(tab => {
                  const isActive = detailTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setDetailTab(tab)}
                      className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive ? 'text-slate-900 border-b-2 border-slate-900' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab === 'details' && t[language].adminDetailTabDetails}
                      {tab === 'fichiers' && `${t[language].adminDetailTabFiles} (${selectedFiles.length})`}
                      {tab === 'commentaires' && `${t[language].adminDetailTabComments} (${selectedComments.length})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {detailTab === 'details' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {selectedProject.brief && Object.entries(selectedProject.brief).filter(([key]) => !['features', 'stack'].includes(key)).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-xs text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <p className="font-medium text-sm text-slate-900 break-all mt-0.5">{value?.toString() || '-'}</p>
                    </div>
                  ))}
                </div>
                {selectedProject.conversation?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-2 text-slate-900">
                      <MessageSquare size={14} className="text-blue-600" />
                      {t[language].adminFullConversation}
                    </h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto p-3 bg-slate-50 rounded-xl">
                      {normalizeConversation(selectedProject.conversation).map((msg: any, i: number) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                            msg.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}>
                            <div className={`text-xs mb-1 ${msg.role === 'user' ? 'opacity-80' : 'text-slate-400'}`}>
                              {msg.role === 'user' ? t[language].adminRoleClient : t[language].adminRoleAgent}
                            </div>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {detailTab === 'fichiers' && (
              <div className="space-y-2">
                {selectedFiles.length === 0 && <p className="text-sm text-slate-400">{t[language].adminNoFiles}</p>}
                {selectedFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-slate-900">{f.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(f.created_at).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US')} · {f.uploaded_by === 'client' ? t[language].adminRoleClient : t[language].adminRoleTeam}
                        </p>
                        {f.message && <p className="text-xs text-slate-500 italic mt-1">"{f.message}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded transition-colors"><Download size={15} className="text-blue-600" /></a>
                      <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded transition-colors"><Trash2 size={15} className="text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'commentaires' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedComments.length === 0 && <p className="text-sm text-slate-400">{t[language].adminNoComments}</p>}
                  {selectedComments.map((c: any) => (
                    <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm ${
                        c.author === 'client'
                          ? 'bg-blue-50 text-slate-800 border border-blue-100'
                          : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}>
                        {editingCommentId === c.id ? (
                          <div className="flex flex-col gap-2">
                            <input
                              value={editCommentContent}
                              onChange={e => setEditCommentContent(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800"
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') await handleEditAdminComment(c.id, editCommentContent);
                                if (e.key === 'Escape') setEditingCommentId(null);
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingCommentId(null)} className="text-xs text-slate-500">{t[language].adminCancel}</button>
                              <button onClick={() => handleEditAdminComment(c.id, editCommentContent)} className="text-xs bg-slate-900 text-white px-2 py-1 rounded">{t[language].adminSave}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-slate-400 mb-1 flex items-center gap-2">
                              <span>{c.author === 'client' ? 'Client' : c.author === 'agent' ? 'Agent' : 'Admin'}</span>
                              <span>· {new Date(c.created_at).toLocaleString(language === 'fr' ? 'fr-FR' : 'en-US')}</span>
                              {c.edited_at && <span>({t[language].adminEdited})</span>}
                            </div>
                            <p>{c.content}</p>
                            <div className="flex gap-3 mt-2">
                              <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"><Edit3 size={11} /> {t[language].adminEdit}</button>
                              <button onClick={() => handleDeleteAdminComment(c.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors"><Trash2 size={11} /> {t[language].adminDelete}</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={adminComment}
                    onChange={e => setAdminComment(e.target.value)}
                    placeholder={t[language].adminReplyPlaceholder}
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
                    onKeyDown={e => { if (e.key === 'Enter') handleAddAdminComment(); }}
                  />
                  <button
                    onClick={handleAddAdminComment}
                    disabled={!adminComment.trim() || commentSending}
                    className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 hover:bg-slate-800 transition-colors"
                  >
                    {t[language].adminSend}
                  </button>
                </div>
              </div>
            )}

            {selectedProject.booking_id && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-medium text-base mb-4 flex items-center gap-2 text-slate-900">
                  <Calendar size={16} className="text-blue-600" />
                  {t[language].adminAppointmentTitle}
                </h3>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p>
                    <strong className="text-slate-900">{t[language].adminDate} :</strong>{" "}
                    {new Date(selectedProject.booking_start).toLocaleDateString(
                      language === 'fr' ? 'fr-FR' : 'en-US',
                      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
                    )}
                  </p>
                  <p>
                    <strong className="text-slate-900">{t[language].adminTime} :</strong>{" "}
                    {new Date(selectedProject.booking_start).toLocaleTimeString(
                      language === 'fr' ? 'fr-FR' : 'en-US',
                      { hour: '2-digit', minute: '2-digit' }
                    )}
                  </p>
                  {selectedProject.booking_link && (
                    <a
                      href={selectedProject.booking_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 font-medium hover:underline inline-block"
                    >
                      {t[language].adminMeetingLink}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleCancelBooking(selectedProject.id, selectedProject.booking_id)}
                  className="mt-4 bg-red-50 text-red-700 px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
                >
                  {t[language].adminCancelAppointment}
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="font-medium text-sm mb-2 text-slate-900">{t[language].adminInternalNotes}</h3>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors resize-none"
                rows={3}
                placeholder={t[language].adminAddNote}
                defaultValue={selectedProject.notes || ''}
                onBlur={e => fetch(`${SUPABASE_FUNCTIONS_URL}/update-projet`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ id: selectedProject.id, notes: e.target.value })
                })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALE EMAIL ========== */}
      {emailForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEmailForm(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4 text-slate-900">{t[language].adminSendEmail}</h2>
            <p className="text-sm text-slate-500 mb-4">{t[language].adminTo} : {emailForm.projet.client_email}</p>
            <input
              type="text"
              value={emailForm.subject}
              onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })}
              placeholder={t[language].adminEmailSubjectPlaceholder}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm mb-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
            <textarea
              value={emailForm.body}
              onChange={e => setEmailForm({ ...emailForm, body: e.target.value })}
              placeholder={t[language].adminEmailBodyPlaceholder}
              rows={6}
              className="w-full border border-slate-200 rounded-lg p-3 text-sm mb-4 resize-none outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
            />
            <div className="flex gap-2">
              <button onClick={sendEmailToClient} disabled={emailSending} className="flex-1 bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors disabled:opacity-50">{t[language].adminSend}</button>
              <button onClick={() => setEmailForm(null)} className="flex-1 bg-white text-slate-700 border border-slate-200 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors">{t[language].adminCancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALE SÉLECTION D'ÉTAPES ========== */}
      <StepPickerModal
        isOpen={showAddStepsModal}
        onClose={() => { setShowAddStepsModal(false); setCurrentProjectId(null); }}
        onAdd={handleAddStepsFromLibrary}
        language={language}
      />

      {/* BookingModal */}
      {showBooking && bookingProject && (
        <BookingModal
          clientName={bookingProject.client_name}
          clientEmail={bookingProject.client_email}
          projectName={getProjectTitle(bookingProject, '')}
          projectId={bookingProject.id}
          onClose={() => { setShowBooking(false); setBookingProject(null); }}
          onBooked={() => { loadProjects(); setShowBooking(false); setBookingProject(null); }}
        />
      )}
    </div>
  );
}