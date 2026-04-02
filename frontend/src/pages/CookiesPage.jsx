import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Cookie, Shield, BarChart3, Target, Settings, Check, X, Clock, Globe } from 'lucide-react';
import { Button } from '../components/ui/button';
import { resetCookieConsent } from '../components/CookieConsent';

const CookiesPage = () => {
  const lastUpdated = "1er Avril 2025";
  
  const cookieTypes = [
    {
      name: "Cookies essentiels",
      icon: Shield,
      required: true,
      description: "Ces cookies sont indispensables au fonctionnement du site. Sans eux, vous ne pourriez pas naviguer correctement ni utiliser les fonctionnalités de base.",
      examples: [
        { name: "actoos_session", purpose: "Maintient votre connexion active", duration: "Session" },
        { name: "actoos_csrf", purpose: "Protection contre les attaques CSRF", duration: "Session" },
        { name: "actoos_cookie_consent", purpose: "Mémorise vos préférences de cookies", duration: "1 an" }
      ]
    },
    {
      name: "Cookies analytiques",
      icon: BarChart3,
      required: false,
      description: "Ces cookies nous permettent de mesurer l'audience de notre site et d'analyser la façon dont vous l'utilisez afin d'améliorer nos services.",
      examples: [
        { name: "_ga", purpose: "Google Analytics - Distingue les utilisateurs", duration: "2 ans" },
        { name: "_gid", purpose: "Google Analytics - Distingue les utilisateurs", duration: "24 heures" },
        { name: "_gat", purpose: "Google Analytics - Limite le taux de requêtes", duration: "1 minute" }
      ]
    },
    {
      name: "Cookies marketing",
      icon: Target,
      required: false,
      description: "Ces cookies sont utilisés pour vous présenter des publicités pertinentes et mesurer l'efficacité de nos campagnes marketing.",
      examples: [
        { name: "_fbp", purpose: "Facebook Pixel - Suivi des conversions", duration: "3 mois" },
        { name: "fr", purpose: "Facebook - Publicités ciblées", duration: "3 mois" },
        { name: "NID", purpose: "Google Ads - Préférences publicitaires", duration: "6 mois" }
      ]
    },
    {
      name: "Cookies de préférences",
      icon: Settings,
      required: false,
      description: "Ces cookies permettent de mémoriser vos choix et préférences pour personnaliser votre expérience utilisateur.",
      examples: [
        { name: "actoos_theme", purpose: "Mémorise votre préférence de thème", duration: "1 an" },
        { name: "actoos_lang", purpose: "Mémorise votre langue préférée", duration: "1 an" },
        { name: "actoos_sidebar", purpose: "État de la barre latérale", duration: "1 an" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </Link>
          <Link to="/" className="text-xl font-bold text-slate-900 dark:text-white">
            Actoos
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-4">
            <Cookie className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Politique des Cookies
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8">
          
          {/* Introduction */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Qu'est-ce qu'un cookie ?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette ou mobile) 
              lorsque vous visitez un site web. Les cookies permettent au site de se souvenir de vos actions 
              et préférences (comme la connexion, la langue, la taille de police et d'autres préférences 
              d'affichage) pendant une période donnée, afin que vous n'ayez pas à les réindiquer chaque 
              fois que vous revenez sur le site ou naviguez d'une page à l'autre.
            </p>
          </div>

          {/* How we use cookies */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Comment utilisons-nous les cookies ?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Actoos utilise différents types de cookies pour :
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: Shield, text: "Assurer le bon fonctionnement du site", color: "green" },
                { icon: BarChart3, text: "Analyser l'utilisation pour améliorer nos services", color: "blue" },
                { icon: Target, text: "Personnaliser les publicités", color: "purple" },
                { icon: Settings, text: "Mémoriser vos préférences", color: "amber" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <item.icon className={`w-5 h-5 text-${item.color}-500`} />
                  <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cookie Types */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Types de cookies utilisés
            </h2>
            
            {cookieTypes.map((type, index) => (
              <div 
                key={index}
                className={`bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-sm border ${
                  type.required 
                    ? 'border-green-200 dark:border-green-800' 
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className={`px-6 py-4 flex items-center justify-between ${
                  type.required 
                    ? 'bg-green-50 dark:bg-green-900/20' 
                    : 'bg-slate-50 dark:bg-slate-700/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <type.icon className={`w-6 h-6 ${type.required ? 'text-green-600' : 'text-slate-500'}`} />
                    <h3 className="font-bold text-slate-900 dark:text-white">{type.name}</h3>
                  </div>
                  {type.required ? (
                    <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 text-sm rounded-full font-medium flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Toujours actif
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-300 text-sm rounded-full font-medium">
                      Optionnel
                    </span>
                  )}
                </div>
                <div className="p-6">
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    {type.description}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Cookie</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Finalité</th>
                          <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">Durée</th>
                        </tr>
                      </thead>
                      <tbody>
                        {type.examples.map((cookie, i) => (
                          <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <td className="py-2 px-3 font-mono text-xs text-purple-600 dark:text-purple-400">
                              {cookie.name}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                              {cookie.purpose}
                            </td>
                            <td className="py-2 px-3 text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {cookie.duration}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Managing cookies */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Comment gérer vos cookies ?
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Vous pouvez gérer vos préférences de cookies de plusieurs façons :
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  1. Via notre bannière de consentement
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                  Lors de votre première visite, une bannière vous permet de choisir vos préférences. 
                  Vous pouvez modifier ces choix à tout moment en cliquant sur le bouton ci-dessous :
                </p>
                <Button 
                  onClick={() => {
                    resetCookieConsent();
                  }}
                  variant="outline"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Modifier mes préférences de cookies
                </Button>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
                  2. Via les paramètres de votre navigateur
                </h3>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-3">
                  La plupart des navigateurs vous permettent de contrôler les cookies via leurs paramètres :
                </p>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  {[
                    { name: "Chrome", link: "chrome://settings/cookies" },
                    { name: "Firefox", link: "about:preferences#privacy" },
                    { name: "Safari", link: "Préférences > Confidentialité" },
                    { name: "Edge", link: "edge://settings/privacy" }
                  ].map((browser, i) => (
                    <div key={i} className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">{browser.name}:</span>
                      <span className="text-slate-500">{browser.link}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border-l-4 border-amber-500">
              <p className="text-slate-700 dark:text-slate-300 text-sm">
                <strong>Attention :</strong> La désactivation de certains cookies peut affecter le 
                fonctionnement du site et limiter l'accès à certaines fonctionnalités.
              </p>
            </div>
          </div>

          {/* Third parties */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Cookies tiers
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Nous utilisons des services tiers qui peuvent également déposer des cookies :
            </p>
            <div className="space-y-3">
              {[
                { name: "Stripe", purpose: "Traitement sécurisé des paiements", link: "https://stripe.com/privacy" },
                { name: "Google Analytics", purpose: "Analyse d'audience (si vous l'avez accepté)", link: "https://policies.google.com/privacy" },
                { name: "Resend", purpose: "Envoi d'emails transactionnels", link: "https://resend.com/privacy" }
              ].map((service, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-900 dark:text-white">{service.name}</span>
                    <span className="text-slate-500 dark:text-slate-400 ml-2">- {service.purpose}</span>
                  </div>
                  <a 
                    href={service.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Politique →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Contact
            </h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Pour toute question concernant notre utilisation des cookies :
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="font-medium text-slate-900 dark:text-white">Actoos - Protection des données</p>
              <p className="text-slate-600 dark:text-slate-400">Email : contact@actoos.com</p>
            </div>
          </div>

        </div>

        {/* Back button */}
        <div className="mt-8 text-center">
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à l'accueil
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Actoos. Tous droits réservés.</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link to="/privacy" className="hover:text-blue-600">Politique de confidentialité</Link>
            <Link to="/terms" className="hover:text-blue-600">Conditions d'utilisation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CookiesPage;
