import React, { forwardRef } from 'react';
import { CheckCircle, Copy } from 'lucide-react';

interface ResidentCardProps {
  fio: string;
  promo: string;
  rank: string; // Канцлер, Архитектор, Министр, Резидент
  type: string; // Партнер или Эксперт
  onCopyPromo?: () => void;
}

export const ResidentCard = forwardRef<HTMLDivElement, ResidentCardProps>(
  ({ fio, promo, rank, type, onCopyPromo }, ref) => {
    return (
      <div
        ref={ref}
        className="relative w-full max-w-[384px] rounded-2xl overflow-hidden shadow-lg select-none border border-amber-500/30"
        style={{ aspectRatio: '384/224', minHeight: '200px' }}
      >
        {/* Flag background */}
        <img
          src="/file/37/flaggerb.png"
          crossOrigin="anonymous"
          alt="Flag"
          className="absolute inset-0 w-full h-full object-cover partner-gold-sepia-filter opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-transparent to-black/60" />

        {/* Content */}
        <div className="relative h-full p-5 flex flex-col justify-between z-10">
          {/* Top row: Coat of Arms with filter on the left, Title on the right */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2.5">
              <img
                src="/file/36/gerb.png"
                crossOrigin="anonymous"
                alt="Герб ИИ-Гренландии"
                className="w-10 h-10 object-contain partner-gerb-filter drop-shadow-[0_2px_8px_rgba(245,158,11,0.5)]"
              />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-amber-200 text-lg leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">SAV Partner</h3>
              <p className="text-sm font-semibold text-amber-400 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] mt-0.5">
                Official Resident ID
              </p>
            </div>
          </div>

          {/* Bottom: Info */}
          <div className="flex justify-between items-end gap-2 pt-2">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-bold text-white text-base md:text-lg leading-snug drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">{fio}</p>
              <div className="flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                <span className="font-semibold text-amber-300 text-sm md:text-base leading-none">{rank}</span>
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0c0806] border border-amber-500 text-amber-400 shrink-0">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="2.5 6.5 5 9 9.5 3.5" />
                  </svg>
                </span>
              </div>
              {type && type.toLowerCase() !== rank.toLowerCase() && (
                <p className="text-sm font-medium text-slate-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)] truncate leading-tight pb-0.5">{type}</p>
              )}
            </div>
            <div
              className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-500/40 flex items-center gap-2 cursor-pointer shadow-lg hover:border-amber-400 transition-colors shrink-0 mb-0.5"
              onClick={() => {
                if (onCopyPromo) onCopyPromo();
                else navigator.clipboard.writeText(promo);
              }}
              title="Скопировать промокод"
            >
              <span className="font-mono font-bold text-amber-400 text-sm md:text-base tracking-wider">{promo}</span>
              <Copy size={14} className="text-slate-300" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ResidentCard.displayName = 'ResidentCard';
