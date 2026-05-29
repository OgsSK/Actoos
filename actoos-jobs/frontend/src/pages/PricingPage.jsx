import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Check, Sparkles, Zap, Crown, Building2, ArrowRight, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Tarifs de secours si l'API ne répond pas
const FALLBACK_PRICING = {
  subscriptions: {
    pro_monthly: { amount: 49000, name: "Plan Pro - Mensuel", type: "subscription", interval: "month" },
    pro_annual: { amount: 470400, name: "Plan Pro - Annuel (-20%)", type: "subscription", interval: "year" },
    business_monthly: { amount: 149000, name: "Plan Business - Mensuel", type: "subscription", interval: "month" },
    business_annual: { amount: 1430400, name: "Plan Business - Annuel (-20%)", type: "subscription", interval: "year" },
  },
  boosts: {
    boost_7: { amount: 9990, name: "Boost 7 jours", days: 7 },
    boost_14: { amount: 17990, name: "Boost 14 jours", days: 14 },
    boost_30: { amount: 29990, name: "Boost 30 jours", days: 30 },
    featured: { amount: 49990, name: "À la une (30 jours)", days: 30 },
  },
  currency: "XOF"
};

const PRICING_CACHE_KEY = 'actoos_jobs_pricing_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const PricingPage = () => {
  const { user } = useAuth();
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    const loadPricing = async () => {
      // Essayer le cache d'abord pour un affichage instantané
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
        const data = await Promise.race([
          apiFetch('/api/pricing'),
          new Promise((_, reject) => fallbackTimer = setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        clearTimeout(fallbackTimer);
        setPricing(data);
        // Mettre en cache
        localStorage.setItem(PRICING_CACHE_KEY, JSON.stringify({
          timestamp: Date.now(),
          data
        }));
      } catch (err) {
        console.warn('Pricing API error, using fallback', err);
        // Utiliser les tarifs de secours
        setPricing(FALLBACK_PRICING);
        // Ne pas cacher le fallback, on réessaiera au prochain chargement
      } finally {
        clearTimeout(fallbackTimer);
        setLoading(false);
      }
    };
    loadPricing();
  }, []);

  const handleCheckout = async (packageId) => {
    if (!user) {
      toast.error('Vous devez être connecté pour souscrire');
      return;
    }
    setCheckoutLoading(packageId);
    try {
      const result = await apiFetch('/api/checkout/session', {
        method: 'POST',
        body: JSON.stringify({
          package_id: packageId,
          origin_url: window.location.origin,
          user_email: user.email,
          user_id: user.id,
        }),
      });
      window.location.href = result.url;
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création de la session de paiement');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 pt-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
      </div>
    );
  }

  const { subscriptions, boosts } = pricing;
  const plans = [
    {
      id: 'pro_monthly',
      name: 'Pro',
      monthlyPrice: subscriptions.pro_monthly.amount,
      annualPrice: subscriptions.pro_annual.amount,
      monthlyPriceDisplay: formatPrice(subscriptions.pro_monthly.amount),
      annualPriceDisplay: formatPrice(subscriptions.pro_annual.amount),
      annualMonthlyEquivalent: Math.round(subscriptions.pro_annual.amount / 12),
      features: [
        'Jusqu\'à 10 offres actives',
        'Statistiques de base',
        'Support par email',
        'Profil entreprise vérifié',
      ],
      icon: Zap,
      color: 'from-blue-400 to-blue-600',
      popular: false,
    },
    {
      id: 'business_monthly',
      name: 'Business',
      monthlyPrice: subscriptions.business_monthly.amount,
      annualPrice: subscriptions.business_annual.amount,
      monthlyPriceDisplay: formatPrice(subscriptions.business_monthly.amount),
      annualPriceDisplay: formatPrice(subscriptions.business_annual.amount),
      annualMonthlyEquivalent: Math.round(subscriptions.business_annual.amount / 12),
      features: [
        'Offres illimitées',
        'Statistiques avancées',
        'Support prioritaire',
        'Profil entreprise premium',
        'API de recrutement',
        'Multi-utilisateurs',
      ],
      icon: Crown,
      color: 'from-blue-950 to-blue-900',
      popular: true,
    },
  ];

  const boostItems = Object.entries(boosts).map(([key, value]) => ({
    id: key,
    name: value.name,
    price: value.amount,
    priceDisplay: formatPrice(value.amount),
    icon: Sparkles,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-blue-400/30 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span className="text-white/90 text-sm font-medium">Des tarifs adaptés à vos besoins</span>
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white font-display mb-6">
          Plans & Tarifs
        </h1>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto">
          Choisissez la formule qui correspond à votre stratégie de recrutement.
        </p>
      </div>

      {/* Abonnements */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white font-display">Abonnements entreprise</h2>
          <p className="text-blue-200 mt-2">Économisez 20% avec l'engagement annuel</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative bg-white/10 backdrop-blur-xl border-white/20 rounded-4xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${plan.popular ? 'ring-2 ring-blue-400' : ''}`}>
              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-blue-500 text-white rounded-full px-4 py-1">Populaire</Badge>
                </div>
              )}
              <CardHeader className="text-center pt-10 pb-0">
                <div className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-3xl flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-white">{plan.name}</CardTitle>
                <CardDescription className="text-blue-200 mt-2">
                  Pour les entreprises {plan.id === 'pro_monthly' ? 'en croissance' : 'établies'}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-5xl font-bold text-white">{plan.monthlyPriceDisplay}</span>
                    <span className="text-blue-200">FCFA</span>
                    <span className="text-blue-200 text-lg">/mois</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-blue-200">
                      ou {plan.annualPriceDisplay} FCFA / an{' '}
                      <Badge className="bg-green-500/20 text-green-400 border-0 rounded-full">-20%</Badge>
                    </span>
                    <p className="text-xs text-blue-300 mt-1">
                      Soit {formatPrice(plan.annualMonthlyEquivalent)} FCFA / mois
                    </p>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-blue-100">
                      <Check className="w-5 h-5 text-blue-400 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl h-14 text-lg"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={checkoutLoading === plan.id}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Building2 className="w-5 h-5 mr-2" />
                    )}
                    S'abonner (mensuel)
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-blue-400/30 text-white hover:bg-blue-400/10 rounded-2xl h-14 text-lg"
                    onClick={() => handleCheckout(plan.id.replace('monthly', 'annual'))}
                    disabled={checkoutLoading === plan.id.replace('monthly', 'annual')}
                  >
                    {checkoutLoading === plan.id.replace('monthly', 'annual') ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : null}
                    S'abonner (annuel -20%)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Boosts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white font-display">Boostez vos annonces</h2>
          <p className="text-blue-200 mt-2">Donnez plus de visibilité à vos offres</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {boostItems.map((boost) => (
            <Card key={boost.id} className="bg-white/10 backdrop-blur-xl border-white/20 rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.02]">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-blue-400/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <boost.icon className="w-7 h-7 text-blue-400" />
                </div>
                <h3 className="font-semibold text-lg text-white mb-1">{boost.name}</h3>
                <div className="flex items-center justify-center gap-1 mb-6">
                  <span className="text-3xl font-bold text-white">{boost.priceDisplay}</span>
                  <span className="text-blue-200 text-sm">FCFA</span>
                </div>
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-2xl"
                  onClick={() => handleCheckout(boost.id)}
                  disabled={checkoutLoading === boost.id}
                >
                  {checkoutLoading === boost.id ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  Acheter
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {!user && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-blue-950/90 backdrop-blur-xl border border-blue-400/30 rounded-3xl px-6 py-4 shadow-2xl text-white flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <span>Connectez-vous pour souscrire à un plan</span>
            <Link to="/connexion">
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600 rounded-2xl">
                Se connecter
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingPage;
