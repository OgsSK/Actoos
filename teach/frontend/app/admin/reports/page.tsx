'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Flag, Loader2, Ban, CheckCircle2, Eye as EyeIcon,
  Trash2, X, AlertTriangle, ChevronLeft, ChevronRight,
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
  // Enrichi
  reporter?: { first_name: string | null; last_name: string | null; email: string };
  reported?: { first_name: string | null; last_name: string | null; email: string; suspended_at: string | null };
  review?: ReviewData;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  harassment:    { fr: 'Harcèlement',              en: 'Harassment',              color: 'bg-red-100 text-red-700' },
  fake_profile:  { fr: 'Faux profil',              en: 'Fake profile',            color: 'bg-orange-100 text-orange-700' },
  inappropriate: { fr: 'Comportement inapproprié', en: 'Inappropriate behavior',  color: 'bg-amber-100 text-amber-700' },
  spam:          { fr: 'Spam',                     en: 'Spam',                    color: 'bg-blue-100 text-blue-700' },
  offensive:     { fr: 'Contenu offensant',        en: 'Offensive content',       color: 'bg-rose-100 text-rose-700' },
  fake_review:   { fr: 'Faux avis',                en: 'Fake review',             color: 'bg-orange-100 text-orange-700' },
  other:         { fr: 'Autre',                    en: 'Other',                   color: 'bg-slate-100 text-slate-700' },
};

const CONTEXT_LABELS: Record<string, { fr: string; en: string; color: string }> = {
  profile: { fr: 'Profil', en: 'Profile', color: 'bg-indigo-100 text-indigo-700' },
  review:  { fr: 'Avis',   en: 'Review',  color: 'bg-purple-100 text-purple-700' },
  message: { fr: 'Message', en: 'Message', color: 'bg-slate-100 text-slate-700' },
  request: { fr: 'Demande', en: 'Request', color: 'bg-slate-100 text-slate-700' },
};

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

      // Charger les users
      let usersMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, suspended_at')
          .in('id', userIds);

        (usersData || []).forEach(u => usersMap.set(u.id, u));
      }

      // Charger les avis (si signalements de type 'review')
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

  // ═══ Actions ═══

  async function markAsSeen(id: string) {
    setActionId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from('moderation_reports')
        .update({
          status: 'seen',
          seen_at: new Date().toISOString(),
          seen_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(r =>
        r.id === id ? { ...r, status: 'seen', seen_at: new Date().toISOString() } : r
      ));
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
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(r =>
        r.id === id ? { ...r, status: 'resolved', resolved_at: new Date().toISOString() } : r
      ));
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
      const { error } = await supabase
        .from('moderation_reports')
        .update({ admin_notes: notes })
        .eq('id', id);
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

      // 1. Suspendre le user
      const { error: err1 } = await supabase
        .from('users')
        .update({
          suspended_at: now,
          suspended_reason: suspendReason.trim(),
        })
        .eq('id', suspendTarget.reported_id);
      if (err1) throw err1;

      // 2. Si prof → marquer aussi son teacher_profile
      await supabase
        .from('teacher_profiles')
        .update({ verification_status: 'suspended', is_verified: false })
        .eq('id', suspendTarget.reported_id);

      // 3. Email
      if (sendSuspendEmail) {
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'account-suspended',
              user_id: suspendTarget.reported_id,
              reason: suspendReason.trim(),
            }),
          }
        ).catch((e) => console.warn('[Email] Non envoyé:', e));
      }

      // 4. Marquer le report comme résolu
      await supabase
        .from('moderation_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          admin_notes: `Suspension : ${suspendReason.trim()}`,
        })
        .eq('id', suspendTarget.id);

      setReports(prev => prev.map(r =>
        r.id === suspendTarget.id
          ? {
              ...r,
              status: 'resolved',
              resolved_at: new Date().toISOString(),
              reported: r.reported ? { ...r.reported, suspended_at: now } : r.reported,
            }
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
      const { error } = await supabase
        .from('moderation_reports')
        .delete()
        .eq('id', deleteTarget.id);
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

  // 🗑️ Supprimer définitivement l'avis signalé (via RPC admin)
  async function handleDeleteReview() {
    if (!deleteReviewTarget?.review) return;
    setActionId(deleteReviewTarget.id);
    try {
      const reviewId = deleteReviewTarget.review.id;

      // 1. Supprimer l'avis (via RPC SECURITY DEFINER → bypass RLS)
      const { error: err1 } = await supabase.rpc('admin_delete_rating', {
        p_rating_id: reviewId,
      });
      if (err1) throw err1;

      // 2. Marquer le report comme résolu
      await supabase
        .from('moderation_reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          admin_notes: 'Avis supprimé',
        })
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

  // 🙈 Masquer l'avis (soft delete — via RPC admin)
  async function handleHideReview() {
    if (!hideReviewTarget?.review || !hideReason.trim()) return;
    setActionId(hideReviewTarget.id);
    try {
      const reviewId = hideReviewTarget.review.id;
      const now = new Date().toISOString();

      // 1. Masquer l'avis (via RPC SECURITY DEFINER → bypass RLS)
      const { error: err1 } = await supabase.rpc('admin_hide_rating', {
        p_rating_id: reviewId,
        p_reason: hideReason.trim(),
      });
      if (err1) throw err1;

      // 2. Marquer le report comme résolu
      await supabase
        .from('moderation_reports')
        .update({
          status: 'resolved',
          resolved_at: now,
          admin_notes: `Avis masqué : ${hideReason.trim()}`,
        })
        .eq('id', hideReviewTarget.id);

      setReports(prev => prev.map(r =>
        r.id === hideReviewTarget.id
          ? {
              ...r,
              status: 'resolved',
              resolved_at: now,
              review: r.review ? { ...r.review, hidden_at: now, hidden_reason: hideReason.trim() } : r.review,
            }
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

  // 🔄 Restaurer un avis masqué (via RPC admin)
  async function handleUnhideReview(reviewId: string) {
    setActionId(reviewId);
    try {
      const { error } = await supabase.rpc('admin_unhide_rating', {
        p_rating_id: reviewId,
      });
      if (error) throw error;

      setReports(prev => prev.map(r =>
        r.review?.id === reviewId
          ? { ...r, review: r.review ? { ...r.review, hidden_at: null, hidden_reason: null } : r.review }
          : r
      ));

      setDetailsTarget(prev =>
        prev && prev.review?.id === reviewId
          ? { ...prev, review: prev.review ? { ...prev.review, hidden_at: null, hidden_reason: null } : prev.review }
          : prev
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Flag className="w-6 h-6 text-red-500" />
          {isFr ? 'Signalements' : 'Reports'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isFr
            ? 'Modérez les signalements envoyés par les utilisateurs.'
            : 'Moderate reports submitted by users.'}
        </p>
      </div>

      {/* Filtres statut */}
      <div className="border-b border-slate-200 mb-6 -mx-4 sm:mx-0 overflow-x-auto">
        <div className="flex gap-1 px-4 sm:px-0 min-w-max">
          {statusTabs.map(tab => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-red-600 text-red-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                {isFr ? tab.labelFr : tab.labelEn}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filtres avancés */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isFr
              ? 'Rechercher par nom, email ou contenu…'
              : 'Search by name, email or content…'}
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-slate-200 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 transition-colors bg-white"
          />
        </div>
        <select
          value={contextFilter}
          onChange={e => setContextFilter(e.target.value as ContextFilter)}
          className="bg-white rounded-xl px-3 h-10 text-sm border border-slate-200 outline-none focus:border-red-500 transition-colors cursor-pointer"
        >
          <option value="all">{isFr ? 'Tous types' : 'All types'}</option>
          <option value="profile">{isFr ? 'Profils' : 'Profiles'}</option>
          <option value="review">{isFr ? 'Avis' : 'Reviews'}</option>
        </select>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
          className="bg-white rounded-xl px-3 h-10 text-sm border border-slate-200 outline-none focus:border-red-500 transition-colors cursor-pointer"
        >
          <option value="all">{isFr ? 'Toutes catégories' : 'All categories'}</option>
          {Object.entries(CATEGORY_LABELS).map(([key, lbl]) => (
            <option key={key} value={key}>{isFr ? lbl.fr : lbl.en}</option>
          ))}
        </select>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Flag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 mb-1">
            {isFr ? 'Aucun signalement' : 'No reports'}
          </p>
          <p className="text-xs text-slate-500">
            {isFr ? 'Rien à modérer pour l\'instant.' : 'Nothing to moderate right now.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header desktop */}
          <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>{isFr ? 'Signalement' : 'Report'}</span>
            <span>{isFr ? 'Type / Catégorie' : 'Type / Category'}</span>
            <span>{isFr ? 'Statut' : 'Status'}</span>
            <span>{isFr ? 'Date' : 'Date'}</span>
            <span className="text-right">{isFr ? 'Actions' : 'Actions'}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {paginated.map(report => {
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
                  className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors items-center"
                >
                  {/* Signalement */}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {reporterName} → {reportedName}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {report.context === 'review' && report.review?.comment
                        ? `« ${report.review.comment.slice(0, 60)}${report.review.comment.length > 60 ? '…' : ''} »`
                        : report.description.slice(0, 80) + (report.description.length > 80 ? '…' : '')}
                    </p>
                  </div>

                  {/* Type + catégorie */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex text-[10px] font-medium px-2 py-1 rounded-full ${ctx.color}`}>
                      {isFr ? ctx.fr : ctx.en}
                    </span>
                    <span className={`inline-flex text-[10px] font-medium px-2 py-1 rounded-full ${cat.color}`}>
                      {isFr ? cat.fr : cat.en}
                    </span>
                  </div>

                  {/* Statut */}
                  <div>
                    <StatusBadge status={report.status} isFr={isFr} />
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(report.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => { setDetailsTarget(report); setAdminNotes(report.admin_notes || ''); }}
                      className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title={isFr ? 'Voir détails' : 'View details'}
                    >
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    {report.status === 'new' && (
                      <button
                        onClick={() => markAsSeen(report.id)}
                        disabled={isWorking}
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        title={isFr ? 'Marquer comme vu' : 'Mark as seen'}
                      >
                        {isWorking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      </button>
                    )}
                    {report.status !== 'resolved' && (
                      <button
                        onClick={() => markAsResolved(report.id)}
                        disabled={isWorking}
                        className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        title={isFr ? 'Marquer comme résolu' : 'Mark as resolved'}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteTarget(report)}
                      disabled={isWorking}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title={isFr ? 'Supprimer' : 'Delete'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-xs text-slate-500">
            {isFr
              ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length}`
              : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-slate-700">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ MODALE DÉTAILS ═══ */}
      {detailsTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !actionId && setDetailsTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-start justify-between gap-4 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <Flag className="w-5 h-5 text-red-600" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900">
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
                className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-5">

              {/* Statut + type + catégorie */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={detailsTarget.status} isFr={isFr} />
                {(() => {
                  const ctx = CONTEXT_LABELS[detailsTarget.context] || CONTEXT_LABELS.profile;
                  return (
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ctx.color}`}>
                      {isFr ? ctx.fr : ctx.en}
                    </span>
                  );
                })()}
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${CATEGORY_LABELS[detailsTarget.category]?.color || CATEGORY_LABELS.other.color}`}>
                  {isFr
                    ? CATEGORY_LABELS[detailsTarget.category]?.fr || detailsTarget.category
                    : CATEGORY_LABELS[detailsTarget.category]?.en || detailsTarget.category}
                </span>
              </div>

              {/* Reporter → Reported */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {isFr ? 'Motif du signalement' : 'Report reason'}
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {detailsTarget.description}
                  </p>
                </div>
              </div>

              {/* ✨ AVIS SIGNALÉ (uniquement pour context='review') */}
              {detailsTarget.context === 'review' && detailsTarget.review && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    {isFr ? 'Avis signalé' : 'Reported review'}
                    {detailsTarget.review.hidden_at && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full ml-2">
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
                    {/* Étoiles */}
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map(n => (
                        <Star
                          key={n}
                          className={`w-4 h-4 ${
                            n <= detailsTarget.review!.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      ))}
                      <span className="text-xs text-slate-500 ml-2">
                        {new Date(detailsTarget.review.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                      </span>
                    </div>

                    {/* Commentaire */}
                    {detailsTarget.review.comment ? (
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {detailsTarget.review.comment}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400 italic">
                        {isFr ? 'Aucun commentaire (note seule)' : 'No comment (rating only)'}
                      </p>
                    )}

                    {/* Raison du masquage */}
                    {detailsTarget.review.hidden_at && detailsTarget.review.hidden_reason && (
                      <div className="mt-3 pt-3 border-t border-slate-300">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          {isFr ? 'Raison du masquage' : 'Hide reason'}
                        </p>
                        <p className="text-xs text-slate-600 italic">
                          {detailsTarget.review.hidden_reason}
                        </p>
                      </div>
                    )}

                    {/* Réponse du prof (si existe) */}
                    {detailsTarget.review.teacher_reply && (
                      <div className="mt-3 pt-3 border-t border-slate-200 ml-3 pl-3 border-l-2 border-emerald-200">
                        <p className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider mb-1">
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
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  {isFr ? 'Notes internes (admin)' : 'Internal notes (admin)'}
                </p>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder={isFr
                    ? 'Ajoutez des notes internes…'
                    : 'Add internal notes…'}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => saveNotes(detailsTarget.id, adminNotes)}
                    disabled={savingNotes || adminNotes === (detailsTarget.admin_notes || '')}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-40"
                  >
                    {savingNotes ? (isFr ? 'Enregistrement…' : 'Saving…') : (isFr ? 'Enregistrer les notes' : 'Save notes')}
                  </button>
                </div>
              </div>

              {/* Historique */}
              {(detailsTarget.seen_at || detailsTarget.resolved_at) && (
                <div className="text-xs text-slate-500 space-y-1 pt-3 border-t border-slate-100">
                  {detailsTarget.seen_at && (
                    <p>
                      {isFr ? 'Vu le ' : 'Seen on '}
                      {new Date(detailsTarget.seen_at).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                    </p>
                  )}
                  {detailsTarget.resolved_at && (
                    <p>
                      {isFr ? 'Résolu le ' : 'Resolved on '}
                      {new Date(detailsTarget.resolved_at).toLocaleString(isFr ? 'fr-FR' : 'en-US')}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex flex-wrap gap-2">

              {detailsTarget.status === 'new' && (
                <button
                  onClick={() => markAsSeen(detailsTarget.id)}
                  disabled={!!actionId}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-amber-100 text-amber-800 text-sm font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  {isFr ? 'Marquer comme vu' : 'Mark as seen'}
                </button>
              )}

              {detailsTarget.status !== 'resolved' && (
                <button
                  onClick={() => markAsResolved(detailsTarget.id)}
                  disabled={!!actionId}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-emerald-100 text-emerald-800 text-sm font-medium hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isFr ? 'Marquer comme résolu' : 'Mark as resolved'}
                </button>
              )}

              {/* 👉 Actions spécifiques aux avis */}
              {detailsTarget.context === 'review' && detailsTarget.review && (
                <>
                  {!detailsTarget.review.hidden_at ? (
                    <button
                      onClick={() => { setHideReviewTarget(detailsTarget); setHideReason(''); }}
                      disabled={!!actionId}
                      className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-slate-200 text-slate-800 text-sm font-medium hover:bg-slate-300 disabled:opacity-50 transition-colors"
                    >
                      <EyeOff className="w-4 h-4" />
                      {isFr ? 'Masquer l\'avis' : 'Hide review'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnhideReview(detailsTarget.review!.id)}
                      disabled={!!actionId}
                      className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-blue-100 text-blue-800 text-sm font-medium hover:bg-blue-200 disabled:opacity-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      {isFr ? 'Restaurer l\'avis' : 'Unhide review'}
                    </button>
                  )}
                  <button
                    onClick={() => setDeleteReviewTarget(detailsTarget)}
                    disabled={!!actionId}
                    className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-red-100 text-red-800 text-sm font-medium hover:bg-red-200 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isFr ? 'Supprimer l\'avis' : 'Delete review'}
                  </button>
                </>
              )}

              {/* 👉 Suspendre l'utilisateur signalé */}
              {!detailsTarget.reported?.suspended_at && (
                <button
                  onClick={() => {
                    setSuspendTarget(detailsTarget);
                    setSuspendReason('');
                  }}
                  disabled={!!actionId}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  <Ban className="w-4 h-4" />
                  {isFr ? 'Suspendre l\'utilisateur' : 'Suspend user'}
                </button>
              )}

              <button
                onClick={() => setDeleteTarget(detailsTarget)}
                disabled={!!actionId}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-xl border border-red-200 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors ml-auto"
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
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !actionId && setSuspendTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Suspendre cet utilisateur ?' : 'Suspend this user?'}
                </h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {suspendTarget.reported?.email}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isFr ? 'Raison de la suspension' : 'Reason for suspension'}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  rows={4}
                  placeholder={isFr
                    ? 'Ex : Comportement inapproprié, non-respect des CGU…'
                    : 'Ex: Inappropriate behavior, terms violation…'}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {isFr
                    ? 'Cette raison sera envoyée à l\'utilisateur par email.'
                    : 'This reason will be sent to the user by email.'}
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendSuspendEmail}
                  onChange={e => setSendSuspendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  {isFr ? 'Envoyer un email de notification' : 'Send notification email'}
                </span>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSuspend}
                disabled={!!actionId || !suspendReason.trim()}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
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
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !actionId && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Supprimer ce signalement ?' : 'Delete this report?'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isFr ? 'Cette action est irréversible.' : 'This action is irreversible.'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
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
          className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !actionId && setDeleteReviewTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Supprimer cet avis ?' : 'Delete this review?'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isFr
                    ? 'L\'avis sera définitivement supprimé de la base. Cette action est irréversible.'
                    : 'The review will be permanently deleted from the database. This action is irreversible.'}
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-amber-800 leading-relaxed">
                💡 {isFr
                  ? 'Astuce : si vous voulez juste le cacher du public tout en gardant une trace, préférez "Masquer l\'avis" à la place.'
                  : 'Tip: if you just want to hide it from the public while keeping a trace, use "Hide review" instead.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteReviewTarget(null)}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleDeleteReview}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
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
          className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !actionId && setHideReviewTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
                <EyeOff className="w-5 h-5 text-slate-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Masquer cet avis ?' : 'Hide this review?'}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isFr
                    ? 'L\'avis ne sera plus visible publiquement, mais reste stocké en base pour audit.'
                    : 'The review will no longer be publicly visible, but stays stored for audit.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isFr ? 'Raison du masquage' : 'Hide reason'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={hideReason}
                onChange={e => setHideReason(e.target.value)}
                rows={3}
                placeholder={isFr
                  ? 'Ex : Contenu offensant, non conforme aux CGU…'
                  : 'Ex: Offensive content, terms violation…'}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {isFr
                  ? 'Cette raison est interne (visible uniquement par les admins).'
                  : 'This reason is internal (visible only by admins).'}
              </p>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setHideReviewTarget(null)}
                disabled={!!actionId}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleHideReview}
                disabled={!!actionId || !hideReason.trim()}
                className="flex-1 h-11 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
              >
                {actionId === hideReviewTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <EyeOff className="w-4 h-4" />}
                {isFr ? 'Masquer' : 'Hide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══ Sous-composants ═══ */

function StatusBadge({ status, isFr }: { status: string; isFr: boolean }) {
  const map: Record<string, { bg: string; text: string; labelFr: string; labelEn: string }> = {
    new:      { bg: 'bg-red-100',     text: 'text-red-700',     labelFr: 'Nouveau', labelEn: 'New' },
    seen:     { bg: 'bg-amber-100',   text: 'text-amber-700',   labelFr: 'Vu',      labelEn: 'Seen' },
    resolved: { bg: 'bg-emerald-100', text: 'text-emerald-700', labelFr: 'Résolu',  labelEn: 'Resolved' },
  };
  const cfg = map[status] || map.new;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
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
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-sm text-slate-400 italic">{fallback}</p>
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
  const initials = (
    (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
  ).toUpperCase() || user.email[0]?.toUpperCase() || '?';

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-sm font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900 truncate">{fullName}</p>
          <p className="text-xs text-slate-500 truncate">{user.email}</p>
          {showStatus && user.suspended_at && (
            <span className="inline-flex items-center gap-1 text-[10px] text-red-600 font-medium mt-1">
              <Ban className="w-2.5 h-2.5" />
              Suspendu
            </span>
          )}
        </div>
      </div>
    </div>
  );
}