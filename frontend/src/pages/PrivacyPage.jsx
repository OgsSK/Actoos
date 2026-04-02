import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Database, Mail, Globe, Clock, Users, FileText } from 'lucide-react';
import { Button } from '../components/ui/button';

const PrivacyPage = () => {
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
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl mb-4">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Politique de Confidentialité
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-8">
            
            {/* Introduction */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <FileText className="w-6 h-6 text-blue-600" />
                Introduction
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
                Chez Actoos, nous accordons une importance capitale à la protection de vos données personnelles. 
                Cette politique de confidentialité explique comment nous collectons, utilisons, stockons et 
                protégeons vos informations lorsque vous utilisez notre plateforme de gestion d'interventions terrain.
              </p>
              <p className="text-slate-600 dark:text-slate-300 mt-4 leading-relaxed">
                Actoos est un logiciel de gestion d'interventions terrain conforme au Règlement Général 
                sur la Protection des Données (RGPD) et aux réglementations internationales en matière 
                de protection de la vie privée.
              </p>
            </section>

            {/* Data collected */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Database className="w-6 h-6 text-blue-600" />
                Données collectées
              </h2>
              <div className="mt-4 space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Données d'identification</h3>
                  <ul className="mt-2 text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                    <li>Nom et prénom</li>
                    <li>Adresse email professionnelle</li>
                    <li>Numéro de téléphone</li>
                    <li>Nom de l'entreprise et numéro de TVA</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Données d'utilisation</h3>
                  <ul className="mt-2 text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                    <li>Interventions et rapports créés</li>
                    <li>Photos et documents téléchargés</li>
                    <li>Données de géolocalisation (avec votre consentement)</li>
                    <li>Historique de connexion et logs d'activité</li>
                  </ul>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Données de paiement</h3>
                  <ul className="mt-2 text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                    <li>Informations de facturation</li>
                    <li>Historique des transactions (via Stripe)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Purpose */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Eye className="w-6 h-6 text-blue-600" />
                Finalités du traitement
              </h2>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {[
                  { title: "Fourniture du service", desc: "Permettre la gestion de vos interventions, devis et factures" },
                  { title: "Communication", desc: "Vous envoyer des notifications, rappels et informations importantes" },
                  { title: "Facturation", desc: "Gérer votre abonnement et traiter les paiements" },
                  { title: "Amélioration", desc: "Analyser l'utilisation pour améliorer nos services" },
                  { title: "Support", desc: "Répondre à vos demandes d'assistance" },
                  { title: "Obligations légales", desc: "Respecter nos obligations comptables et fiscales" }
                ].map((item, i) => (
                  <div key={i} className="p-4 border border-slate-200 dark:border-slate-600 rounded-lg">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Data retention */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Clock className="w-6 h-6 text-blue-600" />
                Durée de conservation
              </h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-900 dark:text-white">Type de données</th>
                      <th className="text-left py-3 px-4 text-slate-900 dark:text-white">Durée</th>
                      <th className="text-left py-3 px-4 text-slate-900 dark:text-white">Base légale</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 dark:text-slate-300">
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4">Données de compte</td>
                      <td className="py-3 px-4">Durée du contrat + 3 ans</td>
                      <td className="py-3 px-4">Contrat</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4">Factures</td>
                      <td className="py-3 px-4">10 ans</td>
                      <td className="py-3 px-4">Obligation légale</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4">Devis</td>
                      <td className="py-3 px-4">5 ans</td>
                      <td className="py-3 px-4">Obligation légale</td>
                    </tr>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-3 px-4">Photos d'intervention</td>
                      <td className="py-3 px-4">Configurable (24 mois par défaut)</td>
                      <td className="py-3 px-4">Intérêt légitime</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-4">Logs de connexion</td>
                      <td className="py-3 px-4">12 mois</td>
                      <td className="py-3 px-4">Sécurité</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Rights */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Users className="w-6 h-6 text-blue-600" />
                Vos droits
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-4">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <div className="mt-4 grid md:grid-cols-2 gap-3">
                {[
                  { title: "Droit d'accès", desc: "Obtenir une copie de vos données" },
                  { title: "Droit de rectification", desc: "Corriger vos données inexactes" },
                  { title: "Droit à l'effacement", desc: "Demander la suppression de vos données" },
                  { title: "Droit à la portabilité", desc: "Recevoir vos données dans un format structuré" },
                  { title: "Droit d'opposition", desc: "Vous opposer au traitement de vos données" },
                  { title: "Droit à la limitation", desc: "Limiter le traitement de vos données" }
                ].map((right, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                    <div>
                      <span className="font-medium text-slate-900 dark:text-white">{right.title}</span>
                      <span className="text-slate-600 dark:text-slate-400"> - {right.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Security */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Lock className="w-6 h-6 text-blue-600" />
                Sécurité des données
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-4">
                Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles appropriées :
              </p>
              <ul className="mt-4 text-slate-600 dark:text-slate-300 space-y-2">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Chiffrement SSL/TLS pour toutes les communications
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Mots de passe hashés avec bcrypt
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Hébergement sécurisé avec sauvegardes régulières
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Accès restreint aux données sur base du besoin
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Audits de sécurité réguliers
                </li>
              </ul>
            </section>

            {/* Contact */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
                <Mail className="w-6 h-6 text-blue-600" />
                Contact
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mt-4">
                Pour exercer vos droits ou pour toute question concernant cette politique :
              </p>
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-white">Actoos - Protection des Données</p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Email : contact@actoos.com</p>
                <p className="text-slate-600 dark:text-slate-400">Site web : www.actoos.com</p>
              </div>
              <p className="text-slate-600 dark:text-slate-300 mt-4">
                Vous avez également le droit d'introduire une réclamation auprès de l'autorité de protection 
                des données compétente de votre pays si vous estimez que le traitement de vos données 
                n'est pas conforme à la réglementation applicable.
              </p>
            </section>

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
            <Link to="/terms" className="hover:text-blue-600">Conditions d'utilisation</Link>
            <Link to="/cookies" className="hover:text-blue-600">Politique des cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPage;
