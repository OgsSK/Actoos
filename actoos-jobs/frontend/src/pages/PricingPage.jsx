import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Loader2, Check, Sparkles, Zap, Crown, Building2, ArrowRight, AlertCircle,
  HelpCircle, ChevronDown, ChevronUp, X, Shield, Users, Briefcase, BarChart3,
  Headphones, Globe, Lock, ZapOff
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
  const [faqOpen, setFaqOpen] = useState(null);

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
        const data = await Promise.race([
          apiFetch('/api/pricing'),
          new Promise((_, reject) => fallbackTimer = setTimeout(() => reject(new Error('timeout')), 3000))
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
      <div className="min-h-screen flex items-center justify-center bg-white pt-20">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
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
      description: 'Pour les PME et les recruteurs indépendants.',
      features: [
        { icon: Briefcase, text: 'Jusqu\'à 10 offres actives' },
        { icon: Users, text: '1 utilisateur (admin)' },
        { icon: BarChart3, text: 'Statistiques de base' },
        { icon: Headphones, text: 'Support par email' },
        { icon: Shield, text: 'Profil entreprise vérifié' },
      ],
      limitations: ['Pas de mise en avant', 'Pas d\'API', 'Pas d\'export'],
      icon: Zap,
      borderColor: 'border-blue-200',
      badge: null,
    },
    {
      id: 'business_monthly',
      name: 'Business',
      monthlyPrice: subscriptions.business_monthly.amount,
      annualPrice: subscriptions.business_annual.amount,
      monthlyPriceDisplay: formatPrice(subscriptions.business_monthly.amount),
      annualPriceDisplay: formatPrice(subscriptions.business_annual.amount),
      annualMonthlyEquivalent: Math.round(subscriptions.business_annual.amount / 12),
      description: 'Pour les entreprises qui recrutent activement.',
      features: [
        { icon: Briefcase, text: 'Offres actives illimitées' },
        { icon: Users, text: "Jusqu'à 5 utilisateurs" },
        { icon: BarChart3, text: 'Statistiques avancées' },
        { icon: Headphones, text: 'Support prioritaire' },
        { icon: Globe, text: 'API de recrutement' },
        { icon: Lock, text: 'Export des candidatures' },
        { icon: Sparkles, text: '1 mise en avant offerte/mois' },
        { icon: Shield, text: 'Profil entreprise premium' },
      ],
      limitations: [],
      icon: Crown,
      borderColor: 'border-blue-600',
      badge: { text: 'Recommandé', color: 'bg-blue-600' },
    },
  ];

  const boostItems = Object.entries(boosts).map(([key, value]) => ({
    id: key,
    name: value.name,
    price: value.amount,
    priceDisplay: formatPrice(value.amount),
    description: value.days ? `Visibilité prioritaire pendant ${value.days} jours` : 'Vitrine premium',
    icon: Sparkles,
  }));

  // FAQ détaillée
  const faqItems = [
    {
      q: "Comment fonctionne l'abonnement ?",
      a: "Vous choisissez un plan (Pro ou Business) avec une facturation mensuelle ou annuelle. L'abonnement est automatiquement renouvelé chaque période. Vous pouvez résilier à tout moment depuis votre espace entreprise, sans frais."
    },
    {
      q: "Puis-je changer de plan à tout moment ?",
      a: "Oui, vous pouvez passer d'un plan à l'autre à tout moment. Si vous passez à un plan supérieur, vous ne payez que la différence au prorata du nombre de jours restants. Si vous passez à un plan inférieur, la modification prendra effet à la prochaine échéance."
    },
    {
      q: "Y a-t-il des frais cachés ou des engagements ?",
      a: "Aucun frais caché. Les prix affichés sont les prix finaux, toutes taxes comprises. Il n'y a pas d'engagement de durée : vous pouvez annuler à tout moment. L'abonnement annuel offre une réduction de 20 % par rapport au tarif mensuel, mais vous restez libre de résilier avant la fin de la période annuelle (la résiliation sera effective à la fin de l'année en cours)."
    },
    {
      q: "Puis-je annuler mon abonnement ?",
      a: "Bien sûr. La résiliation se fait en un clic depuis votre espace entreprise, dans la rubrique 'Abonnement'. Votre abonnement restera actif jusqu'à la fin de la période payée. Aucun remboursement n'est effectué pour les périodes non utilisées, sauf disposition légale contraire."
    },
    {
      q: "Mes offres d'emploi restent-elles en ligne après la fin de l'abonnement ?",
      a: "Oui, vos offres actives restent publiées jusqu'à leur date d'expiration normale. Vous ne pourrez simplement pas en publier de nouvelles si vous avez atteint la limite de votre nouveau plan (ou la limite gratuite)."
    },
    {
      q: "Quels sont les moyens de paiement acceptés ?",
      a: "Nous acceptons les cartes bancaires internationales (Visa, Mastercard, American Express) via Stripe, un processeur de paiement certifié PCI-DSS de niveau 1. Nous ne stockons jamais vos informations de carte bancaire sur nos serveurs."
    },
    {
      q: "Comment sont gérées les données de facturation ?",
      a: "Vos données de facturation (adresse, historique des paiements) sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers. Vous pouvez consulter et télécharger vos factures depuis votre espace entreprise."
    },
    {
      q: "Proposez-vous des solutions pour les grands groupes ou les besoins spécifiques ?",
      a: "Oui, nous proposons des plans Entreprise sur mesure. Contactez notre équipe commerciale via la page Contact pour discuter de vos besoins : nombre d'utilisateurs illimité, intégration API avancée, support dédié, SLA, formation, etc."
    },
    {
      q: "Puis-je utiliser le plan gratuit indéfiniment ?",
      a: "Le plan gratuit vous permet de tester la plateforme avec 3 offres actives. Il n'a pas de limite de temps. Vous pouvez passer à un plan payant lorsque vous avez besoin de plus de fonctionnalités."
    },
    {
      q: "Que se passe-t-il si je dépasse ma limite d'offres ?",
      a: "Si vous atteignez la limite de votre plan, vous ne pourrez pas publier de nouvelles offres. Vous pouvez soit archiver d'anciennes offres, soit passer au plan supérieur pour augmenter votre quota."
    },
    {
      q: "Comment fonctionnent les boosts d'annonce ?",
      a: "Un boost est un achat ponctuel qui met votre offre en avant pendant une durée déterminée (7, 14 ou 30 jours). L'offre apparaît en priorité dans les résultats de recherche et sur la page d'accueil. Vous pouvez booster plusieurs offres simultanément."
    },
    {
      q: "Puis-je obtenir un remboursement ?",
      a: "Nous offrons une garantie de 14 jours pour les nouveaux abonnés. Si vous n'êtes pas satisfait, contactez-nous pour un remboursement complet. Pour les boosts, ils ne sont pas remboursables une fois activés."
    }
  ];

  return (
    <div className="min-h-screen bg-white pt-20">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <Badge className="bg-blue-50 text-blue-700 border-0 mb-4">Tarifs</Badge>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 font-display mb-6">
          Des plans pensés pour votre croissance
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Du recrutement occasionnel à la gestion avancée, choisissez la formule qui correspond à vos besoins et évoluez en toute simplicité.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.id} className={`relative bg-white border-2 ${plan.borderColor} rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl ${plan.badge ? 'scale-105' : ''}`}>
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-semibold px-4 py-1 rounded-bl-2xl uppercase tracking-wide">
                  {plan.badge.text}
                </div>
              )}
              <CardHeader className="text-center pt-10 pb-0">
                <div className={`w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                  <plan.icon className="w-7 h-7 text-blue-600" />
                </div>
                <CardTitle className="text-2xl font-bold text-slate-900">{plan.name}</CardTitle>
                <CardDescription className="text-slate-500 mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold text-slate-900">{plan.monthlyPriceDisplay}</span>
                    <span className="text-slate-500 text-lg">FCFA</span>
                    <span className="text-slate-400">/mois</span>
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-sm text-slate-500">
                      {plan.annualPriceDisplay} FCFA / an
                    </span>
                    <Badge className="bg-green-50 text-green-700 border-0 rounded-full text-xs">-20%</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Soit {formatPrice(plan.annualMonthlyEquivalent)} FCFA / mois
                  </p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-700">
                      <feature.icon className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <span>{feature.text}</span>
                    </li>
                  ))}
                  {plan.limitations.map((lim, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-400 line-through">
                      <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Button
                    className={`w-full h-14 text-lg font-semibold rounded-2xl ${
                      plan.badge
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
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
                    className="w-full h-14 text-lg rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50"
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

      {/* Tableau comparatif */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 font-display">Comparaison détaillée</h2>
          <p className="text-slate-600 mt-2">Fonctionnalités clés par plan</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-4 px-6 text-slate-600 font-medium">Fonctionnalité</th>
                <th className="py-4 px-6 text-slate-900 font-bold">Pro</th>
                <th className="py-4 px-6 text-blue-600 font-bold">Business</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Offres actives', '10', 'Illimitées'],
                ['Utilisateurs', '1', "Jusqu'à 5"],
                ['Statistiques', 'Basiques', 'Avancées'],
                ['Support', 'Email', 'Prioritaire (email & chat)'],
                ['API', 'Non', 'Oui'],
                ['Export données', 'Non', 'Oui'],
                ['Mise en avant offerte', 'Non', '1/mois'],
                ['Profil entreprise vérifié', 'Standard', 'Premium'],
              ].map(([feature, pro, business], i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-4 px-6 text-slate-700">{feature}</td>
                  <td className="py-4 px-6 text-slate-600">{pro}</td>
                  <td className="py-4 px-6 text-blue-600 font-medium">{business}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boosts */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 font-display">Boostez votre visibilité</h2>
          <p className="text-slate-600 mt-2">Donnez un coup de projecteur à vos offres d'emploi</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {boostItems.map((boost) => (
            <Card key={boost.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-lg">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <boost.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg text-slate-900 mb-1">{boost.name}</h3>
                <p className="text-xs text-slate-500 mb-4">{boost.description}</p>
                <div className="flex items-center justify-center gap-1 mb-6">
                  <span className="text-3xl font-bold text-slate-900">{boost.priceDisplay}</span>
                  <span className="text-slate-500 text-sm">FCFA</span>
                </div>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl"
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

      {/* FAQ détaillée */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 font-display">Questions fréquentes</h2>
          <p className="text-slate-600 mt-2">Tout ce que vous devez savoir sur nos abonnements</p>
        </div>
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <button
                onClick={() => setFaqOpen(faqOpen === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left text-slate-900 font-medium hover:bg-slate-50 transition-colors"
              >
                <span>{item.q}</span>
                {faqOpen === index ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" /> : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />}
              </button>
              {faqOpen === index && (
                <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="bg-blue-600 rounded-3xl p-8 sm:p-12 text-center text-white">
          <Building2 className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Une solution sur mesure ?</h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Pour les grands groupes et les besoins spécifiques, nous créons des offres personnalisées avec un accompagnement dédié.
          </p>
          <Link to="/contact">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 rounded-2xl font-semibold">
              Contacter notre équipe
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Message non connecté */}
      {!user && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            <span>Connectez-vous pour souscrire à un plan</span>
            <Link to="/connexion">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 rounded-xl text-white">
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