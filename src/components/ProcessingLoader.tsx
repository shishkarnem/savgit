import React from 'react';
import { InterlockingGears } from './InterlockingGears';
import { RealisticSmokeBackdrop } from './RealisticSmokeBackdrop';

export interface ProcessingLoaderProps {
  message?: string;
  subMessage?: string;
}

export const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({
  message = 'Синхронизация данных платформы',
  subMessage = 'Механизмы в движении'
}) => {
  return (
    <div className="fixed inset-0 bg-black/65 backdrop-blur-xl flex flex-col items-center justify-center z-[100] select-none p-4 overflow-hidden">
      {/* Outer transparent container with Apple Liquid Glass styling */}
      <div className="relative w-full max-w-sm p-6 rounded-3xl bg-black/55 backdrop-blur-2xl border border-amber-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center overflow-hidden">
        {/* Animated smoke effect with transparent background */}
        <RealisticSmokeBackdrop
          speed="normal"
          opacity={0.4}
          variant="amber"
          className="absolute inset-0 pointer-events-none z-0"
        />

        {/* Central Interlocking Gears SVG Animation */}
        <div className="relative z-10 my-2 flex items-center justify-center">
          <InterlockingGears size={150} className="filter drop-shadow-[0_0_20px_rgba(245,158,11,0.35)]" />
        </div>

        {/* Header with Gold Gradient */}
        <h2 className="relative z-10 mt-3 text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
          {message}
        </h2>

        {/* Subtext */}
        <p className="relative z-10 mt-1.5 text-zinc-300 text-sm">
          {subMessage}
        </p>
      </div>
    </div>
  );
};

export default ProcessingLoader;
