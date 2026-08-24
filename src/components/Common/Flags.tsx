import React from 'react';

export const FlagUA: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => {
  return (
    <svg 
      width={size} 
      height={Math.round(size * 0.7)} 
      viewBox="0 0 24 16" 
      fill="none" 
      className={`inline-block rounded-xs shadow-xs border border-white/20 shrink-0 overflow-hidden ${className}`}
    >
      {/* Top half - Ukrainian Azure Blue */}
      <rect width="24" height="8" fill="#0057B7" />
      {/* Bottom half - Ukrainian Golden Yellow */}
      <rect y="8" width="24" height="8" fill="#FFD700" />
    </svg>
  );
};

export const FlagGB: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 18 }) => {
  return (
    <svg 
      width={size} 
      height={Math.round(size * 0.7)} 
      viewBox="0 0 60 30" 
      fill="none" 
      className={`inline-block rounded-xs shadow-xs border border-white/20 shrink-0 overflow-hidden ${className}`}
    >
      <clipPath id="gb-flag-clip">
        <rect width="60" height="30" />
      </clipPath>
      <g clipPath="url(#gb-flag-clip)">
        {/* Navy Blue background */}
        <rect width="60" height="30" fill="#012169" />
        
        {/* White diagonals (St Andrew / St Patrick broad cross) */}
        <path d="M0 0 L60 30 M60 0 L0 30" stroke="#FFFFFF" strokeWidth="6" />
        
        {/* Red diagonal counterchanged (St Patrick) */}
        <path d="M0 30 L30 15 M60 0 L30 15" stroke="#C8102E" strokeWidth="2" />
        <path d="M0 0 L30 15 M60 30 L30 15" stroke="#C8102E" strokeWidth="2" />
        
        {/* White cross (St George broad cross) */}
        <path d="M30 0 v30 M0 15 h60" stroke="#FFFFFF" strokeWidth="10" />
        
        {/* Red cross (St George) */}
        <path d="M30 0 v30 M0 15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
};
