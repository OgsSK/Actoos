import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('Aucune session de paiement trouvée.');
      return;
    }

    (async () => {
      try {
        // 1. Vérifier le statut de la session Stripe (API existante qui fonctionne)
        const checkoutStatus = await apiFetch(`/api/checkout/status/${sessionId}`);
        if (checkoutStatus.payment_status !== 'paid') {
          setStatus('error');
          setMessage("Le paiement n'a pas encore été confirmé.");
          return;
        }

        // 2. Récupérer les métadonnées du package
        const packageId = checkoutStatus.metadata?.package_id;
        if (!packageId) {
          setStatus('error');
          setMessage("Impossible de déterminer le plan souscrit.");
          return;
        }

        // 3. Déterminer le plan
        let plan = 'free';
        if (packageId.includes('pro')) plan = 'pro';
        else if (packageId.includes('business')) plan = 'business';

        // 4. Récupérer la session utilisateur
        const { data: { session: authSession } } = await supabase.auth.getSession();
        if (!authSession) {
          setStatus('error');
          setMessage("Vous devez être connecté pour finaliser l'abonnement.");
          return;
        }

        // 5. Trouver l'entreprise liée à l'utilisateur
        const { data: companies, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('owner_id', authSession.user.id);

        if (companyError || !companies || companies.length === 0) {
          setStatus('error');
          setMessage("Aucune entreprise trouvée pour votre compte.");
          return;
        }

        // 6. Mettre à jour le plan directement dans Supabase
        const { error: updateError } = await supabase
          .from('companies')
          .update({
            subscription_plan: plan,
            stripe_subscription_id: checkoutStatus.subscription || null,
            stripe_customer_id: checkoutStatus.customer || null,
            subscription_expires_at: null
          })
          .eq('id', companies[0].id);

        if (updateError) throw updateError;

        setStatus('success');
        setMessage('Votre abonnement est activé ! Redirection...');
        setTimeout(() => {
          window.location.href = '/dashboard/entreprise';
        }, 2000);
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