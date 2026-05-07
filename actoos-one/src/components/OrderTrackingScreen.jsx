import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Phone, 
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle,
  ChefHat,
  Package,
  Truck,
  Home,
  Navigation,
  Star,
  Copy,
  Check,
  X,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { getOrderById, subscribeToOrder } from '../services/orderService';

// Order status flow
const ORDER_STATUSES = {
  CONFIRMED: 'confirmed',       // Commande confirmée
  PREPARING: 'preparing',       // En préparation
  READY: 'ready',              // Prêt pour collecte
  PICKED_UP: 'picked_up',      // Livreur en route
  ARRIVING: 'arriving',        // Proche de l'adresse
  DELIVERED: 'delivered',      // Livré
  CANCELLED: 'cancelled'       // Annulée
};

// Status configurations
const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    description: 'Votre commande a été reçue',
    icon: Clock,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    progress: 5,
  },
  [ORDER_STATUSES.CONFIRMED]: {
    label: 'Commande confirmée',
    description: 'Le restaurant a confirmé votre commande',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    progress: 15,
  },
  [ORDER_STATUSES.PREPARING]: {
    label: 'En préparation',
    description: 'Le chef prépare votre commande',
    icon: ChefHat,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    progress: 35,
  },
  [ORDER_STATUSES.READY]: {
    label: 'Prêt',
    description: 'Votre commande est prête',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    progress: 55,
  },
  [ORDER_STATUSES.PICKED_UP]: {
    label: 'En route',
    description: 'Le livreur a récupéré votre commande',
    icon: Truck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    progress: 70,
  },
  delivering: {
    label: 'En livraison',
    description: 'Le livreur est en chemin vers vous',
    icon: Truck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    progress: 85,
  },
  [ORDER_STATUSES.ARRIVING]: {
    label: 'Arrivée imminente',
    description: 'Le livreur est proche',
    icon: Navigation,
    color: 'text-[#FF5A00]',
    bgColor: 'bg-orange-100',
    progress: 95,
  },
  [ORDER_STATUSES.DELIVERED]: {
    label: 'Livrée',
    description: 'Bon appétit !',
    icon: Home,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    progress: 100,
  },
  [ORDER_STATUSES.CANCELLED]: {
    label: 'Annulée',
    description: 'La commande a été annulée',
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    progress: 0,
  },
};

// Mock driver data (until driver table is populated)
const MOCK_DRIVER = {
  id: 'drv-001',
  name: 'Moussa Traoré',
  phone: '+223 76 12 34 56',
  photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
  rating: 4.8,
  vehicle: 'Moto - KK 2345 ML',
  totalDeliveries: 542,
};

/**
 * Order Tracking Screen with Realtime Updates
 * 
 * @param {Object} props
 * @param {string} props.orderId - ID de la commande à suivre
 * @param {Object} props.order - Commande initiale (optionnel, pour éviter un fetch)
 * @param {Function} props.onBack - Callback retour
 * @param {Function} props.onComplete - Callback commande terminée
 */
export function OrderTrackingScreen({ orderId, order: initialOrder, onBack, onComplete }) {
  const [currentOrder, setCurrentOrder] = useState(initialOrder || null);
  const [isLoading, setIsLoading] = useState(!initialOrder);
  const [error, setError] = useState(null);
  const [showDriverSheet, setShowDriverSheet] = useState(false);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [statusUpdated, setStatusUpdated] = useState(false);

  // Build timeline from order
  const buildTimeline = useCallback((order) => {
    if (!order) return [];
    
    const statusFlow = ['confirmed', 'preparing', 'ready', 'picked_up', 'delivering', 'delivered'];
    const currentStatusIndex = statusFlow.indexOf(order.status);
    
    return statusFlow.map((status, index) => {
      let time = null;
      if (order[`${status}_at`]) {
        time = new Date(order[`${status}_at`]).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      } else if (status === 'confirmed' && order.created_at) {
        time = new Date(order.created_at).toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      }
      
      return {
        status,
        time,
        completed: index <= currentStatusIndex,
      };
    });
  }, []);

  // Load order from Supabase
  const loadOrder = useCallback(async () => {
    if (!orderId && !initialOrder) return;
    
    const targetId = orderId || initialOrder?.id;
    if (!targetId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await getOrderById(targetId);
      
      if (fetchError) throw fetchError;
      
      if (data) {
        setCurrentOrder({
          ...data,
          driver: data.driver || MOCK_DRIVER, // Use mock driver until real drivers exist
          timeline: buildTimeline(data),
          handshake_code: data.delivery_code ? `#${data.delivery_code}` : '#0000',
        });
      }
    } catch (err) {
      console.error('Erreur chargement commande:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, initialOrder, buildTimeline]);

  // Initial load
  useEffect(() => {
    if (!currentOrder) {
      loadOrder();
    }
  }, [loadOrder, currentOrder]);

  // Realtime subscription for order updates
  useEffect(() => {
    const targetId = orderId || currentOrder?.id;
    if (!targetId || !isSupabaseConfigured()) return;

    console.log('🔔 Subscribing to order updates:', targetId);

    const unsubscribe = subscribeToOrder(targetId, (updatedOrder) => {
      console.log('📡 Order updated:', updatedOrder.status);
      
      setCurrentOrder(prev => ({
        ...prev,
        ...updatedOrder,
        driver: prev?.driver || MOCK_DRIVER,
        timeline: buildTimeline(updatedOrder),
        handshake_code: updatedOrder.delivery_code ? `#${updatedOrder.delivery_code}` : prev?.handshake_code,
      }));

      // Show visual feedback
      setStatusUpdated(true);
      setTimeout(() => setStatusUpdated(false), 2000);

      // Show rating when delivered
      if (updatedOrder.status === 'delivered') {
        setTimeout(() => setShowRating(true), 1500);
      }
    });

    return () => {
      console.log('🔕 Unsubscribing from order updates');
      unsubscribe();
    };
  }, [orderId, currentOrder?.id, buildTimeline]);

  // Get current status config
  const getStatusConfig = () => {
    const status = currentOrder?.status || 'pending';
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };
  
  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  
  const handleCopyCode = () => {
    const code = currentOrder?.handshake_code || currentOrder?.delivery_code;
    if (code) {
      navigator.clipboard.writeText(code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };
  
  const handleCallDriver = () => {
    const phone = currentOrder?.driver?.phone;
    if (phone) window.location.href = `tel:${phone}`;
  };
  
  const handleWhatsAppDriver = () => {
    const phone = currentOrder?.driver?.phone?.replace(/[^0-9]/g, '');
    if (phone) window.open(`https://wa.me/${phone}`, '_blank');
  };

  const handleSubmitRating = () => {
    console.log('Rating submitted:', rating);
    setShowRating(false);
    if (onComplete) onComplete();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#FF5A00] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Chargement de la commande...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !currentOrder) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold mb-2">Erreur de chargement</p>
          <p className="text-gray-500 mb-4">{error || 'Commande introuvable'}</p>
          <button
            onClick={loadOrder}
            className="px-6 py-3 bg-[#FF5A00] text-white rounded-xl font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Get restaurant info
  const restaurant = currentOrder.partners || currentOrder.restaurant || {};
  const orderItems = currentOrder.order_items || currentOrder.items || [];
  const timeline = currentOrder.timeline || buildTimeline(currentOrder);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" data-testid="order-tracking-screen">
      {/* Map Section - Top 40% */}
      <div className="relative h-[40vh] min-h-[250px] bg-gradient-to-br from-gray-100 to-gray-200">
        {/* Simplified Map View */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-[#FF5A00] rounded-full flex items-center justify-center shadow-lg border-4 border-white">
                <Truck className="w-10 h-10 text-white" />
              </div>
              {currentOrder.status !== 'delivered' && currentOrder.status !== 'cancelled' && (
                <div className="absolute inset-0 w-20 h-20 bg-[#FF5A00] rounded-full animate-ping opacity-30" />
              )}
            </div>
            <p className="mt-4 text-gray-600 font-medium">{statusConfig.label}</p>
          </div>
        </div>
        
        {/* Back Button Overlay */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg z-10"
          data-testid="tracking-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        {/* Order Number Badge */}
        <div className="absolute top-4 right-4 bg-white rounded-2xl px-4 py-2 shadow-lg">
          <p className="text-xs text-gray-500">Commande</p>
          <p className="font-bold text-gray-900">{currentOrder.order_number || currentOrder.id?.slice(0, 8)}</p>
        </div>

        {/* Status Updated Toast */}
        {statusUpdated && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium animate-bounce shadow-lg">
            ✓ Statut mis à jour !
          </div>
        )}
      </div>
      
      {/* Content Section - Bottom Sheet Style */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
        </div>
        
        <div className="px-4 pb-8">
          {/* Current Status */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-14 h-14 ${statusConfig.bgColor} rounded-2xl flex items-center justify-center`}>
              <StatusIcon className={`w-7 h-7 ${statusConfig.color}`} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">{statusConfig.label}</h1>
              <p className="text-gray-500">{statusConfig.description}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#FF5A00] rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${statusConfig.progress}%` }}
              />
            </div>
          </div>
          
          {/* Timeline */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="space-y-0">
              {timeline.map((event, index) => {
                const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                const Icon = config.icon;
                const isActive = event.status === currentOrder.status;
                const isLast = index === timeline.length - 1;
                
                return (
                  <div key={event.status} className="flex items-start gap-3">
                    {/* Icon & Line */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        event.completed 
                          ? 'bg-green-100' 
                          : isActive 
                            ? config.bgColor 
                            : 'bg-gray-200'
                      }`}>
                        {event.completed ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Icon className={`w-4 h-4 ${isActive ? config.color : 'text-gray-400'}`} />
                        )}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 h-8 ${event.completed ? 'bg-green-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <p className={`font-medium ${
                          event.completed || isActive ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {config.label}
                        </p>
                        {event.time && (
                          <span className="text-xs text-gray-500">{event.time}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Driver Card - Show when driver assigned */}
          {currentOrder.driver && currentOrder.status !== ORDER_STATUSES.CONFIRMED && 
           currentOrder.status !== ORDER_STATUSES.PREPARING && (
            <div 
              className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 cursor-pointer active:bg-gray-50"
              onClick={() => setShowDriverSheet(true)}
              data-testid="driver-card"
            >
              <div className="flex items-center gap-4">
                <img 
                  src={currentOrder.driver.photo}
                  alt={currentOrder.driver.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#FF5A00]"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{currentOrder.driver.name}</h3>
                  <p className="text-sm text-gray-500">{currentOrder.driver.vehicle}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium text-gray-700">{currentOrder.driver.rating}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCallDriver(); }}
                    className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center"
                  >
                    <Phone className="w-5 h-5 text-green-600" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleWhatsAppDriver(); }}
                    className="w-10 h-10 bg-[#25D366]/10 rounded-xl flex items-center justify-center"
                  >
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Handshake Code */}
          <div className="bg-[#FF5A00]/5 border border-[#FF5A00]/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Code de remise</p>
                <p className="text-3xl font-mono font-bold text-[#FF5A00]" data-testid="handshake-code">
                  {currentOrder.handshake_code || `#${currentOrder.delivery_code || '0000'}`}
                </p>
                <p className="text-xs text-gray-500 mt-1">Donnez ce code au livreur</p>
              </div>
              <button 
                onClick={handleCopyCode}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  codeCopied ? 'bg-green-100' : 'bg-gray-100'
                }`}
              >
                {codeCopied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Détails commande</h3>
              <span className="text-xs text-gray-500">{currentOrder.order_number || currentOrder.id?.slice(0, 8)}</span>
            </div>
            
            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
              <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#FF5A00]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{restaurant.name || 'Restaurant'}</p>
                <p className="text-xs text-gray-500">{restaurant.address || currentOrder.delivery_address}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.quantity}x {item.name}</span>
                  {item.unit_price && (
                    <span className="text-gray-500">{(item.unit_price * item.quantity).toLocaleString()} F</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex justify-between font-bold text-gray-900 pt-3 mt-3 border-t border-gray-200">
              <span>Total</span>
              <span className="text-[#FF5A00]">{(currentOrder.total_amount || currentOrder.total || 0).toLocaleString()} FCFA</span>
            </div>
          </div>
          
          {/* Help Button */}
          <button 
            onClick={() => setShowHelpSheet(true)}
            className="w-full py-4 border border-gray-200 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-2"
            data-testid="help-btn"
          >
            <AlertCircle className="w-5 h-5" />
            Besoin d'aide ?
          </button>
        </div>
      </div>
      
      {/* Driver Detail Sheet */}
      <BottomSheet
        isOpen={showDriverSheet}
        onClose={() => setShowDriverSheet(false)}
        title="Votre livreur"
      >
        {currentOrder.driver && (
          <div className="py-4">
            <div className="flex flex-col items-center mb-6">
              <img 
                src={currentOrder.driver.photo}
                alt={currentOrder.driver.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-[#FF5A00] mb-3"
              />
              <h2 className="text-xl font-bold text-gray-900">{currentOrder.driver.name}</h2>
              <p className="text-gray-500">{currentOrder.driver.vehicle}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="font-medium text-gray-700">{currentOrder.driver.rating}</span>
                </div>
                <span className="text-sm text-gray-500">{currentOrder.driver.totalDeliveries} livraisons</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleCallDriver}
                className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Phone className="w-5 h-5" />
                Appeler
              </button>
              <button 
                onClick={handleWhatsAppDriver}
                className="flex-1 py-4 bg-[#25D366] text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
      
      {/* Help Sheet */}
      <BottomSheet
        isOpen={showHelpSheet}
        onClose={() => setShowHelpSheet(false)}
        title="Besoin d'aide ?"
      >
        <div className="py-4 space-y-3">
          <button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-left px-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-500" />
            Ma commande est en retard
          </button>
          <button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-left px-4 flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-500" />
            Article manquant ou incorrect
          </button>
          <button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-left px-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" />
            Problème d'adresse
          </button>
          <button className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium text-left px-4 flex items-center gap-3">
            <X className="w-5 h-5 text-gray-500" />
            Annuler ma commande
          </button>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center mb-3">Ou contactez le support</p>
            <a
              href="https://wa.me/22370000000"
              className="w-full py-4 bg-[#25D366] text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp Support
            </a>
          </div>
        </div>
      </BottomSheet>
      
      {/* Rating Sheet - Shows after delivery */}
      <BottomSheet
        isOpen={showRating}
        onClose={() => setShowRating(false)}
        title="Comment était votre livraison ?"
      >
        <div className="py-4">
          {/* Driver */}
          {currentOrder.driver && (
            <div className="flex flex-col items-center mb-6">
              <img 
                src={currentOrder.driver.photo}
                alt={currentOrder.driver.name}
                className="w-20 h-20 rounded-full object-cover mb-3"
              />
              <h3 className="font-semibold text-gray-900">{currentOrder.driver.name}</h3>
            </div>
          )}
          
          {/* Star Rating */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-2"
              >
                <Star 
                  className={`w-10 h-10 transition-colors ${
                    star <= rating 
                      ? 'text-yellow-400 fill-yellow-400' 
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          
          {/* Rating Labels */}
          <div className="text-center mb-6">
            {rating === 0 && <p className="text-gray-500">Touchez pour noter</p>}
            {rating === 1 && <p className="text-red-500">Très mauvais</p>}
            {rating === 2 && <p className="text-orange-500">Mauvais</p>}
            {rating === 3 && <p className="text-yellow-600">Moyen</p>}
            {rating === 4 && <p className="text-green-500">Bien</p>}
            {rating === 5 && <p className="text-green-600 font-semibold">Excellent !</p>}
          </div>
          
          {/* Submit */}
          <button
            onClick={handleSubmitRating}
            disabled={rating === 0}
            className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
              rating > 0 
                ? 'bg-[#FF5A00] text-white' 
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {rating > 0 ? 'Envoyer' : 'Choisissez une note'}
          </button>
          
          <button
            onClick={() => setShowRating(false)}
            className="w-full py-3 text-gray-500 font-medium mt-2"
          >
            Plus tard
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
