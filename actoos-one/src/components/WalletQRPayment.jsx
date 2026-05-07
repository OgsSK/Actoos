import { useState, useEffect } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  X,
  Share2,
  Smartphone
} from 'lucide-react';
import { BottomSheet } from './BottomSheet';

/**
 * Generate QR Code for payment
 * In production, this would integrate with a real QR library
 */
function generateQRData(amount, userId, reference) {
  return {
    type: 'ACTOOS_PAY',
    amount,
    userId,
    reference,
    timestamp: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  };
}

export function PayQRCodeSheet({ isOpen, onClose, userId = 'user-001' }) {
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('amount'); // 'amount', 'qr', 'success'
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [copied, setCopied] = useState(false);

  // Reset state when sheet closes
  useEffect(() => {
    if (!isOpen) {
      setStep('amount');
      setAmount('');
      setQrData(null);
      setTimeLeft(900);
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (step === 'qr' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateQR = () => {
    if (!amount || parseInt(amount) < 100) return;
    
    const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;
    const data = generateQRData(parseInt(amount), userId, reference);
    setQrData(data);
    setStep('qr');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qrData.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simulate QR scan (in production, would listen for payment confirmation)
  const simulatePayment = () => {
    setStep('success');
    setTimeout(() => {
      onClose();
    }, 3000);
  };

  // Quick amount presets
  const presets = [500, 1000, 2000, 5000];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Payer">
      <div className="py-4">
        {step === 'amount' && (
          <>
            <p className="text-gray-500 mb-6 text-center">
              Générez un QR code pour recevoir un paiement en personne
            </p>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-sm text-gray-500 mb-2 block text-center">Montant à recevoir</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full text-4xl font-bold text-center text-gray-900 bg-gray-100 rounded-2xl py-6 outline-none focus:ring-2 focus:ring-[#FF5A00]"
                  data-testid="pay-amount-input"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl text-gray-400 font-medium">
                  FCFA
                </span>
              </div>
              {amount && parseInt(amount) < 100 && (
                <p className="text-xs text-red-500 text-center mt-2">Minimum 100 FCFA</p>
              )}
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {presets.map(preset => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset.toString())}
                  className={`py-3 rounded-xl font-medium text-sm ${
                    parseInt(amount) === preset
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {preset.toLocaleString()}
                </button>
              ))}
            </div>

            <button
              onClick={handleGenerateQR}
              disabled={!amount || parseInt(amount) < 100}
              className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 ${
                amount && parseInt(amount) >= 100
                  ? 'bg-[#FF5A00] text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
              data-testid="generate-qr-btn"
            >
              <QrCode className="w-5 h-5" />
              Générer le QR Code
            </button>
          </>
        )}

        {step === 'qr' && qrData && (
          <div className="text-center">
            {/* Timer */}
            <div className={`flex items-center justify-center gap-2 mb-4 ${
              timeLeft < 60 ? 'text-red-500' : 'text-gray-500'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">Expire dans {formatTime(timeLeft)}</span>
            </div>

            {/* QR Code Placeholder (would be real QR in production) */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 mb-6 inline-block">
              <div className="w-48 h-48 bg-gray-100 rounded-2xl flex items-center justify-center relative">
                {/* Simulated QR pattern */}
                <div className="absolute inset-4 grid grid-cols-8 gap-1">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-sm ${Math.random() > 0.5 ? 'bg-gray-900' : 'bg-white'}`}
                    />
                  ))}
                </div>
                {/* Center logo */}
                <div className="absolute bg-white p-2 rounded-xl shadow">
                  <span className="text-[#FF5A00] font-bold text-sm">ACTOOS</span>
                </div>
              </div>
            </div>

            {/* Amount */}
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {parseInt(amount).toLocaleString()} FCFA
            </p>

            {/* Reference Code */}
            <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500">Code référence</p>
                <p className="font-mono font-semibold text-gray-900">{qrData.reference}</p>
              </div>
              <button
                onClick={handleCopyCode}
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  copied ? 'bg-green-100' : 'bg-white'
                }`}
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-blue-700">
                <strong>Instructions:</strong> L'autre personne doit scanner ce QR code avec son app ACTOOS pour vous payer.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={simulatePayment}
                className="flex-1 py-4 bg-green-500 text-white rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <Smartphone className="w-5 h-5" />
                Simuler paiement
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Paiement reçu !</h3>
            <p className="text-3xl font-bold text-green-600 mb-4">
              +{parseInt(amount).toLocaleString()} FCFA
            </p>
            <p className="text-gray-500">Le montant a été crédité sur votre Wallet</p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// Scanner QR Code Sheet (Encaisser)
export function ScanQRCodeSheet({ isOpen, onClose, onPaymentConfirmed }) {
  const [step, setStep] = useState('scan'); // 'scan', 'confirm', 'pin', 'success'
  const [scannedData, setScannedData] = useState(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setStep('scan');
      setScannedData(null);
      setManualCode('');
    }
  }, [isOpen]);

  // Simulate scanning a QR code
  const simulateScan = () => {
    setScannedData({
      type: 'ACTOOS_PAY',
      amount: 2500,
      recipientName: 'Amadou Diallo',
      recipientPhone: '+223 70 12 34 56',
      reference: 'PAY-ABC123',
    });
    setStep('confirm');
  };

  const handleManualEntry = () => {
    if (manualCode.length >= 6) {
      // In production, would validate the code
      setScannedData({
        type: 'ACTOOS_PAY',
        amount: 1500,
        recipientName: 'Fatou Traoré',
        recipientPhone: '+223 70 98 76 54',
        reference: manualCode,
      });
      setStep('confirm');
    }
  };

  const handleConfirmPayment = () => {
    setStep('pin');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Scanner pour payer">
      <div className="py-4">
        {step === 'scan' && (
          <>
            {/* Camera preview placeholder */}
            <div className="bg-gray-900 rounded-2xl h-64 flex items-center justify-center mb-6 relative overflow-hidden">
              <div className="absolute inset-4 border-2 border-white/30 rounded-xl" />
              <div className="absolute w-48 h-48 border-2 border-[#FF5A00] rounded-xl animate-pulse" />
              <p className="text-white/60 text-sm">Caméra en cours d'activation...</p>
            </div>

            {/* Manual entry */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 text-center mb-3">
                Ou entrez le code manuellement
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="PAY-XXXXXX"
                  className="flex-1 bg-gray-100 rounded-xl px-4 py-3 font-mono text-center uppercase outline-none focus:ring-2 focus:ring-[#FF5A00]"
                  data-testid="manual-code-input"
                />
                <button
                  onClick={handleManualEntry}
                  disabled={manualCode.length < 6}
                  className={`px-6 rounded-xl font-semibold ${
                    manualCode.length >= 6
                      ? 'bg-[#FF5A00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  OK
                </button>
              </div>
            </div>

            {/* Simulate button (dev only) */}
            <button
              onClick={simulateScan}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
            >
              [DEV] Simuler un scan
            </button>
          </>
        )}

        {step === 'confirm' && scannedData && (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#FF5A00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-8 h-8 text-[#FF5A00]" />
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirmer le paiement</h3>
            <p className="text-gray-500 text-sm mb-6">Vérifiez les détails avant de payer</p>

            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Bénéficiaire</span>
                <span className="font-semibold text-gray-900">{scannedData.recipientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Téléphone</span>
                <span className="font-medium text-gray-700">{scannedData.recipientPhone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Référence</span>
                <span className="font-mono text-gray-700">{scannedData.reference}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="text-2xl font-bold text-[#FF5A00]">
                  {scannedData.amount.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                className="flex-1 py-4 bg-[#FF5A00] text-white rounded-2xl font-semibold"
                data-testid="confirm-payment-btn"
              >
                Payer
              </button>
            </div>
          </div>
        )}

        {step === 'pin' && (
          <WalletPINEntry
            onSuccess={() => {
              setStep('success');
              setTimeout(() => {
                if (onPaymentConfirmed) onPaymentConfirmed(scannedData);
                onClose();
              }, 2000);
            }}
            onCancel={() => setStep('confirm')}
          />
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Paiement effectué !</h3>
            <p className="text-gray-500">
              {scannedData?.amount?.toLocaleString()} FCFA envoyés à {scannedData?.recipientName}
            </p>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// PIN Entry Component
export function WalletPINEntry({ onSuccess, onCancel, title = "Entrez votre code PIN" }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Mock correct PIN (in production would verify against backend)
  const CORRECT_PIN = '1234';
  const MAX_ATTEMPTS = 3;

  const handleDigit = (digit) => {
    if (isBlocked) return;
    
    const newPin = [...pin];
    const emptyIndex = newPin.findIndex(d => d === '');
    if (emptyIndex !== -1) {
      newPin[emptyIndex] = digit;
      setPin(newPin);
      setError('');
      
      // Check if complete
      if (emptyIndex === 3) {
        const enteredPIN = newPin.join('');
        setTimeout(() => verifyPIN(enteredPIN), 300);
      }
    }
  };

  const handleDelete = () => {
    if (isBlocked) return;
    
    const newPin = [...pin];
    const lastFilledIndex = newPin.map((d, i) => d !== '' ? i : -1).filter(i => i !== -1).pop();
    if (lastFilledIndex !== undefined) {
      newPin[lastFilledIndex] = '';
      setPin(newPin);
    }
  };

  const verifyPIN = (enteredPIN) => {
    if (enteredPIN === CORRECT_PIN) {
      onSuccess();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsBlocked(true);
        setError('Wallet bloqué ! Trop de tentatives échouées.');
      } else {
        setError(`Code incorrect. ${MAX_ATTEMPTS - newAttempts} tentative(s) restante(s)`);
        setPin(['', '', '', '']);
      }
    }
  };

  return (
    <div className="text-center" data-testid="pin-entry">
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-6">
        {isBlocked 
          ? 'Contactez le support pour débloquer votre Wallet'
          : 'Code PIN à 4 chiffres'
        }
      </p>

      {/* PIN Dots */}
      <div className="flex justify-center gap-4 mb-6">
        {pin.map((digit, i) => (
          <div
            key={i}
            className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold ${
              isBlocked
                ? 'border-red-300 bg-red-50'
                : digit
                  ? 'border-[#FF5A00] bg-[#FF5A00]/10 text-[#FF5A00]'
                  : 'border-gray-200 bg-gray-50'
            }`}
          >
            {digit ? '•' : ''}
          </div>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className={`text-sm mb-4 ${isBlocked ? 'text-red-600 font-semibold' : 'text-red-500'}`}>
          {error}
        </p>
      )}

      {/* Dev hint */}
      <p className="text-xs text-gray-400 mb-4">[DEV] Code: 1234</p>

      {/* Keypad */}
      {!isBlocked && (
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((key, i) => (
            <button
              key={i}
              onClick={() => {
                if (key === 'del') handleDelete();
                else if (key !== null) handleDigit(key.toString());
              }}
              disabled={key === null}
              className={`h-14 rounded-xl font-semibold text-xl transition-colors ${
                key === null
                  ? 'invisible'
                  : key === 'del'
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-gray-100 text-gray-900 active:bg-gray-200'
              }`}
            >
              {key === 'del' ? '⌫' : key}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={onCancel}
        className="text-gray-500 font-medium"
      >
        Annuler
      </button>
    </div>
  );
}
