'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  FileText, ArrowLeft, Mail, MapPin, Building2, AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';

// ⚠️ À METTRE À JOUR quand les CGU changent
const LAST_UPDATE_FR = '15 septembre 2025';
const LAST_UPDATE_EN = 'September 15, 2025';

export default function LegalPage() {
  const { language } = useLanguage();
  const isFr = language === 'fr';

  const lastUpdate = isFr ? LAST_UPDATE_FR : LAST_UPDATE_EN;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ═══════════ HERO ═══════════ */}
      <div className="relative bg-slate-900 text-white overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.7) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.7) 1px, transparent 1px)
            `,
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, black 40%, transparent 100%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(16,185,129,0.25) 0%, rgba(16,185,129,0) 70%)',
          }}
        />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/"
            prefetch
            className="group inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {isFr ? "Retour à l'accueil" : 'Back to home'}
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
              {isFr ? 'Informations légales' : 'Legal information'}
            </p>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            {isFr
              ? 'Mentions légales & CGU'
              : 'Legal notice & Terms'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {isFr
              ? `Informations légales relatives à ${BRAND.name} et conditions générales d'utilisation de la plateforme.`
              : `Legal information about ${BRAND.name} and general terms of use of the platform.`}
          </p>
          <p className="text-xs text-slate-400 mt-4">
            {isFr ? 'Dernière mise à jour :' : 'Last updated:'} {lastUpdate}
          </p>
        </div>
      </div>

      {/* ═══════════ CONTENU ═══════════ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* ═══ SOMMAIRE ═══ */}
          <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {isFr ? 'Sommaire' : 'Table of contents'}
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <li>
                <a href="#editeur" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  1. {isFr ? 'Éditeur du site' : 'Site publisher'}
                </a>
              </li>
              <li>
                <a href="#hebergeur" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  2. {isFr ? 'Hébergeur' : 'Hosting provider'}
                </a>
              </li>
              <li>
                <a href="#propriete" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  3. {isFr ? 'Propriété intellectuelle' : 'Intellectual property'}
                </a>
              </li>
              <li>
                <a href="#cgu" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  4. {isFr ? "Conditions d'utilisation" : 'Terms of use'}
                </a>
              </li>
              <li>
                <a href="#comptes" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  5. {isFr ? 'Comptes utilisateurs' : 'User accounts'}
                </a>
              </li>
              <li>
                <a href="#responsabilite" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  6. {isFr ? 'Responsabilité' : 'Liability'}
                </a>
              </li>
              <li>
                <a href="#resiliation" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  7. {isFr ? 'Suspension & résiliation' : 'Suspension & termination'}
                </a>
              </li>
              <li>
                <a href="#droit" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  8. {isFr ? 'Droit applicable' : 'Applicable law'}
                </a>
              </li>
            </ul>
          </div>

          {/* ═══ CONTENU ═══ */}
          <div className="p-5 sm:p-8 space-y-8 text-sm text-slate-700 leading-relaxed">

            {/* 1. Éditeur */}
            <section id="editeur" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600" />
                1. {isFr ? 'Éditeur du site' : 'Site publisher'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `Le site ${BRAND.name} est édité et exploité par :`
                  : `The ${BRAND.name} website is published and operated by:`}
              </p>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p><strong>{isFr ? 'Nom commercial :' : 'Trade name:'}</strong> {BRAND.name}</p>
                <p><strong>{isFr ? 'Produit de :' : 'Product of:'}</strong> Actoos</p>
                <p><strong>Email :</strong>{' '}
                  <a href="mailto:contact@actoos.com" className="text-emerald-600 hover:text-emerald-700 underline">
                    contact@actoos.com
                  </a>
                </p>
                <p><strong>{isFr ? 'Zone desservie :' : 'Service area:'}</strong> {isFr ? 'International' : 'International'}</p>
              </div>
            </section>

            {/* 2. Hébergeur */}
            <section id="hebergeur" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600" />
                2. {isFr ? 'Hébergeur' : 'Hosting provider'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Le site est hébergé et les données sont stockées auprès des prestataires techniques suivants :'
                  : 'The site is hosted and data is stored with the following technical providers:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>
                  <strong>{isFr ? 'Hébergement de l\'application :' : 'Application hosting:'}</strong> Vercel Inc. — 340 S Lemon Ave #4133, Walnut, CA 91789, USA
                </li>
                <li>
                  <strong>{isFr ? 'Base de données & authentification :' : 'Database & authentication:'}</strong> Supabase Inc. — 970 Toa Payoh North, Singapore
                </li>
                <li>
                  <strong>{isFr ? 'Envoi d\'emails transactionnels :' : 'Transactional emails:'}</strong> Resend — 2261 Market Street #5039, San Francisco, CA 94114, USA
                </li>
              </ul>
            </section>

            {/* 3. Propriété intellectuelle */}
            <section id="propriete" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. {isFr ? 'Propriété intellectuelle' : 'Intellectual property'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `L'ensemble des éléments constituant le site ${BRAND.name} (structure, textes, images, logos, marques, code source, base de données) est la propriété exclusive d'Actoos ou de ses partenaires, et est protégé par les lois relatives à la propriété intellectuelle.`
                  : `All elements constituting the ${BRAND.name} website (structure, texts, images, logos, trademarks, source code, database) are the exclusive property of Actoos or its partners, and are protected by intellectual property laws.`}
              </p>
              <p>
                {isFr
                  ? `Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable d'Actoos.`
                  : `Any reproduction, representation, modification, publication, or adaptation of all or part of the elements of the site, by any means or process whatsoever, is prohibited without the prior written consent of Actoos.`}
              </p>
            </section>

            {/* 4. CGU */}
            <section id="cgu" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                4. {isFr ? "Conditions générales d'utilisation" : 'Terms of use'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `En accédant et en utilisant ${BRAND.name}, vous acceptez sans réserve les présentes conditions générales d'utilisation.`
                  : `By accessing and using ${BRAND.name}, you fully and unreservedly accept these general terms of use.`}
              </p>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Description du service' : 'Description of the service'}
              </h3>
              <p className="mb-3">
                {isFr
                  ? `${BRAND.name} est une plateforme de mise en relation entre parents et enseignants particuliers. La plateforme permet :`
                  : `${BRAND.name} is a platform connecting parents and private teachers. The platform allows:`}
              </p>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'aux parents de rechercher des enseignants et d\'envoyer des demandes de cours ;' : 'parents to search for teachers and send lesson requests;'}</li>
                <li>{isFr ? 'aux enseignants de créer un profil et de répondre aux demandes reçues ;' : 'teachers to create a profile and respond to requests received;'}</li>
                <li>{isFr ? 'aux deux parties d\'échanger et de s\'organiser directement ;' : 'both parties to communicate and organize directly;'}</li>
                <li>{isFr ? 'de laisser des avis après un cours terminé.' : 'leaving reviews after a completed lesson.'}</li>
              </ul>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Obligations des utilisateurs' : 'User obligations'}
              </h3>
              <p className="mb-3">
                {isFr ? 'Vous vous engagez à :' : 'You agree to:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'fournir des informations exactes et à jour lors de votre inscription ;' : 'provide accurate and up-to-date information during registration;'}</li>
                <li>{isFr ? 'ne pas usurper l\'identité d\'un tiers ni créer de faux profils ;' : 'not impersonate a third party or create fake profiles;'}</li>
                <li>{isFr ? 'respecter les autres utilisateurs et adopter un comportement courtois ;' : 'respect other users and behave courteously;'}</li>
                <li>{isFr ? 'ne pas utiliser la plateforme à des fins illégales, frauduleuses ou commerciales non autorisées ;' : 'not use the platform for illegal, fraudulent, or unauthorized commercial purposes;'}</li>
                <li>{isFr ? 'ne pas publier de contenu haineux, diffamatoire, ou contraire à l\'ordre public.' : 'not publish hateful, defamatory content, or content contrary to public order.'}</li>
              </ul>
            </section>

            {/* 5. Comptes */}
            <section id="comptes" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                5. {isFr ? 'Comptes utilisateurs' : 'User accounts'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `La création d'un compte ${BRAND.name} est gratuite et se fait via l'identifiant unique Actoos ID. Vous êtes responsable de la confidentialité de vos identifiants et de toutes les actions effectuées depuis votre compte.`
                  : `Creating a ${BRAND.name} account is free and uses the unique Actoos ID. You are responsible for the confidentiality of your credentials and for all actions taken from your account.`}
              </p>
              <p>
                {isFr
                  ? `Un même utilisateur peut cumuler les rôles de parent et d'enseignant sur son compte. La suppression d'un rôle n'entraîne pas la suppression du compte Actoos ID.`
                  : `A single user can hold both parent and teacher roles on their account. Deleting a role does not delete the Actoos ID account.`}
              </p>
            </section>

            {/* 6. Responsabilité */}
            <section id="responsabilite" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-emerald-600" />
                6. {isFr ? 'Responsabilité' : 'Liability'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `${BRAND.name} agit en tant qu'intermédiaire technique. La plateforme ne participe pas aux échanges entre parents et enseignants et ne saurait être tenue responsable :`
                  : `${BRAND.name} acts as a technical intermediary. The platform does not participate in the exchanges between parents and teachers and cannot be held liable for:`}
              </p>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'de la qualité, du contenu ou du déroulement des cours ;' : 'the quality, content, or conduct of lessons;'}</li>
                <li>{isFr ? 'du comportement des utilisateurs en dehors de la plateforme ;' : 'users\' behavior outside the platform;'}</li>
                <li>{isFr ? 'des éventuels litiges, impayés ou préjudices résultant d\'une mise en relation.' : 'any disputes, unpaid fees, or damages resulting from a connection.'}</li>
              </ul>
              <p>
                {isFr
                  ? `L'utilisateur est seul responsable de la véracité des informations qu'il publie et de la bonne exécution des accords qu'il conclut avec d'autres utilisateurs.`
                  : `The user is solely responsible for the accuracy of the information they publish and for the proper performance of agreements they enter into with other users.`}
              </p>
            </section>

            {/* 7. Suspension */}
            <section id="resiliation" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-emerald-600" />
                7. {isFr ? 'Suspension & résiliation' : 'Suspension & termination'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `Nous nous réservons le droit de suspendre ou de résilier tout compte qui violerait les présentes CGU, sans préavis ni indemnité. En cas de manquement grave (faux profil, harcèlement, spam, fraude), le compte peut être suspendu immédiatement.`
                  : `We reserve the right to suspend or terminate any account that violates these Terms, without notice or compensation. In case of serious breach (fake profile, harassment, spam, fraud), the account may be suspended immediately.`}
              </p>
              <p>
                {isFr
                  ? `L'utilisateur peut à tout moment supprimer ses profils (parent ou enseignant) depuis son tableau de bord. Pour supprimer complètement son compte Actoos ID, il doit contacter le support.`
                  : `The user can at any time delete their profiles (parent or teacher) from their dashboard. To completely delete their Actoos ID account, they must contact support.`}
              </p>
            </section>

            {/* 8. Droit applicable */}
            <section id="droit" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                8. {isFr ? 'Droit applicable' : 'Applicable law'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `Les présentes conditions générales d'utilisation sont régies par le droit applicable au siège social de l'éditeur. En cas de litige, les tribunaux compétents seront seuls saisis.`
                  : `These general terms of use are governed by the law applicable at the publisher's registered office. In case of dispute, the competent courts shall have exclusive jurisdiction.`}
              </p>
              <p>
                {isFr
                  ? `En cas de divergence d'interprétation entre la version française et une éventuelle traduction, la version française fait foi.`
                  : `In case of divergence of interpretation between the French version and any translation, the French version shall prevail.`}
              </p>
            </section>
          </div>

          {/* ═══ CONTACT ═══ */}
          <div className="border-t border-slate-100 bg-slate-50 p-5 sm:p-8">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 mb-1">
                  {isFr ? 'Une question sur nos CGU ?' : 'A question about our Terms?'}
                </p>
                <p className="text-sm text-slate-600 mb-3">
                  {isFr
                    ? 'Contactez-nous par email, nous vous répondrons dans les plus brefs délais.'
                    : 'Contact us by email, we will get back to you as soon as possible.'}
                </p>
                <a
                  href="mailto:contact@actoos.com"
                  className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  contact@actoos.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Liens vers privacy */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {isFr ? 'Voir aussi :' : 'See also:'}{' '}
          <Link href="/privacy" prefetch className="text-emerald-600 hover:text-emerald-700 font-medium">
            {isFr ? 'Politique de confidentialité' : 'Privacy policy'}
          </Link>
        </div>
      </div>
    </div>
  );
}