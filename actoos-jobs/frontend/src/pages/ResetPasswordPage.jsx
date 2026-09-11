import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from 'sonner';
import { Lock, Loader2, CheckCircle, ArrowRight, AlertCircle } from 'lucide-react';

const ResetPasswordPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  // ============ ÉTAPE 1 : Détecter la session de recovery ============
  useEffect(() => {
    let mounted = true;

    const initRecovery = async () => {
      try {
        // 1. Attendre un peu que detectSessionInUrl fasse son job
        await new Promise((resolve) => setTimeout(resolve, 500));

        // 2. Vérifier si une session existe déjà
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          if (mounted) {
            setSessionReady(true);
            setChecking(false);
          }
          return;
        }

        // 3. Si pas de session, essayer manuellement avec le code PKCE
        const code = searchParams.get('code');
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('[ResetPassword] Erreur exchange:', exchangeError);
            if (mounted) {
              setError(
                t('resetPassword.toasts.invalidLink') ||
                'Lien invalide ou déjà utilisé. Veuillez en demander un nouveau.'
              );
              setChecking(false);
            }
            return;
          }

          if (mounted) {
            setSessionReady(true);
            setChecking(false);
          }
          return;
        }

        // 4. Sinon, écouter PASSWORD_RECOVERY pendant 5s max
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event) => {
            if (event === 'PASSWORD_RECOVERY' && mounted) {
              setSessionReady(true);
              setChecking(false);
            }
          }
        );

        setTimeout(() => {
          if (mounted && !sessionReady) {
            setError(
              t('resetPassword.toasts.noToken') ||
              'Aucun lien de réinitialisation valide détecté. Veuillez en demander un nouveau.'
            );
            setChecking(false);
          }
        }, 5000);

        return () => subscription.unsubscribe();
      } catch (err) {
        console.error('[ResetPassword] Erreur init:', err);
        if (mounted) {
          setError(
            t('resetPassword.toasts.genericError') ||
            'Erreur lors du traitement du lien'
          );
          setChecking(false);
        }
      }
    };

    initRecovery();

    return () => {
      mounted = false;
    };
  }, [searchParams, t, sessionReady]);

  // ============ ÉTAPE 2 : Soumettre le nouveau mot de passe ============
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('resetPassword.toasts.passwordMismatch'));
      return;
    }
    if (password.length < 8) {
      toast.error(t('resetPassword.toasts.passwordLength'));
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error(
          t('resetPassword.toasts.sessionLost') ||
          'Session introuvable. Le lien a peut-être expiré. Veuillez en demander un nouveau.'
        );
      }

      const { data, error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        throw updateError;
      }

      if (!data?.user) {
        throw new Error(
          t('resetPassword.toasts.updateFailed') ||
          'Le mot de passe n\'a pas pu être mis à jour'
        );
      }

      setDone(true);
      toast.success(t('resetPassword.toasts.updateSuccess'));

      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate('/connexion');
      }, 2000);
    } catch (err) {
      console.error('[ResetPassword] Update error:', err);

      const errorMessage = err.message || '';

      const isBusinessError =
        errorMessage.includes('should be different') ||
        errorMessage.includes('different from the old') ||
        errorMessage.includes('same as') ||
        errorMessage.includes('weak') ||
        errorMessage.includes('too short') ||
        errorMessage.includes('at least');

      if (isBusinessError) {
        toast.error(
          t('resetPassword.toasts.passwordConstraints') ||
          'Le nouveau mot de passe doit être différent de l\'ancien'
        );
      } else {
        setError(
          errorMessage ||
          t('resetPassword.toasts.updateError') ||
          'Erreur lors de la mise à jour'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ============ ÉCRAN DE CHARGEMENT ============
  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600 text-sm">
            {t('resetPassword.verifying')}
          </p>
        </div>
      </div>
    );
  }

  // ============ ÉCRAN D'ERREUR ============
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="pt-6 text-center space-y-4">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                {t('resetPassword.invalidLinkTitle')}
              </h2>
              <p className="text-slate-600 text-sm">{error}</p>
              <Button
                onClick={() => navigate('/mot-de-passe-oublie')}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {t('resetPassword.requestNewLink')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============ ÉCRAN DE SUCCÈS ============
  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardContent className="pt-6 text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900">
                {t('resetPassword.successTitle')}
              </h2>
              <p className="text-slate-600 text-sm">
                {t('resetPassword.successMessage')}
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ============ FORMULAIRE ============
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto">
            <Lock className="w-7 h-7 text-white" />
          </div>
          <span className="text-2xl font-bold text-slate-900 mt-4 block">Actoos Jobs</span>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{t('resetPassword.title')}</CardTitle>
            <CardDescription>{t('resetPassword.description')}</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t('resetPassword.newPasswordLabel')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={t('resetPassword.placeholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 h-12"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-slate-700"
                >
                  {t('resetPassword.confirmPasswordLabel')}
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t('resetPassword.placeholder')}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12"
                  autoComplete="new-password"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base bg-blue-600 text-white hover:bg-blue-700"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="w-5 h-5 mr-2" />
                )}
                {t('resetPassword.submitButton')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;