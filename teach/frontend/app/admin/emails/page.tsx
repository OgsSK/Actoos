'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import {
  Mail, Users, GraduationCap, User, CheckCircle2, XCircle,
  Loader2, Send, Search, AlertCircle, Sparkles,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════
type Segment =
  | 'all-users'
  | 'all-teachers'
  | 'verified-teachers'
  | 'unverified-teachers'
  | 'all-parents'
  | 'all-teachers-parents';

interface UserRow {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  language: string | null;
  roles: {
    is_teacher: boolean;
    is_verified_teacher: boolean;
    is_parent: boolean;
  };
  suspended_at: string | null;
}

const BATCH_SIZE = 25;

const SEGMENT_LABELS: Record<Segment, { fr: string; en: string; icon: any; color: string; bg: string }> = {
  'all-users': {
    fr: 'Tous les utilisateurs',
    en: 'All users',
    icon: Users,
    color: 'text-slate-700',
    bg: 'bg-slate-100',
  },
  'all-teachers': {
    fr: 'Tous les profs',
    en: 'All teachers',
    icon: GraduationCap,
    color: 'text-blue-700',
    bg: 'bg-blue-100',
  },
  'verified-teachers': {
    fr: 'Profs vérifiés',
    en: 'Verified teachers',
    icon: CheckCircle2,
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
  },
  'unverified-teachers': {
    fr: 'Profs non vérifiés',
    en: 'Unverified teachers',
    icon: XCircle,
    color: 'text-amber-700',
    bg: 'bg-amber-100',
  },
  'all-parents': {
    fr: 'Tous les parents',
    en: 'All parents',
    icon: User,
    color: 'text-purple-700',
    bg: 'bg-purple-100',
  },
  'all-teachers-parents': {
    fr: 'Profs + Parents',
    en: 'Teachers + Parents',
    icon: Sparkles,
    color: 'text-rose-700',
    bg: 'bg-rose-100',
  },
};

export default function AdminEmailsPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [mode, setMode] = useState<'segment' | 'selection'>('segment');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'teacher' | 'verified-teacher' | 'unverified-teacher' | 'parent'>('all');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [lang, setLang] = useState<'fr' | 'en'>('fr');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');

  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const [usersRes, teacherRes, parentRes] = await Promise.all([
        supabase.from('users').select('id, email, first_name, last_name, language, suspended_at'),
        supabase.from('teacher_profiles').select('id, is_verified, verification_status'),
        supabase.from('parent_profiles').select('id'),
      ]);

      const teacherMap = new Map<string, { is_verified: boolean; verification_status: string | null }>();
      (teacherRes.data || []).forEach((t: any) => {
        teacherMap.set(t.id, { is_verified: !!t.is_verified, verification_status: t.verification_status });
      });

      const parentSet = new Set<string>();
      (parentRes.data || []).forEach((p: any) => parentSet.add(p.id));

      const rows: UserRow[] = (usersRes.data || []).map((u: any) => {
        const teacherInfo = teacherMap.get(u.id);
        const isTeacher = !!teacherInfo;
        const isVerifiedTeacher = teacherInfo?.is_verified === true;
        const isParent = parentSet.has(u.id);

        return {
          id: u.id,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          language: u.language,
          roles: { is_teacher: isTeacher, is_verified_teacher: isVerifiedTeacher, is_parent: isParent },
          suspended_at: u.suspended_at || null,
        };
      });

      setUsers(rows);
    } finally {
      setLoading(false);
    }
  }

  const segmentCounts = useMemo(() => {
    const nonSuspended = users.filter(u => !u.suspended_at);
    return {
      'all-users': nonSuspended.length,
      'all-teachers': nonSuspended.filter(u => u.roles.is_teacher).length,
      'verified-teachers': nonSuspended.filter(u => u.roles.is_verified_teacher).length,
      'unverified-teachers': nonSuspended.filter(u => u.roles.is_teacher && !u.roles.is_verified_teacher).length,
      'all-parents': nonSuspended.filter(u => u.roles.is_parent).length,
      'all-teachers-parents': nonSuspended.filter(u => u.roles.is_teacher || u.roles.is_parent).length,
    };
  }, [users]);

  function getSegmentUserIds(segment: Segment): string[] {
    const nonSuspended = users.filter(u => !u.suspended_at);
    switch (segment) {
      case 'all-users': return nonSuspended.map(u => u.id);
      case 'all-teachers': return nonSuspended.filter(u => u.roles.is_teacher).map(u => u.id);
      case 'verified-teachers': return nonSuspended.filter(u => u.roles.is_verified_teacher).map(u => u.id);
      case 'unverified-teachers': return nonSuspended.filter(u => u.roles.is_teacher && !u.roles.is_verified_teacher).map(u => u.id);
      case 'all-parents': return nonSuspended.filter(u => u.roles.is_parent).map(u => u.id);
      case 'all-teachers-parents': return nonSuspended.filter(u => u.roles.is_teacher || u.roles.is_parent).map(u => u.id);
    }
  }

  const filteredForSelection = useMemo(() => {
    let list = users.filter(u => !u.suspended_at);

    if (roleFilter !== 'all') {
      list = list.filter(u => {
        if (roleFilter === 'teacher') return u.roles.is_teacher;
        if (roleFilter === 'verified-teacher') return u.roles.is_verified_teacher;
        if (roleFilter === 'unverified-teacher') return u.roles.is_teacher && !u.roles.is_verified_teacher;
        if (roleFilter === 'parent') return u.roles.is_parent;
        return true;
      });
    }

    if (search.trim()) {
      const kw = search.trim().toLowerCase();
      list = list.filter(u => {
        const name = [u.first_name, u.last_name].filter(Boolean).join(' ').toLowerCase();
        return name.includes(kw) || u.email.toLowerCase().includes(kw);
      });
    }

    return list;
  }, [users, roleFilter, search]);

  function toggleOne(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredForSelection.forEach(u => next.add(u.id));
      return next;
    });
  }

  function deselectAllFiltered() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      filteredForSelection.forEach(u => next.delete(u.id));
      return next;
    });
  }

  const recipientIds = useMemo(() => {
    if (mode === 'segment' && selectedSegment) return getSegmentUserIds(selectedSegment);
    if (mode === 'selection') return Array.from(selectedIds);
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedSegment, selectedIds, users]);

  const recipientCount = recipientIds.length;
  const canSend = recipientCount > 0 && subject.trim() && message.trim() && !sending;

  async function handleSend() {
    if (!canSend) return;
    setConfirmOpen(false);
    setSending(true);
    setResult(null);
    setProgress({ sent: 0, failed: 0, total: recipientCount });

    const batches: string[][] = [];
    for (let i = 0; i < recipientIds.length; i += BATCH_SIZE) {
      batches.push(recipientIds.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'admin-broadcast',
              user_ids: batch,
              subject: subject.trim(),
              message: message.trim(),
              lang,
              buttonText: buttonText.trim() || undefined,
              buttonUrl: buttonUrl.trim() || undefined,
            }),
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Batch failed');

        totalSent += data.sent || 0;
        totalFailed += data.failed || 0;
        setProgress({ sent: totalSent, failed: totalFailed, total: recipientCount });
      } catch (err) {
        console.error('[broadcast] batch failed', err);
        totalFailed += batch.length;
        setProgress({ sent: totalSent, failed: totalFailed, total: recipientCount });
      }
    }

    setResult({ sent: totalSent, failed: totalFailed, total: recipientCount });
    setSending(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 shrink-0 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-sm">
          <Mail className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 truncate">
            {isFr ? 'Emails groupés' : 'Bulk emails'}
          </h1>
          <p className="text-sm text-slate-500">
            {isFr
              ? 'Envoyez un message à un groupe d\'utilisateurs'
              : 'Send a message to a group of users'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setMode('segment')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === 'segment'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isFr ? 'Par segment' : 'By segment'}
            </button>
            <button
              onClick={() => setMode('selection')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                mode === 'selection'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isFr ? 'Sélection manuelle' : 'Manual selection'}
            </button>
          </div>

          {mode === 'segment' && (
            <div className="space-y-2">
              {(Object.keys(SEGMENT_LABELS) as Segment[]).map(seg => {
                const cfg = SEGMENT_LABELS[seg];
                const Icon = cfg.icon;
                const count = segmentCounts[seg];
                const active = selectedSegment === seg;

                return (
                  <button
                    key={seg}
                    onClick={() => setSelectedSegment(active ? null : seg)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      active
                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-400'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {isFr ? cfg.fr : cfg.en}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {count} {isFr ? 'destinataire' : 'recipient'}{count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      active ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
                    }`}>
                      {active && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {mode === 'selection' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={isFr ? 'Nom ou email…' : 'Name or email…'}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value as any)}
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
                >
                  <option value="all">{isFr ? 'Tous les rôles' : 'All roles'}</option>
                  <option value="teacher">{isFr ? 'Profs' : 'Teachers'}</option>
                  <option value="verified-teacher">{isFr ? 'Profs vérifiés' : 'Verified teachers'}</option>
                  <option value="unverified-teacher">{isFr ? 'Profs non vérifiés' : 'Unverified teachers'}</option>
                  <option value="parent">{isFr ? 'Parents' : 'Parents'}</option>
                </select>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={selectAllFiltered}
                  disabled={filteredForSelection.length === 0}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 h-8 rounded-lg border border-slate-200 bg-white hover:border-slate-400 disabled:opacity-40"
                >
                  {isFr ? 'Tout sélectionner' : 'Select all'}
                </button>
                <button
                  onClick={deselectAllFiltered}
                  disabled={filteredForSelection.length === 0}
                  className="text-xs font-medium text-slate-700 hover:text-slate-900 px-3 h-8 rounded-lg border border-slate-200 bg-white hover:border-slate-400 disabled:opacity-40"
                >
                  {isFr ? 'Tout désélectionner' : 'Deselect all'}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-medium text-red-600 hover:text-red-700 px-3 h-8 rounded-lg hover:bg-red-50"
                  >
                    {isFr ? 'Vider' : 'Clear'}
                  </button>
                )}
                <span className="text-xs text-slate-500 ml-auto">
                  {isFr ? `${selectedIds.size} sélectionné${selectedIds.size > 1 ? 's' : ''}` : `${selectedIds.size} selected`}
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl bg-white max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="w-5 h-5 text-slate-400 animate-spin mx-auto" />
                  </div>
                ) : filteredForSelection.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-500">
                    {isFr ? 'Aucun utilisateur trouvé' : 'No user found'}
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {filteredForSelection.map(u => {
                      const selected = selectedIds.has(u.id);
                      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || '—';
                      const initials = name !== '—'
                        ? name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase()
                        : '?';

                      return (
                        <li key={u.id}>
                          <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleOne(u.id)}
                              className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            />
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-xs font-semibold text-slate-600">{initials}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
                              <p className="text-xs text-slate-500 truncate">{u.email}</p>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {u.roles.is_verified_teacher && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                  PROF ✓
                                </span>
                              )}
                              {u.roles.is_teacher && !u.roles.is_verified_teacher && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                  PROF
                                </span>
                              )}
                              {u.roles.is_parent && (
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                                  PARENT
                                </span>
                              )}
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isFr ? 'Sujet *' : 'Subject *'}
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  maxLength={120}
                  placeholder={isFr ? 'Ex : Nouveautés sur Kalanden' : 'Ex: News on Kalanden'}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
                />
                <p className="text-[10px] text-slate-400 mt-1 text-right">{subject.length}/120</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isFr ? 'Message *' : 'Message *'}
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={8}
                  placeholder={isFr
                    ? 'Écrivez votre message ici…\n\nLaissez une ligne vide pour séparer les paragraphes.'
                    : 'Write your message here…\n\nLeave a blank line to separate paragraphs.'}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {isFr ? 'Langue' : 'Language'}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setLang('fr')}
                    className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                      lang === 'fr'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Français
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                      lang === 'en'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              <details className="text-xs">
                <summary className="cursor-pointer text-slate-600 hover:text-slate-900 font-medium py-1">
                  {isFr ? 'Bouton d\'action (optionnel)' : 'Action button (optional)'}
                </summary>
                <div className="pt-2 space-y-2">
                  <input
                    type="text"
                    value={buttonText}
                    onChange={e => setButtonText(e.target.value)}
                    placeholder={isFr ? 'Texte du bouton' : 'Button text'}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
                  />
                  <input
                    type="url"
                    value={buttonUrl}
                    onChange={e => setButtonUrl(e.target.value)}
                    placeholder="https://kalanden.com/..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:border-slate-400"
                  />
                </div>
              </details>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{isFr ? 'Destinataires' : 'Recipients'}</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {recipientCount}
                </span>
              </div>

              {sending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{isFr ? 'Envoi en cours…' : 'Sending…'}</span>
                    <span className="tabular-nums">
                      {progress.sent + progress.failed} / {progress.total}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{
                        width: `${progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {result && !sending && (
                <div className={`rounded-lg p-3 text-xs ${
                  result.failed === 0
                    ? 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                    : 'bg-amber-50 border border-amber-100 text-amber-800'
                }`}>
                  <p className="font-semibold mb-1">
                    {isFr ? 'Envoi terminé' : 'Send complete'}
                  </p>
                  <p>
                    ✅ {result.sent} {isFr ? 'envoyé' : 'sent'}{result.sent > 1 ? 's' : ''}
                    {result.failed > 0 && ` · ⚠️ ${result.failed} ${isFr ? 'échec' : 'failed'}${result.failed > 1 ? 's' : ''}`}
                  </p>
                </div>
              )}

              <button
                onClick={() => setConfirmOpen(true)}
                disabled={!canSend}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isFr ? 'Envoi…' : 'Sending…'}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {isFr ? `Envoyer (${recipientCount})` : `Send (${recipientCount})`}
                  </>
                )}
              </button>

              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                {isFr
                  ? 'Envoi par lots de 25 pour éviter le spam. Les comptes suspendus sont automatiquement exclus.'
                  : 'Sent in batches of 25 to avoid spam. Suspended accounts are automatically excluded.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !sending && setConfirmOpen(false)}
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {isFr ? 'Confirmer l\'envoi ?' : 'Confirm sending?'}
            </h3>
            <p className="text-sm text-slate-600 mb-1">
              {isFr
                ? `Vous allez envoyer cet email à ${recipientCount} destinataire${recipientCount > 1 ? 's' : ''}.`
                : `You're about to send this email to ${recipientCount} recipient${recipientCount > 1 ? 's' : ''}.`}
            </p>
            <p className="text-xs text-slate-500 mb-5">
              {isFr
                ? 'Cette action est irréversible.'
                : 'This action is irreversible.'}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
              >
                {isFr ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={handleSend}
                className="flex-1 h-11 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isFr ? 'Confirmer' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}