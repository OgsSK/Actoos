'use client';

import { useState, useEffect } from 'react';
import { Cookie, X, Check } from 'lucide-react';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('actoos-cookie-consent');
    if (!consent) {
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem('actoos-cookie-consent', JSON.stringify({
      essential: true, analytics: true, preferences: true, timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  const acceptEssential = () => {
    localStorage.setItem('actoos-cookie-consent', JSON.stringify({
      essential: true, analytics: false, preferences: false, timestamp: new Date().toISOString()
    }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6">
      <div className="max-w-4xl mx-auto bg-white/70 backdrop-blur-2xl text-slate-900 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] border border-white/60 ring-1 ring-black/5 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
                <Cookie size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">Cookies & Confidentialité</h3>
                <p className="text-slate-500 text-xs">ACTOOS Group</p>
              </div>
            </div>
            <button onClick={acceptEssential} className="text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Fermer"><X size={20} /></button>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.</p>
          {showDetails && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              {[{ essential: true, label: 'Cookies essentiels', desc: 'Nécessaires au fonctionnement' }, { essential: false, label: 'Cookies analytiques', desc: 'Comprendre l\'utilisation du site' }, { essential: false, label: 'Cookies de préférences', desc: 'Mémoriser vos choix' }].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div><p className="font-bold text-sm">{item.label}</p><p className="text-slate-400 text-xs">{item.desc}</p></div>
                  <div className={`w-10 h-6 rounded-full flex items-center px-1 ${item.essential ? 'bg-[#D4AF37] justify-end' : 'bg-slate-300 justify-start'}`}><div className="w-4 h-4 bg-white rounded-full" /></div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={acceptAll} className="flex-1 bg-gradient-to-r from-[#D4AF37] to-amber-500 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:from-amber-400 hover:to-amber-400 transition-all shadow-lg shadow-amber-200 flex items-center justify-center space-x-2"><Check size={16} /><span>Tout accepter</span></button>
            <button onClick={acceptEssential} className="flex-1 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Essentiels uniquement</button>
            <button onClick={() => setShowDetails(!showDetails)} className="sm:flex-none bg-white border border-slate-200 text-slate-500 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:text-slate-700 transition-all">{showDetails ? 'Masquer' : 'Personnaliser'}</button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <a href="/privacy" className="hover:text-[#D4AF37] transition-colors">Politique de confidentialité</a>
            <a href="/legal" className="hover:text-[#D4AF37] transition-colors">Mentions légales</a>
          </div>
        </div>
      </div>
    </div>
  );
}