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

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Conditions Generales d'Utilisation</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">Derniere mise a jour : 26 Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Objet</h2>
            <p className="text-slate-600 leading-relaxed">
              Les presentes Conditions Generales d'Utilisation (CGU) ont pour objet de definir les modalites 
              et conditions d'utilisation des services proposes par Actoos Jobs (ci-apres "la Plateforme"), 
              ainsi que de definir les droits et obligations des parties dans ce cadre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Acceptation des CGU</h2>
            <p className="text-slate-600 leading-relaxed">
              L'utilisation de la Plateforme implique l'acceptation pleine et entiere des presentes CGU. 
              En vous inscrivant sur Actoos Jobs, vous reconnaissez avoir lu, compris et accepte les presentes 
              conditions sans reserve.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Description des services</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Actoos Jobs est une plateforme de mise en relation entre employeurs et candidats au Mali. 
              Les services proposes incluent :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Publication et consultation d'offres d'emploi</li>
              <li>Creation et gestion de profils candidat et entreprise</li>
              <li>Systeme de candidature en ligne</li>
              <li>Outils de gestion des candidatures pour les employeurs</li>
              <li>Alertes emploi personnalisees</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Inscription et compte utilisateur</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour acceder a certains services, l'utilisateur doit creer un compte. Il s'engage a fournir 
              des informations exactes et a les maintenir a jour. L'utilisateur est responsable de la 
              confidentialite de ses identifiants de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Obligations des utilisateurs</h2>
            <p className="text-slate-600 leading-relaxed mb-4">Les utilisateurs s'engagent a :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Ne pas publier de contenu illegal, diffamatoire ou discriminatoire</li>
              <li>Ne pas usurper l'identite d'un tiers</li>
              <li>Ne pas utiliser la Plateforme a des fins frauduleuses</li>
              <li>Respecter les droits de propriete intellectuelle</li>
              <li>Ne pas perturber le fonctionnement de la Plateforme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Propriete intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed">
              Tous les elements de la Plateforme (textes, images, logos, etc.) sont proteges par le droit 
              de la propriete intellectuelle. Toute reproduction ou utilisation non autorisee est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Responsabilite</h2>
            <p className="text-slate-600 leading-relaxed">
              Actoos Jobs ne peut etre tenu responsable du contenu publie par les utilisateurs, ni de 
              l'issue des mises en relation effectuees via la Plateforme. Les utilisateurs restent seuls 
              responsables de leurs interactions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Modification des CGU</h2>
            <p className="text-slate-600 leading-relaxed">
              Actoos Jobs se reserve le droit de modifier les presentes CGU a tout moment. Les utilisateurs 
              seront informes des modifications par email ou notification sur la Plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Droit applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Les presentes CGU sont soumises au droit malien. Tout litige sera soumis aux tribunaux 
              competents de Bamako, Mali.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant les presentes CGU, vous pouvez nous contacter a : 
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
