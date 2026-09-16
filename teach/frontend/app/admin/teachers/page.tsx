'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  GraduationCap, Search, ChevronLeft, ChevronRight, Loader2,
  CheckCircle2, Clock, XCircle, Ban, Trash2, Eye, Filter,
  AlertCircle, Mail, X,
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
  fetch(
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

  // ✨ Nouveaux states pour la modale de refus
  const [rejectTarget, setRejectTarget] = useState<TeacherRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
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

  const counts = useMemo(() => ({
    all: teachers.length,
    pending: teachers.filter(t => t.verification_status === 'pending').length,
    verified: teachers.filter(t => t.verification_status === 'verified').length,
    rejected: teachers.filter(t => t.verification_status === 'rejected').length,
    suspended: teachers.filter(t => t.verification_status === 'suspended').length,
  }), [teachers]);

  // ─── Actions ───
  async function updateStatus(id: string, status: 'verified' | 'rejected', reason?: string) {
    setActionId(id);
    try {
      // ⚠️ On met à jour les 2 champs pour rester cohérent avec la recherche publique
      // (les pages /teachers et /teacher/[id] filtrent sur is_verified=true)
      const updates: any = { verification_status: status };
      if (status === 'rejected' && reason) {
        updates.rejected_reason = reason;
      }
      if (status === 'verified') {
        updates.verified_at = new Date().toISOString();
        updates.rejected_reason = null;
        updates.is_verified = true; // ✅ champ critique pour la recherche publique
      } else {
        updates.is_verified = false; // rejected, suspended → plus visible
      }

      const { error } = await supabase
        .from('teacher_profiles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      // Récupère l'email du prof pour notif (non bloquant)
      const target = teachers.find(t => t.id === id);
      if (target?.user?.email) {
        sendMail({
          action: status === 'verified' ? 'teacher-verified' : 'teacher-rejected',
          teacher_id: id,
          reason,
        });
      }

      setTeachers(prev => prev.map(t =>
        t.id === id ? { ...t, verification_status: status } : t
      ));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  async function handleSuspend() {
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      alert(isFr ? 'Indique une raison.' : 'Please provide a reason.');
      return;
    }
    setActionId(suspendTarget.id);
    try {
      const now = new Date().toISOString();

      // 1) update users : suspension globale
      const { error: err1 } = await supabase
        .from('users')
        .update({
          suspended_at: now,
          suspended_reason: suspendReason.trim(),
        })
        .eq('id', suspendTarget.id);
      if (err1) throw err1;

      // 2) update teacher_profiles : statut suspended + is_verified=false
      const { error: err2 } = await supabase
        .from('teacher_profiles')
        .update({
          verification_status: 'suspended',
          is_verified: false, // ✅ masqué de la recherche publique
        })
        .eq('id', suspendTarget.id);
      if (err2) throw err2;

      // 3) email (non bloquant)
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

      // ⚙️ Effets de bord : annuler les demandes en cours, notifier les contreparties
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

      // ⚠️ On réactive en remettant verified + is_verified=true
      const { error: err2 } = await supabase
        .from('teacher_profiles')
        .update({
          verification_status: 'verified',
          is_verified: true, // ✅ réapparaît dans la recherche publique
        })
        .eq('id', id);
      if (err2) throw err2;

      // Email réactivation (non bloquant)
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
      // ⚠️ ATTENTION : on supprime UNIQUEMENT le profil Teach
      // La table public.users est PARTAGÉE avec Jobs, Vitrine, Actoos ID
      // Ne JAMAIS la supprimer d'ici !

      // 1. Supprimer le profil teacher (Teach uniquement)
      const { error: err1 } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', deleteTarget.id);
      if (err1) throw err1;

      // 2. Supprimer aussi le profil parent s'il existe (Teach uniquement)
      await supabase.from('parent_profiles').delete().eq('id', deleteTarget.id);

      // 3. NE PAS toucher à auth.users ni public.users

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
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

            return (
              <div key={t.id} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {t.profile_photo_url ? (
                      <img src={t.profile_photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-700 text-sm font-bold">{initials}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <a
                        href={`/teachers/${t.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-900 hover:text-slate-600 truncate transition-colors"
                      >
                        {name}
                      </a>
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
                    <a
                      href={`/teachers/${t.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={isFr ? 'Voir le profil public' : 'View public profile'}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </a>

                    {t.verification_status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(t.id, 'verified')}
                          disabled={busy}
                          title={isFr ? 'Valider' : 'Approve'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => { setRejectTarget(t); setRejectReason(''); }}
                          disabled={busy}
                          title={isFr ? 'Refuser' : 'Reject'}
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {t.verification_status === 'verified' && !isSuspended && (
                      <button
                        onClick={() => setSuspendTarget(t)}
                        disabled={busy}
                        title={isFr ? 'Suspendre' : 'Suspend'}
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
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

      {/* ═══ MODALE REFUS ═══ */}
      {rejectTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
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

      {/* Modal Suspendre */}
      {suspendTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
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