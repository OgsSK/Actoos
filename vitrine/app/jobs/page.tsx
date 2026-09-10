'use client';

import { ArrowLeft, ArrowRight, Briefcase, Users, Building2, Globe, CreditCard, Code2, GraduationCap, Clock, Calendar, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function JobsPage() {
  const { language, setLanguage } = useLanguage();
  const isEn = language === 'en';

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">

      {/* NAV */}
      <nav className="fixed top-0 w-full bg-white/85 backdrop-blur-md z-40 border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Actoos" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg tracking-tight text-slate-900">Actoos</span>
          </a>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >FR</button>
              <span className="text-slate-300 text-xs">/</span>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-700'}`}
              >EN</button>
            </div>
            <a href="/" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
              <ArrowLeft size={16} />
              <span>{t[language].back}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="pt-32 md:pt-40 pb-16 md:pb-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Briefcase size={24} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-5">
            Actoos Jobs
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed mb-9">
            {isEn
              ? 'The recruitment platform built for flexible work. Students, extras, part-time, one-off assignments — anywhere, in any currency.'
              : 'La plateforme de recrutement pensée pour le travail flexible. Étudiants, extras, temps partiel, missions ponctuelles — partout, dans toutes les devises.'}
          </p>
          <a
            href="https://jobs.actoos.com"
            className="group inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            {isEn ? 'Go to Actoos Jobs' : 'Accéder à Actoos Jobs'}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </header>

      {/* DEUX PUBLICS — séparateur vertical, pas de cadre */}
      <section className="py-16 md:py-20 px-6 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            {/* Candidats */}
            <div className="relative">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <GraduationCap size={16} className="text-blue-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {isEn ? 'For candidates' : 'Pour les candidats'}
                </h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {isEn
                  ? 'Find a job that fits your rhythm. Search by city, category and contract type. One-click applications. Real-time tracking of your applications.'
                  : 'Trouvez un job qui s\'adapte à votre rythme. Recherche par ville, catégorie et type de contrat. Candidature en un clic. Suivi de vos candidatures en temps réel.'}
              </p>
            </div>

            {/* Recruteurs */}
            <div className="relative md:pl-16 md:border-l md:border-slate-200">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Building2 size={16} className="text-emerald-600" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {isEn ? 'For recruiters' : 'Pour les recruteurs'}
                </h3>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                {isEn
                  ? 'Hire fast. Hire right. Post an offer in minutes. Receive structured profiles. Manage your team from a dedicated company space.'
                  : 'Recrutez vite. Recrutez juste. Publiez une offre en quelques minutes. Recevez des profils structurés. Gérez vos équipes depuis un espace entreprise dédié.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPACITÉS PLATEFORME — ligne horizontale + dots (timeline) */}
      <section className="py-16 md:py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-16 max-w-2xl">
            <span className="inline-block text-xs font-medium text-blue-600 mb-3">
              {isEn ? 'Platform' : 'Plateforme'}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">
              {isEn ? 'Built to scale across markets' : 'Conçue pour opérer sur plusieurs marchés'}
            </h2>
            <p className="text-slate-500 text-base leading-relaxed">
              {isEn
                ? 'Actoos Jobs is engineered for organizations that operate internationally, in multiple currencies, with their own rules.'
                : 'Actoos Jobs est conçue pour les organisations qui opèrent à l\'international, dans plusieurs devises, avec leurs propres règles.'}
            </p>
          </div>

          <div className="relative">
            {/* Ligne continue desktop */}
            <div className="hidden md:block absolute top-[5px] left-0 right-0 h-px bg-slate-200" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
              {[
                {
                  title: isEn ? 'Multi-tenant by design' : 'Multi-tenant natif',
                  desc: isEn
                    ? 'Each organization gets its own isolated space. Your data, your rules, your users.'
                    : 'Chaque organisation dispose de son propre espace isolé. Vos données, vos règles, vos utilisateurs.',
                },
                {
                  title: isEn ? 'Multi-currency' : 'Multi-devise',
                  desc: isEn
                    ? 'Post and pay in any currency. EUR, USD, XOF, MAD — without friction.'
                    : 'Publiez et rémunérez dans la devise de votre choix. EUR, USD, XOF, MAD — sans friction.',
                },
                {
                  title: isEn ? 'International by default' : 'Portée internationale',
                  desc: isEn
                    ? 'Built to operate anywhere: Europe, Africa, Middle East. One base, multiple markets.'
                    : 'Une plateforme conçue pour fonctionner partout : Europe, Afrique, Moyen-Orient. Une base, plusieurs marchés.',
                },
                {
                  title: isEn ? 'API-first' : 'API-first',
                  desc: isEn
                    ? 'Integrate Actoos Jobs with your HR tools, ATS or internal systems.'
                    : 'Intégrez Actoos Jobs à vos outils RH, vos ATS ou vos systèmes internes.',
                },
              ].map((cap, i) => (
                <div key={i} className="relative">
                  {/* Dot sur la ligne */}
                  <div className="flex items-center gap-3 md:block mb-4">
                    <div className="w-[11px] h-[11px] rounded-full bg-white border-2 border-slate-900 relative z-10 shrink-0" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 md:mt-4">{cap.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{cap.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CAS D'USAGE — ligne fine, dots, pas de cadre */}
      <section className="py-16 md:py-20 px-6 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-4xl mx-auto">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              {isEn ? 'Use cases' : 'Cas d\'usage'}
            </h2>
            <p className="text-slate-500 text-base">
              {isEn
                ? 'One platform. Many contexts.'
                : 'Une plateforme. Plusieurs contextes.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-8">
            {[
              { label: isEn ? 'Students' : 'Étudiants', desc: isEn ? 'Jobs that fit around classes' : 'Jobs compatibles avec les cours' },
              { label: isEn ? 'Extras' : 'Extras', desc: isEn ? 'Short missions, fast pay' : 'Missions courtes, paiement rapide' },
              { label: isEn ? 'Part-time' : 'Temps partiel', desc: isEn ? 'Recurring contracts, flexible schedules' : 'Contrats récurrents, plannings flexibles' },
              { label: isEn ? 'One-off' : 'Missions ponctuelles', desc: isEn ? 'Events, replacements, activity peaks' : 'Événements, remplacements, pics d\'activité' },
            ].map((uc, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-slate-900 mb-1.5">{uc.label}</p>
                <p className="text-sm text-slate-500 leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 md:py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-6">
            {isEn ? 'Ready to get started?' : 'Prêt à commencer ?'}
          </h2>
          <a
            href="https://jobs.actoos.com"
            className="group inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors"
          >
            {isEn ? 'Go to Actoos Jobs' : 'Accéder à Actoos Jobs'}
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>

      {/* FOOTER SOBRE */}
      <footer className="bg-slate-900 border-t border-slate-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">{t[language].footerCopy}</p>
          <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
            {isEn ? 'Back to home' : 'Retour à l\'accueil'}
          </a>
        </div>
      </footer>
    </div>
  );
}