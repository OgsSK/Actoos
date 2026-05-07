import { useState } from 'react';
import { 
  Clock, 
  Calendar, 
  ShoppingBag, 
  Moon,
  Tag,
  ChevronRight,
  Check,
  AlertCircle,
  Info,
  Settings,
  Truck,
  Store
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

// Default partner settings
const DEFAULT_SETTINGS = {
  // Temps de préparation
  preparation_time: 20, // minutes
  preparation_time_min: 10,
  preparation_time_max: 60,
  
  // Options de livraison
  accepts_delivery: true,       // Actoos Delivery
  accepts_self_delivery: false, // Self-Delivery (partenaire livre)
  accepts_pickup: true,         // Click & Collect
  
  // Commandes programmées
  allows_scheduled_orders: true,
  max_schedule_days: 7,
  
  // Commandes même fermé
  accepts_orders_when_closed: true,
  
  // Self-delivery fee (si activé)
  self_delivery_fee: 500, // FCFA
  self_delivery_radius_km: 5,
};

export function PartnerSettings({ 
  settings = DEFAULT_SETTINGS, 
  onSettingsChange,
  partnerType = 'restaurant' // 'restaurant' | 'pharmacy'
}) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [showPrepTimeSheet, setShowPrepTimeSheet] = useState(false);
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const updateSetting = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const saveSettings = () => {
    if (onSettingsChange) {
      onSettingsChange(localSettings);
    }
    setHasChanges(false);
  };

  return (
    <div className="p-4 space-y-4" data-testid="partner-settings">
      {/* Save Banner */}
      {hasChanges && (
        <div className="bg-[#FF5A00] text-white rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Modifications non sauvegardées</span>
          </div>
          <button
            onClick={saveSettings}
            className="bg-white text-[#FF5A00] px-4 py-2 rounded-xl font-semibold text-sm"
            data-testid="save-settings-btn"
          >
            Sauvegarder
          </button>
        </div>
      )}

      {/* Temps de préparation */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowPrepTimeSheet(true)}
          className="w-full p-4 flex items-center gap-4 active:bg-gray-50"
          data-testid="prep-time-setting"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900">Temps de préparation</p>
            <p className="text-sm text-gray-500">
              Estimation affichée au client
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#FF5A00]">{localSettings.preparation_time} min</span>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </button>
      </div>

      {/* Options de livraison */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Options de livraison</h3>
          </div>
        </div>

        {/* Actoos Delivery */}
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#FF5A00]" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Actoos Delivery</p>
              <p className="text-xs text-gray-500">Livreurs Actoos</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={localSettings.accepts_delivery}
            onChange={(v) => updateSetting('accepts_delivery', v)}
            testId="toggle-actoos-delivery"
          />
        </div>

        {/* Self-Delivery */}
        <button
          onClick={() => setShowDeliverySheet(true)}
          className="w-full p-4 flex items-center justify-between border-b border-gray-100 active:bg-gray-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Self-Delivery</p>
              <p className="text-xs text-gray-500">Vous livrez vous-même</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {localSettings.accepts_self_delivery && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                {localSettings.self_delivery_fee} FCFA
              </span>
            )}
            <ToggleSwitch
              enabled={localSettings.accepts_self_delivery}
              onChange={(v) => updateSetting('accepts_self_delivery', v)}
              testId="toggle-self-delivery"
            />
          </div>
        </button>

        {/* Pickup */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Pickup</p>
              <p className="text-xs text-gray-500">Click & Collect</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={localSettings.accepts_pickup}
            onChange={(v) => updateSetting('accepts_pickup', v)}
            testId="toggle-pickup"
          />
        </div>
      </div>

      {/* Commandes programmées */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <button
          onClick={() => setShowScheduleSheet(true)}
          className="w-full p-4 flex items-center gap-4 active:bg-gray-50 border-b border-gray-100"
          data-testid="schedule-setting"
        >
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900">Commandes programmées</p>
            <p className="text-sm text-gray-500">
              {localSettings.allows_scheduled_orders 
                ? `Jusqu'à ${localSettings.max_schedule_days} jours à l'avance`
                : 'Désactivé'
              }
            </p>
          </div>
          <ToggleSwitch
            enabled={localSettings.allows_scheduled_orders}
            onChange={(v) => updateSetting('allows_scheduled_orders', v)}
            testId="toggle-scheduled"
          />
        </button>

        {/* Commandes même fermé */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Moon className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Commander même fermé</p>
              <p className="text-xs text-gray-500">Accepter commandes hors horaires</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={localSettings.accepts_orders_when_closed}
            onChange={(v) => updateSetting('accepts_orders_when_closed', v)}
            testId="toggle-closed-orders"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-700">
          Ces paramètres affectent immédiatement ce que les clients voient sur l'app. 
          Le temps de préparation est combiné avec le temps de livraison estimé.
        </p>
      </div>

      {/* Preparation Time Sheet */}
      <BottomSheet
        isOpen={showPrepTimeSheet}
        onClose={() => setShowPrepTimeSheet(false)}
        title="Temps de préparation"
      >
        <div className="py-4">
          <p className="text-gray-500 mb-6">
            Ce temps est affiché au client comme estimation. Le système l'ajuste automatiquement selon la charge.
          </p>
          
          {/* Slider */}
          <div className="mb-8">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-500">10 min</span>
              <span className="text-2xl font-bold text-[#FF5A00]">{localSettings.preparation_time} min</span>
              <span className="text-sm text-gray-500">60 min</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={localSettings.preparation_time}
              onChange={(e) => updateSetting('preparation_time', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#FF5A00]"
              data-testid="prep-time-slider"
            />
          </div>

          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[15, 20, 30, 45].map(time => (
              <button
                key={time}
                onClick={() => updateSetting('preparation_time', time)}
                className={`py-3 rounded-xl font-medium text-sm transition-colors ${
                  localSettings.preparation_time === time
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {time} min
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowPrepTimeSheet(false)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>

      {/* Self-Delivery Settings Sheet */}
      <BottomSheet
        isOpen={showDeliverySheet}
        onClose={() => setShowDeliverySheet(false)}
        title="Self-Delivery"
      >
        <div className="py-4">
          <p className="text-gray-500 mb-6">
            Configurez vos propres frais de livraison. Un plafond de 250 FCFA/km s'applique.
          </p>
          
          {/* Fee input */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 mb-2 block">Frais de livraison (FCFA)</label>
            <input
              type="number"
              value={localSettings.self_delivery_fee}
              onChange={(e) => updateSetting('self_delivery_fee', parseInt(e.target.value) || 0)}
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-lg font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              placeholder="500"
              data-testid="self-delivery-fee-input"
            />
          </div>

          {/* Radius */}
          <div className="mb-6">
            <label className="text-sm text-gray-500 mb-2 block">Rayon de livraison (km)</label>
            <div className="flex gap-2">
              {[3, 5, 7, 10].map(km => (
                <button
                  key={km}
                  onClick={() => updateSetting('self_delivery_radius_km', km)}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm ${
                    localSettings.self_delivery_radius_km === km
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {km} km
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowDeliverySheet(false)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>

      {/* Schedule Settings Sheet */}
      <BottomSheet
        isOpen={showScheduleSheet}
        onClose={() => setShowScheduleSheet(false)}
        title="Commandes programmées"
      >
        <div className="py-4">
          <p className="text-gray-500 mb-6">
            Combien de jours à l'avance les clients peuvent programmer une commande ?
          </p>
          
          <div className="grid grid-cols-4 gap-2 mb-6">
            {[1, 3, 5, 7].map(days => (
              <button
                key={days}
                onClick={() => updateSetting('max_schedule_days', days)}
                className={`py-4 rounded-xl font-medium ${
                  localSettings.max_schedule_days === days
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <span className="text-xl font-bold">{days}</span>
                <span className="text-xs block">jour{days > 1 ? 's' : ''}</span>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowScheduleSheet(false)}
            className="w-full py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
          >
            Confirmer
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// Toggle Switch Component
function ToggleSwitch({ enabled, onChange, testId }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-[#FF5A00]' : 'bg-gray-300'
      }`}
      data-testid={testId}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
