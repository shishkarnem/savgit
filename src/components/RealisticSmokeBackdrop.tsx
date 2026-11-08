import React, { useState, useEffect } from 'react';

export interface RealisticSmokeBackdropProps {
  className?: string;
  speed?: 'fast' | 'normal' | 'slow';
  opacity?: number;
  variant?: 'dark' | 'amber' | 'subtle';
  style?: React.CSSProperties;
}

export const RealisticSmokeBackdrop: React.FC<RealisticSmokeBackdropProps> = ({
  className = '',
  speed = 'fast',
  opacity = 0.62,
  variant = 'dark',
  style
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Speed mapping for duration
  const durTurbulence = speed === 'fast' ? '4.5s' : speed === 'normal' ? '8s' : '12s';
  const durBillow1 = speed === 'fast' ? '3.8s' : speed === 'normal' ? '7s' : '10s';
  const durBillow2 = speed === 'fast' ? '4.2s' : speed === 'normal' ? '7.5s' : '11s';
  const durBillow3 = speed === 'fast' ? '3.2s' : speed === 'normal' ? '6s' : '9s';
  const durWisps = speed === 'fast' ? '3.5s' : speed === 'normal' ? '6.5s' : '9.5s';

  const idSuffix = React.useId().replace(/:/g, '');

  // Opacity strictly up to 0.62 everywhere
  const effectiveOpacity = Math.min(0.62, opacity);

  return (
    <div
      className={`absolute -inset-x-6 -inset-y-4 pointer-events-none -z-10 overflow-visible select-none transition-opacity duration-300 ${className}`}
      style={{ opacity: effectiveOpacity, ...style }}
      aria-hidden="true"
    >
      <svg
        className="w-full h-full min-h-[120px]"
        viewBox="0 0 700 220"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main Billowing Fractal Turbulence */}
          <filter id={`smokeTurbulenceFilter_${idSuffix}`} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.016 0.024"
              numOctaves="4"
              seed="7"
              result="smokeNoise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.014 0.02; 0.022 0.032; 0.018 0.024; 0.014 0.02"
                dur={durTurbulence}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="smokeNoise"
              scale="42"
              xChannelSelector="R"
              yChannelSelector="G"
              result="displacedSmoke"
            />
            <feGaussianBlur in="displacedSmoke" stdDeviation="11" result="softSmoke" />
          </filter>

          {/* Secondary Swirling Fine Wisp Filter */}
          <filter id={`smokeWispFilter_${idSuffix}`} x="-30%" y="-30%" width="160%" height="160%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.028 0.038"
              numOctaves="3"
              seed="23"
              result="wispNoise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.025 0.035; 0.038 0.052; 0.028 0.04; 0.025 0.035"
                dur={durWisps}
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="wispNoise"
              scale="28"
              xChannelSelector="B"
              yChannelSelector="R"
              result="displacedWisp"
            />
            <feGaussianBlur in="displacedWisp" stdDeviation="7" result="softWisp" />
          </filter>

          {/* Heavy Dark Atmospheric Radial Gradient */}
          <radialGradient id={`smokeCoreGrad_${idSuffix}`} cx="48%" cy="50%" r="58%">
            <stop offset="0%" stopColor="rgba(8, 6, 5, 0.96)" />
            <stop offset="35%" stopColor="rgba(18, 14, 10, 0.88)" />
            <stop offset="65%" stopColor="rgba(32, 24, 15, 0.6)" />
            <stop offset="88%" stopColor="rgba(160, 105, 18, 0.16)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          <radialGradient id={`smokePuffLeft_${idSuffix}`} cx="30%" cy="45%" r="50%">
            <stop offset="0%" stopColor="rgba(12, 9, 7, 0.94)" />
            <stop offset="50%" stopColor="rgba(24, 18, 12, 0.72)" />
            <stop offset="80%" stopColor="rgba(110, 75, 15, 0.18)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          <radialGradient id={`smokePuffRight_${idSuffix}`} cx="70%" cy="52%" r="48%">
            <stop offset="0%" stopColor="rgba(10, 7, 6, 0.94)" />
            <stop offset="48%" stopColor="rgba(22, 17, 12, 0.75)" />
            <stop offset="78%" stopColor="rgba(100, 68, 14, 0.18)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          {/* Golden Rim Accent */}
          <linearGradient id={`smokeRimGrad_${idSuffix}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.28)" />
            <stop offset="50%" stopColor="rgba(251, 191, 36, 0.12)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>
        </defs>

        {/* 1. Main Base Mass with Fast Morphing Contours */}
        <g filter={`url(#smokeTurbulenceFilter_${idSuffix})`}>
          <path
            d="M 50,110 Q 140,25 320,40 Q 500,20 640,80 Q 690,125 630,170 Q 480,200 320,185 Q 150,205 60,150 Z"
            fill={`url(#smokeCoreGrad_${idSuffix})`}
          >
            <animate
              attributeName="d"
              values="
                M 50,110 Q 140,25 320,40 Q 500,20 640,80 Q 690,125 630,170 Q 480,200 320,185 Q 150,205 60,150 Z;
                M 40,95 Q 170,15 350,50 Q 520,30 650,70 Q 695,135 610,180 Q 460,190 300,175 Q 130,215 45,140 Z;
                M 65,120 Q 130,35 300,35 Q 470,15 620,90 Q 680,115 640,160 Q 500,205 340,190 Q 170,195 75,160 Z;
                M 50,110 Q 140,25 320,40 Q 500,20 640,80 Q 690,125 630,170 Q 480,200 320,185 Q 150,205 60,150 Z
              "
              dur={durBillow1}
              repeatCount="indefinite"
            />
          </path>
        </g>

        {/* 2. Swirling Left Heavy Puff */}
        <g filter={`url(#smokeWispFilter_${idSuffix})`}>
          <ellipse cx="220" cy="95" rx="165" ry="85" fill={`url(#smokePuffLeft_${idSuffix})`}>
            <animate
              attributeName="rx"
              values="150;190;160;150"
              dur={durBillow2}
              repeatCount="indefinite"
            />
            <animate
              attributeName="ry"
              values="75;105;80;75"
              dur={durWisps}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cx"
              values="220;250;210;220"
              dur={durBillow3}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* 3. Swirling Right Heavy Puff */}
        <g filter={`url(#smokeTurbulenceFilter_${idSuffix})`}>
          <ellipse cx="480" cy="115" rx="175" ry="80" fill={`url(#smokePuffRight_${idSuffix})`}>
            <animate
              attributeName="rx"
              values="160;195;170;160"
              dur={durBillow1}
              repeatCount="indefinite"
            />
            <animate
              attributeName="ry"
              values="70;100;75;70"
              dur={durWisps}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values="115;95;125;115"
              dur={durBillow2}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* 4. Center Dense Core Billow */}
        <g filter={`url(#smokeTurbulenceFilter_${idSuffix})`}>
          <ellipse cx="350" cy="110" rx="210" ry="90" fill={`url(#smokeCoreGrad_${idSuffix})`}>
            <animate
              attributeName="rx"
              values="190;235;200;190"
              dur={durBillow3}
              repeatCount="indefinite"
            />
            <animate
              attributeName="ry"
              values="80;110;85;80"
              dur={durBillow1}
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* 5. Golden Amber Vapor Tendrils */}
        <g filter={`url(#smokeWispFilter_${idSuffix})`} opacity="0.45">
          <path
            d="M 120,130 C 220,60 300,160 440,80 C 520,40 590,90 620,130"
            fill="none"
            stroke={`url(#smokeRimGrad_${idSuffix})`}
            strokeWidth="38"
            strokeLinecap="round"
          >
            <animate
              attributeName="d"
              values="
                M 120,130 C 220,60 300,160 440,80 C 520,40 590,90 620,130;
                M 100,110 C 240,40 320,180 420,60 C 500,60 570,110 640,110;
                M 130,140 C 200,80 280,140 460,90 C 540,30 610,70 610,140;
                M 120,130 C 220,60 300,160 440,80 C 520,40 590,90 620,130
              "
              dur={durTurbulence}
              repeatCount="indefinite"
            />
          </path>
        </g>
      </svg>
    </div>
  );
};

export default RealisticSmokeBackdrop;
