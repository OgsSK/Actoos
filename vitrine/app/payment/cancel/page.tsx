'use client';

import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

export default function PaymentCancelPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white font-sans text-slate-900 antialiased">
      <div className="text-center bg-white rounded-2xl border border-slate-200 p-8 md:p-10 max-w-md w-full">

        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-red-600"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-slate-900 mb-2">
          {t[language].paymentCancelTitle}
        </h1>

        <p className="text-sm text-slate-500 leading-relaxed mb-2">
          {t[language].paymentCancelMessage}
        </p>

        <p className="text-xs text-slate-400 mb-7">
          {t[language].paymentCancelNote}
        </p>

        <a
          href="/"
          className="inline-flex items-center justify-center bg-slate-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-slate-800 transition-colors"
        >
          {t[language].backToHome}
        </a>
      </div>
    </div>
  );
}