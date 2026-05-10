import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';

const DemoPage = () => {
  const navigate = useNavigate();
  const { login, api } = useAuth();
  const [status, setStatus] = useState('Préparation de l\'environnement démo...');
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);

  const steps = [
    'Initialisation de la session...',
    'Réinitialisation des données...',
    'Création des données de démonstration...',
    'Connexion au compte démo...',
    'Chargement du tableau de bord...'
  ];

  useEffect(() => {
    const connectToDemo = async () => {
      try {
        // Demo account credentials
        const demoEmail = 'demo@actoos.com';
        const demoPassword = 'Salifkane&&7';

        // Step 1: Initialize demo session (reset data)
        setStep(1);
        setStatus(steps[0]);
        
        try {
          // Call init endpoint to reset demo data
          await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/demo/init`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          
          setStep(2);
          setStatus(steps[1]);
          await new Promise(r => setTimeout(r, 500)); // Brief pause for UX
          
          setStep(3);
          setStatus(steps[2]);
          await new Promise(r => setTimeout(r, 500));
        } catch (initError) {
          console.log('Demo init endpoint not available, proceeding with login');
        }

        // Step 4: Login
        setStep(4);
        setStatus(steps[3]);
        
        const result = await login(demoEmail, demoPassword);
        
        // Handle 2FA if needed (shouldn't be for demo)
        if (result.requires_2fa) {
          setError('Le compte démo ne devrait pas avoir la 2FA activée.');
          return;
        }

        // Step 5: Navigate to dashboard
        setStep(5);
        setStatus(steps[4]);
        await new Promise(r => setTimeout(r, 300));
        
        if (result.role === 'admin') {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 relative">
            <img src="/branding/actoos-pro-icon.png" alt="ACTOOS PRO" className="w-full h-full" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">ACTOOS PRO</h1>
          <p className="text-slate-400">Mode Démonstration</p>
        </div>
        
        {error ? (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button 
              onClick={() => navigate('/')}
              className="text-white bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            {/* Loading indicator */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" />
              </div>
            </div>
            
            {/* Current status */}
            <p className="text-white text-center text-lg font-medium mb-6">{status}</p>
            
            {/* Progress steps */}
            <div className="space-y-3">
              {steps.map((stepText, index) => (
                <div 
                  key={index}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                    step > index + 1 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : step === index + 1 
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'text-slate-500'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    step > index + 1 
                      ? 'bg-emerald-500' 
                      : step === index + 1 
                        ? 'bg-blue-500'
                        : 'bg-slate-700'
                  }`}>
                    {step > index + 1 ? (
                      <CheckCircle className="w-3 h-3 text-white" />
                    ) : step === index + 1 ? (
                      <Loader2 className="w-3 h-3 text-white animate-spin" />
                    ) : (
                      <span className="text-xs text-slate-500">{index + 1}</span>
                    )}
                  </div>
                  <span className="text-sm">{stepText}</span>
                </div>
              ))}
            </div>
            
            {/* Info notice */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-slate-400 text-xs text-center">
                Les données sont réinitialisées à chaque session pour une expérience fraîche.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoPage;
