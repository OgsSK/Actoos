import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import {
  Loader2, Building2, Briefcase, MapPin, Banknote, ChevronLeft,
  Bell, ExternalLink, Clock, UserMinus, CheckCircle
} from 'lucide-react';
import { formatRelative, CONTRACT_TYPES, formatSalaryPeriod } from '../lib/utils';
import { toast } from 'sonner';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

// ✅ Skeleton pour une carte entreprise suivie
const FollowedCompanySkeleton = () => (
  <Card className="border-slate-200 overflow-hidden animate-pulse">
    <CardContent className="p-6">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-6 bg-slate-100 rounded w-2/3" />
          <div className="h-4 bg-slate-100 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
        </div>
      </div>
      <div className="border-t border-slate-50 pt-4 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="space-y-2">
          {[1, 2].map(i => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
);

const FollowedCompaniesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const controllerRef = useRef(null);

  const fetchFollowed = async () => {
    if (!user) return;

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setFetchError(null);
    try {
      // 1. Récupérer les entreprises suivies
      const { data: follows, error: followErr } = await supabase
        .from('company_followers')
        .select('company_id')
        .eq('user_id', user.id);

      if (followErr) throw followErr;
      if (!follows || follows.length === 0) {
        setCompanies([]);
        return;
      }

      const companyIds = follows.map(f => f.company_id);

      // 2. Récupérer les infos des entreprises
      const { data: companiesData, error: compErr } = await supabase
        .from('companies')
        .select('id, name, logo_url, industry, subscription_plan, followers_count')
        .in('id', companyIds);

      if (compErr) throw compErr;

      // 3. Récupérer les 3 dernières offres actives de TOUTES ces entreprises
      const now = new Date().toISOString();
      const { data: allJobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id, company_id, title, contract_type, salary_min, salary_max, salary_period, created_at')
        .in('company_id', companyIds)
        .eq('status', 'active')
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order('created_at', { ascending: false });

      if (jobsErr) throw jobsErr;

      // 4. Récupérer les statuts de candidature pour ces offres
      const jobIds = (allJobs || []).map(j => j.id);
      let applicationMap = {};
      if (user && jobIds.length > 0) {
        const { data: apps, error: appsErr } = await supabase
          .from('applications')
          .select('job_id, status')
          .eq('candidate_id', user.id)
          .in('job_id', jobIds);
        if (!appsErr && apps) {
          apps.forEach(app => { applicationMap[app.job_id] = app.status; });
        }
      }

      // Grouper les jobs par entreprise
      const jobsByCompany = {};
      (allJobs || []).forEach(job => {
        if (!jobsByCompany[job.company_id]) jobsByCompany[job.company_id] = [];
        if (jobsByCompany[job.company_id].length < 3) {
          jobsByCompany[job.company_id].push({
            ...job,
            applicationStatus: applicationMap[job.id] || null,
          });
        }
      });

      const enriched = (companiesData || []).map(company => ({
        ...company,
        recent_jobs: jobsByCompany[company.id] || [],
      }));

      setCompanies(enriched);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Erreur chargement des suivis :', err);
      setFetchError(err.message);
    } finally {
      if (controllerRef.current === controller) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowed();
    return () => {
      if (controllerRef.current) controllerRef.current.abort();
    };
  }, [user]);

  const handleUnfollow = async (companyId) => {
    if (!user) return;
    try {
      const res = await fetch(`${BASE_URL}/api/companies/${companyId}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('companyDetail.unfollowSuccess', 'Vous ne suivez plus cette entreprise.'));
        setCompanies(prev => prev.filter(c => c.id !== companyId));
      } else {
        toast.error(t('common.error'));
      }
    } catch (err) {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/dashboard/candidat"
          className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900 mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          {t('myApplications.back')}
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('followedCompanies.title', 'Mes suivis')}
            </h1>
            <p className="text-slate-600 mt-1">
              {t('followedCompanies.subtitle', 'Entreprises que vous suivez')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <FollowedCompanySkeleton key={i} />
            ))}
          </div>
        ) : fetchError ? (
          <Card className="border-red-200">
            <CardContent className="p-8 text-center">
              <p className="text-red-600 mb-4">{t('common.error')} : {fetchError}</p>
              <Button onClick={fetchFollowed}>{t('common.retry', 'Réessayer')}</Button>
            </CardContent>
          </Card>
        ) : companies.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {t('followedCompanies.empty', 'Aucune entreprise suivie')}
              </h2>
              <p className="text-slate-600 mb-6">
                {t('followedCompanies.emptyHint', 'Suivez des entreprises pour voir leurs offres ici.')}
              </p>
              <Link to="/entreprises">
                <Button>{t('followedCompanies.browseCompanies', 'Parcourir les entreprises')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {companies.map(company => (
              <Card key={company.id} className="border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-200">
                <CardContent className="p-6">
                  {/* En-tête de l'entreprise */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <Link
                          to={`/entreprises/${company.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors text-lg truncate"
                        >
                          {company.name}
                        </Link>
                        <button
                          onClick={() => handleUnfollow(company.id)}
                          className="flex-shrink-0 p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                          title={t('companyDetail.unfollow', 'Ne plus suivre')}
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                      {company.industry && <p className="text-sm text-slate-500 mt-1">{company.industry}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">
                          {t('companyDetail.followers', { count: company.followers_count || 0 })}
                        </span>
                        {company.subscription_plan === 'pro' && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{t('common.pro', 'Pro')}</Badge>
                        )}
                        {company.subscription_plan === 'business' && (
                          <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">⭐ {t('common.premium')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Offres récentes */}
                  {company.recent_jobs.length > 0 ? (
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        {t('followedCompanies.recentJobs', 'Offres récentes')}
                      </h4>
                      <div className="space-y-2">
                        {company.recent_jobs.map(job => {
                          const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
                          const isApplied = job.applicationStatus && job.applicationStatus !== 'rejected' && job.applicationStatus !== 'withdrawn';
                          return (
                            <Link
                              key={job.id}
                              to={`/emplois/${job.id}`}
                              className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors gap-2"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-slate-900 text-sm truncate">{job.title}</span>
                                  {isApplied && (
                                    <Badge className="bg-emerald-50 text-emerald-700 text-[10px] font-medium rounded-full border border-emerald-200 shadow-sm px-2 py-0.5 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      {t('jobs.alreadyAppliedBadge')}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                                  <Badge className={`${contractInfo.color} border-0 text-xs`}>{t(contractInfo.key)}</Badge>
                                  {job.salary_min && job.salary_max && (
                                    <span className="flex items-center gap-1 font-medium text-slate-700 whitespace-nowrap text-xs bg-blue-50 px-2 py-0.5 rounded-lg">
                                      <Banknote className="w-3 h-3 text-blue-600" />
                                      {format(job.salary_min)} – {format(job.salary_max)}
                                      <span className="text-[9px] text-slate-400 ml-0.5">
                                        {formatSalaryPeriod(job.salary_period, t)}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                                <Clock className="w-3 h-3" />
                                {formatRelative(job.created_at)}
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 border-t border-slate-100 pt-4">
                      {t('followedCompanies.noRecentJobs', 'Aucune offre récente pour cette entreprise.')}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowedCompaniesPage;