import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  ArrowRight,
  Store,
  Calculator,
  Compass,
  Users,
  Handshake,
  Sparkles,
} from 'lucide-react';
import ProjectedGlassCard from './ProjectedGlassCard';
import RealisticSmokeBackdrop from './RealisticSmokeBackdrop';
import Rivets from './Rivets';
import { AudioField } from './AudioField';
import { MiniAudioField } from './MiniAudioField';
import { AlgorithmItem } from '@/data/algorithmsData';
import { getOrGenerateUID } from '@/lib/uidHelper';

interface SteampunkCockpitProps {
  onClassify?: (description: string) => void;
  onCalculator?: () => void;
}

export const SteampunkCockpit: React.FC<SteampunkCockpitProps> = ({
  onClassify,
}) => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState(() => sessionStorage.getItem('sav-company-name') || '');
  const [companyTouched, setCompanyTouched] = useState(false);
  const initialSharedText = () => sessionStorage.getItem('sav-business-description') || sessionStorage.getItem('sav-calculator-tz') || '';
  const [value, setValue] = useState(initialSharedText);
  const [calcWishes, setCalcWishes] = useState(initialSharedText);
  const [isPressingLaunch, setIsPressingLaunch] = useState(false);
  const [steamBurst, setSteamBurst] = useState(false);
  const [selectedAlgoId, setSelectedAlgoId] = useState<string | null>(null);

  const isCompanyValid = companyName.trim().length > 0;
  const isDescriptionValid = value.trim().length >= 5;
  const isInputValid = isCompanyValid && isDescriptionValid;

  const handleCompanyChange = (val: string) => {
    setCompanyName(val);
    sessionStorage.setItem('sav-company-name', val.trim());
    if (!companyTouched && val.trim().length > 0) {
      setCompanyTouched(true);
    }
  };

  const syncInputs = (newVal: string) => {
    setValue(newVal);
    setCalcWishes(newVal);
    sessionStorage.setItem('sav-business-description', newVal);
    sessionStorage.setItem('sav-calculator-tz', newVal);
    sessionStorage.setItem('sav-calculator-dictation', newVal);
  };

  const handleLaunch = () => {
    setCompanyTouched(true);
    if (!isCompanyValid) {
      const el = document.getElementById('landing-company-name-input');
      if (el) el.focus();
      return;
    }
    if (!isDescriptionValid) return;
    setIsPressingLaunch(true);
    setSteamBurst(true);

    const description = value.trim();
    const cleanCompany = companyName.trim();
    sessionStorage.setItem('sav-business-description', description);
    sessionStorage.setItem('sav-calculator-tz', description);
    sessionStorage.setItem('sav-calculator-dictation', description);
    sessionStorage.setItem('sav-company-name', cleanCompany);
    sessionStorage.removeItem('sav-business-info'); // Fresh generation

    // Ensure 11-digit numeric UID is ready
    getOrGenerateUID();

    setTimeout(() => {
      setIsPressingLaunch(false);
      setSteamBurst(false);
      if (onClassify) {
        onClassify(description);
      } else {
        navigate('/ai-seller/result');
      }
    }, 350);
  };

  const handleSelectAlgorithm = (algo: AlgorithmItem) => {
    if (!algo.id) {
      setSelectedAlgoId(null);
      return;
    }
    setSelectedAlgoId(algo.id);
    const textToInsert = `${algo.name}: ${algo.description}`;
    syncInputs(textToInsert);
  };

  return (
    <div className="w-full relative select-none pb-10 perspective-cockpit">
      {/* Main HUD Deck: Exact desktop distribution 5% left margin / 40% seller column / 5% gap / 35% calculator column / 15% right margin */}
      <div className="w-full flex flex-col lg:flex-row items-start relative z-10 lg:pl-[5%] lg:pr-[15%] gap-6 lg:gap-[5%]">
        {/* ========================================================= */}
        {/* 1. TERMINAL CONSOLE: AI ARCHITECT (40% on desktop)        */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full lg:w-[40%] shrink-0"
        >
          <ProjectedGlassCard intensity={1.2} depth={12}>
            {/* Outer container is fully transparent with no border */}
            <div className="relative bg-transparent border-0 ring-0 shadow-none p-1 sm:p-2 overflow-visible">
              {/* Main Headline with Realistic Dark Smoke Animation Backdrop */}
              <div className="relative mb-5 p-3 sm:p-4 rounded-2xl overflow-visible">
                {/* SVG Smoke Animation strictly behind this text block with 0.62 opacity */}
                <RealisticSmokeBackdrop speed="fast" opacity={0.62} />

                <div className="relative z-10 space-y-2">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    Если нужен ИИ-продавец
                  </h1>
                  <p className="text-sm sm:text-base text-amber-50 leading-relaxed font-sans font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                    Интеллектуальная роботизация продаж: мгновенная квалификация входящих заявок, дожим клиентов в чатах и бесшовная интеграция с CRM 24/7 без перерывов.
                  </p>
                </div>
              </div>

              {/* Company Name Input Field with MiniAudioField */}
              <div className={`relative rounded-2xl bg-black/75 backdrop-blur-2xl border ${
                !isCompanyValid && companyTouched ? 'border-amber-300 ring-2 ring-amber-400/50' : 'border-amber-400/40'
              } p-3.5 sm:p-4 mb-3.5 group focus-within:border-amber-300 focus-within:ring-2 focus-within:ring-amber-400/35 transition-all`}>
                <Rivets />
                <div className="flex items-center justify-between text-amber-200 pb-1.5 border-b border-amber-400/25 mb-2 font-mono">
                  <span className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
                    <Store className="w-4 h-4 text-amber-400" />
                    Название компании или проекта:
                    <span className="text-amber-300 font-semibold">*</span>
                  </span>
                  <span className="text-sm text-amber-300 font-medium">
                    обязательно
                  </span>
                </div>

                <MiniAudioField
                  id="landing-company-name-input"
                  value={companyName}
                  onChange={handleCompanyChange}
                  onBlur={() => setCompanyTouched(true)}
                  required={true}
                  placeholder="Например: Вектор Роста, Стоматология Дент, АН Эверест..."
                  className="bg-transparent border-0 px-0 py-0 shadow-none text-sm sm:text-base"
                />

                {!isCompanyValid && companyTouched && (
                  <p className="mt-2 text-sm text-amber-200 font-medium leading-relaxed">
                    Пожалуйста, укажите название компании или проекта
                  </p>
                )}
              </div>

              {/* Unified Input Field: Business Parameters, 1.5x Neural Sphere Mic, Transparent Input & Integrated Algorithms */}
              <div className="mb-5">
                <AudioField
                  value={value}
                  onChange={syncInputs}
                  label="Ввод параметров бизнеса"
                  minHeight="85px"
                  showPlayer={true}
                  selectedAlgoId={selectedAlgoId}
                  onSelectAlgorithm={handleSelectAlgorithm}
                />
              </div>

              {/* Launch Action Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleLaunch}
                  disabled={!isInputValid}
                  className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all duration-200 relative overflow-hidden group cursor-pointer ${
                    !isInputValid
                      ? 'bg-black/40 border border-amber-400/20 text-amber-200/40 cursor-not-allowed opacity-60'
                      : isPressingLaunch
                      ? 'liquid-bubble-secondary text-amber-100 hover:text-white translate-y-0.5 scale-[0.99]'
                      : 'liquid-bubble-secondary text-amber-100 hover:text-white hover:scale-[1.005] active:translate-y-0.5'
                  }`}
                >
                  {/* Glare Reflex */}
                  {isInputValid && <span className="liquid-bubble-glare" />}

                  <Bot className={`w-5 h-5 relative z-10 flex-shrink-0 transition-transform ${isInputValid ? 'text-amber-400 group-hover:rotate-12' : 'text-amber-200/40'}`} />
                  <span className="relative z-10 font-bold tracking-wide text-sm sm:text-base">
                    {!isCompanyValid
                      ? 'Укажите название компании или проекта'
                      : !isDescriptionValid
                      ? 'Введите минимум 5 символов о бизнесе'
                      : 'Сформировать архитектуру ИИ-продавца'}
                  </span>
                  <ArrowRight className={`w-5 h-5 relative z-10 flex-shrink-0 transition-transform ${isInputValid ? 'text-amber-400 group-hover:translate-x-1' : 'text-amber-200/40'}`} />

                  {/* Steam Burst Visual Animation */}
                  {steamBurst && (
                    <motion.div
                      initial={{ opacity: 0.8, scale: 0.3 }}
                      animate={{ opacity: 0, scale: 2.5 }}
                      transition={{ duration: 0.8 }}
                      className="absolute inset-0 bg-white/40 filter blur-md rounded-2xl pointer-events-none z-20"
                    />
                  )}
                </button>
              </div>
            </div>
          </ProjectedGlassCard>
        </motion.div>

        {/* ========================================================= */}
        {/* 2. ESTIMATE & APPLICATION BUILDER CONSOLE (35% on desktop) */}
        {/* ========================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          className="w-full lg:w-[35%] shrink-0"
        >
          <ProjectedGlassCard intensity={1.2} depth={12}>
            {/* Outer container is fully transparent with no border, matching Block 1 */}
            <div className="relative bg-transparent border-0 ring-0 shadow-none p-1 sm:p-2 overflow-visible">
              {/* Main Headline with Realistic Dark Smoke Animation Backdrop */}
              <div className="relative mb-5 p-3 sm:p-4 rounded-2xl overflow-visible">
                <RealisticSmokeBackdrop speed="fast" opacity={0.62} />
                <div className="relative z-10 space-y-2">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent tracking-tight leading-snug drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)]">
                    Если нужно ИИ-приложение
                  </h2>
                  <p className="text-sm sm:text-base text-amber-50 leading-relaxed font-sans font-medium drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
                    Автономная замена отдела компании на защищенный программный комплекс React + BD ProTalk (PostgreSQL).
                  </p>
                </div>
              </div>

              {/* Enlarged AudioField for direct wishes and requirements dictation */}
              <div className="mb-5">
                <AudioField
                  value={calcWishes}
                  onChange={syncInputs}
                  label="Пожелание к ИИ-приложению или описание отдела:"
                  placeholder="Опишите задачи отдела или продиктуйте голосом (например: отдел продаж из 3 человек, прием заявок, квалификация и CRM)..."
                  minHeight="110px"
                  showPlayer={true}
                />
              </div>

              {/* Glass 3D Gradient Start Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const cleanCompany = companyName.trim();
                    if (!cleanCompany) {
                      setCompanyTouched(true);
                      const el = document.getElementById('landing-company-name-input');
                      if (el) el.focus();
                      return;
                    }
                    const currentTz = calcWishes.trim() || sessionStorage.getItem('sav-calculator-tz') || '';
                    sessionStorage.setItem('sav-company-name', cleanCompany);
                    if (currentTz) {
                      sessionStorage.setItem('sav-calculator-tz', currentTz);
                      sessionStorage.setItem('sav-calculator-dictation', currentTz);
                    } else if (value.trim()) {
                      sessionStorage.setItem('sav-calculator-tz', value.trim());
                    }
                    navigate('/calculator');
                  }}
                  className="w-full py-4 px-6 rounded-2xl font-bold liquid-bubble-secondary text-amber-100 hover:text-white border border-amber-400/50 shadow-[0_0_20px_rgba(231,199,104,0.35)] hover:scale-[1.005] active:translate-y-0.5 transition-all flex items-center justify-center gap-3 text-sm sm:text-base cursor-pointer relative overflow-hidden group"
                >
                  <span className="liquid-bubble-glare" />
                  <Sparkles className="w-5 h-5 text-amber-400 relative z-10 group-hover:rotate-12 transition-transform" />
                  <span className="relative z-10 tracking-wide font-bold">Рассчитать смету создания ИИ-приложения</span>
                  <ArrowRight className="w-5 h-5 text-amber-400 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>

                {!isCompanyValid && companyTouched && (
                  <p className="mt-2 text-sm text-amber-200 font-medium text-center">
                    Для расчета сметы укажите название компании или проекта
                  </p>
                )}
              </div>
            </div>
          </ProjectedGlassCard>
        </motion.div>
      </div>
    </div>
  );
};

export default SteampunkCockpit;
