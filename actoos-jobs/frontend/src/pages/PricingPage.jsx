import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { 
  Check, X, Zap, Building2, Crown, Rocket, Star, Clock, 
  TrendingUp, Loader2, ArrowRight, Sparkles 
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const PricingPage = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const plans = [
    {
      id: 'free',
      name: 'Gratuit',
      price: '0',
      period: '',
      description: 'Pour demarrer et tester la plateforme',
      icon: Building2,
      color: 'slate',
      features: [
        { text: '3 offres actives', included: true },
        { text: 'Candidatures illimitees', included: true },
        { text: 'Profil entreprise basique', included: true },
        { text: 'Support par email', included: true },
        { text: 'Offres mises en avant', included: false },
        { text: 'Statistiques avancees', included: false },
        { text: 'Export des candidatures', included: false },
        { text: 'Support prioritaire', included: false },
      ],
      cta: 'Commencer gratuitement',
      ctaLink: '/inscription?type=entreprise',
      popular: false,
      stripeId: null,
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: '49',
      period: '/mois',
      description: 'Pour les PME qui recrutent regulierement',
      icon: Zap,
      color: 'blue',
      features: [
        { text: '15 offres actives', included: true },
        { text: 'Candidatures illimitees', included: true },
        { text: 'Profil entreprise complet', included: true },
        { text: '5 offres mises en avant/mois', included: true },
        { text: 'Statistiques avancees', included: true },
        { text: 'Export des candidatures', included: true },
        { text: 'Support prioritaire', included: true },
        { text: 'Logo sur les offres', included: true },
      ],
      cta: 'Essai gratuit 14 jours',
      popular: true,
      stripeId: 'pro_monthly',
    },
    {
      id: 'business_monthly',
      name: 'Business',
      price: '149',
      period: '/mois',
      description: 'Pour les grandes entreprises et cabinets RH',
      icon: Crown,
      color: 'purple',
      features: [
        { text: 'Offres illimitees', included: true },
        { text: 'Candidatures illimitees', included: true },
        { text: 'Profil entreprise premium', included: true },
        { text: 'Offres toujours en avant', included: true },
        { text: 'Statistiques et analytics', included: true },
        { text: 'API et integrations', included: true },
        { text: 'Account manager dedie', included: true },
        { text: 'Formation equipe', included: true },
      ],
      cta: 'Contacter les ventes',
      ctaLink: '/contact?subject=business',
      popular: false,
      stripeId: 'business_monthly',
    },
  ];

  const boosts = [
    {
      id: 'boost_7',
      name: 'Boost 7 jours',
      price: '9.99',
      description: 'Votre offre en haut des resultats pendant 7 jours',
      icon: Rocket,
      color: 'green',
      features: ['Position prioritaire', '3x plus de vues', 'Badge "Boost"'],
    },
    {
      id: 'boost_14',
      name: 'Boost 14 jours',
      price: '17.99',
      description: 'Visibilite maximale pendant 2 semaines',
      icon: TrendingUp,
      color: 'blue',
      popular: true,
      features: ['Position prioritaire', '5x plus de vues', 'Badge "Boost"', 'Notification aux candidats'],
    },
    {
      id: 'boost_30',
      name: 'Boost 30 jours',
      price: '29.99',
      description: 'Le meilleur rapport qualite/prix',
      icon: Star,
      color: 'yellow',
      features: ['Position prioritaire', '7x plus de vues', 'Badge "Boost"', 'Notification aux candidats', 'Mise en avant homepage'],
    },
    {
      id: 'featured',
      name: 'A la une',
      price: '49.99',
      description: 'Visibilite maximale - Homepage + Recherche',
      icon: Sparkles,
      color: 'purple',
      features: ['Toujours en premiere position', '10x plus de vues', 'Badge "A la une"', 'Notifications illimitees', 'Mise en avant partout', 'Support dedie'],
    },
  ];

  const handleSubscribe = async (planId) => {
    if (!user) {
      toast.error('Connectez-vous pour souscrire');
      window.location.href = '/connexion';
      return;
    }

    setLoadingPlan(planId);
    try {
      const response = await fetch(`${API_URL}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          package_id: planId,
          origin_url: window.location.origin,
          user_email: user.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Erreur lors de la creation de la session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erreur lors du paiement. Veuillez reessayer.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleBoost = async (boostId) => {
    if (!user) {
      toast.error('Connectez-vous pour booster une offre');
      window.location.href = '/connexion';
      return;
    }

    // TODO: Allow user to select which job to boost
    toast.info('Selectionnez une offre a booster dans votre dashboard');
    window.location.href = '/dashboard/entreprise';
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Badge className="bg-blue-100 text-blue-700 border-0 mb-4">Tarifs</Badge>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Des tarifs adaptes a vos besoins
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Que vous soyez une startup ou une grande entreprise, nous avons le plan qu'il vous faut. 
            Commencez gratuitement et evoluez selon vos besoins.
          </p>
        </div>
      </div>

      {/* Subscription Plans */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
          Abonnements recruteur
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={`relative border-2 transition-all hover:shadow-lg ${
                  plan.popular ? 'border-blue-500 shadow-xl scale-105' : 'border-slate-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white border-0 px-4 py-1">
                      Le plus populaire
                    </Badge>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    plan.color === 'blue' ? 'bg-blue-100' : 
                    plan.color === 'purple' ? 'bg-purple-100' : 'bg-slate-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      plan.color === 'blue' ? 'text-blue-600' : 
                      plan.color === 'purple' ? 'text-purple-600' : 'text-slate-600'
                    }`} />
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 text-sm mb-4">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600"> EUR{plan.period}</span>
                  </div>

                  {plan.stripeId ? (
                    <Button 
                      className={`w-full mb-6 ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                      variant={plan.popular ? 'default' : 'outline'}
                      onClick={() => handleSubscribe(plan.stripeId)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      {plan.cta}
                    </Button>
                  ) : plan.ctaLink ? (
                    <Link to={plan.ctaLink}>
                      <Button 
                        className="w-full mb-6"
                        variant="outline"
                      >
                        {plan.cta}
                      </Button>
                    </Link>
                  ) : null}

                  <div className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-slate-300 shrink-0" />
                        )}
                        <span className={feature.included ? 'text-slate-700' : 'text-slate-400'}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Boost Options */}
      <div className="bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <Badge className="bg-yellow-100 text-yellow-700 border-0 mb-4">
              <Rocket className="w-4 h-4 mr-1" />
              Boosts
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Boostez vos offres d'emploi
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Augmentez la visibilite de vos offres et recevez plus de candidatures qualifiees.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boosts.map((boost) => {
              const Icon = boost.icon;
              const isLoading = loadingPlan === boost.id;
              
              return (
                <Card 
                  key={boost.id}
                  className={`relative border-2 transition-all hover:shadow-lg ${
                    boost.popular ? 'border-blue-500' : 'border-slate-200'
                  }`}
                >
                  {boost.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-blue-600 text-white border-0 text-xs">
                        Populaire
                      </Badge>
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                      boost.color === 'green' ? 'bg-green-100' :
                      boost.color === 'blue' ? 'bg-blue-100' :
                      boost.color === 'yellow' ? 'bg-yellow-100' :
                      'bg-purple-100'
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        boost.color === 'green' ? 'text-green-600' :
                        boost.color === 'blue' ? 'text-blue-600' :
                        boost.color === 'yellow' ? 'text-yellow-600' :
                        'text-purple-600'
                      }`} />
                    </div>

                    <h3 className="font-semibold text-slate-900 mb-1">{boost.name}</h3>
                    <p className="text-sm text-slate-500 mb-4">{boost.description}</p>

                    <div className="mb-4">
                      <span className="text-2xl font-bold text-slate-900">{boost.price}</span>
                      <span className="text-slate-500"> EUR</span>
                    </div>

                    <ul className="space-y-2 mb-6 text-sm">
                      {boost.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-slate-600">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => handleBoost(boost.id)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : null}
                      Booster
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">
          Questions frequentes
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Puis-je changer de plan a tout moment ?
            </h3>
            <p className="text-slate-600 text-sm">
              Oui, vous pouvez upgrader ou downgrader votre plan a tout moment. 
              Les changements prennent effet immediatement.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Comment fonctionne l'essai gratuit ?
            </h3>
            <p className="text-slate-600 text-sm">
              L'essai gratuit de 14 jours vous donne acces a toutes les fonctionnalites 
              du plan Pro sans engagement.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Quels moyens de paiement acceptez-vous ?
            </h3>
            <p className="text-slate-600 text-sm">
              Nous acceptons les cartes bancaires (Visa, Mastercard, American Express) 
              via notre partenaire Stripe securise.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-2">
              Les boosts sont-ils cumulables ?
            </h3>
            <p className="text-slate-600 text-sm">
              Oui, vous pouvez combiner plusieurs boosts sur une meme offre pour 
              maximiser sa visibilite.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-blue-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pret a recruter les meilleurs talents ?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Rejoignez des centaines d'entreprises qui font confiance a Actoos Jobs 
            pour leurs recrutements.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/inscription?type=entreprise">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                Commencer gratuitement
              </Button>
            </Link>
            <Link to="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-blue-700">
                Contacter les ventes
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
