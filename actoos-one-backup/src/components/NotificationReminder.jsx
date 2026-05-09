import { useState, useEffect } from 'react';
import { 
  X, 
  Bell, 
  Clock, 
  Calendar,
  ChevronRight,
  CheckCircle
} from 'lucide-react';

// Mock scheduled orders for demo
const MOCK_SCHEDULED_ORDERS = [
  {
    id: 'sch-001',
    restaurant_name: 'Maquis Chez Tanti',
    restaurant_image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=100&h=100&fit=crop',
    scheduled_time: new Date(Date.now() + 30 * 60000), // 30 minutes from now
    items_count: 3,
    total: 5500,
  },
];

// Notification banner that appears 30 min before scheduled delivery
export function ScheduledOrderReminder({ order, onDismiss, onViewOrder }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date();
      const diff = order.scheduled_time - now;
      
      if (diff <= 0) {
        setTimeLeft('Maintenant');
        return;
      }
      
      const minutes = Math.floor(diff / 60000);
      if (minutes < 60) {
        setTimeLeft(`${minutes} min`);
      } else {
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        setTimeLeft(`${hours}h${remainingMins > 0 ? ` ${remainingMins}min` : ''}`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [order.scheduled_time]);

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 p-4 animate-slide-down"
      data-testid="scheduled-reminder"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header with dismiss */}
        <div className="bg-[#FF5A00] px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white">
            <Bell className="w-4 h-4" />
            <span className="text-sm font-medium">Rappel de commande</span>
          </div>
          <button 
            onClick={onDismiss}
            className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <button 
          onClick={onViewOrder}
          className="w-full p-4 flex items-center gap-3 active:bg-gray-50"
        >
          <img 
            src={order.restaurant_image}
            alt={order.restaurant_name}
            className="w-14 h-14 rounded-xl object-cover"
          />
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900">{order.restaurant_name}</h3>
            <p className="text-sm text-gray-500">{order.items_count} articles • {order.total.toLocaleString()} FCFA</p>
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-4 h-4 text-[#FF5A00]" />
              <span className="text-sm font-medium text-[#FF5A00]">
                Livraison dans {timeLeft}
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}

// In-app notification toast for various events
export function NotificationToast({ 
  message, 
  type = 'info', // 'info', 'success', 'warning', 'error'
  icon,
  onDismiss,
  action,
  actionLabel
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const bgColors = {
    info: 'bg-gray-900',
    success: 'bg-green-600',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  };

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up"
      data-testid="notification-toast"
    >
      <div className={`${bgColors[type]} rounded-2xl p-4 flex items-center gap-3 shadow-xl`}>
        {icon && <div className="text-white">{icon}</div>}
        <p className="flex-1 text-white text-sm font-medium">{message}</p>
        {action && (
          <button 
            onClick={action}
            className="text-white/90 text-sm font-semibold underline"
          >
            {actionLabel}
          </button>
        )}
        <button onClick={onDismiss}>
          <X className="w-5 h-5 text-white/60" />
        </button>
      </div>
    </div>
  );
}

// Notification permission request UI
export function NotificationPermissionSheet({ isOpen, onAllow, onDeny }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onDeny}
      />
      
      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 pb-8 animate-slide-up">
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-[#FF5A00]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Activer les notifications
          </h2>
          <p className="text-gray-500 text-sm">
            Recevez des rappels 30 minutes avant vos livraisons programmées et suivez vos commandes en temps réel.
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-600">Rappel avant livraison programmée</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-600">Suivi de commande en temps réel</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-gray-600">Offres exclusives et promotions</span>
          </div>
        </div>

        <button
          onClick={onAllow}
          className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-2xl mb-3"
        >
          Activer les notifications
        </button>
        
        <button
          onClick={onDeny}
          className="w-full py-3 text-gray-500 font-medium"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}

// Hook to manage scheduled order reminders
export function useScheduledOrderReminders() {
  const [activeReminder, setActiveReminder] = useState(null);
  const [shownReminders, setShownReminders] = useState(new Set());

  useEffect(() => {
    // Check for upcoming scheduled orders every minute
    const checkReminders = () => {
      const now = new Date();
      
      // Find orders within 30 minutes
      MOCK_SCHEDULED_ORDERS.forEach(order => {
        const diff = order.scheduled_time - now;
        const minutesLeft = Math.floor(diff / 60000);
        
        // Show reminder if within 30 minutes and not already shown
        if (minutesLeft <= 30 && minutesLeft > 0 && !shownReminders.has(order.id)) {
          setActiveReminder(order);
          setShownReminders(prev => new Set([...prev, order.id]));
        }
      });
    };

    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [shownReminders]);

  const dismissReminder = () => {
    setActiveReminder(null);
  };

  return { activeReminder, dismissReminder };
}

// Add CSS animations
const styles = `
@keyframes slide-down {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.animate-slide-down {
  animation: slide-down 0.3s ease-out;
}

.animate-slide-up {
  animation: slide-up 0.3s ease-out;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
