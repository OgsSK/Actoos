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
  Tag
} from 'lucide-react';
import { mockOrders, mockMenuItems } from '../data/kdsData';
import { KDSOrderCard } from './KDSOrderCard';
import { KDSMenuManager } from './KDSMenuManager';
import { PartnerPromotionsManager } from './PartnerPromotionsManager';
import { PARTNER_TYPES } from '../data/promotionsData';

// Son de notification (base64 encoded beep)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+fm5eTj4d8b2JXTUZCPz07Ojk4Nzk7PUFGTFVfanuNnqqxs7CqoZWJfXFmXVVPSUVCQD8/P0BCRUlOVl9qeYyepq2wr6uklox/cmZdVE5IRkRCQUFCQ0ZKTVRZYG17jZ6mrK2tqaKZjn5wa2NcVlFNSkdGRUVGR0lMUFZdZW96i5ulq62sqKOckoZ6bmVdV1JOS0lIR0dISUpNUVZcYmt3hpOgo6eopqKdloqAd25nYVtWUk9NTEtLS0xOUVVZXmRsdoOQnKOlpqShn5mRiX1zbmljXllVUk9OTU1OT1FUV1teZGt0foqVnqKkpKKgm5aPh3xybGZhXFlWU1FQT09QUVNWWV1hZm1ze4aPmJ6ho6KgnpqVjoR6cGpmYl5aV1VTUlFRUlNVV1ldYWVqcHh/h5CYnaChn5yZlI6GfXRtaGRgXFpXVVRTU1NUVVdZXGBkZ2xye4KKkpicn5+dnJmUjoZ+dnBrZmJfXFpYVlVVVVZXWVtdYGRobnR7gYmRl5udnp2bmJONhX12cGtmY2BdW1lYV1dXWFlaXF9iZmtwd36EjJOYm52dnJqXko2FfnhybGdjYF5cWllYWFhZWltdX2JlaW50eoGHjpSYm5ycm5mWkYuEfXdzb2xoZGJgXlxbWlpaW1xdX2FkZ2twd3yChYuRl5qbnJuZl5ONiIJ+eXVxbmpmZGJgX15dXV1eX2BhY2ZpbHB0eX6ChYqOk5eZmpqZl5WSjoqFgHt3c3BtamdjYmBfX15eXl9gYWNlZ2pscHR5fYGFiY2RlZeYmJeWlJGOioaCfnp2c3BtamhkY2FgX19eXl9gYWJkZmhqbXF1eXyCg4aIi42Pk5aXlpSSkI6KhoJ+e3dzcW5ramloZmVkY2NjY2NkZGVmZ2hqbG1vcXN2eHt9f4GChomLjY6QkZOTk5KQj42KiIWDgH58enh2dHJwb21saWhnZmZlZWVlZmZmZ2hpamtsbm9xc3V2eHl7fH5/gYKEhYeIiYqLjI2Oj5CQj46OjYuJiIaEgoB/fXt6eHd2dXRzcnFwb25tbGxsbGxsbG1tbm5vb3BxcnNzdHV2d3h5ent8fX5/gIGBgoOEhIWGhoeIiImJiomJiYiIh4aFhIOCgYB/fn18e3p5eHh3dnZ1dXR0dHR0dHR0dHV1dXZ2d3d4eHl5ent7fH19fn5/gIGBgoKDg4SEhYWGhoaHh4eHh4eHhoaGhYWEhIODgoKBgYCAf39+fn19fHx8e3t7e3t7e3t7e3t7e3x8fHx9fX1+fn5/f4CAgIGBgYKCgoODg4ODhISEhISEhISEhIODg4OCgoKBgYGAgIB/f35+fX19fHx8fHx8fHx8fHx8fH19fX19fn5+fn9/f4CAgICAgYGBgYGBgoKCgoKCgoKCgoKCgoKCgoKCgYGBgYGAgICAgH9/f39/fn5+fn5+fn5+fn5+fn5+f39/f39/f4CAgICAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYCAgICAgICAgH9/f39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgICAgH9/f39+fn5+fn5+fn5+fn5+fn5+fn5+fn5/f39/f39/f39/gICAgICAgICAgICAgYGBgYGBgYGBgYGBgYGBgYGBgICAgICAgICAgH9/f39/f39/f39/f39/f39/f39/f39/f39/f4CAgICAgICAgICAgICAgICAgICAgICBgYGBgYGBgYGBgYGAgICAgICAgIB/f39/f39/f35+fn5+fn5+fn5+fn5+fn5+fn5+fn5/f39/f39/f39/gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIB/f39/f39/f35+fn5+fn5+fn5+fn5+fn5+fn5+fn5+f39/f39/f39/gICAgICAg==';

const TABS = {
  ORDERS: 'orders',
  MENU: 'menu',
  PROMOS: 'promos',
};

export function PartnerKDSScreen({ onBack }) {
  const [activeTab, setActiveTab] = useState(TABS.ORDERS);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState(mockMenuItems);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPickupScanner, setShowPickupScanner] = useState(false);
  const [pickupCode, setPickupCode] = useState('');
  const [pickupResult, setPickupResult] = useState(null);
  const audioRef = useRef(null);
  const previousOrdersCount = useRef(0);

  // Créer l'élément audio
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND);
    audioRef.current.volume = 0.5;
  }, []);

  // Jouer le son de notification
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, [soundEnabled]);

  // Charger les commandes (simulé)
  const fetchOrders = useCallback(() => {
    setIsRefreshing(true);
    
    setTimeout(() => {
      const newOrders = [...mockOrders];
      
      const pendingCount = newOrders.filter(o => o.status === 'pending').length;
      if (pendingCount > previousOrdersCount.current) {
        playNotificationSound();
      }
      previousOrdersCount.current = pendingCount;
      
      setOrders(newOrders);
      setLastRefresh(new Date());
      setIsRefreshing(false);
    }, 500);
  }, [playNotificationSound]);

  // Auto-refresh toutes les 5 secondes
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Marquer une commande comme prête
  const markOrderReady = useCallback((orderId) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: 'ready' } : order
    ));
  }, []);

  // Valider code Pickup (Scanner Client)
  const validatePickupCode = useCallback(() => {
    const formattedCode = pickupCode.toUpperCase();
    const matchingOrder = orders.find(
      o => o.delivery_code === formattedCode && o.status === 'ready'
    );
    
    if (matchingOrder) {
      setPickupResult({ success: true, order: matchingOrder });
      setOrders(prev => prev.map(order => 
        order.id === matchingOrder.id ? { ...order, status: 'delivered' } : order
      ));
      // Reset après 3 secondes
      setTimeout(() => {
        setPickupResult(null);
        setPickupCode('');
        setShowPickupScanner(false);
      }, 3000);
    } else {
      setPickupResult({ success: false, error: 'Code invalide ou commande non prête' });
    }
  }, [pickupCode, orders]);

  // Toggle disponibilité d'un article
  const toggleItemAvailability = useCallback((itemId) => {
    setMenuItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, is_available: !item.is_available } : item
    ));
  }, []);

  // Modifier max_per_order
  const updateMaxPerOrder = useCallback((itemId, newMax) => {
    setMenuItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, max_per_order: Math.max(1, newMax) } : item
    ));
  }, []);

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');

  return (
    <div className="min-h-screen bg-gray-50" data-testid="partner-kds-screen">
      {/* Header - MODE CLAIR */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:bg-gray-200 transition-colors"
              data-testid="kds-back-btn"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">KDS Partenaire</h1>
              <p className="text-xs text-gray-500">Maquis Chez Tanti</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Scanner Pickup Button */}
            <button
              onClick={() => setShowPickupScanner(true)}
              className="h-10 px-3 bg-[#FF5A00] rounded-xl flex items-center gap-2 text-white font-semibold text-sm"
              data-testid="scanner-pickup-btn"
            >
              <Keyboard className="w-4 h-4" />
              Scanner
            </button>
            
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                soundEnabled ? 'bg-[#FF5A00] text-white' : 'bg-gray-200 text-gray-400'
              }`}
              data-testid="sound-toggle"
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
              <RefreshCw className={`w-4 h-4 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-xs text-gray-500">
                {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab(TABS.ORDERS)}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.ORDERS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
            data-testid="tab-orders"
          >
            <Package className="w-5 h-5" />
            Commandes
            {pendingOrders.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-sm ${
                activeTab === TABS.ORDERS ? 'bg-white/20' : 'bg-[#FF5A00] text-white'
              }`}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab(TABS.MENU)}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.MENU
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
            data-testid="tab-menu"
          >
            <Utensils className="w-5 h-5" />
            Menu
          </button>
          <button
            onClick={() => setActiveTab(TABS.PROMOS)}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
              activeTab === TABS.PROMOS
                ? 'bg-[#FF5A00] text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
            data-testid="tab-promos"
          >
            <Tag className="w-5 h-5" />
            Promos
          </button>
        </div>
      </header>

      {/* Pickup Scanner Modal */}
      {showPickupScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-gray-900 text-xl font-bold text-center mb-2">Scanner Client</h2>
            <p className="text-gray-500 text-sm text-center mb-6">
              Entrez le code Handshake du client
            </p>
            
            {pickupResult ? (
              <div className={`text-center py-8 ${pickupResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {pickupResult.success ? (
                  <>
                    <Check className="w-16 h-16 mx-auto mb-4" />
                    <p className="text-2xl font-bold">Validé !</p>
                    <p className="text-gray-500 mt-2">Commande {pickupResult.order.orderNumber}</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold">{pickupResult.error}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="flex justify-center mb-6">
                  <input
                    type="text"
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="#A42"
                    maxLength={4}
                    className="w-40 h-20 bg-gray-100 border-2 border-gray-200 rounded-2xl text-center text-gray-900 text-4xl font-bold tracking-widest placeholder-gray-400 focus:border-[#FF5A00] outline-none"
                    data-testid="pickup-code-input"
                    autoFocus
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowPickupScanner(false);
                      setPickupCode('');
                      setPickupResult(null);
                    }}
                    className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={validatePickupCode}
                    disabled={pickupCode.length < 3}
                    className={`flex-1 py-4 rounded-2xl font-semibold ${
                      pickupCode.length >= 3
                        ? 'bg-[#FF5A00] text-white'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                    data-testid="validate-pickup-btn"
                  >
                    Valider
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === TABS.ORDERS ? (
        <div className="p-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</p>
              <p className="text-xs text-yellow-600 mt-1">En attente</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{preparingOrders.length}</p>
              <p className="text-xs text-blue-600 mt-1">En préparation</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{readyOrders.length}</p>
              <p className="text-xs text-green-600 mt-1">Prêtes</p>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucune commande pour le moment</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingOrders.length > 0 && (
                <div>
                  <h2 className="text-yellow-600 font-semibold mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    En attente ({pendingOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingOrders.map(order => (
                      <KDSOrderCard key={order.id} order={order} onMarkReady={() => markOrderReady(order.id)} />
                    ))}
                  </div>
                </div>
              )}

              {preparingOrders.length > 0 && (
                <div>
                  <h2 className="text-blue-600 font-semibold mb-3 flex items-center gap-2">
                    <ChefHat className="w-5 h-5" />
                    En préparation ({preparingOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {preparingOrders.map(order => (
                      <KDSOrderCard key={order.id} order={order} onMarkReady={() => markOrderReady(order.id)} />
                    ))}
                  </div>
                </div>
              )}

              {readyOrders.length > 0 && (
                <div>
                  <h2 className="text-green-600 font-semibold mb-3 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    Prêtes ({readyOrders.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
                    {readyOrders.map(order => (
                      <KDSOrderCard key={order.id} order={order} onMarkReady={() => {}} isReady />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : activeTab === TABS.MENU ? (
        <KDSMenuManager
          items={menuItems}
          onToggleAvailability={toggleItemAvailability}
          onUpdateMaxPerOrder={updateMaxPerOrder}
        />
      ) : (
        <div className="p-4">
          <PartnerPromotionsManager
            partnerId="rest-001"
            partnerName="Maquis Chez Tanti"
            partnerType={PARTNER_TYPES.RESTAURANT}
          />
        </div>
      )}
    </div>
  );
}
