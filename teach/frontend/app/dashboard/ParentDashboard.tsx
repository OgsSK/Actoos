'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pencil, Search, Heart, ChevronRight, Check, TrendingUp,
  Lightbulb, Bookmark, Phone, MapPin, User, ArrowRight,
  GraduationCap, School, Plus, Baby, Eye, Home,
  LayoutDashboard, LogOut, Settings, Inbox, Clock,
  CheckCircle2, XCircle, Flag, UserPlus,
  Trash2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';
import { ACTOOS_ID_BASE } from '@/lib/constants';

// ⏱ Au bout de ce délai, on n'attend plus authLoading
const AUTH_FORM_TIMEOUT_MS = 800;

const STORAGE_KEY = 'actoos-teach-active-role';

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function calcAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

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

function CardHeader({
  title, subtitle, action, icon: Icon,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ElementType;
}) {
  return (
    <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-emerald-600" />
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
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
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
// NAV TAB — utilise <Link prefetch>
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
          ? 'border-emerald-600 text-emerald-700'
          : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
      {badge && (
        <span className="ml-1 text-[10px] uppercase tracking-wide bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
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
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 sm:mb-8">
        <SkeletonLine className="w-16 h-16 rounded-xl shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonLine className="h-7 w-56 max-w-full" />
          <SkeletonLine className="h-4 w-full max-w-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <SkeletonLine className="h-11 w-full sm:w-40 rounded-xl" />
          <SkeletonLine className="h-11 w-full sm:w-40 rounded-xl" />
          <SkeletonLine className="h-11 w-full sm:w-32 rounded-xl" />
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6 flex gap-2">
        {[0, 1, 2, 3, 4].map(i => <SkeletonLine key={i} className="h-10 w-28 rounded-t-lg" />)}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[0, 1, 2, 3, 4].map(i => (
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
          <SkeletonCard lines={3} />
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

interface SavedTeacher {
  id: string;
  teacher_id: string;
  teacher_name: string;
  teacher_headline: string | null;
  teacher_photo_url: string | null;
  teacher_city: string | null;
}

interface Child {
  id: string;
  first_name: string;
  birth_date: string | null;
  level_id: string | null;
  level_custom: string | null;
  school_name: string | null;
  level_name: string | null;
}

interface LessonRequestItem {
  id: string;
  teacher_id: string;
  subject: string | null;
  level: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'archived' | 'completed';
  created_at: string;
  teacher_name: string;
  teacher_headline: string | null;
  teacher_photo_url: string | null;
}

const REQUEST_STATUS = {
  pending:   { bg: 'bg-amber-100',   text: 'text-amber-700',   icon: Clock,        labelFr: 'En attente', labelEn: 'Pending' },
  accepted:  { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2, labelFr: 'Acceptée',   labelEn: 'Accepted' },
  declined:  { bg: 'bg-red-100',     text: 'text-red-700',     icon: XCircle,      labelFr: 'Refusée',    labelEn: 'Declined' },
  archived:  { bg: 'bg-slate-100',   text: 'text-slate-600',   icon: Inbox,        labelFr: 'Archivée',   labelEn: 'Archived' },
  completed: { bg: 'bg-slate-200',   text: 'text-slate-700',   icon: Flag,         labelFr: 'Terminée',   labelEn: 'Completed' },
} as const;

const FALLBACK_STATUS = REQUEST_STATUS.pending;

export default function ParentDashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { language } = useLanguage();
  const { parentProfile, isTeacher } = useTeachRole();
  const isFr = language === 'fr';

  const [stats, setStats] = useState({ savedCount: 0, childrenCount: 0, pendingRequests: 0 });
  const [savedTeachers, setSavedTeachers] = useState<SavedTeacher[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [recentRequests, setRecentRequests] = useState<LessonRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
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
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, authTimeoutExpired]);

  async function loadData() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const [savedRes, childrenRes, levelsRes, requestsRes] = await Promise.all([
        supabase.from('saved_teachers').select('id, teacher_id').eq('parent_id', user!.id).order('created_at', { ascending: false }).limit(4),
        supabase.from('children').select('id, first_name, birth_date, level_id, level_custom, school_name').eq('parent_id', user!.id).order('created_at'),
        supabase.from('levels').select('id, name_fr, name_en'),
        supabase.from('lesson_requests').select('id, teacher_id, subject, level, status, created_at').eq('parent_id', user!.id).order('created_at', { ascending: false }).limit(5),
      ]);

      const saved = savedRes.data || [];
      const childrenData = childrenRes.data || [];
      const levels = levelsRes.data || [];
      const requestsData = requestsRes.data || [];

      if (saved.length > 0) {
        const teacherIds = saved.map(s => s.teacher_id);
        const [profilesRes, usersRes] = await Promise.all([
          supabase.from('teacher_profiles').select('id, headline, profile_photo_url, city_id').in('id', teacherIds),
          supabase.from('users').select('id, first_name, last_name').in('id', teacherIds),
        ]);

        const profiles = profilesRes.data || [];
        const usersData = usersRes.data || [];
        const cityIds = profiles.map(p => p.city_id).filter((v): v is string => Boolean(v));

        const citiesRes = cityIds.length
          ? await supabase.from('cities').select('id, name').in('id', cityIds)
          : { data: [] as any[] };
        const cities = citiesRes.data || [];

        const enriched: SavedTeacher[] = saved.map(s => {
          const p = profiles.find(pr => pr.id === s.teacher_id);
          const u = usersData.find(us => us.id === s.teacher_id);
          const c = p?.city_id ? cities.find(ci => ci.id === p.city_id) : null;
          const name = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—';
          return {
            id: s.id,
            teacher_id: s.teacher_id,
            teacher_name: name || '—',
            teacher_headline: p?.headline || null,
            teacher_photo_url: p?.profile_photo_url || null,
            teacher_city: c?.name || null,
          };
        });

        setSavedTeachers(enriched);
      } else {
        setSavedTeachers([]);
      }

      const enrichedChildren: Child[] = childrenData.map(c => {
        let level_name: string | null = null;
        if (c.level_custom) {
          level_name = c.level_custom;
        } else if (c.level_id) {
          const lvl = levels.find(l => l.id === c.level_id);
          if (lvl) level_name = isFr ? lvl.name_fr : lvl.name_en;
        }
        return {
          id: c.id,
          first_name: c.first_name,
          birth_date: c.birth_date,
          level_id: c.level_id,
          level_custom: c.level_custom,
          school_name: c.school_name,
          level_name,
        };
      });

      setChildren(enrichedChildren);

      let enrichedRequests: LessonRequestItem[] = [];
      if (requestsData.length > 0) {
        const teacherIds = [...new Set(requestsData.map(r => r.teacher_id))];
        const [profilesRes, usersRes] = await Promise.all([
          supabase.from('teacher_profiles').select('id, headline, profile_photo_url').in('id', teacherIds),
          supabase.from('users').select('id, first_name, last_name').in('id', teacherIds),
        ]);

        const profiles = profilesRes.data || [];
        const usersData = usersRes.data || [];

        enrichedRequests = requestsData.map(r => {
          const p = profiles.find(pr => pr.id === r.teacher_id);
          const u = usersData.find(us => us.id === r.teacher_id);
          const name = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : '—';
          return {
            id: r.id,
            teacher_id: r.teacher_id,
            subject: r.subject,
            level: r.level,
            status: r.status as LessonRequestItem['status'],
            created_at: r.created_at,
            teacher_name: name || '—',
            teacher_headline: p?.headline || null,
            teacher_photo_url: p?.profile_photo_url || null,
          };
        });
      }
      setRecentRequests(enrichedRequests);

      setStats({
        savedCount: saved.length,
        childrenCount: enrichedChildren.length,
        pendingRequests: requestsData.filter(r => r.status === 'pending').length,
      });
    } catch (err) {
      console.error('[ParentDashboard]', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  const completionPercent = (() => {
    let score = 0;
    if (parentProfile?.city) score += 20;
    if (parentProfile?.bio) score += 15;
    if (parentProfile?.phone) score += 20;
    if (parentProfile?.profile_photo_url) score += 15;
    if (children.length > 0) score += 30;
    return Math.min(score, 100);
  })();

  const displayName =
    [user?.user_metadata?.first_name, user?.user_metadata?.last_name].filter(Boolean).join(' ') ||
    user?.email?.split('@')[0] ||
    '';

  const initials =
    ((user?.user_metadata?.first_name?.[0] ?? '') + (user?.user_metadata?.last_name?.[0] ?? '')).toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    '?';

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  async function handleDeleteParentProfile() {
    if (!user || deleting) return;

    const confirmed = window.confirm(
      isFr
        ? 'Supprimer votre profil parent ?\n\nVos enfants, favoris et demandes associées seront également supprimés. Vous pourrez recréer ce profil plus tard depuis l\'onboarding.'
        : 'Delete your parent profile?\n\nYour children, favorites and related requests will also be deleted. You can recreate this profile later from onboarding.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('parent_profiles')
        .delete()
        .eq('id', user.id);
      if (error) throw error;

      // Si l'user est aussi teacher → bascule sur teacher. Sinon → onboarding.
      if (isTeacher) {
        localStorage.setItem(STORAGE_KEY, 'teacher');
        window.location.href = '/dashboard';
      } else {
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/onboarding';
      }
    } catch (err: any) {
      console.error('[ParentDashboard] delete failed:', err);
      alert(
        isFr
          ? `Impossible de supprimer : ${err?.message ?? 'erreur inconnue'}`
          : `Cannot delete: ${err?.message ?? 'unknown error'}`
      );
      setDeleting(false);
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
    return isFr ? `il y a ${days} j` : `${days} d ago`;
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
          {parentProfile?.profile_photo_url ? (
            <img src={parentProfile.profile_photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-slate-400 text-xl font-bold">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-slate-900 truncate">
            {isFr ? `Bonjour ${displayName}` : `Hello ${displayName}`}
          </h1>
          <p className="text-slate-600 text-sm">
            {isFr
              ? 'Trouvez le bon prof pour votre enfant, échangez directement, choisissez en confiance.'
              : 'Find the right teacher for your child, chat directly, choose with confidence.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto">
          <Link href="/teachers" prefetch>
            <PrimaryButton className="w-full">
              <Search className="w-4 h-4" />
              {isFr ? 'Chercher un prof' : 'Find a teacher'}
            </PrimaryButton>
          </Link>
          <Link href={`/parents/${user.id}`} prefetch>
            <OutlineButton className="w-full">
              <Eye className="w-4 h-4" />
              {isFr ? 'Mon profil public' : 'My public profile'}
            </OutlineButton>
          </Link>
          <Link href="/parent/profile/edit" prefetch>
            <OutlineButton className="w-full">
              <Pencil className="w-4 h-4" />
              {isFr ? 'Modifier' : 'Edit'}
            </OutlineButton>
          </Link>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-slate-200 mb-6 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 overflow-x-auto">
        <div className="flex min-w-max gap-1">
          <NavTab href="/" icon={Home}>{isFr ? 'Accueil' : 'Home'}</NavTab>
          <NavTab href="/dashboard" icon={LayoutDashboard} active>{isFr ? "Vue d'ensemble" : 'Overview'}</NavTab>
          <NavTab href="/parent/profile/edit" icon={Pencil}>{isFr ? 'Mon profil' : 'My profile'}</NavTab>
          <NavTab href={`/parents/${user.id}`} icon={Eye}>{isFr ? 'Profil public' : 'Public profile'}</NavTab>
          <NavTab href="/parent/favorites" icon={Heart}>{isFr ? 'Favoris' : 'Favorites'}</NavTab>
          <NavTab href="/parent/requests" icon={Inbox} badge={stats.pendingRequests > 0 ? String(stats.pendingRequests) : undefined}>
            {isFr ? 'Mes demandes' : 'My requests'}
          </NavTab>
        </div>
      </div>

      {/* STATS — 5 cartes */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard icon={Inbox} label={isFr ? 'Demandes' : 'Requests'} value={String(stats.pendingRequests)} color="amber" />
        <StatCard icon={Bookmark} label={isFr ? 'Profs sauvegardés' : 'Saved teachers'} value={String(stats.savedCount)} color="emerald" />
        <StatCard icon={Baby} label={isFr ? 'Enfants' : 'Children'} value={String(stats.childrenCount)} color="purple" />
        <StatCard icon={MapPin} label={isFr ? 'Ville' : 'City'} value={parentProfile?.city || '—'} color="amber" isText />
        <StatCard icon={Phone} label={isFr ? 'Téléphone' : 'Phone'} value={parentProfile?.phone || '—'} color="blue" isText />
      </div>

      {/* CORPS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {completionPercent < 100 && (
            <Card>
              <CardContent>
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-500 mb-1">
                      {isFr ? 'Complétion du profil' : 'Profile completion'}
                    </p>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-2xl font-bold text-slate-900 leading-none">{completionPercent}%</span>
                      <span className="text-sm text-slate-500">{isFr ? 'complété' : 'completed'}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                </div>
                <Link href="/parent/profile/edit" prefetch className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                  {isFr ? 'Compléter mon profil' : 'Complete my profile'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader
              icon={Inbox}
              title={isFr ? 'Mes demandes de cours' : 'My lesson requests'}
              subtitle={
                recentRequests.length > 0
                  ? isFr
                    ? `${recentRequests.length} demande${recentRequests.length > 1 ? 's' : ''} récente${recentRequests.length > 1 ? 's' : ''}`
                    : `${recentRequests.length} recent request${recentRequests.length > 1 ? 's' : ''}`
                  : isFr ? 'Aucune demande envoyée' : 'No request sent'
              }
              action={
                <Link href="/parent/requests" prefetch className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Voir tout' : 'See all'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent className="p-4 sm:p-6">
              {recentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Inbox className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {isFr ? 'Aucune demande envoyée' : 'No request sent'}
                  </p>
                  <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                    {isFr
                      ? 'Contactez un prof pour lui envoyer une demande de cours.'
                      : 'Contact a teacher to send them a lesson request.'}
                  </p>
                  <Link href="/teachers" prefetch>
                    <PrimaryButton>
                      <Search className="w-4 h-4" />
                      {isFr ? 'Trouver un prof' : 'Find a teacher'}
                    </PrimaryButton>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRequests.map(req => (
                    <RequestCard key={req.id} request={req} isFr={isFr} formatRelative={formatRelative} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              icon={Baby}
              title={isFr ? 'Mes enfants' : 'My children'}
              subtitle={
                children.length > 0
                  ? isFr
                    ? `${children.length} profil${children.length > 1 ? 's' : ''}`
                    : `${children.length} profile${children.length > 1 ? 's' : ''}`
                  : isFr ? 'Aucun enfant ajouté' : 'No children added'
              }
              action={
                <Link href="/parent/profile/edit" prefetch className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Gérer' : 'Manage'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent className="p-4 sm:p-6">
              {children.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Baby className="w-6 h-6 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {isFr ? 'Aucun enfant ajouté' : 'No children added'}
                  </p>
                  <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                    {isFr
                      ? 'Ajoutez vos enfants pour aider les profs à comprendre vos besoins.'
                      : 'Add your children to help teachers understand your needs.'}
                  </p>
                  <Link href="/parent/profile/edit" prefetch>
                    <PrimaryButton>
                      <Plus className="w-4 h-4" />
                      {isFr ? 'Ajouter un enfant' : 'Add a child'}
                    </PrimaryButton>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {children.map(child => (
                    <ChildCard key={child.id} child={child} isFr={isFr} />
                  ))}
                  <Link
                    href="/parent/profile/edit"
                    prefetch
                    className="group flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/40 transition-all min-h-[88px]"
                  >
                    <Plus className="w-4 h-4" />
                    {isFr ? 'Ajouter' : 'Add'}
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader
              icon={Check}
              title={isFr ? 'Prochaines étapes' : 'Next steps'}
              subtitle={isFr ? 'Complétez votre profil parent' : 'Complete your parent profile'}
            />
            <ul className="divide-y divide-slate-100">
              <NextStep done={Boolean(parentProfile?.city)} label={isFr ? 'Renseigner votre ville' : 'Set your city'} href="/parent/profile/edit" />
              <NextStep done={Boolean(parentProfile?.phone)} label={isFr ? 'Ajouter votre téléphone' : 'Add your phone'} href="/parent/profile/edit" />
              <NextStep done={children.length > 0} label={isFr ? 'Ajouter un enfant' : 'Add a child'} href="/parent/profile/edit" />
              <NextStep done={Boolean(parentProfile?.bio)} label={isFr ? 'Ajouter une présentation' : 'Add a presentation'} href="/parent/profile/edit" />
              <NextStep done={Boolean(parentProfile?.profile_photo_url)} label={isFr ? 'Ajouter une photo' : 'Add a photo'} href="/parent/profile/edit" />
            </ul>
          </Card>

          <Card>
            <CardHeader
              icon={Heart}
              title={isFr ? 'Profs sauvegardés' : 'Saved teachers'}
              subtitle={
                isFr
                  ? `${stats.savedCount} prof${stats.savedCount > 1 ? 's' : ''} sauvegardé${stats.savedCount > 1 ? 's' : ''}`
                  : `${stats.savedCount} saved teacher${stats.savedCount > 1 ? 's' : ''}`
              }
              action={
                <Link href="/parent/favorites" prefetch className="text-sm font-medium text-slate-500 hover:text-emerald-600 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Voir tout' : 'See all'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent className="p-4 sm:p-6">
              {savedTeachers.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900 mb-1">
                    {isFr ? 'Aucun prof sauvegardé' : 'No saved teachers'}
                  </p>
                  <p className="text-sm text-slate-500 mb-5 max-w-xs mx-auto">
                    {isFr
                      ? 'Sauvegardez les profs qui vous intéressent pour les retrouver ici.'
                      : 'Save teachers you like to find them here.'}
                  </p>
                  <Link href="/teachers" prefetch>
                    <PrimaryButton>
                      <Search className="w-4 h-4" />
                      {isFr ? 'Chercher un prof' : 'Find a teacher'}
                    </PrimaryButton>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedTeachers.map(t => (
                    <SavedTeacherCard key={t.id} teacher={t} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/40">
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-emerald-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-900">
                  {isFr ? 'Mon profil public' : 'My public profile'}
                </p>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {isFr
                  ? "Les profs que vous contactez voient cette page. Vérifiez qu'elle est bien complète."
                  : 'Teachers you contact see this page. Make sure it’s complete.'}
              </p>
              <Link href={`/parents/${user.id}`} prefetch className="block">
                <OutlineButton className="w-full">
                  <Eye className="w-4 h-4" />
                  {isFr ? 'Voir mon profil' : 'View my profile'}
                </OutlineButton>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader icon={Lightbulb} title={isFr ? 'Actions rapides' : 'Quick actions'} />
            <ul className="p-2">
              <QuickAction icon={Home} label={isFr ? "Retour à l'accueil" : 'Back to home'} href="/" />
              <QuickAction icon={Search} label={isFr ? 'Chercher un prof' : 'Find a teacher'} href="/teachers" />
              <QuickAction
                icon={Inbox}
                label={isFr ? 'Mes demandes' : 'My requests'}
                href="/parent/requests"
                badge={stats.pendingRequests > 0 ? String(stats.pendingRequests) : undefined}
              />
              <QuickAction icon={Eye} label={isFr ? 'Voir mon profil public' : 'View my public profile'} href={`/parents/${user.id}`} />
              <QuickAction icon={Baby} label={isFr ? 'Gérer mes enfants' : 'Manage my children'} href="/parent/profile/edit" />
              <QuickAction icon={Heart} label={isFr ? 'Mes profs sauvegardés' : 'My saved teachers'} href="/parent/favorites" />
              {!isTeacher && (
                <QuickAction
                  icon={UserPlus}
                  label={isFr ? 'Devenir aussi enseignant' : 'Become also a teacher'}
                  href="/onboarding"
                />
              )}
            </ul>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-semibold text-emerald-700">
                  {isFr ? 'Conseil' : 'Tip'}
                </p>
              </div>
              <p className="text-sm text-emerald-900/80 leading-relaxed">
                {isFr
                  ? "Ajoutez le profil de vos enfants pour que les profs comprennent mieux vos besoins dès le premier contact."
                  : 'Add your children so teachers understand your needs from the very first contact.'}
              </p>
            </CardContent>
          </Card>

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
                <span className="flex-1 text-left">
                  {isFr ? 'Se déconnecter' : 'Sign out'}
                </span>
              </button>
            </div>
          </Card>

          {/* Zone de danger — Supprimer le rôle parent */}
          <Card className="border-red-200">
            <CardHeader
              icon={AlertTriangle}
              title={isFr ? 'Zone de danger' : 'Danger zone'}
              subtitle={isFr ? 'Action irréversible' : 'Irreversible action'}
            />
            <CardContent>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                {isFr
                  ? 'Supprimez votre profil parent. Vous pourrez le recréer plus tard.'
                  : 'Delete your parent profile. You can recreate it later.'}
              </p>
              <button
                type="button"
                onClick={handleDeleteParentProfile}
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
                    {isFr ? 'Supprimer mon profil parent' : 'Delete my parent profile'}
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

function StatCard({
  icon: Icon, label, value, color = 'emerald', isText,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: 'emerald' | 'blue' | 'slate' | 'amber' | 'purple';
  isText?: boolean;
}) {
  const colorMap = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    slate: { bg: 'bg-slate-100', text: 'text-slate-600' },
    amber: { bg: 'bg-amber-100', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500 truncate">{label}</p>
            <p className={`font-bold text-slate-900 mt-1 truncate ${isText ? 'text-lg sm:text-xl' : 'text-xl sm:text-2xl'}`}>
              {value}
            </p>
          </div>
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 ${colorMap.bg}`}>
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${colorMap.text}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  request, isFr, formatRelative,
}: {
  request: LessonRequestItem;
  isFr: boolean;
  formatRelative: (iso: string) => string;
}) {
  const cfg = REQUEST_STATUS[request.status] ?? FALLBACK_STATUS;
  const StatusIcon = cfg.icon;
  const initials = request.teacher_name.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();

  return (
    <Link
      href={`/parent/requests/${request.id}`}
      prefetch
      className="group flex items-start gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors shadow-sm"
    >
      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
        {request.teacher_photo_url ? (
          <img src={request.teacher_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <span className="text-emerald-700 text-sm font-bold">{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
            {request.teacher_name}
          </p>
          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
            <StatusIcon className="w-3 h-3" />
            {isFr ? cfg.labelFr : cfg.labelEn}
          </span>
        </div>

        {request.subject && (
          <p className="text-xs text-slate-500 truncate">
            {request.subject}
            {request.level && <span className="text-slate-400"> · {request.level}</span>}
          </p>
        )}

        <p className="text-xs text-slate-400 mt-1">
          {formatRelative(request.created_at)}
        </p>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </Link>
  );
}

function ChildCard({ child, isFr }: { child: Child; isFr: boolean }) {
  const age = calcAge(child.birth_date);

  return (
    <Link
      href="/parent/profile/edit"
      prefetch
      className="group flex items-start gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors shadow-sm"
    >
      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
        <span className="text-emerald-700 text-base font-bold">
          {child.first_name.charAt(0).toUpperCase() || '?'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
            {child.first_name || (isFr ? 'Enfant' : 'Child')}
          </p>
          {age !== null && (
            <span className="text-xs text-slate-400 shrink-0">
              {age} {isFr ? 'ans' : 'yrs'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {child.level_name && (
            <span className="inline-flex items-center gap-1 truncate">
              <GraduationCap className="w-3 h-3" />
              {child.level_name}
            </span>
          )}
          {child.school_name && (
            <span className="inline-flex items-center gap-1 truncate">
              <School className="w-3 h-3" />
              {child.school_name}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
    </Link>
  );
}

function SavedTeacherCard({ teacher }: { teacher: SavedTeacher }) {
  return (
    <Link
      href={`/teachers/${teacher.teacher_id}`}
      prefetch
      className="group flex items-center gap-3 p-4 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors shadow-sm"
    >
      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0">
        {teacher.teacher_photo_url ? (
          <img src={teacher.teacher_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-sm font-bold">
            {teacher.teacher_name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
          {teacher.teacher_name}
        </p>
        {teacher.teacher_headline && (
          <p className="text-sm text-slate-500 truncate">{teacher.teacher_headline}</p>
        )}
        {teacher.teacher_city && (
          <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {teacher.teacher_city}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

function QuickAction({
  icon: Icon, label, href, badge, external,
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
}) {
  const content = (
    <>
      <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors shrink-0" />
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold bg-emerald-600 text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
          {badge}
        </span>
      )}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
    </>
  );

  return (
    <li>
      {external ? (
        <a
          href={href}
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
        >
          {content}
        </a>
      ) : (
        <Link
          href={href}
          prefetch
          className="group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
        >
          {content}
        </Link>
      )}
    </li>
  );
}

function NextStep({
  done, label, href,
}: {
  done: boolean;
  label: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        prefetch
        className="group flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-slate-50 transition-colors"
      >
        <span
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-emerald-400'
          }`}
        >
          {done && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
        </span>
        <span
          className={`text-sm flex-1 transition-colors ${
            done ? 'text-slate-400 line-through' : 'text-slate-800 font-medium group-hover:text-emerald-700'
          }`}
        >
          {label}
        </span>
        {!done && (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
        )}
      </Link>
    </li>
  );
}