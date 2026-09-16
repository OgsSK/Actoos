'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import {
  ShieldCheck, ArrowLeft, Mail, Lock, Eye, Database, UserCheck,
  Cookie, FileText,
} from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';
import { BRAND } from '@/lib/constants';

// ⚠️ À METTRE À JOUR quand la politique change
const LAST_UPDATE_FR = '15 septembre 2025';
const LAST_UPDATE_EN = 'September 15, 2025';

export default function PrivacyPage() {
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
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-medium">
              {isFr ? 'Vos données' : 'Your data'}
            </p>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            {isFr ? 'Politique de confidentialité' : 'Privacy policy'}
          </h1>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            {isFr
              ? `Comment ${BRAND.name} collecte, utilise et protège vos données personnelles.`
              : `How ${BRAND.name} collects, uses, and protects your personal data.`}
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
                <a href="#intro" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  1. {isFr ? 'Introduction' : 'Introduction'}
                </a>
              </li>
              <li>
                <a href="#donnees" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  2. {isFr ? 'Données collectées' : 'Data collected'}
                </a>
              </li>
              <li>
                <a href="#finalites" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  3. {isFr ? 'Finalités' : 'Purposes'}
                </a>
              </li>
              <li>
                <a href="#partage" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  4. {isFr ? 'Partage des données' : 'Data sharing'}
                </a>
              </li>
              <li>
                <a href="#conservation" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  5. {isFr ? 'Durée de conservation' : 'Retention period'}
                </a>
              </li>
              <li>
                <a href="#securite" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  6. {isFr ? 'Sécurité' : 'Security'}
                </a>
              </li>
              <li>
                <a href="#droits" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  7. {isFr ? 'Vos droits' : 'Your rights'}
                </a>
              </li>
              <li>
                <a href="#cookies" className="text-emerald-600 hover:text-emerald-700 transition-colors">
                  8. {isFr ? 'Cookies' : 'Cookies'}
                </a>
              </li>
            </ul>
          </div>

          {/* ═══ CONTENU ═══ */}
          <div className="p-5 sm:p-8 space-y-8 text-sm text-slate-700 leading-relaxed">

            {/* 1. Intro */}
            <section id="intro" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                1. {isFr ? 'Introduction' : 'Introduction'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `La présente politique décrit la manière dont ${BRAND.name} (produit d'Actoos) traite vos données personnelles lorsque vous utilisez notre plateforme.`
                  : `This policy describes how ${BRAND.name} (an Actoos product) processes your personal data when you use our platform.`}
              </p>
              <p>
                {isFr
                  ? `Nous nous engageons à respecter votre vie privée et à ne collecter que les données strictement nécessaires au bon fonctionnement du service.`
                  : `We are committed to respecting your privacy and collecting only the data strictly necessary for the proper functioning of the service.`}
              </p>
            </section>

            {/* 2. Données */}
            <section id="donnees" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                2. {isFr ? 'Données collectées' : 'Data collected'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Nous collectons les catégories de données suivantes :'
                  : 'We collect the following categories of data:'}
              </p>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Données de compte' : 'Account data'}
              </h3>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'Nom, prénom, adresse email ;' : 'First name, last name, email address;'}</li>
                <li>{isFr ? 'Mot de passe (stocké chiffré) ;' : 'Password (stored encrypted);'}</li>
                <li>{isFr ? 'Langue préférée.' : 'Preferred language.'}</li>
              </ul>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Profil enseignant' : 'Teacher profile'}
              </h3>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'Titre, bio, matières enseignées, niveaux, tarifs ;' : 'Headline, bio, subjects taught, levels, rates;'}</li>
                <li>{isFr ? 'Photo de profil et photo de couverture (optionnel) ;' : 'Profile picture and cover image (optional);'}</li>
                <li>{isFr ? 'Ville, langues parlées, expérience, diplômes ;' : 'City, languages spoken, experience, diplomas;'}</li>
                <li>{isFr ? 'Coordonnées de contact (téléphone, WhatsApp, email) — visibles uniquement après acceptation d\'une demande de cours.' : 'Contact details (phone, WhatsApp, email) — visible only after accepting a lesson request.'}</li>
              </ul>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Profil parent' : 'Parent profile'}
              </h3>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'Ville, présentation, photo de profil (optionnel) ;' : 'City, presentation, profile picture (optional);'}</li>
                <li>{isFr ? 'Informations sur les enfants : prénom, date de naissance, niveau scolaire, école (optionnel) ;' : 'Information about children: first name, birth date, school level, school name (optional);'}</li>
                <li>{isFr ? 'Coordonnées de contact (téléphone, email) — visibles uniquement par les enseignants dont vous avez accepté la demande.' : 'Contact details (phone, email) — visible only to teachers whose request you have accepted.'}</li>
              </ul>

              <h3 className="font-semibold text-slate-900 mt-4 mb-2">
                {isFr ? 'Données d\'usage' : 'Usage data'}
              </h3>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'Demandes de cours envoyées ou reçues, avis publiés ;' : 'Lesson requests sent or received, published reviews;'}</li>
                <li>{isFr ? 'Profs sauvegardés en favoris ;' : 'Teachers saved as favorites;'}</li>
                <li>{isFr ? 'Signalements effectués (données de modération).' : 'Reports made (moderation data).'}</li>
              </ul>
            </section>

            {/* 3. Finalités */}
            <section id="finalites" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-600" />
                3. {isFr ? 'Finalités du traitement' : 'Purposes of processing'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Vos données sont utilisées pour :'
                  : 'Your data is used to:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'créer et gérer votre compte utilisateur ;' : 'create and manage your user account;'}</li>
                <li>{isFr ? 'mettre en relation parents et enseignants ;' : 'connect parents and teachers;'}</li>
                <li>{isFr ? 'envoyer des emails transactionnels (bienvenue, demande reçue, validation de profil, etc.) ;' : 'send transactional emails (welcome, request received, profile validation, etc.);'}</li>
                <li>{isFr ? 'assurer la modération et la sécurité de la plateforme ;' : 'ensure moderation and platform security;'}</li>
                <li>{isFr ? 'améliorer nos services et l\'expérience utilisateur.' : 'improve our services and user experience.'}</li>
              </ul>
            </section>

            {/* 4. Partage */}
            <section id="partage" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                4. {isFr ? 'Partage des données' : 'Data sharing'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées uniquement avec :`
                  : `We never sell your personal data. It may be shared only with:`}
              </p>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li>{isFr ? 'les autres utilisateurs, dans le cadre strict du service (ex : coordonnées visibles après acceptation d\'une demande) ;' : 'other users, strictly within the scope of the service (e.g., contact details visible after accepting a request);'}</li>
                <li>{isFr ? 'nos prestataires techniques (Supabase pour la base de données et l\'authentification, Resend pour les emails, Vercel pour l\'hébergement) ;' : 'our technical providers (Supabase for database and authentication, Resend for emails, Vercel for hosting);'}</li>
                <li>{isFr ? 'les autorités compétentes, en cas d\'obligation légale.' : 'competent authorities, in case of legal obligation.'}</li>
              </ul>
              <p>
                {isFr
                  ? `Nous veillons à ce que nos prestataires offrent des garanties suffisantes en matière de protection des données.`
                  : `We ensure that our providers offer sufficient data protection guarantees.`}
              </p>
            </section>

            {/* 5. Conservation */}
            <section id="conservation" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                5. {isFr ? 'Durée de conservation' : 'Retention period'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Vos données sont conservées tant que votre compte est actif. En cas de suppression :'
                  : 'Your data is retained as long as your account is active. Upon deletion:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'Les données de profil sont supprimées immédiatement ;' : 'Profile data is deleted immediately;'}</li>
                <li>{isFr ? 'Les données de modération (signalements) peuvent être conservées jusqu\'à 1 an pour des raisons de sécurité ;' : 'Moderation data (reports) may be retained up to 1 year for security reasons;'}</li>
                <li>{isFr ? 'Les données de facturation (le cas échéant) sont conservées 10 ans conformément aux obligations légales.' : 'Billing data (if applicable) is retained for 10 years in accordance with legal obligations.'}</li>
              </ul>
            </section>

            {/* 6. Sécurité */}
            <section id="securite" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-600" />
                6. {isFr ? 'Sécurité' : 'Security'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :'
                  : 'We implement appropriate technical and organizational measures to protect your data:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'Chiffrement HTTPS de toutes les communications ;' : 'HTTPS encryption of all communications;'}</li>
                <li>{isFr ? 'Mots de passe stockés hachés (bcrypt) ;' : 'Passwords stored hashed (bcrypt);'}</li>
                <li>{isFr ? 'Contrôle d\'accès strict (Row Level Security) sur la base de données ;' : 'Strict access control (Row Level Security) on the database;'}</li>
                <li>{isFr ? 'Audits réguliers et surveillance des accès.' : 'Regular audits and access monitoring.'}</li>
              </ul>
            </section>

            {/* 7. Droits */}
            <section id="droits" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                7. {isFr ? 'Vos droits' : 'Your rights'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? 'Conformément à la réglementation en vigueur, vous disposez des droits suivants :'
                  : 'In accordance with applicable regulations, you have the following rights:'}
              </p>
              <ul className="list-disc pl-6 space-y-1.5 mb-3">
                <li><strong>{isFr ? 'Droit d\'accès :' : 'Right of access:'}</strong> {isFr ? 'consulter les données que nous détenons sur vous ;' : 'view the data we hold about you;'}</li>
                <li><strong>{isFr ? 'Droit de rectification :' : 'Right to rectification:'}</strong> {isFr ? 'corriger toute information inexacte ;' : 'correct any inaccurate information;'}</li>
                <li><strong>{isFr ? 'Droit à l\'effacement :' : 'Right to erasure:'}</strong> {isFr ? 'supprimer votre compte et vos données ;' : 'delete your account and data;'}</li>
                <li><strong>{isFr ? 'Droit à la portabilité :' : 'Right to portability:'}</strong> {isFr ? 'recevoir une copie de vos données dans un format lisible ;' : 'receive a copy of your data in a readable format;'}</li>
                <li><strong>{isFr ? 'Droit d\'opposition :' : 'Right to object:'}</strong> {isFr ? 'vous opposer à certains traitements.' : 'object to certain processing.'}</li>
              </ul>
              <p>
                {isFr
                  ? `Pour exercer ces droits, contactez-nous à `
                  : `To exercise these rights, contact us at `}
                <a href="mailto:contact@actoos.com" className="text-emerald-600 hover:text-emerald-700 underline">
                  contact@actoos.com
                </a>
                {isFr
                  ? `. Nous vous répondrons sous 30 jours.`
                  : `. We will respond within 30 days.`}
              </p>
            </section>

            {/* 8. Cookies */}
            <section id="cookies" className="scroll-mt-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <Cookie className="w-4 h-4 text-emerald-600" />
                8. {isFr ? 'Cookies & stockage local' : 'Cookies & local storage'}
              </h2>
              <p className="mb-3">
                {isFr
                  ? `${BRAND.name} utilise uniquement des cookies et un stockage local strictement nécessaires au fonctionnement de la plateforme :`
                  : `${BRAND.name} uses only cookies and local storage strictly necessary for the platform to function:`}
              </p>
              <ul className="list-disc pl-6 space-y-1.5">
                <li>{isFr ? 'Session d\'authentification (cookie Supabase) ;' : 'Authentication session (Supabase cookie);'}</li>
                <li>{isFr ? 'Préférence de langue (localStorage) ;' : 'Language preference (localStorage);'}</li>
                <li>{isFr ? 'Rôle actif (localStorage).' : 'Active role (localStorage).'}</li>
              </ul>
              <p className="mt-3">
                {isFr
                  ? 'Aucun cookie publicitaire ou de traçage tiers n\'est utilisé.'
                  : 'No advertising or third-party tracking cookies are used.'}
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
                  {isFr ? 'Une question sur vos données ?' : 'A question about your data?'}
                </p>
                <p className="text-sm text-slate-600 mb-3">
                  {isFr
                    ? 'Notre équipe est disponible pour répondre à toutes vos questions.'
                    : 'Our team is available to answer all your questions.'}
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

        {/* Liens vers legal */}
        <div className="mt-6 text-center text-sm text-slate-500">
          {isFr ? 'Voir aussi :' : 'See also:'}{' '}
          <Link href="/legal" prefetch className="text-emerald-600 hover:text-emerald-700 font-medium">
            {isFr ? 'Mentions légales & CGU' : 'Legal notice & Terms'}
          </Link>
        </div>
      </div>
    </div>
  );
}