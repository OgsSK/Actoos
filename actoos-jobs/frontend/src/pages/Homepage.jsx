import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { usePreferences } from '../hooks/usePreferences'; // Correction : plus de PreferencesContext
import { useCities } from '../hooks/useCities';
import { fetchCategories } from '../lib/data';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Search, MapPin, Briefcase, Building2, Users, ChevronRight,
  TrendingUp, CheckCircle, ArrowRight, Sparkles, Globe, Shield, Zap, Heart, Loader2, Clock,
  Plus,
} from 'lucide-react';
import { cn, formatRelative, CONTRACT_TYPES } from '../lib/utils';
import { toast } from 'sonner';

// ---------- Animated Counter ----------
const AnimatedCounter = ({ value, duration = 1000 }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!value) return;
    let start = 0;
    const step = Math.ceil(value / (duration / 20));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}+</>;
};

// ---------- HeroSection ----------
const HeroSection = ({ stats, popularSearches = [], cities = [] }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (keyword.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      const { data } = await supabase
        .from('jobs')
        .select('title')
        .eq('status', 'active')
        .ilike('title', `%${keyword}%`)
        .limit(5)
        .order('created_at', { ascending: false });
      if (data) {
        const unique = [...new Set(data.map(j => j.title))];
        setSuggestions(unique);
        setShowSuggestions(unique.length > 0);
      }
      setLoadingSuggestions(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    navigate(`/emplois?${params.toString()}`);
    setShowSuggestions(false);
  };

  const { activeJobs, companies, candidates } = stats || {};

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-blue-400/30 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-white/90 text-sm font-medium">{t('home.hero.badge')}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 font-display leading-tight">
            {t('home.hero.titleLine1')}
            <span className="block mt-2">
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                {t('home.hero.titleLine2')}
              </span>
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            {t('home.hero.subtitle')}
          </p>
          <form onSubmit={handleSearch} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-3 max-w-3xl mx-auto relative">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder={t('home.hero.searchPlaceholder')}
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  className="pl-12 h-14 border-0 bg-slate-50 text-lg rounded-2xl focus:ring-2 focus:ring-blue-500"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-lg border border-slate-200 z-20 overflow-hidden">
                    {loadingSuggestions && (
                      <div className="px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('home.hero.searching')}
                      </div>
                    )}
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setKeyword(s);
                          setShowSuggestions(false);
                          navigate(`/emplois?q=${encodeURIComponent(s)}`);
                        }}
                      >
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700">{s}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-slate-400 z-10" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-12 h-14 border-0 bg-slate-50 text-lg rounded-2xl focus:ring-2 focus:ring-blue-500 w-full appearance-none text-slate-900"
                >
                  <option value="">{t('home.hero.allCities')}</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.name}>{city.name}</option>
                  ))}
                </select>
              </div>
              <Button type="submit" size="lg" className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white rounded-2xl">
                <Search className="w-5 h-5 mr-2" /> {t('home.hero.searchButton')}
              </Button>
            </div>
          </form>

          {stats && (
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {activeJobs !== null ? <AnimatedCounter value={activeJobs} /> : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">{t('home.hero.activeJobs')}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {companies !== null ? <AnimatedCounter value={companies} /> : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">{t('home.hero.companies')}</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {candidates !== null ? <AnimatedCounter value={candidates} /> : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">{t('home.hero.candidates')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
};

// ---------- Categories Section ----------
const CategoriesSection = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const load = async () => { const data = await fetchCategories(); setCategories(data); setLoading(false); };
    load();
  }, []);
  if (loading) return <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" /></div></section>;
  return (
    <section className="py-20 bg-white"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">{t('home.categories.title')}</h2><p className="text-slate-600 mt-3 max-w-2xl mx-auto">{t('home.categories.subtitle')}</p></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">{categories.map((category) => (<Link key={category.id} to={`/emplois?category=${category.slug}`} className="group bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-3xl p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"><div className="text-4xl mb-3">{category.icon || '📌'}</div><h3 className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm">
  {t(`categories.${category.slug}`, category.name)}
</h3></Link>))}</div></div></section>
  );
};

// ---------- Recent Jobs Section ----------
const RecentJobsSection = ({ countryId }) => {
  const { t } = useTranslation();
  const { user, isCompany, isCandidate } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedJobs, setSavedJobs] = useState([]);

  useEffect(() => {
    if (!user) { setSavedJobs([]); return; }
    supabase.from('saved_jobs').select('job_id').eq('user_id', user.id).then(({ data }) => setSavedJobs((data || []).map((s) => s.job_id)));
  }, [user]);

  const handleSaveJob = async (jobId) => {
    if (!user) { toast.error(t('home.jobs.saveLogin')); return; }
    if (isCompany) { toast.error(t('home.jobs.companyCannotSave')); return; }
    if (savedJobs.includes(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      setSavedJobs((prev) => prev.filter((id) => id !== jobId));
      toast.success(t('home.jobs.unsaveSuccess'));
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId });
      setSavedJobs((prev) => [...prev, jobId]);
      toast.success(t('home.jobs.saveSuccess'));
    }
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        let query = supabase
          .from('jobs')
          .select(`id, title, contract_type, salary_min, salary_max, created_at, is_urgent, is_remote, remote_type, boosted_until, company:companies(name, logo_url, owner_id), city:cities(name)`)
          .eq('status', 'active')
          .order('boosted_until', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false })
          .limit(6);

        if (countryId) {
          query = query.eq('country_id', countryId);
        }

        const { data, error } = await query;
        if (error) throw error;
        const formattedJobs = (data || []).map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company?.name || t('home.jobs.unknownCompany'),
          company_logo: job.company?.logo_url,
          owner_id: job.company?.owner_id,
          location: job.city?.name || t('home.jobs.unknownLocation'),
          contract_type: job.contract_type,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          created_at: job.created_at,
          urgent: job.is_urgent,
          is_remote: job.is_remote,
          remote_type: job.remote_type,
          boosted_until: job.boosted_until,
        }));
        setJobs(formattedJobs);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [countryId, t]);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12"><div><h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">{t('home.jobs.title')}</h2><p className="text-slate-600 mt-2">{t('home.jobs.subtitle')}</p></div><Link to="/emplois"><Button variant="outline" className="hidden sm:flex border-blue-600 text-blue-600 hover:bg-blue-50">{t('home.jobs.viewAll')} <ChevronRight className="w-4 h-4 ml-1" /></Button></Link></div>
        {loading ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div> : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{t('home.jobs.noJobsTitle')}</h3>
            <p className="text-slate-600 mb-4">{t('home.jobs.noJobsText')}</p>
            {user && isCompany ? (
              <Link to="/dashboard/entreprise/offres/nouvelle" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t('home.jobs.postJob')}
              </Link>
            ) : user && isCandidate ? (
              <Link to="/emplois" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium">
                {t('home.jobs.seeJobs')}
              </Link>
            ) : (
              <Link to="/inscription?type=entreprise" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 text-sm font-medium">
                {t('home.jobs.postFirstJob')}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (<JobCard key={job.id} job={job} user={user} onSave={handleSaveJob} isSaved={savedJobs.includes(job.id)} />))}
          </div>
        )}
        <div className="text-center mt-10 sm:hidden"><Link to="/emplois"><Button className="bg-blue-600 text-white hover:bg-blue-700">{t('home.jobs.viewAll')} <ChevronRight className="w-4 h-4 ml-1" /></Button></Link></div>
      </div>
    </section>
  );
};

// ---------- Job Card (avec badge télétravail amélioré) ----------
const JobCard = ({ job, user, onSave, isSaved }) => {
  const { t } = useTranslation();
  const { format } = useCurrencyFormatter();
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  const isOwner = user?.id && job.owner_id === user.id;
  const isCompany = user?.user_metadata?.role === 'company' || user?.app_metadata?.role === 'company' || user?.user_metadata?.account_type === 'company';
  const isBoosted = job.boosted_until && new Date(job.boosted_until) > new Date();

  const handleSaveClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast.error(t('home.jobs.saveLogin')); return; }
    if (isCompany) { toast.error(t('home.jobs.companyCannotSave')); return; }
    if (onSave) onSave(job.id);
  };

  const getRemoteLabel = () => {
    if (!job.is_remote) return null;
    switch (job.remote_type) {
      case 'full':
        return t('home.jobs.remoteFull', '100% télétravail');
      case 'partial':
        return t('home.jobs.remoteHybrid', 'Hybride');
      case 'occasional':
        return t('home.jobs.remoteOccasional', 'Occasionnel');
      default:
        return t('home.jobs.remote', 'Télétravail');
    }
  };

  return (
    <Link to={`/emplois/${job.id}`} className="block group">
      <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-slate-200 rounded-3xl overflow-hidden bg-white relative">
        {job.urgent && <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-medium px-3 py-1 text-center">{t('home.jobs.urgent')}</div>}
        <CardContent className="p-5 pt-3">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">{job.company_logo ? <img src={job.company_logo} alt={job.company} className="w-10 h-10 object-contain" /> : <Building2 className="w-7 h-7 text-slate-400 group-hover:text-blue-500" />}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 line-clamp-1">{job.title}</h3>
              <p className="text-slate-600 text-sm mt-1">{job.company}</p>
              <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                <Badge className={`${contractInfo.color} border-0 rounded-full`}>{contractInfo.label}</Badge>
                {isBoosted && (
                  <Badge className="bg-purple-100 text-purple-700 border border-purple-200">
                    🚀 {t('home.jobs.boosted')}
                  </Badge>
                )}
                {job.is_remote && (
                  <Badge className="border border-green-500 text-green-600 rounded-full bg-white">
                    {getRemoteLabel()}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm">
              <span className="text-slate-500">{t('home.jobs.salary')}: </span>
              <span className="font-medium text-slate-700">
                {job.salary_min && job.salary_max ? (
                  <span>{format(job.salary_min)} - {format(job.salary_max)}</span>
                ) : t('home.jobs.unspecified')}
              </span>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{formatRelative(job.created_at)}</span>
          </div>
        </CardContent>
        {isOwner && <div className="absolute top-2 left-2"><Badge className="bg-blue-600 text-white text-xs">{t('home.jobs.yourJob')}</Badge></div>}
        {!isOwner && !isCompany && (
          <button onClick={handleSaveClick} className={cn('absolute top-2 right-2 p-2 rounded-xl transition-all z-10', isSaved ? 'bg-red-100 text-red-500' : 'bg-white/90 text-slate-400 hover:bg-red-50 hover:text-red-500')}><Heart className={cn('w-5 h-5', isSaved && 'fill-current')} /></button>
        )}
      </Card>
    </Link>
  );
};

// ---------- Companies Section (avec filtrage par pays) ----------
const CompaniesSection = ({ countryId }) => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      setLoading(true);
      let query = supabase
        .from('companies')
        .select('id, name, logo_url, industry, subscription_plan')
        .eq('is_verified', true)
        .limit(8);

      if (countryId) {
        query = query.eq('country_id', countryId);
      }

      const { data } = await query;
      setCompanies(data || []);
      setLoading(false);
    };
    fetchCompanies();
  }, [countryId]);

  if (loading || companies.length === 0) return null;

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">
            {t('home.companies.title')}
          </h2>
          <p className="text-slate-600 mt-3">{t('home.companies.subtitle')}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {companies.map((c) => (
            <Link key={c.id} to={`/entreprises/${c.id}`} className="flex flex-col items-center p-6 bg-slate-50 rounded-2xl hover:bg-blue-50 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-3">
                {c.logo_url ? <img src={c.logo_url} alt={c.name} className="w-10 h-10 object-contain" /> : <Building2 className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="font-medium text-slate-900 text-center">
                {c.name}
                {c.subscription_plan === 'pro' && (
                  <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">Pro</Badge>
                )}
                {c.subscription_plan === 'business' && (
                  <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200">
                    ⭐ {t('common.premium')}
                  </Badge>
                )}
              </h3>
              {c.industry && <p className="text-xs text-slate-500 mt-1">{c.industry}</p>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// ---------- How It Works Section ----------
const HowItWorksSection = () => {
  const { t } = useTranslation();
  const steps = [
    { icon: Users, title: t('home.how.step1Title'), description: t('home.how.step1Desc'), color: 'bg-blue-500' },
    { icon: Search, title: t('home.how.step2Title'), description: t('home.how.step2Desc'), color: 'bg-blue-600 text-white' },
    { icon: Briefcase, title: t('home.how.step3Title'), description: t('home.how.step3Desc'), color: 'bg-blue-700 text-white' },
    { icon: CheckCircle, title: t('home.how.step4Title'), description: t('home.how.step4Desc'), color: 'bg-blue-800 text-white' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">{t('home.how.title')}</h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">{t('home.how.subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-slate-200 to-slate-100" />
              )}
              <div className="relative inline-flex">
                <div className={`w-20 h-20 ${step.color} rounded-3xl flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg mt-6 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ---------- CTA Section ----------
const CompanyCTASection = ({ stats }) => {
  const { t } = useTranslation();
  const { isCompany } = useAuth();
  const { activeJobs, companies, candidates } = stats || {};

  const features = [
    t('home.cta.feature1'),
    t('home.cta.feature2'),
    t('home.cta.feature3'),
    t('home.cta.feature4'),
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <Badge className="bg-white/10 text-white border border-blue-400/30 mb-6 rounded-full px-4 py-2">{t('home.cta.badge')}</Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-display mb-6 leading-tight">{t('home.cta.title')}</h2>
            <p className="text-blue-100 text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0">{t('home.cta.subtitle')}</p>
            <div className="space-y-4 mb-10 text-left max-w-xs mx-auto lg:mx-0">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-white">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4 text-blue-400" /></div>
                  <span className="text-base">{feature}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              {isCompany ? (
                <Link to="/dashboard/entreprise/offres/nouvelle">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 text-base shadow-lg">
                    <Plus className="w-4 h-4 mr-2" /> {t('home.cta.publishJob')}
                  </Button>
                </Link>
              ) : (
                <Link to="/inscription?type=entreprise">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl px-8 h-14 text-base shadow-lg">
                    {t('home.cta.createAccount')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
              {isCompany && (
                <Link to="/tarifs">
                  <Button size="lg" variant="outline" className="border border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-2xl px-8 h-14 text-base">{t('home.cta.pricing')}</Button>
                </Link>
              )}
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative w-[420px] h-[420px]">
              <div className="absolute top-0 left-0 z-20 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl px-5 py-4 border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center"><Briefcase className="w-6 h-6 text-blue-600" /></div>
                  <div><p className="text-2xl font-bold text-slate-900">{activeJobs !== null ? `${activeJobs}+` : '...'}</p><p className="text-sm text-slate-500">{t('home.hero.activeJobs')}</p></div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 z-20 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl px-5 py-4 border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center"><Users className="w-6 h-6 text-blue-600" /></div>
                  <div><p className="text-2xl font-bold text-slate-900">{candidates !== null ? `${candidates}+` : '...'}</p><p className="text-sm text-slate-500">{t('home.hero.candidates')}</p></div>
                </div>
              </div>
              <div className="absolute top-1/2 left-0 -translate-y-1/2 z-20 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl px-5 py-4 border border-white/20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center"><Building2 className="w-6 h-6 text-blue-600" /></div>
                  <div><p className="text-2xl font-bold text-slate-900">{companies !== null ? `${companies}+` : '...'}</p><p className="text-sm text-slate-500">{t('home.hero.companies')}</p></div>
                </div>
              </div>
              <div className="absolute inset-12 z-10 rounded-[32px] border border-white/20 bg-white/10 backdrop-blur-md shadow-2xl flex items-center justify-center">
                <div className="absolute top-10 right-10 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl" />
                <div className="absolute bottom-10 left-10 w-20 h-20 bg-blue-300/10 rounded-full blur-2xl" />
                <div className="relative w-36 h-36 rounded-[32px] bg-white/10 border border-white/10 flex items-center justify-center"><Building2 className="w-20 h-20 text-white/50" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ---------- Why Choose Section ----------
const WhyChooseSection = () => {
  const { t } = useTranslation();
  const reasons = [
    { icon: Globe, title: t('home.why.title1'), description: t('home.why.desc1') },
    { icon: Building2, title: t('home.why.title2'), description: t('home.why.desc2') },
    { icon: Shield, title: t('home.why.title3'), description: t('home.why.desc3') },
    { icon: Zap, title: t('home.why.title4'), description: t('home.why.desc4') },
    { icon: Heart, title: t('home.why.title5'), description: t('home.why.desc5') },
    { icon: TrendingUp, title: t('home.why.title6'), description: t('home.why.desc6') },
  ];
  return (
    <section className="py-20 bg-slate-50"><div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div className="text-center mb-12"><h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">{t('home.why.mainTitle')}</h2><p className="text-slate-600 mt-3 max-w-2xl mx-auto">{t('home.why.mainSubtitle')}</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{reasons.map((reason) => (<Card key={reason.title} className="border-0 shadow-lg bg-white rounded-3xl hover:shadow-xl transition-all duration-300"><CardContent className="p-6 text-center"><div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><reason.icon className="w-7 h-7 text-blue-600" /></div><h3 className="font-semibold text-slate-900 mb-2">{reason.title}</h3><p className="text-slate-600 text-sm">{reason.description}</p></CardContent></Card>))}</div><div className="text-center mt-12"><Link to="/inscription"><Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-2xl">{t('home.why.createAccount')} <ArrowRight className="w-4 h-4 ml-2" /></Button></Link></div></div></section>
  );
};

// ---------- Main Homepage ----------
const Homepage = () => {
  const [activeJobs, setActiveJobs] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [countryId, setCountryId] = useState(null);
  const [countryLoading, setCountryLoading] = useState(true);

  const { prefs } = usePreferences(); // Correction : utilisation du hook standard
  const { cities: filteredCities } = useCities(prefs.country);

  useEffect(() => {
    if (prefs.country) {
      setCountryLoading(true);
      supabase
        .from('countries')
        .select('id')
        .eq('code', prefs.country)
        .single()
        .then(({ data }) => {
          setCountryId(data?.id || null);
          setCountryLoading(false);
        })
        .catch(() => {
          setCountryId(null);
          setCountryLoading(false);
        });
    } else {
      setCountryId(null);
      setCountryLoading(false);
    }
  }, [prefs.country]);

  useEffect(() => {
    if (countryLoading) return;

    const loadStats = async () => {
      setActiveJobs(null);
      setCompanies(null);
      setCandidates(null);

      let queryJobs = supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'active');
      let queryCompanies = supabase.from('companies').select('id', { count: 'exact', head: true }).eq('is_verified', true);
      let queryCandidates = supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'candidate');

      if (countryId) {
        queryJobs = queryJobs.eq('country_id', countryId);
        queryCompanies = queryCompanies.eq('country_id', countryId);
        if (prefs.country) {
          queryCandidates = queryCandidates.eq('preferences->>country', prefs.country);
        }
      }

      const [jobsRes, compsRes, candsRes] = await Promise.all([
        queryJobs,
        queryCompanies,
        queryCandidates,
      ]);

      setActiveJobs(jobsRes.count || 0);
      setCompanies(compsRes.count || 0);
      setCandidates(candsRes.count || 0);
    };

    loadStats();
  }, [countryId, countryLoading, prefs.country]);

  const stats = { activeJobs, companies, candidates };

  return (
    <div className="min-h-screen">
      <HeroSection stats={stats} popularSearches={[]} cities={filteredCities} />
      <CategoriesSection />
      <RecentJobsSection countryId={countryId} />
      <CompaniesSection countryId={countryId} />
      <HowItWorksSection />
      <CompanyCTASection stats={stats} />
      <WhyChooseSection />
    </div>
  );
};

export default Homepage;