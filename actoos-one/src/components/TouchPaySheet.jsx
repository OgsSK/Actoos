import { useState } from 'react';
import { 
  X,
  CreditCard,
  Smartphone,
  CheckCircle,
  Loader2,
  Wallet
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

export function TouchPaySheet({ isOpen, onClose, onSuccess, minimumAmount = 0 }) {
  const { topUp, isLoading, balance } = useWallet();
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState('select'); // select, processing, success
  const [phoneNumber, setPhoneNumber] = useState('+223 ');

  const getAmount = () => {
    if (selectedAmount) return selectedAmount;
    if (customAmount) return parseInt(customAmount, 10);
    return 0;
  };

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSubmit = async () => {
    const amount = getAmount();
    if (amount < 500) {
      alert('Montant minimum: 500 FCFA');
      return;
    }

    setStep('processing');
    
    try {
      await topUp(amount, 'touchpay');
      setStep('success');
      
      setTimeout(() => {
        if (onSuccess) {
          onSuccess(amount);
        }
        handleClose();
      }, 2000);
    } catch (error) {
      alert('Erreur lors de la recharge. Veuillez réessayer.');
      setStep('select');
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedAmount(null);
    setCustomAmount('');
    setPhoneNumber('+223 ');
    onClose();
  };

  if (!isOpen) return null;

  const amount = getAmount();
  const isValidAmount = amount >= 500;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" data-testid="touchpay-sheet">
      <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg">TouchPay</h2>
                <p className="text-sm text-blue-100">Recharge sécurisée</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <>
              {minimumAmount > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-yellow-800">
                    <strong>Solde actuel:</strong> {balance.toLocaleString()} FCFA
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    <strong>Minimum requis:</strong> {minimumAmount.toLocaleString()} FCFA
                  </p>
                </div>
              )}

              {/* Preset Amounts */}
              <p className="text-sm text-gray-500 mb-3">Choisissez un montant</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAmountSelect(preset)}
                    className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                      selectedAmount === preset
                        ? 'bg-primary text-white ring-2 ring-primary ring-offset-2'
                        : 'bg-gray-100 text-gray-900 active:bg-gray-200'
                    }`}
                    data-testid={`amount-${preset}`}
                  >
                    {preset.toLocaleString()} F
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="relative mb-6">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Autre montant"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={`w-full bg-gray-100 rounded-2xl px-4 py-4 text-lg font-semibold text-center outline-none transition-all ${
                    customAmount ? 'ring-2 ring-primary' : ''
                  }`}
                  data-testid="custom-amount-input"
                />
                {customAmount && (
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    FCFA
                  </span>
                )}
              </div>

              {/* Phone Number */}
              <p className="text-sm text-gray-500 mb-2">Numéro de téléphone</p>
              <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3 mb-6">
                <Smartphone className="w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-900 font-medium"
                  placeholder="+223 XX XX XX XX"
                  data-testid="phone-input"
                />
              </div>

              {/* Summary */}
              {isValidAmount && (
                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Montant à recharger</span>
                    <span className="font-bold text-gray-900 text-lg">{amount.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-500">Frais TouchPay</span>
                    <span className="font-medium text-green-600">Gratuit</span>
                  </div>
                  <div className="border-t border-gray-200 mt-3 pt-3 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Nouveau solde</span>
                    <span className="font-bold text-primary text-lg">{(balance + amount).toLocaleString()} FCFA</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!isValidAmount || isLoading}
                className={`w-full py-5 rounded-2xl font-bold text-lg transition-colors ${
                  isValidAmount
                    ? 'bg-primary text-white active:bg-primary/80'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                data-testid="confirm-topup-btn"
              >
                Confirmer la recharge
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                🔒 Paiement sécurisé par TouchPay Mali
              </p>
            </>
          )}

          {step === 'processing' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Traitement en cours</h3>
              <p className="text-gray-500">Veuillez patienter...</p>
              <p className="text-sm text-gray-400 mt-4">
                Vous recevrez un SMS de confirmation TouchPay
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Recharge réussie !</h3>
              <p className="text-3xl font-bold text-primary mt-4">
                +{amount.toLocaleString()} FCFA
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
                <Wallet className="w-5 h-5" />
                <span>Nouveau solde: {(balance).toLocaleString()} FCFA</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
