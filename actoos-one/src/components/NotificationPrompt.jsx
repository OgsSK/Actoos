/**
 * ACTOOS ONE - Notification Permission Prompt
 * 
 * UI pour demander la permission des notifications push.
 */

import { useState, useEffect } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { initializePushNotifications, getNotificationStatus } from '../services/pushNotificationService';
import { useAuth } from '../context/AuthContext';

export function NotificationPrompt({ onClose }) {
  const { user } = useAuth();
  const [status, setStatus] = useState('idle'); // idle, requesting, granted, denied
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Vérifier si on doit afficher le prompt
    const notifStatus = getNotificationStatus();
    
    if (!notifStatus.supported) {
      setVisible(false);
      return;
    }

    if (notifStatus.permission === 'granted') {
      setVisible(false);
      return;
    }

    // Vérifier si l'utilisateur a déjà refusé (ne pas redemander)
    const dismissed = localStorage.getItem('actoos_notif_dismissed');
    if (dismissed) {
      setVisible(false);
    }
  }, []);

  const handleAllow = async () => {
    setStatus('requesting');
    
    const result = await initializePushNotifications(user?.id);
    
    if (result.success) {
      setStatus('granted');
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 1500);
    } else {
      setStatus('denied');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('actoos_notif_dismissed', 'true');
    setVisible(false);
    onClose?.();
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF5A00] to-[#FF8C00] p-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-white">
            <p className="font-bold">Restez informé !</p>
            <p className="text-sm text-white/80">Ne manquez aucune mise à jour</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'idle' && (
            <>
              <p className="text-gray-600 text-sm mb-4">
                Recevez des notifications pour :
              </p>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  Suivi de votre commande en temps réel
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  Arrivée du livreur
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-700">
                  <Check className="w-4 h-4 text-green-500" />
                  Offres exclusives et promotions
                </li>
              </ul>
              <button
                onClick={handleAllow}
                className="w-full py-3 bg-[#FF5A00] text-white font-semibold rounded-xl active:bg-[#E55100] transition-colors"
              >
                Activer les notifications
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2 text-gray-500 text-sm mt-2"
              >
                Plus tard
              </button>
            </>
          )}

          {status === 'requesting' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 border-4 border-[#FF5A00] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-600">Autorisation en cours...</p>
            </div>
          )}

          {status === 'granted' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <p className="font-bold text-gray-900">Notifications activées !</p>
              <p className="text-sm text-gray-500 mt-1">
                Vous recevrez les mises à jour importantes
              </p>
            </div>
          )}

          {status === 'denied' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-bold text-gray-900">Permission refusée</p>
              <p className="text-sm text-gray-500 mt-1">
                Vous pouvez activer les notifications dans les paramètres de votre navigateur
              </p>
              <button
                onClick={handleDismiss}
                className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm"
              >
                Compris
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
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
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default NotificationPrompt;
