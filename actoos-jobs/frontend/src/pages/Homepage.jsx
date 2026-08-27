import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { useCities } from '../hooks/useCities';
import { fetchCategories } from '../lib/data';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Search, MapPin, Briefcase, Building2, ChevronRight,
  ArrowRight, Sparkles, Heart, Loader2, Clock, Plus,
  Shield, TrendingUp,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES, formatSalaryPeriod } from '../lib/utils';
import { toast } from 'sonner';

// ✅ Skeleton pour une carte d'offre
const JobCardSkeleton = () => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-5 bg-slate-100 rounded w-3/4" />
        <div className="h-4 bg-slate-100 rounded w-1/2" />
      </div>
    </div>
    <div className="flex gap-2 mt-4">
      <div className="h-7 w-20 bg-slate-100 rounded-full" />
      <div className="h-7 w-16 bg-slate-100 rounded-full" />
    </div>
    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
      <div className="h-5 bg-slate-100 rounded w-24" />
      <div className="h-4 bg-slate-100 rounded w-16" />
    </div>
  </div>
);

/* ===================================================================
   Barre de recherche avec tags de catégories
   =================================================================== */
const SearchHero = ({ cities, categories = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (keyword.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      const { data } = await supabase.from('jobs').select('title').eq('status', 'active')
        .ilike('title', `%${keyword}%`).limit(5).order('created_at', { ascending: false });
      if (data) {
        const unique = [...new Set(data.map(j => j.title))];
        setSuggestions(unique); setShowSuggestions(unique.length > 0);
      }
      setLoadingSuggestions(false);
    }, 300);
    return () => clearInterval(timer);
  }, [keyword]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    navigate(`/emplois?${params.toString()}`);
    setShowSuggestions(false);
  };

  const categoryTags = categories.filter(cat => cat.slug !== 'other' && cat.slug !== 'autre').slice(0, 6);

  return (
    <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-white pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight">
          {t('home.hero.titleLine1')}{' '}
          <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            {t('home.hero.titleLine2')}
          </span>
        </h1>
        <p className="mt-4 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
          {t('home.hero.subtitle')}
        </p>

        <form onSubmit={handleSearch} className="mt-8 sm:mt-10 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col sm:flex-row gap-2 max-w-3xl mx-auto">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input type="text" placeholder={t('home.hero.searchPlaceholder')} value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-12 h-14 border-0 bg-slate-50 text-base rounded-xl focus:ring-2 focus:ring-blue-500" />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                {loadingSuggestions && <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t('home.hero.searching')}</div>}
                {suggestions.map((s, i) => (
                  <button key={i} type="button" className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-2"
                    onMouseDown={(e) => { e.preventDefault(); setKeyword(s); setShowSuggestions(false); navigate(`/emplois?q=${encodeURIComponent(s)}`); }}>
                    <Search className="w-4 h-4 text-slate-400" /> <span className="text-sm">{s}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="pl-12 h-14 border-0 bg-slate-50 text-base rounded-xl focus:ring-2 focus:ring-blue-500 w-full appearance-none text-slate-900">
              <option value="">{t('home.hero.allCities')}</option>
              {cities.map((city) => (<option key={city.id} value={city.name}>{city.name}</option>))}
            </select>
          </div>
          <Button type="submit" size="lg" className="h-14 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
            <Search className="w-5 h-5 mr-2" /> {t('home.hero.searchButton')}
          </Button>
        </form>

        {/* Tags catégories */}
        <div className="mt-6">
          <div className="flex lg:hidden overflow-x-auto gap-2 pb-2 scrollbar-hide -mx-4 px-4 snap-x">
            {categoryTags.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/emplois?category=${encodeURIComponent(cat.slug)}`)}
                className="flex-shrink-0 snap-start px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                {t(`categories.${cat.slug}`, cat.name)}
              </button>
            ))}
          </div>
          <div className="hidden lg:flex flex-wrap justify-center gap-2">
            {categoryTags.map((cat) => (
              <button
                key={cat.id}
                onClick={() => navigate(`/emplois?category=${encodeURIComponent(cat.slug)}`)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-full text-sm text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
              >
                {t(`categories.${cat.slug}`, cat.name)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

/* ===================================================================
   Bandeau catégories avec défilement horizontal
   =================================================================== */
const CategoriesStrip = ({ categories = [] }) => {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll); };
    }
  }, [categories]);

  const scroll = (direction) => { if (scrollRef.current) scrollRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' }); };

  if (categories.length === 0) return null;

  return (
    <section className="py-8 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">{t('home.categories.title')}</h2>
          <div className="flex gap-2">
            {canScrollLeft && (
              <button onClick={() => scroll(-1)} className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
              </button>
            )}
            {canScrollRight && (
              <button onClick={() => scroll(1)} className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 snap-x">
          {categories.map((cat) => (
            <Link key={cat.id} to={`/emplois?category=${cat.slug}`}
              className="flex-shrink-0 snap-start px-5 py-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-sm font-medium text-slate-700 hover:text-blue-700 transition-colors whitespace-nowrap">
              {t(`categories.${cat.slug}`, cat.name)}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===================================================================
   Offres récentes
   =================================================================== */
const RecentJobsSection = ({ countryId, activeCompanyIds }) => {
  const { t } = useTranslation();
  const { user, isCompany, isCandidate, activeCompanyId } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);
  const [appliedStatuses, setAppliedStatuses] = useState({});

  useEffect(() => {
    if (!user) { setSavedJobs([]); return; }
    supabase.from('saved_jobs').select('job_id').eq('user_id', user.id).then(({ data }) => setSavedJobs((data || []).map(s => s.job_id)));
  }, [user]);

  const handleSaveJob = async (jobId) => {
    if (!user) { toast.error(t('home.jobs.saveLogin')); return; }
    if (isCompany) { toast.error(t('home.jobs.companyCannotSave')); return; }
    if (savedJobs.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobs(prev => prev.filter(id => id !== jobId));
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId });
      setSavedJobs(prev => [...prev, jobId]);
    }
  };

  useEffect(() => {
    if (!activeCompanyIds || activeCompanyIds.length === 0) { setJobs([]); setLoading(false); return; }
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const now = new Date().toISOString();
        let query = supabase.from('jobs').select(`id, title, contract_type, salary_min, salary_max, salary_period, created_at, is_urgent, is_remote, remote_type, boosted_until, company:companies(name, logo_url, owner_id), city:cities(name)`)
          .eq('status', 'active').or(`expires_at.is.null,expires_at.gte.${now}`).in('company_id', activeCompanyIds)
          .order('boosted_until', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(6);
        if (countryId) query = query.eq('country_id', countryId);
        const { data, error } = await query;
        if (error) throw error;
        const finalJobs = (data || []).map(job => ({ ...job, location: job.city?.name || t('home.jobs.unknownLocation'), company_name: job.company?.name || t('home.jobs.unknownCompany'), company_logo: job.company?.logo_url, owner_id: job.company?.owner_id }));
        setJobs(finalJobs);
        if (user && finalJobs.length > 0) {
          const { data: apps } = await supabase.from('applications').select('job_id, status').eq('candidate_id', user.id).in('job_id', finalJobs.map(j => j.id));
          const map = {}; (apps || []).forEach(app => { map[app.job_id] = app.status; });
          setAppliedStatuses(map);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchJobs();
  }, [countryId, activeCompanyIds, user]);

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div><h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('home.jobs.title')}</h2><p className="text-slate-600 mt-1">{t('home.jobs.subtitle')}</p></div>
          <Link to="/emplois" className="hidden sm:inline-flex items-center text-blue-600 hover:text-blue-700 font-medium">{t('home.jobs.viewAll')} <ArrowRight className="w-4 h-4 ml-1" /></Link>
        </div>
        
        {/* ✅ Squelettes pendant le chargement */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <JobCardSkeleton key={i} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('home.jobs.noJobsTitle')}</h3>
            <p className="text-slate-600 mb-4">{t('home.jobs.noJobsText')}</p>
            {user && isCompany ? (
              <Link to={activeCompanyId ? "/dashboard/entreprise/offres/nouvelle" : "/dashboard/entreprise/creer"} className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium"><Plus className="w-4 h-4" />{t('home.jobs.postJob')}</Link>
            ) : user && isCandidate ? (
              <Link to="/emplois" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium">{t('home.jobs.seeJobs')}</Link>
            ) : (
              <Link to="/inscription?type=entreprise" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium">{t('home.jobs.postFirstJob')}</Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.map((job) => (<JobCard key={job.id} job={job} user={user} onSave={handleSaveJob} isSaved={savedJobs.includes(job.id)} applicationStatus={appliedStatuses[job.id] || null} />))}
          </div>
        )}
        <div className="mt-8 text-center sm:hidden"><Link to="/emplois" className="inline-flex items-center text-blue-600 font-medium">{t('home.jobs.viewAll')} <ArrowRight className="w-4 h-4 ml-1" /></Link></div>
      </div>
    </section>
  );
};

/* ===================================================================
   Carte d'offre modernisée
   =================================================================== */
const JobCard = ({ job, user, onSave, isSaved, applicationStatus }) => {
  const { t } = useTranslation();
  const { format } = useCurrencyFormatter();
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const isOwner = user?.id && job.owner_id === user.id;
  const isCompany = user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company';

  return (
    <Link to={`/emplois/${job.id}`} className="block group">
      <div className="relative bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200">
        {job.is_urgent && <div className="absolute -top-px inset-x-0 bg-red-500 text-white text-xs font-medium px-3 py-1 text-center rounded-t-2xl">{t('home.jobs.urgent')}</div>}
        <div className="flex items-start gap-4 mt-1">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
            {job.company_logo ? <img src={job.company_logo} alt="" className="w-full h-full object-cover" /> : <Building2 className="w-7 h-7 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-2 leading-snug">{job.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{job.company_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 rounded-full px-3 py-1"><MapPin className="w-3 h-3" />{job.location}</span>
          <Badge className={`${contractInfo.color} border-0 text-xs rounded-full`}>{t(contractInfo.key)}</Badge>
          {job.is_remote && <Badge className="bg-green-50 text-green-600 border-0 text-xs rounded-full">{t('home.jobs.remote')}</Badge>}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
          <div className="text-sm">
            {job.salary_min && job.salary_max ? (
              <span className="font-semibold text-slate-800">
                {format(job.salary_min)} – {format(job.salary_max)}
                {formatSalaryPeriod(job.salary_period, t)}
              </span>
            ) : (
              <span className="text-slate-500 text-sm">{t('home.jobs.unspecified')}</span>
            )}
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(job.created_at)}</span>
        </div>
        {!isOwner && !isCompany && (
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(job.id); }} className={cn('absolute top-3 right-3 p-2 rounded-xl transition', isSaved ? 'bg-red-50 text-red-500' : 'text-slate-400 hover:bg-red-50 hover:text-red-500')}>
            <Heart className={cn('w-5 h-5', isSaved && 'fill-current')} />
          </button>
        )}
        {applicationStatus && applicationStatus !== 'rejected' && applicationStatus !== 'withdrawn' && (
          <Badge className="absolute top-3 left-3 bg-green-100 text-green-700 text-xs rounded-full">✅ {t('home.jobs.alreadyAppliedBadge')}</Badge>
        )}
        {isOwner && <Badge className="absolute top-3 left-3 bg-blue-600 text-white text-xs rounded-full">{t('home.jobs.yourJob')}</Badge>}
      </div>
    </Link>
  );
};

/* ===================================================================
   Comment ça marche
   =================================================================== */
const HowItWorksSection = () => {
  const { t } = useTranslation();
  const steps = [
    { step: '01', title: t('home.how.step1Title'), desc: t('home.how.step1Desc') },
    { step: '02', title: t('home.how.step2Title'), desc: t('home.how.step2Desc') },
    { step: '03', title: t('home.how.step3Title'), desc: t('home.how.step3Desc') },
    { step: '04', title: t('home.how.step4Title'), desc: t('home.how.step4Desc') },
  ];
  return (
    <section className="py-16 bg-white border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10"><h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('home.how.title')}</h2><p className="text-slate-600 mt-2">{t('home.how.subtitle')}</p></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s) => (
            <div key={s.step} className="text-center p-6 rounded-2xl bg-slate-50">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-lg font-bold">{s.step}</div>
              <h3 className="font-semibold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ===================================================================
   CTA Recruteur
   =================================================================== */
const CompanyCTASection = () => {
  const { t } = useTranslation();
  const { isCompany, activeCompanyId } = useAuth();
  return (
    <section className="py-16 bg-blue-600">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">{t('home.cta.title')}</h2>
        <p className="mt-4 text-blue-100 max-w-2xl mx-auto">{t('home.cta.subtitle')}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          {isCompany ? (
            <Link to={activeCompanyId ? "/dashboard/entreprise/offres/nouvelle" : "/dashboard/entreprise/creer"}><Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-xl px-8 h-14"><Plus className="w-5 h-5 mr-2" /> {t('home.cta.publishJob')}</Button></Link>
          ) : (
            <Link to="/inscription?type=entreprise"><Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-xl px-8 h-14">{t('home.cta.createAccount')} <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          )}
          {isCompany && (
            <Link to="/tarifs"><Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 rounded-xl px-8 h-14">{t('home.cta.pricing')}</Button></Link>
          )}
        </div>
      </div>
    </section>
  );
};

/* ===================================================================
   Pourquoi Actoos
   =================================================================== */
const WhyChooseSection = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const reasons = [
    { icon: Sparkles, title: t('home.why.title1'), desc: t('home.why.desc1') },
    { icon: Shield, title: t('home.why.title2'), desc: t('home.why.desc2') },
    { icon: TrendingUp, title: t('home.why.title3'), desc: t('home.why.desc3') },
    { icon: Heart, title: t('home.why.title4'), desc: t('home.why.desc4') },
  ];
  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10"><h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('home.why.mainTitle')}</h2></div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {reasons.map(r => (
            <div key={r.title} className="text-center p-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><r.icon className="w-6 h-6" /></div>
              <h3 className="font-semibold text-slate-900 mb-2">{r.title}</h3>
              <p className="text-sm text-slate-600">{r.desc}</p>
            </div>
          ))}
        </div>
        {!user && (
          <div className="text-center mt-12">
            <Link to="/inscription"><Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl">{t('home.why.createAccount')} <ArrowRight className="w-4 h-4 ml-2" /></Button></Link>
          </div>
        )}
      </div>
    </section>
  );
};

/* ===================================================================
   Page principale
   =================================================================== */
const Homepage = () => {
  const [countryId, setCountryId] = useState(null);
  const [countryLoading, setCountryLoading] = useState(true);
  const [activeCompanyIds, setActiveCompanyIds] = useState([]);
  const [categories, setCategories] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const { prefs } = usePreferencesContext();
  const { cities: filteredCities } = useCities(prefs.country);

  // Résolution du pays
  useEffect(() => {
    if (prefs.country) {
      supabase.from('countries').select('id').eq('code', prefs.country).single()
        .then(({ data }) => { setCountryId(data?.id || null); setCountryLoading(false); })
        .catch(() => { setCountryId(null); setCountryLoading(false); });
    } else { setCountryId(null); setCountryLoading(false); }
  }, [prefs.country]);

  // Chargement des entreprises actives
  useEffect(() => {
    if (countryLoading) return;
    let q = supabase.from('companies').select('id').eq('is_verified', true).eq('is_active', true);
    if (countryId) q = q.eq('country_id', countryId);
    q.then(({ data }) => setActiveCompanyIds(data ? data.map(c => c.id) : []));
  }, [countryId, countryLoading]);

  // Catégories avec au moins une offre active
  useEffect(() => {
    const loadPopularCategories = async () => {
      try {
        const allCategories = await fetchCategories();
        const now = new Date().toISOString();
        const categoriesWithCount = await Promise.all(
          allCategories.map(async (cat) => {
            const { count } = await supabase
              .from('jobs')
              .select('id', { count: 'exact', head: true })
              .eq('category_id', cat.id)
              .eq('status', 'active')
              .or(`expires_at.is.null,expires_at.gte.${now}`);
            return { ...cat, jobsCount: count || 0 };
          })
        );

        const isOther = (cat) => cat.slug === 'other' || cat.slug === 'autre';
        const otherCategory = categoriesWithCount.find(isOther);
        let otherCategories = categoriesWithCount.filter(cat => !isOther(cat) && cat.jobsCount > 0);

        otherCategories.sort((a, b) => {
          if (b.jobsCount !== a.jobsCount) return b.jobsCount - a.jobsCount;
          return (a.name || '').localeCompare(b.name || '');
        });

        const filteredOther = otherCategory && otherCategory.jobsCount > 0 ? [otherCategory] : [];
        setCategories([...otherCategories, ...filteredOther]);
      } catch (error) {
        console.error('Erreur chargement catégories populaires:', error);
        const fallback = await fetchCategories();
        setCategories(fallback || []);
      }
    };
    loadPopularCategories();
  }, []);

  // Villes avec au moins une offre active
  useEffect(() => {
    const loadCitiesWithJobs = async () => {
      if (!filteredCities || filteredCities.length === 0) {
        setPopularCities([]);
        return;
      }
      const { data: activeJobs } = await supabase
        .from('jobs')
        .select('city_id')
        .eq('status', 'active')
        .not('city_id', 'is', null);

      if (activeJobs) {
        const cityOfferCount = {};
        activeJobs.forEach(job => { cityOfferCount[job.city_id] = (cityOfferCount[job.city_id] || 0) + 1; });
        const cityIdsWithJobs = Object.keys(cityOfferCount);
        const filtered = filteredCities.filter(city => cityIdsWithJobs.includes(city.id));
        filtered.sort((a, b) => (cityOfferCount[b.id] || 0) - (cityOfferCount[a.id] || 0));
        setPopularCities(filtered);
      } else {
        setPopularCities([]);
      }
    };
    loadCitiesWithJobs();
  }, [filteredCities]);

  return (
    <div className="min-h-screen">
      <SearchHero cities={popularCities} categories={categories} />
      <CategoriesStrip categories={categories} />
      <RecentJobsSection countryId={countryId} activeCompanyIds={activeCompanyIds} />
      <HowItWorksSection />
      <CompanyCTASection />
      <WhyChooseSection />
    </div>
  );
};

export default Homepage;