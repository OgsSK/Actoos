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

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Politique de Confidentialite</h1>
        
        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">
          <p className="text-sm text-slate-500">Derniere mise a jour : 26 Mai 2026</p>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">1. Introduction</h2>
            <p className="text-slate-600 leading-relaxed">
              Actoos Jobs s'engage a proteger la vie privee de ses utilisateurs. Cette politique de 
              confidentialite explique comment nous collectons, utilisons et protegeons vos donnees 
              personnelles conformement a la legislation malienne et aux meilleures pratiques internationales.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">2. Donnees collectees</h2>
            <p className="text-slate-600 leading-relaxed mb-4">Nous collectons les types de donnees suivants :</p>
            
            <h3 className="font-medium text-slate-900 mt-4 mb-2">Donnees d'identification</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
              <li>Nom et prenom</li>
              <li>Adresse email</li>
              <li>Numero de telephone</li>
              <li>Photo de profil (optionnel)</li>
            </ul>

            <h3 className="font-medium text-slate-900 mt-4 mb-2">Donnees professionnelles</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
              <li>CV et lettres de motivation</li>
              <li>Experiences professionnelles</li>
              <li>Formations et diplomes</li>
              <li>Competences</li>
            </ul>

            <h3 className="font-medium text-slate-900 mt-4 mb-2">Donnees techniques</h3>
            <ul className="list-disc list-inside text-slate-600 space-y-1 ml-4">
              <li>Adresse IP</li>
              <li>Type de navigateur</li>
              <li>Donnees de navigation</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">3. Utilisation des donnees</h2>
            <p className="text-slate-600 leading-relaxed mb-4">Vos donnees sont utilisees pour :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Gerer votre compte et vos candidatures</li>
              <li>Mettre en relation candidats et employeurs</li>
              <li>Personnaliser votre experience sur la Plateforme</li>
              <li>Vous envoyer des alertes emploi pertinentes</li>
              <li>Ameliorer nos services</li>
              <li>Respecter nos obligations legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">4. Partage des donnees</h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              Vos donnees peuvent etre partagees avec :
            </p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li>Les employeurs lorsque vous postulez a une offre</li>
              <li>Nos prestataires techniques (hebergement, analytics)</li>
              <li>Les autorites competentes si requis par la loi</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Nous ne vendons jamais vos donnees personnelles a des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">5. Conservation des donnees</h2>
            <p className="text-slate-600 leading-relaxed">
              Vos donnees sont conservees pendant la duree de votre inscription sur la Plateforme, 
              plus une periode de 3 ans apres la suppression de votre compte, sauf obligation legale 
              de conservation plus longue.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">6. Securite des donnees</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous mettons en oeuvre des mesures de securite appropriees pour proteger vos donnees : 
              chiffrement des communications (SSL/TLS), stockage securise, acces restreint aux donnees.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">7. Vos droits</h2>
            <p className="text-slate-600 leading-relaxed mb-4">Vous disposez des droits suivants :</p>
            <ul className="list-disc list-inside text-slate-600 space-y-2 ml-4">
              <li><strong>Droit d'acces</strong> : obtenir une copie de vos donnees</li>
              <li><strong>Droit de rectification</strong> : corriger vos donnees inexactes</li>
              <li><strong>Droit a l'effacement</strong> : demander la suppression de vos donnees</li>
              <li><strong>Droit a la portabilite</strong> : recevoir vos donnees dans un format structure</li>
              <li><strong>Droit d'opposition</strong> : vous opposer a certains traitements</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-4">
              Pour exercer ces droits, contactez-nous a : 
              <a href="mailto:privacy@actoos.com" className="text-blue-600 hover:underline ml-1">
                privacy@actoos.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">8. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous utilisons des cookies pour ameliorer votre experience. Consultez notre 
              <Link to="/cookies" className="text-blue-600 hover:underline mx-1">
                Politique de Cookies
              </Link>
              pour plus d'informations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">9. Modifications</h2>
            <p className="text-slate-600 leading-relaxed">
              Nous pouvons modifier cette politique a tout moment. Les modifications seront publiees 
              sur cette page avec une nouvelle date de mise a jour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question concernant cette politique, contactez notre Delegue a la Protection 
              des Donnees a : 
              <a href="mailto:privacy@actoos.com" className="text-blue-600 hover:underline ml-1">
                privacy@actoos.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
