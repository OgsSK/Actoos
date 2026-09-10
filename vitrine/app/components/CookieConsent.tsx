'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function CookieConsent() {
  const { language } = useLanguage();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
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

  useEffect(() => {
    if (!showBanner) {
      if (consent.analytics) {
        console.log('✅ Cookies analytiques acceptés – scripts chargés');
      } else {
        console.log('❌ Cookies analytiques refusés – scripts bloqués');
      }

      if (consent.preferences) {
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
      <div className="max-w-2xl mx-auto bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-5 md:p-6">

          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Cookie size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base tracking-tight text-slate-900">
                  {t[language].cookieTitle}
                </h3>
                <p className="text-slate-400 text-xs">Actoos</p>
              </div>
            </div>
            <button
              onClick={acceptEssential}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 -mr-1"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <p className="text-slate-500 text-sm leading-relaxed mb-5">
            {t[language].cookieDescription}
          </p>

          {/* Panneau de détails */}
          {showDetails && (
            <div className="bg-slate-50 rounded-xl p-4 mb-5 space-y-3 border border-slate-100">
              {cookieTypes.map((item) => (
                <div key={item.type} className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-slate-900">{item.label}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (item.type !== 'essential') toggleConsent(item.type);
                    }}
                    className={`relative w-9 h-5 rounded-full flex items-center px-0.5 transition-colors shrink-0 ${
                      item.enabled ? 'bg-slate-900 justify-end' : 'bg-slate-300 justify-start'
                    } ${item.type === 'essential' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                    disabled={item.type === 'essential'}
                    aria-label={item.label}
                  >
                    <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                  </button>
                </div>
              ))}
              <button
                onClick={saveCustomConsent}
                className="w-full mt-2 bg-slate-900 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                {t[language].cookieSavePreferences || 'Enregistrer mes préférences'}
              </button>
            </div>
          )}

          {/* Boutons principaux */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={acceptAll}
              className="flex-1 bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Check size={15} />
              <span>{t[language].cookieAcceptAll}</span>
            </button>
            <button
              onClick={acceptEssential}
              className="flex-1 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              {t[language].cookieAcceptEssential}
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="sm:flex-none bg-transparent text-slate-500 px-4 py-2.5 rounded-lg font-medium text-sm hover:text-slate-900 hover:bg-slate-50 transition-colors"
            >
              {showDetails ? t[language].cookieHide : t[language].cookieCustomize}
            </button>
          </div>

          {/* Liens légaux */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-xs text-slate-400">
            <a href="/privacy" className="hover:text-blue-600 transition-colors">
              {t[language].cookiePrivacyLink}
            </a>
            <a href="/legal" className="hover:text-blue-600 transition-colors">
              {t[language].cookieLegalLink}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}