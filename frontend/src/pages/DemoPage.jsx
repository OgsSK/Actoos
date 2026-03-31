import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const DemoPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [status, setStatus] = useState('Connexion au compte démo...');
  const [error, setError] = useState(null);

  useEffect(() => {
    const connectToDemo = async () => {
      try {
        // Demo account credentials
        const demoEmail = 'demo@actoos.com';
        const demoPassword = 'demo2024';

        setStatus('Chargement du tableau de bord...');
        
        const user = await login(demoEmail, demoPassword);
        
        if (user.role === 'admin') {
          navigate('/dashboard');
        } else {
          navigate('/tech');
        }
      } catch (err) {
        console.error('Demo login error:', err);
        setError('Le compte démo n\'est pas disponible pour le moment. Veuillez réessayer plus tard.');
      }
    };

    connectToDemo();
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6">
          <img src="/actoos-icon.svg" alt="Actoos" className="w-full h-full" />
        </div>
        
        {error ? (
          <div className="max-w-md mx-auto">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="text-blue-600 hover:underline"
            >
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <>
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600 text-lg">{status}</p>
            <p className="text-slate-400 text-sm mt-2">Accès à l'environnement de démonstration</p>
          </>
        )}
      </div>
    </div>
  );
};

export default DemoPage;
