import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '../components/ui/dialog';
import {
  Users, Calendar, FolderTree, Zap, Crown, Rocket, Building2,
  Check, X, ArrowRight, Sparkles, MessageSquare, Code, Palette, CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

const PLAN_FEATURES = {
  startup: {
    name: 'Startup',
    price: 49,
    color: 'from-slate-500 to-slate-600',
    icon: Zap
  },
  starter: {  // Alias for backward compatibility
    name: 'Startup',
    price: 49,
    color: 'from-slate-500 to-slate-600',
    icon: Zap
  },
  pro: {
    name: 'Pro',
    price: 79,
    color: 'from-blue-500 to-blue-600',
    icon: Rocket
  },
  enterprise: {
    name: 'Enterprise',
    price: 129,
    color: 'from-purple-500 to-purple-600',
    icon: Crown
  }
};

const UsageBar = ({ current, max, label, icon: Icon, color = 'blue' }) => {
  const isUnlimited = max === -1;
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Icon className={`w-4 h-4 ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-slate-500'}`} />
          {label}
        </div>
        <span className={`text-sm font-semibold ${isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-900'}`}>
          {current} / {isUnlimited ? '∞' : max}
        </span>
      </div>
      <Progress 
        value={isUnlimited ? 100 : percentage} 
        className={`h-2 ${isUnlimited ? 'bg-emerald-100' : ''}`}
        indicatorClassName={
          isUnlimited ? 'bg-emerald-500' :
          isAtLimit ? 'bg-red-500' : 
          isNearLimit ? 'bg-amber-500' : 
          'bg-blue-500'
        }
      />
      {isAtLimit && (
        <p className="text-xs text-red-600">Limite atteinte - Passez à un plan supérieur</p>
      )}
    </div>
  );
};

const FeatureItem = ({ available, label }) => (
  <div className="flex items-center gap-2 text-sm">
    {available ? (
      <Check className="w-4 h-4 text-emerald-500" />
    ) : (
      <X className="w-4 h-4 text-slate-300" />
    )}
    <span className={available ? 'text-slate-700' : 'text-slate-400'}>
      {label}
    </span>
  </div>
);

const PlanCard = ({ plan, isCurrentPlan, onSelect }) => {
  const planInfo = PLAN_FEATURES[plan.id] || PLAN_FEATURES.starter;
  const Icon = planInfo.icon;

  return (
    <Card className={`relative overflow-hidden transition-all ${isCurrentPlan ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}>
      {isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
          Plan actuel
        </div>
      )}
      <CardHeader className={`bg-gradient-to-r ${planInfo.color} text-white`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="text-white/80 text-sm">{plan.description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-slate-900">{plan.price}€</span>
          <span className="text-slate-500">/mois</span>
        </div>
        
        <div className="space-y-2 pt-2 border-t">
          {plan.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              {feature}
            </div>
          ))}
        </div>

        {!isCurrentPlan && (
          <Button 
            className="w-full mt-4" 
            onClick={() => onSelect(plan.id)}
            variant={plan.id === 'enterprise' ? 'default' : 'outline'}
          >
            {plan.id === 'enterprise' ? 'Contacter les ventes' : 'Passer à ce plan'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const PlanUsageWidget = ({ compact = false }) => {
  const { api } = useAuth();
  const [usage, setUsage] = useState(null);
  const [plans, setPlans] = useState([]);
  const [billingSummary, setBillingSummary] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showChangePlan, setShowChangePlan] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelFeedback, setCancelFeedback] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Raisons de résiliation
  const cancelReasons = [
    { value: 'too_expensive', label: 'Trop cher pour mon budget' },
    { value: 'not_using', label: 'Je n\'utilise pas assez le service' },
    { value: 'missing_features', label: 'Il manque des fonctionnalités' },
    { value: 'switching', label: 'Je passe à un autre logiciel' },
    { value: 'closing_business', label: 'Je ferme mon activité' },
    { value: 'temporary', label: 'Pause temporaire' },
    { value: 'other', label: 'Autre raison' }
  ];

  const handleCancelSubscription = async () => {
    if (!cancelReason) {
      toast.error('Veuillez sélectionner une raison');
      return;
    }
    
    setCancelling(true);
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason,
          feedback: cancelFeedback
        })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Abonnement annulé');
        setShowCancelDialog(false);
        fetchData(); // Refresh data
      } else {
        toast.error(data.detail || 'Erreur lors de l\'annulation');
      }
    } catch (err) {
      toast.error('Erreur de connexion');
    } finally {
      setCancelling(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usageRes, plansRes, billingRes, availablePlansRes] = await Promise.all([
        api.get('/usage'),
        api.get('/plans'),
        api.get('/billing-summary').catch(() => ({ data: null })),
        api.get('/available-plans').catch(() => ({ data: null }))
      ]);
      setUsage(usageRes.data);
      setPlans(plansRes.data);
      if (billingRes.data) {
        setBillingSummary(billingRes.data);
      }
      if (availablePlansRes.data) {
        setAvailablePlans(availablePlansRes.data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePlan = async (newPlanId) => {
    setChangingPlan(true);
    try {
      const res = await api.post(`/change-plan?new_plan_id=${newPlanId}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setShowChangePlan(false);
        fetchData(); // Refresh data
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors du changement de plan');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (planId === 'enterprise') {
      toast.info('Contactez-nous à contact@actoos.com pour le plan Enterprise');
      return;
    }

    try {
      const response = await api.post('/checkout/session', null, {
        params: {
          plan_id: planId,
          origin_url: window.location.origin
        }
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error('Erreur lors de la création de la session de paiement');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-2 bg-slate-200 rounded"></div>
            <div className="h-2 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const currentPlanInfo = PLAN_FEATURES[usage.plan] || PLAN_FEATURES.starter;
  const Icon = currentPlanInfo.icon;
  const isUnlimited = usage.usage.categories.max === -1;

  // Compact version for dashboard sidebar or header
  if (compact) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${currentPlanInfo.color} flex items-center justify-center`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">{usage.plan_name}</p>
                <p className="text-xs text-slate-500">Plan actuel</p>
              </div>
            </div>
            {usage.plan !== 'enterprise' && (
              <Button size="sm" variant="outline" onClick={() => setShowUpgrade(true)}>
                <Sparkles className="w-3 h-3 mr-1" />
                Upgrade
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <UsageBar
              current={usage.usage.technicians.current}
              max={usage.usage.technicians.max}
              label="Techniciens"
              icon={Users}
            />
          </div>

          {/* Upgrade Dialog */}
          <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Changer de plan</DialogTitle>
                <DialogDescription>
                  Choisissez le plan qui correspond à vos besoins
                </DialogDescription>
              </DialogHeader>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                {plans.map(plan => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isCurrentPlan={plan.id === usage.plan}
                    onSelect={handleUpgrade}
                  />
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Full version for settings or dedicated page
  return (
    <div className="space-y-6">
      {/* Current Plan Header */}
      <Card className="overflow-hidden">
        <div className={`bg-gradient-to-r ${currentPlanInfo.color} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{usage.plan_name}</h2>
                <p className="text-white/80">Votre plan actuel</p>
              </div>
            </div>
            {usage.plan !== 'enterprise' && (
              <Button 
                onClick={() => setShowUpgrade(true)}
                className="bg-white text-slate-900 hover:bg-white/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Passer à un plan supérieur
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Usage Stats */}
            <div className="space-y-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-500" />
                Utilisation
              </h3>
              
              <div className="space-y-4">
                <UsageBar
                  current={usage.usage.technicians.current}
                  max={usage.usage.technicians.max}
                  label="Techniciens"
                  icon={Users}
                />
                <UsageBar
                  current={usage.usage.interventions_month.current}
                  max={usage.usage.interventions_month.max}
                  label="Interventions ce mois"
                  icon={Calendar}
                />
                <UsageBar
                  current={usage.usage.categories.current}
                  max={usage.usage.categories.max}
                  label="Catégories"
                  icon={FolderTree}
                />
              </div>
            </div>

            {/* Features */}
            <div className="space-y-6">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-slate-500" />
                Fonctionnalités
              </h3>
              
              <div className="space-y-3">
                <FeatureItem 
                  available={usage.usage.features.sms_included > 0 || usage.usage.features.sms_included === -1}
                  label={
                    usage.usage.features.sms_included === -1 
                      ? 'SMS illimités' 
                      : usage.usage.features.sms_included > 0 
                        ? `${usage.usage.features.sms_included} SMS/mois inclus`
                        : 'SMS non inclus'
                  }
                />
                <FeatureItem 
                  available={usage.usage.features.white_label}
                  label="White-labeling (logo, couleurs personnalisées)"
                />
                <FeatureItem 
                  available={usage.usage.features.api_access}
                  label="Accès API pour intégrations externes"
                />
                <FeatureItem 
                  available={isUnlimited}
                  label="Catégories illimitées"
                />
                <FeatureItem 
                  available={usage.usage.interventions_month.max === -1}
                  label="Interventions illimitées"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Summary */}
      {billingSummary && (
        <Card className="border-blue-100">
          <CardHeader>
            <CardTitle className="text-base text-slate-700 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Résumé de facturation mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-slate-600">Plan {billingSummary.plan_name}</span>
                <span className="font-medium">{billingSummary.base_price}€</span>
              </div>
              
              {billingSummary.technicians.extra > 0 && (
                <div className="flex justify-between items-center py-2 border-b">
                  <div>
                    <span className="text-slate-600">Techniciens supplémentaires</span>
                    <p className="text-xs text-slate-400">
                      {billingSummary.technicians.extra} × {billingSummary.technicians.price_per_extra}€/mois
                    </p>
                  </div>
                  <span className="font-medium text-blue-600">+{billingSummary.technicians.extra_cost}€</span>
                </div>
              )}
              
              <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3">
                <span className="font-semibold text-slate-900">Total mensuel</span>
                <span className="font-bold text-lg text-slate-900">{billingSummary.total_monthly}€</span>
              </div>
            </div>
            
            <div className="text-xs text-slate-500">
              <p>• {billingSummary.technicians.included === -1 ? 'Techniciens illimités' : `${billingSummary.technicians.included} techniciens inclus dans votre plan`}</p>
              {billingSummary.technicians.included !== -1 && (
                <p>• Techniciens supplémentaires : {billingSummary.technicians.price_per_extra}€/mois chacun</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription Management */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base text-slate-700">Gestion de l'abonnement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <div>
              <p className="font-medium text-slate-900">Période d'essai gratuite</p>
              <p className="text-sm text-slate-500">14 jours sans engagement, annulation à tout moment</p>
            </div>
            <Badge className="bg-green-100 text-green-800">Actif</Badge>
          </div>
          
          {/* Change Plan Button */}
          <div className="border-t pt-4">
            <p className="text-sm text-slate-600 mb-3">
              Vous pouvez changer de plan à tout moment.
            </p>
            <Button
              variant="outline"
              className="w-full mb-3"
              onClick={() => setShowChangePlan(true)}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Changer de plan
            </Button>
            
            <p className="text-sm text-slate-600 mb-4">
              Vous pouvez aussi annuler votre abonnement. Si vous annulez pendant la période d'essai, aucun prélèvement ne sera effectué.
            </p>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
              onClick={() => setShowCancelDialog(true)}
            >
              Annuler mon abonnement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Annuler votre abonnement</DialogTitle>
            <DialogDescription>
              Nous sommes désolés de vous voir partir. Aidez-nous à nous améliorer en partageant votre feedback.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Pourquoi souhaitez-vous annuler ? *
              </label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sélectionnez une raison...</option>
                {cancelReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Des commentaires supplémentaires ? (optionnel)
              </label>
              <textarea
                value={cancelFeedback}
                onChange={(e) => setCancelFeedback(e.target.value)}
                placeholder="Dites-nous comment nous pourrions nous améliorer..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Important :</strong> Vous conserverez l'accès à toutes les fonctionnalités jusqu'à la fin de votre période de facturation en cours.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={cancelling}
            >
              {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Changer de plan</DialogTitle>
            <DialogDescription>
              Débloquez plus de fonctionnalités pour développer votre activité
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-3 gap-4 mt-4">
            {plans.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={plan.id === usage.plan}
                onSelect={handleUpgrade}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlan} onOpenChange={setShowChangePlan}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Changer de plan</DialogTitle>
            <DialogDescription>
              Choisissez le plan qui correspond à vos besoins
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {availablePlans.map(plan => (
              <div 
                key={plan.id}
                className={`p-4 border rounded-lg ${
                  plan.is_current 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">{plan.name}</h4>
                      {plan.is_current && (
                        <Badge className="bg-blue-100 text-blue-800">Plan actuel</Badge>
                      )}
                      {plan.change_type === 'upgrade' && (
                        <Badge className="bg-green-100 text-green-800">Upgrade</Badge>
                      )}
                      {plan.change_type === 'downgrade' && (
                        <Badge className="bg-amber-100 text-amber-800">Downgrade</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{plan.description}</p>
                    {plan.change_note && (
                      <p className="text-xs text-slate-400 mt-1">{plan.change_note}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">{plan.price}€</p>
                    <p className="text-sm text-slate-500">/mois</p>
                    {!plan.is_current && (
                      <Button
                        size="sm"
                        className="mt-2"
                        variant={plan.change_type === 'upgrade' ? 'default' : 'outline'}
                        onClick={() => handleChangePlan(plan.id)}
                        disabled={changingPlan}
                      >
                        {changingPlan ? 'Changement...' : plan.change_type === 'upgrade' ? 'Passer à ce plan' : 'Réduire'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-lg p-4 mt-4">
            <h5 className="font-medium text-slate-900 mb-2">Comment ça fonctionne ?</h5>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>• <strong>Upgrade :</strong> Changement immédiat avec facturation au prorata</li>
              <li>• <strong>Downgrade :</strong> Prend effet à la fin de votre période de facturation</li>
              <li>• Vous pouvez changer de plan à tout moment</li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanUsageWidget;
