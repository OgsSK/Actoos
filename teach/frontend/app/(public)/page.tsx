'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, GraduationCap, ArrowRight, Sparkles, Shield,
  Heart, TrendingUp, BookOpen, LayoutDashboard, Pencil,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/lib/constants';

// ============================================================
// IMAGES
// ============================================================
const IMAGES = {
  hero: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=1200&q=80',
  band1: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1000&q=80',
  band2: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&q=80',
  band3: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=1000&q=80',
};

// ============================================================
// TYPES
// ============================================================
interface FeaturedTeacher {
  id: string;
  headline: string | null;
  hourly_rate: number | null;
  rate_period: string | null;
  teaching_mode: string | null;
  profile_photo_url: string | null;
  cover_url: string | null;
  experience_years: number | null;
  rating_avg: number;
  rating_count: number;
  user: { first_name: string | null; last_name: string | null } | null;
  city: { name: string } | null;
  subjects: { name_fr: string; name_en: string }[];
}

interface City { id: string; name: string; }
interface Subject { id: string; slug: string; name_fr: string; name_en: string; }

// ============================================================
// HELPERS
// ============================================================
function asArray<T>(v: T | T[] | null | undefined): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

// Format compact : 999 · 1,2K · 15K · 1,2M · 3Md
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

// Décimale avec virgule FR
function formatRating(value: number, isFr: boolean, decimals = 1): string {
  return value.toFixed(decimals).replace('.', isFr ? ',' : '.');
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
// PRIMITIVES
// ============================================================
function PrimaryButton({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function WhiteButton({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-white text-emerald-700 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function OutlineWhiteButton({
  children, className = '', ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-transparent border border-white/40 text-white text-sm font-medium transition-colors hover:bg-white/10 hover:border-white/60 ${className}`}
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

function FeaturedTeacherSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <SkeletonLine className="w-full h-28 sm:h-36 rounded-none" />
      <div className="p-4 sm:p-5 pt-3 sm:pt-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <SkeletonLine className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0" />
          <div className="flex-1 min-w-0 space-y-2 pt-1">
            <SkeletonLine className="h-5 w-32" />
            <SkeletonLine className="h-4 w-40" />
          </div>
        </div>
        <div className="flex gap-2 mt-3 sm:mt-4">
          <SkeletonLine className="h-6 w-20 rounded-full" />
          <SkeletonLine className="h-6 w-24 rounded-full" />
        </div>
        <div className="flex gap-1.5 mt-3">
          <SkeletonLine className="h-6 w-24 rounded-lg" />
          <SkeletonLine className="h-6 w-20 rounded-lg" />
        </div>
        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <SkeletonLine className="h-5 w-24" />
          <SkeletonLine className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

function SubjectsStripSkeleton() {
  return (
    <section className="py-6 sm:py-8 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 gap-4">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-4 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden -mx-4 px-4 sm:-mx-6 sm:px-6">
          {[0, 1, 2, 3, 4, 5].map(i => (
            <SkeletonLine key={i} className="h-10 w-28 rounded-2xl shrink-0" />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { isTeacher } = useTeachRole();
  const isFr = language === 'fr';

  const [featured, setFeatured] = useState<FeaturedTeacher[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (authLoading) return;
    loadSavedTeachers();
  }, [user?.id, authLoading]);

  async function loadSavedTeachers() {
    if (!user?.id) { setSavedIds([]); return; }
    try {
      const { data } = await supabase
        .from('saved_teachers')
        .select('teacher_id')
        .eq('parent_id', user.id);
      setSavedIds((data || []).map(s => s.teacher_id));
    } catch (err) {
      console.error('[HomePage] loadSavedTeachers', err);
    }
  }

  async function toggleSave(teacherId: string) {
    if (!user?.id) { window.location.href = '/login'; return; }
    setSavingId(teacherId);
    try {
      if (savedIds.includes(teacherId)) {
        await supabase.from('saved_teachers').delete()
          .eq('parent_id', user.id).eq('teacher_id', teacherId);
        setSavedIds(prev => prev.filter(id => id !== teacherId));
      } else {
        await supabase.from('saved_teachers').insert({ parent_id: user.id, teacher_id: teacherId });
        setSavedIds(prev => [...prev, teacherId]);
      }
    } catch (err) {
      console.error('[HomePage] toggleSave', err);
    } finally {
      setSavingId(null);
    }
  }

  async function loadAll() {
    if (!hasLoadedOnce) setLoading(true);
    try {
      // ✅ Tri : note DESC → count DESC → récence
      // ✅ Filtre : verification_status = 'verified'
      const { data: profiles } = await supabase
        .from('teacher_profiles')
        .select(`
          id, headline, hourly_rate, rate_period, teaching_mode,
          profile_photo_url, cover_url, experience_years, city_id, created_at,
          rating_avg, rating_count
        `)
        .eq('is_available', true)
        .eq('verification_status', 'verified')
        .not('headline', 'is', null)
        .order('rating_avg', { ascending: false })
        .order('rating_count', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);

      if (profiles && profiles.length > 0) {
        const profileIds = profiles.map(p => p.id);
        const cityIds = profiles.map(p => p.city_id).filter(Boolean);

        const [usersRes, citiesDataRes, subjectsDataRes] = await Promise.all([
          supabase.from('users').select('id, first_name, last_name').in('id', profileIds),
          cityIds.length
            ? supabase.from('cities').select('id, name').in('id', cityIds)
            : Promise.resolve({ data: [] as any[] }),
          supabase.from('teacher_subjects').select('teacher_id, subjects(id, name_fr, name_en)').in('teacher_id', profileIds),
        ]);

        const users = (usersRes.data || []) as any[];
        const citiesData = (citiesDataRes.data || []) as any[];
        const tsubs = (subjectsDataRes.data || []) as any[];

        const merged: FeaturedTeacher[] = profiles.map(p => {
          const subjectsList = tsubs
            .filter(t => t.teacher_id === p.id)
            .flatMap(t => asArray(t.subjects))
            .filter(Boolean);
          return {
            id: p.id,
            headline: p.headline,
            hourly_rate: p.hourly_rate,
            rate_period: p.rate_period,
            teaching_mode: p.teaching_mode,
            profile_photo_url: p.profile_photo_url,
            cover_url: p.cover_url,
            experience_years: p.experience_years,
            rating_avg: Number(p.rating_avg ?? 0),
            rating_count: Number(p.rating_count ?? 0),
            user: users.find(u => u.id === p.id) || null,
            city: p.city_id ? citiesData.find(c => c.id === p.city_id) || null : null,
            subjects: subjectsList,
          };
        });
        setFeatured(merged);
      } else {
        setFeatured([]);
      }

      // Villes des profs vérifiés
      const { data: allProfilesCities } = await supabase
        .from('teacher_profiles').select('city_id')
        .eq('is_available', true)
        .eq('verification_status', 'verified')
        .not('city_id', 'is', null);

      if (allProfilesCities && allProfilesCities.length > 0) {
        const cityIds = [...new Set(allProfilesCities.map(p => p.city_id).filter(Boolean))];
        const { data: citiesData } = await supabase
          .from('cities').select('id, name').in('id', cityIds as string[]).order('name');
        setCities(citiesData || []);
      }

      // Matières
      const { data: allTeacherSubjects } = await supabase
        .from('teacher_subjects').select('subject_id').not('subject_id', 'is', null);

      if (allTeacherSubjects && allTeacherSubjects.length > 0) {
        const subjectIds = [...new Set(allTeacherSubjects.map(t => t.subject_id).filter(Boolean))];
        const { data: subjectsData } = await supabase
          .from('subjects').select('id, slug, name_fr, name_en').in('id', subjectIds as string[])
          .order('order_index').limit(8);
        setSubjects(subjectsData || []);
      }
    } catch (err) {
      console.error('[HomePage] loadAll', err);
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }

  function formatRate(rate: number | null, period: string | null) {
    if (!rate) return null;
    const amount = new Intl.NumberFormat('fr-FR').format(rate);
    const suffixMap: Record<string, { fr: string; en: string }> = {
      hourly: { fr: 'FCFA / h', en: 'FCFA / hr' },
      session: { fr: 'FCFA / séance', en: 'FCFA / session' },
      weekly: { fr: 'FCFA / sem', en: 'FCFA / wk' },
      monthly: { fr: 'FCFA / mois', en: 'FCFA / mo' },
    };
    const key = period || 'hourly';
    const suffix = suffixMap[key] ? (isFr ? suffixMap[key].fr : suffixMap[key].en) : 'FCFA';
    return `${amount} ${suffix}`;
  }

  function displayName(t: FeaturedTeacher) {
    const first = t.user?.first_name || '';
    const last = t.user?.last_name || '';
    const full = `${first} ${last}`.trim();
    if (!full) return '—';
    const parts = full.split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1][0]}.`;
  }

  function modeLabel(mode: string | null) {
    if (!mode) return null;
    const map: Record<string, { fr: string; en: string }> = {
      home: { fr: 'À domicile', en: 'At home' },
      online: { fr: 'En ligne', en: 'Online' },
      both: { fr: 'Domicile & en ligne', en: 'Home & online' },
    };
    const m = map[mode];
    return m ? (isFr ? m.fr : m.en) : mode;
  }

  const isInitialLoading = loading && !hasLoadedOnce;

  return (
    <div className="bg-white text-slate-900">
      {/* ═══════════ HERO ═══════════ */}
      <Hero cities={cities} subjects={subjects} isFr={isFr} featuredCount={featured.length} />

      {/* ═══════════ SUBJECTS STRIP ═══════════ */}
      {isInitialLoading ? (
        <SubjectsStripSkeleton />
      ) : (
        subjects.length > 0 && <SubjectsStrip subjects={subjects} isFr={isFr} />
      )}

      {/* ═══════════ PROFS EN VEDETTE ═══════════ */}
      <section className="py-10 sm:py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
                {isFr ? 'Profs en vedette' : 'Featured teachers'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isFr ? 'Les mieux notés par les parents.' : 'Top rated by parents.'}
              </p>
            </div>
            <Link
              href="/teachers"
              prefetch
              className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors shrink-0"
            >
              {isFr ? 'Voir tous' : 'See all'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isInitialLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <FeaturedTeacherSkeleton key={i} />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="text-center py-10 sm:py-12 bg-white rounded-2xl border border-slate-200">
              <GraduationCap className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                {isFr ? 'Aucun prof pour le moment' : 'No teacher yet'}
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                {isFr ? 'Les premiers profs arrivent bientôt.' : 'The first teachers are coming soon.'}
              </p>
              {!isTeacher && (
                <Link href="/register?role=teacher" prefetch>
                  <PrimaryButton>
                    <GraduationCap className="w-4 h-4" />
                    {isFr ? 'Devenir enseignant' : 'Become a teacher'}
                  </PrimaryButton>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {featured.map(t => (
                <TeacherCard
                  key={t.id}
                  teacher={t}
                  isFr={isFr}
                  displayName={displayName(t)}
                  formatRate={formatRate}
                  modeLabel={modeLabel}
                  isSaved={savedIds.includes(t.id)}
                  isSaving={savingId === t.id}
                  onToggleSave={() => toggleSave(t.id)}
                />
              ))}
            </div>
          )}

          <div className="mt-6 text-center sm:hidden">
            <Link href="/teachers" prefetch className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              {isFr ? 'Voir tous les profs' : 'See all teachers'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ COMMENT ÇA MARCHE ═══════════ */}
      <section className="py-10 sm:py-16 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              {isFr ? 'Comment ça marche' : 'How it works'}
            </h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
              {isFr ? 'Simple pour les parents. Fluide pour les profs.' : 'Simple for parents. Smooth for teachers.'}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { n: '01', title: isFr ? 'Créez votre compte' : 'Create your account', desc: isFr ? 'Inscription rapide. Choisissez votre profil : parent ou enseignant.' : 'Quick sign up. Choose your profile: parent or teacher.' },
              { n: '02', title: isFr ? 'Complétez votre profil' : 'Complete your profile', desc: isFr ? 'Dites-nous qui vous êtes — matière, niveau, ville, expérience.' : 'Tell us who you are — subject, level, city, experience.' },
              { n: '03', title: isFr ? 'Trouvez ou proposez' : 'Find or offer', desc: isFr ? 'Les parents cherchent, les profs se font contacter.' : 'Parents search, teachers get contacted.' },
              { n: '04', title: isFr ? 'Échangez et organisez-vous' : 'Talk and organise', desc: isFr ? 'Discutez directement, convenez des cours à domicile ou en ligne.' : 'Chat directly, agree on lessons at home or online.' },
            ].map(s => (
              <div key={s.n} className="text-center p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-4 text-base sm:text-lg font-bold shadow-sm">
                  {s.n}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ BANDE PHOTO ═══════════ */}
      <section className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="aspect-square sm:aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl">
              <img src={IMAGES.band1} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700" />
            </div>
            <div className="aspect-square sm:aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl sm:mt-6 lg:mt-8">
              <img src={IMAGES.band2} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700" />
            </div>
            <div className="aspect-square sm:aspect-[4/5] overflow-hidden rounded-xl sm:rounded-2xl">
              <img src={IMAGES.band3} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ENSEIGNANT ═══════════ */}
      <TeacherCTASection isFr={isFr} user={user} isTeacher={isTeacher} />

      {/* ═══════════ POURQUOI KALANDEN ═══════════ */}
      <section className="py-10 sm:py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              {isFr ? `Pourquoi ${BRAND.name}` : `Why ${BRAND.name}`}
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              {isFr ? 'Les mêmes exigences, quel que soit votre rôle.' : 'The same standards, whatever your role.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Sparkles, title: isFr ? 'Profils détaillés' : 'Detailed profiles', desc: isFr ? "Chaque profil présente la matière, le niveau et l'expérience de l'enseignant." : "Each profile shows the teacher's subject, level and experience." },
              { icon: Shield, title: isFr ? 'Contact direct' : 'Direct contact', desc: isFr ? "Vous échangez directement avec l'enseignant, sans intermédiaire." : 'Talk directly with the teacher, no middleman.' },
              { icon: Heart, title: isFr ? 'Gratuit pour les parents' : 'Free for parents', desc: isFr ? 'Chercher, consulter, contacter : tout est gratuit pour les familles.' : 'Search, browse, contact: all free for families.' },
              { icon: TrendingUp, title: isFr ? 'Sans engagement' : 'No commitment', desc: isFr ? 'Aucun abonnement. Vous choisissez quand et comment avancer.' : 'No subscription. You choose when and how to move forward.' },
            ].map(r => {
              const Icon = r.icon;
              return (
                <div key={r.title} className="text-center p-5 sm:p-6 bg-white rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-md transition-all">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2 text-sm sm:text-base">{r.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{r.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            {!user ? (
              <Link href="/register" prefetch>
                <PrimaryButton className="px-8">
                  {isFr ? 'Créer un compte' : 'Create account'}
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </Link>
            ) : (
              <Link href="/dashboard" prefetch>
                <PrimaryButton className="px-8">
                  <LayoutDashboard className="w-4 h-4" />
                  {isFr ? 'Aller à mon espace' : 'Go to my space'}
                  <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════ */
function Hero({
  cities, subjects, isFr, featuredCount,
}: {
  cities: City[];
  subjects: Subject[];
  isFr: boolean;
  featuredCount: number;
}) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('city', location);
    router.push(`/teachers?${params.toString()}`);
  }

  const subjectTags = subjects.slice(0, 5);

  return (
    <section className="relative border-b border-slate-200 overflow-hidden bg-white">
      <div
        aria-hidden="true"
        className="hidden lg:block absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(16,185,129,0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(16,185,129,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 30% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 30% 50%, black 40%, transparent 100%)',
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-16 items-center">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 leading-[1.1] mb-4 sm:mb-6">
              {isFr ? (
                <>
                  Trouvez le prof qui fait{' '}
                  <span className="text-emerald-600">vraiment progresser</span> votre enfant.
                </>
              ) : (
                <>
                  Find the teacher who{' '}
                  <span className="text-emerald-600">really helps</span> your child progress.
                </>
              )}
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-[52ch] mb-6 sm:mb-8">
              {isFr
                ? 'Des enseignants vérifiés, à domicile ou en ligne. Consultez les profils, échangez directement, et choisissez celui qui convient à votre enfant.'
                : 'Verified teachers, at home or online. Browse profiles, message them directly, and pick the right one for your child.'}
            </p>

            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-2 flex flex-col sm:flex-row gap-2 mb-5 sm:mb-6"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder={isFr ? 'Nom, matière…' : 'Name, subject…'}
                  className="pl-10 h-11 w-full border-0 bg-slate-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="relative sm:w-40">
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="pl-3.5 h-11 border-0 bg-slate-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full appearance-none text-slate-900 cursor-pointer pr-8"
                >
                  <option value="">{isFr ? 'Toutes les villes' : 'All cities'}</option>
                  {cities.map(city => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
                <svg
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              <PrimaryButton type="submit" className="shrink-0">
                <Search className="w-4 h-4" />
                {isFr ? 'Chercher' : 'Search'}
              </PrimaryButton>
            </form>

            {subjectTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {subjectTags.map(subject => (
                  <Link
                    key={subject.id}
                    href={`/teachers?subject=${subject.id}`}
                    prefetch
                    className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-colors font-medium"
                  >
                    {isFr ? subject.name_fr : subject.name_en}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative hidden sm:block">
            <div className="aspect-[4/3] sm:aspect-[4/5] w-full max-w-md mx-auto lg:ml-auto lg:mr-0 overflow-hidden rounded-2xl shadow-xl shadow-slate-900/10">
              <img
                src={IMAGES.hero}
                alt=""
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="hidden lg:block absolute bottom-6 -left-6 bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 leading-none">
                    {featuredCount > 0 ? `${featuredCount}+` : '—'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {isFr ? 'Profs disponibles' : 'Teachers'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   SUBJECTS STRIP
   ═══════════════════════════════════════════════════════ */
function SubjectsStrip({ subjects, isFr }: { subjects: Subject[]; isFr: boolean }) {
  if (subjects.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 bg-white border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            {isFr ? 'Matières populaires' : 'Popular subjects'}
          </h2>
          <Link
            href="/teachers"
            prefetch
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1 shrink-0"
          >
            {isFr ? 'Tout voir' : 'See all'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x scrollbar-hide">
          {subjects.map(subject => (
            <Link
              key={subject.id}
              href={`/teachers?subject=${subject.id}`}
              prefetch
              className="flex-shrink-0 snap-start px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-2xl text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors whitespace-nowrap"
            >
              {isFr ? subject.name_fr : subject.name_en}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   TEACHER CARD — avec note + favoris
   ═══════════════════════════════════════════════════════ */
function TeacherCard({
  teacher, isFr, displayName, formatRate, modeLabel,
  isSaved, isSaving, onToggleSave,
}: {
  teacher: FeaturedTeacher;
  isFr: boolean;
  displayName: string;
  formatRate: (r: number | null, p: string | null) => string | null;
  modeLabel: (m: string | null) => string | null;
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => void;
}) {
  const rate = formatRate(teacher.hourly_rate, teacher.rate_period);
  const mode = modeLabel(teacher.teaching_mode);
  const subjectsPreview = teacher.subjects.slice(0, 2);
  const initial = displayName.charAt(0).toUpperCase();
  const hasExperience = typeof teacher.experience_years === 'number' && teacher.experience_years > 0;
  const hasRating = teacher.rating_count > 0;

  function handleSaveClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onToggleSave();
  }

  return (
    <Link
      href={`/teachers/${teacher.id}`}
      prefetch
      className="group block bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg hover:border-emerald-200 transition-all duration-200 relative"
    >
      <div className="relative w-full h-28 sm:h-36 overflow-hidden">
        {teacher.cover_url ? (
          <img src={teacher.cover_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : teacher.profile_photo_url ? (
          <>
            <img src={teacher.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover blur-sm scale-110" />
            <div className="absolute inset-0 bg-slate-900/30" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-100 via-slate-100 to-emerald-50" />
        )}

        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          aria-label={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-50 ${
            isSaved
              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
              : 'bg-white/95 border-white/40 text-slate-700 shadow-sm hover:bg-white hover:border-emerald-300 hover:text-emerald-600'
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} strokeWidth={2.5} />
        </button>
      </div>

      <div className="p-4 sm:p-5 pt-3 sm:pt-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
            {teacher.profile_photo_url ? (
              <img src={teacher.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-base sm:text-lg font-bold">
                {initial}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 line-clamp-2 leading-snug text-sm sm:text-base">
              {displayName}
            </h3>
            {teacher.headline && (
              <p className="text-sm text-slate-500 mt-1 line-clamp-1">{teacher.headline}</p>
            )}

            {/* ⭐ Note */}
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              {hasRating ? (
                <>
                  <StarsInline value={Math.round(teacher.rating_avg)} size={12} />
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {formatRating(teacher.rating_avg, isFr)}
                  </span>
                  <span className="text-slate-400 tabular-nums">
                    ({formatCount(teacher.rating_count, isFr)})
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                  {isFr ? 'Nouveau' : 'New'}
                </span>
              )}
            </div>
          </div>
        </div>

        {(teacher.city || mode) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
            {teacher.city && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs">
                <MapPin className="w-3 h-3" />
                {teacher.city.name}
              </span>
            )}
            {mode && (
              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs">
                {mode}
              </span>
            )}
          </div>
        )}

        {subjectsPreview.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {subjectsPreview.map((s, i) => (
              <span key={i} className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg font-medium">
                {isFr ? s.name_fr : s.name_en}
              </span>
            ))}
            {teacher.subjects.length > 2 && (
              <span className="text-xs text-slate-400 px-2 py-1">
                +{teacher.subjects.length - 2}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <div className="text-sm min-w-0">
            {rate ? (
              <span className="font-semibold text-slate-900 truncate">{rate}</span>
            ) : (
              <span className="text-sm text-slate-500">{isFr ? 'Tarif sur demande' : 'Rate on request'}</span>
            )}
          </div>
          {hasExperience && (
            <span className="text-xs text-slate-400 shrink-0">
              {teacher.experience_years} {isFr ? 'ans' : 'yrs'}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════
   TEACHER CTA
   ═══════════════════════════════════════════════════════ */
function TeacherCTASection({ isFr, user, isTeacher }: { isFr: boolean; user: any; isTeacher: boolean }) {
  const variant = user && isTeacher ? 'teacher' : user && !isTeacher ? 'parent-teacher' : 'guest';

  const bgClass = variant === 'teacher' ? 'bg-blue-600' : 'bg-emerald-600';
  const textClass = variant === 'teacher' ? 'text-blue-100' : 'text-emerald-50';

  const title =
    variant === 'teacher'
      ? isFr ? 'Votre profil est en ligne.' : 'Your profile is live.'
      : variant === 'parent-teacher'
        ? isFr ? 'Vous enseignez aussi ?' : 'You also teach?'
        : isFr ? 'Recevez des demandes de parents près de chez vous.' : 'Receive requests from parents near you.';

  const desc =
    variant === 'teacher'
      ? isFr
        ? 'Les parents peuvent vous trouver et vous contacter. Complétez votre profil pour gagner en visibilité.'
        : 'Parents can find and contact you. Complete your profile to gain visibility.'
      : variant === 'parent-teacher'
        ? isFr
          ? 'Créez votre profil enseignant en plus de votre compte parent, et recevez des demandes près de chez vous.'
          : 'Create a teacher profile on top of your parent account, and receive requests near you.'
        : isFr
          ? `Rejoignez ${BRAND.name}, créez votre profil gratuitement, et faites-vous connaître.`
          : `Join ${BRAND.name}, create your profile for free, and get discovered.`;

  return (
    <section className={`py-10 sm:py-16 ${bgClass} relative overflow-hidden`}>
      <div
        aria-hidden="true"
        className="hidden sm:block absolute inset-0 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)
          `,
          backgroundSize: '56px 56px',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
          {title}
        </h2>
        <p className={`mt-3 sm:mt-4 text-sm sm:text-base ${textClass} max-w-2xl mx-auto leading-relaxed`}>
          {desc}
        </p>

        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          {variant === 'teacher' && (
            <>
              <Link href="/teacher/profile/edit" prefetch>
                <WhiteButton className="w-full sm:w-auto !text-blue-700">
                  <Pencil className="w-4 h-4" />
                  {isFr ? 'Modifier mon profil' : 'Edit my profile'}
                </WhiteButton>
              </Link>
              <Link href="/dashboard" prefetch>
                <OutlineWhiteButton className="w-full sm:w-auto">
                  <LayoutDashboard className="w-4 h-4" />
                  {isFr ? 'Mon espace' : 'My space'}
                </OutlineWhiteButton>
              </Link>
            </>
          )}

          {variant === 'parent-teacher' && (
            <Link href="/register?role=teacher" prefetch>
              <WhiteButton className="w-full sm:w-auto">
                <GraduationCap className="w-4 h-4" />
                {isFr ? 'Devenir enseignant' : 'Become a teacher'}
              </WhiteButton>
            </Link>
          )}

          {variant === 'guest' && (
            <Link href="/register?role=teacher" prefetch>
              <WhiteButton className="w-full sm:w-auto">
                <GraduationCap className="w-4 h-4" />
                {isFr ? 'Créer mon profil' : 'Create my profile'}
              </WhiteButton>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}