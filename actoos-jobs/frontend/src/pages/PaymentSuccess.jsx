import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId) {
      // Optionnel : vérifier le statut de la session (si backend accessible)
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-950 text-white to-[#16213e] pt-20 p-4">
      <Card className="max-w-lg w-full bg-white/10 backdrop-blur-xl border-white/20 rounded-4xl text-center p-10">
        <CardContent className="space-y-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-16 h-16 animate-spin text-[#2563eb]" />
              <h1 className="text-2xl font-bold text-white">Vérification du paiement...</h1>
            </div>
          )}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-green-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <CheckCircle className="w-12 h-12 text-green-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Paiement réussi !</h1>
              <p className="text-blue-200">
                Merci pour votre achat. Votre compte sera activé dans quelques instants.
              </p>
              {sessionId && (
                <p className="text-xs text-blue-300">Référence : {sessionId}</p>
              )}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link to="/dashboard">
                  <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl">
                    Accéder au dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
                <Link to="/emplois">
                  <Button variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-2xl">
                    Voir les offres
                  </Button>
                </Link>
              </div>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center mx-auto">
                <span className="text-4xl">⚠️</span>
              </div>
              <h1 className="text-3xl font-bold text-white">Session introuvable</h1>
              <p className="text-blue-200">Aucune transaction trouvée. Veuillez contacter le support si besoin.</p>
              <Link to="/tarifs">
                <Button className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-2xl mt-4">
                  Retour aux tarifs
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
