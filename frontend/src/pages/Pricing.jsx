import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Check, Loader2, Sparkles, Building, Zap, Crown, ArrowRight, CheckCircle, Gift, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Plan Icons
const PlanIcons = {
  startup: Building,
  starter: Building,
  pro: Zap,
  enterprise: Crown
};

// Pricing Page Component - ACTOOS PRO
export const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadPlans();
    if (searchParams.get('cancelled') === 'true') {
      toast.error('Paiement annulé');
    }
  }, [searchParams]);

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

  const handleSelectPlan = (planId) => {
    navigate(`/signup?plan=${planId}&billing=${billingCycle}`);
  };

  const getDisplayPrice = (plan) => {
    if (billingCycle === 'yearly') {
      return plan.price_annual;
    }
    return plan.price;
  };

  const getMonthlyEquivalent = (plan) => {
    if (billingCycle === 'yearly') {
      return (plan.price_annual / 12).toFixed(2);
    }
    return plan.price;
  };

  const getSavings = (plan) => {
    const monthlyTotal = plan.price * 12;
    const yearlyTotal = plan.price_annual;
    return (monthlyTotal - yearlyTotal).toFixed(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/branding/actoos-pro-logo.png" alt="ACTOOS PRO" className="h-10" onError={(e) => { e.target.src = '/actoos-logo.svg'; }} />
          </div>
          <Button variant="outline" onClick={() => navigate('/login')} className="border-white/20 text-white hover:bg-white/10">
            Se connecter
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 px-4 text-center">
        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 mb-4">
          <Gift className="w-4 h-4 mr-1" /> 14 jours d'essai gratuit
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Tarifs <span className="text-emerald-400">ACTOOS PRO</span>
        </h1>
        <p className="text-xl text-emerald-200 max-w-2xl mx-auto mb-8">
          Plomberie, électricité, nettoyage, maintenance, BTP... 
          Gérez vos interventions, techniciens et factures en un seul endroit.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-3 rounded-lg font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            data-testid="billing-monthly"
          >
            Mensuel
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
              billingCycle === 'yearly'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
            data-testid="billing-yearly"
          >
            <Calendar className="w-4 h-4" />
            Annuel
            <Badge className="bg-amber-500 text-black text-xs ml-1">-20%</Badge>
          </button>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const Icon = PlanIcons[plan.id] || Building;
            const isPopular = plan.recommended || plan.id === 'pro';
            const displayPrice = getDisplayPrice(plan);
            const monthlyEq = getMonthlyEquivalent(plan);
            const savings = getSavings(plan);
            
            return (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:scale-105 ${
                  isPopular 
                    ? 'border-2 border-emerald-500 shadow-xl shadow-emerald-500/20 bg-white' 
                    : 'border-slate-700 bg-slate-800/50'
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAIRE
                  </div>
                )}
                
                {billingCycle === 'yearly' && (
                  <div className="absolute top-0 left-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-br-lg">
                    -{savings}€/an
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    isPopular ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className={`text-2xl ${isPopular ? 'text-slate-900' : 'text-white'}`}>
                    ACTOOS PRO {plan.name}
                  </CardTitle>
                  <CardDescription className={isPopular ? 'text-slate-600' : 'text-slate-400'}>
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    {billingCycle === 'yearly' ? (
                      <>
                        <span className={`text-4xl font-bold ${isPopular ? 'text-emerald-600' : 'text-white'}`}>
                          {displayPrice}€
                        </span>
                        <span className={isPopular ? 'text-slate-600' : 'text-slate-400'}>/an</span>
                        <p className={`text-sm mt-1 ${isPopular ? 'text-slate-500' : 'text-slate-500'}`}>
                          soit {monthlyEq}€/mois
                        </p>
                      </>
                    ) : (
                      <>
                        <span className={`text-4xl font-bold ${isPopular ? 'text-emerald-600' : 'text-white'}`}>
                          {displayPrice}€
                        </span>
                        <span className={isPopular ? 'text-slate-600' : 'text-slate-400'}>/mois</span>
                      </>
                    )}
                  </div>

                  {/* Limits summary */}
                  <div className={`mb-4 p-3 rounded-lg ${isPopular ? 'bg-emerald-50' : 'bg-slate-700/50'}`}>
                    <div className={`text-sm ${isPopular ? 'text-slate-700' : 'text-slate-300'}`}>
                      <span className="font-semibold">{plan.limits?.max_admins === -1 ? '∞' : plan.limits?.max_admins}</span> admin(s) • 
                      <span className="font-semibold ml-1">{plan.limits?.max_technicians === -1 ? '∞' : plan.limits?.max_technicians}</span> tech(s) inclus
                    </div>
                    {plan.price_per_extra_tech > 0 && (
                      <div className={`text-xs mt-1 ${isPopular ? 'text-slate-500' : 'text-slate-400'}`}>
                        +{plan.price_per_extra_tech}€/tech supplémentaire
                      </div>
                    )}
                  </div>
                  
                  <ul className="space-y-2 text-left text-sm">
                    {plan.features.slice(0, 8).map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2 ${isPopular ? 'text-slate-700' : 'text-slate-300'}`}>
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 8 && (
                      <li className={`text-xs ${isPopular ? 'text-slate-500' : 'text-slate-400'}`}>
                        + {plan.features.length - 8} autres fonctionnalités...
                      </li>
                    )}
                  </ul>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-2">
                  <Button 
                    className={`w-full ${isPopular ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-700 hover:bg-slate-600'}`}
                    onClick={() => handleSelectPlan(plan.id)}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    Essai gratuit 14 jours
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                  <p className={`text-xs text-center ${isPopular ? 'text-slate-500' : 'text-slate-400'}`}>
                    Sans engagement • Sans carte bancaire
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-8 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Paiement sécurisé Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Résiliation à tout moment</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span>Support réactif</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Pourquoi choisir ACTOOS PRO ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'App Technicien', desc: 'PWA offline-first pour vos équipes terrain' },
              { title: 'Multi-secteurs', desc: 'Checklists adaptées à chaque métier' },
              { title: 'White-label', desc: 'Votre marque, vos couleurs, votre logo' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto text-center text-slate-500">
          <p>&copy; 2026 ACTOOS PRO. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

// Signup Page Component - ACTOOS PRO
export const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan') || 'startup';
  const billingCycle = searchParams.get('billing') || 'monthly';
  
  const [plan, setPlan] = useState(null);
  const [formData, setFormData] = useState({
    entrepriseName: '',
    adminEmail: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    loadPlanDetails();
  }, [planId]);

  const loadPlanDetails = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/plans`);
      const selectedPlan = response.data.find(p => p.id === planId);
      setPlan(selectedPlan);
    } catch (error) {
      console.error('Error loading plan:', error);
    } finally {
      setLoadingPlan(false);
    }
  };

  const getDisplayPrice = () => {
    if (!plan) return { price: 0, period: 'mois' };
    if (billingCycle === 'yearly') {
      return { price: plan.price_annual, period: 'an' };
    }
    return { price: plan.price, period: 'mois' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.entrepriseName.trim() || !formData.adminEmail.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    
    try {
      const originUrl = window.location.origin;
      
      const response = await axios.post(`${API_URL}/api/checkout/session`, null, {
        params: {
          plan_id: planId,
          origin_url: originUrl,
          entreprise_name: formData.entrepriseName,
          admin_email: formData.adminEmail,
          billing_cycle: billingCycle === 'yearly' ? 'yearly' : 'monthly'
        }
      });

      // Redirect to Stripe Checkout
      window.location.href = response.data.url;
      
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du paiement');
      setLoading(false);
    }
  };

  const priceInfo = getDisplayPrice();

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/branding/actoos-pro-logo.png" alt="ACTOOS PRO" className="h-10" onError={(e) => { e.target.src = '/actoos-logo.svg'; }} />
          </div>
          <CardTitle className="text-xl text-white">Créer votre compte ACTOOS PRO</CardTitle>
          {plan && (
            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-300">Plan sélectionné :</p>
              <p className="text-2xl font-bold text-white">ACTOOS PRO {plan.name}</p>
              <p className="text-emerald-400 font-semibold">{priceInfo.price}€/{priceInfo.period}</p>
              {billingCycle === 'yearly' && (
                <Badge className="mt-2 bg-amber-500 text-black">-20% annuel</Badge>
              )}
              <div className="mt-2 flex items-center justify-center gap-2 text-emerald-300 text-sm">
                <Gift className="w-4 h-4" />
                <span>14 jours d'essai gratuit</span>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nom de votre entreprise</Label>
              <Input
                placeholder="Ex: Plomberie Martin"
                value={formData.entrepriseName}
                onChange={e => setFormData(prev => ({ ...prev, entrepriseName: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="signup-entreprise-name"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-300">Email administrateur</Label>
              <Input
                type="email"
                placeholder="admin@votreentreprise.fr"
                value={formData.adminEmail}
                onChange={e => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                data-testid="signup-admin-email"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-emerald-500 hover:bg-emerald-600"
              disabled={loading}
              data-testid="signup-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirection vers Stripe...
                </>
              ) : (
                <>
                  Démarrer l'essai gratuit
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-slate-400 text-center mt-4">
            Aucune carte bancaire requise pour l'essai
          </p>
        </CardContent>
        
        <CardFooter className="flex flex-col gap-4">
          <p className="text-xs text-slate-500 text-center">
            En continuant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
          </p>
          <Button 
            variant="link" 
            className="text-slate-400"
            onClick={() => navigate('/pricing')}
          >
            Changer de plan
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

// Success Page Component - ACTOOS PRO
export const SignupSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const [finalized, setFinalized] = useState(false);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    }
  }, [sessionId]);

  const pollPaymentStatus = async () => {
    if (attempts >= 10) {
      setStatus('timeout');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/api/checkout/status/${sessionId}`);
      
      // Accept both paid and trialing as success
      if (response.data.payment_status === 'paid' || response.data.payment_status === 'trialing') {
        setIsTrial(response.data.payment_status === 'trialing');
        if (!finalized) {
          await finalizeSignup();
        }
        setStatus('success');
        toast.success(response.data.payment_status === 'trialing' 
          ? 'Essai gratuit activé ! Votre compte a été créé.'
          : 'Paiement réussi ! Votre compte a été créé.'
        );
      } else if (response.data.status === 'expired') {
        setStatus('expired');
      } else {
        // Continue polling
        setAttempts(prev => prev + 1);
        setTimeout(pollPaymentStatus, 2000);
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setAttempts(prev => prev + 1);
      setTimeout(pollPaymentStatus, 2000);
    }
  };

  const finalizeSignup = async () => {
    try {
      const storedData = localStorage.getItem('signup_data');
      if (storedData) {
        const { categories, password, phone, referral_source } = JSON.parse(storedData);
        
        await axios.post(`${API_URL}/api/finalize-signup/${sessionId}`, null, {
          params: {
            categories: categories.join(','),
            password: password || '',
            phone: phone || '',
            referral_source: referral_source || ''
          }
        });
        
        localStorage.removeItem('signup_data');
        setFinalized(true);
      }
    } catch (error) {
      console.error('Error finalizing signup:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-center">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <img src="/branding/actoos-pro-logo.png" alt="ACTOOS PRO" className="h-10" onError={(e) => { e.target.src = '/actoos-logo.svg'; }} />
          </div>
        </CardHeader>
        
        <CardContent className="py-8">
          {status === 'checking' && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-emerald-400 mx-auto" />
              <p className="text-white text-lg">Activation de votre compte...</p>
              <p className="text-slate-400">Veuillez patienter</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Bienvenue sur ACTOOS PRO !</h2>
              {isTrial ? (
                <div className="space-y-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                    <Gift className="w-4 h-4 mr-1" /> Essai gratuit de 14 jours activé
                  </Badge>
                  <p className="text-slate-300">
                    Votre compte a été créé avec succès. Profitez de toutes les fonctionnalités pendant 14 jours.
                  </p>
                </div>
              ) : (
                <p className="text-slate-300">
                  Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
                </p>
              )}
              <p className="text-sm text-slate-400">
                Vérifiez votre email pour vos identifiants de connexion.
              </p>
              <Button 
                className="bg-emerald-500 hover:bg-emerald-600"
                onClick={() => navigate('/login')}
              >
                Se connecter
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
          
          {status === 'expired' && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-500/20 mx-auto flex items-center justify-center">
                <span className="text-4xl">⏰</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Session expirée</h2>
              <p className="text-slate-300">
                La session a expiré. Veuillez réessayer.
              </p>
              <Button onClick={() => navigate('/pricing')} className="bg-emerald-500 hover:bg-emerald-600">
                Réessayer
              </Button>
            </div>
          )}
          
          {status === 'timeout' && (
            <div className="space-y-4">
              <p className="text-yellow-400">
                La vérification prend plus de temps que prévu. 
                Vérifiez votre email pour vos identifiants.
              </p>
              <Button onClick={() => navigate('/login')} className="bg-emerald-500 hover:bg-emerald-600">
                Aller à la connexion
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PricingPage;
