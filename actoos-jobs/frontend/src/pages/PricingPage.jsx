import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useCurrencyFormatter } from '../hooks/useCurrencyFormatter';
import { usePreferencesContext } from '../contexts/PreferencesContext';
import { PLAN_LIMITS } from '../lib/planLimits';
import {
  Loader2, Zap, Crown, Building2, ArrowRight, AlertCircle,
  ChevronDown, ChevronUp, X, Shield, Briefcase, Clock, Sparkles,
  FileText, Search, Users, Gift, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:8001'
  : 'https://actoos-jobs-api.onrender.com';

const FALLBACK_PRICING = {
  subscriptions: {
    pro_monthly: { amount: 49000, name: "Plan Pro - Mensuel", type: "subscription", interval: "month" },
    pro_annual: { amount: 470400, name: "Plan Pro - Annuel (-20%)", type: "subscription", interval: "year" },
    business_monthly: { amount: 84618, name: "Plan Business - Mensuel", type: "subscription", interval: "month" },
    business_annual: { amount: 812110, name: "Plan Business - Annuel (-20%)", type: "subscription", interval: "year" },
  },
  boosts: {},
  currency: "XOF"
};

const PRICING_CACHE_KEY = 'actoos_jobs_pricing_cache';
const CACHE_DURATION = 30 * 60 * 1000;

// Taux de conversion EUR -> XOF (identique au backend)
const EUR_TO_XOF = 655.957;
const LAUNCH_MONTHLY_EUR = 0;        // 0 € pendant 3 mois
const LAUNCH_ANNUAL_EUR = 49;        // 49 € la première année

const PricingPage = () => {
  const { t } = useTranslation();
  const { user, activeCompanyId, refreshProfile } = useAuth();
  const { format } = useCurrencyFormatter();
  const { prefs } = usePreferencesContext();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [faqOpen, setFaqOpen] = useState(null);
  const [annual, setAnnual] = useState(false);
  const [company, setCompany] = useState(null);
  const [companyLoading, setCompanyLoading] = useState(true);

  // Chargement des prix avec cache et fallback
  useEffect(() => {
    const loadPricing = async () => {
      const cached = localStorage.getItem(PRICING_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && (Date.now() - parsed.timestamp) < CACHE_DURATION) {
            setPricing(parsed.data);
            setLoading(false);
            return;
          }
        } catch (e) {}
      }

      let fallbackTimer;
      try {
        const controller = new AbortController();
        const data = await Promise.race([
          fetch(`${BASE_URL}/api/pricing`, { signal: controller.signal }).then(res => res.json()),
          new Promise((_, reject) => fallbackTimer = setTimeout(() => {
            controller.abort();
            reject(new Error('timeout'));
          }, 5000))
        ]);
        clearTimeout(fallbackTimer);
        setPricing(data);
        localStorage.setItem(PRICING_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
      } catch (err) {
        console.warn('Pricing API error, using fallback', err);
        setPricing(FALLBACK_PRICING);
      } finally {
        clearTimeout(fallbackTimer);
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  // Chargement de l'entreprise
  useEffect(() => {
    if (!user) {
      setCompany(null);
      setCompanyLoading(false);
      return;
    }
    setCompanyLoading(true);
    const fetchCompany = async () => {
      if (activeCompanyId) {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('id', activeCompanyId)
          .maybeSingle();
        if (!error && data) {
          setCompany(data);
          setCompanyLoading(false);
          return;
        }
      }
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (!error && data) setCompany(data);
      else setCompany(null);
      setCompanyLoading(false);
    };
    fetchCompany();
  }, [user, activeCompanyId]);

  // Rafraîchissement quand l'onglet redevient visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        const fetchCompany = async () => {
          setCompanyLoading(true);
          try {
            if (activeCompanyId) {
              const { data } = await supabase
                .from('companies')
                .select('*')
                .eq('id', activeCompanyId)
                .maybeSingle();
              if (data) {
                setCompany(data);
                refreshProfile();
              }
            } else {
              const { data } = await supabase
                .from('companies')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();
              if (data) {
                setCompany(data);
                refreshProfile();
              }
            }
          } catch (err) {
            console.error('Erreur refresh company:', err);
          } finally {
            setCompanyLoading(false);
          }
        };
        fetchCompany();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, activeCompanyId, refreshProfile]);

  const handleCheckout = async (packageId) => {
    if (!user) {
      toast.error(t('pricing.toast.mustLogin'));
      return;
    }
    const companyId = activeCompanyId || company?.id;
    if (!companyId) {
      toast.error(t('pricing.toast.noCompany'));
      return;
    }
    setCheckoutLoading(packageId);
    try {
      const response = await fetch(`${BASE_URL}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: packageId,
          origin_url: window.location.origin,
          user_email: user.email,
          user_id: user.id,
          company_id: companyId,
          preferred_currency: prefs.currency || 'XOF',
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const msg = result.detail || result.message || '';
        if (msg.includes('DOWNGRADE_BLOCKED:')) {
          const numbers = msg.match(/\d+/g);
          if (numbers && numbers.length >= 3) {
            throw new Error(`DOWNGRADE_BLOCKED:${numbers[numbers.length - 2]}:${numbers[numbers.length - 1]}`);
          } else {
            throw new Error('DOWNGRADE_BLOCKED');
          }
        }
        throw new Error(msg || t('pricing.toast.checkoutError'));
      }
      window.location.href = result.url;
    } catch (err) {
      const msg = err.message || '';
      if (msg.startsWith('DOWNGRADE_BLOCKED:')) {
        const parts = msg.split(':');
        toast.error(t('pricing.downgradeBlocked', {
          active: parts[1] || '?',
          limit: parts[2] || '?'
        }));
      } else {
        toast.error(err.message || t('pricing.toast.checkoutError'));
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handlePortal = () => {
    window.location.href = '/dashboard/entreprise';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  const { subscriptions } = pricing;

  const proMonthly = subscriptions?.pro_monthly?.amount || 49000;
  const proAnnual = subscriptions?.pro_annual?.amount || 470400;
  const businessMonthly = subscriptions?.business_monthly?.amount || 84618;
  const businessAnnual = subscriptions?.business_annual?.amount || 812110;

  // Montants de l’offre de lancement en FCFA (pour conversion via `format`)
  const launchMonthlyPriceFCFA = Math.round(LAUNCH_MONTHLY_EUR * EUR_TO_XOF); // 0
  const launchAnnualPriceFCFA = Math.round(LAUNCH_ANNUAL_EUR * EUR_TO_XOF);   // 32142

  const plans = [
    {
      id: 'free',
      nameKey: 'pricing.plans.free.name',
      descKey: 'pricing.plans.free.description',
      features: [
        { icon: Briefcase, text: t('pricing.plans.free.features.0', { count: PLAN_LIMITS.free.jobs }) },
        { icon: Clock, text: t('pricing.plans.free.features.expiration', { days: PLAN_LIMITS.free.expirationDays }) },
        { icon: Shield, text: t('pricing.plans.free.features.2') },
      ],
      limitations: [
        t('pricing.plans.free.limitations.noInterviewTools'),
        t('pricing.plans.free.limitations.noAiNotes'),
        t('pricing.plans.free.limitations.noCvBank'),
        t('pricing.plans.free.limitations.noMultiCompany'),
      ],
      icon: Building2,
      borderColor: 'border-slate-200',
      hoverBorderColor: 'hover:border-slate-300',
      cardBg: 'bg-white',
      badge: null,
      planKey: 'free',
    },
    {
      id: 'pro_monthly',
      nameKey: 'pricing.plans.pro.name',
      descKey: 'pricing.plans.pro.description',
      features: [
        { icon: Briefcase, text: t('pricing.plans.pro.features.0', { count: PLAN_LIMITS.pro.jobs }) },
        { icon: Clock, text: t('pricing.plans.pro.features.expiration', { days: PLAN_LIMITS.pro.expirationDays }) },
        { icon: FileText, text: t('pricing.plans.pro.features.interviewTools') },
        { icon: Sparkles, text: t('pricing.plans.pro.features.aiNotes') },
        { icon: Shield, text: t('pricing.plans.pro.features.verifiedProfile') },
      ],
      limitations: [
        t('pricing.plans.pro.limitations.noCvBank'),
        t('pricing.plans.pro.limitations.noMultiCompany'),
      ],
      icon: Zap,
      borderColor: 'border-blue-200',
      hoverBorderColor: 'hover:border-blue-300',
      cardBg: 'bg-white',
      badge: null,
      planKey: 'pro',
    },
    {
      id: 'business_monthly',
      nameKey: 'pricing.plans.business.name',
      descKey: 'pricing.plans.business.description',
      features: [
        { icon: Briefcase, text: t('pricing.plans.business.features.0') },
        { icon: Clock, text: t('pricing.plans.business.features.expiration', { days: PLAN_LIMITS.business.expirationDays }) },
        { icon: FileText, text: t('pricing.plans.business.features.interviewTools') },
        { icon: Sparkles, text: t('pricing.plans.business.features.aiNotes') },
        { icon: Sparkles, text: t('pricing.plans.business.features.freeBoost') },
        { icon: Search, text: t('pricing.plans.business.features.cvBank') },
        { icon: Users, text: t('pricing.plans.business.features.multiCompany') },
        { icon: Shield, text: t('pricing.plans.business.features.premiumBadge') },
      ],
      limitations: [],
      icon: Crown,
      borderColor: 'border-blue-600',
      hoverBorderColor: 'hover:border-blue-700',
      cardBg: 'bg-gradient-to-b from-blue-50/30 to-white',
      badge: { text: t('pricing.mostPopular'), color: 'bg-blue-600' },
      planKey: 'business',
    },
  ];

  const currentPlan = company?.subscription_plan || 'free';
  const currentBillingCycle = company?.billing_cycle;

  const handleFreePlan = () => {
    if (!user) {
      toast.error(t('pricing.toast.mustLoginFree'));
      return;
    }
    if (currentPlan === 'free') {
      toast.info(t('pricing.toast.alreadyFree'));
      return;
    }
    toast.info(t('pricing.toast.cancelToFree'));
  };

  const faqItems = t('pricing.faq.items', { returnObjects: true }) || [];

  const comparisonRows = [
    { key: 'activeOffers', free: PLAN_LIMITS.free.jobs, pro: PLAN_LIMITS.pro.jobs, business: '∞' },
    {
      key: 'expiration',
      free: t('pricing.comparison.values.days', { count: PLAN_LIMITS.free.expirationDays }),
      pro: t('pricing.comparison.values.days', { count: PLAN_LIMITS.pro.expirationDays }),
      business: t('pricing.comparison.values.days', { count: PLAN_LIMITS.business.expirationDays }),
    },
    { key: 'interviewTools', free: '-', pro: '✓', business: '✓' },
    { key: 'aiNotes', free: '-', pro: '✓', business: '✓' },
    { key: 'cvBank', free: '-', pro: '-', business: '✓' },
    { key: 'multiCompany', free: '-', pro: '-', business: '✓' },
    { key: 'freeBoost', free: '-', pro: '-', business: t('pricing.comparison.values.perMonth') },
    { key: 'verifiedProfile', free: '-', pro: '✓', business: t('pricing.comparison.values.premium') },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Hero */}
      <div className="relative overflow-hidden bg-white border-b border-slate-100">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-white opacity-70" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center relative z-10">
          <Badge className="bg-blue-50 text-blue-700 border-0 mb-4 px-4 py-1.5 text-sm font-medium">
            {t('pricing.badge')}
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 font-display mb-6 tracking-tight">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-light">
            {t('pricing.subtitle')}
          </p>
        </div>
      </div>

      {/* Toggle mensuel/annuel */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="flex justify-center items-center gap-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-1.5 w-fit mx-auto">
          <button
            onClick={() => setAnnual(false)}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              !annual
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('pricing.toggle.monthly')}
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-6 py-2 rounded-xl text-sm font-medium transition-all ${
              annual
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('pricing.toggle.annual')}
            {annual && (
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                {t('pricing.toggle.savePercent')}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bandeau Accès anticipé */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Gift className="w-6 h-6 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">
              <strong className="text-amber-900">{t('pricing.launchBanner.title')}</strong> – {t('pricing.launchBanner.description')}
            </p>
          </div>
          <Badge className="bg-amber-500 text-white border-0 shrink-0">{t('pricing.launchOffer.badge')}</Badge>
        </div>
      </div>

      {/* Grille des plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = company && currentPlan === plan.planKey;
            const isUpgrade = company && ((plan.planKey === 'pro' && currentPlan === 'free') || (plan.planKey === 'business' && (currentPlan === 'free' || currentPlan === 'pro')));
            const isDowngrade = company && !isCurrentPlan && !isUpgrade && plan.planKey !== 'free' && currentPlan !== 'free';

            let monthlyPrice = 0;
            let annualPrice = 0;
            let annualMonthlyEquivalent = 0;
            if (plan.id === 'free') {
              monthlyPrice = 0;
              annualPrice = 0;
              annualMonthlyEquivalent = 0;
            } else if (plan.planKey === 'pro') {
              monthlyPrice = proMonthly;
              annualPrice = proAnnual;
              annualMonthlyEquivalent = Math.round(proAnnual / 12);
            } else if (plan.planKey === 'business') {
              monthlyPrice = businessMonthly;
              annualPrice = businessAnnual;
              annualMonthlyEquivalent = Math.round(businessAnnual / 12);
            }

            const isBusiness = plan.planKey === 'business';

            let switchCycleButton = null;
            if (isCurrentPlan && plan.planKey !== 'free' && currentBillingCycle) {
              const targetCycle = currentBillingCycle === 'monthly' ? 'annual' : 'monthly';
              const targetPackageId = plan.id.replace('monthly', targetCycle);
              switchCycleButton = (
                <Button
                  className={`w-full h-14 text-lg font-semibold rounded-2xl transition-all ${
                    plan.badge
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:shadow-md'
                  }`}
                  onClick={() => handleCheckout(targetPackageId)}
                  disabled={checkoutLoading === targetPackageId}
                >
                  {checkoutLoading === targetPackageId ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="w-5 h-5 mr-2" />
                  )}
                  {currentBillingCycle === 'monthly'
                    ? t('pricing.actions.subscribeAnnual')
                    : t('pricing.actions.subscribeMonthly')}
                </Button>
              );
            }

            return (
              <Card
                key={plan.id}
                className={`relative ${plan.cardBg} border-2 ${plan.borderColor} ${plan.hoverBorderColor} rounded-3xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${plan.badge ? 'scale-105 lg:scale-100 lg:hover:scale-105' : ''}`}
              >
                {plan.badge && !(company && currentPlan === plan.planKey) && (
                  <div className={`absolute top-0 right-0 ${plan.badge.color} text-white text-xs font-semibold px-4 py-1 rounded-bl-2xl uppercase tracking-wide shadow-sm`}>
                    {plan.badge.text}
                  </div>
                )}
                {companyLoading ? (
                  <div className="absolute top-4 left-4 bg-slate-100 text-slate-500 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t('pricing.loading')}
                  </div>
                ) : isCurrentPlan ? (
                  <div className="absolute top-4 left-4 bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    {t('pricing.currentPlan')}
                  </div>
                ) : null}
                <CardHeader className="text-center pt-10 pb-0">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-inner">
                    <plan.icon className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900">{t(plan.nameKey)}</CardTitle>
                  <CardDescription className="text-slate-500 mt-2 text-sm">{t(plan.descKey)}</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  {/* Prix */}
                  <div className="text-center mb-8">
                    {plan.id === 'free' ? (
                      <>
                        <div className="text-4xl font-extrabold text-slate-900">
                          {format(0)}
                        </div>
                        <div className="text-sm text-slate-400 mt-2">{t('pricing.perMonth')}</div>
                      </>
                    ) : isBusiness ? (
                      annual ? (
                        <>
                          <div className="text-sm text-slate-400 line-through mb-2">
                            {format(annualPrice)}{t('pricing.launchOffer.perYear')}
                          </div>
                          <div className="text-4xl font-extrabold text-blue-600">
                            {format(launchAnnualPriceFCFA)}
                            <span className="text-lg font-normal text-slate-500 ml-1">{t('pricing.launchOffer.perYear')}</span>
                          </div>
                          <div className="text-sm text-green-600 mt-2 font-medium bg-green-50 inline-block px-3 py-1 rounded-full">
                            {t('pricing.launchOffer.annualDescription', { price: format(annualPrice) })}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-slate-400 line-through mb-2">
                            {format(monthlyPrice)}{t('pricing.launchOffer.perMonth')}
                          </div>
                          <div className="text-4xl font-extrabold text-blue-600">
                            {format(launchMonthlyPriceFCFA)}
                            <span className="text-lg font-normal text-slate-500 ml-1">{t('pricing.launchOffer.perMonth')}</span>
                          </div>
                          <div className="text-sm text-green-600 mt-2 font-medium bg-green-50 inline-block px-3 py-1 rounded-full">
                            {t('pricing.launchOffer.monthlyDescription', { price: format(monthlyPrice) })}
                          </div>
                        </>
                      )
                    ) : (
                      annual ? (
                        <>
                          <div className="text-4xl font-extrabold text-slate-900">
                            {format(annualMonthlyEquivalent)}
                            <span className="text-lg font-normal text-slate-500 ml-1">{t('pricing.perMonthShort')}</span>
                          </div>
                          <div className="text-sm text-slate-500 mt-2">
                            {t('pricing.billedAnnually')} ({format(annualPrice)})
                          </div>
                          <div className="mt-3">
                            <Badge className="bg-green-50 text-green-700 border-0 rounded-full text-xs px-3 py-1">
                              {t('pricing.toggle.savePercent')}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-4xl font-extrabold text-slate-900">
                            {format(monthlyPrice)}
                            <span className="text-lg font-normal text-slate-500 ml-1">{t('pricing.perMonthShort')}</span>
                          </div>
                          <div className="text-sm text-slate-500 mt-2">
                            {t('pricing.billedMonthly')}
                          </div>
                        </>
                      )
                    )}
                  </div>

                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700">
                        <feature.icon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <span className="text-sm">{feature.text}</span>
                      </li>
                    ))}
                    {plan.limitations.map((lim, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-400 line-through">
                        <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                        <span className="text-sm">{lim}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="space-y-3">
                    {plan.id === 'free' ? (
                      <Button
                        className={`w-full h-14 text-lg font-semibold rounded-2xl transition-all ${
                          isCurrentPlan
                            ? 'bg-slate-100 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:shadow-md'
                        }`}
                        onClick={handleFreePlan}
                        disabled={isCurrentPlan}
                      >
                        {isCurrentPlan ? t('pricing.currentPlan') : t('pricing.actions.backToFree')}
                      </Button>
                    ) : isCurrentPlan ? (
                      <>
                        <Button className="w-full h-14 text-lg font-semibold rounded-2xl bg-slate-100 text-slate-500 cursor-not-allowed" disabled>
                          {t('pricing.currentPlan')}
                        </Button>
                        {switchCycleButton}
                        <Button
                          variant="outline"
                          className="w-full h-14 text-lg rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
                          onClick={handlePortal}
                        >
                          {t('pricing.actions.manageSubscription')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          className={`w-full h-14 text-lg font-semibold rounded-2xl transition-all ${
                            plan.badge
                              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 hover:shadow-xl'
                              : 'bg-blue-50 hover:bg-blue-100 text-blue-700 hover:shadow-md'
                          }`}
                          onClick={() => handleCheckout(annual ? plan.id.replace('monthly', 'annual') : plan.id)}
                          disabled={checkoutLoading === plan.id}
                        >
                          {checkoutLoading === plan.id ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          ) : (
                            <Building2 className="w-5 h-5 mr-2" />
                          )}
                          {isUpgrade
                            ? t('pricing.actions.upgradeTo', { plan: t(plan.nameKey) })
                            : isDowngrade
                            ? t('pricing.actions.downgradeTo', { plan: t(plan.nameKey) })
                            : annual
                            ? t('pricing.actions.subscribeAnnual')
                            : t('pricing.actions.subscribeMonthly')}
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                        {!annual && (
                          <Button
                            variant="outline"
                            className="w-full h-14 text-lg rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 hover:shadow-md"
                            onClick={() => handleCheckout(plan.id.replace('monthly', 'annual'))}
                            disabled={checkoutLoading === plan.id.replace('monthly', 'annual')}
                          >
                            {checkoutLoading === plan.id.replace('monthly', 'annual') ? (
                              <Loader2 className="w-5 h-5 animate-spin mr-2" />
                            ) : null}
                            {t('pricing.actions.subscribeAnnual')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Tableau comparatif */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 font-display">{t('pricing.comparison.title')}</h2>
          <p className="text-slate-600 mt-2 max-w-xl mx-auto">{t('pricing.comparison.subtitle')}</p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm min-w-[600px] sm:min-w-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="text-left py-5 px-6 text-slate-600 font-semibold sticky left-0 bg-slate-50/50 backdrop-blur-sm z-10">
                    {t('pricing.comparison.featureColumn')}
                  </th>
                  <th className="py-5 px-6 text-slate-900 font-bold text-center">{t('pricing.comparison.freeColumn')}</th>
                  <th className="py-5 px-6 text-slate-900 font-bold text-center">{t('pricing.comparison.proColumn')}</th>
                  <th className="py-5 px-6 text-blue-600 font-bold text-center">{t('pricing.comparison.businessColumn')}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-slate-50 last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                  >
                    <td className="py-4 px-6 text-slate-700 font-medium sticky left-0 bg-inherit">{t(`pricing.comparison.rows.${row.key}`)}</td>
                    <td className="py-4 px-6 text-slate-600 text-center">{typeof row.free === 'boolean' ? (row.free ? '✓' : '-') : row.free}</td>
                    <td className="py-4 px-6 text-slate-600 text-center">{typeof row.pro === 'boolean' ? (row.pro ? '✓' : '-') : row.pro}</td>
                    <td className="py-4 px-6 text-blue-600 font-medium text-center">{typeof row.business === 'boolean' ? (row.business ? '✓' : '-') : row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 font-display">{t('pricing.faq.title')}</h2>
          <p className="text-slate-600 mt-2">{t('pricing.faq.subtitle')}</p>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div
              key={index}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md"
            >
              <button
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left text-slate-900 font-medium hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-blue-500 shrink-0" />
                  {item.question}
                </span>
                {faqOpen === index ? (
                  <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                )}
              </button>
              {faqOpen === index && (
                <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed animate-fadeIn">
                  {item.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="relative bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-10 sm:p-14 text-center text-white overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-60 h-60 bg-white opacity-5 rounded-full" />
          <Building2 className="w-16 h-16 text-blue-200 mx-auto mb-6 relative z-10" />
          <h2 className="text-3xl font-bold mb-4 relative z-10">{t('pricing.cta.title')}</h2>
          <p className="text-blue-100 mb-10 max-w-xl mx-auto relative z-10">{t('pricing.cta.subtitle')}</p>
          <Link to="/contact" className="relative z-10">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all px-8 py-6 text-lg">
              {t('pricing.cta.button')}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {!user && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <span>{t('pricing.loginBanner.message')}</span>
            <Link to="/connexion">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl text-white">
                {t('pricing.loginBanner.button')}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;