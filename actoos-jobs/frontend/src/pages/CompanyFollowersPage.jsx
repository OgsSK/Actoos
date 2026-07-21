import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Users, ChevronLeft, User, ExternalLink, Search
} from 'lucide-react';
import { formatRelative } from '../lib/utils';
import { toast } from 'sonner';
import ContactFollowerModal from '../components/ContactFollowerModal';

const CompanyFollowersPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company_id') || activeCompanyId;

  const [company, setCompany] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [companyPlan, setCompanyPlan] = useState('free');
  const [planLoading, setPlanLoading] = useState(true);

  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState(null);

  // Récupérer le plan de l'entreprise
  useEffect(() => {
    if (!companyId) {
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    supabase
      .from('companies')
      .select('subscription_plan')
      .eq('id', companyId)
      .single()
      .then(({ data }) => {
        setCompanyPlan(data?.subscription_plan || 'free');
        setPlanLoading(false);
      })
      .catch(() => {
        setCompanyPlan('free');
        setPlanLoading(false);
      });
  }, [companyId]);

  const isBusinessPlan = companyPlan === 'business' || companyPlan === 'enterprise';

  // Chargement des followers
  useEffect(() => {
    if (!companyId) return;
    if (planLoading) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: compData } = await supabase
          .from('companies')
          .select('id, name, followers_count')
          .eq('id', companyId)
          .single();
        setCompany(compData);

        const res = await apiFetch(
          `/api/companies/${companyId}/followers?user_id=${user.id}&subscription_plan=${companyPlan}`
        );
        setFollowers(res.followers || []);
        setTotal(res.total || 0);
      } catch (err) {
        console.error(err);
        toast.error(t('common.error'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId, user, companyPlan, planLoading]);

  if (planLoading || loading) {
    return (
      <div className="min-h-screen pt-20 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link
          to="/dashboard/entreprise"
          className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6"
          title={t('common.back', 'Retour')}
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('companyFollowers.title', 'Mes abonnés')}
            </h1>
            {company && (
              <p className="text-slate-600 mt-1">
                {company.name} — {t('companyFollowers.total', { total: company.followers_count || total })}
              </p>
            )}
          </div>
          {isBusinessPlan && (
            <Link to="/dashboard/entreprise/cv-bank">
              <Button variant="outline" size="sm">
                <Search className="w-4 h-4 mr-1" />
                {t('companyDashboard.cvBank.browse', 'CV Bank')}
              </Button>
            </Link>
          )}
        </div>

        {followers.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-8 text-center">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                {t('companyFollowers.empty', 'Aucun abonné pour le moment')}
              </h2>
              <p className="text-slate-600">
                {t('companyFollowers.emptyHint', 'Lorsque des candidats suivront votre entreprise, ils apparaîtront ici.')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {followers.map(follower => (
              <Card key={follower.user_id} className="border-slate-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {follower.avatar_url ? (
                      <img src={follower.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 m-2.5 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {follower.first_name} {follower.last_name}
                    </p>
                    {follower.title && (
                      <p className="text-sm text-slate-500 truncate">{follower.title}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      {t('companyFollowers.followedSince', 'Suivi depuis le {{date}}', {
                        date: formatRelative(follower.followed_at)
                      })}
                    </p>
                  </div>

                  {isBusinessPlan && (
                    <div className="flex items-center gap-2">
                      {/* ✅ Lien modifié pour inclure company_id */}
                      <Link to={`/candidat/${follower.user_id}?from=followers&company_id=${companyId}`}>
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          {t('companyFollowers.viewProfile', 'Profil')}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFollower(follower);
                          setContactModalOpen(true);
                        }}
                      >
                        {t('companyFollowers.contact', 'Contacter')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ContactFollowerModal
          isOpen={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          follower={selectedFollower}
          companyId={companyId}
          userId={user.id}
        />
      </div>
    </div>
  );
};

export default CompanyFollowersPage;