/**
 * ACTOOS ONE - Login Sheet
 * 
 * Bottom sheet pour l'authentification par téléphone + OTP.
 * Design minimaliste style Uber/Deliveroo.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Phone, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth, AUTH_STATUS } from '../context/AuthContext';
import { BottomSheet } from './BottomSheet';

export function LoginSheet({ isOpen, onClose, onSuccess }) {
  const { 
    status, 
    sendOTP, 
    verifyOTP, 
    cancelOTP,
    error, 
    isLoading,
    pendingPhone,
    useMockAuth,
  } = useAuth();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [localError, setLocalError] = useState(null);
  
  const otpRefs = [useRef(), useRef(), useRef(), useRef()];

  // Reset quand on ouvre/ferme
  useEffect(() => {
    if (!isOpen) {
      setPhone('');
      setOtp(['', '', '', '']);
      setLocalError(null);
    }
  }, [isOpen]);

  // Focus premier input OTP quand on passe à la vérification
  useEffect(() => {
    if (status === AUTH_STATUS.OTP_SENT && otpRefs[0].current) {
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    }
  }, [status]);

  // Succès d'auth
  useEffect(() => {
    if (status === AUTH_STATUS.AUTHENTICATED && isOpen) {
      onSuccess?.();
      onClose();
    }
  }, [status, isOpen, onSuccess, onClose]);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    
    // Valider le numéro
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      setLocalError('Numéro de téléphone invalide');
      return;
    }

    const result = await sendOTP(cleanPhone);
    if (!result.success) {
      setLocalError(result.error);
    }
  };

  const handleOtpChange = (index, value) => {
    // N'accepter que les chiffres
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus suivant
    if (value && index < 3) {
      otpRefs[index + 1].current?.focus();
    }

    // Auto-submit quand complet
    if (value && index === 3 && newOtp.every(d => d)) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // Backspace → focus précédent
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleOtpSubmit = async (code) => {
    setLocalError(null);
    const result = await verifyOTP(code || otp.join(''));
    if (!result.success) {
      setLocalError(result.error);
      setOtp(['', '', '', '']);
      otpRefs[0].current?.focus();
    }
  };

  const handleBack = () => {
    cancelOTP();
    setOtp(['', '', '', '']);
    setLocalError(null);
  };

  const handleClose = () => {
    cancelOTP();
    onClose();
  };

  const displayError = localError || error;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose}>
      <div className="px-4 pb-8 pt-2">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">
            {status === AUTH_STATUS.OTP_SENT ? 'Vérification' : 'Connexion'}
          </h2>
          <button 
            onClick={handleClose}
            className="p-2 -mr-2 text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Mode indication removed for production */}

        {/* Phone Input Step */}
        {status !== AUTH_STATUS.OTP_SENT && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <p className="text-gray-600 text-sm">
              Entrez votre numéro de téléphone pour recevoir un code de vérification.
            </p>

            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center text-gray-500">
                <Phone size={20} className="mr-2" />
                <span className="text-gray-900 font-medium">+223</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="70 00 00 00"
                className="w-full pl-24 pr-4 py-4 text-lg border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                autoFocus
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
              disabled={isLoading || phone.replace(/\s/g, '').length < 8}
              className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  Continuer
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        )}

        {/* OTP Verification Step */}
        {status === AUTH_STATUS.OTP_SENT && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">
              Code envoyé au <span className="font-medium text-gray-900">{pendingPhone}</span>
            </p>

            {/* OTP Input */}
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={otpRefs[index]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-14 h-14 text-center text-2xl font-semibold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF5A00] focus:border-transparent"
                />
              ))}
            </div>

            {displayError && (
              <div className="flex items-center justify-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{displayError}</span>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-center">
                <Loader2 size={24} className="animate-spin text-[#FF5A00]" />
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => handleOtpSubmit()}
                disabled={isLoading || otp.some(d => !d)}
                className="w-full py-4 bg-[#FF5A00] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E55100] transition-colors"
              >
                Vérifier
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  onClick={handleBack}
                  disabled={isLoading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Modifier le numéro
                </button>
                <button
                  onClick={() => sendOTP(pendingPhone)}
                  disabled={isLoading}
                  className="text-[#FF5A00] hover:text-[#E55100] font-medium"
                >
                  Renvoyer le code
                </button>
              </div>
            </div>
          </div>
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
