import { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Banknote, Smartphone, Check, ShoppingBag } from 'lucide-react';

export function KDSOrderCard({ order, onMarkReady, isReady = false }) {
  const [elapsedTime, setElapsedTime] = useState('');
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const created = new Date(order.created_at);
      const now = new Date();
      const diffMs = now - created;
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 60) {
        setElapsedTime(`${diffMins} min`);
      } else {
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        setElapsedTime(`${hours}h ${mins}min`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, [order.created_at]);

  const hasSpecialInstructions = order.items.some(item => item.special_instructions);

  useEffect(() => {
    if (hasSpecialInstructions && !isReady) {
      const blinkInterval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 500);
      return () => clearInterval(blinkInterval);
    }
  }, [hasSpecialInstructions, isReady]);

  const statusColors = {
    pending: 'border-yellow-500',
    preparing: 'border-blue-500',
    ready: 'border-green-500',
  };

  return (
    <div
      className={`bg-gray-800 rounded-2xl border-l-4 ${statusColors[order.status]} overflow-hidden ${
        hasSpecialInstructions && !isReady ? 'ring-2 ring-red-500 animate-pulse' : 'border border-gray-700'
      }`}
      data-testid={`order-card-${order.id}`}
    >
      {/* Bannière instructions spéciales - ROUGE CLIGNOTANT */}
      {hasSpecialInstructions && !isReady && (
        <div 
          className={`px-4 py-2 flex items-center gap-2 transition-colors ${
            isBlinking ? 'bg-red-500' : 'bg-red-600'
          }`}
          data-testid="special-instructions-banner"
        >
          <AlertTriangle className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm">INSTRUCTIONS SPÉCIALES</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold text-white">{order.orderNumber}</p>
            <p className="text-sm text-gray-400">{order.clientName}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{elapsedTime}</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {order.delivery_mode === 'pickup' ? (
                <span className="flex items-center gap-1 text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  <ShoppingBag className="w-3 h-3" />
                  À emporter
                </span>
              ) : order.payment_method === 'cash' ? (
                <span className="flex items-center gap-1 text-xs text-yellow-300 bg-yellow-500/20 px-2 py-0.5 rounded-full">
                  <Banknote className="w-3 h-3" />
                  Cash
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded-full">
                  <Smartphone className="w-3 h-3" />
                  Mobile
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Code Handshake visible pour Pickup */}
        {order.delivery_mode === 'pickup' && order.delivery_code && (
          <div className="mt-3 bg-gray-700 rounded-xl p-2 text-center">
            <p className="text-xs text-gray-400">Code client</p>
            <p className="text-2xl font-bold text-[#FF5A00] tracking-widest">{order.delivery_code}</p>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {order.items.map((item, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#FF5A00] rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">{item.quantity}</span>
            </div>
            
            <div className="flex-1">
              <p className="text-white font-semibold">{item.name}</p>
              {item.special_instructions && (
                <div className={`mt-1 border rounded-lg px-3 py-2 ${
                  isBlinking ? 'bg-red-500/30 border-red-500' : 'bg-red-500/20 border-red-500/50'
                }`}>
                  <p className="text-red-300 text-sm font-medium">
                    {item.special_instructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total</span>
          <span className="text-white font-bold text-lg">
            {order.total_amount.toLocaleString()} FCFA
          </span>
        </div>
      </div>

      {/* Button */}
      {!isReady && (
        <div className="p-4">
          <button
            onClick={onMarkReady}
            className="w-full bg-[#FF5A00] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-[#FF5A00]/80 transition-colors text-lg"
            data-testid={`mark-ready-${order.id}`}
          >
            <Check className="w-6 h-6" />
            MARQUER PRÊT
          </button>
        </div>
      )}

      {isReady && (
        <div className="p-4">
          <div className="w-full bg-green-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-lg">
            <Check className="w-6 h-6" />
            COMMANDE PRÊTE
          </div>
        </div>
      )}
    </div>
  );
}
