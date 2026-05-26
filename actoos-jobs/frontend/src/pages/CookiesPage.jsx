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
          <p className="text-sm text-slate-500">Derniere mise a jour : 26 Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-slate-600 leading-relaxed">
              Un cookie est un petit fichier texte stocke sur votre appareil (ordinateur, telephone, tablette) 
              lorsque vous visitez un site web. Les cookies permettent au site de reconnaitre votre appareil 
              et de memoriser certaines informations sur vos preferences ou actions passees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Types de cookies utilises</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies essentiels</h3>
                <p className="text-slate-600 text-sm">
                  Necessaires au fonctionnement de la Plateforme. Ils permettent d'utiliser les fonctionnalites 
                  de base comme la connexion securisee et la navigation entre les pages.
                </p>
                <p className="text-xs text-slate-500 mt-2">Duree : Session</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies de preference</h3>
                <p className="text-slate-600 text-sm">
                  Permettent de memoriser vos preferences (langue, region, parametres d'affichage) pour 
                  personnaliser votre experience.
                </p>
                <p className="text-xs text-slate-500 mt-2">Duree : 1 an</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies analytiques</h3>
                <p className="text-slate-600 text-sm">
                  Nous aident a comprendre comment les visiteurs interagissent avec notre site en collectant 
                  des informations anonymes sur les pages visitees et le temps passe.
                </p>
                <p className="text-xs text-slate-500 mt-2">Duree : 2 ans</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-900 mb-2">Cookies marketing</h3>
                <p className="text-slate-600 text-sm">
                  Utilises pour suivre les visiteurs sur les sites web et afficher des publicites pertinentes 
                  et interessantes pour l'utilisateur.
                </p>
                <p className="text-xs text-slate-500 mt-2">Duree : 6 mois</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Cookies tiers</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Nous utilisons des services tiers qui peuvent deposer des cookies :
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
              Vous pouvez controler et/ou supprimer les cookies comme vous le souhaitez :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Via les parametres de votre navigateur</li>
              <li>En utilisant notre bandeau de consentement aux cookies</li>
              <li>En installant des extensions de blocage de cookies</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Note : La desactivation de certains cookies peut affecter votre experience sur la Plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Parametres du navigateur</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Voici comment gerer les cookies dans les principaux navigateurs :
            </p>
            <ul className="list-none text-slate-600 space-y-2 ml-4">
              <li>
                <strong>Chrome</strong> : Parametres &gt; Confidentialite et securite &gt; Cookies
              </li>
              <li>
                <strong>Firefox</strong> : Options &gt; Vie privee et securite &gt; Cookies
              </li>
              <li>
                <strong>Safari</strong> : Preferences &gt; Confidentialite &gt; Cookies
              </li>
              <li>
                <strong>Edge</strong> : Parametres &gt; Confidentialite &gt; Cookies
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Modifications</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous pouvons mettre a jour cette politique de cookies pour refleter les changements dans 
              nos pratiques ou pour d'autres raisons operationnelles, legales ou reglementaires.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant notre utilisation des cookies, contactez-nous a : 
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
