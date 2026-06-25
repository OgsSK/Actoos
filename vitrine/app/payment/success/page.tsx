'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

function PaymentContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const { language } = useLanguage();

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-10 md:p-12 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 size={60} className="text-green-500" strokeWidth={2.2} />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              {t[language]?.paymentSuccessTitle || 'Paiement confirmé'}
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
              {t[language]?.paymentSuccessMessage || 'Votre paiement a été traité avec succès.'}
            </p>
          </div>

          {sessionId && (
            <div className="mt-8">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-2">
                  {t[language]?.paymentSessionId || 'ID de transaction'}
                </p>
                <p className="text-sm text-slate-700 break-all font-mono">{sessionId}</p>
              </div>
            </div>
          )}

          <div className="mt-10 space-y-4">
            <a
              href="/"
              className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#C6A233] text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200 shadow-lg shadow-[#D4AF37]/20"
            >
              {t[language]?.backToHome || "Retour à l'accueil"}
              <ArrowRight size={18} />
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {t[language]?.paymentSuccessNote || 'Votre paiement a bien été enregistré. Nous vous contacterons sous 24h.'}
          </p>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-[3px] border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}