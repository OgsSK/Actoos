/**
 * ACTOOS ONE - Admin Dashboard
 * 
 * Dashboard administrateur avec données RÉELLES depuis Supabase.
 * Notifications en temps réel pour les nouvelles demandes d'inscription.
 * Livreurs chargés depuis Supabase.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft,
  Shield,
  Package,
  Users,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bike,
  Car,
  Store,
  MapPin,
  Zap,
  Settings,
  Tag,
  Scale,
  Edit3,
  Save,
  Bell,
  BellRing,
  RefreshCw,
  Loader2,
  Wallet,
  ArrowDownCircle,
  TrendingUp,
  Globe
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getOnboardingRequests, approveOnboardingRequest, rejectOnboardingRequest } from '../services/onboardingService';
import { getAllOrders } from '../services/orderService';
import { getAllDrivers, updateDriverOnlineStatus } from '../services/driverService';
import { AdminPromotionsManager } from './AdminPromotionsManager';
import { AdminGodMode } from './AdminGodMode';
import { AdminWithdrawalsManager } from './AdminWithdrawalsManager';
import { AdminWalletsOverview } from './AdminWalletsOverview';
import { AdminRefundsManager } from './AdminRefundsManager';
import { AdminCountryStats } from './AdminCountryStats';
import { COUNTRIES } from '../config/countriesConfig';

const TABS = {
  STATS: 'stats', // NEW: Stats multi-pays
  ORDERS: 'orders',
  DRIVERS: 'drivers',
  ONBOARDING: 'onboarding',
  WALLETS: 'wallets',
  WITHDRAWALS: 'withdrawals',
  REFUNDS: 'refunds',
  SETTINGS: 'settings',
};

export function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState(TABS.STATS); // Default to stats multi-pays
  const [orders, setOrders] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('ALL'); // Filtre pays global
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  const [onboardingRequests, setOnboardingRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Notification state
  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  
  // Settings sub-tab
  const [settingsTab, setSettingsTab] = useState('godmode');

  // Load drivers from Supabase
  const loadDrivers = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    setIsLoadingDrivers(true);
    try {
      const { data, error: fetchError } = await getAllDrivers();
      
      if (fetchError) throw fetchError;
      
      setDrivers(data || []);
      console.log(`✅ Chargé ${(data || []).length} livreurs depuis Supabase`);
    } catch (err) {
      console.error('Erreur chargement livreurs:', err);
    } finally {
      setIsLoadingDrivers(false);
    }
  }, []);

  // Load onboarding requests from Supabase
  const loadOnboardingRequests = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Supabase non configuré');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await getOnboardingRequests({ limit: 50 });
      
      if (fetchError) throw fetchError;
      
      setOnboardingRequests(data || []);
      
      // Check for new requests
      const pendingCount = (data || []).filter(r => r.status === 'pending').length;
      if (pendingCount > lastSeenCount && lastSeenCount > 0) {
        setHasNewNotification(true);
        // Play notification sound
        playNotificationSound();
      }
      setNewRequestsCount(pendingCount);
      
    } catch (err) {
      console.error('Erreur chargement demandes:', err);
      setError(err.message);
    }
  }, [lastSeenCount]);

  // Load orders from Supabase
  const loadOrders = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    try {
      const { data, error: fetchError } = await getAllOrders({ limit: 50, status: 'pending' });
      if (fetchError) throw fetchError;
      setOrders(data || []);
    } catch (err) {
      console.error('Erreur chargement commandes:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([loadOnboardingRequests(), loadOrders(), loadDrivers()]);
      setIsLoading(false);
    };
    loadData();
  }, [loadOnboardingRequests, loadOrders, loadDrivers]);

  // Real-time subscription for new onboarding requests
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const channel = supabase
      .channel('admin-onboarding-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'onboarding_requests',
        },
        (payload) => {
          console.log('🔔 Nouvelle demande reçue:', payload.new);
          setOnboardingRequests(prev => [payload.new, ...prev]);
          setNewRequestsCount(prev => prev + 1);
          setHasNewNotification(true);
          playNotificationSound();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'onboarding_requests',
        },
        (payload) => {
          console.log('📝 Demande mise à jour:', payload.new);
          setOnboardingRequests(prev => 
            prev.map(r => r.id === payload.new.id ? payload.new : r)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    try {
      // Use Web Audio API for a simple beep
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.log('Audio notification not supported');
    }
  };

  // Mark notifications as seen when viewing onboarding tab
  useEffect(() => {
    if (activeTab === TABS.ONBOARDING) {
      setHasNewNotification(false);
      setLastSeenCount(newRequestsCount);
    }
  }, [activeTab, newRequestsCount]);

  // Approve onboarding request
  const handleApprove = async (requestId) => {
    try {
      // Pass null for reviewed_by since admin auth doesn't provide a UUID
      const { error: approveError } = await approveOnboardingRequest(requestId, null);
      if (approveError) throw approveError;
      
      setOnboardingRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'approved' } : r)
      );
      setNewRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  // Reject onboarding request
  const handleReject = async (requestId) => {
    const reason = prompt('Raison du rejet :');
    if (!reason) return;
    
    try {
      // Pass null for reviewed_by since admin auth doesn't provide a UUID
      const { error: rejectError } = await rejectOnboardingRequest(requestId, null, reason);
      if (rejectError) throw rejectError;
      
      setOnboardingRequests(prev => 
        prev.map(r => r.id === requestId ? { ...r, status: 'rejected', admin_note: reason } : r)
      );
      setNewRequestsCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      alert('Erreur: ' + err.message);
    }
  };

  // Force assign driver to order
  const handleForceAssign = (orderId) => {
    const availableDrivers = drivers.filter(d => d.is_online && !d.current_order_id);
    if (availableDrivers.length === 0) {
      alert('Aucun livreur disponible !');
      return;
    }
    const driver = availableDrivers[0];
    alert(`Commande ${orderId} assignée à ${driver.name} !`);
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Get elapsed time
  const getElapsedTime = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}j`;
  };

  const isUrgent = (dateStr) => {
    const created = new Date(dateStr);
    const now = new Date();
    const diffMins = Math.floor((now - created) / 60000);
    return diffMins > 20;
  };

  const onlineDrivers = drivers.filter(d => d.is_online);
  const busyDrivers = drivers.filter(d => d.current_order_id);
  const pendingOnboarding = onboardingRequests.filter(r => r.status === 'pending');
  const pendingOrders = orders.filter(o => o.status === 'pending');

  // Extract payload data from onboarding request
  const getRequestData = (request) => {
    const payload = request.payload || {};
    return {
      name: payload.full_name || payload.establishment_name || payload.manager_name || 'N/A',
      phone: payload.phone || 'N/A',
      type: request.type,
      vehicle: payload.vehicle_type,
      category: payload.category,
      neighborhood: payload.neighborhood || payload.city_neighborhood,
    };
  };

  return (
    <div className="min-h-screen bg-gray-100" data-testid="admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center active:bg-gray-700 transition-colors"
              data-testid="admin-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#FF5A00]" />
                <h1 className="font-bold text-lg">GOD MODE</h1>
              </div>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>

          {/* Notification Bell */}
          <button
            onClick={() => setActiveTab(TABS.ONBOARDING)}
            className="relative w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center"
            data-testid="notification-bell"
          >
            {hasNewNotification ? (
              <BellRing className="w-5 h-5 text-[#FF5A00] animate-pulse" />
            ) : (
              <Bell className="w-5 h-5 text-gray-400" />
            )}
            {newRequestsCount > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                hasNewNotification ? 'bg-red-500 animate-bounce' : 'bg-[#FF5A00]'
              }`}>
                {newRequestsCount > 9 ? '9+' : newRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab(TABS.STATS)}
            className={`flex-shrink-0 py-2 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.STATS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-stats"
          >
            <TrendingUp className="w-4 h-4" />
            Stats
          </button>
          <button
            onClick={() => setActiveTab(TABS.ORDERS)}
            className={`flex-shrink-0 py-2 px-4 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.ORDERS
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-blocked-orders"
          >
            <Package className="w-4 h-4" />
            Commandes
            {pendingOrders.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(TABS.DRIVERS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.DRIVERS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-drivers"
          >
            <Users className="w-4 h-4" />
            Livreurs
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {onlineDrivers.length}/{drivers.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab(TABS.ONBOARDING)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors relative ${
              activeTab === TABS.ONBOARDING
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-onboarding"
          >
            <FileText className="w-4 h-4" />
            Inscriptions
            {pendingOnboarding.length > 0 && (
              <span className={`bg-white/20 px-2 py-0.5 rounded-full text-xs ${
                hasNewNotification ? 'animate-pulse bg-red-500' : ''
              }`}>
                {pendingOnboarding.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(TABS.WALLETS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.WALLETS
                ? 'bg-green-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-wallets"
          >
            <Wallet className="w-4 h-4" />
            Wallets
          </button>
          <button
            onClick={() => setActiveTab(TABS.WITHDRAWALS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.WITHDRAWALS
                ? 'bg-orange-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-withdrawals"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Retraits
          </button>
          <button
            onClick={() => setActiveTab(TABS.REFUNDS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.REFUNDS
                ? 'bg-pink-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-refunds"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Rembours.
          </button>
          <button
            onClick={() => setActiveTab(TABS.SETTINGS)}
            className={`flex-1 py-2 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.SETTINGS
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}
            data-testid="tab-settings"
          >
            <Settings className="w-4 h-4" />
            Config
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-4">
            <p className="text-red-700">{error}</p>
            <button
              onClick={() => { setError(null); loadOnboardingRequests(); }}
              className="mt-2 text-red-600 font-medium flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        )}

        {/* Stats Tab - Multi-Pays */}
        {!isLoading && activeTab === TABS.STATS && (
          <AdminCountryStats 
            onSelectCountry={(countryCode) => {
              setSelectedCountryFilter(countryCode);
              // Optionally switch to another tab to see filtered data
            }}
          />
        )}

        {/* Orders Tab */}
        {!isLoading && activeTab === TABS.ORDERS && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Commandes en attente</h2>
              <button
                onClick={loadOrders}
                className="text-gray-500 hover:text-gray-700"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">Aucune commande en attente</p>
              </div>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl overflow-hidden border-2 ${
                    isUrgent(order.created_at) ? 'border-red-500' : 'border-gray-200'
                  }`}
                  data-testid={`order-${order.id}`}
                >
                  {isUrgent(order.created_at) && (
                    <div className="bg-red-500 text-white px-4 py-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-bold text-sm">URGENT - {getElapsedTime(order.created_at)} d'attente</span>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-bold text-lg text-gray-900">{order.order_number || order.id.slice(0, 8)}</p>
                        <p className="text-sm text-gray-500">{order.partners?.name || 'Restaurant'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{(order.total_amount || 0).toLocaleString()} FCFA</p>
                        <p className="text-xs text-gray-500">{order.payment_method}</p>
                      </div>
                    </div>

                    {order.delivery_address && (
                      <div className="flex items-start gap-2 text-sm mb-3">
                        <MapPin className="w-4 h-4 text-green-500 mt-0.5" />
                        <p className="text-gray-700">{order.delivery_address}</p>
                      </div>
                    )}

                    <button
                      onClick={() => handleForceAssign(order.id)}
                      className="w-full bg-red-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-red-600 transition-colors"
                    >
                      <Zap className="w-5 h-5" />
                      ASSIGNER LIVREUR
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Drivers Tab */}
        {!isLoading && activeTab === TABS.DRIVERS && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{drivers.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{onlineDrivers.length}</p>
                <p className="text-xs text-green-600">En ligne</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{busyDrivers.length}</p>
                <p className="text-xs text-blue-600">En mission</p>
              </div>
            </div>

            <h2 className="font-bold text-gray-900">Liste des livreurs</h2>

            {drivers.map((driver) => (
              <div
                key={driver.id}
                className="bg-white rounded-2xl p-4 border border-gray-200"
                data-testid={`driver-${driver.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    driver.is_online ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {driver.vehicle_type === 'moto' ? (
                      <Bike className={`w-6 h-6 ${driver.is_online ? 'text-green-600' : 'text-gray-400'}`} />
                    ) : (
                      <Car className={`w-6 h-6 ${driver.is_online ? 'text-green-600' : 'text-gray-400'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900">{driver.name}</p>
                      {driver.is_online && (
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{driver.phone}</p>
                  </div>

                  <div className="text-right">
                    {driver.current_order_id ? (
                      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                        <Package className="w-3 h-3" />
                        En mission
                      </span>
                    ) : driver.is_online ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                        Disponible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-medium">
                        Hors ligne
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {driver.total_deliveries} livraisons
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Onboarding Tab */}
        {!isLoading && activeTab === TABS.ONBOARDING && (
          <div className="space-y-4">
            {/* New Requests Alert */}
            {hasNewNotification && pendingOnboarding.length > 0 && (
              <div className="bg-gradient-to-r from-[#FF5A00] to-orange-500 text-white rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                <BellRing className="w-6 h-6" />
                <div>
                  <p className="font-bold">Nouvelles demandes !</p>
                  <p className="text-sm text-white/80">{pendingOnboarding.length} demande(s) en attente de validation</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Demandes d'inscription</h2>
              <button
                onClick={loadOnboardingRequests}
                className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm">Actualiser</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-yellow-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">{pendingOnboarding.length}</p>
                <p className="text-xs text-yellow-600">En attente</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {onboardingRequests.filter(r => r.status === 'approved').length}
                </p>
                <p className="text-xs text-green-600">Approuvées</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {onboardingRequests.filter(r => r.status === 'rejected').length}
                </p>
                <p className="text-xs text-red-600">Rejetées</p>
              </div>
            </div>

            {onboardingRequests.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">Aucune demande d'inscription</p>
                <p className="text-sm text-gray-400 mt-1">Les nouvelles demandes apparaîtront ici en temps réel</p>
              </div>
            ) : (
              onboardingRequests.map((request) => {
                const data = getRequestData(request);
                const isPending = request.status === 'pending';
                
                return (
                  <div
                    key={request.id}
                    className={`bg-white rounded-2xl p-4 border-2 transition-all ${
                      isPending ? 'border-yellow-400 shadow-lg' : 'border-gray-200'
                    }`}
                    data-testid={`onboarding-${request.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        data.type === 'driver' ? 'bg-blue-100' : 'bg-[#FF5A00]/10'
                      }`}>
                        {data.type === 'driver' ? (
                          <Bike className="w-6 h-6 text-blue-600" />
                        ) : (
                          <Store className="w-6 h-6 text-[#FF5A00]" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900">{data.name}</p>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            data.type === 'driver' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-[#FF5A00]/10 text-[#FF5A00]'
                          }`}>
                            {data.type === 'driver' ? 'Livreur' : 'Partenaire'}
                          </span>
                          {/* Status Badge */}
                          {request.status === 'approved' && (
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Approuvé
                            </span>
                          )}
                          {request.status === 'rejected' && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">
                              Rejeté
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{data.phone}</p>
                        
                        {data.vehicle && (
                          <p className="text-sm text-gray-500">Véhicule: {data.vehicle}</p>
                        )}
                        {data.category && (
                          <p className="text-sm text-gray-500">Catégorie: {data.category}</p>
                        )}
                        {data.neighborhood && (
                          <p className="text-sm text-gray-500">Zone: {data.neighborhood}</p>
                        )}
                        
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Soumis il y a {getElapsedTime(request.created_at)}
                        </p>

                        {request.admin_note && (
                          <p className="text-xs text-red-500 mt-1">
                            Raison: {request.admin_note}
                          </p>
                        )}
                      </div>
                    </div>

                    {isPending && (
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => handleReject(request.id)}
                          className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-gray-200 transition-colors"
                          data-testid={`reject-${request.id}`}
                        >
                          <XCircle className="w-5 h-5 text-red-500" />
                          REJETER
                        </button>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="flex-1 bg-green-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 active:bg-green-600 transition-colors"
                          data-testid={`approve-${request.id}`}
                        >
                          <CheckCircle className="w-5 h-5" />
                          APPROUVER
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Wallets Tab */}
        {!isLoading && activeTab === TABS.WALLETS && (
          <AdminWalletsOverview />
        )}

        {/* Withdrawals Tab */}
        {!isLoading && activeTab === TABS.WITHDRAWALS && (
          <AdminWithdrawalsManager adminId="admin" />
        )}

        {/* Refunds Tab */}
        {!isLoading && activeTab === TABS.REFUNDS && (
          <AdminRefundsManager onBack={() => setActiveTab(TABS.ORDERS)} />
        )}

        {/* Settings Tab */}
        {!isLoading && activeTab === TABS.SETTINGS && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2 bg-white rounded-2xl p-2">
              <button
                onClick={() => setSettingsTab('godmode')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'godmode' ? 'bg-red-500 text-white' : 'text-gray-600'
                }`}
              >
                <Shield className="w-4 h-4 inline mr-1" />
                God Mode
              </button>
              <button
                onClick={() => setSettingsTab('promos')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'promos' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
                }`}
              >
                <Tag className="w-4 h-4 inline mr-1" />
                Promos
              </button>
              <button
                onClick={() => setSettingsTab('legal')}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                  settingsTab === 'legal' ? 'bg-[#FF5A00] text-white' : 'text-gray-600'
                }`}
              >
                <Scale className="w-4 h-4 inline mr-1" />
                Légal
              </button>
            </div>

            {settingsTab === 'godmode' && <AdminGodMode />}
            {settingsTab === 'promos' && <AdminPromotionsManager />}
            {settingsTab === 'legal' && (
              <div className="space-y-4">
                <h2 className="font-bold text-gray-900">Textes légaux</h2>
                <p className="text-sm text-gray-500">Modifiez les conditions d'utilisation et mentions légales.</p>

                {['Conditions d\'utilisation', 'Mentions légales', 'Politique de confidentialité', 'Politique cookies'].map((title) => (
                  <div key={title} className="bg-white rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                      <button className="text-[#FF5A00] text-sm font-medium flex items-center gap-1">
                        <Edit3 className="w-4 h-4" />
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
