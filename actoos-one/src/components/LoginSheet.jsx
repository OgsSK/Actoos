/**
 * ACTOOS ONE - Login Sheet
 * 
 * Bottom sheet pour l'authentification Multi-Pays.
 * 
 * FLUX:
 * - Connexion: Onglets [Téléphone] | [Email] avec sélecteur pays
 * - Inscription: Téléphone OBLIGATOIRE, Email optionnel
 * - Mot de passe oublié: Par téléphone avec OTP
 * 
 * Design style WhatsApp/Glovo avec drapeaux pays.
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  X, Mail, Lock, User, Phone, ArrowRight, Loader2, 
  AlertCircle, Eye, EyeOff, KeyRound, Smartphone 
} from 'lucide-react';
import { useAuth, AUTH_STATUS } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';
import { CountrySelectorInline } from './CountrySelector';
import { 
  getDefaultCountry, 
  validatePhoneForCountry, 
  formatPhoneInput,
  isCountryLaunched,
  LAUNCH_STATUS,
} from '../config/countriesConfig';

export function LoginSheet({ isOpen, onClose, onSuccess }) {
  const { 
    status, 
    signIn,
    signInWithEmail,
    signUp,
    checkPhoneExists,
    requestPasswordReset,
    resetPassword,
    error, 
    isLoading,
    clearError,
  } = useAuth();

  // Modes: 'login' | 'signup' | 'forgot' | 'reset_code'
  const [mode, setMode] = useState('login');
  
  // Login method: 'phone' | 'email'
  const [loginMethod, setLoginMethod] = useState('phone');
  
  // Country selection
  const [selectedCountry, setSelectedCountry] = useState(getDefaultCountry());
  
  // Form fields
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [phoneExistsWarning, setPhoneExistsWarning] = useState(false);
  const [devOtpCode, setDevOtpCode] = useState(null);

  // Format phone as user types
  const handlePhoneChange = (e) => {
    const formatted = formatPhoneInput(e.target.value, selectedCountry);
    setPhone(formatted);
    setPhoneExistsWarning(false);
    setLocalError(null);
  };

  // Handle country change
  const handleCountryChange = (country) => {
    setSelectedCountry(country);
    setPhone(''); // Reset phone when country changes
    setLocalError(null);
  };

  // Reset when sheet opens/closes
  useEffect(() => {
    if (!isOpen) {
      setPhone('');
      setEmail('');
      setPassword('');
      setName('');
      setOtpCode('');
      setNewPassword('');
      setLocalError(null);
      setMode('login');
      setLoginMethod('phone');
      setShowPassword(false);
      setPhoneExistsWarning(false);
      setDevOtpCode(null);
      setSelectedCountry(getDefaultCountry());
      clearError?.();
    }
  }, [isOpen, clearError]);

  // Success callback
  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED && isOpen) {
      onSuccess?.();
      onClose();
    }
  }, [status, isOpen, onSuccess, onClose]);

  // Get clean phone number (no spaces)
  const getCleanPhone = useCallback(() => {
    return phone.replace(/\s/g, '');
  }, [phone]);

  // Validate phone format
  const isPhoneValid = useCallback(() => {
    const validation = validatePhoneForCountry(getCleanPhone(), selectedCountry.code);
    return validation.valid;
  }, [getCleanPhone, selectedCountry]);

  // Get full phone with country code
  const getFullPhone = useCallback(() => {
    const validation = validatePhoneForCountry(getCleanPhone(), selectedCountry.code);
    return validation.valid ? validation.normalized : null;
  }, [getCleanPhone, selectedCountry]);

  // ====== HANDLERS ======

  // Phone Login
  const handlePhoneLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);

    const validation = validatePhoneForCountry(getCleanPhone(), selectedCountry.code);
    if (!validation.valid) {
      setLocalError(validation.error);
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const result = await signIn(validation.normalized, password);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  // Email Login
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Email invalide');
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const result = await signInWithEmail(email, password);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  // Phone Signup
  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Veuillez entrer votre nom');
      return;
    }

    const validation = validatePhoneForCountry(getCleanPhone(), selectedCountry.code);
    if (!validation.valid) {
      setLocalError(validation.error);
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    // Check if phone already exists
    const { exists } = await checkPhoneExists(validation.normalized);
    if (exists) {
      setPhoneExistsWarning(true);
      setLocalError('Ce numéro est déjà utilisé. Veuillez vous connecter.');
      return;
    }

    // Include country code and optional email
    const result = await signUp(validation.normalized, password, name.trim(), {
      country_code: selectedCountry.code,
      email: email || null,
    });
    
    if (!result.success) {
      if (result.phoneExists) {
        setPhoneExistsWarning(true);
      }
      setLocalError(result.error);
    }
  };

  // Forgot Password
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLocalError(null);

    const validation = validatePhoneForCountry(getCleanPhone(), selectedCountry.code);
    if (!validation.valid) {
      setLocalError(validation.error);
      return;
    }

    const result = await requestPasswordReset(validation.normalized);
    if (result.success) {
      setMode('reset_code');
      if (result.devCode) {
        setDevOtpCode(result.devCode);
      }
    } else {
      setLocalError(result.error);
    }
  };

  // Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (otpCode.length !== 6) {
      setLocalError('Le code doit contenir 6 chiffres');
      return;
    }

    if (newPassword.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const fullPhone = getFullPhone();
    const result = await resetPassword(fullPhone, otpCode, newPassword);
    
    if (result.success) {
      setLocalError(null);
      setMode('login');
      setLocalError('✅ Mot de passe réinitialisé ! Connectez-vous.');
    } else {
      setLocalError(result.error);
    }
  };

  const handleClose = () => {
    clearError?.();
    onClose();
  };

  const displayError = localError || error;

  // Check if selected country is launched
  const countryLaunched = isCountryLaunched(selectedCountry.code);

  // ====== RENDER ======

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="px-4 pb-8 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'login' && 'Connexion'}
            {mode === 'signup' && 'Créer un compte'}
            {mode === 'forgot' && 'Mot de passe oublié'}
            {mode === 'reset_code' && 'Réinitialisation'}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
            data-testid="close-login-sheet"
          >
            <X size={24} />
          </button>
        </div>

        {/* ===== LOGIN MODE ===== */}
        {mode === 'login' && (
          <>
            {/* Tabs: Téléphone | Email */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setLocalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  loginMethod === 'phone' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid="login-tab-phone"
              >
                <Smartphone size={18} />
                Téléphone
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setLocalError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  loginMethod === 'email' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                data-testid="login-tab-email"
              >
                <Mail size={18} />
                Email
              </button>
            </div>

            {/* Phone Login Form */}
            {loginMethod === 'phone' && (
              <form onSubmit={handlePhoneLogin} className="space-y-4">
                {/* Phone Input with Country Selector */}
                <div className="relative">
                  <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <div className="absolute left-11 top-1/2 -translate-y-1/2 z-10">
                    <CountrySelectorInline
                      selectedCountry={selectedCountry}
                      onSelect={handleCountryChange}
                    />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder={selectedCountry.phonePlaceholder}
                    className="w-full pl-[8.5rem] pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent font-medium tracking-wider"
                    autoFocus
                    data-testid="login-phone-input"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full pl-11 pr-12 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {/* Forgot password link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-sm text-[#FF5A00] hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>

                {displayError && (
                  <div className={`flex items-center gap-2 text-sm ${displayError.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
                    {!displayError.startsWith('✅') && <AlertCircle size={16} />}
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !isPhoneValid() || password.length < 6}
                  className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
                  data-testid="login-submit-btn"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Email Login Form */}
            {loginMethod === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-4">
                {/* Email */}
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full pl-11 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                    autoFocus
                    data-testid="login-email-input"
                  />
                </div>

                {/* Password */}
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mot de passe"
                    className="w-full pl-11 pr-12 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {displayError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle size={16} />
                    <span>{displayError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email || password.length < 6}
                  className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
                  data-testid="login-email-submit-btn"
                >
                  {isLoading ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Se connecter
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Create account link */}
            <div className="text-center pt-4">
              <p className="text-gray-600 text-sm">
                Pas encore de compte ?{' '}
                <button 
                  type="button"
                  onClick={() => { setMode('signup'); setLocalError(null); clearError?.(); }}
                  className="text-[#FF5A00] font-medium hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </>
        )}

        {/* ===== SIGNUP MODE ===== */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <p className="text-gray-600 text-sm mb-4">
              Créez votre compte ACTOOS ONE avec votre numéro de téléphone.
            </p>

            {/* Name */}
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom complet *"
                className="w-full pl-11 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                autoFocus
                data-testid="signup-name-input"
              />
            </div>

            {/* Phone (Required) with Country Selector */}
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <div className="absolute left-11 top-1/2 -translate-y-1/2 z-10">
                <CountrySelectorInline
                  selectedCountry={selectedCountry}
                  onSelect={handleCountryChange}
                />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder={`${selectedCountry.phonePlaceholder} *`}
                className={`w-full pl-[8.5rem] pr-4 py-4 text-base border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent font-medium tracking-wider ${
                  phoneExistsWarning ? 'border-red-400 bg-red-50' : 'border-gray-200'
                }`}
                data-testid="signup-phone-input"
              />
            </div>

            {/* Country not launched warning */}
            {!countryLaunched && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="text-lg">{selectedCountry.flag}</span>
                <div className="text-sm">
                  <span className="text-amber-800 font-medium">ACTOOS arrive bientôt au {selectedCountry.name} !</span>
                  <p className="text-amber-600 text-xs mt-0.5">Inscrivez-vous pour être notifié du lancement.</p>
                </div>
              </div>
            )}

            {phoneExistsWarning && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                <div className="text-sm">
                  <span className="text-amber-800">Ce numéro existe déjà.</span>{' '}
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLoginMethod('phone'); setLocalError(null); setPhoneExistsWarning(false); }}
                    className="text-[#FF5A00] font-medium hover:underline"
                  >
                    Se connecter →
                  </button>
                </div>
              </div>
            )}

            {/* Email (Optional) */}
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optionnel)"
                className="w-full pl-11 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="signup-email-input"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (min. 6 caractères) *"
                className="w-full pl-11 pr-12 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="signup-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {displayError && !phoneExistsWarning && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !name.trim() || !isPhoneValid() || password.length < 6}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
              data-testid="signup-submit-btn"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Créer mon compte
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-gray-600 text-sm">
                Déjà un compte ?{' '}
                <button 
                  type="button"
                  onClick={() => { setMode('login'); setLocalError(null); clearError?.(); setPhoneExistsWarning(false); }}
                  className="text-[#FF5A00] font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
            </div>
          </form>
        )}

        {/* ===== FORGOT PASSWORD ===== */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Entrez votre numéro pour recevoir un code de réinitialisation.
            </p>

            {/* Phone with Country Selector */}
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <div className="absolute left-11 top-1/2 -translate-y-1/2 z-10">
                <CountrySelectorInline
                  selectedCountry={selectedCountry}
                  onSelect={handleCountryChange}
                />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder={selectedCountry.phonePlaceholder}
                className="w-full pl-[8.5rem] pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent font-medium tracking-wider"
                autoFocus
                data-testid="forgot-phone-input"
              />
            </div>

            {displayError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isPhoneValid()}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
              data-testid="forgot-submit-btn"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Envoyer le code
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => { setMode('login'); setLocalError(null); clearError?.(); }}
                className="text-[#FF5A00] text-sm hover:underline"
              >
                ← Retour à la connexion
              </button>
            </div>
          </form>
        )}

        {/* ===== RESET CODE (OTP) ===== */}
        {mode === 'reset_code' && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Entrez le code reçu par SMS et votre nouveau mot de passe.
            </p>

            {/* DEV: Show OTP Code */}
            {devOtpCode && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-xs text-blue-600 mb-1">Code DEV (SMS non configuré)</p>
                <p className="text-2xl font-bold text-blue-800 tracking-widest">{devOtpCode}</p>
              </div>
            )}

            {/* OTP Code */}
            <div className="relative">
              <KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Code à 6 chiffres"
                className="w-full pl-11 pr-4 py-4 text-base text-center tracking-[0.5em] font-bold border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                autoFocus
                data-testid="reset-otp-input"
              />
            </div>

            {/* New Password */}
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (min. 6)"
                className="w-full pl-11 pr-12 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="reset-password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {displayError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || otpCode.length !== 6 || newPassword.length < 6}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
              data-testid="reset-submit-btn"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Réinitialiser
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <button 
                type="button"
                onClick={() => { setMode('forgot'); setLocalError(null); setOtpCode(''); setNewPassword(''); setDevOtpCode(null); }}
                className="text-gray-500 text-sm hover:underline"
              >
                Renvoyer le code
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="mt-6 text-xs text-gray-400 text-center">
          En continuant, vous acceptez nos{' '}
          <button className="text-[#FF5A00]">Conditions d'utilisation</button>
          {' '}et notre{' '}
          <button className="text-[#FF5A00]">Politique de confidentialité</button>
        </p>
      </div>
    </BottomSheet>
  );
}

export default LoginSheet;
