import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Building2, MapPin, Users, Globe, Search, Briefcase, CheckCircle, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const CompaniesPage = () => {
  const { t } = useTranslation();
  const { isCompany, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [industries, setIndustries] = useState([]);

  // Vérification du statut du compte (suspension / bannissement)
  useEffect(() => {
    if (profile && (!profile.is_active || profile.is_banned)) {
      signOut();
      navigate('/connexion?reason=suspended', { replace: true });
    }
  }, [profile, signOut, navigate]);

  useEffect(() => {
    const fetchIndustries = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('industry')
        .eq('is_active', true)
        .not('industry', 'is', null);
      
      if (!error && data) {
        const unique = [...new Set(data.map(c => c.industry).filter(Boolean))].sort();
        setIndustries(unique);
      }
    };
    fetchIndustries();
  }, []);

  useEffect(() => {
    fetchCompanies();
  }, [searchQuery, selectedIndustry]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('companies')
        .select(`*, city:cities(name)`)
        .eq('is_active', true)
        .eq('is_verified', true)
        .order('subscription_plan', { ascending: false })
        .order('name');

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }
      if (selectedIndustry) {
        query = query.eq('industry', selectedIndustry);
      }

      const { data, error } = await query.limit(20);
      if (error) throw error;

      if (data && data.length > 0) {
        const companyIds = data.map(c => c.id);
        const { data: activeJobs } = await supabase
          .from('jobs')
          .select('company_id')
          .in('company_id', companyIds)
          .eq('status', 'active');

        const countMap = {};
        (activeJobs || []).forEach(row => {
          countMap[row.company_id] = (countMap[row.company_id] || 0) + 1;
        });

        const enriched = data.map(company => ({
          ...company,
          activeJobsCount: countMap[company.id] || 0,
        }));
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

  // Si l'utilisateur est restreint, on ne rend rien (la redirection est en cours)
  if (profile && (!profile.is_active || profile.is_banned)) {
    return (
      <div className="min-h-screen pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-slate-900 mb-4">
            {t('companiesPage.title')}
          </h1>
          <p className="text-slate-600 mb-8 max-w-2xl">
            {t('companiesPage.subtitle')}
          </p>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('companiesPage.searchPlaceholder')}
                className="pl-10"
              />
            </div>
            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="h-10 px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[200px]"
            >
              <option value="">{t('companiesPage.allIndustries')}</option>
              {industries.map(ind => (
                <option key={ind} value={ind}>{ind}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {t('companiesPage.noCompanies.title')}
            </h2>
            <p className="text-slate-600">
              {t('companiesPage.noCompanies.hint')}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {company.logo_url ? (
                        <img 
                          src={company.logo_url} 
                          alt={company.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">
                          {company.name}
                        </h3>
                        {company.subscription_plan === 'pro' && (
                          <Badge className="ml-2 bg-blue-100 text-blue-700 border-blue-200">
                            {t('common.pro', 'Pro')}
                          </Badge>
                        )}
                        {company.subscription_plan === 'business' && (
                          <Badge className="ml-2 bg-purple-100 text-purple-700 border-purple-200">
                            ⭐ {t('common.premium')}
                          </Badge>
                        )}
                        {company.is_verified && (
                          <CheckCircle className="w-4 h-4 text-blue-500 shrink-0" />
                        )}
                      </div>
                      {company.industry && (
                        <p className="text-sm text-slate-500">{company.industry}</p>
                      )}
                    </div>
                  </div>

                  {company.description && (
                    <p className="text-sm text-slate-600 mt-4 line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
                    {company.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {company.city.name}
                      </span>
                    )}
                    {company.size && (
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {company.size}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <Badge className="bg-blue-50 text-blue-700 border-0">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {t('companiesPage.offers', { count: company.activeJobsCount || 0 })}
                    </Badge>
                    <Link to={`/entreprises/${company.id}`}>
                      <Button variant="ghost" size="sm">
                        {t('companiesPage.viewProfile')}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isCompany && (
          <div className="mt-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 sm:p-12 text-white text-center">
            <h2 className="text-2xl font-bold mb-4">
              {t('companiesPage.cta.title')}
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              {t('companiesPage.cta.subtitle')}
            </p>
            <Link to="/inscription?type=entreprise">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
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