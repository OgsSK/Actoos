import { useState, useEffect } from 'react';
import { 
  X,
  Send,
  User,
  Phone,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Clock,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';
import { PINValidationModal } from './PINValidationModal';
import { systemConfig } from '../data/mockData';
import { verifyPin, hasPin } from '../services/pinService';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

// Contacts récents stockés localement
const getRecentContacts = () => {
  try {
    return JSON.parse(localStorage.getItem('actoos_recent_contacts') || '[]');
  } catch {
    return [];
  }
};

const saveRecentContact = (contact) => {
  const contacts = getRecentContacts();
  const exists = contacts.findIndex(c => c.phone === contact.phone);
  if (exists >= 0) {
    contacts.splice(exists, 1);
  }
  contacts.unshift(contact);
  localStorage.setItem('actoos_recent_contacts', JSON.stringify(contacts.slice(0, 10)));
};

export function P2PTransferSheet({ isOpen, onClose }) {
  const { balance, transfer, checkRecipient, isLoading } = useWallet();
  const { user } = useAuth();
  const [step, setStep] = useState('recipient'); // recipient, amount, pin, processing, success
  const [recentContacts, setRecentContacts] = useState([]);
  const [recipient, setRecipient] = useState({ phone: '+223 ', name: '', isRegistered: null });
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
        setRecipient({ phone: '+223 ', name: '', isRegistered: null });
        setAmount('');
        setCustomAmount('');
        setError('');
        setTransferResult(null);
      }, 300);
    } else {
      // Charger les contacts récents
      setRecentContacts(getRecentContacts());
    }
  }, [isOpen]);

  const getAmount = () => {
    if (amount) return parseInt(amount, 10);
    if (customAmount) return parseInt(customAmount, 10);
    return 0;
  };

  const handleSelectContact = (contact) => {
    // Vérifier si inscrit
    const check = checkRecipient(contact.phone);
    setRecipient({ 
      phone: contact.phone, 
      name: check.isRegistered ? check.user.name : contact.name,
      isRegistered: check.isRegistered 
    });
    setStep('amount');
    setError('');
  };

  const handlePhoneSubmit = () => {
    const phone = recipient.phone.replace(/\s/g, '');
    if (phone.length < 12) {
      setError('Numéro de téléphone invalide');
      return;
    }
    
    // Vérifier si le destinataire est inscrit
    const check = checkRecipient(phone);
    setRecipient(prev => ({ 
      ...prev, 
      name: check.isRegistered ? check.user.name : null,
      isRegistered: check.isRegistered 
    }));
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
    // Vérification du PIN via Supabase
    if (user?.id) {
      const result = await verifyPin(user.id, pin);
      if (!result.valid) {
        setError(result.error || 'PIN incorrect');
        return false;
      }
    } else {
      // Fallback pour utilisateurs non connectés (ne devrait pas arriver)
      if (pin !== '1234') {
        setError('PIN incorrect');
        return false;
      }
    }

    setShowPIN(false);
    setStep('processing');

    try {
      const result = await transfer(
        recipient.phone,
        getAmount(),
        `Envoi à ${recipient.name || recipient.phone}`
      );
      
      // Sauvegarder le contact
      saveRecentContact({
        id: `contact-${Date.now()}`,
        name: recipient.name || 'Inconnu',
        phone: recipient.phone,
        initial: (recipient.name || recipient.phone)[0].toUpperCase()
      });
      
      setTransferResult(result);
      setStep('success');
      return true;
    } catch (err) {
      setError(err.message || 'Échec du transfert');
      setStep('amount');
      return true;
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
          <div className="bg-[#FF5A00] text-white px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-[#FF5A00]" />
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
                  className="w-full bg-[#FF5A00] text-white font-semibold py-4 rounded-2xl mb-6"
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
                    {recentContacts.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        Aucun contact récent
                      </p>
                    ) : (
                      recentContacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => handleSelectContact(contact)}
                          className="w-full bg-gray-50 rounded-2xl p-4 flex items-center gap-4 active:bg-gray-100 transition-colors"
                          data-testid={`contact-${contact.id}`}
                        >
                          <div className="w-12 h-12 bg-[#FF5A00]/10 rounded-full flex items-center justify-center">
                            <span className="text-[#FF5A00] font-bold text-lg">{contact.initial}</span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-gray-900">{contact.name}</p>
                            <p className="text-sm text-gray-500">{contact.phone}</p>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step: Amount */}
            {step === 'amount' && (
              <>
                {/* Recipient Info */}
                <div className={`rounded-2xl p-4 mb-6 flex items-center gap-4 ${
                  recipient.isRegistered ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    recipient.isRegistered ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {recipient.isRegistered ? (
                      <User className="w-6 h-6 text-green-600" />
                    ) : (
                      <UserPlus className="w-6 h-6 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    {recipient.isRegistered ? (
                      <>
                        <p className="font-semibold text-gray-900">{recipient.name}</p>
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Utilisateur ACTOOS
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-gray-900">{recipient.phone}</p>
                        <p className="text-sm text-yellow-700">
                          Non inscrit - recevra un SMS
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setStep('recipient')}
                    className="text-[#FF5A00] text-sm font-medium"
                  >
                    Modifier
                  </button>
                </div>

                {/* Info pour non-inscrit */}
                {!recipient.isRegistered && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-blue-900 font-medium">Transfert viral</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Le destinataire recevra un SMS avec un lien pour télécharger ACTOOS et récupérer son argent.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Amounts */}
                <p className="text-sm text-gray-500 mb-3">Montant à envoyer</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {QUICK_AMOUNTS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(preset)}
                      className={`py-4 rounded-2xl font-bold text-lg transition-all ${
                        amount === String(preset)
                          ? 'bg-[#FF5A00] text-white ring-2 ring-[#FF5A00] ring-offset-2'
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
                      customAmount ? 'ring-2 ring-[#FF5A00]' : ''
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
                      <span className="font-bold text-[#FF5A00] text-lg">{transferAmount.toLocaleString()} FCFA</span>
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
                      ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
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
                <div className="w-20 h-20 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Loader2 className="w-10 h-10 text-[#FF5A00] animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Transfert en cours</h3>
                <p className="text-gray-500">Veuillez patienter...</p>
              </div>
            )}

            {/* Step: Success */}
            {step === 'success' && transferResult && (
              <div className="text-center py-8">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                  transferResult.is_pending_registration ? 'bg-yellow-100' : 'bg-green-100'
                }`}>
                  {transferResult.is_pending_registration ? (
                    <MessageSquare className="w-10 h-10 text-yellow-600" />
                  ) : (
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {transferResult.is_pending_registration ? 'SMS envoyé !' : 'Transfert réussi !'}
                </h3>
                
                <p className="text-3xl font-bold text-[#FF5A00] my-4">
                  {transferResult.amount.toLocaleString()} FCFA
                </p>
                
                {transferResult.is_pending_registration ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-left mb-6">
                    <p className="text-yellow-800 text-sm font-medium mb-2">
                      Le destinataire n'est pas encore sur ACTOOS
                    </p>
                    <p className="text-yellow-700 text-xs">
                      Un SMS a été envoyé à <strong>{transferResult.receiver_phone}</strong> avec un lien pour télécharger l'app et récupérer les fonds.
                    </p>
                    <div className="mt-3 bg-white rounded-xl p-3 border border-yellow-200">
                      <p className="text-xs text-gray-500 mb-1">Aperçu du SMS:</p>
                      <p className="text-sm text-gray-700 italic">"{transferResult.sms_preview}"</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 mb-6">
                    Envoyé à <strong>{transferResult.receiver_name}</strong>
                  </p>
                )}

                <div className="bg-gray-50 rounded-2xl p-4 text-left mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Nouveau solde</span>
                    <span className="font-bold text-gray-900">{transferResult.new_balance.toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Référence</span>
                    <span className="font-mono text-gray-600">{transferResult.transaction_id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-gray-500">Statut</span>
                    <span className={`font-medium ${
                      transferResult.is_pending_registration ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {transferResult.is_pending_registration ? 'En attente d\'inscription' : 'Terminé'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="w-full bg-[#FF5A00] text-white font-semibold py-4 rounded-2xl"
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

      <style>{`
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
