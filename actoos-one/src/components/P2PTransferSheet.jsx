import { useState, useEffect } from 'react';
import { 
  X,
  Send,
  User,
  Phone,
  CheckCircle,
  Loader2,
  AlertCircle,
  Wallet,
  ArrowRight,
  Clock,
  Star
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { PINValidationModal } from './PINValidationModal';
import { systemConfig } from '../data/mockData';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

// Mock contacts récents
const RECENT_CONTACTS = [
  { id: 'contact-1', name: 'Mamadou D.', phone: '+223 70 12 34 56', initial: 'M' },
  { id: 'contact-2', name: 'Fatoumata K.', phone: '+223 66 98 76 54', initial: 'F' },
  { id: 'contact-3', name: 'Ibrahim S.', phone: '+223 76 55 44 33', initial: 'I' },
];

export function P2PTransferSheet({ isOpen, onClose }) {
  const { balance, transfer, isLoading } = useWallet();
  const [step, setStep] = useState('recipient'); // recipient, amount, pin, processing, success
  const [recipient, setRecipient] = useState({ phone: '+223 ', name: '' });
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [showPIN, setShowPIN] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [error, setError] = useState('');

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep('recipient');
        setRecipient({ phone: '+223 ', name: '' });
        setAmount('');
        setCustomAmount('');
        setError('');
        setTransferResult(null);
      }, 300);
    }
  }, [isOpen]);

  const getAmount = () => {
    if (amount) return parseInt(amount, 10);
    if (customAmount) return parseInt(customAmount, 10);
    return 0;
  };

  const handleSelectContact = (contact) => {
    setRecipient({ phone: contact.phone, name: contact.name });
    setStep('amount');
    setError('');
  };

  const handlePhoneSubmit = () => {
    const phone = recipient.phone.replace(/\s/g, '');
    if (phone.length < 12) {
      setError('Numéro de téléphone invalide');
      return;
    }
    setRecipient(prev => ({ ...prev, name: 'Utilisateur ACTOOS' }));
    setStep('amount');
    setError('');
  };

  const handleAmountSelect = (value) => {
    setAmount(String(value));
    setCustomAmount('');
    setError('');
  };

  const handleCustomAmountChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setCustomAmount(value);
    setAmount('');
    setError('');
  };

  const handleAmountSubmit = () => {
    const transferAmount = getAmount();
    if (transferAmount < 100) {
      setError('Montant minimum: 100 FCFA');
      return;
    }
    if (transferAmount > balance) {
      setError('Solde insuffisant');
      return;
    }
    setShowPIN(true);
  };

  const handlePINValidate = async (pin) => {
    // Mock PIN validation (1234)
    if (pin !== '1234') {
      return false;
    }

    setShowPIN(false);
    setStep('processing');

    try {
      const result = await transfer(
        recipient.phone,
        getAmount(),
        `Envoi à ${recipient.name || recipient.phone}`
      );
      
      setTransferResult(result);
      setStep('success');
      return true;
    } catch (err) {
      setError(err.message || 'Échec du transfert');
      setStep('amount');
      return true; // PIN was correct, transfer failed
    }
  };

  const handleClose = () => {
    if (step === 'processing') return;
    onClose();
  };

  if (!isOpen) return null;

  const transferAmount = getAmount();
  const isValidAmount = transferAmount >= 100 && transferAmount <= balance;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" data-testid="p2p-transfer-sheet">
        <div className="bg-white w-full max-w-lg rounded-t-3xl overflow-hidden animate-slide-up max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-primary text-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Envoyer de l'argent</h2>
                  <p className="text-sm text-white/80">
                    Solde: {balance.toLocaleString()} {systemConfig.currency}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
                disabled={step === 'processing'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* Step: Recipient */}
            {step === 'recipient' && (
              <>
                {/* Phone Input */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Numéro du destinataire
                  </label>
                  <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-4 py-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <input
                      type="tel"
                      value={recipient.phone}
                      onChange={(e) => setRecipient(prev => ({ ...prev, phone: e.target.value }))}
                      className="flex-1 bg-transparent outline-none text-gray-900 font-medium"
                      placeholder="+223 XX XX XX XX"
                      data-testid="recipient-phone"
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </p>
                  )}
                </div>

                <button
                  onClick={handlePhoneSubmit}
                  className="w-full bg-primary text-white font-semibold py-4 rounded-2xl mb-6"
                  data-testid="continue-to-amount"
                >
                  Continuer
                </button>

                {/* Recent Contacts */}
                <div>
                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Contacts récents
                  </p>
                  <div className="space-y-2">
                    {RECENT_CONTACTS.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectContact(contact)}
                        className="w-full bg-gray-50 rounded-2xl p-4 flex items-center gap-4 active:bg-gray-100 transition-colors"
                        data-testid={`contact-${contact.id}`}
                      >
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-primary font-bold text-lg">{contact.initial}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-500">{contact.phone}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step: Amount */}
            {step === 'amount' && (
              <>
                {/* Recipient Info */}
                <div className="bg-gray-50 rounded-2xl p-4 mb-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{recipient.name}</p>
                    <p className="text-sm text-gray-500">{recipient.phone}</p>
                  </div>
                  <button
                    onClick={() => setStep('recipient')}
                    className="text-primary text-sm font-medium"
                  >
                    Modifier
                  </button>
                </div>

                {/* Quick Amounts */}
                <p className="text-sm text-gray-500 mb-3">Montant à envoyer</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {QUICK_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(preset)}
                      className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                        amount === String(preset)
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
                    data-testid="custom-amount"
                  />
                  {customAmount && (
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      FCFA
                    </span>
                  )}
                </div>

                {/* Summary */}
                {isValidAmount && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Montant</span>
                      <span className="font-bold text-gray-900">{transferAmount.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-gray-600">Frais</span>
                      <span className="font-medium text-green-600">Gratuit</span>
                    </div>
                    <div className="border-t border-green-200 mt-3 pt-3 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">Total débité</span>
                      <span className="font-bold text-primary text-lg">{transferAmount.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-red-500 text-sm mb-4 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </p>
                )}

                <button
                  onClick={handleAmountSubmit}
                  disabled={!isValidAmount}
                  className={`w-full py-5 rounded-2xl font-bold text-lg transition-colors ${
                    isValidAmount
                      ? 'bg-primary text-white active:bg-primary/80'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  data-testid="confirm-transfer"
                >
                  Confirmer l'envoi
                </button>
              </>
            )}

            {/* Step: Processing */}
            {step === 'processing' && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Transfert en cours</h3>
                <p className="text-gray-500">Veuillez patienter...</p>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && transferResult && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Transfert réussi !</h3>
                
                <p className="text-3xl font-bold text-primary my-4">
                  {transferResult.amount.toLocaleString()} FCFA
                </p>
                
                <p className="text-gray-500 mb-6">
                  Envoyé à <strong>{transferResult.receiver_name}</strong>
                </p>

                <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Nouveau solde</span>
                    <span className="font-bold text-gray-900">{transferResult.new_balance.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Référence</span>
                    <span className="font-mono text-gray-600">{transferResult.transaction_id}</span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-primary text-white font-semibold py-4 rounded-2xl"
                >
                  Terminé
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PIN Modal */}
      <PINValidationModal
        isOpen={showPIN}
        onClose={() => setShowPIN(false)}
        onValidate={handlePINValidate}
        isLoading={isLoading}
      />

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
