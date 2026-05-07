/**
 * ACTOOS ONE - Partner Settings
 * 
 * Paramètres du partenaire.
 * PRODUCTION MODE - Connecté à Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Calendar, 
  ShoppingBag, 
  Moon,
  ChevronRight,
  AlertCircle,
  Info,
  Truck,
  Store,
  Banknote,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { BottomSheet } from './BottomSheet';

// Default settings (fallback)
const DEFAULT_SETTINGS = {
  preparation_time: 20,
  accepts_delivery: true,
  accepts_self_delivery: false,
  accepts_pickup: true,
  self_delivery_fee: 500,
  self_delivery_radius_km: 5,
  allows_scheduled_orders: true,
  max_schedule_days: 7,
  accepts_orders_when_closed: true,
  accepts_cash: true,
  opens_at: '08:00',
  closes_at: '22:00',
};

export function PartnerSettings({ partnerId }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [showPrepTimeSheet, setShowPrepTimeSheet] = useState(false);
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [showScheduleSheet, setShowScheduleSheet] = useState(false);
  const [showHoursSheet, setShowHoursSheet] = useState(false);

  // Charger les paramètres depuis Supabase
  const fetchSettings = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase non configuré');
      setIsLoading(false);
      return;
    }

    if (!partnerId) {
      // En mode test sans partnerId, utiliser les defaults
      setSettings(DEFAULT_SETTINGS);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('partners')
        .select(`
          preparation_time,
          accepts_delivery,
          accepts_self_delivery,
          accepts_pickup,
          self_delivery_fee,
          self_delivery_radius_km,
          allows_scheduled_orders,
          max_schedule_days,
          accepts_orders_when_closed,
          accepts_cash,
          opens_at,
          closes_at
        `)
        .eq('id', partnerId)
        .single();

      if (fetchError) throw fetchError;

      // Merge avec defaults pour les colonnes qui pourraient ne pas exister
      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
        opens_at: data?.opens_at || '08:00',
        closes_at: data?.closes_at || '22:00',
      });
      setError(null);
    } catch (err) {
      console.error('Erreur fetchSettings:', err);
      // Si erreur, utiliser les defaults mais afficher l'erreur
      setSettings(DEFAULT_SETTINGS);
      setError(`Erreur de chargement: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Mettre à jour un paramètre localement
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Sauvegarder les paramètres dans Supabase
  const saveSettings = async () => {
    if (!partnerId) {
      alert('Mode démo: les paramètres ne peuvent pas être sauvegardés sans Partner ID');
      setHasChanges(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('partners')
        .update({
          preparation_time: settings.preparation_time,
          accepts_delivery: settings.accepts_delivery,
          accepts_self_delivery: settings.accepts_self_delivery,
          accepts_pickup: settings.accepts_pickup,
          self_delivery_fee: settings.self_delivery_fee,
          self_delivery_radius_km: settings.self_delivery_radius_km,
          allows_scheduled_orders: settings.allows_scheduled_orders,
          max_schedule_days: settings.max_schedule_days,
          accepts_orders_when_closed: settings.accepts_orders_when_closed,
          accepts_cash: settings.accepts_cash,
          opens_at: settings.opens_at,
          closes_at: settings.closes_at,
          updated_at: new Date().toISOString(),
        })
        .eq('id', partnerId);

      if (updateError) throw updateError;

      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur saveSettings:', err);
      setError(`Erreur de sauvegarde: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-24 space-y-4" data-testid="partner-settings">
      {/* Error banner */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-200 text-sm flex-1">{error}</p>
          <button onClick={fetchSettings} className="text-red-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success banner */}
      {saveSuccess && (
        <div className="bg-green-900/50 border border-green-500 rounded-xl p-3 flex items-center gap-2">
          <Save className="w-5 h-5 text-green-400" />
          <p className="text-green-200 text-sm">Paramètres sauvegardés avec succès !</p>
        </div>
      )}

      {/* Save Banner */}
      {hasChanges && (
        <div className="bg-[#FF5A00] text-white rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Modifications non sauvegardées</span>
          </div>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="bg-white text-[#FF5A00] px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
            data-testid="save-settings-btn"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              'Sauvegarder'
            )}
          </button>
        </div>
      )}

      {/* Temps de préparation */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowPrepTimeSheet(true)}
          className="w-full p-4 flex items-center gap-4 active:bg-gray-700"
          data-testid="prep-time-setting"
        >
          <div className="w-12 h-12 bg-blue-900/50 rounded-2xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-white">Temps de préparation</p>
            <p className="text-sm text-gray-400">Estimation affichée au client</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-[#FF5A00]">{settings.preparation_time} min</span>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </div>
        </button>
      </div>

      {/* Horaires d'ouverture */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowHoursSheet(true)}
          className="w-full p-4 flex items-center gap-4 active:bg-gray-700"
          data-testid="hours-setting"
        >
          <div className="w-12 h-12 bg-purple-900/50 rounded-2xl flex items-center justify-center">
            <Store className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-white">Horaires d'ouverture</p>
            <p className="text-sm text-gray-400">Définir vos heures de service</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-300">
              {settings.opens_at?.slice(0, 5)} - {settings.closes_at?.slice(0, 5)}
            </span>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </div>
        </button>
      </div>

      {/* Options de livraison */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-white">Options de livraison</h3>
          </div>
        </div>

        {/* Actoos Delivery */}
        <div className="p-4 flex items-center justify-between border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF5A00]/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-[#FF5A00]" />
            </div>
            <div>
              <p className="font-medium text-white">Actoos Delivery</p>
              <p className="text-xs text-gray-400">Livreurs Actoos</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={settings.accepts_delivery}
            onChange={(v) => updateSetting('accepts_delivery', v)}
            testId="toggle-actoos-delivery"
          />
        </div>

        {/* Self-Delivery */}
        <div
          onClick={() => setShowDeliverySheet(true)}
          className="w-full p-4 flex items-center justify-between border-b border-gray-700 active:bg-gray-700 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-900/50 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-white">Self-Delivery</p>
              <p className="text-xs text-gray-400">Vous livrez vous-même</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {settings.accepts_self_delivery && (
              <span className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-full font-medium">
                {settings.self_delivery_fee} FCFA
              </span>
            )}
            <ToggleSwitch
              enabled={settings.accepts_self_delivery}
              onChange={(v) => updateSetting('accepts_self_delivery', v)}
              testId="toggle-self-delivery"
            />
          </div>
        </div>

        {/* Pickup */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-900/50 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">Pickup</p>
              <p className="text-xs text-gray-400">Click & Collect</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={settings.accepts_pickup}
            onChange={(v) => updateSetting('accepts_pickup', v)}
            testId="toggle-pickup"
          />
        </div>
      </div>

      {/* Paiements */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-white">Paiements</h3>
          </div>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-900/50 rounded-xl flex items-center justify-center">
              <Banknote className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-white">Accepter le Cash</p>
              <p className="text-xs text-gray-400">Paiement en espèces à la livraison</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={settings.accepts_cash}
            onChange={(v) => updateSetting('accepts_cash', v)}
            testId="toggle-cash"
          />
        </div>
      </div>

      {/* Commandes programmées */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowScheduleSheet(true)}
          className="w-full p-4 flex items-center gap-4 active:bg-gray-700 border-b border-gray-700"
          data-testid="schedule-setting"
        >
          <div className="w-12 h-12 bg-indigo-900/50 rounded-2xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-white">Commandes programmées</p>
            <p className="text-sm text-gray-400">
              {settings.allows_scheduled_orders 
                ? `Jusqu'à ${settings.max_schedule_days} jours à l'avance`
                : 'Désactivé'
              }
            </p>
          </div>
          <ToggleSwitch
            enabled={settings.allows_scheduled_orders}
            onChange={(v) => updateSetting('allows_scheduled_orders', v)}
            testId="toggle-scheduled"
          />
        </button>

        {/* Commandes même fermé */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-900/50 rounded-xl flex items-center justify-center">
              <Moon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="font-medium text-white">Commander même fermé</p>
              <p className="text-xs text-gray-400">Accepter commandes hors horaires</p>
            </div>
          </div>
          <ToggleSwitch
            enabled={settings.accepts_orders_when_closed}
            onChange={(v) => updateSetting('accepts_orders_when_closed', v)}
            testId="toggle-closed-orders"
          />
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-900/30 border border-blue-700 rounded-2xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300">
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
              <span className="text-2xl font-bold text-[#FF5A00]">{settings.preparation_time} min</span>
              <span className="text-sm text-gray-500">60 min</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={settings.preparation_time}
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
                  settings.preparation_time === time
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

      {/* Hours Sheet */}
      <BottomSheet
        isOpen={showHoursSheet}
        onClose={() => setShowHoursSheet(false)}
        title="Horaires d'ouverture"
      >
        <div className="py-4">
          <p className="text-gray-500 mb-6">
            Définissez vos horaires d'ouverture et de fermeture.
          </p>
          
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Heure d'ouverture</label>
              <input
                type="time"
                value={settings.opens_at?.slice(0, 5) || '08:00'}
                onChange={(e) => updateSetting('opens_at', e.target.value + ':00')}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 mb-2 block">Heure de fermeture</label>
              <input
                type="time"
                value={settings.closes_at?.slice(0, 5) || '22:00'}
                onChange={(e) => updateSetting('closes_at', e.target.value + ':00')}
                className="w-full bg-gray-100 rounded-xl px-4 py-3 text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
              />
            </div>
          </div>

          <button
            onClick={() => setShowHoursSheet(false)}
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
              value={settings.self_delivery_fee}
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
                    settings.self_delivery_radius_km === km
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
                  settings.max_schedule_days === days
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
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-[#FF5A00]' : 'bg-gray-600'
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

export default PartnerSettings;
