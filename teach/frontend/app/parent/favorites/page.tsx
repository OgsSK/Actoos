'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Heart, Loader2, MapPin, Search, CheckCircle2, X, Home, Monitor,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import PageHeader from '@/app/components/PageHeader';

const AUTH_FORM_TIMEOUT_MS = 800;

// ============================================================
// TYPES
// ============================================================
interface SavedTeacherFull {
  id: string;
  teacher_id: string;
  saved_at: string;
  headline: string | null;
  profile_photo_url: string | null;
  cover_url: string | null;
  hourly_rate: number | null;
  rate_period: string | null;
  teaching_mode: string | null;
  experience_years: number | null;
  is_verified: boolean | null;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  subjects: { name_fr: string; name_en: string }[];
}

// ============================================================
// HELPERS
// ============================================================
function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
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
      className={`inline-flex items-center justify-center gap-2 px-5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition-colors disabled:opacity-50 ${className}`}
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

function FavoriteCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <SkeletonLine className="w-full h-28 rounded-none" />
      <div className="p-4 sm:p-5 pt-3">
        <div className="flex items-start gap-4">
          <SkeletonLine className="w-16 h-16 rounded-2xl shrink-0 -mt-10 ring-4 ring-white" />
          <div className="flex-1 min-w-0 pt-1 space-y-2">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <SkeletonLine className="h-6 w-20 rounded-full" />
          <SkeletonLine className="h-6 w-28 rounded-full" />
        </div>
        <div className="flex gap-1.5 mt-3">
          <SkeletonLine className="h-6 w-24 rounded-lg" />
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between">
          <SkeletonLine className="h-5 w-24" />
          <SkeletonLine className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <SkeletonLine className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <SkeletonLine className="h-8 w-72 max-w-full" />
          <SkeletonLine className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
        {[0, 1, 2, 3].map(i => (
          <FavoriteCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ParentFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const [teachers, setTeachers] = useState<SavedTeacherFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [authTimeoutExpired, setAuthTimeoutExpired] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAuthTimeoutExpired(true), AUTH_FORM_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (authLoading && !authTimeoutExpired) return;

    if (!user?.id) {
      if (!authLoading || authTimeoutExpired) {
        window.location.href = '/login';
      }
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, authTimeoutExpired]);

  async function load() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const { data: saves, error: savesErr } = await supabase
        .from('saved_teachers')
        .select('id, teacher_id, created_at')
        .eq('parent_id', user!.id)
        .order('created_at', { ascending: false });

      if (savesErr) throw savesErr;
      if (!saves || saves.length === 0) {
        setTeachers([]);
        return;
      }

      const teacherIds = saves.map(s => s.teacher_id);

      const [profilesRes, usersRes, subjectsRes] = await Promise.all([
        supabase
          .from('teacher_profiles')
          .select('id, headline, profile_photo_url, cover_url, hourly_rate, rate_period, teaching_mode, experience_years, is_verified, city_id')
          .in('id', teacherIds),
        supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', teacherIds),
        supabase
          .from('teacher_subjects')
          .select('teacher_id, subjects(name_fr, name_en)')
          .in('teacher_id', teacherIds),
      ]);

      const profiles = profilesRes.data || [];
      const users = usersRes.data || [];
      const tsubs = subjectsRes.data || [];

      const cityIds = profiles.map(p => p.city_id).filter((v): v is string => Boolean(v));
      const citiesRes = cityIds.length
        ? await supabase.from('cities').select('id, name').in('id', cityIds)
        : { data: [] as any[] };
      const cities = citiesRes.data || [];

      const merged: SavedTeacherFull[] = saves.map(s => {
        const p = profiles.find(pr => pr.id === s.teacher_id);
        const u = users.find(us => us.id === s.teacher_id);
        const c = p?.city_id ? cities.find(ci => ci.id === p.city_id) : null;
        const subjects = tsubs
          .filter(t => t.teacher_id === s.teacher_id)
          .flatMap(t => asArray(t.subjects))
          .filter(Boolean);

        return {
          id: s.id,
          teacher_id: s.teacher_id,
          saved_at: s.created_at,
          headline: p?.headline || null,
          profile_photo_url: p?.profile_photo_url || null,
          cover_url: p?.cover_url || null,
          hourly_rate: p?.hourly_rate || null,
          rate_period: p?.rate_period || null,
          teaching_mode: p?.teaching_mode || null,
          experience_years: p?.experience_years || null,
          is_verified: p?.is_verified || null,
          first_name: u?.first_name || null,
          last_name: u?.last_name || null,
          city: c?.name || null,
          subjects,
        };
      });

      setTeachers(merged);
    } catch (err) {
      console.error('[ParentFavorites]', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  async function removeFavorite(savedId: string, teacherId: string) {
    setRemovingId(teacherId);
    try {
      const { error } = await supabase
        .from('saved_teachers')
        .delete()
        .eq('id', savedId)
        .eq('parent_id', user!.id);
      if (error) throw error;
      setTeachers(prev => prev.filter(t => t.id !== savedId));
    } catch (err) {
      console.error('[ParentFavorites] remove error', err);
    } finally {
      setRemovingId(null);
    }
  }

  function displayName(t: SavedTeacherFull) {
    const first = t.first_name || '';
    const last = t.last_name || '';
    const full = `${first} ${last}`.trim();
    if (!full) return isFr ? 'Enseignant' : 'Teacher';
    const parts = full.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  if (loading && !hasLoadedOnce) {
    return <FavoritesSkeleton />;
  }
  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <PageHeader
        backHref="/dashboard"
        backLabel={isFr ? 'Retour au tableau de bord' : 'Back to dashboard'}
        title={isFr ? 'Mes profs sauvegardés' : 'My saved teachers'}
        subtitle={
          teachers.length === 0
            ? isFr
              ? "Vous n'avez pas encore sauvegardé de prof."
              : 'You haven’t saved any teacher yet.'
            : isFr
              ? `${teachers.length} prof${teachers.length > 1 ? 's' : ''} dans votre liste.`
              : `${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} in your list.`
        }
      />

      {teachers.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-5">
              <Heart className="w-7 h-7 text-red-300" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              {isFr ? 'Aucun prof sauvegardé' : 'No saved teacher'}
            </h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto leading-relaxed">
              {isFr
                ? 'Sauvegardez les profs qui vous intéressent en cliquant sur le cœur de leur profil. Vous les retrouverez ici.'
                : 'Save teachers you like by clicking the heart on their profile. You’ll find them here.'}
            </p>
            <Link href="/teachers" prefetch>
              <PrimaryButton>
                <Search className="w-4 h-4" />
                {isFr ? 'Chercher un prof' : 'Find a teacher'}
              </PrimaryButton>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
          {teachers.map(t => (
            <TeacherFavoriteCard
              key={t.id}
              teacher={t}
              isFr={isFr}
              isRemoving={removingId === t.teacher_id}
              onRemove={() => removeFavorite(t.id, t.teacher_id)}
              displayName={displayName(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CARTE PROF
// ============================================================
function TeacherFavoriteCard({
  teacher: t,
  isFr,
  isRemoving,
  onRemove,
  displayName,
}: {
  teacher: SavedTeacherFull;
  isFr: boolean;
  isRemoving: boolean;
  onRemove: () => void;
  displayName: string;
}) {
  const rate = formatRate(t.hourly_rate, t.rate_period, isFr);
  const mode = modeLabel(t.teaching_mode, isFr);
  const subjectsPreview = t.subjects.slice(0, 2);
  const extraSubjects = t.subjects.length - subjectsPreview.length;
  const initial = displayName.charAt(0).toUpperCase();

  const ModeIcon =
    t.teaching_mode === 'home' ? Home :
    t.teaching_mode === 'online' ? Monitor :
    Home;

  const hasExperience = typeof t.experience_years === 'number' && t.experience_years > 0;
  const hasCover = !!t.cover_url;

  return (
    <div className="group bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-red-200 transition-all duration-200 flex flex-col relative">
      {/* COVER — Link prefetch */}
      <Link
        href={`/teachers/${t.teacher_id}`}
        prefetch
        className="block relative w-full h-28 overflow-hidden bg-slate-100"
      >
        {hasCover ? (
          <img
            src={t.cover_url!}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : t.profile_photo_url ? (
          <>
            <img
              src={t.profile_photo_url}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover blur-sm scale-110"
            />
            <div className="absolute inset-0 bg-slate-900/30" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-100 via-slate-100 to-red-50" />
        )}

        {t.is_verified && (
          <div className="absolute top-2 left-2 z-10 bg-white/95 backdrop-blur-sm border border-red-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-red-500" />
            <span className="text-[10px] text-red-600 font-medium">
              {isFr ? 'Vérifié' : 'Verified'}
            </span>
          </div>
        )}
      </Link>

      {/* BOUTON RETIRER */}
      <button
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={isFr ? 'Retirer des favoris' : 'Remove from favorites'}
        className="absolute top-2 right-2 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-50 bg-white/95 border-white/40 text-slate-700 shadow-sm hover:bg-red-50 hover:border-red-300 hover:text-red-600"
      >
        {isRemoving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <X className="w-4 h-4" strokeWidth={2.5} />
        )}
      </button>

      {/* CONTENU */}
      <div className="p-4 sm:p-5 pt-3 flex flex-col flex-1">
        <Link
          href={`/teachers/${t.teacher_id}`}
          prefetch
          className="flex items-start gap-4"
        >
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-md -mt-10 sm:-mt-12 ring-4 ring-white">
            {t.profile_photo_url ? (
              <img
                src={t.profile_photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-xl sm:text-2xl font-bold">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-1 sm:pt-2">
            <h3 className="font-semibold text-slate-900 group-hover:text-red-500 line-clamp-2 leading-snug text-sm sm:text-base">
              {displayName}
            </h3>
            {t.headline && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">
                {t.headline}
              </p>
            )}
          </div>
        </Link>

        {/* Localisation + mode */}
        {(t.city || mode) && (
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {t.city && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs">
                <MapPin className="w-3 h-3" />
                {t.city}
              </span>
            )}
            {mode && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs">
                <ModeIcon className="w-3 h-3" />
                {mode}
              </span>
            )}
          </div>
        )}

        {/* Matières */}
        {subjectsPreview.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {subjectsPreview.map((s, i) => (
              <span
                key={i}
                className="inline-flex items-center text-xs text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg font-medium"
              >
                {isFr ? s.name_fr : s.name_en}
              </span>
            ))}
            {extraSubjects > 0 && (
              <span className="text-xs text-slate-400 px-2 py-1">
                +{extraSubjects}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-sm">
            {rate ? (
              <span className="font-semibold text-slate-900">{rate}</span>
            ) : (
              <span className="text-sm text-slate-500">
                {isFr ? 'Tarif sur demande' : 'Rate on request'}
              </span>
            )}
          </div>
          {hasExperience && (
            <span className="text-xs text-slate-400">
              {t.experience_years} {isFr ? 'ans' : 'yrs'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}