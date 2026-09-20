'use client';

import { useState } from 'react';
import { Heart, Copy, Check, Wallet, Sparkles } from 'lucide-react';
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
    <div className="bg-gradient-to-br from-rose-50 via-rose-50/60 to-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6">
        {/* En-tête */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20">
            <Heart className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 leading-tight">
              {isFr ? 'Soutenez la plateforme' : 'Support the platform'}
            </h3>
            <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-700">
              <Sparkles className="w-2.5 h-2.5" />
              {isFr ? 'Dépôt libre' : 'Free deposit'}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed mb-3">
          {isFr
            ? <>{isFr ? 'Kalanden' : 'Kalanden'} est <span className="font-semibold text-slate-800">100 % gratuit</span>.</>
            : <>Kalanden is <span className="font-semibold text-slate-800">100% free</span>.</>}
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {isFr
            ? 'Si vous souhaitez nous faire un dépôt pour soutenir la plateforme, utilisez ce numéro :'
            : 'If you\'d like to make a deposit to support the platform, use this number:'}
        </p>

        {/* Numéro + actions */}
        <div className="rounded-xl bg-white border border-rose-100 p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide font-medium">
                {isFr ? 'Numéro de dépôt' : 'Deposit number'}
              </p>
              <p className="text-base font-bold text-slate-900 tabular-nums block truncate">
                {SUPPORT_PHONE_DISPLAY}
              </p>
            </div>
            <button
              onClick={handleCopy}
              aria-label={copied ? 'Copié' : 'Copier'}
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                copied
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:text-rose-500'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Message de remerciement */}
        <div className="flex items-start gap-2.5 rounded-xl bg-slate-50/80 border border-slate-100 p-3 mt-3">
          <span className="text-base leading-none shrink-0">🙏</span>
          <p className="text-[11.5px] leading-relaxed text-slate-600">
            {isFr
              ? <>Votre dépôt finance <span className="font-medium text-slate-800">les serveurs, la modération</span> et les nouvelles fonctionnalités. Chaque soutien, même petit, nous aide à grandir.</>
              : <>Your deposit funds <span className="font-medium text-slate-800">servers, moderation</span> and new features. Every contribution, no matter how small, helps us grow.</>}
          </p>
        </div>
      </div>
    </div>
  );
}