'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search, Users, GraduationCap, Baby, Ban, RotateCcw,
  Loader2, Mail, ChevronLeft, ChevronRight, X, AlertTriangle,
  Calendar, ShieldCheck, Clock,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { handleSuspensionSideEffects } from '@/lib/suspension';

type UserFilter = 'all' | 'teachers' | 'parents' | 'suspended';

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  isTeacher: boolean;
  isParent: boolean;
  teacherStatus: string | null;
}

const PAGE_SIZE = 20;

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

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const isFr = language === 'fr';

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<UserFilter>(
    (searchParams.get('filter') as UserFilter) || 'all'
  );
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);

  const [actionId, setActionId] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<UserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [sendSuspendEmail, setSendSuspendEmail] = useState(true);
  const [reactivateTarget, setReactivateTarget] = useState<UserRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, role, suspended_at, suspended_reason, created_at')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;

      const ids = (usersData || []).map(u => u.id);

      if (ids.length === 0) {
        setUsers([]);
        return;
      }

      const { data: teacherProfiles } = await supabase
        .from('teacher_profiles')
        .select('id, verification_status')
        .in('id', ids);

      const { data: parentProfiles } = await supabase
        .from('parent_profiles')
        .select('id')
        .in('id', ids);

      const teacherMap = new Map((teacherProfiles || []).map(t => [t.id, t.verification_status]));
      const parentSet = new Set((parentProfiles || []).map(p => p.id));

      const enriched: UserRow[] = (usersData || [])
        .map(u => ({
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          role: u.role,
          suspended_at: u.suspended_at,
          suspended_reason: u.suspended_reason,
          created_at: u.created_at,
          isTeacher: teacherMap.has(u.id),
          isParent: parentSet.has(u.id),
          teacherStatus: teacherMap.get(u.id) || null,
        }))
        .filter(u => u.isTeacher || u.isParent);

      setUsers(enriched);
    } catch (err) {
      console.error('[AdminUsers]', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = users;
    if (filter === 'teachers') list = list.filter(u => u.isTeacher);
    else if (filter === 'parents') list = list.filter(u => u.isParent);
    else if (filter === 'suspended') list = list.filter(u => u.suspended_at);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.email?.toLowerCase().includes(q) ||
        `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [filter, search]);

  const counts = {
    all: users.length,
    teachers: users.filter(u => u.isTeacher).length,
    parents: users.filter(u => u.isParent).length,
    suspended: users.filter(u => u.suspended_at).length,
  };

  async function handleSuspend() {
    if (!suspendTarget || !suspendReason.trim()) {
      if (!suspendReason.trim()) alert(isFr ? 'Indique une raison.' : 'Please provide a reason.');
      return;
    }
    setActionId(suspendTarget.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('users')
        .update({ suspended_at: now, suspended_reason: suspendReason.trim() })
        .eq('id', suspendTarget.id);
      if (error) throw error;

      if (sendSuspendEmail) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ action: 'account-suspended', user_id: suspendTarget.id, reason: suspendReason.trim() }),
        }).catch((e) => console.warn('[Email] Non envoyé:', e));
      }

      setUsers(prev => prev.map(u =>
        u.id === suspendTarget.id ? { ...u, suspended_at: now, suspended_reason: suspendReason.trim() } : u
      ));

      try { await handleSuspensionSideEffects(suspendTarget.id); } catch (e) { console.warn(e); }

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

  async function handleReactivate() {
    if (!reactivateTarget) return;
    setActionId(reactivateTarget.id);
    try {
      const { error } = await supabase
        .from('users')
        .update({ suspended_at: null, suspended_reason: null })
        .eq('id', reactivateTarget.id);
      if (error) throw error;

      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'account-reactivated', user_id: reactivateTarget.id }),
      }).catch((e) => console.warn('[Email] Non envoyé:', e));

      setUsers(prev => prev.map(u =>
        u.id === reactivateTarget.id ? { ...u, suspended_at: null, suspended_reason: null } : u
      ));
      setReactivateTarget(null);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error');
    } finally {
      setActionId(null);
    }
  }

  const filterTabs: Array<{ key: UserFilter; labelFr: string; labelEn: string; count: number; icon: any }> = [
    { key: 'all',       labelFr: 'Tous',         labelEn: 'All',       count: counts.all,       icon: Users },
    { key: 'teachers',  labelFr: 'Enseignants',  labelEn: 'Teachers',  count: counts.teachers,  icon: GraduationCap },
    { key: 'parents',   labelFr: 'Parents',      labelEn: 'Parents',   count: counts.parents,   icon: Baby },
    { key: 'suspended', labelFr: 'Suspendus',    labelEn: 'Suspended', count: counts.suspended, icon: Ban },
  ];

  return (
    <div className="min-h-screen bg-[#fffafa] text-slate-900 selection:bg-red-100 selection:text-red-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-32">

        {/* En-tête */}
        <FadeInSection>
          <div className="mb-8 sm:mb-10">
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-red-500 mb-1.5 sm:mb-2">
              {isFr ? 'Gestion' : 'Management'}
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              {isFr ? 'Utilisateurs' : 'Users'}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 mt-2">
              {isFr
                ? 'Gérez les enseignants et les parents inscrits sur la plateforme.'
                : 'Manage teachers and parents registered on the platform.'}
            </p>
          </div>
        </FadeInSection>

        {/* Filtres & Recherche */}
        <FadeInSection delay={50}>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {filterTabs.map(tab => {
                const Icon = tab.icon;
                const active = filter === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
                      active
                        ? 'border-red-500 bg-red-500 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:text-red-500'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-slate-400'}`} />
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

            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={isFr ? 'Rechercher par nom ou email…' : 'Search by name or email…'}
                className="w-full pl-11 pr-4 h-12 rounded-[1.35rem] border border-slate-200 bg-white text-sm focus:outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition-all shadow-sm"
              />
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
            <div className="bg-white rounded-[1.35rem] border border-slate-200 p-16 text-center">
              <Users className="w-10 h-10 text-red-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-900 mb-1">
                {isFr ? 'Aucun utilisateur trouvé' : 'No users found'}
              </p>
              <p className="text-xs text-slate-500">
                {isFr ? 'Essayez d\'autres filtres.' : 'Try different filters.'}
              </p>
            </div>
          </FadeInSection>
        ) : (
          <FadeInSection delay={100}>
            <div className="bg-white rounded-[1.35rem] border border-slate-200 overflow-hidden shadow-sm">
              {/* Header desktop */}
              <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-3.5 bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>{isFr ? 'Utilisateur' : 'User'}</span>
                <span>{isFr ? 'Email' : 'Email'}</span>
                <span>{isFr ? 'Rôles' : 'Roles'}</span>
                <span>{isFr ? 'Inscription' : 'Joined'}</span>
                <span className="text-right">{isFr ? 'Actions' : 'Actions'}</span>
              </div>

              <div className="divide-y divide-slate-100">
                {paginated.map(user => {
                  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
                  const initials = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')).toUpperCase() || user.email[0]?.toUpperCase() || '?';
                  const suspended = !!user.suspended_at;
                  const isWorking = actionId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-6 py-4 hover:bg-red-50/30 transition-colors items-center"
                    >
                      {/* User */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                          suspended 
                            ? 'bg-red-50 text-red-600 border-red-100' 
                            : 'bg-slate-900 text-white border-slate-800 shadow-sm'
                        }`}>
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
                          {suspended && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 mt-0.5">
                              <Ban className="w-3 h-3" />
                              {isFr ? 'Suspendu' : 'Suspended'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-600 truncate">{user.email}</p>
                      </div>

                      {/* Rôles */}
                      <div className="flex flex-wrap gap-1.5">
                        {user.isTeacher && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            <GraduationCap className="w-3 h-3" />
                            {isFr ? 'Enseignant' : 'Teacher'}
                          </span>
                        )}
                        {user.isParent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                            <Baby className="w-3 h-3" />
                            {isFr ? 'Parent' : 'Parent'}
                          </span>
                        )}
                      </div>

                      {/* Date */}
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(user.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 justify-end">
                        {suspended ? (
                          <button
                            onClick={() => setReactivateTarget(user)}
                            disabled={isWorking}
                            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-full text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50 active:scale-95"
                          >
                            {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            {isFr ? 'Réactiver' : 'Reactivate'}
                          </button>
                        ) : (
                          <button
                            onClick={() => setSuspendTarget(user)}
                            disabled={isWorking}
                            className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-full text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50 active:scale-95"
                          >
                            {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                            {isFr ? 'Suspendre' : 'Suspend'}
                          </button>
                        )}
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
            <p className="text-xs font-semibold text-slate-500">
              {isFr
                ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} sur ${filtered.length}`
                : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-full text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:border-red-200 hover:text-red-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <span className="hidden sm:inline">{isFr ? 'Suivant' : 'Next'}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ MODALE SUSPENSION ═══════════ */}
        {suspendTarget && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => actionId !== suspendTarget.id && setSuspendTarget(null)}
          >
            <div
              className="bg-white rounded-[1.35rem] max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isFr ? 'Suspendre ce compte ?' : 'Suspend this account?'}
                  </h3>
                  <p className="text-sm text-slate-500 truncate mt-0.5">
                    {suspendTarget.email}
                  </p>
                </div>
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={actionId === suspendTarget.id}
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
                  <span className="text-sm font-medium text-slate-700">
                    {isFr ? 'Envoyer un email de notification' : 'Send notification email'}
                  </span>
                </label>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setSuspendTarget(null)}
                  disabled={actionId === suspendTarget.id}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={actionId === suspendTarget.id || !suspendReason.trim()}
                  className="flex-1 h-11 rounded-full bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === suspendTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                  {isFr ? 'Suspendre' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ MODALE RÉACTIVATION ═══════════ */}
        {reactivateTarget && (
          <div
            className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => actionId !== reactivateTarget.id && setReactivateTarget(null)}
          >
            <div
              className="bg-white rounded-[1.35rem] max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-bold text-slate-900">
                    {isFr ? 'Réactiver ce compte ?' : 'Reactivate this account?'}
                  </h3>
                  <p className="text-sm text-slate-500 truncate mt-0.5">
                    {reactivateTarget.email}
                  </p>
                </div>
                <button
                  onClick={() => setReactivateTarget(null)}
                  disabled={actionId === reactivateTarget.id}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {isFr
                  ? 'L\'utilisateur retrouvera immédiatement accès à la plateforme. Un email de notification sera envoyé.'
                  : 'The user will immediately regain access to the platform. A notification email will be sent.'}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setReactivateTarget(null)}
                  disabled={actionId === reactivateTarget.id}
                  className="flex-1 h-11 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  onClick={handleReactivate}
                  disabled={actionId === reactivateTarget.id}
                  className="flex-1 h-11 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  {actionId === reactivateTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  {isFr ? 'Réactiver' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}