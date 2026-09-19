'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Pencil, Search, Heart, ChevronRight, Check, TrendingUp,
  Lightbulb, Bookmark, Phone, MapPin, User, ArrowRight,
  GraduationCap, School, Plus, Baby, Eye, Home,
  LayoutDashboard, LogOut, Settings, Inbox, Clock,
  CheckCircle2, XCircle, Flag, UserPlus, Sparkles,
  Trash2, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';
import { ACTOOS_ID_BASE } from '@/lib/constants';
import SupportCard from '@/app/components/SupportCard';

const AUTH_FORM_TIMEOUT_MS = 800;
const STORAGE_KEY = 'actoos-teach-active-role';

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
// SMART TIP — moteur de conseils contextuels
// ═══════════════════════════════════════════════════════

type TipTone = 'info' | 'warning' | 'success' | 'growth';

interface SmartTip {
  tone: TipTone;
  icon: React.ElementType;
  eyebrow: string;
  title: string;
  text: string;
  cta?: { label: string; href: string };
}

const TIP_TONES: Record<TipTone, {
  card: string; iconBg: string; iconText: string; eyebrow: string; title: string; text: string; cta: string;
}> = {
  info: {
    card: 'border-blue-200 bg-blue-50',
    iconBg: 'bg-white border-blue-100',
    iconText: 'text-blue-600',
    eyebrow: 'text-blue-600',
    title: 'text-blue-900',
    text: 'text-blue-900/80',
    cta: 'text-blue-700 hover:text-blue-800',
  },
  warning: {
    card: 'border-amber-200 bg-amber-50',
    iconBg: 'bg-white border-amber-100',
    iconText: 'text-amber-600',
    eyebrow: 'text-amber-600',
    title: 'text-amber-900',
    text: 'text-amber-900/80',
    cta: 'text-amber-700 hover:text-amber-800',
  },
  success: {
    card: 'border-emerald-200 bg-emerald-50',
    iconBg: 'bg-white border-emerald-100',
    iconText: 'text-emerald-600',
    eyebrow: 'text-emerald-600',
    title: 'text-emerald-900',
    text: 'text-emerald-900/80',
    cta: 'text-emerald-700 hover:text-emerald-800',
  },
  growth: {
    card: 'border-purple-200 bg-purple-50',
    iconBg: 'bg-white border-purple-100',
    iconText: 'text-purple-600',
    eyebrow: 'text-purple-600',
    title: 'text-purple-900',
    text: 'text-purple-900/80',
    cta: 'text-purple-700 hover:text-purple-800',
  },
};

function SmartTipCard({ tip }: { tip: SmartTip }) {
  const tone = TIP_TONES[tip.tone];
  const Icon = tip.icon;

  return (
    <Card className={tone.card}>
      <CardContent>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${tone.iconBg}`}>
            <Icon className={`w-5 h-5 ${tone.iconText}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${tone.eyebrow}`}>
              {tip.eyebrow}
            </p>
            <p className={`text-sm font-semibold leading-snug ${tone.title}`}>
              {tip.title}
            </p>
            <p className={`text-sm leading-relaxed mt-1 ${tone.text}`}>
              {tip.text}
            </p>
            {tip.cta && (
              <Link
                href={tip.cta.href}
                prefetch
                className={`inline-flex items-center gap-1 text-xs font-semibold mt-3 transition-colors ${tone.cta}`}
              >
                {tip.cta.label}
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getParentTip(ctx: {
  isFr: boolean;
  parentProfile: any;
  childrenCount: number;
  savedCount: number;
  pendingRequests: number;
  completionPercent: number;
  userId: string;
}): SmartTip {
  const { isFr, parentProfile, childrenCount, savedCount, pendingRequests, completionPercent, userId } = ctx;
  const t = (fr: string, en: string) => (isFr ? fr : en);

  if (childrenCount === 0) {
    return {
      tone: 'warning',
      icon: Baby,
      eyebrow: t('Priorité', 'Priority'),
      title: t('Ajoutez votre premier enfant', 'Add your first child'),
      text: t(
        'Les profs regardent le profil des enfants avant de répondre. Sans enfant, votre demande est souvent ignorée.',
        'Teachers look at your children\'s profiles before replying. Without a child, your request is often ignored.',
      ),
      cta: { label: t('Ajouter un enfant', 'Add a child'), href: '/parent/profile/edit' },
    };
  }

  if (!parentProfile?.city) {
    return {
      tone: 'info',
      icon: MapPin,
      eyebrow: t('Conseil', 'Tip'),
      title: t('Renseignez votre ville', 'Set your city'),
      text: t(
        'La recherche est locale : une ville renseignée vous donne accès aux profs disponibles près de chez vous.',
        'Search is local: a filled city gives you access to teachers available near you.',
      ),
      cta: { label: t('Renseigner ma ville', 'Set my city'), href: '/parent/profile/edit' },
    };
  }

  if (savedCount === 0) {
    return {
      tone: 'info',
      icon: Heart,
      eyebrow: t('Conseil', 'Tip'),
      title: t('Sauvegardez vos profs préférés', 'Save your favorite teachers'),
      text: t(
        'Sauvegardez 3 profs avant de contacter : vous pourrez comparer tranquillement et décider sans pression.',
        'Save 3 teachers before contacting: compare calmly and decide without pressure.',
      ),
      cta: { label: t('Chercher un prof', 'Find a teacher'), href: '/teachers' },
    };
  }

  if (pendingRequests > 0) {
    return {
      tone: 'warning',
      icon: Inbox,
      eyebrow: t('Action', 'Action'),
      title: t(
        `${pendingRequests} demande${pendingRequests > 1 ? 's' : ''} en attente`,
        `${pendingRequests} pending request${pendingRequests > 1 ? 's' : ''}`,
      ),
      text: t(
        'Les profs répondent généralement en quelques heures. Si un prof ne répond pas sous 48 h, n\'hésitez pas à en contacter un autre.',
        'Teachers usually reply within hours. If a teacher doesn\'t reply in 48h, feel free to contact another one.',
      ),
      cta: { label: t('Voir mes demandes', 'See my requests'), href: '/parent/requests' },
    };
  }

  if (completionPercent >= 70 && savedCount > 0) {
    return {
      tone: 'growth',
      icon: Search,
      eyebrow: t('Passez à l\'action', 'Take action'),
      title: t('Contactez votre premier prof', 'Contact your first teacher'),
      text: t(
        'Votre profil est complet : les profs vous répondront plus vite. Envoyez une demande, c\'est gratuit et sans engagement.',
        'Your profile is complete: teachers will reply faster. Send a request, it\'s free and with no commitment.',
      ),
      cta: { label: t('Trouver un prof', 'Find a teacher'), href: '/teachers' },
    };
  }

  if (completionPercent === 100) {
    return {
      tone: 'success',
      icon: Sparkles,
      eyebrow: t('Bravo', 'Great job'),
      title: t('Profil parent complet', 'Parent profile complete'),
      text: t(
        'Vous êtes prêt ! N\'hésitez pas à laisser un avis après chaque cours : cela aide les autres parents à choisir.',
        'You\'re all set! Don\'t forget to leave a review after each lesson: it helps other parents choose.',
      ),
      cta: { label: t('Voir mon profil', 'View my profile'), href: `/parents/${userId}` },
    };
  }

  return {
    tone: 'info',
    icon: Lightbulb,
    eyebrow: t('Conseil', 'Tip'),
    title: t('Ajoutez les profils de vos enfants', 'Add your children\'s profiles'),
    text: t(
      'Plus votre profil est détaillé, plus les profs répondent vite et avec des propositions adaptées.',
      'The more detailed your profile, the faster teachers respond with tailored offers.',
    ),
    cta: { label: t('Compléter', 'Complete'), href: '/parent/profile/edit' },
  };
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
          <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-red-500" />
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
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
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
          ? 'border-red-500 text-red-600'
          : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {children}
      {badge && (
        <span className="ml-1 text-[10px] uppercase tracking-wide bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">
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

// Couleurs sémantiques de statut — conservées volontairement
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

  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

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

  const steps = [
    {
      done: Boolean(parentProfile?.city),
      icon: MapPin,
      label: isFr ? 'Renseigner votre ville' : 'Set your city',
      hint: isFr ? 'Pour trouver des profs près de chez vous' : 'To find teachers near you',
    },
    {
      done: Boolean(parentProfile?.phone),
      icon: Phone,
      label: isFr ? 'Ajouter votre téléphone' : 'Add your phone',
      hint: isFr ? 'Pour être joignable rapidement' : 'To be reachable quickly',
    },
    {
      done: children.length > 0,
      icon: Baby,
      label: isFr ? 'Ajouter un enfant' : 'Add a child',
      hint: isFr ? 'Aidez les profs à comprendre vos besoins' : 'Help teachers understand your needs',
    },
    {
      done: Boolean(parentProfile?.bio),
      icon: Lightbulb,
      label: isFr ? 'Ajouter une présentation' : 'Add a presentation',
      hint: isFr ? 'Quelques mots sur votre projet' : 'A few words about your project',
    },
    {
      done: Boolean(parentProfile?.profile_photo_url),
      icon: User,
      label: isFr ? 'Ajouter une photo' : 'Add a photo',
      hint: isFr ? 'Inspirez confiance aux profs' : 'Inspire trust with teachers',
    },
  ];

  const completedSteps = steps.filter(s => s.done).length;
  const totalSteps = steps.length;
  const currentStepIndex = steps.findIndex(s => !s.done);

  const parentTip = getParentTip({
    isFr,
    parentProfile,
    childrenCount: children.length,
    savedCount: stats.savedCount,
    pendingRequests: stats.pendingRequests,
    completionPercent,
    userId: user?.id ?? '',
  });

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
        <StatCard icon={Bookmark} label={isFr ? 'Profs sauvegardés' : 'Saved teachers'} value={String(stats.savedCount)} color="red" />
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
                  <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-red-500" />
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
                      <div className="h-full rounded-full bg-red-500 transition-all duration-700" style={{ width: `${completionPercent}%` }} />
                    </div>
                  </div>
                </div>
                <Link href="/parent/profile/edit" prefetch className="inline-flex items-center gap-1.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
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
                <Link href="/parent/requests" prefetch className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Voir tout' : 'See all'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent className="p-4 sm:p-6">
              {recentRequests.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                    <Inbox className="w-6 h-6 text-red-500" />
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
                <Link href="/parent/profile/edit" prefetch className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors inline-flex items-center gap-1">
                  {isFr ? 'Gérer' : 'Manage'}
                  <ChevronRight className="w-4 h-4" />
                </Link>
              }
            />
            <CardContent className="p-4 sm:p-6">
              {children.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-3">
                    <Baby className="w-6 h-6 text-red-500" />
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
                    className="group flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium hover:border-red-400 hover:text-red-500 hover:bg-red-50/40 transition-all min-h-[88px]"
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
              subtitle={
                isFr
                  ? `${completedSteps} sur ${totalSteps} étapes complétées`
                  : `${completedSteps} of ${totalSteps} steps completed`
              }
              action={
                <span className="text-xs font-semibold text-slate-500 tabular-nums">
                  {Math.round((completedSteps / totalSteps) * 100)}%
                </span>
              }
            />

            <div className="h-0.5 w-full bg-slate-100">
              <div
                className="h-full bg-red-500 transition-all duration-700"
                style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
              />
            </div>

            <ul className="divide-y divide-slate-100">
              {steps.map((step, i) => (
                <StepItem
                  key={i}
                  index={i + 1}
                  done={step.done}
                  isCurrent={i === currentStepIndex}
                  icon={step.icon}
                  label={step.label}
                  hint={step.hint}
                  href="/parent/profile/edit"
                  isFr={isFr}
                  accent="red"
                />
              ))}
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
                <Link href="/parent/favorites" prefetch className="text-sm font-medium text-slate-500 hover:text-red-500 transition-colors inline-flex items-center gap-1">
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
          <Card className="border-red-200 bg-gradient-to-br from-red-50 to-red-50/40">
            <CardContent>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-xl bg-white border border-red-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-red-500" />
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
              <QuickAction icon={Home} label={isFr ? "Retour à l'accueil" : 'Back to home'} href="/" accent="red" />
              <QuickAction icon={Search} label={isFr ? 'Chercher un prof' : 'Find a teacher'} href="/teachers" accent="red" />
              <QuickAction
                icon={Inbox}
                label={isFr ? 'Mes demandes' : 'My requests'}
                href="/parent/requests"
                badge={stats.pendingRequests > 0 ? String(stats.pendingRequests) : undefined}
                accent="red"
              />
              <QuickAction icon={Eye} label={isFr ? 'Voir mon profil public' : 'View my public profile'} href={`/parents/${user.id}`} accent="red" />
              <QuickAction icon={Baby} label={isFr ? 'Gérer mes enfants' : 'Manage my children'} href="/parent/profile/edit" accent="red" />
              <QuickAction icon={Heart} label={isFr ? 'Mes profs sauvegardés' : 'My saved teachers'} href="/parent/favorites" accent="red" />
              {!isTeacher && (
                <QuickAction
                  icon={UserPlus}
                  label={isFr ? 'Devenir aussi enseignant' : 'Become also a teacher'}
                  href="/onboarding"
                  accent="red"
                />
              )}
            </ul>
          </Card>

          <SmartTipCard tip={parentTip} />

          {/* 💛 SOUTIEN À LA PLATEFORME */}
          <SupportCard />

          <Card>
            <CardHeader icon={User} title={isFr ? 'Compte' : 'Account'} />
            <ul className="p-2">
              <QuickAction icon={Settings} label={isFr ? 'Paramètres du compte' : 'Account settings'} href={`${ACTOOS_ID_BASE}/account`} external accent="red" />
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
  icon: Icon, label, value, color = 'red', isText,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color?: 'red' | 'blue' | 'slate' | 'amber' | 'purple';
  isText?: boolean;
}) {
  const colorMap = {
    red: { bg: 'bg-red-100', text: 'text-red-500' },
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
          <span className="text-red-600 text-sm font-bold">{initials}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-red-500 transition-colors">
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

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
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
      <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
        <span className="text-red-600 text-base font-bold">
          {child.first_name.charAt(0).toUpperCase() || '?'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-red-500 transition-colors">
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

      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
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
        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-red-500 transition-colors">
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
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500 group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

type Accent = 'blue' | 'red';

function QuickAction({
  icon: Icon, label, href, badge, external, accent = 'red',
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: string;
  external?: boolean;
  accent?: Accent;
}) {
  const hover = accent === 'blue' ? 'hover:text-blue-700' : 'hover:text-red-500';
  const iconHover = accent === 'blue' ? 'group-hover:text-blue-600' : 'group-hover:text-red-500';
  const chevronHover = accent === 'blue' ? 'group-hover:text-blue-600' : 'group-hover:text-red-500';
  const badgeBg = accent === 'blue' ? 'bg-blue-600' : 'bg-red-500';

  const content = (
    <>
      <Icon className={`w-4 h-4 text-slate-400 transition-colors shrink-0 ${iconHover}`} />
      <span className="flex-1 font-medium">{label}</span>
      {badge && (
        <span className={`text-[10px] font-bold text-white rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 ${badgeBg}`}>
          {badge}
        </span>
      )}
      <ChevronRight className={`w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-all ${chevronHover}`} />
    </>
  );

  return (
    <li>
      {external ? (
        <a href={href} className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors ${hover}`}>
          {content}
        </a>
      ) : (
        <Link href={href} prefetch className={`group flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-700 hover:bg-slate-50 transition-colors ${hover}`}>
          {content}
        </Link>
      )}
    </li>
  );
}

function StepItem({
  index, done, isCurrent, icon: Icon, label, hint, href, isFr, accent = 'red',
}: {
  index: number;
  done: boolean;
  isCurrent: boolean;
  icon: React.ElementType;
  label: string;
  hint: string;
  href: string;
  isFr: boolean;
  accent?: Accent;
}) {
  const c = accent === 'blue'
    ? {
        doneBg: 'bg-blue-600 border-blue-600',
        currentBorder: 'border-blue-500',
        currentRing: 'ring-blue-100',
        currentIcon: 'text-blue-600',
        currentHoverBg: 'hover:bg-blue-50/40',
        currentCta: 'text-blue-600 bg-blue-50 group-hover:bg-blue-100',
      }
    : {
        doneBg: 'bg-red-500 border-red-500',
        currentBorder: 'border-red-500',
        currentRing: 'ring-red-100',
        currentIcon: 'text-red-500',
        currentHoverBg: 'hover:bg-red-50/40',
        currentCta: 'text-red-500 bg-red-50 group-hover:bg-red-100',
      };

  return (
    <li>
      <Link
        href={href}
        prefetch
        className={`group flex items-center gap-4 px-5 sm:px-6 py-3.5 transition-colors ${
          done ? 'hover:bg-slate-50/60' : isCurrent ? c.currentHoverBg : 'hover:bg-slate-50/60'
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
            done
              ? c.doneBg
              : isCurrent
                ? `bg-white ring-4 ${c.currentBorder} ${c.currentRing}`
                : 'border-slate-200 bg-white'
          }`}
        >
          {done ? (
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          ) : (
            <Icon className={`w-3.5 h-3.5 ${isCurrent ? c.currentIcon : 'text-slate-400'}`} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm truncate transition-colors ${
              done
                ? 'text-slate-400 line-through'
                : isCurrent
                  ? 'text-slate-900 font-semibold'
                  : 'text-slate-600 font-medium'
            }`}
          >
            {label}
          </p>
          {!done && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">{hint}</p>
          )}
        </div>

        {done ? (
          <span className="text-xs text-slate-400 shrink-0 tabular-nums">
            {String(index).padStart(2, '0')}
          </span>
        ) : isCurrent ? (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg shrink-0 transition-colors ${c.currentCta}`}>
            {isFr ? 'Commencer' : 'Start'}
            <ChevronRight className="w-3 h-3" />
          </span>
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
        )}
      </Link>
    </li>
  );
}