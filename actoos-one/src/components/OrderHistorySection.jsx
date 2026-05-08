/**
 * ACTOOS ONE - Order History Section
 * 
 * Historique des commandes avec bouton "Recommander"
 */

import { useState, useEffect } from 'react';
import { 
  Package, 
  Clock, 
  RefreshCw, 
  ChevronRight, 
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
  RotateCcw
} from 'lucide-react';
import { getUserOrders } from '../services/orderService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

// Status labels et couleurs
const STATUS_CONFIG = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  confirmed: { label: 'Confirmée', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  preparing: { label: 'En préparation', color: 'bg-orange-100 text-orange-700', icon: RefreshCw },
  ready: { label: 'Prête', color: 'bg-green-100 text-green-700', icon: Package },
  picked_up: { label: 'Récupérée', color: 'bg-purple-100 text-purple-700', icon: ShoppingBag },
  delivering: { label: 'En livraison', color: 'bg-blue-100 text-blue-700', icon: MapPin },
  delivered: { label: 'Livrée', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: XCircle },
};

// Formater la date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Hier à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}

// Composant pour une commande
function OrderCard({ order, onReorder, isReordering }) {
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const StatusIcon = status.icon;
  
  // Calculer le nombre total d'articles
  const totalItems = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Liste des articles (max 3 affichés)
  const itemNames = order.order_items?.slice(0, 3).map(item => item.name) || [];
  const hasMoreItems = (order.order_items?.length || 0) > 3;
  
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header avec restaurant et statut */}
      <div className="p-4 flex items-start gap-3">
        {/* Image restaurant */}
        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
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
        
        {/* Info commande */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-900 truncate">
                {order.partners?.name || 'Restaurant'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {formatDate(order.created_at)}
              </p>
            </div>
            
            {/* Badge statut */}
            <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-xs font-medium ${status.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </div>
          </div>
          
          {/* Articles */}
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {itemNames.join(', ')}
            {hasMoreItems && ` +${order.order_items.length - 3} autres`}
          </p>
        </div>
      </div>
      
      {/* Footer avec prix et bouton recommander */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100">
        <div>
          <p className="text-lg font-bold text-gray-900">
            {order.total_amount?.toLocaleString()} FCFA
          </p>
          <p className="text-xs text-gray-500">
            {totalItems} article{totalItems > 1 ? 's' : ''}
          </p>
        </div>
        
        {/* Bouton Recommander - seulement pour les commandes livrées */}
        {order.status === 'delivered' && (
          <button
            onClick={() => onReorder(order)}
            disabled={isReordering}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FF5A00] text-white rounded-xl font-medium text-sm active:bg-[#E55100] disabled:opacity-50 transition-colors"
            data-testid={`reorder-btn-${order.id}`}
          >
            {isReordering ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            Recommander
          </button>
        )}
        
        {/* Bouton Suivre pour les commandes en cours */}
        {['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'delivering'].includes(order.status) && (
          <button
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl font-medium text-sm active:bg-gray-800 transition-colors"
            data-testid={`track-btn-${order.id}`}
          >
            <MapPin className="w-4 h-4" />
            Suivre
          </button>
        )}
      </div>
    </div>
  );
}

// Composant principal
export function OrderHistorySection({ onOrderClick }) {
  const { user } = useAuth();
  const { addItem, setRestaurantId, restaurantId: currentRestaurantId, clearCart } = useCart();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reorderingId, setReorderingId] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Charger les commandes
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
        const { data, error: fetchError } = await getUserOrders(user.id, { limit: 10 });
        
        if (fetchError) {
          throw fetchError;
        }
        
        setOrders(data || []);
      } catch (err) {
        console.error('Erreur chargement commandes:', err);
        setError('Impossible de charger vos commandes');
      } finally {
        setLoading(false);
      }
    }
    
    loadOrders();
  }, [user?.id]);

  // Fonction Recommander
  const handleReorder = async (order) => {
    if (!order.order_items || order.order_items.length === 0) {
      return;
    }
    
    setReorderingId(order.id);
    
    try {
      // Vérifier si le panier a des articles d'un autre restaurant
      if (currentRestaurantId && currentRestaurantId !== order.partner_id) {
        // Vider le panier existant
        clearCart();
      }
      
      // Définir le restaurant
      setRestaurantId(order.partner_id);
      
      // Ajouter chaque article au panier
      for (const item of order.order_items) {
        const cartItem = {
          id: item.menu_item_id || `item_${Date.now()}_${Math.random()}`,
          name: item.name,
          price: item.unit_price,
          quantity: item.quantity,
          image: item.menu_items?.image_url || null,
        };
        
        addItem(cartItem);
      }
      
      // Afficher le succès
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (err) {
      console.error('Erreur recommander:', err);
    } finally {
      setReorderingId(null);
    }
  };

  // État vide - utilisateur non connecté
  if (!user) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Connectez-vous pour voir vos commandes</p>
      </div>
    );
  }

  // Chargement
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#FF5A00] animate-spin" />
      </div>
    );
  }

  // Erreur
  if (error) {
    return (
      <div className="text-center py-8">
        <XCircle className="w-12 h-12 text-red-300 mx-auto mb-3" />
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  // Aucune commande
  if (orders.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <p className="text-gray-500 font-medium">Aucune commande</p>
        <p className="text-sm text-gray-400 mt-1">Vos commandes apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message de succès */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 font-medium">
            Articles ajoutés au panier !
          </p>
        </div>
      )}
      
      {/* Liste des commandes */}
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          onReorder={handleReorder}
          isReordering={reorderingId === order.id}
        />
      ))}
      
      {/* Voir plus */}
      {orders.length >= 10 && (
        <button className="w-full py-3 text-[#FF5A00] font-medium text-center">
          Voir toutes les commandes
        </button>
      )}
    </div>
  );
}

export default OrderHistorySection;
