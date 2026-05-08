/**
 * ACTOOS ONE - Mobile Money Payment Sheet
 * 
 * Interface de paiement via Orange Money, Moov Money, etc.
 */

import { useState, useEffect } from 'react';
import { 
  X, 
  Phone, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Shield
} from 'lucide-react';
import {
  initiatePayment,
  checkPaymentStatus,
  detectPaymentMethod,
  validateMobileMoneyNumber,
  getTransactionFees,
  simulatePaymentConfirmation,
  isTouchPayConfigured,
  PAYMENT_METHODS
} from '../services/touchPayService';
import { systemConfig } from '../data/mockData';

export function MobileMoneyPaymentSheet({ 
  isOpen, 
  onClose, 
  amount, 
  orderId,
  onSuccess,
  onError
}) {
  const [step, setStep] = useState('phone'); // phone, confirm, processing, success, error
  const [phoneNumber, setPhoneNumber] = useState('+223 ');
  const [detectedMethod, setDetectedMethod] = useState(null);
  const [transactionId, setTransactionId] = useState(null);
  const [error, setError] = useState('');
  const [pollingCount, setPollingCount] = useState(0);
  const [fees, setFees] = useState({ fee: 0, total: amount });

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep('phone');
      setPhoneNumber('+223 ');
      setDetectedMethod(null);
      setTransactionId(null);
      setError('');
      setPollingCount(0);
      setFees({ fee: 0, total: amount });
    }
  }, [isOpen, amount]);

  // Détecter l'opérateur quand le numéro change
  useEffect(() => {
    const method = detectPaymentMethod(phoneNumber);
    setDetectedMethod(method);
    
    if (method) {
      const newFees = getTransactionFees(amount, method);
      setFees(newFees);
    }
  }, [phoneNumber, amount]);

  // Formatter le numéro pendant la saisie
  const handlePhoneChange = (e) => {
    let value = e.target.value;
    
    // Garder le préfixe +223
    if (!value.startsWith('+223')) {
      value = '+223 ' + value.replace(/[^\d]/g, '');
    }
    
    // Formatter: +223 XX XX XX XX
    const digits = value.replace(/[^\d]/g, '').slice(3, 11);
    const formatted = '+223 ' + digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    
    setPhoneNumber(formatted);
  };

  // Valider et passer à la confirmation
  const handleContinue = () => {
    const validation = validateMobileMoneyNumber(phoneNumber);
    
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    setError('');
    setStep('confirm');
  };

  // Initier le paiement
  const handlePay = async () => {
    setStep('processing');
    setError('');

    try {
      const result = await initiatePayment({
        orderId,
        amount: fees.total,
        phoneNumber,
        description: `Commande ACTOOS #${orderId?.slice(-6) || '000000'}`
      });

      if (result.success) {
        setTransactionId(result.transactionId);
        
        // Si mode démo, simuler la confirmation après un délai
        if (result.isDemo || !isTouchPayConfigured()) {
          setTimeout(async () => {
            const confirmation = await simulatePaymentConfirmation(result.transactionId);
            if (confirmation.status === 'completed') {
              setStep('success');
              setTimeout(() => {
                onSuccess?.({
                  transactionId: result.transactionId,
                  amount: fees.total,
                  method: detectedMethod
                });
              }, 2000);
            }
          }, 3000);
        } else {
          // Sinon, démarrer le polling du statut
          pollPaymentStatus(result.transactionId);
        }
      } else {
        setError(result.error || 'Erreur lors du paiement');
        setStep('error');
      }
    } catch (err) {
      setError(err.message || 'Erreur inattendue');
      setStep('error');
    }
  };

  // Vérifier le statut du paiement périodiquement
  const pollPaymentStatus = async (txId) => {
    const maxPolls = 30; // 60 secondes max
    let count = 0;

    const poll = async () => {
      if (count >= maxPolls) {
        setError('Délai de paiement dépassé. Veuillez réessayer.');
        setStep('error');
        return;
      }

      const status = await checkPaymentStatus(txId);
      setPollingCount(count + 1);

      if (status.status === 'completed') {
        setStep('success');
        setTimeout(() => {
          onSuccess?.({
            transactionId: txId,
            amount: fees.total,
            method: detectedMethod,
            paidAt: status.paidAt
          });
        }, 2000);
        return;
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        setError(status.message || 'Paiement échoué');
        setStep('error');
        return;
      }

      // Continuer le polling
      count++;
      setTimeout(poll, 2000);
    };

    poll();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={step === 'processing' ? undefined : onClose}
      />
      
      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md mx-4 mb-0 md:mb-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {step === 'success' ? 'Paiement réussi' : 'Paiement Mobile Money'}
          </h2>
          {step !== 'processing' && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Step: Phone Number */}
          {step === 'phone' && (
            <div className="space-y-4">
              <p className="text-gray-600">
                Entrez votre numéro mobile money pour payer
              </p>
              
              {/* Phone Input */}
              <div>
                <label className="text-sm text-gray-500 mb-1 block">
                  Numéro de téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={handlePhoneChange}
                    placeholder="+223 XX XX XX XX"
                    className="w-full pl-12 pr-4 py-4 bg-gray-100 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                    data-testid="phone-input"
                  />
                  {detectedMethod && (
                    <div 
                      className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: `${detectedMethod.color}20`, color: detectedMethod.color }}
                    >
                      {detectedMethod.icon} {detectedMethod.name}
                    </div>
                  )}
                </div>
                {error && (
                  <p className="text-red-500 text-sm mt-1">{error}</p>
                )}
              </div>

              {/* Payment Methods */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Méthodes supportées</p>
                <div className="flex gap-2">
                  {Object.values(PAYMENT_METHODS).map((method) => (
                    <div
                      key={method.id}
                      className={`flex-1 p-3 rounded-xl text-center text-sm ${
                        detectedMethod?.id === method.id 
                          ? 'ring-2 ring-[#FF5A00] bg-orange-50' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-xl">{method.icon}</span>
                      <p className="text-xs text-gray-600 mt-1">{method.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Amount */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Montant</span>
                  <span className="font-medium">{amount.toLocaleString()} {systemConfig.currency}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">Frais ({fees.rate || 0}%)</span>
                  <span className="font-medium">{fees.fee.toLocaleString()} {systemConfig.currency}</span>
                </div>
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                  <span className="font-medium text-gray-900">Total</span>
                  <span className="font-bold text-[#FF5A00]">
                    {fees.total.toLocaleString()} {systemConfig.currency}
                  </span>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={handleContinue}
                disabled={!detectedMethod}
                className={`w-full py-4 rounded-xl font-semibold transition-colors ${
                  detectedMethod
                    ? 'bg-[#FF5A00] text-white active:bg-[#E55100]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                data-testid="continue-btn"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="text-center">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${detectedMethod?.color}20` }}
                >
                  <span className="text-3xl">{detectedMethod?.icon}</span>
                </div>
                <p className="font-bold text-gray-900">
                  Confirmer le paiement
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  via {detectedMethod?.name}
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Numéro</span>
                  <span className="font-medium">{phoneNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Montant total</span>
                  <span className="font-bold text-[#FF5A00]">
                    {fees.total.toLocaleString()} {systemConfig.currency}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 text-sm text-gray-500">
                <Shield className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p>
                  Vous recevrez une demande de confirmation sur votre téléphone. 
                  Entrez votre code PIN pour valider.
                </p>
              </div>

              {!isTouchPayConfigured() && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700">
                  <strong>Mode démo</strong> - Le paiement sera simulé
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('phone')}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                >
                  Modifier
                </button>
                <button
                  onClick={handlePay}
                  className="flex-1 py-4 bg-[#FF5A00] text-white rounded-xl font-semibold flex items-center justify-center gap-2"
                  data-testid="pay-btn"
                >
                  Payer
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Processing */}
          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Loader2 className="w-10 h-10 text-[#FF5A00] animate-spin" />
              </div>
              <p className="font-bold text-gray-900 text-lg">
                Confirmation en attente...
              </p>
              <p className="text-gray-500 mt-2">
                Vérifiez votre téléphone et entrez votre code PIN
              </p>
              <p className="text-sm text-gray-400 mt-4">
                {phoneNumber}
              </p>
              {pollingCount > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  Vérification... ({pollingCount}/30)
                </p>
              )}
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <p className="font-bold text-gray-900 text-lg">
                Paiement réussi !
              </p>
              <p className="text-gray-500 mt-2">
                Votre commande est confirmée
              </p>
              <p className="text-2xl font-bold text-[#FF5A00] mt-4">
                {fees.total.toLocaleString()} {systemConfig.currency}
              </p>
              {transactionId && (
                <p className="text-xs text-gray-400 mt-2">
                  Transaction: {transactionId}
                </p>
              )}
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <p className="font-bold text-gray-900 text-lg">
                Échec du paiement
              </p>
              <p className="text-gray-500 mt-2">
                {error || 'Une erreur est survenue'}
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={() => setStep('phone')}
                  className="flex-1 py-4 bg-[#FF5A00] text-white rounded-xl font-semibold"
                >
                  Réessayer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MobileMoneyPaymentSheet;
