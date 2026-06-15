'use client';

import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function PrivacyPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Header */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-xl z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <a href="/" className="flex items-center space-x-3">
            <img src="/logo-icon.png" alt="Actoos" className="h-10 w-10 object-contain" />
            <div className="flex flex-col">
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase leading-none">
                ACTOOS<span className="text-[#D4AF37]">.</span>
              </span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-400 hidden sm:block">
                Technology Group
              </span>
            </div>
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
            <a
              href="/"
              className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
            >
              <ArrowLeft size={18} />
              <span>{t[language].back}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="pt-32 pb-20 px-6 max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
          {t[language].privacyTitle}
        </h1>
        <p className="text-slate-400 text-sm mb-12">{t[language].privacyLastUpdate}</p>

        <div className="prose prose-slate max-w-none">
          {/* Section 1 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection1 }} />

          {/* Section 2 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection2 }} />

          {/* Section 3 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection3 }} />

          {/* Section 4 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection4 }} />

          {/* Section 5 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection5 }} />

          {/* Section 6 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection6 }} />

          {/* Section 7 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection7 }} />

          {/* Section 8 */}
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].privacySection8 }} />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-50 py-8 px-6 border-t border-slate-100">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
          <p>{t[language].footerCopy}</p>
          <div className="flex space-x-8">
            <span className="text-slate-600">{t[language].footerPrivacy}</span>
            <a href="/legal" className="hover:text-black transition-colors">{t[language].footerLegal}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}