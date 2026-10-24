'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Search, Flag, Loader2, Ban, CheckCircle2, Eye as EyeIcon,
  Trash2, X, AlertTriangle, ChevronLeft, ChevronRight, ChevronDown,
  User as UserIcon, Clock, Calendar, Star, EyeOff, Eye,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

type StatusFilter = 'all' | 'new' | 'seen' | 'resolved';
type CategoryFilter =
  | 'all'
  | 'harassment' | 'fake_profile' | 'inappropriate' | 'spam' | 'other'
  | 'offensive' | 'fake_review';
type ContextFilter = 'all' | 'profile' | 'review';

interface ReviewData {
  id: string;
  teacher_id: string;
  parent_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  teacher_reply: string | null;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  reported_id: string;
  category: string;
  description: string;
  context: string;
  context_id: string | null;
  status: string;
  seen_at: string | null;
  seen_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  reporter?: { first_name: string | null; last_name: string | null; email: string };
  reported?: { first_name: string | null; last_name: string | null; email: string; suspended_at: string | null };
  review?: ReviewData;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  harassment:    { fr: 'Harcèlement',              en: 'Harassment',              color: 'bg-red-50 text-red-700 border-red-200' },
  fake_profile:  { fr: 'Faux profil',              en: 'Fake profile',            color: 'bg-orange-50 text-orange-700 border-orange-200' },
  inappropriate: { fr: 'Comportement inapproprié', en: 'Inappropriate behavior',  color: 'bg-amber-50 text-amber-700 border-amber-200' },
  spam:          { fr: 'Spam',                     en: 'Spam',                    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  offensive:     { fr: 'Contenu offensant',        en: 'Offensive content',       color: 'bg-rose-50 text-rose-700 border-rose-200' },
  fake_review:   { fr: 'Faux avis',                en: 'Fake review',             color: 'bg-orange-50 text-orange-700 border-orange-200' },
  other:         { fr: 'Autre',                    en: 'Other',                   color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const CONTEXT_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  profile: { fr: 'Profil', en: 'Profile', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  review:  { fr: 'Avis',   en: 'Review',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
  message: { fr: 'Message', en: 'Message', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  request: { fr: 'Demande', en: 'Request', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

/* ═══ FadeInSection ═══ */
function FadeInSection({
  children, delay = 0, className = '',
}: { children: React.ReactNode; delay?: number; className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function AdminReportsPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('new');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [actionId, setActionId] = useState<string | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<ReportRow | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const [suspendTarget, setSuspendTarget] = useState<ReportRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [sendSuspendEmail, setSendSuspendEmail] = useState(true);

  const [deleteTarget, setDeleteTarget] = useState<ReportRow | null>(null);

  // ✨ States pour la modération des avis
  const [deleteReviewTarget, setDeleteReviewTarget] = useState<ReportRow | null>(null);
  const [hideReviewTarget, setHideReviewTarget] = useState<ReportRow | null>(null);
  const [hideReason, setHideReason] = useState('');

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('moderation_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const reportsData = (data || []) as ReportRow[];
      const userIds = [
        ...new Set([
          ...reportsData.map(r => r.reporter_id),
          ...reportsData.map(r => r.reported_id),
        ]),
      ];

      const reviewIds = reportsData
        .filter(r => r.context === 'review' && r.context_id)
        .map(r => r.context_id) as string[];

      let usersMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, suspended_at')
          .in('id', userIds);
        (usersData || []).forEach(u => usersMap.set(u.id, u));
      }

      let reviewsMap = new Map<string, ReviewData>();
      if (reviewIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from('teacher_ratings')
          .select('id, teacher_id, parent_id, rating, comment, created_at, updated_at, hidden_at, hidden_reason, teacher_reply')
          .in('id', reviewIds);
        (reviewsData || []).forEach((r: any) => reviewsMap.set(r.id, r));
      }

      const enriched: ReportRow[] = reportsData.map(r => ({
        ...r,
        reporter: usersMap.get(r.reporter_id) || undefined,
        reported: usersMap.get(r.reported_id) || undefined,
        review: r.context === 'review' && r.context_id ? reviewsMap.get(r.context_id) : undefined,
      }));

      setReports(enriched);
    } catch (err) {
      console.error('[AdminReports]', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = reports;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (categoryFilter !== 'all') list = list.filter(r => r.category === categoryFilter);
    if (contextFilter !== 'all') list = list.filter(r => r.context === contextFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const reporterName = `${r.reporter?.first_name || ''} ${r.reporter?.last_name || ''}`.toLowerCase();
        const reportedName = `${r.reported?.first_name || ''} ${r.reported?.last_name || ''}`.toLowerCase();
        return (
          r.description.toLowerCase().includes(q) ||
          r.reporter?.email?.toLowerCase().includes(q) ||
          r.reported?.email?.toLowerCase().includes(q) ||
          reporterName.includes(q) ||
          reportedName.includes(q) ||
          r.review?.comment?.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [reports, statusFilter, categoryFilter, contextFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter, contextFilter, search]);

  const counts = {
    all: reports.length,
    new: reports.filter(r => r.status === 'new').length,
    seen: reports.filter(r => r.status === 'seen').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  };

  async function markAsSeen(id: string) {
    setActionId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('moderation_reports')
        .update({ status: 'seen', seen_at: new Date().toISOString(), seen_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'seen', seen_at: new Date().toISOString() } : r));
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function markAsResolved(id: string) {
    setActionId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('moderation_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === id ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r));
      setDetailsTarget(null);
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function saveNotes(id: string, notes: string) {
    setSavingNotes(true);
    try {
      const { error } = await supabase.from('moderation_reports').update({ admin_notes: notes }).eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(r => r.id === id ? { ...r, admin_notes: notes } : r));
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleSuspend() {
    if (!suspendTarget || !suspendReason.trim()) return;
    setActionId(suspendTarget.id);
    try {
      const now = new Date().toISOString();

      const { error: err1 } = await supabase
        .from('users')
        .update({ suspended_at: now, suspended_reason: suspendReason.trim() })
        .eq('id', suspendTarget.reported_id);
      if (err1) throw err1;

      await supabase
        .from('teacher_profiles')
        .update({ verification_status: 'suspended', is_verified: false })
        .eq('id', suspendTarget.reported_id);

      if (sendSuspendEmail) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'account-suspended', user_id: suspendTarget.reported_id, reason: suspendReason.trim() }),
        }).catch((e) => console.warn('[Email] Non envoyé:', e));
      }

      await supabase
        .from('moderation_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), admin_notes: `Suspension : ${suspendReason.trim()}` })
        .eq('id', suspendTarget.id);

      setReports(prev => prev.map(r =>
        r.id === suspendTarget.id
          ? { ...r, status: 'resolved', resolved_at: new Date().toISOString(), reported: r.reported ? { ...r.reported, suspended_at: now } : r.reported }
          : r
      ));

      setSuspendTarget(null);
      setSuspendReason('');
      setSendSuspendEmail(true);
      setDetailsTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      const { error } = await supabase.from('moderation_reports').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      setReports(prev => prev.filter(r => r.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDetailsTarget(null);
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleDeleteReview() {
    if (!deleteReviewTarget?.review) return;
    setActionId(deleteReviewTarget.id);
    try {
      const reviewId = deleteReviewTarget.review.id;
      const { error: err1 } = await supabase.rpc('admin_delete_rating', { p_rating_id: reviewId });
      if (err1) throw err1;

      await supabase
        .from('moderation_reports')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), admin_notes: 'Avis supprimé' })
        .eq('id', deleteReviewTarget.id);

      setReports(prev => prev.map(r =>
        r.id === deleteReviewTarget.id
          ? { ...r, status: 'resolved', resolved_at: new Date().toISOString(), review: undefined }
          : r
      ));

      setDeleteReviewTarget(null);
      setDetailsTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleHideReview() {
    if (!hideReviewTarget?.review || !hideReason.trim()) return;
    setActionId(hideReviewTarget.id);
    try {
      const reviewId = hideReviewTarget.review.id;
      const now = new Date().toISOString();

      const { error: err1 } = await supabase.rpc('admin_hide_rating', { p_rating_id: reviewId, p_reason: hideReason.trim() });
      if (err1) throw err1;

      await supabase
        .from('moderation_reports')
        .update({ status: 'resolved', resolved_at: now, admin_notes: `Avis masqué : ${hideReason.trim()}` })
        .eq('id', hideReviewTarget.id);

      setReports(prev => prev.map(r =>
        r.id === hideReviewTarget.id
          ? { ...r, status: 'resolved', resolved_at: now, review: r.review ? { ...r.review, hidden_at: now, hidden_reason: hideReason.trim() } : r.review }
          : r
      ));

      setHideReviewTarget(null);
      setHideReason('');
      setDetailsTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleUnhideReview(reviewId: string) {
    setActionId(reviewId);
    try {
      const { error } = await supabase.rpc('admin_unhide_rating', { p_rating_id: reviewId });
      if (error) throw error;

      setReports(prev => prev.map(r =>
        r.review?.id === reviewId ? { ...r, review: r.review ? { ...r.review, hidden_at: null, hidden_reason: null } : r.review } : r
      ));

      setDetailsTarget(prev =>
        prev && prev.review?.id === reviewId ? { ...prev, review: prev.review ? { ...prev.review, hidden_at: null, hidden_reason: null } : prev.review } : prev
      );
    } catch (err: any) {
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  const statusTabs: Array<{ key: StatusFilter; labelFr: string; labelEn: string; count: number }> = [
    { key: 'new',      labelFr: 'Nouveaux',  labelEn: 'New',      count: counts.new },
    { key: 'seen',     labelFr: 'Vus',       labelEn: 'Seen',     count: counts.seen },
    { key: 'resolved', labelFr: 'Résolus',   labelEn: 'Resolved', count: counts.resolved },
    { key: 'all',      labelFr: 'Tous',      labelEn: 'All',      count: counts.all },
  ];

  return (
    <div className="min-h-screen bg-[#fffafa] text-slate-900 selection:bg-red-100 selection:text-red-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32">

        {/* En-tête */}
        <FadeInSection>
          <div className="mb-8 sm:mb-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-red-500 mb-1.5 sm:mb-2">
              {isFr ? 'Modération' : 'Moderation'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {isFr ? 'Signalements' : 'Reports'}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-2">
              {isFr
                ? 'Modérez les signalements envoyés par les utilisateurs.'
                : 'Moderate reports submitted by users.'}
            </p>
          </div>
        </FadeInSection>

        {/* Filtres statut */}
        <FadeInSection delay={50}>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-5 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {statusTabs.map(tab => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key)}
                  className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
                    active
                      ? 'border-red-500 bg-red-500 text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  {isFr ? tab.labelFr : tab.labelEn}
                  <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </FadeInSection>

        {/* Filtres avancés */}
        <FadeInSection delay={100}>
          <div className="flex flex-col gap-3 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isFr ? 'Rechercher par nom, email ou contenu…' : 'Search by name, email or content…'}
                className="w-full pl-11 pr-4 h-12 rounded-[1.35rem] border border-slate-200 bg-white text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative w-full">
                <select
                  value={contextFilter}
                  onChange={e => setContextFilter(e.target.value as ContextFilter)}
                  className="w-full appearance-none bg-white rounded-[1.35rem] pl-4 pr-10 h-12 text-sm font-medium border border-slate-200 text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer shadow-sm"
                >
                  <option value="all">{isFr ? 'Tous types' : 'All types'}</option>
                  <option value="profile">{isFr ? 'Profils' : 'Profiles'}</option>
                  <option value="review">{isFr ? 'Avis' : 'Reviews'}</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative w-full">
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
                  className="w-full appearance-none bg-white rounded-[1.35rem] pl-4 pr-10 h-12 text-sm font-medium border border-slate-200 text-slate-700 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all cursor-pointer shadow-sm"
                >
                  <option value="all">{isFr ? 'Toutes catégories' : 'All categories'}</option>
                  {Object.entries(CATEGORY_LABELS).map(([key, lbl]) => (
                    <option key={key} value={key}>{isFr ? lbl.fr : lbl.en}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
          </div>
        ) : paginated.length === 0 ? (
          <FadeInSection>
            <div className="bg-white rounded-[1.35rem] border border-slate-200 p-16 text-center shadow-sm">
              <Flag className="w-10 h-10 text-red-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {isFr ? 'Aucun signalement' : 'No reports'}
              </p>
              <p className="text-xs text-slate-500">
                {isFr ? 'Rien à modérer pour l\'instant.' : 'Nothing to moderate right now.'}
              </p>
            </div>
          </FadeInSection>
        ) : (
          <FadeInSection delay={150}>
            <div className="bg-white rounded-[1.35rem] border border-slate-200 overflow-hidden shadow-sm">
              {/* Header desktop */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{isFr ? 'Signalement' : 'Report'}</span>
                <span>{isFr ? 'Type / Catégorie' : 'Type / Category'}</span>
                <span>{isFr ? 'Statut' : 'Status'}</span>
                <span>{isFr ? 'Date' : 'Date'}</span>
                <span className="text-right">{isFr ? 'Actions' : 'Actions'}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {paginated.map((report, index) => {
                  const cat = CATEGORY_LABELS[report.category] || CATEGORY_LABELS.other;
                  const ctx = CONTEXT_LABELS[report.context] || CONTEXT_LABELS.profile;
                  const isWorking = actionId === report.id;
                  const reportedName = report.reported
                    ? `${report.reported.first_name || ''} ${report.reported.last_name || ''}`.trim() || report.reported.email
                    : '—';
                  const reporterName = report.reporter
                    ? `${report.reporter.first_name || ''} ${report.reporter.last_name || ''}`.trim() || report.reporter.email
                    : '—';

                  return (
                    <div
                      key={report.id}
                      className="flex flex-col md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 md:gap-4 px-4 sm:px-6 py-4 hover:bg-red-50/30 transition-colors md:items-center"
                    >
                      {/* Signalement */}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {reporterName} <span className="text-slate-400 font-normal px-0.5">→</span> {reportedName}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {report.context === 'review' && report.review?.comment
                            ? `« ${report.review.comment.slice(0, 60)}${report.review.comment.length > 60 ? '…' : ''} »`
                            : report.description.slice(0, 80) + (report.description.length > 80 ? '…' : '')}
                        </p>
                      </div>

                      {/* Type + catégorie + date (mobiles) */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${ctx.color}`}>
                          {isFr ? ctx.fr : ctx.en}
                        </span>
                        <span className={`inline-flex text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${cat.color}`}>
                          {isFr ? cat.fr : cat.en}
                        </span>
                        <span className="flex md:hidden items-center gap-1.5 text-[11px] font-medium text-slate-500 ml-auto">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(report.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                        </span>
                      </div>

                      {/* Statut */}
                      <div className="flex items-center md:block">
                        <StatusBadge status={report.status} isFr={isFr} />
                      </div>

                      {/* Date (desktop) */}
                      <div className="hidden md:flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(report.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-4 gap-2 md:flex md:items-center md:justify-end mt-2 md:mt-0">
                        <button
                          onClick={() => { setDetailsTarget(report); setAdminNotes(report.admin_notes || ''); }}
                          className="h-10 md:h-8 md:w-8 rounded-xl md:rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 md:bg-transparent md:hover:bg-slate-100 md:text-slate-400 md:hover:text-slate-900 transition-colors"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span className="md:hidden">{isFr ? 'Voir' : 'View'}</span>
                        </button>
                        
                        {report.status === 'new' && (
                          <button
                            onClick={() => markAsSeen(report.id)}
                            disabled={isWorking}
                            className="h-10 md:h-8 md:w-8 rounded-xl md:rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 md:bg-transparent md:text-slate-400 md:hover:text-amber-600 md:hover:bg-amber-50 transition-colors disabled:opacity-50"
                          >
                            {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                            <span className="md:hidden">{isFr ? 'Vu' : 'Seen'}</span>
                          </button>
                        )}

                        {report.status !== 'resolved' && (
                          <button
                            onClick={() => markAsResolved(report.id)}
                            disabled={isWorking}
                            className="h-10 md:h-8 md:w-8 rounded-xl md:rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 md:bg-transparent md:text-slate-400 md:hover:text-emerald-600 md:hover:bg-emerald-50 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="md:hidden">{isFr ? 'Résolu' : 'Resolve'}</span>
                          </button>
                        )}

                        <button
                          onClick={() => setDeleteTarget(report)}
                          disabled={isWorking}
                          className="h-10 md:h-8 md:w-8 rounded-xl md:rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 md:bg-transparent md:text-slate-400 md:hover:text-red-600 md:hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="md:hidden">{isFr ? 'Suppr.' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </FadeInSection>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 pt-8 mt-4 border-t border-slate-200">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 h-10 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isFr ? 'Précédent' : 'Previous'}</span>
            </button>

            <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full tabular-nums">
              {page} / {totalPages}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 h-10 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">{isFr ? 'Suivant' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ═══ MODALE DÉTAILS ═══ */}
        {detailsTarget && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
            onClick={() => !actionId && setDetailsTarget(null)}
          >
            <div
              className="bg-white rounded-t-3xl sm:rounded-[1.35rem] max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 p-5 sm:p-6 flex items-start justify-between gap-4 z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                    <Flag className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-900">
                      {isFr ? 'Détails du signalement' : 'Report details'}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {new Date(detailsTarget.created_at).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDetailsTarget(null)}
                  disabled={!!actionId}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenu */}
              <div className="p-5 sm:p-6 space-y-6 flex-1 overflow-y-auto">

                {/* Statut + type + catégorie */}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={detailsTarget.status} isFr={isFr} />
                  {(() => {
                    const ctx = CONTEXT_LABELS[detailsTarget.context] || CONTEXT_LABELS.profile;
                    return (
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${ctx.color}`}>
                        {isFr ? ctx.fr : ctx.en}
                      </span>
                    );
                  })()}
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${CATEGORY_LABELS[detailsTarget.category]?.color || CATEGORY_LABELS.other.color}`}>
                    {isFr
                      ? CATEGORY_LABELS[detailsTarget.category]?.fr || detailsTarget.category
                      : CATEGORY_LABELS[detailsTarget.category]?.en || detailsTarget.category}
                  </span>
                </div>

                {/* Reporter → Reported */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <UserCard
                    label={isFr ? 'Signalé par' : 'Reported by'}
                    user={detailsTarget.reporter}
                    fallback={isFr ? 'Utilisateur inconnu' : 'Unknown user'}
                  />
                  <UserCard
                    label={isFr ? 'Utilisateur signalé' : 'Reported user'}
                    user={detailsTarget.reported}
                    fallback={isFr ? 'Utilisateur inconnu' : 'Unknown user'}
                    showStatus
                  />
                </div>

                {/* Description du signalement */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {isFr ? 'Motif du signalement' : 'Report reason'}
                  </p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {detailsTarget.description}
                    </p>
                  </div>
                </div>

                {/* ✨ AVIS SIGNALÉ */}
                {detailsTarget.context === 'review' && detailsTarget.review && (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      {isFr ? 'Avis signalé' : 'Reported review'}
                      {detailsTarget.review.hidden_at && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full ml-2 border border-slate-300">
                          <EyeOff className="w-3 h-3" />
                          {isFr ? 'Masqué' : 'Hidden'}
                        </span>
                      )}
                    </p>
                    <div className={`rounded-xl border-2 p-4 ${
                      detailsTarget.review.hidden_at
                        ? 'bg-slate-100 border-slate-300 border-dashed'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map(n => (
                          <Star
                            key={n}
                            className={`w-4 h-4 ${
                              n <= detailsTarget.review!.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-slate-500 ml-2">
                          {new Date(detailsTarget.review.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                        </span>
                      </div>

                      {detailsTarget.review.comment ? (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {detailsTarget.review.comment}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic">
                          {isFr ? 'Aucun commentaire (note seule)' : 'No comment (rating only)'}
                        </p>
                      )}

                      {detailsTarget.review.hidden_at && detailsTarget.review.hidden_reason && (
                        <div className="mt-3 pt-3 border-t border-slate-300">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                            {isFr ? 'Raison du masquage' : 'Hide reason'}
                          </p>
                          <p className="text-xs text-slate-600 italic">
                            {detailsTarget.review.hidden_reason}
                          </p>
                        </div>
                      )}

                      {detailsTarget.review.teacher_reply && (
                        <div className="mt-3 pt-3 border-t border-slate-200 ml-2 pl-3 border-l-2 border-emerald-200">
                          <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mb-1">
                            {isFr ? 'Réponse du prof' : "Teacher's reply"}
                          </p>
                          <p className="text-xs text-slate-600">
                            {detailsTarget.review.teacher_reply}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes admin */}
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {isFr ? 'Notes internes (admin)' : 'Internal notes (admin)'}
                  </p>
                  <textarea
                    value={adminNotes}
                    onChange={e => setAdminNotes(e.target.value)}
                    rows={3}
                    placeholder={isFr ? 'Ajoutez des notes internes…' : 'Add internal notes…'}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-none transition-all"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => saveNotes(detailsTarget.id, adminNotes)}
                      disabled={savingNotes || adminNotes === (detailsTarget.admin_notes || '')}
                      className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-40 transition-colors"
                    >
                      {savingNotes ? (isFr ? 'Enregistrement…' : 'Saving…') : (isFr ? 'Enregistrer les notes' : 'Save notes')}
                    </button>
                  </div>
                </div>

                {/* Historique */}
                {(detailsTarget.seen_at || detailsTarget.resolved_at) && (
                  <div className="text-xs font-medium text-slate-500 space-y-1.5 pt-4 border-t border-slate-100">
                    {detailsTarget.seen_at && (
                      <p className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {isFr ? 'Vu le ' : 'Seen on '}
                        {new Date(detailsTarget.seen_at).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                      </p>
                    )}
                    {detailsTarget.resolved_at && (
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isFr ? 'Résolu le ' : 'Resolved on '}
                        {new Date(detailsTarget.resolved_at).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Actions (mobile: grille 1 colonne, desktop: wrap) */}
              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row sm:flex-wrap gap-2 shrink-0">
                {detailsTarget.status === 'new' && (
                  <button
                    onClick={() => markAsSeen(detailsTarget.id)}
                    disabled={!!actionId}
                    className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200 disabled:opacity-50 transition-colors active:scale-95"
                  >
                    <Clock className="w-4 h-4" />
                    {isFr ? 'Marquer comme vu' : 'Mark as seen'}
                  </button>
                )}

                {detailsTarget.status !== 'resolved' && (
                  <button
                    onClick={() => markAsResolved(detailsTarget.id)}
                    disabled={!!actionId}
                    className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-emerald-100 text-emerald-800 text-sm font-semibold hover:bg-emerald-200 disabled:opacity-50 transition-colors active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isFr ? 'Marquer comme résolu' : 'Mark as resolved'}
                  </button>
                )}

                {detailsTarget.context === 'review' && detailsTarget.review && (
                  <>
                    {!detailsTarget.review.hidden_at ? (
                      <button
                        onClick={() => { setHideReviewTarget(detailsTarget); setHideReason(''); }}
                        disabled={!!actionId}
                        className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-slate-200 text-slate-800 text-sm font-semibold hover:bg-slate-300 disabled:opacity-50 transition-colors active:scale-95"
                      >
                        <EyeOff className="w-4 h-4" />
                        {isFr ? 'Masquer l\'avis' : 'Hide review'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUnhideReview(detailsTarget.review!.id)}
                        disabled={!!actionId}
                        className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold hover:bg-blue-200 disabled:opacity-50 transition-colors active:scale-95"
                      >
                        <Eye className="w-4 h-4" />
                        {isFr ? 'Restaurer l\'avis' : 'Unhide review'}
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteReviewTarget(detailsTarget)}
                      disabled={!!actionId}
                      className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-red-100 text-red-800 text-sm font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                      {isFr ? 'Supprimer l\'avis' : 'Delete review'}
                    </button>
                  </>
                )}

                {!detailsTarget.reported?.suspended_at && (
                  <button
                    onClick={() => { setSuspendTarget(detailsTarget); setSuspendReason(''); }}
                    disabled={!!actionId}
                    className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors active:scale-95 shadow-sm"
                  >
                    <Ban className="w-4 h-4" />
                    {isFr ? 'Suspendre l\'utilisateur' : 'Suspend user'}
                  </button>
                )}

                <button
                  onClick={() => setDeleteTarget(detailsTarget)}
                  disabled={!!actionId}
                  className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 h-11 sm:h-10 rounded-full border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors sm:ml-auto active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  {isFr ? 'Supprimer signalement' : 'Delete report'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODALE SUSPENSION ═══ */}
        {suspendTarget && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !actionId && setSuspendTarget(null)}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-[1.35rem] max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isFr ? 'Suspendre cet utilisateur ?' : 'Suspend this user?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 truncate mt-0.5">
                    {suspendTarget.reported?.email}
                  </p>
                </div>
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={!!actionId}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {isFr ? 'Raison de la suspension' : 'Reason for suspension'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={suspendReason}
                    onChange={e => setSuspendReason(e.target.value)}
                    rows={4}
                    placeholder={isFr ? 'Ex : Comportement inapproprié, non-respect des CGU…' : 'Ex: Inappropriate behavior, terms violation…'}
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-none transition-all"
                    autoFocus
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    {isFr ? 'Cette raison sera envoyée à l\'utilisateur par email.' : 'This reason will be sent to the user by email.'}
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <input
                    type="checkbox"
                    checked={sendSuspendEmail}
                    onChange={e => setSendSuspendEmail(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-red-500 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-slate-700 leading-snug">
                    {isFr ? 'Envoyer un email de notification' : 'Send notification email'}
                  </span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={!!actionId || !suspendReason.trim()}
                  className="flex-1 h-11 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === suspendTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  {isFr ? 'Suspendre' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODALE SUPPRESSION SIGNALEMENT ═══ */}
        {deleteTarget && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !actionId && setDeleteTarget(null)}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-[1.35rem] max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isFr ? 'Supprimer ce signalement ?' : 'Delete this report?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {isFr ? 'Cette action est irréversible.' : 'This action is irreversible.'}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!actionId}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === deleteTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isFr ? 'Supprimer' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODALE SUPPRESSION AVIS ═══ */}
        {deleteReviewTarget && deleteReviewTarget.review && (
          <div
            className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !actionId && setDeleteReviewTarget(null)}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-[1.35rem] max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isFr ? 'Supprimer cet avis ?' : 'Delete this review?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {isFr
                      ? 'L\'avis sera définitivement supprimé de la base. Cette action est irréversible.'
                      : 'The review will be permanently deleted from the database. This action is irreversible.'}
                  </p>
                </div>
                <button
                  onClick={() => setDeleteReviewTarget(null)}
                  disabled={!!actionId}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  💡 {isFr
                    ? 'Astuce : si vous voulez juste le cacher du public tout en gardant une trace, préférez "Masquer l\'avis" à la place.'
                    : 'Tip: if you just want to hide it from the public while keeping a trace, use "Hide review" instead.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button
                  onClick={() => setDeleteReviewTarget(null)}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleDeleteReview}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === deleteReviewTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  {isFr ? 'Supprimer' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MODALE MASQUER AVIS ═══ */}
        {hideReviewTarget && hideReviewTarget.review && (
          <div
            className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !actionId && setHideReviewTarget(null)}
          >
            <div
              className="bg-white rounded-2xl sm:rounded-[1.35rem] max-w-md w-full p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-slate-200 flex items-center justify-center shrink-0 border border-slate-300">
                  <EyeOff className="w-5 h-5 text-slate-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {isFr ? 'Masquer cet avis ?' : 'Hide this review?'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {isFr
                      ? 'L\'avis ne sera plus visible publiquement, mais reste stocké en base pour audit.'
                      : 'The review will no longer be publicly visible, but stays stored for audit.'}
                  </p>
                </div>
                <button
                  onClick={() => setHideReviewTarget(null)}
                  disabled={!!actionId}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">
                  {isFr ? 'Raison du masquage' : 'Hide reason'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={hideReason}
                  onChange={e => setHideReason(e.target.value)}
                  rows={3}
                  placeholder={isFr ? 'Ex : Contenu offensant, non conforme aux CGU…' : 'Ex: Offensive content, terms violation…'}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 resize-none transition-all"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {isFr ? 'Cette raison est interne (visible uniquement par les admins).' : 'This reason is internal (visible only by admins).'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button
                  onClick={() => setHideReviewTarget(null)}
                  disabled={!!actionId}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleHideReview}
                  disabled={!!actionId || !hideReason.trim()}
                  className="flex-1 h-11 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === hideReviewTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                  {isFr ? 'Masquer' : 'Hide'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Sous-composants ═══ */

function StatusBadge({ status, isFr }: { status: string; isFr: boolean }) {
  const map: Record<string, { bg: string; text: string; labelFr: string; labelEn: string }> = {
    new:      { bg: 'bg-red-50 border-red-200',     text: 'text-red-700',     labelFr: 'Nouveau', labelEn: 'New' },
    seen:     { bg: 'bg-amber-50 border-amber-200',   text: 'text-amber-700',   labelFr: 'Vu',      labelEn: 'Seen' },
    resolved: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', labelFr: 'Résolu',  labelEn: 'Resolved' },
  };
  const cfg = map[status] || map.new;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.text}`}>
      {isFr ? cfg.labelFr : cfg.labelEn}
    </span>
  );
}

function UserCard({
  label, user, fallback, showStatus,
}: {
  label: string;
  user?: { first_name: string | null; last_name: string | null; email: string; suspended_at?: string | null };
  fallback: string;
  showStatus?: boolean;
}) {
  if (!user) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
        <p className="text-sm text-slate-400 italic">{fallback}</p>
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  const initials = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || user.email[0]?.toUpperCase() || '?';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
          {showStatus && user.suspended_at && (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-bold mt-1">
              <Ban className="w-3 h-3" />
              {label.includes('Signalé') ? 'Suspendu' : 'Suspended'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}