import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchPlansFromDatabase } from '@/services/sheetService';
import { classifyBusiness } from '@/services/proTalkService';
import { BusinessInfo } from '@/types';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import ProTalkCountdownOverlay from '@/components/ProTalkCountdownOverlay';
import GlassBubbleButton from '@/components/GlassBubbleButton';
import GlobalFooter from '@/components/GlobalFooter';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import { getOrGenerateUID } from '@/lib/uidHelper';
import { Bot, ArrowRight, RefreshCw, Cpu, CheckCircle, ChevronLeft, ChevronDown } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISellerResult: React.FC = () => {
  const navigate = useNavigate();
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEnhancingPlans, setIsEnhancingPlans] = useState(false);
  const [currentDescription, setCurrentDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const { trackAction, saveSessionData } = useActionTracker('ai_seller');
  const { profile: telegramProfile } = useTelegramAuth();
  const { updateLead } = useLeadTracker();
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('sav-business-info');
    const storedDesc = sessionStorage.getItem('sav-business-description');
    const storedCompany = sessionStorage.getItem('sav-company-name') || '';

    if (storedCompany) {
      setCompanyName(storedCompany);
    }

    if (storedDesc) {
      setCurrentDescription(storedDesc);
    }

    if (stored) {
      try {
        const info = JSON.parse(stored);
        setBusinessInfo(info);
        trackAction('view_classification', { 
          page: '/ai-seller/result', 
          value: `${info.segment} / ${info.category} / ${info.sphere}` 
        });

        // Save classification to lead
        updateLead({
          segment: info.segment,
          category: info.category,
          sphere: info.sphere,
        });
        return;
      } catch {}
    }

    if (storedDesc && storedDesc.trim().length >= 5) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        runClassification(storedDesc.trim(), storedCompany);
      }
    } else {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const runClassification = async (descriptionText: string, company?: string) => {
    setIsLoading(true);
    trackAction('classify_business', { page: '/ai-seller/result', value: descriptionText.substring(0, 100) });

    try {
      const userInfo = telegramProfile ? {
        telegram_id: telegramProfile.telegram_id,
        first_name: telegramProfile.first_name,
        last_name: telegramProfile.last_name,
        username: telegramProfile.username,
      } : undefined;

      const info = await classifyBusiness(descriptionText, userInfo, company);

      // Preload image into browser cache so it renders immediately with zero pop-in
      if (info && info.image_url) {
        try {
          await new Promise<void>((resolve) => {
            const img = new Image();
            img.src = info.image_url!;
            img.onload = () => {
              console.log('[AISellerResult] Image preloaded successfully into cache');
              resolve();
            };
            img.onerror = () => {
              console.warn('[AISellerResult] Image preload note');
              resolve();
            };
            // Fallback timeout in case of network lag
            setTimeout(resolve, 1000);
          });
        } catch (imgPreErr) {
          console.warn('[AISellerResult] Image preload warning:', imgPreErr);
        }
      }

      setBusinessInfo(info);
      sessionStorage.setItem('sav-business-info', JSON.stringify(info));
      sessionStorage.setItem('sav-business-description', descriptionText);
      if (info.company_name) {
        sessionStorage.setItem('sav-company-name', info.company_name);
        setCompanyName(info.company_name);
      }

      updateLead({
        user_biz: descriptionText,
        project: company || info.company_name,
        segment: info.segment,
        category: info.category,
        sphere: info.sphere,
      });

      await saveSessionData({
        companyName: company || info.company_name,
        businessDescription: descriptionText,
        segment: info.segment,
        category: info.category,
        sphere: info.sphere,
        step: 'classified',
      } as any);
    } catch (err) {
      console.error('Classification error:', err);
      const fallback: BusinessInfo = {
        company_name: company || undefined,
        segment: 'B2B',
        category: 'Услуги',
        sphere: 'Технологии',
        description: descriptionText,
        praise: 'Высокий потенциал масштабирования бизнес-процессов с помощью SAV AI.',
        package: 'Стандарт'
      };
      setBusinessInfo(fallback);
      sessionStorage.setItem('sav-business-info', JSON.stringify(fallback));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateSegment = (newVal: string) => {
    if (!businessInfo) return;
    const updated = { ...businessInfo, segment: newVal };
    setBusinessInfo(updated);
    sessionStorage.setItem('sav-business-info', JSON.stringify(updated));
    updateLead({ segment: newVal });
  };

  const handleUpdateCategory = (newVal: string) => {
    if (!businessInfo) return;
    const updated = { ...businessInfo, category: newVal };
    setBusinessInfo(updated);
    sessionStorage.setItem('sav-business-info', JSON.stringify(updated));
    updateLead({ category: newVal });
  };

  const handleUpdateSphere = (newVal: string) => {
    if (!businessInfo) return;
    const updated = { ...businessInfo, sphere: newVal };
    setBusinessInfo(updated);
    sessionStorage.setItem('sav-business-info', JSON.stringify(updated));
    updateLead({ sphere: newVal });
  };

  const sphereOptions = [
    'Торговля',
    'Услуги',
    'Строительство',
    'Здоровье',
    'Производство',
    'Образование',
    'Реклама',
    'Транспорт',
    'Технологии',
    'Досуг',
    'Другое'
  ];

  const handleShowPrices = async () => {
    if (!businessInfo) return;
    setIsEnhancingPlans(true);
    trackAction('show_prices', { page: '/ai-seller/result' });
    
    try {
      // 1. Fetch calculated plans based on database coefficients
      const baseCalculatedPlans = await fetchPlansFromDatabase({
        sphere: businessInfo.sphere,
        segment: businessInfo.segment,
        category: businessInfo.category
      });

      // 2. Enhance tariff packages in JSON with context-specific AI descriptions and markdown blueprints
      try {
        const uid = getOrGenerateUID();
        const enhanceRes = await fetch('/api/v1/ai/enhance-tariffs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: businessInfo.company_name || companyName,
            sphere: businessInfo.sphere,
            segment: businessInfo.segment,
            category: businessInfo.category,
            businessDescription: businessInfo.description || currentDescription,
            basePlans: baseCalculatedPlans,
            userUid: uid,
            chat_id: uid,
            uid: uid
          })
        });

        if (enhanceRes.ok) {
          const enhanceData = await enhanceRes.json();
          if (enhanceData.success && Array.isArray(enhanceData.plans) && enhanceData.plans.length > 0) {
            const merged = baseCalculatedPlans.map(bp => {
              const enh = enhanceData.plans.find((p: any) => p.package === bp.package || p.package?.toLowerCase() === bp.package?.toLowerCase());
              if (enh) {
                return {
                  ...bp,
                  name: enh.name || enh.custom_title || bp.name,
                  custom_title: enh.custom_title || enh.name || bp.name,
                  fullDescription: enh.fullDescription || enh.custom_description || bp.fullDescription,
                  custom_description: enh.custom_description || enh.fullDescription || bp.fullDescription,
                  key_benefits: enh.key_benefits && Array.isArray(enh.key_benefits) ? enh.key_benefits : (Array.isArray(enh.features) ? enh.features.slice(0, 4) : []),
                  features: enh.features || enh.key_benefits || bp.features,
                  baseFeatures: bp.features,
                  messengerOptions: bp.messengerOptions,
                  duration: bp.duration,
                  roiHighlight: enh.roiHighlight || enh.roi_highlight || bp.roiHighlight,
                  roi_highlight: enh.roi_highlight || enh.roiHighlight || bp.roiHighlight,
                  blueprintMarkdown: enh.blueprintMarkdown || enh.full_blueprint_markdown || bp.blueprintMarkdown,
                  full_blueprint_markdown: enh.full_blueprint_markdown || enh.blueprintMarkdown || bp.blueprintMarkdown
                };
              }
              return {
                ...bp,
                custom_title: bp.name,
                custom_description: bp.fullDescription,
                baseFeatures: bp.features
              };
            });
            sessionStorage.setItem('sav-plans', JSON.stringify(merged));

            // Save to calculations history
            try {
              const histRaw = localStorage.getItem('sav_user_calculations_history');
              const history = histRaw ? JSON.parse(histRaw) : [];
              const newCalcEntry = {
                id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                timestamp: Date.now(),
                companyName: businessInfo.company_name || companyName || 'Моя компания',
                sphere: businessInfo.sphere,
                segment: businessInfo.segment,
                category: businessInfo.category,
                businessDescription: businessInfo.description || currentDescription,
                imageUrl: businessInfo.image_url || undefined,
                plans: merged
              };
              // Add to start and limit to 20
              const updatedHistory = [newCalcEntry, ...history.filter((h: any) => h.companyName !== newCalcEntry.companyName || (Date.now() - h.timestamp > 300000))].slice(0, 20);
              localStorage.setItem('sav_user_calculations_history', JSON.stringify(updatedHistory));
            } catch (histErr) {
              console.warn('Failed to save calculation history:', histErr);
            }
          } else {
            sessionStorage.setItem('sav-plans', JSON.stringify(baseCalculatedPlans));
          }
        } else {
          sessionStorage.setItem('sav-plans', JSON.stringify(baseCalculatedPlans));
        }
      } catch (enhErr) {
        console.warn('Enhance tariffs fallback:', enhErr);
        sessionStorage.setItem('sav-plans', JSON.stringify(baseCalculatedPlans));
      }

      await saveSessionData({
        companyName: businessInfo.company_name || companyName,
        segment: businessInfo.segment,
        category: businessInfo.category,
        sphere: businessInfo.sphere,
        description: businessInfo.description,
        step: 'plans_loaded',
      } as any);

      navigate('/ai-seller/plans');
    } catch {
      navigate('/ai-seller/plans');
    } finally {
      setIsEnhancingPlans(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8 relative">
      {isLoading && (
        <ProTalkCountdownOverlay 
          initialSeconds={120} 
          businessDescription={currentDescription} 
          title="Формирование архитектуры ИИ-продавца"
          badgeText="Нейросетевой анализ SAV AI"
          stagesType="classification"
          onCancel={() => {
            setIsLoading(false);
            navigate('/');
          }}
        />
      )}

      {isEnhancingPlans && (
        <ProTalkCountdownOverlay 
          initialSeconds={120} 
          businessDescription={businessInfo?.company_name ? `${businessInfo.company_name} • ${businessInfo.sphere}` : currentDescription} 
          title="Синтез персональных тарифов и спецификаций"
          badgeText="Системный архитектор SAV AI"
          stagesType="tariffs"
          onCancel={() => {
            setIsEnhancingPlans(false);
          }}
        />
      )}

      <Header onLogoClick={() => navigate('/')} />

      <main className="w-full max-w-4xl flex-grow mt-4">
        {businessInfo && (
          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4 }}
            className="w-full"
          >
            <div className="space-y-6">
              {/* Outer Block: Completely Transparent */}
              <div className="p-2 sm:p-4 md:p-6 relative bg-transparent border-0 ring-0 shadow-none">
                
                {/* Top Navigation & Header Badge */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-white/10">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-white px-3.5 py-1.5 rounded-full border border-white/20 bg-black/60 hover:bg-white/10 backdrop-blur-2xl transition-all cursor-pointer shadow-sm"
                    >
                      <ChevronLeft className="w-4 h-4 text-amber-300" />
                      <span>Назад к описанию</span>
                    </button>

                    <span className="text-sm font-semibold px-3.5 py-1.5 rounded-full border border-amber-300/40 text-amber-200 backdrop-blur-2xl bg-black/60">
                      Архитектура SAV AI 2026
                    </span>
                    {(businessInfo.company_name || companyName) && (
                      <span className="text-sm font-medium px-3.5 py-1.5 rounded-full border border-white/20 text-white backdrop-blur-2xl bg-black/60">
                        {businessInfo.company_name || companyName}
                      </span>
                    )}
                  </div>
                </div>

                {/* 16:9 Steampunk Visual Banner with Darkening Overlay */}
                {businessInfo.image_url && (
                  <div className="mb-6 rounded-2xl overflow-hidden border border-amber-400/30 aspect-video relative group shadow-[0_16px_48px_rgba(0,0,0,0.85)] bg-black/80">
                    <img 
                      src={businessInfo.image_url} 
                      alt="Концепция ИИ-продавца 16:9" 
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-4 md:p-6">
                      <div className="text-sm md:text-base text-amber-200/90 font-medium backdrop-blur-2xl px-4 py-2 rounded-xl border border-amber-400/30 bg-black/75 shadow-lg">
                        {businessInfo.company_name ? `Концепция для «${businessInfo.company_name}»` : 'Персонализированная концепция ИИ-продавца'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Praise Section with Darkening Transparency */}
                <div className="mb-6 text-white italic leading-relaxed text-base border-l-2 border-amber-400 pl-4 md:pl-6 bg-black/65 backdrop-blur-2xl py-4 pr-4 rounded-r-2xl border-y border-r border-amber-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                  {businessInfo.praise}
                </div>

                {/* 3 Metric Cards with Editable Dropdowns (Liquid Glass Apple Style) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* Segment Selector */}
                  <div className="p-4 bg-black/70 border border-amber-400/25 rounded-2xl text-left backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex flex-col justify-between">
                    <label className="text-xs sm:text-sm text-amber-300 font-mono mb-2 font-medium flex items-center justify-between">
                      <span>Сегмент рынка</span>
                      <span className="text-[10px] text-amber-200/60 font-sans">выберите</span>
                    </label>
                    <div className="relative">
                      <select
                        value={businessInfo.segment || 'B2C'}
                        onChange={(e) => handleUpdateSegment(e.target.value)}
                        className="w-full bg-black/80 text-white font-bold text-base md:text-lg rounded-xl border border-amber-400/30 px-3.5 py-2.5 pr-8 appearance-none focus:outline-none focus:border-amber-300 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="B2C" className="bg-[#12141a] text-white">B2C (для физлиц)</option>
                        <option value="B2B" className="bg-[#12141a] text-white">B2B (для бизнеса)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-amber-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Category Selector */}
                  <div className="p-4 bg-black/70 border border-amber-400/25 rounded-2xl text-left backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex flex-col justify-between">
                    <label className="text-xs sm:text-sm text-amber-300 font-mono mb-2 font-medium flex items-center justify-between">
                      <span>Категория предложения</span>
                      <span className="text-[10px] text-amber-200/60 font-sans">выберите</span>
                    </label>
                    <div className="relative">
                      <select
                        value={businessInfo.category || 'Товары'}
                        onChange={(e) => handleUpdateCategory(e.target.value)}
                        className="w-full bg-black/80 text-white font-bold text-base md:text-lg rounded-xl border border-amber-400/30 px-3.5 py-2.5 pr-8 appearance-none focus:outline-none focus:border-amber-300 transition-all cursor-pointer shadow-inner"
                      >
                        <option value="Товары" className="bg-[#12141a] text-white">Товары</option>
                        <option value="Услуги" className="bg-[#12141a] text-white">Услуги</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-amber-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Sphere Selector */}
                  <div className="p-4 bg-black/70 border border-amber-400/25 rounded-2xl text-left backdrop-blur-2xl shadow-[0_8px_24px_rgba(0,0,0,0.6)] flex flex-col justify-between">
                    <label className="text-xs sm:text-sm text-amber-300 font-mono mb-2 font-medium flex items-center justify-between">
                      <span>Сфера бизнеса</span>
                      <span className="text-[10px] text-amber-200/60 font-sans">выберите</span>
                    </label>
                    <div className="relative">
                      <select
                        value={businessInfo.sphere || 'Торговля'}
                        onChange={(e) => handleUpdateSphere(e.target.value)}
                        className="w-full bg-black/80 text-white font-bold text-base md:text-lg rounded-xl border border-amber-400/30 px-3.5 py-2.5 pr-8 appearance-none focus:outline-none focus:border-amber-300 transition-all cursor-pointer shadow-inner truncate"
                      >
                        {sphereOptions.map((sph) => (
                          <option key={sph} value={sph} className="bg-[#12141a] text-white">
                            {sph}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-amber-300 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Recommendation Block with Darkening Transparency */}
                <div className="p-6 md:p-8 bg-black/75 border border-amber-400/35 rounded-2xl text-center mb-8 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.7)] relative overflow-hidden">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-300/30 bg-amber-400/10 text-amber-200 text-xs font-semibold mb-3">
                    <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
                    Оптимальная конфигурация
                  </div>
                  <h3 className="text-xl md:text-2xl mb-3 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent font-bold">
                    Рекомендуемое решение: {businessInfo.package || 'Стандарт'}
                  </h3>
                  <p className="text-base text-amber-100/90 leading-relaxed font-sans max-w-2xl mx-auto">
                    {businessInfo.description || 'Архитектура автономного ИИ-продавца успешно сформирована. Перейдем к выбору тарифа и расчетным спецификациям?'}
                  </p>
                </div>

                {/* Action Buttons: Global Glass Bubble Button */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <GlassBubbleButton
                    variant="gold"
                    size="lg"
                    onClick={handleShowPrices}
                    disabled={isEnhancingPlans}
                    className="flex-1"
                    icon={<Bot className="w-5 h-5" />}
                    iconRight={isEnhancingPlans ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                  >
                    {isEnhancingPlans ? 'Синтез тарифов...' : 'Показать тарифы'}
                  </GlassBubbleButton>

                  <GlassBubbleButton
                    variant="secondary"
                    size="lg"
                    onClick={() => navigate('/')}
                    className="sm:w-auto"
                  >
                    Скорректировать описание
                  </GlassBubbleButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default AISellerResult;
