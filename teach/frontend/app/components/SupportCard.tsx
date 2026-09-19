'use client';

import { useState } from 'react';
import { Heart, Copy, Check, Phone } from 'lucide-react';
import { useLanguage } from '@/app/context/LanguageContext';

const SUPPORT_PHONE = '93192633';
const SUPPORT_PHONE_DISPLAY = '93 19 26 33';

export default function SupportCard() {
  const { language } = useLanguage();
  const isFr = language === 'fr';
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(SUPPORT_PHONE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-gradient-to-br from-red-50 via-red-50/60 to-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-red-100 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              {isFr ? 'Soutenez la plateforme' : 'Support the platform'}
            </h3>
            <p className="text-xs text-red-600">
              {isFr ? 'Contribution libre' : 'Free contribution'}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {isFr
            ? 'Kalanden est 100 % gratuit. Si vous souhaitez nous donner un coup de pouce pour continuer à améliorer le service, vous pouvez nous contacter au :'
            : 'Kalanden is 100% free. If you want to give us a hand to keep improving the service, you can contact us at:'}
        </p>

        {/* Numéro + actions */}
        <div className="rounded-xl bg-white border border-red-100 p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
              <Phone className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                {isFr ? 'Numéro de contact' : 'Contact number'}
              </p>
              <a
                href={`tel:${SUPPORT_PHONE}`}
                className="text-base font-bold text-slate-900 hover:text-red-500 transition-colors tabular-nums block truncate"
              >
                {SUPPORT_PHONE_DISPLAY}
              </a>
            </div>
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copié' : 'Copier'}
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                copied
                  ? 'border-red-500 bg-red-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-500'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Petit message de remerciement */}
        <p className="text-[11px] text-slate-400 text-center mt-3 leading-relaxed">
          {isFr
            ? 'Chaque soutien, même petit, nous aide à grandir. 🙏'
            : 'Every contribution, even small, helps us grow. 🙏'}
        </p>
      </div>
    </div>
  );
}