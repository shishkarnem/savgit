import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { NeuronSphereCanvas } from './NeuronSphereCanvas';
import { RealisticSmokeBackdrop } from './RealisticSmokeBackdrop';
import { ArrowLeft, X } from 'lucide-react';
import Rivets from './Rivets';

interface ProTalkCountdownOverlayProps {
  businessDescription?: string;
  companyName?: string;
  department?: string;
  employeeCount?: string | number;
  expertName?: string;
  onTimeout?: () => void;
  onCancel?: () => void;
  initialSeconds?: number;
  maxSeconds?: number;
  title?: string;
  badgeText?: string;
  stagesType?:
    | 'classification'
    | 'tariffs'
    | 'document_recognition'
    | 'tz_recognition'
    | 'expert_matching'
    | 'estimate_generation'
    | string;
}

export const ProTalkCountdownOverlay: React.FC<ProTalkCountdownOverlayProps> = ({
  businessDescription = '',
  companyName = '',
  department = '',
  employeeCount,
  expertName = '',
  onTimeout,
  onCancel,
  maxSeconds: rawMaxSeconds = 100,
  initialSeconds,
  title = 'Формирование архитектуры ИИ-продавца',
  badgeText = 'Нейросетевой анализ SAV AI',
  stagesType = 'classification',
}) => {
  const maxSeconds = initialSeconds || rawMaxSeconds || 100;
  const [seconds, setSeconds] = useState(0);
  const hasTimedOutRef = useRef(false);

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      window.history.back();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= maxSeconds) {
          return maxSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [maxSeconds]);

  useEffect(() => {
    if (seconds >= maxSeconds && onTimeout && !hasTimedOutRef.current) {
      hasTimedOutRef.current = true;
      onTimeout();
    }
  }, [seconds, maxSeconds, onTimeout]);

  const progressPercent = Math.min(100, Math.max(0, (seconds / maxSeconds) * 100));

  const getStageDescription = () => {
    if (stagesType === 'expert_matching') {
      if (seconds <= 10) return `Анализ профиля проекта компании «${companyName || 'клиента'}»...`;
      if (seconds <= 22) return `Поиск профильного куратора по направлению «${department || 'отдел'}»...`;
      if (seconds <= 36) return 'Скрининг реализованных кейсов и подтвержденных результатов в SAV AI...';
      if (seconds <= 48) return 'Оценка совместимости стека технологий и регламентов...';
      if (seconds <= 56) return 'Синтез персонального обоснования назначения эксперта...';
      return 'Финализация подбора эксперта-куратора...';
    }

    if (stagesType === 'estimate_generation') {
      if (seconds <= 12) return 'Анализ технического задания и параметров проекта...';
      if (seconds <= 30) return 'Калькуляция архитектуры нейросети и серверных модулей...';
      if (seconds <= 55) return 'Генерация спецификации этапов разработки и сроков...';
      if (seconds <= 80) return 'Формирование персональной сметы и коммерческого предложения...';
      if (seconds <= 92) return 'Финальная верификация расчетных показателей...';
      return 'Смета готова, загрузка результатов...';
    }

    if (stagesType === 'direct_file_recognition') {
      if (seconds <= 6) return 'Получение ссылки на файл и валидация формата...';
      if (seconds <= 18) return 'Интеллектуальное сканирование и распознавание текста...';
      if (seconds <= 35) return 'Извлечение содержимого документа и таблиц...';
      if (seconds <= 55) return 'Формирование структуры технического задания и параметров...';
      if (seconds <= 80) return 'Внесение данных в анкету проекта...';
      return 'Завершение обработки документа...';
    }

    if (stagesType === 'document_recognition' || stagesType === 'tz_recognition') {
      if (seconds <= 12) return 'Загрузка документа и извлечение ключевых разделов...';
      if (seconds <= 28) return 'Анализ требований к ИИ-специалисту и специфики процессов...';
      if (seconds <= 50) return 'Формирование структуры технического задания и сценариев...';
      if (seconds <= 75) return 'Интеграция регламентов коммуникации и правил квалификации...';
      if (seconds <= 90) return 'Финальная калибровка параметров и проверка целостности...';
      return 'Завершение структурирования ТЗ...';
    }

    if (stagesType === 'tariffs') {
      if (seconds <= 12) return 'Установка защищенного соединения с системным архитектором...';
      if (seconds <= 28) return 'Адаптация структуры тарифов под специфику вашей компании...';
      if (seconds <= 50) return 'Генерация детальных спецификаций и планов интеграции...';
      if (seconds <= 75) return 'Расчет ключевых метрик окупаемости и каналов интеграции...';
      if (seconds <= 90) return 'Формирование персональных коммерческих предложений...';
      return 'Финальная калибровка параметров тарифов...';
    }

    if (seconds <= 15) return 'Установка соединения с нейросетевой моделью...';
    if (seconds <= 35) return 'Анализ специфики бизнеса и отраслевой классификации...';
    if (seconds <= 65) return 'Синтез персональной архитектуры ИИ-продавца...';
    if (seconds <= 85) return 'Генерация концептуального стимпанк-изображения...';
    if (seconds <= 95) return 'Калибровка сценариев роботизации и расчетных тарифов...';
    return 'Финальная упаковка и формирование результатов...';
  };

  const displayedSnippet =
    businessDescription || (companyName ? `Компания «${companyName}» • ${department || ''}` : '');

  // Portal overlay directly to body: ensures viewport centering without parent container deformation
  // Outer background is completely transparent (bg-transparent) to preserve page visibility without darkening
  const overlayContent = (
    <div
      id="protalk-countdown-overlay-portal"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-transparent select-none overflow-y-auto pointer-events-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-lg p-6 sm:p-8 rounded-3xl border border-amber-400/40 bg-black/85 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.85)] relative overflow-hidden text-center select-none"
      >
        <Rivets />

        {/* Animated smoke effect with transparent background */}
        <RealisticSmokeBackdrop
          speed="normal"
          opacity={0.4}
          variant="amber"
          className="absolute inset-0 pointer-events-none z-0"
        />

        {/* Apple Liquid Glass Ambient Lighting Effects */}
        <div className="absolute -top-20 -left-20 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top-Right Quick Cancel Button */}
        <button
          type="button"
          onClick={handleCancelClick}
          className="absolute top-4 right-4 z-20 p-2 rounded-full border border-white/20 bg-black/60 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer shadow-md"
          title="Отменить и вернуться назад"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-4 relative z-10">
          <span className="inline-block px-3.5 py-1 mb-2.5 text-sm font-semibold rounded-full border border-amber-300/40 text-amber-200 backdrop-blur-md bg-black/50 shadow-sm">
            {badgeText}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>

        {/* Central Neural Sphere with Integrated Timer Ring */}
        <div className="my-5 flex flex-col items-center justify-center relative z-10">
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center rounded-full overflow-hidden p-2">
            {/* 3D Neural Sphere Canvas inside timer block */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-85">
              <NeuronSphereCanvas
                isRecording={true}
                size={180}
                pointCount={72}
                color="#E7C768"
                lineColor="rgba(231, 199, 104, 0.45)"
                glowColor="rgba(231, 199, 104, 0.85)"
              />
            </div>

            {/* SVG Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none"
              viewBox="0 0 160 160"
            >
              <circle
                cx="80"
                cy="80"
                r="72"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="80"
                cy="80"
                r="72"
                stroke="currentColor"
                strokeWidth="4"
                className="text-amber-300 transition-all duration-1000 ease-linear drop-shadow-[0_0_8px_rgba(231,199,104,0.7)]"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 72}
                strokeDashoffset={2 * Math.PI * 72 * (1 - progressPercent / 100)}
                strokeLinecap="round"
              />
            </svg>

            {/* Numeric Display: Countdown from maxSeconds */}
            <div className="relative z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md rounded-full w-24 h-24 border border-amber-400/30 shadow-inner">
              <div className="flex items-baseline gap-0.5">
                <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight drop-shadow">
                  {Math.max(0, maxSeconds - seconds)}
                </span>
                <span className="text-sm text-amber-200/70 font-mono">/{maxSeconds}с</span>
              </div>
              <span className="text-sm text-amber-200/90 font-medium mt-0.5">до финала</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/10 rounded-full h-2.5 mb-4 overflow-hidden border border-white/10 relative z-10">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-200 rounded-full shadow-[0_0_12px_rgba(231,199,104,0.8)]"
            style={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {/* Dynamic Status Text */}
        <div className="min-h-[48px] flex items-center justify-center relative z-10">
          <motion.p
            key={getStageDescription()}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm sm:text-base text-amber-100/95 font-medium leading-snug"
          >
            {getStageDescription()}
          </motion.p>
        </div>

        {/* Business snippet if present */}
        {displayedSnippet && (
          <div className="mt-4 pt-3 border-t border-amber-400/20 text-left relative z-10">
            <div className="text-sm text-amber-200/80 mb-1 font-medium">Анализируемый запрос:</div>
            <div className="text-sm text-white/90 line-clamp-2 italic">
              "{displayedSnippet}"
            </div>
          </div>
        )}

        {/* Cancel / Back Button */}
        <div className="mt-5 pt-3 border-t border-amber-400/20 flex justify-center relative z-10">
          <button
            type="button"
            onClick={handleCancelClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-amber-400/30 bg-gradient-to-r from-white/10 via-white/5 to-white/10 hover:from-white/15 hover:to-white/20 backdrop-blur-xl text-white text-sm font-medium transition-all shadow-[0_4px_14px_rgba(0,0,0,0.5)] active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            <span>Отменить и вернуться назад</span>
          </button>
        </div>
      </motion.div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(overlayContent, document.body);
  }
  return overlayContent;
};

export default ProTalkCountdownOverlay;
