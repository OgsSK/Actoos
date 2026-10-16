'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, Clock, XCircle, Ban, Trash2, Eye, Filter,
  AlertCircle, Mail, X, MapPin, BookOpen, TrendingUp, Heart,
  Monitor, Home, Star, User, Calendar, CheckSquare, Square,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { handleSuspensionSideEffects } from '@/lib/suspension';


interface TeacherRow {
  id: string;
  headline: string | null;
  profile_photo_url: string | null;
  verification_status: string | null;
  is_available: boolean | null;
  created_at: string;
  user: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    suspended_at: string | null;
    suspended_reason: string | null;
  } | null;
}

interface PreviewData {
  profile: any;
  subjects: { id: string; name_fr: string; name_en: string }[];
  levels: { id: string; name_fr: string; name_en: string }[];
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected' | 'suspended';

const PER_PAGE = 20;

function formatRelative(iso: string, isFr: boolean) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return isFr ? 'à l\'instant' : 'just now';
  if (mins < 60) return isFr ? `il y a ${mins} min` : `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isFr ? `il y a ${hrs} h` : `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return isFr ? `il y a ${days} j` : `${days} d ago`;
  return d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US');
}

function formatRate(amount: number | null, period: string | null, isFr: boolean) {
  if (!amount) return null;
  const fmt = new Intl.NumberFormat('fr-FR').format(amount);
  const suffixMap: Record<string, { fr: string; en: string }> = {
    hourly: { fr: 'FCFA / h', en: 'FCFA / hr' },
    session: { fr: 'FCFA / séance', en: 'FCFA / session' },
    weekly: { fr: 'FCFA / sem', en: 'FCFA / wk' },
    monthly: { fr: 'FCFA / mois', en: 'FCFA / mo' },
  };
  const key = period || 'hourly';
  const suffix = suffixMap[key] ? (isFr ? suffixMap[key].fr : suffixMap[key].en) : 'FCFA';
  return `${fmt} ${suffix}`;
}

function modeLabel(mode: string | null, isFr: boolean) {
  if (!mode) return null;
  const map: Record<string, { fr: string; en: string }> = {
    home: { fr: 'À domicile', en: 'At home' },
    online: { fr: 'En ligne', en: 'Online' },
    both: { fr: 'Domicile & en ligne', en: 'Home & online' },
  };
  const m = map[mode];
  return m ? (isFr ? m.fr : m.en) : mode;
}

function StatusBadge({ status, isFr }: { status: string | null; isFr: boolean }) {
  const config = {
    pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: Clock,        labelFr: 'En attente', labelEn: 'Pending' },
    verified:  { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, labelFr: 'Vérifié',    labelEn: 'Verified' },
    rejected:  { bg: 'bg-red-100',     text: 'text-red-700',     icon: XCircle,      labelFr: 'Refusé',     labelEn: 'Rejected' },
    suspended: { bg: 'bg-slate-200',   text: 'text-slate-700',   icon: Ban,          labelFr: 'Suspendu',   labelEn: 'Suspended' },
  } as const;
  const cfg = config[status as keyof typeof config] ?? config.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      <Icon className="w-3 h-3" />
      {isFr ? cfg.labelFr : cfg.labelEn}
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// HELPER — appel non bloquant à la fonction email
// ═══════════════════════════════════════════════════════
function sendMail(payload: Record<string, any>) {
  return fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload),
    }
  ).catch((e) => console.warn('[Email] Non envoyé:', e));
}

function AdminTeachers() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const isFr = language === 'fr';

  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  );
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);

  const [actionId, setActionId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<TeacherRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [sendSuspendEmail, setSendSuspendEmail] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<TeacherRow | null>(null);

  // Modale de refus (simple)
  const [rejectTarget, setRejectTarget] = useState<TeacherRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Modale d'aperçu du profil
  const [previewTarget, setPreviewTarget] = useState<TeacherRow | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ✨ Bulk selection + bulk reject
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAccepting, setBulkAccepting] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, action: '' as '' | 'accept' | 'reject' });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [filter, search]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .select(`
          id, headline, profile_photo_url, verification_status, is_available, created_at,
          user:users!teacher_profiles_id_fkey(
            first_name, last_name, email, suspended_at, suspended_reason
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AdminTeachers]', error);
        setTeachers([]);
        return;
      }
      setTeachers((data || []) as unknown as TeacherRow[]);
    } finally {
      setLoading(false);
    }
  }

  // ─── Chargement de l'aperçu d'un profil ───
  async function openPreview(t: TeacherRow) {
    setPreviewTarget(t);
    setPreviewLoading(true);
    setPreviewData(null);
    try {
      const [profileRes, subjectsRes, levelsRes] = await Promise.all([
        supabase
          .from('teacher_profiles')
          .select(`
            id, headline, bio, hourly_rate, rate_period, teaching_mode,
            profile_photo_url, cover_url, is_verified, experience_years,
            city_id, rating_avg, rating_count, verification_status, created_at,
            user:users!teacher_profiles_id_fkey(first_name, last_name, email, language),
            city:cities(id, name)
          `)
          .eq('id', t.id)
          .single(),
        supabase
          .from('teacher_subjects')
          .select('subjects(id, name_fr, name_en)')
          .eq('teacher_id', t.id),
        supabase
          .from('teacher_levels')
          .select('levels(id, name_fr, name_en)')
          .eq('teacher_id', t.id),
      ]);

      const subjects = (subjectsRes.data || [])
        .flatMap((r: any) => Array.isArray(r.subjects) ? r.subjects : [r.subjects])
        .filter(Boolean);

      const levels = (levelsRes.data || [])
        .flatMap((r: any) => Array.isArray(r.levels) ? r.levels : [r.levels])
        .filter(Boolean);

      setPreviewData({
        profile: profileRes.data,
        subjects,
        levels,
      });
    } catch (err) {
      console.error('[AdminTeachers] openPreview', err);
    } finally {
      setPreviewLoading(false);
    }
  }

  // ─── Filtres locaux ───
  const filtered = useMemo(() => {
    let list = teachers;

    if (filter !== 'all') {
      list = list.filter(t => t.verification_status === filter);
    }

    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(t => {
        const name = [t.user?.first_name, t.user?.last_name].filter(Boolean).join(' ').toLowerCase();
        const email = (t.user?.email || '').toLowerCase();
        const headline = (t.headline || '').toLowerCase();
        return name.includes(kw) || email.includes(kw) || headline.includes(kw);
      });
    }

    return list;
  }, [teachers, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  // Pending sur la page courante (pour "Tout sélectionner" + select-all header)
  const pendingOnPage = useMemo(
    () => paginated.filter(t => t.verification_status === 'pending').map(t => t.id),
    [paginated]
  );

  const allPendingOnPageSelected = pendingOnPage.length > 0 && pendingOnPage.every(id => selectedIds.has(id));

  const counts = useMemo(() => ({
    all: teachers.length,
    pending: teachers.filter(t => t.verification_status === 'pending').length,
    verified: teachers.filter(t => t.verification_status === 'verified').length,
    rejected: teachers.filter(t => t.verification_status === 'rejected').length,
    suspended: teachers.filter(t => t.verification_status === 'suspended').length,
  }), [teachers]);

  // ─── Sélection ───
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allPendingOnPageSelected) {
        pendingOnPage.forEach(id => next.delete(id));
      } else {
        pendingOnPage.forEach(id => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  // ─── Actions ───
  async function updateStatus(id: string, status: 'verified' | 'rejected' | 'pending', reason?: string) {
    setActionId(id);
    try {
      const updates: any = { verification_status: status };
      if (status === 'rejected' && reason) {
        updates.rejected_reason = reason;
      }
      if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        updates.rejected_reason = null;
        updates.is_verified = true;
      } else if (status === 'pending') {
        updates.verified_at = null;
        updates.rejected_reason = null;
        updates.is_verified = false;
      } else {
        updates.is_verified = false;
      }

      const { error } = await supabase
        .from('teacher_profiles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      const target = teachers.find(t => t.id === id);
      if (target?.user?.email && (status === 'verified' || status === 'rejected')) {
        sendMail({
          action: status === 'verified' ? 'teacher-verified' : 'teacher-rejected',
          teacher_id: id,
          reason,
        });
      }

      setTeachers(prev => prev.map(t =>
        t.id === id ? { ...t, verification_status: status } : t
      ));

      if (previewTarget?.id === id) {
        setPreviewTarget(null);
        setPreviewData(null);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  // ─── Bulk accept ───
  async function handleBulkAccept() {
    const ids = Array.from(selectedIds).filter(id => {
      const t = teachers.find(x => x.id === id);
      return t?.verification_status === 'pending';
    });

    if (ids.length === 0) return;

    const confirmed = window.confirm(
      isFr
        ? `Accepter ${ids.length} prof${ids.length > 1 ? 's' : ''} en une fois ?\n\nIls seront immédiatement visibles publiquement et recevront un email.`
        : `Approve ${ids.length} teacher${ids.length > 1 ? 's' : ''} at once?\n\nThey will be immediately visible publicly and will receive an email.`
    );
    if (!confirmed) return;

    setBulkAccepting(true);
    setBulkProgress({ done: 0, total: ids.length, action: 'accept' });

    const now = new Date().toISOString();
    let done = 0;

    for (const id of ids) {
      try {
        const { error } = await supabase
          .from('teacher_profiles')
          .update({
            verification_status: 'verified',
            verified_at: now,
            rejected_reason: null,
            is_verified: true,
          })
          .eq('id', id);

        if (!error) {
          // Envoie l'email (non bloquant)
          sendMail({ action: 'teacher-verified', teacher_id: id });
          done++;
          setBulkProgress({ done, total: ids.length, action: 'accept' });
        }
      } catch (err) {
        console.error('[bulk accept]', id, err);
      }

      // Petite pause pour éviter de saturer
      await new Promise(r => setTimeout(r, 120));
    }

    // Mise à jour locale
    setTeachers(prev => prev.map(t =>
      ids.includes(t.id) ? { ...t, verification_status: 'verified' } : t
    ));

    setBulkAccepting(false);
    setSelectedIds(new Set());
    setBulkProgress({ done: 0, total: 0, action: '' });

    alert(
      isFr
        ? `✅ ${done} prof${done > 1 ? 's' : ''} validé${done > 1 ? 's' : ''}.`
        : `✅ ${done} teacher${done > 1 ? 's' : ''} approved.`
    );
  }

  // ─── Bulk reject ───
  async function handleBulkReject() {
    const ids = Array.from(selectedIds).filter(id => {
      const t = teachers.find(x => x.id === id);
      return t?.verification_status === 'pending';
    });

    if (ids.length === 0) return;
    if (!bulkRejectReason.trim()) return;

    setBulkRejectOpen(false);
    setBulkAccepting(true);
    setBulkProgress({ done: 0, total: ids.length, action: 'reject' });

    let done = 0;

    for (const id of ids) {
      try {
        const { error } = await supabase
          .from('teacher_profiles')
          .update({
            verification_status: 'rejected',
            rejected_reason: bulkRejectReason.trim(),
            is_verified: false,
          })
          .eq('id', id);

        if (!error) {
          sendMail({
            action: 'teacher-rejected',
            teacher_id: id,
            reason: bulkRejectReason.trim(),
          });
          done++;
          setBulkProgress({ done, total: ids.length, action: 'reject' });
        }
      } catch (err) {
        console.error('[bulk reject]', id, err);
      }

      await new Promise(r => setTimeout(r, 120));
    }

    setTeachers(prev => prev.map(t =>
      ids.includes(t.id) ? { ...t, verification_status: 'rejected' } : t
    ));

    setBulkAccepting(false);
    setSelectedIds(new Set());
    setBulkRejectReason('');
    setBulkProgress({ done: 0, total: 0, action: '' });

    alert(
      isFr
        ? `✅ ${done} prof${done > 1 ? 's' : ''} refusé${done > 1 ? 's' : ''}.`
        : `✅ ${done} teacher${done > 1 ? 's' : ''} rejected.`
    );
  }

  // ─── Suspendre ───
  async function handleSuspend() {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      alert(isFr ? 'Indique une raison.' : 'Please provide a reason.');
      return;
    }
    setActionId(suspendTarget.id);
    try {
      const now = new Date().toISOString();

      const { error: err1 } = await supabase
        .from('users')
        .update({
          suspended_at: now,
          suspended_reason: suspendReason.trim(),
        })
        .eq('id', suspendTarget.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('teacher_profiles')
        .update({
          verification_status: 'suspended',
          is_verified: false,
        })
        .eq('id', suspendTarget.id);
      if (err2) throw err2;

      if (sendSuspendEmail) {
        sendMail({
          action: 'account-suspended',
          user_id: suspendTarget.id,
          reason: suspendReason.trim(),
        });
      }

      setTeachers(prev => prev.map(t =>
        t.id === suspendTarget.id
          ? {
              ...t,
              verification_status: 'suspended',
              user: t.user ? {
                ...t.user,
                suspended_at: now,
                suspended_reason: suspendReason.trim(),
              } : null,
            }
          : t
      ));

      try {
        await handleSuspensionSideEffects(suspendTarget.id);
      } catch (e) {
        console.warn('[AdminTeachers] suspension side effects failed:', e);
      }

      setSuspendTarget(null);
      setSuspendReason('');
      setSendSuspendEmail(true);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleReactivate(id: string) {
    setActionId(id);
    try {
      const { error: err1 } = await supabase
        .from('users')
        .update({ suspended_at: null, suspended_reason: null })
        .eq('id', id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from('teacher_profiles')
        .update({
          verification_status: 'verified',
          is_verified: true,
        })
        .eq('id', id);
      if (err2) throw err2;

      sendMail({
        action: 'account-reactivated',
        user_id: id,
      });

      setTeachers(prev => prev.map(t =>
        t.id === id
          ? {
              ...t,
              verification_status: 'verified',
              user: t.user ? { ...t.user, suspended_at: null, suspended_reason: null } : null,
            }
          : t
      ));
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
      const { error: err1 } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', deleteTarget.id);
      if (err1) throw err1;

      await supabase.from('parent_profiles').delete().eq('id', deleteTarget.id);

      setTeachers(prev => prev.filter(t => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  const filterTabs: Array<{ key: StatusFilter; labelFr: string; labelEn: string; count: number }> = [
    { key: 'all',       labelFr: 'Tous',       labelEn: 'All',       count: counts.all },
    { key: 'pending',   labelFr: 'En attente', labelEn: 'Pending',   count: counts.pending },
    { key: 'verified',  labelFr: 'Vérifiés',   labelEn: 'Verified',  count: counts.verified },
    { key: 'rejected',  labelFr: 'Refusés',    labelEn: 'Rejected',  count: counts.rejected },
    { key: 'suspended', labelFr: 'Suspendus',  labelEn: 'Suspended', count: counts.suspended },
  ];

  const pendingSelectedCount = Array.from(selectedIds).filter(id => {
    const t = teachers.find(x => x.id === id);
    return t?.verification_status === 'pending';
  }).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 pb-32">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-sm">
          <GraduationCap className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 truncate">
            {isFr ? 'Gestion des professeurs' : 'Teacher management'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr
              ? `${counts.all} professeur${counts.all > 1 ? 's' : ''} au total`
              : `${counts.all} teacher${counts.all !== 1 ? 's' : ''} total`}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {filterTabs.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {isFr ? f.labelFr : f.labelEn}
            <span className="ml-1.5 opacity-70">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isFr ? 'Rechercher par nom, email, titre…' : 'Search by name, email, headline…'}
          className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* Select-all header (uniquement si des pending sur la page) */}
      {pendingOnPage.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-1">
          <button
            onClick={toggleSelectAllOnPage}
            className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
          >
            {allPendingOnPageSelected ? (
              <CheckSquare className="w-4 h-4 text-slate-900" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            {isFr
              ? `${allPendingOnPageSelected ? 'Désélectionner' : 'Sélectionner'} les ${pendingOnPage.length} en attente de cette page`
              : `${allPendingOnPageSelected ? 'Deselect' : 'Select'} ${pendingOnPage.length} pending on this page`}
          </button>
        </div>
      )}

      {/* Liste */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {isFr ? 'Aucun prof ne correspond à ces filtres.' : 'No teacher matches these filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map(t => {
            const name = [t.user?.first_name, t.user?.last_name].filter(Boolean).join(' ') || '—';
            const initials = name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
            const isSuspended = Boolean(t.user?.suspended_at);
            const busy = actionId === t.id;
            const isPending = t.verification_status === 'pending';
            const isSelected = selectedIds.has(t.id);

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border p-4 sm:p-5 transition-colors ${
                  isSelected && isPending
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox (uniquement pour les pending) */}
                  {isPending ? (
                    <button
                      onClick={() => toggleSelect(t.id)}
                      disabled={bulkAccepting}
                      className="mt-1 shrink-0 disabled:opacity-50"
                      aria-label={isSelected ? 'Désélectionner' : 'Sélectionner'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-slate-900" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                      )}
                    </button>
                  ) : (
                    <div className="w-5 shrink-0" />
                  )}

                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {t.profile_photo_url ? (
                      <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-700 text-sm font-bold">{initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <button
                        onClick={() => openPreview(t)}
                        className="font-semibold text-slate-900 hover:text-slate-600 truncate transition-colors text-left"
                      >
                        {name}
                      </button>
                      <StatusBadge status={t.verification_status} isFr={isFr} />
                      {isSuspended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          <Ban className="w-3 h-3" />
                          {isFr ? 'Suspendu' : 'Suspended'}
                        </span>
                      )}
                    </div>

                    {t.headline && (
                      <p className="text-sm text-slate-600 truncate">{t.headline}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                      {t.user?.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3" />
                          {t.user.email}
                        </span>
                      )}
                      <span>{formatRelative(t.created_at, isFr)}</span>
                    </div>

                    {isSuspended && t.user?.suspended_reason && (
                      <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-800">
                        <span className="font-semibold">{isFr ? 'Raison : ' : 'Reason: '}</span>
                        {t.user.suspended_reason}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    <button
                      onClick={() => openPreview(t)}
                      title={isFr ? 'Aperçu du profil' : 'Preview profile'}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {t.verification_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(t.id, 'verified')}
                          disabled={busy || bulkAccepting}
                          title={isFr ? 'Valider' : 'Approve'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setRejectTarget(t); setRejectReason(''); }}
                          disabled={busy || bulkAccepting}
                          title={isFr ? 'Refuser' : 'Reject'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {t.verification_status === 'rejected' && (
                      <>
                        {/* Repêcher : accepter directement AVEC mail */}
                        <button
                          onClick={() => {
                            if (confirm(isFr
                              ? 'Repêcher ce prof ? Il sera immédiatement validé et recevra un email de confirmation.'
                              : 'Restore this teacher? They will be immediately verified and receive a confirmation email.')) {
                              updateStatus(t.id, 'verified');
                            }
                          }}
                          disabled={busy}
                          title={isFr ? 'Repêcher (accepter + email)' : 'Restore (approve + email)'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>

                        {/* Remettre en attente SANS mail */}
                        <button
                          onClick={() => {
                            if (confirm(isFr
                              ? 'Remettre ce prof en attente de vérification ? Aucun email ne sera envoyé.'
                              : 'Put this teacher back to pending? No email will be sent.')) {
                              updateStatus(t.id, 'pending');
                            }
                          }}
                          disabled={busy}
                          title={isFr ? 'Remettre en attente (sans email)' : 'Back to pending (no email)'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        </button>
                      </>
                    )}

                    {t.verification_status === 'verified' && !isSuspended && (
                      <>
                        <button
                          onClick={() => {
                            if (confirm(isFr
                              ? 'Remettre ce prof en attente de vérification ? Il sera masqué de la recherche publique.'
                              : 'Put this teacher back to pending? They will be hidden from public search.')) {
                              updateStatus(t.id, 'pending');
                            }
                          }}
                          disabled={busy}
                          title={isFr ? 'Remettre en attente' : 'Back to pending'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setSuspendTarget(t)}
                          disabled={busy}
                          title={isFr ? 'Suspendre' : 'Suspend'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {isSuspended && (
                      <button
                        onClick={() => handleReactivate(t.id)}
                        disabled={busy}
                        title={isFr ? 'Réactiver' : 'Reactivate'}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      onClick={() => setDeleteTarget(t)}
                      disabled={busy}
                      title={isFr ? 'Supprimer' : 'Delete'}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {isFr ? 'Précédent' : 'Previous'}
          </button>

          <span className="text-xs text-slate-500 tabular-nums">
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-slate-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isFr ? 'Suivant' : 'Next'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ═══ BARRE FLOTTANTE ACTIONS GROUPÉES ═══ */}
      {pendingSelectedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white shadow-2xl border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            {bulkAccepting ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {bulkProgress.action === 'accept'
                      ? (isFr ? 'Validation en cours…' : 'Approving…')
                      : (isFr ? 'Refus en cours…' : 'Rejecting…')}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {bulkProgress.done} / {bulkProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{
                      width: `${bulkProgress.total > 0 ? (bulkProgress.done / bulkProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold">{pendingSelectedCount}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {isFr
                        ? `${pendingSelectedCount} prof${pendingSelectedCount > 1 ? 's' : ''} en attente sélectionné${pendingSelectedCount > 1 ? 's' : ''}`
                        : `${pendingSelectedCount} pending teacher${pendingSelectedCount > 1 ? 's' : ''} selected`}
                    </p>
                    <button
                      onClick={clearSelection}
                      className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {isFr ? 'Tout désélectionner' : 'Deselect all'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setBulkRejectOpen(true); setBulkRejectReason(''); }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl border border-red-500 text-red-400 hover:bg-red-500/10 text-sm font-medium transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    {isFr ? 'Refuser' : 'Reject'}
                  </button>
                  <button
                    onClick={handleBulkAccept}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {isFr ? 'Accepter' : 'Approve'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODALE APERÇU PROFIL ═══ */}
      {previewTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4"
          onClick={() => setPreviewTarget(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden shadow-xl flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 truncate">
                    {isFr ? 'Aperçu du profil' : 'Profile preview'}
                  </h3>
                  <p className="text-xs text-slate-500 truncate">
                    {[previewTarget.user?.first_name, previewTarget.user?.last_name].filter(Boolean).join(' ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewTarget(null)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {previewLoading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto" />
                </div>
              ) : !previewData?.profile ? (
                <div className="py-20 text-center text-sm text-slate-500">
                  {isFr ? 'Impossible de charger le profil.' : 'Failed to load profile.'}
                </div>
              ) : (
                <>
                  <div className="relative">
                    <div className="relative w-full h-32 sm:h-40 bg-slate-100 overflow-hidden">
                      {previewData.profile.cover_url ? (
                        <img
                          src={previewData.profile.cover_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : previewData.profile.profile_photo_url ? (
                        <>
                          <img
                            src={previewData.profile.profile_photo_url}
                            alt=""
                            className="w-full h-full object-cover blur-sm scale-110"
                          />
                          <div className="absolute inset-0 bg-slate-900/30" />
                        </>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-red-100 via-slate-100 to-red-50" />
                      )}
                    </div>

                    <div className="px-5 sm:px-6 -mt-10 sm:-mt-12 relative">
                      <div className="flex items-end gap-4">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border-4 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
                          {previewData.profile.profile_photo_url ? (
                            <img
                              src={previewData.profile.profile_photo_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-xl font-bold">
                              {(previewTarget.user?.first_name?.[0] || previewTarget.user?.email?.[0] || '?').toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-lg font-bold text-slate-900 truncate">
                              {[previewTarget.user?.first_name, previewTarget.user?.last_name].filter(Boolean).join(' ') || '—'}
                            </h4>
                            <StatusBadge status={previewData.profile.verification_status} isFr={isFr} />
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">
                            {previewTarget.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-5">

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                        {isFr ? 'Titre du profil' : 'Profile headline'}
                      </p>
                      {previewData.profile.headline ? (
                        <p className="text-sm text-slate-800 font-medium">
                          {previewData.profile.headline}
                        </p>
                      ) : (
                        <p className="text-sm text-red-500 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isFr ? 'Non renseigné' : 'Missing'}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                        {isFr ? 'Biographie' : 'Biography'}
                      </p>
                      {previewData.profile.bio ? (
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {previewData.profile.bio}
                        </p>
                      ) : (
                        <p className="text-sm text-red-500 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isFr ? 'Non renseignée' : 'Missing'}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5">
                          <Heart className="w-3 h-3" />
                          {isFr ? 'Tarif' : 'Rate'}
                        </p>
                        {previewData.profile.hourly_rate ? (
                          <p className="text-sm font-semibold text-slate-900">
                            {formatRate(previewData.profile.hourly_rate, previewData.profile.rate_period, isFr)}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500 italic">
                            {isFr ? 'Non renseigné' : 'Missing'}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5">
                          <Home className="w-3 h-3" />
                          {isFr ? 'Mode' : 'Mode'}
                        </p>
                        {previewData.profile.teaching_mode ? (
                          <p className="text-sm font-semibold text-slate-900">
                            {modeLabel(previewData.profile.teaching_mode, isFr)}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500 italic">
                            {isFr ? 'Non renseigné' : 'Missing'}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {isFr ? 'Ville' : 'City'}
                        </p>
                        {previewData.profile.city?.name ? (
                          <p className="text-sm font-semibold text-slate-900">
                            {previewData.profile.city.name}
                          </p>
                        ) : (
                          <p className="text-sm text-red-500 italic">
                            {isFr ? 'Non renseignée' : 'Missing'}
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1 flex items-center gap-1.5">
                          <Star className="w-3 h-3" />
                          {isFr ? 'Expérience' : 'Experience'}
                        </p>
                        {previewData.profile.experience_years ? (
                          <p className="text-sm font-semibold text-slate-900">
                            {previewData.profile.experience_years} {isFr ? 'an' : 'yr'}
                            {previewData.profile.experience_years > 1 ? 's' : ''}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-400">
                            {isFr ? 'Non renseignée' : 'Not set'}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3" />
                        {isFr ? 'Matières enseignées' : 'Subjects taught'}
                      </p>
                      {previewData.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {previewData.subjects.map(s => (
                            <span
                              key={s.id}
                              className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium"
                            >
                              {isFr ? s.name_fr : s.name_en}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-red-500 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isFr ? 'Aucune matière sélectionnée' : 'No subject selected'}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3" />
                        {isFr ? 'Niveaux scolaires' : 'Grade levels'}
                      </p>
                      {previewData.levels.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {previewData.levels.map(l => (
                            <span
                              key={l.id}
                              className="inline-flex items-center text-xs text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-lg font-medium"
                            >
                              {isFr ? l.name_fr : l.name_en}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-red-500 italic flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {isFr ? 'Aucun niveau sélectionné' : 'No level selected'}
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      {isFr ? 'Inscrit' : 'Joined'} {formatRelative(previewData.profile.created_at, isFr)}
                    </div>
                  </div>
                </>
              )}
            </div>

            {previewData?.profile && (
              <div className="border-t border-slate-200 p-4 flex items-center justify-end gap-2 shrink-0 bg-white flex-wrap">
                {previewData.profile.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setRejectTarget(previewTarget);
                        setRejectReason('');
                      }}
                      disabled={actionId === previewTarget.id}
                      className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {isFr ? 'Refuser' : 'Reject'}
                    </button>
                    <button
                      onClick={() => updateStatus(previewTarget.id, 'verified')}
                      disabled={actionId === previewTarget.id}
                      className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                      {actionId === previewTarget.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      {isFr ? 'Valider' : 'Approve'}
                    </button>
                  </>
                )}

                {previewData.profile.verification_status === 'rejected' && (
                  <>
                    <button
                      onClick={() => {
                        if (confirm(isFr
                          ? 'Remettre ce prof en attente de vérification ? Aucun email ne sera envoyé.'
                          : 'Put this teacher back to pending? No email will be sent.')) {
                          updateStatus(previewTarget.id, 'pending');
                        }
                      }}
                      disabled={actionId === previewTarget.id}
                      className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <Clock className="w-4 h-4" />
                      {isFr ? 'Remettre en attente' : 'Back to pending'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(isFr
                          ? 'Repêcher ce prof ? Il sera immédiatement validé et recevra un email.'
                          : 'Restore this teacher? They will be immediately verified and receive an email.')) {
                          updateStatus(previewTarget.id, 'verified');
                        }
                      }}
                      disabled={actionId === previewTarget.id}
                      className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                      {actionId === previewTarget.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle2 className="w-4 h-4" />}
                      {isFr ? 'Repêcher' : 'Restore'}
                    </button>
                  </>
                )}

                {previewData.profile.verification_status === 'verified' && (
                  <button
                    onClick={() => {
                      if (confirm(isFr
                        ? 'Remettre ce prof en attente de vérification ? Il sera masqué de la recherche publique.'
                        : 'Put this teacher back to pending? They will be hidden from public search.')) {
                        updateStatus(previewTarget.id, 'pending');
                      }
                    }}
                    disabled={actionId === previewTarget.id}
                    className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    {isFr ? 'Remettre en attente' : 'Back to pending'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MODALE REFUS SIMPLE ═══ */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => actionId !== rejectTarget.id && setRejectTarget(null)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Refuser ce profil ?' : 'Reject this profile?'}
                </h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {rejectTarget.user?.email}
                </p>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                disabled={actionId === rejectTarget.id}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isFr ? 'Raison du refus' : 'Reason for rejection'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={4}
                placeholder={isFr
                  ? 'Ex : Profil incomplet, diplômes non vérifiables…'
                  : 'Ex: Incomplete profile, unverifiable diplomas…'}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {isFr
                  ? 'Le prof recevra cette raison par email et pourra retenter sa candidature.'
                  : 'The teacher will receive this reason by email and can retry their application.'}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRejectTarget(null)}
                disabled={actionId === rejectTarget.id}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={async () => {
                  await updateStatus(rejectTarget.id, 'rejected', rejectReason.trim());
                  setRejectTarget(null);
                  setRejectReason('');
                  setPreviewTarget(null);
                }}
                disabled={actionId === rejectTarget.id || !rejectReason.trim()}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {actionId === rejectTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                {isFr ? 'Refuser' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ MODALE REFUS GROUPÉ ═══ */}
      {bulkRejectOpen && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setBulkRejectOpen(false)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr
                    ? `Refuser ${pendingSelectedCount} prof${pendingSelectedCount > 1 ? 's' : ''} ?`
                    : `Reject ${pendingSelectedCount} teacher${pendingSelectedCount > 1 ? 's' : ''}?`}
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {isFr
                    ? 'La même raison sera envoyée à tous.'
                    : 'The same reason will be sent to all.'}
                </p>
              </div>
              <button
                onClick={() => setBulkRejectOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {isFr ? 'Raison du refus (commune)' : 'Rejection reason (shared)'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={bulkRejectReason}
                onChange={e => setBulkRejectReason(e.target.value)}
                rows={4}
                placeholder={isFr
                  ? 'Ex : Profil incomplet — merci de compléter votre bio, vos matières et votre tarif avant de resoumettre.'
                  : 'Ex: Incomplete profile — please complete your bio, subjects and rate before resubmitting.'}
                className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none"
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-1.5">
                {isFr
                  ? `Les ${pendingSelectedCount} profs recevront ce même message par email.`
                  : `All ${pendingSelectedCount} teachers will receive this same message by email.`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setBulkRejectOpen(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleBulkReject}
                disabled={!bulkRejectReason.trim()}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                {isFr
                  ? `Refuser ${pendingSelectedCount}`
                  : `Reject ${pendingSelectedCount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suspendre */}
      {suspendTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => actionId !== suspendTarget.id && setSuspendTarget(null)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {isFr ? 'Suspendre ce prof' : 'Suspend this teacher'}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  {[suspendTarget.user?.first_name, suspendTarget.user?.last_name].filter(Boolean).join(' ')}
                </p>
              </div>
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={actionId === suspendTarget.id}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {isFr ? 'Raison *' : 'Reason *'}
                </label>
                <textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder={isFr
                    ? 'Ex : Comportement inapproprié signalé à plusieurs reprises…'
                    : 'E.g. Repeated inappropriate behavior reported…'}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
                <p className="text-xs text-slate-400 mt-1 text-right">{suspendReason.length}/500</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendSuspendEmail}
                  onChange={e => setSendSuspendEmail(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm text-slate-700">
                  {isFr ? 'Envoyer un email d\'information au prof' : 'Send a notification email to the teacher'}
                </span>
              </label>
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={actionId === suspendTarget.id}
                className="px-4 h-10 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionId === suspendTarget.id || !suspendReason.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {actionId === suspendTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                {isFr ? 'Suspendre' : 'Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => actionId !== deleteTarget.id && setDeleteTarget(null)}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {isFr ? 'Supprimer le profil enseignant ?' : 'Delete teacher profile?'}
              </h3>
              <p className="text-sm text-slate-500 mb-1">
                {[deleteTarget.user?.first_name, deleteTarget.user?.last_name].filter(Boolean).join(' ')}
              </p>
              <p className="text-xs text-red-600 mt-3 leading-relaxed">
                {isFr
                  ? 'Cette action supprime UNIQUEMENT le profil enseignant sur Kalanden. Le compte Actoos ID reste actif sur les autres produits (Jobs, Vitrine). L\'utilisateur pourra se réinscrire sur Kalanden plus tard.'
                  : 'This action deletes ONLY the teacher profile on Kalanden. The Actoos ID account remains active on other products (Jobs, Vitrine). The user can re-register on Kalanden later.'}
              </p>
            </div>
            <div className="border-t border-slate-200 p-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={actionId === deleteTarget.id}
                className="px-4 h-10 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleDelete}
                disabled={actionId === deleteTarget.id}
                className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
              >
                {actionId === deleteTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isFr ? 'Supprimer' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTeachersPage() {
  return <AdminTeachers />;
}