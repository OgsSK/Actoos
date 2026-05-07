/**
 * ACTOOS ONE - Partner KDS Screen (Kitchen Display System)
 * 
 * Dashboard partenaire avec commandes en temps réel depuis Supabase.
 * PRODUCTION MODE
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  RefreshCw, 
  Volume2, 
  VolumeX, 
  Clock, 
  Check,
  ChefHat,
  Package,
  Utensils,
  ArrowLeft,
  Keyboard,
  Tag,
  BarChart3,
  Settings,
  Loader2,
  AlertCircle,
  Bell
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getPartnerOrders, updateOrderStatus } from '../services/orderService';
import { KDSOrderCard } from './KDSOrderCard';
import { KDSMenuManager } from './KDSMenuManager';
import { PartnerPromotionsManager } from './PartnerPromotionsManager';
import { PartnerAnalytics } from './PartnerAnalytics';
import { PartnerSettings } from './PartnerSettings';

const TABS = {
  ORDERS: 'orders',
  MENU: 'menu',
  PROMOS: 'promos',
  ANALYTICS: 'analytics',
  SETTINGS: 'settings',
};

// Statuts des commandes pour KDS
const ORDER_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready'];

export function PartnerKDSScreen({ partnerId, onBack }) {
  const [activeTab, setActiveTab] = useState(TABS.ORDERS);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPickupScanner, setShowPickupScanner] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [pickupResult, setPickupResult] = useState(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const previousOrdersCount = useRef(0);

  // Jouer le son de notification
  const playNotificationSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, [soundEnabled]);

  // Charger les commandes depuis Supabase
  const fetchOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase non configuré');
      setIsLoading(false);
      return;
    }

    setIsRefreshing(true);

    try {
      // Récupérer toutes les commandes du partenaire (pas seulement pending)
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('partner_id', partnerId)
        .in('status', ['pending', 'confirmed', 'preparing', 'ready'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      const ordersData = data || [];
      
      // Détecter nouvelles commandes
      const pendingCount = ordersData.filter(o => o.status === 'pending').length;
      if (pendingCount > previousOrdersCount.current && previousOrdersCount.current > 0) {
        playNotificationSound();
        setNewOrdersCount(prev => prev + (pendingCount - previousOrdersCount.current));
      }
      previousOrdersCount.current = pendingCount;

      setOrders(ordersData);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      console.error('Erreur fetchOrders:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [partnerId, playNotificationSound]);

  // Charger au démarrage
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Souscription Realtime aux commandes
  useEffect(() => {
    if (!isSupabaseConfigured() || !partnerId) return;

    console.log('🔔 KDS: Subscribing to orders for partner:', partnerId);

    const channel = supabase
      .channel(`kds-orders-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          console.log('📦 Nouvelle commande KDS:', payload.new);
          setOrders(prev => [payload.new, ...prev]);
          playNotificationSound();
          setNewOrdersCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `partner_id=eq.${partnerId}`,
        },
        (payload) => {
          console.log('📝 Commande mise à jour KDS:', payload.new);
          setOrders(prev => 
            prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } : o)
          );
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 KDS: Unsubscribing');
      supabase.removeChannel(channel);
    };
  }, [partnerId, playNotificationSound]);

  // Confirmer une commande
  const confirmOrder = useCallback(async (orderId) => {
    const { data, error } = await updateOrderStatus(orderId, 'confirmed');
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'confirmed' } : o));
    }
  }, []);

  // Commencer la préparation
  const startPreparing = useCallback(async (orderId) => {
    const { data, error } = await updateOrderStatus(orderId, 'preparing');
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'preparing' } : o));
    }
  }, []);

  // Marquer comme prêt
  const markReady = useCallback(async (orderId) => {
    const { data, error } = await updateOrderStatus(orderId, 'ready');
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ready' } : o));
    }
  }, []);

  // Valider code pickup
  const validatePickupCode = useCallback(async () => {
    const formattedCode = pickupCode.trim().replace('#', '');
    const matchingOrder = orders.find(
      o => o.delivery_code === formattedCode && o.status === 'ready'
    );

    if (matchingOrder) {
      // Marquer comme récupéré
      const { error } = await updateOrderStatus(matchingOrder.id, 'picked_up');
      if (error) {
        setPickupResult({ success: false, message: 'Erreur de mise à jour' });
      } else {
        setPickupResult({
          success: true,
          message: `Commande ${matchingOrder.order_number || matchingOrder.id.slice(0, 8)} remise au client !`,
        });
        setOrders(prev => prev.filter(o => o.id !== matchingOrder.id));
      }
    } else {
      setPickupResult({
        success: false,
        message: 'Code invalide ou commande non prête',
      });
    }

    setPickupCode('');
    setTimeout(() => setPickupResult(null), 3000);
  }, [pickupCode, orders]);

  // Grouper les commandes par statut
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const confirmedOrders = orders.filter(o => o.status === 'confirmed');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  // Stats
  const stats = {
    pending: pendingOrders.length,
    confirmed: confirmedOrders.length,
    preparing: preparingOrders.length,
    ready: readyOrders.length,
    total: orders.length,
  };

  return (
    <div className="min-h-screen bg-gray-900" data-testid="partner-kds-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white"
              data-testid="kds-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-[#FF5A00]" />
                <h1 className="font-bold text-lg text-white">KDS Partenaire</h1>
              </div>
              <p className="text-xs text-gray-400">
                Mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New orders badge */}
            {newOrdersCount > 0 && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse flex items-center gap-1">
                <Bell className="w-4 h-4" />
                {newOrdersCount} nouvelle(s)
              </div>
            )}

            {/* Sound toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                soundEnabled ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-white" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Refresh */}
            <button
              onClick={() => { fetchOrders(); setNewOrdersCount(0); }}
              disabled={isRefreshing}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-white"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Pickup scanner */}
            <button
              onClick={() => setShowPickupScanner(!showPickupScanner)}
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                showPickupScanner ? 'bg-[#FF5A00]' : 'bg-gray-700'
              }`}
            >
              <Keyboard className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <button
            onClick={() => { setActiveTab(TABS.ORDERS); setNewOrdersCount(0); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap ${
              activeTab === TABS.ORDERS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Package className="w-4 h-4" />
            Commandes
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {stats.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab(TABS.MENU)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap ${
              activeTab === TABS.MENU
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Utensils className="w-4 h-4" />
            Menu
          </button>
          <button
            onClick={() => setActiveTab(TABS.PROMOS)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap ${
              activeTab === TABS.PROMOS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            Promos
          </button>
          <button
            onClick={() => setActiveTab(TABS.ANALYTICS)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap ${
              activeTab === TABS.ANALYTICS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab(TABS.SETTINGS)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap ${
              activeTab === TABS.SETTINGS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-700 text-gray-300'
            }`}
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
        </div>

        {/* Pickup Scanner */}
        {showPickupScanner && (
          <div className="mt-3 bg-gray-700 rounded-xl p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && validatePickupCode()}
                placeholder="Entrer code client (ex: 1234)"
                className="flex-1 bg-gray-600 text-white rounded-lg px-4 py-2 placeholder-gray-400"
                autoFocus
                data-testid="pickup-code-input"
              />
              <button
                onClick={validatePickupCode}
                className="bg-[#FF5A00] text-white px-4 py-2 rounded-lg font-medium"
              >
                Valider
              </button>
            </div>
            {pickupResult && (
              <div className={`mt-2 p-2 rounded-lg text-center font-medium ${
                pickupResult.success ? 'bg-green-600' : 'bg-red-600'
              } text-white`}>
                {pickupResult.message}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-[#FF5A00] animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-200">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Orders Tab */}
        {!isLoading && !error && activeTab === TABS.ORDERS && (
          <div className="space-y-6">
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-yellow-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                <p className="text-xs text-yellow-200">En attente</p>
              </div>
              <div className="bg-blue-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-blue-400">{stats.confirmed}</p>
                <p className="text-xs text-blue-200">Confirmées</p>
              </div>
              <div className="bg-orange-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{stats.preparing}</p>
                <p className="text-xs text-orange-200">En prépa</p>
              </div>
              <div className="bg-green-900/50 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{stats.ready}</p>
                <p className="text-xs text-green-200">Prêtes</p>
              </div>
            </div>

            {/* No orders */}
            {orders.length === 0 && (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Aucune commande en cours</p>
                <p className="text-gray-500 text-sm mt-1">Les nouvelles commandes apparaîtront ici en temps réel</p>
              </div>
            )}

            {/* Pending Orders - Need confirmation */}
            {pendingOrders.length > 0 && (
              <div>
                <h3 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  En attente de confirmation ({pendingOrders.length})
                </h3>
                <div className="space-y-3">
                  {pendingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={() => confirmOrder(order.id)}
                      actionLabel="CONFIRMER"
                      actionColor="bg-blue-600"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Confirmed Orders - Start preparing */}
            {confirmedOrders.length > 0 && (
              <div>
                <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                  <Check className="w-5 h-5" />
                  Confirmées ({confirmedOrders.length})
                </h3>
                <div className="space-y-3">
                  {confirmedOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={() => startPreparing(order.id)}
                      actionLabel="COMMENCER PRÉPA"
                      actionColor="bg-orange-600"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Preparing Orders - Mark ready */}
            {preparingOrders.length > 0 && (
              <div>
                <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
                  <ChefHat className="w-5 h-5" />
                  En préparation ({preparingOrders.length})
                </h3>
                <div className="space-y-3">
                  {preparingOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onAction={() => markReady(order.id)}
                      actionLabel="PRÊT"
                      actionColor="bg-green-600"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Ready Orders - Waiting for pickup */}
            {readyOrders.length > 0 && (
              <div>
                <h3 className="text-green-400 font-bold mb-3 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Prêtes - En attente ({readyOrders.length})
                </h3>
                <div className="space-y-3">
                  {readyOrders.map(order => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      showPickupCode
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === TABS.MENU && (
          <KDSMenuManager partnerId={partnerId} />
        )}

        {/* Promos Tab */}
        {activeTab === TABS.PROMOS && (
          <PartnerPromotionsManager partnerId={partnerId} />
        )}

        {/* Analytics Tab */}
        {activeTab === TABS.ANALYTICS && (
          <PartnerAnalytics partnerId={partnerId} />
        )}

        {/* Settings Tab */}
        {activeTab === TABS.SETTINGS && (
          <PartnerSettings partnerId={partnerId} />
        )}
      </div>
    </div>
  );
}

// Simple Order Card component for KDS
function OrderCard({ order, onAction, actionLabel, actionColor, showPickupCode }) {
  const items = order.order_items || [];
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700" data-testid={`order-${order.id}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-white font-bold text-lg">
            {order.order_number || `#${order.id.slice(0, 6)}`}
          </p>
          <p className="text-gray-400 text-sm">
            {order.delivery_type === 'pickup' ? '🏃 À emporter' : '🚚 Livraison'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#FF5A00] font-bold">{(order.total_amount || 0).toLocaleString()} F</p>
          <p className={`text-xs ${elapsed > 15 ? 'text-red-400' : 'text-gray-400'}`}>
            {elapsed} min
          </p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1 mb-3">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm">
            <span className="text-gray-300">
              <span className="text-[#FF5A00] font-bold">{item.quantity}x</span> {item.name}
            </span>
          </div>
        ))}
      </div>

      {/* Pickup code for ready orders */}
      {showPickupCode && order.delivery_code && (
        <div className="bg-green-900/50 rounded-lg p-3 mb-3 text-center">
          <p className="text-xs text-green-300">Code remise</p>
          <p className="text-3xl font-mono font-bold text-green-400">#{order.delivery_code}</p>
        </div>
      )}

      {/* Action button */}
      {onAction && (
        <button
          onClick={onAction}
          className={`w-full ${actionColor} text-white font-bold py-3 rounded-xl`}
          data-testid={`action-${order.id}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export default PartnerKDSScreen;
