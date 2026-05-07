import { useState } from 'react';
import { 
  Shield,
  Users,
  Store,
  Truck,
  Gift,
  Bell,
  Globe,
  DollarSign,
  Percent,
  Clock,
  AlertTriangle,
  ChevronRight,
  Check,
  X,
  Settings,
  Zap,
  Eye,
  EyeOff
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// System-wide feature flags controlled by Admin
const DEFAULT_SYSTEM_CONFIG = {
  // Feature toggles
  features: {
    eats_enabled: true,
    health_enabled: true,
    wallet_enabled: true,
    p2p_enabled: true,
    referral_enabled: true,
    scheduled_orders_enabled: true,
    pickup_enabled: true,
    surge_pricing_enabled: false,
    virtual_cards_enabled: false,
  },
  
  // Commission rates (%)
  commissions: {
    eats_actoos_delivery: 15,
    eats_self_delivery: 10,
    eats_pickup: 10,
    health_actoos_delivery: 5,
    health_self_delivery: 2,
    health_pickup: 2,
  },
  
  // Delivery fees
  delivery: {
    base_fee: 700,
    per_km_fee: 200,
    base_distance_km: 2,
    self_delivery_cap_per_km: 250,
    sos_premium: 500,
  },
  
  // Surge pricing
  surge: {
    enabled: false,
    current_multiplier: 1.0,
    max_multiplier: 2.0,
  },
  
  // Referral
  referral: {
    enabled: true,
    reward_amount: 1000, // FCFA
    min_order_value: 2000,
  },
};

export function AdminGodMode() {
  const [config, setConfig] = useState(DEFAULT_SYSTEM_CONFIG);
  const [activeSection, setActiveSection] = useState(null);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const updateFeature = (key, value) => {
    setConfig(prev => ({
      ...prev,
      features: { ...prev.features, [key]: value }
    }));
  };

  const updateCommission = (key, value) => {
    setConfig(prev => ({
      ...prev,
      commissions: { ...prev.commissions, [key]: value }
    }));
  };

  const updateDelivery = (key, value) => {
    setConfig(prev => ({
      ...prev,
      delivery: { ...prev.delivery, [key]: value }
    }));
  };

  const updateSurge = (key, value) => {
    setConfig(prev => ({
      ...prev,
      surge: { ...prev.surge, [key]: value }
    }));
  };

  const updateReferral = (key, value) => {
    setConfig(prev => ({
      ...prev,
      referral: { ...prev.referral, [key]: value }
    }));
  };

  const saveConfig = () => {
    console.log('Saving system config:', config);
    setShowSaveConfirm(true);
    setTimeout(() => setShowSaveConfirm(false), 2000);
  };

  return (
    <div className="p-4 space-y-4" data-testid="admin-god-mode">
      {/* God Mode Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-6 h-6" />
          <h2 className="text-xl font-bold">God Mode</h2>
        </div>
        <p className="text-white/80 text-sm">
          Configuration système globale. Les changements affectent tous les utilisateurs.
        </p>
      </div>

      {/* Feature Toggles */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold text-gray-900">Fonctionnalités</h3>
        </div>

        <FeatureToggle
          icon={<Store className="w-5 h-5 text-[#FF5A00]" />}
          label="Actoos Eats"
          description="Restaurants & Food"
          enabled={config.features.eats_enabled}
          onChange={(v) => updateFeature('eats_enabled', v)}
        />
        <FeatureToggle
          icon={<Gift className="w-5 h-5 text-green-500" />}
          label="Health"
          description="Pharmacies"
          enabled={config.features.health_enabled}
          onChange={(v) => updateFeature('health_enabled', v)}
        />
        <FeatureToggle
          icon={<DollarSign className="w-5 h-5 text-blue-500" />}
          label="Wallet"
          description="Paiements & Transferts"
          enabled={config.features.wallet_enabled}
          onChange={(v) => updateFeature('wallet_enabled', v)}
        />
        <FeatureToggle
          icon={<Users className="w-5 h-5 text-purple-500" />}
          label="P2P Transfers"
          description="Envoi entre utilisateurs"
          enabled={config.features.p2p_enabled}
          onChange={(v) => updateFeature('p2p_enabled', v)}
        />
        <FeatureToggle
          icon={<Gift className="w-5 h-5 text-pink-500" />}
          label="Parrainage"
          description="Programme de parrainage"
          enabled={config.features.referral_enabled}
          onChange={(v) => updateFeature('referral_enabled', v)}
          highlight
        />
        <FeatureToggle
          icon={<Clock className="w-5 h-5 text-indigo-500" />}
          label="Commandes programmées"
          description="Permettre les réservations"
          enabled={config.features.scheduled_orders_enabled}
          onChange={(v) => updateFeature('scheduled_orders_enabled', v)}
        />
        <FeatureToggle
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          label="Surge Pricing"
          description="Tarification dynamique"
          enabled={config.features.surge_pricing_enabled}
          onChange={(v) => {
            updateFeature('surge_pricing_enabled', v);
            updateSurge('enabled', v);
          }}
          danger
        />
      </div>

      {/* Commission Rates */}
      <button
        onClick={() => setActiveSection('commissions')}
        className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 active:bg-gray-50"
      >
        <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center">
          <Percent className="w-6 h-6 text-green-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-900">Taux de commission</p>
          <p className="text-sm text-gray-500">Eats: {config.commissions.eats_actoos_delivery}% | Health: {config.commissions.health_actoos_delivery}%</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      {/* Delivery Fees */}
      <button
        onClick={() => setActiveSection('delivery')}
        className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 active:bg-gray-50"
      >
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
          <Truck className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-semibold text-gray-900">Frais de livraison</p>
          <p className="text-sm text-gray-500">Base: {config.delivery.base_fee} F | +{config.delivery.per_km_fee} F/km</p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      {/* Surge Pricing Control */}
      {config.features.surge_pricing_enabled && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-red-700">Surge Pricing Actif</h3>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">Multiplicateur actuel</span>
              <span className="text-xl font-bold text-red-600">x{config.surge.current_multiplier.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.1"
              value={config.surge.current_multiplier}
              onChange={(e) => updateSurge('current_multiplier', parseFloat(e.target.value))}
              className="w-full h-2 bg-red-200 rounded-full appearance-none cursor-pointer accent-red-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>x1.0 (Normal)</span>
              <span>x2.0 (Max)</span>
            </div>
          </div>
          
          <p className="text-xs text-red-600">
            Les clients paient {Math.round(config.surge.current_multiplier * 100)}% du prix normal de livraison
          </p>
        </div>
      )}

      {/* Referral Settings */}
      {config.features.referral_enabled && (
        <button
          onClick={() => setActiveSection('referral')}
          className="w-full bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 active:bg-gray-50"
        >
          <div className="w-12 h-12 bg-pink-100 rounded-2xl flex items-center justify-center">
            <Gift className="w-6 h-6 text-pink-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900">Parrainage</p>
            <p className="text-sm text-gray-500">Récompense: {config.referral.reward_amount} FCFA</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      )}

      {/* Save Button */}
      <button
        onClick={saveConfig}
        className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
        data-testid="save-config-btn"
      >
        {showSaveConfirm ? (
          <>
            <Check className="w-5 h-5" />
            Configuration sauvegardée !
          </>
        ) : (
          <>
            <Settings className="w-5 h-5" />
            Sauvegarder la configuration
          </>
        )}
      </button>

      {/* Commission Sheet */}
      <BottomSheet
        isOpen={activeSection === 'commissions'}
        onClose={() => setActiveSection(null)}
        title="Taux de commission"
      >
        <div className="py-4 space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">🍔 Actoos Eats</h4>
            <div className="space-y-3">
              <CommissionInput
                label="Actoos Delivery"
                value={config.commissions.eats_actoos_delivery}
                onChange={(v) => updateCommission('eats_actoos_delivery', v)}
              />
              <CommissionInput
                label="Self-Delivery"
                value={config.commissions.eats_self_delivery}
                onChange={(v) => updateCommission('eats_self_delivery', v)}
              />
              <CommissionInput
                label="Pickup"
                value={config.commissions.eats_pickup}
                onChange={(v) => updateCommission('eats_pickup', v)}
              />
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">💊 Health</h4>
            <div className="space-y-3">
              <CommissionInput
                label="Actoos Delivery"
                value={config.commissions.health_actoos_delivery}
                onChange={(v) => updateCommission('health_actoos_delivery', v)}
              />
              <CommissionInput
                label="Self-Delivery"
                value={config.commissions.health_self_delivery}
                onChange={(v) => updateCommission('health_self_delivery', v)}
              />
              <CommissionInput
                label="Pickup"
                value={config.commissions.health_pickup}
                onChange={(v) => updateCommission('health_pickup', v)}
              />
            </div>
          </div>
          
          <button
            onClick={() => setActiveSection(null)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>

      {/* Delivery Sheet */}
      <BottomSheet
        isOpen={activeSection === 'delivery'}
        onClose={() => setActiveSection(null)}
        title="Frais de livraison"
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Frais de base (FCFA)</label>
            <input
              type="number"
              value={config.delivery.base_fee}
              onChange={(e) => updateDelivery('base_fee', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
            <p className="text-xs text-gray-400 mt-1">Couvre les premiers {config.delivery.base_distance_km} km</p>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Frais par km supplémentaire (FCFA)</label>
            <input
              type="number"
              value={config.delivery.per_km_fee}
              onChange={(e) => updateDelivery('per_km_fee', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Plafond Self-Delivery (FCFA/km)</label>
            <input
              type="number"
              value={config.delivery.self_delivery_cap_per_km}
              onChange={(e) => updateDelivery('self_delivery_cap_per_km', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Prime SOS/Urgence (FCFA)</label>
            <input
              type="number"
              value={config.delivery.sos_premium}
              onChange={(e) => updateDelivery('sos_premium', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
          </div>
          
          <button
            onClick={() => setActiveSection(null)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>

      {/* Referral Sheet */}
      <BottomSheet
        isOpen={activeSection === 'referral'}
        onClose={() => setActiveSection(null)}
        title="Paramètres Parrainage"
      >
        <div className="py-4 space-y-4">
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Récompense (FCFA)</label>
            <input
              type="number"
              value={config.referral.reward_amount}
              onChange={(e) => updateReferral('reward_amount', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
            <p className="text-xs text-gray-400 mt-1">Montant crédité au parrain et au filleul</p>
          </div>
          
          <div>
            <label className="text-sm text-gray-500 mb-2 block">Commande minimum (FCFA)</label>
            <input
              type="number"
              value={config.referral.min_order_value}
              onChange={(e) => updateReferral('min_order_value', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
            />
            <p className="text-xs text-gray-400 mt-1">Le filleul doit passer une commande d'au moins ce montant</p>
          </div>
          
          <button
            onClick={() => setActiveSection(null)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// Feature Toggle Component
function FeatureToggle({ icon, label, description, enabled, onChange, highlight, danger }) {
  return (
    <div className={`p-4 flex items-center justify-between border-b border-gray-100 last:border-b-0 ${
      highlight ? 'bg-pink-50' : danger ? 'bg-red-50' : ''
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          highlight ? 'bg-pink-100' : danger ? 'bg-red-100' : 'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div>
          <p className={`font-medium ${danger ? 'text-red-700' : 'text-gray-900'}`}>{label}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-7 rounded-full transition-colors ${
          enabled 
            ? danger ? 'bg-red-500' : 'bg-[#FF5A00]' 
            : 'bg-gray-300'
        }`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

// Commission Input Component
function CommissionInput({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between bg-gray-100 rounded-xl px-4 py-3">
      <span className="text-gray-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className="w-16 bg-white rounded-lg px-3 py-2 text-center font-semibold outline-none focus:ring-2 focus:ring-[#FF5A00]"
          min="0"
          max="100"
        />
        <span className="text-gray-500">%</span>
      </div>
    </div>
  );
}
