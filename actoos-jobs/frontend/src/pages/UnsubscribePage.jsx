import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';

const UnsubscribePage = () => {
  const { t, i18n } = useTranslation();
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
        // Ajoute la langue actuelle dans la requête (optionnel, ne gêne pas)
        const res = await apiFetch(
          `/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&language=${i18n.language}`
        );
        setStatus(res.success ? 'success' : 'error');
      } catch (err) {
        setStatus('error');
      }
    })();
  }, [email, i18n.language]); // surveille aussi la langue pour relancer l'appel si besoin

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow text-center">
        {status === 'loading' && <p className="text-slate-600">{t('unsubscribe.loading')}</p>}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {t('unsubscribe.titleSuccess')}
            </h1>
            <p className="text-slate-600">
              {t('unsubscribe.successMessage', {
                defaultValue: i18n.language.startsWith('en')
                  ? 'You have been unsubscribed successfully.'
                  : 'Vous avez été désabonné avec succès.',
              })}
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {t('unsubscribe.titleError')}
            </h1>
            <p className="text-slate-600">
              {!email
                ? t('unsubscribe.errorNoEmail', {
                    defaultValue: i18n.language.startsWith('en')
                      ? 'No email address provided.'
                      : 'Aucune adresse email fournie.',
                  })
                : t('unsubscribe.errorNotFound', {
                    defaultValue: i18n.language.startsWith('en')
                      ? 'Address not found or already unsubscribed.'
                      : 'Adresse non trouvée ou déjà désabonnée.',
                  })}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;