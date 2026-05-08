/**
 * ACTOOS ONE - Driver App Screen
 * 
 * Dashboard livreur avec missions en temps réel depuis Supabase.
 * PRODUCTION MODE - Wallet connecté à Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft,
  Power,
  MapPin,
  Navigation,
  Phone,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bike,
  User,
  X,
  Wallet,
  Banknote,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Bell,
  Car,
  History,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Smartphone,
  CheckCircle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { updateOrderStatus } from '../services/orderService';
import { 
  getDriverWallet, 
  getDriverTodayEarnings, 
  getWalletTransactions,
  updateDriverOnlineStatus,
  creditDriverEarnings,
  DRIVER_COMMISSION_RATE 
} from '../services/driverService';
import { 
  settleOrder, 
  topUpDriverCaution, 
  withdrawDriverCaution,
  WALLET_TYPES 
} from '../services/financialService';
import { calculateWithdrawal, WALLET_CONFIG } from '../config/businessConfig';

export function DriverAppScreen({ driverId, onBack }) {
  const [isOnline, setIsOnline] = useState(false);
  const [currentMission, setCurrentMission] = useState(null);
  const [availableMissions, setAvailableMissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [handshakeCode, setHandshakeCode] = useState('');
  const [otpError, setOtpError] = useState(false);
  const [deliveryComplete, setDeliveryComplete] = useState(false);
  const [newMissionsCount, setNewMissionsCount] = useState(0);
  const [showWalletHistory, setShowWalletHistory] = useState(false);
  const [walletTransactions, setWalletTransactions] = useState([]);
  
  // Wallet sheets
  const [showWalletSheet, setShowWalletSheet] = useState(false);
  const [walletAction, setWalletAction] = useState(null); // 'topup' | 'withdraw'
  const [walletAmount, setWalletAmount] = useState('');
  const [walletPhone, setWalletPhone] = useState('+223 ');
  const [walletMethod, setWalletMethod] = useState('orange_money');
  const [walletStep, setWalletStep] = useState('amount'); // amount, confirm, processing, success
  const [walletError, setWalletError] = useState(null);
  
  // Wallet livreur - Connecté à Supabase
  const [driverWallet, setDriverWallet] = useState({
    id: null,
    balance: 0,
    pending_cash: 0,
    todayEarnings: 0,
    todayDeliveries: 0,
  });

  // Charger le wallet du driver
  const fetchDriverWallet = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    // En mode test sans vrai userId, utiliser un user test
    const testUserId = driverId || 'test-driver';
    
    // Chercher le driver pour obtenir son user_id
    let userId = null;
    if (driverId && driverId !== 'test-driver') {
      const { data: driver } = await supabase
        .from('drivers')
        .select('user_id')
        .eq('id', driverId)
        .single();
      userId = driver?.user_id;
    }

    if (!userId) {
      // Mode test: wallet mock
      console.log('📱 Driver mode test - wallet mock');
      return;
    }

    try {
      // 1. Charger le wallet
      const { data: wallet, error: walletError } = await getDriverWallet(userId);
      
      if (walletError) {
        console.error('Erreur wallet:', walletError);
        return;
      }

      // 2. Charger les gains du jour
      let todayData = { earnings: 0, deliveries: 0 };
      if (wallet?.id) {
        const { data } = await getDriverTodayEarnings(wallet.id);
        todayData = data || { earnings: 0, deliveries: 0 };
      }

      setDriverWallet({
        id: wallet?.id,
        balance: parseFloat(wallet?.balance || 0),
        pending_cash: 0, // Calculé séparément si besoin
        todayEarnings: todayData.earnings,
        todayDeliveries: todayData.deliveries,
      });

      console.log('✅ Wallet chargé:', wallet?.balance, 'FCFA');
    } catch (err) {
      console.error('Erreur fetchDriverWallet:', err);
    }
  }, [driverId]);

  // Charger l'historique des transactions
  const fetchWalletHistory = useCallback(async () => {
    if (!driverWallet.id) return;

    const { data, error } = await getWalletTransactions(driverWallet.id, { limit: 30 });
    if (!error) {
      setWalletTransactions(data || []);
    }
  }, [driverWallet.id]);

  // Charger les missions disponibles (commandes prêtes sans livreur)
  const fetchAvailableMissions = useCallback(async () => {
    if (!isSupabaseConfigured() || !isOnline) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          partners (name, address, phone),
          order_items (*)
        `)
        .eq('status', 'ready')
        .is('driver_id', null)
        .eq('delivery_type', 'delivery')
        .order('created_at', { ascending: true })
        .limit(20);

      if (fetchError) throw fetchError;

      setAvailableMissions(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchAvailableMissions:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  // Charger la mission en cours
  const fetchCurrentMission = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    // Skip if no real driverId (test mode without specific driver)
    if (!driverId || driverId === 'test-driver') return;

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          partners (name, address, phone),
          order_items (*)
        `)
        .eq('driver_id', driverId)
        .in('status', ['picked_up', 'delivering'])
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        setCurrentMission({
          ...data,
          pickup: {
            name: data.partners?.name || 'Restaurant',
            address: data.partners?.address || 'Adresse non disponible',
            phone: data.partners?.phone,
          },
          dropoff: {
            address: data.delivery_address || 'Adresse client',
            delivery_code: data.delivery_code,
            phone: '+223 70 00 00 00', // TODO: get from user
          },
          items: data.order_items || [],
        });
      }
    } catch (err) {
      console.error('Erreur fetchCurrentMission:', err);
    }
  }, [driverId]);

  // Charger au démarrage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchDriverWallet();
      await fetchCurrentMission();
      if (isOnline) await fetchAvailableMissions();
      setIsLoading(false);
    };
    loadData();
  }, [fetchAvailableMissions, fetchCurrentMission, fetchDriverWallet, isOnline]);

  // Subscription temps réel aux nouvelles missions
  useEffect(() => {
    if (!isSupabaseConfigured() || !isOnline) return;

    console.log('🔔 Driver: Subscribing to available missions');

    const channel = supabase
      .channel('driver-missions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          // Si une commande devient "ready" et n'a pas de livreur
          if (payload.new.status === 'ready' && !payload.new.driver_id) {
            console.log('📦 Nouvelle mission disponible:', payload.new.id);
            setAvailableMissions(prev => {
              if (prev.find(m => m.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
            setNewMissionsCount(prev => prev + 1);
            playNotificationSound();
          }
          // Si une commande a été prise par un autre livreur
          if (payload.new.driver_id && payload.new.driver_id !== driverId) {
            setAvailableMissions(prev => prev.filter(m => m.id !== payload.new.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOnline, driverId]);

  // Son de notification
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 600;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (e) {}
  };

  // Toggle online/offline
  const handleToggleOnline = async () => {
    if (currentMission) {
      alert('Impossible de passer hors ligne pendant une mission !');
      return;
    }

    const newStatus = !isOnline;
    setIsOnline(newStatus);

    // Mettre à jour le statut en base
    if (isSupabaseConfigured() && driverId) {
      await supabase
        .from('drivers')
        .update({ is_online: newStatus })
        .eq('id', driverId);
    }

    if (newStatus) {
      fetchAvailableMissions();
    } else {
      setAvailableMissions([]);
    }
  };

  // Accepter une mission
  const acceptMission = async (mission) => {
    if (!isSupabaseConfigured()) return;

    try {
      // Assigner le livreur à la commande
      const { error } = await supabase
        .from('orders')
        .update({ 
          driver_id: driverId,
          status: 'picked_up',
          picked_up_at: new Date().toISOString(),
        })
        .eq('id', mission.id)
        .is('driver_id', null); // S'assurer qu'elle n'est pas déjà prise

      if (error) throw error;

      // Charger la mission complète
      const { data: fullMission } = await supabase
        .from('orders')
        .select(`
          *,
          partners (name, address, phone),
          order_items (*)
        `)
        .eq('id', mission.id)
        .single();

      if (fullMission) {
        setCurrentMission({
          ...fullMission,
          pickup: {
            name: fullMission.partners?.name || 'Restaurant',
            address: fullMission.partners?.address || 'Adresse',
            phone: fullMission.partners?.phone,
          },
          dropoff: {
            address: fullMission.delivery_address,
            delivery_code: fullMission.delivery_code,
            phone: '+223 70 00 00 00',
          },
          items: fullMission.order_items || [],
        });
      }

      // Retirer de la liste des missions disponibles
      setAvailableMissions(prev => prev.filter(m => m.id !== mission.id));
      
      console.log('✅ Mission acceptée:', mission.id);
    } catch (err) {
      console.error('Erreur acceptMission:', err);
      alert('Erreur: Mission déjà prise par un autre livreur');
      fetchAvailableMissions();
    }
  };

  // Marquer en route vers client
  const startDelivery = async () => {
    if (!currentMission) return;

    const { error } = await updateOrderStatus(currentMission.id, 'delivering');
    if (error) {
      alert('Erreur: ' + error.message);
    } else {
      setCurrentMission(prev => ({ ...prev, status: 'delivering' }));
    }
  };

  // Ouvrir modal validation code
  const handleConfirmDelivery = () => {
    setShowOTPModal(true);
    setHandshakeCode('');
    setOtpError(false);
  };

  // Valider code handshake
  const handleValidateCode = async () => {
    const expectedCode = currentMission?.dropoff?.delivery_code || currentMission?.delivery_code;
    
    // Normaliser les codes pour comparaison (retirer # et mettre en majuscule)
    const normalizedInput = handshakeCode.replace('#', '').toUpperCase();
    const normalizedExpected = (expectedCode || '').replace('#', '').toUpperCase();
    
    if (normalizedInput === normalizedExpected) {
      // Marquer comme livré
      const { error } = await updateOrderStatus(currentMission.id, 'delivered');
      
      if (error) {
        alert('Erreur: ' + error.message);
        return;
      }

      // ===== SETTLEMENT COMPLET (Handshake #A42) =====
      // Répartir les fonds: Partenaire, Livreur, Actoos
      if (driverId && driverId !== 'test-driver') {
        const { data: settlementData, error: settlementError } = await settleOrder(
          currentMission.id, 
          driverId
        );
        
        if (settlementError) {
          console.error('Erreur settlement:', settlementError);
          // Fallback: ancien système de crédit
          const deliveryFee = currentMission.delivery_fee || 500;
          await creditDriverEarnings(
            driverId, 
            currentMission.id, 
            deliveryFee,
            `Livraison ${currentMission.order_number || currentMission.id.slice(0, 8)}`
          );
        } else {
          console.log('✅ Settlement complet:', settlementData);
        }
        
        // Rafraîchir le wallet
        await fetchDriverWallet();
      } else {
        // Mode test: mise à jour locale
        const deliveryFee = currentMission.delivery_fee || 500;
        setDriverWallet(prev => ({
          ...prev,
          balance: prev.balance + deliveryFee,
          todayEarnings: prev.todayEarnings + deliveryFee,
          todayDeliveries: prev.todayDeliveries + 1,
        }));
      }

      setDeliveryComplete(true);
      setShowOTPModal(false);
      
      setTimeout(() => {
        setCurrentMission(null);
        setDeliveryComplete(false);
        fetchAvailableMissions();
      }, 3000);
    } else {
      setOtpError(true);
    }
  };

  // Calculer l'estimation de gain pour une mission (100% des frais de livraison)
  const estimateEarnings = (mission) => {
    return mission.delivery_fee || 500;
  };

  return (
    <div className="min-h-screen bg-gray-100" data-testid="driver-app-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center"
              data-testid="driver-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Bike className="w-5 h-5 text-[#FF5A00]" />
                <h1 className="font-bold text-lg">ACTOOS Driver</h1>
              </div>
              <p className="text-xs text-gray-400">
                {isOnline ? '🟢 En ligne' : '⚫ Hors ligne'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* New missions badge */}
            {newMissionsCount > 0 && isOnline && (
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                {newMissionsCount} nouvelle(s)
              </div>
            )}

            {/* Online toggle */}
            <button
              onClick={handleToggleOnline}
              disabled={!!currentMission}
              className={`w-14 h-8 rounded-full flex items-center px-1 transition-colors ${
                isOnline ? 'bg-green-500' : 'bg-gray-600'
              } ${currentMission ? 'opacity-50' : ''}`}
              data-testid="online-toggle"
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow transition-transform ${
                isOnline ? 'translate-x-6' : 'translate-x-0'
              }`}>
                <Power className={`w-4 h-4 m-1 ${isOnline ? 'text-green-500' : 'text-gray-400'}`} />
              </div>
            </button>
          </div>
        </div>

        {/* Wallet summary */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Caution</p>
            <p className="font-bold text-green-400">{driverWallet.balance.toLocaleString()} F</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Aujourd'hui</p>
            <p className="font-bold text-[#FF5A00]">{driverWallet.todayEarnings.toLocaleString()} F</p>
          </div>
          <div className="bg-gray-800 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Livraisons</p>
            <p className="font-bold text-white">{driverWallet.todayDeliveries}</p>
          </div>
        </div>

        {/* Wallet action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <button
            onClick={() => { setWalletAction('topup'); setShowWalletSheet(true); setWalletStep('amount'); }}
            className="bg-green-600 hover:bg-green-700 rounded-xl p-2 flex items-center justify-center gap-1 text-white text-sm font-medium"
            data-testid="topup-caution-btn"
          >
            <Plus className="w-4 h-4" />
            Recharger
          </button>
          <button
            onClick={() => { setWalletAction('withdraw'); setShowWalletSheet(true); setWalletStep('amount'); }}
            className="bg-orange-600 hover:bg-orange-700 rounded-xl p-2 flex items-center justify-center gap-1 text-white text-sm font-medium"
            data-testid="withdraw-btn"
          >
            <ArrowDownCircle className="w-4 h-4" />
            Retirer
          </button>
          <button
            onClick={() => setShowWalletHistory(true)}
            className="bg-gray-700 hover:bg-gray-600 rounded-xl p-2 flex items-center justify-center gap-1 text-white text-sm font-medium"
            data-testid="history-btn"
          >
            <History className="w-4 h-4" />
            Historique
          </button>
        </div>

        {/* Low caution warning */}
        {driverWallet.balance < WALLET_CONFIG.min_driver_caution && (
          <div className="mt-2 bg-red-900/50 border border-red-500 rounded-xl p-2 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-200">
              Caution faible ! Minimum requis: {WALLET_CONFIG.min_driver_caution.toLocaleString()} F pour recevoir des commandes cash.
            </p>
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

        {/* Offline message */}
        {!isLoading && !isOnline && !currentMission && (
          <div className="text-center py-20">
            <Power className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg font-medium">Vous êtes hors ligne</p>
            <p className="text-gray-500 text-sm mt-1">Passez en ligne pour recevoir des missions</p>
            <button
              onClick={handleToggleOnline}
              className="mt-6 bg-green-500 text-white px-8 py-3 rounded-xl font-bold"
            >
              Passer en ligne
            </button>
          </div>
        )}

        {/* Delivery Complete Animation */}
        {deliveryComplete && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 text-center mx-4 animate-bounce">
              <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Livraison terminée !</h2>
              <p className="text-gray-600 mt-2">Excellent travail 🎉</p>
            </div>
          </div>
        )}

        {/* Current Mission */}
        {currentMission && !deliveryComplete && (
          <div className="space-y-4">
            <div className="bg-[#FF5A00] text-white rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5" />
                <span className="font-bold">MISSION EN COURS</span>
              </div>
              <p className="text-2xl font-bold">
                {currentMission.order_number || `#${currentMission.id?.slice(0, 6)}`}
              </p>
              <p className="text-white/80 text-sm">{currentMission.status === 'picked_up' ? 'Récupérée - En route' : 'En livraison'}</p>
            </div>

            {/* Pickup info */}
            <div className="bg-white rounded-2xl p-4 border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 mb-1">RETRAIT</p>
              <p className="font-bold text-gray-900">{currentMission.pickup?.name}</p>
              <p className="text-sm text-gray-600">{currentMission.pickup?.address}</p>
              {currentMission.pickup?.phone && (
                <a href={`tel:${currentMission.pickup.phone}`} className="text-blue-500 text-sm flex items-center gap-1 mt-1">
                  <Phone className="w-4 h-4" /> {currentMission.pickup.phone}
                </a>
              )}
            </div>

            {/* Dropoff info */}
            <div className="bg-white rounded-2xl p-4 border-l-4 border-green-500">
              <p className="text-xs text-gray-500 mb-1">LIVRAISON</p>
              <p className="font-bold text-gray-900">{currentMission.dropoff?.address}</p>
              {currentMission.dropoff?.phone && (
                <a href={`tel:${currentMission.dropoff.phone}`} className="text-blue-500 text-sm flex items-center gap-1 mt-1">
                  <Phone className="w-4 h-4" /> {currentMission.dropoff.phone}
                </a>
              )}
            </div>

            {/* Items */}
            <div className="bg-white rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-2">ARTICLES ({currentMission.items?.length || 0})</p>
              <div className="space-y-1">
                {(currentMission.items || []).map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                <span>Total</span>
                <span className="text-[#FF5A00]">{(currentMission.total_amount || 0).toLocaleString()} FCFA</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Paiement: {currentMission.payment_method === 'cash' ? '💵 Cash' : '💳 Wallet'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              {currentMission.status === 'picked_up' && (
                <button
                  onClick={startDelivery}
                  className="w-full bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <Navigation className="w-5 h-5" />
                  EN ROUTE VERS CLIENT
                </button>
              )}

              {currentMission.status === 'delivering' && (
                <button
                  onClick={handleConfirmDelivery}
                  className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  CONFIRMER LIVRAISON
                </button>
              )}
            </div>
          </div>
        )}

        {/* Available Missions */}
        {!currentMission && isOnline && !isLoading && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Missions disponibles</h2>
              <button
                onClick={() => { fetchAvailableMissions(); setNewMissionsCount(0); }}
                className="text-gray-500"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {availableMissions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl">
                <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Aucune mission disponible</p>
                <p className="text-gray-400 text-sm">Les nouvelles missions apparaîtront ici</p>
              </div>
            ) : (
              availableMissions.map(mission => (
                <div 
                  key={mission.id} 
                  className="bg-white rounded-2xl p-4 border-2 border-gray-200"
                  data-testid={`mission-${mission.id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900">{mission.partners?.name || 'Restaurant'}</p>
                      <p className="text-sm text-gray-500">{mission.partners?.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-600 font-bold">+{estimateEarnings(mission)} F</p>
                      <p className="text-xs text-gray-400">estimation</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 text-[#FF5A00]" />
                    <span className="truncate">{mission.delivery_address || 'Adresse client'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      mission.payment_method === 'cash' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {mission.payment_method === 'cash' ? '💵 Cash' : '💳 Wallet'}
                    </span>
                    
                    <button
                      onClick={() => acceptMission(mission)}
                      className="bg-[#FF5A00] text-white px-6 py-2 rounded-xl font-bold"
                      data-testid={`accept-${mission.id}`}
                    >
                      ACCEPTER
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* OTP Modal */}
      {showOTPModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end z-50">
          <div className="w-full bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Code de livraison</h3>
              <button onClick={() => setShowOTPModal(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <p className="text-gray-600 mb-4">Demandez le code au client pour confirmer la livraison</p>

            <input
              type="text"
              value={handshakeCode}
              onChange={(e) => { setHandshakeCode(e.target.value.toUpperCase()); setOtpError(false); }}
              placeholder="Ex: A42"
              maxLength={4}
              className={`w-full text-center text-4xl font-mono font-bold py-4 border-2 rounded-2xl ${
                otpError ? 'border-red-500 text-red-500' : 'border-gray-300'
              }`}
              autoFocus
              data-testid="handshake-input"
            />

            {otpError && (
              <p className="text-red-500 text-center mt-2">Code incorrect</p>
            )}

            <button
              onClick={handleValidateCode}
              disabled={handshakeCode.length < 2}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold mt-6 disabled:opacity-50"
              data-testid="validate-code-btn"
            >
              VALIDER
            </button>
          </div>
        </div>
      )}

      {/* Wallet Sheet (Topup / Withdraw) */}
      {showWalletSheet && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={(e) => e.target === e.currentTarget && setShowWalletSheet(false)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {walletAction === 'topup' ? '💳 Recharger Caution' : '💸 Retirer'}
              </h3>
              <button onClick={() => { setShowWalletSheet(false); setWalletError(null); }}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {/* Step: Amount */}
              {walletStep === 'amount' && (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    {walletAction === 'topup' 
                      ? 'Rechargez votre caution pour recevoir des commandes cash'
                      : `Solde disponible: ${driverWallet.balance.toLocaleString()} FCFA`
                    }
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[5000, 10000, 15000, 20000].map(amt => (
                      <button
                        key={amt}
                        onClick={() => setWalletAmount(String(amt))}
                        disabled={walletAction === 'withdraw' && amt > driverWallet.balance}
                        className={`py-4 rounded-2xl font-bold text-lg ${
                          walletAmount === String(amt)
                            ? 'bg-[#FF5A00] text-white'
                            : 'bg-gray-100 text-gray-900 disabled:opacity-50'
                        }`}
                      >
                        {amt.toLocaleString()} F
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    value={walletAmount}
                    onChange={(e) => setWalletAmount(e.target.value)}
                    placeholder="Autre montant"
                    className="w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg font-semibold text-center mb-4"
                  />

                  <button
                    onClick={() => setWalletStep('confirm')}
                    disabled={!walletAmount || parseInt(walletAmount) < 500 || (walletAction === 'withdraw' && parseInt(walletAmount) > driverWallet.balance)}
                    className="w-full py-4 bg-[#FF5A00] text-white font-bold rounded-2xl disabled:opacity-50"
                  >
                    Continuer
                  </button>
                </>
              )}

              {/* Step: Confirm */}
              {walletStep === 'confirm' && (
                <>
                  {walletError && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-3 mb-4">
                      <p className="text-red-700 text-sm">{walletError}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                    <p className="text-sm text-gray-500 mb-2">Méthode de paiement</p>
                    <div className="space-y-2">
                      {[
                        { id: 'orange_money', name: 'Orange Money', icon: '🟠' },
                        { id: 'wave', name: 'Wave', icon: '🌊' },
                        { id: 'moov_money', name: 'Moov Money', icon: '🔵' },
                      ].map(method => (
                        <button
                          key={method.id}
                          onClick={() => setWalletMethod(method.id)}
                          className={`w-full p-3 rounded-xl flex items-center gap-3 ${
                            walletMethod === method.id ? 'bg-[#FF5A00]/10 border-2 border-[#FF5A00]' : 'bg-white border-2 border-gray-200'
                          }`}
                        >
                          <span className="text-xl">{method.icon}</span>
                          <span className="font-medium">{method.name}</span>
                          {walletMethod === method.id && <CheckCircle className="w-5 h-5 text-[#FF5A00] ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm text-gray-500 mb-2 block">Numéro de téléphone</label>
                    <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
                      <Smartphone className="w-5 h-5 text-gray-500" />
                      <input
                        type="tel"
                        value={walletPhone}
                        onChange={(e) => setWalletPhone(e.target.value)}
                        className="flex-1 bg-transparent outline-none"
                        placeholder="+223 XX XX XX XX"
                      />
                    </div>
                  </div>

                  {walletAction === 'withdraw' && (
                    <div className="bg-yellow-50 rounded-2xl p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Frais opérateur:</strong> ~{WALLET_CONFIG.telecom_fees[walletMethod]}%
                      </p>
                      <p className="text-sm text-yellow-800">
                        <strong>Vous recevrez:</strong> ~{Math.round(parseInt(walletAmount || 0) * (1 - WALLET_CONFIG.telecom_fees[walletMethod] / 100)).toLocaleString()} FCFA
                      </p>
                    </div>
                  )}

                  <div className="bg-gray-100 rounded-2xl p-4 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Montant</span>
                      <span className="font-bold text-gray-900">{parseInt(walletAmount || 0).toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      setWalletStep('processing');
                      setWalletError(null);
                      
                      try {
                        if (walletAction === 'topup') {
                          // Simuler recharge (en production: API TouchPay)
                          await new Promise(r => setTimeout(r, 2000));
                          
                          // Mise à jour locale (en production: via financialService)
                          setDriverWallet(prev => ({
                            ...prev,
                            balance: prev.balance + parseInt(walletAmount),
                          }));
                        } else {
                          // Simuler retrait
                          await new Promise(r => setTimeout(r, 2000));
                          
                          setDriverWallet(prev => ({
                            ...prev,
                            balance: prev.balance - parseInt(walletAmount),
                          }));
                        }
                        setWalletStep('success');
                      } catch (err) {
                        setWalletError(err.message || 'Erreur lors de l\'opération');
                        setWalletStep('confirm');
                      }
                    }}
                    disabled={walletPhone.length < 10}
                    className="w-full py-4 bg-[#FF5A00] text-white font-bold rounded-2xl disabled:opacity-50"
                  >
                    {walletAction === 'topup' ? 'Recharger' : 'Retirer'}
                  </button>
                </>
              )}

              {/* Step: Processing */}
              {walletStep === 'processing' && (
                <div className="py-12 text-center">
                  <Loader2 className="w-12 h-12 text-[#FF5A00] animate-spin mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900">Traitement en cours...</p>
                  <p className="text-sm text-gray-500 mt-2">Veuillez patienter</p>
                </div>
              )}

              {/* Step: Success */}
              {walletStep === 'success' && (
                <div className="py-12 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <p className="text-xl font-bold text-gray-900 mb-2">
                    {walletAction === 'topup' ? 'Recharge réussie !' : 'Retrait initié !'}
                  </p>
                  <p className="text-3xl font-bold text-[#FF5A00] mt-4">
                    {walletAction === 'topup' ? '+' : '-'}{parseInt(walletAmount).toLocaleString()} FCFA
                  </p>
                  <p className="text-gray-500 mt-2">
                    Nouveau solde: {driverWallet.balance.toLocaleString()} FCFA
                  </p>

                  <button
                    onClick={() => { setShowWalletSheet(false); setWalletAmount(''); }}
                    className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl mt-8"
                  >
                    Terminé
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Wallet History Sheet */}
      {showWalletHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={(e) => e.target === e.currentTarget && setShowWalletHistory(false)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white px-4 py-4 border-b flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">📜 Historique</h3>
              <button onClick={() => setShowWalletHistory(false)}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-4">
              {walletTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Aucune transaction</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {walletTransactions.map((txn, idx) => (
                    <div key={txn.id || idx} className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        parseFloat(txn.amount) >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {parseFloat(txn.amount) >= 0 
                          ? <ArrowUpCircle className="w-5 h-5 text-green-600" />
                          : <ArrowDownCircle className="w-5 h-5 text-red-600" />
                        }
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{txn.description || txn.type}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(txn.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className={`font-bold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(txn.amount) >= 0 ? '+' : ''}{parseFloat(txn.amount).toLocaleString()} F
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default DriverAppScreen;
