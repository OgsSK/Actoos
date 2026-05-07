/**
 * ACTOOS ONE - Login Sheet
 * 
 * Bottom sheet pour l'authentification Email/Password.
 * PRODUCTION MODE - Connexion réelle à Supabase Auth.
 * Design minimaliste style Uber/Deliveroo.
 */

import { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth, AUTH_STATUS } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';

export function LoginSheet({ isOpen, onClose, onSuccess }) {
  const { 
    status, 
    signIn, 
    signUp,
    error, 
    isLoading,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  // Reset quand on ouvre/ferme
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setName('');
      setPhone('');
      setLocalError(null);
      setMode('login');
      setShowPassword(false);
      clearError?.();
    }
  }, [isOpen, clearError]);

  // Succès d'auth
  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED && isOpen) {
      onSuccess?.();
      onClose();
    }
  }, [status, isOpen, onSuccess, onClose]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!validateEmail(email)) {
      setLocalError('Email invalide');
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const result = await signIn(email, password);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError('Veuillez entrer votre nom');
      return;
    }

    if (!validateEmail(email)) {
      setLocalError('Email invalide');
      return;
    }

    if (password.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    const result = await signUp(email, password, { 
      name: name.trim(),
      phone: phone ? `+223${phone.replace(/\s/g, '')}` : null,
    });
    
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const handleClose = () => {
    clearError?.();
    onClose();
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setLocalError(null);
    clearError?.();
  };

  const displayError = localError || error;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="px-4 pb-8 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
            data-testid="close-login-sheet"
          >
            <X size={24} />
          </button>
        </div>

        {/* Login Form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Connectez-vous avec votre email et mot de passe.
            </p>

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
              disabled={isLoading || !email || !password}
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

            <div className="text-center pt-2">
              <p className="text-gray-600 text-sm">
                Pas encore de compte ?{' '}
                <button 
                  type="button"
                  onClick={toggleMode}
                  className="text-[#FF5A00] font-medium hover:underline"
                >
                  Créer un compte
                </button>
              </p>
            </div>
          </form>
        )}

        {/* Signup Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Créez votre compte ACTOOS ONE pour commander.
            </p>

            {/* Name */}
            <div className="relative">
              <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom complet"
                className="w-full pl-11 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                autoFocus
                data-testid="signup-name-input"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full pl-11 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="signup-email-input"
              />
            </div>

            {/* Phone (optional) */}
            <div className="relative">
              <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <span className="absolute left-11 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+223</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="70 00 00 00 (optionnel)"
                className="w-full pl-24 pr-4 py-4 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                data-testid="signup-phone-input"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe (min. 6 caractères)"
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

            {displayError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || !password || !name}
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
                  onClick={toggleMode}
                  className="text-[#FF5A00] font-medium hover:underline"
                >
                  Se connecter
                </button>
              </p>
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
