import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { useAuth } from '../contexts/AuthContext'; // <-- IMPORT AJOUTÉ
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Zap } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [details, setDetails] = useState(null);

  const { refreshProfile } = useAuth(); // <-- ICI

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
          await refreshProfile(); // <-- FORCE LE RAFRAÎCHISSEMENT DU PROFIL
        } else {
          setStatus('error');
        }
      } catch (err) {
        setStatus('error');
      }
    })();
  }, [sessionId, refreshProfile]); // <-- dépendance ajoutée

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
            <h2 className="text-xl font-bold text-slate-900 mb-2">Erreur</h2>
            <p className="text-slate-600 mb-4">Impossible de finaliser votre achat.</p>
            <Link to="/dashboard/entreprise">
              <Button>Retour au tableau de bord</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isBoost = details?.isBoost;
  const packageName = details?.planLabel || 'Votre achat';
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
              <h2 className="text-xl font-bold text-slate-900 mb-2">Boost activé !</h2>
              <p className="text-slate-600 mb-4">
                Votre offre est maintenant mise en avant avec le{' '}
                <Badge className="bg-blue-100 text-blue-700">{packageName}</Badge>.
              </p>
              {amount > 0 && (
                <p className="text-sm text-slate-500 mb-6">
                  Montant payé : <strong>{amount.toLocaleString('fr-FR')} {currency}</strong>
                </p>
              )}
              <div className="flex flex-col gap-3">
                <Link to="/dashboard/entreprise/offres">
                  <Button className="bg-blue-600 text-white hover:bg-blue-700">
                    Voir mes offres <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/dashboard/entreprise">
                  <Button variant="outline">
                    Retour au tableau de bord
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Paiement réussi !</h2>
              <p className="text-slate-600 mb-4">
                Votre abonnement{' '}
                <Badge className="bg-blue-100 text-blue-700">{packageName}</Badge> est maintenant actif.
              </p>
              {amount > 0 && (
                <p className="text-sm text-slate-500 mb-6">
                  Montant payé : <strong>{amount.toLocaleString('fr-FR')} {currency}</strong>
                </p>
              )}
              <Link to="/dashboard/entreprise">
                <Button className="bg-blue-600 text-white hover:bg-blue-700">
                  Accéder à mon espace <ArrowRight className="w-4 h-4 ml-2" />
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