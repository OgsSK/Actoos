import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { 
  Check, X, ArrowRight, Building, Zap, Crown, 
  HelpCircle, ChevronRight, Users, Layers, Globe,
  Sparkles, MessageSquare
} from 'lucide-react';

// =====================================================
// PAGE PRICING PROFESSIONNELLE ACTOOS PRO
// Tarifs officiels 2026 avec -20% annuel
// =====================================================

const PricingPage = () => {
  const navigate = useNavigate();
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly'); // monthly or yearly

  // Questions du quiz
  const quizQuestions = [
    {
      id: 'team_size',
      question: "Combien de techniciens avez-vous ?",
      icon: Users,
      options: [
        { value: 'solo', label: "Je suis seul ou avec 1-2 techniciens", points: { startup: 3, pro: 1, enterprise: 0 } },
        { value: 'small', label: "3 à 10 techniciens", points: { startup: 1, pro: 3, enterprise: 1 } },
        { value: 'large', label: "Plus de 10 techniciens", points: { startup: 0, pro: 1, enterprise: 3 } }
      ]
    },
    {
      id: 'activities',
      question: "Combien d'activités différentes exercez-vous ?",
      icon: Layers,
      options: [
        { value: 'one', label: "Une seule activité (ex: plomberie uniquement)", points: { startup: 3, pro: 1, enterprise: 0 } },
        { value: 'few', label: "2 à 4 activités", points: { startup: 0, pro: 3, enterprise: 1 } },
        { value: 'many', label: "5+ activités ou entreprise multi-métiers", points: { startup: 0, pro: 1, enterprise: 3 } }
      ]
    },
    {
      id: 'locations',
      question: "Intervenez-vous sur plusieurs sites par client ?",
      icon: Globe,
      options: [
        { value: 'no', label: "Non, une adresse par client suffit", points: { startup: 3, pro: 2, enterprise: 0 } },
        { value: 'sometimes', label: "Parfois, quelques clients ont plusieurs sites", points: { startup: 1, pro: 2, enterprise: 2 } },
        { value: 'yes', label: "Oui, beaucoup de nos clients ont plusieurs sites", points: { startup: 0, pro: 0, enterprise: 3 } }
      ]
    },
    {
      id: 'features',
      question: "Quelles fonctionnalités sont essentielles pour vous ?",
      icon: Sparkles,
      options: [
        { value: 'basic', label: "Devis, factures, planning basique", points: { startup: 3, pro: 1, enterprise: 0 } },
        { value: 'advanced', label: "Mode hors ligne, géoloc, analytics", points: { startup: 0, pro: 3, enterprise: 1 } },
        { value: 'premium', label: "API, white-label, exports comptables", points: { startup: 0, pro: 0, enterprise: 3 } }
      ]
    }
  ];

  // Calculer la recommandation
  const calculateRecommendation = (answers) => {
    const scores = { startup: 0, pro: 0, enterprise: 0 };
    
    Object.values(answers).forEach(answer => {
      if (answer?.points) {
        scores.startup += answer.points.startup;
        scores.pro += answer.points.pro;
        scores.enterprise += answer.points.enterprise;
      }
    });

    if (scores.enterprise >= scores.pro && scores.enterprise >= scores.startup) {
      return 'enterprise';
    } else if (scores.pro >= scores.startup) {
      return 'pro';
    }
    return 'startup';
  };

  const handleQuizAnswer = (option) => {
    const newAnswers = { ...quizAnswers, [quizQuestions[quizStep].id]: option };
    setQuizAnswers(newAnswers);

    if (quizStep < quizQuestions.length - 1) {
      setQuizStep(quizStep + 1);
    } else {
      const recommendation = calculateRecommendation(newAnswers);
      setRecommendedPlan(recommendation);
    }
  };

  const resetQuiz = () => {
    setQuizStep(0);
    setQuizAnswers({});
    setRecommendedPlan(null);
    setShowQuiz(false);
  };

  // Définition des plans ACTOOS PRO (Tarifs officiels 2026)
  const plans = [
    {
      id: 'startup',
      name: 'Startup',
      description: 'Pour artisans et auto-entrepreneurs',
      price: 19.99,
      priceYearly: 15.99,  // 191.90€/an = 15.99€/mois (-20%)
      annualTotal: 191.90,
      icon: Building,
      color: 'slate',
      popular: false,
      cta: 'Démarrer →',
      limits: {
        admins: '1',
        technicians: '3',
        extraTechPrice: '5€/mois',
        categories: '1',
        interventions: 'Illimité'
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'Pour PME en croissance',
      price: 49.99,
      priceYearly: 39.99,  // 479.90€/an = 39.99€/mois (-20%)
      annualTotal: 479.90,
      icon: Zap,
      color: 'emerald',
      popular: true,
      cta: 'Essayer gratuitement →',
      limits: {
        admins: '3',
        technicians: '10',
        extraTechPrice: '5€/mois',
        categories: '4',
        interventions: 'Illimité'
      }
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      description: 'Pour entreprises structurées',
      price: 89.99,
      priceYearly: 71.99,  // 863.90€/an = 71.99€/mois (-20%)
      annualTotal: 863.90,
      icon: Crown,
      color: 'purple',
      popular: false,
      cta: 'S\'abonner →',
      limits: {
        admins: 'Illimité',
        technicians: 'Illimité',
        extraTechPrice: 'Inclus',
        categories: 'Toutes',
        interventions: 'Illimité'
      }
    }
  ];

  // Features comparatives ACTOOS PRO
  const featureCategories = [
    {
      name: 'Utilisateurs',
      features: [
        { name: 'Administrateurs', startup: '1', pro: '3', enterprise: 'Illimité' },
        { name: 'Techniciens inclus', startup: '3', pro: '10', enterprise: 'Illimité' },
        { name: 'Technicien supplémentaire', startup: '+5€/mois', pro: '+5€/mois', enterprise: 'Inclus' },
        { name: 'Interventions / mois', startup: 'Illimité', pro: 'Illimité', enterprise: 'Illimité' },
      ]
    },
    {
      name: 'Gestion métier',
      features: [
        { name: 'Catégories métier', startup: '1', pro: 'Jusqu\'à 4', enterprise: 'Toutes' },
        { name: 'Gestion clients', startup: true, pro: true, enterprise: true },
        { name: 'Devis & Factures', startup: true, pro: true, enterprise: true },
        { name: 'Planning interventions', startup: true, pro: true, enterprise: true },
        { name: 'Signature électronique', startup: true, pro: true, enterprise: true },
        { name: 'Multi-sites par client', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Application technicien',
      features: [
        { name: 'App PWA mobile', startup: true, pro: true, enterprise: true },
        { name: 'Photos interventions', startup: 'Limité', pro: 'Illimité', enterprise: 'Illimité' },
        { name: 'Checklists dynamiques', startup: true, pro: true, enterprise: true },
        { name: 'Mode hors ligne', startup: false, pro: true, enterprise: true },
        { name: 'Géolocalisation', startup: false, pro: true, enterprise: true },
        { name: 'GPS avancé temps réel', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Automatisation',
      features: [
        { name: 'Devis → Facture auto', startup: false, pro: true, enterprise: true },
        { name: 'Rapports PDF auto', startup: false, pro: true, enterprise: true },
        { name: 'Notifications push', startup: true, pro: true, enterprise: true },
        { name: 'Validation chef équipe', startup: false, pro: true, enterprise: true },
        { name: 'Workflows personnalisés', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Analytics & Exports',
      features: [
        { name: 'Statistiques basiques', startup: true, pro: true, enterprise: true },
        { name: 'Analytics avancés', startup: false, pro: true, enterprise: true },
        { name: 'Export comptable', startup: false, pro: false, enterprise: true },
        { name: 'KPI personnalisés', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Personnalisation',
      features: [
        { name: 'Logo sur documents', startup: true, pro: true, enterprise: true },
        { name: 'Branding avancé', startup: false, pro: true, enterprise: true },
        { name: 'White-label complet', startup: false, pro: false, enterprise: true },
        { name: 'Portail client personnalisé', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Intégrations',
      features: [
        { name: 'Paiement en ligne', startup: 'Basique', pro: 'Complet', enterprise: 'Complet' },
        { name: 'Google Calendar', startup: false, pro: true, enterprise: true },
        { name: 'Accès API', startup: false, pro: false, enterprise: true },
        { name: 'Intégrations comptables', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Support',
      features: [
        { name: 'Support email', startup: true, pro: true, enterprise: true },
        { name: 'Support prioritaire', startup: false, pro: true, enterprise: true },
        { name: 'Support dédié 24/7', startup: false, pro: false, enterprise: true },
        { name: 'Formation personnalisée', startup: false, pro: false, enterprise: true },
      ]
    },
    {
      name: 'Communications',
      features: [
        { name: 'SMS inclus / mois', startup: '0', pro: '50', enterprise: '500' },
        { name: 'Notifications email', startup: true, pro: true, enterprise: true },
        { name: 'Notifications WhatsApp', startup: false, pro: true, enterprise: true },
      ]
    }
  ];

  const renderFeatureValue = (value) => {
    if (value === true) {
      return <Check className="w-5 h-5 text-green-500 mx-auto" />;
    }
    if (value === false) {
      return <X className="w-5 h-5 text-slate-300 mx-auto" />;
    }
    return <span className="text-sm text-slate-700 font-medium">{value}</span>;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-actoos-icon.png" alt="ACTOOS PRO" className="h-10 sm:h-12" />
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Fonctionnalités
              </Link>
              <Link to="/sectors" className="text-slate-600 hover:text-slate-900 transition-colors">
                Secteurs
              </Link>
              <Link to="/pricing" className="text-emerald-600 font-medium">
                Tarifs
              </Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Connexion
              </Button>
              <Button 
                onClick={() => navigate('/signup')} 
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Essai gratuit
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-20">
        {/* Hero */}
        <section className="text-center px-4 mb-16">
          <Badge className="mb-4 bg-emerald-100 text-emerald-700">14 jours d'essai gratuit • Sans carte bancaire</Badge>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Tarifs <span className="text-emerald-600">ACTOOS PRO</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8">
            Choisissez le plan adapté à votre entreprise. Évoluez à tout moment.
          </p>

          {/* Quiz CTA */}
          {!showQuiz && !recommendedPlan && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setShowQuiz(true)}
              className="mb-8 border-emerald-300 hover:border-emerald-500"
            >
              <HelpCircle className="w-5 h-5 mr-2" />
              Pas sûr ? Trouvez votre plan en 30 secondes
            </Button>
          )}

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <span className={billingCycle === 'monthly' ? 'text-slate-900 font-medium' : 'text-slate-500'}>
              Mensuel
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-emerald-600' : 'bg-slate-200'
              }`}
              data-testid="billing-toggle"
            >
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
              }`} />
            </button>
            <span className={billingCycle === 'yearly' ? 'text-slate-900 font-medium' : 'text-slate-500'}>
              Annuel
            </span>
            {billingCycle === 'yearly' && (
              <Badge className="bg-amber-100 text-amber-700">-20%</Badge>
            )}
          </div>
        </section>

        {/* Quiz Modal */}
        {showQuiz && !recommendedPlan && (
          <section className="max-w-2xl mx-auto px-4 mb-16">
            <Card className="border-2 border-emerald-200 shadow-xl">
              <CardHeader className="text-center">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline">Question {quizStep + 1}/{quizQuestions.length}</Badge>
                  <Button variant="ghost" size="sm" onClick={resetQuiz}>
                    Passer le quiz
                  </Button>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
                  {React.createElement(quizQuestions[quizStep].icon, { className: "w-6 h-6 text-emerald-600" })}
                </div>
                <CardTitle className="text-xl">{quizQuestions[quizStep].question}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quizQuestions[quizStep].options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuizAnswer(option)}
                    className="w-full p-4 text-left border-2 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all"
                  >
                    {option.label}
                  </button>
                ))}
              </CardContent>
              <CardFooter className="justify-center">
                <div className="flex gap-1">
                  {quizQuestions.map((_, idx) => (
                    <div 
                      key={idx} 
                      className={`w-2 h-2 rounded-full ${idx <= quizStep ? 'bg-emerald-600' : 'bg-slate-200'}`} 
                    />
                  ))}
                </div>
              </CardFooter>
            </Card>
          </section>
        )}

        {/* Quiz Result */}
        {recommendedPlan && (
          <section className="max-w-2xl mx-auto px-4 mb-16">
            <Card className="border-2 border-emerald-200 bg-emerald-50/50">
              <CardContent className="pt-6 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto mb-4 flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Nous vous recommandons ACTOOS PRO {plans.find(p => p.id === recommendedPlan)?.name}
                </h3>
                <p className="text-slate-600 mb-4">
                  Basé sur vos réponses, ce plan correspond le mieux à vos besoins.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate(`/signup?plan=${recommendedPlan}&billing=${billingCycle}`)} className="bg-emerald-600 hover:bg-emerald-700">
                    Choisir ce plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <Button variant="outline" onClick={resetQuiz}>
                    Voir tous les plans
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Plans Cards */}
        <section className="max-w-6xl mx-auto px-4 mb-20">
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon;
              const isRecommended = recommendedPlan === plan.id;
              const price = billingCycle === 'yearly' ? plan.priceYearly : plan.price;
              const annualSavings = billingCycle === 'yearly' ? ((plan.price * 12) - plan.annualTotal).toFixed(0) : 0;
              
              return (
                <Card 
                  key={plan.id}
                  className={`relative transition-all ${
                    plan.popular || isRecommended
                      ? 'border-2 border-emerald-500 shadow-xl scale-105 z-10' 
                      : 'border-slate-200 hover:border-emerald-200 hover:shadow-lg'
                  }`}
                  data-testid={`plan-card-${plan.id}`}
                >
                  {(plan.popular || isRecommended) && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-emerald-600 px-4">
                        {isRecommended ? 'Recommandé pour vous' : 'Le plus populaire'}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pt-8">
                    <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                      plan.color === 'emerald' ? 'bg-emerald-100' :
                      plan.color === 'purple' ? 'bg-purple-100' : 'bg-slate-100'
                    }`}>
                      <Icon className={`w-7 h-7 ${
                        plan.color === 'emerald' ? 'text-emerald-600' :
                        plan.color === 'purple' ? 'text-purple-600' : 'text-slate-600'
                      }`} />
                    </div>
                    <CardTitle className="text-2xl">ACTOOS PRO {plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="text-center">
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-slate-900">{price.toFixed(2).replace('.', ',')}€</span>
                      <span className="text-slate-500">/mois</span>
                      {billingCycle === 'yearly' && (
                        <>
                          <p className="text-sm text-emerald-600 mt-1">
                            Économisez {annualSavings}€/an
                          </p>
                          <p className="text-xs text-slate-500">
                            Facturé {plan.annualTotal.toFixed(2).replace('.', ',')}€/an
                          </p>
                        </>
                      )}
                    </div>
                    
                    <div className="space-y-3 text-left mb-6">
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>{plan.limits.admins} admin{plan.limits.admins !== '1' ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>{plan.limits.technicians} technicien{plan.limits.technicians !== '1' ? 's' : ''}</span>
                        {plan.limits.extraTechPrice !== 'Inclus' && (
                          <span className="text-slate-400">({plan.limits.extraTechPrice} sup.)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>{plan.limits.categories} catégorie{plan.limits.categories !== '1' ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500" />
                        <span>Interventions illimitées</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button 
                      className={`w-full ${
                        plan.popular || isRecommended
                          ? 'bg-emerald-600 hover:bg-emerald-700' 
                          : ''
                      }`}
                      variant={plan.popular || isRecommended ? 'default' : 'outline'}
                      onClick={() => navigate(`/signup?plan=${plan.id}&billing=${billingCycle}`)}
                      data-testid={`select-plan-${plan.id}`}
                    >
                      {plan.cta}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Feature Comparison Table */}
        <section className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Comparaison détaillée</h2>
            <p className="text-slate-600">Tout ce qui est inclus dans chaque plan ACTOOS PRO</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-4 px-4 w-1/3"></th>
                  {plans.map(plan => (
                    <th key={plan.id} className="text-center py-4 px-4">
                      <div className="font-bold text-lg">{plan.name}</div>
                      <div className="text-sm text-slate-500">{plan.price.toFixed(2).replace('.', ',')}€/mois</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-slate-50">
                      <td colSpan={4} className="py-3 px-4 font-semibold text-slate-700">
                        {category.name}
                      </td>
                    </tr>
                    {category.features.map((feature, featIdx) => (
                      <tr key={featIdx} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="py-3 px-4 text-slate-600">{feature.name}</td>
                        <td className="py-3 px-4 text-center">{renderFeatureValue(feature.startup)}</td>
                        <td className="py-3 px-4 text-center">{renderFeatureValue(feature.pro)}</td>
                        <td className="py-3 px-4 text-center">{renderFeatureValue(feature.enterprise)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 mt-20">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Questions fréquentes</h2>
          
          <div className="space-y-6">
            {[
              {
                q: "Puis-je changer de plan à tout moment ?",
                a: "Oui, vous pouvez upgrader ou downgrader votre plan à tout moment. Le changement prend effet immédiatement et la facturation est ajustée au prorata."
              },
              {
                q: "Comment fonctionne l'essai gratuit ?",
                a: "Vous bénéficiez de 14 jours d'essai gratuit sur le plan de votre choix, avec toutes les fonctionnalités. Une carte bancaire est requise mais vous ne serez pas débité avant la fin de l'essai. Annulez à tout moment."
              },
              {
                q: "Que se passe-t-il si je dépasse mes limites ?",
                a: "Vous recevrez une notification avant d'atteindre vos limites. Vous pourrez alors ajouter des techniciens supplémentaires (5€/mois chacun) ou upgrader vers un plan supérieur."
              },
              {
                q: "Les données sont-elles sécurisées ?",
                a: "Absolument. Toutes les données sont chiffrées, hébergées en Europe (conformes RGPD). Vos photos terrain sont automatiquement nettoyées des métadonnées GPS pour protéger la vie privée de vos clients."
              }
            ].map((faq, idx) => (
              <div key={idx} className="border-b border-slate-200 pb-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-4xl mx-auto px-4 mt-20 text-center">
          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 border-0 text-white">
            <CardContent className="py-12">
              <h2 className="text-3xl font-bold mb-4">Prêt à simplifier votre gestion terrain ?</h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                Rejoignez des centaines d'entreprises qui font confiance à ACTOOS PRO. 
                14 jours d'essai gratuit, sans engagement.
              </p>
              <Button 
                size="lg" 
                className="bg-white text-emerald-600 hover:bg-emerald-50"
                onClick={() => navigate('/signup')}
              >
                Commencer gratuitement
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-12 px-4 border-t bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <img src="/branding/actoos-pro-logo.png" alt="ACTOOS PRO" className="h-10" onError={(e) => { e.target.src = '/actoos-logo.svg'; }} />
              <p className="text-sm text-slate-500 mt-4">
                Le logiciel de gestion d'interventions terrain pour les professionnels.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="text-slate-500 hover:text-slate-900">Fonctionnalités</Link></li>
                <li><Link to="/pricing" className="text-slate-500 hover:text-slate-900">Tarifs</Link></li>
                <li><Link to="/sectors" className="text-slate-500 hover:text-slate-900">Secteurs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-500 hover:text-slate-900">Documentation</a></li>
                <li><a href="mailto:contact@actoos.com" className="text-slate-500 hover:text-slate-900">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="text-slate-500 hover:text-slate-900">CGV</Link></li>
                <li><Link to="/privacy" className="text-slate-500 hover:text-slate-900">Confidentialité</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-slate-500">
            <p>© {new Date().getFullYear()} ACTOOS PRO. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
