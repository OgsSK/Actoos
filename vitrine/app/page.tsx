'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowRight, Menu, X, Briefcase } from 'lucide-react';
import SimpleProjectForm from './components/SimpleProjectForm';
import FadeInSection from './components/FadeInSection';
import { useLanguage } from './context/LanguageContext';
import { t } from '../lib/translations';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();
  const isEn = language === 'en';

  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">

      {/* ========== NAVIGATION ========== */}
      <nav className="fixed top-0 w-full bg-white/85 backdrop-blur-md z-40 border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/logo-icon.png" alt="Actoos" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg tracking-tight text-slate-900">Actoos</span>
          </a>

          <div className="hidden md:flex items-center gap-7 text-sm text-slate-600">
            <a href="/jobs" className="hover:text-slate-900 transition-colors">{t[language].navProducts}</a>
            <a href="/a-propos" className="hover:text-slate-900 transition-colors">{t[language].navAbout}</a>
            <a href="/contact" className="hover:text-slate-900 transition-colors">{t[language].navContact}</a>

            <div className="flex items-center gap-0.5 pl-4 border-l border-slate-200">
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

            <a href="#projet" className="px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">
              {t[language].heroButtonStudio}
            </a>
          </div>

          <button className="md:hidden p-2 text-slate-700" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
        </div>
      </nav>

      {/* ========== MOBILE DRAWER ========== */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-white shadow-xl transform transition-transform duration-300 ease-in-out md:hidden ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <span className="font-semibold text-slate-900">Menu</span>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 -mr-2 text-slate-500"><X size={22} /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-1">
            <div className="flex items-center gap-1 mb-5 pb-5 border-b border-slate-100">
              <button
                onClick={() => { setLanguage('fr'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${language === 'fr' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
              >Français</button>
              <button
                onClick={() => { setLanguage('en'); setMobileMenuOpen(false); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${language === 'en' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 hover:bg-slate-50'}`}
              >English</button>
            </div>
            {[
              { href: '/jobs', label: t[language].navProducts },
              { href: '/a-propos', label: t[language].navAbout },
              { href: '/contact', label: t[language].navContact },
              { href: '#projet', label: t[language].heroButtonStudio },
            ].map((item) => (
              <a key={item.href} href={item.href} className="block text-sm font-medium text-slate-700 hover:text-slate-900 py-3 border-b border-slate-50" onClick={() => setMobileMenuOpen(false)}>
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ========== 1. HERO ========== */}
      <FadeInSection>
        <header className="pt-32 md:pt-40 pb-16 md:pb-24 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-6 text-slate-900">
              {t[language].heroTitle}
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed mb-9">
              {t[language].heroDescription}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#projet" className="group inline-flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-800 transition-colors">
                {t[language].heroButtonStudio}
                <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
              </a>
              <a href="/jobs" className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-50 transition-colors">
                {t[language].heroButtonJobs}
              </a>
            </div>
          </div>
        </header>
      </FadeInSection>

      {/* ========== 2. CE QUE NOUS FAISONS ========== */}
      <FadeInSection>
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-12 max-w-2xl">
              <span className="inline-block text-xs font-medium text-blue-600 mb-3">
                {isEn ? 'What we do' : 'Ce que nous faisons'}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">
                {isEn
                  ? 'Tools that work. Systems that hold.'
                  : 'Des outils qui fonctionnent. Des systèmes qui tiennent.'}
              </h2>
              <p className="text-slate-500 text-base leading-relaxed">
                {isEn
                  ? 'Actoos builds digital tools for organizations. Not showcase sites. Not disposable apps. Products that serve every day.'
                  : 'Actoos construit des outils numériques pour les organisations. Pas des sites vitrines. Pas des applications jetables. Des produits qui servent au quotidien.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {isEn ? 'Tools that work' : 'Des outils qui fonctionnent'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isEn
                    ? 'Built for real use, in real conditions.'
                    : 'Conçus pour un usage réel, dans des conditions réelles.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {isEn ? 'Systems that hold' : 'Des systèmes qui tiennent'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isEn
                    ? 'Clean architecture, isolated data, maintainable code.'
                    : 'Architecture propre, données isolées, code maintenable.'}
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  {isEn ? 'Products that evolve' : 'Des produits qui évoluent'}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {isEn
                    ? 'Every tool is designed to grow with its usage.'
                    : 'Chaque outil est pensé pour grandir avec son usage.'}
                </p>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== 3. PRODUIT LIVE ========== */}
      <FadeInSection>
        <section className="py-12 md:py-16 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Briefcase size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 leading-tight">Actoos Jobs</h2>
                    <p className="text-slate-500 text-sm mt-0.5">{t[language].jobsSectionDesc}</p>
                  </div>
                </div>
                <a
                  href="/jobs"
                  className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 border border-slate-200 px-5 py-2.5 rounded-full font-medium text-sm hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  {t[language].jobsSectionCta}
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== 4. COMMENT NOUS TRAVAILLONS ========== */}
      <FadeInSection>
        <section className="py-16 md:py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="mb-16 max-w-2xl">
              <span className="inline-block text-xs font-medium text-blue-600 mb-3">
                {isEn ? 'Method' : 'Méthode'}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">
                {isEn ? 'How we work' : 'Comment nous travaillons'}
              </h2>
              <p className="text-slate-500 text-base leading-relaxed">
                {isEn
                  ? 'Four clear phases. A check-in at every step.'
                  : 'Quatre phases claires. Un point de suivi à chaque étape.'}
              </p>
            </div>

            {/* Timeline horizontale */}
            <div className="relative">
              {/* Ligne continue desktop */}
              <div className="hidden md:block absolute top-[5px] left-0 right-0 h-px bg-slate-200" />

              <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
                {[
                  {
                    num: '01',
                    title: isEn ? 'Framing' : 'Cadrage',
                    desc: isEn
                      ? 'Understand the need, the usage, the constraints.'
                      : 'Comprendre le besoin, l\'usage, les contraintes.',
                  },
                  {
                    num: '02',
                    title: isEn ? 'Design' : 'Conception',
                    desc: isEn
                      ? 'Architecture, design, validation before the first line of code.'
                      : 'Architecture, design, validation avant la première ligne de code.',
                  },
                  {
                    num: '03',
                    title: isEn ? 'Building' : 'Réalisation',
                    desc: isEn
                      ? 'Short cycles, regular demos, no surprises.'
                      : 'Cycles courts, démos régulières, pas de surprise.',
                  },
                  {
                    num: '04',
                    title: isEn ? 'Go live' : 'Mise en service',
                    desc: isEn
                      ? 'Deployment, support, adjustments.'
                      : 'Déploiement, suivi, ajustements.',
                  },
                ].map((step, i) => (
                  <div key={i} className="relative">
                    {/* Dot sur la ligne */}
                    <div className="flex items-center gap-3 md:block mb-4">
                      <div className="w-[11px] h-[11px] rounded-full bg-white border-2 border-slate-900 relative z-10 shrink-0" />
                      <span className="md:hidden text-xs font-medium text-slate-400">{step.num}</span>
                    </div>

                    {/* Numéro desktop */}
                    <p className="hidden md:block text-xs font-medium text-slate-400 mb-3 mt-4">{step.num}</p>

                    {/* Titre + description */}
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== 5. POUR QUI ========== */}
      <FadeInSection>
        <section className="py-16 md:py-20 px-6 bg-slate-50/70 border-y border-slate-100">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 max-w-2xl">
              <span className="inline-block text-xs font-medium text-blue-600 mb-3">
                {isEn ? 'For whom' : 'Pour qui'}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {isEn ? 'Who we work with' : 'Avec qui nous travaillons'}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5">
              {(isEn ? [
                'Companies that want to internalize a tool without building it from scratch',
                'Operations teams losing time on manual processes',
                'Founders launching a product and looking for a technical partner',
                'Organizations that want to move away from generic tools',
              ] : [
                'Entreprises qui veulent internaliser un outil sans le construire de zéro',
                'Équipes opérationnelles qui perdent du temps sur des process manuels',
                'Fondateurs qui lancent un produit et cherchent un partenaire technique',
                'Organisations qui veulent sortir des outils génériques',
              ]).map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-1 h-1 bg-slate-900 rounded-full mt-2.5 shrink-0" />
                  <p className="text-sm text-slate-600 leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== 6. FORMULAIRE ========== */}
      <FadeInSection>
        <section id="projet" className="py-16 md:py-24 px-6 bg-slate-50/70 border-y border-slate-100 scroll-mt-20">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">
              {t[language].chatbotTitle}
            </h2>
            <p className="text-slate-500 text-base max-w-2xl mx-auto leading-relaxed">
              {t[language].chatbotSubtitle}
            </p>
          </div>
          <SimpleProjectForm />
        </section>
      </FadeInSection>

      {/* ========== 7. FAQ ========== */}
      <FadeInSection>
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <div className="mb-10">
              <span className="inline-block text-xs font-medium text-blue-600 mb-3">
                {isEn ? 'FAQ' : 'Questions fréquentes'}
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                {isEn ? 'Frequently asked questions' : 'Questions fréquentes'}
              </h2>
            </div>

            <div className="divide-y divide-slate-200">
              {(isEn ? [
                {
                  q: 'How long does a project take?',
                  a: 'Each project has its own pace. An initial exchange lets us scope the work and give a realistic estimate.'
                },
                {
                  q: 'How do you collaborate with clients?',
                  a: 'Remotely, with regular check-ins. Every project has a single point of contact.'
                },
                {
                  q: 'Can I see a live product?',
                  a: 'Yes. Actoos Jobs is in production and open to anyone. You can try it freely.'
                },
                {
                  q: 'What if my need doesn\'t fit any category?',
                  a: 'That\'s common. Describe it through the form. We\'ll tell you honestly whether we\'re the right partner.'
                },
                {
                  q: 'How much does it cost?',
                  a: 'Budget depends on scope. It\'s discussed after framing, not before.'
                },
              ] : [
                {
                  q: 'Combien de temps prend un projet ?',
                  a: 'Chaque projet a son propre rythme. Un premier échange permet de cadrer le périmètre et de donner une estimation réaliste.'
                },
                {
                  q: 'Comment collaborez-vous avec vos clients ?',
                  a: 'À distance, avec des points réguliers. Chaque projet a un interlocuteur unique.'
                },
                {
                  q: 'Puis-je voir un produit en production ?',
                  a: 'Oui. Actoos Jobs est en production et ouvert à tous. Vous pouvez le tester librement.'
                },
                {
                  q: 'Et si mon besoin ne rentre dans aucune case ?',
                  a: 'C\'est fréquent. Décrivez-le via le formulaire. Nous vous dirons franchement si nous sommes le bon partenaire.'
                },
                {
                  q: 'Combien ça coûte ?',
                  a: 'Le budget dépend du périmètre. Il est discuté après le cadrage, pas avant.'
                },
              ]).map((item, i) => (
                <details key={i} className="group py-4">
                  <summary className="flex items-center justify-between cursor-pointer list-none">
                    <span className="text-sm font-medium text-slate-900 pr-4">{item.q}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform shrink-0 text-lg leading-none">+</span>
                  </summary>
                  <p className="text-sm text-slate-500 leading-relaxed mt-3 pr-8">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== 8. CONTACT DIRECT ========== */}
      <FadeInSection>
        <section className="py-16 md:py-20 px-6 bg-slate-50/70 border-y border-slate-100">
          <div className="max-w-3xl mx-auto">
            <div className="mb-8">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
                {isEn ? 'Direct contact' : 'Contact direct'}
              </h2>
              <p className="text-slate-500 text-sm mt-2">
                {isEn ? 'Don\'t feel like filling out a form?' : 'Pas envie de remplir un formulaire ?'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  {isEn ? 'Write' : 'Écrire'}
                </span>
                <a href="mailto:contact@actoos.com" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  contact@actoos.com
                </a>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">
                  {isEn ? 'Use a product' : 'Utiliser un produit'}
                </span>
                <a href="https://jobs.actoos.com" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  jobs.actoos.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* ========== CTA FINAL ========== */}
      <FadeInSection>
        <section className="py-20 md:py-24 px-6 bg-slate-900">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-white mb-8">
              {t[language].ctaTitle}
            </h2>
            <a
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-medium text-sm hover:bg-slate-100 transition-colors"
            >
              {t[language].ctaButton}
              <ArrowRight size={15} />
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* ========== FOOTER ========== */}
      <FadeInSection>
        <footer className="bg-slate-900 border-t border-slate-800">
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
              <div className="sm:col-span-2">
                <div className="flex items-center gap-2.5 mb-4">
                  <img src="/logo-icon.png" alt="Actoos" className="h-8 w-8 object-contain" />
                  <span className="font-bold text-base tracking-tight text-white">Actoos</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-4">
                  {t[language].footerDescription}
                </p>
                <a href="mailto:contact@actoos.com" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  contact@actoos.com
                </a>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-white mb-4">Produits</h5>
                <ul className="space-y-2.5 text-sm text-slate-400">
                  <li><a href="/jobs" className="hover:text-white transition-colors">Actoos Jobs</a></li>
                </ul>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-white mb-4">Entreprise</h5>
                <ul className="space-y-2.5 text-sm text-slate-400">
                  <li><a href="/a-propos" className="hover:text-white transition-colors">{t[language].navAbout}</a></li>
                  <li><a href="/contact" className="hover:text-white transition-colors">{t[language].navContact}</a></li>
                </ul>
              </div>
            </div>

            <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
              <p className="text-xs text-slate-500">{t[language].footerCopy}</p>
              <div className="flex items-center gap-5 text-xs text-slate-500">
                <a href="/privacy" className="hover:text-slate-300 transition-colors">{t[language].footerPrivacy}</a>
                <a href="/legal" className="hover:text-slate-300 transition-colors">{t[language].footerLegal}</a>
              </div>
            </div>
          </div>
        </footer>
      </FadeInSection>
    </div>
  );
}