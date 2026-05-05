import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Check, AlertTriangle, CreditCard, Shield, Scale, Clock, Ban, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';

const TermsPage = () => {
  const lastUpdated = "1er Avril 2025";
  
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-8">
          
          {/* Article 1 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">1</span>
              Objet et acceptation
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme 
                Actoos, un logiciel de gestion d'interventions terrain en mode SaaS (Software as a Service).
              </p>
              <p>
                En créant un compte ou en utilisant nos services, vous acceptez sans réserve les présentes CGU. 
                Si vous n'acceptez pas ces conditions, vous ne pouvez pas utiliser Actoos.
              </p>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-4 border-purple-500">
                <p className="font-medium">
                  L'utilisation d'Actoos implique l'acceptation pleine et entière des présentes CGU.
                </p>
              </div>
            </div>
          </section>

          {/* Article 2 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">2</span>
              Description du service
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Actoos est une plateforme de gestion d'interventions terrain permettant aux entreprises de :
              </p>
              <ul className="space-y-2">
                {[
                  "Gérer les interventions et plannings des techniciens",
                  "Créer et envoyer des devis et factures",
                  "Gérer une base de données clients et sites",
                  "Suivre l'activité en temps réel",
                  "Générer des rapports d'intervention avec photos et signatures",
                  "Synchroniser les données en mode hors ligne (selon le plan)"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Article 3 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">3</span>
              Inscription et compte
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Pour utiliser Actoos, vous devez créer un compte en fournissant des informations exactes 
                et à jour. Vous êtes responsable de :
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5" />
                  La confidentialité de vos identifiants de connexion
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5" />
                  Toutes les activités effectuées sous votre compte
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2.5" />
                  La mise à jour de vos informations
                </li>
              </ul>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <p>
                  Vous devez nous notifier immédiatement toute utilisation non autorisée de votre compte 
                  à l'adresse contact@actoos.com
                </p>
              </div>
            </div>
          </section>

          {/* Article 4 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">4</span>
              Abonnements et tarification
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>Actoos propose trois formules d'abonnement :</p>
              <div className="grid md:grid-cols-3 gap-4 mt-4">
                {[
                  { name: "Startup", price: "19,99€/mois", features: ["1 admin", "3 techniciens", "1 catégorie"] },
                  { name: "Pro", price: "49,99€/mois", features: ["3 admins", "10 techniciens", "4 catégories"] },
                  { name: "Entreprise", price: "89,99€/mois", features: ["Admins illimités", "Techs illimités", "Toutes fonctionnalités"] }
                ].map((plan, i) => (
                  <div key={i} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <h3 className="font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{plan.price}</p>
                    <ul className="mt-2 text-sm space-y-1">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-center gap-1">
                          <Check className="w-3 h-3 text-green-500" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <CreditCard className="w-5 h-5 text-slate-500 mt-0.5" />
                <div>
                  <p>Les paiements sont traités de manière sécurisée par Stripe.</p>
                  <p className="text-sm mt-1">Option de facturation annuelle avec 20% de réduction.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Article 5 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">5</span>
              Période d'essai
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-purple-500 mt-0.5" />
                <p>
                  Une période d'essai gratuite de <strong>14 jours</strong> est offerte à tout nouvel utilisateur. 
                  À l'issue de cette période, vous devrez souscrire à un abonnement payant pour continuer 
                  à utiliser le service.
                </p>
              </div>
              <p>
                Aucune carte bancaire n'est requise pour commencer l'essai. Vos données seront conservées 
                pendant 30 jours après la fin de l'essai si vous ne souscrivez pas.
              </p>
            </div>
          </section>

          {/* Article 6 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">6</span>
              Résiliation
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <div className="flex items-start gap-3">
                <RefreshCw className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p>Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte.</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• La résiliation prend effet à la fin de la période de facturation en cours</li>
                    <li>• Aucun remboursement au prorata n'est effectué</li>
                    <li>• Vos données restent accessibles en lecture seule pendant 30 jours</li>
                    <li>• Vous pouvez exporter vos données avant la suppression définitive</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Article 7 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">7</span>
              Utilisations interdites
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>Il est strictement interdit de :</p>
              <div className="grid md:grid-cols-2 gap-3">
                {[
                  "Utiliser le service à des fins illégales",
                  "Tenter d'accéder aux données d'autres utilisateurs",
                  "Revendre ou sous-licencier le service",
                  "Utiliser des robots ou scripts automatisés",
                  "Surcharger intentionnellement nos serveurs",
                  "Contourner les mesures de sécurité"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Article 8 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">8</span>
              Propriété intellectuelle
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                <p>
                  Actoos et tous ses composants (logiciel, design, marques, documentation) sont la propriété 
                  exclusive d'Actoos ou de ses concédants de licence. Vous ne disposez que d'un droit 
                  d'utilisation limité, non-exclusif et non-transférable du service.
                </p>
              </div>
              <p>
                Vous conservez la propriété de toutes les données que vous saisissez dans Actoos.
              </p>
            </div>
          </section>

          {/* Article 9 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">9</span>
              Limitation de responsabilité
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Actoos s'engage à fournir un service de qualité mais ne peut garantir une disponibilité 
                de 100%. Notre objectif de disponibilité (SLA) est de 99,5%.
              </p>
              <p>
                En aucun cas, Actoos ne pourra être tenu responsable des dommages indirects, pertes 
                de profits ou de données résultant de l'utilisation ou de l'impossibilité d'utiliser le service.
              </p>
              <p>
                La responsabilité totale d'Actoos est limitée au montant des sommes versées par 
                l'utilisateur au cours des 12 derniers mois.
              </p>
            </div>
          </section>

          {/* Article 10 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">10</span>
              Droit applicable et litiges
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <div className="flex items-start gap-3">
                <Scale className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p>
                    Les présentes CGU sont régies par le droit applicable dans votre pays de résidence. 
                    En cas de litige, les parties s'engagent à rechercher une solution amiable avant 
                    toute action en justice. À défaut d'accord amiable, les tribunaux compétents seront 
                    ceux du lieu de résidence du défendeur.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Article 11 */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <span className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center text-purple-600 dark:text-purple-400 text-sm font-bold">11</span>
              Modifications des CGU
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Actoos se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs 
                seront notifiés par email et via l'application au moins 30 jours avant l'entrée en 
                vigueur des modifications.
              </p>
              <p>
                La poursuite de l'utilisation du service après cette date vaut acceptation des nouvelles conditions.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Contact</h2>
            <p className="text-slate-600 dark:text-slate-300">
              Pour toute question concernant ces conditions :
            </p>
            <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="font-medium text-slate-900 dark:text-white">Actoos - Support</p>
              <p className="text-slate-600 dark:text-slate-400">Email : contact@actoos.com</p>
              <p className="text-slate-600 dark:text-slate-400">Site web : www.actoos.com</p>
            </div>
          </section>

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
            <Link to="/cookies" className="hover:text-blue-600">Politique des cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TermsPage;
