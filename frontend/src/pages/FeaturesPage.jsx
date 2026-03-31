import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  ArrowRight, Check, Calendar, Users, FileText, MapPin, Camera,
  PenTool, BarChart3, Smartphone, Wifi, WifiOff, Bell, Shield,
  Clock, Zap, Globe, CreditCard, Mail, MessageSquare, Building2,
  Settings, Layers, CheckCircle, ArrowLeft
} from 'lucide-react';

const FeaturesPage = () => {
  const navigate = useNavigate();

  const featureCategories = [
    {
      title: "Dashboard Admin",
      description: "Pilotez votre entreprise depuis un tableau de bord centralisé",
      icon: Building2,
      color: "blue",
      features: [
        { icon: Users, name: "Gestion clients", desc: "Fiches clients complètes avec historique" },
        { icon: FileText, name: "Devis & Factures", desc: "Création, envoi et suivi automatisé" },
        { icon: Calendar, name: "Planning", desc: "Vue calendrier avec drag & drop" },
        { icon: Users, name: "Gestion équipes", desc: "Techniciens, rôles et permissions" },
        { icon: BarChart3, name: "Analytics", desc: "CA, rentabilité, performance" },
        { icon: Settings, name: "Paramètres", desc: "Branding, catégories, templates" },
      ]
    },
    {
      title: "App Technicien (PWA)",
      description: "Une application mobile puissante pour le terrain",
      icon: Smartphone,
      color: "emerald",
      features: [
        { icon: Calendar, name: "Missions du jour", desc: "Liste et détails des interventions" },
        { icon: CheckCircle, name: "Checklists", desc: "Formulaires adaptés au métier" },
        { icon: Camera, name: "Photos", desc: "Avant/après avec géolocalisation" },
        { icon: PenTool, name: "Signature", desc: "Signature client sur écran tactile" },
        { icon: WifiOff, name: "Mode hors ligne", desc: "Fonctionne sans connexion" },
        { icon: MapPin, name: "Géolocalisation", desc: "Navigation et suivi GPS" },
      ]
    },
    {
      title: "Automatisations",
      description: "Gagnez du temps avec des workflows intelligents",
      icon: Zap,
      color: "amber",
      features: [
        { icon: FileText, name: "Devis → Facture", desc: "Conversion automatique après signature" },
        { icon: Bell, name: "Notifications", desc: "Rappels clients et techniciens" },
        { icon: Mail, name: "Emails", desc: "Envoi automatique de documents" },
        { icon: MessageSquare, name: "SMS", desc: "Confirmations de rendez-vous" },
        { icon: CreditCard, name: "Paiements", desc: "Liens de paiement en ligne" },
        { icon: Clock, name: "Rappels", desc: "Échéances et relances" },
      ]
    }
  ];

  const comparisonFeatures = [
    { name: "Gestion clients", startup: true, pro: true, enterprise: true },
    { name: "Devis & Factures", startup: true, pro: true, enterprise: true },
    { name: "Planning interventions", startup: true, pro: true, enterprise: true },
    { name: "App technicien PWA", startup: true, pro: true, enterprise: true },
    { name: "Signature électronique", startup: true, pro: true, enterprise: true },
    { name: "Photos terrain", startup: true, pro: true, enterprise: true },
    { name: "Mode hors ligne", startup: false, pro: true, enterprise: true },
    { name: "Géolocalisation", startup: false, pro: true, enterprise: true },
    { name: "Automatisation devis→facture", startup: false, pro: true, enterprise: true },
    { name: "Analytics avancés", startup: false, pro: true, enterprise: true },
    { name: "Validation chef d'équipe", startup: false, pro: true, enterprise: true },
    { name: "Multi-sites", startup: false, pro: false, enterprise: true },
    { name: "API accès", startup: false, pro: false, enterprise: true },
    { name: "Export comptable", startup: false, pro: false, enterprise: true },
    { name: "White-label", startup: false, pro: false, enterprise: true },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/actoos-logo.svg" alt="Actoos" className="h-10 sm:h-12" />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Connexion
            </Button>
            <Button onClick={() => navigate('/signup')} className="bg-blue-600 hover:bg-blue-700">
              Essai gratuit
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <Button 
            variant="ghost" 
            className="mb-6 text-slate-500"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
          
          <Badge className="mb-6 bg-blue-100 text-blue-700">Fonctionnalités</Badge>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Toutes les fonctionnalités pour gérer votre activité
          </h1>
          
          <p className="text-xl text-slate-600 mb-8">
            Du dashboard admin à l'app terrain, découvrez comment Actoos 
            simplifie chaque aspect de votre gestion d'interventions.
          </p>
        </div>
      </section>

      {/* Feature Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto space-y-24">
          {featureCategories.map((category, catIdx) => {
            const Icon = category.icon;
            const colors = {
              blue: "bg-blue-100 text-blue-600",
              emerald: "bg-emerald-100 text-emerald-600",
              amber: "bg-amber-100 text-amber-600"
            };
            
            return (
              <div key={catIdx}>
                <div className="flex items-center gap-4 mb-8">
                  <div className={`w-14 h-14 rounded-2xl ${colors[category.color]} flex items-center justify-center`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{category.title}</h2>
                    <p className="text-slate-600">{category.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <Card key={idx} className="border-slate-200 hover:border-blue-200 transition-colors">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                              <FeatureIcon className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900 mb-1">{feature.name}</h3>
                              <p className="text-sm text-slate-600">{feature.desc}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-slate-200 text-slate-700">Comparaison</Badge>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Fonctionnalités par plan
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-4 gap-4 p-6 bg-slate-50 border-b border-slate-200 font-semibold">
              <div className="text-slate-600">Fonctionnalité</div>
              <div className="text-center text-slate-900">Startup</div>
              <div className="text-center text-blue-600">Pro</div>
              <div className="text-center text-purple-600">Enterprise</div>
            </div>
            
            {comparisonFeatures.map((feature, idx) => (
              <div 
                key={idx} 
                className={`grid grid-cols-4 gap-4 p-4 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="text-slate-700">{feature.name}</div>
                <div className="text-center">
                  {feature.startup ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
                <div className="text-center">
                  {feature.pro ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
                <div className="text-center">
                  {feature.enterprise ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button 
              size="lg" 
              onClick={() => navigate('/pricing')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Voir les tarifs détaillés
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            Prêt à tester Actoos ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            14 jours d'essai gratuit, sans engagement.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-blue-50"
            onClick={() => navigate('/signup')}
          >
            Démarrer l'essai gratuit
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-slate-900 text-center">
        <p className="text-slate-400">© 2026 Actoos. Tous droits réservés.</p>
      </footer>
    </div>
  );
};

export default FeaturesPage;
