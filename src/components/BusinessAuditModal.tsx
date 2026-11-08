import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Send,
  User,
  Phone,
  MessageSquare,
  Sparkles,
  CheckCircle,
  Building,
  ArrowRight,
  X,
  ExternalLink,
  Bot,
  Zap,
  Info
} from 'lucide-react';
import Rivets from '@/components/Rivets';
import GlassBubbleButton from '@/components/GlassBubbleButton';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { usePromoCode } from '@/hooks/usePromoCode';
import { splitNumberedList } from '@/utils/textUtils';

export type ContactMethod = 'telegram' | 'phone' | 'max' | 'setka' | 'whatsapp' | 'vk' | 'instagram';

export interface AuditSubmissionData {
  source?: string;
  tariffName?: string;
  tariffPackage?: string;
  tariffDescription?: string;
  tariffFeatures?: string[];
  price?: number;
  paymentType?: 'monthly' | 'onetime';
  discountPercent?: number;
  imageUrl?: string;
  expertId?: string;
  expertName?: string;
  expertTelegram?: string;
  businessInfo?: {
    sphere?: string;
    segment?: string;
    category?: string;
    companyName?: string;
    description?: string;
    userInput?: string;
    imageUrl?: string;
  };
  calculatorState?: any;
  customNotes?: string;
}

interface BusinessAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: AuditSubmissionData;
  onSuccess?: (leadId?: string) => void;
  onAuditSubmitted?: (data: AuditSubmissionData) => void;
}

const CONTACT_OPTIONS: { id: ContactMethod; label: string; icon: string; placeholder: string }[] = [
  { id: 'telegram', label: 'Телеграм', icon: '✈️', placeholder: '@username или ссылка' },
  { id: 'phone', label: 'Телефон', icon: '📞', placeholder: '+7 (999) 000-00-00' },
  { id: 'max', label: 'MAX', icon: '⚡', placeholder: 'ID или контакт в MAX' },
  { id: 'setka', label: 'Сетка', icon: '🌐', placeholder: 'Профиль в Сетке' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '💬', placeholder: '+7 (999) 000-00-00' },
  { id: 'vk', label: 'ВКонтакте', icon: '🔷', placeholder: 'vk.com/username или id' },
  { id: 'instagram', label: 'Instagram', icon: '📷', placeholder: '@username в Instagram' },
];

const resolveStoredCompanyOrProject = (data?: AuditSubmissionData): string => {
  if (data?.businessInfo?.companyName && data.businessInfo.companyName.trim()) {
    return data.businessInfo.companyName.trim();
  }
  const storedCompany = sessionStorage.getItem('sav-company-name') || 
    sessionStorage.getItem('sav-project-name') || 
    localStorage.getItem('sav_company_name') || 
    localStorage.getItem('sav_project_name');
  if (storedCompany && storedCompany.trim()) {
    return storedCompany.trim();
  }

  try {
    const storedBiz = sessionStorage.getItem('sav-business-info');
    if (storedBiz) {
      const parsed = JSON.parse(storedBiz);
      const name = parsed.companyName || parsed.company_name || parsed.company || parsed.projectName || parsed.project_name;
      if (name && typeof name === 'string' && name.trim()) return name.trim();
    }
  } catch {}

  try {
    const storedCalc = sessionStorage.getItem('sav-calculator-data');
    if (storedCalc) {
      const parsed = JSON.parse(storedCalc);
      const name = parsed.company || parsed.companyName || parsed.project || parsed.product;
      if (name && typeof name === 'string' && name.trim()) return name.trim();
    }
  } catch {}

  return '';
};

const resolvePrefilledNote = (data?: AuditSubmissionData): string => {
  if (data?.customNotes && data.customNotes.trim()) {
    return data.customNotes.trim();
  }

  const parts: string[] = [];

  // Tariff card information if opened from a specific tariff
  if (data?.tariffPackage || data?.tariffName) {
    const tName = data.tariffName || `Тариф ${data.tariffPackage}`;
    parts.push(`Выбранный тариф: ${tName}`);
  }

  if (data?.tariffDescription && data.tariffDescription.trim()) {
    parts.push(`Задачи и состав тарифа: ${data.tariffDescription.trim()}`);
  }

  if (data?.tariffFeatures && Array.isArray(data.tariffFeatures) && data.tariffFeatures.length > 0) {
    const cleanFeatures = data.tariffFeatures
      .map(f => typeof f === 'string' ? f.trim() : '')
      .filter(Boolean)
      .slice(0, 5);
    if (cleanFeatures.length > 0) {
      parts.push(`Функционал и опции:\n• ` + cleanFeatures.join('\n• '));
    }
  }

  // Business description and automation requirements
  const bizDesc = data?.businessInfo?.description || sessionStorage.getItem('sav-business-description');
  if (bizDesc && bizDesc.trim()) {
    parts.push(`Задачи автоматизации и специфика бизнеса:\n${bizDesc.trim()}`);
  } else {
    try {
      const storedCalc = sessionStorage.getItem('sav-calculator-data');
      if (storedCalc) {
        const parsed = JSON.parse(storedCalc);
        if (parsed.product) {
          parts.push(`Продукт / Услуга: ${parsed.product}`);
        }
      }
    } catch {}
  }

  return parts.join('\n\n');
};

export const BusinessAuditModal: React.FC<BusinessAuditModalProps> = ({
  isOpen,
  onClose,
  initialData = {},
  onSuccess,
  onAuditSubmitted
}) => {
  const { user: tgUser, referralPromo } = useTelegramAuth();
  const { promoCode } = usePromoCode();

  const [fullName, setFullName] = useState<string>(() => {
    if (tgUser?.first_name || tgUser?.last_name) {
      return `${tgUser.first_name || ''} ${tgUser.last_name || ''}`.trim();
    }
    return '';
  });

  const [companyName, setCompanyName] = useState<string>(() => resolveStoredCompanyOrProject(initialData));

  const [selectedMethod, setSelectedMethod] = useState<ContactMethod>('telegram');
  const [contactValue, setContactValue] = useState<string>(() => {
    if (tgUser?.username) return `@${tgUser.username}`;
    return '';
  });

  const [additionalNote, setAdditionalNote] = useState<string>(() => resolvePrefilledNote(initialData));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [assignedLeadId, setAssignedLeadId] = useState<string>('');

  // Whenever modal is opened, sync prefilled fields if empty or when receiving updated initialData
  React.useEffect(() => {
    if (isOpen) {
      const resolvedCompany = resolveStoredCompanyOrProject(initialData);
      if (resolvedCompany) {
        setCompanyName(resolvedCompany);
      }
      const resolvedNote = resolvePrefilledNote(initialData);
      if (resolvedNote) {
        setAdditionalNote(resolvedNote);
      }
      if (tgUser?.username && !contactValue) {
        setContactValue(`@${tgUser.username}`);
      }
    }
  }, [isOpen, initialData]);

  const handleCompanyChange = (value: string) => {
    setCompanyName(value);
    sessionStorage.setItem('sav-company-name', value);
    localStorage.setItem('sav_company_name', value);
  };

  const currentOption = CONTACT_OPTIONS.find(o => o.id === selectedMethod) || CONTACT_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue.trim()) {
      setErrorMsg('Пожалуйста, укажите контактные данные для связи');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      // Gather action history from sessionStorage
      let actionHistory: any[] = [];
      try {
        const storedHistory = sessionStorage.getItem('sav_action_history');
        if (storedHistory) {
          actionHistory = JSON.parse(storedHistory);
        }
      } catch {}

      // Gather business info from storage if not in initialData
      let businessInfo = initialData.businessInfo;
      let effectiveImageUrl = initialData.imageUrl || businessInfo?.imageUrl;
      if (!businessInfo) {
        try {
          const storedBiz = sessionStorage.getItem('sav-business-info');
          const storedDesc = sessionStorage.getItem('sav-business-description');
          if (storedBiz) {
            const parsed = JSON.parse(storedBiz);
            if (!effectiveImageUrl && (parsed.imageUrl || parsed.image_url)) {
              effectiveImageUrl = parsed.imageUrl || parsed.image_url;
            }
            businessInfo = {
              sphere: parsed.sphere,
              segment: parsed.segment,
              category: parsed.category,
              companyName: companyName || parsed.companyName,
              description: storedDesc || parsed.description,
              userInput: parsed.userInput,
              imageUrl: effectiveImageUrl
            };
          }
        } catch {}
      }

      // Gather calculator state if available
      let calcState = initialData.calculatorState;
      if (!calcState) {
        try {
          const storedCalc = sessionStorage.getItem('sav_calculator_state');
          if (storedCalc) {
            calcState = JSON.parse(storedCalc);
          }
        } catch {}
      }

      const effectivePromo = promoCode || referralPromo || sessionStorage.getItem('sav-promo-code') || '';

      const payload = {
        fullName: fullName.trim() || 'Гость экосистемы',
        companyName: companyName.trim() || businessInfo?.companyName || '',
        contactMethod: selectedMethod,
        contactValue: contactValue.trim(),
        additionalNote: additionalNote.trim(),
        promoCode: effectivePromo,
        imageUrl: effectiveImageUrl || '',
        telegramUser: tgUser ? {
          id: tgUser.id,
          username: tgUser.username,
          first_name: tgUser.first_name,
          last_name: tgUser.last_name
        } : null,
        source: initialData.source || 'ai_seller_plans',
        tariff: {
          name: initialData.tariffName || '',
          package: initialData.tariffPackage || '',
          priceFinal: initialData.price || 0,
          paymentType: initialData.paymentType || 'monthly',
          discountPercent: initialData.discountPercent || 0
        },
        expert: {
          id: initialData.expertId || '',
          name: initialData.expertName || '',
          telegram: initialData.expertTelegram || ''
        },
        businessInfo: businessInfo || {},
        calculatorState: calcState || null,
        actionHistory: Array.isArray(actionHistory) ? actionHistory.slice(-25) : []
      };

      const response = await fetch('/api/v1/ai/audit/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (resData.success) {
        setSubmitted(true);
        setAssignedLeadId(resData.leadId || '');
        if (onAuditSubmitted) {
          onAuditSubmitted({
            ...initialData,
            customNotes: additionalNote.trim(),
            businessInfo: {
              ...businessInfo,
              companyName: companyName.trim()
            }
          });
        }
        if (onSuccess) {
          onSuccess(resData.leadId);
        }
      } else {
        setErrorMsg(resData.error || 'Произошла ошибка при отправке заявки. Попробуйте еще раз.');
      }
    } catch (err: any) {
      console.error('Audit submit error:', err);
      setErrorMsg('Не удалось отправить заявку. Проверьте интернет-соединение.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmitted(false);
    setErrorMsg('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-transparent select-none">
        {/* Invisible Click-Outside Backdrop: No global blur, no global darkening */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleResetAndClose}
          className="fixed inset-0 bg-transparent"
        />

        {/* Modal Dialog Card: Apple Liquid Glass with Darkening & Gold Accents */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-xl p-5 sm:p-7 md:p-8 rounded-3xl bg-black/85 backdrop-blur-3xl border border-amber-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white text-left max-h-[92vh] overflow-y-auto space-y-5"
        >
          <Rivets />

          {/* Close Button */}
          <button
            type="button"
            onClick={handleResetAndClose}
            className="absolute top-4 right-4 p-2 rounded-full border border-white/20 bg-black/60 hover:bg-black/90 hover:border-amber-300 text-amber-200/80 hover:text-white transition-all cursor-pointer z-20"
            title="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>

          {!submitted ? (
            <>
              {/* Header */}
              <div className="pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-black/60 text-amber-200 text-xs font-semibold mb-2 backdrop-blur-md">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Персональный разбор бизнес-процессов</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 bg-clip-text text-transparent leading-snug">
                  Бесплатный аудит бизнеса
                </h2>
                <p className="text-sm text-amber-100/80 mt-1 font-normal leading-relaxed">
                  Ведущий архитектор решений проведет детальный аудит вашей текущей воронки и подготовит индивидуальный план внедрения ИИ.
                </p>
              </div>

              {/* Context Callout: Selected tariff or expert & Business Profile & Image preview */}
              <div className="p-3.5 rounded-2xl border border-amber-400/30 bg-black/60 backdrop-blur-xl space-y-2.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    {initialData.tariffPackage && (
                      <div className="text-xs text-white/80 font-normal">
                        Выбранный тариф:{' '}
                        <span className="font-bold text-amber-300">
                          {initialData.tariffName || `Тариф ${initialData.tariffPackage}`}
                        </span>
                      </div>
                    )}
                    {initialData.expertName && (
                      <div className="text-xs text-white/80 font-normal">
                        Назначенный эксперт:{' '}
                        <span className="font-bold text-amber-300">
                          {initialData.expertName}
                        </span>
                      </div>
                    )}
                    {initialData.businessInfo?.sphere && (
                      <div className="text-xs text-white/70 font-normal">
                        Сфера / Сегмент:{' '}
                        <span className="text-amber-200">
                          {initialData.businessInfo.sphere} ({initialData.businessInfo.segment || 'B2C'})
                        </span>
                      </div>
                    )}
                  </div>
                  {initialData.price ? (
                    <div className="text-sm font-bold text-amber-200 bg-amber-400/10 px-3 py-1.5 rounded-xl border border-amber-400/20">
                      {initialData.price.toLocaleString('ru-RU')} ₽
                      {initialData.paymentType === 'onetime' ? ' под ключ' : ' / мес'}
                      {initialData.discountPercent ? (
                        <span className="text-xs ml-1 text-amber-300 font-normal">(-{initialData.discountPercent}%)</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                {/* Generated Banner Image Preview if available */}
                {(initialData.imageUrl || initialData.businessInfo?.imageUrl) && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-3">
                    <div className="w-16 h-10 rounded-lg overflow-hidden border border-amber-400/40 bg-black/80 flex-shrink-0">
                      <img
                        src={initialData.imageUrl || initialData.businessInfo?.imageUrl}
                        alt="Business Concept"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-xs text-white/80 flex-grow">
                      <span className="text-amber-200 font-semibold block">Концепт-баннер бизнеса</span>
                      <a
                        href={initialData.imageUrl || initialData.businessInfo?.imageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-300 hover:text-yellow-200 underline text-[11px] inline-flex items-center gap-1 mt-0.5"
                      >
                        Открыть баннер в полном разрешении
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Direct Telegram Admin Contact Badge */}
              <div className="p-3 rounded-2xl border border-white/15 bg-black/50 backdrop-blur-md flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-white/80">Прямой контакт руководителя:</span>
                  <a
                    href="https://t.me/shishkarnem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-amber-300 hover:text-yellow-200 underline decoration-amber-400/50 hover:decoration-amber-300 flex items-center gap-1"
                  >
                    @shishkarnem
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <span className="text-amber-100/60 hidden sm:inline">Архитектор SAV AI</span>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name & Company Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-amber-200 mb-1">
                      Ваше имя
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300/70" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Как к вам обращаться"
                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-white/20 bg-black/60 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-200 mb-1">
                      Название компании / проект
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300/70" />
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => handleCompanyChange(e.target.value)}
                        placeholder="Например: Салон красоты Аура"
                        className="w-full h-11 pl-10 pr-3 rounded-xl border border-white/20 bg-black/60 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Method Selector */}
                <div>
                  <label className="block text-sm font-semibold text-amber-200 mb-1.5">
                    Удобный способ связи
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CONTACT_OPTIONS.map((opt) => {
                      const isSelected = selectedMethod === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedMethod(opt.id)}
                          className={`p-2 rounded-xl border text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'border-amber-400 bg-amber-400/20 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.25)]'
                              : 'border-white/15 bg-black/50 text-white/80 hover:border-white/30 hover:bg-black/70'
                          }`}
                        >
                          <span>{opt.icon}</span>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Contact Value Input */}
                <div>
                  <label className="block text-sm font-semibold text-amber-200 mb-1">
                    {currentOption.label} для связи <span className="text-amber-400">*</span>
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-300/70" />
                    <input
                      type="text"
                      required
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      placeholder={currentOption.placeholder}
                      className="w-full h-11 pl-10 pr-3 rounded-xl border border-amber-400/40 bg-black/60 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-300 focus:ring-1 focus:ring-amber-300 transition-all"
                    />
                  </div>
                </div>

                {/* Additional Note */}
                <div>
                  <label className="block text-sm font-semibold text-amber-200 mb-1">
                    Комментарий или задачи автоматизации
                  </label>
                  <textarea
                    rows={4}
                    value={additionalNote}
                    onChange={(e) => setAdditionalNote(e.target.value)}
                    placeholder="Опишите ваши ключевые пожелания или текущие сложности в отделе продаж..."
                    className="w-full p-3 rounded-xl border border-white/20 bg-black/60 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-y leading-relaxed"
                  />
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-black/70 text-amber-200 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-300 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <GlassBubbleButton
                    variant="gold"
                    size="md"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex-1 flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    {isSubmitting ? (
                      <span>Отправка заявки...</span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Отправить заявку на аудит</span>
                      </>
                    )}
                  </GlassBubbleButton>

                  <GlassBubbleButton
                    variant="secondary"
                    size="md"
                    type="button"
                    onClick={handleResetAndClose}
                    className="sm:w-auto text-sm"
                  >
                    Отмена
                  </GlassBubbleButton>
                </div>
              </form>
            </>
          ) : (
            /* Success View */
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-300 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(251,191,36,0.3)]">
                <CheckCircle className="w-9 h-9 text-amber-300" />
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                  Заявка успешно принята!
                </h3>
                <p className="text-sm text-white/90 max-w-md mx-auto leading-relaxed">
                  Вся история вашего подбора и спецификация переданы ведущему эксперту в Telegram{' '}
                  <span className="font-semibold text-amber-300">(@shishkarnem)</span>.
                </p>
                {assignedLeadId && (
                  <div className="text-xs text-amber-200/70 font-mono">
                    Номер обращения: {assignedLeadId}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-amber-400/30 bg-black/60 text-xs text-amber-100/90 text-left space-y-2">
                <div className="font-semibold text-amber-300">Что произойдет дальше:</div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Эксперт изучит введенные вами данные и сценарии автоматизации.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 font-bold">•</span>
                  <span>Мы свяжемся с вами через <strong className="text-white">{currentOption.label}</strong> ({contactValue}) для согласования удобного формата консультации.</span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                <a
                  href="https://t.me/shishkarnem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl border border-amber-400/50 bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 hover:border-amber-300 text-sm font-semibold transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Написать в Telegram @shishkarnem</span>
                </a>

                <GlassBubbleButton
                  variant="secondary"
                  size="md"
                  onClick={handleResetAndClose}
                >
                  Вернуться к тарифам
                </GlassBubbleButton>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BusinessAuditModal;
