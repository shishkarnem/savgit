import React from 'react';

/**
 * Generates an SVG path for an authentic spur gear with involute-style trapezoidal teeth
 */
function generateGearPath(
  cx: number,
  cy: number,
  teeth: number,
  pitchRadius: number,
  addendum = 7,
  dedendum = 7,
  initialAngle = 0
): string {
  const outerRadius = pitchRadius + addendum;
  const rootRadius = pitchRadius - dedendum;
  const toothAngle = (2 * Math.PI) / teeth;
  const points: string[] = [];

  for (let i = 0; i < teeth; i++) {
    const angleStart = initialAngle + i * toothAngle;

    // Angles across a single tooth cycle
    const a0 = angleStart;
    const a1 = angleStart + toothAngle * 0.18;
    const a2 = angleStart + toothAngle * 0.32;
    const a3 = angleStart + toothAngle * 0.68;
    const a4 = angleStart + toothAngle * 0.82;
    const a5 = angleStart + toothAngle;

    // Root valley
    const x0 = cx + rootRadius * Math.cos(a0);
    const y0 = cy + rootRadius * Math.sin(a0);
    const x1 = cx + rootRadius * Math.cos(a1);
    const y1 = cy + rootRadius * Math.sin(a1);

    // Flank up to tip
    const x2 = cx + outerRadius * Math.cos(a2);
    const y2 = cy + outerRadius * Math.sin(a2);

    // Tip crest
    const x3 = cx + outerRadius * Math.cos(a3);
    const y3 = cy + outerRadius * Math.sin(a3);

    // Flank down to root
    const x4 = cx + rootRadius * Math.cos(a4);
    const y4 = cy + rootRadius * Math.sin(a4);

    const x5 = cx + rootRadius * Math.cos(a5);
    const y5 = cy + rootRadius * Math.sin(a5);

    if (i === 0) {
      points.push(`M ${x0.toFixed(2)} ${y0.toFixed(2)}`);
    } else {
      points.push(`L ${x0.toFixed(2)} ${y0.toFixed(2)}`);
    }
    points.push(`L ${x1.toFixed(2)} ${y1.toFixed(2)}`);
    points.push(`L ${x2.toFixed(2)} ${y2.toFixed(2)}`);
    points.push(`L ${x3.toFixed(2)} ${y3.toFixed(2)}`);
    points.push(`L ${x4.toFixed(2)} ${y4.toFixed(2)}`);
    points.push(`L ${x5.toFixed(2)} ${y5.toFixed(2)}`);
  }

  points.push('Z');
  return points.join(' ');
}

interface InterlockingGearsProps {
  className?: string;
  size?: number;
}

export const InterlockingGears: React.FC<InterlockingGearsProps> = ({
  className = '',
  size = 180,
}) => {
  // Center coordinates & radii
  // Gear 1 (Primary / Large): 18 teeth, pitchRadius = 54. Center: (100, 118)
  const g1 = {
    cx: 98,
    cy: 116,
    teeth: 18,
    pitch: 52,
    addendum: 7,
    dedendum: 7,
    bore: 16,
    spokeRadius: 36,
  };

  // Gear 2 (Top Meshing Gear): 12 teeth, pitchRadius = 34.67 (ratio 1.5).
  // Distance = 52 + 34.67 = 86.67. Angle = -65deg
  const dist12 = g1.pitch + 34.67;
  const angle12 = (-64 * Math.PI) / 180;
  const g2 = {
    cx: g1.cx + dist12 * Math.cos(angle12),
    cy: g1.cy + dist12 * Math.sin(angle12),
    teeth: 12,
    pitch: 34.67,
    addendum: 6.5,
    dedendum: 6.5,
    bore: 11,
    spokeRadius: 23,
  };

  // Gear 3 (Right Meshing Gear): 12 teeth, pitchRadius = 34.67.
  // Distance = 52 + 34.67 = 86.67. Angle = +22deg
  const dist13 = g1.pitch + 34.67;
  const angle13 = (22 * Math.PI) / 180;
  const g3 = {
    cx: g1.cx + dist13 * Math.cos(angle13),
    cy: g1.cy + dist13 * Math.sin(angle13),
    teeth: 12,
    pitch: 34.67,
    addendum: 6.5,
    dedendum: 6.5,
    bore: 11,
    spokeRadius: 23,
  };

  // Precomputed paths
  const pathG1 = generateGearPath(g1.cx, g1.cy, g1.teeth, g1.pitch, g1.addendum, g1.dedendum, 0);
  // Angular offset for G2 so teeth intermesh with G1
  const pathG2 = generateGearPath(g2.cx, g2.cy, g2.teeth, g2.pitch, g2.addendum, g2.dedendum, Math.PI / 12);
  // Angular offset for G3 so teeth intermesh with G1
  const pathG3 = generateGearPath(g3.cx, g3.cy, g3.teeth, g3.pitch, g3.addendum, g3.dedendum, Math.PI / 12 + 0.15);

  return (
    <div
      className={`relative flex items-center justify-center select-none bg-transparent ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="20 10 215 190"
        className="w-full h-full overflow-visible bg-transparent drop-shadow-[0_0_18px_rgba(245,158,11,0.4)]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gold Apple Liquid Glass Gradients */}
          <linearGradient id="gearGradGold1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#d97706" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#78350f" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="gearGradGold2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.8" />
          </linearGradient>

          <linearGradient id="gearInnerMetal" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#292524" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.95" />
          </linearGradient>

          {/* Golden Glow Filter */}
          <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- GEAR 1 (LARGE, CLOCKWISE, 6s) --- */}
        <g style={{ transformOrigin: `${g1.cx}px ${g1.cy}px`, animation: 'rotate 6s linear infinite' }}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${g1.cx} ${g1.cy}`}
            to={`360 ${g1.cx} ${g1.cy}`}
            dur="6s"
            repeatCount="indefinite"
          />

          {/* Teeth & Rim */}
          <path
            d={pathG1}
            fill="url(#gearGradGold1)"
            stroke="rgba(254, 240, 138, 0.6)"
            strokeWidth="1.2"
          />

          {/* Inner Recessed Disk */}
          <circle
            cx={g1.cx}
            cy={g1.cy}
            r={g1.spokeRadius}
            fill="url(#gearInnerMetal)"
            stroke="#fbbf24"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* 6 Elegant Spoke Cutouts */}
          {[0, 60, 120, 180, 240, 300].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const holeR = 6;
            const hx = g1.cx + (g1.spokeRadius - 10) * Math.cos(rad);
            const hy = g1.cy + (g1.spokeRadius - 10) * Math.sin(rad);
            return (
              <circle
                key={deg}
                cx={hx}
                cy={hy}
                r={holeR}
                fill="#000000"
                fillOpacity="0.75"
                stroke="#d97706"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Center Hub & Brass Bearing */}
          <circle
            cx={g1.cx}
            cy={g1.cy}
            r={g1.bore}
            fill="url(#gearGradGold2)"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <circle
            cx={g1.cx}
            cy={g1.cy}
            r={g1.bore * 0.45}
            fill="#0c0a09"
            stroke="#fbbf24"
            strokeWidth="1.2"
          />
        </g>

        {/* --- GEAR 2 (MEDIUM TOP, COUNTER-CLOCKWISE, 4s) --- */}
        <g style={{ transformOrigin: `${g2.cx}px ${g2.cy}px`, animation: 'rotate-reverse 4s linear infinite' }}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${g2.cx} ${g2.cy}`}
            to={`-360 ${g2.cx} ${g2.cy}`}
            dur="4s"
            repeatCount="indefinite"
          />

          {/* Teeth & Rim */}
          <path
            d={pathG2}
            fill="url(#gearGradGold2)"
            stroke="rgba(254, 240, 138, 0.6)"
            strokeWidth="1.2"
          />

          {/* Inner Recessed Disk */}
          <circle
            cx={g2.cx}
            cy={g2.cy}
            r={g2.spokeRadius}
            fill="url(#gearInnerMetal)"
            stroke="#fbbf24"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* 4 Spoke Holes */}
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const holeR = 4.5;
            const hx = g2.cx + (g2.spokeRadius - 7.5) * Math.cos(rad);
            const hy = g2.cy + (g2.spokeRadius - 7.5) * Math.sin(rad);
            return (
              <circle
                key={deg}
                cx={hx}
                cy={hy}
                r={holeR}
                fill="#000000"
                fillOpacity="0.75"
                stroke="#d97706"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Center Hub */}
          <circle
            cx={g2.cx}
            cy={g2.cy}
            r={g2.bore}
            fill="url(#gearGradGold1)"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <circle
            cx={g2.cx}
            cy={g2.cy}
            r={g2.bore * 0.45}
            fill="#0c0a09"
            stroke="#fbbf24"
            strokeWidth="1.2"
          />
        </g>

        {/* --- GEAR 3 (MEDIUM RIGHT, COUNTER-CLOCKWISE, 4s) --- */}
        <g style={{ transformOrigin: `${g3.cx}px ${g3.cy}px`, animation: 'rotate-reverse 4s linear infinite' }}>
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${g3.cx} ${g3.cy}`}
            to={`-360 ${g3.cx} ${g3.cy}`}
            dur="4s"
            repeatCount="indefinite"
          />

          {/* Teeth & Rim */}
          <path
            d={pathG3}
            fill="url(#gearGradGold1)"
            stroke="rgba(254, 240, 138, 0.6)"
            strokeWidth="1.2"
          />

          {/* Inner Recessed Disk */}
          <circle
            cx={g3.cx}
            cy={g3.cy}
            r={g3.spokeRadius}
            fill="url(#gearInnerMetal)"
            stroke="#fbbf24"
            strokeWidth="1"
            strokeOpacity="0.5"
          />

          {/* 4 Spoke Holes */}
          {[45, 135, 225, 315].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const holeR = 4.5;
            const hx = g3.cx + (g3.spokeRadius - 7.5) * Math.cos(rad);
            const hy = g3.cy + (g3.spokeRadius - 7.5) * Math.sin(rad);
            return (
              <circle
                key={deg}
                cx={hx}
                cy={hy}
                r={holeR}
                fill="#000000"
                fillOpacity="0.75"
                stroke="#d97706"
                strokeWidth="0.8"
              />
            );
          })}

          {/* Center Hub */}
          <circle
            cx={g3.cx}
            cy={g3.cy}
            r={g3.bore}
            fill="url(#gearGradGold2)"
            stroke="#ffffff"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
          <circle
            cx={g3.cx}
            cy={g3.cy}
            r={g3.bore * 0.45}
            fill="#0c0a09"
            stroke="#fbbf24"
            strokeWidth="1.2"
          />
        </g>
      </svg>
    </div>
  );
};

export default InterlockingGears;
