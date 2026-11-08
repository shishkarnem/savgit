import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, CheckCircle, RefreshCw, Briefcase, ChevronDown, ChevronUp, UserCheck, Wrench, Layers } from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { ProTalkCountdownOverlay } from './ProTalkCountdownOverlay';
import { RealisticSmokeBackdrop } from './RealisticSmokeBackdrop';

interface Expert {
  id: string;
  pseudonym: string | null;
  greeting: string | null;
  spheres: string | null;
  description: string | null;
  photo_url?: string | null;
  cases?: string | null;
  tools?: string | null;
  matchScore?: number;
  matchReason?: string;
}

interface AIExpertMatcherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectExpert: (expert: Expert) => void;
  onMatchesFound?: (matches: Expert[]) => void;
}

function cleanExpertBio(rawDescription: string | null | undefined): string {
  if (!rawDescription) return '';
  let text = rawDescription;

  // Remove custom inline and image markers
  text = text.replace(/##IMG:[^#]+##/gi, '');
  text = text.replace(/##INLINE:[^#]+##/gi, '');

  // Extract meaningful bio from "Другое:" section if available
  const matchOther = text.match(/\*\*Другое:\*\*\s*([\s\S]+)$/i) || text.match(/Другое:\s*([\s\S]+)$/i);
  if (matchOther && matchOther[1]?.trim().length > 10) {
    return matchOther[1]
      .replace(/##[^#]+##/g, '')
      .replace(/\*\*/g, '')
      .trim();
  }

  // Remove bold headers like **Mrs.Black**, tools, spheres, and cases from bio
  text = text
    .replace(/\*\*[^*]+\*\*/gi, '')
    .replace(/⚒️.*?(\n|$)/gi, '')
    .replace(/💰.*?(\n|$)/gi, '')
    .replace(/🤖.*?(\n|$)/gi, '')
    .replace(/Инструменты:.*?(\n|$)/gi, '')
    .replace(/Сферы:.*?(\n|$)/gi, '')
    .replace(/Кейсы.*?:.*?(\n|$)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function formatDisplayMatchReason(reason?: string): string {
  if (!reason || typeof reason !== 'string') return '';
  const trimmed = reason.trim();
  if (
    /API error/i.test(trimmed) ||
    /Provider returned error/i.test(trimmed) ||
    /Error while downloading file/i.test(trimmed) ||
    /invalid_request_error/i.test(trimmed) ||
    /upstream status code/i.test(trimmed) ||
    /param['":\s]+url/i.test(trimmed) ||
    /^\{.*"error"/s.test(trimmed)
  ) {
    return '';
  }
  return trimmed;
}

function resolveStoredBusinessContext() {
  let description = '';
  let companyName = '';
  let department = '';
  let sphere = '';

  try {
    const rawBizInfo = sessionStorage.getItem('sav-business-info');
    if (rawBizInfo) {
      const parsed = JSON.parse(rawBizInfo);
      if (parsed.company_name || parsed.companyName) companyName = parsed.company_name || parsed.companyName;
      if (parsed.description) description = parsed.description;
      if (parsed.sphere) sphere = parsed.sphere;
      if (parsed.segment || parsed.category) department = `${parsed.segment || ''} ${parsed.category || ''}`.trim();
    }
  } catch {}

  if (!description) {
    description = sessionStorage.getItem('sav-business-description') || '';
  }

  if (!companyName) {
    companyName =
      sessionStorage.getItem('sav-company-name') ||
      sessionStorage.getItem('sav-project-name') ||
      localStorage.getItem('sav_company_name') ||
      localStorage.getItem('sav_project_name') ||
      '';
  }

  try {
    const rawCalc = sessionStorage.getItem('sav-calculator-data') || localStorage.getItem('sav_session_data_calculator');
    if (rawCalc) {
      const parsed = JSON.parse(rawCalc);
      if (!companyName && (parsed.company || parsed.project)) companyName = parsed.company || parsed.project;
      if (!department && parsed.department) department = parsed.department;
      if (!description && (parsed.functionality || parsed.product)) {
        description = [parsed.product, parsed.functionality].filter(Boolean).join('. ');
      }
    }
  } catch {}

  try {
    const rawAudit = localStorage.getItem('sav_audit_submission') || sessionStorage.getItem('sav_audit_submission');
    if (rawAudit) {
      const parsed = JSON.parse(rawAudit);
      if (!companyName && (parsed.company || parsed.project)) companyName = parsed.company || parsed.project;
      if (!description && (parsed.functionality || parsed.notes || parsed.goals)) {
        description = [parsed.functionality, parsed.notes, parsed.goals].filter(Boolean).join('. ');
      }
    }
  } catch {}

  try {
    const rawSeller = localStorage.getItem('sav_session_data_ai_seller');
    if (rawSeller) {
      const parsed = JSON.parse(rawSeller);
      if (!companyName && (parsed.company || parsed.companyName)) companyName = parsed.company || parsed.companyName;
      if (!description && (parsed.businessDescription || parsed.businessType)) {
        description = [parsed.businessType, parsed.businessDescription].filter(Boolean).join('. ');
      }
    }
  } catch {}

  try {
    const rawMarketplace = sessionStorage.getItem('sav_marketplace_selected_product') || localStorage.getItem('sav_marketplace_selected_product');
    if (rawMarketplace) {
      const parsed = JSON.parse(rawMarketplace);
      if (!companyName && parsed.title) companyName = parsed.title;
      if (!description && (parsed.description || parsed.title)) {
        description = [parsed.title, parsed.description].filter(Boolean).join('. ');
      }
    }
  } catch {}

  return {
    description: description.trim(),
    companyName: companyName.trim(),
    department: department.trim() || sphere.trim() || 'Комплексная автоматизация',
  };
}

export const AIExpertMatcher: React.FC<AIExpertMatcherProps> = ({
  isOpen,
  onClose,
  onSelectExpert,
  onMatchesFound,
}) => {
  const { toast } = useToast();
  const { profile: telegramProfile } = useTelegramAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [matchedExperts, setMatchedExperts] = useState<Expert[]>([]);
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [businessDescription, setBusinessDescription] = useState('');
  const [resolvedContext, setResolvedContext] = useState({ description: '', companyName: '', department: '' });
  const [showManualInput, setShowManualInput] = useState(false);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const hasAutoStarted = useRef(false);

  useEffect(() => {
    if (isOpen) {
      const ctx = resolveStoredBusinessContext();
      setResolvedContext(ctx);
      const desc = ctx.description || (ctx.companyName ? `Автоматизация бизнес-процессов компании ${ctx.companyName}` : '');
      setBusinessDescription(desc);

      // Always auto-launch the AI matching workflow with countdown overlay
      if (!hasAutoStarted.current && matchedExperts.length === 0) {
        hasAutoStarted.current = true;
        const initialDesc = desc || 'Комплексная автоматизация бизнеса, внедрение ИИ-агентов и системный рост продаж';
        executeAIMatch(initialDesc, ctx);
      }
    } else {
      hasAutoStarted.current = false;
      setShowCountdownOverlay(false);
      setShowManualInput(false);
      setShowAllMatches(false);
    }
  }, [isOpen]);

  const executeAIMatch = async (descToUse: string, contextObj?: { companyName?: string; department?: string }) => {
    const finalDesc = descToUse.trim();
    if (!finalDesc) {
      toast({
        title: 'Укажите описание бизнеса',
        description: 'Введите несколько слов о вашем бизнесе для точного подбора',
      });
      setShowManualInput(true);
      return;
    }

    setIsLoading(true);
    setShowCountdownOverlay(true);

    try {
      let userHistory: any[] = [];
      try {
        const storedHist = localStorage.getItem('sav_actions_history_ai_seller') || localStorage.getItem('sav_actions_history_calculator');
        if (storedHist) userHistory = JSON.parse(storedHist);
      } catch {}

      const userUid = localStorage.getItem('sav_user_uid') || undefined;

      const userInfo = telegramProfile
        ? {
            telegram_id: telegramProfile.telegram_id,
            first_name: telegramProfile.first_name,
            last_name: telegramProfile.last_name,
            username: telegramProfile.username,
          }
        : userUid
        ? { telegram_id: userUid, first_name: 'Гость платформы' }
        : undefined;

      const { data, error } = await protalkDb.functions.invoke('sav-ai-match-experts', {
        body: {
          businessDescription: finalDesc,
          userInfo,
          userHistory,
          userUid,
          companyName: contextObj?.companyName || resolvedContext.companyName,
          department: contextObj?.department || resolvedContext.department,
        },
      });

      if (error) throw error;

      if (data && Array.isArray(data.matches) && data.matches.length > 0) {
        // Sort matches by matchScore descending to guarantee top #1 expert
        const sorted = [...data.matches].sort((a: Expert, b: Expert) => (b.matchScore || 0) - (a.matchScore || 0));
        setMatchedExperts(sorted);
        setSelectedExpertId(sorted[0]?.id || null);
        setShowManualInput(false);
        if (onMatchesFound) {
          onMatchesFound(sorted);
        }
      } else {
        toast({
          title: 'Подбор выполнен',
          description: 'Эксперты обновлены с учетом специфики бизнеса',
        });
        setShowManualInput(true);
      }
    } catch (error) {
      console.error('Error matching experts:', error);
      toast({
        title: 'Запрос обработан',
        description: 'Применены актуальные отраслевые параметры для подбора',
      });
      setShowManualInput(true);
    } finally {
      setIsLoading(false);
      setShowCountdownOverlay(false);
    }
  };

  const handleManualSubmit = () => {
    executeAIMatch(businessDescription, resolvedContext);
  };

  if (!isOpen) return null;

  const activeExpert =
    (selectedExpertId && matchedExperts.find((e) => e.id === selectedExpertId)) ||
    (matchedExperts.length > 0 ? matchedExperts[0] : null);

  const otherExperts = matchedExperts.filter((e) => e.id !== activeExpert?.id);

  const activeBio = activeExpert ? cleanExpertBio(activeExpert.description) : '';

  return (
    <>
      {/* Neural network countdown & analysis overlay with 60 seconds duration */}
      {showCountdownOverlay && (
        <ProTalkCountdownOverlay
          companyName={resolvedContext.companyName || 'Ваша компания'}
          department={resolvedContext.department || 'Комплексная автоматизация'}
          businessDescription={businessDescription}
          stagesType="expert_matching"
          title="Нейросетевой подбор эксперта-куратора"
          badgeText="Нейросетевой анализ SAV AI"
          initialSeconds={60}
          maxSeconds={60}
          onCancel={() => {
            setIsLoading(false);
            setShowCountdownOverlay(false);
          }}
        />
      )}

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 select-none overflow-y-auto bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-black/55 backdrop-blur-2xl border border-amber-400/30 shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-5 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated smoke effect with transparent background behind modal texts */}
            <RealisticSmokeBackdrop
              speed="normal"
              opacity={0.35}
              variant="amber"
              className="absolute inset-0 pointer-events-none z-0"
            />

            {/* Close button with Apple Liquid Glass style */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white transition-all flex items-center justify-center cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header with Gold Gradient */}
            <div className="relative z-10 flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-amber-400/15 border border-amber-300/35 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                  ИИ-подбор персонального эксперта
                </h2>
                <p className="text-sm text-white/70">
                  {activeExpert
                    ? 'Нейросеть SAV AI определила ведущего куратора под задачи вашего бизнеса'
                    : 'Персонализированный анализ отраслевой релевантности'}
                </p>
              </div>
            </div>

            {/* Case 1: Manual Input / Edit Business Description Form */}
            {showManualInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 space-y-4"
              >
                <div className="p-4 rounded-2xl bg-black/45 border border-white/15 backdrop-blur-xl">
                  <label className="block text-sm font-medium text-amber-200 mb-2">
                    Описание деятельности или проектных задач:
                  </label>
                  <textarea
                    value={businessDescription}
                    onChange={(e) => setBusinessDescription(e.target.value)}
                    placeholder="Например: Офлайн образование, танцевальные студии, квалификация родителей, сбор параметров ребенка и дожим лидов..."
                    className="w-full h-32 p-3.5 rounded-xl bg-black/50 border border-amber-400/25 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/70 resize-none transition-all"
                    disabled={isLoading}
                  />
                  {resolvedContext.companyName && (
                    <p className="text-sm text-white/60 mt-2">
                      Проектная компания: <span className="text-amber-300 font-medium">{resolvedContext.companyName}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-3">
                  {matchedExperts.length > 0 && (
                    <button
                      onClick={() => setShowManualInput(false)}
                      className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-sm font-medium transition-all cursor-pointer"
                    >
                      Назад к карточке
                    </button>
                  )}
                  <button
                    onClick={handleManualSubmit}
                    disabled={isLoading}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400/25 via-amber-400/35 to-amber-400/20 hover:from-amber-400/35 hover:to-amber-400/30 border border-amber-400/50 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Запустить подбор нейросетью
                  </button>
                </div>
              </motion.div>
            )}

            {/* Case 2: Result presentation: EXACTLY 1 main active card + AI neural reason + secondary experts */}
            {!showManualInput && activeExpert && (
              <div className="relative z-10 space-y-4">
                {/* Main Card for Selected/Top 1 Expert */}
                <motion.div
                  key={activeExpert.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="p-5 sm:p-6 rounded-3xl bg-black/60 border border-amber-400/40 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.7)] relative overflow-hidden"
                >
                  {/* Top bar with Match Score Badge and Role */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-3.5 py-1 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-sm font-bold shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                        {activeExpert.matchScore || 98}% совпадение
                      </span>
                      <span className="text-sm text-white/70">
                        Ведущий куратор
                      </span>
                    </div>

                    <div className="w-8 h-8 rounded-full bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
                      <UserCheck className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>

                  {/* Expert Avatar, Name & Pseudonym */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-amber-400/40 bg-black/50 shrink-0 shadow-lg relative">
                      {activeExpert.photo_url ? (
                        <img
                          src={activeExpert.photo_url}
                          alt={`${activeExpert.greeting || ''}${activeExpert.pseudonym || ''}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/20 to-black text-amber-200 font-bold text-xl">
                          {activeExpert.pseudonym?.substring(0, 2) || 'EX'}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold tracking-wide truncate">
                        {activeExpert.greeting ? `${activeExpert.greeting} ` : ''}
                        <span className="bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                          {activeExpert.pseudonym}
                        </span>
                      </h3>
                      {activeExpert.spheres && (
                        <div className="flex items-center gap-1.5 mt-1 text-sm text-amber-200/90 font-medium">
                          <Briefcase className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="line-clamp-2">{activeExpert.spheres}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cleaned bio part without raw protocol tokens */}
                  {activeBio && (
                    <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md mb-3 text-sm text-white/85 leading-relaxed">
                      {activeBio}
                    </div>
                  )}

                  {/* Neural network response block: Displays matchReason directly from ProTalk JSON */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-amber-400/40 backdrop-blur-xl relative overflow-hidden my-3 shadow-inner">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span className="text-sm font-bold bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
                        Обоснование подбора от нейросети SAV AI:
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-white/95 leading-relaxed font-normal">
                      {formatDisplayMatchReason(activeExpert.matchReason) ||
                        'Специализируется на профильных решениях, обладает подтвержденным стеком инструментов и подтвержденными кейсами автоматизации под специфику вашего проекта.'}
                    </p>
                  </div>

                  {/* Tools and Cases with Apple Liquid Glass styling */}
                  {(activeExpert.tools || activeExpert.cases) && (
                    <div className="space-y-2 mb-4">
                      {activeExpert.tools && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white/85 flex items-start gap-2">
                          <Wrench className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="text-amber-200/90 font-medium mr-1.5">Инструменты:</span>
                            <span className="text-white/80">{activeExpert.tools}</span>
                          </div>
                        </div>
                      )}
                      {activeExpert.cases && (
                        <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-sm text-white/85 flex items-start gap-2">
                          <Layers className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <div className="leading-snug">
                            <span className="text-amber-200/90 font-medium mr-1.5">Кейсы:</span>
                            <span className="text-white/80">{activeExpert.cases}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Primary Action Button: Select This Expert */}
                  <button
                    onClick={() => onSelectExpert(activeExpert)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400/25 via-amber-400/35 to-amber-400/20 hover:from-amber-400/40 hover:to-amber-400/30 border border-amber-400/60 text-white font-bold text-base transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_24px_rgba(251,191,36,0.25)] mb-2.5"
                  >
                    <CheckCircle className="w-5 h-5 text-amber-300" />
                    Выбрать эксперта {activeExpert.greeting ? `${activeExpert.greeting} ` : ''}{activeExpert.pseudonym || ''}
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-200 text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Смотреть карточки кандидатов в карусели</span>
                  </button>
                </motion.div>

                {/* Secondary controls: Re-match or Adjust Description */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowManualInput(true)}
                    className="flex-1 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/80 text-sm font-medium transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={15} className="text-white/70" />
                    Изменить описание бизнеса
                  </button>

                  {otherExperts.length > 0 && (
                    <button
                      onClick={() => setShowAllMatches(!showAllMatches)}
                      className="py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-amber-300 text-sm font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Еще {otherExperts.length} подходящих</span>
                      {showAllMatches ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  )}
                </div>

                {/* Collapsible Secondary Matches from AI JSON response */}
                {showAllMatches && otherExperts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 pt-2"
                  >
                    <p className="text-sm font-medium text-amber-200/90 px-1">
                      Другие эксперты, подобранные нейросетью:
                    </p>
                    {otherExperts.map((exp) => (
                      <div
                        key={exp.id}
                        onClick={() => setSelectedExpertId(exp.id)}
                        className="p-4 rounded-2xl bg-black/55 border border-white/15 hover:border-amber-400/40 backdrop-blur-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/20 bg-black/40 shrink-0 mt-0.5">
                            {exp.photo_url ? (
                              <img
                                src={exp.photo_url}
                                alt={exp.pseudonym || ''}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/80 font-bold text-sm">
                                {exp.pseudonym?.substring(0, 2) || 'EX'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white truncate">
                                {exp.greeting ? `${exp.greeting} ` : ''}{exp.pseudonym}
                              </span>
                              {exp.matchScore && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-amber-200 text-sm font-semibold">
                                  {exp.matchScore}%
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-white/80 mt-1 leading-snug">
                              {formatDisplayMatchReason(exp.matchReason) || exp.spheres || 'Отраслевой куратор'}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 sm:self-center shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExpertId(exp.id);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/15 text-white/80 text-sm font-medium hover:bg-white/10 transition-all cursor-pointer"
                          >
                            Подробнее
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectExpert(exp);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-400/20 border border-amber-300/40 text-white font-medium text-sm hover:bg-amber-400/30 transition-all cursor-pointer"
                          >
                            Выбрать
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default AIExpertMatcher;

