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

  // Langue active (ex: 'en', 'fr', 'es', 'pt', 'ar', 'it', 'de', 'nl')
  const lang = i18n.language?.split('-')[0] || 'fr';

  // Dictionnaire de traductions
  const translations = {
    loading: {
      fr: 'Traitement en cours...',
      en: 'Processing...',
      es: 'Procesando...',
      pt: 'Processando...',
      ar: 'جارٍ المعالجة...',
      it: 'Elaborazione in corso...',
      de: 'Wird bearbeitet...',
      nl: 'Verwerken...',
    },
    successTitle: {
      fr: 'Désabonné avec succès',
      en: 'Unsubscribed successfully',
      es: 'Desinscrito con éxito',
      pt: 'Desinscrito com sucesso',
      ar: 'تم إلغاء الاشتراك بنجاح',
      it: 'Disiscritto con successo',
      de: 'Erfolgreich abgemeldet',
      nl: 'Succesvol uitgeschreven',
    },
    successMessage: {
      fr: 'Vous avez été désabonné avec succès.',
      en: 'You have been successfully unsubscribed.',
      es: 'Has sido desinscrito con éxito.',
      pt: 'Você foi desinscrito com sucesso.',
      ar: 'تم إلغاء اشتراكك بنجاح.',
      it: 'Sei stato disiscritto con successo.',
      de: 'Sie wurden erfolgreich abgemeldet.',
      nl: 'U bent succesvol uitgeschreven.',
    },
    errorTitle: {
      fr: 'Erreur',
      en: 'Error',
      es: 'Error',
      pt: 'Erro',
      ar: 'خطأ',
      it: 'Errore',
      de: 'Fehler',
      nl: 'Fout',
    },
    errorNoEmail: {
      fr: 'Aucune adresse email fournie.',
      en: 'No email address provided.',
      es: 'No se proporcionó dirección de correo.',
      pt: 'Nenhum endereço de email fornecido.',
      ar: 'لم يتم تقديم عنوان بريد إلكتروني.',
      it: 'Nessun indirizzo email fornito.',
      de: 'Keine E-Mail-Adresse angegeben.',
      nl: 'Geen e-mailadres opgegeven.',
    },
    errorAlreadyUnsubscribed: {
      fr: 'Adresse non trouvée ou déjà désabonnée.',
      en: 'Address not found or already unsubscribed.',
      es: 'Dirección no encontrada o ya desinscrita.',
      pt: 'Endereço não encontrado ou já desinscrito.',
      ar: 'العنوان غير موجود أو تم إلغاء الاشتراك بالفعل.',
      it: 'Indirizzo non trovato o già disiscritto.',
      de: 'Adresse nicht gefunden oder bereits abgemeldet.',
      nl: 'Adres niet gevonden of al uitgeschreven.',
    },
    errorNetwork: {
      fr: 'Erreur réseau, veuillez réessayer.',
      en: 'Network error, please try again.',
      es: 'Error de red, inténtelo de nuevo.',
      pt: 'Erro de rede, tente novamente.',
      ar: 'خطأ في الشبكة، يرجى المحاولة مرة أخرى.',
      it: 'Errore di rete, riprova.',
      de: 'Netzwerkfehler, bitte versuchen Sie es erneut.',
      nl: 'Netwerkfout, probeer opnieuw.',
    },
  };

  // Récupère la traduction ou retourne le français par défaut
  const tLocal = (key) => {
    if (translations[key] && translations[key][lang]) {
      return translations[key][lang];
    }
    return translations[key]?.fr || key;
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow text-center">
        {status === 'loading' && <p className="text-slate-600">{tLocal('loading')}</p>}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{tLocal('successTitle')}</h1>
            <p className="text-slate-600">{tLocal('successMessage')}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{tLocal('errorTitle')}</h1>
            <p className="text-slate-600">
              {email ? tLocal('errorAlreadyUnsubscribed') : tLocal('errorNoEmail')}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default UnsubscribePage;