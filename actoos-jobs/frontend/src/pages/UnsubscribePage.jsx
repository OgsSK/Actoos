import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';

const UnsubscribePage = () => {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    if (!email) {
      setStatus('error');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch(`/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}`);
        setStatus(res.success ? 'success' : 'error');
      } catch (err) {
        setStatus('error');
      }
    })();
  }, [email]);

  // Textes directement en dur, basés sur la langue
  const isEnglish = i18n.language?.startsWith('en');

  const texts = {
    loading: isEnglish ? 'Processing...' : 'Traitement en cours...',
    successTitle: isEnglish ? 'Unsubscribed successfully' : 'Désabonné avec succès',
    successMessage: isEnglish ? 'You have been successfully unsubscribed.' : 'Vous avez été désabonné avec succès.',
    errorTitle: isEnglish ? 'Error' : 'Erreur',
    errorNoEmail: isEnglish ? 'No email address provided.' : 'Aucune adresse email fournie.',
    errorAlreadyUnsubscribed: isEnglish ? 'Address not found or already unsubscribed.' : 'Adresse non trouvée ou déjà désabonnée.',
    errorNetwork: isEnglish ? 'Network error, please try again.' : 'Erreur réseau, veuillez réessayer.',
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow text-center">
        {status === 'loading' && <p className="text-slate-600">{texts.loading}</p>}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{texts.successTitle}</h1>
            <p className="text-slate-600">{texts.successMessage}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{texts.errorTitle}</h1>
            <p className="text-slate-600">
              {email ? texts.errorAlreadyUnsubscribed : texts.errorNoEmail}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;