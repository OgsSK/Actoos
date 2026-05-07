import { useState } from 'react';
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
  Calendar,
  Phone
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { restaurants } from '../data/mockData';
import { getRestaurantMenu } from '../data/menuData';

// Mock order history data
const mockOrderHistory = [
  {
    id: 'ORD-2025050701',
    restaurant_id: 'rest-001',
    restaurant_name: 'Maquis Chez Tanti',
    restaurant_image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    type: 'restaurant',
    status: 'delivered',
    status_label: 'Livrée',
    date: '2025-05-06T19:30:00Z',
    delivery_mode: 'delivery',
    delivery_address: 'Hamdallaye ACI 2000, Bamako',
    items: [
      { id: 'item-001', name: 'Riz au Gras', quantity: 3, price: 2500 },
      { id: 'item-004', name: 'Alloco', quantity: 1, price: 500 },
    ],
    subtotal: 8000,
    delivery_fee: 500,
    promo_discount: 2000,
    total: 6500,
    handshake_code: '#K42',
    rating: null,
  },
  {
    id: 'ORD-2025050502',
    restaurant_id: 'rest-003',
    restaurant_name: 'Fast Food Bamako',
    restaurant_image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
    type: 'restaurant',
    status: 'delivered',
    status_label: 'Livrée',
    date: '2025-05-05T20:15:00Z',
    delivery_mode: 'delivery',
    delivery_address: 'Badalabougou, Bamako',
    items: [
      { id: 'item-burger-1', name: 'Burger Classic', quantity: 2, price: 3500 },
      { id: 'item-fries-1', name: 'Frites maison', quantity: 2, price: 1000 },
    ],
    subtotal: 9000,
    delivery_fee: 500,
    promo_discount: 0,
    total: 9500,
    handshake_code: '#B15',
    rating: 5,
  },
  {
    id: 'ORD-2025050403',
    restaurant_id: 'pharm-001',
    restaurant_name: 'Pharmacie du Point G',
    restaurant_image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop',
    type: 'pharmacy',
    status: 'delivered',
    status_label: 'Livrée',
    date: '2025-05-04T10:00:00Z',
    delivery_mode: 'pickup',
    items: [
      { id: 'med-001', name: 'Doliprane 500mg', quantity: 1, price: 1500 },
      { id: 'med-002', name: 'Vitamine C 1000', quantity: 2, price: 2500 },
    ],
    subtotal: 6500,
    delivery_fee: 0,
    promo_discount: 0,
    total: 6500,
    handshake_code: '#P99',
    rating: 4,
  },
  {
    id: 'ORD-2025050104',
    restaurant_id: 'rest-001',
    restaurant_name: 'Maquis Chez Tanti',
    restaurant_image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
    type: 'restaurant',
    status: 'cancelled',
    status_label: 'Annulée',
    date: '2025-05-01T13:00:00Z',
    delivery_mode: 'delivery',
    delivery_address: 'ACI 2000, Bamako',
    items: [
      { id: 'item-002', name: 'Poulet Braisé', quantity: 2, price: 3500 },
    ],
    subtotal: 7000,
    delivery_fee: 500,
    promo_discount: 0,
    total: 7500,
    handshake_code: null,
    rating: null,
    cancellation_reason: 'Restaurant fermé',
  },
];

export function OrderHistoryScreen({ onBack, onReorder, onViewRestaurant }) {
  const [orders] = useState(mockOrderHistory);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { addToCart, clearCart } = useCart();

  const handleReorder = (order) => {
    // Find the restaurant
    const restaurant = restaurants.find(r => r.id === order.restaurant_id);
    if (!restaurant && order.type === 'restaurant') {
      alert('Restaurant non disponible');
      return;
    }

    // Clear current cart and add items
    clearCart();
    
    // Get menu data to verify items still exist
    const menuData = getRestaurantMenu(order.restaurant_id);
    
    order.items.forEach(orderItem => {
      // Try to find the item in current menu
      let menuItem = null;
      if (menuData) {
        menuData.categories.forEach(cat => {
          const found = cat.items.find(i => i.id === orderItem.id || i.name === orderItem.name);
          if (found) menuItem = found;
        });
      }

      // Add to cart (use menu price if available, otherwise use historical price)
      addToCart({
        id: orderItem.id,
        name: orderItem.name,
        price: menuItem?.price || orderItem.price,
        quantity: orderItem.quantity,
        restaurant_id: order.restaurant_id,
        restaurant_name: order.restaurant_name,
      });
    });

    // Navigate to restaurant/checkout
    if (onReorder) {
      onReorder(order);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' });
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'delivered': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Order Detail View
  if (selectedOrder) {
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
            <p className="text-sm text-gray-500">{selectedOrder.id}</p>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Restaurant Card */}
          <div 
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 cursor-pointer"
            onClick={() => onViewRestaurant && onViewRestaurant(selectedOrder)}
          >
            <div className="h-32 relative">
              <img 
                src={selectedOrder.restaurant_image} 
                alt={selectedOrder.restaurant_name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <h2 className="font-bold text-lg">{selectedOrder.restaurant_name}</h2>
                <p className="text-sm text-white/80 flex items-center gap-1">
                  {selectedOrder.type === 'pharmacy' ? '💊 Pharmacie' : '🍽️ Restaurant'}
                </p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  {selectedOrder.status_label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">{formatDate(selectedOrder.date)}</p>
                <p className="text-xs text-gray-400">{formatTime(selectedOrder.date)}</p>
              </div>
            </div>

            {selectedOrder.handshake_code && (
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-sm text-gray-500">Code:</span>
                <span className="font-mono font-bold text-[#FF5A00]">{selectedOrder.handshake_code}</span>
              </div>
            )}

            {selectedOrder.cancellation_reason && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-red-600">Raison: {selectedOrder.cancellation_reason}</p>
              </div>
            )}
          </div>

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Mode de livraison</h3>
            <div className="flex items-center gap-3">
              {selectedOrder.delivery_mode === 'delivery' ? (
                <>
                  <div className="w-10 h-10 bg-[#FF5A00]/10 rounded-xl flex items-center justify-center">
                    <Truck className="w-5 h-5 text-[#FF5A00]" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Livraison</p>
                    <p className="text-sm text-gray-500">{selectedOrder.delivery_address}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">À emporter</p>
                    <p className="text-sm text-gray-500">Retrait sur place</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Articles ({selectedOrder.items.length})</h3>
            <div className="space-y-3">
              {selectedOrder.items.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <span className="text-gray-900">{item.name}</span>
                  </div>
                  <span className="text-gray-600">{(item.price * item.quantity).toLocaleString()} F</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-3">Récapitulatif</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total</span>
                <span>{selectedOrder.subtotal.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Livraison</span>
                <span>{selectedOrder.delivery_fee === 0 ? 'Gratuit' : `${selectedOrder.delivery_fee.toLocaleString()} FCFA`}</span>
              </div>
              {selectedOrder.promo_discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Réduction</span>
                  <span>-{selectedOrder.promo_discount.toLocaleString()} FCFA</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
                <span>Total</span>
                <span className="text-[#FF5A00]">{selectedOrder.total.toLocaleString()} FCFA</span>
              </div>
            </div>
          </div>

          {/* Rating */}
          {selectedOrder.status === 'delivered' && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Votre avis</h3>
              {selectedOrder.rating ? (
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${star <= selectedOrder.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                  <span className="text-gray-500 ml-2">{selectedOrder.rating}/5</span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Vous n'avez pas encore noté cette commande</p>
              )}
            </div>
          )}

          {/* Reorder Button */}
          {selectedOrder.status === 'delivered' && selectedOrder.type === 'restaurant' && (
            <button
              onClick={() => handleReorder(selectedOrder)}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl flex items-center justify-center gap-2 active:bg-[#E55100]"
              data-testid="reorder-btn"
            >
              <RefreshCw className="w-5 h-5" />
              Commander à nouveau
            </button>
          )}
        </div>
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
          <p className="text-sm text-gray-500">{orders.length} commande{orders.length > 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Orders List */}
      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune commande</p>
            <p className="text-sm text-gray-400 mt-1">Vos commandes apparaîtront ici</p>
          </div>
        ) : (
          orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl overflow-hidden border border-gray-100"
            >
              {/* Order Header - Clickable */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setSelectedOrder(order)}
                data-testid={`order-card-${order.id}`}
              >
                <div className="flex items-start gap-3">
                  {/* Restaurant Image */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={order.restaurant_image} 
                      alt={order.restaurant_name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 truncate">{order.restaurant_name}</h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.date)} à {formatTime(order.date)}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* Items Preview */}
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>

                    {/* Status & Total */}
                    <div className="flex items-center justify-between mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {order.status_label}
                      </span>
                      <span className="font-semibold text-gray-900">{order.total.toLocaleString()} F</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Reorder Button */}
              {order.status === 'delivered' && order.type === 'restaurant' && (
                <div className="px-4 pb-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReorder(order);
                    }}
                    className="w-full py-3 bg-[#FF5A00]/10 text-[#FF5A00] font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-[#FF5A00]/20"
                    data-testid={`quick-reorder-${order.id}`}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Commander à nouveau
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
