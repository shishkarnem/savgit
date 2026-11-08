import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Zap,
  ShoppingBag,
  Clock,
  Star,
  ChevronRight,
  ShieldCheck,
  Check,
  Bot,
  MessageSquare,
  Cpu,
  Calculator,
  FileText,
  CreditCard,
  Layers2,
  ExternalLink,
  Download,
  FileDown,
  Loader2,
  UserCheck
} from 'lucide-react';
import { MarketplaceItem, ProductVariant } from '@/types';
import { INITIAL_MARKETPLACE_ITEMS } from '@/data/marketplaceData';
import { BusinessAuditModal, AuditSubmissionData } from '@/components/BusinessAuditModal';
import GlobalFooter from '@/components/GlobalFooter';
import { isProductSlugMatch, generateProductSlug } from '@/utils/slugUtils';
import { generateProductProposalPdf } from '@/utils/productProposalPdf';

// Standard tariff capability definitions based on specification
const TARIFF_SPECS: Record<string, { devCost: number; tokenCount: string; msgs: string; dialogs: string; channels: string; features: string[] }> = {
  'лайт': {
    devCost: 18000,
    tokenCount: '10 млн токенов',
    msgs: '500 сообщений',
    dialogs: '50 диалогов',
    channels: 'Telegram бот или Чат на сайте на выбор',
    features: [
      'Консультация клиентов по базе знаний компании',
      'Расчет стоимости товаров и услуг по прайс-листу',
      'Отправка заявок и контактов клиентов в Telegram или Google Таблицу',
      'Отработка частых вопросов и базовых возражений клиентов',
      'Лимит: 10 млн токенов (500 сообщений, 50 диалогов в месяц)'
    ]
  },
  'эконом': {
    devCost: 36000,
    tokenCount: '20 млн токенов',
    msgs: '1000 сообщений',
    dialogs: '100 диалогов',
    channels: '3 мессенджера на выбор (Telegram, WhatsApp, Чат на сайте)',
    features: [
      'Консультация по расширенной базе знаний + встроенный скрипт продаж',
      'Расчет цены по калькулятору и сложному прайс-листу',
      'Отправка лидов в Telegram и Google Таблицы с уведомлением менеджера',
      'Отработка сложных возражений и дожим клиентов до сделки',
      'Автоматическая отправка коммерческих предложений и файлов',
      'Лимит: 20 млн токенов (1000 сообщений, 100 диалогов в месяц)'
    ]
  },
  'стандарт': {
    devCost: 72000,
    tokenCount: '50 млн токенов',
    msgs: '2500 сообщений',
    dialogs: '250 диалогов',
    channels: 'Любое количество каналов связи без ограничений',
    features: [
      'База знаний любого объема (каталоги, регламенты, инструкции)',
      'Индивидуальный калькулятор параметров и конфигуратор заказа',
      'Двусторонняя интеграция с CRM (amoCRM, Битрикс24), Telegram, чатом и таблицами',
      'Автоматическое формирование договоров, счетов и коммерческих предложений',
      'Любое количество мессенджеров и соцсетей',
      'Лимит: 50 млн токенов (2500 сообщений, 250 диалогов в месяц)'
    ]
  },
  'премиум': {
    devCost: 144000,
    tokenCount: '200 млн токенов',
    msgs: '10000 сообщений',
    dialogs: '1000 диалогов',
    channels: 'Все каналы + омниканальный контур + авто-напоминания',
    features: [
      'Несколько баз знаний под разные филиалы, отделы и линейки продуктов',
      'Полная интеграция в CRM-систему с переводом на ответственного менеджера',
      'Система автоматических напоминаний и прогрева клиентов по расписанию',
      'Глубокая аналитика диалогов и конверсий с формированием отчетов',
      'Лимит: 200 млн токенов (10000 сообщений, 100 диалогов в месяц)'
    ]
  },
  'vip': {
    devCost: 288000,
    tokenCount: '400 млн токенов',
    msgs: '20000 сообщений',
    dialogs: '2000 диалогов',
    channels: 'Мультиагентный контур + API сторонних сервисов',
    features: [
      'Думающие LLM модели + автономные ИИ-агенты с цепочками рассуждений',
      'Прямая интеграция по API со сторонними сервисами, 1С, складскими базами и ERP',
      'Индивидуальная кастомизация логики и сценариев под любые бизнес-процессы',
      'Персональный архитектор решений и приоритетная поддержка 24/7',
      'Лимит: 400 млн токенов (20000 сообщений, 2000 диалогов в месяц)'
    ]
  }
};

// Available token purchase packages
export interface TokenOption {
  id: string;
  tokens: string;
  tokenCountNum: number;
  messages: string;
  dialogs: string;
  price: number;
  isBase?: boolean;
}

const TOKEN_TIERS: TokenOption[] = [
  {
    id: 'tok_0',
    tokens: '0 млн токенов',
    tokenCountNum: 0,
    messages: 'Базовый лимит выбранного тарифа',
    dialogs: 'Включено в тариф',
    price: 0,
    isBase: true
  },
  {
    id: 'tok_10',
    tokens: '10 млн токенов',
    tokenCountNum: 10,
    messages: '500 сообщений',
    dialogs: '50 диалогов',
    price: 600
  },
  {
    id: 'tok_50',
    tokens: '50 млн токенов',
    tokenCountNum: 50,
    messages: '2 500 сообщений',
    dialogs: '250 диалогов',
    price: 3000
  },
  {
    id: 'tok_200',
    tokens: '200 млн токенов',
    tokenCountNum: 200,
    messages: '10 000 сообщений',
    dialogs: '1 000 диалогов',
    price: 12000
  },
  {
    id: 'tok_400',
    tokens: '400 млн токенов',
    tokenCountNum: 400,
    messages: '20 000 сообщений',
    dialogs: '2 000 диалогов',
    price: 24000
  }
];

export const cleanTariffName = (name?: string): string => {
  if (!name) return 'Лайт';
  return name.replace(/^тариф\s*[:«"']?\s*/i, '').replace(/[»"']$/g, '').trim() || 'Лайт';
};

export const ProductDetailPage: React.FC = () => {
  const { idOrSlug } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<MarketplaceItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [activeBottomTab, setActiveBottomTab] = useState<'description' | 'calculator'>('description');
  const [paymentModel, setPaymentModel] = useState<'monthly' | 'onetime'>('monthly');
  const [selectedTokenTier, setSelectedTokenTier] = useState<string>('tok_0');
  const [loading, setLoading] = useState<boolean>(true);

  // PDF Export State
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');

  // Business Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/marketplace/products/${idOrSlug}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.product) {
            setProduct(data.product);
            if (data.product.variants && data.product.variants.length > 0) {
              setSelectedVariant(data.product.variants[0]);
            }
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch from backend API, checking local items:', err);
      }

      // Fallback to local
      const found = INITIAL_MARKETPLACE_ITEMS.find(
        p => isProductSlugMatch(p, idOrSlug || '')
      );

      if (found) {
        setProduct(found);
        if (found.variants && found.variants.length > 0) {
          setSelectedVariant(found.variants[0]);
        }
      }
      setLoading(false);
    }

    loadProduct();
  }, [idOrSlug]);

  // Dynamic SEO Tags
  useEffect(() => {
    if (product) {
      document.title = product.seoTitle || `${product.name} — Решения для бизнеса | SAV AI`;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', product.seoDescr || product.shortDescription);

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (product.seoKeywords) {
        if (!metaKeywords) {
          metaKeywords = document.createElement('meta');
          metaKeywords.setAttribute('name', 'keywords');
          document.head.appendChild(metaKeywords);
        }
        metaKeywords.setAttribute('content', product.seoKeywords);
      }
    }
  }, [product]);

  // Determine current tariff specs
  const rawTariffName = selectedVariant?.name || 'лайт';
  const tariffKey = cleanTariffName(rawTariffName).toLowerCase();
  const matchedSpecKey = Object.keys(TARIFF_SPECS).find(k => tariffKey.includes(k)) || 'лайт';
  const tariffSpec = TARIFF_SPECS[matchedSpecKey];

  const currentMonthlyPrice = selectedVariant ? selectedVariant.price : (product?.price || 3600);
  const currentDevPrice = selectedVariant?.oldPrice || tariffSpec.devCost || (currentMonthlyPrice * 5);

  // Extra token price
  const chosenTokenObj = useMemo(() => {
    return TOKEN_TIERS.find(t => t.id === selectedTokenTier) || TOKEN_TIERS[0];
  }, [selectedTokenTier]);

  const totalMonthlyCalculated = currentMonthlyPrice + chosenTokenObj.price;
  const totalDevCalculated = currentDevPrice + chosenTokenObj.price;
  const activeSelectedPrice = paymentModel === 'monthly' ? totalMonthlyCalculated : totalDevCalculated;

  // Clean description text from Tabs:2 or description tab, stripping any boilerplate or info|#|...|#| tags
  const rawDescription = useMemo(() => {
    if (!product) return '';
    const fromTab2 = product.tab2Content;
    if (fromTab2 && fromTab2.trim()) return fromTab2;

    const descTab = product.tabs?.find(t => /описан|tabs?:?2/i.test(t.title));
    if (descTab && descTab.content) return descTab.content;

    if (product.tabs && product.tabs.length > 1 && product.tabs[1].content) {
      return product.tabs[1].content;
    }

    return product.fullDescription || product.shortDescription || '';
  }, [product]);

  const cleanDescriptionHtml = useMemo(() => {
    return rawDescription
      .replace(/^info\|#\|.*?\|#\|/gi, '')
      .replace(/info\|#\|/gi, '')
      .replace(/\|#\|/gi, '')
      .replace(/Материалы и видеообзор решения[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/ТАРИФЫ ОТЛИЧАЮТСЯ ФУНКЦИОНАЛОМ[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Подробнее на вкладке Тарифы[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Вы можете подобрать любой удобный Тариф на выбор:[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Либо заказать БЕСПЛАТНЫЙ АУДИТ вашей текущей системы[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Консультация по ссылке[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Примеры ботов в плейлисте VK[\s\S]*?(?=<\/div>|$)/gi, '')
      .replace(/Примеры ботов в плейлисте YouTube[\s\S]*?(?=<\/div>|$)/gi, '')
      .trim();
  }, [rawDescription]);

  // Handler for PDF download
  const handleDownloadPdf = async () => {
    if (!product || isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfProgressText('Подготовка КП...');
    try {
      await generateProductProposalPdf({
        product,
        selectedVariant,
        descriptionHtml: cleanDescriptionHtml,
        onProgress: (_progress, text) => {
          setPdfProgressText(text);
        }
      });
    } catch (err) {
      console.error('Error generating PDF proposal:', err);
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgressText('');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="p-8 rounded-2xl backdrop-blur-2xl bg-black/30 border border-white/20 text-center max-w-md w-full shadow-2xl">
          <div className="w-12 h-12 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-base font-medium">Загрузка информации о решении...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 flex items-center justify-center">
        <div className="p-8 rounded-2xl backdrop-blur-2xl bg-black/30 border border-white/20 text-center max-w-lg w-full shadow-2xl">
          <div className="w-16 h-16 rounded-full border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-amber-300" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent mb-2">
            Решение не найдено
          </h2>
          <p className="text-white/80 text-base mb-6">
            Запрошенный товар или ИИ-ассистент отсутствует в каталоге.
          </p>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-amber-400/40 text-white hover:border-amber-300 transition-colors text-base font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Вернуться в маркетплейс
          </Link>
        </div>
      </div>
    );
  }

  const cleanSelectedTariffLabel = cleanTariffName(selectedVariant?.name);

  // Audit modal payload
  const auditModalInitialData: AuditSubmissionData = {
    source: 'marketplace_product_detail',
    tariffName: product.name,
    tariffPackage: cleanSelectedTariffLabel,
    tariffDescription: product.shortDescription,
    tariffFeatures: tariffSpec.features,
    price: activeSelectedPrice,
    paymentType: paymentModel,
    imageUrl: product.imageUrl,
    businessInfo: {
      sphere: product.category,
      category: product.category,
      companyName: '',
      description: product.shortDescription,
      imageUrl: product.imageUrl
    },
    customNotes: `Продукт: ${product.name}\nТариф: ${cleanSelectedTariffLabel}\nФормат оплаты: ${paymentModel === 'monthly' ? 'Ежемесячная абонплата' : 'Единоразово за разработку под ключ'}\nВыбранные токены: ${chosenTokenObj.tokens} (${chosenTokenObj.messages}, ${chosenTokenObj.dialogs})\nИтоговая стоимость: ${activeSelectedPrice.toLocaleString('ru-RU')} ₽`
  };

  const handleSelectExpertForAudit = () => {
    const payloadToSave = {
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productImage: product.imageUrl,
      selectedTariff: cleanSelectedTariffLabel,
      tariffSpec,
      paymentModel,
      price: activeSelectedPrice,
      tokens: chosenTokenObj.tokens,
      messages: chosenTokenObj.messages,
      dialogs: chosenTokenObj.dialogs,
      shortDescription: product.shortDescription,
      source: 'marketplace_product_detail',
      customNotes: `Продукт: ${product.name}\nТариф: ${cleanSelectedTariffLabel}\nФормат оплаты: ${paymentModel === 'monthly' ? 'Ежемесячная абонплата' : 'Единоразово за разработку под ключ'}\nВыбранные токены: ${chosenTokenObj.tokens} (${chosenTokenObj.messages}, ${chosenTokenObj.dialogs})\nИтоговая стоимость: ${activeSelectedPrice.toLocaleString('ru-RU')} ₽`
    };

    try {
      localStorage.setItem('sav_marketplace_selected_product', JSON.stringify(payloadToSave));
      sessionStorage.setItem('sav_marketplace_selected_product', JSON.stringify(payloadToSave));
      localStorage.setItem('sav_audit_submission', JSON.stringify(auditModalInitialData));
      sessionStorage.setItem('sav_audit_submission', JSON.stringify(auditModalInitialData));
    } catch (e) {
      console.warn('Storage saving notice:', e);
    }

    navigate('/experts', {
      state: {
        fromMarketplace: true,
        product: payloadToSave,
        selectedPlan: cleanSelectedTariffLabel,
        auditData: auditModalInitialData
      }
    });
  };

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Breadcrumbs & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav className="flex items-center gap-2 text-sm text-white/70 flex-wrap">
          <Link to="/" className="hover:text-amber-300 transition-colors">Главная</Link>
          <ChevronRight className="w-4 h-4 text-white/40" />
          <Link to="/marketplace" className="hover:text-amber-300 transition-colors">Маркетплейс</Link>
          <ChevronRight className="w-4 h-4 text-white/40" />
          <span className="text-amber-300 truncate max-w-xs">{product.category}</span>
          <ChevronRight className="w-4 h-4 text-white/40" />
          <span className="text-white truncate max-w-sm">{product.name}</span>
        </nav>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Download Proposal PDF Button */}
          <button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-black/30 border border-amber-400/50 hover:border-amber-300 text-white transition-all text-sm font-semibold shadow-lg shadow-amber-500/10 disabled:opacity-60 cursor-pointer"
            title="Скачать коммерческое предложение со всеми тарифами в PDF"
          >
            {isDownloadingPdf ? (
              <>
                <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                <span>{pdfProgressText || 'Формирование PDF...'}</span>
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 text-amber-300" />
                <span>Скачать КП</span>
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/marketplace')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl bg-black/30 border border-white/20 text-white hover:border-amber-400/40 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-amber-300" />
            Все решения
          </button>
        </div>
      </div>

      {/* Main Top Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Visual, Badges, Tariff Information & Video Links (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 p-4 shadow-2xl overflow-hidden group">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden relative border border-white/10 bg-black/40">
              <img
                src={product.imageUrl || 'https://static.tildacdn.com/stor3230-3239-4336-a663-646662353539/91136143.png'}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl backdrop-blur-xl bg-black/70 border border-amber-400/40 text-amber-300 text-xs font-semibold">
                {product.category}
              </div>
            </div>
          </div>

          {/* Unified Tariff Differences & Consultation Block under photo */}
          <div className="rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 p-6 shadow-2xl space-y-5">
            <div className="space-y-2 border-b border-white/10 pb-4">
              <h3 className="text-base font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                Тарифы отличаются функционалом
              </h3>
              <p className="text-sm text-white/80 leading-relaxed">
                Подробнее в блоке выбора тарифов. Вы можете подобрать любой удобный тариф на выбор:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Лайт', 'Эконом', 'Стандарт', 'Премиум', 'VIP'].map((tName) => (
                  <span
                    key={tName}
                    className="px-2.5 py-1 rounded-lg border border-amber-400/30 backdrop-blur-md bg-black/40 text-amber-300 text-xs font-semibold"
                  >
                    {tName}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-white/90 leading-relaxed">
                Либо закажите{' '}
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(true)}
                  className="font-bold text-amber-300 hover:text-amber-200 underline underline-offset-2 inline cursor-pointer"
                >
                  бесплатный аудит
                </button>{' '}
                вашей текущей системы на возможность внедрения нейросетей в ваш бизнес от экспертов компании SAV AI.
              </p>

              {/* Consultation Link Button */}
              <a
                href="https://t.me/SAV_AIbot"
                target="_blank"
                rel="nofollow noreferrer noopener"
                className="w-full py-3.5 px-4 rounded-2xl border border-amber-400 backdrop-blur-xl bg-gradient-to-r from-amber-500/25 via-amber-400/15 to-transparent hover:from-amber-500/40 text-white hover:border-amber-300 transition-all text-base font-bold shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 group"
              >
                <MessageSquare className="w-5 h-5 text-amber-300 group-hover:scale-110 transition-transform" />
                <span>Консультация по ссылке</span>
                <ExternalLink className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
              </a>
            </div>

            {/* Video Playlist Links */}
            <div className="space-y-2.5 pt-3 border-t border-white/10">
              <div className="text-xs font-semibold text-white/70">
                Видеодемонстрация работы:
              </div>

              <div className="grid grid-cols-1 gap-2">
                <a
                  href="https://vkvideo.ru/playlist/-194001985_4"
                  target="_blank"
                  rel="noreferrer noopener"
                  className="p-3 rounded-xl border border-white/15 backdrop-blur-md bg-black/20 hover:border-amber-400/50 hover:bg-black/40 text-white text-sm transition-all flex items-center justify-between group"
                >
                  <span className="text-white/90 group-hover:text-white">
                    Примеры ботов в <strong className="text-amber-300 font-semibold">плейлисте VK</strong>
                  </span>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-amber-300 transition-colors" />
                </a>

                <a
                  href="https://www.youtube.com/playlist?list=PLjfcxJfbkmonqS5ByILRRtOMm4xFBENe9"
                  target="_blank"
                  rel="nofollow noreferrer noopener"
                  className="p-3 rounded-xl border border-white/15 backdrop-blur-md bg-black/20 hover:border-amber-400/50 hover:bg-black/40 text-white text-sm transition-all flex items-center justify-between group"
                >
                  <span className="text-white/90 group-hover:text-white">
                    Примеры ботов в <strong className="text-amber-300 font-semibold">плейлисте YouTube</strong>
                  </span>
                  <ExternalLink className="w-4 h-4 text-white/40 group-hover:text-amber-300 transition-colors" />
                </a>
              </div>
            </div>
          </div>

          {/* Key Advantages */}
          {product.features && product.features.length > 0 && (
            <div className="rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 p-6 shadow-2xl space-y-3">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                Ключевые преимущества решения
              </h3>
              <div className="space-y-2.5">
                {product.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-sm text-white/90">
                    <CheckCircle2 className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Title, Tariffs Switcher, Payment Mode, Specs Box (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Meta Tags / Category / Setup Time */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {product.brand && (
                  <span className="px-3 py-1 rounded-lg border border-amber-400/30 text-amber-300 text-xs font-semibold backdrop-blur-md bg-black/30">
                    {product.brand}
                  </span>
                )}
                {product.sku && (
                  <span className="text-white/60 text-xs font-mono">
                    Артикул: {product.sku}
                  </span>
                )}
                {product.setupTime && (
                  <span className="text-white/60 text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    Запуск: {product.setupTime}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent leading-tight">
                {product.name}
              </h1>

              <p className="text-white/80 text-base leading-relaxed">
                {product.shortDescription}
              </p>
            </div>

            {/* Tariff Selector Buttons (Лайт, Эконом, Стандарт, Премиум, VIP) */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-white">
                  Выберите тариф решения:
                </label>
                <span className="text-xs text-amber-300 font-mono">
                  {product.variants?.length || 5} тарифов
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(product.variants && product.variants.length > 0 ? product.variants : [
                  { id: '1', name: 'Лайт', price: 3600, oldPrice: 18000, subtitle: '10 млн токенов' },
                  { id: '2', name: 'Эконом', price: 7200, oldPrice: 36000, subtitle: '20 млн токенов' },
                  { id: '3', name: 'Стандарт', price: 14400, oldPrice: 72000, subtitle: '50 млн токенов' },
                  { id: '4', name: 'Премиум', price: 28800, oldPrice: 144000, subtitle: '200 млн токенов' },
                  { id: '5', name: 'VIP', price: 57600, oldPrice: 288000, subtitle: '400 млн токенов' }
                ]).map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id || (!selectedVariant && variant.name.toLowerCase().includes('лайт'));
                  const variantDisplayName = cleanTariffName(variant.name);
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      onClick={() => setSelectedVariant(variant as ProductVariant)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-400 bg-black/60 shadow-lg shadow-amber-400/10'
                          : 'border-white/15 bg-black/20 hover:border-white/30 text-white/70'
                      }`}
                    >
                      <div className={`font-bold text-sm ${isSelected ? 'text-white' : 'text-white/80'}`}>
                        {variantDisplayName}
                      </div>
                      <div className="text-xs text-amber-300 font-bold font-mono mt-1">
                        {variant.price.toLocaleString('ru-RU')} ₽
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explicit Payment Choice: Monthly vs One-time */}
            <div className="space-y-2.5 pt-1">
              <label className="text-sm font-semibold text-white">
                Формат оплаты на ваш выбор:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModel('monthly')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    paymentModel === 'monthly'
                      ? 'border-amber-400 bg-black/60 shadow-lg shadow-amber-400/10'
                      : 'border-white/15 bg-black/20 hover:border-white/30 text-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-white text-sm">Ежемесячная оплата</div>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      {currentMonthlyPrice.toLocaleString('ru-RU')} ₽ / мес
                    </span>
                  </div>
                  <div className="text-xs text-white/60 mt-1.5 leading-relaxed">
                    Подписка: поддержка, сервера, обновления и ежемесячный лимит токенов.
                  </div>
                  {paymentModel === 'monthly' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentModel('onetime')}
                  className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${
                    paymentModel === 'onetime'
                      ? 'border-amber-400 bg-black/60 shadow-lg shadow-amber-400/10'
                      : 'border-white/15 bg-black/20 hover:border-white/30 text-white/70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-bold text-white text-sm">Единоразово за разработку</div>
                    <span className="text-xs font-mono text-amber-300 font-bold">
                      {currentDevPrice.toLocaleString('ru-RU')} ₽ разово
                    </span>
                  </div>
                  <div className="text-xs text-white/60 mt-1.5 leading-relaxed">
                    Разработка под ключ: полная сборка логики под ваши задачи, интеграции и запуск.
                  </div>
                  {paymentModel === 'onetime' && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-white/50 italic">
                Вы можете выбрать удобный формат: оплачивать сервис помесячно по подписке или заказать разработку под ключ разовым платежом.
              </p>
            </div>

            {/* Dynamic Selected Tariff Details Box */}
            <div className="p-5 sm:p-6 rounded-2xl backdrop-blur-xl bg-black/40 border border-amber-400/40 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 pb-3 border-b border-white/10">
                <div>
                  <div className="text-xs text-white/60 font-semibold">
                    Выбранная комплектация
                  </div>
                  <div className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
                    <span>Тариф «{cleanSelectedTariffLabel}»</span>
                    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300 font-normal">
                      {tariffSpec.tokenCount}
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
                      {activeSelectedPrice.toLocaleString('ru-RU')} ₽
                    </span>
                    <span className="text-xs text-amber-300">
                      {paymentModel === 'monthly' ? '/ месяц' : 'разово'}
                    </span>
                  </div>
                  <div className="text-xs text-white/70 font-mono">
                    {paymentModel === 'monthly' ? (
                      <>Разработка под ключ: <span className="text-white font-semibold">{currentDevPrice.toLocaleString('ru-RU')} ₽</span> разово</>
                    ) : (
                      <>Ежемесячная абонплата: <span className="text-white font-semibold">{currentMonthlyPrice.toLocaleString('ru-RU')} ₽</span> / мес</>
                    )}
                  </div>
                </div>
              </div>

              {/* Capabilities checklist for this tariff */}
              <div className="space-y-2 pt-1">
                <div className="text-xs font-semibold text-white/80 mb-1">
                  Что входит в комплектацию тарифа:
                </div>
                {tariffSpec.features.map((feat, fIdx) => (
                  <div key={fIdx} className="flex items-start gap-2 text-sm text-white/90">
                    <Check className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Connect / Choose Expert / Download Proposal Buttons */}
              <div className="pt-2 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Connect Tariff Button */}
                  <button
                    onClick={() => setIsAuditModalOpen(true)}
                    className="py-3.5 px-4 rounded-2xl border border-amber-400/80 backdrop-blur-xl bg-gradient-to-r from-amber-500/30 via-amber-400/20 to-transparent hover:from-amber-500/40 text-white hover:border-amber-300 transition-all text-sm font-bold shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer text-center"
                  >
                    <Zap className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>Подключить тариф «{cleanSelectedTariffLabel}»</span>
                  </button>

                  {/* Choose Expert for Free Audit Button (2 lines) */}
                  <button
                    onClick={handleSelectExpertForAudit}
                    className="py-2.5 px-4 rounded-2xl border border-white/25 backdrop-blur-xl bg-gradient-to-r from-white/10 via-white/5 to-transparent hover:border-amber-400/70 hover:bg-amber-400/10 text-white transition-all text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer text-center shadow-lg leading-snug"
                  >
                    <UserCheck className="w-5 h-5 text-amber-300 shrink-0" />
                    <span className="flex flex-col text-left sm:text-center text-sm font-medium">
                      <span>Подобрать эксперта</span>
                      <span className="text-amber-300 text-xs sm:text-sm">для бесплатного аудита</span>
                    </span>
                  </button>
                </div>

                {/* Secondary Download PDF Button */}
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloadingPdf}
                  className="w-full py-2.5 px-4 rounded-2xl border border-white/15 backdrop-blur-xl bg-black/30 hover:border-amber-400/50 hover:bg-black/50 text-white/90 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  title="Скачать все тарифы и характеристики в PDF"
                >
                  {isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 text-amber-300 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Скачать коммерческое предложение в PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Tabs (Описание и функционал | Калькулятор токенов и стоимости) */}
      <div className="rounded-3xl backdrop-blur-2xl bg-black/30 border border-white/20 p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Navigation Bar */}
        <div className="flex border-b border-white/15 pb-3 gap-3 overflow-x-auto">
          <button
            onClick={() => setActiveBottomTab('description')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeBottomTab === 'description'
                ? 'border border-amber-400 bg-black/50 text-white shadow-md'
                : 'border border-white/15 bg-black/20 text-white/70 hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 text-amber-300" />
            Описание и функционал
          </button>

          <button
            onClick={() => setActiveBottomTab('calculator')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              activeBottomTab === 'calculator'
                ? 'border border-amber-400 bg-black/50 text-white shadow-md'
                : 'border border-white/15 bg-black/20 text-white/70 hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 text-amber-300" />
            Калькулятор токенов и стоимости
            {chosenTokenObj.price > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/20 text-amber-300 border border-amber-400/40">
                +{chosenTokenObj.tokens}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Description & Functional Overview */}
        {activeBottomTab === 'description' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-white/90 text-sm md:text-base leading-relaxed space-y-4">
              <div
                dangerouslySetInnerHTML={{
                  __html: cleanDescriptionHtml || product.fullDescription || product.shortDescription
                }}
                className="prose prose-invert max-w-none text-white/90 text-sm md:text-base space-y-3 [&_strong]:text-amber-300 [&_a]:text-amber-300 [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Interactive Token Calculator & Pricing Details */}
        {activeBottomTab === 'calculator' && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h4 className="text-base font-bold bg-gradient-to-r from-amber-200 via-amber-300 to-amber-400 bg-clip-text text-transparent">
                Возможность добавлять токены к покупке
              </h4>
              <p className="text-sm text-white/70 mt-1">
                Выберите необходимый пакет дополнительных токенов. Токены к концу месяца не сгорают и переносятся на следующий месяц при оплате тарифа.
              </p>
            </div>

            {/* Token Tiers Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {TOKEN_TIERS.map((tier) => {
                const isSel = selectedTokenTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setSelectedTokenTier(tier.id)}
                    className={`p-4 rounded-2xl border text-left flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                      isSel
                        ? 'border-amber-400 bg-black/60 shadow-lg shadow-amber-400/10'
                        : 'border-white/15 bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white text-sm">{tier.tokens}</div>
                        <div className="text-xs text-white/70 mt-0.5">{tier.messages}</div>
                        <div className="text-xs text-white/50">{tier.dialogs}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isSel ? 'border-amber-400 bg-amber-400 text-black font-bold' : 'border-white/30 bg-black/30'
                      }`}>
                        {isSel && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-2 flex items-baseline justify-between">
                      <span className="text-xs text-white/60 font-medium">
                        {tier.price === 0 ? 'Базовый объем' : 'Стоимость пакета:'}
                      </span>
                      <span className="text-sm font-bold text-amber-300 font-mono">
                        {tier.price === 0 ? '0 ₽' : `+${tier.price.toLocaleString('ru-RU')} ₽`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Payment Model Selector inside Calculator */}
            <div className="p-5 rounded-2xl backdrop-blur-xl bg-black/40 border border-white/15 space-y-3">
              <div className="text-xs font-semibold text-white/80">
                Формат оплаты:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentModel('monthly')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentModel === 'monthly'
                      ? 'border-amber-400 bg-black/60 text-white shadow-md'
                      : 'border-white/15 bg-black/20 text-white/70 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-sm">Ежемесячная оплата</div>
                  <div className="text-xs text-amber-300 font-mono mt-0.5">
                    {totalMonthlyCalculated.toLocaleString('ru-RU')} ₽ / мес
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentModel('onetime')}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    paymentModel === 'onetime'
                      ? 'border-amber-400 bg-black/60 text-white shadow-md'
                      : 'border-white/15 bg-black/20 text-white/70 hover:border-white/30'
                  }`}
                >
                  <div className="font-semibold text-sm">Единоразово за разработку</div>
                  <div className="text-xs text-amber-300 font-mono mt-0.5">
                    {totalDevCalculated.toLocaleString('ru-RU')} ₽ разово
                  </div>
                </button>
              </div>
            </div>

            {/* Total Calculator Summary Bar */}
            <div className="p-5 rounded-2xl backdrop-blur-xl bg-black/50 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <div className="text-xs text-white/60">
                  Итого с учетом тарифа «{cleanSelectedTariffLabel}» и токенов ({chosenTokenObj.tokens}):
                </div>
                <div className="flex flex-wrap items-baseline gap-3 justify-center sm:justify-start">
                  <span className="text-2xl sm:text-3xl font-bold text-white font-mono">
                    {activeSelectedPrice.toLocaleString('ru-RU')} ₽
                  </span>
                  <span className="text-xs text-amber-300">
                    {paymentModel === 'monthly' ? '/ месяц' : 'разово'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="px-6 py-3.5 rounded-xl border border-amber-400 text-white hover:border-amber-300 transition-all text-sm font-bold shadow-lg shadow-amber-500/10 flex items-center gap-2 backdrop-blur-md bg-gradient-to-r from-amber-500/25 to-transparent whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                Оставить заявку на бесплатный аудит
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global Footer */}
      <GlobalFooter />

      {/* Business Audit Modal */}
      <BusinessAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        initialData={auditModalInitialData}
      />
    </div>
  );
};

export default ProductDetailPage;

