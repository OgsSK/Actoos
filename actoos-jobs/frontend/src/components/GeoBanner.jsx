import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGeoDetect } from '../hooks/useGeoDetect';
import { MapPin, X } from 'lucide-react';

const GeoBanner = () => {
  const { t } = useTranslation();
  const { detected, showBanner, applyDetected, dismissBanner } = useGeoDetect();

if (!showBanner || !detected) return null;

  const countryName = t(`countries.${detected.country}`, detected.country);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl px-6 py-4 shadow-xl flex items-center gap-4 max-w-md w-[calc(100%-2rem)]">
      <MapPin className="w-5 h-5 text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          Il semblerait que vous soyez en{' '}
          <strong>{countryName}</strong>.
          Voulez-vous afficher les offres et les prix adaptés ?
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={applyDetected}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-xl font-medium"
        >
          Oui
        </button>
        <button
          onClick={dismissBanner}
          className="text-slate-400 hover:text-white"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default GeoBanner;