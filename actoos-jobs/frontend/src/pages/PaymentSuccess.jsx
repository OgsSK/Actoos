import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Aucune session de paiement trouvée.');
      return;
    }

    (async () => {
      try {
        // Vérifier d'abord le statut de la session Stripe
        const checkoutStatus = await apiFetch(`/api/checkout/status/${sessionId}`);
        if (checkoutStatus.payment_status === 'paid') {
          // Mise à jour forcée du plan via notre nouvel endpoint
          const updateRes = await apiFetch('/api/update-plan-from-session', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId }),
          });
          if (updateRes.success) {
            setStatus('success');
            setMessage('Votre abonnement est activé ! Vous allez être redirigé vers votre tableau de bord.');
            setTimeout(() => {
              window.location.href = '/dashboard/entreprise';
            }, 3000);
          } else {
            setStatus('error');
            setMessage(updateRes.message || 'Erreur lors de l\'activation de l\'abonnement.');
          }
        } else {
          setStatus('error');
          setMessage('Le paiement n\'a pas encore été confirmé. Veuillez patienter ou réessayer.');
        }
      } catch (err) {
        setStatus('error');
        setMessage(err.message || 'Une erreur est survenue.');
      }
    })();
  }, [sessionId]);

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-2xl shadow text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Vérification du paiement...</h1>
            <p className="text-slate-600">Veuillez patienter quelques instants.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Paiement réussi !</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <Link to="/dashboard/entreprise">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Accéder à mon tableau de bord
              </Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Erreur</h1>
            <p className="text-slate-600 mb-4">{message}</p>
            <Link to="/dashboard/entreprise">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Retour au tableau de bord
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;