/**
 * ACTOOS ONE - Wallet QR Payment
 * 
 * PRODUCTION-READY:
 * - PayQRCodeSheet: Génère un VRAI QR code avec qrcode.react
 * - ScanQRCodeSheet: Scanner RÉEL avec html5-qrcode
 */

import { useState, useEffect, useRef } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  X,
  Camera,
  Keyboard,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { BottomSheet } from './BottomSheet';
import { useWallet } from '../context/WalletContext';
import { useAuth } from '../context/AuthContext';

/**
 * Génère les données du QR code pour le paiement
 */
function generateQRPaymentData(amount, userId, userName, reference) {
  return JSON.stringify({
    type: 'ACTOOS_PAY',
    version: 1,
    amount: amount,
    userId: userId,
    userName: userName || 'Utilisateur ACTOOS',
    reference: reference,
    timestamp: Date.now(),
    expiresAt: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
}

/**
 * Parse les données d'un QR code scanné
 */
function parseQRPaymentData(qrString) {
  try {
    const data = JSON.parse(qrString);
    if (data.type !== 'ACTOOS_PAY') {
      throw new Error('QR code non valide pour ACTOOS Pay');
    }
    if (data.expiresAt && data.expiresAt < Date.now()) {
      throw new Error('Ce QR code a expiré');
    }
    return data;
  } catch (err) {
    if (err.message.includes('ACTOOS') || err.message.includes('expiré')) {
      throw err;
    }
    throw new Error('QR code invalide');
  }
}

// ============================================
// ENCAISSER - Génère un QR code pour recevoir
// ============================================
export function PayQRCodeSheet({ isOpen, onClose, userId = 'user-001' }) {
  const { user, profile } = useAuth();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState('amount'); // 'amount', 'qr', 'success'
  const [qrData, setQrData] = useState(null);
  const [reference, setReference] = useState('');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes
  const [copied, setCopied] = useState(false);

  // Reset quand fermé
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
    
    const ref = `PAY-${Date.now().toString(36).toUpperCase()}`;
    setReference(ref);
    
    const data = generateQRPaymentData(
      parseInt(amount),
      user?.id || userId,
      profile?.name || user?.email,
      ref
    );
    setQrData(data);
    setStep('qr');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const presets = [500, 1000, 2000, 5000];

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Encaisser un paiement">
      <div className="py-4">
        {step === 'amount' && (
          <>
            <p className="text-gray-500 mb-6 text-center">
              Générez un QR code pour recevoir un paiement
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
                  data-testid="encaisser-amount-input"
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

            {/* VRAI QR Code */}
            <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 mb-6 inline-block">
              <QRCodeSVG 
                value={qrData}
                size={200}
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/logo192.png",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            {/* Amount */}
            <p className="text-3xl font-bold text-gray-900 mb-2">
              {parseInt(amount).toLocaleString()} FCFA
            </p>

            {/* Reference Code */}
            <div className="bg-gray-100 rounded-xl px-4 py-3 flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500">Code référence</p>
                <p className="font-mono font-semibold text-gray-900">{reference}</p>
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

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
            >
              Fermer
            </button>
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

// ============================================
// PAYER - Scanner un QR code pour payer
// ============================================
export function ScanQRCodeSheet({ isOpen, onClose, onPaymentConfirmed }) {
  const { balance, pay, hasEnoughBalance } = useWallet();
  const [step, setStep] = useState('scan'); // 'scan', 'confirm', 'pin', 'processing', 'success', 'error'
  const [scannedData, setScannedData] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [inputMode, setInputMode] = useState('camera'); // 'camera', 'manual'
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // Cleanup scanner on close
  useEffect(() => {
    if (!isOpen) {
      setStep('scan');
      setScannedData(null);
      setManualCode('');
      setError('');
      setInputMode('camera');
      setIsScanning(false);
      
      // Cleanup scanner instance
      if (scannerInstanceRef.current) {
        try {
          scannerInstanceRef.current.clear();
        } catch (e) {
          console.log('Scanner already cleared');
        }
        scannerInstanceRef.current = null;
      }
    }
  }, [isOpen]);

  // Initialize scanner when in camera mode
  useEffect(() => {
    if (isOpen && step === 'scan' && inputMode === 'camera' && scannerRef.current && !scannerInstanceRef.current) {
      setIsScanning(true);
      
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          // Success callback
          try {
            const data = parseQRPaymentData(decodedText);
            setScannedData(data);
            setStep('confirm');
            scanner.clear();
            scannerInstanceRef.current = null;
          } catch (err) {
            setError(err.message);
          }
        },
        (errorMessage) => {
          // Error callback - ignore continuous scan errors
          if (!errorMessage.includes('No QR code found')) {
            console.log('Scan error:', errorMessage);
          }
        }
      );

      scannerInstanceRef.current = scanner;
      setIsScanning(false);
    }

    return () => {
      if (scannerInstanceRef.current && step !== 'scan') {
        try {
          scannerInstanceRef.current.clear();
        } catch (e) {}
        scannerInstanceRef.current = null;
      }
    };
  }, [isOpen, step, inputMode]);

  const handleManualEntry = () => {
    if (manualCode.length < 6) return;
    
    // Pour le mode manuel, on recherche dans Supabase ou on affiche une erreur
    // En production, ceci ferait un appel API pour valider le code
    setError('Code manuel non trouvé. Veuillez scanner le QR code directement.');
  };

  const handleConfirmPayment = () => {
    if (!hasEnoughBalance(scannedData.amount)) {
      setError('Solde insuffisant');
      return;
    }
    setStep('pin');
  };

  const handlePINSuccess = async () => {
    setStep('processing');
    setError('');

    try {
      // Effectuer le paiement via le wallet
      await pay(
        scannedData.amount,
        scannedData.reference,
        `Paiement à ${scannedData.userName || 'Utilisateur'}`
      );

      setStep('success');
      
      setTimeout(() => {
        if (onPaymentConfirmed) {
          onPaymentConfirmed(scannedData);
        }
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors du paiement');
      setStep('error');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Payer avec QR">
      <div className="py-4">
        {step === 'scan' && (
          <>
            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setInputMode('camera')}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  inputMode === 'camera'
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Camera className="w-4 h-4" />
                Scanner
              </button>
              <button
                onClick={() => {
                  setInputMode('manual');
                  if (scannerInstanceRef.current) {
                    try {
                      scannerInstanceRef.current.clear();
                    } catch (e) {}
                    scannerInstanceRef.current = null;
                  }
                }}
                className={`flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
                  inputMode === 'manual'
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                Code manuel
              </button>
            </div>

            {inputMode === 'camera' ? (
              <>
                {/* Scanner container */}
                <div 
                  id="qr-reader" 
                  ref={scannerRef}
                  className="rounded-2xl overflow-hidden mb-4"
                  style={{ width: '100%' }}
                />
                
                {isScanning && (
                  <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Initialisation de la caméra...</span>
                  </div>
                )}

                <p className="text-center text-sm text-gray-500">
                  Pointez la caméra vers le QR code du bénéficiaire
                </p>
              </>
            ) : (
              <>
                {/* Manual entry */}
                <div className="mb-6">
                  <p className="text-sm text-gray-500 text-center mb-3">
                    Entrez le code référence du bénéficiaire
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
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 mt-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
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
                <span className="font-semibold text-gray-900">{scannedData.userName || 'Utilisateur'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Référence</span>
                <span className="font-mono text-gray-700">{scannedData.reference}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex justify-between">
                <span className="text-gray-500">Montant</span>
                <span className="text-2xl font-bold text-[#FF5A00]">
                  {scannedData.amount?.toLocaleString()} FCFA
                </span>
              </div>
            </div>

            {/* Balance check */}
            {!hasEnoughBalance(scannedData.amount) && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-left">
                <p className="text-sm text-red-700">
                  <strong>Solde insuffisant.</strong> Votre solde: {balance?.toLocaleString()} FCFA
                </p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmPayment}
                disabled={!hasEnoughBalance(scannedData.amount)}
                className={`flex-1 py-4 rounded-2xl font-semibold ${
                  hasEnoughBalance(scannedData.amount)
                    ? 'bg-[#FF5A00] text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
                data-testid="confirm-payment-btn"
              >
                Payer
              </button>
            </div>
          </div>
        )}

        {step === 'pin' && (
          <WalletPINEntry
            onSuccess={handlePINSuccess}
            onCancel={() => setStep('confirm')}
          />
        )}

        {step === 'processing' && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-[#FF5A00] animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Traitement du paiement...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Paiement effectué !</h3>
            <p className="text-gray-500">
              {scannedData?.amount?.toLocaleString()} FCFA envoyés à {scannedData?.userName}
            </p>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Échec du paiement</h3>
            <p className="text-red-500 mb-6">{error}</p>
            <button
              onClick={() => setStep('confirm')}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

// ============================================
// PIN Entry Component
// ============================================
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
