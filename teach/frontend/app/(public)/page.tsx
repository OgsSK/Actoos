'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, GraduationCap, ArrowRight, Sparkles, Shield,
  Heart, TrendingUp, BookOpen, LayoutDashboard, Pencil,
  UserPlus, MessageSquare, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/app/context/AuthContext';
import { useLanguage } from '@/app/context/LanguageContext';
import { useTeachRole } from '@/app/hooks/useTeachRole';
import { BRAND } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import {
  useFeaturedTeachers,
  useSavedTeachers,
  useToggleSave,
  type FeaturedTeacher,
  type RefCity,
  type RefSubject,
} from '@/lib/hooks/useTeachers';

// ============================================================
// IMAGES
// ============================================================
const IMAGES = {
  hero: '/hero.jpg',
  forParents: '/for-parents.jpg',
  forTeachers: '/for-teachers.jpg',
};

// ============================================================
// FADE-IN AU SCROLL
// ============================================================
function FadeInSection({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out will-change-transform ${className} ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function formatCount(n: number, isFr: boolean): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));
  const sep = isFr ? ',' : '.';
  if (n < 1_000_000) {
    const v = n / 1000;
    const str = v < 10 ? v.toFixed(1) : String(Math.round(v));
    return `${str.replace('.', sep)}K`;
  }
  const v = n / 1_000_000;
  const str = v < 10 ? v.toFixed(1) : String(Math.round(v));
  return `${str.replace('.', sep)}M`;
}

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
function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-emerald-600 text-white text-sm font-medium shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}
function WhiteButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-white text-emerald-700 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 ${className}`}>
      {children}
    </button>
  );
}
function OutlineWhiteButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-transparent border border-white/40 text-white text-sm font-medium transition-colors hover:bg-white/10 hover:border-white/60 ${className}`}>
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
      </div>
    </div>
  );
}

function SubjectsStripSkeleton() {
  return (
    <section className="py-7 sm:py-10 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 gap-4">
          <SkeletonLine className="h-5 w-40" />
          <SkeletonLine className="h-4 w-16" />
        </div>
        <div className="flex gap-3 overflow-hidden -mx-4 px-4 sm:-mx-6 sm:px-6">
          {[0, 1, 2, 3, 4, 5].map(i => <SkeletonLine key={i} className="h-10 w-28 rounded-2xl shrink-0" />)}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function HomePage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { isTeacher } = useTeachRole();
  const isFr = language === 'fr';

  const canSave = !isTeacher;

  const { data: featured = [], isLoading: loadingFeatured } = useFeaturedTeachers(6);
  const { data: savedIds = [] } = useSavedTeachers(canSave ? user?.id : undefined);
  const toggleSave = useToggleSave();

  const [savingId, setSavingId] = useState<string | null>(null);
  const [usedSubjects, setUsedSubjects] = useState<RefSubject[] | null>(null);
  const [usedCities, setUsedCities] = useState<RefCity[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // 1. Récupérer les profs vérifiés + disponibles (avec leurs city_id)
        const { data: teachers, error: tErr } = await supabase
          .from('teacher_profiles')
          .select('id, city_id')
          .eq('verification_status', 'verified')
          .eq('is_available', true);

        if (tErr || !teachers || teachers.length === 0) {
          if (!cancelled) {
            setUsedSubjects([]);
            setUsedCities([]);
          }
          return;
        }

        const teacherIds = teachers.map(t => t.id);
        const cityIds = Array.from(
          new Set(
            teachers
              .map(t => t.city_id)
              .filter((v): v is string => Boolean(v))
          )
        );

        // 2. En parallèle : matières + villes utilisées
        const [linksRes, citiesRes] = await Promise.all([
          supabase
            .from('teacher_subjects')
            .select('subject_id, subjects(id, name_fr, name_en)')
            .in('teacher_id', teacherIds)
            .not('subject_id', 'is', null),
          cityIds.length
            ? supabase
                .from('cities')
                .select('id, name')
                .in('id', cityIds)
                .eq('is_active', true)
                .order('name')
            : Promise.resolve({ data: [] as any[] }),
        ]);

        // 3. Compter les matières (pour trier par popularité)
        const counts = new Map<string, { subject: RefSubject; count: number }>();
        (linksRes.data || []).forEach((l: any) => {
          const s = Array.isArray(l.subjects) ? l.subjects[0] : l.subjects;
          if (!s || !s.id) return;
          const prev = counts.get(s.id);
          if (prev) prev.count += 1;
          else counts.set(s.id, { subject: s, count: 1 });
        });

        const sortedSubjects = Array.from(counts.values())
          .sort((a, b) => b.count - a.count)
          .map(c => c.subject);

        if (!cancelled) {
          setUsedSubjects(sortedSubjects);
          setUsedCities((citiesRes.data || []) as RefCity[]);
        }
      } catch (err) {
        console.error('[Home] load used subjects/cities', err);
        if (!cancelled) {
          setUsedSubjects([]);
          setUsedCities([]);
        }
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const isLoadingSubjects = usedSubjects === null;
  const subjectsForDisplay: RefSubject[] = isLoadingSubjects
    ? []
    : usedSubjects;

  const heroSubjects = subjectsForDisplay.slice(0, 5);

  // Villes à afficher dans le sélecteur : uniquement celles où il y a au moins un prof vérifié
  const citiesForDisplay: RefCity[] =
    usedCities === null ? [] : usedCities;

  async function handleToggleSave(teacherId: string) {
    if (!canSave) return;
    if (!user?.id) { window.location.href = '/login'; return; }
    setSavingId(teacherId);
    try {
      await toggleSave.mutateAsync({
        parentId: user.id,
        teacherId,
        isSaved: savedIds.includes(teacherId),
      });
    } finally {
      setSavingId(null);
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
    const full = `${t.user?.first_name ?? ''} ${t.user?.last_name ?? ''}`.trim();
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
    return map[mode] ? (isFr ? map[mode].fr : map[mode].en) : mode;
  }

  const howItWorksSteps = [
    {
      icon: UserPlus,
      title: isFr ? 'Créez votre compte' : 'Create your account',
      desc: isFr ? 'Inscription gratuite en moins de 2 minutes.' : 'Free sign-up in under 2 minutes.',
    },
    {
      icon: Search,
      title: isFr ? 'Trouvez le bon prof' : 'Find the right teacher',
      desc: isFr ? 'Filtrez par matière, niveau, ville et tarif.' : 'Filter by subject, level, city and rate.',
    },
    {
      icon: MessageSquare,
      title: isFr ? 'Échangez directement' : 'Talk directly',
      desc: isFr ? 'Envoyez une demande, discutez des besoins.' : 'Send a request, discuss your needs.',
    },
    {
      icon: CheckCircle2,
      title: isFr ? 'Organisez le cours' : 'Arrange the lesson',
      desc: isFr ? 'Domicile ou en ligne. Coordonnées après acceptation.' : 'Home or online. Contact details after acceptance.',
    },
  ];

  return (
    <div className="bg-[#f8fafc] text-slate-900 selection:bg-emerald-100 selection:text-emerald-900">
      {/* 1. HERO */}
      <Hero
        cities={citiesForDisplay}
        subjects={heroSubjects}
        isFr={isFr}
        featuredCount={featured.length}
      />

      {/* 2. MATIÈRES POPULAIRES */}
      <FadeInSection>
        {isLoadingSubjects ? (
          <SubjectsStripSkeleton />
        ) : subjectsForDisplay.length > 0 ? (
          <SubjectsStrip subjects={subjectsForDisplay} isFr={isFr} />
        ) : null}
      </FadeInSection>

      {/* 3. PROFS EN VEDETTE */}
      <FadeInSection>
        <section className="py-12 sm:py-20 lg:py-28 bg-[#f8fafc] border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8 sm:mb-12 gap-4">
              <div className="min-w-0">
                <h2 className="text-xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                  {isFr ? 'Profs en vedette' : 'Featured teachers'}
                </h2>
                <p className="text-sm sm:text-base text-slate-500 mt-1.5">
                  {isFr ? 'Les mieux notés par les parents.' : 'Top rated by parents.'}
                </p>
              </div>
              <Link href="/teachers" prefetch className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors shrink-0">
                {isFr ? 'Voir tous' : 'See all'}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loadingFeatured && featured.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
                {[0, 1, 2, 3, 4, 5].map(i => <FeaturedTeacherSkeleton key={i} />)}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
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
                    onToggleSave={() => handleToggleSave(t.id)}
                    canSave={canSave}
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
      </FadeInSection>

      {/* 4. COMMENT ÇA MARCHE */}
      <FadeInSection>
        <section className="py-12 sm:py-20 lg:py-28 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10 sm:mb-14 lg:mb-20">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2 sm:mb-3">
                {isFr ? 'En 4 étapes' : 'In 4 steps'}
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                {isFr ? 'Comment ça marche' : 'How it works'}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2 sm:mt-3 max-w-2xl mx-auto">
                {isFr ? 'Simple pour les parents. Fluide pour les profs.' : 'Simple for parents. Smooth for teachers.'}
              </p>
            </div>

            {/* DESKTOP — Timeline horizontale */}
            <div className="hidden lg:block relative">
              <div
                aria-hidden
                className="absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-emerald-100 via-emerald-300 to-emerald-100"
              />
              <div className="grid grid-cols-4 gap-6 relative">
                {howItWorksSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex flex-col items-center text-center group">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center shadow-sm group-hover:border-emerald-500 group-hover:shadow-md transition-all duration-300 relative z-10">
                          <Icon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div
                          aria-hidden
                          className="absolute inset-0 rounded-full bg-emerald-400/0 group-hover:bg-emerald-400/10 blur-md transition-colors duration-300"
                        />
                      </div>
                      <h3 className="mt-5 font-semibold text-slate-900 text-base lg:text-lg leading-tight mb-2">
                        {s.title}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed max-w-[220px]">
                        {s.desc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* MOBILE — Timeline verticale */}
            <div className="lg:hidden relative">
              <div
                aria-hidden
                className="absolute left-[23px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-100 via-emerald-300 to-emerald-100"
              />
              <div className="space-y-7">
                {howItWorksSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex gap-4 relative">
                      <div className="shrink-0 relative z-10">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-emerald-200 flex items-center justify-center shadow-sm">
                          <Icon className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <h3 className="font-semibold text-slate-900 text-base leading-tight mb-1.5">
                          {s.title}
                        </h3>
                        <p className="text-sm text-slate-600 leading-snug">
                          {s.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 5. PARENTS */}
      <FadeInSection>
        <section className="py-10 sm:py-20 lg:py-28 bg-[#f8fafc] border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-20 items-center">
              <div className="relative">
                <div className="relative aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/4] overflow-hidden rounded-2xl sm:rounded-[1.75rem] lg:rounded-[2rem] shadow-xl lg:shadow-2xl shadow-slate-900/10">
                  <img
                    src={IMAGES.forParents}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest text-emerald-600 font-semibold mb-2 sm:mb-3">
                  {isFr ? 'Pour les parents' : 'For parents'}
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-slate-900 leading-tight sm:leading-[1.15] mb-3 sm:mb-5">
                  {isFr ? 'Trouvez le prof idéal pour votre enfant.' : 'Find the ideal teacher for your child.'}
                </h2>
                <p className="text-sm lg:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  {isFr
                    ? 'Cherchez par matière, niveau, ville et tarif. Consultez les profils vérifiés, échangez directement, et choisissez en confiance.'
                    : 'Search by subject, level, city and rate. Browse verified profiles, talk directly, and choose with confidence.'}
                </p>

                <ul className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-8">
                  {[
                    isFr ? 'Profils vérifiés et détaillés' : 'Verified and detailed profiles',
                    isFr ? 'Contact direct, sans intermédiaire' : 'Direct contact, no middleman',
                    isFr ? 'Coordonnées après acceptation' : 'Contact details after acceptance',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/teachers" prefetch>
                  <PrimaryButton>
                    <Search className="w-4 h-4" />
                    {isFr ? 'Chercher un prof' : 'Find a teacher'}
                  </PrimaryButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 6. ENSEIGNANTS */}
      <FadeInSection>
        <section className="py-10 sm:py-20 lg:py-28 bg-white border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 lg:gap-20 items-center">
              <div className="relative lg:order-2">
                <div className="relative aspect-[5/4] sm:aspect-[4/3] lg:aspect-[5/4] overflow-hidden rounded-2xl sm:rounded-[1.75rem] lg:rounded-[2rem] shadow-xl lg:shadow-2xl shadow-slate-900/10">
                  <img
                    src={IMAGES.forTeachers}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="lg:order-1">
                <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-widest text-blue-600 font-semibold mb-2 sm:mb-3">
                  {isFr ? 'Pour les enseignants' : 'For teachers'}
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold text-slate-900 leading-tight sm:leading-[1.15] mb-3 sm:mb-5">
                  {isFr ? 'Développez votre activité d\'enseignement.' : 'Grow your teaching activity.'}
                </h2>
                <p className="text-sm lg:text-base text-slate-600 leading-relaxed mb-4 sm:mb-6">
                  {isFr
                    ? 'Créez votre profil gratuitement, présentez vos matières et niveaux, et recevez des demandes de parents près de chez vous.'
                    : 'Create your profile for free, list your subjects and levels, and receive requests from parents near you.'}
                </p>

                <ul className="space-y-2 sm:space-y-2.5 mb-5 sm:mb-8">
                  {[
                    isFr ? 'Inscription gratuite et illimitée' : 'Free and unlimited registration',
                    isFr ? 'Visibilité auprès des parents' : 'Visibility to parents',
                    isFr ? 'Gérez vos disponibilités' : 'Manage your availability',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-700 leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/register?role=teacher" prefetch>
                  <PrimaryButton className="!bg-blue-600 hover:!bg-blue-700">
                    <GraduationCap className="w-4 h-4" />
                    {isFr ? 'Devenir enseignant' : 'Become a teacher'}
                  </PrimaryButton>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* 7. CTA PROF */}
      <FadeInSection>
        <TeacherCTASection isFr={isFr} user={user} isTeacher={isTeacher} />
      </FadeInSection>

      {/* 8. POURQUOI */}
      <FadeInSection>
        <section className="py-10 sm:py-20 lg:py-28 bg-[#f8fafc] border-t border-slate-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12 lg:mb-16">
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-emerald-600 font-semibold mb-2 sm:mb-3">
                {isFr ? 'Nos engagements' : 'Our commitments'}
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900">
                {isFr ? `Pourquoi ${BRAND.name} ?` : `Why ${BRAND.name}?`}
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-2 sm:mt-3 max-w-2xl mx-auto">
                {isFr ? 'Les mêmes exigences, quel que soit votre rôle.' : 'The same standards, whatever your role.'}
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-7">
              {[
                {
                  icon: Sparkles,
                  title: isFr ? 'Profils détaillés' : 'Detailed profiles',
                  desc: isFr ? 'Matière, niveau, tarif, expérience : tout est visible.' : 'Subject, level, rate, experience: all visible.',
                },
                {
                  icon: Shield,
                  title: isFr ? 'Contact direct' : 'Direct contact',
                  desc: isFr ? "Pas d'intermédiaire. Vous échangez directement." : 'No middleman. You talk directly.',
                },
                {
                  icon: Heart,
                  title: isFr ? 'Gratuit pour les parents' : 'Free for parents',
                  desc: isFr ? 'Chercher, consulter, contacter : gratuit.' : 'Search, browse, contact: free.',
                },
                {
                  icon: TrendingUp,
                  title: isFr ? 'Sans engagement' : 'No commitment',
                  desc: isFr ? 'Aucun abonnement. Vous décidez quand avancer.' : 'No subscription. You decide when to move.',
                },
              ].map(r => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.title}
                    className="group relative flex flex-col gap-2 sm:gap-3 lg:gap-4 p-4 sm:p-6 lg:p-7 bg-white rounded-2xl border border-slate-200/80 hover:border-emerald-200 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
                  >
                    <div
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                      <Icon className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 text-sm sm:text-base lg:text-lg leading-tight mb-1.5 sm:mb-2">
                        {r.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 leading-snug sm:leading-relaxed">
                        {r.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8 sm:mt-12">
              {!user ? (
                <Link href="/register" prefetch>
                  <PrimaryButton className="!px-5 sm:!px-8">
                    {isFr ? 'Créer un compte' : 'Create account'}
                    <ArrowRight className="w-4 h-4" />
                  </PrimaryButton>
                </Link>
              ) : (
                <Link href="/dashboard" prefetch>
                  <PrimaryButton className="!px-5 sm:!px-8">
                    <LayoutDashboard className="w-4 h-4" />
                    {isFr ? 'Aller à mon espace' : 'Go to my space'}
                    <ArrowRight className="w-4 h-4" />
                  </PrimaryButton>
                </Link>
              )}
            </div>
          </div>
        </section>
      </FadeInSection>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HERO
// ═══════════════════════════════════════════════════════════
function Hero({ cities, subjects, isFr, featuredCount }: {
  cities: RefCity[];
  subjects: RefSubject[];
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
    <section className="relative overflow-hidden bg-slate-900">
      <div className="relative min-h-[560px] sm:min-h-[640px] lg:min-h-[700px] flex items-center">
        <img
          src={IMAGES.hero}
          alt=""
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/30 sm:bg-gradient-to-r sm:from-slate-950/95 sm:via-slate-950/75 sm:to-slate-950/15 lg:to-transparent"
        />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <h1 className="text-[2rem] sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] text-white leading-[1.05] mb-5 sm:mb-6">
              {isFr ? (
                <>Trouvez le prof qui fait <span className="text-emerald-400">vraiment progresser</span> votre enfant.</>
              ) : (
                <>Find the teacher who <span className="text-emerald-400">really helps</span> your child progress.</>
              )}
            </h1>

            <p className="text-sm sm:text-lg text-white/85 leading-6 sm:leading-8 max-w-[54ch] mb-5 sm:mb-8">
              {isFr
                ? 'Des enseignants vérifiés, à domicile ou en ligne. Consultez les profils, échangez directement, et choisissez celui qui convient à votre enfant.'
                : 'Verified teachers, at home or online. Browse profiles, message them directly, and pick the right one for your child.'}
            </p>

            <form onSubmit={handleSearch} className="bg-white rounded-[1.25rem] shadow-2xl shadow-slate-950/40 p-2 flex flex-col sm:flex-row gap-2 mb-5 sm:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder={isFr ? 'Nom, matière…' : 'Name, subject…'}
                  className="pl-10 h-12 w-full border-0 bg-slate-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="relative sm:w-40">
                <select
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="pl-3.5 h-12 border-0 bg-slate-50 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 w-full appearance-none text-slate-900 cursor-pointer pr-8"
                >
                  <option value="">{isFr ? 'Toutes les villes' : 'All cities'}</option>
                  {cities.map(city => <option key={city.id} value={city.id}>{city.name}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    className="px-3 py-1.5 bg-white/15 backdrop-blur-sm border border-white/25 rounded-full text-xs text-white hover:bg-white/25 hover:border-white/45 transition-colors font-medium"
                  >
                    {isFr ? subject.name_fr : subject.name_en}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// SUBJECTS STRIP
// ═══════════════════════════════════════════════════════════
function SubjectsStrip({ subjects, isFr }: { subjects: RefSubject[]; isFr: boolean }) {
  if (subjects.length === 0) return null;
  return (
    <section className="py-7 sm:py-10 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            {isFr ? 'Matières populaires' : 'Popular subjects'}
          </h2>
          <Link href="/teachers" prefetch className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors inline-flex items-center gap-1 shrink-0">
            {isFr ? 'Tout voir' : 'See all'}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 snap-x scrollbar-hide">
          {subjects.map(subject => (
            <Link key={subject.id} href={`/teachers?subject=${subject.id}`} prefetch className="flex-shrink-0 snap-start px-4 sm:px-5 py-3 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 rounded-xl shadow-sm hover:shadow text-sm font-medium text-slate-700 hover:text-emerald-700 transition-colors whitespace-nowrap">
              {isFr ? subject.name_fr : subject.name_en}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// TEACHER CARD
// ═══════════════════════════════════════════════════════════
function TeacherCard({
  teacher, isFr, displayName, formatRate, modeLabel,
  isSaved, isSaving, onToggleSave, canSave,
}: {
  teacher: FeaturedTeacher;
  isFr: boolean;
  displayName: string;
  formatRate: (r: number | null, p: string | null) => string | null;
  modeLabel: (m: string | null) => string | null;
  isSaved: boolean;
  isSaving: boolean;
  onToggleSave: () => void;
  canSave: boolean;
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
    <Link href={`/teachers/${teacher.id}`} prefetch className="group block bg-white border border-slate-200 rounded-[1.35rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 transition-all duration-300 relative">
      <div className="relative w-full h-36 sm:h-44 overflow-hidden">
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

        {canSave && (
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
        )}
      </div>

      <div className="p-4 sm:p-5 pt-3 sm:pt-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-4 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-lg -mt-7 relative z-10">
            {teacher.profile_photo_url ? (
              <img src={teacher.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-base sm:text-lg font-bold">{initial}</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-emerald-600 line-clamp-2 leading-snug text-sm sm:text-base">{displayName}</h3>
            {teacher.headline && <p className="text-sm text-slate-500 mt-1 line-clamp-1">{teacher.headline}</p>}

            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              {hasRating ? (
                <>
                  <StarsInline value={Math.round(teacher.rating_avg)} size={12} />
                  <span className="font-semibold text-slate-700 tabular-nums">{formatRating(teacher.rating_avg, isFr)}</span>
                  <span className="text-slate-400 tabular-nums">({formatCount(teacher.rating_count, isFr)})</span>
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
            {mode && <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2.5 py-1 text-xs">{mode}</span>}
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
              <span className="text-xs text-slate-400 px-2 py-1">+{teacher.subjects.length - 2}</span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100">
          <div className="text-sm min-w-0">
            {rate ? <span className="font-semibold text-slate-900 truncate">{rate}</span> : <span className="text-sm text-slate-500">{isFr ? 'Tarif sur demande' : 'Rate on request'}</span>}
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

// ═══════════════════════════════════════════════════════════
// TEACHER CTA
// ═══════════════════════════════════════════════════════════
function TeacherCTASection({ isFr, user, isTeacher }: { isFr: boolean; user: any; isTeacher: boolean }) {
  const variant: 'teacher' | 'parent-teacher' | 'guest' =
    user && isTeacher ? 'teacher'
    : user && !isTeacher ? 'parent-teacher'
    : 'guest';

  const bgClass = variant === 'teacher' ? 'bg-blue-600' : 'bg-emerald-600';
  const textClass = variant === 'teacher' ? 'text-blue-100' : 'text-emerald-50';

  const title =
    variant === 'teacher'
      ? (isFr ? 'Votre profil est en ligne.' : 'Your profile is live.')
      : variant === 'parent-teacher'
        ? (isFr ? 'Vous enseignez aussi ?' : 'You also teach?')
        : (isFr ? 'Recevez des demandes de parents près de chez vous.' : 'Receive requests from parents near you.');

  const desc =
    variant === 'teacher'
      ? (isFr ? 'Les parents peuvent vous trouver et vous contacter. Complétez votre profil pour gagner en visibilité.' : 'Parents can find and contact you. Complete your profile to gain visibility.')
      : variant === 'parent-teacher'
        ? (isFr ? 'Ajoutez un profil enseignant à votre compte existant et recevez des demandes près de chez vous.' : 'Add a teacher profile to your existing account and receive requests near you.')
        : (isFr ? `Rejoignez ${BRAND.name}, créez votre profil gratuitement, et faites-vous connaître.` : `Join ${BRAND.name}, create your profile for free, and get discovered.`);

  return (
    <section className={`py-9 sm:py-16 ${bgClass} relative overflow-hidden`}>
      <div aria-hidden="true" className="hidden sm:block absolute inset-0 opacity-[0.08] pointer-events-none" style={{
        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)`,
        backgroundSize: '56px 56px',
      }} />
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">{title}</h2>
        <p className={`mt-3 sm:mt-4 text-sm sm:text-base ${textClass} max-w-2xl mx-auto leading-relaxed`}>{desc}</p>

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
            <>
              <Link href="/onboarding" prefetch>
                <WhiteButton className="w-full sm:w-auto">
                  <GraduationCap className="w-4 h-4" />
                  {isFr ? 'Devenir enseignant' : 'Become a teacher'}
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