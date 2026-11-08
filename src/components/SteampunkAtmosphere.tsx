import React, { useEffect, useState } from 'react';

interface SteampunkAtmosphereProps {
  pressureLevel?: number; // 0 to 100
}

export const SteampunkAtmosphere: React.FC<SteampunkAtmosphereProps> = ({ pressureLevel = 60 }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20;
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[3] overflow-hidden select-none" aria-hidden="true">
      {/* Animated Dense Steam & Ambient Golden Atmospheric SVG Overlay */}
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          {/* Steam Jet Gradients */}
          <radialGradient id="steamVortex1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(254, 243, 199, 0.45)" />
            <stop offset="40%" stopColor="rgba(245, 158, 11, 0.22)" />
            <stop offset="80%" stopColor="rgba(217, 119, 6, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          <radialGradient id="steamVortex2" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
            <stop offset="50%" stopColor="rgba(251, 191, 36, 0.18)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </radialGradient>

          <linearGradient id="steamJetLeft" x1="0%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="rgba(245, 158, 11, 0.35)" />
            <stop offset="35%" stopColor="rgba(254, 240, 138, 0.2)" />
            <stop offset="70%" stopColor="rgba(245, 158, 11, 0.08)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>

          <linearGradient id="steamJetRight" x1="100%" y1="100%" x2="50%" y2="0%">
            <stop offset="0%" stopColor="rgba(251, 191, 36, 0.35)" />
            <stop offset="40%" stopColor="rgba(254, 243, 199, 0.18)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
          </linearGradient>

          {/* Steam turbulence filter */}
          <filter id="steamBlur" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="16" result="blur" />
          </filter>
          <filter id="denseSteamBlur" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="28" result="blur" />
          </filter>
        </defs>

        {/* Dense Billowing Steam Clouds Behind Left Text Area */}
        <g filter="url(#denseSteamBlur)" className="opacity-70">
          {/* Cloud 1 - Drifting behind Title */}
          <ellipse
            cx={`${28 + mousePos.x * 0.3}%`}
            cy={`${32 + mousePos.y * 0.2}%`}
            rx="280"
            ry="140"
            fill="url(#steamVortex1)"
          >
            <animate
              attributeName="rx"
              values="260;310;260"
              dur="8s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.5;0.8;0.5"
              dur="6s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Cloud 2 - Lower steam swirl */}
          <ellipse
            cx={`${22 + mousePos.x * 0.4}%`}
            cy={`${52 + mousePos.y * 0.3}%`}
            rx="240"
            ry="110"
            fill="url(#steamVortex2)"
          >
            <animate
              attributeName="rx"
              values="220;270;220"
              dur="9s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.4;0.75;0.4"
              dur="7s"
              repeatCount="indefinite"
            />
          </ellipse>

          {/* Cloud 3 - Right background steam swirl */}
          <ellipse
            cx={`${68 + mousePos.x * 0.2}%`}
            cy={`${45 + mousePos.y * 0.2}%`}
            rx="320"
            ry="160"
            fill="url(#steamVortex1)"
          >
            <animate
              attributeName="ry"
              values="140;190;140"
              dur="10s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.3;0.65;0.3"
              dur="8s"
              repeatCount="indefinite"
            />
          </ellipse>
        </g>

        {/* Dynamic Steam Jets Emerging from Bottom */}
        <g filter="url(#steamBlur)" className="opacity-80 mix-blend-screen">
          {/* Steam Jet 1 (Left boiler) */}
          <polygon
            points={`${16 + mousePos.x * 0.15}%,100% ${8 + mousePos.x * 0.4}%,15% ${26 + mousePos.x * 0.4}%,15%`}
            fill="url(#steamJetLeft)"
          >
            <animate
              attributeName="opacity"
              values="0.4;0.85;0.4"
              dur="5s"
              repeatCount="indefinite"
            />
          </polygon>

          {/* Steam Jet 2 (Center-left riser behind text) */}
          <polygon
            points={`${38 + mousePos.x * 0.2}%,100% ${30 + mousePos.x * 0.35}%,8% ${46 + mousePos.x * 0.35}%,8%`}
            fill="url(#steamJetLeft)"
          >
            <animate
              attributeName="opacity"
              values="0.35;0.75;0.35"
              dur="6.5s"
              repeatCount="indefinite"
            />
          </polygon>

          {/* Steam Jet 3 (Right side behind model) */}
          <polygon
            points={`${82 + mousePos.x * 0.15}%,100% ${70 + mousePos.x * 0.3}%,10% ${88 + mousePos.x * 0.3}%,10%`}
            fill="url(#steamJetRight)"
          >
            <animate
              attributeName="opacity"
              values="0.4;0.8;0.4"
              dur="5.8s"
              repeatCount="indefinite"
            />
          </polygon>
        </g>

        {/* Rising Steam Sparks & Particles */}
        <g className="opacity-60">
          <circle cx="18%" cy="65%" r="3" fill="#fde68a">
            <animate attributeName="cy" values="65%;25%" dur="4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="32%" cy="75%" r="2.5" fill="#f59e0b">
            <animate attributeName="cy" values="75%;30%" dur="5.5s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0" dur="5.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="44%" cy="80%" r="3.5" fill="#fef08a">
            <animate attributeName="cy" values="80%;35%" dur="4.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="4.8s" repeatCount="indefinite" />
          </circle>
          <circle cx="76%" cy="70%" r="3" fill="#fde68a">
            <animate attributeName="cy" values="70%;20%" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="6s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
    </div>
  );
};

export default SteampunkAtmosphere;
