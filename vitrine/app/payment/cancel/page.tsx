'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

function PaymentCancelContent() {
  const searchParams = useSearchParams();
  const projetId = searchParams.get('projet_id');
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    if (!projetId) return;
    setLoading(true);
    try {
      const res = await fetch('https://mgsantsreaybhsxyxzve.supabase.co/functions/v1/create-payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 0, // sera écrasé côté admin, on peut mettre 0 ou récupérer le montant via Supabase
          currency: 'eur',
          description: 'Projet Actoos',
          projet_id: projetId,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Erreur lors de la création du lien');
      }
    } catch (err) {
      alert('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

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
              {t[language]?.paymentCancelMessage || "Votre paiement n'a pas été finalisé."}
            </p>
          </div>

          {projetId ? (
            <div className="mt-10 space-y-4">
              <button
                onClick={handleRetry}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                {t[language]?.paymentRetry || 'Réessayer le paiement'}
              </button>
              <div>
                <Link
                  href="/"
                  className="text-slate-500 hover:text-slate-700 text-sm font-medium"
                >
                  {t[language]?.backToHome || "Retour à l'accueil"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-10">
              <Link
                href="/"
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-200"
              >
                {t[language]?.backToHome || "Retour à l'accueil"}
              </Link>
            </div>
          )}
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

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>}>
      <PaymentCancelContent />
    </Suspense>
  );
}