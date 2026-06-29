import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Zap } from 'lucide-react';

const PaymentSuccess = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [details, setDetails] = useState(null);

  const { refreshProfile } = useAuth();

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }
    (async () => {
      try {
        const res = await apiFetch('/api/checkout/complete', {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (res.success) {
          setDetails(res);
          setStatus('success');
          await refreshProfile(); // ✅ met à jour le profil avec les nouvelles permissions
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    })();
  }, [sessionId, refreshProfile]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">{t('paymentSuccess.error.title')}</h2>
            <p className="text-slate-600 mb-4">{t('paymentSuccess.error.message')}</p>
            <Link to="/dashboard/entreprise">
              <Button>{t('paymentSuccess.error.backToDashboard')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBoost = details?.isBoost;
  const packageName = details?.planLabel || t('paymentSuccess.subscription.title');
  const amount = details?.amount;
  const currency = details?.currency;

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />

          {isBoost ? (
            <>
              <Zap className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t('paymentSuccess.boost.title')}</h2>
              <div className="text-slate-600 mb-4">
                <Trans
                  i18nKey="paymentSuccess.boost.message"
                  values={{ packageName }}
                  components={{
                    badge: <Badge className="bg-blue-100 text-blue-700" />
                  }}
                />
              </div>
              {amount > 0 && (
                <p className="text-sm text-slate-500 mb-6">
                  {t('paymentSuccess.amountPaidLabel')}{' '}
                  <strong>
                    {amount.toLocaleString('fr-FR')} {currency}
                  </strong>
                </p>
              )}
              <div className="flex flex-col gap-3">
                <Link to="/dashboard/entreprise/offres">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    {t('paymentSuccess.boost.viewOffers')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/dashboard/entreprise">
                  <Button variant="outline">{t('paymentSuccess.boost.backToDashboard')}</Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-2">{t('paymentSuccess.subscription.title')}</h2>
              <div className="text-slate-600 mb-4">
                <Trans
                  i18nKey="paymentSuccess.subscription.message"
                  values={{ packageName }}
                  components={{
                    badge: <Badge className="bg-blue-100 text-blue-700" />
                  }}
                />
              </div>
              {amount > 0 && (
                <p className="text-sm text-slate-500 mb-6">
                  {t('paymentSuccess.amountPaidLabel')}{' '}
                  <strong>
                    {amount.toLocaleString('fr-FR')} {currency}
                  </strong>
                </p>
              )}
              <Link to="/dashboard/entreprise">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  {t('paymentSuccess.subscription.goToDashboard')} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;