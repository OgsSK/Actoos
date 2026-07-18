import React, { useState, useEffect } from 'react';
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
  Bell, ExternalLink, Clock, UserMinus
} from 'lucide-react';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';
import { toast } from 'sonner';

const FollowedCompaniesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { format } = useCurrencyFormatter();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFollowed = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: follows, error: followErr } = await supabase
        .from('company_followers')
        .select('company_id')
        .eq('user_id', user.id);

      if (followErr) throw followErr;
      if (!follows || follows.length === 0) {
        setCompanies([]);
        setLoading(false);
        return;
      }

      const companyIds = follows.map(f => f.company_id);

      const { data: companiesData, error: compErr } = await supabase
        .from('companies')
        .select('id, name, logo_url, industry, subscription_plan, followers_count')
        .in('id', companyIds);

      if (compErr) throw compErr;

      const enriched = await Promise.all(
        (companiesData || []).map(async (company) => {
          const { data: jobs } = await supabase
            .from('jobs')
            .select('id, title, contract_type, salary_min, salary_max, created_at')
            .eq('company_id', company.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(3);
          return { ...company, recent_jobs: jobs || [] };
        })
      );

      setCompanies(enriched);
    } catch (err) {
      console.error('Erreur chargement des suivis :', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowed();
  }, [user]);

  const handleUnfollow = async (companyId) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/companies/${companyId}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('companyDetail.unfollowSuccess', 'Vous ne suivez plus cette entreprise.'));
        // Retirer l'entreprise de la liste locale
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
          {t('common.back', 'Retour')}
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
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
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
              <Card key={company.id} className="border-slate-200 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" />
                      ) : (
                        <Building2 className="w-7 h-7 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Link to={`/entreprises/${company.id}`} className="font-semibold text-slate-900 hover:text-blue-600 text-lg">
                          {company.name}
                        </Link>
                        {/* Bouton de désabonnement */}
                        <button
                          onClick={() => handleUnfollow(company.id)}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                          title={t('companyDetail.unfollow', 'Ne plus suivre')}
                        >
                          <UserMinus className="w-5 h-5" />
                        </button>
                      </div>
                      {company.industry && <p className="text-sm text-slate-500 mt-1">{company.industry}</p>}
                      <p className="text-xs text-slate-400 mt-1">
                        {t('companyDetail.followers', { count: company.followers_count || 0 })}
                      </p>
                    </div>
                    {company.subscription_plan === 'pro' && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 shrink-0">{t('common.pro', 'Pro')}</Badge>
                    )}
                    {company.subscription_plan === 'business' && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 shrink-0">⭐ {t('common.premium')}</Badge>
                    )}
                  </div>

                  {company.recent_jobs.length > 0 ? (
                    <div className="border-t border-slate-100 pt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        {t('followedCompanies.recentJobs', 'Offres récentes')}
                      </h4>
                      <div className="space-y-2">
                        {company.recent_jobs.map(job => {
                          const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
                          return (
                            <Link key={job.id} to={`/emplois/${job.id}`}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 text-sm truncate">{job.title}</p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                  <Badge className={`${contractInfo.color} border-0 text-xs`}>{t(contractInfo.key)}</Badge>
                                  {job.salary_min && job.salary_max && (
                                    <span className="flex items-center gap-1">
                                      <Banknote className="w-3 h-3" />{format(job.salary_min)} – {format(job.salary_max)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0 ml-3">
                                <Clock className="w-3 h-3" />{formatRelative(job.created_at)}
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