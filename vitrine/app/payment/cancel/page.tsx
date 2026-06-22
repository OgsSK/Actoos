'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

export default function PaymentCancelPage() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <XCircle size={64} className="text-red-500 mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">
          {t[language].paymentCancelTitle}
        </h1>
        <p className="text-slate-600">
          {t[language].paymentCancelMessage}
        </p>
        <Link
          href="/"
          className="inline-block bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-bold"
        >
          {t[language].backToHome}
        </Link>
      </div>
    </div>
  );
}