import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from './ui/dialog';
import { Cookie, Shield, BarChart3, Target, Settings, Check, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const CONSENT_KEY = 'actoos_cookie_consent';
const CONSENT_VERSION = '1.0';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showDetails, setShowDetails] = useState({});
  const [preferences, setPreferences] = useState({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    preferences: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const savedConsent = localStorage.getItem(CONSENT_KEY);
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed.version === CONSENT_VERSION) {
          setPreferences(parsed.preferences);
          return; // Don't show banner
        }
      } catch (e) {
        // Invalid consent, show banner
      }
    }
    
    // Show banner after a short delay for better UX
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (prefs) => {
    const consent = {
      version: CONSENT_VERSION,
      preferences: prefs,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setPreferences(prefs);
    setShowBanner(false);
    setShowCustomize(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      preferences: true
    });
  };

  const handleRejectNonEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      preferences: false
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  const toggleDetail = (category) => {
    setShowDetails(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const cookieCategories = [
    {
      id: 'essential',
      name: 'Cookies essentiels',
      description: 'Ces cookies sont nécessaires au fonctionnement du site. Ils permettent la navigation, la connexion sécurisée et les fonctionnalités de base.',
      icon: Shield,
      required: true,
      details: [
        'Authentification et session utilisateur',
        'Sécurité et protection contre les fraudes',
        'Préférences de langue et région',
        'Fonctionnement du panier et des formulaires'
      ]
    },
    {
      id: 'analytics',
      name: 'Cookies analytiques',
      description: 'Ces cookies nous aident à comprendre comment les visiteurs utilisent notre site, ce qui nous permet d\'améliorer votre expérience.',
      icon: BarChart3,
      required: false,
      details: [
        'Statistiques de visite anonymisées',
        'Pages les plus consultées',
        'Temps passé sur le site',
        'Parcours utilisateur'
      ]
    },
    {
      id: 'marketing',
      name: 'Cookies marketing',
      description: 'Ces cookies sont utilisés pour vous proposer des publicités pertinentes et mesurer l\'efficacité de nos campagnes.',
      icon: Target,
      required: false,
      details: [
        'Publicités personnalisées',
        'Remarketing sur les réseaux sociaux',
        'Mesure des conversions publicitaires',
        'Suivi des campagnes marketing'
      ]
    },
    {
      id: 'preferences',
      name: 'Cookies de préférences',
      description: 'Ces cookies permettent de mémoriser vos choix et préférences pour personnaliser votre expérience sur le site.',
      icon: Settings,
      required: false,
      details: [
        'Thème sombre/clair',
        'Préférences d\'affichage',
        'Historique de navigation',
        'Fonctionnalités personnalisées'
      ]
    }
  ];

  if (!showBanner && !showCustomize) return null;

  return (
    <>
      {/* Cookie Banner */}
      {showBanner && !showCustomize && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 animate-in slide-in-from-bottom-5 duration-500">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Cookie className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">Vos préférences de confidentialité</h3>
                    <p className="text-slate-400 text-sm">Actoos respecte votre vie privée</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6">
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
                  Nous utilisons des cookies et des technologies similaires pour améliorer votre expérience sur notre site, 
                  analyser notre trafic et personnaliser le contenu. En cliquant sur « Accepter tout », vous consentez à 
                  l'utilisation de tous les cookies. Vous pouvez également personnaliser vos préférences ou refuser les 
                  cookies non essentiels.
                </p>
                
                {/* Quick summary */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {cookieCategories.map((cat) => (
                    <div 
                      key={cat.id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                        cat.required 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      <cat.icon className="w-3.5 h-3.5" />
                      {cat.name}
                      {cat.required && <Check className="w-3 h-3" />}
                    </div>
                  ))}
                </div>
                
                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleAcceptAll}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Accepter tout
                  </Button>
                  <Button
                    onClick={() => setShowCustomize(true)}
                    variant="outline"
                    className="flex-1 border-slate-300 dark:border-slate-600 py-3"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Personnaliser
                  </Button>
                  <Button
                    onClick={handleRejectNonEssential}
                    variant="ghost"
                    className="flex-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 py-3"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Refuser les non-essentiels
                  </Button>
                </div>
                
                {/* Legal links */}
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 text-xs text-slate-500">
                  <a href="/privacy" className="hover:text-blue-600 flex items-center gap-1">
                    Politique de confidentialité
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href="/terms" className="hover:text-blue-600 flex items-center gap-1">
                    Conditions d'utilisation
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <a href="/cookies" className="hover:text-blue-600 flex items-center gap-1">
                    Politique des cookies
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customize Modal */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Cookie className="w-6 h-6 text-blue-600" />
              Gérer vos préférences de cookies
            </DialogTitle>
            <DialogDescription>
              Choisissez les types de cookies que vous souhaitez autoriser. 
              Les cookies essentiels sont toujours actifs car ils sont nécessaires au bon fonctionnement du site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {cookieCategories.map((category) => (
              <div 
                key={category.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  preferences[category.id] 
                    ? 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        preferences[category.id]
                          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                      }`}>
                        <category.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-900 dark:text-white">
                            {category.name}
                          </h4>
                          {category.required && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-xs rounded-full font-medium">
                              Requis
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {category.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[category.id]}
                      onCheckedChange={(checked) => {
                        if (!category.required) {
                          setPreferences(prev => ({ ...prev, [category.id]: checked }));
                        }
                      }}
                      disabled={category.required}
                      className={category.required ? 'opacity-50' : ''}
                    />
                  </div>
                  
                  {/* Expandable details */}
                  <button
                    onClick={() => toggleDetail(category.id)}
                    className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {showDetails[category.id] ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Masquer les détails
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Voir les détails
                      </>
                    )}
                  </button>
                  
                  {showDetails[category.id] && (
                    <div className="mt-3 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                      <ul className="space-y-1">
                        {category.details.map((detail, index) => (
                          <li key={index} className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomize(false);
                setShowBanner(true);
              }}
              className="sm:flex-1"
            >
              Retour
            </Button>
            <Button
              variant="outline"
              onClick={handleRejectNonEssential}
              className="sm:flex-1"
            >
              Essentiels uniquement
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="sm:flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Check className="w-4 h-4 mr-2" />
              Enregistrer mes préférences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Export a function to reset consent (useful for testing or settings page)
export const resetCookieConsent = () => {
  localStorage.removeItem(CONSENT_KEY);
  window.location.reload();
};

// Export a function to get current preferences
export const getCookiePreferences = () => {
  const saved = localStorage.getItem(CONSENT_KEY);
  if (saved) {
    try {
      return JSON.parse(saved).preferences;
    } catch {
      return null;
    }
  }
  return null;
};

export default CookieConsent;
