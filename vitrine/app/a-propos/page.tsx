'use client';

import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function AboutPage() {
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

      <main className="pt-32 md:pt-40 pb-20 px-6 max-w-4xl mx-auto">

        {/* HERO */}
        <div className="mb-20 max-w-2xl">
          <span className="inline-block text-xs font-medium text-blue-600 mb-3">
            {isEn ? 'About' : 'À propos'}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-5">
            {isEn ? 'We are Actoos.' : 'Nous sommes Actoos.'}
          </h1>
          <p className="text-slate-500 text-base md:text-lg leading-relaxed">
            {isEn
              ? 'A technology group building and operating digital tools for organizations.'
              : 'Un groupe technologique qui construit et opère des outils numériques pour les organisations.'}
          </p>
        </div>

        {/* VALEURS */}
        <section className="mb-20">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-8">
            {isEn ? 'What drives us' : 'Ce qui nous guide'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                title: isEn ? 'Clarity' : 'Clarté',
                desc: isEn
                  ? 'Software should be understandable by the people who use it — not just the people who build it.'
                  : 'Un logiciel doit être compréhensible par ceux qui l\'utilisent — pas seulement par ceux qui le construisent.',
              },
              {
                title: isEn ? 'Durability' : 'Durabilité',
                desc: isEn
                  ? 'We build tools meant to last for years, not for a demo.'
                  : 'Nous construisons des outils faits pour durer des années, pas pour une démo.',
              },
              {
                title: isEn ? 'Honesty' : 'Honnêteté',
                desc: isEn
                  ? 'We say what we can do, and what we can\'t. That\'s part of the job.'
                  : 'Nous disons ce que nous pouvons faire, et ce que nous ne pouvons pas. Cela fait partie du travail.',
              },
              {
                title: isEn ? 'Independence' : 'Indépendance',
                desc: isEn
                  ? 'We fund ourselves, choose our projects, and work at our own pace.'
                  : 'Nous nous autofinançons, choisissons nos projets, et travaillons à notre rythme.',
              },
            ].map((value, i) => (
              <div key={i}>
                <h3 className="font-semibold text-slate-900 mb-2">{value.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HISTOIRE */}
        <section className="mb-20">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-8">
            {isEn ? 'Our story' : 'Notre histoire'}
          </h2>
          <div className="space-y-5 text-slate-600 text-base leading-relaxed max-w-3xl">
            <p>
              {isEn
                ? 'Actoos was founded by a team of engineers who wanted to build tools that actually work — not products designed to impress.'
                : 'Actoos a été fondé par une équipe d\'ingénieurs qui voulait construire des outils qui fonctionnent vraiment — pas des produits faits pour impressionner.'}
            </p>
            <p>
              {isEn
                ? 'We started from a simple observation: too many organizations work with generic software that doesn\'t fit their reality, or with custom tools that break after two years.'
                : 'Nous sommes partis d\'un constat simple : trop d\'organisations travaillent avec des logiciels génériques qui ne correspondent pas à leur réalité, ou avec des outils sur mesure qui cassent au bout de deux ans.'}
            </p>
            <p>
              {isEn
                ? 'Actoos was created to fill that gap — building products that are solid, focused, and built to be used every day.'
                : 'Actoos a été créé pour combler cet écart — en construisant des produits solides, focalisés, faits pour être utilisés tous les jours.'}
            </p>
          </div>
        </section>

        {/* POSITION */}
        <section className="mb-20">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-8">
            {isEn ? 'Our position' : 'Notre position'}
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-2xl">
            {isEn
              ? 'We operate remotely, independently, and with a small team. This lets us move fast without compromising on quality.'
              : 'Nous opérons à distance, en toute indépendance, avec une équipe réduite. Cela nous permet d\'avancer vite sans compromis sur la qualité.'}
          </p>
        </section>

        {/* ÉQUIPE */}
        <section className="mb-20">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-8">
            {isEn ? 'The team' : 'L\'équipe'}
          </h2>
          <p className="text-slate-600 leading-relaxed max-w-2xl mb-6">
            {isEn
              ? 'A small team of engineers, designers and operators. We work lean, and we ship.'
              : 'Une petite équipe d\'ingénieurs, de designers et d\'opérateurs. Nous travaillons de façon légère, et nous livrons.'}
          </p>
          <div className="border border-slate-200 rounded-xl p-6 max-w-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">A</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-slate-900">Équipe Actoos</p>
                <p className="text-xs text-slate-500">
                  {isEn ? 'Founders & operators' : 'Fondateurs & opérateurs'}
                </p>
              </div>
            </div>
            <a
              href="mailto:contact@actoos.com"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              contact@actoos.com
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-slate-200 pt-12">
          <div className="max-w-2xl">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 mb-3">
              {isEn ? 'Want to work with us?' : 'Envie de travailler avec nous ?'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {isEn
                ? 'Tell us about your project. We\'ll get back to you within 24 business hours.'
                : 'Parlez-nous de votre projet. Nous vous répondons sous 24h ouvrées.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="/#projet"
                className="inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                {isEn ? 'Start a project' : 'Démarrer un projet'}
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center bg-white text-slate-900 border border-slate-200 px-5 py-2.5 rounded-full font-medium text-sm hover:bg-slate-50 transition-colors"
              >
                {t[language].navContact}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>{t[language].footerCopy}</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-slate-700 transition-colors">{t[language].footerPrivacy}</a>
            <a href="/legal" className="hover:text-slate-700 transition-colors">{t[language].footerLegal}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}