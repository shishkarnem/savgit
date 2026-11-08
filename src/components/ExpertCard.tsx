import React from 'react';
import { motion } from 'framer-motion';
import { Heart, ThumbsDown, ChevronDown, Sparkles, Briefcase, Wrench, Layers } from 'lucide-react';
import Rivets from '@/components/Rivets';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';
import { getExpertRealName } from '@/utils/expertUtils';

export interface Expert {
  id: string;
  pseudonym: string | null;
  greeting: string | null;
  tools: string | null;
  spheres: string | null;
  cases: string | null;
  other_info: string | null;
  description: string | null;
  photo_url: string | null;
  telegram: string | null;
  telegram_id: string | null;
  matchScore?: number;
  matchReason?: string;
  real_name?: string | null;
}

export type SwipeDirection = 'left' | 'right' | 'down';

interface ExpertCardProps {
  expert: Expert;
  showActions?: boolean;
  currentDirection?: SwipeDirection | null;
  onAction?: (direction: SwipeDirection) => void;
  compact?: boolean;
  className?: string;
}

/** Remove system markers like ✂️✂️✂️ and protocol tokens from display text */
const stripSystemSymbols = (text?: string | null): string => {
  if (!text) return '';
  return text
    .replace(/✂️+/g, '')
    .replace(/##IMG:[^#]+##/g, '')
    .replace(/##INLINE:[^#]+##/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

const ExpertCard: React.FC<ExpertCardProps> = ({
  expert,
  showActions = false,
  currentDirection,
  onAction,
  compact = false,
  className = ''
}) => {
  const getDirectionColor = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return 'border-amber-400/60 bg-amber-400/20 text-amber-200';
      case 'left': return 'border-white/40 bg-white/10 text-zinc-300';
      case 'down': return 'border-amber-300/40 bg-amber-300/10 text-amber-100';
    }
  };

  const getDirectionIcon = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return <Heart size={16} className="text-amber-300 fill-amber-300/30" />;
      case 'left': return <ThumbsDown size={16} className="text-zinc-300" />;
      case 'down': return <ChevronDown size={16} className="text-amber-200" />;
    }
  };

  const getDirectionLabel = (dir: SwipeDirection) => {
    switch (dir) {
      case 'right': return 'Выбран';
      case 'left': return 'Пропустить';
      case 'down': return 'Отложить';
    }
  };

  const greetingStr = expert.greeting ? expert.greeting.trim() : '';
  const pseudoStr = expert.pseudonym ? expert.pseudonym.trim() : '';
  const displayName = greetingStr ? `${greetingStr} ${pseudoStr}` : (pseudoStr || 'Эксперт платформы');
  const realName = getExpertRealName(expert);

  return (
    <div 
      className={`rounded-3xl bg-black/60 backdrop-blur-2xl border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.8)] ${
        compact ? 'p-3.5 sm:p-4 h-full flex flex-col justify-between' : 'p-5 sm:p-7 md:p-8'
      } w-full relative overflow-hidden ${
        currentDirection ? getDirectionColor(currentDirection) : ''
      } ${className}`}
    >
      <Rivets />

      {/* Subtle smoke backdrop on card */}
      {!compact && (
        <RealisticSmokeBackdrop
          speed="slow"
          opacity={0.25}
          variant="amber"
          className="absolute inset-0 pointer-events-none z-0"
        />
      )}

      {/* Status Badge */}
      {currentDirection && (
        <div className={`absolute top-3 right-3 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm backdrop-blur-md border ${getDirectionColor(currentDirection)} shadow-lg`}>
          {getDirectionIcon(currentDirection)}
          <span className="font-semibold">{getDirectionLabel(currentDirection)}</span>
        </div>
      )}
      
      {/* Non-compact: wide responsive 2-column on desktop */}
      {!compact ? (
        <div className="relative z-10 md:grid md:grid-cols-12 md:gap-6 items-start">
          {/* Left Column: Photo, Name & Match Score */}
          <div className="md:col-span-5 flex flex-col">
            {expert.matchScore && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-sm font-bold shadow-[0_0_14px_rgba(251,191,36,0.25)] mb-3 self-start">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{expert.matchScore}% совпадение • Рекомендация нейросети</span>
              </div>
            )}

            {expert.photo_url ? (
              <div className="relative mb-4 rounded-2xl overflow-hidden border border-amber-400/35 aspect-video md:aspect-[4/4.5] shadow-xl bg-black/50">
                <img 
                  src={expert.photo_url} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                    {displayName}
                  </h3>
                  {realName && (
                    <p className="text-sm text-white/80 font-normal mt-0.5">
                      {realName}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-4 p-5 rounded-2xl bg-black/40 border border-amber-400/30">
                <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                  {displayName}
                </h3>
                {realName && (
                  <p className="text-sm text-white/80 font-normal mt-0.5">
                    {realName}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Column: AI Match Reason + Detailed Info */}
          <div className="md:col-span-7 space-y-3 text-sm md:text-base">
            {/* Neural network match reason if present */}
            {expert.matchReason && (
              <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-400/40 backdrop-blur-xl relative overflow-hidden shadow-inner">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span className="text-sm font-bold bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                    Обоснование подбора от нейросети SAV AI:
                  </span>
                </div>
                <p className="text-sm sm:text-base text-white/95 leading-relaxed font-normal">
                  {expert.matchReason}
                </p>
              </div>
            )}

            {expert.spheres && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <Briefcase className="w-4 h-4 text-amber-300 shrink-0" />
                  <p className="text-amber-300 text-sm font-semibold">Сферы компетенций</p>
                </div>
                <p className="text-sm md:text-base text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">{stripSystemSymbols(expert.spheres)}</p>
              </div>
            )}
            {expert.tools && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wrench className="w-4 h-4 text-amber-300 shrink-0" />
                  <p className="text-amber-300 text-sm font-semibold">Стек инструментов</p>
                </div>
                <p className="text-sm md:text-base text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">{stripSystemSymbols(expert.tools)}</p>
              </div>
            )}
            {expert.cases && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <div className="flex items-center gap-1.5 mb-1">
                  <Layers className="w-4 h-4 text-amber-300 shrink-0" />
                  <p className="text-amber-300 text-sm font-semibold">Кейсы и опыт</p>
                </div>
                <p className="text-sm md:text-base text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">{stripSystemSymbols(expert.cases)}</p>
              </div>
            )}
            {expert.other_info && (
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
                <p className="text-amber-300 text-sm font-semibold mb-1">Опыт и специализация</p>
                <p className="text-sm md:text-base text-zinc-100 whitespace-pre-wrap break-words leading-relaxed">{stripSystemSymbols(expert.other_info)}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compact layout for 3D carousel side cards */
        <div className="relative z-10 flex flex-col h-full justify-start space-y-3">
          <div>
            {expert.photo_url ? (
              <div className="relative mb-3 rounded-2xl overflow-hidden border border-amber-400/30 aspect-video shadow-md bg-black/40">
                <img 
                  src={expert.photo_url} 
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                <div className="absolute bottom-2 left-2.5 right-2.5">
                  <h3 className="text-lg font-bold text-white truncate">
                    {displayName}
                  </h3>
                  {expert.matchScore && (
                    <span className="text-xs text-amber-300 font-semibold">
                      {expert.matchScore}% совпадение
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-2.5">
                <h3 className="text-lg font-bold text-amber-200 truncate">
                  {displayName}
                </h3>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {expert.spheres && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                  <p className="text-amber-300 text-sm font-semibold mb-0.5">Сферы</p>
                  <p className="text-sm text-zinc-200 line-clamp-2">{stripSystemSymbols(expert.spheres)}</p>
                </div>
              )}
              {expert.matchReason && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-amber-400/25">
                  <p className="text-amber-300 text-sm font-semibold mb-0.5">ИИ-обоснование</p>
                  <p className="text-sm text-zinc-200 line-clamp-2">{expert.matchReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {showActions && onAction && (
        <div className={`relative z-10 flex items-center justify-center gap-3.5 ${compact ? 'mt-3 pt-2' : 'mt-4 pt-3'} border-t border-amber-400/20`}>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onAction('left'); }}
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-white/10 border border-white/25 flex items-center justify-center hover:bg-white/20 transition-all ${
              currentDirection === 'left' ? 'ring-2 ring-white/60' : ''
            } cursor-pointer`}
            title="Пропустить"
          >
            <ThumbsDown className="text-zinc-200" size={compact ? 16 : 20} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onAction('down'); }}
            className={`${compact ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-amber-400/15 border border-amber-400/35 flex items-center justify-center hover:bg-amber-400/25 transition-all ${
              currentDirection === 'down' ? 'ring-2 ring-amber-300' : ''
            } cursor-pointer`}
            title="Отложить"
          >
            <ChevronDown className="text-amber-200" size={compact ? 14 : 18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onAction('right'); }}
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full bg-amber-400/25 border border-amber-400/60 flex items-center justify-center hover:bg-amber-400/35 transition-all shadow-[0_0_12px_rgba(231,199,104,0.35)] ${
              currentDirection === 'right' ? 'ring-2 ring-amber-300' : ''
            } cursor-pointer`}
            title="Выбрать"
          >
            <Heart className="text-amber-300" size={compact ? 16 : 20} />
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default ExpertCard;