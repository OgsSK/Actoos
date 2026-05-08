import { useState, useEffect } from 'react';

const CONSENT_STORAGE_KEY = 'actoos_cookie_consent';

export function CookieConsentSheet({ onAccept, onCustomize, onDecline }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    console.log('[Cookie] Checking consent:', consent);
    if (!consent) {
      // Afficher après un petit délai pour ne pas bloquer le premier rendu
      const timer = setTimeout(() => {
        console.log('[Cookie] Showing consent popup');
        setIsVisible(true);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      console.log('[Cookie] Consent already given, not showing popup');
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
      type: 'full',
    }));
    setIsVisible(false);
    onAccept?.();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify({
      accepted: false,
      timestamp: new Date().toISOString(),
      type: 'essential_only',
    }));
    setIsVisible(false);
    onDecline?.();
  };

  const handleCustomize = () => {
    onCustomize?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4" data-testid="cookie-consent-sheet">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />
      
      {/* Card */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 bottom-sheet-enter">
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Nous utilisons des cookies
        </h2>

        {/* Description */}
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Sélectionnez « Accepter » pour autoriser Actoos à utiliser des cookies afin de personnaliser votre expérience. 
          Nous utilisons des cookies pour mémoriser votre localisation, calculer les itinéraires de livraison et améliorer nos services. 
          Personnalisez vos préférences dans les Paramètres des cookies, ou sélectionnez Refuser pour n'utiliser que les cookies essentiels.
          {' '}
          <button className="text-gray-900 font-medium underline underline-offset-2">
            En savoir plus
          </button>
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={handleCustomize}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            data-testid="cookie-customize-btn"
          >
            Paramètres
          </button>
          
          <button
            onClick={handleDecline}
            className="px-5 py-2.5 text-sm font-medium text-primary bg-white border-2 border-primary rounded-full hover:bg-primary/5 transition-colors"
            data-testid="cookie-decline-btn"
          >
            Refuser
          </button>
          
          <button
            onClick={handleAccept}
            className="px-5 py-2.5 text-sm font-medium text-white bg-primary rounded-full hover:bg-primary/90 active:bg-primary/80 transition-colors"
            data-testid="cookie-accept-btn"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook pour vérifier le consentement
export function useConsentStatus() {
  const [hasConsent, setHasConsent] = useState(null);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (consent) {
      const parsed = JSON.parse(consent);
      setHasConsent(parsed.accepted);
    } else {
      setHasConsent(null);
    }
  }, []);

  return hasConsent;
}
