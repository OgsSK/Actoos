'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft, BarChart3, Calendar, DollarSign, Eye, EyeOff,
  FileText, LayoutDashboard, LogOut, Mail, MessageSquare,
  RefreshCw, Search, TrendingUp, Users, X,
  Activity, PieChart as PieChartIcon, Target, CheckCircle, Archive, Trash2,
  Download, Upload, Send, Edit3, Eye as EyeIcon
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CALENDLY_URL = 'https://calendly.com/contact-actoos/30min';
const COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

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

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    nouveau: 'Nouveau', contacté: 'Contacté', devis_envoyé: 'Devis envoyé',
    en_cours: 'En cours', gagné: 'Gagné', perdu: 'Perdu', livré: 'Livré', terminé: 'Terminé',
  };
  return map[normalizeStatus(status)] || status;
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

function getPaymentColor(status: string) {
  const map: Record<string, string> = {
    aucun: 'bg-slate-50 text-slate-700', acompte_payé: 'bg-amber-50 text-amber-700',
    complet: 'bg-green-50 text-green-700', devis_envoyé: 'bg-purple-50 text-purple-700',
  };
  return map[normalizeStatus(status)] || 'bg-slate-50 text-slate-700';
}

export default function AdminPage() {
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projets' | 'decision' | 'corbeille' | 'messages' | 'fichiers'>('dashboard');
  const [mounted, setMounted] = useState(false);

  // Commentaires & notifications
  const [allComments, setAllComments] = useState<any[]>([]);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string>(
    typeof window !== 'undefined' ? localStorage.getItem('admin_last_read') || new Date().toISOString() : new Date().toISOString()
  );
  const [unreadCount, setUnreadCount] = useState(0);

  // Fichiers globaux
  const [allFiles, setAllFiles] = useState<any[]>([]);

  // Modale Détails
  const [detailTab, setDetailTab] = useState('details');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [selectedComments, setSelectedComments] = useState<any[]>([]);
  const [adminComment, setAdminComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  // Édition / suppression commentaires admin
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  // Calendly
  const [showCalendly, setShowCalendly] = useState(false);

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

  const loadProjects = async () => {
    setLoading(true);
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
    try {
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-projects?_=${unique}`, {
        headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
      });
      const data = await res.json();
      setProjets(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadComments = async () => {
    try {
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-all-comments');
      const data = await res.json();
      setAllComments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const loadAllFiles = async () => {
    try {
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-all-files');
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
      fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-files?project_id=${selectedProject.id}`)
        .then(res => res.json())
        .then(data => setSelectedFiles(Array.isArray(data) ? data : []));
      fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-comments?project_id=${selectedProject.id}`)
        .then(res => res.json())
        .then(data => setSelectedComments(Array.isArray(data) ? data : []));
    }
  }, [selectedProject]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Salifkane&&7') {
      localStorage.setItem('admin_token', 'actoos-admin-2026');
      setToken('actoos-admin-2026'); setIsAuthenticated(true);
    } else { alert('Mot de passe incorrect'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token'); setToken(''); setIsAuthenticated(false);
    setPassword(''); setProjets([]);
  };

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status: normalizeStatus(status) }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, status: normalizeStatus(status) } : p));
    } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
  };

  const updatePaymentStatus = async (id: string, paymentStatus: string) => {
    setActionLoading(id);
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, payment_status: normalizeStatus(paymentStatus) }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, payment_status: normalizeStatus(paymentStatus) } : p));
    } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
  };

  const updateMaturity = async (id: string, value: number) => {
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, maturityScore: value }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, brief: { ...p.brief, maturityScore: value } } : p));
    } catch (err) { console.error(err); }
  };

  const handleDecision = async (projet: any, action: 'accept' | 'archive' | 'refuse') => {
    if (action === 'refuse') {
      const reason = prompt('Raison du refus (obligatoire) :');
      if (!reason) return;
      if (!confirm('Êtes-vous sûr de vouloir refuser ce projet ? Cette action est irréversible.')) return;
      setActionLoading(projet.id);
      try {
        await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'refuse', decision_message: reason }),
        });
        // Email de refus au client
        await fetch('/api/send-project-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email, name: projet.client_name, email: projet.client_email, message: reason,
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937"><h2 style="color:#DC2626">❌ Projet non retenu</h2><p>Bonjour ${projet.client_name},</p><p>Nous avons étudié votre projet <strong>${projet.brief?.projectName || 'votre projet'}</strong>.</p><p>Malheureusement, nous ne pouvons pas y donner suite pour le moment.</p><p><strong>Raison :</strong> ${reason}</p><p>Nous restons à votre disposition.</p><p>Cordialement,</p><p><strong>L'équipe Actoos</strong></p></div>`,
          }),
        });
        setProjets(prev => prev.filter(p => p.id !== projet.id));
      } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
    } else if (action === 'accept') {
      setActionLoading(projet.id);
      try {
        await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'accept' }),
        });
        // Email d'acceptation au client avec lien espace client
        const clientLink = `https://actoos.com/client/${projet.client_token}`;
        await fetch('/api/send-project-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email, name: projet.client_name, email: projet.client_email, message: 'Projet accepté',
            html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1f2937"><h2 style="color:#10B981">✅ Projet accepté !</h2><p>Bonjour ${projet.client_name},</p><p>Votre projet <strong>${projet.brief?.projectName || 'votre projet'}</strong> a été accepté.</p><p>🔗 <strong>Suivez l'avancement et prenez rendez-vous :</strong><br><a href="${clientLink}" style="color:#D4AF37;font-weight:bold">${clientLink}</a></p><p>📧 <a href="mailto:contact@actoos.com" style="color:#D4AF37">contact@actoos.com</a></p><p>Cordialement,</p><p><strong>L'équipe Actoos</strong></p></div>`,
          }),
        });
        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, status: 'gagné' } : p));
      } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
    } else if (action === 'archive') {
      if (!confirm('Archiver ce projet ? Il pourra être restauré depuis la corbeille.')) return;
      setActionLoading(projet.id);
      try {
        await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, action: 'archive' }),
        });
        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, archived: true, status: 'perdu' } : p));
      } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
    }
  };

  const handleRestore = async (id: string) => {
    setActionLoading(id);
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, action: 'restore' }),
      });
      setProjets(prev => prev.map(p => p.id === id ? { ...p, archived: false, status: 'nouveau' } : p));
    } catch (err) { alert('Erreur'); } finally { setActionLoading(null); }
  };

  const relancer = async (projet: any) => {
    setActionLoading(projet.id);
    try {
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: projet.client_email, name: projet.client_name, email: projet.client_email, message: 'Relance manuelle',
          html: `<h2>Bonjour ${projet.client_name},</h2><p>Nous faisons suite à votre projet <strong>${projet.brief?.projectName || 'votre projet'}</strong>.</p><a href="${CALENDLY_URL}">Prendre rendez-vous</a>`,
        }),
      });
      alert(`Relance envoyée à ${projet.client_email}`);
    } catch { alert("Erreur lors de l'envoi"); } finally { setActionLoading(null); }
  };

  const createPaymentLink = async (projet: any) => {
    const amount = prompt('Montant (€) :', projet.payment_amount || '1000');
    if (!amount) return;
    setActionLoading(projet.id);
    try {
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/create-payment-link', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
  amount: parseFloat(amount),
  currency: 'eur',
  description: projet.brief?.projectName || 'Projet',
  metadata: { projet_id: projet.id }, // ← déjà présent, vérifiez
}),
      });
      const data = await res.json();
      if (data.url) {
        await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ id: projet.id, payment_link: data.url, payment_amount: parseFloat(amount), payment_status: 'devis_envoyé' }),
        });
        setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, payment_link: data.url, payment_amount: parseFloat(amount), payment_status: 'devis_envoyé' } : p));
        await fetch('/api/send-project-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: projet.client_email, name: projet.client_name, email: projet.client_email, message: 'Lien de paiement',
            html: `<h2>Bonjour ${projet.client_name},</h2><p>Voici votre lien de paiement : <a href="${data.url}">Payer ${amount}€</a></p>`,
          }),
        });
        alert(`Lien de paiement créé et envoyé`);
      }
    } catch { alert('Erreur'); } finally { setActionLoading(null); }
  };

  const openEmailForm = (projet: any) => setEmailForm({ projet, subject: `Suivi : ${projet.brief?.projectName || 'Projet'}`, body: '' });

  const sendEmailToClient = async () => {
    if (!emailForm) return;
    setEmailSending(true);
    try {
      await fetch('/api/send-project-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailForm.projet.client_email, name: emailForm.projet.client_name, email: emailForm.projet.client_email, message: emailForm.body,
          html: `<h2>${emailForm.subject}</h2><p>${emailForm.body}</p>`,
        }),
      });
      alert('Email envoyé'); setEmailForm(null);
    } catch { alert('Erreur'); } finally { setEmailSending(false); }
  };

  const handleAddAdminComment = async () => {
    if (!adminComment.trim() || !selectedProject) return;
    setCommentSending(true);
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/add-comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: selectedProject.id, author: 'agent', content: adminComment }),
      });
      setAdminComment('');
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); } finally { setCommentSending(false); }
  };

  const handleEditAdminComment = async (id: string, content: string) => {
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/edit-comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, content, author: 'agent' }),
      });
      setEditingCommentId(null);
      setEditCommentContent('');
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { alert('Erreur lors de la modification'); }
  };

  const handleDeleteAdminComment = async (id: string) => {
    if (!confirm('Supprimer ce message ?')) return;
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-comment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-comments?project_id=${selectedProject.id}`);
      const data = await res.json();
      setSelectedComments(Array.isArray(data) ? data : []);
    } catch (err) { alert('Erreur lors de la suppression'); }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    try {
      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/delete-file', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: fileId }),
      });
      if (selectedProject) {
        const res = await fetch(`https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/get-files?project_id=${selectedProject.id}`);
        const data = await res.json();
        setSelectedFiles(Array.isArray(data) ? data : []);
      }
      loadAllFiles();
    } catch (err) { console.error(err); }
  };

  const filteredProjets = projets.filter(p => {
    const search = searchTerm.toLowerCase();
    const matchSearch = p.client_name?.toLowerCase().includes(search) || p.client_email?.toLowerCase().includes(search) || p.brief?.projectName?.toLowerCase().includes(search) || p.brief?.sector?.toLowerCase().includes(search);
    // Pour l'onglet Projets : exclure les statuts de décision et les projets archivés/perdus
const decisionStatuses = ['nouveau', 'perdu'];
const matchStatus = !decisionStatuses.includes(p.status) && (statusFilter === 'all' || p.status === statusFilter);
    return matchSearch && matchStatus;
  });

  const archivedProjets = projets.filter(p => p.archived === true);
  const activeProjets = projets.filter(p => !p.archived);

  const stats = {
    total: activeProjets.length,
    thisMonth: activeProjets.filter(p => { const d = new Date(p.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length,
    avgMaturity: activeProjets.length > 0 ? Math.round(activeProjets.reduce((sum, p) => sum + (p.brief?.maturityScore || 0), 0) / activeProjets.length) : 0,
    avgPriority: activeProjets.length > 0 ? Math.round(activeProjets.reduce((sum, p) => sum + (p.brief?.priorityScore || 0), 0) / activeProjets.length) : 0,
  };
  // Compteurs pour les badges des onglets
const pendingDecisions = activeProjets.filter(p => p.status !== 'gagné' && p.status !== 'perdu').length;
const pendingProjects = activeProjets.filter(p => p.status === 'gagné' || p.status === 'en_cours' || p.status === 'livré').length;
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
    activeProjets.forEach(p => { const s = p.brief?.sector || 'Non spécifié'; dist[s] = (dist[s] || 0) + 1; });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  })();

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#D4AF37] rounded-2xl flex items-center justify-center mx-auto mb-4"><LayoutDashboard size={28} className="text-white" /></div>
            <h1 className="text-2xl font-black">Cockpit Actoos</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe" className="w-full border rounded-xl px-4 py-3 pr-12" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <button type="submit" className="w-full bg-[#D4AF37] text-white rounded-xl py-3 font-bold">Accéder</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center"><LayoutDashboard size={20} className="text-white" /></div>
            <div><span className="font-black text-xl">Cockpit<span className="text-[#D4AF37]">.</span></span><span className="text-[10px] text-slate-400 block">Actoos Admin</span></div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-2"><ArrowLeft size={16} /> Accueil</a>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 text-sm font-bold flex items-center gap-2"><LogOut size={16} /> Déconnexion</button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-6">
  <div className="flex items-center gap-1 bg-white rounded-2xl p-1 border border-slate-200 shadow-sm w-fit flex-wrap">
    <button onClick={() => setActiveTab('dashboard')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'dashboard' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      📊 Dashboard
    </button>
    <button onClick={() => setActiveTab('projets')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'projets' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      📋 Projets
      {pendingProjects > 0 && activeTab !== 'projets' && (
        <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingProjects}</span>
      )}
    </button>
    <button onClick={() => setActiveTab('decision')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'decision' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      ⚖️ Décision
      {pendingDecisions > 0 && activeTab !== 'decision' && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{pendingDecisions}</span>
      )}
    </button>
    <button onClick={() => setActiveTab('corbeille')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'corbeille' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      🗑️ Corbeille ({archivedCount})
    </button>
    <button onClick={() => { setActiveTab('messages'); markAsRead(); }} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'messages' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      💬 Messages
      {unreadCount > 0 && activeTab !== 'messages' && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
      )}
    </button>
    <button onClick={() => setActiveTab('fichiers')} className={`px-5 py-2 rounded-xl text-sm font-bold transition-colors relative ${activeTab === 'fichiers' ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
      📁 Fichiers
    </button>
  </div>
</div>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* ========== DASHBOARD ========== */}
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[{ label: 'Total', value: stats.total, icon: FileText, color: 'blue' }, { label: 'Ce mois', value: stats.thisMonth, icon: TrendingUp, color: 'emerald' }, { label: 'Maturité moy.', value: `${stats.avgMaturity}/10`, icon: BarChart3, color: 'amber' }, { label: 'Priorité moy.', value: `${stats.avgPriority}/10`, icon: Users, color: 'purple' }].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color === 'blue' ? 'bg-blue-50 text-blue-500' : s.color === 'emerald' ? 'bg-emerald-50 text-emerald-500' : s.color === 'amber' ? 'bg-amber-50 text-amber-500' : 'bg-purple-50 text-purple-500'}`}><s.icon size={20} /></div>
                    <div><p className="text-2xl font-black text-slate-900">{s.value}</p><p className="text-xs text-slate-400">{s.label}</p></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Activity size={16} className="text-[#D4AF37]" /> Évolution mensuelle</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="projets" stroke="#D4AF37" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><PieChartIcon size={16} className="text-[#D4AF37]" /> Statuts</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {statusDistribution.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><Target size={16} className="text-[#D4AF37]" /> Secteurs</h3>
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
            <div className="flex items-center gap-2 flex-wrap">
              <Search size={18} className="text-slate-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Rechercher client, projet, secteur..." className="flex-1 min-w-[200px] bg-white rounded-2xl p-3 text-sm outline-none border border-slate-100" />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white rounded-2xl p-3 text-sm border border-slate-100 outline-none">
                <option value="all">Tous les statuts</option>
                <option value="nouveau">Nouveau</option><option value="contacté">Contacté</option><option value="devis_envoyé">Devis envoyé</option>
                <option value="en_cours">En cours</option><option value="livré">Livré</option><option value="terminé">Terminé</option>
              </select>
              <button onClick={loadProjects} disabled={loading} className="px-4 py-2 bg-white rounded-xl text-sm font-bold border hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50">
  <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Rafraîchir
</button>
              <button onClick={() => { caches?.keys().then(names => names.forEach(n => caches.delete(n))); window.location.reload(); }} className="px-4 py-2 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-200 hover:bg-red-100 flex items-center gap-2"><RefreshCw size={16} /> Vider cache & recharger</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredProjets.filter(p => !p.archived).map(projet => (
                <div key={projet.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div><h3 className="font-bold text-lg">{projet.brief?.projectName || 'Sans titre'}</h3><p className="text-sm text-slate-500">{projet.client_name}</p></div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(projet.status)}`}>{getStatusLabel(projet.status)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-2"><Mail size={12} /> {projet.client_email}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3"><Calendar size={12} /> {new Date(projet.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1"><p className="text-xs text-slate-400">Maturité</p><div className="flex items-center gap-2"><div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-1.5 bg-[#D4AF37] rounded-full" style={{ width: `${(projet.brief?.maturityScore || 0) * 10}%` }} /></div><span className="text-xs font-bold">{projet.brief?.maturityScore || 0}/10</span></div></div>
                    <div className="flex-1"><p className="text-xs text-slate-400">Priorité</p><div className="flex items-center gap-2"><div className="w-full h-1.5 bg-slate-200 rounded-full"><div className="h-1.5 bg-[#D4AF37] rounded-full" style={{ width: `${(projet.brief?.priorityScore || 0) * 10}%` }} /></div><span className="text-xs font-bold">{projet.brief?.priorityScore || 0}/10</span></div></div>
                  </div>
                  {/* Curseur d'avancement */}
                  <div className="flex items-center gap-2 mb-3">
                    <input type="range" min="0" max="10" value={projet.brief?.maturityScore || 0} onChange={(e) => updateMaturity(projet.id, parseInt(e.target.value))} className="w-full h-2 bg-slate-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#D4AF37] [&::-webkit-slider-thumb]:rounded-full" />
                    <span className="text-xs font-bold">{projet.brief?.maturityScore || 0}/10</span>
                  </div>
                  {/* Étapes */}
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-1">Étapes du projet</p>
                    {((projet.steps && Array.isArray(projet.steps) ? projet.steps : []) as { name: string; status: string }[]).map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 mb-1">
                        <button
                          onClick={async () => {
                            const newSteps = [...(projet.steps || [])];
                            newSteps[idx] = { ...newSteps[idx], status: newSteps[idx].status === 'terminé' ? 'à_faire' : newSteps[idx].status === 'en_cours' ? 'terminé' : 'en_cours' };
                            await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: newSteps }),
                            });
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center text-[10px] ${step.status === 'terminé' ? 'bg-green-500 border-green-500 text-white' : step.status === 'en_cours' ? 'bg-[#D4AF37] border-[#D4AF37] text-white' : 'border-slate-300'}`}
                        >
                          {step.status === 'terminé' ? '✓' : step.status === 'en_cours' ? '●' : ''}
                        </button>
                        <input
                          type="text" value={step.name}
                          onChange={e => {
                            const newSteps = [...(projet.steps || [])];
                            newSteps[idx] = { ...newSteps[idx], name: e.target.value };
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          onBlur={async () => {
                            await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: projet.steps }),
                            });
                          }}
                          className="flex-1 text-xs border rounded px-2 py-0.5 outline-none"
                        />
                        <button
                          onClick={async () => {
                            const newSteps = (projet.steps || []).filter((_: any, i: number) => i !== idx);
                            await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: newSteps }),
                            });
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          const newName = prompt('Nouvelle étape :');
                          if (!newName) return;
                          const newSteps = [...(projet.steps || []), { name: newName, status: 'à_faire' }];
                          await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
                            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ id: projet.id, steps: newSteps }),
                          });
                          setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: newSteps } : p));
                        }}
                        className="text-xs text-[#D4AF37] font-bold hover:text-amber-600"
                      >
                        + Ajouter une étape
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm('Demander à l’IA de planifier les étapes ?')) return;
                          const res = await fetch('/api/generate-proposal', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'plan-steps',
                              role: 'step_planner',
                              messages: projet.conversation || [{ role: 'user', content: projet.brief?.projectName || projet.client_message || '' }],
                            }),
                          });
                          const data = await res.json();
                          if (data.steps) {
                            await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', {
                              method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ id: projet.id, steps: data.steps }),
                            });
                            setProjets(prev => prev.map(p => p.id === projet.id ? { ...p, steps: data.steps } : p));
                          }
                        }}
                        className="text-xs text-blue-500 font-bold hover:text-blue-700"
                      >
                        🤖 Planifier avec l’IA
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <select value={projet.payment_status || 'aucun'} onChange={e => updatePaymentStatus(projet.id, e.target.value)} className="text-xs border rounded-lg px-2 py-1 outline-none bg-white">
                      <option value="aucun">Non payé</option><option value="acompte_payé">Acompte payé</option><option value="complet">Payé</option>
                    </select>
                    <span className="text-xs text-slate-400">{projet.brief?.sector || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                    <select value={projet.status || 'nouveau'} onChange={e => updateStatus(projet.id, e.target.value)} className="text-xs border rounded-lg px-2 py-1 outline-none bg-white">
                      <option value="nouveau">Nouveau</option><option value="contacté">Contacté</option><option value="devis_envoyé">Devis envoyé</option>
                      <option value="en_cours">En cours</option><option value="livré">Livré</option><option value="terminé">Terminé</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <button onClick={() => relancer(projet)} title="Relancer" className="p-2 rounded-lg hover:bg-amber-50 text-amber-600"><RefreshCw size={14} /></button>
                      <button onClick={() => setShowCalendly(true)} title="Prendre rendez-vous" className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"><Calendar size={14} /></button>
                      <button onClick={() => createPaymentLink(projet)} title="Créer un lien de paiement" className="p-2 rounded-lg hover:bg-green-50 text-green-600"><DollarSign size={14} /></button>
                      <button onClick={() => openEmailForm(projet)} title="Envoyer un email" className="p-2 rounded-lg hover:bg-indigo-50 text-indigo-600"><Mail size={14} /></button>
                      <button onClick={() => setSelectedProject(projet)} title="Voir les détails" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"><EyeIcon size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ========== DÉCISION ========== */}
        {activeTab === 'decision' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeProjets.filter(p => p.status !== 'gagné' && p.status !== 'perdu').map(projet => (
              <div key={projet.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-1">{projet.brief?.projectName || 'Sans titre'}</h3>
                <p className="text-sm text-slate-500 mb-3">{projet.client_name} · {projet.client_email}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDecision(projet, 'accept')} className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-green-600"><CheckCircle size={14} /> Accepter</button>
                  <button onClick={() => handleDecision(projet, 'archive')} className="flex-1 bg-amber-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-amber-600"><Archive size={14} /> Archiver</button>
                  <button onClick={() => handleDecision(projet, 'refuse')} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1 hover:bg-red-600"><Trash2 size={14} /> Refuser</button>
                </div>
              </div>
            ))}
            {activeProjets.filter(p => p.status !== 'gagné' && p.status !== 'perdu').length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">Aucun projet en attente de décision.</div>
            )}
          </div>
        )}

        {/* ========== CORBEILLE ========== */}
        {activeTab === 'corbeille' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {archivedProjets.map(projet => (
              <div key={projet.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 opacity-80">
                <h3 className="font-bold text-lg mb-1">{projet.brief?.projectName || 'Sans titre'}</h3>
                <p className="text-sm text-slate-500 mb-3">{projet.client_name} · {projet.client_email}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleRestore(projet.id)} className="flex-1 bg-blue-500 text-white py-2 rounded-xl font-bold text-xs hover:bg-blue-600">Restaurer</button>
                  <button onClick={() => handleDecision(projet, 'refuse')} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold text-xs hover:bg-red-600">Supprimer</button>
                </div>
              </div>
            ))}
            {archivedProjets.length === 0 && (
              <div className="col-span-full text-center py-12 text-slate-400">La corbeille est vide.</div>
            )}
          </div>
        )}

        {/* ========== MESSAGES ========== */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Messages récents</h2>
              <button onClick={loadComments} className="px-4 py-2 bg-white rounded-xl text-sm font-bold border hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={16} /> Rafraîchir</button>
            </div>
            {Object.entries(
              allComments.reduce((acc: Record<string, any[]>, c) => {
                if (!acc[c.project_id]) acc[c.project_id] = [];
                acc[c.project_id].push(c);
                return acc;
              }, {})
            ).map(([projectId, comments]) => (
              <div key={projectId} className="bg-white rounded-2xl p-5 shadow-sm border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-lg">{comments[0].project_name}</h3>
                    <p className="text-sm text-slate-500">{comments[0].client_name}</p>
                  </div>
                  <button
                    onClick={async () => {
                      const reply = prompt('Votre réponse :');
                      if (!reply) return;
                      await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/add-comment', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_id: projectId, author: 'agent', content: reply }),
                      });
                      loadComments();
                    }}
                    className="text-xs bg-[#D4AF37] text-white px-3 py-1.5 rounded-xl font-bold hover:bg-amber-500"
                  >
                    Répondre
                  </button>
                </div>
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm ${c.author === 'client' ? 'bg-[#D4AF37]/10 text-slate-800 border border-[#D4AF37]/30' : 'bg-slate-50 border'}`}>
                        <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                          <span>{c.author === 'client' ? '👤 Client' : '🤖 Agent'}</span>
                          <span>{new Date(c.created_at).toLocaleString('fr-FR')}</span>
                          {c.edited_at && <span className="text-amber-600">(modifié)</span>}
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
              <h2 className="text-2xl font-black text-slate-900">Tous les fichiers</h2>
              <button onClick={loadAllFiles} className="px-4 py-2 bg-white rounded-xl text-sm font-bold border hover:bg-slate-50 flex items-center gap-2"><RefreshCw size={16} /> Rafraîchir</button>
            </div>
            <div className="space-y-2">
              {allFiles.length === 0 && <p className="text-slate-400">Aucun fichier pour le moment.</p>}
              {allFiles.map((f: any) => (
                <div key={f.id} className="flex items-center justify-between p-3 bg-white rounded-xl shadow-sm border">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-slate-400" />
                    <div>
                      <p className="font-medium text-sm">{f.name}</p>
                      <p className="text-xs text-slate-400">
                        {f.client_name} · {f.project_name} · {new Date(f.created_at).toLocaleDateString('fr-FR')}
                        {f.message && <span className="italic ml-2">"{f.message}"</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded-lg"><Download size={16} className="text-[#D4AF37]" /></a>
                    <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========== MODALE DÉTAILS ========== */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black">{selectedProject.brief?.projectName || 'Détails'}</h2>
              <button onClick={() => setSelectedProject(null)}><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
              <div><span className="text-slate-400">Client :</span> <strong>{selectedProject.client_name}</strong></div>
              <div><span className="text-slate-400">Email :</span> <strong>{selectedProject.client_email}</strong></div>
            </div>

            <div className="flex items-center gap-2 mb-6 border-b pb-3">
              {['details', 'fichiers', 'commentaires'].map(tab => (
                <button key={tab} onClick={() => setDetailTab(tab)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${detailTab === tab ? 'bg-[#D4AF37] text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}>
                  {tab === 'details' && '📋 Détails'}
                  {tab === 'fichiers' && `📁 Fichiers (${selectedFiles.length})`}
                  {tab === 'commentaires' && `💬 Commentaires (${selectedComments.length})`}
                </button>
              ))}
            </div>

            {detailTab === 'details' && (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {selectedProject.brief && Object.entries(selectedProject.brief).filter(([key]) => !['features', 'stack'].includes(key)).map(([key, value]) => (
                    <div key={key}><span className="text-slate-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span><p className="font-medium break-all">{value?.toString() || '-'}</p></div>
                  ))}
                </div>
                {selectedProject.conversation?.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-bold text-sm mb-2 flex items-center gap-2"><MessageSquare size={16} /> Conversation complète</h3>
                    <div className="space-y-3 max-h-64 overflow-y-auto p-3 bg-slate-50 rounded-xl">
                      {normalizeConversation(selectedProject.conversation).map((msg: any, i: number) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-[#D4AF37] text-white' : 'bg-white border'}`}>
                            <div className="text-xs opacity-70 mb-1">{msg.role === 'user' ? 'Client' : 'Agent Actoos'}</div>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            {/* Historique des paiements */}
{selectedProject.payment_history?.length > 0 && (
  <div className="mb-6">
    <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><DollarSign size={16} className="text-[#D4AF37]" /> Historique des paiements</h3>
    <div className="space-y-2">
      {selectedProject.payment_history.map((payment: any, i: number) => (
        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div>
            <p className="font-medium text-sm">{payment.amount}€</p>
            <p className="text-xs text-slate-400">{new Date(payment.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold">✓</span>
        </div>
      ))}
    </div>
  </div>
)}

            {detailTab === 'fichiers' && (
              <div className="space-y-2">
                {selectedFiles.length === 0 && <p className="text-sm text-slate-400">Aucun fichier pour le moment.</p>}
                {selectedFiles.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText size={16} className="text-slate-400" />
                      <div>
                        <p className="font-medium text-sm">{f.name}</p>
                        <p className="text-xs text-slate-400">{new Date(f.created_at).toLocaleDateString('fr-FR')} · {f.uploaded_by === 'client' ? 'Client' : 'Équipe'}</p>
                        {f.message && <p className="text-xs text-slate-500 italic mt-1">"{f.message}"</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-slate-200 rounded-lg"><Download size={16} className="text-[#D4AF37]" /></a>
                      <button onClick={() => handleDeleteFile(f.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} className="text-red-500" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {detailTab === 'commentaires' && (
              <div className="space-y-4">
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedComments.length === 0 && <p className="text-sm text-slate-400">Aucun commentaire pour le moment.</p>}
                  {selectedComments.map((c: any) => (
                    <div key={c.id} className={`flex ${c.author === 'client' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-xl text-sm ${c.author === 'client' ? 'bg-[#D4AF37]/10 text-slate-800 border border-[#D4AF37]/30' : 'bg-slate-50 border'}`}>
                        {editingCommentId === c.id ? (
                          <div className="flex flex-col gap-2">
                            <input value={editCommentContent} onChange={e => setEditCommentContent(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm text-slate-800" autoFocus onKeyDown={async (e) => { if (e.key === 'Enter') await handleEditAdminComment(c.id, editCommentContent); if (e.key === 'Escape') setEditingCommentId(null); }} />
                            <div className="flex justify-end gap-2">
                              <button onClick={() => setEditingCommentId(null)} className="text-xs text-slate-500">Annuler</button>
                              <button onClick={() => handleEditAdminComment(c.id, editCommentContent)} className="text-xs bg-[#D4AF37] text-white px-2 py-1 rounded">Enregistrer</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs opacity-70 mb-1 flex items-center gap-2">
                              <span>{c.author === 'client' ? '👤 Client' : c.author === 'agent' ? '🤖 Agent' : '🛠️ Admin'}</span>
                              <span>· {new Date(c.created_at).toLocaleString('fr-FR')}</span>
                              {c.edited_at && <span className="text-amber-600">(modifié)</span>}
                            </div>
                            <p>{c.content}</p>
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => { setEditingCommentId(c.id); setEditCommentContent(c.content); }} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"><Edit3 size={12} /> Modifier</button>
                              <button onClick={() => handleDeleteAdminComment(c.id)} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"><Trash2 size={12} /> Supprimer</button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input type="text" value={adminComment} onChange={e => setAdminComment(e.target.value)} placeholder="Répondre au client..." className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D4AF37]" onKeyDown={e => { if (e.key === 'Enter') handleAddAdminComment(); }} />
                  <button onClick={handleAddAdminComment} disabled={!adminComment.trim() || commentSending} className="bg-[#D4AF37] text-white px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50">Envoyer</button>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <h3 className="font-bold text-sm mb-2">📝 Notes internes</h3>
              <textarea className="w-full border rounded-xl p-3 text-sm" rows={3} placeholder="Ajouter une note..." defaultValue={selectedProject.notes || ''} onBlur={e => fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/update-projet', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: selectedProject.id, notes: e.target.value }) })} />
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALE EMAIL ========== */}
      {emailForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEmailForm(null)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black mb-4">Envoyer un email</h2>
            <p className="text-sm text-slate-500 mb-4">À : {emailForm.projet.client_email}</p>
            <input type="text" value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Sujet" className="w-full border rounded-xl px-4 py-3 text-sm mb-3" />
            <textarea value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} placeholder="Votre message..." rows={6} className="w-full border rounded-xl p-3 text-sm mb-4 resize-none" />
            <div className="flex gap-2"><button onClick={sendEmailToClient} disabled={emailSending} className="flex-1 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-sm">Envoyer</button><button onClick={() => setEmailForm(null)} className="flex-1 bg-slate-100 text-slate-700 py-2 rounded-xl font-bold text-sm">Annuler</button></div>
          </div>
        </div>
      )}

      {/* ========== MODALE CALENDLY ========== */}
     {showCalendly && (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCalendly(false)}>
    <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center" onClick={e => e.stopPropagation()}>
      <Calendar size={48} className="text-[#D4AF37] mx-auto mb-4" />
      <h3 className="text-xl font-black mb-2">Prendre rendez-vous</h3>
      <p className="text-slate-500 mb-6">Notre agenda s'ouvre dans une nouvelle fenêtre.</p>
      <a
        href="https://calendly.com/contact-actoos/30min"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-500 transition-colors"
      >
        <Calendar size={18} /> Ouvrir le calendrier
      </a>
      <button onClick={() => setShowCalendly(false)} className="mt-4 text-sm text-slate-400 hover:text-slate-600">
        Fermer
      </button>
    </div>
  </div>
)}
    </div>
  );
}