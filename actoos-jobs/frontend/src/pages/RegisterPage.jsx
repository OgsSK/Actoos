import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import {
  Mail, Lock, Eye, EyeOff, Loader2, User, Building2
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

const RegisterPage = () => {
  const { t, i18n } = useTranslation();
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState('candidate');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ✅ État pour attendre que les traductions soient chargées
  const [translationsReady, setTranslationsReady] = useState(i18n.isInitialized);

  // 🔥 Synchronisation avec l'URL (type=entreprise) ET la langue
  useEffect(() => {
    const type = searchParams.get('type');
    if (type === 'entreprise') {
      setStep(2);
      setRole('company');
    } else {
      setStep(1);
      setRole('candidate');
    }
  }, [searchParams, i18n.language]);

  // ✅ Attendre que les traductions soient prêtes
  useEffect(() => {
    if (i18n.isInitialized) {
      setTranslationsReady(true);
    } else {
      const onInit = () => setTranslationsReady(true);
      i18n.on('initialized', onInit);
      return () => i18n.off('initialized', onInit);
    }
  }, [i18n]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = true;
    if (!formData.lastName.trim()) newErrors.lastName = true;
    if (!formData.email.trim()) newErrors.email = true;
    if (!formData.password.trim()) newErrors.password = true;
    if (!formData.confirmPassword.trim()) newErrors.confirmPassword = true;
    if (role === 'company' && !formData.companyName.trim()) newErrors.companyName = true;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error(t('register.toasts.fillAllFields'));
      return;
    }

    if (formData.password.length < 8) {
      toast.error(t('register.toasts.passwordLength'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error(t('register.toasts.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email: formData.email,
        password: formData.password,
        role: role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        language: i18n.language?.split('-')[0] || 'fr',
      });

      toast.success(t('register.toasts.accountCreated'));
      navigate('/connexion');
    } catch (error) {
      console.error('Signup error:', error);
      if (error.message?.includes('already registered')) {
        toast.error(t('register.toasts.emailAlreadyUsed'));
      } else {
        toast.error(error.message || t('register.toasts.genericError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error(t('register.toasts.googleError'));
      setGoogleLoading(false);
    }
  };

  // ✅ Afficher un loader tant que les traductions ne sont pas prêtes
  if (!translationsReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-lg">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
              <CardDescription>{t('register.chooseProfile')}</CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              <button
                type="button"
                onClick={() => { setRole('candidate'); setStep(2); }}
                className={cn(
                  'w-full p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                  'hover:border-blue-500 hover:bg-blue-50'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                    <User className="w-7 h-7 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{t('register.candidateTitle')}</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {t('register.candidateDesc')}
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setRole('company'); setStep(2); }}
                className={cn(
                  'w-full p-6 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                  'hover:border-green-500 hover:bg-green-50'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                    <Building2 className="w-7 h-7 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-slate-900">{t('register.companyTitle')}</h3>
                    <p className="text-slate-600 text-sm mt-1">
                      {t('register.companyDesc')}
                    </p>
                  </div>
                </div>
              </button>

              <p className="text-center text-sm text-slate-600 pt-4">
                {t('register.alreadyRegistered')}{' '}
                <Link to="/connexion" className="text-blue-600 hover:text-blue-700 font-medium">
                  {t('register.loginLink')}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                role === 'candidate' ? 'bg-blue-100' : 'bg-green-100'
              )}>
                {role === 'candidate' ? (
                  <User className="w-5 h-5 text-blue-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl">
              {role === 'candidate' ? t('register.candidateFormTitle') : t('register.companyFormTitle')}
            </CardTitle>
            <CardDescription>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-blue-600 hover:underline"
              >
                {t('register.changeProfile')}
              </button>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 text-base"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <GoogleIcon />
              )}
              <span className="ml-3">{t('register.googleButton')}</span>
            </Button>

            <div className="relative my-6">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-slate-500">
                {t('register.orSeparator')}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t('register.firstNameLabel')}</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    placeholder={t('register.firstNamePlaceholder')}
                    value={formData.firstName}
                    onChange={handleChange}
                    className={cn(
                      'h-12',
                      errors.firstName && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="register-firstname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('register.lastNameLabel')}</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    placeholder={t('register.lastNamePlaceholder')}
                    value={formData.lastName}
                    onChange={handleChange}
                    className={cn(
                      'h-12',
                      errors.lastName && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="register-lastname"
                  />
                </div>
              </div>

              {role === 'company' && (
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('register.companyNameLabel')}</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="companyName"
                      name="companyName"
                      placeholder={t('register.companyNamePlaceholder')}
                      value={formData.companyName}
                      onChange={handleChange}
                      className={cn(
                        'pl-10 h-12',
                        errors.companyName && 'border-red-500 focus-visible:ring-red-500'
                      )}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">{t('register.emailLabel')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder={t('register.emailPlaceholder')}
                    value={formData.email}
                    onChange={handleChange}
                    className={cn(
                      'pl-10 h-12',
                      errors.email && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="register-email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('register.passwordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('register.passwordPlaceholder')}
                    value={formData.password}
                    onChange={handleChange}
                    className={cn(
                      'pl-10 pr-10 h-12',
                      errors.password && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="register-password"
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('register.confirmPasswordLabel')}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('register.confirmPasswordPlaceholder')}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={cn(
                      'pl-10 h-12',
                      errors.confirmPassword && 'border-red-500 focus-visible:ring-red-500'
                    )}
                    data-testid="register-confirm-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  'w-full h-12 text-base',
                  role === 'candidate'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                )}
                disabled={loading}
                data-testid="register-submit"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : null}
                {t('register.submitButton')}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-600 mt-6">
              {t('register.alreadyRegistered')}{' '}
              <Link to="/connexion" className="text-blue-600 hover:text-blue-700 font-medium">
                {t('register.loginLink')}
              </Link>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-6">
          {t('register.legalPrefix')}{' '}
          <Link to="/cgu" className="text-blue-600 hover:underline">{t('register.cgu')}</Link>
          {' '}{t('register.legalAnd')}{' '}
          <Link to="/confidentialite" className="text-blue-600 hover:underline">{t('register.privacy')}</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;