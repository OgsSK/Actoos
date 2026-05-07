import { useState, useEffect } from 'react';
import { Shield, Settings } from 'lucide-react';

const CONSENT_STORAGE_KEY = 'actoos_cookie_consent';

export function CookieConsentSheet({ onAccept, onCustomize, onDecline }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si le consentement a déjà été donné
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!consent) {
      // Afficher après un petit délai pour ne pas bloquer le premier rendu
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
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
    <div className="fixed inset-0 z-[100]" data-testid="cookie-consent-sheet">
      {/* Backdrop semi-transparent */}
      <div className="absolute inset-0 bg-black/30" />
      
      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl bottom-sheet-enter safe-area-bottom">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Votre expérience, votre sécurité.
            </h2>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4">
            Actoos utilise des cookies et technologies similaires pour :
          </p>

          <ul className="text-sm text-gray-500 space-y-1.5 mb-6 pl-4">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>sécuriser les paiements et le Wallet Actoos,</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>calculer les itinéraires de livraison,</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>prévenir la fraude,</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>améliorer la rapidité du service,</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>personnaliser les restaurants et offres affichés.</span>
            </li>
          </ul>

          <p className="text-xs text-gray-400 mb-6">
            Certaines données techniques et de localisation peuvent être utilisées pour améliorer nos algorithmes logistiques et financiers.
          </p>

          {/* Buttons */}
          <div className="space-y-3">
            {/* Primary CTA */}
            <button
              onClick={handleAccept}
              className="w-full bg-primary text-white font-semibold py-4 rounded-2xl active:bg-primary/90 transition-colors"
              data-testid="cookie-accept-btn"
            >
              ACCEPTER ET CONTINUER
            </button>

            {/* Secondary CTA */}
            <button
              onClick={handleCustomize}
              className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-200 transition-colors"
              data-testid="cookie-customize-btn"
            >
              <Settings className="w-4 h-4" />
              PERSONNALISER
            </button>

            {/* Text link */}
            <button
              onClick={handleDecline}
              className="w-full text-gray-400 text-sm py-2"
              data-testid="cookie-decline-btn"
            >
              Continuer sans accepter
              <span className="block text-xs text-gray-400">
                (seuls les cookies strictement nécessaires resteront actifs)
              </span>
            </button>
          </div>
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
