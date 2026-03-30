import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Check, Loader2, Sparkles, Building, Zap, Crown, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Plan Icons
const PlanIcons = {
  startup: Building,
  starter: Building,  // Alias for backward compatibility
  pro: Zap,
  enterprise: Crown
};

// Pricing Page Component
export const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    loadPlans();
    
    // Check if returning from cancelled checkout
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
    setSelectedPlan(planId);
    navigate(`/signup?plan=${planId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/actoos-logo.jpg" alt="Actoos" className="h-10 object-contain" />
          </div>
          <Button variant="outline" onClick={() => navigate('/login')} className="border-white/20 text-white hover:bg-white/10">
            Se connecter
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Le logiciel tout-en-un pour piloter vos opérations terrain
        </h1>
        <p className="text-xl text-blue-200 max-w-2xl mx-auto mb-8">
          Plomberie, électricité, nettoyage, maintenance, BTP... 
          Gérez vos interventions, techniciens et factures en un seul endroit.
        </p>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {plans.map((plan, index) => {
            const Icon = PlanIcons[plan.id] || Building;
            const isPopular = plan.id === 'pro';
            
            return (
              <Card 
                key={plan.id}
                className={`relative overflow-hidden transition-all hover:scale-105 ${
                  isPopular 
                    ? 'border-2 border-blue-500 shadow-xl shadow-blue-500/20' 
                    : 'border-slate-700 bg-slate-800/50'
                }`}
                data-testid={`plan-card-${plan.id}`}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                    POPULAIRE
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <div className={`w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    isPopular ? 'bg-blue-500' : 'bg-slate-700'
                  }`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <CardTitle className={`text-2xl ${isPopular ? 'text-slate-900' : 'text-white'}`}>{plan.name}</CardTitle>
                  <CardDescription className={isPopular ? 'text-slate-600' : 'text-slate-400'}>{plan.description}</CardDescription>
                </CardHeader>
                
                <CardContent className="text-center">
                  <div className="mb-6">
                    <span className={`text-4xl font-bold ${isPopular ? 'text-blue-600' : 'text-white'}`}>{plan.price}€</span>
                    <span className={isPopular ? 'text-slate-600' : 'text-slate-400'}>/mois</span>
                  </div>
                  
                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className={`flex items-start gap-2 ${isPopular ? 'text-slate-700' : 'text-slate-300'}`}>
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className={`w-full ${isPopular ? 'bg-blue-500 hover:bg-blue-600' : ''}`}
                    variant={isPopular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    Choisir ce plan
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-8">Pourquoi choisir Actoos ?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'App Technicien', desc: 'PWA offline-first pour vos équipes terrain' },
              { title: 'Multi-secteurs', desc: 'Checklists adaptées à chaque métier' },
              { title: 'White-label', desc: 'Votre marque, vos couleurs, votre logo' }
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 mx-auto mb-4 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
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
          <p>&copy; 2026 Actoos. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

// Signup Page Component
export const SignupPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const planId = searchParams.get('plan') || 'starter';
  
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
          admin_email: formData.adminEmail
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

  if (loadingPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <img src="/actoos-logo.jpg" alt="Actoos" className="h-12 object-contain" />
          </div>
          <CardTitle className="text-xl text-white">Créer votre compte</CardTitle>
          {plan && (
            <div className="mt-4 p-4 bg-slate-700/50 rounded-lg">
              <p className="text-slate-300">Plan sélectionné :</p>
              <p className="text-2xl font-bold text-white">{plan.name}</p>
              <p className="text-blue-400 font-semibold">{plan.price}€/mois</p>
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
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={loading}
              data-testid="signup-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Redirection vers le paiement...
                </>
              ) : (
                <>
                  Continuer vers le paiement
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>
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

// Success Page Component
export const SignupSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState('checking');
  const [attempts, setAttempts] = useState(0);
  const [finalized, setFinalized] = useState(false);

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
      
      if (response.data.payment_status === 'paid') {
        // Finalize signup with stored data
        if (!finalized) {
          await finalizeSignup();
        }
        setStatus('success');
        toast.success('Paiement réussi ! Votre compte a été créé.');
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
      // Get stored signup data from localStorage
      const storedData = localStorage.getItem('signup_data');
      if (storedData) {
        const { categories, password, phone } = JSON.parse(storedData);
        
        await axios.post(`${API_URL}/api/finalize-signup/${sessionId}`, null, {
          params: {
            categories: categories.join(','),
            password: password || '',
            phone: phone || ''
          }
        });
        
        // Clear stored data
        localStorage.removeItem('signup_data');
        setFinalized(true);
      }
    } catch (error) {
      console.error('Error finalizing signup:', error);
      // Non-blocking error - account is still created
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/90 border-slate-700 text-center">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <img src="/actoos-logo.jpg" alt="Actoos" className="h-12 object-contain" />
          </div>
        </CardHeader>
        
        <CardContent className="py-8">
          {status === 'checking' && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-blue-400 mx-auto" />
              <p className="text-white text-lg">Vérification du paiement...</p>
              <p className="text-slate-400">Veuillez patienter</p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-500/20 mx-auto flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white">Bienvenue sur Actoos !</h2>
              <p className="text-slate-300">
                Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.
              </p>
              <Button 
                className="bg-blue-500 hover:bg-blue-600"
                onClick={() => navigate('/login')}
              >
                Se connecter
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
                La session de paiement a expiré. Veuillez réessayer.
              </p>
              <Button onClick={() => navigate('/pricing')}>
                Réessayer
              </Button>
            </div>
          )}
          
          {status === 'timeout' && (
            <div className="space-y-4">
              <p className="text-yellow-400">
                La vérification prend plus de temps que prévu. 
                Si vous avez payé, vérifiez votre email pour vos identifiants.
              </p>
              <Button onClick={() => navigate('/login')}>
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
