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

  // Stats counter animation - realistic numbers for a growing startup
  const [stats, setStats] = useState({ entreprises: 0, interventions: 0, satisfaction: 0 });
  
  useEffect(() => {
    const targets = { entreprises: 50, interventions: 2500, satisfaction: 97 };
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
      name: "Marc D.",
      role: "Gérant, entreprise de plomberie",
      content: "Très pratique pour gérer nos interventions au quotidien. L'app mobile fonctionne bien et mes techniciens s'y sont vite habitués.",
      rating: 5
    },
    {
      name: "Sophie L.",
      role: "Responsable, société de maintenance",
      content: "Le mode hors ligne est vraiment utile sur nos chantiers. On gagne du temps sur la partie administrative.",
      rating: 5
    },
    {
      name: "Jean-Pierre M.",
      role: "Artisan électricien",
      content: "Solution simple et efficace. Le passage de devis à facture est rapide et le support répond vite quand j'ai des questions.",
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
              <img src="/logo-actoos-icon.png" alt="ACTOOS PRO" className="h-10 sm:h-12" />
              <span className="hidden sm:inline font-bold text-lg text-slate-900">ACTOOS PRO</span>
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
                className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25"
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
            <Button className="w-full bg-emerald-600" onClick={() => navigate('/signup')}>
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
              <Badge className="mb-6 bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-4 py-1.5">
                <Sparkles className="w-3 h-3 mr-1" />
                14 jours d'essai gratuit
              </Badge>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                Gérez vos interventions terrain
                <span className="text-emerald-600"> simplement</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-600 mb-4 leading-relaxed">
                Run your business, simply.
              </p>
              <p className="text-base text-slate-500 mb-8 leading-relaxed">
                Le logiciel tout-en-un pour les entreprises de services : 
                planning, devis, factures, techniciens... Tout est connecté.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/25 text-base px-8"
                  onClick={() => navigate('/signup')}
                >
                  Démarrer gratuitement
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-base"
                  onClick={() => navigate('/demo')}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Voir la démo
                </Button>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  14 jours gratuits
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Annulation facile
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
                  <span className="ml-4 text-slate-400 text-xs">actoos.com/dashboard</span>
                </div>
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 p-8 min-h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl bg-emerald-600 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="w-10 h-10 text-white" />
                    </div>
                    <p className="text-slate-600 font-medium">Dashboard ACTOOS PRO</p>
                    <p className="text-slate-400 text-sm">Gérez tout depuis un seul endroit</p>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">Intervention terminée</p>
                    <p className="text-xs text-slate-500">Il y a 2 min</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-xl p-4 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-emerald-600" />
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
      <section className="py-10 sm:py-16 px-4 bg-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 md:gap-12 text-center">
            <div className="py-2">
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">{stats.entreprises}+</p>
              <p className="text-slate-400 text-xs sm:text-sm">Entreprises</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-slate-700"></div>
            <div className="sm:hidden w-16 h-px bg-slate-700"></div>
            <div className="py-2">
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">{stats.interventions.toLocaleString()}+</p>
              <p className="text-slate-400 text-xs sm:text-sm">Interventions</p>
            </div>
            <div className="hidden sm:block w-px h-12 bg-slate-700"></div>
            <div className="sm:hidden w-16 h-px bg-slate-700"></div>
            <div className="py-2">
              <p className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-1">{stats.satisfaction}%</p>
              <p className="text-slate-400 text-xs sm:text-sm">Satisfaction</p>
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
                <Card key={idx} className="border-slate-200 hover:border-emerald-200 hover:shadow-lg transition-all group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 group-hover:bg-emerald-600 transition-colors flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
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
            <Badge className="mb-4 bg-emerald-100 text-emerald-700">Secteurs</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Adapté à votre métier
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              ACTOOS PRO s'adapte à votre secteur d'activité avec des 
              workflows et checklists personnalisés.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {sectors.map((sector, idx) => (
              <div 
                key={idx}
                className="bg-white rounded-xl p-6 text-center border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer"
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
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6">
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
            <Badge className="mb-4 bg-emerald-600/20 text-emerald-400">Témoignages</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Ce que disent nos utilisateurs
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
      <section className="py-24 px-4 bg-gradient-to-br from-emerald-600 to-emerald-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Prêt à simplifier votre gestion terrain ?
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Rejoignez les entreprises qui font confiance à ACTOOS PRO.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-emerald-600 hover:bg-emerald-50 text-base px-8"
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
          <p className="text-emerald-200 text-sm mt-6">
            14 jours d'essai gratuit • Annulation à tout moment • Support inclus
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <img src="/logo-actoos-icon.png" alt="ACTOOS PRO" className="h-10" />
                <span className="font-bold text-white">ACTOOS PRO</span>
              </div>
              <p className="text-emerald-400 text-sm font-medium mb-2">
                Run your business, simply.
              </p>
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
              <h4 className="font-semibold text-white mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:contact@actoos.com" className="text-slate-400 hover:text-white">contact@actoos.com</a></li>
                <li><Link to="/demo" className="text-slate-400 hover:text-white">Demander une démo</Link></li>
                <li><Link to="/login" className="text-slate-400 hover:text-white">Connexion</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/legal" className="text-slate-400 hover:text-white">Mentions légales</Link></li>
                <li><Link to="/terms" className="text-slate-400 hover:text-white">Conditions d'utilisation</Link></li>
                <li><Link to="/privacy" className="text-slate-400 hover:text-white">Confidentialité</Link></li>
                <li><Link to="/cookies" className="text-slate-400 hover:text-white">Cookies</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} ACTOOS PRO. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
