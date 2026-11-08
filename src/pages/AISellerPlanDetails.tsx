import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlanData, PlanLevel, BusinessInfo } from '@/types';
import { FALLBACK_PLANS, INTEGRATIONS_LIST } from '@/constants';
import { fetchSpecificPlan } from '@/services/sheetService';
import { generatePlanPresentation } from '@/services/proTalkService';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import ProcessingLoader from '@/components/ProcessingLoader';
import GlassBubbleButton from '@/components/GlassBubbleButton';
import GlobalFooter from '@/components/GlobalFooter';
import { ChevronLeft, Check, Zap, Repeat, ArrowRight } from 'lucide-react';

const pageVariants = {
  initial: { opacity: 0, y: 20, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

const AISellerPlanDetails: React.FC = () => {
  const navigate = useNavigate();
  const { planLevel } = useParams<{ planLevel: string }>();
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [presentation, setPresentation] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPlanDetails = async () => {
      if (!planLevel) {
        navigate('/ai-seller/plans');
        return;
      }

      const decodedPlan = decodeURIComponent(planLevel) as PlanLevel;
      const storedBusinessInfo = sessionStorage.getItem('sav-business-info');
      const paymentType = (sessionStorage.getItem('sav-payment-type') as 'monthly' | 'onetime') || 'monthly';
      
      try {
        let businessInfo: BusinessInfo | null = null;
        if (storedBusinessInfo) {
          businessInfo = JSON.parse(storedBusinessInfo);
          if (businessInfo?.image_url) {
            setGeneratedImage(businessInfo.image_url);
          }
          if (businessInfo?.company_name) {
            setCompanyName(businessInfo.company_name);
          }
        }

        // Fetch plan data from BD ProTalk base prices + coefficients
        let data: PlanData | null = null;
        if (businessInfo) {
          const fetchedData = await fetchSpecificPlan({
            sphere: businessInfo.sphere,
            segment: businessInfo.segment,
            category: businessInfo.category,
            package: decodedPlan,
            paymentType
          });
          data = fetchedData;
        }
        
        if (!data) {
          const fallback = FALLBACK_PLANS.find(p => p.package === decodedPlan);
          if (fallback) {
            data = {
              tariffName: `SAV AI Продавец ${fallback.package}`,
              package: fallback.package as PlanLevel,
              sphere: (businessInfo?.sphere || 'Другое') as any,
              segment: (businessInfo?.segment || 'B2B') as any,
              category: (businessInfo?.category || 'Услуги') as any,
              fullDescription: fallback.fullDescription || '',
              priceMonth: fallback.priceMonth || 0,
              photoUrl: fallback.photoUrl || ''
            } as PlanData;
          }
        }

        setPlanData(data);

        // Generate presentation if possible
        if (businessInfo) {
          try {
            const pres = await generatePlanPresentation(businessInfo, decodedPlan);
            setPresentation(pres);
          } catch (e) {
            console.warn('Presentation generation skipped:', e);
          }
        }
      } catch (err) {
        console.error('Error loading plan details:', err);
        const fallback = FALLBACK_PLANS.find(p => p.package === decodedPlan);
        if (fallback) {
          setPlanData({
            tariffName: `SAV AI Продавец ${fallback.package}`,
            package: fallback.package as PlanLevel,
            sphere: 'Другое' as any,
            segment: 'B2B' as any,
            category: 'Услуги' as any,
            fullDescription: fallback.fullDescription || '',
            priceMonth: fallback.priceMonth || 0,
            photoUrl: fallback.photoUrl || ''
          } as PlanData);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPlanDetails();
  }, [planLevel, navigate]);

  if (isLoading) {
    return <ProcessingLoader />;
  }

  if (!planData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="p-8 rounded-2xl border border-amber-400/30 bg-black/80 backdrop-blur-2xl text-center max-w-md shadow-2xl">
          <p className="text-lg text-white mb-6">Тарифный план не найден</p>
          <GlassBubbleButton 
            variant="gold"
            onClick={() => navigate('/ai-seller/plans')} 
            className="w-full"
          >
            К списку тарифов
          </GlassBubbleButton>
        </div>
      </div>
    );
  }

  const selectedPlan = decodeURIComponent(planLevel || '') as PlanLevel;
  const paymentType = sessionStorage.getItem('sav-payment-type') || 'monthly';
  const isOnetime = paymentType === 'onetime';

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-8 relative">
      <Header onLogoClick={() => navigate('/')} />

      <main className="w-full max-w-4xl flex-grow mt-4">
        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.35 }}
          className="w-full space-y-6"
        >
          {/* Main Card - Apple Liquid Glass Darkening */}
          <div className="p-6 md:p-10 rounded-3xl border border-amber-400/30 bg-black/85 backdrop-blur-3xl shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
            <Rivets />

            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate('/ai-seller/plans')}
                  className="p-3 rounded-2xl border border-amber-400/30 bg-black/60 backdrop-blur-2xl hover:border-amber-300/60 transition-all text-white cursor-pointer"
                  title="Назад к тарифам"
                >
                  <ChevronLeft className="w-5 h-5 text-amber-200" />
                </button>
                <div>
                  <h2 className="text-2xl md:text-3xl bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent font-bold">
                    Архитектура {selectedPlan}
                  </h2>
                  <span className="text-xs text-white/70 font-normal">
                    Детальная спецификация программного комплекса
                  </span>
                </div>
              </div>

              <span className="text-xs sm:text-sm px-3.5 py-1.5 rounded-full border border-amber-300/40 text-amber-200 backdrop-blur-md bg-black/60 font-semibold">
                {isOnetime ? 'Единоразовая разработка' : 'Ежемесячный тариф'}
              </span>
            </div>

            {/* 16:9 Steampunk Visual Banner */}
            {generatedImage && (
              <div className="mb-8 rounded-2xl overflow-hidden border border-amber-400/35 aspect-video relative shadow-2xl bg-black/90 group">
                <img 
                  src={generatedImage} 
                  alt="Концепция ИИ-продавца 16:9" 
                  className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex items-end p-4 md:p-6">
                  <div className="text-sm md:text-base text-amber-200/90 font-medium backdrop-blur-2xl px-4 py-2 rounded-xl border border-amber-400/30 bg-black/75">
                    {companyName ? `Архитектурная спецификация для «${companyName}»` : 'Персонализированная концепция ИИ-продавца'}
                  </div>
                </div>
              </div>
            )}

            {/* Price & Summary */}
            <div className="p-5 md:p-6 rounded-2xl border border-amber-300/30 bg-black/70 backdrop-blur-2xl mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-white/70">Модель оплаты:</div>
                <div className="text-base md:text-lg font-bold text-white flex items-center gap-2 mt-1">
                  {isOnetime ? <Zap className="w-4.5 h-4.5 text-amber-300" /> : <Repeat className="w-4.5 h-4.5 text-amber-300" />}
                  <span>{isOnetime ? 'Разработка и внедрение под ключ' : 'Ежемесячное сопровождение'}</span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <div className="text-sm text-white/70">Стоимость:</div>
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent mt-0.5">
                  {planData.priceMonth ? `${planData.priceMonth.toLocaleString()} ₽${isOnetime ? '' : '/мес'}` : 'По запросу'}
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-amber-200 mb-3">
                Спецификация и назначение механизма:
              </h3>
              <div className="p-5 md:p-6 border border-white/15 rounded-2xl bg-black/70 backdrop-blur-2xl whitespace-pre-wrap leading-relaxed text-sm md:text-base text-white/90 font-normal">
                {planData.fullDescription}
              </div>
            </div>

            {/* Features if available */}
            {planData.features && planData.features.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-amber-200 mb-3">
                  Включенные модули и возможности:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {planData.features.map((f: string, i: number) => (
                    <div key={i} className="p-3.5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-3 text-sm text-white/90">
                      <Check className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {presentation && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-amber-200 mb-3">
                  Демонстрация сценариев работы:
                </h3>
                <div className="p-5 border border-white/15 rounded-2xl bg-black/70 backdrop-blur-2xl whitespace-pre-wrap leading-relaxed text-sm text-white/85">
                  {presentation}
                </div>
              </div>
            )}

            {/* Tech Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <div className="p-5 border border-white/15 rounded-2xl bg-black/70 backdrop-blur-2xl">
                <h4 className="text-sm font-semibold text-amber-200 mb-3">
                  Энергоблоки (токены диалогов):
                </h4>
                <ul className="space-y-2 text-sm text-white/80">
                  <li className="flex items-center justify-between">
                    <span>10 млн токенов</span>
                    <span className="font-semibold text-amber-300">600 ₽</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>50 млн токенов</span>
                    <span className="font-semibold text-amber-300">3 000 ₽</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>200 млн токенов</span>
                    <span className="font-semibold text-amber-300">12 000 ₽</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span>400 млн токенов</span>
                    <span className="font-semibold text-amber-300">24 000 ₽</span>
                  </li>
                </ul>
              </div>

              <div className="p-5 border border-white/15 rounded-2xl bg-black/70 backdrop-blur-2xl">
                <h4 className="text-sm font-semibold text-amber-200 mb-3">
                  Каналы связи и интеграции:
                </h4>
                <div className="h-36 overflow-y-auto text-sm text-white/80 space-y-1.5 pr-2">
                  {INTEGRATIONS_LIST.split('\n').map((line, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-300/80 shrink-0"></span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <GlassBubbleButton 
                variant="gold"
                size="lg"
                onClick={() => {
                  sessionStorage.setItem('sav-selected-plan', selectedPlan);
                  navigate('/experts', { state: { fromAISeller: true, selectedPlan } });
                }}
                className="flex-1"
                iconRight={<ArrowRight className="w-5 h-5" />}
              >
                Выбрать эксперта для аудита и внедрения
              </GlassBubbleButton>

              <GlassBubbleButton 
                variant="secondary"
                size="lg"
                onClick={() => navigate('/ai-seller/plans')}
                className="sm:w-auto"
              >
                Назад к тарифам
              </GlassBubbleButton>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default AISellerPlanDetails;
