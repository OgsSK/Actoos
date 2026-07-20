import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Building2, MapPin, Users, Search, Briefcase, CheckCircle, Loader2,
  Bell, BellOff, TrendingUp, FilterX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';

// ---------- Carte entreprise ----------
const CompanyCard = ({ company, user }) => {
  const { t, i18n } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(company.followers_count || 0);
  const [loadingFollow, setLoadingFollow] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/companies/${company.id}/follow-status?user_id=${user.id}`)
      .then(res => res.json())
      .then(data => setIsFollowing(data.is_following ?? false))
      .catch(() => setIsFollowing(false));
    setFollowersCount(company.followers_count || 0);
  }, [user, company.id, company.followers_count]);

  const handleToggleFollow = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error(t('common.loginRequired'));
      return;
    }
    setLoadingFollow(true);
    const method = isFollowing ? 'DELETE' : 'POST';
    try {
      const res = await fetch(`/api/companies/${company.id}/follow`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
        setFollowersCount(data.followers_count);
        toast.success(
          isFollowing
            ? t('companyDetail.unfollowSuccess')
            : t('companyDetail.followSuccess')
        );
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoadingFollow(false);
    }
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

  return (
    <div className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full">
      <Link to={`/entreprises/${company.id}`} className="block p-5 sm:p-6 flex-1">
        <div className="flex items-start gap-4 mb-3">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-slate-100 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
            {company.logo_url ? (
              <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-slate-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-base sm:text-lg">
                {company.name}
              </h3>
              {company.subscription_plan === 'pro' && (
                <Badge className="bg-blue-50 text-blue-700 border-blue-100 text-xs font-medium">
                  {t('common.pro', 'Pro')}
                </Badge>
              )}
              {company.subscription_plan === 'business' && (
                <Badge className="bg-purple-50 text-purple-700 border-purple-100 text-xs font-medium">
                  ⭐ {t('common.premium')}
                </Badge>
              )}
              {company.is_verified && (
                <Badge className="bg-green-50 text-green-600 border-green-100 text-xs font-medium gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {t('jobs.verified')}
                </Badge>
              )}
            </div>
            {company.industry && (
              <p className="text-sm text-slate-500 mt-0.5">
                {getTranslatedIndustry(company.industry)}
              </p>
            )}
          </div>
        </div>

        {company.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mb-4 leading-relaxed">
            {company.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-4">
          {company.city && (
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
              <MapPin className="w-3.5 h-3.5" />
              {company.city.name}
            </span>
          )}
          {company.size && (
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg text-xs sm:text-sm">
              <Users className="w-3.5 h-3.5" />
              {company.size}
            </span>
          )}
        </div>

        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <Badge className="bg-blue-50 text-blue-700 border-0 font-medium text-xs sm:text-sm">
            <Briefcase className="w-3.5 h-3.5 mr-1.5" />
            {t('companiesPage.offers', { count: company.activeJobsCount || 0 })}
          </Badge>

          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {t('companyDetail.followers', { count: followersCount })}
            </span>

            {user && user.id !== company.owner_id && (
              <button
                onClick={handleToggleFollow}
                disabled={loadingFollow}
                className={`p-1.5 rounded-lg transition-colors ${
                  isFollowing
                    ? 'text-blue-600 hover:bg-blue-50'
                    : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                }`}
                title={isFollowing ? t('companyDetail.unfollow') : t('companyDetail.follow')}
              >
                {loadingFollow ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isFollowing ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </button>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

// ---------- Page principale ----------
const CompaniesPage = () => {
  const { t, i18n } = useTranslation();
  const { user, isCompany, profile, signOut } = useAuth();
  const { prefs } = usePreferencesContext();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [usedIndustryRaw, setUsedIndustryRaw] = useState([]);

  useEffect(() => {
    const fetchUsedIndustries = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('industry')
        .eq('is_active', true)
        .eq('is_verified', true)
        .eq('is_test', false) // ✅ exclure les entreprises de test
        .not('industry', 'is', null);
      if (!error && data) {
        const raw = [...new Set(data.map(c => c.industry).filter(Boolean))].sort();
        setUsedIndustryRaw(raw);
      }
    };
    fetchUsedIndustries();
  }, []);

  const availableIndustries = useMemo(() => {
    if (usedIndustryRaw.length === 0) return [];
    const frenchT = i18n.getFixedT('fr');
    const frenchIndustries = frenchT('createCompany.industries', { returnObjects: true }) || [];
    const currentIndustries = t('createCompany.industries', { returnObjects: true }) || [];
    return usedIndustryRaw
      .map(rawIndustry => {
        const index = frenchIndustries.indexOf(rawIndustry);
        if (index !== -1 && index < currentIndustries.length) {
          return currentIndustries[index];
        }
        return rawIndustry;
      })
      .sort();
  }, [usedIndustryRaw, i18n, t]);

  useEffect(() => {
    if (profile && (!profile.is_active || profile.is_banned)) {
      signOut();
      navigate('/connexion?reason=suspended', { replace: true });
    }
  }, [profile, signOut, navigate]);

  useEffect(() => {
    fetchCompanies();
  }, [searchQuery, selectedIndustry, prefs.country]);

 const fetchCompanies = async () => {
  setLoading(true);
  try {
    let countryId = null;
    if (prefs.country) {
      const { data: country } = await supabase
        .from('countries')
        .select('id')
        .eq('code', prefs.country)
        .single();
      countryId = country?.id || null;
    }

    let query = supabase
      .from('companies')
      .select(`*, city:cities(name)`)
      .eq('is_active', true)
      .eq('is_verified', true)
      .eq('is_test', false)
      .order('name'); // on triera nous-mêmes après

    if (countryId) query = query.eq('country_id', countryId);
    if (searchQuery) query = query.ilike('name', `%${searchQuery}%`);
    if (selectedIndustry) {
      const currentIndustries = t('createCompany.industries', { returnObjects: true }) || [];
      const frenchIndustries = i18n.getFixedT('fr')('createCompany.industries', { returnObjects: true }) || [];
      const idx = currentIndustries.indexOf(selectedIndustry);
      if (idx !== -1 && idx < frenchIndustries.length) {
        query = query.eq('industry', frenchIndustries[idx]);
      } else {
        query = query.eq('industry', selectedIndustry);
      }
    }

    const { data, error } = await query.limit(50); // on augmente un peu la limite pour le tri
    if (error) throw error;

    if (data && data.length > 0) {
      const companyIds = data.map(c => c.id);
      const now = new Date().toISOString();
      const { data: activeJobs } = await supabase
        .from('jobs')
        .select('company_id')
        .in('company_id', companyIds)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gte.${now}`);

      const countMap = {};
      (activeJobs || []).forEach(row => {
        countMap[row.company_id] = (countMap[row.company_id] || 0) + 1;
      });

      // Enrichissement avec le nombre d'offres
      let enriched = data.map(company => ({
        ...company,
        activeJobsCount: countMap[company.id] || 0,
      }));

      // Tri personnalisé
      const planPriority = {
        'business': 3,
        'enterprise': 3,
        'pro': 2,
        'free': 1,
      };

      enriched.sort((a, b) => {
        // Priorité plan (décroissant)
        const planA = planPriority[a.subscription_plan] || 0;
        const planB = planPriority[b.subscription_plan] || 0;
        if (planA !== planB) return planB - planA;

        // Priorité nombre d'offres (décroissant)
        if (a.activeJobsCount !== b.activeJobsCount) {
          return b.activeJobsCount - a.activeJobsCount;
        }

        // Ordre alphabétique
        return a.name.localeCompare(b.name);
      });

      setCompanies(enriched);
    } else {
      setCompanies([]);
    }
  } catch (error) {
    console.error('Error fetching companies:', error);
  } finally {
    setLoading(false);
  }
};

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedIndustry('');
  };

  if (profile && (!profile.is_active || profile.is_banned)) {
    return (
      <div className="min-h-screen pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            {t('companiesPage.title')}
          </h1>
          <p className="text-lg text-white/70 max-w-2xl">
            {t('companiesPage.subtitle')}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('companiesPage.searchPlaceholder')}
                className="pl-12 h-12 bg-white text-slate-900 placeholder:text-slate-400 border-0 focus:ring-2 focus:ring-blue-500 rounded-xl"
              />
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="h-12 pl-4 pr-10 bg-white text-slate-900 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[180px] sm:min-w-[200px] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22%23475569%22%3E%3Cpath%20fill-rule%3D%22evenodd%22%20d%3D%22M5.23%207.21a.75.75%200%20011.06.02L10%2011.168l3.71-3.938a.75.75%200%20111.08%201.04l-4.25%204.5a.75.75%200%2001-1.08%200l-4.25-4.5a.75.75%200%2001.02-1.06z%22%20clip-rule%3D%22evenodd%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat"
            >
              <option value="">{t('companiesPage.allIndustries')}</option>
              {availableIndustries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
            {(searchQuery || selectedIndustry) && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="h-12 border-white/20 text-white hover:bg-white/10">
                <FilterX className="w-4 h-4 mr-2" /> {t('common.clear')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('companiesPage.noCompanies.title')}</h2>
            <p className="text-slate-500 max-w-md mx-auto">{t('companiesPage.noCompanies.hint')}</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <CompanyCard key={company.id} company={company} user={user} />
            ))}
          </div>
        )}

        {!isCompany && (
          <div className="mt-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 sm:p-14 text-white text-center shadow-2xl shadow-blue-200/50">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{t('companiesPage.cta.title')}</h2>
            <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
              {t('companiesPage.cta.subtitle')}
            </p>
            <Link to="/inscription?type=entreprise">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-8 py-6 text-base rounded-2xl shadow-lg">
                {t('companiesPage.cta.button')}
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesPage;