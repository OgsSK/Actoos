'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function CookieConsent() {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Consentements pour chaque catégorie (essentiels = toujours activé)
  const [consent, setConsent] = useState({
    essential: true,
    analytics: false,
    preferences: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem('actoos-cookie-consent');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConsent({
          essential: true,
          analytics: parsed.analytics || false,
          preferences: parsed.preferences || false,
        });
      } catch {}
    } else {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Appliquer le consentement (exemple : bloquer Google Analytics si analytics = false)
  useEffect(() => {
    if (!showBanner) {
      if (consent.analytics) {
        // Charger Google Analytics / scripts marketing
        // gtag('consent', 'update', { analytics_storage: 'granted' });
        console.log('✅ Cookies analytiques acceptés – scripts chargés');
      } else {
        // Bloquer ou désactiver les scripts
        // gtag('consent', 'update', { analytics_storage: 'denied' });
        console.log('❌ Cookies analytiques refusés – scripts bloqués');
      }

      if (consent.preferences) {
        // Activer les cookies de préférences (thème, langue, etc.)
        console.log('✅ Cookies de préférences acceptés');
      } else {
        console.log('❌ Cookies de préférences refusés');
      }
    }
  }, [showBanner, consent]);

  const acceptAll = () => {
    const newConsent = {
      essential: true,
      analytics: true,
      preferences: true,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('actoos-cookie-consent', JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  };

  const acceptEssential = () => {
    const newConsent = {
      essential: true,
      analytics: false,
      preferences: false,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('actoos-cookie-consent', JSON.stringify(newConsent));
    setConsent(newConsent);
    setShowBanner(false);
  };

  const saveCustomConsent = () => {
    localStorage.setItem(
      'actoos-cookie-consent',
      JSON.stringify({
        ...consent,
        timestamp: new Date().toISOString(),
      })
    );
    setShowBanner(false);
  };

  const toggleConsent = (type: 'analytics' | 'preferences') => {
    setConsent((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  if (!showBanner) return null;

  const cookieTypes = [
    {
      type: 'essential' as const,
      label: t[language].cookieEssentialTitle,
      desc: t[language].cookieEssentialDesc,
      enabled: true,
    },
    {
      type: 'analytics' as const,
      label: t[language].cookieAnalyticsTitle,
      desc: t[language].cookieAnalyticsDesc,
      enabled: consent.analytics,
    },
    {
      type: 'preferences' as const,
      label: t[language].cookiePreferencesTitle,
      desc: t[language].cookiePreferencesDesc,
      enabled: consent.preferences,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-2xl text-slate-900 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 ring-1 ring-black/5 overflow-hidden">
        <div className="p-6 md:p-8">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Cookie size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">{t[language].cookieTitle}</h3>
                <p className="text-slate-500 text-xs">ACTOOS Group</p>
              </div>
            </div>
            <button
              onClick={acceptEssential}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              aria-label="Fermer"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            {t[language].cookieDescription}
          </p>

          {/* Panneau de détails interactif */}
          {showDetails && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              {cookieTypes.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{item.label}</p>
                    <p className="text-slate-400 text-xs">{item.desc}</p>
                  </div>
                  {/* Interrupteur cliquable */}
                  <button
                    onClick={() => {
                      if (item.type !== 'essential') toggleConsent(item.type);
                    }}
                    className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${
                      item.enabled ? 'bg-[#D4AF37] justify-end' : 'bg-slate-300 justify-start'
                    } ${item.type === 'essential' ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                    disabled={item.type === 'essential'}
                    aria-label={item.label}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
              <button
                onClick={saveCustomConsent}
                className="w-full mt-2 bg-[#D4AF37] text-white py-2 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-amber-500 transition-colors"
              >
                {t[language].cookieSavePreferences || 'Enregistrer mes préférences'}
              </button>
            </div>
          )}

          {/* Boutons principaux */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={acceptAll}
              className="flex-1 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200 flex items-center justify-center space-x-2"
            >
              <Check size={16} />
              <span>{t[language].cookieAcceptAll}</span>
            </button>
            <button
              onClick={acceptEssential}
              className="flex-1 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              {t[language].cookieAcceptEssential}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="sm:flex-none bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition-all"
            >
              {showDetails ? t[language].cookieHide : t[language].cookieCustomize}
            </button>
          </div>

          {/* Liens légaux */}
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <a href="/privacy" className="hover:text-[#D4AF37] transition-colors">
              {t[language].cookiePrivacyLink}
            </a>
            <a href="/legal" className="hover:text-[#D4AF37] transition-colors">
              {t[language].cookieLegalLink}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}