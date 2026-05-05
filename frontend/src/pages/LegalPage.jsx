import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale, Globe, Mail, Server, Shield, Code } from 'lucide-react';
import { Button } from '../components/ui/button';

const LegalPage = () => {
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
            ACTOOS PRO
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl mb-4">
            <Scale className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Mentions Légales
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Dernière mise à jour : {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-8">
          
          {/* Éditeur */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Code className="w-6 h-6 text-green-600" />
              Éditeur du logiciel
            </h2>
            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <p className="text-slate-600 dark:text-slate-300">
                <strong className="text-slate-900 dark:text-white">Actoos</strong> est un logiciel de gestion 
                d'interventions terrain en mode SaaS (Software as a Service).
              </p>
              <div className="mt-4 space-y-2 text-slate-600 dark:text-slate-300">
                <p className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  Site web : <a href="https://www.actoos.com" className="text-blue-600 hover:underline">www.actoos.com</a>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Contact : <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">contact@actoos.com</a>
                </p>
              </div>
            </div>
          </section>

          {/* Hébergement */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Server className="w-6 h-6 text-green-600" />
              Hébergement
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Le logiciel Actoos est hébergé sur des serveurs sécurisés fournis par :
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p><strong className="text-slate-900 dark:text-white">Railway Corporation</strong></p>
                <p className="text-sm mt-1">Infrastructure cloud sécurisée</p>
                <p className="text-sm">Site : <a href="https://railway.app" className="text-blue-600 hover:underline">railway.app</a></p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p><strong className="text-slate-900 dark:text-white">MongoDB Atlas</strong></p>
                <p className="text-sm mt-1">Base de données cloud sécurisée</p>
                <p className="text-sm">Site : <a href="https://www.mongodb.com/atlas" className="text-blue-600 hover:underline">mongodb.com/atlas</a></p>
              </div>
            </div>
          </section>

          {/* Propriété intellectuelle */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Shield className="w-6 h-6 text-green-600" />
              Propriété intellectuelle
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                L'ensemble des éléments composant le logiciel Actoos (textes, graphismes, logiciels, 
                photographies, images, vidéos, sons, plans, logos, marques, créations et œuvres protégeables 
                diverses, bases de données, etc.) ainsi que le logiciel lui-même sont la propriété exclusive 
                d'Actoos ou de ses partenaires.
              </p>
              <p>
                Toute reproduction, représentation, modification, publication, transmission, dénaturation, 
                totale ou partielle du logiciel ou de son contenu, par quelque procédé que ce soit, et sur 
                quelque support que ce soit est interdite sans autorisation écrite préalable.
              </p>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-l-4 border-green-500">
                <p className="font-medium text-slate-900 dark:text-white">
                  © {new Date().getFullYear()} Actoos - Tous droits réservés
                </p>
              </div>
            </div>
          </section>

          {/* Données personnelles */}
          <section>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
              <Shield className="w-6 h-6 text-green-600" />
              Protection des données personnelles
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Actoos s'engage à protéger la vie privée de ses utilisateurs conformément au Règlement 
                Général sur la Protection des Données (RGPD) et aux lois applicables en matière de 
                protection des données personnelles.
              </p>
              <p>
                Pour plus d'informations sur la collecte et le traitement de vos données personnelles, 
                veuillez consulter notre{' '}
                <Link to="/privacy" className="text-blue-600 hover:underline">Politique de confidentialité</Link>.
              </p>
              <p>
                Pour toute question relative à vos données personnelles, vous pouvez nous contacter à :{' '}
                <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">contact@actoos.com</a>
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Cookies
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300">
              <p>
                Le site utilise des cookies pour améliorer l'expérience utilisateur. Pour en savoir plus 
                sur l'utilisation des cookies et gérer vos préférences, consultez notre{' '}
                <Link to="/cookies" className="text-blue-600 hover:underline">Politique des cookies</Link>.
              </p>
            </div>
          </section>

          {/* Liens hypertextes */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Liens hypertextes
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Le logiciel Actoos peut contenir des liens hypertextes vers d'autres sites internet. 
                Actoos n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à 
                leur contenu ou aux pratiques de confidentialité de ces tiers.
              </p>
            </div>
          </section>

          {/* Limitation de responsabilité */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Limitation de responsabilité
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300 space-y-4">
              <p>
                Actoos s'efforce de fournir des informations aussi précises que possible. Toutefois, 
                Actoos ne pourra être tenu responsable des omissions, inexactitudes et carences dans 
                la mise à jour, qu'elles soient de son fait ou du fait des tiers partenaires qui lui 
                fournissent ces informations.
              </p>
              <p>
                Actoos ne saurait être tenu pour responsable des dommages directs ou indirects résultant 
                de l'accès ou de l'utilisation du logiciel, y compris l'inaccessibilité, les pertes de 
                données, détériorations, destructions ou virus qui pourraient affecter l'équipement 
                informatique de l'utilisateur.
              </p>
            </div>
          </section>

          {/* Droit applicable */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Droit applicable
            </h2>
            <div className="mt-4 text-slate-600 dark:text-slate-300">
              <p>
                Les présentes mentions légales sont soumises au droit applicable dans votre pays de 
                résidence. En cas de litige, et après échec de toute tentative de recherche d'une 
                solution amiable, les tribunaux compétents seront ceux du lieu de résidence du défendeur.
              </p>
            </div>
          </section>

          {/* Contact */}
          <section className="pt-6 border-t border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Contact</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Pour toute question concernant ces mentions légales ou le logiciel Actoos :
            </p>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
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
            <Link to="/terms" className="hover:text-blue-600">Conditions d'utilisation</Link>
            <Link to="/cookies" className="hover:text-blue-600">Politique des cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LegalPage;
