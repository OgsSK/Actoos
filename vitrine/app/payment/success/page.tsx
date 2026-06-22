'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <CheckCircle size={64} className="text-green-500 mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">
          {t[language].paymentSuccessTitle}
        </h1>
        <p className="text-slate-600">
          {t[language].paymentSuccessMessage}
        </p>
        {sessionId && (
          <p className="text-xs text-slate-400">
            {t[language].paymentSessionId} : {sessionId}
          </p>
        )}
        <Link
          href="/"
          className="inline-block bg-[#D4AF37] text-white px-6 py-3 rounded-xl font-bold"
        >
          {t[language].backToHome}
        </Link>
      </div>
    </div>
  );
}