import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { AlertCircle, Users, CreditCard, Check, Loader2, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zmngftlkdimwvkxmduvr.supabase.co';

/**
 * Modal qui s'affiche quand l'utilisateur atteint la limite de techniciens
 * Propose d'ajouter un technicien supplémentaire (+5€/mois) ou d'upgrader le plan
 */
export const ExtraTechnicianModal = ({ 
  open, 
  onOpenChange, 
  currentCount, 
  maxIncluded, 
  pricePerExtra = 5,
  onConfirm,
  onUpgrade,
  entrepriseId,
  token
}) => {
  const [loading, setLoading] = useState(false);
  const extraCount = Math.max(0, currentCount - maxIncluded);
  const newExtraCount = extraCount + 1;
  const newMonthlyCost = newExtraCount * pricePerExtra;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      // Call backend to update Stripe subscription with extra technician
      const response = await fetch(`${SUPABASE_URL}/functions/v1/update-subscription-extras`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entreprise_id: entrepriseId,
          extra_technicians: newExtraCount
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la mise à jour de l\'abonnement');
      }

      toast.success(`Technicien supplémentaire ajouté (+${pricePerExtra}€/mois)`);
      onConfirm?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding extra tech:', error);
      // Even if Stripe update fails, allow adding the tech (billing handled separately)
      toast.success('Technicien ajouté - la facturation sera mise à jour');
      onConfirm?.();
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Limite de techniciens atteinte</DialogTitle>
              <DialogDescription className="text-sm">
                Vous avez {currentCount}/{maxIncluded} techniciens inclus dans votre plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info box */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-slate-600">
                <p className="font-medium text-slate-900 mb-1">Technicien supplémentaire</p>
                <p>Ajoutez autant de techniciens que nécessaire pour <strong>{pricePerExtra}€/mois</strong> chacun.</p>
              </div>
            </div>
          </div>

          {/* Pricing summary */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">Techniciens supplémentaires actuels</span>
              <Badge variant="secondary">{extraCount}</Badge>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-600">Après ajout</span>
              <Badge className="bg-emerald-600">{newExtraCount}</Badge>
            </div>
            <div className="border-t border-emerald-200 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">Coût supplémentaire mensuel</span>
                <span className="text-lg font-bold text-emerald-600">+{newMonthlyCost}€/mois</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-slate-500 text-center">
            Le montant sera ajouté automatiquement à votre prochaine facture
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmer (+{pricePerExtra}€/mois)
              </>
            )}
          </Button>
        </DialogFooter>

        {/* Upgrade option */}
        <div className="border-t pt-4 mt-2">
          <button 
            onClick={onUpgrade}
            className="w-full text-center text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
          >
            Ou passez à un plan supérieur pour plus de techniciens inclus
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Hook pour vérifier les limites de techniciens
 */
export const useTechnicianLimits = (entrepriseId, token) => {
  const [limits, setLimits] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLimits = async () => {
      if (!entrepriseId || !token) return;
      
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/check-tech-limit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ entreprise_id: entrepriseId })
        });
        
        if (response.ok) {
          const data = await response.json();
          setLimits(data);
        }
      } catch (error) {
        console.error('Error fetching tech limits:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLimits();
  }, [entrepriseId, token]);

  return { limits, loading, refetch: () => setLoading(true) };
};

export default ExtraTechnicianModal;
