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
  History
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
    
    if (handshakeCode === expectedCode) {
      // Marquer comme livré
      const { error } = await updateOrderStatus(currentMission.id, 'delivered');
      
      if (error) {
        alert('Erreur: ' + error.message);
        return;
      }

      // Calculer gains (100% des frais de livraison)
      const deliveryFee = currentMission.delivery_fee || 500;
      const earnings = deliveryFee; // Driver reçoit 100% des frais de livraison

      // Créditer le wallet via Supabase
      if (driverId && driverId !== 'test-driver') {
        const { error: creditError } = await creditDriverEarnings(
          driverId, 
          currentMission.id, 
          earnings,
          `Livraison ${currentMission.order_number || currentMission.id.slice(0, 8)}`
        );
        
        if (creditError) {
          console.error('Erreur crédit wallet:', creditError);
        } else {
          // Rafraîchir le wallet
          await fetchDriverWallet();
        }
      } else {
        // Mode test: mise à jour locale
        setDriverWallet(prev => ({
          ...prev,
          balance: prev.balance + earnings,
          todayEarnings: prev.todayEarnings + earnings,
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
            <p className="text-xs text-gray-400">Solde</p>
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
              placeholder="Ex: 1234"
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
              disabled={handshakeCode.length !== 4}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold mt-6 disabled:opacity-50"
              data-testid="validate-code-btn"
            >
              VALIDER
            </button>
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
