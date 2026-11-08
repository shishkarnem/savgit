import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ThumbsDown, ChevronDown, Sparkles } from 'lucide-react';
import Rivets from '@/components/Rivets';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';

interface ExpertSwipeInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExpertSwipeInstructionsModal: React.FC<ExpertSwipeInstructionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl backdrop-blur-3xl bg-black/80 border border-amber-400/40 text-white shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-6 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <RealisticSmokeBackdrop
              speed="slow"
              opacity={0.3}
              variant="amber"
              className="absolute inset-0 pointer-events-none z-0"
            />
            <Rivets />
            
            <div className="relative z-10 text-center">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                Как выбрать отраслевого эксперта
              </h2>
              <p className="text-sm text-white/70 mt-1">
                Интерактивная карусель свайпов и подбора
              </p>
            </div>
            
            <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-amber-400/35 rounded-2xl backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                  <Heart className="text-amber-300" size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-amber-200">Свайп или тап вправо →</p>
                  <p className="text-sm text-white/70">Выбрать кандидата в проект</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-white/15 rounded-2xl backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                  <ThumbsDown className="text-white/80" size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-white/90">Свайп или тап влево ←</p>
                  <p className="text-sm text-white/70">Отказаться и смотреть дальше</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-amber-400/20 rounded-2xl backdrop-blur-xl">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-300/30 flex items-center justify-center shrink-0">
                  <ChevronDown className="text-amber-300" size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm text-amber-200">Свайп или тап вниз ↓</p>
                  <p className="text-sm text-white/70">Отложить кандидата на потом</p>
                </div>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="relative z-10 w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400/25 via-amber-400/35 to-amber-400/20 hover:from-amber-400/40 hover:to-amber-400/30 border border-amber-400/60 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(251,191,36,0.2)]"
            >
              <Sparkles size={16} className="text-amber-300" /> Начать подбор эксперта
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ExpertSwipeInstructionsModal;
