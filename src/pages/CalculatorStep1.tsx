import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  User, 
  Building2, 
  Package, 
  MapPin, 
  Users, 
  Banknote, 
  Tag, 
  Sparkles, 
  Loader2, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert,
  CheckCircle2,
  FileText,
  UploadCloud,
  FileCheck,
  Cpu,
  ExternalLink,
  Bot,
  Send,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
  Check,
  Calculator,
  UserCheck,
  Zap,
  Globe,
  Share2,
  Link2,
  X
} from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import GlobalFooter from '@/components/GlobalFooter';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';
import AudioField from '@/components/AudioField';
import MiniAudioField from '@/components/MiniAudioField';
import { CitySearchSelect } from '@/components/CitySearchSelect';
import { useCities, syncCities } from '@/hooks/useCities';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useToast } from '@/hooks/use-toast';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import { usePromoCode } from '@/hooks/usePromoCode';
import { ProTalkCountdownOverlay } from '@/components/ProTalkCountdownOverlay';
import { GoogleDocLinkModal } from '@/components/calculator/GoogleDocLinkModal';
import { protalkDb } from '@/integrations/protalk/client';
import { getUserUid } from '@/lib/uidHelper';
import ReactMarkdown from 'react-markdown';
import { Eye, Edit3 as EditIcon } from 'lucide-react';
import ExpertDetailModal from '@/components/ExpertDetailModal';
import { formatExpertFullTitle } from '@/utils/expertUtils';
import CalculatorTabs from '@/components/CalculatorTabs';

const FALLBACK_CITIES = [
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Омск', 'Ростов-на-Дону',
];

const SALARY_PRESETS = [45000, 65000, 85000, 110000, 150000];

const DEPARTMENTS = [
  { 
    value: 'Отдел продаж', 
    label: 'Отдел продаж', 
    icon: '🛒',
    coeff: 1.00,
    description: 'Обработка лидов, квалификация, автодожим и бесшовная интеграция с CRM 24/7' 
  },
  { 
    value: 'Отдел найма', 
    label: 'Отдел найма (HR)', 
    icon: '👥',
    coeff: 0.95,
    description: 'Первичный отклик кандидатов, скрининг резюме, автособеседования и тестирование' 
  },
  { 
    value: 'Сall-центр', 
    label: 'Call-центр', 
    icon: '📞',
    coeff: 0.80,
    description: 'Консультации клиентов, обработка входящих звонков/чатов и запись на встречи' 
  },
  { 
    value: 'Отдел разработки', 
    label: 'Отдел разработки', 
    icon: '💻',
    coeff: 1.45,
    description: 'Написание и аудит кода, развертывание баз данных PostgreSQL, интеграции API и микросервисов' 
  },
  { 
    value: 'Отдел маркетинга', 
    label: 'Отдел маркетинга', 
    icon: '📈',
    coeff: 1.10,
    description: 'Генерация офферов, автокреативы, сквозная аналитика и таргетированные рассылки' 
  },
  { 
    value: 'Копирайтинг', 
    label: 'Копирайтинг', 
    icon: '✍️',
    coeff: 0.85,
    description: 'Рерайт, подготовка экспертных статей, кросспостинг и ведение контент-плана' 
  },
  { 
    value: 'Делопроизводство', 
    label: 'Делопроизводство', 
    icon: '📄',
    coeff: 0.70,
    description: 'Формирование договоров, актов, счетов, распознавание и архивный учет' 
  },
  { 
    value: 'Юридический отдел', 
    label: 'Юридический отдел', 
    icon: '⚖️',
    coeff: 1.05,
    description: 'Экспресс-аудит контрактов, правовой анализ рисков и претензионная работа' 
  }
];

import { CONTACT_TYPES } from '@/constants/contactTypes';

/** Format full pseudonym with real name e.g. Фридман Ольга Игоревна (Ms.Violet) */
const formatExpertDisplayName = (exp: any): string => {
  return formatExpertFullTitle(exp);
};

const pageVariants = {
  initial: { opacity: 0, y: 15, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

export const CalculatorStep1: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: citiesData, isLoading: citiesLoading, refetch: refetchCities } = useCities();
  const { profile: telegramProfile, referralPromo } = useTelegramAuth();
  const [isSyncingCities, setIsSyncingCities] = useState(false);
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();
  const { isChecking: isPromoChecking, promoResult, checkPromo } = usePromoCode();

  // Previously selected expert state and details modal
  const [previouslySelectedExpert, setPreviouslySelectedExpert] = useState<any>(null);
  const [detailedExpertModal, setDetailedExpertModal] = useState<any>(null);

  // AI voice survey status (for whole project voice dictation)
  const [aiVoiceText, setAiVoiceText] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiParsedSummary, setAiParsedSummary] = useState<string | null>(null);
  const [tzViewMode, setTzViewMode] = useState<'edit' | 'markdown'>('edit');
  const [aiOverlayTitle, setAiOverlayTitle] = useState<string>('Интеллектуальный анализ документа и ТЗ');
  const [aiStageType, setAiStageType] = useState<string>('document_recognition');

  // Document Upload & AI Recognition states
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    url: string;
    size?: number;
    id?: number | string;
    base64?: string;
    mimeType?: string;
  } | null>(null);
  const [isRecognizingDoc, setIsRecognizingDoc] = useState(false);
  const [isRecognizingDocTz, setIsRecognizingDocTz] = useState(false);
  const [showCountdownOverlay, setShowCountdownOverlay] = useState(false);
  const [isGoogleDocModalOpen, setIsGoogleDocModalOpen] = useState(false);

  // Pre-fill initial text from session storage or business description
  const initialSharedTz = () =>
    (typeof window !== 'undefined'
      ? sessionStorage.getItem('sav-calculator-tz') ||
        sessionStorage.getItem('sav-calculator-dictation') ||
        sessionStorage.getItem('sav-business-description') ||
        ''
      : '');

  // Form state holding all Step 1 parameters
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    product: initialSharedTz(),
    city: '',
    contactType: 'Telegram',
    contactValue: '',
    comment: '',
    avgSalary: null as number | null,
    employeeCount: '2',
    averageSalary: '65000',
    department: 'Отдел продаж',
    maintenance: 'Да',
    functionality: initialSharedTz() || 'Автоматизация обработки входящих обращений, квалификация лидов и интеграция с CRM 24/7',
    uploadedDocUrl: '',
    uploadedDocName: '',
    promoCode: '',
  });

  useEffect(() => {
    trackAction('visit_page', { page: '/calculator/step1' });
  }, []);

  // Restore previous data from sessionStorage/localStorage and main page dictation
  useEffect(() => {
    const saved = sessionStorage.getItem('sav-calculator-data') || 
      localStorage.getItem('sav_calculator_data') || 
      localStorage.getItem('sav-calculator-data');
    const storedCompany = sessionStorage.getItem('sav-company-name') || 
      sessionStorage.getItem('sav-project-name') || 
      localStorage.getItem('sav_company_name') || 
      localStorage.getItem('sav_project_name');
    const passedTz = sessionStorage.getItem('sav-calculator-tz') || 
      sessionStorage.getItem('sav-calculator-dictation') ||
      sessionStorage.getItem('sav-business-description');

    if (passedTz) {
      setAiVoiceText(passedTz);
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const resolvedFunc = parsed.functionality || passedTz || 'Автоматизация обработки входящих обращений, квалификация лидов и интеграция с CRM 24/7';
        const resolvedProduct = parsed.product || resolvedFunc;
        setFormData(prev => ({
          ...prev,
          ...parsed,
          company: parsed.company || storedCompany || prev.company,
          product: resolvedProduct || prev.product,
          functionality: resolvedFunc,
          employeeCount: String(parsed.employeeCount || prev.employeeCount),
          averageSalary: String(parsed.averageSalary || parsed.salary || prev.averageSalary),
          department: parsed.department || prev.department,
          maintenance: parsed.maintenance || prev.maintenance,
          contactType: parsed.contactType || prev.contactType,
          contactValue: parsed.contactValue || prev.contactValue,
        }));
        if (parsed.uploadedDocUrl) {
          setUploadedFile({
            name: parsed.uploadedDocName || 'Прикрепленный документ ТЗ',
            url: parsed.uploadedDocUrl,
          });
        }
        if (parsed.promoCode) {
          checkPromo(parsed.promoCode);
        }
      } catch {}
    } else {
      if (storedCompany) {
        setFormData(prev => ({ ...prev, company: storedCompany }));
      }
      if (passedTz) {
        setFormData(prev => ({ 
          ...prev, 
          functionality: passedTz,
          product: prev.product || passedTz
        }));
      }
    }
  }, []);

  // Pre-fill from existing lead in DB
  useEffect(() => {
    if (leadLoaded && existingLead) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || existingLead.full_name || prev.fullName,
        company: prev.company || existingLead.project || prev.company,
        product: prev.product || existingLead.product || prev.product,
        city: prev.city || existingLead.city || prev.city,
        department: prev.department || existingLead.department || prev.department,
        employeeCount: (prev.employeeCount && prev.employeeCount !== '2') ? prev.employeeCount : (existingLead.employees_count || (existingLead as any).employee_count || prev.employeeCount),
        averageSalary: (prev.averageSalary && prev.averageSalary !== '65000') ? prev.averageSalary : (existingLead.avg_salary ? String(existingLead.avg_salary) : ((existingLead as any).salary ? String((existingLead as any).salary) : prev.averageSalary)),
        maintenance: prev.maintenance || existingLead.service || prev.maintenance,
        contactValue: prev.contactValue || existingLead.phone || prev.contactValue,
        contactType: prev.contactType || (existingLead.phone?.startsWith('@') ? 'Telegram' : prev.contactType),
        functionality: prev.functionality || existingLead.functionality || prev.functionality,
        promoCode: prev.promoCode || existingLead.promo || prev.promoCode,
        uploadedDocUrl: prev.uploadedDocUrl || (existingLead as any).uploaded_doc_url || prev.uploadedDocUrl,
        uploadedDocName: prev.uploadedDocName || (existingLead as any).uploaded_doc_name || prev.uploadedDocName,
      }));
      if (existingLead.promo && !formData.promoCode) {
        checkPromo(existingLead.promo);
      }
    }
  }, [leadLoaded, existingLead]);

  // Auto-fill promo from referral link / URL
  useEffect(() => {
    if (referralPromo && !formData.promoCode) {
      setFormData(prev => ({ ...prev, promoCode: referralPromo }));
      checkPromo(referralPromo);
    }
  }, [referralPromo]);

  // Auto-fill user full name and telegram contact from profile
  useEffect(() => {
    if (telegramProfile) {
      const tgName = [telegramProfile.first_name, telegramProfile.last_name]
        .filter(Boolean)
        .join(' ');
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || tgName,
        contactValue: prev.contactValue || (telegramProfile.username ? `@${telegramProfile.username}` : telegramProfile.phone_number || prev.contactValue),
        contactType: prev.contactType || (telegramProfile.username ? 'Telegram' : 'Телефон'),
      }));
    }
  }, [telegramProfile]);

  // Detect if an expert was already chosen previously
  useEffect(() => {
    const detectExpert = async () => {
      try {
        const savedRaw = sessionStorage.getItem('sav-calculator-data') || localStorage.getItem('sav_calculator_data');
        const savedExpertRaw = sessionStorage.getItem('sav-selected-expert') || localStorage.getItem('sav-selected-expert');

        let candidateId = '';
        let candidateName = '';
        let candidateExpertObj: any = null;

        if (savedExpertRaw) {
          try {
            const parsed = JSON.parse(savedExpertRaw);
            if (parsed && (parsed.id || parsed.pseudonym || parsed.name)) {
              candidateExpertObj = parsed;
              candidateId = String(parsed.id || '');
              candidateName = parsed.pseudonym || parsed.name || '';
            }
          } catch {}
        }

        if (!candidateId && savedRaw) {
          try {
            const parsed = JSON.parse(savedRaw);
            if (parsed) {
              candidateId = String(parsed.selectedExpertId || parsed.matchedExpertId || '');
              candidateName = parsed.selectedExpert || parsed.matchedExpertName || '';
            }
          } catch {}
        }

        if (!candidateId && existingLead?.selected_expert) {
          candidateName = existingLead.selected_expert;
        }

        if (candidateId || candidateName) {
          const { data: expertsList } = await (protalkDb as any)
            .from('sav_experts')
            .select('*');

          if (Array.isArray(expertsList) && expertsList.length > 0) {
            const found = expertsList.find(e => 
              (candidateId && String(e.id) === candidateId) ||
              (candidateName && (
                (e.pseudonym && candidateName.includes(e.pseudonym)) ||
                (e.name && candidateName.includes(e.name)) ||
                (`${e.greeting || ''}${e.pseudonym || ''}`.trim() === candidateName.trim())
              ))
            );
            if (found) {
              setPreviouslySelectedExpert(found);
              return;
            }
          }

          if (candidateExpertObj) {
            setPreviouslySelectedExpert(candidateExpertObj);
            return;
          }

          if (candidateName) {
            setPreviouslySelectedExpert({
              id: candidateId || 'matched',
              name: candidateName,
              pseudonym: candidateName,
              greeting: '',
              role: 'Эксперт-интегратор SAV AI',
              specialization: 'Интеллектуальная автоматизация',
              photo_url: '/file/15/MsViolet.png'
            });
          }
        }
      } catch (err) {
        console.warn('Error detecting previous expert:', err);
      }
    };

    detectExpert();
  }, [existingLead?.selected_expert]);

  const citiesWithSalary = citiesData && citiesData.length > 0
    ? citiesData
    : FALLBACK_CITIES.map((name, i) => ({ id: `fallback-${i}`, name, avg_salary: null }));

  // Helper to get coefficient of department
  const getDepartmentCoeff = (deptValue: string) => {
    const dept = DEPARTMENTS.find(d => d.value === deptValue);
    return dept?.coeff ?? 1.0;
  };

  // Dynamic salary calculation based on city from DB and department coefficient
  const calculateSalaryForCityAndDept = (cityName: string, deptValue: string, directAvgSalary?: number | null) => {
    let baseSalary = directAvgSalary;
    if (!baseSalary) {
      const foundCity = citiesWithSalary.find(c => c.name.toLowerCase() === (cityName || '').toLowerCase());
      baseSalary = (foundCity && typeof foundCity.avg_salary === 'number' && foundCity.avg_salary > 0)
        ? foundCity.avg_salary
        : 65000;
    }
    const coeff = getDepartmentCoeff(deptValue);
    const calculated = Math.round((baseSalary * coeff) / 500) * 500;
    return { baseSalary, calculated };
  };

  const handleCitySelect = (cityName: string, avgSalary: number | null) => {
    const { baseSalary, calculated } = calculateSalaryForCityAndDept(cityName, formData.department, avgSalary);
    setFormData(prev => ({
      ...prev,
      city: cityName,
      avgSalary: baseSalary,
      averageSalary: String(calculated),
    }));
    updateLead({ city: cityName, salary: calculated });
  };

  const handleDepartmentSelect = (deptValue: string) => {
    const { calculated } = calculateSalaryForCityAndDept(formData.city, deptValue, formData.avgSalary);
    setFormData(prev => ({
      ...prev,
      department: deptValue,
      averageSalary: String(calculated),
    }));
    updateLead({ department: deptValue, salary: calculated });
  };

  // Process voice survey dictation with AI (extracting questionnaire fields with Gemini 3.6 Flash)
  const handleProcessVoiceWithAI = async (spokenText: string) => {
    if (!spokenText.trim() && !uploadedFile) return;
    setAiOverlayTitle('Нейросетевое распознавание и автозаполнение анкеты');
    setAiStageType('document_recognition');
    setShowCountdownOverlay(true);
    setIsAiProcessing(true);
    setAiParsedSummary(null);

    try {
      const userUid = getUserUid(telegramProfile);
      const logChatId = userUid.endsWith('_tz') ? userUid : `${userUid}_tz`;
      const res = await fetch('/api/v1/ai/calculator/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: spokenText,
          fileUrl: uploadedFile?.url,
          fileBase64: uploadedFile?.base64,
          mimeType: uploadedFile?.mimeType,
          fileName: uploadedFile?.name,
          userUid,
          chat_id: logChatId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const incomingFunc = (d.functionality || spokenText || '').trim();
        const existingFunc = (formData.functionality || '').trim();
        const isDetailedExisting = (existingFunc.length > 100 || existingFunc.includes('\n'));

        // Never erase or downgrade detailed ТЗ that was previously generated or typed
        const finalFunc = isDetailedExisting && incomingFunc.length <= existingFunc.length
          ? existingFunc
          : (incomingFunc || existingFunc);

        const targetCity = (d.city && d.city.toLowerCase() !== 'не указан') ? d.city : (formData.city || 'Москва');
        const targetDept = d.department || formData.department;
        const { calculated: newSalary } = calculateSalaryForCityAndDept(targetCity, targetDept, formData.avgSalary);

        setFormData(prev => {
          const currentFunc = (prev.functionality || '').trim();
          const shouldKeepCurrent = (currentFunc.length > 100 || currentFunc.includes('\n')) && incomingFunc.length <= currentFunc.length;
          const assignedFunc = shouldKeepCurrent ? currentFunc : finalFunc;

          return {
            ...prev,
            fullName: (d.clientName && d.clientName !== 'Иван Иванов') ? d.clientName : (prev.fullName || d.clientName || 'Иван Иванов'),
            company: (d.companyName && d.companyName.toLowerCase() !== 'проект' && d.companyName.toLowerCase() !== 'название компании') ? d.companyName : (prev.company || ''),
            product: d.product || prev.product,
            city: targetCity,
            contactValue: d.phone || d.contact || prev.contactValue,
            contactType: d.contactType || prev.contactType,
            comment: d.comment || d.summary || prev.comment,
            department: d.department || prev.department,
            employeeCount: d.employeeCount ? String(Math.max(2, parseInt(d.employeeCount) || 2)) : prev.employeeCount,
            averageSalary: d.salaryPerEmployee || d.averageSalary ? String(d.salaryPerEmployee || d.averageSalary) : (newSalary ? String(newSalary) : prev.averageSalary),
            functionality: assignedFunc,
            maintenance: d.maintenance || (d.hasSla !== undefined ? (d.hasSla ? 'Да' : 'Нет') : prev.maintenance),
            promoCode: d.promoCode || prev.promoCode,
          };
        });

        setAiVoiceText(finalFunc);
        sessionStorage.setItem('sav-calculator-tz', finalFunc);
        sessionStorage.setItem('sav-calculator-dictation', finalFunc);
        if (d.companyName && d.companyName.toLowerCase() !== 'проект') {
          sessionStorage.setItem('sav-company-name', d.companyName);
        }

        if (d.promoCode) {
          checkPromo(d.promoCode);
        }

        if (d.summary) {
          setAiParsedSummary(d.summary);
        }

        updateLead({
          full_name: d.clientName || d.fullName || formData.fullName,
          project: d.companyName || d.company || formData.company,
          product: d.product || formData.product,
          city: d.city || formData.city,
          phone: d.phone || formData.contactValue,
          comment: d.comment || d.summary || formData.comment,
          department: d.department || formData.department,
          salary: newSalary,
          functionality: finalFunc,
          promo: d.promoCode || formData.promoCode,
        });

        toast({
          title: "Анкета успешно заполнена",
          description: "Параметры внедрения структурированы по полям калькулятора.",
        });
      }
    } catch (e: any) {
      console.warn('Voice AI Survey parse error:', e);
      toast({
        title: "Заполнение анкеты",
        description: "Данные обработаны нейросетью.",
      });
    } finally {
      setIsAiProcessing(false);
      setShowCountdownOverlay(false);
    }
  };

  // Generate & expand detailed Technical Assignment with AI in Markdown
  const handleGenerateDetailedTz = async () => {
    const contextPrompt = formData.functionality || formData.product || aiVoiceText || `Создание автономного ИИ-приложения для подразделения «${formData.department}» компании «${formData.company || 'Проект'}» (${formData.employeeCount} сотрудников)`;
    setAiOverlayTitle('Генерация технического задания');
    setAiStageType('tz_recognition');
    setShowCountdownOverlay(true);
    setIsAiProcessing(true);

    try {
      const resp = await fetch('/api/v1/ai/calculator/tz-gen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.company || 'Компания',
          department: formData.department || 'Отдел продаж',
          employeeCount: parseInt(formData.employeeCount) || 2,
          businessDescription: contextPrompt,
          functionality: contextPrompt,
          product: formData.product || formData.functionality,
          city: formData.city || 'Москва',
        }),
      });

      const json = await resp.json();
      if (json.success && (json.tzText || json.technicalAssignment)) {
        const fullTz = json.tzText || json.technicalAssignment;
        setFormData(prev => ({ 
          ...prev, 
          functionality: fullTz,
          product: prev.product && prev.product.trim().length > 0 ? prev.product : fullTz.slice(0, 150)
        }));
        setAiVoiceText(fullTz);
        sessionStorage.setItem('sav-calculator-tz', fullTz);
        sessionStorage.setItem('sav-calculator-dictation', fullTz);
        updateLead({ functionality: fullTz });
        setTzViewMode('markdown'); // Switch to formatted Markdown UI view
        toast({
          title: "ТЗ успешно составлено!",
          description: `Сформировано подробное ТЗ для подразделения «${formData.department}»`,
        });
      } else {
        await handleProcessVoiceWithAI(contextPrompt);
      }
    } catch (err: any) {
      console.warn('Generate TZ err:', err);
      toast({
        title: "ТЗ адаптировано",
        description: "Техническое задание структурировано для сметы.",
      });
    } finally {
      setIsAiProcessing(false);
      setShowCountdownOverlay(false);
    }
  };

  // Document Upload to Gallery handler with base64 preservation
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);

    // Read base64 locally so recognition never fails even if network upload is slow/offline
    let base64Data = '';
    try {
      base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = (reader.result as string) || '';
          const b64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(b64);
        };
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    } catch {}

    const bodyData = new FormData();
    bodyData.append('file', file);
    bodyData.append('custom_name', file.name);
    bodyData.append('folder_id', '5'); // Папка «Документы и ТЗ»

    try {
      const res = await fetch('/api/admin/files/upload', {
        method: 'POST',
        body: bodyData,
      });

      let finalUrl = '';
      let fileId: any = undefined;

      if (res.ok) {
        const json = await res.json();
        const fileObj = json.file || json;
        // Всегда отдаем приоритет оригинальной ссылке https://file.pro-talk.ru/tgf/...
        finalUrl = fileObj.original_url || fileObj.direct_url || fileObj.url || fileObj.short_url || fileObj.proxy_url || '';
        fileId = fileObj.id;
      }

      setUploadedFile({
        name: file.name,
        url: finalUrl,
        size: file.size,
        id: fileId,
        base64: base64Data,
        mimeType: file.type || 'application/pdf',
      });

      if (finalUrl) {
        setFormData(prev => ({
          ...prev,
          uploadedDocUrl: finalUrl,
          uploadedDocName: file.name,
        }));
        updateLead({
          uploaded_doc_url: finalUrl,
          uploaded_doc_name: file.name,
        });

        // Запуск прямой функции распознавания текста сразу же после загрузки документа, получив ссылку с оверлеем
        handleDirectDocRecognition({
          url: finalUrl,
          fileName: file.name,
        });
      }

      toast({
        title: "Файл успешно прикреплен",
        description: `Запущено автоматическое распознавание: ${file.name}`,
      });
    } catch (err: any) {
      console.warn('File upload note:', err);
      setUploadedFile({
        name: file.name,
        url: '',
        size: file.size,
        base64: base64Data,
        mimeType: file.type || 'application/pdf',
      });
      toast({
        title: "Файл прикреплен",
        description: `Документ ${file.name} готов для анализа нейросетью`,
      });
    } finally {
      setIsUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Direct file and Google Docs text recognition function (function_id: 369 via ProTalk API)
  const handleDirectDocRecognition = async (params: {
    url: string;
    fileName?: string;
    file_type?: string;
    sheet_number?: number;
    sheet_name?: string;
  }) => {
    if (!params.url) return;

    setAiOverlayTitle('Прямое распознавание документа ИИ');
    setAiStageType('direct_file_recognition');
    setShowCountdownOverlay(true);
    setIsRecognizingDocTz(true);

    try {
      const ext = (params.fileName || params.url).split('.').pop()?.toLowerCase() || 'pdf';
      const detectedType = params.file_type || (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext) ? ext : 'pdf');
      const userUid = getUserUid(telegramProfile);
      const logUrl = "https://docs.google.com/spreadsheets/d/1veEGt8f-4O0sNaFgNLjbUFmnf0CquaoIbjAMIXkt0LU/edit?usp=sharing";
      const logChatId = userUid.endsWith('_tz') ? userUid : `${userUid}_tz`;

      // 1. Direct function call to ProTalk function_id: 369 with Google Sheet logging
      const runResp = await fetch('/api/v1/ai/run-doc-recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: params.url,
          file_type: detectedType,
          sheet_number: params.sheet_number || 0,
          sheet_name: params.sheet_name || '',
          userUid,
          chat_id: logChatId,
          log_url: logUrl,
          log_chat_id: logChatId,
          log_table: 'Лист1',
          table: 'Лист1',
        }),
      });

      const runJson = await runResp.json();
      const extractedText = runJson.text || '';

      // 2. Pass extracted text to ProTalk AI for structuring the technical assignment (ТЗ) & product
      let structuredTz = extractedText;
      let generatedProduct = '';
      let detectedCompany = '';
      let detectedDepartment = '';
      let tzJson: any = null;

      try {
        const tzResp = await fetch('/api/v1/ai/recognize-doc-tz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileUrl: params.url,
            fileName: params.fileName || 'document',
            text: extractedText || formData.functionality,
            userUid,
            chat_id: logChatId,
          }),
        });
        tzJson = await tzResp.json();
        if (tzJson && tzJson.success) {
          if (tzJson.functionality || tzJson.technicalAssignment) {
            structuredTz = tzJson.functionality || tzJson.technicalAssignment;
          }
          if (tzJson.product) {
            generatedProduct = tzJson.product;
          }
          if (tzJson.companyName) {
            detectedCompany = tzJson.companyName;
          }
          if (tzJson.department) {
            detectedDepartment = tzJson.department;
          }
        }
      } catch (tzErr) {
        console.warn('TZ structuring fallback:', tzErr);
      }

      if (structuredTz) {
        const targetCity = (tzJson?.city && tzJson.city.toLowerCase() !== 'не указан') ? tzJson.city : (formData.city || 'Москва');
        const targetDept = tzJson?.department || detectedDepartment || formData.department || 'Отдел продаж';
        const { calculated: newSalary } = calculateSalaryForCityAndDept(targetCity, targetDept, formData.avgSalary);

        const targetClientName = (tzJson?.clientName && tzJson.clientName !== 'Иван Иванов') ? tzJson.clientName : (tzJson?.fullName || formData.fullName || 'Иван Иванов');
        const targetCompany = (detectedCompany && detectedCompany.toLowerCase() !== 'проект') ? detectedCompany : (formData.company || '');
        const targetProduct = (generatedProduct || tzJson?.product || formData.product || structuredTz.slice(0, 100)).slice(0, 150);
        const targetPhone = tzJson?.phone || tzJson?.contactValue || formData.contactValue || '';
        const targetContactType = tzJson?.contactType || formData.contactType || 'Telegram';
        const targetComment = tzJson?.comment || tzJson?.summary || formData.comment || '';
        const targetEmpCount = tzJson?.employeeCount ? String(Math.max(2, parseInt(tzJson.employeeCount) || 2)) : formData.employeeCount;
        const targetSalary = tzJson?.salaryPerEmployee || tzJson?.averageSalary ? String(tzJson.salaryPerEmployee || tzJson.averageSalary) : (newSalary ? String(newSalary) : formData.avgSalary);

        setFormData(prev => ({
          ...prev,
          functionality: structuredTz,
          product: targetProduct,
          company: targetCompany,
          fullName: targetClientName,
          city: targetCity,
          department: targetDept,
          contactValue: targetPhone,
          contactType: targetContactType,
          comment: targetComment,
          employeeCount: targetEmpCount,
          averageSalary: targetSalary,
          uploadedDocUrl: params.url,
          uploadedDocName: params.fileName || 'Документ',
        }));

        setAiVoiceText(structuredTz);
        sessionStorage.setItem('sav-calculator-tz', structuredTz);
        sessionStorage.setItem('sav-calculator-dictation', structuredTz);
        sessionStorage.setItem('sav-business-description', structuredTz);
        if (targetCompany) sessionStorage.setItem('sav-company-name', targetCompany);
        setTzViewMode('markdown');

        updateLead({
          functionality: structuredTz,
          product: targetProduct,
          project: targetCompany,
          full_name: targetClientName,
          city: targetCity,
          phone: targetPhone,
          comment: targetComment,
          department: targetDept,
          salary: targetSalary,
          uploaded_doc_url: params.url,
          uploaded_doc_name: params.fileName || 'Документ',
        });

        toast({
          title: "Текст документа успешно распознан",
          description: "Все поля анкеты и техническое задание заполнены нейросетью.",
        });
      } else {
        toast({
          title: "Внимание",
          description: "Файл загружен, но текст пуст или не удалось распознать.",
        });
      }
    } catch (err: any) {
      console.error('Direct Doc Recognition Error:', err);
      toast({
        title: "Ошибка распознавания",
        description: err.message || "Не удалось извлечь текст из документа",
      });
    } finally {
      setIsRecognizingDocTz(false);
      setShowCountdownOverlay(false);
    }
  };

  const handleGoogleDocModalSubmit = async (params: {
    url: string;
    file_type: string;
    sheet_number: number;
    sheet_name: string;
  }) => {
    setIsGoogleDocModalOpen(false);

    const cleanUrl = params.url.trim();
    if (cleanUrl.toLowerCase().includes('disk.yandex') || cleanUrl.toLowerCase().includes('yadi.sk')) {
      toast({
        title: "Внимание",
        description: "Ссылки на Яндекс Диск не поддерживаются для прямого чтения. Скачайте файл и загрузите его напрямую через кнопку загрузки файла.",
      });
      return;
    }
    if (cleanUrl.toLowerCase().includes('cloud.mail.ru')) {
      toast({
        title: "Внимание",
        description: "Ссылки на Облако Mail.ru не поддерживаются для прямого чтения. Скачайте файл и загрузите его напрямую через кнопку загрузки файла.",
      });
      return;
    }

    const docName = params.url.split('/').pop()?.split('?')[0] || `Документ (${params.file_type.toUpperCase()})`;
    setUploadedFile({
      name: docName,
      url: params.url,
      size: 0,
      mimeType: params.file_type === 'pdf' ? 'application/pdf' : 'application/octet-stream',
    });
    setFormData(prev => ({
      ...prev,
      uploadedDocUrl: params.url,
      uploadedDocName: docName,
    }));
    updateLead({
      uploaded_doc_url: params.url,
      uploaded_doc_name: docName,
    });
    await handleDirectDocRecognition({
      url: params.url,
      fileName: docName,
      file_type: params.file_type,
      sheet_number: params.sheet_number,
      sheet_name: params.sheet_name,
    });
  };

  // Trigger AI Recognition on Uploaded Document - Extracts and fills Technical Assignment into "Расскажите про вашу компанию и продукт"
  const handleRecognizeDocTz = async () => {
    if (!uploadedFile && !formData.functionality.trim()) {
      toast({
        title: "Загрузите файл или укажите ТЗ",
        description: "Для распознавания ТЗ прикрепите документ или укажите тезисы проекта.",
      });
      return;
    }

    setAiOverlayTitle('Распознавание файла и формирование ТЗ');
    setAiStageType('tz_recognition');
    setShowCountdownOverlay(true);
    setIsRecognizingDocTz(true);

    try {
      const userUid = getUserUid(telegramProfile);
      const logChatId = userUid.endsWith('_tz') ? userUid : `${userUid}_tz`;
      const resp = await fetch('/api/v1/ai/recognize-doc-tz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: uploadedFile?.url || formData.uploadedDocUrl,
          fileName: uploadedFile?.name || formData.uploadedDocName,
          fileBase64: uploadedFile?.base64,
          mimeType: uploadedFile?.mimeType,
          text: formData.functionality,
          userUid,
          chat_id: logChatId,
        }),
      });

      const json = await resp.json();
      if (json.success && (json.functionality || json.technicalAssignment)) {
        const fullTz = json.functionality || json.technicalAssignment;
        const targetCity = (json.city && json.city.toLowerCase() !== 'не указан') ? json.city : (formData.city || 'Москва');
        const targetDept = json.department || formData.department || 'Отдел продаж';
        const { calculated: newSalary } = calculateSalaryForCityAndDept(targetCity, targetDept, formData.avgSalary);

        const targetClientName = (json.clientName && json.clientName !== 'Иван Иванов') ? json.clientName : (json.fullName || formData.fullName || 'Иван Иванов');
        const targetCompany = (json.companyName && json.companyName.toLowerCase() !== 'проект') ? json.companyName : (json.company || formData.company || '');
        const targetProduct = (json.product || formData.product || fullTz.slice(0, 100)).slice(0, 150);
        const targetPhone = json.phone || json.contactValue || formData.contactValue || '';
        const targetContactType = json.contactType || formData.contactType || 'Telegram';
        const targetComment = json.comment || json.summary || formData.comment || '';
        const targetEmpCount = json.employeeCount ? String(Math.max(2, parseInt(json.employeeCount) || 2)) : formData.employeeCount;
        const targetSalary = json.salaryPerEmployee || json.averageSalary ? String(json.salaryPerEmployee || json.averageSalary) : (newSalary ? String(newSalary) : formData.avgSalary);

        setFormData(prev => ({
          ...prev,
          functionality: fullTz,
          product: targetProduct,
          company: targetCompany,
          fullName: targetClientName,
          city: targetCity,
          department: targetDept,
          contactValue: targetPhone,
          contactType: targetContactType,
          comment: targetComment,
          employeeCount: targetEmpCount,
          averageSalary: targetSalary,
        }));

        setAiVoiceText(fullTz);
        sessionStorage.setItem('sav-calculator-tz', fullTz);
        sessionStorage.setItem('sav-calculator-dictation', fullTz);
        sessionStorage.setItem('sav-business-description', fullTz);
        if (targetCompany) sessionStorage.setItem('sav-company-name', targetCompany);
        setTzViewMode('markdown');

        updateLead({
          functionality: fullTz,
          product: targetProduct,
          project: targetCompany,
          full_name: targetClientName,
          city: targetCity,
          phone: targetPhone,
          comment: targetComment,
          department: targetDept,
          salary: targetSalary,
          uploaded_doc_url: uploadedFile?.url || formData.uploadedDocUrl,
          uploaded_doc_name: uploadedFile?.name || formData.uploadedDocName,
        });

        toast({
          title: "ТЗ и анкета успешно заполнены",
          description: "Техническое задание и параметры проекта внесены в поля формы.",
        });
      } else {
        throw new Error(json.error || 'Не удалось распознать ТЗ из файла');
      }
    } catch (err: any) {
      console.warn('Doc TZ recognition error:', err);
      toast({
        title: "Обработка ТЗ",
        description: err.message || "Попробуйте еще раз или проверьте формат файла",
      });
    } finally {
      setIsRecognizingDocTz(false);
      setShowCountdownOverlay(false);
    }
  };

  // Trigger AI Recognition on Uploaded Document - Extracts and fills all questionnaire fields
  const handleRecognizeDocument = async () => {
    if (!uploadedFile && !formData.functionality.trim()) {
      toast({
        title: "Загрузите файл или укажите ТЗ",
        description: "Для распознавания требуется прикрепить документ или ввести тезисы ТЗ.",
      });
      return;
    }

    setAiOverlayTitle('Нейросетевое заполнение калькулятора');
    setAiStageType('document_recognition');
    setShowCountdownOverlay(true);
    setIsRecognizingDoc(true);

    try {
      const resp = await fetch('/api/v1/ai/recognize-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileUrl: uploadedFile?.url || formData.uploadedDocUrl,
          fileName: uploadedFile?.name || formData.uploadedDocName,
          fileBase64: uploadedFile?.base64,
          mimeType: uploadedFile?.mimeType,
          text: formData.functionality,
          userInfo: {
            telegram_id: telegramProfile?.telegram_id,
            first_name: telegramProfile?.first_name,
            last_name: telegramProfile?.last_name,
          }
        }),
      });

      const json = await resp.json();
      if (json.success && (json.data || json.company || json.companyName || json.department)) {
        const d = json.data || json;
        const incomingFunc = (d.functionality || '').trim();
        const existingFunc = (formData.functionality || '').trim();
        const isDetailedExisting = (existingFunc.length > 100 || existingFunc.includes('\n'));
        const finalFunc = isDetailedExisting && incomingFunc.length <= existingFunc.length
          ? existingFunc
          : (incomingFunc || existingFunc);

        // Auto-calculate dynamic salary if city or department changed
        const targetCity = (d.city && d.city.toLowerCase() !== 'не указан') ? d.city : (formData.city || 'Москва');
        const targetDept = d.department || formData.department;
        const { calculated: newSalary } = calculateSalaryForCityAndDept(targetCity, targetDept, formData.avgSalary);

        setFormData(prev => {
          const currentFunc = (prev.functionality || '').trim();
          const shouldKeepCurrent = (currentFunc.length > 100 || currentFunc.includes('\n')) && incomingFunc.length <= currentFunc.length;
          const assignedFunc = shouldKeepCurrent ? currentFunc : finalFunc;

          return {
            ...prev,
            fullName: (d.fullName && d.fullName !== 'Иван Иванов') ? d.fullName : (prev.fullName || d.clientName || 'Иван Иванов'),
            company: (d.company && d.company.toLowerCase() !== 'проект' && d.company.toLowerCase() !== 'название компании') ? d.company : (d.companyName && d.companyName.toLowerCase() !== 'проект' ? d.companyName : (prev.company || '')),
            product: d.product || prev.product,
            city: targetCity,
            department: d.department || prev.department,
            contactValue: d.phone || d.contact || d.contactValue || prev.contactValue,
            contactType: d.contactType || prev.contactType,
            comment: d.comment || d.summary || prev.comment,
            employeeCount: d.employeeCount ? String(Math.max(2, parseInt(d.employeeCount) || 2)) : prev.employeeCount,
            averageSalary: d.averageSalary ? String(d.averageSalary) : (newSalary ? String(newSalary) : prev.averageSalary),
            functionality: assignedFunc,
            maintenance: d.maintenance || (d.hasSla !== undefined ? (d.hasSla ? 'Да' : 'Нет') : prev.maintenance),
            promoCode: d.promoCode || prev.promoCode,
          };
        });

        setAiVoiceText(finalFunc);
        sessionStorage.setItem('sav-calculator-tz', finalFunc);
        sessionStorage.setItem('sav-calculator-dictation', finalFunc);
        if (d.company && d.company.toLowerCase() !== 'проект') {
          sessionStorage.setItem('sav-company-name', d.company);
        } else if (d.companyName && d.companyName.toLowerCase() !== 'проект') {
          sessionStorage.setItem('sav-company-name', d.companyName);
        }

        if (d.promoCode) {
          checkPromo(d.promoCode);
        }

        if (d.summary) {
          setAiParsedSummary(d.summary);
        }

        updateLead({
          full_name: d.fullName || d.clientName || formData.fullName,
          project: d.company || d.companyName || formData.company,
          product: d.product || formData.product,
          city: d.city || formData.city,
          department: d.department || formData.department,
          avg_salary: String(newSalary),
          functionality: finalFunc,
          promo: d.promoCode || formData.promoCode,
          uploaded_doc_url: uploadedFile?.url || formData.uploadedDocUrl,
          uploaded_doc_name: uploadedFile?.name || formData.uploadedDocName,
        });

        toast({
          title: "Калькулятор успешно заполнен",
          description: d.summary || "Параметры из документа распределены по полям калькулятора.",
        });
      } else {
        throw new Error(json.error || 'Не удалось распознать документ');
      }
    } catch (err: any) {
      console.warn('Doc recognition notice:', err);
      toast({
        title: "Обработка документа",
        description: err.message || "Попробуйте еще раз или скопируйте текст в поле ввода",
      });
    } finally {
      setIsRecognizingDoc(false);
      setShowCountdownOverlay(false);
    }
  };

  // Promo code validation handler with real-time debounce
  const promoDebounceRef = useRef<any>(null);

  const handlePromoChange = (raw: string) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9А-Я_\-]/gi, '');
    setFormData(prev => ({ ...prev, promoCode: clean }));

    if (promoDebounceRef.current) {
      clearTimeout(promoDebounceRef.current);
    }

    if (!clean.trim()) {
      checkPromo('');
      updateLead({ promo: '' });
      return;
    }

    promoDebounceRef.current = setTimeout(() => {
      checkPromo(clean);
      updateLead({ promo: clean });
    }, 280);
  };

  const parsedEmployees = Math.max(1, parseInt(formData.employeeCount) || 1);
  const parsedSalary = parseInt(formData.averageSalary.replace(/\s+/g, '')) || 65000;
  const currentMonthlyFot = parsedEmployees * parsedSalary;
  const currentAnnualFot = currentMonthlyFot * 12;

  // Validation: all mandatory fields must be filled including contact
  const isContactValid = formData.contactValue.trim().length >= 3;
  const canProceed = 
    formData.fullName.trim().length > 0 &&
    formData.company.trim().length > 0 &&
    formData.product.trim().length > 0 &&
    formData.city.trim().length > 0 &&
    isContactValid &&
    formData.functionality.trim().length > 0 &&
    parsedEmployees >= 1 &&
    parsedSalary > 0;

  const [isMatchingExpert, setIsMatchingExpert] = useState(false);

  const handleNext = async () => {
    if (!canProceed) {
      if (!isContactValid) {
        toast({
          title: "Укажите способ связи",
          description: "Пожалуйста, введите ваш контакт (Telegram, WhatsApp, телефон или email) для получения сметы.",
        });
      }
      return;
    }

    trackAction('next_step', { page: '/calculator/step1', value: formData.company });
    
    const saved = sessionStorage.getItem('sav-calculator-data');
    const existing = saved ? JSON.parse(saved) : {};
    const merged = {
      ...existing,
      ...formData,
      employeeCount: String(parsedEmployees),
      averageSalary: String(parsedSalary),
      uploadedDocUrl: uploadedFile?.url || formData.uploadedDocUrl,
      uploadedDocName: uploadedFile?.name || formData.uploadedDocName,
      step: 'step1',
    };

    saveSessionData(merged as any);
    sessionStorage.setItem('sav-calculator-data', JSON.stringify(merged));
    localStorage.setItem('sav_calculator_data', JSON.stringify(merged));
    localStorage.setItem('sav-calculator-data', JSON.stringify(merged));
    
    updateLead({
      full_name: formData.fullName,
      project: formData.company,
      product: formData.product,
      city: formData.city,
      phone: formData.contactValue,
      department: formData.department,
      service: formData.maintenance,
      functionality: formData.functionality,
      promo: formData.promoCode || undefined,
      avg_salary: String(parsedSalary),
      employees_count: String(parsedEmployees),
    });

    // If an expert was already chosen previously, skip Step 2 and go directly to calculation (Step 3)
    if (previouslySelectedExpert) {
      const expertDisplayName = formatExpertDisplayName(previouslySelectedExpert);
      const withExpert = {
        ...merged,
        selectedExpertId: String(previouslySelectedExpert.id || ''),
        selectedExpert: expertDisplayName,
        matchedExpertId: String(previouslySelectedExpert.id || ''),
        matchedExpertName: expertDisplayName,
        selectedExpertPhoto: previouslySelectedExpert.photo_url,
        selectedExpertRole: previouslySelectedExpert.role,
        step: 'step3',
      };
      sessionStorage.setItem('sav-calculator-data', JSON.stringify(withExpert));
      saveSessionData(withExpert as any);
      updateLead({ selected_expert: expertDisplayName });
      navigate('/calculator/step3');
      return;
    }

    // Launch AI Expert Matching with countdown overlay
    setAiOverlayTitle('ИИ-подбор персонального эксперта-куратора');
    setAiStageType('expert_matching');
    setIsMatchingExpert(true);
    setShowCountdownOverlay(true);

    try {
      const resp = await fetch('/api/v1/ai/calculator/expert-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.company,
          product: formData.product,
          department: formData.department,
          tzText: formData.functionality,
          userUid: getUserUid(),
        })
      });
      const data = await resp.json();
      const matchObj = data.data || data;
      if (matchObj && (matchObj.expertId || matchObj.expertName)) {
        const withExpert = {
          ...merged,
          matchedExpertId: matchObj.expertId,
          matchedExpertName: matchObj.expertName || 'Ms.Violet',
          selectedExpert: matchObj.expertName || 'Ms.Violet',
          selectedExpertId: matchObj.expertId,
          matchScore: matchObj.matchScore || 97,
          matchReason: matchObj.matchReason || `Критерии: ${matchObj.expertName || 'Ms.Violet'} наиболее подходит для проекта компании «${formData.company || 'клиента'}».`
        };
        sessionStorage.setItem('sav-calculator-data', JSON.stringify(withExpert));
        saveSessionData(withExpert as any);
      }
    } catch (err) {
      console.warn('AI Expert match warning:', err);
    } finally {
      setIsMatchingExpert(false);
      setShowCountdownOverlay(false);
      navigate('/calculator/step2');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 sm:p-6 md:p-8 bg-transparent">
      <Header onLogoClick={() => navigate('/')} />

      {/* AI Processing Overlay with 3D Neural Sphere & Countdown */}
      {showCountdownOverlay && (
        <ProTalkCountdownOverlay
          maxSeconds={100}
          title={aiOverlayTitle}
          badgeText="Нейросетевой анализ SAV AI"
          stagesType={aiStageType}
          companyName={formData.company}
          department={formData.department}
          employeeCount={formData.employeeCount}
          businessDescription={uploadedFile?.name || formData.company || formData.functionality || 'Техническое задание'}
          onCancel={() => {
            setShowCountdownOverlay(false);
            setIsMatchingExpert(false);
          }}
        />
      )}

      <main className="w-full max-w-6xl flex-grow pt-2">
        {/* Calculation tabs allowing switching or starting new calculation */}
        <CalculatorTabs
          currentData={formData}
          currentStep="step1"
          onDataLoaded={(newData) => setFormData(prev => ({ ...prev, ...newData }))}
        />

        <motion.div
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.25 }}
          className="w-full"
        >
          {/* Header area with smoke backdrop and golden title */}
          <div className="relative mb-6 text-center">
            <RealisticSmokeBackdrop speed="fast" opacity={0.62} className="-top-6 -left-10 w-[calc(100%+80px)] h-[130px]" />
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              Расчёт сметы ИИ-приложения
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 mt-1 max-w-2xl mx-auto">
              Шаг 1 из 3: Анкета проекта, техническое задание и параметры автоматизируемого отдела
            </p>
          </div>

          {/* Progress bar in Liquid Glass Apple style */}
          <div className="w-full max-w-4xl mx-auto mb-6">
            <div className="flex justify-between text-sm text-amber-200/90 font-medium mb-1.5 px-1">
              <span>Шаг 1: Анкета проекта, ТЗ и отдел</span>
              <span>33%</span>
            </div>
            <div className="h-3 liquid-bubble-plate rounded-full overflow-hidden border border-amber-400/40 p-0.5 relative shadow-inner">
              <div 
                className="h-full rounded-full liquid-bubble-gold transition-all duration-500 shadow-[0_0_15px_rgba(231,199,104,0.6)] relative" 
                style={{ width: '33.33%' }} 
              >
                <span className="liquid-bubble-glare" />
              </div>
            </div>
          </div>

          {/* Miniature card for previously selected expert */}
          {previouslySelectedExpert && (
            <div className="w-full mb-6 p-4 sm:p-5 rounded-2xl liquid-bubble-plate border border-amber-400/35 shadow-2xl relative overflow-hidden">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
              <Rivets />
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border border-amber-400/50 bg-black/80 shrink-0 shadow-[0_0_15px_rgba(231,199,104,0.3)]">
                    {previouslySelectedExpert.photo_url ? (
                      <img
                        src={previouslySelectedExpert.photo_url}
                        alt={formatExpertDisplayName(previouslySelectedExpert)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserCheck className="w-8 h-8 m-auto text-amber-400 mt-3 sm:mt-4" />
                    )}
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border border-black" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm px-2.5 py-0.5 rounded-full liquid-bubble-secondary border border-amber-400/35 text-amber-300 font-medium">
                        Закрепленный эксперт проекта
                      </span>
                    </div>
                    <h4 className="text-base sm:text-lg font-bold text-white mt-1">
                      {formatExpertDisplayName(previouslySelectedExpert)}
                    </h4>
                    <p className="text-sm text-zinc-300">
                      {previouslySelectedExpert.role || 'Эксперт-интегратор SAV AI'} • 98% совместимость с проектом
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setDetailedExpertModal(previouslySelectedExpert)}
                    className="liquid-bubble-secondary relative overflow-hidden px-3.5 py-2 rounded-xl text-sm font-semibold text-amber-200 border border-amber-400/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(231,199,104,0.2)] hover:scale-[1.02] active:scale-95"
                  >
                    <span className="liquid-bubble-glare" />
                    <Eye className="w-4 h-4 text-amber-400 relative z-10" />
                    <span className="relative z-10">Подробнее</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/calculator/step2')}
                    className="liquid-bubble-secondary relative overflow-hidden px-3.5 py-2 rounded-xl text-sm font-semibold text-amber-200 border border-amber-400/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(231,199,104,0.25)] hover:scale-[1.02] active:scale-95"
                  >
                    <span className="liquid-bubble-glare" />
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400 relative z-10" />
                    <span className="relative z-10">Выбрать другого эксперта</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* UNIFIED POWERHOUSE BLOCK: Voice Dictation, Technical Specification (TZ) & Document Upload */}
          <div className="w-full mb-6 relative">
            <div className="rounded-2xl liquid-bubble-plate border border-amber-400/35 p-4 sm:p-6 shadow-2xl space-y-4 relative overflow-hidden">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
              <Rivets />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                    Техническое задание и параметры проекта
                  </h3>
                </div>
                <span className="liquid-bubble-secondary relative overflow-hidden text-sm font-mono text-amber-300 px-3 py-1 rounded-full border border-amber-400/30 shrink-0 shadow-sm">
                  <span className="liquid-bubble-glare" />
                  <span className="relative z-10">Голос, текст или документ</span>
                </span>
              </div>

              {/* AudioField / Dictation Editor */}
              <div className="space-y-2 relative z-10">
                <AudioField
                  value={formData.functionality}
                  viewMode={tzViewMode}
                  onViewModeChange={setTzViewMode}
                  onChange={(text) => {
                    setFormData(prev => ({ 
                      ...prev, 
                      functionality: text,
                      product: (!prev.product || prev.product === prev.functionality) ? text : prev.product
                    }));
                    setAiVoiceText(text);
                    sessionStorage.setItem('sav-calculator-tz', text);
                    sessionStorage.setItem('sav-calculator-dictation', text);
                    sessionStorage.setItem('sav-business-description', text);
                    updateLead({ 
                      functionality: text, 
                      product: (!formData.product || formData.product === formData.functionality) ? text : formData.product 
                    });
                  }}
                  placeholder="Например: Меня зовут Виктор, компания Альфа-Трейд, продаем металлопрокат в Москве. Контакт @victor_alfa. Автоматизируем отдел продаж из 3 менеджеров с зарплатой 80 000 руб. Нужно автономное веб-приложение на базе ИИ-агентов для квалификации лидов, автодожима в CRM и аудита договоров..."
                  label="Расскажите про вашу компанию и продукт"
                />
              </div>

              {/* Integrated Document Upload / File Card */}
              <div className="p-3 sm:p-4 rounded-xl liquid-bubble-secondary border border-amber-400/35 relative overflow-hidden space-y-2.5 shadow-md">
                <span className="liquid-bubble-glare" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      {isUploadingDoc ? (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      ) : uploadedFile ? (
                        <FileCheck className="w-4 h-4 text-amber-300" />
                      ) : (
                        <UploadCloud className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">
                        {uploadedFile ? `Файл прикреплен: ${uploadedFile.name}` : 'Прикрепить готовый документ ТЗ (PDF, DOCX, TXT, XLS)'}
                      </div>
                      <div className="text-sm text-amber-200/70">
                        Файл загружается в защищенную галерею для автоанализа нейросетью
                      </div>
                    </div>
                  </div>

                  {/* Hidden file input & trigger button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.txt,.rtf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.zip"
                    className="hidden"
                  />

                  <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingDoc}
                      className="liquid-bubble-secondary relative overflow-hidden flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-amber-400/35 text-sm text-amber-200 hover:text-white font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                    >
                      <span className="liquid-bubble-glare" />
                      <UploadCloud className="w-3.5 h-3.5 text-amber-400 relative z-10" />
                      <span className="relative z-10">{uploadedFile ? 'Заменить файл' : 'Выбрать файл'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsGoogleDocModalOpen(true)}
                      disabled={isUploadingDoc || isRecognizingDocTz}
                      className="liquid-bubble-secondary relative overflow-hidden flex-1 sm:flex-none px-3.5 py-2 rounded-xl border border-amber-400/35 text-sm text-amber-200 hover:text-white font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                      title="Подключить Google Docs, Google Sheets или файл по ссылке"
                    >
                      <span className="liquid-bubble-glare" />
                      <Link2 className="w-3.5 h-3.5 text-amber-400 relative z-10" />
                      <span className="relative z-10">Ссылка на Google Docs / файл</span>
                    </button>

                    {uploadedFile && (
                      <>
                        <button
                          type="button"
                          onClick={handleRecognizeDocTz}
                          disabled={isRecognizingDocTz || isRecognizingDoc}
                          className="liquid-bubble-gold relative overflow-hidden flex-1 sm:flex-none px-3.5 py-2 rounded-xl font-medium text-amber-950 border border-amber-400/45 shadow-[0_0_12px_rgba(231,199,104,0.35)] active:scale-95 hover:scale-[1.02] transition-all flex items-center justify-center gap-1.5 text-sm cursor-pointer disabled:opacity-50"
                        >
                          <span className="liquid-bubble-glare" />
                          {isRecognizingDocTz ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin relative z-10" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-amber-950 relative z-10" />
                          )}
                          <span className="relative z-10">{isRecognizingDocTz ? 'Распознавание ТЗ...' : 'Распознать и заполнить ТЗ'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setUploadedFile(null);
                            setFormData(prev => ({
                              ...prev,
                              uploadedDocUrl: '',
                              uploadedDocName: '',
                            }));
                          }}
                          className="liquid-bubble-secondary relative overflow-hidden px-3 py-2 rounded-xl border border-white/20 text-zinc-300 hover:text-white transition-all text-sm flex items-center justify-center gap-1 cursor-pointer hover:scale-[1.02] active:scale-95"
                          title="Удалить прикрепленный файл"
                        >
                          <span className="liquid-bubble-glare" />
                          <X className="w-3.5 h-3.5 relative z-10" />
                          <span className="relative z-10">Удалить</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {uploadedFile && (
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2 overflow-hidden text-sm relative z-10">
                    <span className="text-amber-200/80 shrink-0">Ссылка на файл:</span>
                    <a
                      href={uploadedFile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:text-amber-200 underline truncate flex items-center gap-1 font-mono"
                    >
                      <span className="truncate">{uploadedFile.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleProcessVoiceWithAI(formData.functionality || aiVoiceText)}
                    disabled={isAiProcessing || (!formData.functionality.trim() && !aiVoiceText.trim() && !uploadedFile)}
                    className="liquid-bubble-gold relative overflow-hidden px-4 py-2 rounded-xl font-bold text-amber-950 border border-amber-400/45 shadow-[0_0_15px_rgba(231,199,104,0.4)] hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="liquid-bubble-glare" />
                    {isAiProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                    ) : (
                      <Bot className="w-4 h-4 text-amber-950 relative z-10" />
                    )}
                    <span className="relative z-10">🤖 ИИ-заполнение калькулятора</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateDetailedTz}
                    disabled={isAiProcessing}
                    className="liquid-bubble-secondary relative overflow-hidden px-4 py-2 rounded-xl font-semibold text-amber-200 hover:text-white border border-amber-400/40 transition-all flex items-center gap-2 text-sm cursor-pointer shadow-[0_0_12px_rgba(231,199,104,0.2)] hover:scale-[1.02] active:scale-95"
                  >
                    <span className="liquid-bubble-glare" />
                    <Sparkles className="w-4 h-4 text-amber-400 relative z-10" />
                    <span className="relative z-10">✨ ИИ: Составить подробное ТЗ</span>
                  </button>
                </div>
              </div>

              {aiParsedSummary && !isAiProcessing && (
                <div className="liquid-bubble-plate relative overflow-hidden flex items-start gap-2.5 text-sm text-zinc-200 border border-amber-400/35 p-3 rounded-xl">
                  <span className="liquid-bubble-glare" />
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 relative z-10" />
                  <div className="relative z-10">
                    <span className="text-amber-300 font-semibold">ИИ распознал параметры: </span>
                    <span>{aiParsedSummary}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Container (Desktop Grid 7 : 5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
            {/* Left Column (7/12 on desktop): Requisites and Mandatory Contact Block */}
            <div className="lg:col-span-7 rounded-2xl liquid-bubble-plate border border-amber-400/35 p-5 sm:p-6 shadow-2xl relative space-y-4 overflow-hidden">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
              <Rivets />
              <div className="relative z-10 mb-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Реквизиты проекта и контакты для связи</span>
                </h3>
                <p className="text-sm text-zinc-300 mt-0.5">
                  Укажите контактное лицо, название компании, сферу деятельности и контакт для КП
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span>ФИО контактного лица *</span>
                </label>
                <MiniAudioField
                  value={formData.fullName}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, fullName: val }));
                    updateLead({ full_name: val });
                  }}
                  placeholder="Например: Иван Васильев"
                />
              </div>

              {/* Company Name */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Компания или название проекта *</span>
                </label>
                <MiniAudioField
                  value={formData.company}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, company: val }));
                    sessionStorage.setItem('sav-company-name', val);
                    updateLead({ project: val });
                  }}
                  placeholder="Например: ООО МеталлПром"
                />
              </div>

              {/* Product / Service */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-amber-400" />
                  <span>Продукт или услуга *</span>
                </label>
                <MiniAudioField
                  value={formData.product}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, product: val }));
                    updateLead({ product: val });
                  }}
                  placeholder="Например: Оптовая продажа металлопроката и крепежа"
                />
              </div>

              {/* City Selection from sav_cities table */}
              <div className="space-y-1.5 relative z-10">
                <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>Город присутствия со средней зарплатой *</span>
                </label>
                <CitySearchSelect
                  cities={citiesWithSalary}
                  value={formData.city}
                  onChange={handleCitySelect}
                  isLoading={citiesLoading}
                  placeholder="Выберите или начните ввод города из базы..."
                />
              </div>

              {/* ========================================================= */}
              {/* MANDATORY CONTACT BLOCK (TELEGRAM / WHATSAPP / PHONE / EMAIL / MAX / SETKA / VK) */}
              {/* ========================================================= */}
              <div className="p-4 rounded-xl liquid-bubble-plate border border-amber-400/35 space-y-3 relative overflow-hidden shadow-lg">
                <span className="liquid-bubble-glare" />
                <div className="flex items-center justify-between relative z-10">
                  <label className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-amber-400" />
                    <span>Контакт для бесплатного аудита *</span>
                  </label>
                  <span className="liquid-bubble-secondary relative overflow-hidden text-sm text-amber-300/90 font-mono px-2 py-0.5 rounded-full border border-amber-400/30">
                    <span className="liquid-bubble-glare" />
                    <span className="relative z-10">Обязательно</span>
                  </span>
                </div>

                {/* Contact Type Selector (all modal options) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 relative z-10">
                  {CONTACT_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isSelected = formData.contactType === ct.id;
                    return (
                      <button
                        key={ct.id}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, contactType: ct.id }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-1.5 text-sm font-medium transition-all cursor-pointer relative overflow-hidden hover:scale-[1.02] active:scale-95 ${
                          isSelected
                            ? 'liquid-bubble-gold border-amber-400 text-amber-950 shadow-[0_0_12px_rgba(231,199,104,0.4)] font-bold'
                            : 'liquid-bubble-secondary border-white/10 text-zinc-300 hover:text-white hover:border-amber-400/30'
                        }`}
                      >
                        <span className="liquid-bubble-glare" />
                        <Icon className={`w-4 h-4 relative z-10 ${isSelected ? 'text-amber-950' : 'text-zinc-300'}`} />
                        <span className="relative z-10">{ct.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Contact Input Field with Validation */}
                <div className="space-y-1 relative z-10">
                  <input
                    type="text"
                    value={formData.contactValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, contactValue: val }));
                      updateLead({ phone: val });
                    }}
                    placeholder={
                      (CONTACT_TYPES.find(c => c.id === formData.contactType) || CONTACT_TYPES[0]).placeholder
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/15 focus:border-amber-300 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all placeholder:font-sans placeholder:text-zinc-500"
                  />
                  {!isContactValid && formData.contactValue.length > 0 && (
                    <div className="text-sm text-amber-300/80">
                      Пожалуйста, укажите корректный контакт для связи
                    </div>
                  )}
                </div>

                {/* Additional Comment / Automation Tasks */}
                <div className="space-y-1.5 pt-1 relative z-10">
                  <label className="text-sm font-semibold text-amber-200 flex items-center justify-between">
                    <span>Комментарий или задачи автоматизации</span>
                    <span className="text-sm text-amber-200/60 font-sans">Опционально</span>
                  </label>
                  <textarea
                    rows={3}
                    value={formData.comment}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({ ...prev, comment: val }));
                      sessionStorage.setItem('sav-calculator-comment', val);
                    }}
                    placeholder="Опишите ваши ключевые пожелания или текущие сложности в отделе продаж..."
                    className="w-full p-3 rounded-xl border border-white/20 bg-black/70 text-white placeholder-white/40 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-y leading-relaxed"
                  />
                </div>

                {/* Direct Architect Contact Plate */}
                <div className="pt-2 border-t border-amber-400/15 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm text-amber-200/90 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span>
                      Прямой контакт руководителя:{' '}
                      <a
                        href="https://t.me/shishkarnem"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-amber-300 underline hover:text-white"
                      >
                        @shishkarnem
                      </a>{' '}
                      (Архитектор SAV AI)
                    </span>
                  </div>
                  <span className="text-amber-400/60 hidden sm:inline">24/7 экспресс-аудит</span>
                </div>
              </div>
            </div>

            {/* Right Column (5/12 on desktop): Staff parameters, Salary, Live FOT & Promo code */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="rounded-2xl liquid-bubble-plate border border-amber-400/35 p-5 sm:p-6 shadow-2xl relative overflow-hidden">
                <span className="liquid-bubble-glare" />
                <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
                <Rivets />
                <div className="relative z-10 mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Штат и зарплатный фонд отдела</span>
                  </h3>
                  <p className="text-sm text-zinc-300 mt-0.5">
                    Количество функций ИИ-приложения строго равно числу заменяемых сотрудников
                  </p>
                </div>

                <div className="space-y-4 relative z-10">
                  {/* Number of Employees (NO VOICE INPUT) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Численность отдела (заменяемые сотрудники) *</span>
                      </label>
                      <span className="text-sm font-mono text-amber-300 liquid-bubble-secondary px-2 py-0.5 rounded border border-amber-400/20">
                        Мин. 2 чел.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={100}
                        value={formData.employeeCount}
                        onChange={(e) => {
                          const clean = e.target.value.replace(/\D/g, '');
                          setFormData(prev => ({ ...prev, employeeCount: clean }));
                        }}
                        placeholder="2"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-300 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
                      />

                      {/* Fast number preset buttons */}
                      <div className="flex items-center gap-1">
                        {[2, 3, 5, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, employeeCount: String(num) }))}
                            className={`px-2.5 py-2 text-sm rounded-xl font-mono transition-all border cursor-pointer relative overflow-hidden hover:scale-105 active:scale-95 ${
                              parseInt(formData.employeeCount) === num
                                ? 'liquid-bubble-gold border-amber-400 text-amber-950 font-bold shadow-[0_0_8px_rgba(231,199,104,0.4)]'
                                : 'liquid-bubble-secondary border-white/10 text-zinc-400 hover:text-white'
                            }`}
                          >
                            <span className="liquid-bubble-glare" />
                            <span className="relative z-10">{num}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Average Salary per employee (NO VOICE INPUT) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5 text-amber-400" />
                        <span>Средняя зарплата 1 сотрудника *</span>
                      </label>
                      <span className="text-sm font-mono text-zinc-400">В рублях / мес.</span>
                    </div>

                    <input
                      type="text"
                      value={formData.averageSalary}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/[^\d\s]/g, '');
                        setFormData(prev => ({ ...prev, averageSalary: clean }));
                      }}
                      placeholder="65 000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-300 text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all"
                    />

                    {/* Fast salary preset chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SALARY_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, averageSalary: String(preset) }))}
                          className={`px-2.5 py-1 text-sm rounded-lg font-mono transition-all border cursor-pointer relative overflow-hidden hover:scale-105 active:scale-95 ${
                            parseInt(formData.averageSalary.replace(/\s+/g, '')) === preset
                              ? 'liquid-bubble-gold border-amber-400 text-amber-950 font-bold shadow-[0_0_8px_rgba(231,199,104,0.35)]'
                              : 'liquid-bubble-secondary border-white/10 text-zinc-300 hover:text-white'
                          }`}
                        >
                          <span className="liquid-bubble-glare" />
                          <span className="relative z-10">{(preset / 1000).toFixed(0)}к ₽</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live FOT Preview Badge */}
                  <div className="p-3.5 rounded-xl liquid-bubble-plate border border-amber-400/40 relative overflow-hidden flex items-center justify-between shadow-lg">
                    <span className="liquid-bubble-glare" />
                    <Rivets />
                    <div className="relative z-10">
                      <div className="text-sm text-amber-200/80 font-medium">Текущий ФОТ отдела:</div>
                      <div className="text-sm font-mono text-zinc-300">
                        {parsedEmployees} сотр. × {parsedSalary.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    <div className="text-right relative z-10">
                      <div className="text-base sm:text-lg font-bold font-mono text-amber-300">
                        {currentMonthlyFot.toLocaleString('ru-RU')} ₽ / мес
                      </div>
                      <div className="text-sm text-amber-200/70 font-mono">
                        {currentAnnualFot.toLocaleString('ru-RU')} ₽ / год
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Promo Code Card (Validated against partners) */}
              <div className="rounded-2xl liquid-bubble-plate border border-amber-400/35 p-5 shadow-2xl relative overflow-hidden">
                <span className="liquid-bubble-glare" />
                <RealisticSmokeBackdrop speed="normal" opacity={0.35} className="-top-4 -left-4 w-[calc(100%+32px)] h-[60px]" />
                <Rivets />
                <div className="relative z-10 flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-white flex items-center gap-1.5">
                    <Tag className="w-4 h-4 text-amber-400" />
                    <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Промокод на скидку 5% (опционально)</span>
                  </label>
                  {isPromoChecking && (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  )}
                </div>

                <div className="space-y-2 relative z-10">
                  <input
                    type="text"
                    value={formData.promoCode}
                    onChange={(e) => handlePromoChange(e.target.value)}
                    placeholder="Введите промокод (например: START, SAV2026)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 focus:border-amber-300 text-white font-mono text-sm  focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all placeholder:normal-case"
                  />

                  {formData.promoCode.trim().length > 0 && (
                    <>
                      {isPromoChecking ? (
                        <div className="p-3 rounded-xl text-sm border border-amber-400/30 liquid-bubble-secondary relative overflow-hidden text-amber-200 flex items-center gap-2">
                          <span className="liquid-bubble-glare" />
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0 relative z-10" />
                          <span className="relative z-10">Проверка промокода в базе партнёров...</span>
                        </div>
                      ) : promoResult?.isValid ? (
                        <div className="p-3 rounded-xl text-sm border border-amber-400/50 liquid-bubble-secondary relative overflow-hidden text-amber-200 flex items-center gap-2 shadow-[0_0_12px_rgba(231,199,104,0.25)]">
                          <span className="liquid-bubble-glare" />
                          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 relative z-10" />
                          <span className="relative z-10">{promoResult.partnerName ? `Промокод партнёра: ${promoResult.partnerName} (скидка ${promoResult.discountPercent}%)` : `Промокод подтверждён (скидка ${promoResult.discountPercent}%)`}</span>
                        </div>
                      ) : promoResult && !promoResult.isValid ? (
                        <div className="p-3 rounded-xl text-sm border border-white/20 liquid-bubble-secondary relative overflow-hidden text-zinc-300 flex items-center gap-2">
                          <span className="liquid-bubble-glare" />
                          <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 relative z-10" />
                          <span className="relative z-10">Промокод «{formData.promoCode}» не найден в базе партнёров</span>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* BOTTOM SECTION: DEPARTMENT SELECTOR & SLA MAINTENANCE     */}
          {/* ========================================================= */}
          <div className="mt-6 rounded-2xl liquid-bubble-plate border border-amber-400/35 p-5 sm:p-6 shadow-2xl relative space-y-4 overflow-hidden">
            <span className="liquid-bubble-glare" />
            <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
            <Rivets />
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-400/20 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Выбор автоматизируемого подразделения компании</span>
                </h3>
                <p className="text-sm text-zinc-300 mt-0.5">
                  Выберите отдел, задачи которого полностью заменит создаваемое ИИ-приложение
                </p>
              </div>
              <span className="liquid-bubble-secondary relative overflow-hidden text-sm font-mono text-amber-300 px-3 py-1 rounded-full border border-amber-400/30 shrink-0 shadow-sm">
                <span className="liquid-bubble-glare" />
                <span className="relative z-10">8 профилей отделов</span>
              </span>
            </div>

            {/* Department Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative z-10">
              {DEPARTMENTS.map((dept) => {
                const isSelected = formData.department === dept.value;
                return (
                  <button
                    key={dept.value}
                    type="button"
                    onClick={() => {
                      handleDepartmentSelect(dept.value);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer group shadow-lg hover:scale-[1.01] active:scale-95 ${
                      isSelected
                        ? 'liquid-bubble-gold text-amber-950 border-amber-400 shadow-[0_0_18px_rgba(231,199,104,0.45)]'
                        : 'liquid-bubble-secondary border-white/15 text-white hover:border-amber-400/50'
                    }`}
                  >
                    <span className="liquid-bubble-glare" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-2xl">{dept.icon}</span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 flex items-center justify-center shadow-sm">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className={`text-base font-bold mb-1.5 ${isSelected ? 'text-amber-950' : 'text-white group-hover:text-amber-200'}`}>
                        {dept.label}
                      </div>
                      <div className={`text-sm leading-relaxed ${isSelected ? 'text-amber-900 font-medium' : 'text-zinc-300'}`}>
                        {dept.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* SLA Maintenance Selector */}
            <div className="pt-3 border-t border-amber-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div>
                <div className="text-sm font-bold text-amber-200 flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  <span>SLA-сопровождение, мониторинг и обновление моделей:</span>
                </div>
                <div className="text-sm text-zinc-300">
                  Гарантийная поддержка 24/7, дообучение нейросетей и регулярное обновление
                </div>
              </div>

              <div className="flex items-center gap-2">
                {['Да', 'Нет'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, maintenance: val }));
                      updateLead({ service: val });
                    }}
                    className={`px-5 py-2 rounded-xl text-sm font-bold border transition-all cursor-pointer relative overflow-hidden hover:scale-[1.02] active:scale-95 ${
                      formData.maintenance === val
                        ? 'liquid-bubble-gold border-amber-400 text-amber-950 shadow-[0_0_12px_rgba(231,199,104,0.4)]'
                        : 'liquid-bubble-secondary border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="liquid-bubble-glare" />
                    <span className="relative z-10">{val === 'Да' ? 'Да (10% в мес.)' : 'Без SLA'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Controls in Liquid Glass Apple style */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-5 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="liquid-bubble-secondary relative overflow-hidden w-full sm:w-auto px-6 py-3 rounded-xl text-zinc-300 hover:text-white border border-white/15 transition-all text-sm font-medium cursor-pointer shadow-[0_0_12px_rgba(0,0,0,0.3)] hover:scale-[1.02] active:scale-95"
            >
              <span className="liquid-bubble-glare" />
              <span className="relative z-10">Вернуться на главную</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={!canProceed}
              className={`relative overflow-hidden w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                canProceed
                  ? 'liquid-bubble-gold text-amber-950 border border-amber-400/50 shadow-[0_0_22px_rgba(231,199,104,0.45)] hover:scale-[1.02] active:scale-95'
                  : 'bg-black/40 text-zinc-500 border border-white/10 cursor-not-allowed opacity-60'
              }`}
            >
              {canProceed && <span className="liquid-bubble-glare" />}
              {previouslySelectedExpert ? (
                <>
                  <Calculator className={`w-5 h-5 relative z-10 ${canProceed ? 'text-amber-950' : 'text-zinc-500'}`} />
                  <span className="relative z-10">Рассчитать смету проекта</span>
                  <ChevronRight className={`w-5 h-5 relative z-10 ${canProceed ? 'text-amber-950' : 'text-zinc-500'}`} />
                </>
              ) : (
                <>
                  <span className="relative z-10">Перейти к выбору эксперта-куратора</span>
                  <ChevronRight className={`w-5 h-5 relative z-10 ${canProceed ? 'text-amber-950' : 'text-zinc-500'}`} />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </main>

      {/* Modal to view detailed expert profile with full Markdown UI */}
      <ExpertDetailModal
        isOpen={!!detailedExpertModal}
        expert={detailedExpertModal}
        onClose={() => setDetailedExpertModal(null)}
        onSelect={() => {
          setDetailedExpertModal(null);
          navigate('/calculator/step2');
        }}
        isSelected={true}
      />

      {/* Modal for Google Docs & Office documents recognition */}
      <GoogleDocLinkModal
        isOpen={isGoogleDocModalOpen}
        onClose={() => setIsGoogleDocModalOpen(false)}
        onSubmit={handleGoogleDocModalSubmit}
        isLoading={isRecognizingDocTz}
      />

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default CalculatorStep1;
