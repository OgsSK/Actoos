import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../lib/api';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, CheckCircle, ChevronLeft } from 'lucide-react';

const NewsletterPage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleNewsletter = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error(t('newsletter.toasts.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email, language: i18n.language }),
      });
      setSubscribed(true);
      toast.success(t('newsletter.toasts.subscribeSuccess'));
    } catch (err) {
      toast.error(err.message || t('newsletter.toasts.subscribeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => navigate(-1);

  // Écran de confirmation
  if (subscribed) {
    return (
      <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* ✅ Barre de navigation avec le bouton retour */}
          <div className="flex items-center justify-start mb-2 sm:mb-4">
            <button
              onClick={handleGoBack}
              className="p-2.5 rounded-full hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-800"
              aria-label="Retour"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-3 sm:mb-4">
                {t('newsletter.subscribedTitle')}
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                {t('newsletter.subscribedMessage')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Écran principal
  return (
    <div className="min-h-screen bg-slate-50 pt-16 sm:pt-20 flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        {/* ✅ Barre de navigation avec le bouton retour */}
        <div className="flex items-center justify-start mb-2 sm:mb-4">
          <button
            onClick={handleGoBack}
            className="p-2.5 rounded-full hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-800"
            aria-label="Retour"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-10 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
              <Mail className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3 sm:mb-4">
              {t('newsletter.title')}
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mb-6 sm:mb-8">
              {t('newsletter.subtitle')}
            </p>

            <form
              onSubmit={handleNewsletter}
              className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto w-full"
            >
              <input
                type="email"
                placeholder={t('newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 sm:h-12 px-5 text-base border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-blue-600 text-white hover:bg-blue-700 h-14 sm:h-12 px-6 rounded-xl whitespace-nowrap text-base font-medium"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('newsletter.subscribeButton')}
              </Button>
            </form>

            <p className="text-xs text-slate-500 mt-4 px-2">
              {t('newsletter.privacyNote')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsletterPage;