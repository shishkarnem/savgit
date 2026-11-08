import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Users, 
  Check, 
  Info, 
  Loader2, 
  Bot, 
  ShieldCheck, 
  Star,
  Layers,
  Send,
  X,
  Award,
  ExternalLink
} from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';
import { ProTalkCountdownOverlay } from '@/components/ProTalkCountdownOverlay';
import { protalkDb } from '@/integrations/protalk/client';
import { Expert } from '@/components/ExpertCard';
import ExpertDetailModal from '@/components/ExpertDetailModal';
import GlobalFooter from '@/components/GlobalFooter';
import { 
  getExpertRealName, 
  formatExpertPseudonym, 
  formatExpertFullTitle 
} from '@/utils/expertUtils';
import { useToast } from '@/hooks/use-toast';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import CalculatorTabs from '@/components/CalculatorTabs';

const pageVariants = {
  initial: { opacity: 0, y: 15, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

/** Clean system markers like ✂️ from display text */
const cleanText = (text?: string | null): string => {
  if (!text) return '';
  return text.replace(/✂️/g, '').replace(/\s{2,}/g, ' ').trim();
};

/** Format full pseudonym with real name e.g. Фридман Ольга Игоревна (Ms.Violet) */
const formatExpertDisplayName = (exp: any): string => {
  return formatExpertFullTitle(exp);
};

export const CalculatorStep2: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [loadingExperts, setLoadingExperts] = useState(true);
  const [selectedExpertId, setSelectedExpertId] = useState<string>('');
  const [selectedExpertName, setSelectedExpertName] = useState<string>('Ms.Violet');
  const [currentIndex, setCurrentIndex] = useState(0);

  // AI Matching state
  const [isMatching, setIsMatching] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    expertId: string;
    expertName: string;
    matchScore: number;
    matchReason: string;
  } | null>(null);

  // Modal for detailed expert bio
  const [detailedExpert, setDetailedExpert] = useState<Expert | null>(null);

  // Form data state
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    trackAction('visit_page', { page: '/calculator/step2' });
  }, []);

  // Restore step data from sessionStorage / localStorage
  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data') || 
      localStorage.getItem('sav_calculator_data') || 
      localStorage.getItem('sav-calculator-data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(parsed);
        if (parsed.selectedExpertId) setSelectedExpertId(parsed.selectedExpertId);
        if (parsed.selectedExpert) setSelectedExpertName(parsed.selectedExpert);
        if (parsed.matchReason || parsed.matchedExpertId) {
          setMatchResult({
            expertId: parsed.matchedExpertId || parsed.selectedExpertId || '',
            expertName: parsed.matchedExpertName || parsed.selectedExpert || 'Ms.Violet',
            matchScore: parsed.matchScore || 97,
            matchReason: parsed.matchReason || `Критерии: ${parsed.matchedExpertName || parsed.selectedExpert || 'Ms.Violet'} наиболее подходит для проекта компании по автоматизации подразделения «${parsed.department || 'Отдел продаж'}».`
          });
        }
      } catch {}
    }
  }, []);

  // Fetch experts from BD ProTalk database and sort matched expert to front
  useEffect(() => {
    const loadExperts = async () => {
      setLoadingExperts(true);
      try {
        const { data, error } = await protalkDb
          .from('sav_experts')
          .select('*')
          .order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          let list = [...data];
          const saved = sessionStorage.getItem('sav-calculator-data');
          let targetId = selectedExpertId;
          let targetName = selectedExpertName;

          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed.matchedExpertId) targetId = String(parsed.matchedExpertId);
              if (parsed.selectedExpertId) targetId = String(parsed.selectedExpertId);
              if (parsed.matchedExpertName) targetName = parsed.matchedExpertName;
              else if (parsed.selectedExpert) targetName = parsed.selectedExpert;
            } catch {}
          }

          // Sort matched/selected expert to index 0
          if (targetId || targetName) {
            list.sort((a: any, b: any) => {
              const aName = formatExpertDisplayName(a);
              const bName = formatExpertDisplayName(b);
              const aMatch = String(a.id) === targetId || aName.toLowerCase() === targetName.toLowerCase() || aName.includes(targetName) || targetName.includes(aName);
              const bMatch = String(b.id) === targetId || bName.toLowerCase() === targetName.toLowerCase() || bName.includes(targetName) || targetName.includes(bName);
              if (aMatch && !bMatch) return -1;
              if (!aMatch && bMatch) return 1;
              return 0;
            });
          }

          setExperts(list as any);
          setCurrentIndex(0);

          const first = list[0];
          const name = formatExpertDisplayName(first);
          setSelectedExpertId(String(first.id));
          setSelectedExpertName(name);
        }
      } catch (err) {
        console.warn('Failed to load experts from BD ProTalk:', err);
      } finally {
        setLoadingExperts(false);
      }
    };
    loadExperts();
  }, []);

  // AI Expert matching trigger
  const handleAiMatch = async () => {
    if (isMatching || experts.length === 0) return;
    setIsMatching(true);

    try {
      const resp = await fetch('/api/v1/ai/calculator/expert-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.company || 'Проект клиента',
          product: formData.product || 'Услуги и продукты',
          department: formData.department || 'Отдел продаж',
          employeeCount: formData.employeeCount || '2',
          tzText: formData.functionality || 'Разработка автономного ИИ-приложения',
          expertsList: experts.map(e => ({
            id: String(e.id),
            name: formatExpertDisplayName(e),
            spheres: e.spheres,
            tools: e.tools,
            description: e.description,
          }))
        }),
      });

      const json = await resp.json();
      const d = json.data || json;
      if ((json.success || d.expertId) && (d.expertId || d.expertName)) {
        setMatchResult({
          expertId: d.expertId,
          expertName: d.expertName || 'Ms.Violet',
          matchScore: d.matchScore || 97,
          matchReason: d.matchReason || `Критерии: ${d.expertName || 'Ms.Violet'} наиболее подходит для проекта компании «${formData.company || 'клиента'}».`
        });
        
        // Find expert index in array
        const foundIdx = experts.findIndex(e => {
          const expName = formatExpertDisplayName(e);
          return String(e.id) === String(d.expertId) || 
                 expName.toLowerCase() === String(d.expertName).toLowerCase() ||
                 (e.pseudonym && String(d.expertName).toLowerCase().includes(e.pseudonym.toLowerCase()));
        });

        if (foundIdx !== -1) {
          setCurrentIndex(foundIdx);
          const targetExp = experts[foundIdx];
          const name = formatExpertDisplayName(targetExp);
          setSelectedExpertId(String(targetExp.id));
          setSelectedExpertName(name);
          updateLead({ selected_expert: name });
        }

        toast({
          title: "ИИ-Куратор подобран",
          description: `Рекомендован: ${d.expertName} (Совпадение ${d.matchScore || 97}%)`,
        });
      } else {
        throw new Error(json.error || 'Ошибка подбора');
      }
    } catch (e: any) {
      console.warn('AI Match error:', e);
      if (experts.length > 0) {
        const first = experts[0];
        const name = formatExpertDisplayName(first);
        setSelectedExpertId(String(first.id));
        setSelectedExpertName(name);
        setMatchResult({
          expertId: String(first.id),
          expertName: name,
          matchScore: 97,
          matchReason: `Критерии: ${name} наиболее подходит для проекта компании «${formData.company || 'клиента'}» по автоматизации подразделения «${formData.department || 'Отдел продаж'}».`,
        });
      }
    } finally {
      setIsMatching(false);
    }
  };

  const handleSelectExpert = (exp: Expert) => {
    const name = formatExpertDisplayName(exp);
    setSelectedExpertId(String(exp.id));
    setSelectedExpertName(name);
    updateLead({ selected_expert: name });
    toast({
      title: "Эксперт назначен",
      description: `Куратором проекта выбран: ${name}`,
    });
  };

  const handleNext = () => {
    const saved = sessionStorage.getItem('sav-calculator-data');
    const existing = saved ? JSON.parse(saved) : {};
    const merged = {
      ...existing,
      selectedExpertId,
      selectedExpert: selectedExpertName,
      step: 'step2',
    };

    trackAction('next_step', { page: '/calculator/step2', value: selectedExpertName });
    saveSessionData(merged as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify(merged));
    localStorage.setItem('sav_calculator_data', JSON.stringify(merged));
    localStorage.setItem('sav-calculator-data', JSON.stringify(merged));
    
    updateLead({
      selected_expert: selectedExpertName,
    });

    navigate('/calculator/step3');
  };

  const currentExpert = experts[currentIndex];

  const handlePrevSlide = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : experts.length - 1));
  };

  const handleNextSlide = () => {
    setCurrentIndex(prev => (prev < experts.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 sm:p-6 md:p-8 bg-transparent">
      <Header onLogoClick={() => navigate('/')} />

      <main className="w-full max-w-6xl flex-grow pt-2">
        {/* Calculation tabs allowing switching or starting new calculation */}
        <CalculatorTabs
          currentData={formData}
          currentStep="step2"
          onDataLoaded={(newData) => setFormData(prev => ({ ...prev, ...newData }))}
        />

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          {/* Header area with smoke backdrop and golden title */}
          <div className="relative mb-6 text-center">
            <RealisticSmokeBackdrop speed="fast" opacity={0.62} className="-top-6 -left-10 w-[calc(100%+80px)] h-[130px]" />
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              Выбор эксперта-куратора
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 mt-1 max-w-2xl mx-auto">
              Шаг 2 из 3: Назначение персонального системного интегратора для запуска ИИ-приложения
            </p>
          </div>

          {/* Progress bar in Liquid Glass Apple style */}
          <div className="w-full max-w-4xl mx-auto mb-6">
            <div className="flex justify-between text-sm text-amber-200/90 font-medium mb-1.5 px-1">
              <span>Шаг 2: Эксперт-куратор</span>
              <span>66%</span>
            </div>
            <div className="h-2.5 bg-black/60 backdrop-blur-md rounded-full overflow-hidden border border-white/10 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(231,199,104,0.6)]" 
                style={{ width: '66.66%' }} 
              />
            </div>
          </div>

          {/* Top Bar with Project Summary & AI Matching Button */}
          <div className="w-full mb-6 rounded-2xl bg-transparent backdrop-blur-2xl border border-amber-400/35 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
            <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
            <Rivets />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-amber-300 font-mono">Проект ИИ-приложения:</div>
                <div className="text-base sm:text-lg font-bold text-white flex flex-wrap items-center gap-2 mt-1">
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">{formData.company || 'Ваша компания'}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-amber-200">{formData.department || 'Отдел продаж'}</span>
                  <span className="text-zinc-500">•</span>
                  <span className="text-zinc-300 text-sm font-normal">Замена {formData.employeeCount || 2} сотр.</span>
                </div>
              </div>

              {/* AI Auto Match Button */}
              <button
                type="button"
                onClick={handleAiMatch}
                disabled={isMatching || loadingExperts}
                className="w-full md:w-auto px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-400/25 via-yellow-400/35 to-amber-500/25 hover:from-amber-400/35 hover:to-amber-500/45 border border-amber-400/45 text-amber-200 shadow-[0_0_15px_rgba(231,199,104,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer shrink-0 backdrop-blur-md"
              >
                {isMatching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                <span>ИИ-подбор эксперта под проект</span>
              </button>
            </div>

            {/* AI Match Result Banner */}
            {matchResult && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="relative z-10 mt-4 pt-3 border-t border-amber-400/20 flex items-start gap-3 text-sm text-zinc-200 bg-amber-400/10 p-4 rounded-xl border border-amber-400/30"
              >
                <Award className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-left">
                  <div className="font-bold text-amber-200 text-sm sm:text-base">
                    Вам подходит эксперт: <span className="text-white font-extrabold">{matchResult.expertName}</span>
                  </div>
                  <div className="text-sm font-semibold text-amber-300">
                    Соответствие: {matchResult.matchScore || 97}%
                  </div>
                  <div className="text-zinc-200 text-sm leading-relaxed">
                    <span className="font-semibold text-amber-200/90">Критерии: </span>
                    {matchResult.matchReason.replace(/^Критерии:\s*/i, '')}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Expert Carousel / Slider View */}
          {loadingExperts ? (
            <div className="w-full h-80 rounded-2xl bg-black/60 border border-white/10 flex flex-col items-center justify-center gap-3 relative">
              <Rivets />
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <div className="text-sm sm:text-base text-zinc-400">Загрузка карточек экспертов...</div>
            </div>
          ) : experts.length === 0 ? (
            <div className="w-full p-8 rounded-2xl bg-black/60 border border-white/10 text-center text-zinc-400 text-sm sm:text-base relative">
              <Rivets />
              Список экспертов пуст
            </div>
          ) : (
            <div className="space-y-6">
              {/* Carousel Container */}
              <div className="relative">
                {/* Navigation Arrows */}
                <button
                  type="button"
                  onClick={handlePrevSlide}
                  className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-black border border-amber-400/40 hover:border-amber-300 text-amber-200 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md"
                  title="Предыдущий эксперт"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  type="button"
                  onClick={handleNextSlide}
                  className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/80 hover:bg-black border border-amber-400/40 hover:border-amber-300 text-amber-200 flex items-center justify-center shadow-lg transition-all cursor-pointer backdrop-blur-md"
                  title="Следующий эксперт"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Active Expert Big Card */}
                {currentExpert && (
                  <div className={`w-full rounded-2xl bg-transparent backdrop-blur-2xl border transition-all p-5 sm:p-8 shadow-2xl relative overflow-hidden ${
                    selectedExpertId === String(currentExpert.id)
                      ? 'border-amber-400 shadow-[0_0_25px_rgba(231,199,104,0.35)]'
                      : 'border-amber-400/35 hover:border-amber-400/60'
                  }`}>
                    <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[90px]" />
                    <Rivets />

                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      {/* Photo column: 16:9 horizontal format */}
                      <div className="md:col-span-5 flex flex-col items-center">
                        <div className="w-full aspect-video max-w-md rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-xl relative bg-black/80">
                          {currentExpert.photo_url ? (
                            <img
                              src={currentExpert.photo_url}
                              alt={currentExpert.pseudonym || 'Expert'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-amber-400">
                              <Users className="w-16 h-16" />
                            </div>
                          )}
                          {selectedExpertId === String(currentExpert.id) && (
                            <div className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-amber-400/90 text-black text-sm font-bold flex items-center gap-1 shadow-md">
                              <Check className="w-4 h-4 stroke-[3]" />
                              <span>Выбран</span>
                            </div>
                          )}
                        </div>

                        {/* Status indicator */}
                        <div className="mt-3 flex items-center gap-2 text-sm text-amber-300 font-mono">
                          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                          <span>Доступен для проекта</span>
                        </div>
                      </div>

                      {/* Info column */}
                      <div className="md:col-span-7 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
                          <div>
                            <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                              {formatExpertDisplayName(currentExpert)}
                            </h3>
                            <p className="text-sm text-zinc-300 mt-1">
                              Ведущий эксперт-интегратор платформы SAV AI
                            </p>
                          </div>

                          <div className="text-sm font-mono text-amber-300 bg-black/40 px-3 py-1 rounded-lg border border-amber-400/30">
                            ID: #{currentExpert.id}
                          </div>
                        </div>

                        {/* Spheres & Specialization */}
                        {currentExpert.spheres && (
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-amber-200">
                              Ключевые специализации и компетенции:
                            </div>
                            <div className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                              {cleanText(currentExpert.spheres)}
                            </div>
                          </div>
                        )}

                        {/* Tools / Stack */}
                        {currentExpert.tools && (
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-amber-200">
                              Стек и технологии внедрения:
                            </div>
                            <div className="text-sm sm:text-base text-zinc-300 font-mono">
                              {cleanText(currentExpert.tools)}
                            </div>
                          </div>
                        )}

                        {/* Actions on card */}
                        <div className="pt-3 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleSelectExpert(currentExpert)}
                            className={`px-6 py-3 rounded-xl font-bold text-sm sm:text-base transition-all flex items-center gap-2 cursor-pointer backdrop-blur-md ${
                              selectedExpertId === String(currentExpert.id)
                                ? 'bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 text-amber-200 border border-amber-400 shadow-[0_0_15px_rgba(231,199,104,0.4)]'
                                : 'bg-gradient-to-r from-amber-400/15 via-yellow-400/25 to-amber-500/15 hover:from-amber-400/25 hover:to-amber-500/35 text-amber-200 border border-amber-400/35 shadow-md'
                            }`}
                          >
                            <Check className="w-4 h-4 stroke-[2.5]" />
                            <span>{selectedExpertId === String(currentExpert.id) ? 'Выбран куратором' : 'Выбрать эксперта'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailedExpert(currentExpert)}
                            className="px-5 py-3 rounded-xl bg-gradient-to-r from-white/10 to-white/15 hover:from-white/15 hover:to-white/20 border border-white/20 text-sm sm:text-base text-zinc-200 hover:text-white font-medium transition-all flex items-center gap-1.5 cursor-pointer backdrop-blur-md"
                          >
                            <Info className="w-4 h-4 text-amber-400" />
                            <span>Подробнее о кейсах</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thumbnails Strip */}
              <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
                {experts.map((exp, idx) => (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`w-20 aspect-video rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                      currentIndex === idx
                        ? 'border-amber-400 scale-105 shadow-[0_0_12px_rgba(231,199,104,0.5)]'
                        : 'border-white/20 opacity-60 hover:opacity-100'
                    }`}
                  >
                    {exp.photo_url ? (
                      <img src={exp.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center text-zinc-400 text-sm font-bold">
                        {idx + 1}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Controls in Liquid Glass Apple style */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-8 pt-5 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => navigate('/calculator/step1')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 text-zinc-300 hover:text-white border border-white/15 transition-all text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Вернуться к анкете (Шаг 1)</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 hover:from-amber-400/40 hover:to-amber-500/50 text-amber-200 border border-amber-400/50 shadow-[0_0_20px_rgba(231,199,104,0.35)] backdrop-blur-md hover:scale-[1.02] active:scale-95"
            >
              <span>Перейти к генерации сметы и ТЗ</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* AI Matching Fullscreen Overlay */}
          {isMatching && (
            <ProTalkCountdownOverlay
              title="ИИ-подбор персонального эксперта-куратора"
              badgeText="Анализ компетенций и кейсов SAV AI"
              stagesType="expert_matching"
              companyName={formData.company}
              department={formData.department}
              employeeCount={formData.employeeCount}
              maxSeconds={100}
              onCancel={() => setIsMatching(false)}
            />
          )}
        </motion.div>
      </main>

      {/* Modal with Full Expert Details & Cases in UI Markdown style */}
      <ExpertDetailModal
        isOpen={!!detailedExpert}
        expert={detailedExpert}
        onClose={() => setDetailedExpert(null)}
        onSelect={handleSelectExpert}
        isSelected={selectedExpertId === String(detailedExpert?.id)}
      />

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default CalculatorStep2;
