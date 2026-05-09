import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { 
  Check, Loader2, Building, Zap, Crown, ArrowRight, ArrowLeft,
  HardHat, Sparkles, Wrench, Paintbrush, BoltIcon, Droplets,
  Trees, Shield, Settings, Brush, CheckCircle2, X
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { PasswordInput } from '../components/ui/password-input';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// =====================================================
// CATÉGORIES MÉTIER OFFICIELLES ACTOOS
// =====================================================
const BUSINESS_CATEGORIES = [
  {
    id: 'btp',
    name: 'BTP & Travaux',
    icon: HardHat,
    color: 'bg-orange-500',
    description: 'Pour toutes activités liées aux chantiers',
    subcategories: ['Maçonnerie', 'Rénovation', 'Gros œuvre', 'Second œuvre', 'Peinture bâtiment', 'Carrelage', 'Plâtrerie', 'Menuiserie', 'Couverture/toiture', 'Terrassement', 'Chantier général'],
    badge: 'Forte demande'
  },
  {
    id: 'nettoyage',
    name: 'Nettoyage Professionnel',
    icon: Brush,
    color: 'bg-teal-500',
    description: 'Services de propreté et entretien',
    subcategories: ['Nettoyage bureaux', 'Nettoyage industriel', 'Nettoyage fin de chantier', 'Nettoyage vitres', 'Désinfection', 'Entretien immeubles', 'Services de propreté'],
    badge: 'Interventions récurrentes'
  },
  {
    id: 'maintenance',
    name: 'Maintenance & SAV',
    icon: Wrench,
    color: 'bg-blue-500',
    description: 'Contrats d\'entretien et dépannage',
    subcategories: ['Maintenance technique', 'Maintenance industrielle', 'Maintenance bâtiments', 'Contrats d\'entretien', 'Dépannage', 'SAV équipements', 'Inspection technique'],
    badge: 'Abonnements clients'
  },
  {
    id: 'decoration',
    name: 'Décoration & Aménagement',
    icon: Paintbrush,
    color: 'bg-pink-500',
    description: 'Design intérieur et aménagement',
    subcategories: ['Décoration intérieure', 'Home staging', 'Aménagement espaces', 'Pose revêtements', 'Design intérieur', 'Aménagement commercial'],
    badge: 'Devis + missions'
  },
  {
    id: 'electricite',
    name: 'Électricité',
    icon: BoltIcon,
    color: 'bg-yellow-500',
    description: 'Installation et dépannage électrique',
    subcategories: ['Installation électrique', 'Dépannage électrique', 'Mise aux normes', 'Domotique', 'Éclairage professionnel'],
    badge: null
  },
  {
    id: 'plomberie',
    name: 'Plomberie & CVC',
    icon: Droplets,
    color: 'bg-blue-600',
    description: 'Plomberie, chauffage, climatisation',
    subcategories: ['Plomberie', 'Chauffage', 'Climatisation', 'Ventilation', 'Pompes à chaleur', 'Entretien chaudières'],
    badge: null
  },
  {
    id: 'espaces-verts',
    name: 'Espaces Verts & Extérieur',
    icon: Trees,
    color: 'bg-green-500',
    description: 'Jardinage et paysagisme',
    subcategories: ['Jardinage', 'Paysagisme', 'Entretien espaces verts', 'Élagage', 'Arrosage automatique'],
    badge: null
  },
  {
    id: 'securite',
    name: 'Sécurité & Installation',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Systèmes de sécurité',
    subcategories: ['Alarmes', 'Vidéosurveillance', 'Contrôle d\'accès', 'Installation sécurité'],
    badge: null
  },
  {
    id: 'multiservices',
    name: 'Services Techniques Multi-services',
    icon: Settings,
    color: 'bg-slate-600',
    description: 'Pour entreprises polyvalentes',
    subcategories: ['Homme toutes mains', 'Maintenance multiservice', 'Petits travaux', 'Interventions diverses'],
    badge: null
  },
  {
    id: 'specialises',
    name: 'Services Spécialisés',
    icon: Sparkles,
    color: 'bg-purple-500',
    description: 'Catégorie flexible et évolutive',
    subcategories: ['Dératisation', 'Nettoyage spécialisé', 'Inspection drone', 'Services techniques niche'],
    badge: 'Extensible'
  }
];

// Plan Icons
const PlanIcons = {
  startup: Building,
  pro: Zap,
  enterprise: Crown
};

// =====================================================
// SIGNUP PAGE - FLOW COMPLET
// =====================================================
const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // État du workflow
  const [step, setStep] = useState(1); // 1: Plan, 2: Categories, 3: Info, 4: Payment
  
  // Données du formulaire
  const [selectedPlan, setSelectedPlan] = useState(searchParams.get('plan') || null);
  const [billingCycle, setBillingCycle] = useState(searchParams.get('billing') || 'monthly');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [formData, setFormData] = useState({
    entrepriseName: '',
    adminEmail: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    phone: '',
    referralSource: ''
  });
  
  // Sources de découverte
  const referralSources = [
    { value: 'google', label: 'Recherche Google' },
    { value: 'social', label: 'Réseaux sociaux (Facebook, LinkedIn...)' },
    { value: 'recommendation', label: 'Recommandation d\'un collègue/ami' },
    { value: 'ads', label: 'Publicité en ligne' },
    { value: 'article', label: 'Article de blog / Presse' },
    { value: 'event', label: 'Salon / Événement professionnel' },
    { value: 'other', label: 'Autre' }
  ];
  
  // État UI
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Charger les plans au démarrage
  useEffect(() => {
    loadPlans();
  }, []);

  // Si un plan est pré-sélectionné via URL, passer à l'étape 2
  useEffect(() => {
    if (selectedPlan && plans.length > 0) {
      setStep(2);
    }
  }, [selectedPlan, plans]);

  const loadPlans = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/plans`);
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erreur lors du chargement des plans');
    } finally {
      setLoading(false);
    }
  };

  // Obtenir les limites du plan sélectionné
  const getSelectedPlanLimits = () => {
    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return { maxCategories: 1 };
    
    if (selectedPlan === 'enterprise') {
      return { maxCategories: -1 }; // Illimité
    }
    return { maxCategories: plan.limits?.max_categories || 1 };
  };

  // Gérer la sélection de catégorie
  const handleCategoryToggle = (categoryId) => {
    const limits = getSelectedPlanLimits();
    const isSelected = selectedCategories.includes(categoryId);
    
    if (isSelected) {
      setSelectedCategories(prev => prev.filter(id => id !== categoryId));
    } else {
      // Vérifier la limite
      if (limits.maxCategories !== -1 && selectedCategories.length >= limits.maxCategories) {
        toast.error(`Votre plan ${plans.find(p => p.id === selectedPlan)?.name} est limité à ${limits.maxCategories} catégorie(s)`);
        return;
      }
      setSelectedCategories(prev => [...prev, categoryId]);
    }
  };

  // Valider l'étape actuelle
  const validateStep = () => {
    const newErrors = {};
    
    if (step === 1 && !selectedPlan) {
      toast.error('Veuillez sélectionner un plan');
      return false;
    }
    
    if (step === 2 && selectedCategories.length === 0) {
      toast.error('Veuillez sélectionner au moins une catégorie');
      return false;
    }
    
    if (step === 3) {
      if (!formData.entrepriseName.trim()) {
        newErrors.entrepriseName = 'Le nom de l\'entreprise est requis';
      }
      if (!formData.adminEmail.trim()) {
        newErrors.adminEmail = 'L\'email est requis';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
        newErrors.adminEmail = 'Email invalide';
      }
      if (!formData.adminPassword) {
        newErrors.adminPassword = 'Le mot de passe est requis';
      } else if (formData.adminPassword.length < 8) {
        newErrors.adminPassword = 'Le mot de passe doit contenir au moins 8 caractères';
      }
      if (formData.adminPassword !== formData.adminPasswordConfirm) {
        newErrors.adminPasswordConfirm = 'Les mots de passe ne correspondent pas';
      }
      
      setErrors(newErrors);
      if (Object.keys(newErrors).length > 0) {
        toast.error('Veuillez corriger les erreurs');
        return false;
      }
    }
    
    return true;
  };

  // Passer à l'étape suivante
  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  // Revenir à l'étape précédente
  const prevStep = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  // Soumettre l'inscription
  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    
    try {
      const originUrl = window.location.origin;
      
      // Créer la session de paiement avec toutes les infos
      const response = await axios.post(`${API_URL}/api/checkout/session`, null, {
        params: {
          plan_id: selectedPlan,
          origin_url: originUrl,
          entreprise_name: formData.entrepriseName,
          admin_email: formData.adminEmail,
          billing_cycle: billingCycle
        }
      });

      // Stocker les données supplémentaires en localStorage pour après paiement
      localStorage.setItem('signup_data', JSON.stringify({
        categories: selectedCategories,
        password: formData.adminPassword,
        phone: formData.phone,
        referral_source: formData.referralSource,
        billing_cycle: billingCycle,
        session_id: response.data.session_id
      }));

      // Redirection vers Stripe Checkout
      window.location.href = response.data.url;
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du paiement');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentPlan = plans.find(p => p.id === selectedPlan);
  const limits = getSelectedPlanLimits();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo-actoos-pro-full.png" alt="ACTOOS PRO" className="h-10 sm:h-12" />
            </Link>
            
            <Button variant="ghost" onClick={() => navigate('/login')}>
              Déjà inscrit ? Connexion
            </Button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              {[
                { num: 1, label: 'Plan' },
                { num: 2, label: 'Catégories' },
                { num: 3, label: 'Informations' },
                { num: 4, label: 'Paiement' }
              ].map((s, idx) => (
                <React.Fragment key={s.num}>
                  <div 
                    className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-slate-400'}`}
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${step > s.num ? 'bg-blue-600 text-white' : ''}
                      ${step === s.num ? 'bg-blue-600 text-white ring-4 ring-blue-100' : ''}
                      ${step < s.num ? 'bg-slate-200 text-slate-500' : ''}
                    `}>
                      {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium">{s.label}</span>
                  </div>
                  {idx < 3 && (
                    <div className={`w-8 sm:w-16 h-0.5 ${step > s.num ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step 1: Sélection du Plan */}
          {step === 1 && (
            <div className="space-y-8" data-testid="signup-step-plan">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Choisissez votre plan</h1>
                <p className="text-slate-600">Sélectionnez le plan qui correspond à vos besoins</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const Icon = PlanIcons[plan.id] || Building;
                  const isSelected = selectedPlan === plan.id;
                  const isPopular = plan.id === 'pro';
                  
                  return (
                    <Card 
                      key={plan.id}
                      className={`relative cursor-pointer transition-all hover:shadow-lg ${
                        isSelected 
                          ? 'ring-2 ring-blue-600 shadow-lg' 
                          : 'border-slate-200 hover:border-blue-200'
                      }`}
                      onClick={() => setSelectedPlan(plan.id)}
                      data-testid={`signup-plan-${plan.id}`}
                    >
                      {isPopular && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600">
                          Recommandé
                        </Badge>
                      )}
                      
                      <CardHeader className="text-center pt-8 pb-4">
                        <div className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
                          isSelected ? 'bg-blue-600' : 'bg-slate-100'
                        }`}>
                          <Icon className={`w-7 h-7 ${isSelected ? 'text-white' : 'text-slate-600'}`} />
                        </div>
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      
                      <CardContent className="text-center pb-6">
                        <div className="mb-4">
                          <span className="text-4xl font-bold text-slate-900">{plan.price}€</span>
                          <span className="text-slate-500">/mois</span>
                        </div>
                        
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>{plan.limits?.max_technicians === -1 ? 'Techniciens illimités' : `${plan.limits?.max_technicians} techniciens inclus`}</p>
                          <p>{plan.limits?.max_categories === -1 ? 'Toutes catégories' : `${plan.limits?.max_categories} catégorie${plan.limits?.max_categories > 1 ? 's' : ''}`}</p>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-4">
                            <Badge className="bg-blue-600">
                              <Check className="w-3 h-3 mr-1" />
                              Sélectionné
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-center">
                <Button 
                  size="lg"
                  onClick={nextStep}
                  disabled={!selectedPlan}
                  className="bg-blue-600 hover:bg-blue-700 px-12"
                  data-testid="signup-next-step-1"
                >
                  Continuer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Sélection des Catégories */}
          {step === 2 && (
            <div className="space-y-8" data-testid="signup-step-categories">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Choisissez vos catégories métier</h1>
                <p className="text-slate-600">
                  {limits.maxCategories === -1 
                    ? 'Sélectionnez toutes les catégories dont vous avez besoin'
                    : `Votre plan ${currentPlan?.name} vous permet de sélectionner ${limits.maxCategories} catégorie${limits.maxCategories > 1 ? 's' : ''}`
                  }
                </p>
                
                {/* Compteur de sélection */}
                <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">
                    {selectedCategories.length} / {limits.maxCategories === -1 ? '∞' : limits.maxCategories} sélectionnée(s)
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {BUSINESS_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategories.includes(category.id);
                  const isDisabled = !isSelected && limits.maxCategories !== -1 && selectedCategories.length >= limits.maxCategories;
                  
                  return (
                    <Card 
                      key={category.id}
                      className={`relative cursor-pointer transition-all ${
                        isSelected 
                          ? 'ring-2 ring-blue-600 bg-blue-50/50' 
                          : isDisabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:border-blue-200 hover:shadow-md'
                      }`}
                      onClick={() => !isDisabled && handleCategoryToggle(category.id)}
                      data-testid={`signup-category-${category.id}`}
                    >
                      <CardContent className="p-4 flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center ${category.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-slate-900">{category.name}</h3>
                            {category.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {category.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mb-2">{category.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {category.subcategories.slice(0, 3).map((sub, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs font-normal">
                                {sub}
                              </Badge>
                            ))}
                            {category.subcategories.length > 3 && (
                              <Badge variant="outline" className="text-xs font-normal">
                                +{category.subcategories.length - 3}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  size="lg"
                  onClick={nextStep}
                  disabled={selectedCategories.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  data-testid="signup-next-step-2"
                >
                  Continuer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Informations entreprise */}
          {step === 3 && (
            <div className="space-y-8" data-testid="signup-step-info">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Informations de votre entreprise</h1>
                <p className="text-slate-600">Renseignez les informations pour créer votre compte</p>
              </div>

              <Card className="max-w-xl mx-auto">
                <CardContent className="pt-6 space-y-6">
                  {/* Récapitulatif */}
                  <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Plan sélectionné</span>
                      <Badge className="bg-blue-600">{currentPlan?.name} - {currentPlan?.price}€/mois</Badge>
                    </div>
                    <div className="flex items-start justify-between">
                      <span className="text-slate-600">Catégories</span>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[60%]">
                        {selectedCategories.map(catId => {
                          const cat = BUSINESS_CATEGORIES.find(c => c.id === catId);
                          return (
                            <Badge key={catId} variant="outline" className="text-xs">
                              {cat?.name}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Formulaire */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="entrepriseName">Nom de votre entreprise *</Label>
                      <Input
                        id="entrepriseName"
                        placeholder="Ex: Plomberie Martin"
                        value={formData.entrepriseName}
                        onChange={e => setFormData(prev => ({ ...prev, entrepriseName: e.target.value }))}
                        className={errors.entrepriseName ? 'border-red-500' : ''}
                        data-testid="signup-entreprise-name"
                      />
                      {errors.entrepriseName && (
                        <p className="text-sm text-red-500">{errors.entrepriseName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adminEmail">Email administrateur *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="admin@votreentreprise.fr"
                        value={formData.adminEmail}
                        onChange={e => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                        className={errors.adminEmail ? 'border-red-500' : ''}
                        data-testid="signup-admin-email"
                      />
                      {errors.adminEmail && (
                        <p className="text-sm text-red-500">{errors.adminEmail}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone (optionnel)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+32 470 12 34 56"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        data-testid="signup-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="referralSource">Comment avez-vous connu Actoos ?</Label>
                      <select
                        id="referralSource"
                        value={formData.referralSource}
                        onChange={e => setFormData(prev => ({ ...prev, referralSource: e.target.value }))}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        data-testid="signup-referral"
                      >
                        <option value="">Sélectionnez...</option>
                        {referralSources.map(source => (
                          <option key={source.value} value={source.value}>{source.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="adminPassword">Mot de passe *</Label>
                        <PasswordInput
                          id="adminPassword"
                          placeholder="••••••••"
                          value={formData.adminPassword}
                          onChange={e => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))}
                          className={errors.adminPassword ? 'border-red-500' : ''}
                          data-testid="signup-password"
                        />
                        {errors.adminPassword && (
                          <p className="text-sm text-red-500">{errors.adminPassword}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="adminPasswordConfirm">Confirmer *</Label>
                        <PasswordInput
                          id="adminPasswordConfirm"
                          placeholder="••••••••"
                          value={formData.adminPasswordConfirm}
                          onChange={e => setFormData(prev => ({ ...prev, adminPasswordConfirm: e.target.value }))}
                          className={errors.adminPasswordConfirm ? 'border-red-500' : ''}
                          data-testid="signup-password-confirm"
                        />
                        {errors.adminPasswordConfirm && (
                          <p className="text-sm text-red-500">{errors.adminPasswordConfirm}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between max-w-xl mx-auto">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  size="lg"
                  onClick={nextStep}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  data-testid="signup-next-step-3"
                >
                  Vérifier et payer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Récapitulatif et paiement */}
          {step === 4 && (
            <div className="space-y-8" data-testid="signup-step-payment">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Confirmez votre inscription</h1>
                <p className="text-slate-600">Vérifiez les informations avant de procéder au paiement</p>
              </div>

              <Card className="max-w-xl mx-auto">
                <CardContent className="pt-6 space-y-6">
                  {/* Récapitulatif détaillé */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-4 border-b">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        selectedPlan === 'enterprise' ? 'bg-purple-100' :
                        selectedPlan === 'pro' ? 'bg-blue-100' : 'bg-slate-100'
                      }`}>
                        {selectedPlan === 'enterprise' && <Crown className="w-7 h-7 text-purple-600" />}
                        {selectedPlan === 'pro' && <Zap className="w-7 h-7 text-blue-600" />}
                        {selectedPlan === 'startup' && <Building className="w-7 h-7 text-slate-600" />}
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-semibold text-lg text-slate-900">{currentPlan?.name}</h3>
                        <p className="text-slate-500">{currentPlan?.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">{currentPlan?.price}€</p>
                        <p className="text-sm text-slate-500">/mois</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Entreprise</span>
                        <span className="font-medium text-slate-900">{formData.entrepriseName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Email</span>
                        <span className="font-medium text-slate-900">{formData.adminEmail}</span>
                      </div>
                      {formData.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Téléphone</span>
                          <span className="font-medium text-slate-900">{formData.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <p className="text-sm text-slate-600 mb-2">Catégories activées :</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedCategories.map(catId => {
                          const cat = BUSINESS_CATEGORIES.find(c => c.id === catId);
                          const Icon = cat?.icon || Settings;
                          return (
                            <div key={catId} className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                              <div className={`w-6 h-6 rounded flex items-center justify-center ${cat?.color}`}>
                                <Icon className="w-3 h-3 text-white" />
                              </div>
                              <span className="text-sm font-medium text-slate-700">{cat?.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Termes */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Essai gratuit de 14 jours</strong> — Vous ne serez débité qu'après la période d'essai. 
                      Annulez à tout moment.
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    En continuant, vous acceptez nos{' '}
                    <a href="#" className="text-blue-600 hover:underline">conditions d'utilisation</a>{' '}
                    et notre{' '}
                    <a href="#" className="text-blue-600 hover:underline">politique de confidentialité</a>.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between max-w-xl mx-auto">
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <Button 
                  size="lg"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 px-8"
                  data-testid="signup-submit"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    <>
                      Procéder au paiement
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/logo-actoos-pro-full.png" alt="ACTOOS PRO" className="h-8" />
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Actoos. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default SignupPage;
