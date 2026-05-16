'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('actoos-cookie-consent');
    if (!consent) {
      // Small delay for better UX
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('actoos-cookie-consent', JSON.stringify({
      essential: true,
      analytics: true,
      preferences: true,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('actoos-cookie-consent', JSON.stringify({
      essential: true,
      analytics: false,
      preferences: false,
      timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-slate-950 text-white rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center">
                <Cookie size={20} className="text-slate-900" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">Cookies & Confidentialité</h3>
                <p className="text-slate-400 text-xs">ACTOOS Group</p>
              </div>
            </div>
            <button 
              onClick={acceptEssential}
              className="text-slate-500 hover:text-white transition-colors p-1"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            Nous utilisons des cookies pour améliorer votre expérience sur notre site, 
            analyser le trafic et personnaliser le contenu. En cliquant sur &quot;Tout accepter&quot;, 
            vous consentez à l&apos;utilisation de tous les cookies.
          </p>

          {/* Details toggle */}
          {showDetails && (
            <div className="bg-slate-900 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Cookies essentiels</p>
                  <p className="text-slate-400 text-xs">Nécessaires au fonctionnement</p>
                </div>
                <div className="w-10 h-6 bg-[#D4AF37] rounded-full flex items-center justify-end px-1">
                  <div className="w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Cookies analytiques</p>
                  <p className="text-slate-400 text-xs">Comprendre l&apos;utilisation du site</p>
                </div>
                <div className="w-10 h-6 bg-slate-700 rounded-full flex items-center px-1">
                  <div className="w-4 h-4 bg-slate-400 rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">Cookies de préférences</p>
                  <p className="text-slate-400 text-xs">Mémoriser vos choix</p>
                </div>
                <div className="w-10 h-6 bg-slate-700 rounded-full flex items-center px-1">
                  <div className="w-4 h-4 bg-slate-400 rounded-full" />
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptAll}
              className="flex-1 bg-[#D4AF37] text-slate-900 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#F5D78E] transition-all flex items-center justify-center space-x-2"
            >
              <Check size={16} />
              <span>Tout accepter</span>
            </button>
            <button
              onClick={acceptEssential}
              className="flex-1 bg-slate-800 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all"
            >
              Essentiels uniquement
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="sm:flex-none bg-transparent text-slate-400 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all border border-slate-700 hover:border-slate-500"
            >
              {showDetails ? 'Masquer' : 'Personnaliser'}
            </button>
          </div>

          {/* Links */}
          <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <a href="/privacy" className="hover:text-[#D4AF37] transition-colors">Politique de confidentialité</a>
            <a href="/legal" className="hover:text-[#D4AF37] transition-colors">Mentions légales</a>
          </div>
        </div>
      </div>
    </div>
  );
}