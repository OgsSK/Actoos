import { useState, useRef, useEffect } from 'react';

export function OTPInput({ length = 4, value, onChange, disabled = false }) {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus sur le premier input au montage
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    // Sync avec la valeur externe
    if (value) {
      const valueArray = value.split('').slice(0, length);
      const newOtp = [...new Array(length).fill('')];
      valueArray.forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
    }
  }, [value, length]);

  const handleChange = (e, index) => {
    const val = e.target.value;
    
    // Accepter seulement les chiffres
    if (val && !/^\d+$/.test(val)) return;

    // Prendre le dernier caractère si plusieurs sont collés
    const digit = val.slice(-1);
    
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    
    // Notifier le parent
    onChange(newOtp.join(''));

    // Auto-focus sur le prochain input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    // Backspace : effacer et revenir en arrière
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      }
    }
    
    // Flèches gauche/droite
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      const newOtp = [...new Array(length).fill('')];
      pastedData.split('').forEach((char, i) => {
        newOtp[i] = char;
      });
      setOtp(newOtp);
      onChange(newOtp.join(''));
      
      // Focus sur le dernier champ rempli ou le suivant
      const nextIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="flex justify-center gap-3" data-testid="otp-input">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={handlePaste}
          disabled={disabled}
          className={`w-14 h-14 text-center text-2xl font-bold rounded-2xl border-2 outline-none transition-all ${
            disabled
              ? 'bg-gray-100 border-gray-200 text-gray-400'
              : digit
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-primary focus:bg-white'
          }`}
          data-testid={`otp-digit-${index}`}
        />
      ))}
    </div>
  );
}
