import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchCategories, fetchActiveJobsCount, fetchVerifiedCompaniesCount, fetchCandidatesCount } from '../lib/data';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Search, MapPin, Briefcase, Building2, Users, ChevronRight,
  Star, TrendingUp, Clock, CheckCircle, ArrowRight, Sparkles,
  Globe, Shield, Zap, Heart, Loader2
} from 'lucide-react';
import { formatRelative, CONTRACT_TYPES } from '../lib/utils';

// Hero Section (avec stats ET recherches populaires dynamiques)
const HeroSection = ({ stats, popularSearches = [] }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    navigate(`/emplois?${params.toString()}`);
  };

  const { activeJobs, companies, candidates } = stats || {};

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950 text-white via-blue-900 text-white to-blue-950 text-white">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,...')] opacity-40" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-blue-300/50 rounded-full px-4 py-2 mb-8 animate-slide-down">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-white/90 text-sm font-medium">
              La plateforme de recrutement nouvelle génération
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 font-display leading-tight animate-slide-up">
            Trouvez l'emploi qui
            <span className="block mt-2">
              <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
                change votre vie
              </span>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Des milliers d'opportunités vous attendent. Postulez en un clic et 
            construisez votre carrière avec les meilleures entreprises.
          </p>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-3 max-w-3xl mx-auto animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Poste, compétences ou entreprise..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="pl-12 h-14 border-0 bg-slate-50 text-lg rounded-2xl focus:ring-2 focus:ring-blue-500"
                  data-testid="hero-search-keyword"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ville ou région..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-12 h-14 border-0 bg-slate-50 text-lg rounded-2xl focus:ring-2 focus:ring-blue-500"
                  data-testid="hero-search-location"
                />
              </div>
              <Button 
                type="submit" 
                size="lg" 
                className="h-14 px-8 text-lg bg-blue-600 text-white hover:bg-blue-700 text-white text-white rounded-2xl"
                data-testid="hero-search-button"
              >
                <Search className="w-5 h-5 mr-2" />
                Rechercher
              </Button>
            </div>
          </form>

          {/* Popular searches – DYNAMIQUE */}
          {popularSearches.length > 0 && (
            <div className="mt-8 flex flex-wrap justify-center gap-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <span className="text-blue-200 text-sm">Recherches populaires :</span>
              {popularSearches.map((term) => (
                <Link
                  key={term}
                  to={`/emplois?q=${encodeURIComponent(term)}`}
                  className="text-white/80 hover:text-blue-400 text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-all"
                >
                  {term}
                </Link>
              ))}
            </div>
          )}

          {/* Dynamic Stats */}
          {stats && (
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {activeJobs !== null ? `${activeJobs}+` : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">Offres actives</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {companies !== null ? `${companies}+` : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">Entreprises</p>
              </div>
              <div className="text-center">
                <p className="text-3xl sm:text-4xl font-bold text-white">
                  {candidates !== null ? `${candidates}+` : <Loader2 className="w-6 h-6 animate-spin inline" />}
                </p>
                <p className="text-blue-200 text-sm mt-1">Candidats</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wave bottom */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white"/>
        </svg>
      </div>
    </section>
  );
};

// Categories Section (dynamique, depuis Supabase)
const CategoriesSection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await fetchCategories();
      setCategories(data);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">
            Explorez par catégorie
          </h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Trouvez des opportunités dans votre domaine d'expertise
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/emplois?category=${category.slug}`}
              className="group bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-3xl p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="text-4xl mb-3">{category.icon || '📌'}</div>
              <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 text-sm">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

// Recent Jobs Section (déjà dynamique)
const RecentJobsSection = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id, title, contract_type, salary_min, salary_max, created_at, is_urgent,
            company:companies(name, logo_url),
            city:cities(name)
          `)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;
        
        const formattedJobs = (data || []).map(job => ({
          id: job.id,
          title: job.title,
          company: job.company?.name || 'Entreprise',
          company_logo: job.company?.logo_url,
          location: job.city?.name || 'Non spécifié',
          contract_type: job.contract_type,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          created_at: job.created_at,
          urgent: job.is_urgent
        }));
        
        setJobs(formattedJobs);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">
              Offres récentes
            </h2>
            <p className="text-slate-600 mt-2">
              Les dernières opportunités publiées
            </p>
          </div>
          <Link to="/emplois">
            <Button variant="outline" className="hidden sm:flex border-blue-600 text-blue-600 hover:bg-blue-50">
              Voir toutes les offres
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-slate-200">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Aucune offre disponible</h3>
            <p className="text-slate-600 mb-4">Les premières offres arrivent bientôt !</p>
            <Link to="/inscription?type=entreprise">
              <Button className="bg-blue-600 text-white hover:bg-blue-700 text-white">Publiez la première offre</Button>
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        <div className="text-center mt-10 sm:hidden">
          <Link to="/emplois">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 text-white">
              Voir toutes les offres
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

// Job Card Component
const JobCard = ({ job }) => {
  const contractInfo = CONTRACT_TYPES[job.contract_type] || CONTRACT_TYPES.cdi;
  
  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-slate-200 rounded-3xl overflow-hidden bg-white">
      <CardContent className="p-0">
        {job.urgent && (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs font-medium px-3 py-1 text-center">
            🔥 Urgent - Postulez maintenant
          </div>
        )}
        
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-blue-50 transition-colors">
              {job.company_logo ? (
                <img src={job.company_logo} alt={job.company} className="w-10 h-10 object-contain" />
              ) : (
                <Building2 className="w-7 h-7 text-slate-400 group-hover:text-blue-500" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <Link 
                to={`/emplois/${job.id}`}
                className="font-semibold text-slate-900 hover:text-blue-600 line-clamp-1"
              >
                {job.title}
              </Link>
              <p className="text-slate-600 text-sm mt-1">{job.company}</p>
              
              <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                <Badge className={`${contractInfo.color} border-0 rounded-full`}>
                  {contractInfo.label}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <div className="text-sm">
              <span className="text-slate-500">Salaire: </span>
              <span className="font-medium text-slate-700">
                {job.salary_min && job.salary_max 
                  ? `${(job.salary_min).toLocaleString('fr-FR')} - ${(job.salary_max).toLocaleString('fr-FR')} FCFA`
                  : 'Non précisé'
                }
              </span>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatRelative(job.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// How It Works Section (inchangée, en bleu)
const HowItWorksSection = () => {
  const steps = [
    { icon: Users, title: 'Créez votre profil', description: 'Inscrivez-vous gratuitement et complétez votre profil en quelques minutes.', color: 'bg-blue-500' },
    { icon: Search, title: 'Recherchez des offres', description: 'Parcourez des centaines d\'offres et utilisez nos filtres avancés.', color: 'bg-blue-600 text-white' },
    { icon: Briefcase, title: 'Postulez en un clic', description: 'Envoyez votre candidature directement aux recruteurs.', color: 'bg-blue-700 text-white' },
    { icon: CheckCircle, title: 'Décrochez le job', description: 'Suivez vos candidatures et préparez vos entretiens.', color: 'bg-blue-800 text-white' },
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">
            Comment ça marche ?
          </h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            Trouvez votre emploi idéal en 4 étapes simples
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-slate-200 to-slate-100" />
              )}
              <div className="relative inline-flex">
                <div className={`w-20 h-20 ${step.color} rounded-3xl flex items-center justify-center shadow-lg`}>
                  <step.icon className="w-10 h-10 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-slate-200 rounded-full flex items-center justify-center font-bold text-slate-700">
                  {index + 1}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-lg mt-6 mb-2">{step.title}</h3>
              <p className="text-slate-600 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// CTA Section (bleue)
const CompanyCTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-blue-950 text-white via-blue-900 text-white to-blue-950 text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="bg-white/10 text-white border-blue-300/50 mb-6 rounded-full">
              Pour les entreprises
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-white font-display mb-6">
              Recrutez les meilleurs talents
            </h2>
            <p className="text-blue-100 text-lg mb-8">
              Publiez vos offres, recevez des candidatures qualifiées et 
              trouvez votre prochain collaborateur en quelques jours.
            </p>
            
            <div className="space-y-4 mb-8">
              {['Publication d\'offres illimitées', 'Accès à une base de candidats qualifiés', 'Outils de gestion des candidatures', 'Visibilité premium sur la plateforme'].map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-white">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/entreprises/inscription">
                <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 text-white text-white">
                  Créer un compte entreprise
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <Link to="/tarifs">
                <Button size="lg" variant="outline" className="border-blue-300/50 text-white hover:bg-white/10 rounded-2xl">
                  Voir nos tarifs
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="absolute -top-10 -left-10 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-4 animate-bounce" style={{ animationDuration: '3s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">+45%</p>
                    <p className="text-xs text-slate-500">Candidatures reçues</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-5 -right-5 bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-4 animate-bounce" style={{ animationDuration: '4s', animationDelay: '0.5s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">10K+</p>
                    <p className="text-xs text-slate-500">Candidats actifs</p>
                  </div>
                </div>
              </div>
              
              <div className="w-80 h-80 bg-white/10 backdrop-blur-sm rounded-4xl border border-white/20 flex items-center justify-center">
                <Building2 className="w-32 h-32 text-white/40" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};




// Section "Pourquoi choisir Actoos Jobs ?"
const WhyChooseSection = () => {
  const reasons = [
    {
      icon: Globe,
      title: '100 % gratuit pour les candidats',
      description: 'Créez votre profil, postulez et soyez recruté sans rien payer.',
    },
    {
      icon: Building2,
      title: 'Visibilité immédiate pour les entreprises',
      description: 'Publiez vos offres et touchez des milliers de candidats qualifiés.',
    },
    {
      icon: Shield,
      title: 'Données sécurisées et locales',
      description: 'Vos informations sont hébergées de manière sécurisée et restent au Mali.',
    },
    {
      icon: Zap,
      title: 'Moteur de recherche intelligent',
      description: 'Trouvez l’offre idéale grâce à une recherche rapide et des filtres précis.',
    },
    {
      icon: Heart,
      title: 'Support local réactif',
      description: 'Une équipe basée au Mali, à votre écoute pour vous accompagner.',
    },
    {
      icon: TrendingUp,
      title: 'Statistiques en temps réel',
      description: 'Suivez vos candidatures et la performance de vos offres en direct.',
    },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display">
            Pourquoi choisir Actoos Jobs ?
          </h2>
          <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
            La plateforme de recrutement pensée pour le Mali, par des ingénieurs passionnés.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {reasons.map((reason) => (
            <Card key={reason.title} className="border-0 shadow-lg bg-white rounded-3xl hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <reason.icon className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{reason.title}</h3>
                <p className="text-slate-600 text-sm">{reason.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/inscription">
            <Button size="lg" className="bg-blue-600 text-white hover:bg-blue-700 text-white text-white rounded-2xl">
              Créer un compte gratuit
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

// Main Homepage Component
const Homepage = () => {
  const [activeJobs, setActiveJobs] = useState(null);
  const [companies, setCompanies] = useState(null);
  const [candidates, setCandidates] = useState(null);
  const [popularSearches, setPopularSearches] = useState([]);

  useEffect(() => {
    const loadStats = async () => {
      const [jobsCount, compsCount, candsCount] = await Promise.all([
        fetchActiveJobsCount(),
        fetchVerifiedCompaniesCount(),
        fetchCandidatesCount(),
      ]);
      setActiveJobs(jobsCount);
      setCompanies(compsCount);
      setCandidates(candsCount);
    };
    loadStats();
  }, []);

  // Charger les titres des 4 offres les plus récentes pour les recherches populaires
  useEffect(() => {
    const fetchPopular = async () => {
      const { data } = await supabase
        .from('jobs')
        .select('title')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);
      if (data) setPopularSearches(data.map(j => j.title));
    };
    fetchPopular();
  }, []);

  const stats = { activeJobs, companies, candidates };

  return (
    <div className="min-h-screen">
      <HeroSection stats={stats} popularSearches={popularSearches} />
      <CategoriesSection />
      <RecentJobsSection />
      <HowItWorksSection />
      <CompanyCTASection />
      <WhyChooseSection />
    </div>
  );
};

export default Homepage;