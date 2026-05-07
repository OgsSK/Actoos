import { useState, useEffect } from 'react';

export function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('initial'); // 'initial', 'expand', 'fadeOut'

  useEffect(() => {
    // Phase 1: Initial state (text small, centered)
    const expandTimer = setTimeout(() => {
      setPhase('expand');
    }, 400);

    // Phase 2: Expand animation
    const fadeTimer = setTimeout(() => {
      setPhase('fadeOut');
    }, 1200);

    // Phase 3: Complete
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1800);

    return () => {
      clearTimeout(expandTimer);
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-white flex items-center justify-center transition-opacity duration-500 ${
        phase === 'fadeOut' ? 'opacity-0' : 'opacity-100'
      }`}
      data-testid="splash-screen"
    >
      {/* Centered ACTOOS ONE - Uber style animation */}
      <div className="flex flex-col items-center justify-center">
        {/* Animated background circle */}
        <div 
          className={`absolute rounded-full bg-[#FF5A00]/5 transition-all duration-700 ease-out ${
            phase === 'initial' 
              ? 'w-0 h-0 opacity-0' 
              : phase === 'expand'
                ? 'w-[300px] h-[300px] opacity-100'
                : 'w-[600px] h-[600px] opacity-0'
          }`}
        />
        
        {/* Inner pulse ring */}
        <div 
          className={`absolute rounded-full border-2 border-[#FF5A00]/20 transition-all duration-500 ease-out ${
            phase === 'initial' 
              ? 'w-0 h-0 opacity-0' 
              : phase === 'expand'
                ? 'w-[200px] h-[200px] opacity-100'
                : 'w-[400px] h-[400px] opacity-0'
          }`}
        />

        {/* Main text - ACTOOS ONE */}
        <h1 
          className={`relative font-black text-[#FF5A00] tracking-tight transition-all duration-500 ease-out ${
            phase === 'initial' 
              ? 'text-3xl scale-90 opacity-0' 
              : phase === 'expand'
                ? 'text-4xl scale-100 opacity-100'
                : 'text-5xl scale-110 opacity-0'
          }`}
          style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            letterSpacing: '-0.02em',
          }}
        >
          ACTOOS ONE
        </h1>

        {/* Subtle loading indicator */}
        <div 
          className={`mt-8 flex gap-1 transition-opacity duration-300 ${
            phase === 'expand' ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-[#FF5A00] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
