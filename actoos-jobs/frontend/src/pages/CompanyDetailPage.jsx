import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';

import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import ReportButton from '../components/ReportButton';

import {
  Loader2,
  MapPin,
  Globe,
  Mail,
  Users,
  ChevronLeft,
  Building2,
  Briefcase,
  Clock,
  Banknote,
  AlertTriangle,
} from 'lucide-react';

import { toast } from 'sonner';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';

const CompanyDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { format } = useCurrencyFormatter();

  const [company, setCompany] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select(`
            *,
            city:cities(name),
            owner:users!owner_id(is_banned)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        setCompany(data);

        // Vérifier si l'entreprise est inactive ou si le propriétaire est banni
        if (!data.is_active || (data.owner && data.owner.is_banned)) {
          setSuspended(true);
        }
      } catch (err) {
        console.error(err);
        toast.error(t('companyDetail.notFound'));
      } finally {
        setLoading(false);
      }
    };

    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id,
            title,
            contract_type,
            salary_min,
            salary_max,
            created_at,
            city:cities(name)
          `)
          .eq('company_id', id)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchCompany();
    fetchJobs();
  }, [id, t]);

  const isOwner = user?.id && company?.owner_id === user.id;

  if (loading) {
    return (
      <div className="pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="pt-20 text-center text-slate-500">
        {t('companyDetail.notFoundMessage')}
      </div>
    );
  }

  if (suspended) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20">
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {t('companyDetail.suspendedTitle')}
          </h1>
          <p className="text-slate-600">
            {t('companyDetail.suspendedDescription')}
          </p>
          <Link to="/entreprises">
            <Button variant="outline" className="mt-6">
              {t('companyDetail.backToCompanies')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/entreprises">
          <Button variant="ghost" className="mb-6">
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t('companyDetail.back')}
          </Button>
        </Link>

        <Card className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6 mb-8">
              <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center shrink-0">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name}
                    className="w-20 h-20 object-contain"
                  />
                ) : (
                  <Building2 className="w-12 h-12 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-slate-900 break-words">
                  {company.name}
                  {company.subscription_plan === 'pro' && (
                    <Badge className="ml-3 bg-blue-100 text-blue-700 border-blue-200">
                      Pro
                    </Badge>
                  )}
                  {company.subscription_plan === 'business' && (
                    <Badge className="ml-3 bg-purple-100 text-purple-700 border-purple-200">
                      ⭐ {t('common.premium')}
                    </Badge>
                  )}
                </h1>

                {company.industry && (
                  <Badge className="mt-3">{company.industry}</Badge>
                )}

                <div className="flex flex-wrap gap-4 mt-5 text-sm text-slate-600">
                  {company.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {company.city.name}
                    </span>
                  )}

                  {company.size && (
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {t('companyDetail.employees', { size: company.size })}
                    </span>
                  )}

                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Globe className="w-4 h-4" />
                      {t('companyDetail.website')}
                    </a>
                  )}

                  {company.email && (
                    <a
                      href={`mailto:${company.email}`}
                      className="flex items-center gap-1 text-blue-600 hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      {t('companyDetail.email')}
                    </a>
                  )}
                </div>

                <div className="mt-6">
                  {!isOwner && user && !isAdmin ? (
                    <ReportButton
                      itemType="company"
                      itemId={company.id}
                      reporterId={user.id}
                    />
                  ) : isOwner ? (
                    <Badge variant="outline" className="text-sm">
                      {t('companyDetail.yourCompany')}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>

            {company.description && (
              <div className="border-t border-slate-100 pt-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">
                  {t('companyDetail.about')}
                </h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-10">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">
            {t('companyDetail.jobs')}{jobs.length > 0 && ` (${jobs.length})`}
          </h2>

          {jobsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="border border-slate-200">
              <CardContent className="p-8 text-center text-slate-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                <p>{t('companyDetail.noJobs')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => {
                const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
                return (
                  <Link key={job.id} to={`/emplois/${job.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200">
                      <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-1">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
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
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatRelative(job.created_at)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyDetailPage;