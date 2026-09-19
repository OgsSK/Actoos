'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  X, ChevronDown, Search, MapPin, Home, Monitor,
  CheckCircle2, Heart, Star,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { useAuth } from '@/app/context/AuthContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

// ============================================================
// TYPES
// ============================================================
interface TeacherCard {
  id: string;
  headline: string | null;
  bio: string | null;
  hourly_rate: number | null;
  rate_period: string | null;
  teaching_mode: string | null;
  profile_photo_url: string | null;
  cover_url: string | null;
  is_verified: boolean | null;
  experience_years: number | null;
  city_id: string | null;
  rating_avg: number;
  rating_count: number;
  saved_count: number;
  user: { first_name: string | null; last_name: string | null } | null;
  city: { id: string; name: string } | null;
  subjects: { id: string; name_fr: string; name_en: string }[];
  levels: { id: string; name_fr: string; name_en: string }[];
}

interface City { id: string; name: string; }
interface Subject { id: string; name_fr: string; name_en: string; }
interface Level { id: string; name_fr: string; name_en: string; }

// ============================================================
// HELPERS
// ============================================================
function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function removeAccents(str = '') {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
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

function StarsInline({ value, size = 12 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[1px]">
      {[1, 2, 3, 4, 5].map(n => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={n <= value ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={2}
          className={n <= value ? 'text-amber-400' : 'text-slate-300'}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
}

// ============================================================
// SKELETON
// ============================================================
function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />;
}

function TeacherCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <SkeletonLine className="w-full h-36 rounded-none" />
      <div className="p-5 pt-4 flex flex-col flex-1">
        <div className="flex items-start gap-4">
          <SkeletonLine className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="h-4 w-40" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <SkeletonLine className="h-3.5 w-full" />
          <SkeletonLine className="h-3.5 w-5/6" />
        </div>
        <div className="flex gap-2 mt-4">
          <SkeletonLine className="h-7 w-20 rounded-lg" />
          <SkeletonLine className="h-7 w-28 rounded-lg" />
        </div>
        <div className="flex gap-1.5 mt-3">
          <SkeletonLine className="h-6 w-24 rounded-lg" />
          <SkeletonLine className="h-6 w-20 rounded-lg" />
        </div>
        <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center mt-4">
          <SkeletonLine className="h-6 w-24 rounded-full" />
          <SkeletonLine className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

function TeachersListSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <TeacherCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================================
// PAGE CONTENT
// ============================================================
function TeachersPageContent() {
  const { language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { isTeacher } = useTeachRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFr = language === 'fr';

  const [teachers, setTeachers] = useState<TeacherCard[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [fSearch, setFSearch] = useState<string>(searchParams.get('q') || '');
  const [fSubject, setFSubject] = useState<string>(searchParams.get('subject') || '');
  const [fLevel, setFLevel] = useState<string>(searchParams.get('level') || '');
  const [fCity, setFCity] = useState<string>(searchParams.get('city') || '');
  const [fMode, setFMode] = useState<string>(searchParams.get('mode') || '');
  const [fRating, setFRating] = useState<string>(searchParams.get('rating') || '');

  const canSave = !isTeacher;

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadSavedTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading, isTeacher]);

  async function loadSavedTeachers() {
    if (isTeacher || !user?.id) { setSavedIds([]); return; }
    try {
      const { data } = await supabase
        .from('saved_teachers')
        .select('teacher_id')
        .eq('parent_id', user.id);
      setSavedIds((data || []).map(s => s.teacher_id));
    } catch (err) {
      console.error('[Teachers] loadSavedTeachers', err);
    }
  }

  async function toggleSave(teacherId: string) {
    if (isTeacher) {
      console.warn('[Teachers] toggleSave blocked: user is a teacher');
      return;
    }

    if (!user?.id) { window.location.href = '/login'; return; }
    setSavingId(teacherId);
    try {
      if (savedIds.includes(teacherId)) {
        await supabase.from('saved_teachers').delete()
          .eq('parent_id', user.id).eq('teacher_id', teacherId);
        setSavedIds(prev => prev.filter(id => id !== teacherId));
        setTeachers(prev => prev.map(t =>
          t.id === teacherId ? { ...t, saved_count: Math.max(0, t.saved_count - 1) } : t
        ));
      } else {
        await supabase.from('saved_teachers').insert({ parent_id: user.id, teacher_id: teacherId });
        setSavedIds(prev => [...prev, teacherId]);
        setTeachers(prev => prev.map(t =>
          t.id === teacherId ? { ...t, saved_count: t.saved_count + 1 } : t
        ));
      }
    } catch (err) {
      console.error('[Teachers] toggleSave', err);
    } finally {
      setSavingId(null);
    }
  }

  async function loadAll() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      const [profilesRes, citiesRes, subjectsRes, levelsRes] = await Promise.all([
        supabase
          .from('teacher_profiles')
          .select(`
            id, headline, bio, hourly_rate, rate_period, teaching_mode, profile_photo_url, cover_url, is_verified, experience_years, city_id, rating_avg, rating_count
          `)
          .eq('is_available', true)
          .eq('verification_status', 'verified')
          .not('headline', 'is', null)
          .order('rating_avg', { ascending: false })
          .order('rating_count', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
        supabase.from('subjects').select('id, name_fr, name_en').order('order_index'),
        supabase.from('levels').select('id, name_fr, name_en').order('order_index'),
      ]);

      const profiles = profilesRes.data || [];

      setCities(citiesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setLevels(levelsRes.data || []);

      if (profiles.length === 0) {
        setTeachers([]);
        return;
      }

      const profileIds = profiles.map(p => p.id);

      const [usersRes, tsubsRes, tlevelsRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, suspended_at')
          .in('id', profileIds),
        supabase
          .from('teacher_subjects')
          .select('teacher_id, subjects(id, name_fr, name_en)')
          .in('teacher_id', profileIds),
        supabase
          .from('teacher_levels')
          .select('teacher_id, levels(id, name_fr, name_en)')
          .in('teacher_id', profileIds),
      ]);

      const users = (usersRes.data || []) as Array<{
        id: string;
        first_name: string | null;
        last_name: string | null;
        suspended_at: string | null;
      }>;
      const tsubs = (tsubsRes.data || []) as Array<{ teacher_id: string; subjects: any; }>;
      const tlevels = (tlevelsRes.data || []) as Array<{ teacher_id: string; levels: any; }>;

      const activeProfileIds = new Set(
        users.filter(u => !u.suspended_at).map(u => u.id)
      );
      const activeProfiles = profiles.filter(p => activeProfileIds.has(p.id));

      let savesData: any[] = [];
      try {
        const savesRes = await supabase
          .from('saved_teachers')
          .select('teacher_id')
          .in('teacher_id', profileIds);
        savesData = savesRes.data || [];
      } catch (err) {
        console.warn('[Teachers] saved_teachers échoué (probablement RLS anon):', err);
      }

      const savesByTeacher = new Map<string, number>();
      savesData.forEach((s: any) => {
        savesByTeacher.set(s.teacher_id, (savesByTeacher.get(s.teacher_id) || 0) + 1);
      });

      const cityMap: Record<string, City> = {};
      (citiesRes.data || []).forEach(c => { cityMap[c.id] = c; });

      const merged: TeacherCard[] = activeProfiles.map(p => {
        const subjectsList = tsubs
          .filter(t => t.teacher_id === p.id)
          .flatMap(t => asArray(t.subjects))
          .filter(Boolean);

        const levelsList = tlevels
          .filter(t => t.teacher_id === p.id)
          .flatMap(t => asArray(t.levels))
          .filter(Boolean);

        return {
          id: p.id,
          headline: p.headline,
          bio: p.bio,
          hourly_rate: p.hourly_rate,
          rate_period: p.rate_period,
          teaching_mode: p.teaching_mode,
          profile_photo_url: p.profile_photo_url,
          cover_url: p.cover_url,
          is_verified: p.is_verified,
          experience_years: p.experience_years,
          city_id: p.city_id,
          rating_avg: Number(p.rating_avg ?? 0),
          rating_count: Number(p.rating_count ?? 0),
          saved_count: savesByTeacher.get(p.id) || 0,
          user: users.find(u => u.id === p.id) || null,
          city: p.city_id ? cityMap[p.city_id] || null : null,
          subjects: subjectsList,
          levels: levelsList,
        };
      });

      setTeachers(merged);
    } catch (err) {
      console.error('[Teachers] load error', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  const usedSubjects = useMemo(() => {
    const ids = new Set<string>();
    teachers.forEach(t => t.subjects.forEach(s => ids.add(s.id)));
    return subjects.filter(s => ids.has(s.id));
  }, [teachers, subjects]);

  const usedLevels = useMemo(() => {
    const ids = new Set<string>();
    teachers.forEach(t => t.levels.forEach(l => ids.add(l.id)));
    return levels.filter(l => ids.has(l.id));
  }, [teachers, levels]);

  const usedCities = useMemo(() => {
    const ids = new Set<string>();
    teachers.forEach(t => { if (t.city_id) ids.add(t.city_id); });
    return cities.filter(c => ids.has(c.id));
  }, [teachers, cities]);

  const usedModes = useMemo(() => {
    const modes = new Set<string>();
    teachers.forEach(t => { if (t.teaching_mode) modes.add(t.teaching_mode); });
    const all = [
      { value: 'home', label: isFr ? 'À domicile' : 'At home' },
      { value: 'online', label: isFr ? 'En ligne' : 'Online' },
      { value: 'both', label: isFr ? 'Domicile & en ligne' : 'Home & online' },
    ];
    return all.filter(m => modes.has(m.value));
  }, [teachers, isFr]);

  const hasAnyRating = useMemo(
    () => teachers.some(t => t.rating_count > 0),
    [teachers]
  );

  const ratingOptions = useMemo(() => {
    const opt = (v: string, label: string) => ({ value: v, label });
    return [
      opt('4.5', isFr ? '4,5★ et plus' : '4.5★ & up'),
      opt('4',   isFr ? '4★ et plus'   : '4★ & up'),
      opt('3.5', isFr ? '3,5★ et plus' : '3.5★ & up'),
      opt('3',   isFr ? '3★ et plus'   : '3★ & up'),
      opt('2',   isFr ? '2★ et plus'   : '2★ & up'),
    ];
  }, [isFr]);

  function displayName(t: TeacherCard) {
    const first = t.user?.first_name || '';
    const last = t.user?.last_name || '';
    const full = `${first} ${last}`.trim();
    if (!full) return isFr ? 'Enseignant' : 'Teacher';
    const parts = full.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  const filtered = useMemo(() => {
    return teachers.filter(t => {
      if (fSearch) {
        const kw = removeAccents(fSearch);
        const name = displayName(t);
        const headline = t.headline || '';
        if (!removeAccents(name).includes(kw) && !removeAccents(headline).includes(kw)) {
          return false;
        }
      }
      if (fSubject && !t.subjects.some(s => s.id === fSubject)) return false;
      if (fLevel && !t.levels.some(l => l.id === fLevel)) return false;
      if (fCity && t.city_id !== fCity) return false;
      if (fMode && t.teaching_mode !== fMode && t.teaching_mode !== 'both') return false;

      if (fRating) {
        const min = parseFloat(fRating);
        if (!Number.isFinite(min)) return false;
        if (t.rating_count === 0) return false;
        if (t.rating_avg < min) return false;
      }

      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, fSearch, fSubject, fLevel, fCity, fMode, fRating]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (fSearch) params.set('q', fSearch);
    if (fSubject) params.set('subject', fSubject);
    if (fLevel) params.set('level', fLevel);
    if (fCity) params.set('city', fCity);
    if (fMode) params.set('mode', fMode);
    if (fRating) params.set('rating', fRating);
    const qs = params.toString();
    const newUrl = qs ? `/teachers?${qs}` : '/teachers';
    router.replace(newUrl, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fSearch, fSubject, fLevel, fCity, fMode, fRating]);

  const hasFilters = fSearch || fSubject || fLevel || fCity || fMode || fRating;

  function clearAll() {
    setFSearch('');
    setFSubject('');
    setFLevel('');
    setFCity('');
    setFMode('');
    setFRating('');
  }

  const countMessage = (() => {
    if (loading && !hasLoadedOnce) {
      return isFr ? 'Chargement des profs…' : 'Loading teachers…';
    }
    if (filtered.length === 0) {
      return isFr
        ? `Aucun prof disponible sur ${BRAND.name} pour le moment.`
        : `No teacher available on ${BRAND.name} yet.`;
    }
    return isFr
      ? `${filtered.length} prof${filtered.length > 1 ? 's' : ''} disponible${filtered.length > 1 ? 's' : ''} sur ${BRAND.name}. Filtrez par matière, niveau, ville ou mode.`
      : `${filtered.length} teacher${filtered.length !== 1 ? 's' : ''} available on ${BRAND.name}.`;
  })();

  const isInitialLoading = loading && !hasLoadedOnce;

  return (
    <div className="min-h-screen bg-[#fffafa]">
      {/* ═══════════ HERO CLAIR avec dégradé rosé ═══════════ */}
      <div className="relative bg-gradient-to-b from-white via-red-50 to-red-100 overflow-hidden">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3 text-slate-900">
            {isFr
              ? 'Des enseignants vérifiés, près de chez vous.'
              : 'Verified teachers, near you.'}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mb-6 sm:mb-8">
            {countMessage}
          </p>

          <div className="space-y-3">
            <div className="relative group">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 group-focus-within:text-red-500 transition-colors"
              />
              <input
                type="text"
                value={fSearch}
                onChange={e => setFSearch(e.target.value)}
                placeholder={
                  isFr
                    ? 'Rechercher un prof par nom ou titre…'
                    : 'Search a teacher by name or title…'
                }
                className="w-full h-12 pl-11 pr-4 bg-white text-slate-900 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 shadow-lg shadow-red-500/5 transition-shadow"
              />
            </div>

            <div
              className={`grid grid-cols-2 gap-3 ${
                hasAnyRating ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
              }`}
            >
              <FilterSelect
                label={isFr ? 'Matière' : 'Subject'}
                value={fSubject}
                onChange={setFSubject}
                placeholder={isFr ? 'Toutes les matières' : 'All subjects'}
                options={usedSubjects.map(s => ({ value: s.id, label: isFr ? s.name_fr : s.name_en }))}
                disabled={isInitialLoading}
              />
              <FilterSelect
                label={isFr ? 'Niveau' : 'Level'}
                value={fLevel}
                onChange={setFLevel}
                placeholder={isFr ? 'Tous les niveaux' : 'All levels'}
                options={usedLevels.map(l => ({ value: l.id, label: isFr ? l.name_fr : l.name_en }))}
                disabled={isInitialLoading}
              />
              <FilterSelect
                label={isFr ? 'Ville' : 'City'}
                value={fCity}
                onChange={setFCity}
                placeholder={isFr ? 'Toutes les villes' : 'All cities'}
                options={usedCities.map(c => ({ value: c.id, label: c.name }))}
                disabled={isInitialLoading}
              />
              <FilterSelect
                label={isFr ? 'Mode' : 'Mode'}
                value={fMode}
                onChange={setFMode}
                placeholder={isFr ? 'Tous les modes' : 'All modes'}
                options={usedModes}
                disabled={isInitialLoading}
              />

              {hasAnyRating && (
                <RatingFilterSelect
                  label={isFr ? 'Note minimum' : 'Min rating'}
                  value={fRating}
                  onChange={setFRating}
                  placeholder={isFr ? 'Toutes les notes' : 'Any rating'}
                  options={ratingOptions}
                  disabled={isInitialLoading}
                />
              )}
            </div>

            {hasFilters && (
              <div className="flex items-center gap-4 pt-2">
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                  {isFr ? 'Effacer les filtres' : 'Clear filters'}
                </button>
                <span className="text-sm text-slate-500">
                  {isFr
                    ? `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`
                    : `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════ LISTE ═══════════ */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {isInitialLoading ? (
          <TeachersListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 sm:py-20 max-w-md mx-auto">
            <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-red-400" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              {isFr ? 'Aucun prof trouvé' : 'No teacher found'}
            </h2>
            <p className="text-sm sm:text-base text-slate-500 mb-6">
              {isFr
                ? 'Essayez de modifier vos filtres, ou revenez plus tard.'
                : 'Try adjusting your filters, or come back later.'}
            </p>
            {hasFilters && (
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 px-5 min-h-[44px] rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium shadow-sm transition-colors"
              >
                <X size={14} />
                {isFr ? 'Effacer les filtres' : 'Clear filters'}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map(t => (
              <TeacherCardItem
                key={t.id}
                teacher={t}
                isFr={isFr}
                displayName={displayName(t)}
                isSaved={savedIds.includes(t.id)}
                isSaving={savingId === t.id}
                onToggleSave={() => toggleSave(t.id)}
                canSave={canSave}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════ CTA FINAL ═══════════ */}
      {!isTeacher && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 sm:pb-16">
          <div className="bg-red-500 rounded-3xl p-8 sm:p-10 lg:p-14 text-white shadow-lg">
            <div className="max-w-2xl">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-4">
                {isFr ? 'Vous êtes enseignant ?' : 'Are you a teacher?'}
              </h2>
              <p className="text-red-50 text-base sm:text-lg mb-6 sm:mb-8 leading-relaxed">
                {isFr
                  ? `Rejoignez ${BRAND.name}, créez votre profil gratuitement et recevez des demandes de parents.`
                  : `Join ${BRAND.name}, create your profile for free and receive requests from parents.`}
              </p>
              <Link
                href="/register?role=teacher"
                prefetch
                className="inline-flex items-center justify-center px-6 sm:px-8 min-h-[44px] rounded-xl bg-white text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors shadow-sm"
              >
                {isFr ? 'Devenir enseignant' : 'Become a teacher'}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SOUS-COMPOSANTS
// ============================================================

function FilterSelect({
  label, value, onChange, placeholder, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 pl-4 pr-10 bg-white text-slate-900 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-red-500/5 transition-shadow"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

function RatingFilterSelect({
  label, value, onChange, placeholder, options, disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 font-medium mb-1.5">
        {label}
      </label>
      <div className="relative">
        <Star
          size={14}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400 fill-amber-400 pointer-events-none z-10"
        />
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full h-12 pl-9 pr-10 bg-white text-slate-900 text-sm rounded-xl border-0 focus:outline-none focus:ring-2 focus:ring-red-500/30 appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-wait shadow-lg shadow-red-500/5 transition-shadow"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
}

function TeacherCardItem({
  teacher, isFr, displayName, isSaved, isSaving, onToggleSave, canSave,
}: {
  teacher: TeacherCard;
  isFr: boolean;
  displayName: string;
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => void;
  canSave: boolean;
}) {
  const rate = formatRate(teacher.hourly_rate, teacher.rate_period, isFr);
  const mode = modeLabel(teacher.teaching_mode, isFr);
  const subjectsPreview = teacher.subjects.slice(0, 2);
  const extraSubjects = teacher.subjects.length - subjectsPreview.length;
  const initial = displayName.charAt(0).toUpperCase();

  const ModeIcon =
    teacher.teaching_mode === 'home' ? Home :
    teacher.teaching_mode === 'online' ? Monitor :
    Home;

  const hasExperience =
    typeof teacher.experience_years === 'number' && teacher.experience_years > 0;

  const hasRating = teacher.rating_count > 0;
  const hasSaves = teacher.saved_count > 0;

  const formattedRating = formatRating(teacher.rating_avg, isFr, 1);
  const formattedRatingCount = formatCount(teacher.rating_count, isFr);
  const formattedSaves = formatCount(teacher.saved_count, isFr);

  function handleSaveClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave();
  }

  return (
    <Link
      href={`/teachers/${teacher.id}`}
      prefetch
      className="group bg-white rounded-2xl border border-slate-200 hover:border-red-200 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full relative"
    >
      <div className="relative w-full h-36 bg-slate-100 overflow-hidden">
        {teacher.cover_url ? (
          <img
            src={teacher.cover_url}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : teacher.profile_photo_url ? (
          <>
            <img
              src={teacher.profile_photo_url}
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

        {canSave && (
          <button
            onClick={handleSaveClick}
            disabled={isSaving}
            aria-label={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-50 ${
              isSaved
                ? 'bg-red-500 border-red-500 text-white shadow-sm'
                : 'bg-white/95 border-white/40 text-slate-700 shadow-sm hover:bg-white hover:border-red-300 hover:text-red-500'
            }`}
          >
            <Heart
              size={16}
              className={isSaved ? 'fill-white' : ''}
              strokeWidth={2.5}
            />
          </button>
        )}
      </div>

      <div className="p-5 pt-4 flex flex-col flex-1">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
            {teacher.profile_photo_url ? (
              <img
                src={teacher.profile_photo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-lg font-bold">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900 group-hover:text-red-500 transition-colors truncate text-base">
                {displayName}
              </h3>
              {teacher.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-600 border border-red-100 rounded-full px-2 py-0.5 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  {isFr ? 'Vérifié' : 'Verified'}
                </span>
              )}
            </div>
            {teacher.headline && (
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {teacher.headline}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
              {hasRating ? (
                <span className="inline-flex items-center gap-1">
                  <StarsInline value={Math.round(teacher.rating_avg)} size={12} />
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {formattedRating}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    ({formattedRatingCount})
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                  {isFr ? 'Nouveau' : 'New'}
                </span>
              )}

              {hasRating && hasSaves && (
                <span className="text-slate-300 select-none" aria-hidden="true">·</span>
              )}

              {hasSaves && (
                <span
                  className="inline-flex items-center gap-1"
                  title={
                    isFr
                      ? `${teacher.saved_count} parent${teacher.saved_count > 1 ? 's ont' : ' a'} sauvegardé ce prof`
                      : `${teacher.saved_count} parent${teacher.saved_count > 1 ? 's' : ''} saved this teacher`
                  }
                >
                  <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                  <span className="font-medium text-slate-600 tabular-nums">
                    {formattedSaves}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>

        {teacher.bio && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4 mt-3 leading-relaxed">
            {teacher.bio}
          </p>
        )}

        {(teacher.city || mode) && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            {teacher.city && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs">
                <MapPin className="w-3 h-3" />
                {teacher.city.name}
              </span>
            )}
            {mode && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs">
                <ModeIcon className="w-3 h-3" />
                {mode}
              </span>
            )}
          </div>
        )}

        {subjectsPreview.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {subjectsPreview.map(s => (
              <span
                key={s.id}
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

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {rate ? (
            <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 font-medium text-xs sm:text-sm rounded-full px-3 py-1">
              {rate}
            </span>
          ) : (
            <span className="text-xs text-slate-500">
              {isFr ? 'Tarif sur demande' : 'Rate on request'}
            </span>
          )}

          {hasExperience ? (
            <span className="text-xs sm:text-sm text-slate-400">
              {teacher.experience_years} {isFr ? 'an' : 'yr'}
              {(teacher.experience_years ?? 0) > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs font-medium text-red-500 group-hover:underline">
              {isFr ? 'Voir profil' : 'View profile'} →
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════
// WRAPPER SUSPENSE
// ═══════════════════════════════════════════════════════════
export default function TeachersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fffafa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-red-500" />
      </div>
    }>
      <TeachersPageContent />
    </Suspense>
  );
}