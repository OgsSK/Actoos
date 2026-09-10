'use client';

import { ArrowLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function LegalPage() {
  const { language, setLanguage } = useLanguage();

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

      {/* CONTENT */}
      <main className="pt-32 md:pt-40 pb-20 px-6 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-3">
          {t[language].legalTitle}
        </h1>
        <p className="text-slate-400 text-sm mb-12">{t[language].legalLastUpdate}</p>

        <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-slate-900 prose-p:text-slate-600 prose-p:leading-relaxed prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-slate-900 prose-li:text-slate-600">
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection1 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection2 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection3 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection4 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection5 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection6 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection7 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection8 }} />
          <section className="mb-12" dangerouslySetInnerHTML={{ __html: t[language].legalSection9 }} />
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-400">
          <p>{t[language].footerCopy}</p>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:text-slate-700 transition-colors">{t[language].footerPrivacy}</a>
            <span className="text-slate-500">{t[language].footerLegal}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}