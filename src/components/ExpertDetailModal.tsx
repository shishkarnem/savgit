import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Check, 
  Sparkles, 
  Award, 
  Cpu, 
  Briefcase, 
  Layers, 
  ShieldCheck, 
  User, 
  FileText,
  Clock
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Rivets from '@/components/Rivets';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';
import { 
  getExpertRealName, 
  formatExpertPseudonym, 
  cleanExpertMarkdown 
} from '@/utils/expertUtils';

export interface ExpertDetailModalProps {
  isOpen: boolean;
  expert: any | null;
  onClose: () => void;
  onSelect?: (expert: any) => void;
  isSelected?: boolean;
}

export const ExpertDetailModal: React.FC<ExpertDetailModalProps> = ({
  isOpen,
  expert,
  onClose,
  onSelect,
  isSelected = false
}) => {
  if (!isOpen || !expert) return null;

  const realName = getExpertRealName(expert);
  const pseudonym = formatExpertPseudonym(expert);
  const cleanDescription = cleanExpertMarkdown(expert.description);
  const cleanCases = cleanExpertMarkdown(expert.cases);
  const cleanOther = cleanExpertMarkdown(expert.other_info || expert.other);

  const toolsList = (expert.tools || '')
    .split(/[,;\n]+/)
    .map((t: string) => t.trim())
    .filter((t: string) => t.length > 1);

  const spheresList = (expert.spheres || '')
    .split(/[,;\n]+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 1);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-black/90 border border-amber-400/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative overflow-hidden my-auto text-white"
        >
          <Rivets />
          <RealisticSmokeBackdrop speed="fast" opacity={0.45} className="-top-6 -left-10 w-[calc(100%+80px)] h-[120px] pointer-events-none" />

          {/* Header Bar */}
          <div className="relative z-10 p-5 sm:p-6 border-b border-amber-400/25 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-amber-400/45 bg-black/70 shrink-0 shadow-lg relative">
                {expert.photo_url ? (
                  <img
                    src={expert.photo_url}
                    alt={pseudonym}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/60 text-amber-300">
                    <User className="w-8 h-8" />
                  </div>
                )}
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(231,199,104,0.9)]" />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm px-3 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-200 font-medium flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Сертифицированный эксперт SAV AI</span>
                  </span>
                  {pseudonym && (
                    <span className="text-sm px-3 py-0.5 rounded-full bg-white/10 border border-white/20 text-white font-mono">
                      Псевдоним: {pseudonym}
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                  {realName || pseudonym}
                </h3>

                {realName && pseudonym && (
                  <p className="text-sm sm:text-base text-zinc-300 font-medium">
                    Официальный статус: куратор проектов роботизации • {pseudonym}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/15 text-zinc-300 hover:text-white transition-all cursor-pointer backdrop-blur-md shrink-0"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="relative z-10 p-5 sm:p-6 md:p-8 space-y-6 overflow-y-auto flex-grow text-sm sm:text-base leading-relaxed">
            
            {/* Quick Metrics Bar in Liquid Glass Apple style */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-sm text-zinc-400 block">Статус эксперта:</span>
                <span className="font-semibold text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Верифицирован</span>
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-sm text-zinc-400 block">Реальное имя:</span>
                <span className="font-semibold text-white truncate block">
                  {realName || 'Подтверждено в SAV AI'}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-sm text-zinc-400 block">Псевдоним:</span>
                <span className="font-semibold text-amber-300 font-mono block">
                  {pseudonym}
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/10 space-y-1">
                <span className="text-sm text-zinc-400 block">Специализация:</span>
                <span className="font-semibold text-zinc-200 truncate block">
                  {expert.role || 'ИИ-архитектура'}
                </span>
              </div>
            </div>

            {/* Cases & Deployments Section */}
            {cleanCases && (
              <div className="rounded-2xl bg-black/60 border border-amber-400/30 p-4 sm:p-5 space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                  <Briefcase className="w-5 h-5 text-amber-400" />
                  <span>Реализованные кейсы и внедрения</span>
                </div>

                <div className="prose prose-invert max-w-none text-zinc-200 text-sm sm:text-base leading-relaxed">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 text-zinc-200 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-5 list-disc marker:text-amber-400 text-zinc-200">{children}</ul>,
                      li: ({ children }) => <li className="pl-1 leading-snug">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-amber-300">{children}</strong>
                    }}
                  >
                    {cleanCases}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Profile & Biography Section */}
            {cleanDescription && (
              <div className="rounded-2xl bg-black/60 border border-white/15 p-4 sm:p-5 space-y-3 relative">
                <div className="flex items-center gap-2 text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>Профессиональный опыт и профиль</span>
                </div>

                <div className="prose prose-invert max-w-none text-zinc-200 text-sm sm:text-base leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h3 className="text-base sm:text-lg font-bold text-amber-200 mt-2 mb-1">{children}</h3>,
                      h2: ({ children }) => <h4 className="text-sm sm:text-base font-bold text-amber-100 mt-2 mb-1">{children}</h4>,
                      p: ({ children }) => <p className="mb-2 text-zinc-200 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="space-y-1.5 my-2 pl-5 list-disc marker:text-amber-400 text-zinc-200">{children}</ul>,
                      li: ({ children }) => <li className="pl-1 leading-snug">{children}</li>,
                      strong: ({ children }) => <strong className="font-bold text-amber-300">{children}</strong>
                    }}
                  >
                    {cleanDescription}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {/* Spheres of Competence */}
            {spheresList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-amber-200">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Отраслевые сферы и компетенции:</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {spheresList.map((sphere: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-zinc-200 text-sm font-medium hover:border-amber-400/40 hover:text-white transition-all backdrop-blur-md"
                    >
                      {sphere}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tools & Tech Stack */}
            {toolsList.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-amber-200">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Инструменты, нейросети и технологический стек:</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {toolsList.map((tool: string, idx: number) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-sm font-medium hover:bg-amber-400/20 hover:border-amber-400/60 transition-all backdrop-blur-md"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Additional Info */}
            {cleanOther && (
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2 text-sm sm:text-base">
                <span className="font-semibold text-amber-200 block">Дополнительные сведения:</span>
                <p className="text-zinc-300 leading-relaxed whitespace-pre-line">
                  {cleanOther}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="relative z-10 p-5 sm:p-6 border-t border-amber-400/25 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/15 hover:from-white/15 hover:to-white/20 text-zinc-300 hover:text-white border border-white/20 text-sm sm:text-base font-medium transition-all cursor-pointer backdrop-blur-md"
            >
              Закрыть карточку
            </button>

            {onSelect && (
              <button
                type="button"
                onClick={() => {
                  onSelect(expert);
                  onClose();
                }}
                className={`w-full sm:w-auto px-7 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md ${
                  isSelected
                    ? 'bg-amber-400/20 text-amber-200 border border-amber-400 shadow-[0_0_15px_rgba(231,199,104,0.3)]'
                    : 'bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 hover:from-amber-400/40 hover:to-amber-500/50 text-amber-200 border border-amber-400/50 shadow-[0_0_18px_rgba(231,199,104,0.35)] hover:scale-[1.02] active:scale-95'
                }`}
              >
                <Check className="w-5 h-5 text-amber-300" />
                <span>{isSelected ? 'Выбран куратором проекта' : 'Назначить куратором проекта'}</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExpertDetailModal;
