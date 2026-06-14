import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import {
  Briefcase, Mail, Lock, Eye, EyeOff, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

const LoginPage = () => {
  const { t } = useTranslation();
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) newErrors.email = true;
    if (!password.trim()) newErrors.password = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('auth.login.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await signIn({ email, password });
      toast.success(t('auth.login.success'));
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      if (error.message?.includes('Invalid login')) {
        toast.error(t('auth.login.errorInvalid'));
      } else {
        toast.error(error.message || t('auth.login.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      toast.error(t('auth.login.errorGoogle'));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-slate-900">Actoos Jobs</span>
          </Link>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">{t('auth.login.title')}</CardTitle>
            <CardDescription>
              {t('auth.login.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-3">{t('auth.login.googleButton')}</span>
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-slate-500">
                {t('auth.login.orSeparator')}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors(prev => ({ ...prev, email: false }));
                    }}
                    className={cn(
                      'pl-10 h-12',
                      errors.email && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="login-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.login.passwordLabel')}</Label>
                  <Link
                    to="/mot-de-passe-oublie"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors(prev => ({ ...prev, password: false }));
                    }}
                    className={cn(
                      'pl-10 pr-10 h-12',
                      errors.password && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
                data-testid="login-submit"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {t('auth.login.submitButton')}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              {t('auth.login.noAccount')}{' '}
              <Link to="/inscription" className="text-blue-600 hover:text-blue-700 font-medium">
                {t('auth.login.createAccount')}
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          {t('auth.login.legalPrefix')}{' '}
          <Link to="/cgu" className="text-blue-600 hover:underline">{t('auth.login.cgu')}</Link>
          {' '}{t('auth.login.legalAnd')}{' '}
          <Link to="/confidentialite" className="text-blue-600 hover:underline">{t('auth.login.privacy')}</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;