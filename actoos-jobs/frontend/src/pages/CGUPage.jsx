import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

const CGUPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-8">
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Link>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Conditions Générales d'Utilisation</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">Dernière mise à jour : Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Objet</h2>
            <p className="text-slate-600 leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) ont pour objet de définir les modalités 
              et conditions d'utilisation des services proposés par Actoos Jobs (ci-après "la Plateforme"), 
              ainsi que de définir les droits et obligations des parties dans ce cadre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Acceptation des CGU</h2>
            <p className="text-slate-600 leading-relaxed">
              L'utilisation de la Plateforme implique l'acceptation pleine et entière des présentes CGU. 
              En vous inscrivant sur Actoos Jobs, vous reconnaissez avoir lu, compris et accepté les présentes 
              conditions sans réserve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Description des services</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Actoos Jobs est une plateforme internationale de mise en relation entre employeurs et candidats. 
              Les services proposés incluent :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Publication et consultation d'offres d'emploi</li>
              <li>Création et gestion de profils candidat et entreprise</li>
              <li>Système de candidature en ligne</li>
              <li>Outils de gestion des candidatures pour les employeurs</li>
              <li>Alertes emploi personnalisées</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Inscription et compte utilisateur</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour accéder à certains services, l'utilisateur doit créer un compte. Il s'engage à fournir 
              des informations exactes et à les maintenir à jour. L'utilisateur est responsable de la 
              confidentialité de ses identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Obligations des utilisateurs</h2>
            <p className="text-slate-600 leading-relaxed mb-4">Les utilisateurs s'engagent à :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Ne pas publier de contenu illégal, diffamatoire ou discriminatoire</li>
              <li>Ne pas usurper l'identité d'un tiers</li>
              <li>Ne pas utiliser la Plateforme à des fins frauduleuses</li>
              <li>Respecter les droits de propriété intellectuelle</li>
              <li>Ne pas perturber le fonctionnement de la Plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Propriété intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed">
              Tous les éléments de la Plateforme (textes, images, logos, etc.) sont protégés par le droit 
              de la propriété intellectuelle. Toute reproduction ou utilisation non autorisée est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Responsabilité</h2>
            <p className="text-slate-600 leading-relaxed">
              Actoos Jobs ne peut être tenu responsable du contenu publié par les utilisateurs, ni de 
              l'issue des mises en relation effectuées via la Plateforme. Les utilisateurs restent seuls 
              responsables de leurs interactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Modification des CGU</h2>
            <p className="text-slate-600 leading-relaxed">
              Actoos Jobs se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs 
              seront informés des modifications par email ou notification sur la Plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Droit applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Les présentes CGU sont soumises au droit en vigueur. Tout litige sera soumis aux tribunaux 
              compétents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant les présentes CGU, vous pouvez nous contacter à : 
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

export default CGUPage;