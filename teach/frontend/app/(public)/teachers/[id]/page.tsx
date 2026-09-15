'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, Home, Monitor, CheckCircle2, Heart,
  Phone, Mail, MessageCircle, BookOpen, GraduationCap, Award,
  Clock, Calendar, User as UserIcon, Copy, Check, Pencil, Eye,
  Send, X, Loader2, AlertCircle, Star, ShieldCheck, Flag, Trash2,
  ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================
interface SubjectRef { id: string; name_fr: string; name_en: string; }
interface LevelRef { id: string; name_fr: string; name_en: string; }
interface Availability { [day: string]: string[]; }

interface TeacherProfile {
  id: string;
  headline: string | null;
  bio: string | null;
  teaching_mode: string | null;
  hourly_rate: number | null;
  rate_period: string | null;
  experience_years: number | null;
  city_id: string | null;
  languages: string[] | null;
  diploma: string | null;
  university: string | null;
  is_verified: boolean | null;
  is_available: boolean | null;
  availability: Availability | null;
  profile_photo_url: string | null;
  cover_url: string | null;
  free_trial: boolean | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_note: string | null;
  user: { first_name: string | null; last_name: string | null } | null;
  city: { id: string; name: string } | null;
  subjects: SubjectRef[];
  levels: LevelRef[];
  customSubjects: string[];
  customLevels: string[];
}

interface RatingsSummary {
  avg: number;
  count: number;
}

type ActiveTab = 'about' | 'subjects' | 'availability' | 'contact' | 'reviews';

// ============================================================
// HELPERS
// ============================================================
function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function formatCount(n: number, isFr: boolean): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));

  const sep = isFr ? ',' : '.';

  if (n < 1_000_000) {
    const v = n / 1000;
    const str = v < 10 ? v.toFixed(1) : String(Math.round(v));
    return `${str.replace('.', sep)}K`;
  }
  if (n < 1_000_000_000) {
    const v = n / 1_000_000;
    const str = v < 10 ? v.toFixed(1) : String(Math.round(v));
    return `${str.replace('.', sep)}M`;
  }
  const v = n / 1_000_000_000;
  const str = v < 10 ? v.toFixed(1) : String(Math.round(v));
  const suffix = isFr ? 'Md' : 'B';
  return `${str.replace('.', sep)}${suffix}`;
}

function formatRating(value: number, isFr: boolean, decimals = 1): string {
  return value.toFixed(decimals).replace('.', isFr ? ',' : '.');
}

function isEdited(createdAt: string, updatedAt: string | null | undefined): boolean {
  if (!updatedAt) return false;
  const diff = new Date(updatedAt).getTime() - new Date(createdAt).getTime();
  return diff > 2000;
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

const LANGUAGE_LABELS: Record<string, { fr: string; en: string }> = {
  fr: { fr: 'Français', en: 'French' },
  en: { fr: 'Anglais', en: 'English' },
  bm: { fr: 'Bambara', en: 'Bambara' },
  ar: { fr: 'Arabe', en: 'Arabic' },
  es: { fr: 'Espagnol', en: 'Spanish' },
  de: { fr: 'Allemand', en: 'German' },
  pt: { fr: 'Portugais', en: 'Portuguese' },
  wo: { fr: 'Wolof', en: 'Wolof' },
  sn: { fr: 'Soninké', en: 'Soninke' },
  ff: { fr: 'Peul', en: 'Fulani' },
  ha: { fr: 'Haoussa', en: 'Hausa' },
};

function languageLabel(input: string, isFr: boolean): string {
  const key = input.toLowerCase().trim();
  const mapped = LANGUAGE_LABELS[key];
  if (mapped) return isFr ? mapped.fr : mapped.en;
  return input;
}

const DAYS = [
  { key: 'mon', fr: 'Lundi', en: 'Monday' },
  { key: 'tue', fr: 'Mardi', en: 'Tuesday' },
  { key: 'wed', fr: 'Mercredi', en: 'Wednesday' },
  { key: 'thu', fr: 'Jeudi', en: 'Thursday' },
  { key: 'fri', fr: 'Vendredi', en: 'Friday' },
  { key: 'sat', fr: 'Samedi', en: 'Saturday' },
  { key: 'sun', fr: 'Dimanche', en: 'Sunday' },
];

const PERIODS: Record<string, { fr: string; en: string }> = {
  morning: { fr: 'Matin', en: 'Morning' },
  afternoon: { fr: 'Après-midi', en: 'Afternoon' },
  evening: { fr: 'Soir', en: 'Evening' },
};

function cleanPhoneForLink(p: string) {
  return p.replace(/\s+/g, '').replace(/[^\d+]/g, '');
}

// ============================================================
// PRIMITIVES
// ============================================================
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
      {children}
    </div>
  );
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
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function TeacherDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
      <SkeletonLine className="h-4 w-20 mb-5" />
      <Card>
        <SkeletonLine className="w-full aspect-[3/1] rounded-none" />
        <div className="px-5 sm:px-6 lg:px-8 pb-6">
          <div className="-mt-14 relative z-10">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 animate-pulse shadow-md" />
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonLine className="h-7 w-56 max-w-full" />
              <SkeletonLine className="h-4 w-full max-w-md" />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <SkeletonLine className="h-11 w-28 rounded-xl" />
              <SkeletonLine className="h-11 w-32 rounded-xl" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <SkeletonLine className="h-7 w-24 rounded-full" />
            <SkeletonLine className="h-7 w-28 rounded-full" />
            <SkeletonLine className="h-7 w-32 rounded-full" />
          </div>
        </div>
        <div className="border-t border-slate-200 px-2 py-3 flex gap-2">
          <SkeletonLine className="h-8 w-24 rounded-lg" />
          <SkeletonLine className="h-8 w-28 rounded-lg" />
          <SkeletonLine className="h-8 w-24 rounded-lg" />
        </div>
        <div className="p-5 sm:p-6 lg:p-8 space-y-6">
          <div className="space-y-3">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="h-4 w-full" />
            <SkeletonLine className="h-4 w-5/6" />
            <SkeletonLine className="h-4 w-4/6" />
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// ÉTOILES
// ============================================================
function StarsDisplay({ value, size = 16, emptyClassName = 'text-slate-200' }: { value: number; size?: number; emptyClassName?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= value ? 'fill-amber-400 text-amber-400' : emptyClassName}
        />
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            width={28}
            height={28}
            className={(hover || value) >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}

function EditedTag({ isFr }: { isFr: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded"
      title={isFr ? 'Cet avis a été modifié' : 'This review was edited'}
    >
      <Pencil className="w-2.5 h-2.5" />
      {isFr ? 'Modifié' : 'Edited'}
    </span>
  );
}

function RatingBadge({ summary, isFr }: { summary: RatingsSummary; isFr: boolean }) {
  if (summary.count === 0) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <StarsDisplay value={0} size={15} />
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
          {isFr ? 'Nouveau' : 'New'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 mt-2">
      <StarsDisplay value={Math.round(summary.avg)} size={15} />
      <span className="text-sm font-semibold text-slate-900 tabular-nums">
        {formatRating(summary.avg, isFr)}
      </span>
      <span className="text-sm text-slate-500 tabular-nums">
        ({formatCount(summary.count, isFr)} {isFr ? 'avis' : 'review'}{summary.count > 1 && !isFr ? 's' : ''})
      </span>
    </div>
  );
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function TeacherDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isParent } = useTeachRole();
  const isFr = language === 'fr';

  const id = params?.id as string;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('about');

  const [isSaved, setIsSaved] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);

  const [ratingsSummary, setRatingsSummary] = useState<RatingsSummary>({ avg: 0, count: 0 });

  useEffect(() => {
    if (!id) return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  async function refreshRatingsSummary() {
    if (!id) return;
    const { data } = await supabase.from('teacher_ratings').select('rating').eq('teacher_id', id);
    const list = data || [];
    const count = list.length;
    const avg = count ? list.reduce((s, r: any) => s + r.rating, 0) / count : 0;
    setRatingsSummary({ avg, count });
  }

  async function loadProfile() {
    if (!hasLoadedOnce) setLoading(true);
    setNotFound(false);
    try {
      const { data: p, error } = await supabase
        .from('teacher_profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !p) {
        setNotFound(true);
        return;
      }

      // ✅ Contrôle d'accès :
      // - Le propriétaire voit toujours son propre profil (même pending/suspended)
      // - Les autres ne voient que les profils 'verified'
      const isOwner = user?.id === p.id;
      if (!isOwner && p.verification_status !== 'verified') {
        setNotFound(true);
        return;
      }

      const [userRes, cityRes, tsubsRes, tlevelsRes, ratingsRes] = await Promise.all([
        supabase.from('users').select('id, first_name, last_name').eq('id', p.id).maybeSingle(),
        p.city_id
          ? supabase.from('cities').select('id, name').eq('id', p.city_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase.from('teacher_subjects').select('subject_id, custom_name, subjects(id, name_fr, name_en)').eq('teacher_id', p.id),
        supabase.from('teacher_levels').select('level_id, custom_name, levels(id, name_fr, name_en)').eq('teacher_id', p.id),
        supabase.from('teacher_ratings').select('rating').eq('teacher_id', p.id),
      ]);

      const tsubs = (tsubsRes.data || []) as Array<{ subject_id: string | null; custom_name: string | null; subjects: any; }>;
      const tlevels = (tlevelsRes.data || []) as Array<{ level_id: string | null; custom_name: string | null; levels: any; }>;

      const subjectsList: SubjectRef[] = [];
      const customSubjects: string[] = [];
      tsubs.forEach(t => {
        if (t.subject_id) {
          const s = asArray(t.subjects)[0];
          if (s) subjectsList.push(s);
        } else if (t.custom_name) {
          customSubjects.push(t.custom_name);
        }
      });

      const levelsList: LevelRef[] = [];
      const customLevels: string[] = [];
      tlevels.forEach(l => {
        if (l.level_id) {
          const lv = asArray(l.levels)[0];
          if (lv) levelsList.push(lv);
        } else if (l.custom_name) {
          customLevels.push(l.custom_name);
        }
      });

      const ratingsList = ratingsRes.data || [];
      const rCount = ratingsList.length;
      const rAvg = rCount ? ratingsList.reduce((s, r: any) => s + r.rating, 0) / rCount : 0;
      setRatingsSummary({ avg: rAvg, count: rCount });

      setProfile({
        id: p.id,
        headline: p.headline,
        bio: p.bio,
        teaching_mode: p.teaching_mode,
        hourly_rate: p.hourly_rate,
        rate_period: p.rate_period,
        experience_years: p.experience_years,
        city_id: p.city_id,
        languages: Array.isArray(p.languages) ? p.languages : null,
        diploma: p.diploma,
        university: p.university,
        is_verified: p.is_verified,
        is_available: p.is_available,
        availability: (p.availability as Availability) || null,
        profile_photo_url: p.profile_photo_url,
        cover_url: p.cover_url,
        free_trial: p.free_trial,
        contact_phone: p.contact_phone || null,
        contact_whatsapp: p.contact_whatsapp || null,
        contact_email: p.contact_email || null,
        contact_note: p.contact_note || null,
        user: userRes.data || null,
        city: cityRes.data || null,
        subjects: subjectsList,
        levels: levelsList,
        customSubjects,
        customLevels,
      });

      if (user?.id && user.id !== p.id) {
        const { data: saved } = await supabase
          .from('saved_teachers')
          .select('id')
          .eq('parent_id', user.id)
          .eq('teacher_id', p.id)
          .maybeSingle();
        setIsSaved(!!saved);
      }

      if (user?.id && user.id !== p.id) {
        const { data: existing } = await supabase
          .from('lesson_requests')
          .select('id, status, created_at')
          .eq('parent_id', user.id)
          .eq('teacher_id', p.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setExistingRequest(existing);
      }
    } catch (err) {
      console.error('[TeacherDetail] load', err);
      setNotFound(true);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function toggleSave() {
    if (!user?.id) {
      router.push(`/login?redirect=/teachers/${id}`);
      return;
    }
    if (!profile) return;
    setSavingFavorite(true);
    try {
      if (isSaved) {
        await supabase.from('saved_teachers').delete()
          .eq('parent_id', user.id).eq('teacher_id', profile.id);
        setIsSaved(false);
      } else {
        await supabase.from('saved_teachers').insert({ parent_id: user.id, teacher_id: profile.id });
        setIsSaved(true);
      }
    } catch (err) {
      console.error('[TeacherDetail] toggleSave', err);
    } finally {
      setSavingFavorite(false);
    }
  }

  // ✅ NOUVEAU : redirige vers la page de connexion si le parent n'est pas connecté
  function handleRequestLesson() {
    if (!user?.id) {
      router.push(`/login?redirect=/teachers/${id}`);
      return;
    }
    setShowRequestModal(true);
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  // ✅ Fix : ne plus bloquer sur authLoading, on ne bloque que sur le 1er chargement
  if (loading && !hasLoadedOnce) {
    return <TeacherDetailSkeleton />;
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6">
        <Card className="max-w-md w-full">
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-5">
              <UserIcon className="w-7 h-7 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-3">
              {isFr ? 'Profil introuvable' : 'Profile not found'}
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              {isFr
                ? "Ce profil n'existe pas ou n'est pas encore disponible."
                : 'This profile does not exist or is not yet available.'}
            </p>
            <Link href="/teachers" prefetch>
              <PrimaryButton>
                <ArrowLeft className="w-4 h-4" />
                {isFr ? 'Retour aux profs' : 'Back to teachers'}
              </PrimaryButton>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const isOwnProfile = Boolean(user?.id && user.id === profile.id);

  const displayName =
    [profile.user?.first_name, profile.user?.last_name].filter(Boolean).join(' ') ||
    (isFr ? 'Enseignant' : 'Teacher');

  const initials = displayName.split(' ').map(w => w.charAt(0)).slice(0, 2).join('').toUpperCase();

  const rate = formatRate(profile.hourly_rate, profile.rate_period, isFr);
  const mode = modeLabel(profile.teaching_mode, isFr);
  const ModeIcon = profile.teaching_mode === 'home' ? Home : profile.teaching_mode === 'online' ? Monitor : Home;

  const allSubjects = [...profile.subjects.map(s => (isFr ? s.name_fr : s.name_en)), ...profile.customSubjects];
  const allLevels = [...profile.levels.map(l => (isFr ? l.name_fr : l.name_en)), ...profile.customLevels];

  const hasAvailability = profile.availability && Object.keys(profile.availability).length > 0;
  const hasExperience = typeof profile.experience_years === 'number' && profile.experience_years > 0;
  const hasLanguages = Array.isArray(profile.languages) && profile.languages.length > 0;

  const hasAboutInfo =
    Boolean(profile.bio) || hasExperience || Boolean(profile.diploma) || Boolean(profile.university) || hasLanguages;

  const hasContact =
    Boolean(profile.contact_phone) || Boolean(profile.contact_whatsapp) ||
    Boolean(profile.contact_email) || Boolean(profile.contact_note);

  const tabs: Array<{ key: ActiveTab; label: string; icon: React.ElementType; }> = [];
  if (hasAboutInfo) tabs.push({ key: 'about', label: isFr ? 'À propos' : 'About', icon: UserIcon });
  if (allSubjects.length > 0 || allLevels.length > 0) tabs.push({ key: 'subjects', label: isFr ? 'Matières & niveaux' : 'Subjects & levels', icon: BookOpen });
  if (hasAvailability) tabs.push({ key: 'availability', label: isFr ? 'Disponibilités' : 'Availability', icon: Calendar });
  if (hasContact) tabs.push({ key: 'contact', label: isFr ? 'Coordonnées' : 'Contact', icon: Phone });
  tabs.push({
    key: 'reviews',
    label: isFr
      ? `Avis${ratingsSummary.count > 0 ? ` (${formatCount(ratingsSummary.count, isFr)})` : ''}`
      : `Reviews${ratingsSummary.count > 0 ? ` (${formatCount(ratingsSummary.count, isFr)})` : ''}`,
    icon: Star,
  });

  const activeTabSafe = tabs.find(t => t.key === activeTab) ? activeTab : tabs[0]?.key || 'about';

  const subtitle = isOwnProfile
    ? isFr ? 'Ainsi les parents vous voient' : 'This is how parents see you'
    : profile.headline || null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
      <button
        onClick={() => router.back()}
        className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {isFr ? 'Retour' : 'Back'}
      </button>

      {isOwnProfile && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3 shadow-sm mb-5">
          <div className="w-9 h-9 rounded-xl bg-white border border-emerald-100 flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-emerald-900">
              {isFr ? 'Vous consultez votre profil public' : 'You’re viewing your public profile'}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
              {isFr
                ? 'Voici ce que les parents voient quand ils vous trouvent.'
                : 'This is what parents see when they find you.'}
            </p>
          </div>
        </div>
      )}

      <Card>
        <div className="relative aspect-[3/1] bg-gradient-to-br from-emerald-100 via-slate-100 to-emerald-50 overflow-hidden">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : profile.profile_photo_url ? (
            <>
              <img src={profile.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover blur-sm scale-110" />
              <div className="absolute inset-0 bg-slate-900/20" />
            </>
          ) : null}

          {profile.is_verified && (
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/95 backdrop-blur-sm border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm z-10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-[11px] text-emerald-700 font-medium">
                {isFr ? 'Vérifié' : 'Verified'}
              </span>
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 lg:px-8 pb-6">
          <div className="-mt-14 relative z-10">
            <div className="w-24 h-24 rounded-2xl border-4 border-white bg-slate-100 overflow-hidden shadow-md flex items-center justify-center">
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-600 text-white text-2xl font-bold">
                  {initials}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                {displayName}
              </h1>
              {subtitle && (
                <p className="text-sm text-slate-500 leading-relaxed mt-1.5 max-w-[60ch]">
                  {subtitle}
                </p>
              )}
              <RatingBadge summary={ratingsSummary} isFr={isFr} />
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isOwnProfile ? (
                <Link href="/teacher/profile/edit" prefetch>
                  <PrimaryButton>
                    <Pencil className="w-4 h-4" />
                    {isFr ? 'Modifier mon profil' : 'Edit my profile'}
                  </PrimaryButton>
                </Link>
              ) : (
                <>
                  {(!user || isParent) && (
                    <OutlineButton
                      onClick={toggleSave}
                      disabled={savingFavorite}
                      className={
                        isSaved
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600'
                          : ''
                      }
                    >
                      <Heart className={`w-4 h-4 ${isSaved ? 'fill-emerald-600 text-emerald-600' : ''}`} />
                      {isSaved ? (isFr ? 'Sauvegardé' : 'Saved') : (isFr ? 'Sauvegarder' : 'Save')}
                    </OutlineButton>
                  )}

                  {(!user || isParent) && (
                    <>
                      {user && existingRequest && existingRequest.status === 'pending' ? (
                        <OutlineButton disabled className="border-amber-200 bg-amber-50 text-amber-700 opacity-100">
                          <Clock className="w-4 h-4" />
                          {isFr ? 'Demande en attente' : 'Request pending'}
                        </OutlineButton>
                      ) : user && existingRequest && (existingRequest.status === 'accepted' || existingRequest.status === 'completed') ? (
                        <PrimaryButton onClick={handleRequestLesson}>
                          <Send className="w-4 h-4" />
                          {isFr ? 'Redemander' : 'Request again'}
                        </PrimaryButton>
                      ) : (
                        <PrimaryButton onClick={handleRequestLesson}>
                          <Send className="w-4 h-4" />
                          {isFr ? 'Demander un cours' : 'Request lesson'}
                        </PrimaryButton>
                      )}
                    </>
                  )}

                  {hasContact && (
                    <OutlineButton onClick={() => setActiveTab('contact')}>
                      <Phone className="w-4 h-4" />
                      {isFr ? 'Coordonnées' : 'Contact'}
                    </OutlineButton>
                  )}
                </>
              )}
            </div>
          </div>

          {(profile.city || mode || rate || profile.free_trial || profile.is_available === false) && (
            <div className="flex flex-wrap items-center gap-2 mt-5">
              {profile.is_available === false && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  <Clock className="w-3 h-3" />
                  {isFr ? 'Actuellement indisponible' : 'Currently unavailable'}
                </span>
              )}
              {profile.city && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <MapPin className="w-3 h-3" />
                  {profile.city.name}
                </span>
              )}
              {mode && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                  <ModeIcon className="w-3 h-3" />
                  {mode}
                </span>
              )}
              {rate && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                  {rate}
                </span>
              )}
              {profile.free_trial && (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                  ✓ {isFr ? 'Premier cours gratuit' : 'Free first lesson'}
                </span>
              )}
            </div>
          )}
        </div>

        {tabs.length > 0 && (
          <div className="border-t border-slate-200 bg-white overflow-x-auto">
            <div className="flex min-w-max px-2">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const active = activeTabSafe === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      active
                        ? 'border-emerald-600 text-emerald-700'
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="p-5 sm:p-6 lg:p-8">
          {activeTabSafe === 'about' && hasAboutInfo && (
            <div className="space-y-8">
              {profile.bio && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">
                    {isOwnProfile ? (isFr ? 'Ma présentation' : 'My presentation') : (isFr ? 'Présentation' : 'Presentation')}
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {hasExperience && (
                  <InfoBlock
                    icon={Clock}
                    label={isFr ? 'Expérience' : 'Experience'}
                    value={isFr
                      ? `${profile.experience_years} an${(profile.experience_years ?? 0) > 1 ? 's' : ''}`
                      : `${profile.experience_years} year${(profile.experience_years ?? 0) > 1 ? 's' : ''}`}
                  />
                )}
                {profile.diploma && <InfoBlock icon={Award} label={isFr ? 'Diplôme' : 'Diploma'} value={profile.diploma} />}
                {profile.university && <InfoBlock icon={GraduationCap} label={isFr ? 'Université / École' : 'University / School'} value={profile.university} />}
                {hasLanguages && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-medium text-slate-700">{isFr ? 'Langues' : 'Languages'}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.languages!.map(l => (
                        <span key={l} className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">
                          {languageLabel(l, isFr)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTabSafe === 'subjects' && (allSubjects.length > 0 || allLevels.length > 0) && (
            <div className="space-y-8">
              {allSubjects.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">{isFr ? 'Matières enseignées' : 'Subjects taught'}</h2>
                  <div className="flex flex-wrap gap-2">
                    {allSubjects.map((s, i) => (
                      <span key={i} className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg font-medium">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {allLevels.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">{isFr ? 'Niveaux enseignés' : 'Levels taught'}</h2>
                  <div className="flex flex-wrap gap-2">
                    {allLevels.map((l, i) => (
                      <span key={i} className="text-sm text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-medium">
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTabSafe === 'availability' && hasAvailability && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-5">
                {isOwnProfile ? (isFr ? 'Mes créneaux habituels' : 'My usual slots') : (isFr ? 'Créneaux habituels' : 'Usual slots')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {DAYS.map(day => {
                  const periods = profile.availability?.[day.key] || [];
                  if (periods.length === 0) return null;
                  return (
                    <div key={day.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors">
                      <p className="text-sm font-semibold text-slate-900 mb-3">{isFr ? day.fr : day.en}</p>
                      <ul className="space-y-1.5">
                        {periods.map(p => {
                          const label = PERIODS[p];
                          return (
                            <li key={p} className="text-xs text-slate-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                              {label ? (isFr ? label.fr : label.en) : p}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-6 leading-relaxed max-w-[60ch]">
                {isFr
                  ? 'Ces horaires sont indicatifs. Vous pourrez les ajuster ensemble selon vos disponibilités.'
                  : 'These times are indicative. You can adjust them together based on your availability.'}
              </p>
            </div>
          )}

          {activeTabSafe === 'contact' && hasContact && (
            <div className="space-y-4 max-w-2xl">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{isFr ? 'Coordonnées' : 'Contact'}</h2>
              {profile.contact_phone && (
                <ContactRow
                  icon={Phone}
                  label={isFr ? 'Téléphone' : 'Phone'}
                  value={profile.contact_phone}
                  href={`tel:${cleanPhoneForLink(profile.contact_phone)}`}
                  onCopy={() => copyToClipboard(profile.contact_phone!, 'phone')}
                  copied={copiedField === 'phone'}
                  copyLabel={isFr ? 'Copier' : 'Copy'}
                  copiedLabel={isFr ? 'Copié' : 'Copied'}
                />
              )}
              {profile.contact_whatsapp && (
                <ContactRow
                  icon={MessageCircle}
                  label="WhatsApp"
                  value={profile.contact_whatsapp}
                  href={`https://wa.me/${cleanPhoneForLink(profile.contact_whatsapp).replace(/^\+/, '')}`}
                  target="_blank"
                  onCopy={() => copyToClipboard(profile.contact_whatsapp!, 'whatsapp')}
                  copied={copiedField === 'whatsapp'}
                  copyLabel={isFr ? 'Copier' : 'Copy'}
                  copiedLabel={isFr ? 'Copié' : 'Copied'}
                />
              )}
              {profile.contact_email && (
                <ContactRow
                  icon={Mail}
                  label="Email"
                  value={profile.contact_email}
                  href={`mailto:${profile.contact_email}`}
                  onCopy={() => copyToClipboard(profile.contact_email!, 'email')}
                  copied={copiedField === 'email'}
                  copyLabel={isFr ? 'Copier' : 'Copy'}
                  copiedLabel={isFr ? 'Copié' : 'Copied'}
                />
              )}
              {profile.contact_note && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5">
                  <h3 className="text-sm font-medium text-emerald-700 mb-2">{isFr ? 'Note' : 'Note'}</h3>
                  <p className="text-sm text-emerald-900/80 leading-relaxed whitespace-pre-line">{profile.contact_note}</p>
                </div>
              )}
            </div>
          )}

          {activeTabSafe === 'reviews' && (
            <RatingSection
              teacherId={profile.id}
              isFr={isFr}
              isOwnProfile={isOwnProfile}
              isParent={isParent}
              currentUserId={user?.id || null}
              onSummaryChange={refreshRatingsSummary}
            />
          )}
        </div>
      </Card>

      {showRequestModal && (
        <LessonRequestModal
          teacherId={profile.id}
          teacherName={displayName}
          teacherSubjects={allSubjects}
          teacherLevels={allLevels}
          teacherAvailability={profile.availability}
          isFr={isFr}
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            setRequestSent(true);
            setExistingRequest({ id: 'new', status: 'pending' });
            setTimeout(() => setRequestSent(false), 5000);
          }}
        />
      )}

      {requestSent && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4" />
          {isFr ? 'Demande envoyée avec succès !' : 'Request sent successfully!'}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function InfoBlock({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string; }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-emerald-600" />
        <h3 className="text-sm font-medium text-slate-700">{label}</h3>
      </div>
      <p className="text-sm text-slate-900 font-medium">{value}</p>
    </div>
  );
}

function ContactRow({
  icon: Icon, label, value, href, target, onCopy, copied, copyLabel, copiedLabel,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href: string;
  target?: string;
  onCopy: () => void;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3 sm:gap-4 hover:border-emerald-200 hover:shadow-sm transition-all">
      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-emerald-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <a
          href={href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          className="text-sm sm:text-base font-semibold text-slate-900 hover:text-emerald-600 transition-colors truncate block"
        >
          {value}
        </a>
      </div>
      <button
        onClick={onCopy}
        aria-label={copied ? copiedLabel : copyLabel}
        className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-all ${
          copied
            ? 'border-emerald-600 bg-emerald-600 text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copiedLabel}</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{copyLabel}</span>
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================
// SECTION AVIS / NOTATION
// ============================================================
interface Rating {
  id: string;
  parent_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  teacher_reply: string | null;
  teacher_reply_at: string | null;
  parent_first_name: string | null;
  parent_last_name: string | null;
}

type StarFilter = 'all' | 5 | 4 | 3 | 2 | 1;
type CommentFilter = 'all' | 'with' | 'without';
type SortMode = 'recent' | 'oldest' | 'highest' | 'lowest';

const PER_PAGE = 5;

function RatingSection({
  teacherId, isFr, isOwnProfile, isParent, currentUserId, onSummaryChange,
}: {
  teacherId: string;
  isFr: boolean;
  isOwnProfile: boolean;
  isParent: boolean;
  currentUserId: string | null;
  onSummaryChange: () => void;
}) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [eligible, setEligible] = useState(false);
  const [myRating, setMyRating] = useState<Rating | null>(null);

  const [editing, setEditing] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formComment, setFormComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  const [starFilter, setStarFilter] = useState<StarFilter>('all');
  const [commentFilter, setCommentFilter] = useState<CommentFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, currentUserId, isParent]);

  useEffect(() => {
    setPage(1);
  }, [starFilter, commentFilter, sortMode]);

  async function load() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('teacher_ratings')
        .select('id, parent_id, rating, comment, created_at, updated_at, teacher_reply, teacher_reply_at, users:parent_id(first_name, last_name)')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      const list: Rating[] = (data || []).map((r: any) => ({
        ...r,
        parent_first_name: r.users?.first_name ?? null,
        parent_last_name: r.users?.last_name ?? null,
      }));
      setRatings(list);

      if (currentUserId && !isOwnProfile) {
        const mine = list.find(r => r.parent_id === currentUserId) || null;
        setMyRating(mine);
        if (mine) {
          setFormRating(mine.rating);
          setFormComment(mine.comment || '');
        } else {
          setFormRating(0);
          setFormComment('');
        }

        const { data: completedReq } = await supabase
          .from('lesson_requests')
          .select('id')
          .eq('parent_id', currentUserId)
          .eq('teacher_id', teacherId)
          .eq('status', 'completed')
          .limit(1)
          .maybeSingle();
        setEligible(Boolean(completedReq));
      } else {
        setEligible(false);
        setMyRating(null);
      }
    } finally {
      setLoading(false);
    }
  }

  const canEditMyRating =
    myRating && (Date.now() - new Date(myRating.created_at).getTime()) < 7 * 24 * 60 * 60 * 1000;

  const starCounts = useMemo(() => {
    const c: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach(r => { c[r.rating] = (c[r.rating] || 0) + 1; });
    return c;
  }, [ratings]);

  const filteredSorted = useMemo(() => {
    let list = [...ratings];

    if (starFilter !== 'all') {
      list = list.filter(r => r.rating === starFilter);
    }
    if (commentFilter === 'with') {
      list = list.filter(r => r.comment && r.comment.trim().length > 0);
    } else if (commentFilter === 'without') {
      list = list.filter(r => !r.comment || r.comment.trim().length === 0);
    }

    switch (sortMode) {
      case 'recent':
        list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case 'oldest':
        list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
        break;
      case 'highest':
        list.sort((a, b) => b.rating - a.rating || +new Date(b.created_at) - +new Date(a.created_at));
        break;
      case 'lowest':
        list.sort((a, b) => a.rating - b.rating || +new Date(b.created_at) - +new Date(a.created_at));
        break;
    }
    return list;
  }, [ratings, starFilter, commentFilter, sortMode]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filteredSorted.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const hasActiveFilter = starFilter !== 'all' || commentFilter !== 'all' || sortMode !== 'recent';

  function resetFilters() {
    setStarFilter('all');
    setCommentFilter('all');
    setSortMode('recent');
  }

  async function handleSubmit() {
    if (formRating < 1) {
      setError(isFr ? 'Choisissez une note.' : 'Choose a rating.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: err } = await supabase.rpc('upsert_parent_rating', {
        p_teacher_id: teacherId,
        p_rating: formRating,
        p_comment: formComment.trim() || null,
      });
      if (err) throw err;
      setEditing(false);
      await load();
      onSummaryChange();
    } catch (err: any) {
      const code = err?.message || '';
      if (code.includes('edit_window_expired')) {
        setError(isFr ? "Le délai de modification (7 jours) est dépassé." : 'The 7-day edit window has passed.');
      } else if (code.includes('not_eligible')) {
        setError(isFr ? "Vous devez avoir suivi un cours terminé avec ce prof." : 'You must have a completed lesson with this teacher.');
      } else {
        setError(isFr ? "Une erreur est survenue." : 'Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMine() {
    if (!myRating) return;
    const msg = isFr ? 'Supprimer votre avis ?' : 'Delete your review?';
    if (!confirm(msg)) return;
    await supabase.from('teacher_ratings').delete().eq('id', myRating.id);
    setMyRating(null);
    setFormRating(0);
    setFormComment('');
    await load();
    onSummaryChange();
  }

  async function handleSaveReply(ratingId: string) {
    setSavingReply(true);
    try {
      await supabase.rpc('submit_teacher_reply', {
        p_rating_id: ratingId,
        p_reply: replyText.trim() || null,
      });
      setReplyingId(null);
      setReplyText('');
      await load();
    } finally {
      setSavingReply(false);
    }
  }

  async function handleDeleteReply(ratingId: string) {
    await supabase.rpc('submit_teacher_reply', { p_rating_id: ratingId, p_reply: null });
    await load();
  }

  async function handleReport(ratingId: string) {
    const reason = prompt(isFr ? 'Pourquoi signalez-vous cet avis ? (optionnel)' : 'Why are you reporting this review? (optional)');
    if (reason === null) return;
    if (!currentUserId) return;
    await supabase.from('rating_reports').insert({ rating_id: ratingId, reported_by: currentUserId, reason: reason || null });
    alert(isFr ? 'Merci, votre signalement a été envoyé.' : 'Thanks, your report was sent.');
  }

  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length)
    : 0;

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(isFr ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  if (loading) {
    return <div className="py-6 text-center text-sm text-slate-400">{isFr ? 'Chargement…' : 'Loading…'}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="text-center sm:text-left sm:pr-6 sm:border-r sm:border-slate-200">
          <div className="text-3xl font-bold text-slate-900 tabular-nums">
            {formatRating(avg, isFr)}
          </div>
          <div className="flex items-center justify-center sm:justify-start mt-1">
            <StarsDisplay value={Math.round(avg)} size={16} />
          </div>
          <div className="text-xs text-slate-500 mt-1 tabular-nums">
            {formatCount(ratings.length, isFr)} {isFr ? 'avis' : 'review'}{ratings.length > 1 && !isFr ? 's' : ''}
          </div>
        </div>

        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = starCounts[star] || 0;
            const percent = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
            return (
              <button
                key={star}
                onClick={() => setStarFilter(starFilter === star ? 'all' : (star as StarFilter))}
                className="group w-full flex items-center gap-3 text-left"
              >
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 tabular-nums w-10 shrink-0">
                  {star}
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${starFilter === star ? 'bg-emerald-500' : 'bg-amber-400 group-hover:bg-amber-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 tabular-nums w-10 text-right shrink-0">
                  {formatCount(count, isFr)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {currentUserId && isParent && !isOwnProfile && eligible && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {!myRating || editing ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">
                {myRating ? (isFr ? 'Modifier mon avis' : 'Edit my review') : (isFr ? 'Laisser un avis' : 'Leave a review')}
              </p>
              <StarPicker value={formRating} onChange={setFormRating} />
              <textarea
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder={isFr ? 'Votre expérience avec ce prof (optionnel)' : 'Your experience with this teacher (optional)'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isFr ? 'Publier' : 'Submit'}
                </button>
                {myRating && (
                  <button
                    onClick={() => { setEditing(false); setFormRating(myRating.rating); setFormComment(myRating.comment || ''); }}
                    className="text-sm text-slate-500 hover:text-slate-800"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-xs text-slate-500">{isFr ? 'Votre avis' : 'Your review'}</p>
                  {isEdited(myRating.created_at, myRating.updated_at) && <EditedTag isFr={isFr} />}
                </div>
                <StarsDisplay value={myRating.rating} />
                {myRating.comment && <p className="text-sm text-slate-700 mt-2">{myRating.comment}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canEditMyRating && (
                  <button onClick={() => setEditing(true)} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-white transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={handleDeleteMine} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-white transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {currentUserId && isParent && !isOwnProfile && !eligible && ratings.every(r => r.parent_id !== currentUserId) && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          {isFr
            ? 'Vous pourrez laisser un avis après avoir terminé un cours avec ce prof.'
            : 'You can leave a review after completing a lesson with this teacher.'}
        </div>
      )}

      {ratings.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {isFr ? 'Filtrer et trier' : 'Filter & sort'}
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setStarFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                  starFilter === 'all'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                }`}
              >
                {isFr ? 'Toutes' : 'All'}
              </button>
              {[5, 4, 3, 2, 1].map(star => {
                const count = starCounts[star] || 0;
                if (count === 0) return null;
                const active = starFilter === star;
                return (
                  <button
                    key={star}
                    onClick={() => setStarFilter(active ? 'all' : (star as StarFilter))}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                      active
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {star}
                    <Star className={`w-3 h-3 ${active ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                    <span className="tabular-nums opacity-70">{formatCount(count, isFr)}</span>
                  </button>
                );
              })}
            </div>

            <span className="hidden sm:block w-px bg-slate-200 mx-1" aria-hidden />

            <div className="flex items-center gap-1.5">
              {([
                { key: 'all', fr: 'Tous', en: 'All' },
                { key: 'with', fr: 'Avec texte', en: 'With text' },
                { key: 'without', fr: 'Sans texte', en: 'Without text' },
              ] as const).map(c => (
                <button
                  key={c.key}
                  onClick={() => setCommentFilter(c.key as CommentFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    commentFilter === c.key
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400'
                  }`}
                >
                  {isFr ? c.fr : c.en}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="h-9 pl-3 pr-8 rounded-lg text-xs font-medium bg-white border border-slate-200 text-slate-700 focus:outline-none focus:border-emerald-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 0.5rem center',
              }}
            >
              <option value="recent">{isFr ? 'Plus récents' : 'Most recent'}</option>
              <option value="oldest">{isFr ? 'Plus anciens' : 'Oldest'}</option>
              <option value="highest">{isFr ? 'Mieux notés' : 'Highest rated'}</option>
              <option value="lowest">{isFr ? 'Moins bien notés' : 'Lowest rated'}</option>
            </select>

            {hasActiveFilter && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
              >
                <X className="w-3 h-3" />
                {isFr ? 'Réinitialiser' : 'Reset'}
              </button>
            )}
          </div>
        </div>
      )}

      {filteredSorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <Star className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            {hasActiveFilter
              ? (isFr ? 'Aucun avis ne correspond à vos filtres.' : 'No review matches your filters.')
              : (isFr ? 'Aucun avis pour le moment.' : 'No reviews yet.')}
          </p>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="mt-3 text-xs font-medium text-emerald-600 hover:text-emerald-700">
              {isFr ? 'Réinitialiser les filtres' : 'Reset filters'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {paginated.map(r => {
              const name = [r.parent_first_name, r.parent_last_name?.charAt(0)].filter(Boolean).join(' ') || (isFr ? 'Parent' : 'Parent');
              const isMine = r.parent_id === currentUserId;
              const edited = isEdited(r.created_at, r.updated_at);
              return (
                <div key={r.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-900">{name}{isMine ? (isFr ? ' (vous)' : ' (you)') : ''}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" />
                          {isFr ? 'Avis vérifié' : 'Verified review'}
                        </span>
                        {edited && <EditedTag isFr={isFr} />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <StarsDisplay value={r.rating} />
                        <span className="text-xs text-slate-400">{formatDate(r.created_at)}</span>
                      </div>
                    </div>

                    {currentUserId && !isMine && (
                      <button
                        onClick={() => handleReport(r.id)}
                        aria-label={isFr ? 'Signaler' : 'Report'}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {r.comment && <p className="text-sm text-slate-700 mt-3 leading-relaxed">{r.comment}</p>}

                  {r.teacher_reply && replyingId !== r.id && (
                    <div className="mt-3 ml-4 pl-3 border-l-2 border-emerald-200">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <p className="text-xs font-medium text-emerald-700">{isFr ? 'Réponse du prof' : "Teacher's reply"}</p>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{r.teacher_reply}</p>
                      {isOwnProfile && (
                        <div className="flex items-center gap-3 mt-1.5">
                          <button onClick={() => { setReplyingId(r.id); setReplyText(r.teacher_reply || ''); }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
                            {isFr ? 'Modifier' : 'Edit'}
                          </button>
                          <button onClick={() => handleDeleteReply(r.id)} className="text-xs text-slate-400 hover:text-red-600 font-medium">
                            {isFr ? 'Supprimer' : 'Delete'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {isOwnProfile && !r.teacher_reply && replyingId !== r.id && (
                    <button
                      onClick={() => { setReplyingId(r.id); setReplyText(''); }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      {isFr ? 'Répondre' : 'Reply'}
                    </button>
                  )}

                  {isOwnProfile && replyingId === r.id && (
                    <div className="mt-3 ml-4 pl-3 border-l-2 border-emerald-200 space-y-2">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        rows={2}
                        maxLength={500}
                        placeholder={isFr ? 'Votre réponse…' : 'Your reply…'}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm resize-none focus:outline-none focus:border-emerald-500"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveReply(r.id)}
                          disabled={savingReply}
                          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium disabled:opacity-50"
                        >
                          {savingReply ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          {isFr ? 'Envoyer' : 'Send'}
                        </button>
                        <button onClick={() => setReplyingId(null)} className="text-xs text-slate-500 hover:text-slate-800">
                          {isFr ? 'Annuler' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                {isFr ? 'Précédent' : 'Previous'}
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  const n = i + 1;
                  const showPage =
                    n === 1 ||
                    n === totalPages ||
                    Math.abs(n - currentPage) <= 1;

                  if (!showPage) {
                    if (i === 1 || i === totalPages - 2) {
                      return (
                        <span key={`ell-${n}`} className="text-xs text-slate-400 px-1">
                          …
                        </span>
                      );
                    }
                    return null;
                  }

                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-medium transition-colors tabular-nums ${
                        currentPage === n
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-200 disabled:hover:text-slate-700 transition-colors"
              >
                {isFr ? 'Suivant' : 'Next'}
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// MODALE DE DEMANDE
// ============================================================
function LessonRequestModal({
  teacherId, teacherName, teacherSubjects, teacherLevels, teacherAvailability, isFr, onClose, onSuccess,
}: {
  teacherId: string;
  teacherName: string;
  teacherSubjects: string[];
  teacherLevels: string[];
  teacherAvailability: Availability | null;
  isFr: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const [selectedChildIds, setSelectedChildIds] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [message, setMessage] = useState('');
  const [teachingMode, setTeachingMode] = useState<'home' | 'online' | 'both'>('both');
  const [customScheduleText, setCustomScheduleText] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    async function loadChildren() {
      if (!user?.id) { setLoadingChildren(false); return; }
      const { data } = await supabase
        .from('children')
        .select('id, first_name, birth_date, level_id, level_custom')
        .eq('parent_id', user.id)
        .order('created_at');
      setChildren(data || []);
      setLoadingChildren(false);
    }
    loadChildren();
  }, [user?.id]);

  useEffect(() => {
    if (teacherSubjects.length === 1 && !subject) setSubject(teacherSubjects[0]);
    if (teacherLevels.length === 1 && !level) setLevel(teacherLevels[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherSubjects, teacherLevels]);

  const availableDays = DAYS.map(day => {
    const periods = teacherAvailability?.[day.key] || [];
    return {
      key: day.key,
      labelFr: day.fr,
      labelEn: day.en,
      periods: periods.filter(p => PERIODS[p]),
    };
  }).filter(d => d.periods.length > 0);

  const hasTeacherAvailability = availableDays.length > 0;

  function toggleSlot(dayKey: string, periodKey: string) {
    const key = `${dayKey}:${periodKey}`;
    setSelectedSlots(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function isSlotSelected(dayKey: string, periodKey: string) {
    return selectedSlots.has(`${dayKey}:${periodKey}`);
  }

  function toggleChild(id: string) {
    setSelectedChildIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  function buildScheduleString(): string {
    if (!hasTeacherAvailability) return customScheduleText.trim();
    const parts: string[] = [];
    for (const day of availableDays) {
      for (const period of day.periods) {
        if (isSlotSelected(day.key, period)) {
          const periodLabel = PERIODS[period];
          const periodLabelStr = isFr ? periodLabel.fr : periodLabel.en;
          const dayLabel = isFr ? day.labelFr : day.labelEn;
          parts.push(`${dayLabel} ${periodLabelStr.toLowerCase()}`);
        }
      }
    }
    return parts.join(', ');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.id) return;
    if (!message.trim()) {
      setError(isFr ? "Merci d'écrire un message." : 'Please write a message.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const finalSchedule = buildScheduleString();

      const { data: inserted, error: insErr } = await supabase
        .from('lesson_requests')
        .insert({
          parent_id: user.id,
          teacher_id: teacherId,
          child_id: selectedChildIds[0] || null,
          child_ids: selectedChildIds,
          subject: subject.trim() || null,
          level: level.trim() || null,
          message: message.trim(),
          preferred_schedule: finalSchedule || null,
          teaching_mode: teachingMode,
          status: 'pending',
        })
        .select('id')
        .single();

      if (insErr) throw insErr;

      try {
        fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/kalanden-mail`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'lesson-request',
              teacher_id: teacherId,
              parent_id: user.id,
              subject: subject.trim() || null,
              message: message.trim(),
              child_ids: selectedChildIds,
              preferred_schedule: finalSchedule || null,
              teaching_mode: teachingMode,
              request_id: inserted?.id,
            }),
          }
        ).catch((err) => console.warn('[Email lesson-request] Non envoyé:', err));
      } catch (err) {
        console.warn('[Email lesson-request] Non envoyé:', err);
      }

      onSuccess();
    } catch (err: any) {
      console.error('[LessonRequest] error', err);
      setError(err?.message || (isFr ? "Erreur lors de l'envoi" : 'Error sending request'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900 truncate">
              {isFr ? 'Demander un cours' : 'Request a lesson'}
            </h3>
            <p className="text-xs text-slate-500 truncate">
              {isFr ? 'À' : 'To'} {teacherName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-5 sm:px-6 py-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {!loadingChildren && children.length > 0 && (
              <div>
                <div className="flex items-baseline justify-between gap-3 mb-1.5">
                  <label className="text-sm font-medium text-slate-700">
                    {isFr ? 'Enfant(s) concerné(s)' : 'Concerned child(ren)'}
                  </label>
                  {selectedChildIds.length > 0 && (
                    <span className="text-xs text-emerald-600 font-medium">
                      {selectedChildIds.length} {isFr ? 'sélectionné' : 'selected'}
                      {selectedChildIds.length > 1 ? (isFr ? 's' : '') : ''}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2.5">
                  {isFr ? 'Sélectionnez un ou plusieurs enfants' : 'Select one or more children'}
                </p>

                <div className="space-y-2">
                  {children.map(child => {
                    const isSelected = selectedChildIds.includes(child.id);
                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => toggleChild(child.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-500/30'
                            : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                            isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                        </span>

                        <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                          <span className="text-emerald-700 text-sm font-bold">
                            {child.first_name.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isSelected ? 'text-emerald-900' : 'text-slate-900'}`}>
                            {child.first_name}
                          </p>
                          {child.level_custom && (
                            <p className="text-xs text-slate-500 truncate">{child.level_custom}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {children.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedChildIds.length === children.length) {
                        setSelectedChildIds([]);
                      } else {
                        setSelectedChildIds(children.map(c => c.id));
                      }
                    }}
                    className="mt-2 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    {selectedChildIds.length === children.length
                      ? (isFr ? 'Tout désélectionner' : 'Deselect all')
                      : (isFr ? 'Tout sélectionner' : 'Select all')}
                  </button>
                )}
              </div>
            )}

            {teacherSubjects.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {isFr ? 'Matière souhaitée' : 'Desired subject'}
                </label>
                {teacherSubjects.length <= 5 ? (
                  <div className="flex flex-wrap gap-2">
                    {teacherSubjects.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSubject(s === subject ? '' : s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          subject === s
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">{isFr ? 'Choisir…' : 'Choose…'}</option>
                    {teacherSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                )}
              </div>
            )}

            {teacherLevels.length > 0 && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  {isFr ? 'Niveau' : 'Level'}
                </label>
                {teacherLevels.length <= 5 ? (
                  <div className="flex flex-wrap gap-2">
                    {teacherLevels.map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLevel(l === level ? '' : l)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          level === l
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">{isFr ? 'Choisir…' : 'Choose…'}</option>
                    {teacherLevels.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                {isFr ? 'Mode souhaité' : 'Desired mode'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'home', labelFr: 'Domicile', labelEn: 'Home' },
                  { value: 'online', labelFr: 'En ligne', labelEn: 'Online' },
                  { value: 'both', labelFr: 'Les deux', labelEn: 'Both' },
                ] as const).map(m => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setTeachingMode(m.value)}
                    className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                      teachingMode === m.value
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    {isFr ? m.labelFr : m.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3 mb-1.5">
                <label className="text-sm font-medium text-slate-700">
                  {isFr ? 'Créneaux souhaités' : 'Preferred schedule'}
                </label>
                {selectedSlots.size > 0 && (
                  <span className="text-xs text-emerald-600 font-medium">
                    {selectedSlots.size} {isFr ? 'créneau' : 'slot'}
                    {selectedSlots.size > 1 ? 'x' : ''}
                  </span>
                )}
              </div>

              {hasTeacherAvailability ? (
                <>
                  <p className="text-xs text-slate-400 mb-3">
                    {isFr
                      ? "Sélectionnez un ou plusieurs créneaux parmi ceux du prof"
                      : "Select one or more slots from the teacher's availability"}
                  </p>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {availableDays.map(day => (
                      <div key={day.key} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                        <p className="text-xs font-semibold text-slate-700 mb-2">
                          {isFr ? day.labelFr : day.labelEn}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {day.periods.map(period => {
                            const isSelected = isSlotSelected(day.key, period);
                            const periodLabel = PERIODS[period];
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => toggleSlot(day.key, period)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                  isSelected
                                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-400'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
                                {isFr ? periodLabel.fr : periodLabel.en}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedSlots.size > 0 && (
                    <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-[11px] uppercase tracking-wide text-emerald-700 font-semibold mb-1">
                        {isFr ? 'Votre sélection' : 'Your selection'}
                      </p>
                      <p className="text-xs text-emerald-900 font-medium">
                        {buildScheduleString()}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-xs text-slate-400 mb-2">
                    {isFr
                      ? "Ce prof n'a pas encore renseigné ses créneaux. Indiquez-les en texte libre."
                      : 'This teacher has not set their availability yet. Indicate it as free text.'}
                  </p>
                  <input
                    type="text"
                    value={customScheduleText}
                    onChange={e => setCustomScheduleText(e.target.value)}
                    placeholder={isFr ? 'Ex : Jeudi matin, Vendredi soir' : 'Ex: Thursday morning, Friday evening'}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                {isFr ? 'Message *' : 'Message *'}
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
                required
                placeholder={
                  isFr
                    ? 'Présentez brièvement vos besoins : difficultés, objectifs, fréquence souhaitée…'
                    : 'Briefly describe your needs: difficulties, goals, frequency…'
                }
                className="w-full px-3 py-3 rounded-xl border border-slate-200 bg-white text-sm resize-none focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">{message.length}/500</p>
            </div>
          </div>

          <div className="border-t border-slate-200 p-4 sm:p-5 flex items-center justify-end gap-3 shrink-0 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="px-4 h-10 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isFr ? 'Annuler' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isFr ? 'Envoyer la demande' : 'Send request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}