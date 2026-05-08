/**
 * ACTOOS ONE - Coming Soon Screen
 * 
 * Affiche un écran "ACTOOS arrive bientôt" quand il n'y a pas
 * de restaurants disponibles dans le pays/ville de l'utilisateur.
 */

import { MapPin, Bell, Rocket, Globe } from 'lucide-react';
import { getCountryByCode } from '../config/countriesConfig';

export function ComingSoonScreen({ 
  countryCode = 'ML', 
  city = null,
  onNotifyMe = null,
  onChangeLocation = null,
}) {
  const country = getCountryByCode(countryCode);
  const locationName = city ? `${city}, ${country?.name}` : country?.name;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {/* Animation Rocket */}
      <div className="relative mb-8">
        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-orange-200 rounded-full flex items-center justify-center animate-pulse">
          <Rocket size={48} className="text-[#FF5A00] transform -rotate-45" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-lg animate-bounce">
          {country?.flag || '🚀'}
        </div>
      </div>

      {/* Titre */}
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        ACTOOS arrive bientôt !
      </h2>

      {/* Location */}
      <div className="flex items-center gap-2 text-gray-600 mb-4">
        <MapPin size={18} className="text-[#FF5A00]" />
        <span className="font-medium">{locationName}</span>
      </div>

      {/* Description */}
      <p className="text-gray-500 max-w-sm mb-8">
        Nous travaillons dur pour apporter ACTOOS dans votre région. 
        Soyez parmi les premiers à être notifiés du lancement !
      </p>

      {/* Bouton Notification */}
      {onNotifyMe && (
        <button
          onClick={onNotifyMe}
          className="flex items-center gap-2 px-6 py-3 bg-[#FF5A00] text-white font-semibold rounded-xl hover:bg-[#E55100] transition-colors mb-4"
          data-testid="notify-me-btn"
        >
          <Bell size={20} />
          Me notifier du lancement
        </button>
      )}

      {/* Bouton Changer de lieu */}
      {onChangeLocation && (
        <button
          onClick={onChangeLocation}
          className="flex items-center gap-2 text-gray-600 hover:text-[#FF5A00] transition-colors"
          data-testid="change-location-btn"
        >
          <Globe size={18} />
          <span>Changer de lieu</span>
        </button>
      )}

      {/* Stats fun */}
      <div className="mt-12 grid grid-cols-3 gap-6 w-full max-w-md">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FF5A00]">10</div>
          <div className="text-xs text-gray-500">Pays en préparation</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FF5A00]">100+</div>
          <div className="text-xs text-gray-500">Partenaires à venir</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FF5A00]">2026</div>
          <div className="text-xs text-gray-500">Lancement prévu</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Version compacte pour afficher dans le feed
 */
export function ComingSoonBanner({ 
  countryCode = 'ML',
  city = null,
  onNotifyMe = null,
}) {
  const country = getCountryByCode(countryCode);
  const locationName = city || country?.name;

  return (
    <div className="mx-4 my-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-2xl">{country?.flag || '🚀'}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            ACTOOS arrive à {locationName} !
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Nous préparons notre lancement. Restez connectés !
          </p>
          {onNotifyMe && (
            <button
              onClick={onNotifyMe}
              className="mt-3 flex items-center gap-1.5 text-sm text-[#FF5A00] font-medium hover:underline"
            >
              <Bell size={14} />
              Me notifier
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ComingSoonScreen;
