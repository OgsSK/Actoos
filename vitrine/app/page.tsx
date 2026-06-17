'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Code, Smartphone, Globe, ArrowRight, Layers, Menu, X 
} from 'lucide-react';
import ProjectChatBot from './components/ProjectChatBot';
import FadeInSection from './components/FadeInSection';
import { useLanguage } from './context/LanguageContext';
import { t } from '../lib/translations';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { language, setLanguage } = useLanguage();
  const pathname = usePathname();

  // Ferme automatiquement le menu mobile quand on change de page
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Empêche le défilement du body quand le drawer est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-amber-50">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img 
              src="/logo-icon.png" 
              alt="Actoos" 
              className="h-16 w-16 object-contain"
            />
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                ACTOOS<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                Technology Group
              </span>
            </div>
          </div>
          
          {/* Desktop menu avec sélecteur de langue */}
          <div className="hidden md:flex items-center space-x-10 text-[11px] font-black uppercase tracking-widest text-slate-400">
            <button
              onClick={() => setLanguage('fr')}
              className={`${language === 'fr' ? 'text-slate-900 underline' : 'hover:text-black'}`}
            >
              FR
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`${language === 'en' ? 'text-slate-900 underline' : 'hover:text-black'}`}
            >
              EN
            </button>
            <a href="/produits" className="hover:text-black transition-colors">{t[language].navProducts}</a>
            <a href="/expertise" className="hover:text-black transition-colors">{t[language].navExpertise}</a>
            <a href="/a-propos" className="hover:text-black transition-colors">{t[language].navAbout}</a>
            <a href="/philosophie" className="hover:text-black transition-colors">{t[language].navPhilosophy}</a>
            <a href="#chatbot" className="hover:text-black transition-colors">{t[language].navProject}</a>
          </div>

          {/* Bouton hamburger */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </nav>

      {/* OVERLAY + DRAWER (menu mobile) */}
      {/* Overlay sombre */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Drawer latéral */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-80 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* En-tête du drawer */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <span className="font-black text-lg">Menu</span>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 -mr-2"
              aria-label="Fermer le menu"
            >
              <X size={24} />
            </button>
          </div>

          {/* Liens de navigation */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-center space-x-6 text-sm font-black uppercase">
              <button
                onClick={() => { setLanguage('fr'); setMobileMenuOpen(false); }}
                className={`${language === 'fr' ? 'text-slate-900 underline' : 'text-slate-400 hover:text-black'}`}
              >
                FR
              </button>
              <button
                onClick={() => { setLanguage('en'); setMobileMenuOpen(false); }}
                className={`${language === 'en' ? 'text-slate-900 underline' : 'text-slate-400 hover:text-black'}`}
              >
                EN
              </button>
            </div>
            
            <a 
              href="/produits" 
              className="block text-base font-bold text-slate-600 hover:text-black py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t[language].navProducts}
            </a>
            <a 
              href="/expertise" 
              className="block text-base font-bold text-slate-600 hover:text-black py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t[language].navExpertise}
            </a>
            <a 
              href="/a-propos" 
              className="block text-base font-bold text-slate-600 hover:text-black py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t[language].navAbout}
            </a>
            <a 
              href="/philosophie" 
              className="block text-base font-bold text-slate-600 hover:text-black py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t[language].navPhilosophy}
            </a>
            <a 
              href="#chatbot" 
              className="block text-base font-bold text-slate-600 hover:text-black py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t[language].navProject}
            </a>
          </div>
        </div>
      </div>

      {/* HERO */}
      <FadeInSection>
        <header className="pt-32 md:pt-48 pb-20 md:pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center space-x-2 bg-slate-50 px-5 py-2.5 rounded-full border border-slate-100 mb-8 md:mb-10">
            <Layers size={14} className="text-[#D4AF37]" />
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              {t[language].heroTag}
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9] mb-8 md:mb-12 text-slate-950">
            {t[language].heroTitleLine1}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#F5D78E] to-[#D4AF37] italic">
               {t[language].heroTitleLine2}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl lg:text-2xl text-slate-400 font-medium max-w-3xl leading-relaxed px-4">
            {t[language].heroDescription}
          </p>

          <div className="mt-12 md:mt-16 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4 sm:px-0">
            <a 
              href="/expertise"
              className="bg-slate-950 text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 transition-all shadow-2xl text-center"
            >
              {t[language].heroButtonExpertise}
            </a>
            <a 
              href="#chatbot"
              className="bg-white text-slate-950 border-2 border-slate-100 px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all text-center"
            >
              {t[language].heroButtonProject}
            </a>
          </div>
        </header>
      </FadeInSection>

      {/* CHATBOT */}
      <FadeInSection>
        <section id="chatbot" className="py-16 px-4 bg-slate-50 scroll-mt-[100px]">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-950 mb-4">
              {t[language].chatbotTitle}
            </h2>
            <p className="text-slate-500 text-lg">
              {t[language].chatbotSubtitle}
            </p>
          </div>
          <ProjectChatBot />
        </section>
      </FadeInSection>

      {/* SECTION EXPERTISE */}
      <FadeInSection>
        <section id="expertise" className="py-16 md:py-32 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
                {t[language].expertiseTag}
              </span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-slate-950 mb-6">
                {t[language].expertiseTitleLine1}<br/>{t[language].expertiseTitleLine2}
              </h2>
              <p className="text-slate-500 text-base md:text-xl max-w-3xl mx-auto leading-relaxed">
                {t[language].expertiseDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
                  <Smartphone size={24} className="text-slate-900" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  {t[language].expertiseMobileTitle}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t[language].expertiseMobileDesc}
                </p>
              </div>

              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <Globe size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  {t[language].expertiseWebTitle}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t[language].expertiseWebDesc}
                </p>
              </div>

              <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl border border-slate-100 hover:border-[#D4AF37]/30 transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
                  <Code size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-black italic tracking-tighter text-slate-950 mb-3">
                  {t[language].expertiseCustomTitle}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {t[language].expertiseCustomDesc}
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-slate-400 mb-4">
                {t[language].expertiseExample}
              </p>
              <a
                href="/produits"
                className="inline-flex items-center space-x-2 text-[#10B981] font-bold text-sm hover:underline"
              >
                <span>{t[language].expertiseDiscover}</span>
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SECTION À PROPOS / PHILOSOPHIE */}
      <FadeInSection>
        <section id="about" className="py-16 md:py-32 px-6 bg-slate-50">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
                  {t[language].philosophyTag}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-slate-950 mb-6">
                  {t[language].philosophyTitleLine1}<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D78E]">
                    {t[language].philosophyTitleHighlight}
                  </span>
                  <br/>{t[language].philosophyTitleLine2}
                </h2>
                <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-8">
                  {t[language].philosophyDescription}
                </p>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-[#D4AF37] rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">{t[language].philosophyPoint1Title}</strong> — {t[language].philosophyPoint1Desc}
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-[#10B981] rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">{t[language].philosophyPoint2Title}</strong> — {t[language].philosophyPoint2Desc}
                    </p>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0" />
                    <p className="text-slate-600 text-sm md:text-base">
                      <strong className="text-slate-900">{t[language].philosophyPoint3Title}</strong> — {t[language].philosophyPoint3Desc}
                    </p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="bg-white rounded-[32px] md:rounded-[48px] p-8 md:p-12 shadow-2xl border border-slate-100 relative overflow-hidden">
                  <img 
                    src="/logo-actoos-slogan.png" 
                    alt="Actoos - Empowering Action. Delivering Progress."
                    className="w-full max-w-sm mx-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeInSection>

      {/* SECTION CONTACT */}
      <FadeInSection>
        <section className="py-16 md:py-24 px-6 bg-white">
          <div className="max-w-4xl mx-auto text-center">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
              {t[language].contactTag}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter text-slate-950 mb-6">
              {t[language].contactTitle}
            </h2>
            <p className="text-slate-500 text-base md:text-lg mb-10 max-w-2xl mx-auto">
              {t[language].contactDescription}
            </p>
            <a 
             href="/contact"
            className="inline-flex items-center space-x-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl"
            >
              <span>{t[language].contactButton}</span>
              <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </FadeInSection>

      {/* FOOTER */}
      <FadeInSection>
        <footer className="bg-white py-16 md:py-20 px-6 border-t border-slate-100">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-16">
            <div className="sm:col-span-2 space-y-6 md:space-y-8">
              <div className="flex items-center space-x-3">
                <img 
                  src="/logo-icon.png" 
                  alt="Actoos" 
                  className="h-12 w-12 object-contain"
                />
                <span className="font-black text-xl tracking-tighter uppercase">
                  ACTOOS GROUP<span className="text-[#D4AF37]">.</span>
                </span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                {t[language].footerDescription}
              </p>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
                {t[language].footerNavTitle}
              </h5>
              <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-500">
                <li>
                  <a href="/expertise" className="hover:text-black transition-colors">
                    {t[language].navExpertise}
                  </a>
                </li>
                <li>
                  <a href="/philosophie" className="hover:text-black transition-colors">
                    {t[language].navPhilosophy}
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-black transition-colors">
                    {t[language].navContact}
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-950 mb-6 md:mb-8">
                {t[language].footerLegalTitle}
              </h5>
              <ul className="space-y-3 md:space-y-4 text-sm font-bold text-slate-400">
                <li>
                  <a href="/privacy" className="hover:text-black transition-colors">
                    {t[language].footerPrivacy}
                  </a>
                </li>
                <li>
                  <a href="/legal" className="hover:text-black transition-colors">
                    {t[language].footerLegal}
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-16 md:mt-20 pt-8 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-300">
            <p>{t[language].footerCopy}</p>
          </div>
        </footer>
      </FadeInSection>
    </div>
  );
}