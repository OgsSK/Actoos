import { useState, useEffect } from 'react';

export function SplashScreen({ onComplete }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Animate in
    const showTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Start fade out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1400);

    // Complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-white flex items-center justify-center transition-opacity duration-400 ${
        isFading ? 'opacity-0' : 'opacity-100'
      }`}
      data-testid="splash-screen"
    >
      {/* ACTOOS ONE - Simple fade in + scale animation */}
      <h1 
        className={`font-black text-[#FF5A00] text-4xl tracking-tight transition-all duration-700 ease-out ${
          isVisible 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          letterSpacing: '-0.02em',
        }}
      >
        ACTOOS ONE
      </h1>
    </div>
  );
}
