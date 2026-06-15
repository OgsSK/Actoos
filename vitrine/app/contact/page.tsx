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
    <div className="min-h-screen bg-white font-sans text-slate-900">
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

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#D4AF37] mb-4 block">
            {t[language].contactTag}
          </span>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-950 mb-6">
            {t[language].contactPageTitle}
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            {t[language].contactPageSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-start space-x-4">
              <Mail size={24} className="text-[#D4AF37] flex-shrink-0" />
              <div>
                <h3 className="font-bold text-lg">{t[language].contactEmailLabel}</h3>
                <a href="mailto:contact@actoos.com" className="text-slate-600 hover:text-[#D4AF37] transition-colors">
                  contact@actoos.com
                </a>
              </div>
            </div>
          </div>

          {sent ? (
            <div className="bg-green-50 rounded-2xl p-8 text-center">
              <h3 className="font-bold text-xl mb-2">{t[language].contactSuccessTitle}</h3>
              <p className="text-slate-600">{t[language].contactSuccessMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                name="name"
                placeholder={t[language].contactPlaceholderName}
                required
                className="w-full border rounded-xl px-4 py-3 text-sm"
              />
              <input
                type="email"
                name="email"
                placeholder={t[language].contactPlaceholderEmail}
                required
                className="w-full border rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                name="message"
                placeholder={t[language].contactPlaceholderMessage}
                rows={5}
                required
                className="w-full border rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="submit"
                className="w-full bg-slate-950 text-white py-3 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-[#D4AF37] transition-all"
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