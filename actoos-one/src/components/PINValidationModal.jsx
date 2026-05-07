import { useState, useRef, useEffect } from 'react';
import { X, Lock, AlertCircle } from 'lucide-react';

export function PINValidationModal({ isOpen, onClose, onValidate, isLoading = false }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (isOpen) {
      setPin(['', '', '', '']);
      setError('');
      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join('');
      if (fullPin.length === 4) {
        handleSubmit(fullPin);
      }
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (pinCode) => {
    const code = pinCode || pin.join('');
    if (code.length !== 4) {
      setError('Entrez un code à 4 chiffres');
      return;
    }

    try {
      const isValid = await onValidate(code);
      if (!isValid) {
        setError('Code PIN incorrect');
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Erreur de validation');
      setPin(['', '', '', '']);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" data-testid="pin-modal">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">Validation PIN</h2>
                <p className="text-sm text-gray-400">Entrez votre code secret</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* PIN Inputs */}
          <div className="flex justify-center gap-4 mb-6">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                className={`w-14 h-16 border-2 rounded-2xl text-center text-2xl font-bold outline-none transition-all ${
                  error
                    ? 'border-red-500 bg-red-50'
                    : digit
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-300 bg-gray-50'
                } ${isLoading ? 'opacity-50' : ''}`}
                data-testid={`pin-input-${index}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Info */}
          <p className="text-center text-sm text-gray-500 mb-6">
            Ce code protège vos transactions.<br />
            Ne le partagez jamais.
          </p>

          {/* Dev hint */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-xs text-yellow-700">
              <strong>Mode démo:</strong> PIN = <span className="font-mono bg-yellow-100 px-2 py-0.5 rounded">1234</span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
