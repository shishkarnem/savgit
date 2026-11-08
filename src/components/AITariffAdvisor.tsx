import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Loader2, X, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useNavigate } from 'react-router-dom';
import { PlanLevel, PlanData } from '@/types';

interface Question {
  id: string;
  question: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: 'messengers',
    question: 'Сколько каналов связи нужно подключить?',
    options: ['1-2 мессенджера', '3-5 мессенджеров', 'Все доступные'],
  },
  {
    id: 'messages_volume',
    question: 'Какой объём сообщений ожидается в месяц?',
    options: ['До 500 сообщений', '500-2500 сообщений', 'Более 2500 сообщений'],
  },
  {
    id: 'customization',
    question: 'Какой уровень кастомизации нужен?',
    options: [
      'Базовый (консультации, прайс)',
      'Средний (калькулятор, КП, CRM)',
      'Полный (индивидуальная разработка, API)',
    ],
  },
];

interface AITariffAdvisorProps {
  isOpen: boolean;
  onClose: () => void;
  plans?: PlanData[] | Partial<PlanData>[];
}

export const AITariffAdvisor: React.FC<AITariffAdvisorProps> = ({
  isOpen,
  onClose,
  plans,
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: telegramProfile } = useTelegramAuth();
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    tariff: PlanLevel;
    reason: string;
  } | null>(null);

  const handleAnswer = (answer: string) => {
    const question = QUESTIONS[currentQuestionIdx];
    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);

    if (currentQuestionIdx < QUESTIONS.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    } else {
      getRecommendation(newAnswers);
    }
  };

  const getRecommendation = async (finalAnswers: Record<string, string>) => {
    setIsLoading(true);
    try {
      const userInfo = telegramProfile ? {
        telegram_id: telegramProfile.telegram_id,
        first_name: telegramProfile.first_name,
        last_name: telegramProfile.last_name,
        username: telegramProfile.username,
      } : undefined;
      const { data, error } = await protalkDb.functions.invoke('sav-ai-recommend-tariff', {
        body: {
          answers: finalAnswers,
          plans: plans || [],
          userInfo,
        },
      });

      if (error) throw error;

      if (data.tariff) {
        setRecommendation({
          tariff: data.tariff as PlanLevel,
          reason: data.reason || 'Подходит для ваших задач',
        });
      }
    } catch (error) {
      console.error('Error getting recommendation:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось получить рекомендацию',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTariff = () => {
    if (recommendation) {
      sessionStorage.setItem('sav-selected-plan', recommendation.tariff);
      navigate(`/ai-seller/plan/${encodeURIComponent(recommendation.tariff)}`);
      onClose();
    }
  };

  const handleReset = () => {
    setCurrentQuestionIdx(0);
    setAnswers({});
    setRecommendation(null);
  };

  if (!isOpen) return null;

  const currentQuestion = QUESTIONS[currentQuestionIdx];

  // Show the recommended plan's price if available
  const recommendedPlanData = recommendation
    ? plans?.find(p => p.package === recommendation.tariff)
    : null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-transparent select-none overflow-y-auto"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-transparent"
          onClick={onClose}
        />
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-lg p-5 sm:p-7 rounded-3xl bg-black/90 backdrop-blur-3xl border border-amber-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-foreground/60 hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/20">
              <HelpCircle className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-primary">Какой тариф мне подходит?</h2>
              <p className="text-sm text-foreground/60">Ответьте на 3 вопроса</p>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-foreground/70">Анализирую ваши ответы...</p>
            </div>
          ) : recommendation ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="text-center mb-6">
                <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-primary mb-2">
                  {recommendation.tariff}
                </h3>
                {recommendedPlanData?.priceMonth && (
                  <p className="text-lg font-semibold text-accent mb-2">
                    {recommendedPlanData.priceMonth.toLocaleString()} ₽/мес
                  </p>
                )}
                <p className="text-foreground/70">{recommendation.reason}</p>
              </div>
              <Button
                onClick={handleSelectTariff}
                className="steampunk-button w-full py-3"
              >
                Перейти к тарифу
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                Пройти заново
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Progress */}
              <div className="flex gap-1 mb-4">
                {QUESTIONS.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      idx <= currentQuestionIdx ? 'bg-primary' : 'bg-foreground/10'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-foreground/50 mb-2">
                Вопрос {currentQuestionIdx + 1} из {QUESTIONS.length}
              </p>

              <h3 className="text-lg font-medium mb-4">{currentQuestion.question}</h3>

              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleAnswer(option)}
                    className="w-full p-4 text-left rounded-lg border border-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AITariffAdvisor;