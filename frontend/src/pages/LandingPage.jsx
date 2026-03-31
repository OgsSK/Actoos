import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import {
  ArrowRight, Check, Play, Star, Users, Zap, Shield, Clock,
  Smartphone, FileText, MapPin, Camera, PenTool, Calendar,
  BarChart3, Building2, Wrench, Sparkles, ChevronRight,
  CheckCircle, ArrowUpRight, Menu, X
} from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Stats counter animation
  const [stats, setStats] = useState({ entreprises: 0, interventions: 0, satisfaction: 0 });
  
  useEffect(() => {
    const targets = { entreprises: 500, interventions: 50000, satisfaction: 98 };
    const duration = 2000;
    const steps = 50;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      setStats({
        entreprises: Math.round((targets.entreprises / steps) * step),
        interventions: Math.round((targets.interventions / steps) * step),
        satisfaction: Math.round((targets.satisfaction / steps) * step)
      });
      if (step >= steps) clearInterval(timer);
    }, interval);
    
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Planning intelligent",
      description: "Planifiez et optimisez les tournées de vos techniciens en quelques clics."
    },
    {
      icon: Smartphone,
      title: "App terrain PWA",
      description: "Vos techniciens travaillent depuis leur téléphone, même sans connexion."
    },
    {
      icon: FileText,
      title: "Devis & Factures",
      description: "Créez des devis, convertissez-les en factures automatiquement."
    },
    {
      icon: PenTool,
      title: "Signature électronique",
      description: "Faites signer vos clients directement sur le terrain."
    },
    {
      icon: Camera,
      title: "Photos avant/après",
      description: "Documentez chaque intervention avec photos géolocalisées."
    },
    {
      icon: BarChart3,
      title: "Analytics",
      description: "Suivez votre CA, rentabilité et performance en temps réel."
    }
  ];

  const sectors = [
    { name: "Plomberie", icon: "🔧" },
    { name: "Électricité", icon: "⚡" },
    { name: "Climatisation", icon: "❄️" },
    { name: "Nettoyage", icon: "🧹" },
    { name: "BTP", icon: "🏗️" },
    { name: "Maintenance", icon: "🔩" },
    { name: "Serrurerie", icon: "🔑" },
    { name: "Jardinage", icon: "🌿" }
  ];

  const testimonials = [
    {
      name: "Jean-Pierre M.",
      role: "Gérant, Plomberie Express",
      content: "Actoos a transformé notre façon de travailler. Mes techniciens sont plus efficaces et mes clients reçoivent leurs factures instantanément.",
      rating: 5
    },
    {
      name: "Sophie L.",
      role: "Directrice, CleanPro Services",
      content: "Le mode hors ligne est parfait pour nos équipes qui travaillent dans des zones mal couvertes. Un gain de temps énorme !",
      rating: 5
    },
    {
      name: "Marc D.",
      role: "Fondateur, Élec Solutions",
      content: "Enfin un logiciel pensé pour le terrain. L'app technicien est intuitive et mes gars l'ont adoptée en quelques heures.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <img src="/actoos-logo.svg" alt="Actoos" className="h-10 sm:h-12" />
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/features" className="text-slate-600 hover:text-slate-900 transition-colors">
                Fonctionnalités
              </Link>
              <Link to="/sectors" className="text-slate-600 hover:text-slate-900 transition-colors">
                Secteurs
              </Link>
              <Link to="/pricing" className="text-slate-600 hover:text-slate-900 transition-colors">
                Tarifs
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate('/login')}>
                Connexion
              </Button>
              <Button 
                onClick={() => navigate('/signup')} 
                className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25"
              >
                Essai gratuit
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>

            {/* Mobile menu button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-4">
            <Link to="/features" className="block text-slate-600 py-2">Fonctionnalités</Link>
            <Link to="/sectors" className="block text-slate-600 py-2">Secteurs</Link>
            <Link to="/pricing" className="block text-slate-600 py-2">Tarifs</Link>
            <hr className="my-2" />
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Connexion
            </Button>
            <Button className="w-full bg-blue-600" onClick={() => navigate('/signup')}>
              Essai gratuit
            </Button>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-6 bg-blue-100 text-blue-700 hover:bg-blue-100 px-4 py-1.5">
                <Sparkles className="w-3 h-3 mr-1" />
                14 jours d'essai gratuit
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Gérez vos interventions terrain
                <span className="text-blue-600"> simplement</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 mb-8 leading-relaxed">
                Le logiciel tout-en-un pour les entreprises de services : 
                planning, devis, factures, techniciens... Tout est connecté.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/25 text-base px-8"
                  onClick={() => navigate('/signup')}
                >
                  Démarrer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base"
                  onClick={() => navigate('/features')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Voir la démo
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Sans carte bancaire
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Installation en 2 minutes
                </div>
              </div>
            </div>

            {/* Hero Image/Mockup */}
            <div className="relative">
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
                <div className="bg-slate-900 px-4 py-2 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="ml-4 text-slate-400 text-xs">app.actoos.com</span>
                </div>
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-blue-600 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Dashboard Actoos</p>
                    <p className="text-slate-400 text-sm">Gérez tout depuis un seul endroit</p>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Intervention terminée</p>
                    <p className="text-xs text-slate-500">Il y a 2 min</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Devis signé</p>
                    <p className="text-xs text-slate-500">1 250,00 €</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-16 px-4 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">{stats.entreprises}+</p>
              <p className="text-slate-400">Entreprises</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">{stats.interventions.toLocaleString()}+</p>
              <p className="text-slate-400">Interventions</p>
            </div>
            <div>
              <p className="text-4xl sm:text-5xl font-bold text-white mb-2">{stats.satisfaction}%</p>
              <p className="text-slate-400">Satisfaction</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-100 text-slate-700">Fonctionnalités</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Un logiciel complet pour gérer votre activité de A à Z, 
              de la prise de rendez-vous à la facturation.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="border-slate-200 hover:border-blue-200 hover:shadow-lg transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 group-hover:bg-blue-600 transition-colors flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-semibold text-lg text-slate-900 mb-2">{feature.title}</h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/features')}
            >
              Voir toutes les fonctionnalités
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* Sectors Section */}
      <section className="py-24 px-4 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700">Secteurs</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Adapté à votre métier
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Actoos s'adapte à votre secteur d'activité avec des 
              workflows et checklists personnalisés.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sectors.map((sector, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl p-6 text-center border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
              >
                <span className="text-4xl mb-3 block">{sector.icon}</span>
                <p className="font-medium text-slate-900">{sector.name}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => navigate('/sectors')}
            >
              Découvrir les secteurs
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-slate-100 text-slate-700">Comment ça marche</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Démarrez en 3 étapes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Créez votre compte",
                description: "Inscription gratuite en 2 minutes. Configurez votre entreprise et votre équipe."
              },
              {
                step: "2",
                title: "Invitez vos techniciens",
                description: "Ils reçoivent un lien pour installer l'app sur leur téléphone."
              },
              {
                step: "3",
                title: "Gérez vos interventions",
                description: "Planifiez, suivez et facturez depuis votre tableau de bord."
              }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="font-semibold text-xl text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-600/20 text-blue-400">Témoignages</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ils nous font confiance
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, idx) => (
              <Card key={idx} className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="font-semibold text-white">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-600 to-blue-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre gestion terrain ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez des centaines d'entreprises qui font confiance à Actoos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-blue-50 text-base px-8"
              onClick={() => navigate('/signup')}
            >
              Essayer gratuitement 14 jours
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 text-base"
              onClick={() => navigate('/pricing')}
            >
              Voir les tarifs
            </Button>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Sans engagement • Sans carte bancaire • Support inclus
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <img src="/actoos-logo-white.svg" alt="Actoos" className="h-10" />
              <p className="text-slate-400 text-sm">
                Le logiciel de gestion d'interventions terrain pour les professionnels.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/features" className="text-slate-400 hover:text-white">Fonctionnalités</Link></li>
                <li><Link to="/pricing" className="text-slate-400 hover:text-white">Tarifs</Link></li>
                <li><Link to="/sectors" className="text-slate-400 hover:text-white">Secteurs</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Ressources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white">Blog</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white">Support</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-slate-400 hover:text-white">Mentions légales</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white">CGV</a></li>
                <li><a href="#" className="text-slate-400 hover:text-white">Confidentialité</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Actoos SPRL. Tous droits réservés.
            </p>
            <p className="text-slate-500 text-sm">
              Belgique 🇧🇪 • Conforme RGPD • TVA BE0123.456.789
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
