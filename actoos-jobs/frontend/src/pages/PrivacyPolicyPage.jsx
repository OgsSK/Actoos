import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Politique de confidentialité</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">Dernière mise à jour : Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              Chez Actoos Jobs, nous prenons la protection de vos données personnelles très au sérieux. 
              Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons 
              vos informations lorsque vous utilisez notre plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Données collectées</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous collectons les informations que vous nous fournissez directement, telles que votre nom, 
              adresse e-mail, CV, et toute autre information liée à votre profil candidat ou entreprise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Utilisation des données</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos données sont utilisées pour vous connecter avec des employeurs ou des candidats, améliorer 
              nos services, et vous envoyer des communications relatives à votre compte ou à nos offres.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Partage des données</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec des 
              recruteurs dans le cadre de votre recherche d'emploi, uniquement avec votre consentement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Sécurité</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger 
              vos données contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Vos droits</h2>
            <p className="text-slate-600 leading-relaxed">
              Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de rectification 
              et de suppression de vos données. Pour exercer ces droits, contactez-nous à l'adresse{' '}
              <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">
                contact@actoos.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question relative à cette politique, veuillez nous écrire à{' '}
              <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">
                contact@actoos.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;