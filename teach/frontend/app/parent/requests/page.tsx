'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Inbox, Clock, CheckCircle2, XCircle,
  ChevronRight, Calendar, Flag, Trash2, Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

const AUTH_FORM_TIMEOUT_MS = 800;

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>{children}</div>;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

interface LessonRequest {
  id: string;
  teacher_id: string;
  child_ids: string[] | null;
  child_id: string | null;
  subject: string | null;
  level: string | null;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'archived' | 'completed';
  created_at: string;
  teacher_response: string | null;
  teacher: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  } | null;
  teacher_profile: {
    headline: string | null;
    profile_photo_url: string | null;
  } | null;
}

const STATUS_CONFIG = {
  pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: Clock,        labelFr: 'En attente', labelEn: 'Pending' },
  accepted:  { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, labelFr: 'Acceptée',   labelEn: 'Accepted' },
  declined:  { bg: 'bg-red-100',     text: 'text-red-700',     icon: XCircle,      labelFr: 'Refusée',    labelEn: 'Declined' },
  archived:  { bg: 'bg-slate-100',   text: 'text-slate-600',   icon: Inbox,        labelFr: 'Archivée',   labelEn: 'Archived' },
  completed: { bg: 'bg-slate-200',   text: 'text-slate-700',   icon: Flag,         labelFr: 'Terminée',   labelEn: 'Completed' },
} as const;

const FALLBACK_STATUS = STATUS_CONFIG.pending;

export default function ParentRequestsPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const isFr = language === 'fr';

  const [requests, setRequests] = useState<LessonRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted' | 'declined' | 'completed'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authLoading && !authTimeoutExpired) return;
    if (!user?.id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, authTimeoutExpired]);

  async function load() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lesson_requests')
        .select('id, teacher_id, child_ids, child_id, subject, level, message, status, created_at, teacher_response, teacher:users!lesson_requests_teacher_id_fkey(first_name, last_name, avatar_url)')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[ParentRequests]', error);
        return;
      }

      const requestsList = (data || []) as unknown as LessonRequest[];

      if (requestsList.length > 0) {
        const teacherIds = [...new Set(requestsList.map(r => r.teacher_id))];
        const { data: profiles } = await supabase
          .from('teacher_profiles')
          .select('id, headline, profile_photo_url')
          .in('id', teacherIds);

        const profileMap: Record<string, any> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        requestsList.forEach(r => {
          r.teacher_profile = profileMap[r.teacher_id] || null;
        });
      }

      setRequests(requestsList);
    } catch (err) {
      console.error('[ParentRequests]', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function handleDelete(requestId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const msg = isFr
      ? 'Supprimer définitivement cette demande ?'
      : 'Permanently delete this request?';
    if (!confirm(msg)) return;

    setDeletingId(requestId);
    try {
      const { error } = await supabase
        .from('lesson_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setDeletingId(null);
    }
  }

  function formatRelative(iso: string) {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return isFr ? 'à l\'instant' : 'just now';
    if (mins < 60) return isFr ? `il y a ${mins} min` : `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return isFr ? `il y a ${hrs} h` : `${hrs} h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return isFr ? `il y a ${days} j` : `${days} d ago`;
    return d.toLocaleDateString(isFr ? 'fr-FR' : 'en-US');
  }

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);

  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    accepted: requests.filter(r => r.status === 'accepted').length,
    declined: requests.filter(r => r.status === 'declined').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (loading && !hasLoadedOnce) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <SkeletonLine className="h-4 w-20 mb-5" />
        <SkeletonLine className="h-8 w-64 mb-6" />
        <div className="space-y-3">
          {[0, 1, 2].map(i => <SkeletonLine key={i} className="h-24 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <button
        onClick={() => router.push('/dashboard')}
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isFr ? 'Retour au tableau de bord' : 'Back to dashboard'}
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isFr ? 'Mes demandes de cours' : 'My lesson requests'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isFr
            ? `${counts.pending} en attente · ${counts.accepted} acceptée${counts.accepted > 1 ? 's' : ''} · ${counts.completed} terminée${counts.completed > 1 ? 's' : ''}`
            : `${counts.pending} pending · ${counts.accepted} accepted · ${counts.completed} completed`}
        </p>
      </div>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {([
          { key: 'all',       labelFr: 'Toutes',     labelEn: 'All' },
          { key: 'pending',   labelFr: 'En attente', labelEn: 'Pending' },
          { key: 'accepted',  labelFr: 'Acceptées',  labelEn: 'Accepted' },
          { key: 'declined',  labelFr: 'Refusées',   labelEn: 'Declined' },
          { key: 'completed', labelFr: 'Terminées',  labelEn: 'Completed' },
        ] as const).map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
              filter === f.key
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-red-400 hover:text-red-500'
            }`}
          >
            {isFr ? f.labelFr : f.labelEn}
            <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
              <Inbox className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {filter === 'all'
                ? isFr ? 'Aucune demande' : 'No request'
                : isFr ? 'Aucune demande dans ce filtre' : 'No request in this filter'}
            </h2>
            <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto">
              {isFr
                ? 'Trouvez un prof et envoyez-lui une demande de cours.'
                : 'Find a teacher and send them a lesson request.'}
            </p>
            <Link href="/teachers" prefetch>
              <PrimaryButton>
                {isFr ? 'Trouver un prof' : 'Find a teacher'}
              </PrimaryButton>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? FALLBACK_STATUS;
            const StatusIcon = cfg.icon;
            const teacherName = [req.teacher?.first_name, req.teacher?.last_name].filter(Boolean).join(' ') || '—';
            const initials = teacherName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();
            const photoUrl = req.teacher_profile?.profile_photo_url || req.teacher?.avatar_url;
            const canDelete = ['completed', 'declined', 'archived'].includes(req.status);
            const isDeleting = deletingId === req.id;

            return (
              <div
                key={req.id}
                className="relative group bg-white rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-md transition-all"
              >
                <Link
                  href={`/parent/requests/${req.id}`}
                  prefetch
                  className="block p-4 sm:p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {photoUrl ? (
                        <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-red-600 text-sm font-bold">{initials}</span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-slate-900 truncate group-hover:text-red-500 transition-colors">
                          {teacherName}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {isFr ? cfg.labelFr : cfg.labelEn}
                        </span>
                      </div>

                      {req.teacher_profile?.headline && (
                        <p className="text-xs text-slate-500 truncate">
                          {req.teacher_profile.headline}
                        </p>
                      )}

                      {req.subject && (
                        <p className="text-sm text-slate-600 truncate mt-1">
                          {req.subject}
                          {req.level && <span className="text-slate-400"> · {req.level}</span>}
                        </p>
                      )}

                      <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatRelative(req.created_at)}
                      </p>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>
                </Link>

                {canDelete && (
                  <button
                    onClick={(e) => handleDelete(req.id, e)}
                    disabled={isDeleting}
                    aria-label={isFr ? 'Supprimer' : 'Delete'}
                    className="absolute top-3 right-12 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}