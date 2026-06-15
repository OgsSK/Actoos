'use client';

import { ArrowLeft, Lightbulb, Heart, Shield, Zap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function PhilosophyPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <span className="font-black text-xl tracking-tighter uppercase">
              ACTOOS<span className="text-[#D4AF37]">.</span>
            </span>
          </a>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
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
            </div>
            <a href="/" className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
              <ArrowLeft size={18} />
              <span>{t[language].back}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Contenu */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
            {t[language].philosophyTag}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            {t[language].philosophyTitlePart1}<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5D78E]">
              {t[language].philosophyTitlePart2}
            </span>
            <span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            {t[language].philosophyIntroDescription}
          </p>
        </div>

        {/* Valeurs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-slate-50 rounded-[32px] p-8 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#F5D78E] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
              <Lightbulb size={24} className="text-slate-900" />
            </div>
            <h3 className="text-xl font-black mb-3">{t[language].philosophyCustomTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t[language].philosophyCustomDesc}
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-800 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <Heart size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">{t[language].philosophySupportTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t[language].philosophySupportDesc}
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-[#10B981] to-emerald-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <Shield size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">{t[language].philosophyReliabilityTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t[language].philosophyReliabilityDesc}
            </p>
          </div>

          <div className="bg-slate-50 rounded-[32px] p-8 hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-xl font-black mb-3">{t[language].philosophyScalabilityTitle}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              {t[language].philosophyScalabilityDesc}
            </p>
          </div>
        </div>

        {/* Citation */}
        <div className="bg-slate-50 rounded-[32px] p-10 md:p-16 text-center mb-20">
          <blockquote className="text-xl md:text-2xl font-black italic text-slate-700 mb-4">
            {t[language].philosophyQuote}
          </blockquote>
          <cite className="text-sm text-slate-500">{t[language].philosophyQuoteAuthor}</cite>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <a
            href="/contact"
            className="inline-flex items-center space-x-3 bg-slate-950 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-[#D4AF37] transition-all shadow-2xl"
          >
            <span>{t[language].philosophyCta}</span>
            <ArrowLeft size={18} className="rotate-180" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8 px-6 border-t border-slate-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>{t[language].footerCopy}</p>
        </div>
      </footer>
    </div>
  );
}