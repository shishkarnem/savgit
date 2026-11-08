import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  RotateCcw, 
  Heart, 
  ThumbsDown, 
  ChevronDown, 
  X, 
  Sparkles, 
  Filter,
  Home,
  Calculator,
  Wand2,
  HelpCircle,
  Inbox
} from 'lucide-react';
import ExpertCard, { Expert, SwipeDirection } from '@/components/ExpertCard';
import Rivets from '@/components/Rivets';
import { protalkDb } from '@/integrations/protalk/client';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';
import { BusinessAuditModal, AuditSubmissionData } from '@/components/BusinessAuditModal';
import { Header } from '@/components/Header';
import { AIExpertMatcher } from '@/components/AIExpertMatcher';

interface SwipeHistoryItem {
  expert: Expert;
  direction: SwipeDirection;
  timestamp: Date;
}

interface LocationState {
  history: SwipeHistoryItem[];
  selectedExperts: Expert[];
}

const ExpertHistory: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { profile: telegramProfile } = useTelegramAuth();
  const { toast } = useToast();

  const selectorKey = telegramProfile?.telegram_id
    ? `telegram:${String(telegramProfile.telegram_id)}`
    : 'lovable-tester';
  
  const [history, setHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<SwipeHistoryItem | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string }[]>([]);
  const [activeFilter, setActiveFilter] = useState<SwipeDirection | 'all'>('all');
  const [showBusinessAuditModal, setShowBusinessAuditModal] = useState(false);
  const [pendingExpertForAudit, setPendingExpertForAudit] = useState<Expert | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showAIMatcher, setShowAIMatcher] = useState(false);

  useEffect(() => {
    if (state?.history && state.history.length > 0) {
      const restoredHistory = state.history.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
      setHistory(restoredHistory);
      try {
        sessionStorage.setItem('sav_swipe_history', JSON.stringify(state.history));
      } catch {}
    } else {
      try {
        const stored = sessionStorage.getItem('sav_swipe_history');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHistory(parsed.map((item: any) => ({ ...item, timestamp: new Date(item.timestamp) })));
          }
        }
      } catch {}
    }
  }, [state]);

  const triggerExplosion = (direction: SwipeDirection) => {
    const icons = direction === 'right' 
      ? ['❤️', '✨', '⚙️', '🔥', '💫']
      : direction === 'left'
      ? ['💨', '⚡', '🔧', '💔', '🌪️']
      : ['⏳', '🔄', '⚙️', '💭', '🎯'];

    const newIcons = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 150 - 75,
      y: Math.random() * -100 - 30,
      icon: icons[Math.floor(Math.random() * icons.length)]
    }));

    setExplosionIcons(newIcons);
    setTimeout(() => setExplosionIcons([]), 600);
  };

  const sendExpertNotification = async (expert: Expert) => {
    const storedBizInfo = sessionStorage.getItem('sav-business-info');
    const bizInfoParsed = storedBizInfo ? JSON.parse(storedBizInfo) : null;
    const fromAISeller = !!sessionStorage.getItem('sav-selected-plan');

    const aiSellerData = {
      businessType: bizInfoParsed ? `${bizInfoParsed.segment} / ${bizInfoParsed.category} / ${bizInfoParsed.sphere}` : undefined,
      classificationResult: bizInfoParsed?.description || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };

    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};

    let actionsHistory: any[] = [];
    try {
      const storedHist = localStorage.getItem('sav_actions_history_ai_seller') || localStorage.getItem('sav_actions_history_calculator');
      if (storedHist) actionsHistory = JSON.parse(storedHist);
    } catch {}
    
    const userUid = localStorage.getItem('sav_user_uid') || undefined;

    try {
      const response = await protalkDb.functions.invoke('sav-notify-expert-selection', {
        body: {
          expert: {
            id: expert.id,
            greeting: expert.greeting,
            pseudonym: expert.pseudonym,
            spheres: expert.spheres,
            telegram: expert.telegram,
          },
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : (userUid ? String(userUid) : null),
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
          },
          auditSubmission: auditData || undefined,
          aiSellerInfo: fromAISeller ? aiSellerData : undefined,
          calculatorInfo: calculatorData.company ? calculatorData : undefined,
          businessInfo: bizInfoParsed || undefined,
          actionsHistory,
          userUid,
          source: 'expert_history_selection',
        },
      });

      if (response.error) {
        console.error('Error sending notification:', response.error);
      } else {
        const expertName = `${expert.greeting || ''}${expert.pseudonym || ''}`;
        toast({
          title: 'Заявка отправлена!',
          description: `Эксперт ${expertName} получил вашу заявку с контактными данными`,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const persistSelection = async (expertId: string, direction: SwipeDirection) => {
    const payload = {
      expert_id: expertId,
      direction,
      selector_key: selectorKey,
      selector_telegram_id: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null,
      selector_username: telegramProfile?.username || null,
      selector_full_name: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
      source: 'experts-history',
      created_at: new Date().toISOString(),
    };

    const { error } = await (protalkDb
      .from('sav_expert_selections' as any)
      .upsert(payload, { onConflict: 'expert_id,selector_key' }));

    if (error) {
      console.error('Error syncing selection history:', error);
    }
  };

  const handleBusinessAuditSubmit = async (auditData: AuditSubmissionData) => {
    setShowBusinessAuditModal(false);
    if (pendingExpertForAudit) {
      await sendExpertNotification(pendingExpertForAudit, auditData);
      setPendingExpertForAudit(null);
    }
  };

  const handleChangeDirection = (expertId: string, newDirection: SwipeDirection) => {
    triggerExplosion(newDirection);
    
    const item = history.find(h => h.expert.id === expertId);
    
    setHistory(prev => prev.map(item => 
      item.expert.id === expertId 
        ? { ...item, direction: newDirection, timestamp: new Date() }
        : item
    ));

    if (selectedExpert?.expert.id === expertId) {
      setSelectedExpert(prev => prev ? { ...prev, direction: newDirection, timestamp: new Date() } : null);
    }

    void persistSelection(expertId, newDirection);

    // Open standard application form when status changes to "selected" (right)
    if (newDirection === 'right' && item) {
      setPendingExpertForAudit(item.expert);
      setShowBusinessAuditModal(true);
    }
  };

  const getStats = () => {
    const selected = history.filter(h => h.direction === 'right').length;
    const rejected = history.filter(h => h.direction === 'left').length;
    const skipped = history.filter(h => h.direction === 'down').length;
    return { selected, rejected, skipped, total: history.length };
  };

  const stats = getStats();

  const handleBackWithState = () => {
    navigate('/experts', { 
      state: { 
        updatedHistory: history,
        selectedExperts: state?.selectedExperts || []
      } 
    });
  };

  const handleAIExpertSelect = (expert: Expert) => {
    setShowAIMatcher(false);
    navigate('/experts', { state: { targetExpertId: expert.id } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-x-hidden">
      {/* Main Site Header */}
      <Header onLogoClick={() => navigate('/')} />

      {/* AI Expert Matcher Modal */}
      <AIExpertMatcher
        isOpen={showAIMatcher}
        onClose={() => setShowAIMatcher(false)}
        onSelectExpert={handleAIExpertSelect}
      />

      {/* Standard Application Form Modal */}
      <BusinessAuditModal
        isOpen={showBusinessAuditModal}
        onClose={() => {
          setShowBusinessAuditModal(false);
          setPendingExpertForAudit(null);
        }}
        initialData={
          pendingExpertForAudit
            ? {
                expertId: pendingExpertForAudit.id,
                expertName: `${pendingExpertForAudit.greeting || ''}${pendingExpertForAudit.pseudonym || ''}`,
                expertTelegram: pendingExpertForAudit.telegram || '',
                source: 'expert_history_selection',
              }
            : undefined
        }
        onAuditSubmitted={handleBusinessAuditSubmit}
      />

      {/* Instructions Modal */}
      <AnimatePresence>
        {showInstructions && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md select-none overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstructions(false)}
              className="fixed inset-0 bg-transparent"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="relative z-10 w-full max-w-md p-6 md:p-8 rounded-3xl backdrop-blur-3xl bg-black/90 border border-amber-400/40 text-white shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <Rivets />
              <h2 className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                Как выбрать эксперта
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-amber-400/30 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center shrink-0">
                    <Heart className="text-amber-300" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-amber-200">Свайп или тап вправо →</p>
                    <p className="text-sm text-white/70">Выбрать эксперта</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-white/15 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                    <ThumbsDown className="text-white/80" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-white/90">Свайп или тап влево ←</p>
                    <p className="text-sm text-white/70">Отказаться</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 p-3.5 bg-black/60 border border-amber-400/20 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-300/30 flex items-center justify-center shrink-0">
                    <ChevronDown className="text-amber-300" size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-amber-200">Свайп или тап вниз ↓</p>
                    <p className="text-sm text-white/70">Пропустить</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setShowInstructions(false)}
                className="w-full py-3.5 rounded-2xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400 text-amber-200 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(251,191,36,0.2)]"
              >
                <Sparkles size={16} /> Понятно
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="w-full flex-1 flex flex-col items-center p-4 md:p-8 max-w-7xl mx-auto">
        {/* Navigation Subheader matching /experts */}
        <header className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex justify-between items-center mb-6 px-2 sm:px-0">
          <button 
            onClick={handleBackWithState}
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Назад</span>
          </button>
          
          <h1 className="text-2xl md:text-3xl text-center font-bold text-amber-200">История свайпов</h1>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/')}
              className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all text-primary cursor-pointer"
              title="На главную"
            >
              <Home size={18} />
            </button>
            <button 
              onClick={() => navigate('/calculator')}
              className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all text-primary cursor-pointer"
              title="Калькулятор окупаемости"
            >
              <Calculator size={18} />
            </button>
            <button 
              onClick={() => setShowAIMatcher(true)}
              className="p-2 rounded-full bg-foreground/5 border border-amber-400/30 hover:bg-amber-400/10 transition-all text-amber-300 cursor-pointer"
              title="ИИ-подбор эксперта"
            >
              <Wand2 size={18} />
            </button>
            <button 
              onClick={() => setShowInstructions(true)}
              className="p-2 rounded-full bg-foreground/5 border border-foreground/10 hover:bg-foreground/10 transition-all text-primary cursor-pointer"
              title="Инструкция"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </header>

        {history.length === 0 ? (
          /* Empty State */
          <div className="w-full max-w-md my-auto p-8 rounded-3xl backdrop-blur-2xl bg-black/60 border border-amber-400/30 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
            <Rivets />
            <Inbox className="w-16 h-16 text-amber-300/60 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent">История пуста</h2>
            <p className="text-sm text-stone-300 mb-6 leading-relaxed">
              Сначала просмотрите и оцените экспертов на странице подбора
            </p>
            <button 
              onClick={() => navigate('/experts')}
              className="w-full py-3.5 px-6 rounded-2xl font-bold bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400 text-amber-100 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer shadow-[0_0_20px_rgba(231,199,104,0.25)]"
            >
              <ArrowLeft size={18} /> К подбору экспертов
            </button>
          </div>
        ) : (
          <>
            {/* Stats & Filters (Apple Liquid Glass styling, no green/red, no caps lock, text min 14) */}
            <div className="w-full max-w-4xl mx-auto mb-6">
              <div className="p-4 rounded-3xl backdrop-blur-2xl bg-black/60 border border-amber-400/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative">
                <Rivets />
                <div className="grid grid-cols-4 gap-2 md:gap-4 text-center">
                  <button 
                    onClick={() => setActiveFilter('all')}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      activeFilter === 'all' 
                        ? 'bg-amber-400/25 border border-amber-400/60 shadow-[0_0_15px_rgba(231,199,104,0.2)]' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <p className="text-2xl md:text-3xl text-amber-300 font-bold">{stats.total}</p>
                    <p className="text-sm text-stone-300 mt-1">Всего</p>
                  </button>
                  <button 
                    onClick={() => setActiveFilter('right')}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      activeFilter === 'right' 
                        ? 'bg-amber-400/25 border border-amber-400/60 shadow-[0_0_15px_rgba(231,199,104,0.2)]' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <p className="text-2xl md:text-3xl text-amber-200 font-bold">{stats.selected}</p>
                    <p className="text-sm text-stone-300 mt-1">Выбрано</p>
                  </button>
                  <button 
                    onClick={() => setActiveFilter('left')}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      activeFilter === 'left' 
                        ? 'bg-white/20 border border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.15)]' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <p className="text-2xl md:text-3xl text-stone-200 font-bold">{stats.rejected}</p>
                    <p className="text-sm text-stone-300 mt-1">Отказов</p>
                  </button>
                  <button 
                    onClick={() => setActiveFilter('down')}
                    className={`p-3 rounded-2xl transition-all cursor-pointer ${
                      activeFilter === 'down' 
                        ? 'bg-amber-400/20 border border-amber-400/40 shadow-[0_0_15px_rgba(231,199,104,0.15)]' 
                        : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    <p className="text-2xl md:text-3xl text-amber-300 font-bold">{stats.skipped}</p>
                    <p className="text-sm text-stone-300 mt-1">Пропущено</p>
                  </button>
                </div>
              </div>
            </div>

            {/* History Grid */}
            <div className="w-full max-w-4xl mx-auto flex-1">
              {history.filter(h => activeFilter === 'all' || h.direction === activeFilter).length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Filter size={48} className="mx-auto mb-4 opacity-40 text-amber-300" />
                  <p className="text-base">Нет экспертов с таким статусом</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {history
                    .filter(h => activeFilter === 'all' || h.direction === activeFilter)
                    .slice()
                    .reverse()
                    .map((item, index) => (
                      <motion.div
                        key={`${item.expert.id}-${index}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedExpert(item)}
                        className="cursor-pointer hover:scale-[1.02] transition-transform"
                      >
                        <ExpertCard
                          expert={item.expert}
                          currentDirection={item.direction}
                          showActions={true}
                          onAction={(dir) => handleChangeDirection(item.expert.id, dir)}
                          compact={true}
                        />
                      </motion.div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Expert Detail Modal */}
      <AnimatePresence>
        {selectedExpert && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
            onClick={() => setSelectedExpert(null)}
          >
            {explosionIcons.map(icon => (
              <motion.span
                key={icon.id}
                initial={{ opacity: 1, scale: 1, x: '50%', y: '50%' }}
                animate={{ opacity: 0, scale: 2, x: `calc(50% + ${icon.x}px)`, y: `calc(50% + ${icon.y}px)` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="absolute text-2xl z-[60] pointer-events-none"
                style={{ top: '40%', left: '50%' }}
              >
                {icon.icon}
              </motion.span>
            ))}

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg max-h-[90vh] overflow-y-auto relative rounded-3xl backdrop-blur-3xl bg-black/90 border border-amber-400/40 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)]"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedExpert(null)}
                className="absolute top-4 right-4 text-stone-400 hover:text-white z-10 p-2 rounded-full bg-white/10 border border-white/20 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
              
              <div className="pt-8">
                <ExpertCard
                  expert={selectedExpert.expert}
                  currentDirection={selectedExpert.direction}
                  showActions={true}
                  onAction={(dir) => handleChangeDirection(selectedExpert.expert.id, dir)}
                />
              </div>

              <p className="text-center text-sm text-stone-400 mt-4">
                Последнее изменение: {selectedExpert.timestamp.toLocaleString()}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-6 mb-8 text-center">
        <p className="text-sm tracking-wide text-stone-400 opacity-60">
          Нажмите на карточку для подробностей
        </p>
      </footer>
    </div>
  );
};

export default ExpertHistory;