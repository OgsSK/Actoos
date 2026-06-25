'use client';

import Link from 'next/link';
import { XCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

export default function PaymentCancelPage() {
  const { language } = useLanguage();

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-10 md:p-12 text-center">
          <div className="flex justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-red-50 flex items-center justify-center">
              <XCircle size={60} className="text-red-500" strokeWidth={2.2} />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
              {t[language]?.paymentCancelTitle || 'Paiement annulé'}
            </h1>
            <p className="text-slate-600 text-lg leading-relaxed max-w-md mx-auto">
              {t[language]?.paymentCancelMessage || "Votre paiement n'a pas été finalisé. Aucun montant n'a été prélevé."}
            </p>
          </div>

          <div className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200"
            >
              <ArrowLeft size={18} />
              {t[language]?.backToHome || "Retour à l'accueil"}
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            {t[language]?.paymentCancelNote || 'Vous pouvez réessayer à tout moment.'}
          </p>
        </div>
      </div>
    </main>
  );
}