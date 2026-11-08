import React from 'react';
import { History, ArrowLeft, Shield, Star, Zap } from 'lucide-react';
import { GlassModal } from '@/components/ui/GlassModal';

interface AuditInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  expertName: string;
  onGoToHistory: () => void;
  onGoToSwipes: () => void;
}

const AuditInfoModal: React.FC<AuditInfoModalProps> = ({
  isOpen,
  onClose,
  expertName,
  onGoToHistory,
  onGoToSwipes,
}) => {
  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="md"
      title="Превосходный выбор!"
      subtitle={expertName ? `Эксперт: ${expertName}` : 'Заявка на бесплатный аудит принята'}
      showLogo
    >
      <div className="space-y-4 pt-1 font-sans">
        {/* Info cards */}
        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/60 border border-amber-400/30">
            <Shield className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
              Наш эксперт проведёт для вас <span className="text-amber-300 font-semibold">бесплатный аудит</span> вашей текущей системы и предложит лучшие решения для автоматизации.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/60 border border-amber-400/30">
            <Star className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
              В ближайшее время эксперт свяжется с вами через Telegram для обсуждения деталей и назначения удобного времени.
            </p>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-black/60 border border-amber-400/30">
            <Zap className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed">
              Аудит включает анализ бизнес-процессов, рекомендации по внедрению ИИ и персональный план развития.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={onGoToHistory}
            className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden group"
          >
            <span className="liquid-bubble-glare" />
            <History className="w-4 h-4 text-stone-950 relative z-10" />
            <span className="relative z-10 font-bold">История свайпов</span>
          </button>

          <button
            type="button"
            onClick={onGoToSwipes}
            className="w-full py-3 px-4 rounded-2xl liquid-bubble-secondary text-amber-100 hover:text-white font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden group"
          >
            <span className="liquid-bubble-glare" />
            <ArrowLeft className="w-4 h-4 text-amber-300 relative z-10" />
            <span className="relative z-10">Вернуться к подбору</span>
          </button>
        </div>
      </div>
    </GlassModal>
  );
};

export default AuditInfoModal;
