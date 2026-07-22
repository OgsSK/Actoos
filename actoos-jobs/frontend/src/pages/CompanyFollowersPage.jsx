import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, Users, ChevronLeft, User, ExternalLink, Search } from 'lucide-react';
import { formatRelative } from '../lib/utils';
import ContactFollowerModal from '../components/ContactFollowerModal';

const FollowerSkeleton = () => (
  <Card className="border-slate-200 animate-pulse">
    <CardContent className="p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-2/3" />
        <div className="h-3 bg-slate-200 rounded w-1/2" />
        <div className="h-3 bg-slate-200 rounded w-1/3" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 bg-slate-200 rounded" />
        <div className="h-8 w-20 bg-slate-200 rounded" />
      </div>
    </CardContent>
  </Card>
);

const CompanyFollowersPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId } = useAuth();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get('company_id') || activeCompanyId;

  const [company, setCompany] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [companyPlan, setCompanyPlan] = useState('free');
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedFollower, setSelectedFollower] = useState(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!companyId || !user) return;

    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);

      timeoutRef.current = setTimeout(() => {
        setFetchError('timeout');
        setLoading(false);
      }, 8000);

      try {
        const { data: compData, error: compErr } = await supabase
          .from('companies').select('id, name, followers_count, subscription_plan').eq('id', companyId).single();
        if (compErr) throw compErr;
        setCompany(compData);
        setCompanyPlan(compData.subscription_plan || 'free');

        const { data: followersData, error: followersErr } = await supabase
          .from('company_followers')
          .select(`user_id, created_at, user:users(id, first_name, last_name, email, avatar_url)`)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });
        if (followersErr) throw followersErr;

        const mapped = (followersData || []).map(f => ({
          user_id: f.user_id,
          first_name: f.user?.first_name || '',
          last_name: f.user?.last_name || '',
          email: f.user?.email || '',
          avatar_url: f.user?.avatar_url || null,
          followed_at: f.created_at,
        }));
        setFollowers(mapped);
      } catch (err) {
        console.error(err);
        setFetchError(err.message);
      } finally {
        clearTimeout(timeoutRef.current);
        setLoading(false);
      }
    };

    fetchData();
    return () => clearTimeout(timeoutRef.current);
  }, [companyId, user]);

  const isBusinessPlan = companyPlan === 'business' || companyPlan === 'enterprise';

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard/entreprise" className="inline-flex items-center text-slate-600 hover:text-slate-900 mb-6"><ChevronLeft className="w-5 h-5" /></Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{t('companyFollowers.title', 'Mes abonnés')}</h1>
            {company && <p className="text-slate-600 mt-1">{company.name} — {t('companyFollowers.total', { total: company.followers_count || followers.length })}</p>}
          </div>
          {isBusinessPlan && <Link to="/dashboard/entreprise/cv-bank"><Button variant="outline" size="sm"><Search className="w-4 h-4 mr-1" />{t('companyDashboard.cvBank.browse', 'CV Bank')}</Button></Link>}
        </div>

        {fetchError ? (
          <Card className="border-red-200"><CardContent className="p-8 text-center"><p className="text-red-600 mb-4">{fetchError === 'timeout' ? t('common.timeout') : fetchError}</p><Button onClick={() => window.location.reload()}>{t('common.retry', 'Réessayer')}</Button></CardContent></Card>
        ) : loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <FollowerSkeleton key={i} />)}</div>
        ) : followers.length === 0 ? (
          <Card className="border-slate-200"><CardContent className="p-8 text-center"><Users className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h2 className="text-xl font-semibold text-slate-900 mb-2">{t('companyFollowers.empty')}</h2><p className="text-slate-600">{t('companyFollowers.emptyHint')}</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {followers.map(follower => (
              <Card key={follower.user_id} className="border-slate-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                    {follower.avatar_url ? <img src={follower.avatar_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5 m-2.5 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{follower.first_name} {follower.last_name}</p>
                    <p className="text-xs text-slate-400 mt-1">{t('companyFollowers.followedSince', { date: formatRelative(follower.followed_at) })}</p>
                  </div>
                  {isBusinessPlan && (
                    <div className="flex items-center gap-2">
                      <Link to={`/candidat/${follower.user_id}?from=followers&company_id=${companyId}`}><Button variant="outline" size="sm"><ExternalLink className="w-4 h-4 mr-1" />{t('companyFollowers.viewProfile', 'Profil')}</Button></Link>
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedFollower(follower); setContactModalOpen(true); }}>{t('companyFollowers.contact', 'Contacter')}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ContactFollowerModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} follower={selectedFollower} companyId={companyId} userId={user.id} />
      </div>
    </div>
  );
};

export default CompanyFollowersPage;