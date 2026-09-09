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
        body: JSON.stringify({
          email,
          language: i18n.language,
        }),
      });
      setSubscribed(true);
      toast.success(t('newsletter.toasts.subscribeSuccess'));
    } catch (err) {
      toast.error(err.message || t('newsletter.toasts.subscribeError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  if (subscribed) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 relative">
          {/* ✅ Bouton retour en haut à gauche de la carte */}
          <button
            onClick={handleGoBack}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <CardContent className="p-8 text-center pt-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {t('newsletter.subscribedTitle')}
            </h2>
            <p className="text-slate-600">
              {t('newsletter.subscribedMessage')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-4">
        <Card className="relative">
          {/* ✅ Bouton retour en haut à gauche de la carte */}
          <button
            onClick={handleGoBack}
            className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-700 z-10"
            aria-label="Retour"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <CardContent className="p-8 sm:p-12 text-center pt-14 sm:pt-16">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">
              {t('newsletter.title')}
            </h1>
            <p className="text-slate-600 mb-8">
              {t('newsletter.subtitle')}
            </p>
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder={t('newsletter.placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 h-12 px-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white hover:bg-blue-700 h-12 px-6 rounded-xl whitespace-nowrap"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('newsletter.subscribeButton')}
              </Button>
            </form>
            <p className="text-xs text-slate-500 mt-4">
              {t('newsletter.privacyNote')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewsletterPage;