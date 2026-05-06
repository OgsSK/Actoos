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
  Check, X, ArrowRight, Sparkles, MessageSquare, Code, Palette, CreditCard, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const PLAN_FEATURES = {
  startup: {
    name: 'Startup',
    price: 19.99,
    color: 'from-slate-500 to-slate-600',
    icon: Zap
  },
  starter: {  // Alias for backward compatibility
    name: 'Startup',
    price: 19.99,
    color: 'from-slate-500 to-slate-600',
    icon: Zap
  },
  pro: {
    name: 'Pro',
    price: 49.99,
    color: 'from-blue-500 to-blue-600',
    icon: Rocket
  },
  enterprise: {
    name: 'Entreprise',
    price: 89.99,
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

// Simplified features for each plan (max 5 key features)
const PLAN_KEY_FEATURES = {
  startup: [
    '1 admin, 3 techniciens',
    '1 catégorie',
    'Devis & factures',
    'App PWA terrain',
    'Signature électronique'
  ],
  pro: [
    '3 admins, 10 techniciens',
    'Jusqu\'à 4 catégories',
    'Mode hors ligne',
    'Planning intelligent',
    'Branding avancé'
  ],
  enterprise: [
    'Utilisateurs illimités',
    'Toutes catégories',
    'Multi-sites',
    'API accès',
    'White-label complet'
  ]
};

const PlanCard = ({ plan, isCurrentPlan, onSelect }) => {
  const planInfo = PLAN_FEATURES[plan.id] || PLAN_FEATURES.starter;
  const Icon = planInfo.icon;
  const keyFeatures = PLAN_KEY_FEATURES[plan.id] || PLAN_KEY_FEATURES.startup;

  return (
    <Card className={`relative overflow-hidden transition-all flex flex-col ${
      isCurrentPlan 
        ? 'ring-2 ring-blue-500 shadow-xl scale-[1.02]' 
        : 'hover:shadow-lg hover:scale-[1.01]'
    }`}>
      {isCurrentPlan && (
        <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-bl-xl font-semibold z-10">
          Plan actuel
        </div>
      )}
      
      {/* Header with gradient */}
      <div className={`bg-gradient-to-br ${planInfo.color} p-4 sm:p-5 text-white`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold">{plan.name}</h3>
          </div>
        </div>
        
        {/* Price - more prominent */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-black">{plan.price}€</span>
          <span className="text-white/70 text-sm sm:text-base">/mois</span>
        </div>
      </div>
      
      {/* Features - simplified */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col">
        <div className="space-y-2.5 flex-1">
          {keyFeatures.map((feature, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm sm:text-base text-slate-700 font-medium leading-tight">
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        {!isCurrentPlan && (
          <Button 
            className={`w-full mt-5 h-11 sm:h-12 text-sm sm:text-base font-semibold ${
              plan.id === 'enterprise' 
                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            onClick={() => onSelect(plan.id)}
          >
            Choisir ce plan
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
        {isCurrentPlan && (
          <div className="mt-5 h-11 sm:h-12 flex items-center justify-center bg-slate-100 rounded-lg text-slate-500 font-medium">
            Votre plan actuel
          </div>
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') {
      toast.error('Veuillez taper SUPPRIMER pour confirmer');
      return;
    }
    
    setDeleting(true);
    try {
      const API_URL = process.env.REACT_APP_BACKEND_URL;
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/auth/delete-account`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Compte supprimé définitivement');
        // Clear auth and redirect
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        toast.error(data.detail || 'Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur de connexion');
    } finally {
      setDeleting(false);
    }
  };

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
      // Fetch data from Supabase instead of Railway API
      const { supabase } = await import('../lib/supabase');
      const entrepriseId = user?.entreprise_id;
      
      if (!entrepriseId) {
        setLoading(false);
        return;
      }

      // Get entreprise data for plan info
      const { data: entreprise } = await supabase
        .from('entreprises')
        .select('plan, subscription_status, subscription_end_date, max_users, max_interventions, max_clients')
        .eq('id', entrepriseId)
        .single();

      // Count current usage
      const [usersCount, interventionsCount, clientsCount, techniciensCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('entreprise_id', entrepriseId),
        supabase.from('interventions').select('id', { count: 'exact', head: true }).eq('entreprise_id', entrepriseId),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('entreprise_id', entrepriseId).neq('statut', 'archive'),
        supabase.from('users').select('id', { count: 'exact', head: true }).eq('entreprise_id', entrepriseId).in('role', ['technicien'])
      ]);

      // Set default limits based on plan
      const planLimits = {
        startup: { users: 3, techniciens: 2, clients: 100, interventions: 500 },
        starter: { users: 3, techniciens: 2, clients: 100, interventions: 500 },
        pro: { users: 10, techniciens: 5, clients: 500, interventions: 2000 },
        enterprise: { users: -1, techniciens: -1, clients: -1, interventions: -1 } // Unlimited
      };

      const currentPlan = entreprise?.plan || 'startup';
      const limits = planLimits[currentPlan] || planLimits.startup;

      setUsage({
        plan: currentPlan,
        subscription_status: entreprise?.subscription_status || 'active',
        subscription_end_date: entreprise?.subscription_end_date,
        usage: {
          users: { current: usersCount.count || 0, max: entreprise?.max_users || limits.users },
          techniciens: { current: techniciensCount.count || 0, max: limits.techniciens },
          clients: { current: clientsCount.count || 0, max: entreprise?.max_clients || limits.clients },
          interventions: { current: interventionsCount.count || 0, max: entreprise?.max_interventions || limits.interventions },
          features: {
            api_access: currentPlan === 'enterprise',
            white_label: currentPlan === 'enterprise',
            support_priority: currentPlan !== 'startup'
          }
        }
      });

      // Set available plans
      setPlans({
        startup: PLAN_FEATURES.startup,
        pro: PLAN_FEATURES.pro,
        enterprise: PLAN_FEATURES.enterprise
      });

      setAvailablePlans([
        { id: 'startup', ...PLAN_FEATURES.startup },
        { id: 'pro', ...PLAN_FEATURES.pro },
        { id: 'enterprise', ...PLAN_FEATURES.enterprise }
      ]);

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
      const errorMsg = error.response?.data?.detail || '';
      // If no active subscription, redirect to checkout instead
      if (errorMsg.includes('Aucun abonnement actif') || errorMsg.includes('souscrire')) {
        toast.info('Redirection vers la page de paiement...');
        setShowChangePlan(false);
        handleUpgrade(newPlanId);
      } else {
        toast.error(errorMsg || 'Erreur lors du changement de plan');
      }
    } finally {
      setChangingPlan(false);
    }
  };

  const handleUpgrade = async (planId) => {
    if (planId === 'enterprise') {
      toast.info('Contactez-nous à contact@actoos.com pour le plan Entreprise');
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
            
            <div className="mt-6 pt-6 border-t border-red-200">
              <p className="text-sm text-red-600 font-medium mb-2">Zone dangereuse</p>
              <p className="text-xs text-slate-500 mb-3">
                La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.
              </p>
              <Button
                variant="ghost"
                className="text-red-600 hover:bg-red-50 text-sm"
                onClick={() => setShowDeleteDialog(true)}
              >
                Supprimer définitivement mon compte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md pt-10">
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
                onChange={(e) => {
                  setCancelReason(e.target.value);
                  // Clear feedback if not "other"
                  if (e.target.value !== 'other') {
                    setCancelFeedback('');
                  }
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Sélectionnez une raison...</option>
                {cancelReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>

            {/* Show textarea only when "Autre" is selected */}
            {cancelReason === 'other' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Précisez votre raison * <span className="text-slate-400 font-normal">(minimum 3 caractères)</span>
                </label>
                <textarea
                  value={cancelFeedback}
                  onChange={(e) => setCancelFeedback(e.target.value)}
                  placeholder="Expliquez-nous pourquoi vous souhaitez partir..."
                  className={`flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none ${
                    cancelFeedback.length > 0 && cancelFeedback.length < 3 
                      ? 'border-red-300 focus-visible:ring-red-500' 
                      : 'border-input'
                  }`}
                />
                {cancelFeedback.length > 0 && cancelFeedback.length < 3 && (
                  <p className="text-xs text-red-500">Minimum 3 caractères requis</p>
                )}
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                <strong>Important :</strong> Vous conserverez l'accès à toutes les fonctionnalités jusqu'à la fin de votre période de facturation en cours. Aucun remboursement ne sera effectué pour la période en cours.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Retour
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={
                cancelling || 
                !cancelReason || 
                (cancelReason === 'other' && cancelFeedback.length < 3)
              }
            >
              {cancelling ? 'Annulation...' : 'Confirmer l\'annulation'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgrade} onOpenChange={setShowUpgrade}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 pt-10 sm:pt-12">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl sm:text-2xl">Choisissez votre plan</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Débloquez plus de fonctionnalités pour développer votre activité
            </DialogDescription>
          </DialogHeader>
          
          {/* Mobile: vertical stack, Desktop: 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
        <DialogContent className="max-w-2xl pt-10">
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

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Supprimer votre compte
            </DialogTitle>
            <DialogDescription>
              Cette action est <strong>irréversible</strong>. Toutes vos données seront définitivement supprimées :
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <ul className="text-sm text-slate-600 space-y-1 bg-red-50 p-3 rounded-lg">
              <li>• Tous vos clients et contacts</li>
              <li>• Tous vos devis et factures</li>
              <li>• Toutes vos interventions</li>
              <li>• Tous vos techniciens</li>
              <li>• Toutes les photos et documents</li>
              <li>• Votre abonnement sera annulé</li>
            </ul>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="flex h-10 w-full rounded-md border border-red-300 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmText('');
              }}
            >
              Annuler
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== 'SUPPRIMER'}
            >
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanUsageWidget;
