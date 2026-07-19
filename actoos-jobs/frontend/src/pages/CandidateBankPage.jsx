import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Search, MapPin, Briefcase, Clock, Filter, ChevronLeft, ChevronRight,
  Crown, Download, DollarSign, BookOpen, X, Phone, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

const PAGE_SIZE = 12;

// ---------- Taux de change vers le FCFA ----------
const RATES = {
  XOF: 1, EUR: 655.957, USD: 603.5, MAD: 60.5,
  GBP: 754.2, BRL: 115.3, ARS: 0.72, NGN: 0.4, ZAR: 32.5,
  SAR: 160.9, AED: 164.3, EGP: 19.5, DZD: 4.48, TND: 194.5,
  CHF: 722.3, XAF: 1, GNF: 0.07, CDF: 0.22, MGA: 0.15
};

// ---------- Mapping devise → nom lisible ----------
const currencyNames = {
  XOF: 'FCFA',
  EUR: 'Euro',
  USD: 'Dollar américain',
  MAD: 'Dirham marocain',
  GBP: 'Livre sterling',
  BRL: 'Real brésilien',
  ARS: 'Peso argentin',
  NGN: 'Naira',
  ZAR: 'Rand',
  SAR: 'Riyal saoudien',
  AED: 'Dirham des Émirats',
  EGP: 'Livre égyptienne',
  DZD: 'Dinar algérien',
  TND: 'Dinar tunisien',
  CHF: 'Franc suisse',
  XAF: 'FCFA',
  GNF: 'Franc guinéen',
  CDF: 'Franc congolais',
  MGA: 'Ariary',
};

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

const CandidateBankPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const { prefs } = usePreferencesContext();
  const { format } = useCurrencyFormatter();

  const currentCurrencyLabel = currencyNames[prefs.currency] || prefs.currency;

  const toXOF = (amount) => {
    const num = parseInt(amount);
    if (isNaN(num)) return null;
    const rate = RATES[prefs.currency] || 1;
    return Math.round(num * rate);
  };

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  const [companyPlan, setCompanyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [expLevelFilter, setExpLevelFilter] = useState('');
  const [salaryMinFilter, setSalaryMinFilter] = useState('');
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('updated_at');

  const [availableCities, setAvailableCities] = useState([]);
  const [availableExperienceLevels, setAvailableExperienceLevels] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  const controllerRef = useRef(null);

  // Récupération du plan
  useEffect(() => {
    if (!activeCompanyId) {
      setCompanyPlan('free');
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    supabase
      .from('companies')
      .select('subscription_plan')
      .eq('id', activeCompanyId)
      .single()
      .then(({ data }) => {
        setCompanyPlan(data?.subscription_plan || 'free');
        setPlanLoading(false);
      })
      .catch(() => {
        setCompanyPlan('free');
        setPlanLoading(false);
      });
  }, [activeCompanyId]);

  // Chargement dynamique des options de filtres (villes et niveaux)
  useEffect(() => {
    if (companyPlan !== 'business') return;

    const fetchFilterOptions = async () => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('candidate_profiles')
          .select('user_id, experience_level')
          .not('user_id', 'is', null);
        if (profileError) throw profileError;

        const userIds = profileData.map(p => p.user_id).filter(Boolean);

        // Villes : compter les occurrences
        const cityCountMap = {};
        if (userIds.length > 0) {
          const { data: userData } = await supabase
            .from('users')
            .select('city_id')
            .in('id', userIds)
            .not('city_id', 'is', null);
          (userData || []).forEach(u => {
            cityCountMap[u.city_id] = (cityCountMap[u.city_id] || 0) + 1;
          });
        }

        const cityEntries = Object.entries(cityCountMap);
        if (cityEntries.length > 0) {
          const cityIds = cityEntries.map(([id]) => id);
          const { data: cities } = await supabase
            .from('cities')
            .select('id, name')
            .in('id', cityIds)
            .order('name');
          const cityMap = new Map(cities.map(c => [c.id, c.name]));
          const sortedCities = cityEntries
            .map(([id, count]) => ({ id, name: cityMap.get(id) || id, count }))
            .sort((a, b) => b.count - a.count);
          setAvailableCities(sortedCities);
        } else {
          setAvailableCities([]);
        }

        // Niveaux d'expérience : tri par fréquence
        const levelCountMap = {};
        profileData.forEach(p => {
          if (p.experience_level) {
            levelCountMap[p.experience_level] = (levelCountMap[p.experience_level] || 0) + 1;
          }
        });
        const sortedLevels = Object.entries(levelCountMap)
          .sort((a, b) => b[1] - a[1])
          .map(([level]) => level);
        setAvailableExperienceLevels(sortedLevels);
      } catch (err) {
        console.error('Erreur chargement options filtres:', err);
        setAvailableCities([]);
        setAvailableExperienceLevels([]);
      }
    };

    fetchFilterOptions();
  }, [companyPlan]);

  const fetchCandidates = useCallback(async () => {
    if (!user || companyPlan !== 'business') return;

    // Annuler la précédente requête
    if (controllerRef.current) controllerRef.current.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setFetchError(null);

    try {
      const params = new URLSearchParams({
        user_id: user.id,
        subscription_plan: companyPlan,
        search,
        city_id: cityFilter,
        experience_level: expLevelFilter,
        is_available_only: isAvailableOnly,
        sort_by: sortBy,
        page,
        page_size: PAGE_SIZE,
      });
      const xof = toXOF(salaryMinFilter);
      if (xof !== null) params.append('salary_min', xof);

      const response = await fetch(`${BASE_URL}/api/candidates/bank?${params}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Erreur ${response.status}`);
      }

      const data = await response.json();
      if (controller.signal.aborted) return;

      setCandidates(data.candidates);
      setTotalCount(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setFetchError(err.message);
      setCandidates([]);
      setTotalCount(0);
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  }, [user, companyPlan, search, cityFilter, expLevelFilter, salaryMinFilter, isAvailableOnly, sortBy, page]);

  // Premier chargement
  useEffect(() => {
    if (!planLoading && companyPlan === 'business') fetchCandidates();
  }, [planLoading, companyPlan, fetchCandidates]);

  // Debounce sur les filtres
  useEffect(() => {
    if (!planLoading && companyPlan === 'business') {
      const timer = setTimeout(fetchCandidates, 300);
      return () => clearTimeout(timer);
    }
  }, [search, cityFilter, expLevelFilter, salaryMinFilter, isAvailableOnly, sortBy, page, fetchCandidates]);

  // Nettoyage
  useEffect(() => {
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, []);

  const clearFilters = () => {
    setSearch('');
    setCityFilter('');
    setExpLevelFilter('');
    setSalaryMinFilter('');
    setIsAvailableOnly(false);
    setSortBy('updated_at');
    setPage(1);
  };

  if (planLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (companyPlan !== 'business') {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{t('candidateBank.upgradeTitle')}</h1>
          <p className="text-slate-600 mb-8">{t('candidateBank.upgradeDesc')}</p>
          <Link to="/tarifs"><Button className="bg-amber-600 hover:bg-amber-700 text-white">{t('candidateBank.viewPlans')}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* En-tête */}
        <div className="mb-8">
          <Link to="/dashboard/entreprise" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors mb-4">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('applicationDetail.back')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                {t('candidateBank.title')}
              </h1>
              <p className="text-slate-600 mt-1 text-lg">{t('candidateBank.subtitle')}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="w-full sm:w-auto lg:hidden border-slate-300 hover:bg-slate-100 text-slate-700 font-medium rounded-xl"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? t('common.hideFilters') : t('common.showFilters')}
            </Button>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('candidateBank.searchPlaceholder')}
            className="pl-12 w-full h-14 text-base border-slate-200 rounded-2xl shadow-sm focus:shadow-md transition-shadow"
          />
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Filtres */}
          <div className={`lg:w-72 lg:shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white backdrop-blur-sm bg-opacity-95 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 mb-6 lg:mb-0">
              <div className="flex justify-between items-center mb-5 lg:hidden">
                <h2 className="font-semibold text-slate-900 text-lg">{t('common.filters')}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-5">
                {/* Ville */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">{t('common.city')}</label>
                  <select
                    value={cityFilter}
                    onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">{t('common.all')}</option>
                    {availableCities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>

                {/* Niveau d'expérience */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">{t('common.experienceLevel')}</label>
                  <select
                    value={expLevelFilter}
                    onChange={(e) => { setExpLevelFilter(e.target.value); setPage(1); }}
                    className="w-full h-11 border border-slate-200 rounded-xl px-3 text-slate-700 bg-slate-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  >
                    <option value="">{t('common.all')}</option>
                    {availableExperienceLevels.map(level => (
                      <option key={level} value={level}>{t(`experienceLevels.${level}`)}</option>
                    ))}
                  </select>
                </div>

                {/* Salaire min */}
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-2">{t('common.minSalary')}</label>
                  <Input
                    type="number"
                    value={salaryMinFilter}
                    onChange={(e) => { setSalaryMinFilter(e.target.value); setPage(1); }}
                    placeholder={currentCurrencyLabel}
                    className="h-11 rounded-xl bg-slate-50/50 border-slate-200"
                  />
                </div>

                {/* Disponibles uniquement */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="available"
                    checked={isAvailableOnly}
                    onChange={(e) => { setIsAvailableOnly(e.target.checked); setPage(1); }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <label htmlFor="available" className="text-sm text-slate-700 font-medium">{t('common.availableOnly')}</label>
                </div>

                <Button variant="ghost" onClick={clearFilters} size="sm" className="w-full justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                  <X className="w-4 h-4 mr-1" /> {t('common.clearFilters')}
                </Button>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-slate-500 font-medium">
                {totalCount} {t('candidateBank.candidatesFound')}
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-11 border border-slate-200 rounded-xl px-3 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="updated_at">{t('common.sortByRecent')}</option>
                <option value="name">{t('common.sortByName')}</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
              </div>
            ) : fetchError ? (
              <div className="text-center py-20">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <p className="text-red-600 font-medium mb-2">{t('common.error')}</p>
                <p className="text-slate-500 text-sm">{fetchError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={fetchCandidates}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> {t('common.retry', 'Réessayer')}
                </Button>
              </div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-20">
                <Briefcase className="w-20 h-20 text-slate-300 mx-auto mb-5" />
                <p className="text-slate-600 text-xl font-medium">{t('candidateBank.noCandidates')}</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {candidates.map(c => {
                    const fullName = `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim();
                    const lastExperience = c.experience?.length > 0 ? c.experience[0] : null;
                    const lastEducation = c.education?.length > 0 ? c.education[0] : null;
                    const phone = c.user?.phone;
                    const telLink = phone ? `tel:${phone.replace(/\s/g, '')}` : null;

                    return (
                      <Link
                        key={c.user_id}
                        to={`/candidat/${c.user_id}?from=cv-bank`}
                        className="block group min-w-0"
                      >
                        <Card className="hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden bg-white/90 backdrop-blur-sm border border-slate-200/70 rounded-3xl shadow-md shadow-slate-200/50">
                          <CardContent className="p-6 flex-1 flex flex-col min-w-0">
                            <div className="flex items-start gap-4 mb-5 min-w-0">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                {c.user?.avatar_url ? (
                                  <img src={c.user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <Briefcase className="w-7 h-7 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-blue-600 transition-colors">
                                  {fullName}
                                </h3>
                                {c.title && <p className="text-sm text-slate-500 truncate mt-1">{c.title}</p>}
                                {c.city && (
                                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2 min-w-0">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{c.city.name}</span>
                                  </div>
                                )}
                                {phone && (
                                  <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1 min-w-0">
                                    <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    {telLink ? (
                                      <a
                                        href={telLink}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 hover:underline font-mono text-xs truncate"
                                      >
                                        {phone}
                                      </a>
                                    ) : (
                                      <span className="text-slate-600 text-xs font-mono truncate">{phone}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {c.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-5">
                                {c.skills.slice(0, 5).map(skill => (
                                  <Badge key={skill} variant="secondary" className="text-xs bg-slate-100 text-slate-700 border-slate-200/60 px-2.5 py-1 rounded-lg">
                                    {skill}
                                  </Badge>
                                ))}
                                {c.skills.length > 5 && (
                                  <Badge variant="outline" className="text-xs border-slate-300 text-slate-500 rounded-lg">
                                    +{c.skills.length - 5}
                                  </Badge>
                                )}
                              </div>
                            )}

                            <div className="text-sm text-slate-600 space-y-3 mt-auto min-w-0">
                              {lastExperience && (
                                <div className="flex items-center gap-3 min-w-0">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="truncate font-medium">{lastExperience.title} – <span className="text-slate-500">{lastExperience.company}</span></div>
                                </div>
                              )}
                              {lastEducation && (
                                <div className="flex items-center gap-3 min-w-0">
                                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="truncate font-medium">{lastEducation.title} – <span className="text-slate-500">{lastEducation.school || lastEducation.institution}</span></div>
                                </div>
                              )}
                              {(c.desired_salary_min || c.desired_salary_max) && (
                                <div className="flex items-center gap-3 min-w-0">
                                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                                  <div className="truncate font-semibold text-slate-800">
                                    {c.desired_salary_min && c.desired_salary_max
                                      ? `${format(c.desired_salary_min)} – ${format(c.desired_salary_max)}`
                                      : c.desired_salary_min
                                        ? format(c.desired_salary_min)
                                        : format(c.desired_salary_max)}
                                  </div>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-5 pt-5 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                {c.is_available ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs px-3 py-1 rounded-lg">
                                    {t('common.available')}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs px-3 py-1 rounded-lg">
                                    {t('common.unavailable')}
                                  </Badge>
                                )}
                                {c.experience_level && (
                                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-3 py-1 rounded-lg">
                                    {t(`experienceLevels.${c.experience_level}`)}
                                  </Badge>
                                )}
                              </div>
                              {c.cv_url && (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    window.open(c.cv_url, '_blank', 'noopener,noreferrer');
                                  }}
                                  onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); window.open(c.cv_url, '_blank', 'noopener,noreferrer'); } }}
                                  className="text-blue-600 hover:text-blue-700 cursor-pointer shrink-0 bg-blue-50 hover:bg-blue-100 p-2 rounded-xl transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-3 mt-10">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                      className="h-11 w-11 rounded-xl border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium text-slate-600 px-2">
                      {page} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage(p => p + 1)}
                      className="h-11 w-11 rounded-xl border-slate-200 hover:bg-slate-100 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateBankPage;