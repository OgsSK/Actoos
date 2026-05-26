import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Check, X, Zap, Building2, Crown } from 'lucide-react';

const PricingPage = () => {
  const plans = [
    {
      name: 'Gratuit',
      price: '0',
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
    },
    {
      name: 'Pro',
      price: '49 000',
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
      ctaLink: '/inscription?type=entreprise&plan=pro',
      popular: true,
    },
    {
      name: 'Business',
      price: '149 000',
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
    },
  ];

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

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card 
                key={plan.name}
                className={`relative border-2 ${plan.popular ? 'border-blue-500 shadow-xl scale-105' : 'border-slate-200'}`}
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
                    <span className="text-slate-600"> FCFA{plan.period}</span>
                  </div>

                  <Link to={plan.ctaLink}>
                    <Button 
                      className={`w-full mb-6 ${
                        plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''
                      }`}
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>

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

        {/* FAQ */}
        <div className="mt-20">
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
                Nous acceptons les cartes bancaires, Orange Money, et les virements 
                bancaires pour les plans annuels.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 mb-2">
                Y a-t-il des frais caches ?
              </h3>
              <p className="text-slate-600 text-sm">
                Non, tous nos tarifs sont transparents. Vous payez uniquement le prix 
                affiche, sans frais supplementaires.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 bg-blue-600 rounded-3xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pret a recruter les meilleurs talents ?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto">
            Rejoignez des centaines d'entreprises qui font confiance a Actoos Jobs 
            pour leurs recrutements au Mali.
          </p>
          <div className="flex justify-center gap-4">
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
