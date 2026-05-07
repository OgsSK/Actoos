import { useState } from 'react';
import { 
  Phone, 
  ArrowRight, 
  Shield,
  Loader2,
  ArrowLeft,
  Store,
  Truck,
  Crown
} from 'lucide-react';

// Portal types
const PORTAL_CONFIG = {
  partner: {
    title: 'Espace Partenaire',
    subtitle: 'Gérez vos commandes et votre restaurant',
    icon: Store,
    color: 'purple',
    bgGradient: 'from-purple-500 to-purple-700',
  },
  driver: {
    title: 'Espace Livreur',
    subtitle: 'Gérez vos courses et vos gains',
    icon: Truck,
    color: 'blue',
    bgGradient: 'from-blue-500 to-blue-700',
  },
  admin: {
    title: 'Admin ACTOOS',
    subtitle: 'Tableau de bord GOD MODE',
    icon: Crown,
    color: 'red',
    bgGradient: 'from-red-500 to-red-700',
  },
};

export function PortalLogin({ portalType, onSuccess, onBack }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' | 'otp'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const config = PORTAL_CONFIG[portalType] || PORTAL_CONFIG.partner;
  const Icon = config.icon;

  // Format phone number
  const formatPhone = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 4) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 4)} ${numbers.slice(4, 6)} ${numbers.slice(6, 8)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 8) {
      setPhone(formatted);
      setError('');
    }
  };

  const handleSendOTP = async () => {
    const cleanPhone = phone.replace(/\s/g, '');
    if (cleanPhone.length !== 8) {
      setError('Numéro invalide');
      return;
    }

    setIsLoading(true);
    // Simulate OTP sending
    await new Promise(r => setTimeout(r, 1500));
    setIsLoading(false);
    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setError('Code à 4 chiffres requis');
      return;
    }

    setIsLoading(true);
    // Simulate OTP verification - in production, check against backend
    await new Promise(r => setTimeout(r, 1500));
    
    // For demo: accept any 4-digit code
    if (otp === '1234' || otp.length === 4) {
      onSuccess({
        phone: `+223 ${phone}`,
        portalType,
      });
    } else {
      setError('Code incorrect');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with gradient */}
      <div className={`bg-gradient-to-br ${config.bgGradient} px-6 pt-12 pb-20`}>
        <button
          onClick={onBack}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mb-8"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <Icon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{config.title}</h1>
            <p className="text-white/80 text-sm">{config.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="flex-1 -mt-10 bg-white rounded-t-3xl px-6 pt-8 pb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {step === 'phone' ? 'Connexion' : 'Vérification'}
        </h2>
        <p className="text-gray-500 mb-6">
          {step === 'phone' 
            ? 'Entrez votre numéro de téléphone enregistré'
            : `Code envoyé au +223 ${phone}`
          }
        </p>

        {step === 'phone' ? (
          <div className="space-y-4">
            {/* Phone Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Numéro de téléphone
              </label>
              <div className="flex items-center gap-3 bg-gray-100 rounded-2xl px-4 py-4">
                <span className="text-gray-600 font-medium">+223</span>
                <div className="w-px h-6 bg-gray-300" />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="70 00 00 00"
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-lg tracking-wide"
                  autoFocus
                />
                <Phone className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSendOTP}
              disabled={isLoading || phone.replace(/\s/g, '').length !== 8}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                phone.replace(/\s/g, '').length === 8
                  ? 'bg-[#FF5A00] text-white active:bg-[#FF5A00]/80'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Recevoir le code
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* OTP Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Code de vérification
              </label>
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={otp[idx] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newOtp = otp.split('');
                      newOtp[idx] = val;
                      setOtp(newOtp.join(''));
                      setError('');
                      // Auto-focus next input
                      if (val && idx < 3) {
                        const nextInput = e.target.nextElementSibling;
                        if (nextInput) nextInput.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
                        const prevInput = e.target.previousElementSibling;
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    className="w-16 h-20 bg-gray-100 rounded-2xl text-center text-3xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            {/* Verify Button */}
            <button
              onClick={handleVerifyOTP}
              disabled={isLoading || otp.length !== 4}
              className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-colors ${
                otp.length === 4
                  ? 'bg-[#FF5A00] text-white active:bg-[#FF5A00]/80'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  Vérifier
                  <Shield className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Resend */}
            <button
              onClick={() => setStep('phone')}
              className="w-full py-3 text-[#FF5A00] font-medium"
            >
              Modifier le numéro
            </button>
          </div>
        )}

        {/* Help text */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Vous n'avez pas de compte ?
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Inscrivez-vous via l'app client ACTOOS ONE
          </p>
        </div>
      </div>
    </div>
  );
}
