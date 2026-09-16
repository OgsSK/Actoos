'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pencil, Eye, Check, BookOpen, GraduationCap, Heart,
  ChevronRight, Clock, AlertCircle, TrendingUp, Lightbulb, Sparkles,
  LayoutDashboard, Users, Home, LogOut, Settings, User, Inbox, UserPlus,
  Trash2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useTeachRole } from '../hooks/useTeachRole';
import { supabase } from '../../lib/supabase';
import { ACTOOS_ID_BASE } from '../../lib/constants';

// ⏱ Au bout de ce délai, on n'attend plus authLoading
const AUTH_FORM_TIMEOUT_MS = 800;

const STORAGE_KEY = 'actoos-teach-active-role';

// ═══════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, action, icon: Icon }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-blue-600" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-900 truncate">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════
// BADGE VÉRIFIÉ
// ═══════════════════════════════════════════════════════

function VerifiedBadge({ isFr }: { isFr: boolean }) {
  return (
    <span
      className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 shrink-0 shadow-sm"
      title={isFr ? 'Profil vérifié' : 'Verified profile'}
      aria-label={isFr ? 'Profil vérifié' : 'Verified profile'}
    >
      <Check className="w-3 h-3 text-white" strokeWidth={3.5} />
    </span>
  );
}

// ═══════════════════════════════════════════════════════
// NAV TAB
// ═══════════════════════════════════════════════════════

function NavTab({ href, icon: Icon, active = false, disabled = false, badge, children }: {
  href: string;
  icon: React.ElementType;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const baseClasses = 'inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0';

  if (disabled) {
    return (
      <span className={`${baseClasses} border-transparent text-slate-300 cursor-not-allowed`} title="Bientôt disponible">
        <Icon className="w-4 h-4" />
        {children}
        {badge && <span className="ml-1 text-[10px] uppercase tracking-wide bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">{badge}</span>}
      </span>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      className={`${baseClasses} ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
      {badge && (
        <span className="ml-1 text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
          {badge}
        </span>
      )}
    </Link>
  );
}

// ═══════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════

function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function SkeletonCard({ lines = 3, showIcon = true }: { lines?: number; showIcon?: boolean }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center gap-3">
        {showIcon && <div className="w-9 h-9 rounded-xl bg-slate-100 animate-pulse shrink-0" />}
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-3.5 w-56" />
        </div>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonLine className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2 min-w-0">
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <SkeletonLine className="w-16 h-16 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-7 w-56 max-w-full" />
          <SkeletonLine className="h-4 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
          <SkeletonLine className="h-11 w-full sm:w-40 rounded-xl" />
          <SkeletonLine className="h-11 w-full sm:w-40 rounded-xl" />
        </div>
      </div>
      <div className="border-b border-slate-200 mb-6 flex gap-2">
        {[0, 1, 2, 3, 4].map(i => <SkeletonLine key={i} className="h-10 w-28 rounded-t-lg" />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <SkeletonLine className="h-3.5 w-24" />
                  <SkeletonLine className="h-6 w-16" />
                </div>
                <SkeletonLine className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl shrink-0" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex items-start gap-4 mb-5">
              <SkeletonLine className="w-11 h-11 rounded-xl shrink-0" />
              <div className="flex-1 space-y-3 min-w-0">
                <SkeletonLine className="h-3.5 w-32" />
                <SkeletonLine className="h-7 w-20" />
                <SkeletonLine className="h-1.5 w-full rounded-full" />
              </div>
            </div>
            <SkeletonLine className="h-4 w-40" />
          </div>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={2} />
        </div>
        <div className="space-y-6">
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════

export default function TeacherDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { language } = useLanguage();
  const { teacherProfile, isParent } = useTeachRole();
  const isFr = language === 'fr';

  const [stats, setStats] = useState({ subjectsCount: 0, levelsCount: 0, savedCount: 0 });
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [subjectNames, setSubjectNames] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // ⏱ Timeout local : on n'attend pas authLoading indéfiniment
  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  // ✅ FIX : on n'attend plus authLoading seul
  useEffect(() => {
    if (authLoading && !authTimeoutExpired) return;
    if (!user?.id) return;
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, authTimeoutExpired]);

  async function loadStats() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const [tsRes, tlRes, savedRes, subjectsRes, reqCountRes] = await Promise.all([
        supabase.from('teacher_subjects').select('subject_id, custom_name').eq('teacher_id', user!.id),
        supabase.from('teacher_levels').select('level_id, custom_name').eq('teacher_id', user!.id),
        supabase.from('saved_teachers').select('id', { count: 'exact', head: true }).eq('teacher_id', user!.id),
        supabase.from('subjects').select('id, name_fr, name_en'),
        supabase
          .from('lesson_requests')
          .select('id', { count: 'exact', head: true })
          .eq('teacher_id', user!.id)
          .eq('status', 'pending')
          .is('deleted_by_teacher_at', null),
      ]);

      const subjectMap: Record<string, string> = {};
      (subjectsRes.data || []).forEach(s => {
        subjectMap[s.id] = isFr ? s.name_fr : s.name_en;
      });

      const names = (tsRes.data || [])
        .map(t => t.subject_id ? subjectMap[t.subject_id] : t.custom_name || '')
        .filter(Boolean);

      setSubjectNames(names);
      setStats({
        subjectsCount: (tsRes.data || []).length,
        levelsCount: (tlRes.data || []).length,
        savedCount: savedRes.count || 0,
      });
      setPendingRequestsCount(reqCountRes.count || 0);
    } catch (err) {
      console.error('[TeacherDashboard]', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  const completionPercent = (() => {
    let score = 0;
    if (teacherProfile?.headline) score += 20;
    if (teacherProfile?.bio) score += 15;
    if (teacherProfile?.hourly_rate) score += 20;
    if (stats.subjectsCount > 0) score += 15;
    if (stats.levelsCount > 0) score += 15;
    if (teacherProfile?.profile_photo_url) score += 15;
    return Math.min(score, 100);
  })();

  const displayName = [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || '';
  const initials = ((user?.user_metadata?.first_name?.[0] ?? '') + (user?.user_metadata?.last_name?.[0] ?? '')).toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const status = teacherProfile?.verification_status || 'pending';
  const isVerified = status === 'verified';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  async function handleDeleteTeacherProfile() {
    if (!user || deleting) return;

    const confirmed = window.confirm(
      isFr
        ? 'Supprimer votre profil enseignant ?\n\nVos matières, niveaux et demandes associées seront également supprimés. Vous pourrez le recréer plus tard depuis l\'onboarding.'
        : 'Delete your teacher profile?\n\nYour subjects, levels and related requests will also be deleted. You can recreate this profile later from onboarding.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('teacher_profiles')
        .delete()
        .eq('id', user.id);
      if (error) throw error;

      // Si l'user est aussi parent → bascule sur parent. Sinon → onboarding.
      if (isParent) {
        localStorage.setItem(STORAGE_KEY, 'parent');
        window.location.href = '/dashboard';
      } else {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/onboarding';
      }
    } catch (err: any) {
      console.error('[TeacherDashboard] delete failed:', err);
      alert(
        isFr
          ? `Impossible de supprimer : ${err?.message ?? 'erreur inconnue'}`
          : `Cannot delete: ${err?.message ?? 'unknown error'}`
      );
      setDeleting(false);
    }
  }

  // ✅ FIX : on ne bloque plus sur authLoading
  if (loading && !hasLoadedOnce) {
    return <DashboardSkeleton />;
  }
  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      {/* EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="w-16 h-16 shrink-0 bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
          {teacherProfile?.profile_photo_url ? (
            <img src={teacherProfile.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-xl font-bold">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-2xl font-bold text-slate-900 truncate">{displayName}</h1>
            {isVerified && <VerifiedBadge isFr={isFr} />}
          </div>
          {teacherProfile?.headline ? (
            <p className="text-slate-600 text-sm truncate">{teacherProfile.headline}</p>
          ) : (
            <p className="text-slate-400 text-sm italic">
              {isFr ? 'Ajoutez un titre à votre profil' : 'Add a headline to your profile'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
          <Link href={`/teachers/${user.id}`} prefetch>
            <OutlineButton className="w-full">
              <Eye className="w-4 h-4" />
              {isFr ? 'Voir en public' : 'Public view'}
            </OutlineButton>
          </Link>
          <Link href="/teacher/profile/edit" prefetch>
            <PrimaryButton className="w-full">
              <Pencil className="w-4 h-4" />
              {isFr ? 'Modifier' : 'Edit'}
            </PrimaryButton>
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          <NavTab href="/" icon={Home}>{isFr ? 'Accueil' : 'Home'}</NavTab>
          <NavTab href="/dashboard" icon={LayoutDashboard} active>{isFr ? "Vue d'ensemble" : 'Overview'}</NavTab>
          <NavTab href="/teacher/profile/edit" icon={Pencil}>{isFr ? 'Mon profil' : 'My profile'}</NavTab>
          <NavTab href={`/teachers/${user.id}`} icon={Eye}>{isFr ? 'Profil public' : 'Public profile'}</NavTab>
          <NavTab href="/teacher/requests" icon={Inbox} badge={pendingRequestsCount > 0 ? String(pendingRequestsCount) : undefined}>
            {isFr ? 'Demandes' : 'Requests'}
          </NavTab>
        </div>
      </div>

      {/* STATUT */}
      {status === 'pending' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3 shadow-sm mb-6">
          <div className="w-9 h-9 rounded-xl bg-white border border-amber-100 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{isFr ? 'Vérification en cours' : 'Verification in progress'}</p>
            <p className="text-sm text-amber-800/80 leading-relaxed mt-0.5">
              {isFr ? 'Notre équipe vérifie votre identité. Délai moyen : 2 à 5 jours ouvrés.' : 'Our team is verifying your identity. 2 to 5 business days.'}
            </p>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 flex items-start gap-3 shadow-sm mb-6">
          <div className="w-9 h-9 rounded-xl bg-white border border-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">{isFr ? 'Profil non validé' : 'Profile not approved'}</p>
            <p className="text-sm text-red-800/80 leading-relaxed mt-0.5">
              {isFr ? 'Contactez-nous pour connaître la raison.' : 'Contact us to know why.'}
            </p>
          </div>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard icon={BookOpen} label={isFr ? 'Matières' : 'Subjects'} value={String(stats.subjectsCount)} color="blue" />
        <StatCard icon={GraduationCap} label={isFr ? 'Niveaux' : 'Levels'} value={String(stats.levelsCount)} color="purple" />
        <StatCard icon={Heart} label={isFr ? 'Sauvegardé' : 'Saved'} value={String(stats.savedCount)} color="rose" />
        <StatCard icon={Inbox} label={isFr ? 'Demandes' : 'Requests'} value={String(pendingRequestsCount)} color="amber" />
      </div>

      {/* CORPS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {completionPercent < 100 && (
            <Card>
              <CardContent>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 mb-1">{isFr ? 'Complétion du profil' : 'Profile completion'}</p>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-slate-900 leading-none">{completionPercent}%</span>
                      <span className="text-sm text-slate-500">{isFr ? 'complété' : 'completed'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                </div>
                <Link href="/teacher/profile/edit" prefetch className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  {isFr ? 'Compléter mon profil' : 'Complete my profile'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader icon={Check} title={isFr ? 'Prochaines étapes' : 'Next steps'} subtitle={isFr ? 'Complétez votre profil enseignant' : 'Complete your teacher profile'} />
            <ul className="divide-y divide-slate-100">
              <NextStep done={Boolean(teacherProfile?.headline)} label={isFr ? 'Ajouter un titre' : 'Add a headline'} href="/teacher/profile/edit" />
              <NextStep done={Boolean(teacherProfile?.bio)} label={isFr ? 'Rédiger une bio' : 'Write a bio'} href="/teacher/profile/edit" />
              <NextStep done={stats.subjectsCount > 0} label={isFr ? 'Choisir vos matières' : 'Choose your subjects'} href="/teacher/profile/edit" />
              <NextStep done={stats.levelsCount > 0} label={isFr ? 'Choisir vos niveaux' : 'Choose your levels'} href="/teacher/profile/edit" />
              <NextStep done={Boolean(teacherProfile?.hourly_rate)} label={isFr ? 'Définir votre tarif' : 'Set your rate'} href="/teacher/profile/edit" />
              <NextStep done={Boolean(teacherProfile?.profile_photo_url)} label={isFr ? 'Ajouter une photo' : 'Add a photo'} href="/teacher/profile/edit" />
            </ul>
          </Card>

          <Card>
            <CardHeader
              icon={BookOpen}
              title={isFr ? 'Mes matières' : 'My subjects'}
              subtitle={stats.subjectsCount > 0 ? (isFr ? `${stats.subjectsCount} matière${stats.subjectsCount > 1 ? 's' : ''}` : `${stats.subjectsCount} subject${stats.subjectsCount > 1 ? 's' : ''}`) : (isFr ? 'Aucune matière' : 'No subject')}
              action={
                <Link href="/teacher/profile/edit" prefetch className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Modifier' : 'Edit'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent>
              {subjectNames.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                  <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 leading-relaxed mb-4 max-w-xs mx-auto">
                    {isFr ? 'Aucune matière sélectionnée.' : 'No subject selected.'}
                  </p>
                  <Link href="/teacher/profile/edit" prefetch>
                    <PrimaryButton>
                      <Pencil className="w-4 h-4" />
                      {isFr ? 'Ajouter des matières' : 'Add subjects'}
                    </PrimaryButton>
                  </Link>
                </div>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {subjectNames.map((name, i) => (
                    <li key={i} className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700 font-medium">{name}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIDEBAR */}
        <div className="space-y-6">
          <Card>
            <CardHeader icon={Lightbulb} title={isFr ? 'Actions rapides' : 'Quick actions'} />
            <ul className="p-2">
              <QuickAction icon={Home} label={isFr ? "Retour à l'accueil" : 'Back to home'} href="/" />
              <QuickAction icon={Pencil} label={isFr ? 'Modifier mon profil' : 'Edit my profile'} href="/teacher/profile/edit" />
              <QuickAction icon={Eye} label={isFr ? 'Voir mon profil public' : 'View public profile'} href={`/teachers/${user.id}`} />
              <QuickAction icon={Inbox} label={isFr ? 'Demandes de cours' : 'Lesson requests'} href="/teacher/requests" badge={pendingRequestsCount > 0 ? String(pendingRequestsCount) : undefined} />
              {!isParent && (
                <QuickAction
                  icon={UserPlus}
                  label={isFr ? 'Devenir aussi parent' : 'Become also a parent'}
                  href="/onboarding"
                />
              )}
            </ul>
          </Card>

          <Card className="border-blue-200 bg-blue-50">
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-blue-600" />
                <p className="text-sm font-semibold text-blue-700">{isFr ? 'Conseil' : 'Tip'}</p>
              </div>
              <p className="text-sm text-blue-900/80 leading-relaxed">
                {isFr ? 'Les profs qui répondent aux demandes en moins de 2 h ont 3× plus de chances de décrocher un cours.' : 'Teachers who respond within 2 h are 3× more likely to get a lesson.'}
              </p>
            </CardContent>
          </Card>

          {completionPercent < 100 && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{isFr ? 'Gagner en visibilité' : 'Get more visibility'}</p>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">
                  {isFr ? 'Un profil complet attire 3× plus de parents.' : 'A complete profile attracts 3× more parents.'}
                </p>
                <Link href="/teacher/profile/edit" prefetch className="block">
                  <OutlineButton className="w-full">
                    {isFr ? 'Compléter' : 'Complete'}
                    <ChevronRight className="w-4 h-4" />
                  </OutlineButton>
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader icon={User} title={isFr ? 'Compte' : 'Account'} />
            <ul className="p-2">
              <QuickAction icon={Settings} label={isFr ? 'Paramètres du compte' : 'Account settings'} href={`${ACTOOS_ID_BASE}/account`} external />
            </ul>
            <div className="p-2 pt-0">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{isFr ? 'Se déconnecter' : 'Sign out'}</span>
              </button>
            </div>
          </Card>

          {/* Zone de danger — Supprimer le rôle enseignant */}
          <Card className="border-red-200">
            <CardHeader
              icon={AlertTriangle}
              title={isFr ? 'Zone de danger' : 'Danger zone'}
              subtitle={isFr ? 'Action irréversible' : 'Irreversible action'}
            />
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {isFr
                  ? 'Supprimez votre profil enseignant. Vous pourrez le recréer plus tard.'
                  : 'Delete your teacher profile. You can recreate it later.'}
              </p>
              <button
                type="button"
                onClick={handleDeleteTeacherProfile}
                disabled={deleting}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 bg-white text-red-600 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                    {isFr ? 'Suppression…' : 'Deleting…'}
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {isFr ? 'Supprimer mon profil enseignant' : 'Delete my teacher profile'}
                  </>
                )}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SOUS-COMPOSANTS
// ═══════════════════════════════════════════════════════

function StatCard({ icon: Icon, label, value, color = 'blue' }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: 'blue' | 'purple' | 'rose' | 'emerald' | 'amber';
}) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    rose: { bg: 'bg-rose-100', text: 'text-rose-600' },
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500 truncate">{label}</p>
            <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 truncate">{value}</p>
          </div>
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorMap.text}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, href, badge, external }: {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <Icon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold bg-blue-600 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
    </>
  );

  return (
    <li>
      {external ? (
        <a
          href={href}
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors"
        >
          {content}
        </a>
      ) : (
        <Link
          href={href}
          prefetch
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-700 transition-colors"
        >
          {content}
        </Link>
      )}
    </li>
  );
}

function NextStep({ done, label, href }: { done: boolean; label: string; href: string; }) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className="group flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-blue-500 border-blue-500' : 'border-slate-300 group-hover:border-blue-400'}`}>
          {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
        <span className={`text-sm flex-1 transition-colors ${done ? 'text-slate-400 line-through' : 'text-slate-800 font-medium group-hover:text-blue-700'}`}>
          {label}
        </span>
        {!done && <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />}
      </Link>
    </li>
  );
}