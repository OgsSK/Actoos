'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, MapPin, GraduationCap, ArrowRight, Shield,
  Heart, LayoutDashboard, Pencil, UserPlus, MessageSquare, CheckCircle2,
  ChevronLeft, ChevronRight, ChevronDown, Check, BookOpen, Calculator, FlaskConical, 
  Monitor, Languages, Palette, Music, Atom, Star
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


const FEATURE_CARD_WIDTH_DESKTOP = 320;
const FEATURE_GAP = 24;
const FEATURE_COPIES = 7;
const FEATURE_TRANSITION_MS = 400;


function FadeInSection({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string; }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) { setIsVisible(true); return; }
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out will-change-transform ${className} ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function formatCount(n: number, isFr: boolean): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  if (n < 1000) return String(Math.round(n));
  const sep = isFr ? ',' : '.';
  if (n < 1_000_000) { const v = n / 1000; const str = v < 10 ? v.toFixed(1) : String(Math.round(v)); return `${str.replace('.', sep)}K`; }
  const v = n / 1_000_000; const str = v < 10 ? v.toFixed(1) : String(Math.round(v)); return `${str.replace('.', sep)}M`;
}
function formatRating(value: number, isFr: boolean, decimals = 1): string { return value.toFixed(decimals).replace('.', isFr ? ',' : '.'); }

function StarsInline({ value, size = 12 }: { value: number; size?: number }) {
  return (<span className="inline-flex items-center gap-[1px]">{[1, 2, 3, 4, 5].map(n => (<svg key={n} width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} className={n <= value ? 'text-amber-400' : 'text-slate-300'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>))}</span>);
}

function getSubjectIcon(subjectName: string) {
  const name = subjectName.toLowerCase();
  if (name.includes('math')) return <Calculator className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('physique') || name.includes('chimie')) return <FlaskConical className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('info')) return <Monitor className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('anglais') || name.includes('allemand') || name.includes('japonais') || name.includes('espagnol') || name.includes('langue')) return <Languages className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('dessin') || name.includes('art')) return <Palette className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('musique')) return <Music className="w-6 h-6" strokeWidth={1.5} />;
  if (name.includes('science') || name.includes('bio')) return <Atom className="w-6 h-6" strokeWidth={1.5} />;
  return <BookOpen className="w-6 h-6" strokeWidth={1.5} />;
}

function PrimaryButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (<button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-red-500 text-white text-sm font-medium shadow-sm transition-colors hover:bg-red-600 disabled:opacity-50 ${className}`}>{children}</button>);
}
function WhiteButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (<button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-white text-red-600 text-sm font-medium shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 ${className}`}>{children}</button>);
}
function OutlineWhiteButton({ children, className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { className?: string }) {
  return (<button {...props} className={`inline-flex items-center justify-center gap-2 px-6 min-h-[44px] rounded-xl bg-transparent border border-white/40 text-white text-sm font-medium transition-colors hover:bg-white/10 hover:border-white/60 ${className}`}>{children}</button>);
}

function SkeletonLine({ className = '' }: { className?: string }) { return <div className={`bg-slate-100 rounded animate-pulse ${className}`} />; }
function FeaturedTeacherSkeleton() {
  return (<div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"><SkeletonLine className="w-full h-28 sm:h-36 rounded-none" /><div className="p-4 sm:p-5 pt-3 sm:pt-4"><div className="flex items-start gap-3 sm:gap-4"><SkeletonLine className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0" /><div className="flex-1 min-w-0 space-y-2 pt-1"><SkeletonLine className="h-5 w-32" /><SkeletonLine className="h-4 w-40" /></div></div></div></div>);
}

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
        const { data: teachers, error: tErr } = await supabase.from('teacher_profiles').select('id, city_id').eq('verification_status', 'verified').eq('is_available', true);
        if (tErr || !teachers || teachers.length === 0) { if (!cancelled) { setUsedSubjects([]); setUsedCities([]); } return; }
        const teacherIds = teachers.map(t => t.id);
        const cityIds = Array.from(new Set(teachers.map(t => t.city_id).filter((v): v is string => Boolean(v))));
        const [linksRes, citiesRes] = await Promise.all([
          supabase.from('teacher_subjects').select('subject_id, subjects(id, name_fr, name_en)').in('teacher_id', teacherIds).not('subject_id', 'is', null),
          cityIds.length ? supabase.from('cities').select('id, name').in('id', cityIds).eq('is_active', true).order('name') : Promise.resolve({ data: [] as any[] }),
        ]);
        const counts = new Map<string, { subject: RefSubject; count: number }>();
        (linksRes.data || []).forEach((l: any) => {
          const s = Array.isArray(l.subjects) ? l.subjects[0] : l.subjects;
          if (!s || !s.id) return;
          const prev = counts.get(s.id);
          if (prev) prev.count += 1; else counts.set(s.id, { subject: s, count: 1 });
        });
        const sortedSubjects = Array.from(counts.values()).sort((a, b) => b.count - a.count).map(c => c.subject);
        if (!cancelled) { setUsedSubjects(sortedSubjects); setUsedCities((citiesRes.data || []) as RefCity[]); }
      } catch (err) { console.error('[Home]', err); if (!cancelled) { setUsedSubjects([]); setUsedCities([]); } }
    })();
    return () => { cancelled = true; };
  }, []);

  const subjectsForDisplay: RefSubject[] = usedSubjects === null ? [] : usedSubjects;
  const citiesForDisplay: RefCity[] = usedCities === null ? [] : usedCities;

  async function handleToggleSave(teacherId: string) {
    if (!canSave) return;
    if (!user?.id) { window.location.href = '/login'; return; }
    setSavingId(teacherId);
    try { await toggleSave.mutateAsync({ parentId: user.id, teacherId, isSaved: savedIds.includes(teacherId) }); } finally { setSavingId(null); }
  }

  function formatRate(rate: number | null, period: string | null) {
    if (!rate) return null;
    const amount = new Intl.NumberFormat('fr-FR').format(rate);
    const suffixMap: Record<string, { fr: string; en: string }> = { hourly: { fr: 'FCFA / h', en: 'FCFA / hr' }, session: { fr: 'FCFA / séance', en: 'FCFA / session' }, weekly: { fr: 'FCFA / sem', en: 'FCFA / wk' }, monthly: { fr: 'FCFA / mois', en: 'FCFA / mo' } };
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
    const map: Record<string, { fr: string; en: string }> = { home: { fr: 'À domicile', en: 'At home' }, online: { fr: 'En ligne', en: 'Online' }, both: { fr: 'Domicile & en ligne', en: 'Home & online' } };
    return map[mode] ? (isFr ? map[mode].fr : map[mode].en) : mode;
  }

  const howItWorksSteps = [
    { icon: UserPlus, title: isFr ? 'Créez votre compte' : 'Create your account', desc: isFr ? 'Inscription gratuite en moins de 2 minutes.' : 'Free sign-up in under 2 minutes.' },
    { icon: Search, title: isFr ? 'Trouvez le bon prof' : 'Find the right teacher', desc: isFr ? 'Filtrez par matière, niveau, ville et tarif.' : 'Filter by subject, level, city and rate.' },
    { icon: MessageSquare, title: isFr ? 'Échangez directement' : 'Talk directly', desc: isFr ? 'Envoyez une demande, discutez des besoins.' : 'Send a request, discuss your needs.' },
    { icon: CheckCircle2, title: isFr ? 'Organisez le cours' : 'Arrange the lesson', desc: isFr ? 'Domicile ou en ligne. Coordonnées après acceptation.' : 'Home or online. Contact details after acceptance.' },
  ];

  const whyUsFeatures = [
    { icon: Shield, title: isFr ? 'Profils vérifiés' : 'Verified profiles', desc: isFr ? 'Des informations claires pour choisir en confiance.' : 'Clear information to help you choose with confidence.' },
    { icon: Search, title: isFr ? 'Recherche simple' : 'Easy search', desc: isFr ? 'Matière, ville, niveau et tarif en quelques clics.' : 'Subject, city, level and rate in a few clicks.' },
    { icon: MessageSquare, title: isFr ? 'Contact direct' : 'Direct contact', desc: isFr ? 'Échangez directement avec les enseignants.' : 'Talk directly with teachers.' },
    { icon: Heart, title: isFr ? 'Gratuit pour les parents' : 'Free for parents', desc: isFr ? 'Cherchez et consultez les profils gratuitement.' : 'Search and browse profiles for free.' },
  ];

  const repeatedFeatures = Array(FEATURE_COPIES).fill(whyUsFeatures).flat();
  const featureSetLength = whyUsFeatures.length;
  const [featureIndex, setFeatureIndex] = useState(featureSetLength * 3);
  const [featureAnimate, setFeatureAnimate] = useState(true);
  const featureTimerRef = useRef<NodeJS.Timeout | null>(null);

  const moveCarousel = (delta: number) => {
    setFeatureAnimate(true);
    setFeatureIndex(i => i + delta);
    if (featureTimerRef.current) clearTimeout(featureTimerRef.current);
    featureTimerRef.current = setTimeout(() => {
      setFeatureAnimate(false);
      setFeatureIndex(i => {
        if (i >= featureSetLength * 5) return i - featureSetLength * 3;
        if (i < featureSetLength * 2) return i + featureSetLength * 3;
        return i;
      });
    }, FEATURE_TRANSITION_MS + 50);
  };
  useEffect(() => {
    if (!featureAnimate) {
      const raf = requestAnimationFrame(() => setFeatureAnimate(true));
      return () => cancelAnimationFrame(raf);
    }
  }, [featureAnimate]);

  return (
    <div className="min-h-screen bg-[#fffafa] text-slate-900 selection:bg-red-100 selection:text-red-900">
      <Hero cities={citiesForDisplay} subjects={subjectsForDisplay} isFr={isFr} />

      {/* FEATURED TEACHERS */}
      <FadeInSection>
        <section className="pt-4 sm:pt-8 pb-10 sm:pb-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between gap-4 mb-6 sm:mb-9">
              <div>
                <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-red-500 mb-1.5 sm:mb-2">{isFr ? 'À découvrir' : 'Discover'}</p>
                <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">{isFr ? 'Professeurs disponibles' : 'Available teachers'}</h2>
                <p className="text-xs sm:text-base text-slate-500 mt-1 sm:mt-1.5">{isFr ? 'Trouvez un enseignant adapté à vos besoins.' : 'Find a teacher who matches your needs.'}</p>
              </div>
              <Link href="/teachers" prefetch className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors shrink-0">
                {isFr ? 'Voir tous les profs' : 'See all teachers'}<ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            {loadingFeatured && featured.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">{[0, 1, 2, 3, 4, 5].map(i => <FeaturedTeacherSkeleton key={i} />)}</div>
            ) : featured.length === 0 ? (
              <div className="text-center py-10 sm:py-12 bg-[#fffafa] rounded-2xl border border-slate-200">
                <GraduationCap className="w-10 h-10 text-red-200 mx-auto mb-3" />
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{isFr ? 'Aucun professeur pour le moment' : 'No teacher yet'}</h3>
                <p className="text-sm text-slate-500 mb-5">{isFr ? 'Les premiers professeurs arrivent bientôt.' : 'The first teachers are coming soon.'}</p>
                {!isTeacher && (<Link href="/register?role=teacher" prefetch><PrimaryButton><GraduationCap className="w-4 h-4" />{isFr ? 'Devenir enseignant' : 'Become a teacher'}</PrimaryButton></Link>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {featured.map(t => (<TeacherCard key={t.id} teacher={t} isFr={isFr} displayName={displayName(t)} formatRate={formatRate} modeLabel={modeLabel} isSaved={savedIds.includes(t.id)} isSaving={savingId === t.id} onToggleSave={() => handleToggleSave(t.id)} canSave={canSave} />))}
              </div>
            )}
            <div className="mt-6 sm:mt-7 text-center sm:hidden">
              <Link href="/teachers" prefetch className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-500">{isFr ? 'Voir tous les profs' : 'See all teachers'}<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* HOW IT WORKS - Horizontal sur desktop, vertical sur mobile */}
      <FadeInSection>
        <section className="py-12 sm:py-20 bg-[#fffafa] border-y border-red-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-16">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-red-500 mb-1.5 sm:mb-2">{isFr ? 'Simple et rapide' : 'Simple and fast'}</p>
              <h2 className="text-xl sm:text-3xl font-bold tracking-tight">{isFr ? 'Comment ça marche ?' : 'How does it work?'}</h2>
              <p className="text-xs sm:text-base text-slate-500 mt-1.5 sm:mt-2">{isFr ? 'Quelques étapes pour trouver le bon professeur.' : 'A few steps to find the right teacher.'}</p>
            </div>

            {/* MOBILE : timeline verticale */}
            <div className="sm:hidden relative">
              <div className="absolute left-5 top-2 bottom-2 w-[2px] bg-gradient-to-b from-red-200 via-red-300 to-red-200" />
              <div className="space-y-6">
                {howItWorksSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="relative flex items-start gap-3">
                      <div className="relative z-10 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-white border-2 border-red-500 flex items-center justify-center shadow-md">
                          <span className="text-xs font-bold text-red-500">0{i + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1 bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-red-50 text-red-500 flex items-center justify-center mb-2.5">
                          <Icon className="w-4 h-4" />
                        </div>
                        <h3 className="font-semibold text-slate-900 text-sm mb-1">{s.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DESKTOP : layout horizontal avec ligne pointillée */}
            <div className="hidden sm:block relative">
              <div className="absolute top-7 left-[12%] right-[12%] h-[2px] border-t-2 border-dashed border-red-200 z-0" />

              <div className="grid grid-cols-4 gap-6 relative z-10">
                {howItWorksSteps.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-full bg-white border-2 border-red-500 flex items-center justify-center shadow-lg mb-6 relative">
                        <span className="text-base font-bold text-red-500">0{i + 1}</span>
                      </div>

                      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-red-100 transition-all w-full min-h-[180px] flex flex-col items-center">
                        <div className="w-11 h-11 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4">
                          <Icon className="w-5 h-5" />
                        </div>
                        <h3 className="font-semibold text-slate-900 text-base mb-2">{s.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SECTION "POURQUOI NOUS" */}
      <FadeInSection>
        <section className="py-10 sm:py-16 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <div className="flex gap-1 text-amber-400 mb-3 sm:mb-4">{[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />)}</div>
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">{isFr ? `Pourquoi ${BRAND.name} ?` : `Why ${BRAND.name}?`}</h2>
                <p className="mt-3 sm:mt-4 text-sm sm:text-base text-slate-500 leading-relaxed max-w-md">{isFr ? 'Une plateforme pensée pour faciliter la rencontre entre parents et enseignants.' : 'A platform designed to connect parents and teachers.'}</p>
                <div className="hidden lg:flex gap-3 mt-8">
                  <button onClick={() => moveCarousel(-1)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600 active:scale-95" aria-label="Précédent"><ChevronLeft className="w-5 h-5" /></button>
                  <button onClick={() => moveCarousel(1)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors text-slate-600 active:scale-95" aria-label="Suivant"><ChevronRight className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="hidden lg:block overflow-hidden py-4">
                <div className="flex" style={{ gap: `${FEATURE_GAP}px`, transform: `translateX(-${featureIndex * (FEATURE_CARD_WIDTH_DESKTOP + FEATURE_GAP)}px)`, transition: featureAnimate ? `transform ${FEATURE_TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)` : 'none', willChange: 'transform' }}>
                  {repeatedFeatures.map((feature, i) => {
                    const Icon = feature.icon;
                    return (
                      <div key={`${feature.title}-${i}`} className="shrink-0 rounded-[2rem] p-8 flex flex-col bg-[#fffafa] border border-slate-100 shadow-sm min-h-[300px]" style={{ width: `${FEATURE_CARD_WIDTH_DESKTOP}px` }}>
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6"><Icon className="w-6 h-6" /></div>
                        <h3 className="font-bold text-slate-900 text-lg mb-2">{feature.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{feature.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {whyUsFeatures.map((feature, i) => {
                  const Icon = feature.icon;
                  return (
                    <div key={i} className="snap-center shrink-0 rounded-2xl p-5 flex flex-col bg-[#fffafa] border border-slate-100 shadow-sm min-h-[220px]" style={{ width: '260px' }}>
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mb-4"><Icon className="w-5 h-5" /></div>
                      <h3 className="font-bold text-slate-900 text-base mb-1.5">{feature.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      <FadeInSection><TeacherCTASection isFr={isFr} user={user} isTeacher={isTeacher} /></FadeInSection>

      <section className="py-10 sm:py-16 bg-[#fffafa] border-t border-red-50">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-xl sm:text-3xl font-bold tracking-tight text-slate-900">{isFr ? 'Prêt à trouver votre professeur ?' : 'Ready to find your teacher?'}</h2>
          <p className="text-sm sm:text-base text-slate-500 mt-1.5 sm:mt-2 mb-5 sm:mb-6">{isFr ? 'Commencez votre recherche gratuitement.' : 'Start your search for free.'}</p>
          <Link href="/teachers" prefetch><PrimaryButton className="!bg-red-500 hover:!bg-red-600 !rounded-lg !px-7"><Search className="w-4 h-4" />{isFr ? 'Trouver un professeur' : 'Find a teacher'}<ArrowRight className="w-4 h-4" /></PrimaryButton></Link>
        </div>
      </section>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// HERO - Tout intégré : titre + recherche + catégories dans la zone rose
// ═══════════════════════════════════════════════════════════
function Hero({ cities, subjects, isFr }: { cities: RefCity[]; subjects: RefSubject[]; isFr: boolean; }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subjects.length <= 1) return;
    const interval = setInterval(() => {
      setPlaceholderIdx(i => (i + 1) % subjects.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [subjects.length]);

  useEffect(() => {
    if (!cityDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
        setCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [cityDropdownOpen]);

  const getPlaceholder = () => {
    if (subjects.length === 0) return isFr ? 'Rechercher...' : 'Search...';
    const subject = subjects[placeholderIdx % subjects.length];
    const name = isFr ? subject.name_fr : subject.name_en;
    return isFr ? `Essayez "${name}"` : `Try "${name}"`;
  };

  const selectedCity = cities.find(c => c.id === location);
  const cityLabel = selectedCity ? selectedCity.name : (isFr ? 'Adresse ou ville' : 'Address or city');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (location) params.set('city', location);
    router.push(`/teachers?${params.toString()}`);
  }

  return (
    <section className="relative bg-gradient-to-b from-white via-red-50 to-red-100 pb-8 sm:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* MOBILE : titre à gauche + sous-titre + recherche + catégories */}
        <div className="sm:hidden pt-6 pb-4">
          <h1 className="text-[2rem] leading-[1.1] font-extrabold tracking-tight text-slate-900 mb-4">
            {isFr ? (<>Trouvez le <br /> professeur <br /> parfait</>) : (<>Find the <br /> perfect <br /> teacher</>)}
          </h1>
          <p className="text-sm text-slate-700 leading-relaxed mb-6">
            {isFr ? (
              <>Des <strong>enseignants vérifiés</strong>, à domicile ou en ligne. Comparez, échangez, choisissez en confiance.</>
            ) : (
              <><strong>Verified teachers</strong>, at home or online. Compare, chat, choose with confidence.</>
            )}
          </p>

          <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-1.5 flex items-center gap-1.5 mb-4">
            <input
              type="text"
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder={getPlaceholder()}
              className="flex-1 h-12 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-sm px-3"
            />
            <button type="submit" className="w-12 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shrink-0 transition-colors active:scale-95" aria-label={isFr ? 'Rechercher' : 'Search'}>
              <Search className="w-5 h-5" />
            </button>
          </form>

          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-4 h-4 text-slate-500" />
            <button type="button" onClick={() => setCityDropdownOpen(v => !v)} className="text-sm text-slate-600 hover:text-red-500 flex items-center gap-1">
              {cityLabel}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${cityDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {location && (<button type="button" onClick={() => setLocation('')} className="text-xs text-red-500 underline">{isFr ? 'Effacer' : 'Clear'}</button>)}
          </div>
          {cityDropdownOpen && (
            <div className="relative">
              <div className="absolute top-0 left-0 right-0 -mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
                <button type="button" onClick={() => { setLocation(''); setCityDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left ${!location ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <span>{isFr ? 'Toutes les villes' : 'All cities'}</span>
                  {!location && <Check className="w-4 h-4 text-red-500" />}
                </button>
                {cities.map(city => {
                  const isSelected = location === city.id;
                  return (
                    <button key={city.id} type="button" onClick={() => { setLocation(city.id); setCityDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-t border-slate-50 ${isSelected ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                      <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{city.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-red-500" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {subjects.length > 0 && (
            <div className="flex gap-4 overflow-x-auto -mx-4 px-4 pb-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {subjects.slice(0, 8).map(subject => (
                <Link key={subject.id} href={`/teachers?subject=${subject.id}`} prefetch className="shrink-0 flex flex-col items-center gap-2 min-w-[72px] text-center group">
                  <div className="w-12 h-12 rounded-full bg-white/70 flex items-center justify-center text-slate-600 group-hover:bg-white transition-colors">
                    {getSubjectIcon(isFr ? subject.name_fr : subject.name_en)}
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 group-hover:text-red-500 whitespace-nowrap max-w-[80px] truncate">
                    {isFr ? subject.name_fr : subject.name_en}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* DESKTOP : titre plus aéré + barre + catégories intégrées */}
        <div className="hidden sm:block pt-20 lg:pt-28 pb-4">
          {/* Titre plus espacé et aéré */}
          <h1 className="text-5xl lg:text-[4rem] xl:text-[4.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.15] text-center mb-16 lg:mb-20">
            {isFr ? (<>Trouvez le <br /> professeur parfait</>) : (<>Find the <br /> perfect teacher</>)}
          </h1>

          <form
            onSubmit={handleSearch}
            className="bg-white rounded-full p-2 flex items-center gap-2 max-w-3xl mx-auto border border-slate-100 mb-14 lg:mb-16 relative"
            style={{ boxShadow: '0 8px 32px rgba(239, 68, 68, 0.15), 0 2px 8px rgba(0,0,0,0.04)' }}
          >
            <div className="flex-1 flex items-center px-5">
              <Search className="w-5 h-5 text-red-400 mr-3 shrink-0" strokeWidth={2.2} />
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder={getPlaceholder()}
                className="w-full h-12 bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 placeholder:text-slate-400 text-base transition-all duration-300"
              />
            </div>

            <div className="w-px h-8 bg-slate-200"></div>

            <div ref={cityDropdownRef} className="flex-1 relative">
              <button
                type="button"
                onClick={() => setCityDropdownOpen(v => !v)}
                className="w-full h-12 flex items-center px-5 gap-3 text-left hover:bg-slate-50 rounded-xl transition-colors"
              >
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <span className={`flex-1 text-base truncate ${selectedCity ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{cityLabel}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${cityDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {cityDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                  <button type="button" onClick={() => { setLocation(''); setCityDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left ${!location ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                    <span>{isFr ? 'Toutes les villes' : 'All cities'}</span>
                    {!location && <Check className="w-4 h-4 text-red-500" />}
                  </button>
                  {cities.map(city => {
                    const isSelected = location === city.id;
                    return (
                      <button key={city.id} type="button" onClick={() => { setLocation(city.id); setCityDropdownOpen(false); }} className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left border-t border-slate-50 ${isSelected ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
                        <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{city.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-red-500" />}
                      </button>
                    );
                  })}
                  {cities.length === 0 && (<div className="px-4 py-6 text-center text-sm text-slate-400">{isFr ? 'Aucune ville disponible' : 'No city available'}</div>)}
                </div>
              )}
            </div>

            <button type="submit" className="h-12 px-8 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium text-base transition-colors shrink-0">
              {isFr ? 'Rechercher' : 'Search'}
            </button>
          </form>

          {subjects.length > 0 && (
            <div className="relative max-w-5xl mx-auto">
              <div id="hero-categories-scroll" className="flex items-center justify-center gap-1 overflow-x-auto py-4 px-2 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {subjects.slice(0, 9).map(subject => (
                  <Link
                    key={subject.id}
                    href={`/teachers?subject=${subject.id}`}
                    prefetch
                    className="shrink-0 flex flex-col items-center gap-2 min-w-[90px] text-center group py-2 px-3 rounded-2xl hover:bg-white/60 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-white/50 group-hover:bg-white flex items-center justify-center text-slate-600 group-hover:text-red-500 transition-colors">
                      {getSubjectIcon(isFr ? subject.name_fr : subject.name_en)}
                    </div>
                    <span className="text-xs font-medium text-slate-700 group-hover:text-red-500 whitespace-nowrap">
                      {isFr ? subject.name_fr : subject.name_en}
                    </span>
                  </Link>
                ))}
              </div>
              {subjects.length > 9 && (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('hero-categories-scroll');
                    if (el) el.scrollBy({ left: 400, behavior: 'smooth' });
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
                  aria-label="Défiler"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
// TEACHER CARD
// ═══════════════════════════════════════════════════════════
function TeacherCard({ teacher, isFr, displayName, formatRate, modeLabel, isSaved, isSaving, onToggleSave, canSave }: { teacher: FeaturedTeacher; isFr: boolean; displayName: string; formatRate: (r: number | null, p: string | null) => string | null; modeLabel: (m: string | null) => string | null; isSaved: boolean; isSaving: boolean; onToggleSave: () => void; canSave: boolean; }) {
  const rate = formatRate(teacher.hourly_rate, teacher.rate_period);
  const mode = modeLabel(teacher.teaching_mode);
  const subjectsPreview = teacher.subjects.slice(0, 2);
  const initial = displayName.charAt(0).toUpperCase();
  const hasExperience = typeof teacher.experience_years === 'number' && teacher.experience_years > 0;
  const hasRating = teacher.rating_count > 0;
  function handleSaveClick(e: React.MouseEvent) { e.preventDefault(); e.stopPropagation(); onToggleSave(); }
  return (
    <Link href={`/teachers/${teacher.id}`} prefetch className="group block bg-white border border-slate-200 rounded-[1.35rem] overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-red-200 transition-all duration-300 relative">
      <div className="relative w-full h-32 sm:h-44 overflow-hidden">
        {teacher.cover_url ? (<img src={teacher.cover_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />) : teacher.profile_photo_url ? (<><img src={teacher.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover blur-sm scale-110" /><div className="absolute inset-0 bg-slate-900/30" /></>) : (<div className="w-full h-full bg-gradient-to-br from-red-100 via-slate-100 to-red-50" />)}
        {canSave && (<button onClick={handleSaveClick} disabled={isSaving} aria-label={isSaved ? 'Retirer des favoris' : 'Ajouter aux favoris'} className={`absolute top-3 right-3 z-20 w-9 h-9 rounded-xl flex items-center justify-center backdrop-blur-sm border transition-all duration-200 disabled:opacity-50 ${isSaved ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white/95 border-white/40 text-slate-700 shadow-sm hover:bg-white hover:border-red-300 hover:text-red-500'}`}><Heart className={`w-4 h-4 ${isSaved ? 'fill-white' : ''}`} strokeWidth={2.5} /></button>)}
      </div>
      <div className="p-4 sm:p-5 pt-3 sm:pt-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-white border-4 border-white overflow-hidden flex items-center justify-center shrink-0 shadow-lg -mt-6 sm:-mt-7 relative z-10">
            {teacher.profile_photo_url ? (<img src={teacher.profile_photo_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />) : (<div className="w-full h-full flex items-center justify-center bg-slate-900 text-white text-sm sm:text-lg font-bold">{initial}</div>)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-red-500 line-clamp-2 leading-snug text-sm sm:text-base">{displayName}</h3>
            {teacher.headline && <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 line-clamp-1">{teacher.headline}</p>}
            <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5 text-xs">
              {hasRating ? (<><StarsInline value={Math.round(teacher.rating_avg)} size={11} /><span className="font-semibold text-slate-700 tabular-nums text-[11px] sm:text-xs">{formatRating(teacher.rating_avg, isFr)}</span><span className="text-slate-400 tabular-nums text-[11px] sm:text-xs">({formatCount(teacher.rating_count, isFr)})</span></>) : (<span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{isFr ? 'Nouveau' : 'New'}</span>)}
            </div>
          </div>
        </div>
        {(teacher.city || mode) && (<div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2.5 sm:mt-4">{teacher.city && (<span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs"><MapPin className="w-3 h-3" />{teacher.city.name}</span>)}{mode && <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[11px] sm:text-xs">{mode}</span>}</div>)}
        {subjectsPreview.length > 0 && (<div className="flex flex-wrap gap-1.5 mt-2.5 sm:mt-3">{subjectsPreview.map((s, i) => (<span key={i} className="inline-flex items-center text-[11px] sm:text-xs text-red-600 bg-red-50 border border-red-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-medium">{isFr ? s.name_fr : s.name_en}</span>))}{teacher.subjects.length > 2 && (<span className="text-[11px] sm:text-xs text-slate-400 px-1.5 sm:px-2 py-0.5 sm:py-1">+{teacher.subjects.length - 2}</span>)}</div>)}
        <div className="flex items-center justify-between mt-2.5 sm:mt-4 pt-2.5 sm:pt-4 border-t border-slate-100">
          <div className="text-xs sm:text-sm min-w-0">{rate ? <span className="font-semibold text-slate-900 truncate">{rate}</span> : <span className="text-xs sm:text-sm text-slate-500">{isFr ? 'Tarif sur demande' : 'Rate on request'}</span>}</div>
          {hasExperience && (<span className="text-[11px] sm:text-xs text-slate-400 shrink-0">{teacher.experience_years} {isFr ? 'ans' : 'yrs'}</span>)}
        </div>
      </div>
    </Link>
  );
}

// ═══════════════════════════════════════════════════════════
// TEACHER CTA
// ═══════════════════════════════════════════════════════════
function TeacherCTASection({ isFr, user, isTeacher }: { isFr: boolean; user: any; isTeacher: boolean }) {
  const variant: 'teacher' | 'parent-teacher' | 'guest' = user && isTeacher ? 'teacher' : user && !isTeacher ? 'parent-teacher' : 'guest';
  const title = variant === 'teacher' ? (isFr ? 'Votre profil est en ligne.' : 'Your profile is live.') : variant === 'parent-teacher' ? (isFr ? 'Vous enseignez aussi ?' : 'You also teach?') : (isFr ? 'Vous aussi, devenez super professeur' : 'Become a super teacher too');
  const desc = variant === 'teacher' ? (isFr ? 'Les parents peuvent vous trouver sur Kalanden. Complétez votre profil pour améliorer votre visibilité.' : 'Parents can find you on Kalanden. Complete your profile to improve your visibility.') : variant === 'parent-teacher' ? (isFr ? 'Ajoutez un profil enseignant à votre compte et recevez des demandes de parents.' : 'Add a teacher profile to your account and receive parent requests.') : (isFr ? 'Partagez votre savoir, vivez de votre passion et devenez indépendant.' : 'Share your knowledge, live your passion, and become independent.');
  
  return (
    <section className="py-10 sm:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:hidden rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
          <img src="/for-teachers.jpg" alt="Teacher and student" className="w-full h-auto block" />
          <div className="bg-[#FDE1D3] p-6">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 leading-tight">{title}</h2>
            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{desc}</p>
            <div className="mt-5">
              {variant === 'teacher' && (<Link href="/teacher/profile/edit" prefetch><button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors w-full">{isFr ? 'Modifier mon profil' : 'Edit my profile'}<Star className="w-4 h-4 fill-white" /></button></Link>)}
              {variant === 'parent-teacher' && (<Link href="/onboarding" prefetch><button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors w-full">{isFr ? 'Devenir enseignant' : 'Become a teacher'}<Star className="w-4 h-4 fill-white" /></button></Link>)}
              {variant === 'guest' && (<Link href="/register?role=teacher" prefetch><button className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors w-full">{isFr ? 'En savoir plus' : 'Learn more'}<Star className="w-4 h-4 fill-white" /></button></Link>)}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="group relative rounded-[2rem] overflow-hidden min-h-[500px]">
            <img src="/for-teachers.jpg" alt="Teacher and student" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105" />
            <div className="relative z-10 flex items-center justify-end h-full min-h-[500px] p-12">
              <div className="w-full max-w-md bg-[#FDE1D3] rounded-[2rem] p-10 shadow-xl">
                <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 leading-tight">{title}</h2>
                <p className="mt-4 text-base text-slate-700 leading-relaxed">{desc}</p>
                <div className="mt-8">
                  {variant === 'teacher' && (<Link href="/teacher/profile/edit" prefetch><button className="group/btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">{isFr ? 'Modifier mon profil' : 'Edit my profile'}<Star className="w-4 h-4 fill-white transition-transform duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" /></button></Link>)}
                  {variant === 'parent-teacher' && (<Link href="/onboarding" prefetch><button className="group/btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">{isFr ? 'Devenir enseignant' : 'Become a teacher'}<Star className="w-4 h-4 fill-white transition-transform duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" /></button></Link>)}
                  {variant === 'guest' && (<Link href="/register?role=teacher" prefetch><button className="group/btn inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">{isFr ? 'En savoir plus' : 'Learn more'}<Star className="w-4 h-4 fill-white transition-transform duration-300 group-hover/btn:rotate-12 group-hover/btn:scale-110" /></button></Link>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}