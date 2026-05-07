import { useState, useEffect } from 'react';

export function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('logo'); // 'logo', 'pulse', 'slide'

  useEffect(() => {
    // Phase 1: Logo apparaît (déjà visible)
    const pulseTimer = setTimeout(() => {
      setPhase('pulse');
    }, 300);

    // Phase 2: Pulse + slide up
    const slideTimer = setTimeout(() => {
      setPhase('slide');
    }, 900);

    // Phase 3: Terminer
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 1500);

    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(slideTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-white flex items-center justify-center transition-transform duration-500 ease-out ${
        phase === 'slide' ? '-translate-y-full' : 'translate-y-0'
      }`}
      data-testid="splash-screen"
    >
      {/* Pulse rings */}
      <div className="relative">
        {/* Outer pulse ring */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-700 ${
            phase === 'pulse' || phase === 'slide'
              ? 'scale-[3] opacity-0' 
              : 'scale-100 opacity-0'
          }`}
          style={{
            width: '120px',
            height: '120px',
            marginLeft: '-10px',
            marginTop: '-10px',
            background: 'radial-gradient(circle, rgba(255, 90, 0, 0.3) 0%, rgba(255, 90, 0, 0) 70%)',
          }}
        />
        
        {/* Middle pulse ring */}
        <div 
          className={`absolute inset-0 rounded-full transition-all duration-500 delay-100 ${
            phase === 'pulse' || phase === 'slide'
              ? 'scale-[2.5] opacity-0' 
              : 'scale-100 opacity-0'
          }`}
          style={{
            width: '100px',
            height: '100px',
            background: 'radial-gradient(circle, rgba(255, 90, 0, 0.4) 0%, rgba(255, 90, 0, 0) 70%)',
          }}
        />

        {/* Logo "A" */}
        <div 
          className={`relative w-[100px] h-[100px] bg-[#FF5A00] rounded-3xl flex items-center justify-center shadow-xl transition-transform duration-300 ${
            phase === 'logo' ? 'scale-90' : 'scale-100'
          }`}
        >
          <span className="text-white text-6xl font-black tracking-tighter">A</span>
        </div>
      </div>

      {/* App name (appears after pulse) */}
      <div 
        className={`absolute bottom-20 transition-all duration-500 ${
          phase === 'pulse' || phase === 'slide'
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="text-[#FF5A00] font-bold text-2xl tracking-wide">ACTOOS ONE</p>
        <p className="text-gray-400 text-sm text-center mt-1">Tout. Tout de suite. Partout.</p>
      </div>
    </div>
  );
}
