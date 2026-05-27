import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="pt-20 min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Politique de confidentialité</h1>
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900">Introduction</h2>
          <p className="text-slate-600 leading-relaxed">
            Chez Actoos Jobs, nous prenons la protection de vos données personnelles très au sérieux. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre plateforme.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Données collectées</h2>
          <p className="text-slate-600 leading-relaxed">
            Nous collectons les informations que vous nous fournissez directement, telles que votre nom, adresse e-mail, CV, et toute autre information liée à votre profil candidat ou entreprise.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Utilisation des données</h2>
          <p className="text-slate-600 leading-relaxed">
            Vos données sont utilisées pour vous connecter avec des employeurs ou des candidats, améliorer nos services, et vous envoyer des communications relatives à votre compte ou à nos offres.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Partage des données</h2>
          <p className="text-slate-600 leading-relaxed">
            Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec des recruteurs dans le cadre de votre recherche d'emploi, uniquement avec votre consentement.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Sécurité</h2>
          <p className="text-slate-600 leading-relaxed">
            Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Vos droits</h2>
          <p className="text-slate-600 leading-relaxed">
            Conformément à la réglementation en vigueur, vous disposez d'un droit d'accès, de rectification et de suppression de vos données. Pour exercer ces droits, contactez-nous à l'adresse{' '}
            <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">contact@actoos.com</a>.
          </p>

          <h2 className="text-xl font-semibold text-slate-900">Contact</h2>
          <p className="text-slate-600 leading-relaxed">
            Pour toute question relative à cette politique, veuillez nous écrire à{' '}
            <a href="mailto:contact@actoos.com" className="text-blue-600 hover:underline">contact@actoos.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;