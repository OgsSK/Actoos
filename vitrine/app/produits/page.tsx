'use client';

import { ArrowLeft, ArrowRight, Briefcase } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function ProductsPage() {
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
            {/* Sélecteur de langue */}
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
            {t[language].productsTag}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            {t[language].productsTitle} <span className="text-[#D4AF37]">.</span>
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            {t[language].productsSubtitle}
          </p>
        </div>

        {/* Actoos Pro (commenté, conservé pour usage futur) */}
        {/* ... (inchangé) */}

        {/* Actoos Jobs */}
<div className="bg-[#0F172A] rounded-3xl p-6 md:p-8 mb-12 max-w-3xl mx-auto shadow-lg">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 flex-shrink-0">
        <Briefcase size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-xl md:text-2xl font-black text-white leading-tight">Actoos Jobs</h2>
        <p className="text-[#3B82F6] text-xs font-bold uppercase tracking-wide">{t[language].jobsSubtitle}</p>
      </div>
    </div>
    <a
      href="https://jobs.actoos.com"
      className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#2563EB] to-[#1D4ED8] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:from-blue-500 hover:to-blue-700 transition-all shadow-md hover:shadow-blue-500/30 whitespace-nowrap"
    >
      <span>{t[language].jobsButtonAccess}</span>
      <ArrowRight size={14} />
    </a>
  </div>
</div>

        {/* Ouverture vers le futur */}
        <div className="text-center">
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-slate-950 mb-4">
            {t[language].productsFutureTitle}
          </h2>
          <p className="text-slate-500 mb-8">
            {t[language].productsFutureText}{' '}
            <a href="/contact" className="text-[#D4AF37] hover:underline">
              {t[language].productsFutureLink}
            </a>
          </p>
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