import React from 'react';
import { IMAGES } from '@/greenlandConstants';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[200] bg-black/25 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 select-none">
      {/* Liquid Glass Apple Center Plate */}
      <div className="liquid-bubble-plate border border-amber-400/40 rounded-3xl p-8 max-w-sm w-full relative overflow-hidden backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center text-center">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="normal" opacity={0.35} variant="amber" className="absolute inset-0 pointer-events-none z-0" />

        <div className="relative z-10 w-24 h-24 mb-5 animate-float flex items-center justify-center">
          <img
            src={IMAGES.LOGO || IMAGES.GERB || '/file/36/gerb.png'}
            alt="Герб ИИ-Гренландии"
            className="w-full h-full object-contain partner-gerb-filter drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.includes('/file/31/gerb.png')) {
                target.src = '/file/31/gerb.png';
              }
            }}
          />
          <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping pointer-events-none" />
        </div>

        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent mb-1.5 relative z-10">
          ИИ-Гренландия
        </h1>
        <p className="text-amber-200/90 text-sm font-medium animate-pulse relative z-10">
          Загрузка пространства...
        </p>

        <div className="mt-5 flex gap-2 relative z-10">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-amber-400/80 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              style={{
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
