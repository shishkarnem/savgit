import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { protalkDb } from '@/integrations/protalk/client';
import { History, HelpCircle, Sparkles, ArrowLeft, Send, Loader2, Wand2, RotateCcw } from 'lucide-react';
import Rivets from '@/components/Rivets';
import { Expert, SwipeDirection } from '@/components/ExpertCard';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { useViewedExperts } from '@/hooks/useViewedExperts';
import Header from '@/components/Header';
import AIExpertMatcher from '@/components/AIExpertMatcher';
import AuditInfoModal from '@/components/AuditInfoModal';
import { BusinessAuditModal, AuditSubmissionData } from '@/components/BusinessAuditModal';
import ExpertCard from '@/components/ExpertCard';
import ProcessingLoader from '@/components/ProcessingLoader';
import ExpertSwipeInstructionsModal from '@/components/experts/ExpertSwipeInstructionsModal';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';

interface SwipeHistoryItem {
  expert: Expert;
  direction: SwipeDirection;
  timestamp: Date;
}

interface LocationState {
  updatedHistory?: SwipeHistoryItem[];
  fromAISeller?: boolean;
  selectedPlan?: string;
  skipAutoMatch?: boolean;
  fromMarketplace?: boolean;
  product?: any;
}

interface AISellerData {
  businessType?: string;
  classificationResult?: string;
  selectedPlan?: string;
  presentationText?: string;
}

interface CalculatorData {
  fullName?: string;
  company?: string;
  product?: string;
  city?: string;
  department?: string;
  employeeCount?: string;
  averageSalary?: string;
  functionality?: string;
  maintenance?: string;
}

const ExpertSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const { profile: telegramProfile } = useTelegramAuth();
  const { toast } = useToast();

  const [allExperts, setAllExperts] = useState<Expert[]>([]);
  const [sessionExperts, setSessionExperts] = useState<Expert[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeHistory, setSwipeHistory] = useState<SwipeHistoryItem[]>([]);
  const [selectedExperts, setSelectedExperts] = useState<Expert[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [swipeAnimation, setSwipeAnimation] = useState<SwipeDirection | null>(null);
  const [explosionIcons, setExplosionIcons] = useState<{ id: number; x: number; y: number; icon: string; type: 'icon' | 'smoke' | 'gear' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIMatcher, setShowAIMatcher] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showBusinessAuditModal, setShowBusinessAuditModal] = useState(false);
  const [pendingExpertForAudit, setPendingExpertForAudit] = useState<Expert | null>(null);
  const [lastSelectedExpertName, setLastSelectedExpertName] = useState('');

  const selectorInfo = useMemo(() => {
    const tgId = telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : null;
    const fallbackKey = 'lovable-tester';
    return {
      selectorKey: tgId ? `telegram:${tgId}` : fallbackKey,
      selectorTelegramId: tgId,
      selectorUsername: telegramProfile?.username || null,
      selectorFullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
      source: 'experts-page',
    };
  }, [telegramProfile]);

  const { markAsViewed, isViewed, clearViewed, viewedExperts, isLoaded: viewedLoaded, getAllViewed } = useViewedExperts(selectorInfo);

  // Initialize session experts once when allExperts and viewed state are loaded
  useEffect(() => {
    if (allExperts.length > 0 && sessionExperts.length === 0 && viewedLoaded) {
      const filtered = allExperts.filter(e => !isViewed(e.id));
      setSessionExperts(filtered);
    }
  }, [allExperts, isViewed, sessionExperts.length, viewedLoaded]);
  
  const experts = sessionExperts;
  const totalExperts = allExperts.length;
  
  // Preload images for next 3 experts
  const imageUrls = useMemo(() => {
    return experts.slice(currentIndex, currentIndex + 3).map(e => e.photo_url);
  }, [experts, currentIndex]);
  
  const { isLoading } = useImagePreloader(imageUrls);
  
  // Detect if coming from AI Seller flow or Marketplace Product
  const fromAISeller = state?.fromAISeller || sessionStorage.getItem('sav-selected-plan');

  const marketplaceProduct = useMemo(() => {
    try {
      if (state?.product) return state.product;
      const stored = sessionStorage.getItem('sav_marketplace_selected_product') || localStorage.getItem('sav_marketplace_selected_product');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }, [state?.product]);
  
  // Motion values for smooth swipe
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(
    x,
    [-200, -100, 0, 100, 200],
    [0.5, 1, 1, 1, 0.5]
  );

  useEffect(() => {
    fetchExperts();
    // Automatically launch AI matching workflow on page open
    if (!state?.skipAutoMatch && !state?.updatedHistory) {
      setShowAIMatcher(true);
    }
  }, []);

  // Restore history from ExpertHistory page if navigating back
  useEffect(() => {
    if (state?.updatedHistory && state.updatedHistory.length > 0) {
      const restoredHistory = state.updatedHistory.map(item => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));

      setSwipeHistory(prev => {
        if (prev.length === restoredHistory.length) {
          return prev;
        }
        return restoredHistory;
      });

      const selected = restoredHistory
        .filter(item => item.direction === 'right')
        .map(item => item.expert);
      setSelectedExperts(selected);

      window.history.replaceState({}, document.title);
    }
  }, [state]);

  // Restore history from DB to keep swipe progress between sessions
  useEffect(() => {
    if (!viewedLoaded || allExperts.length === 0) return;

    const byId = new Map(allExperts.map(expert => [expert.id, expert]));
    const restored = getAllViewed()
      .map(item => {
        const expert = byId.get(item.id);
        if (!expert) return null;
        return {
          expert,
          direction: item.direction,
          timestamp: new Date(item.timestamp),
        } as SwipeHistoryItem;
      })
      .filter((item): item is SwipeHistoryItem => item !== null)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    setSwipeHistory(restored);
    setSelectedExperts(restored.filter(item => item.direction === 'right').map(item => item.expert));
  }, [viewedLoaded, allExperts, viewedExperts, getAllViewed]);

  const fetchExperts = async () => {
    setLoading(true);
    try {
      const { data, error } = await protalkDb
        .from('sav_experts')
        .select('*')
        .eq('status', 'active');
      
      if (!error && data) {
        // Strict filter: only verified experts with photo, spheres and not bogus registrations
        const valid = (data as any[]).filter(
          (e: any) => e.pseudonym && e.photo_url && e.spheres && !String(e.id).startsWith('exp_')
        );
        const resolved = valid.length > 0 ? valid : (data as any[]);
        setAllExperts(resolved);
      }
    } catch (err) {
      console.warn('[Fetch Experts Error]', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Seamlessly reorders the cards deck when the neural network outputs matches.
   * Matches (with matchScore and matchReason) become the first cards in the swipe deck.
   */
  const handleAIMatchesFound = useCallback((matches: any[]) => {
    if (!matches || matches.length === 0) return;

    setSessionExperts(prev => {
      const matchMap = new Map(matches.map(m => [String(m.id).trim(), m]));
      const sortedMatched: Expert[] = [];
      const remaining: Expert[] = [];

      for (const m of matches) {
        sortedMatched.push(m);
      }

      const pool = allExperts.length > 0 ? allExperts : prev;
      for (const exp of pool) {
        if (!matchMap.has(String(exp.id).trim())) {
          remaining.push(exp);
        }
      }

      return [...sortedMatched, ...remaining];
    });

    setCurrentIndex(0);
  }, [allExperts]);

  const triggerExplosion = useCallback((direction: SwipeDirection) => {
    const icons = direction === 'right' 
      ? ['❤️', '✨', '🔥', '💫', '⭐']
      : direction === 'left'
      ? ['💨', '⚡', '💔', '🌪️', '❌']
      : ['⏳', '🔄', '💭', '🎯', '⏸️'];

    const newIcons = Array.from({ length: 6 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 160 - 80,
      y: Math.random() * -120 - 40,
      icon: icons[Math.floor(Math.random() * icons.length)],
      type: 'icon' as const
    }));

    const smokeParticles = Array.from({ length: 4 }, (_, i) => ({
      id: Date.now() + 100 + i,
      x: Math.random() * 120 - 60,
      y: Math.random() * -100 - 20,
      icon: '💨',
      type: 'smoke' as const
    }));

    const gears = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + 200 + i,
      x: Math.random() * 140 - 70,
      y: Math.random() * -80 - 30,
      icon: '⚙️',
      type: 'gear' as const
    }));

    setExplosionIcons([...newIcons, ...smokeParticles, ...gears]);
    setTimeout(() => setExplosionIcons([]), 800);
  }, []);

  // Check if audit profile is complete
  const isAuditProfileComplete = useCallback(() => {
    try {
      const storedAudit = localStorage.getItem('sav_audit_submission') || sessionStorage.getItem('sav_audit_submission');
      if (storedAudit) {
        const parsed = JSON.parse(storedAudit);
        if (parsed.companyName && (parsed.contact || parsed.phone || parsed.telegram)) {
          return true;
        }
      }
      const storedBizInfo = sessionStorage.getItem('sav-business-info');
      if (storedBizInfo) {
        const parsed = JSON.parse(storedBizInfo);
        if (parsed.companyName && (telegramProfile?.username || telegramProfile?.telegram_id)) {
          return true;
        }
      }
    } catch {}
    return false;
  }, [telegramProfile]);

  // Send notification when expert is selected
  const sendExpertNotification = useCallback(async (expert: Expert, customAuditInfo?: any) => {
    const storedBizInfo = sessionStorage.getItem('sav-business-info');
    const bizInfoParsed = storedBizInfo ? JSON.parse(storedBizInfo) : null;
    const aiSellerData: AISellerData = {
      businessType: bizInfoParsed ? `${bizInfoParsed.segment} / ${bizInfoParsed.category} / ${bizInfoParsed.sphere}` : undefined,
      classificationResult: bizInfoParsed?.description || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};

    let auditData = customAuditInfo || null;
    if (!auditData) {
      try {
        const storedAudit = localStorage.getItem('sav_audit_submission') || sessionStorage.getItem('sav_audit_submission');
        if (storedAudit) auditData = JSON.parse(storedAudit);
      } catch {}
    }

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
            telegramUsername: telegramProfile?.username || (auditData?.telegram ? auditData.telegram.replace('@', '') : null),
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || auditData?.fullName || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
            phone: auditData?.phone || auditData?.contact || null,
          },
          auditInfo: auditData || undefined,
          marketplaceProduct: marketplaceProduct || undefined,
          aiSellerInfo: fromAISeller ? aiSellerData : undefined,
          calculatorInfo: calculatorData.company ? calculatorData : undefined,
          businessInfo: bizInfoParsed || undefined,
          actionsHistory,
          userUid,
          source: marketplaceProduct ? 'marketplace_product' : (fromAISeller ? 'ai-seller' : 'calculator'),
        },
      });
      
      if (response.error) {
        console.error('Error sending notification:', response.error);
      } else {
        const expertName = `${expert.greeting ? `${expert.greeting} ` : ''}${expert.pseudonym || ''}`.trim();
        toast({
          title: 'Эксперт выбран',
          description: `${expertName} получит уведомление о вашем запросе`,
        });
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [telegramProfile, fromAISeller, state?.selectedPlan, toast, marketplaceProduct]);

  const handleSwipe = useCallback((direction: SwipeDirection) => {
    if (currentIndex >= experts.length) return;
    
    const currentExpert = experts[currentIndex];
    markAsViewed(currentExpert.id, direction);
    
    setSwipeAnimation(direction);
    triggerExplosion(direction);

    setTimeout(() => {
      setSwipeHistory(prev => {
        const exists = prev.some(item => item.expert.id === currentExpert.id);
        if (exists) {
          return prev.map(item => 
            item.expert.id === currentExpert.id 
              ? { ...item, direction, timestamp: new Date() }
              : item
          );
        }
        return [...prev, { expert: currentExpert, direction, timestamp: new Date() }];
      });

      if (direction === 'right') {
        setSelectedExperts(prev => {
          if (prev.some(e => e.id === currentExpert.id)) return prev;
          return [...prev, currentExpert];
        });

        const expertName = `${currentExpert.greeting ? `${currentExpert.greeting} ` : ''}${currentExpert.pseudonym || ''}`.trim();
        setLastSelectedExpertName(expertName);

        if (!isAuditProfileComplete()) {
          setPendingExpertForAudit(currentExpert);
          setShowBusinessAuditModal(true);
        } else {
          sendExpertNotification(currentExpert);
          setShowAuditModal(true);
        }
      }
      
      setCurrentIndex(prev => prev + 1);
      setSwipeAnimation(null);
      
      x.set(0);
      y.set(0);
    }, 250);
  }, [currentIndex, experts, triggerExplosion, sendExpertNotification, markAsViewed, x, y, isAuditProfileComplete]);

  const handleBusinessAuditSubmit = async (auditData: AuditSubmissionData) => {
    setShowBusinessAuditModal(false);
    try {
      localStorage.setItem('sav_audit_submission', JSON.stringify(auditData));
      sessionStorage.setItem('sav_audit_submission', JSON.stringify(auditData));
    } catch {}

    if (pendingExpertForAudit) {
      await sendExpertNotification(pendingExpertForAudit, auditData);
      setPendingExpertForAudit(null);
      setShowAuditModal(true);
    }
  };

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const threshold = 80;
    const { offset, velocity } = info;
    const xVelocity = Math.abs(velocity.x);
    const yVelocity = Math.abs(velocity.y);

    if (offset.x > threshold || (offset.x > 40 && xVelocity > 500)) {
      handleSwipe('right');
    } else if (offset.x < -threshold || (offset.x < -40 && xVelocity > 500)) {
      handleSwipe('left');
    } else if (offset.y > threshold || (offset.y > 40 && yVelocity > 500)) {
      handleSwipe('down');
    } else {
      x.set(0);
      y.set(0);
    }
  }, [handleSwipe, x, y]);

  const handleTapZone = useCallback((direction: SwipeDirection) => {
    handleSwipe(direction);
  }, [handleSwipe]);

  const resetSwipes = () => {
    setCurrentIndex(0);
    setSwipeHistory([]);
    setSelectedExperts([]);
    setSessionExperts([]);
    clearViewed();
    fetchExperts();
  };
 
  const handleAIExpertSelect = (expert: any) => {
    setShowAIMatcher(false);
    const expertInList = sessionExperts.find(e => e.id === expert.id) || allExperts.find(e => e.id === expert.id) || expert;
    if (expertInList) {
      const enrichedExpert: Expert = {
        ...expertInList,
        matchScore: expert.matchScore || expertInList.matchScore,
        matchReason: expert.matchReason || expertInList.matchReason,
      };

      markAsViewed(enrichedExpert.id, 'right');
      setSelectedExperts(prev => {
        if (prev.some(e => e.id === enrichedExpert.id)) return prev;
        return [...prev, enrichedExpert];
      });

      const expertName = `${enrichedExpert.greeting ? `${enrichedExpert.greeting} ` : ''}${enrichedExpert.pseudonym || ''}`.trim();
      setLastSelectedExpertName(expertName);

      if (!isAuditProfileComplete()) {
        setPendingExpertForAudit(enrichedExpert);
        setShowBusinessAuditModal(true);
      } else {
        sendExpertNotification(enrichedExpert);
        setShowAuditModal(true);
      }
    }
  };

  const navigateToHistory = () => {
    navigate('/experts/history', {
      state: {
        history: swipeHistory,
        selectedExperts: selectedExperts
      }
    });
  };

  const handleConfirmSelection = async () => {
    if (selectedExperts.length === 0) return;
    
    setIsSubmitting(true);
    const selectedExpert = selectedExperts[0];
    const expertName = `${selectedExpert.greeting ? `${selectedExpert.greeting} ` : ''}${selectedExpert.pseudonym || ''}`.trim();
    
    sessionStorage.setItem('sav-selected-expert', JSON.stringify({
      id: selectedExpert.id,
      name: expertName,
      greeting: selectedExpert.greeting,
      pseudonym: selectedExpert.pseudonym,
      spheres: selectedExpert.spheres,
    }));
    
    const storedBizInfo2 = sessionStorage.getItem('sav-business-info');
    const bizInfoParsed2 = storedBizInfo2 ? JSON.parse(storedBizInfo2) : null;
    const aiSellerData: AISellerData = {
      businessType: bizInfoParsed2 ? `${bizInfoParsed2.segment} / ${bizInfoParsed2.category} / ${bizInfoParsed2.sphere}` : undefined,
      classificationResult: bizInfoParsed2?.description || undefined,
      selectedPlan: sessionStorage.getItem('sav-selected-plan') || state?.selectedPlan || undefined,
      presentationText: sessionStorage.getItem('sav-presentation-text') || undefined,
    };
    
    const calculatorDataStr = sessionStorage.getItem('sav-calculator-data');
    const calculatorData: CalculatorData = calculatorDataStr ? JSON.parse(calculatorDataStr) : {};
    
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
            id: selectedExpert.id,
            greeting: selectedExpert.greeting,
            pseudonym: selectedExpert.pseudonym,
            spheres: selectedExpert.spheres,
            telegram: selectedExpert.telegram,
          },
          clientInfo: {
            telegramId: telegramProfile?.telegram_id ? String(telegramProfile.telegram_id) : (userUid ? String(userUid) : null),
            telegramUsername: telegramProfile?.username || null,
            fullName: [telegramProfile?.first_name, telegramProfile?.last_name].filter(Boolean).join(' ') || null,
            firstName: telegramProfile?.first_name || null,
            lastName: telegramProfile?.last_name || null,
          },
          aiSellerInfo: fromAISeller ? aiSellerData : undefined,
          calculatorInfo: calculatorData.company ? calculatorData : undefined,
          businessInfo: bizInfoParsed2 || undefined,
          marketplaceProduct: marketplaceProduct || undefined,
          actionsHistory,
          userUid,
          source: marketplaceProduct ? 'marketplace_product' : (fromAISeller ? 'ai-seller' : 'calculator'),
        },
      });
      
      if (response.error) {
        console.error('Error sending notification:', response.error);
        toast({
          title: 'Ошибка отправки',
          description: 'Не удалось отправить уведомление эксперту',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Эксперт выбран',
          description: `${expertName} получит уведомление о вашем запросе`,
        });
        
        sessionStorage.removeItem('sav-business-type');
        sessionStorage.removeItem('sav-classification-result');
        sessionStorage.removeItem('sav-selected-plan');
        sessionStorage.removeItem('sav-presentation-text');
        sessionStorage.removeItem('sav-calculator-data');
        
        navigate('/');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при отправке',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentExpert = experts[currentIndex];
  const isComplete = currentIndex >= experts.length;

  const previousExpert = swipeHistory.length > 0 
    ? swipeHistory[swipeHistory.length - 1].expert 
    : (currentIndex > 0 ? experts[currentIndex - 1] : null);
  const nextExpert = currentIndex + 1 < experts.length ? experts[currentIndex + 1] : null;

  const undoLastSwipe = () => {
    if (swipeHistory.length > 0) {
      const last = swipeHistory[swipeHistory.length - 1];
      setSwipeHistory(prev => prev.slice(0, -1));
      setSelectedExperts(prev => prev.filter(e => e.id !== last.expert.id));
      setCurrentIndex(prev => Math.max(0, prev - 1));
      toast({
        title: 'Возврат',
        description: `Возвращен эксперт ${last.expert.greeting ? `${last.expert.greeting} ` : ''}${last.expert.pseudonym || ''}`,
      });
    } else if (currentIndex > 0) {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  };

  if (loading) {
    return <ProcessingLoader />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-x-hidden">
      <Header onLogoClick={() => navigate('/')} />

      <main className="w-full flex-1 flex flex-col items-center p-4 md:p-8 max-w-7xl mx-auto">
        <AIExpertMatcher
          isOpen={showAIMatcher}
          onClose={() => setShowAIMatcher(false)}
          onSelectExpert={handleAIExpertSelect}
          onMatchesFound={handleAIMatchesFound}
        />

        <AuditInfoModal
          isOpen={showAuditModal}
          onClose={() => setShowAuditModal(false)}
          expertName={lastSelectedExpertName}
          onGoToHistory={() => {
            setShowAuditModal(false);
            navigateToHistory();
          }}
          onGoToSwipes={() => setShowAuditModal(false)}
        />

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
                  expertName: `${pendingExpertForAudit.greeting ? `${pendingExpertForAudit.greeting} ` : ''}${pendingExpertForAudit.pseudonym || ''}`.trim(),
                  expertTelegram: pendingExpertForAudit.telegram || '',
                  source: marketplaceProduct ? 'marketplace_product_audit' : (state?.fromAISeller ? 'ai_seller_expert_selection' : 'expert_selection'),
                  tariffPackage: marketplaceProduct?.selectedTariff || state?.selectedPlan || undefined,
                  tariffName: marketplaceProduct?.productName || (state?.selectedPlan ? `Тариф «${state.selectedPlan}»` : undefined),
                  tariffDescription: marketplaceProduct?.shortDescription || undefined,
                  price: marketplaceProduct?.price || undefined,
                  paymentType: marketplaceProduct?.paymentModel || undefined,
                  imageUrl: marketplaceProduct?.productImage || undefined,
                  customNotes: marketplaceProduct?.customNotes || undefined,
                }
              : undefined
          }
          onAuditSubmitted={handleBusinessAuditSubmit}
        />

        {/* Product context banner if navigated from marketplace */}
        {marketplaceProduct && (
          <div className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mb-4 p-3 rounded-2xl border border-amber-400/50 bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3 text-sm shadow-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5 overflow-hidden">
              {marketplaceProduct.productImage && (
                <img 
                  src={marketplaceProduct.productImage} 
                  alt={marketplaceProduct.productName} 
                  className="w-9 h-9 rounded-xl object-cover border border-amber-400/40 shrink-0" 
                />
              )}
              <div className="truncate">
                <div className="text-white font-semibold truncate text-sm">{marketplaceProduct.productName}</div>
                <div className="text-amber-300 truncate text-sm">Тариф «{marketplaceProduct.selectedTariff}» • {marketplaceProduct.price ? `${Number(marketplaceProduct.price).toLocaleString('ru-RU')} ₽` : 'Аудит'}</div>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/40 text-sm font-semibold shrink-0">
              Для аудита
            </span>
          </div>
        )}

        {/* Sub-Header bar */}
        <header className="w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl flex justify-between items-center mb-6">
          <button 
            onClick={() => {
              if (state?.fromAISeller) {
                navigate('/ai-seller/plans');
              } else if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity cursor-pointer"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Назад</span>
          </button>
          <h1 className="text-2xl md:text-3xl text-center font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent">
            Подбор эксперта
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAIMatcher(true)}
              className="p-2 rounded-full bg-white/5 border border-amber-400/40 hover:bg-amber-400/15 transition-all text-amber-300 cursor-pointer shadow-[0_0_12px_rgba(251,191,36,0.2)]"
              title="ИИ-подбор эксперта"
            >
              <Wand2 size={18} />
            </button>
            <button 
              onClick={navigateToHistory}
              className="p-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 transition-all relative cursor-pointer"
              title="История свайпов"
              disabled={swipeHistory.length === 0}
            >
              <History size={18} className="text-amber-200" />
              {swipeHistory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-stone-950 font-bold text-xs rounded-full flex items-center justify-center">
                  {swipeHistory.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setShowInstructions(true)}
              className="p-2 rounded-full bg-white/5 border border-white/15 hover:bg-white/10 transition-all cursor-pointer"
              title="Инструкция"
            >
              <HelpCircle size={18} className="text-amber-200" />
            </button>
          </div>
        </header>

        {/* Instructions Modal Component */}
        <ExpertSwipeInstructionsModal
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />

        {/* Main Card Area */}
        <div className="flex-1 flex flex-col items-center justify-center w-full max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl relative px-2 sm:px-4">
          {/* Explosion Icons */}
          <AnimatePresence>
            {explosionIcons.map(icon => (
              <motion.span
                key={icon.id}
                initial={{ 
                  opacity: 1, 
                  scale: icon.type === 'gear' ? 0.5 : 1, 
                  x: 0, 
                  y: 0,
                  rotate: 0
                }}
                animate={{ 
                  opacity: 0, 
                  scale: icon.type === 'smoke' ? 2.5 : icon.type === 'gear' ? 1.2 : 1.5, 
                  x: icon.x, 
                  y: icon.y,
                  rotate: icon.type === 'gear' ? 360 : 0
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: icon.type === 'smoke' ? 0.7 : icon.type === 'gear' ? 0.6 : 0.5, 
                  ease: 'easeOut' 
                }}
                className={`absolute z-50 pointer-events-none ${
                  icon.type === 'smoke' ? 'text-3xl opacity-60' : 
                  icon.type === 'gear' ? 'text-2xl text-secondary' : 
                  'text-xl'
                }`}
                style={{ top: '50%', left: '50%' }}
              >
                {icon.icon}
              </motion.span>
            ))}
          </AnimatePresence>

          {isComplete ? (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative p-8 text-center max-w-2xl w-full rounded-3xl bg-black/60 backdrop-blur-2xl border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden"
            >
              <RealisticSmokeBackdrop speed="slow" opacity={0.3} variant="amber" className="absolute inset-0 pointer-events-none z-0" />
              <Rivets />
              <div className="relative z-10">
                <i className="fa-solid fa-trophy text-6xl text-amber-300 mb-4"></i>
                <h2 className="text-2xl md:text-3xl mb-4 bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent font-bold">
                  Подбор завершён
                </h2>
                <p className="text-white/80 mb-6 text-sm md:text-base">
                  Выбрано экспертов: <span className="text-amber-300 font-bold">{selectedExperts.length}</span>
                </p>
                
                {fromAISeller && selectedExperts.length > 0 && (
                  <button 
                    onClick={handleConfirmSelection}
                    disabled={isSubmitting}
                    className="w-full py-4 mb-4 rounded-2xl bg-gradient-to-r from-amber-400/25 via-amber-400/35 to-amber-400/20 hover:from-amber-400/40 hover:to-amber-400/30 border border-amber-400/60 text-white font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_24px_rgba(251,191,36,0.25)]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2 text-amber-300" />
                        Подтвердить выбор эксперта
                      </>
                    )}
                  </button>
                )}
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={navigateToHistory} 
                    className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <History size={18} className="text-amber-200" /> Посмотреть историю
                  </button>
                  <button 
                    onClick={resetSwipes} 
                    className="w-full py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white/70 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw size={18} /> Пройти заново
                  </button>
                </div>
              </div>
            </motion.div>
          ) : currentExpert && (
            <div className="relative w-full flex items-start justify-center min-h-[580px] lg:min-h-[640px]">
              {/* Left 3D Carousel Card (Previous) */}
              {previousExpert && (
                <div 
                  onClick={undoLastSwipe}
                  className="hidden md:flex absolute -left-8 lg:-left-20 xl:-left-28 top-2 lg:top-3 w-[45%] lg:w-[48%] h-[82%] max-h-[580px] [transform:perspective(1200px)_rotateY(20deg)_scale(0.88)] [transform-origin:top_right] opacity-40 hover:opacity-80 transition-all duration-300 z-0 cursor-pointer pointer-events-auto select-none items-start"
                  title="Предыдущий эксперт (кликните, чтобы вернуть)"
                >
                  <div className="w-full h-full relative p-3.5 bg-black/75 backdrop-blur-md rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col justify-start">
                    <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                    <ExpertCard expert={previousExpert} compact={true} />
                  </div>
                </div>
              )}

              {/* Right 3D Carousel Card (Next) */}
              {nextExpert && (
                <div 
                  onClick={() => handleSwipe('down')}
                  className="hidden md:flex absolute -right-8 lg:-right-20 xl:-right-28 top-2 lg:top-3 w-[45%] lg:w-[48%] h-[82%] max-h-[580px] [transform:perspective(1200px)_rotateY(-20deg)_scale(0.88)] [transform-origin:top_left] opacity-40 hover:opacity-80 transition-all duration-300 z-0 cursor-pointer pointer-events-auto select-none items-start"
                  title="Следующий эксперт"
                >
                  <div className="w-full h-full relative p-3.5 bg-black/75 backdrop-blur-md rounded-3xl overflow-hidden border border-white/20 shadow-2xl flex flex-col justify-start">
                    <div className="absolute inset-0 bg-gradient-to-l from-black/85 via-black/40 to-transparent pointer-events-none z-20" />
                    <ExpertCard expert={nextExpert} compact={true} />
                  </div>
                </div>
              )}

              {/* Main Card - entire card is draggable */}
              <motion.div
                key={currentExpert.id}
                drag
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                dragElastic={0.9}
                onDragEnd={handleDragEnd}
                style={{ x, y, rotate, opacity }}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={
                  swipeAnimation === 'right' ? { x: 400, opacity: 0, rotate: 15, scale: 0.9 } :
                  swipeAnimation === 'left' ? { x: -400, opacity: 0, rotate: -15, scale: 0.9 } :
                  swipeAnimation === 'down' ? { y: 400, opacity: 0, scale: 0.9 } :
                  { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1 }
                }
                transition={{ 
                  type: 'spring', 
                  damping: 25, 
                  stiffness: 300,
                  mass: 0.5
                }}
                className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto cursor-grab active:cursor-grabbing relative z-10 touch-none will-change-transform select-none"
                whileDrag={{ scale: 1.02 }}
              >
                {/* Tap zones inside card */}
                <div className="absolute inset-0 z-30 pointer-events-none rounded-2xl overflow-hidden">
                  {/* Left tap zone */}
                  <button
                    onClick={() => handleTapZone('left')}
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute left-0 top-0 w-1/4 h-4/5 pointer-events-auto active:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Отказаться"
                  />
                  {/* Right tap zone */}
                  <button
                    onClick={() => handleTapZone('right')}
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute right-0 top-0 w-1/4 h-4/5 pointer-events-auto active:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Выбрать"
                  />
                  {/* Bottom tap zone */}
                  <button
                    onClick={() => handleTapZone('down')}
                    onPointerDown={e => e.stopPropagation()}
                    className="absolute bottom-0 left-1/4 w-1/2 h-1/5 pointer-events-auto active:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Пропустить"
                  />
                </div>
                
                <ExpertCard 
                  expert={currentExpert} 
                  compact={false}
                />

                {/* Card Counter - shows viewed/total from allExperts */}
                <div className="mt-4 pt-3 border-t border-white/15 flex justify-between items-center relative z-40">
                  <span className="text-sm text-white/70">
                    Просмотрено: {swipeHistory.length} / {totalExperts}
                  </span>
                  <span className="text-sm text-white/70">
                    Осталось: {experts.length - currentIndex}
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ExpertSelection;
