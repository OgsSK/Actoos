import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import ReportButton from '../components/ReportButton';
import ShareButton from '../components/ShareButton';
import {
  Loader2, MapPin, Globe, Mail, Phone, Users, ChevronLeft,
  Building2, Briefcase, Clock, Banknote, AlertTriangle,
  CheckCircle, Calendar, MapPinned, UserPlus, UserCheck,
  MessageSquare, ExternalLink, FileText
} from 'lucide-react';
import { toast } from 'sonner';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';

// ✅ Fonction de formatage des nombres (10K, 1.2M, etc.)
const formatCount = (num) => {
  if (!num || num < 10000) return num?.toString() || '0';
  if (num >= 1000000) {
    const val = (num / 1000000).toFixed(1).replace(/\.0$/, '');
    return `${val}M`;
  }
  const val = (num / 1000).toFixed(1).replace(/\.0$/, '');
  return `${val}K`;
};

const CompanyDetailPage = () => {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { format } = useCurrencyFormatter();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);
  const [similarCompanies, setSimilarCompanies] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('about');
  const [appliedStatuses, setAppliedStatuses] = useState({});

  const [companyPosts, setCompanyPosts] = useState([]);

  const backUrl = from === 'company-dashboard' ? '/dashboard/entreprise' : '/entreprises';

  const handleBack = () => {
    if (from === 'company-dashboard') navigate('/dashboard/entreprise');
    else navigate('/entreprises');
  };

  const getTranslatedIndustry = (industryFr) => {
    if (!industryFr) return null;
    const frenchT = i18n.getFixedT('fr');
    const frenchIndustries = frenchT('createCompany.industries', { returnObjects: true }) || [];
    const currentIndustries = t('createCompany.industries', { returnObjects: true }) || [];
    const index = frenchIndustries.indexOf(industryFr);
    if (index !== -1 && index < currentIndustries.length) {
      return currentIndustries[index];
    }
    return industryFr;
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    setCompany(null);
    setLoading(true);
    setJobs([]);
    setJobsLoading(true);
    setSimilarCompanies([]);
    fetchCompany();
    fetchJobs();
  }, [id]);

  useEffect(() => {
    if (!company) return;
    supabase
      .from('company_posts')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setCompanyPosts(data || []));
  }, [company]);

  useEffect(() => {
    if (!user || jobs.length === 0) {
      setAppliedStatuses({});
      return;
    }
    supabase
      .from('applications')
      .select('job_id, status')
      .eq('candidate_id', user.id)
      .in('job_id', jobs.map(j => j.id))
      .then(({ data }) => {
        const map = {};
        (data || []).forEach(app => {
          map[app.job_id] = app.status;
        });
        setAppliedStatuses(map);
      });
  }, [user, jobs]);

  useEffect(() => {
    if (company) setFollowersCount(company.followers_count || 0);
  }, [company]);

  useEffect(() => {
    if (!user || !company) return;
    fetch(`/api/companies/${company.id}/follow-status?user_id=${user.id}`)
      .then(res => {
        if (!res.ok) return { is_following: false };
        return res.json();
      })
      .then(data => setIsFollowing(data.is_following ?? false))
      .catch(() => setIsFollowing(false));
  }, [user, company]);

  useEffect(() => {
    if (!company) return;
    setSimilarLoading(true);
    const fetchSimilar = async () => {
      try {
        let query = supabase
          .from('companies')
          .select('id, name, logo_url, industry, subscription_plan')
          .eq('is_verified', true)
          .eq('is_active', true)
          .neq('id', company.id)
          .order('subscription_plan', { ascending: false })
          .order('name')
          .limit(6);
        const orClauses = [];
        if (company.industry) orClauses.push(`industry.eq.${company.industry}`);
        if (company.city_id) orClauses.push(`city_id.eq.${company.city_id}`);
        if (orClauses.length > 0) query = query.or(orClauses.join(','));
        const { data, error } = await query;
        if (error) throw error;
        const now = new Date().toISOString();
        const enriched = await Promise.all(
          (data || []).map(async comp => {
            const { count } = await supabase
              .from('jobs')
              .select('id', { count: 'exact', head: true })
              .eq('company_id', comp.id)
              .eq('status', 'active')
              .or(`expires_at.is.null,expires_at.gte.${now}`);
            return { ...comp, jobs_count: count || 0 };
          })
        );
        setSimilarCompanies(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setSimilarLoading(false);
      }
    };
    fetchSimilar();
  }, [company]);

  const fetchCompany = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select(
          `*, city:cities(name), country:countries(code, name, phone_code), owner:users!owner_id(is_banned)`
        )
        .eq('id', id)
        .single();
      if (error) throw error;
      setCompany(data);
      if (!data.is_active || (data.owner && data.owner.is_banned)) setSuspended(true);
    } catch (err) {
      console.error(err);
      toast.error(t('companyDetail.notFound'));
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('jobs')
        .select(`id, title, contract_type, salary_min, salary_max, created_at, city:cities(name)`)
        .eq('company_id', id)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setJobsLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      toast.error(t('common.loginRequired'));
      return;
    }
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(true);
        if (data.followers_count != null) setFollowersCount(data.followers_count);
        toast.success(t('companyDetail.followSuccess'));
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setFollowLoading(true);
    try {
      const res = await fetch(`/api/companies/${company.id}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(false);
        if (data.followers_count != null) setFollowersCount(data.followers_count);
        toast.success(t('companyDetail.unfollowSuccess'));
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setFollowLoading(false);
    }
  };

  const isOwner = user?.id && company?.owner_id === user.id;

  const TABS = useMemo(() => {
    const tabs = [
      { key: 'about', icon: Building2 },
      { key: 'jobs', icon: Briefcase },
    ];
    if (companyPosts.length > 0) {
      tabs.push({ key: 'news', icon: FileText });
    }
    tabs.push({ key: 'contact', icon: Mail });
    return tabs;
  }, [companyPosts]);

  useEffect(() => {
    const availableKeys = TABS.map(t => t.key);
    if (!availableKeys.includes(activeTab)) {
      setActiveTab('about');
    }
  }, [TABS, activeTab]);

  if (loading)
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  if (!company)
    return <div className="pt-20 text-center">{t('companyDetail.notFoundMessage')}</div>;
  if (suspended)
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('companyDetail.suspendedTitle')}</h1>
          <p className="text-slate-600">{t('companyDetail.suspendedDescription')}</p>
          <button
            onClick={handleBack}
            className="mt-6 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('companyDetail.backToCompanies')}
          </button>
        </div>
      </div>
    );

  const phoneCode = company.country?.phone_code || '';
  const displayPhone =
    phoneCode && company.phone ? `+${phoneCode} ${company.phone}` : company.phone;
  const telLink =
    phoneCode && company.phone
      ? `tel:+${phoneCode}${company.phone.replace(/\s/g, '')}`
      : company.phone
      ? `tel:${company.phone}`
      : null;

  // ✅ Formatage des compteurs
  const formattedFollowers = formatCount(followersCount);
  const formattedJobsCount = formatCount(jobs.length);

  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6 sm:mb-8 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>

        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
          <div className="bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 text-white p-6 sm:p-10 relative overflow-hidden">
            {company.cover_url && (
              <div
                className="absolute inset-0 opacity-20 bg-cover bg-center"
                style={{ backgroundImage: `url(${company.cover_url})` }}
              />
            )}
            <div className="relative z-10 flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
              <div className="relative shrink-0">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center overflow-hidden ring-1 ring-white/20 shadow-2xl">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-12 h-12 sm:w-14 sm:h-14 text-white/40" />
                  )}
                </div>
                {company.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1.5 ring-2 ring-white">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">{company.name}</h1>
                  {company.subscription_plan === 'pro' && (
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">{t('common.pro')}</Badge>
                  )}
                  {company.subscription_plan === 'business' && (
                    <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">⭐ {t('common.premium')}</Badge>
                  )}
                </div>
                {company.industry && (
                  <p className="text-white/60 text-base sm:text-lg">
                    {getTranslatedIndustry(company.industry)}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-6">
                  {!isOwner && user && !isAdmin && (
                    <Button
                      variant={isFollowing ? 'outline' : 'default'}
                      size="sm"
                      onClick={isFollowing ? handleUnfollow : handleFollow}
                      disabled={followLoading}
                      className={
                        isFollowing
                          ? 'border-white/30 text-white hover:bg-white/10'
                          : 'bg-white text-blue-900 hover:bg-blue-50 shadow-lg shadow-white/10'
                      }
                    >
                      {followLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : isFollowing ? (
                        <UserCheck className="w-4 h-4 mr-2" />
                      ) : (
                        <UserPlus className="w-4 h-4 mr-2" />
                      )}
                      {isFollowing ? t('companyDetail.unfollow') : t('companyDetail.follow')}
                    </Button>
                  )}
                  {/* ✅ Nombre d'abonnés formaté */}
                  <span className="text-sm text-white/60">
                    {t('companyDetail.followers', { count: formattedFollowers })}
                  </span>
                  <ShareButton
                    url={window.location.origin + `/entreprises/${company.id}`}
                    title={company.name}
                    text={t('companyDetail.shareText', { name: company.name })}
                  />
                  {!isOwner && user && !isAdmin && (
                    <ReportButton
                      itemType="company"
                      itemId={company.id}
                      reporterId={user.id}
                      className="bg-white/20 text-white hover:bg-white/30 rounded-full px-3 py-1 text-sm"
                    />
                  )}
                  {isOwner && (
                    <Badge variant="outline" className="text-white/60 border-white/20">
                      {t('companyDetail.yourCompany')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200 overflow-x-auto">
            <div className="flex space-x-0 px-4 sm:px-8">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {tab.key === 'about'
                      ? t('companyDetail.tabs.about')
                      : tab.key === 'jobs'
                      ? t('companyDetail.tabs.jobs')
                      : tab.key === 'news'
                      ? t('candidateProfile.posts', 'Actualités')
                      : t(`companyDetail.tabs.${tab.key}`)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {activeTab === 'about' && (
              <div className="space-y-10">
                {company.description && (
                  <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      {t('companyDetail.about')}
                    </h3>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-base">
                      {company.description}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {company.city && (
                    <InfoCard
                      icon={<MapPin className="w-5 h-5" />}
                      label={t('companyDetail.city', 'Ville')}
                      value={company.city.name}
                    />
                  )}
                  {company.country && (
                    <InfoCard
                      icon={<MapPinned className="w-5 h-5" />}
                      label={t('companyDetail.country', 'Pays')}
                      value={t(`countries.${company.country.code}`, company.country.name)}
                    />
                  )}
                  {company.size && (
                    <InfoCard
                      icon={<Users className="w-5 h-5" />}
                      label={t('companyDetail.employees', { size: company.size })}
                      value={company.size}
                    />
                  )}
                  {company.founded_year && (
                    <InfoCard
                      icon={<Calendar className="w-5 h-5" />}
                      label={t('companyProfile.labels.foundedYear')}
                      value={company.founded_year}
                    />
                  )}
                </div>
              </div>
            )}

            {activeTab === 'jobs' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  {t('companyDetail.jobs')} ({formattedJobsCount})
                </h2>
                {jobsLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : jobs.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">{t('companyDetail.noJobs')}</p>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map(job => {
                      const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
                      const applicationStatus = appliedStatuses[job.id];
                      return (
                        <Link
                          key={job.id}
                          to={`/emplois/${job.id}`}
                          className="block bg-white rounded-2xl p-5 border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 text-lg">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-slate-500">
                                {job.city && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {job.city.name}
                                  </span>
                                )}
                                <Badge className={`${contractInfo.color} border-0`}>
                                  {t(contractInfo.key)}
                                </Badge>
                                {job.salary_min && job.salary_max && (
                                  <span className="flex items-center gap-1">
                                    <Banknote className="w-4 h-4" />
                                    {format(job.salary_min)} – {format(job.salary_max)}
                                  </span>
                                )}
                                {applicationStatus &&
                                  applicationStatus !== 'rejected' &&
                                  applicationStatus !== 'withdrawn' && (
                                    <Badge className="bg-green-100 text-green-700 text-xs">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      {t('jobs.alreadyAppliedBadge')}
                                    </Badge>
                                  )}
                              </div>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatRelative(job.created_at)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'news' && companyPosts.length > 0 && (
              <div className="animate-fadeIn">
                <h2 className="text-xl font-bold text-slate-900 mb-6">
                  {t('candidateProfile.posts', 'Actualités')} ({companyPosts.length})
                </h2>
                <div className="space-y-4">
                  {companyPosts.map(post => (
                    <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                      {post.title && <h3 className="font-semibold text-slate-900 text-lg">{post.title}</h3>}
                      <p className="text-slate-600 text-sm mt-2 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <img src={post.image_url} alt="" className="mt-3 rounded-lg max-h-60 object-cover" />
                      )}
                      <p className="text-xs text-slate-400 mt-3">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'contact' && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-6">{t('companyDetail.tabs.contact')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {company.email && (
                    <ContactItem
                      icon={<Mail className="w-5 h-5" />}
                      label={t('companyProfile.labels.email')}
                      value={company.email}
                      href={`mailto:${company.email}`}
                    />
                  )}
                  {company.phone && (
                    <ContactItem
                      icon={<Phone className="w-5 h-5" />}
                      label={t('companyDetail.phone', 'Téléphone')}
                      value={displayPhone}
                      href={telLink}
                    />
                  )}
                  {company.website && (
                    <ContactItem
                      icon={<Globe className="w-5 h-5" />}
                      label={t('companyDetail.website')}
                      value={company.website}
                      href={company.website}
                    />
                  )}
                  {company.address && (
                    <ContactItem
                      icon={<MapPin className="w-5 h-5" />}
                      label={t('companyDetail.address', 'Adresse')}
                      value={company.address}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {similarLoading ? (
          <div className="flex justify-center py-12 mt-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : similarCompanies.length > 0 ? (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              {t('companyDetail.similarCompanies', 'Entreprises similaires')}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {similarCompanies.map(comp => (
                <Link
                  key={comp.id}
                  to={`/entreprises/${comp.id}`}
                  className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {comp.logo_url ? (
                        <img src={comp.logo_url} alt={comp.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{comp.name}</h3>
                      {comp.industry && (
                        <p className="text-xs text-slate-500">
                          {getTranslatedIndustry(comp.industry)}
                        </p>
                      )}
                      {/* ✅ Nombre de jobs formaté */}
                      <p className="text-xs text-slate-400 mt-1">
                        {t('companyDetail.jobsCount', { count: formatCount(comp.jobs_count || 0) })}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const InfoCard = ({ icon, label, value }) => (
  <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 text-center hover:shadow-md transition-all">
    <div className="text-blue-600 mb-2 flex justify-center">{icon}</div>
    <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="text-lg font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

const ContactItem = ({ icon, label, value, href }) => (
  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-sm transition-all">
    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">{icon}</div>
    <div className="min-w-0">
      <p className="text-xs text-slate-400 uppercase tracking-wide">{label}</p>
      {href ? (
        <a href={href} className="text-blue-600 hover:underline font-medium truncate block">{value}</a>
      ) : (
        <p className="text-slate-900 font-medium truncate">{value}</p>
      )}
    </div>
  </div>
);

export default CompanyDetailPage;