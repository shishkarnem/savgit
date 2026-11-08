import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { PlanData, BusinessInfo } from '@/types';
import { FALLBACK_PLANS } from '@/constants';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import GlassBubbleButton from '@/components/GlassBubbleButton';
import GlobalFooter from '@/components/GlobalFooter';
import {
  Repeat,
  Zap,
  Check,
  ChevronLeft,
  ChevronRight,
  Tag,
  X,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Cpu,
  Layers,
  FileText,
  UserCheck,
  Clock,
  MessageSquare,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Download,
  CheckSquare,
  Square,
  History,
  Building2,
  Info,
  Loader2 as PromoLoader
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useActionTracker } from '@/hooks/useActionTracker';
import { usePromoCode } from '@/hooks/usePromoCode';
import { Input } from '@/components/ui/input';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import { fetchPlansFromDatabase } from '@/services/sheetService';
import BusinessAuditModal from '@/components/BusinessAuditModal';
import { splitNumberedList } from '@/utils/textUtils';
import { generatePresentationPdf } from '@/utils/presentationPdf';

type PaymentType = 'monthly' | 'onetime';

interface CalculationHistoryItem {
  id: string;
  timestamp: number;
  companyName: string;
  sphere?: string;
  segment?: string;
  category?: string;
  businessDescription?: string;
  imageUrl?: string;
  plans: PlanData[];
}

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const DEFAULT_ALL_CHANNELS = [
  'Телеграм бот (бесплатно)',
  'Телеграм личный (3000р)',
  'Чат на сайт (бесплатно)',
  'WhatsApp личный (3000р)',
  'WhatsApp Business (5000р)',
  'Instagram (2500р)',
  'Вконтакте (2000р)',
  'Авито (2000р)',
  'Битрикс24 (бесплатно при покупке платных мессенджеров)',
  'amoCRM (бесплатно при покупке платных мессенджеров)',
  'Email (бесплатно)'
];

const AISellerPlans: React.FC = () => {
  const navigate = useNavigate();
  const { referralPromo, user: tgUser } = useTelegramAuth();
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [selectedPlanModal, setSelectedPlanModal] = useState<PlanData | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('monthly');
  const [generatedImage, setGeneratedImage] = useState<string>('');

  // History Carousel State
  const [calcHistory, setCalcHistory] = useState<CalculationHistoryItem[]>([]);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState<number>(0);
  
  // Accordion state for "Краткое описание" and "Опции" on plan cards
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});

  // Multi-select channels state for the detailed modal
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [isChannelsDropdownOpen, setIsChannelsDropdownOpen] = useState<boolean>(true);

  // PDF Export loading state and progress tracking
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgress, setPdfProgress] = useState<number>(0);
  const [pdfStatusText, setPdfStatusText] = useState<string>('');
  const [downloadingPlanId, setDownloadingPlanId] = useState<string | null>(null);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // Free Business Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditTargetPlan, setAuditTargetPlan] = useState<PlanData | null>(null);

  const { trackAction } = useActionTracker('ai_seller');
  const { promoCode, setPromoCode, isChecking, promoResult, checkPromo, applyDiscount } = usePromoCode();
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  const toggleDescExpand = (pkg: string) => {
    setExpandedDescriptions(prev => ({ ...prev, [pkg]: !prev[pkg] }));
  };

  const toggleOptionsExpand = (pkg: string) => {
    setExpandedOptions(prev => ({ ...prev, [pkg]: !prev[pkg] }));
  };

  const toggleChannelSelection = (ch: string) => {
    setSelectedChannels(prev => 
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    );
  };

  // Load calculations history from localStorage
  useEffect(() => {
    try {
      const histRaw = localStorage.getItem('sav_user_calculations_history');
      if (histRaw) {
        const parsed = JSON.parse(histRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCalcHistory(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse calculations history:', e);
    }
  }, []);

  const handleSelectCalculation = (item: CalculationHistoryItem, index: number) => {
    setActiveHistoryIndex(index);
    if (item.plans && item.plans.length > 0) {
      setPlans(item.plans);
      sessionStorage.setItem('sav-plans', JSON.stringify(item.plans));
    }
    if (item.imageUrl) {
      setGeneratedImage(item.imageUrl);
    }
    if (item.companyName) {
      sessionStorage.setItem('sav-company-name', item.companyName);
    }
    if (item.businessDescription) {
      sessionStorage.setItem('sav-business-description', item.businessDescription);
    }
    if (item.sphere && item.segment && item.category) {
      const info: BusinessInfo = {
        company_name: item.companyName,
        sphere: item.sphere as any,
        segment: item.segment as any,
        category: item.category as any,
        description: item.businessDescription || '',
        praise: '',
        image_url: item.imageUrl
      };
      sessionStorage.setItem('sav-business-info', JSON.stringify(info));
    }
    trackAction('switch_calculation_history', { page: '/ai-seller/plans', calcId: item.id });
  };

  // Helper to get business info from sessionStorage
  const getBusinessInfo = (): {
    type: string | null;
    classification: string | null;
    businessDescription: string | null;
    companyName: string | null;
    raw: BusinessInfo | null;
    imageUrl?: string | null;
  } => {
    const stored = sessionStorage.getItem('sav-business-info');
    const businessDescription = sessionStorage.getItem('sav-business-description');
    const storedCompany = sessionStorage.getItem('sav-company-name') || 
      sessionStorage.getItem('sav-project-name') || 
      localStorage.getItem('sav_company_name') || 
      localStorage.getItem('sav_project_name');
    if (!stored) {
      return { 
        type: null, 
        classification: null, 
        businessDescription: businessDescription || null, 
        companyName: storedCompany || null,
        raw: null, 
        imageUrl: null 
      };
    }
    try {
      const info: BusinessInfo = JSON.parse(stored);
      const companyName = info.company_name || (info as any).companyName || storedCompany || null;
      return {
        type: `${info.segment} / ${info.category} / ${info.sphere}`,
        classification: info.description || null,
        businessDescription: businessDescription || info.description || null,
        companyName,
        raw: info,
        imageUrl: info.image_url || null
      };
    } catch {
      return { 
        type: null, 
        classification: null, 
        businessDescription: businessDescription || null, 
        companyName: storedCompany || null,
        raw: null, 
        imageUrl: null 
      };
    }
  };

  useEffect(() => {
    const bInfo = getBusinessInfo();
    if (bInfo.imageUrl) {
      setGeneratedImage(bInfo.imageUrl);
    }
  }, []);

  // Auto-fill promo from referral code
  useEffect(() => {
    if (referralPromo && !promoCode) {
      setPromoCode(referralPromo);
      checkPromo(referralPromo);
    }
  }, [referralPromo]);

  // Pre-fill promo from existing lead
  useEffect(() => {
    if (leadLoaded && existingLead?.promo && !promoCode && !referralPromo) {
      setPromoCode(existingLead.promo);
      checkPromo(existingLead.promo);
    }
  }, [leadLoaded, existingLead]);

  const loadTariffs = async (pType: PaymentType) => {
    const bInfo = getBusinessInfo();
    let calculated: PlanData[] = [];
    if (bInfo.raw) {
      calculated = await fetchPlansFromDatabase({
        sphere: bInfo.raw.sphere,
        segment: bInfo.raw.segment,
        category: bInfo.raw.category,
        paymentType: pType
      });
    } else {
      calculated = FALLBACK_PLANS;
    }

    // Merge with any custom descriptions, names, key_benefits, roi and markdown blueprints from session if exists
    const stored = sessionStorage.getItem('sav-plans');
    if (stored) {
      try {
        const storedPlans: PlanData[] = JSON.parse(stored);
        const merged = calculated.map(cp => {
          const sp = storedPlans.find(p => p.package === cp.package || p.package?.toLowerCase() === cp.package?.toLowerCase());
          const monthly = cp.monthlyPrice || sp?.monthlyPrice || (pType === 'monthly' ? cp.priceMonth : Math.round(cp.priceMonth * 0.2));
          const onetime = cp.onetimePrice || sp?.onetimePrice || (pType === 'onetime' ? cp.priceMonth : Math.round(monthly / 0.2));
          const currentPrice = pType === 'onetime' ? onetime : monthly;

          if (sp) {
            return {
              ...cp,
              name: sp.name || sp.custom_title || cp.name,
              custom_title: sp.custom_title || sp.name || cp.name,
              fullDescription: sp.fullDescription || sp.custom_description || cp.fullDescription,
              custom_description: sp.custom_description || sp.fullDescription || cp.fullDescription,
              key_benefits: sp.key_benefits && sp.key_benefits.length > 0 ? sp.key_benefits : (sp.features ? sp.features.slice(0, 4) : []),
              features: sp.features && sp.features.length > 0 ? sp.features : cp.features,
              baseFeatures: cp.baseFeatures || sp.baseFeatures || cp.features,
              messengerOptions: cp.messengerOptions || sp.messengerOptions,
              duration: cp.duration || sp.duration,
              roiHighlight: sp.roiHighlight || sp.roi_highlight || cp.roiHighlight,
              roi_highlight: sp.roi_highlight || sp.roiHighlight || cp.roiHighlight,
              blueprintMarkdown: sp.blueprintMarkdown || sp.full_blueprint_markdown || cp.blueprintMarkdown,
              full_blueprint_markdown: sp.full_blueprint_markdown || sp.blueprintMarkdown || cp.blueprintMarkdown,
              monthlyPrice: monthly,
              onetimePrice: onetime,
              priceMonth: currentPrice
            };
          }
          return {
            ...cp,
            custom_title: cp.name,
            custom_description: cp.fullDescription,
            baseFeatures: cp.baseFeatures || cp.features,
            monthlyPrice: monthly,
            onetimePrice: onetime,
            priceMonth: currentPrice
          };
        });
        setPlans(merged);
        return;
      } catch {}
    }

    setPlans(calculated);
  };

  useEffect(() => {
    loadTariffs(paymentType);
  }, [paymentType]);

  useEffect(() => {
    trackAction('view_plans', { page: '/ai-seller/plans' });
  }, []);

  const displayPlans = plans.length > 0 ? plans : FALLBACK_PLANS;

  const handlePaymentTypeToggle = (type: PaymentType) => {
    setPaymentType(type);
    sessionStorage.setItem('sav-payment-type', type);
    if (selectedPlanModal) {
      const updated = displayPlans.find(p => p.package === selectedPlanModal.package);
      if (updated) {
        setSelectedPlanModal(updated);
      }
    }
  };

  const handleOpenBlueprint = (plan: PlanData) => {
    setSelectedPlanModal(plan);
    trackAction('open_blueprint_modal', { page: '/ai-seller/plans', value: plan.package });

    // Initialize selected channels for this plan
    let planChannels = splitNumberedList(plan.messengerOptions);
    if (planChannels.length === 0) {
      planChannels = DEFAULT_ALL_CHANNELS.slice(0, 4);
    }
    setSelectedChannels(planChannels);

    const prices = getPlanPriceDetails(plan, paymentType);
    updateLead({
      tariff: plan.package,
      tariff_sum: String(prices.currentBase),
      tariff_sale: String(prices.currentFinal),
      sale_percent: prices.discountPercent,
    });
  };

  const handleSelectExpertForPlan = (plan: PlanData) => {
    sessionStorage.setItem('sav-selected-plan', plan.package);
    sessionStorage.setItem('sav-payment-type', paymentType);
    if (selectedChannels.length > 0) {
      sessionStorage.setItem('sav-selected-channels', JSON.stringify(selectedChannels));
    }
    trackAction('select_expert_from_plan', { page: '/ai-seller/plans', tariff: plan.package });
    navigate('/experts', { state: { fromAISeller: true, selectedPlan: plan.package } });
  };

  const handleOpenAuditModal = (plan?: PlanData) => {
    setAuditTargetPlan(plan || null);
    setIsAuditModalOpen(true);
    trackAction('open_audit_modal', { page: '/ai-seller/plans', tariff: plan?.package || 'general' });
  };

  // Generate & Download PDF Presentation
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(0);
    setPdfStatusText('Инициализация экспорта всех тарифов...');
    trackAction('download_pdf_presentation', { page: '/ai-seller/plans' });
    try {
      const bInfo = getBusinessInfo();
      await generatePresentationPdf({
        companyName: (bInfo.raw as any)?.companyName || (bInfo.raw as any)?.company_name || 'Бизнес',
        businessInfo: bInfo.raw,
        businessDescription: bInfo.businessDescription,
        plans: displayPlans,
        paymentType: paymentType,
        discountPercent: promoResult?.isValid ? (promoResult.discountPercent || 0) : 0,
        imageUrl: generatedImage || bInfo.imageUrl,
        onProgress: (progress, statusText) => {
          setPdfProgress(progress);
          setPdfStatusText(statusText);
        }
      });
    } catch (e) {
      console.error('Failed to generate PDF presentation:', e);
    } finally {
      setTimeout(() => {
        setIsGeneratingPdf(false);
        setPdfProgress(0);
        setPdfStatusText('');
      }, 700);
    }
  };

  // Generate & Download PDF for a single plan
  const handleDownloadSinglePlanPdf = async (plan: PlanData) => {
    setDownloadingPlanId(plan.package);
    setPdfProgress(0);
    setPdfStatusText(`Инициализация экспорта тарифа «${plan.package}»...`);
    trackAction('download_single_plan_pdf', { page: '/ai-seller/plans', tariff: plan.package });
    try {
      const bInfo = getBusinessInfo();
      await generatePresentationPdf({
        companyName: (bInfo.raw as any)?.companyName || (bInfo.raw as any)?.company_name || 'Бизнес',
        businessInfo: bInfo.raw,
        businessDescription: bInfo.businessDescription,
        plans: displayPlans,
        singlePlan: plan,
        paymentType: paymentType,
        discountPercent: promoResult?.isValid ? (promoResult.discountPercent || 0) : 0,
        imageUrl: generatedImage || bInfo.imageUrl,
        onProgress: (progress, statusText) => {
          setPdfProgress(progress);
          setPdfStatusText(statusText);
        }
      });
    } catch (e) {
      console.error('Failed to generate single plan PDF:', e);
    } finally {
      setTimeout(() => {
        setDownloadingPlanId(null);
        setPdfProgress(0);
        setPdfStatusText('');
      }, 700);
    }
  };

  // Calculation of prices and discounts
  const getPlanPriceDetails = (plan: PlanData, currentPaymentType: PaymentType) => {
    const monthlyBase = plan.monthlyPrice || (currentPaymentType === 'monthly' ? plan.priceMonth : Math.round(plan.priceMonth * 0.2)) || 10000;
    const onetimeBase = plan.onetimePrice || (currentPaymentType === 'onetime' ? plan.priceMonth : Math.round(monthlyBase / 0.2)) || 50000;

    const isOnetime = currentPaymentType === 'onetime';
    const currentBase = isOnetime ? onetimeBase : monthlyBase;
    const altBase = isOnetime ? monthlyBase : onetimeBase;

    const discountPercent = promoResult?.isValid ? (promoResult.discountPercent || 0) : 0;
    const hasDiscount = discountPercent > 0;

    const currentFinal = hasDiscount ? applyDiscount(currentBase) : currentBase;
    const altFinal = hasDiscount ? applyDiscount(altBase) : altBase;

    const currentSuffix = isOnetime ? ' ₽' : ' ₽/мес';
    const altSuffix = isOnetime ? ' ₽/мес' : ' ₽';

    return {
      monthlyBase,
      onetimeBase,
      currentBase,
      currentFinal,
      altBase,
      altFinal,
      hasDiscount,
      discountPercent,
      currentSuffix,
      altSuffix,
    };
  };

  const businessInfo = getBusinessInfo();

  return (
    <div className="min-h-screen text-white font-sans relative pb-20 select-none">
      <Header />

      <main className="container mx-auto px-4 pt-6 max-w-6xl">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="space-y-6"
        >
          {/* Top Bar Navigation & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
            <button
              onClick={() => navigate('/ai-seller/result')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-white px-4 py-2.5 rounded-xl border border-white/20 bg-black/60 hover:bg-white/10 backdrop-blur-2xl transition-all cursor-pointer shadow-sm min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4 text-amber-300" />
              <span>Сменить сегмент</span>
            </button>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* PDF Presentation Download Button styled with Liquid Glass gradient */}
              <GlassBubbleButton
                variant="secondary"
                size="sm"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setClickPosition({
                    x: Math.min(window.innerWidth - 350, Math.max(16, rect.left - 40)),
                    y: Math.min(window.innerHeight - 170, Math.max(16, rect.bottom + 10))
                  });
                  handleDownloadPdf();
                }}
                disabled={isGeneratingPdf}
                icon={isGeneratingPdf ? <PromoLoader className="w-4 h-4 text-amber-300 animate-spin" /> : <Download className="w-4 h-4 text-amber-300" />}
                className="border border-amber-400/40 text-amber-200 hover:text-white"
                title="Скачать все тарифы и полную документацию в PDF"
              >
                <span>{isGeneratingPdf ? `Формирование (${pdfProgress}%)` : 'Скачать всё'}</span>
              </GlassBubbleButton>
            </div>
          </div>

          {/* Minimalist Informative PDF Progress Card */}
          <AnimatePresence>
            {(isGeneratingPdf || downloadingPlanId) && (
              <>
                {/* Mobile Backdrop (subtle, non-intrusive) */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] pointer-events-auto"
                />

                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: 6 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={
                    clickPosition?.y !== undefined
                      ? { top: `${clickPosition.y}px` }
                      : {}
                  }
                  className={`fixed z-50 pointer-events-auto w-[92vw] max-w-sm md:w-96 p-4 rounded-2xl border border-amber-400/50 bg-black/90 backdrop-blur-2xl shadow-[0_16px_48px_rgba(0,0,0,0.85)] text-left text-white space-y-3 left-1/2 -translate-x-1/2 ${
                    !clickPosition?.y ? 'top-1/2 -translate-y-1/2' : ''
                  }`}
                >
                  <Rivets />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                      <Download className="w-4.5 h-4.5 text-amber-300 animate-pulse" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent truncate">
                        {downloadingPlanId ? `Экспорт тарифа «${downloadingPlanId}»` : 'Экспорт презентации в PDF'}
                      </h4>
                      <p className="text-xs text-stone-300 truncate mt-0.5">
                        {pdfStatusText || 'Идет обработка страниц...'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar & Percentage */}
                  <div className="space-y-1.5 pt-1">
                    <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-amber-400/30 p-0.5">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.6)]"
                        initial={{ width: '0%' }}
                        animate={{ width: `${pdfProgress}%` }}
                        transition={{ ease: 'easeOut', duration: 0.25 }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-amber-300/90">
                      <span>Сборка документа</span>
                      <span>{pdfProgress}%</span>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Multiple Calculations History Carousel / Switcher */}
          {calcHistory.length > 1 && (
            <div className="p-4 rounded-2xl border border-amber-400/30 bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden text-left">
              <Rivets />
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
                  <History className="w-4 h-4 text-amber-300" />
                  <span>История расчетов ({calcHistory.length}):</span>
                </div>
                <div className="text-xs text-white/60">
                  Переключение между вашими расчетами
                </div>
              </div>

              {/* Horizontal Scrollable Carousel Slider */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-amber-400/30">
                {calcHistory.map((item, idx) => {
                  const isActive = idx === activeHistoryIndex;
                  const itemDate = new Date(item.timestamp).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <button
                      key={item.id || idx}
                      type="button"
                      onClick={() => handleSelectCalculation(item, idx)}
                      className={`shrink-0 p-3 rounded-xl border text-left transition-all backdrop-blur-xl cursor-pointer min-w-[200px] max-w-[260px] ${
                        isActive
                          ? 'border-amber-300/90 bg-amber-400/20 shadow-[0_0_14px_rgba(251,191,36,0.25)]'
                          : 'border-white/15 bg-black/50 hover:border-white/30 hover:bg-black/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-amber-300 truncate">
                          {item.companyName || 'Бизнес'}
                        </span>
                        <span className="text-[11px] text-white/50 shrink-0">
                          {itemDate}
                        </span>
                      </div>
                      <div className="text-xs text-white/80 truncate">
                        {item.sphere || item.segment || 'Спецификация ИИ'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Business Info Header Banner */}
          {businessInfo.type && (
            <div className="p-5 md:p-6 rounded-2xl border border-amber-400/30 bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden text-left">
              <Rivets />
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="text-sm font-semibold uppercase tracking-wider text-amber-300/80">
                    Рассчитано для вашей ниши
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                    {businessInfo.type}
                  </h2>
                  {businessInfo.businessDescription && (
                    <p className="text-sm text-white/90 leading-relaxed font-normal pt-1">
                      {businessInfo.businessDescription}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                  <GlassBubbleButton
                    variant="gold"
                    size="md"
                    onClick={() => handleOpenAuditModal()}
                    className="w-full sm:w-auto text-sm font-bold"
                  >
                    Бесплатный аудит бизнеса
                  </GlassBubbleButton>
                </div>
              </div>
            </div>
          )}

          {/* Payment Model Selector */}
          <div className="flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl border border-amber-400/30 bg-black/70 backdrop-blur-xl shadow-lg">
              <button
                onClick={() => handlePaymentTypeToggle('monthly')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  paymentType === 'monthly'
                    ? 'bg-amber-400/25 border border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'text-white/70 hover:text-white border border-transparent'
                }`}
              >
                <Repeat className="w-4 h-4 text-amber-300" />
                <span>Ежемесячно</span>
              </button>

              <button
                onClick={() => handlePaymentTypeToggle('onetime')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                  paymentType === 'onetime'
                    ? 'bg-amber-400/25 border border-amber-300 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                    : 'text-white/70 hover:text-white border border-transparent'
                }`}
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Под ключ</span>
              </button>
            </div>
          </div>

          {/* Promo Code Box */}
          <div className="p-4 sm:p-5 rounded-2xl border border-amber-400/25 bg-black/70 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] relative overflow-hidden text-left">
            <Rivets />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Tag className="w-4 h-4 text-amber-300" />
                <label className="text-sm font-semibold text-white">Промокод партнера</label>
                {promoResult?.isValid && (
                  <span className="text-sm px-3 py-0.5 rounded-full border border-amber-300/50 text-amber-200 bg-amber-400/20 font-semibold">
                    Скидка {promoResult.discountPercent}% активна ({promoResult.partnerName || 'Партнер'})
                  </span>
                )}
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Промокод"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="bg-black/60 border-white/20 text-white placeholder:text-white/40 text-sm h-10 rounded-xl sm:w-48"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    checkPromo(promoCode);
                    setTimeout(() => {
                      if (promoCode.trim()) updateLead({ promo: promoCode.trim() });
                    }, 1000);
                  }}
                  disabled={isChecking || !promoCode.trim()}
                  className="shrink-0 h-10 px-4 border-amber-300/40 text-amber-200 hover:bg-black/80 text-sm font-semibold rounded-xl"
                >
                  {isChecking ? <PromoLoader className="w-3.5 h-3.5 animate-spin" /> : 'Применить'}
                </Button>
              </div>
            </div>
          </div>

          {/* Plan Cards Grid - Compact Order requested by user */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayPlans.map((p, idx) => {
              const prices = getPlanPriceDetails(p, paymentType);
              const customTitle = p.custom_title || p.name || `SAV AI Продавец ${p.package}`;
              const customDesc = p.custom_description || p.fullDescription || 'Автономный комплекс квалификации клиентов, автодожима и закрытия сделок.';
              const benefits = Array.isArray(p.key_benefits) && p.key_benefits.length > 0 ? p.key_benefits : [];
              const featuresList = splitNumberedList(p.baseFeatures || p.features);
              const isDescOpen = Boolean(expandedDescriptions[p.package]);
              const isOptionsOpen = Boolean(expandedOptions[p.package]);

              return (
                <div 
                  key={idx} 
                  className="p-5 sm:p-6 rounded-2xl border border-amber-400/25 bg-black/75 backdrop-blur-2xl shadow-[0_12px_36px_rgba(0,0,0,0.7)] flex flex-col justify-between hover:border-amber-300/70 transition-all group relative text-left"
                >
                  <Rivets />
                  
                  <div>
                    {/* 1. Тариф и В месяц/Подключ */}
                    <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
                      <span className="text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                        Тариф {p.package}
                      </span>
                      <span className="text-sm px-3 py-0.5 rounded-full border border-amber-300/30 text-amber-200 backdrop-blur-md bg-black/60 font-medium">
                        {paymentType === 'onetime' ? 'Под ключ' : 'В месяц'}
                      </span>
                    </div>

                    {/* 2. Блок с ценой */}
                    <div className="p-3.5 rounded-xl border border-amber-400/25 bg-black/60 backdrop-blur-md mb-3.5 text-center">
                      <div className="text-xs text-white/70 mb-1">
                        {paymentType === 'onetime' ? 'Единоразовая стоимость:' : 'Ежемесячный платеж:'}
                      </div>

                      {prices.hasDiscount ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-center gap-2">
                            <span className="line-through text-xs text-white/60">
                              {prices.currentBase.toLocaleString('ru-RU')}{prices.currentSuffix}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-md border border-amber-300/50 text-amber-200 bg-amber-400/20 font-semibold">
                              -{prices.discountPercent}%
                            </span>
                          </div>
                          <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                            {prices.currentFinal.toLocaleString('ru-RU')}{prices.currentSuffix}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                          {prices.currentBase.toLocaleString('ru-RU')}{prices.currentSuffix}
                        </div>
                      )}

                      <div className="text-xs text-white/60 mt-1 font-normal">
                        {paymentType === 'onetime'
                          ? `Или по тарифу: ${prices.altFinal.toLocaleString('ru-RU')}${prices.altSuffix}`
                          : `Или под ключ: ${prices.altFinal.toLocaleString('ru-RU')}${prices.altSuffix}`}
                      </div>
                    </div>

                    {/* 3. Краткое описание - заголовок custom_title и раскрывающийся модуль с custom_description, key_benefits и roi_highlight */}
                    <div className="mb-3.5 p-3 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => toggleDescExpand(p.package)}
                        className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group/title"
                      >
                        <div className="text-sm sm:text-base font-semibold text-amber-200 group-hover/title:text-yellow-200 transition-colors leading-snug">
                          {customTitle}
                        </div>
                        <div className="p-1 rounded-md border border-white/15 bg-black/40 text-amber-300 shrink-0">
                          {isDescOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      {isDescOpen && (
                        <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-2.5">
                          <div className="text-sm text-white/90 leading-relaxed">
                            {customDesc}
                          </div>

                          {benefits.length > 0 && (
                            <div className="p-2.5 rounded-lg border border-amber-400/20 bg-amber-400/10 space-y-1.5">
                              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                                Ключевые преимущества:
                              </div>
                              <div className="space-y-1">
                                {benefits.map((b, bIdx) => (
                                  <div key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-white/90">
                                    <span className="text-amber-300 font-bold">•</span>
                                    <span>{b}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(p.roi_highlight || p.roiHighlight) && (
                            <div className="p-2.5 rounded-lg border border-amber-400/25 bg-amber-400/10 flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                              <div className="text-xs sm:text-sm text-amber-200 leading-snug font-medium">
                                {p.roi_highlight || p.roiHighlight}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. Срок запуска */}
                    {p.duration && (
                      <div className="mb-3.5 p-2.5 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md flex items-center gap-2 text-sm text-white/90">
                        <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-white/70">Срок запуска:</span>
                        <span className="font-semibold text-amber-200">{p.duration}</span>
                      </div>
                    )}

                    {/* 5. Опции и возможности (заголовок и раскрывающийся список опций при клике на заголовок) */}
                    {featuresList.length > 0 && (
                      <div className="mb-3.5 p-3 rounded-xl border border-white/10 bg-black/50 backdrop-blur-md">
                        <button
                          type="button"
                          onClick={() => toggleOptionsExpand(p.package)}
                          className="w-full flex items-center justify-between gap-2 text-left cursor-pointer group/opt"
                        >
                          <div className="flex items-center gap-1.5 text-sm font-bold text-amber-300 group-hover/opt:text-yellow-200 transition-colors">
                            <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                            <span>Опции и возможности ({featuresList.length})</span>
                          </div>
                          <div className="p-1 rounded-md border border-white/15 bg-black/40 text-amber-300 shrink-0">
                            {isOptionsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </div>
                        </button>

                        {isOptionsOpen ? (
                          <div className="mt-2.5 pt-2.5 border-t border-white/10 space-y-1.5">
                            {featuresList.map((feat, fIdx) => (
                              <div key={fIdx} className="flex items-start gap-2 text-xs sm:text-sm text-white/90">
                                <Check className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                                <span className="leading-snug">{feat}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-white/60">
                            Нажмите, чтобы раскрыть полный список возможностей ({featuresList.length})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 6. Кнопки (Подробнее, Подобрать эксперта, Скачать КП, Бесплатный аудит) */}
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <GlassBubbleButton
                      variant="gold"
                      size="md"
                      className="w-full text-sm font-bold flex items-center justify-center gap-2 min-h-[42px]"
                      onClick={() => handleOpenBlueprint(p)}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Подробнее</span>
                    </GlassBubbleButton>

                    <GlassBubbleButton
                      variant="secondary"
                      size="md"
                      className="w-full text-sm font-bold flex items-center justify-center gap-2 leading-tight whitespace-normal text-center py-2 px-3 min-h-[42px]"
                      onClick={() => handleSelectExpertForPlan(p)}
                    >
                      <UserCheck className="w-4 h-4 shrink-0" />
                      <span>Подобрать эксперта для внедрения</span>
                    </GlassBubbleButton>

                    <button
                      type="button"
                      disabled={downloadingPlanId === p.package}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setClickPosition({
                          x: Math.min(window.innerWidth - 350, Math.max(16, rect.left)),
                          y: Math.min(window.innerHeight - 170, Math.max(16, rect.bottom + 8))
                        });
                        handleDownloadSinglePlanPdf(p);
                      }}
                      className="w-full py-2 px-3 rounded-2xl border border-amber-400/35 bg-black/60 hover:bg-black/80 text-amber-200 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md min-h-[42px]"
                      title="Скачать индивидуальное коммерческое предложение и спецификацию этого тарифа в PDF"
                    >
                      {downloadingPlanId === p.package ? (
                        <PromoLoader className="w-4 h-4 text-amber-300 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4 text-amber-300 shrink-0" />
                      )}
                      <span>Скачать КП</span>
                    </button>

                    <GlassBubbleButton
                      variant="dark"
                      size="md"
                      className="w-full text-sm font-semibold flex items-center justify-center gap-2 min-h-[42px]"
                      onClick={() => handleOpenAuditModal(p)}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Бесплатный аудит бизнеса</span>
                    </GlassBubbleButton>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <GlassBubbleButton 
              variant="secondary"
              size="lg"
              onClick={() => navigate('/ai-seller/result')}
              className="px-8 flex items-center justify-center gap-2"
            >
              <ChevronLeft className="w-5 h-5 text-amber-300" />
              <span>Сменить сегмент</span>
            </GlassBubbleButton>

            <GlassBubbleButton 
              variant="gold"
              size="lg"
              onClick={() => handleOpenAuditModal()}
              className="px-8 flex items-center justify-center gap-2 font-bold"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Бесплатный аудит бизнеса</span>
            </GlassBubbleButton>

            <GlassBubbleButton 
              variant="secondary"
              size="lg"
              onClick={() => navigate('/experts')}
              className="px-8 flex items-center justify-center gap-2"
            >
              <UserCheck className="w-5 h-5 text-amber-300" />
              <span>Каталог экспертов</span>
            </GlassBubbleButton>

            <GlassBubbleButton 
              variant="secondary"
              size="lg"
              onClick={() => navigate('/calculator')}
              className="px-8"
            >
              Пересчитать в калькуляторе
            </GlassBubbleButton>
          </div>
        </motion.div>
      </main>

      {/* ========================================================================= */}
      {/* DETAILED SPECIFICATION MODAL (Раскрытая карточка со спецификацией)         */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedPlanModal && (() => {
          const modalPrices = getPlanPriceDetails(selectedPlanModal, paymentType);
          const modalFeatures = splitNumberedList(selectedPlanModal.baseFeatures || selectedPlanModal.features);
          const customTitle = selectedPlanModal.custom_title || selectedPlanModal.name || `Спецификация тарифа «${selectedPlanModal.package}»`;
          const customDesc = selectedPlanModal.custom_description || selectedPlanModal.fullDescription;
          const benefits = Array.isArray(selectedPlanModal.key_benefits) ? selectedPlanModal.key_benefits : [];
          const blueprintMd = selectedPlanModal.full_blueprint_markdown || selectedPlanModal.blueprintMarkdown;
          const roiVal = selectedPlanModal.roi_highlight || selectedPlanModal.roiHighlight;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-transparent select-none">
              {/* Invisible Click-Outside Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedPlanModal(null)}
                className="fixed inset-0 bg-transparent"
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-amber-400/40 bg-black/90 p-5 sm:p-7 md:p-8 backdrop-blur-3xl shadow-[0_24px_64px_rgba(0,0,0,0.95)] text-left space-y-6"
              >
                <Rivets />

                {/* Close Button */}
                <button
                  onClick={() => setSelectedPlanModal(null)}
                  className="absolute top-4 right-4 p-2.5 rounded-full border border-white/20 bg-black/60 hover:bg-black/90 hover:border-amber-300 transition-all text-white/80 hover:text-white cursor-pointer z-20"
                  title="Закрыть"
                >
                  <X className="w-5 h-5 text-amber-200" />
                </button>

                {/* Modal Header */}
                <div className="pr-10">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-sm font-semibold px-3 py-1 rounded-full border border-amber-300/40 text-amber-200 backdrop-blur-md bg-black/60">
                      Архитектурная спецификация
                    </span>
                    <span className="text-sm font-medium px-3 py-1 rounded-full border border-white/20 text-white backdrop-blur-md bg-black/60">
                      Тариф {selectedPlanModal.package}
                    </span>
                  </div>

                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                    {customTitle}
                  </h2>
                </div>

                {/* 16:9 Steampunk Visual Banner */}
                {generatedImage && (
                  <div className="rounded-2xl overflow-hidden border border-amber-400/35 aspect-video relative shadow-2xl bg-black/80">
                    <img
                      src={generatedImage}
                      alt="Концепция решения"
                      className="w-full h-full object-cover object-center"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-4">
                      <div className="text-sm text-amber-200/90 font-medium backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-amber-400/30 bg-black/75">
                        Персональная концепция архитектуры SAV AI
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Brief Summary, Benefits & Duration */}
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-400/30 bg-black/70 backdrop-blur-2xl space-y-3 shadow-inner">
                  <div className="text-sm font-semibold text-amber-300">
                    Краткое резюме решения:
                  </div>
                  <p className="text-sm md:text-base text-white/90 leading-relaxed whitespace-pre-wrap font-normal">
                    {customDesc}
                  </p>

                  {benefits.length > 0 && (
                    <div className="p-3 rounded-xl border border-amber-400/25 bg-amber-400/10 space-y-2">
                      <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        Ключевые преимущества:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {benefits.map((b, bIdx) => (
                          <div key={bIdx} className="flex items-start gap-2 text-xs sm:text-sm text-white/90">
                            <span className="text-amber-300 font-bold">•</span>
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlanModal.duration && (
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10 text-sm text-white/90">
                      <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="text-white/70">Срок запуска:</span>
                      <span className="font-semibold text-amber-200">{selectedPlanModal.duration}</span>
                    </div>
                  )}
                  {roiVal && (
                    <div className="flex items-start gap-2.5 pt-2 border-t border-white/10 text-sm text-amber-200 font-medium">
                      <TrendingUp className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <span>{roiVal}</span>
                    </div>
                  )}
                </div>

                {/* Channels Multi-Select Dropdown Component */}
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-400/30 bg-black/70 backdrop-blur-2xl space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-amber-300" />
                      <span>Каналы связи и интеграции (выберите нужные):</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsChannelsDropdownOpen(!isChannelsDropdownOpen)}
                      className="text-xs font-semibold text-amber-200 flex items-center gap-1 hover:text-white cursor-pointer"
                    >
                      <span>{selectedChannels.length} выбрано</span>
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isChannelsDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {isChannelsDropdownOpen && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10 max-h-56 overflow-y-auto pr-1">
                      {(splitNumberedList(selectedPlanModal.messengerOptions).length > 0
                        ? splitNumberedList(selectedPlanModal.messengerOptions)
                        : DEFAULT_ALL_CHANNELS
                      ).map((channelItem, cIdx) => {
                        const isSelected = selectedChannels.includes(channelItem);
                        return (
                          <button
                            key={cIdx}
                            type="button"
                            onClick={() => toggleChannelSelection(channelItem)}
                            className={`p-2.5 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-2.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-amber-300/80 bg-amber-400/15 text-amber-100'
                                : 'border-white/10 bg-black/40 text-white/70 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                            ) : (
                              <Square className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                            )}
                            <span className="leading-snug">{channelItem}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Full Markdown Blueprint Specification from Neural Network */}
                {blueprintMd ? (
                  <div className="p-5 md:p-6 rounded-2xl border border-white/15 bg-black/70 backdrop-blur-2xl shadow-inner text-white/90 text-sm sm:text-base leading-relaxed">
                    <div className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-300" />
                      <span>Детальный архитектурный план и сценарии:</span>
                    </div>
                    <div className="prose prose-invert max-w-none space-y-3 prose-headings:text-amber-300 prose-headings:font-bold prose-headings:text-lg prose-headings:mt-4 prose-headings:mb-2 prose-strong:text-amber-200 prose-li:text-white/90 prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5">
                      <ReactMarkdown>
                        {blueprintMd}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}

                {/* Included Features & Modules List */}
                {modalFeatures.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-300" />
                      <span>Включенные модули и возможности:</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {modalFeatures.map((feat, fIdx) => (
                        <div
                          key={fIdx}
                          className="flex items-start gap-3 p-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-sm text-white/90"
                        >
                          <Check className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Payment Model Selector inside Modal */}
                <div className="p-5 rounded-2xl border border-amber-300/30 bg-black/75 backdrop-blur-2xl space-y-4">
                  <div className="text-sm font-bold text-amber-200">
                    Модель внедрения и оплаты:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => handlePaymentTypeToggle('monthly')}
                      className={`p-3.5 rounded-xl border text-left transition-all backdrop-blur-2xl cursor-pointer ${
                        paymentType === 'monthly'
                          ? 'border-amber-300/80 bg-black/90 ring-1 ring-amber-300/40 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                          : 'border-white/15 bg-black/50 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-white mb-0.5">
                        <Repeat className="w-4 h-4 text-amber-300" />
                        <span>Ежемесячно</span>
                      </div>
                      <div className="text-sm text-white/70">
                        Подписка с полным сопровождением
                      </div>
                    </button>

                    <button
                      onClick={() => handlePaymentTypeToggle('onetime')}
                      className={`p-3.5 rounded-xl border text-left transition-all backdrop-blur-2xl cursor-pointer ${
                        paymentType === 'onetime'
                          ? 'border-amber-300/80 bg-black/90 ring-1 ring-amber-300/40 shadow-[0_0_16px_rgba(251,191,36,0.2)]'
                          : 'border-white/15 bg-black/50 hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-bold text-white mb-0.5">
                        <Zap className="w-4 h-4 text-amber-300" />
                        <span>Под ключ</span>
                      </div>
                      <div className="text-sm text-white/70">
                        Разработка и передача под ключ
                      </div>
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-white/10">
                    <span className="text-sm text-white/75">
                      {paymentType === 'onetime' ? 'Единоразово за разработку:' : 'Ежемесячно по тарифу:'}
                    </span>
                    <div className="text-right">
                      {modalPrices.hasDiscount ? (
                        <div className="flex items-center gap-2.5">
                          <span className="line-through text-sm text-white/60">
                            {modalPrices.currentBase.toLocaleString('ru-RU')}{modalPrices.currentSuffix}
                          </span>
                          <span className="text-sm px-2 py-0.5 rounded-md border border-amber-300/50 text-amber-200 bg-amber-400/20 font-semibold">
                            -{modalPrices.discountPercent}%
                          </span>
                          <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                            {modalPrices.currentFinal.toLocaleString('ru-RU')}{modalPrices.currentSuffix}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                          {modalPrices.currentBase.toLocaleString('ru-RU')}{modalPrices.currentSuffix}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <GlassBubbleButton
                    variant="gold"
                    size="md"
                    onClick={() => {
                      setSelectedPlanModal(null);
                      handleSelectExpertForPlan(selectedPlanModal);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 font-bold text-center leading-snug whitespace-normal py-2.5 px-3 min-h-[46px]"
                  >
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span className="flex flex-col items-center justify-center leading-tight">
                      <span>Подобрать эксперта</span>
                      <span>для внедрения</span>
                    </span>
                  </GlassBubbleButton>

                  <button
                    type="button"
                    disabled={downloadingPlanId === selectedPlanModal.package}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setClickPosition({
                        x: Math.min(window.innerWidth - 350, Math.max(16, rect.left)),
                        y: Math.min(window.innerHeight - 170, Math.max(16, rect.bottom + 8))
                      });
                      handleDownloadSinglePlanPdf(selectedPlanModal);
                    }}
                    className="py-2.5 px-4 rounded-2xl border border-amber-400/40 bg-black/70 hover:bg-black/90 text-amber-200 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md min-h-[46px]"
                    title="Скачать PDF КП этого тарифа"
                  >
                    {downloadingPlanId === selectedPlanModal.package ? (
                      <PromoLoader className="w-4 h-4 text-amber-300 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 text-amber-300 shrink-0" />
                    )}
                    <span>Скачать КП</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const plan = selectedPlanModal;
                      setSelectedPlanModal(null);
                      handleOpenAuditModal(plan);
                    }}
                    className="py-2.5 px-4 rounded-2xl border border-amber-400/50 bg-black/70 hover:bg-amber-400/20 text-amber-200 hover:text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md min-h-[46px]"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>Бесплатный аудит</span>
                  </button>

                  <GlassBubbleButton
                    variant="secondary"
                    size="md"
                    onClick={() => setSelectedPlanModal(null)}
                    className="sm:w-auto min-h-[46px]"
                  >
                    Закрыть
                  </GlassBubbleButton>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Free Business Audit Modal */}
      <BusinessAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        initialData={{
          source: 'ai_seller_plans',
          tariffName: auditTargetPlan?.custom_title || auditTargetPlan?.name || (auditTargetPlan ? `Тариф ${auditTargetPlan.package}` : undefined),
          tariffPackage: auditTargetPlan?.package,
          tariffDescription: auditTargetPlan?.custom_description || auditTargetPlan?.fullDescription,
          tariffFeatures: auditTargetPlan ? (auditTargetPlan.baseFeatures || auditTargetPlan.features) : undefined,
          price: auditTargetPlan ? getPlanPriceDetails(auditTargetPlan, paymentType).currentFinal : undefined,
          discountPercent: promoResult?.isValid ? promoResult.discountPercent : 0,
          paymentType: paymentType,
          imageUrl: generatedImage || businessInfo.imageUrl || undefined,
          businessInfo: {
            sphere: businessInfo.raw?.sphere || undefined,
            segment: businessInfo.raw?.segment || undefined,
            category: businessInfo.raw?.category || undefined,
            companyName: businessInfo.companyName || (businessInfo.raw as any)?.companyName || (businessInfo.raw as any)?.company_name || sessionStorage.getItem('sav-company-name') || undefined,
            description: businessInfo.businessDescription || businessInfo.raw?.description || undefined,
            userInput: businessInfo.raw?.userInput || undefined,
            imageUrl: generatedImage || businessInfo.imageUrl || undefined
          }
        }}
      />

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default AISellerPlans;
