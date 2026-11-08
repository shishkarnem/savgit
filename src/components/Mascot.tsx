import React from 'react';
import { MASCOT } from '../lib/mascotImages';

interface MascotProps {
  emotion?: keyof typeof MASCOT;
  size?: number;
  speechText?: string;
  className?: string;
}

export const Mascot: React.FC<MascotProps> = ({
  emotion = 'default',
  size = 90,
  speechText,
  className = '',
}) => {
  const imageSrc = MASCOT[emotion] || MASCOT.default;

  return (
    <div className={`relative flex items-center gap-3 ${className}`}>
      <img
        src={imageSrc}
        alt={`Маскот (${emotion})`}
        style={{ width: size, height: size }}
        className="object-contain drop-shadow-[0_0_15px_rgba(231,199,104,0.4)] transition-transform hover:scale-105"
        onError={(e) => {
          // Fallback if image not yet loaded
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
      />

      {speechText && (
        <div className="relative p-3.5 rounded-2xl bg-black/70 border border-amber-400/30 backdrop-blur-2xl text-sm text-amber-100 leading-relaxed shadow-lg max-w-sm">
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-r-8 border-r-amber-400/40" />
          {speechText}
        </div>
      )}
    </div>
  );
};

export default Mascot;
