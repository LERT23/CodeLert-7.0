import React, { useState, useEffect } from 'react';

export const LoadingScreen: React.FC<{ progress?: number; onComplete?: () => void; isLightTheme?: boolean }> = ({ 
  progress: propProgress, 
  onComplete, 
  isLightTheme = false 
}) => {
  const [internalProgress, setInternalProgress] = useState(0);
  const logoUrl = isLightTheme ? 'https://i.postimg.cc/2ym1J8xp/lipinsky-sign.png' : 'https://i.postimg.cc/BbgjG9hG/lipinsky-sign-white.png';

  useEffect(() => {
    if (propProgress !== undefined) return;
    const startTime = Date.now();
    const duration = 3800;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Use smooth easeOutQuad curve for realistic loading momentum
      const rawP = Math.min(1, elapsed / duration);
      const easeP = 1 - Math.pow(1 - rawP, 2.5);
      const p = Math.min(100, easeP * 100);
      setInternalProgress(p);
      if (rawP >= 1) {
        clearInterval(interval);
        if (onComplete) setTimeout(onComplete, 250);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [onComplete, propProgress]);

  const progress = propProgress !== undefined ? propProgress : internalProgress;

  // Wave calculation for ship position
  const waveHeight = Math.sin((progress / 100) * Math.PI * 6) * 6;
  const shipTilt = Math.cos((progress / 100) * Math.PI * 6) * 12;

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-between z-[9999] text-white overflow-hidden select-none">
      
      {/* Dynamic Background Sea & Islands Scene */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Sky Ambient Gradient & Stars */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#070b19] via-[#0b162c] to-[#0d223a] opacity-95"></div>

        {/* Floating Clouds / Mist */}
        <div className="absolute top-12 left-[-10%] w-[120%] h-24 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent blur-2xl animate-pulse"></div>

        {/* Left Island with Mountains & Tropical Palms */}
        <svg 
          className="absolute bottom-16 -left-8 md:left-0 w-64 md:w-96 h-56 md:h-80 opacity-80" 
          viewBox="0 0 300 240" 
          fill="none"
        >
          {/* Distant mountain silhouette */}
          <path d="M0 240 L0 120 Q50 60 110 130 Q160 80 220 240 Z" fill="#0c1e33" opacity="0.6" />
          {/* Main island landmass */}
          <path d="M-20 240 L-20 150 Q40 100 130 160 Q190 190 240 240 Z" fill="#081422" />
          
          {/* Palm trees silhouettes on left island */}
          <g stroke="#050d17" strokeWidth="3" strokeLinecap="round" opacity="0.85">
            {/* Palm 1 */}
            <path d="M60 165 Q70 120 85 95" />
            <path d="M85 95 Q60 80 45 90" strokeWidth="2" />
            <path d="M85 95 Q80 70 70 70" strokeWidth="2" />
            <path d="M85 95 Q105 75 115 85" strokeWidth="2" />
            <path d="M85 95 Q110 105 105 115" strokeWidth="2" />
            
            {/* Palm 2 */}
            <path d="M120 175 Q135 140 145 120" />
            <path d="M145 120 Q125 105 110 115" strokeWidth="2" />
            <path d="M145 120 Q145 95 135 95" strokeWidth="2" />
            <path d="M145 120 Q165 105 175 115" strokeWidth="2" />
          </g>
          {/* Island beach glow line */}
          <path d="M0 240 Q100 190 240 240" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.25" />
        </svg>

        {/* Right Island with Lighthouse & Cliffs */}
        <svg 
          className="absolute bottom-16 -right-8 md:right-0 w-64 md:w-96 h-56 md:h-80 opacity-80" 
          viewBox="0 0 300 240" 
          fill="none"
        >
          {/* Distant mountain silhouette */}
          <path d="M300 240 L300 110 Q240 50 180 120 Q130 90 70 240 Z" fill="#0c1e33" opacity="0.6" />
          {/* Main island landmass */}
          <path d="M320 240 L320 140 Q250 90 160 170 Q100 200 60 240 Z" fill="#081422" />
          
          {/* Silhouette Lighthouse */}
          <rect x="230" y="85" width="14" height="40" fill="#060e18" rx="1" />
          <polygon points="228,85 246,85 237,72" fill="#060e18" />
          {/* Lighthouse beam effect */}
          <polygon points="237,78 0,0 0,60" fill="url(#beamGrad)" opacity="0.15" />
          <circle cx="237" cy="78" r="4" fill="#fef08a" className="animate-pulse" />
          
          {/* Palm trees on right island */}
          <g stroke="#050d17" strokeWidth="3" strokeLinecap="round" opacity="0.85">
            <path d="M170 180 Q160 145 150 125" />
            <path d="M150 125 Q130 110 120 120" strokeWidth="2" />
            <path d="M150 125 Q150 100 140 100" strokeWidth="2" />
            <path d="M150 125 Q170 110 180 120" strokeWidth="2" />
          </g>

          <defs>
            <linearGradient id="beamGrad" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#fef08a" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Animated Layered Waves (Back, Mid, Fore) */}
        {/* Layer 1: Back Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-36 opacity-30">
          <svg className="w-[200%] h-full animate-[wave_12s_linear_infinite]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,40 C150,80 350,0 500,40 C650,80 850,0 1000,40 C1150,80 1350,0 1500,40 L1500,120 L0,120 Z" fill="#0284c7" />
          </svg>
        </div>

        {/* Layer 2: Mid Wave */}
        <div className="absolute bottom-0 left-0 right-0 h-28 opacity-50">
          <svg className="w-[200%] h-full animate-[wave_7s_linear_infinite]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,50 C200,10 400,90 600,50 C800,10 1000,90 1200,50 C1400,10 1600,90 1800,50 L1800,120 L0,120 Z" fill="#0369a1" />
          </svg>
        </div>

        {/* Layer 3: Foreground Dynamic Wave with Highlights */}
        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-80">
          <svg className="w-[200%] h-full animate-[wave_4s_linear_infinite]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,60 C180,30 360,90 540,60 C720,30 900,90 1080,60 C1260,30 1440,90 1620,60 L1620,120 L0,120 Z" fill="#082f49" />
          </svg>
        </div>
      </div>

      {/* Top Brand & Logo */}
      <div className="relative z-10 pt-14 flex flex-col items-center">
        <div className="relative mb-3">
          <div className="absolute -inset-4 bg-cyan-500/20 rounded-full blur-xl animate-pulse"></div>
          <img 
            src={logoUrl} 
            alt="CodeLert Logo" 
            className="h-20 object-contain relative transition-transform duration-500 hover:scale-105" 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-widest bg-gradient-to-r from-white via-cyan-200 to-sky-400 bg-clip-text text-transparent drop-shadow-md">
          CodeLert 7.0
        </h1>
        <p className="text-xs tracking-widest text-cyan-300/70 uppercase mt-1 font-mono">
          Intelligent AI Development Studio
        </p>
      </div>

      {/* Center Interactive Sea Journey Progress */}
      <div className="relative z-10 w-full max-w-lg px-6 flex flex-col items-center my-auto">
        
        {/* Ocean Route Horizon with Navigating Ship */}
        <div className="w-full h-20 relative flex items-center justify-center">
          {/* Subtle guide wave */}
          <svg width="100%" height="40" viewBox="0 0 400 40" preserveAspectRatio="none" className="w-full overflow-visible">
            {/* Sea Route Path Line */}
            <path 
              d="M 0 20 Q 50 5, 100 20 T 200 20 T 300 20 T 400 20" 
              fill="none" 
              stroke="#0e3a5d" 
              strokeWidth="2" 
              strokeDasharray="4 4"
            />
            {/* Active illuminated path */}
            <path 
              d="M 0 20 Q 50 5, 100 20 T 200 20 T 300 20 T 400 20" 
              fill="none" 
              stroke="url(#shipRouteGlow)" 
              strokeWidth="3" 
              strokeDasharray="400"
              strokeDashoffset={400 - (progress * 4)}
              className="transition-all duration-100 ease-out"
            />
            <defs>
              <linearGradient id="shipRouteGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>

          {/* Smooth Sailboat Riding the Sea */}
          <div 
            className="absolute transition-all duration-100 ease-out flex flex-col items-center"
            style={{
              left: `${Math.min(96, Math.max(4, progress))}%`,
              top: `calc(50% + ${waveHeight}px)`,
              transform: `translate(-50%, -65%) rotate(${shipTilt}deg)`
            }}
          >
            {/* Water splash ripple under boat */}
            <div className="absolute -bottom-1 w-8 h-2 bg-cyan-400/40 rounded-full blur-xs animate-ping"></div>
            
            {/* Stylized Sailboat Vector */}
            <svg width="34" height="34" viewBox="0 0 36 36" fill="none" className="filter drop-shadow-[0_4px_8px_rgba(6,182,212,0.5)]">
              {/* Boat Hull */}
              <path d="M4 25 C10 31, 26 31, 32 25 L29 21 L7 21 Z" fill="#e2e8f0" stroke="#0284c7" strokeWidth="1.5" />
              {/* Mast */}
              <line x1="18" y1="6" x2="18" y2="21" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
              {/* Main Sail */}
              <path d="M19 7 L31 19 L19 19 Z" fill="#38bdf8" opacity="0.9" />
              {/* Front Sail */}
              <path d="M17 9 L7 19 L17 19 Z" fill="#0284c7" opacity="0.8" />
              {/* Top Flag */}
              <path d="M18 6 L23 8 L18 10 Z" fill="#f43f5e" />
            </svg>
          </div>
        </div>

        {/* Clean Sleek Progress Bar Container */}
        <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-full h-3 border border-cyan-900/50 p-0.5 shadow-inner mt-2 relative overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300 rounded-full transition-all duration-100 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute top-0 right-0 bottom-0 w-4 bg-white/40 rounded-full blur-xs"></div>
          </div>
        </div>

        {/* Dynamic Status & Percent Display */}
        <div className="w-full flex justify-between items-center mt-3 font-mono text-xs text-cyan-200/80">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            {progress < 30 ? 'Ініціалізація робочого простору...' : progress < 70 ? 'Завантаження інструментів CodeLert 7.0...' : progress < 98 ? 'Синхронізація середовища...' : 'Готово до роботи!'}
          </span>
          <span className="font-bold text-cyan-300 text-sm tracking-wider">
            {Math.floor(progress)}%
          </span>
        </div>
      </div>

      {/* Bottom Footer Info */}
      <div className="relative z-10 pb-6 text-center text-[11px] text-slate-400/70 font-mono flex items-center justify-center gap-4">
        <span>CodeLert 7.0 Engine</span>
        <span>•</span>
        <span>2M Token Analysis</span>
        <span>•</span>
        <span>Made with Precision</span>
      </div>

    </div>
  );
};
