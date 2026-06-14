import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, Cookie } from 'lucide-react';

const CookieBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setVisible(true);
    } else {
      try {
        const saved = JSON.parse(consent);
        setPreferences(saved);
      } catch (e) {
        setVisible(true);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, analytics: true, marketing: true };
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setVisible(false);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(preferences));
    setVisible(false);
    setShowSettings(false);
  };

  const handleRejectAll = () => {
    const rejected = { essential: true, analytics: false, marketing: false };
    localStorage.setItem('cookieConsent', JSON.stringify(rejected));
    setPreferences(rejected);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <>
      {/* Bannière principale */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-2xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cookie className="w-8 h-8 text-blue-600 shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-slate-900">{t('cookieBanner.title')}</h3>
              <p className="text-sm text-slate-600">
                {t('cookieBanner.description')}
              </p>
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
              {t('cookieBanner.customize')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRejectAll}>
              {t('cookieBanner.rejectAll')}
            </Button>
            <Button size="sm" onClick={handleAcceptAll} className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('cookieBanner.acceptAll')}
            </Button>
          </div>
        </div>
      </div>

      {/* Modale de personnalisation */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="max-w-md w-full rounded-2xl bg-white shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">{t('cookieBanner.settings.title')}</h2>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={preferences.essential}
                    disabled
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">{t('cookieBanner.settings.essential.label')}</span>
                    <p className="text-xs text-slate-500">{t('cookieBanner.settings.essential.description')}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">{t('cookieBanner.settings.analytics.label')}</span>
                    <p className="text-xs text-slate-500">{t('cookieBanner.settings.analytics.description')}</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-medium text-slate-900">{t('cookieBanner.settings.marketing.label')}</span>
                    <p className="text-xs text-slate-500">{t('cookieBanner.settings.marketing.description')}</p>
                  </div>
                </label>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={handleRejectAll}>
                  {t('cookieBanner.settings.rejectAll')}
                </Button>
                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSaveSettings}>
                  {t('cookieBanner.settings.save')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};

export default CookieBanner;