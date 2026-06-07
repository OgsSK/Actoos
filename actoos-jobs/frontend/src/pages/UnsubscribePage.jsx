import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';

const UnsubscribePage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      setMessage('Aucune adresse email fournie.');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`);
        if (res.success) {
          setStatus('success');
          setMessage(res.message);
        } else {
          setStatus('error');
          setMessage(res.message || 'Une erreur est survenue.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Erreur réseau.');
      }
    })();
  }, [email]);

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow text-center">
        {status === 'loading' && <p className="text-slate-600">Traitement en cours...</p>}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Désabonnement confirmé</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h1>
            <p className="text-slate-600">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;