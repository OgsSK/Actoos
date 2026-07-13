import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Search, MapPin, Briefcase, Clock, Filter, ChevronLeft, ChevronRight,
  Crown, Download, DollarSign, BookOpen, X, Phone
} from 'lucide-react';
import { toast } from 'sonner';

const EXPERIENCE_LEVELS = ['junior', 'intermediaire', 'senior', 'expert'];
const CONTRACT_TYPES = ['cdi', 'cdd', 'freelance', 'stage', 'interim', 'remote'];
const PAGE_SIZE = 12;

const CandidateBankPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  const [companyPlan, setCompanyPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [expLevelFilter, setExpLevelFilter] = useState('');
  const [contractFilter, setContractFilter] = useState('');
  const [salaryMinFilter, setSalaryMinFilter] = useState('');
  const [isAvailableOnly, setIsAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('updated_at');

  const [cities, setCities] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // Chargement des villes
  useEffect(() => {
    supabase.from('cities').select('id, name').order('name').then(({ data }) => {
      if (data) setCities(data);
    });
  }, []);

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

  const fetchCandidates = useCallback(async () => {
    if (!user || companyPlan !== 'business') return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        user_id: user.id,
        subscription_plan: companyPlan,
        search,
        city_id: cityFilter,
        experience_level: expLevelFilter,
        contract_type: contractFilter,
        is_available_only: isAvailableOnly,
        sort_by: sortBy,
        page,
        page_size: PAGE_SIZE,
      });
      if (salaryMinFilter && salaryMinFilter.trim() !== '') {
        params.append('salary_min', salaryMinFilter);
      }

      const res = await apiFetch(`/api/candidates/bank?${params.toString()}`);
      setCandidates(res.candidates);
      setTotalCount(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [user, companyPlan, search, cityFilter, expLevelFilter, contractFilter, salaryMinFilter, isAvailableOnly, sortBy, page, t]);

  useEffect(() => {
    if (!planLoading && companyPlan) {
      fetchCandidates();
    }
  }, [fetchCandidates, planLoading, companyPlan]);

  const clearFilters = () => {
    setSearch('');
    setCityFilter('');
    setExpLevelFilter('');
    setContractFilter('');
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
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* En-tête */}
        <div className="mb-6">
          <Link to="/dashboard/entreprise" className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-4 min-h-[44px]">
            <ChevronLeft className="w-4 h-4 mr-1" />
            {t('applicationDetail.back')}
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('candidateBank.title')}</h1>
              <p className="text-slate-600 mt-1">{t('candidateBank.subtitle')}</p>
            </div>
            {/* Bouton pour mobile (toggle des filtres) */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto lg:hidden min-h-[44px]">
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? t('common.hideFilters') : t('common.showFilters')}
            </Button>
          </div>
        </div>

        {/* Barre de recherche (toujours visible) */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('candidateBank.searchPlaceholder')}
            className="pl-10 w-full"
          />
        </div>

        <div className="lg:flex lg:gap-6">
          {/* Filtres : version mobile (toggle) et version desktop (colonne latérale) */}
          <div className={`lg:w-64 lg:shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 mb-6 lg:mb-0">
              <div className="flex justify-between items-center mb-4 lg:hidden">
                <h2 className="font-semibold text-slate-900">{t('common.filters')}</h2>
                <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}><X className="w-4 h-4" /></Button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.city')}</label>
                  <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }} className="w-full h-10 border border-slate-200 rounded-lg px-3">
                    <option value="">{t('common.all')}</option>
                    {cities.map(city => (
                      <option key={city.id} value={city.id}>{city.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.experienceLevel')}</label>
                  <select value={expLevelFilter} onChange={(e) => { setExpLevelFilter(e.target.value); setPage(1); }} className="w-full h-10 border border-slate-200 rounded-lg px-3">
                    <option value="">{t('common.all')}</option>
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>{t(`experienceLevels.${level}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.contractType')}</label>
                  <select value={contractFilter} onChange={(e) => { setContractFilter(e.target.value); setPage(1); }} className="w-full h-10 border border-slate-200 rounded-lg px-3">
                    <option value="">{t('common.all')}</option>
                    {CONTRACT_TYPES.map(ct => (
                      <option key={ct} value={ct}>{t(`contractTypes.${ct}`)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('common.minSalary')}</label>
                  <Input type="number" value={salaryMinFilter} onChange={(e) => { setSalaryMinFilter(e.target.value); setPage(1); }} placeholder="FCFA" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="available" checked={isAvailableOnly} onChange={(e) => { setIsAvailableOnly(e.target.checked); setPage(1); }} />
                  <label htmlFor="available" className="text-sm text-slate-700">{t('common.availableOnly')}</label>
                </div>
                <Button variant="ghost" onClick={clearFilters} size="sm" className="w-full min-h-[44px]">
                  <X className="w-4 h-4 mr-1" /> {t('common.clearFilters')}
                </Button>
              </div>
            </div>
          </div>

          {/* Résultats */}
          <div className="flex-1 min-w-0">
            {/* Tri et compteur */}
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-slate-500">{totalCount} {t('candidateBank.candidatesFound')}</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-10 border border-slate-200 rounded-lg px-3 text-sm">
                <option value="updated_at">{t('common.sortByRecent')}</option>
                <option value="name">{t('common.sortByName')}</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
            ) : candidates.length === 0 ? (
              <div className="text-center py-16">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 text-lg">{t('candidateBank.noCandidates')}</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {candidates.map(c => {
                    const fullName = `${c.user?.first_name || ''} ${c.user?.last_name || ''}`.trim();
                    const lastExperience = c.experience?.length > 0 ? c.experience[0] : null;
                    const lastEducation = c.education?.length > 0 ? c.education[0] : null;
                    const phone = c.user?.phone;
                    const telLink = phone ? `tel:${phone.replace(/\s/g, '')}` : null;

                    return (
                      <Link key={c.user_id} to={`/candidat/${c.user_id}?from=cv-bank`} className="block group">
                        <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
                          <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                                {c.user?.avatar_url ? (
                                  <img src={c.user.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                                ) : (
                                  <Briefcase className="w-6 h-6 text-blue-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-slate-900 truncate group-hover:text-blue-600">{fullName}</h3>
                                {c.title && <p className="text-sm text-slate-500 truncate">{c.title}</p>}
                                {c.city && (
                                  <span className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                    <MapPin className="w-3 h-3" />{c.city.name}
                                  </span>
                                )}
                                {phone && (
                                  <span className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                                    <Phone className="w-3 h-3" />
                                    {telLink ? (
                                      <a
                                        href={telLink}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-blue-600 hover:underline font-mono text-xs"
                                      >
                                        {phone}
                                      </a>
                                    ) : (
                                      <span className="text-slate-600 text-xs font-mono">{phone}</span>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            {c.skills?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {c.skills.slice(0, 5).map(skill => (
                                  <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                                ))}
                                {c.skills.length > 5 && (
                                  <Badge variant="outline" className="text-xs">+{c.skills.length - 5}</Badge>
                                )}
                              </div>
                            )}

                            <div className="text-sm text-slate-600 space-y-2 mt-auto">
                              {lastExperience && (
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">{lastExperience.title} – {lastExperience.company}</span>
                                </div>
                              )}
                              {lastEducation && (
                                <div className="flex items-center gap-2">
                                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">{lastEducation.title} – {lastEducation.school || lastEducation.institution}</span>
                                </div>
                              )}
                              {c.desired_salary_min || c.desired_salary_max ? (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                                  <span className="truncate">
                                    {c.desired_salary_min ? `${c.desired_salary_min.toLocaleString()} FCFA` : ''}
                                    {c.desired_salary_min && c.desired_salary_max ? ' – ' : ''}
                                    {c.desired_salary_max ? `${c.desired_salary_max.toLocaleString()} FCFA` : ''}
                                  </span>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                {c.is_available ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">{t('common.available')}</Badge>
                                ) : (
                                  <Badge className="bg-slate-100 text-slate-500 text-xs">{t('common.unavailable')}</Badge>
                                )}
                                {c.experience_level && (
                                  <Badge className="bg-blue-50 text-blue-700 text-xs">{t(`experienceLevels.${c.experience_level}`)}</Badge>
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
                                  className="text-blue-600 hover:text-blue-700 cursor-pointer"
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
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="min-h-[44px] min-w-[44px]">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-slate-600 px-2">
                      {page} / {totalPages}
                    </span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="min-h-[44px] min-w-[44px]">
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