import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Bot, 
  Store, 
  Calculator, 
  Users, 
  Handshake, 
  ArrowRight, 
  Sparkles,
  Zap, 
  ShieldCheck, 
  Clock, 
  Layers,
  ChevronRight,
  BarChart3,
  Cpu
} from 'lucide-react';

interface IntroStepProps {
  inputValue?: string;
  setInputValue?: (value: string) => void;
  onClassify?: () => void;
  onCalculator?: () => void;
}

// Container staggered animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

const PRESET_PROMPTS = [
  "ИИ-продавец в Telegram и WhatsApp",
  "Интеграция с 1С и Bitrix24",
  "Автоматизация первой линии 24/7",
  "Расчёт экономии ФОТ отдела продаж"
];

export const IntroStep: React.FC<IntroStepProps> = ({
  inputValue,
  setInputValue,
  onClassify,
  onCalculator,
}) => {
  const navigate = useNavigate();

  const handleAISeller = () => {
    if (onClassify) {
      onClassify();
    } else {
      navigate('/ai-seller');
    }
  };

  const handleCalculator = () => {
    if (onCalculator) {
      onCalculator();
    } else {
      navigate('/calculator');
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 md:space-y-8"
    >
      {/* Hero Section: Asymmetric Split on Desktop */}
      <motion.div 
        variants={itemVariants}
        className="rounded-3xl bg-black/65 border border-amber-500/25 p-6 sm:p-8 md:p-10 shadow-2xl backdrop-blur-lg relative overflow-hidden"
      >
        {/* Top Brass Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-70" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Focused Text & Form Input (7 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold tracking-wider uppercase">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                Интеллектуальная роботизация предприятий
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Автономные ИИ-агенты и цифровые продавцы
              </h1>

              <p className="text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed font-normal">
                Комплексное внедрение нейро-сотрудников с интеграцией в CRM, 1С и мессенджеры. Квалификация лидов, дожим сделок и автоматизация рутины 24/7 без больничных и перерывов.
              </p>
            </div>

            {/* Business Task Input Area */}
            <div className="space-y-3 pt-2">
              <div className="relative">
                <textarea
                  className="w-full p-4 rounded-2xl bg-black/50 border border-amber-500/25 hover:border-amber-500/40 outline-none text-sm sm:text-base text-white placeholder:text-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all h-28 resize-none shadow-inner"
                  placeholder="Опишите вашу сферу или задачу (например: оптовые продажи стройматериалов, сеть стоматологий, онлайн-школа или производство)..."
                  value={inputValue || ''}
                  onChange={(e) => setInputValue && setInputValue(e.target.value)}
                />
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 font-medium mr-1">Быстрый выбор:</span>
                {PRESET_PROMPTS.map((tag, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputValue && setInputValue(tag)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-amber-200 transition-all"
                  >
                    {tag}
                  </button>
                ))}
              </div>

              {/* Main Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleAISeller}
                  className="flex-1 py-4 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-black font-bold text-base md:text-lg flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-amber-500/20 group"
                >
                  <Bot className="w-5 h-5 text-black" />
                  <span>Сформировать архитектуру ИИ-продавца</span>
                  <ArrowRight className="w-5 h-5 text-black group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Mini Dashboard Highlight (4 cols on lg) */}
          <div className="lg:col-span-4 flex flex-col justify-center space-y-4 rounded-2xl bg-black/40 border border-amber-500/20 p-5 backdrop-blur-md">
            <div className="flex items-center gap-3 pb-3 border-b border-white/10">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Эффект внедрения</h4>
                <p className="text-xs text-slate-400">Средние метрики SAV AI</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="text-xs text-slate-300">Скорость первого ответа</span>
                <span className="text-sm font-bold text-amber-300">&lt; 3 сек</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="text-xs text-slate-300">Рост конверсии лидов</span>
                <span className="text-sm font-bold text-emerald-400">+28% - 42%</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="text-xs text-slate-300">Снижение нагрузки на менеджеров</span>
                <span className="text-sm font-bold text-amber-300">до 70%</span>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <span className="text-xs text-slate-300">Срок окупаемости</span>
                <span className="text-sm font-bold text-amber-300">от 14 дней</span>
              </div>
            </div>

            <button
              onClick={handleCalculator}
              className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Открыть калькулятор отделов</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Bento Grid: 4 Essential Ecosystem Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {/* 1. Marketplace */}
        <motion.div 
          variants={itemVariants}
          onClick={() => navigate('/marketplace')}
          className="group cursor-pointer rounded-2xl bg-black/60 border border-amber-500/20 hover:border-amber-500/50 p-6 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
              <Store className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
              Каталог готовых ИИ-агентов
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Отраслевые боты под ключ для ритейла, услуг, B2B и недвижимости. Тестирование, готовые сценарии и запуск за 24 часа.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-amber-300 text-sm font-semibold">
            <span>Смотреть витрину решений</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 2. Calculator */}
        <motion.div 
          variants={itemVariants}
          onClick={handleCalculator}
          className="group cursor-pointer rounded-2xl bg-black/60 border border-amber-500/20 hover:border-amber-500/50 p-6 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
              <Calculator className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
              Калькулятор окупаемости ИИ
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Индивидуальный расчёт экономии ФОТ и сроков окупаемости для 8 отделов: продажи, поддержка, логистика, HR, маркетинг.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-amber-300 text-sm font-semibold">
            <span>Рассчитать экономический эффект</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 3. Expert Audit */}
        <motion.div 
          variants={itemVariants}
          onClick={() => navigate('/experts')}
          className="group cursor-pointer rounded-2xl bg-black/60 border border-amber-500/20 hover:border-amber-500/50 p-6 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
              Персональный аудит с архитектором
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Индивидуальный разбор бизнес-процессов компании сертифицированным экспертом с подготовкой ТЗ и дорожной карты.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-amber-300 text-sm font-semibold">
            <span>Выбрать эксперта</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>

        {/* 4. Greenland AI Partner Ecosystem */}
        <motion.div 
          variants={itemVariants}
          onClick={() => navigate('/partner')}
          className="group cursor-pointer rounded-2xl bg-black/60 border border-amber-500/20 hover:border-amber-500/50 p-6 backdrop-blur-md transition-all duration-300 flex flex-col justify-between hover:translate-y-[-2px]"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
              <Handshake className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
              Партнёрская экосистема Greenland AI
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Агентские отчисления до 25% за рекомендации и 50% разработчикам. Получите статус резидента цифрового государства.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-amber-300 text-sm font-semibold">
            <span>Программа резидентов</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </div>

      {/* Key Guarantees & Operational Highlights */}
      <motion.div 
        variants={itemVariants}
        className="rounded-2xl bg-black/50 border border-white/10 p-5 backdrop-blur-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-center"
      >
        <div className="space-y-1">
          <div className="text-xl md:text-2xl font-bold text-white">&lt; 3 сек</div>
          <div className="text-xs text-slate-400">Скорость отклика ИИ</div>
        </div>
        <div className="space-y-1">
          <div className="text-xl md:text-2xl font-bold text-amber-300">24 / 7</div>
          <div className="text-xs text-slate-400">Круглосуточная работа</div>
        </div>
        <div className="space-y-1">
          <div className="text-xl md:text-2xl font-bold text-white">100%</div>
          <div className="text-xs text-slate-400">Синхронизация с CRM и 1С</div>
        </div>
        <div className="space-y-1">
          <div className="text-xl md:text-2xl font-bold text-amber-300">от 24 ч</div>
          <div className="text-xs text-slate-400">Срок запуска под ключ</div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default IntroStep;
