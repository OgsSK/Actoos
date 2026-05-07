import { useState, useEffect } from 'react';
import { MapPin, Navigation, X } from 'lucide-react';

export function LocationPermissionSheet({ isOpen, onAllow, onDeny }) {
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState(null);

  const handleAllowLocation = async () => {
    setIsRequesting(true);
    setError(null);

    try {
      // Vérifier si la géolocalisation est supportée
      if (!navigator.geolocation) {
        setError('La géolocalisation n\'est pas supportée par votre navigateur');
        setIsRequesting(false);
        return;
      }

      // Demander la permission
      const permission = await navigator.permissions?.query({ name: 'geolocation' });
      
      if (permission?.state === 'denied') {
        setError('Permission refusée. Activez la localisation dans les paramètres.');
        setIsRequesting(false);
        return;
      }

      // Obtenir la position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Succès - sauvegarder dans localStorage
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: Date.now(),
          };
          localStorage.setItem('actoos_user_location', JSON.stringify(location));
          localStorage.setItem('actoos_location_permission', 'granted');
          setIsRequesting(false);
          onAllow(location);
        },
        (err) => {
          console.error('Geolocation error:', err);
          if (err.code === 1) {
            setError('Permission refusée. Vous pouvez changer cela dans les paramètres.');
          } else if (err.code === 2) {
            setError('Position non disponible. Vérifiez votre GPS.');
          } else {
            setError('Délai dépassé. Réessayez.');
          }
          setIsRequesting(false);
        },
        {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    } catch (err) {
      setError('Erreur lors de la demande de permission');
      setIsRequesting(false);
    }
  };

  const handleDeny = () => {
    localStorage.setItem('actoos_location_permission', 'denied');
    onDeny();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] bg-black/50 flex items-end justify-center">
      <div 
        className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 pb-8 animate-slide-up"
        data-testid="location-permission-sheet"
      >
        {/* Illustration */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-[#FF5A00]" />
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 w-24 h-24 bg-orange-200 rounded-full animate-ping opacity-30" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Activer la localisation
        </h2>
        
        {/* Description */}
        <p className="text-gray-500 text-center mb-6">
          Pour vous montrer les restaurants et pharmacies près de vous, et optimiser vos livraisons.
        </p>

        {/* Benefits */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Restaurants proches</strong> triés par distance
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-sm text-gray-700">
              <strong>Frais de livraison</strong> calculés précisément
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAllowLocation}
            disabled={isRequesting}
            className="w-full py-4 bg-[#FF5A00] text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:bg-[#E55100] transition-colors disabled:opacity-70"
            data-testid="allow-location-btn"
          >
            {isRequesting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Localisation en cours...
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                Autoriser la localisation
              </>
            )}
          </button>
          
          <button
            onClick={handleDeny}
            disabled={isRequesting}
            className="w-full py-4 bg-gray-100 text-gray-600 font-semibold rounded-2xl active:bg-gray-200 transition-colors"
            data-testid="deny-location-btn"
          >
            Plus tard
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Votre position reste privée et n'est jamais partagée.
        </p>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
