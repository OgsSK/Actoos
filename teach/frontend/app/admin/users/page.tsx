'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
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
      // 1) Tous les users
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

      // 2) Profils teacher
      const { data: teacherProfiles } = await supabase
        .from('teacher_profiles')
        .select('id, verification_status')
        .in('id', ids);

      // 3) Profils parent
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
    if (!suspendTarget) return;
    if (!suspendReason.trim()) {
      alert(isFr ? 'Indique une raison.' : 'Please provide a reason.');
      return;
    }
    setActionId(suspendTarget.id);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('users')
        .update({
          suspended_at: now,
          suspended_reason: suspendReason.trim(),
        })
        .eq('id', suspendTarget.id);
      if (error) throw error;

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
              user_id: suspendTarget.id,
              reason: suspendReason.trim(),
            }),
          }
        ).catch((e) => console.warn('[Email] Non envoyé:', e));
      }

      setUsers(prev => prev.map(u =>
        u.id === suspendTarget.id
          ? { ...u, suspended_at: now, suspended_reason: suspendReason.trim() }
          : u
      ));

      // ⚙️ Effets de bord : annuler les demandes en cours, notifier les contreparties
      try {
        await handleSuspensionSideEffects(suspendTarget.id);
      } catch (e) {
        console.warn('[AdminUsers] suspension side effects failed:', e);
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

  async function handleReactivate() {
    if (!reactivateTarget) return;
    setActionId(reactivateTarget.id);
    try {
      const { error } = await supabase
        .from('users')
        .update({ suspended_at: null, suspended_reason: null })
        .eq('id', reactivateTarget.id);
      if (error) throw error;

      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'account-reactivated',
            user_id: reactivateTarget.id,
          }),
        }
      ).catch((e) => console.warn('[Email] Non envoyé:', e));

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {isFr ? 'Utilisateurs' : 'Users'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {isFr
            ? 'Gérez les enseignants et les parents inscrits sur la plateforme.'
            : 'Manage teachers and parents registered on the platform.'}
        </p>
      </div>

      {/* Filtres */}
      <div className="border-b border-slate-200 mb-6 -mx-4 sm:mx-0 overflow-x-auto">
        <div className="flex gap-1 px-4 sm:px-0 min-w-max">
          {filterTabs.map(tab => {
            const Icon = tab.icon;
            const active = filter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {isFr ? tab.labelFr : tab.labelEn}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recherche */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={isFr ? 'Rechercher par nom ou email…' : 'Search by name or email…'}
            className="w-full pl-10 pr-4 h-10 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition-colors bg-white"
          />
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-700 mb-1">
            {isFr ? 'Aucun utilisateur trouvé' : 'No users found'}
          </p>
          <p className="text-xs text-slate-500">
            {isFr ? 'Essayez d\'autres filtres.' : 'Try different filters.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Header desktop */}
          <div className="hidden md:grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>{isFr ? 'Utilisateur' : 'User'}</span>
            <span>{isFr ? 'Email' : 'Email'}</span>
            <span>{isFr ? 'Rôles' : 'Roles'}</span>
            <span>{isFr ? 'Inscription' : 'Joined'}</span>
            <span className="text-right">{isFr ? 'Actions' : 'Actions'}</span>
          </div>

          <div className="divide-y divide-slate-100">
            {paginated.map(user => {
              const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
              const initials = (
                (user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')
              ).toUpperCase() || user.email[0]?.toUpperCase() || '?';
              const suspended = !!user.suspended_at;
              const isWorking = actionId === user.id;

              return (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors items-center"
                >
                  {/* User */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      suspended ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{fullName}</p>
                      {suspended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 mt-0.5">
                          <Ban className="w-2.5 h-2.5" />
                          {isFr ? 'Suspendu' : 'Suspended'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-600 truncate">{user.email}</p>
                  </div>

                  {/* Rôles */}
                  <div className="flex flex-wrap gap-1">
                    {user.isTeacher && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                        <GraduationCap className="w-2.5 h-2.5" />
                        {isFr ? 'Enseignant' : 'Teacher'}
                      </span>
                    )}
                    {user.isParent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                        <Baby className="w-2.5 h-2.5" />
                        {isFr ? 'Parent' : 'Parent'}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(user.created_at).toLocaleDateString(isFr ? 'fr-FR' : 'en-US')}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 justify-end">
                    {suspended ? (
                      <button
                        onClick={() => setReactivateTarget(user)}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        title={isFr ? 'Réactiver' : 'Reactivate'}
                      >
                        {isWorking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        {isFr ? 'Réactiver' : 'Reactivate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => setSuspendTarget(user)}
                        disabled={isWorking}
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                        title={isFr ? 'Suspendre' : 'Suspend'}
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
            <span className="px-3 text-sm text-slate-700">
              {page} / {totalPages}
            </span>
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

      {/* ═══════════ MODALE SUSPENSION ═══════════ */}
      {suspendTarget && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => actionId !== suspendTarget.id && setSuspendTarget(null)}
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
                  {isFr ? 'Suspendre ce compte ?' : 'Suspend this account?'}
                </h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {suspendTarget.email}
                </p>
              </div>
              <button
                onClick={() => setSuspendTarget(null)}
                disabled={actionId === suspendTarget.id}
                className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
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
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/10 resize-none transition-colors"
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
                disabled={actionId === suspendTarget.id}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionId === suspendTarget.id || !suspendReason.trim()}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
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
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => actionId !== reactivateTarget.id && setReactivateTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-slate-900">
                  {isFr ? 'Réactiver ce compte ?' : 'Reactivate this account?'}
                </h3>
                <p className="text-sm text-slate-500 truncate mt-0.5">
                  {reactivateTarget.email}
                </p>
              </div>
              <button
                onClick={() => setReactivateTarget(null)}
                disabled={actionId === reactivateTarget.id}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              {isFr
                ? 'L\'utilisateur retrouvera immédiatement accès à la plateforme. Un email de notification sera envoyé.'
                : 'The user will immediately regain access to the platform. A notification email will be sent.'}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setReactivateTarget(null)}
                disabled={actionId === reactivateTarget.id}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleReactivate}
                disabled={actionId === reactivateTarget.id}
                className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {actionId === reactivateTarget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                {isFr ? 'Réactiver' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}