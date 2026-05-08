/**
 * ACTOOS ONE - Order History Screen
 * 
 * Historique des commandes avec données RÉELLES de Supabase
 * Avec possibilité d'annuler les commandes en attente
 * et supprimer de l'historique (swipe to delete)
 */

import { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  MapPin, 
  ChevronRight,
  RefreshCw,
  Star,
  CheckCircle,
  XCircle,
  Truck,
  ShoppingBag,
  Loader2,
  AlertCircle,
  X,
  Trash2
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getUserOrders, cancelOrder } from '../services/orderService';

// Status labels et couleurs
const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  preparing: { label: 'En préparation', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  ready: { label: 'Prête', color: 'bg-green-100 text-green-700', icon: Package },
  picked_up: { label: 'Récupérée', color: 'bg-purple-100 text-purple-700', icon: ShoppingBag },
  delivering: { label: 'En livraison', color: 'bg-blue-100 text-blue-700', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// Formater la date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long' });
  }
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('fr-FR', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function OrderHistoryScreen({ onBack, onReorder, onViewRestaurant }) {
  const { user } = useAuth();
  const { addToCart, setActiveRestaurant, clearCart } = useCart();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Charger les commandes depuis Supabase
  useEffect(() => {
    async function loadOrders() {
      if (!user?.id) {
        setOrders([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await getUserOrders(user.id, { limit: 50 });
        
        if (fetchError) {
          throw fetchError;
        }
        
        // Filtrer les commandes supprimées localement
        const deletedOrders = JSON.parse(localStorage.getItem('actoos_deleted_orders') || '[]');
        const filteredData = (data || []).filter(order => !deletedOrders.includes(order.id));
        
        setOrders(filteredData);
      } catch (err) {
        console.error('Erreur chargement commandes:', err);
        setError('Impossible de charger vos commandes');
      } finally {
        setLoading(false);
      }
    }
    
    loadOrders();
  }, [user?.id]);

  // Annuler une commande
  const handleCancelOrder = async (orderId) => {
    setCancellingId(orderId);
    
    try {
      const { error: cancelError } = await cancelOrder(orderId);
      
      if (cancelError) {
        throw cancelError;
      }
      
      // Mettre à jour l'état local
      setOrders(prev => 
        prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
      );
      
      setShowCancelConfirm(null);
    } catch (err) {
      console.error('Erreur annulation:', err);
      alert('Impossible d\'annuler la commande. Veuillez réessayer.');
    } finally {
      setCancellingId(null);
    }
  };

  // Supprimer de l'historique (localement - masque sans supprimer en DB)
  const handleDeleteFromHistory = (orderId) => {
    setDeletingId(orderId);
    
    // Supprimer de l'état local (on pourrait aussi marquer comme supprimé en DB)
    setTimeout(() => {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      
      // Sauvegarder les IDs supprimés en localStorage
      const deletedOrders = JSON.parse(localStorage.getItem('actoos_deleted_orders') || '[]');
      if (!deletedOrders.includes(orderId)) {
        deletedOrders.push(orderId);
        localStorage.setItem('actoos_deleted_orders', JSON.stringify(deletedOrders));
      }
      
      setShowDeleteConfirm(null);
      setDeletingId(null);
      
      // Si on était sur le détail, revenir à la liste
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    }, 300);
  };

  // Recommander une commande (disponible pour tous les statuts terminés)
  const handleReorder = (order) => {
    if (!order.order_items || order.order_items.length === 0) {
      alert('Impossible de recommander cette commande');
      return;
    }
    
    // Vider le panier et définir le restaurant actif
    clearCart();
    
    // Créer un objet restaurant minimal pour setActiveRestaurant
    const restaurantInfo = {
      id: order.partner_id || order.restaurant_id,
      name: order.partners?.name || 'Restaurant',
      image: order.partners?.image_url || null,
      deliveryTime: '30-45 min',
      deliveryFee: order.delivery_fee || 500,
      rating: order.partners?.rating || 4.5,
    };
    setActiveRestaurant(restaurantInfo);
    
    // Ajouter les articles au panier
    order.order_items.forEach(item => {
      addToCart({
        id: item.menu_item_id || `item_${Date.now()}_${Math.random()}`,
        name: item.name,
        price: item.unit_price,
        max_per_order: 10,
        image: item.menu_items?.image_url || null,
      }, item.quantity, '', restaurantInfo);
    });
    
    if (onReorder) {
      onReorder(order);
    }
  };

  // Peut-on recommander cette commande ?
  const canReorder = (status) => {
    // Disponible pour les commandes terminées ou annulées
    return ['delivered', 'cancelled', 'picked_up'].includes(status);
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  };

  // Composant SwipeableOrderCard
  function SwipeableOrderCard({ order, onDelete, onSelect, onReorder, onCancel, canCancel, canReorderOrder }) {
    const [translateX, setTranslateX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const startXRef = useRef(0);
    const currentXRef = useRef(0);
    const cardRef = useRef(null);
    
    const DELETE_THRESHOLD = -80; // Seuil pour déclencher la suppression
    const MAX_SWIPE = -100;
    
    const statusConfig = getStatusConfig(order.status);
    const StatusIcon = statusConfig.icon;
    const itemNames = order.order_items?.slice(0, 2).map(i => i.name).join(', ') || '';

    const handleTouchStart = (e) => {
      startXRef.current = e.touches[0].clientX;
      currentXRef.current = translateX;
      setIsDragging(true);
    };

    const handleTouchMove = (e) => {
      if (!isDragging) return;
      const diff = e.touches[0].clientX - startXRef.current;
      const newX = Math.max(MAX_SWIPE, Math.min(0, currentXRef.current + diff));
      setTranslateX(newX);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      if (translateX < DELETE_THRESHOLD) {
        // Garder ouvert pour montrer le bouton delete
        setTranslateX(MAX_SWIPE);
      } else {
        // Retour à la position initiale
        setTranslateX(0);
      }
    };

    const handleDeleteClick = (e) => {
      e.stopPropagation();
      onDelete(order.id);
      setTranslateX(0);
    };

    return (
      <div className="relative overflow-hidden rounded-2xl">
        {/* Fond rouge avec icône delete */}
        <div 
          className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center"
          onClick={handleDeleteClick}
        >
          <Trash2 className="w-6 h-6 text-white" />
        </div>
        
        {/* Card swipeable */}
        <div
          ref={cardRef}
          className="bg-white border border-gray-100 relative transition-transform duration-200 ease-out"
          style={{ 
            transform: `translateX(${translateX}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Order Header - Clickable */}
          <div 
            className="p-4 cursor-pointer"
            onClick={() => translateX === 0 && onSelect(order)}
            data-testid={`order-card-${order.id}`}
          >
            <div className="flex items-start gap-3">
              {/* Restaurant Image */}
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                {order.partners?.image_url ? (
                  <img 
                    src={order.partners.image_url} 
                    alt={order.partners?.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{order.partners?.name || 'Restaurant'}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(order.created_at)} à {formatTime(order.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>

                {/* Items Preview */}
                <p className="text-sm text-gray-600 mt-1 truncate">{itemNames}</p>

                {/* Status & Total */}
                <div className="flex items-center justify-between mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusConfig.label}
                  </span>
                  <span className="font-semibold text-gray-900">{order.total_amount?.toLocaleString()} F</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            {/* Cancel Button */}
            {canCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCancel(order.id);
                }}
                className="flex-1 py-3 bg-red-50 text-red-600 font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-red-100"
              >
                <XCircle className="w-4 h-4" />
                Annuler
              </button>
            )}
            
            {/* Reorder Button - for completed orders */}
            {canReorderOrder && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(order);
                }}
                className="flex-1 py-3 bg-[#FF5A00]/10 text-[#FF5A00] font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-[#FF5A00]/20"
              >
                <RefreshCw className="w-4 h-4" />
                Recommander
              </button>
            )}
          </div>
          
          {/* Indicateur swipe (hint) */}
          <div className="absolute top-1/2 right-2 -translate-y-1/2 text-gray-300 text-xs opacity-50">
            ← Glisser
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100">
          <button onClick={onBack} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Mes commandes</h1>
        </div>
        <div className="p-4 text-center">
          <AlertCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Order Detail View
  if (selectedOrder) {
    const statusConfig = getStatusConfig(selectedOrder.status);
    const StatusIcon = statusConfig.icon;
    const totalItems = selectedOrder.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const canCancel = ['pending', 'confirmed'].includes(selectedOrder.status);
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
          <button
            onClick={() => setSelectedOrder(null)}
            className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Détails commande</h1>
            <p className="text-sm text-gray-500">#{selectedOrder.id?.slice(-8)}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Restaurant Card */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
            <div className="h-32 relative">
              <img 
                src={selectedOrder.partners?.image_url || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop'} 
                alt={selectedOrder.partners?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h2 className="font-bold text-lg">{selectedOrder.partners?.name || 'Restaurant'}</h2>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusConfig.color}`}>
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </span>
              <div className="text-right">
                <p className="text-sm text-gray-500">{formatDate(selectedOrder.created_at)}</p>
                <p className="text-xs text-gray-400">{formatTime(selectedOrder.created_at)}</p>
              </div>
            </div>

            {selectedOrder.handshake_code && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-sm text-gray-500">Code:</span>
                <span className="font-mono font-bold text-[#FF5A00]">{selectedOrder.handshake_code}</span>
              </div>
            )}
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Livraison</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-[#FF5A00]" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Adresse</p>
                <p className="text-sm text-gray-500">{selectedOrder.delivery_address || 'Non spécifiée'}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Articles ({totalItems})</h3>
            <div className="space-y-3">
              {selectedOrder.order_items?.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <span className="text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-gray-600">{(item.unit_price * item.quantity).toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-[#FF5A00]">{selectedOrder.total_amount?.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Cancel Button - Only for pending/confirmed */}
            {canCancel && (
              <button
                onClick={() => setShowCancelConfirm(selectedOrder.id)}
                className="w-full py-4 bg-red-50 text-red-600 font-semibold rounded-2xl flex items-center justify-center gap-2 active:bg-red-100"
              >
                <XCircle className="w-5 h-5" />
                Annuler la commande
              </button>
            )}

            {/* Reorder Button - For completed orders */}
            {canReorder(selectedOrder.status) && (
              <button
                onClick={() => handleReorder(selectedOrder)}
                className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 active:bg-[#E55100]"
              >
                <RefreshCw className="w-5 h-5" />
                Commander à nouveau
              </button>
            )}

            {/* Delete from History Button */}
            <button
              onClick={() => setShowDeleteConfirm(selectedOrder.id)}
              className="w-full py-4 bg-gray-100 text-gray-600 font-semibold rounded-2xl flex items-center justify-center gap-2 active:bg-gray-200"
            >
              <Trash2 className="w-5 h-5" />
              Supprimer de l'historique
            </button>
          </div>
        </div>

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Annuler la commande ?</h3>
                <p className="text-gray-500 mt-2">Cette action est irréversible.</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Non, garder
                </button>
                <button
                  onClick={() => handleCancelOrder(showCancelConfirm)}
                  disabled={cancellingId === showCancelConfirm}
                  className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {cancellingId === showCancelConfirm ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Oui, annuler'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Supprimer de l'historique ?</h3>
                <p className="text-gray-500 mt-2">Cette commande disparaîtra de votre historique.</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteFromHistory(showDeleteConfirm)}
                  disabled={deletingId === showDeleteConfirm}
                  className="flex-1 py-3 bg-gray-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
                >
                  {deletingId === showDeleteConfirm ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Order List View
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center gap-4 border-b border-gray-100 sticky top-0 z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
          data-testid="order-history-back-btn"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mes commandes</h1>
          <p className="text-sm text-gray-500">{orders.length} commande{orders.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {/* Hint pour swipe */}
        {orders.length > 0 && (
          <p className="text-xs text-gray-400 text-center mb-2">
            ← Glissez vers la gauche pour supprimer
          </p>
        )}
        
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune commande</p>
            <p className="text-sm text-gray-400 mt-1">Vos commandes apparaîtront ici</p>
          </div>
        ) : (
          orders.map((order) => {
            const orderCanCancel = ['pending', 'confirmed'].includes(order.status);
            const orderCanReorder = canReorder(order.status);
            
            return (
              <SwipeableOrderCard
                key={order.id}
                order={order}
                onDelete={(id) => setShowDeleteConfirm(id)}
                onSelect={setSelectedOrder}
                onReorder={handleReorder}
                onCancel={(id) => setShowCancelConfirm(id)}
                canCancel={orderCanCancel}
                canReorderOrder={orderCanReorder}
              />
            );
          })
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Annuler la commande ?</h3>
              <p className="text-gray-500 mt-2">Cette action est irréversible.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                Non, garder
              </button>
              <button
                onClick={() => handleCancelOrder(showCancelConfirm)}
                disabled={cancellingId === showCancelConfirm}
                className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {cancellingId === showCancelConfirm ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Oui, annuler'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (List View) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Supprimer de l'historique ?</h3>
              <p className="text-gray-500 mt-2">Cette commande disparaîtra de votre historique.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDeleteFromHistory(showDeleteConfirm)}
                disabled={deletingId === showDeleteConfirm}
                className="flex-1 py-3 bg-gray-800 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {deletingId === showDeleteConfirm ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Supprimer'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
