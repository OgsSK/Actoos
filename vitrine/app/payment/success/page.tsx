'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { t } from '../../../lib/translations';

function PaymentContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const router = useRouter();
  const { language } = useLanguage();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [clientToken, setClientToken] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/confirm-payment?session_id=${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.client_token) {
            setClientToken(data.client_token);
            setStatus('success');
            setTimeout(() => {
              router.push(`/client/${data.client_token}`);
            }, 3000);
          } else {
            setStatus('error');
          }
        })
        .catch(() => setStatus('error'));
    } else {
      setStatus('error');
    }
  }, [sessionId, router]);

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-10 md:p-12 text-center">
          {status === 'loading' && (
            <>
              <Loader2 size={60} className="animate-spin text-[#D4AF37] mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-slate-700">Vérification du paiement...</h1>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={60} className="text-green-500" strokeWidth={2.2} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                {t[language]?.paymentSuccessTitle || 'Paiement confirmé'}
              </h1>
              <p className="text-slate-600">
                {t[language]?.redirectingToClientSpace || 'Redirection vers votre espace projet...'}
              </p>
              {clientToken && (
                <a
                  href={`/client/${clientToken}`}
                  className="inline-block mt-4 text-[#D4AF37] font-bold hover:underline"
                >
                  {t[language]?.accessNow || 'Accéder maintenant'}
                  <ArrowRight size={16} className="inline ml-1" />
                </a>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-2xl font-bold text-red-500 mb-2">Erreur</h1>
              <p className="text-slate-600">Impossible de récupérer votre projet.</p>
              <a href="/" className="mt-4 inline-block text-[#D4AF37] font-bold">
                Retour à l&apos;accueil
              </a>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={48} /></div>}>
      <PaymentContent />
    </Suspense>
  );
}