import { useState, useEffect } from 'react';
import { Shield, Check } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

const CONSENT_STORAGE_KEY = 'actoos_cookie_consent';

const cookieCategories = [
  {
    id: 'essential',
    name: 'Cookies essentiels',
    description: 'Nécessaires au fonctionnement de l\'application (authentification, panier, sécurité).',
    required: true,
  },
  {
    id: 'analytics',
    name: 'Cookies analytiques',
    description: 'Nous aident à comprendre comment vous utilisez l\'app pour l\'améliorer.',
    required: false,
  },
  {
    id: 'location',
    name: 'Données de localisation',
    description: 'Permettent de calculer les itinéraires et estimer les temps de livraison.',
    required: false,
  },
  {
    id: 'personalization',
    name: 'Personnalisation',
    description: 'Adaptent les restaurants et offres affichés selon vos préférences.',
    required: false,
  },
];

export function PrivacySettingsSheet({ isOpen, onClose }) {
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: true,
    location: true,
    personalization: true,
  });

  // Charger les préférences existantes
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.preferences) {
          setPreferences(parsed.preferences);
        } else if (parsed.type === 'essential_only') {
          setPreferences({
            essential: true,
            analytics: false,
            location: false,
            personalization: false,
          });
        }
      }
    }
  }, [isOpen]);

  const togglePreference = (id) => {
    if (id === 'essential') return; // Ne peut pas être désactivé
    setPreferences(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSave = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      type: 'custom',
      preferences,
    }));
    onClose();
  };

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      location: true,
      personalization: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      type: 'full',
      preferences: allAccepted,
    }));
    onClose();
  };

  const handleRejectAll = () => {
    const essentialOnly = {
      essential: true,
      analytics: false,
      location: false,
      personalization: false,
    };
    setPreferences(essentialOnly);
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      type: 'essential_only',
      preferences: essentialOnly,
    }));
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Paramètres de confidentialité">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-gray-600">
            Gérez vos préférences de cookies et données personnelles.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          {cookieCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => togglePreference(category.id)}
              disabled={category.required}
              className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                preferences[category.id]
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 bg-white'
              } ${category.required ? 'opacity-70' : 'active:bg-gray-50'}`}
              data-testid={`privacy-${category.id}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className={`font-medium ${preferences[category.id] ? 'text-primary' : 'text-gray-900'}`}>
                    {category.name}
                    {category.required && (
                      <span className="ml-2 text-xs text-gray-400">(obligatoire)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                </div>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-3 ${
                  preferences[category.id] ? 'bg-primary' : 'bg-gray-200'
                }`}>
                  {preferences[category.id] && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSave}
            className="w-full bg-primary text-white font-semibold py-4 rounded-2xl active:bg-primary/90 transition-colors"
            data-testid="privacy-save-btn"
          >
            ENREGISTRER MES CHOIX
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleAcceptAll}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl active:bg-gray-200 transition-colors text-sm"
              data-testid="privacy-accept-all-btn"
            >
              Tout accepter
            </button>
            <button
              onClick={handleRejectAll}
              className="flex-1 bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl active:bg-gray-200 transition-colors text-sm"
              data-testid="privacy-reject-all-btn"
            >
              Refuser tout
            </button>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
