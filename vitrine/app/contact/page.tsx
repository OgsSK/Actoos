'use client';

import { useState } from 'react';
import { ArrowLeft, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { t } from '../../lib/translations';

export default function ContactPage() {
  const { language, setLanguage } = useLanguage();
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    if (!name || !email) return;

    try {
      const res = await fetch('/api/send-project-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          html: `
            <h2>${t[language].contactEmailSubject}</h2>
            <p><strong>${t[language].contactEmailName}:</strong> ${name}</p>
            <p><strong>${t[language].contactEmailEmail}:</strong> ${email}</p>
            <p><strong>${t[language].contactEmailMessage}:</strong> ${message || '-'}</p>
          `,
        }),
      });

      if (res.ok) {
        setSent(true);
      } else {
        alert(t[language].contactError);
      }
    } catch (error) {
      alert(t[language].contactErrorConnection);
    }
  };

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

      <main className="pt-32 md:pt-40 pb-20 px-6 max-w-5xl mx-auto">

        {/* HERO */}
        <div className="text-center mb-16">
          <span className="inline-block text-xs font-medium text-blue-600 mb-3">
            {t[language].contactTag}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            {t[language].contactPageTitle}
          </h1>
          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            {t[language].contactPageSubtitle}
          </p>
        </div>

        {/* CONTENU */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-4xl mx-auto">

          {/* Coordonnées */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900 mb-1">{t[language].contactEmailLabel}</h3>
                <a
                  href="mailto:contact@actoos.com"
                  className="text-slate-500 hover:text-blue-600 transition-colors text-sm"
                >
                  contact@actoos.com
                </a>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          {sent ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
              <h3 className="font-semibold text-lg text-emerald-900 mb-2">{t[language].contactSuccessTitle}</h3>
              <p className="text-emerald-700 text-sm">{t[language].contactSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder={t[language].contactPlaceholderName}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <input
                type="email"
                name="email"
                placeholder={t[language].contactPlaceholderEmail}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors"
              />
              <textarea
                name="message"
                placeholder={t[language].contactPlaceholderMessage}
                rows={5}
                required
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors resize-none"
              />
              <button
                type="submit"
                className="w-full bg-slate-900 text-white py-3 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
              >
                {t[language].contactSendButton}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}