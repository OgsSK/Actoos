import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const CookiesPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Politique de Cookies</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">Dernière mise à jour : Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-slate-600 leading-relaxed">
              Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, téléphone, tablette) 
              lorsque vous visitez un site web. Les cookies permettent au site de reconnaître votre appareil 
              et de mémoriser certaines informations sur vos préférences ou actions passées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Types de cookies utilisés</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies essentiels</h3>
                <p className="text-slate-600 text-sm">
                  Nécessaires au fonctionnement de la Plateforme. Ils permettent d'utiliser les fonctionnalités 
                  de base comme la connexion sécurisée et la navigation entre les pages.
                </p>
                <p className="text-xs text-slate-500 mt-2">Durée : Session</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies de préférence</h3>
                <p className="text-slate-600 text-sm">
                  Permettent de mémoriser vos préférences (langue, région, paramètres d'affichage) pour 
                  personnaliser votre expérience.
                </p>
                <p className="text-xs text-slate-500 mt-2">Durée : 1 an</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies analytiques</h3>
                <p className="text-slate-600 text-sm">
                  Nous aident à comprendre comment les visiteurs interagissent avec notre site en collectant 
                  des informations anonymes sur les pages visitées et le temps passé.
                </p>
                <p className="text-xs text-slate-500 mt-2">Durée : 2 ans</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies marketing</h3>
                <p className="text-slate-600 text-sm">
                  Utilisés pour suivre les visiteurs sur les sites web et afficher des publicités pertinentes 
                  et intéressantes pour l'utilisateur.
                </p>
                <p className="text-xs text-slate-500 mt-2">Durée : 6 mois</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Cookies tiers</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous utilisons des services tiers qui peuvent déposer des cookies :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Google Analytics</strong> - Analyse du trafic</li>
              <li><strong>Supabase</strong> - Authentification et services backend</li>
              <li><strong>Stripe</strong> - Traitement des paiements (pour les offres premium)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Gestion des cookies</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Vous pouvez contrôler et/ou supprimer les cookies comme vous le souhaitez :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Via les paramètres de votre navigateur</li>
              <li>En utilisant notre bandeau de consentement aux cookies</li>
              <li>En installant des extensions de blocage de cookies</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Note : La désactivation de certains cookies peut affecter votre expérience sur la Plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Paramètres du navigateur</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Voici comment gérer les cookies dans les principaux navigateurs :
            </p>
            <ul className="list-none text-slate-600 space-y-2 ml-4">
              <li>
                <strong>Chrome</strong> : Paramètres &gt; Confidentialité et sécurité &gt; Cookies
              </li>
              <li>
                <strong>Firefox</strong> : Options &gt; Vie privée et sécurité &gt; Cookies
              </li>
              <li>
                <strong>Safari</strong> : Préférences &gt; Confidentialité &gt; Cookies
              </li>
              <li>
                <strong>Edge</strong> : Paramètres &gt; Confidentialité &gt; Cookies
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Modifications</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous pouvons mettre à jour cette politique de cookies pour refléter les changements dans 
              nos pratiques ou pour d'autres raisons opérationnelles, légales ou réglementaires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant notre utilisation des cookies, contactez-nous à : 
              <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline ml-1">
                contact@actoos.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default CookiesPage;