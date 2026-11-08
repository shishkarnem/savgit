import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  Send, 
  Tag, 
  Loader2, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  Calculator, 
  TrendingUp, 
  UserCheck, 
  Clock, 
  Sparkles, 
  Building2,
  Users,
  Info,
  X,
  FileText,
  Image as ImageIcon,
  Cpu,
  Layers,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Download,
  ShieldCheck,
  Phone,
  User,
  Plus
} from 'lucide-react';
import Header from '@/components/Header';
import Rivets from '@/components/Rivets';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';
import { ProTalkCountdownOverlay } from '@/components/ProTalkCountdownOverlay';
import { protalkDb } from '@/integrations/protalk/client';
import ExpertCard, { Expert } from '@/components/ExpertCard';
import ExpertDetailModal from '@/components/ExpertDetailModal';
import GlobalFooter from '@/components/GlobalFooter';
import { getExpertRealName, formatExpertFullTitle } from '@/utils/expertUtils';
import { useToast } from '@/hooks/use-toast';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useActionTracker } from '@/hooks/useActionTracker';
import { useLeadTracker } from '@/hooks/useLeadTracker';
import { generateEstimatePdf } from '@/utils/generateEstimatePdf';
import { CONTACT_TYPES } from '@/constants/contactTypes';
import CalculatorTabs from '@/components/CalculatorTabs';
import { startNewCalculation } from '@/utils/calculatorStorage';
import { cleanTzTextWithoutPageBreaks } from '@/utils/formatTzMarkdown';
import ReactMarkdown from 'react-markdown';
import { getUserUid as resolveUserUidHelper } from '@/lib/uidHelper';

const DEPARTMENT_LABELS: Record<string, string> = {
  sales: 'Отдел продаж',
  hr: 'Отдел найма',
  callcenter: 'Call-центр',
  dev: 'Отдел разработки',
  marketing: 'Отдел маркетинга',
  copywriting: 'Копирайтинг',
  docs: 'Делопроизводство',
  legal: 'Юридический отдел'
};

const DEPARTMENT_COEFFICIENTS: Record<string, number> = {
  'Отдел разработки': 1.45,
  'Отдел маркетинга': 1.10,
  'Юридический отдел': 1.05,
  'Отдел продаж': 1.00,
  'Отдел найма': 0.95,
  'Копирайтинг': 0.85,
  'Сall-центр': 0.80,
  'Call-центр': 0.80,
  'Делопроизводство': 0.70,
};

const FORM_URL = 'https://docs.google.com/forms/d/13OVMyrJAhOJiaeoa_UB1VV_htOgaj-DlnCRUb3K-h8M/edit';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxnQHoV6xKTbWyA1uA329B4YtX_X1OXpOUxLFdaaOoeZHHsnvy_-PDONkZNMo7KVgGs/exec';

interface FormDataState {
  fullName: string;
  company: string;
  product: string;
  city: string;
  avgSalary: number | null;
  employeeCount: string;
  averageSalary: string;
  department: string;
  functionality: string;
  maintenance: string;
  contactType: string;
  contactValue: string;
  selectedExpertId?: string;
  selectedExpert?: string;
  promoCode?: string;
  tzText?: string;
  tzFunctions?: string[];
  imageUrl?: string;
  uploadedDocUrl?: string;
  uploadedDocName?: string;
}

const getDeptFallbackFunctions = (dept: string): string[] => {
  const map: Record<string, string[]> = {
    'Отдел продаж': [
      'Автономная квалификация входящих лидов и выявление потребностей 24/7',
      'Интерактивный расчет сметы и формирование коммерческих предложений',
      'Автоматический дожим клиентов, отработка типовых возражений и выставление счетов',
      'Синхронизация сделок с CRM-системой (AmoCRM/Битрикс24) и ведение истории контактов',
      'Контроль повторных продаж и сбор обратной связи от постоянных клиентов',
      'Формирование аналитических отчетов по конверсии и выручке для руководства'
    ],
    'Отдел найма': [
      'Первичный автоматический скрининг входящих резюме и откликов соискателей',
      'Интерактивное собеседование в чате и проверка профессиональных навыков',
      'Автоматическая выдача и проверка тестовых заданий кандидатов',
      'Онбординг новых сотрудников и ответы по регламентам компании',
      'Сбор пакета документов и передача профилей финалистов руководителю',
      'Ведение базы кадрового резерва и повторный контакт с соискателями'
    ],
    'Сall-центр': [
      'Круглосуточный прием и обработка входящих текстовых и голосовых обращений',
      'Маршрутизация нестандартных вопросов на дежурного оператора',
      'Запись клиентов на консультации и подтверждение визитов в календаре',
      'Информирование о статусе заказов, доставки и готовности документов',
      'Сбор NPS и контроль удовлетворенности качеством сервиса',
      'Автоматизированная рассылка сервисных напоминаний и триггерных сообщений'
    ],
    'Call-центр': [
      'Круглосуточный прием и обработка входящих текстовых и голосовых обращений',
      'Маршрутизация нестандартных вопросов на дежурного оператора',
      'Запись клиентов на консультации и подтверждение визитов в календаре',
      'Информирование о статусе заказов, доставки и готовности документов',
      'Сбор NPS и контроль удовлетворенности качеством сервиса',
      'Автоматизированная рассылка сервисных напоминаний и триггерных сообщений'
    ],
    'Отдел маркетинга': [
      'Генерация продающих офферов, креативов и рекламных текстов под целевую аудиторию',
      'Сквозной анализ эффективности каналов трафика и конверсий',
      'Сегментация клиентской базы и запуск персонализированных триггерных рассылок',
      'A/B тестирование лид-магнитов и посадочных страниц',
      'Мониторинг цен и предложений прямых конкурентов в нише',
      'Автоматизированное ведение контент-плана и публикация материалов'
    ],
    'Отдел разработки': [
      'Автоматическая генерация и проверка серверного кода и SQL-запросов',
      'Развертывание и мониторинг баз данных React + BD ProTalk (PostgreSQL)',
      'Интеграция сторонних API сервисов, платежных шлюзов и Telegram Bot API',
      'Мониторинг серверных логов и диагностика системных процессов 24/7',
      'Автоматическое тестирование пользовательских сценариев',
      'Формирование технической документации и архитектурных спецификаций'
    ],
    'Делопроизводство': [
      'Автоматическое формирование типовых договоров, счетов и актов',
      'Распознавание реквизитов и проверка корректности входящих документов',
      'Регистрация входящей и исходящей корреспонденции в базе BD ProTalk',
      'Контроль сроков действия договоров и оплат',
      'Подготовка архивов документов по запросу бухгалтерии',
      'Отправка документов клиентам по Telegram и E-mail'
    ],
    'Юридический отдел': [
      'Экспресс-аудит договоров на скрытые юридические и финансовые риски',
      'Сверка условий контрактов с правовыми базами и регламентами',
      'Автоматизированная подготовка типовых претензий и допсоглашений',
      'Консультирование клиентов и менеджеров по правовым вопросам',
      'Мониторинг изменений законодательства в сфере деятельности компании',
      'Ведение реестра доверенностей и юридически значимых действий'
    ],
    'Копирайтинг': [
      'Рерайт и уникализация текстов под тональность бренда',
      'Создание статей, кейсов и экспертных публикаций для блога',
      'Адаптация материалов для кросспостинга в Telegram и соцсети',
      'Написание цепочек прогревающих писем для e-mail маркетинга',
      'SEO-оптимизация описаний карточек товаров и услуг',
      'Корректура и стилистическая вычитка корпоративных текстов'
    ]
  };
  return map[dept] || map['Отдел продаж'];
};

const loadInitialStep3Data = (): FormDataState => {
  const defaults: FormDataState = {
    fullName: '',
    company: '',
    product: '',
    city: 'Москва',
    avgSalary: null,
    employeeCount: '2',
    averageSalary: '75000',
    department: 'Отдел продаж',
    functionality: '',
    maintenance: 'Да',
    contactType: 'Telegram',
    contactValue: '',
    selectedExpertId: '',
    selectedExpert: 'Алексей Шишканов (Dr.White)',
    promoCode: '',
    tzText: '',
    tzFunctions: [],
    imageUrl: '',
    uploadedDocUrl: '',
    uploadedDocName: '',
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = sessionStorage.getItem('sav-calculator-data') || 
      localStorage.getItem('sav_calculator_data') || 
      localStorage.getItem('sav-calculator-data');
    const parsed = raw ? JSON.parse(raw) : {};

    const company = parsed.company || parsed.companyName || parsed.project ||
      sessionStorage.getItem('sav-company-name') || sessionStorage.getItem('sav-project-name') ||
      localStorage.getItem('sav_company_name') || localStorage.getItem('sav_project_name') || '';

    const tzOrFunc = cleanTzTextWithoutPageBreaks(parsed.functionality || parsed.technicalAssignment || parsed.tzText ||
      sessionStorage.getItem('sav-calculator-tz') || sessionStorage.getItem('sav-calculator-dictation') ||
      sessionStorage.getItem('sav-business-description') || '');

    const contactValue = parsed.contactValue || parsed.phone || parsed.contact ||
      sessionStorage.getItem('sav-user-phone') || localStorage.getItem('sav_contact_value') || localStorage.getItem('sav_user_phone') || '';
    const contactType = parsed.contactType || (contactValue.startsWith('@') ? 'Telegram' : 'Телефон');

    const fullName = parsed.fullName || parsed.clientName || parsed.full_name ||
      sessionStorage.getItem('sav-user-name') || localStorage.getItem('sav_user_name') || '';

    const product = parsed.product || '';
    const departmentRaw = parsed.department || defaults.department;
    const department = DEPARTMENT_LABELS[departmentRaw] || departmentRaw || defaults.department;

    return {
      ...defaults,
      ...parsed,
      fullName: fullName || defaults.fullName,
      company: company || defaults.company,
      product: product || defaults.product,
      functionality: tzOrFunc || defaults.functionality,
      department,
      employeeCount: String(parsed.employeeCount || defaults.employeeCount),
      averageSalary: String(parsed.averageSalary || parsed.salary || defaults.averageSalary),
      city: parsed.city || defaults.city,
      maintenance: parsed.maintenance || parsed.service || defaults.maintenance,
      contactType,
      contactValue,
      promoCode: parsed.promoCode || parsed.promo || '',
      selectedExpertId: parsed.selectedExpertId || defaults.selectedExpertId,
      selectedExpert: parsed.selectedExpert || defaults.selectedExpert,
      tzText: cleanTzTextWithoutPageBreaks(parsed.tzText || ''),
      tzFunctions: Array.isArray(parsed.tzFunctions) ? parsed.tzFunctions : [],
      imageUrl: parsed.imageUrl || '',
      uploadedDocUrl: parsed.uploadedDocUrl || '',
      uploadedDocName: parsed.uploadedDocName || '',
    };
  } catch (e) {
    console.warn('[loadInitialStep3Data] Error:', e);
  }
  return defaults;
};

const pageVariants = {
  initial: { opacity: 0, y: 15, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit: { opacity: 0, y: -10, filter: 'blur(4px)' },
};

export const CalculatorStep3: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile: telegramProfile } = useTelegramAuth();
  const { trackAction, saveSessionData } = useActionTracker('calculator');
  const { updateLead, existingLead, isLoaded: leadLoaded } = useLeadTracker();

  const [formData, setFormData] = useState<FormDataState>(() => loadInitialStep3Data());

  const [experts, setExperts] = useState<Expert[]>([]);
  const [expertsLoading, setExpertsLoading] = useState(true);
  const [selectedExpertModal, setSelectedExpertModal] = useState<Expert | null>(null);

  // Cascade generation states
  const [isGeneratingCascade, setIsGeneratingCascade] = useState(() => {
    try {
      const saved = sessionStorage.getItem('sav-calculator-data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.tzText && parsed.imageUrl && parsed.tzFunctions && parsed.tzFunctions.length > 0) {
          return false;
        }
      }
    } catch {}
    return true;
  });
  const [cascadeStage, setCascadeStage] = useState<'idle' | 'generating' | 'done'>('idle');
  const [isEditingTz, setIsEditingTz] = useState(false);
  const [editedTzText, setEditedTzText] = useState(() => formData.tzText || '');

  // Submit and PDF states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStage, setPdfStage] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  // Prevent duplicate execution ref
  const generationStartedRef = useRef(false);

  // Resolve stable User UID via uidHelper
  const getUserUid = (): string => {
    return resolveUserUidHelper(telegramProfile);
  };

  const handleStartNewCalculation = () => {
    startNewCalculation(formData, 'step3');
    toast({
      title: "Новый расчет создан",
      description: "Текущий расчет сохранен во вкладках. Вы можете вернуться к нему в любое время.",
    });
    navigate('/calculator/step1');
  };

  useEffect(() => {
    trackAction('visit_page', { page: '/calculator/step3' });
  }, []);

  // Fetch experts from BD ProTalk PostgreSQL
  useEffect(() => {
    const fetchExperts = async () => {
      setExpertsLoading(true);
      try {
        const { data, error } = await protalkDb
          .from('sav_experts')
          .select('*')
          .order('created_at', { ascending: true });
        
        if (!error && data && data.length > 0) {
          setExperts(data as any);
        }
      } catch (err) {
        console.warn('Error loading experts:', err);
      } finally {
        setExpertsLoading(false);
      }
    };
    fetchExperts();
  }, []);

  // Pre-fill from DB lead if available
  useEffect(() => {
    if (leadLoaded && existingLead) {
      setFormData(prev => ({
        ...prev,
        fullName: prev.fullName || existingLead.full_name || prev.fullName,
        company: prev.company || existingLead.project || prev.company,
        product: prev.product || existingLead.product || prev.product,
        city: prev.city || existingLead.city || prev.city,
        department: prev.department || existingLead.department || prev.department,
        functionality: prev.functionality || existingLead.functionality || prev.functionality,
        maintenance: prev.maintenance || existingLead.service || prev.maintenance,
        promoCode: prev.promoCode || existingLead.promo || prev.promoCode,
      }));
    }
  }, [leadLoaded, existingLead]);

  // Financial & ROI math calculation according to user rules:
  // 1. Current FOT (Employees * Salary)
  const employees = Math.max(1, parseInt(formData.employeeCount) || 1);
  const salary = parseInt(String(formData.averageSalary).replace(/\s+/g, '')) || 75000;
  const currentMonthlyFot = employees * salary;
  const currentAnnualFot = currentMonthlyFot * 12;

  // 2. One-time development cost: employees * average salary (e.g. 3 * 98 000 = 294 000 ₽)
  const baseDevCost = employees * salary;
  const hasPromo = Boolean(formData.promoCode && formData.promoCode.trim().length > 0);
  const promoDiscount = hasPromo ? Math.round(baseDevCost * 0.05) : 0; // 5% discount
  const finalBotCost = baseDevCost - promoDiscount; // e.g. 294 000 - 14 700 = 279 300 ₽

  // 3. Maintenance cost (10% of base development cost per month, if selected "Да")
  const isMaintenanceActive = formData.maintenance === 'Да' || formData.maintenance === '10%' || formData.maintenance === 'true';
  const monthlyMaintenanceCost = isMaintenanceActive ? Math.round(baseDevCost * 0.10) : 0; // e.g. 29 400 ₽/мес
  const annualMaintenanceCost = monthlyMaintenanceCost * 12;

  // 4. Software & AI tokens
  // Integration service subscription: 2 900 ₽/month
  const integrationServiceMonthly = 2900;
  // Tokens per replaced staff member: ~15% of 1 employee salary
  const tokensPerAiMonthly = Math.round(salary * 0.15);
  const replacedStaffCount = Math.max(1, employees - 1); // 1 human supervisor remains, rest replaced
  const monthlyTokensTotal = tokensPerAiMonthly * replacedStaffCount;
  const monthlySoftCost = integrationServiceMonthly + monthlyTokensTotal;
  const annualSoftCost = monthlySoftCost * 12;

  // 5. Human operator supervision (1 employee + AI replaces up to 5 employees productivity)
  const monthlyHumanSupport = salary; // 1 supervisor salary
  const annualHumanSupport = monthlyHumanSupport * 12;

  // 6. Payback period calculation
  const monthlyGrossSavings = replacedStaffCount * salary;
  const monthlyOngoingExpenses = monthlyMaintenanceCost + monthlySoftCost;
  const monthlyNetBenefit = Math.max(1000, monthlyGrossSavings - monthlyOngoingExpenses);
  const paybackMonths = +(finalBotCost / monthlyNetBenefit).toFixed(1);
  const paybackDays = Math.max(14, Math.round(paybackMonths * 30));

  // 7. Net annual savings
  const firstYearTotalExpenses = finalBotCost + annualMaintenanceCost + annualSoftCost + annualHumanSupport;
  const annualSavingsYear1 = Math.max(0, currentAnnualFot - firstYearTotalExpenses);
  const subsequentYearTotalExpenses = annualMaintenanceCost + annualSoftCost + annualHumanSupport;
  const annualSavingsSubsequent = Math.max(0, currentAnnualFot - subsequentYearTotalExpenses);
  const annualSavings = annualSavingsYear1; // Default reference for legacy displays

  // Run cascade generation (Image + TZ) on mount
  useEffect(() => {
    if (generationStartedRef.current) return;

    // Check if results were already generated and stored
    if (formData.tzText && formData.tzFunctions && formData.tzFunctions.length > 0 && formData.imageUrl) {
      setCascadeStage('done');
      setIsGeneratingCascade(false);
      return;
    }

    generationStartedRef.current = true;
    let isCancelled = false;

    const runCascade = async () => {
      setIsGeneratingCascade(true);
      setCascadeStage('generating');

      let generatedImg = formData.imageUrl || '';
      let generatedTz = formData.tzText || '';
      let generatedFns = formData.tzFunctions || [];
      const userUid = getUserUid();

      const companyTarget = (formData.company || 'Компания клиента').trim();
      const productTarget = (formData.product || 'Услуги и продукты компании').trim();
      const funcTarget = (formData.functionality || 'Автономная обработка задач и роботизация подразделения').trim();
      const deptTarget = formData.department || 'Отдел продаж';
      const empTarget = employees;
      const cityTarget = formData.city || 'Москва';

      try {
        const [imgRes, tzRes] = await Promise.all([
          // 1. Parallel 16:9 Image generation (Collage PC + Mobile Liquid Glass Steampunk with Robot)
          (!generatedImg)
            ? fetch('/api/v1/ai/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyName: companyTarget,
                  businessDescription: `для роботизации подразделения «${deptTarget}» (${empTarget} сотрудников), продукт: "${productTarget}"`,
                  mode: 'app',
                  type: 'app',
                  userUid,
                  chat_id: userUid,
                  timeoutSeconds: 55
                })
              }).then(r => r.json()).catch(err => {
                console.warn('[Parallel Image Gen Error]', err);
                return null;
              })
            : Promise.resolve({ success: true, imageUrl: generatedImg }),

          // 2. Parallel TZ Generation with exact function count = employees
          (!generatedTz || generatedFns.length === 0)
            ? fetch('/api/v1/ai/calculator/tz-gen', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  companyName: companyTarget,
                  product: productTarget,
                  city: cityTarget,
                  department: deptTarget,
                  employeeCount: empTarget,
                  averageSalary: salary,
                  salary: salary,
                  functionality: funcTarget,
                  userUid,
                  chat_id: userUid
                })
              }).then(r => r.json()).catch(err => {
                console.warn('[Parallel TZ Gen Error]', err);
                return null;
              })
            : Promise.resolve({ success: true, tzText: generatedTz, functionsList: generatedFns })
        ]);

        if (imgRes && imgRes.success && imgRes.imageUrl) {
          generatedImg = imgRes.imageUrl;
        }

        if (tzRes && tzRes.success) {
          if (tzRes.tzText) generatedTz = tzRes.tzText;
          if (Array.isArray(tzRes.functionsList) && tzRes.functionsList.length > 0) {
            generatedFns = tzRes.functionsList;
          }
        }
      } catch (parallelErr) {
        console.warn('[Parallel Cascade Execution Note]', parallelErr);
      } finally {
        if (isCancelled) return;

        // Ensure functionsList strictly has exact 'empTarget' items
        const deptList = getDeptFallbackFunctions(deptTarget);
        if (generatedFns.length !== empTarget) {
          if (generatedFns.length < empTarget) {
            const needed = empTarget - generatedFns.length;
            for (let i = 0; i < needed; i++) {
              const fallbackItem = deptList[(generatedFns.length + i) % deptList.length] || `Автономный модуль ${generatedFns.length + i + 1}: роботизация задач подразделения`;
              generatedFns.push(fallbackItem);
            }
          } else {
            generatedFns = generatedFns.slice(0, empTarget);
          }
        }

        if (!generatedTz) {
          generatedTz = `# Техническое задание на разработку автономного ИИ-приложения\n\n### 1. Общие сведения\n- **Заказчик**: «${companyTarget}» (${cityTarget})\n- **Сфера / Продукт**: ${productTarget}\n- **Подразделение**: «${deptTarget}» (${empTarget} сотрудников)\n- **Архитектурный стек**: React 18 + BD ProTalk (PostgreSQL, Россия) + Telegram Bot API\n\n### 2. Ключевые автономные модули системы (${empTarget} функций — замещение ${empTarget} сотрудников):\n${generatedFns.map((fn, idx) => `${idx + 1}. **Модуль ${idx + 1}**: ${fn}`).join('\n')}\n\n### 3. Требования к интерфейсу и безопасности\n- Премиальный дизайн Liquid Glass Apple, адаптивный интерфейс для ПК и мобильных устройств.\n- Защищенная облачная база данных BD ProTalk (PostgreSQL) с авто-сохранением состояния и устойчивостью к сбоям.\n- Двустороннее логирование операций и мгновенные уведомления руководству.\n\n### 4. Экономический результат\n- Высвобождение фонда оплаты труда ${empTarget} сотрудников (${currentAnnualFot.toLocaleString('ru-RU')} ₽ / год).\n- Окупаемость инвестиций за ~${paybackDays} дней.`;
        }

        const sanitizedTz = cleanTzTextWithoutPageBreaks(generatedTz);
        setFormData(prev => {
          const updated = {
            ...prev,
            imageUrl: generatedImg,
            tzText: sanitizedTz,
            tzFunctions: generatedFns
          };
          sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
          return updated;
        });

        setEditedTzText(sanitizedTz);
        setCascadeStage('done');
        setIsGeneratingCascade(false);
      }
    };

    runCascade();

    return () => {
      isCancelled = true;
    };
  }, []); // Run on mount

  const handleSelectExpert = (expert: Expert) => {
    const name = `${expert.greeting || ''}${expert.pseudonym || ''}`.trim() || 'Dr.White';
    setFormData(prev => {
      const updated = {
        ...prev,
        selectedExpertId: String(expert.id),
        selectedExpert: name,
      };
      sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
      return updated;
    });
    updateLead({ selected_expert: name });
    toast({
      title: "Эксперт назначен",
      description: `Куратором проекта выбран: ${name}`,
    });
  };

  const handleSaveTzChanges = () => {
    setIsEditingTz(false);
    setFormData(prev => {
      const updated = {
        ...prev,
        tzText: editedTzText
      };
      sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
      return updated;
    });
    toast({
      title: "ТЗ обновлено",
      description: "Ваши правки в техническое задание успешно сохранены.",
    });
  };

  // Sequential Flow: Download PDF -> Upload -> Send Telegram Notification
  const handleDownloadPdfAndNotify = async () => {
    setIsDownloadingPdf(true);
    setPdfProgress(5);
    setPdfStage('Инициализация сметы и расчетов...');
    trackAction('download_pdf', { page: '/calculator/step3', value: formData.company });

    try {
      // 1. Generate local PDF file with all complete fields and live progress
      const pdfResult = await generateEstimatePdf({
        company: formData.company || 'Клиент',
        department: formData.department,
        employeeCount: employees,
        averageSalary: salary,
        currentAnnualFot,
        finalBotCost,
        annualSavings,
        paybackDays,
        selectedExpert: formData.selectedExpert || 'Алексей Шишканов (Dr.White)',
        promoCode: formData.promoCode,
        tzFunctions: formData.tzFunctions || [],
        tzText: formData.tzText || '',
        city: formData.city,
        imageUrl: formData.imageUrl,
        fullName: formData.fullName,
        contactValue: formData.contactValue,
        contactType: formData.contactType,
        product: formData.product,
        maintenance: formData.maintenance,
        uploadedDocName: formData.uploadedDocName
      }, (percent, stage) => {
        setPdfProgress(percent);
        setPdfStage(stage);
      });

      // Trigger instant browser download
      const link = document.createElement('a');
      link.href = pdfResult.downloadUrl;
      link.download = pdfResult.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 2. Upload metadata to server and register PDF in DB
      let serverPdfUrl = '';
      try {
        const uploadRes = await fetch('/api/v1/ai/calculator/upload-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: pdfResult.filename,
            company: formData.company,
            userUid: getUserUid(),
            calculationData: {
              ...formData,
              finalBotCost,
              annualSavings,
              paybackDays
            }
          })
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success && uploadData.pdfUrl) {
          serverPdfUrl = uploadData.pdfUrl;
        }
      } catch (uploadErr) {
        console.warn('PDF upload server note:', uploadErr);
      }

      // 3. Dispatch enriched notification to Telegram with PDF link
      const chatId = getUserUid();
      await fetch('/api/v1/ai/calculator/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          fullName: formData.fullName || 'Клиент',
          company: formData.company || 'Проект автоматизации',
          product: formData.product || 'Услуги компании',
          city: formData.city || 'РФ',
          department: formData.department,
          employeeCount: String(employees),
          averageSalary: String(salary),
          selectedExpert: formData.selectedExpert || 'Алексей Шишканов (Dr.White)',
          functionality: cleanTzTextWithoutPageBreaks(formData.tzText || formData.functionality || 'Роботизация'),
          maintenance: formData.maintenance || 'Да',
          promoCode: formData.promoCode || '',
          finalBotCost,
          annualSavings,
          paybackDays,
          pdfUrl: serverPdfUrl,
          phone: formData.contactValue || telegramProfile?.phone || '',
          contactValue: formData.contactValue || telegramProfile?.phone || '',
          contactType: formData.contactType || 'Telegram',
          preferredChannel: formData.contactType || 'Telegram',
          uploadedDocUrl: formData.uploadedDocUrl || '',
          uploadedDocName: formData.uploadedDocName || '',
          imageUrl: formData.imageUrl || ''
        })
      });

      toast({
        title: "PDF смета сформирована!",
        description: "Файл загружен на ваше устройство и зарегистрирован в системе.",
      });
    } catch (err) {
      console.error('PDF export error:', err);
      toast({
        title: "Ошибка генерации PDF",
        description: "Пожалуйста, попробуйте еще раз.",
        variant: "destructive"
      });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Submit complete calculation payload to Telegram & CRM
  const handleSubmitCalculation = async () => {
    trackAction('submit_calculator', { page: '/calculator/step3', value: formData.promoCode || 'no-promo' });
    
    const finalData = {
      ...formData,
      finalBotCost,
      annualSavings,
      paybackDays,
      step: 'submitted'
    };

    saveSessionData(finalData as any);
    updateLead({
      promo: formData.promoCode || undefined,
      selected_expert: formData.selectedExpert || 'Алексей Шишканов (Dr.White)',
      service: formData.maintenance,
    });

    setIsSubmitting(true);
    setIsComplete(true);

    const chatId = getUserUid();

    const payload = {
      chat_id: chatId,
      fullName: formData.fullName || '',
      company: formData.company || '',
      product: formData.product || '',
      city: formData.city || '',
      department: DEPARTMENT_LABELS[formData.department] || formData.department || 'Отдел продаж',
      employeeCount: String(employees),
      averageSalary: String(salary),
      selectedExpert: formData.selectedExpert || 'Алексей Шишканов (Dr.White)',
      functionality: cleanTzTextWithoutPageBreaks(formData.tzText || formData.functionality || 'Роботизация'),
      maintenance: formData.maintenance || 'Да',
      promoCode: formData.promoCode || '',
      finalBotCost,
      annualSavings,
      paybackDays,
      phone: formData.contactValue || telegramProfile?.phone || '',
      contactValue: formData.contactValue || telegramProfile?.phone || '',
      contactType: formData.contactType || 'Telegram',
      preferredChannel: formData.contactType || 'Telegram',
      imageUrl: formData.imageUrl || '',
      uploadedDocUrl: formData.uploadedDocUrl || '',
      uploadedDocName: formData.uploadedDocName || ''
    };

    try {
      // 1. Submit to internal API route with instant Telegram notification
      await fetch('/api/v1/ai/calculator/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // 2. Submit to external Google Sheets script as backup
      try {
        await fetch(SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            formUrl: FORM_URL,
            chat_id: chatId,
            'ФИО': formData.fullName || '',
            'Компания': formData.company || '',
            'Продукт': formData.product || '',
            'Город': formData.city || '',
            'Подразделение': payload.department,
            'Сотрудников': String(employees),
            'Средняя ЗП': String(salary),
            'Выбранный эксперт': formData.selectedExpert || 'Dr.White',
            'Функционал': payload.functionality,
            'Обслуживание': formData.maintenance || 'Да',
            'Промокод': formData.promoCode || '',
            'Контакт': formData.contactValue || telegramProfile?.phone || '',
            'Канал связи': formData.contactType || 'Telegram',
            'Стоимость внедрения': `${finalBotCost.toLocaleString('ru-RU')} ₽`,
            'Годовая экономия': `${annualSavings.toLocaleString('ru-RU')} ₽`,
            'Окупаемость': `${paybackDays} дней`,
          })
        });
      } catch (gScriptErr) {
        console.warn('Google Script backup notice:', gScriptErr);
      }

      // 3. Save into BD ProTalk calculation logs
      try {
        await protalkDb.from('sav_user_calculations').insert({
          id: `calc_${Date.now()}`,
          calculation_type: 'AI_APP_DEPARTMENT_REPLACEMENT',
          company_name: formData.company,
          business_description: formData.functionality,
          package_level: 'CUSTOM_REACT_PROTALK',
          image_url: formData.imageUrl || null,
          telegram_id: telegramProfile?.telegram_id || null,
          data: JSON.stringify(payload)
        });
      } catch (dbLogErr) {
        console.warn('DB calculation log note:', dbLogErr);
      }

      // Preserve data locally so that reload never wipes user input
      const persistedState = { ...formData, ...payload, step: 'submitted' };
      sessionStorage.setItem('sav-calculator-data', JSON.stringify(persistedState));
      localStorage.setItem('sav_calculator_data', JSON.stringify(persistedState));
      localStorage.setItem('sav-calculator-data', JSON.stringify(persistedState));
      setSubmitError(false);

      toast({
        title: "Смета и ТЗ успешно сформированы!",
        description: "Коммерческое предложение передано эксперту и выслано в Telegram.",
      });
    } catch (error) {
      console.error('Submit error:', error);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4 sm:p-6 md:p-8 bg-transparent">
        <Header onLogoClick={() => navigate('/')} />

        {/* Calculation tabs allowing switching or starting new calculation */}
        <CalculatorTabs
          currentData={formData}
          currentStep="step3"
          onDataLoaded={(newData) => setFormData(prev => ({ ...prev, ...newData }))}
        />

        <main className="w-full max-w-4xl flex-grow pt-2">
          <div className="rounded-2xl bg-black/75 backdrop-blur-2xl border border-amber-400/40 p-6 sm:p-10 text-center shadow-2xl relative">
            <Rivets />
            <RealisticSmokeBackdrop speed="fast" opacity={0.5} className="-top-6 -left-10 w-[calc(100%+80px)] h-[120px]" />

            {submitError ? (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Ошибка отправки расчёта</h3>
                <p className="text-sm sm:text-base text-zinc-300 max-w-md mx-auto">
                  Не удалось передать данные автоматически. Вы можете продублировать заявку через форму:
                </p>
                <a 
                  href="https://docs.google.com/forms/d/e/1FAIpQLSdSARiTa4zYB-sYseymb3Q0C1Y_dBh8oDLavON_2mTu8o574w/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-amber-300 hover:text-amber-200 underline text-sm sm:text-base font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Открыть форму</span>
                </a>
              </div>
            ) : isSubmitting ? (
              <div className="py-12 space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-amber-400 mx-auto" />
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                  Формируем персональное коммерческое предложение...
                </h3>
                <p className="text-sm sm:text-base text-zinc-400">Пожалуйста, подождите несколько секунд</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(231,199,104,0.4)]">
                  <Check className="w-8 h-8 text-amber-400" />
                </div>

                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                    Смета и ТЗ успешно сформированы!
                  </h3>
                  <p className="text-sm sm:text-base text-zinc-300 mt-2 max-w-lg mx-auto">
                    Итоговая смета на разработку ИИ-приложения (React + BD ProTalk) и проект технического решения высланы в Telegram бот.
                  </p>
                </div>

                {/* Calculation Summary Box in Liquid Glass Apple style */}
                <div className="p-5 sm:p-6 rounded-2xl bg-black/60 border border-amber-400/30 max-w-xl mx-auto space-y-4 text-left relative">
                  <Rivets />
                  <div className="text-sm sm:text-base font-bold text-amber-200 border-b border-amber-400/20 pb-2 flex items-center justify-between">
                    <span>Итоги сметы для компании «{formData.company || 'Проект'}»</span>
                    <span className="text-amber-300 font-mono">{formData.city || 'РФ'}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 text-sm sm:text-base">
                    <div>
                      <span className="text-zinc-400">Стоимость разработки:</span>
                      <div className="font-bold text-base sm:text-lg text-amber-300 font-mono">
                        {finalBotCost.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400">Срок окупаемости:</span>
                      <div className="font-bold text-base sm:text-lg text-amber-200 font-mono">
                        ~{paybackDays} дней
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400">Годовая экономия ФОТ:</span>
                      <div className="font-bold text-base sm:text-lg text-white font-mono">
                        {annualSavings.toLocaleString('ru-RU')} ₽ / год
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-400">Назначенный эксперт:</span>
                      <div className="font-bold text-base text-amber-200 truncate">
                        {formData.selectedExpert}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 text-sm text-zinc-300">
                    <span className="text-amber-300 font-medium">Стек разработки:</span> React 18 + защищенная база данных BD ProTalk (PostgreSQL) + Telegram Bot API + AI Core.
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <a
                    href="https://t.me/SAV_AIbot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-gradient-to-r from-amber-400/30 via-yellow-400/40 to-amber-500/30 hover:from-amber-400/40 hover:to-amber-500/50 text-amber-200 border border-amber-400/50 shadow-[0_0_20px_rgba(231,199,104,0.35)] backdrop-blur-md hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
                  >
                    <Send className="w-5 h-5" />
                    <span>Перейти в Telegram бот</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleStartNewCalculation}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-500/15 hover:from-amber-400/30 hover:to-amber-500/25 text-amber-200 border border-amber-400/40 hover:border-amber-400/70 transition-all text-sm sm:text-base font-medium flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md shadow-[0_0_15px_rgba(231,199,104,0.2)]"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Новый расчет</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-white/5 to-white/10 hover:from-white/10 hover:to-white/15 text-zinc-300 hover:text-white border border-white/15 transition-all text-sm sm:text-base font-medium cursor-pointer backdrop-blur-md"
                  >
                    На главную страницу
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-3 sm:p-6 md:p-8 bg-transparent">
      <Header onLogoClick={() => navigate('/')} />

      {/* 3D Liquid Glass PDF Generation Progress Modal */}
      {isDownloadingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl transition-all">
          <div className="relative w-full max-w-lg rounded-2xl liquid-bubble-plate border border-amber-400/60 p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.35)] space-y-6 overflow-hidden">
            <RealisticSmokeBackdrop speed="fast" opacity={0.65} className="-top-10 -left-10 w-[calc(100%+80px)] h-[120px]" />
            <Rivets />
            <span className="liquid-bubble-glare" />

            <div className="relative z-10 text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl liquid-bubble-secondary border border-amber-400/50 shadow-[0_0_20px_rgba(231,199,104,0.3)] mb-1">
                <FileText className="w-7 h-7 text-amber-400 animate-pulse" />
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">
                Формирование PDF сметы
              </h3>
              <p className="text-sm text-zinc-300">
                Индивидуальная смета и техническое задание под ключ (React + PostgreSQL BD ProTalk)
              </p>
            </div>

            {/* Progress Bar & Percentage */}
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between text-sm font-mono">
                <span className="text-zinc-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span className="text-amber-200 font-sans">{pdfStage || 'Подготовка документа...'}</span>
                </span>
                <span className="text-lg font-bold text-amber-300">
                  {pdfProgress}%
                </span>
              </div>

              <div className="h-4 rounded-full bg-black/80 border border-amber-400/40 p-0.5 relative overflow-hidden shadow-inner">
                <div
                  className="h-full rounded-full liquid-bubble-gold transition-all duration-300 relative shadow-[0_0_15px_rgba(245,158,11,0.7)]"
                  style={{ width: `${Math.max(5, Math.min(100, pdfProgress))}%` }}
                >
                  <span className="liquid-bubble-glare" />
                </div>
              </div>

              <p className="text-sm text-center text-zinc-400 pt-1">
                Пожалуйста, не закрывайте страницу. Идет сборка страниц A4 с высоким разрешением, интерактивными ссылками и расчетом.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unified Expert Details Modal */}
      <ExpertDetailModal
        isOpen={Boolean(selectedExpertModal)}
        expert={selectedExpertModal}
        onClose={() => setSelectedExpertModal(null)}
        onSelect={(expert) => {
          handleSelectExpert(expert);
          setSelectedExpertModal(null);
        }}
        isSelected={String(selectedExpertModal?.id) === String(formData.selectedExpertId)}
      />

      {/* When generating cascade: show ONLY atmospheric background animations and the waiting overlay */}
      {isGeneratingCascade ? (
        <div className="w-full flex-grow flex items-center justify-center relative min-h-[70vh]">
          <RealisticSmokeBackdrop speed="normal" opacity={0.5} className="fixed inset-0 w-full h-full pointer-events-none" />
          <ProTalkCountdownOverlay
            title="Формирование сметы, ТЗ и визуализации ИИ-приложения"
            badgeText="Каскадный синтез архитектуры SAV AI"
            stagesType="estimate_generation"
            companyName={formData.company}
            department={formData.department}
            employeeCount={employees}
            expertName={formData.selectedExpert}
            maxSeconds={100}
            onCancel={() => setIsGeneratingCascade(false)}
          />
        </div>
      ) : (
        <main className="w-full max-w-6xl flex-grow pt-2">
          {/* Calculation tabs allowing switching or starting new calculation */}
          <CalculatorTabs
            currentData={formData}
            currentStep="step3"
            onDataLoaded={(newData) => setFormData(prev => ({ ...prev, ...newData }))}
          />

          <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="w-full space-y-6"
          >
          {/* Header with smoke effect */}
          <div className="relative text-center">
            <RealisticSmokeBackdrop speed="fast" opacity={0.62} className="-top-6 -left-10 w-[calc(100%+80px)] h-[130px]" />
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent drop-shadow-lg tracking-tight">
              Смета, ТЗ и визуализация ИИ-приложения
            </h2>
            <p className="text-sm sm:text-base text-zinc-300 mt-1 max-w-2xl mx-auto">
              Шаг 3 из 3: Индивидуальная разработка системы (React + PostgreSQL BD ProTalk), заменяющей отдел «{formData.department}» ({employees} чел.)
            </p>
          </div>

          {/* Progress bar in Liquid Glass Apple style */}
          <div className="w-full max-w-4xl mx-auto">
            <div className="flex justify-between text-sm text-amber-200/90 font-medium mb-1.5 px-1">
              <span>Шаг 3: Смета разработки и утверждение ТЗ</span>
              <span>100%</span>
            </div>
            <div className="h-2.5 bg-black/60 backdrop-blur-md rounded-full overflow-hidden border border-white/10 p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(231,199,104,0.6)]" 
                style={{ width: '100%' }} 
              />
            </div>
          </div>

          {/* SECTION 1: TECHNICAL ASSIGNMENT & VISUALIZATION */}
          <div className="rounded-2xl bg-transparent backdrop-blur-2xl border border-amber-400/35 p-5 sm:p-7 shadow-2xl relative space-y-6 overflow-hidden">
            <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
            <Rivets />
            
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-400/20 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <span>1. Техническое задание и визуализация системы (React + PostgreSQL BD ProTalk)</span>
                </h3>
                <p className="text-sm text-zinc-300 mt-0.5">
                  Архитектурный проект и функциональная спецификация под процессы «{formData.company || 'Вашей компании'}»
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleStartNewCalculation}
                  className="liquid-bubble-secondary relative overflow-hidden px-4 py-2 rounded-xl text-amber-200 text-sm flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_12px_rgba(231,199,104,0.2)]"
                  title="Сбросить поля и начать новый расчет с сохранением текущего во вкладках"
                >
                  <span className="liquid-bubble-glare" />
                  <Plus className="w-4 h-4 text-amber-400 relative z-10" />
                  <span className="relative z-10">Новый расчет</span>
                </button>

                {isEditingTz ? (
                  <button
                    type="button"
                    onClick={handleSaveTzChanges}
                    className="liquid-bubble-gold relative overflow-hidden px-4 py-2 rounded-xl font-bold text-amber-950 text-sm flex items-center gap-1.5 shadow-[0_0_15px_rgba(231,199,104,0.45)] cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <span className="liquid-bubble-glare" />
                    <Check className="w-4 h-4 text-amber-950 relative z-10" />
                    <span className="relative z-10">Сохранить правки</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTz(true)}
                    className="liquid-bubble-secondary relative overflow-hidden px-4 py-2 rounded-xl text-amber-200 hover:text-white text-sm flex items-center gap-1.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_10px_rgba(231,199,104,0.15)]"
                  >
                    <span className="liquid-bubble-glare" />
                    <Edit3 className="w-4 h-4 text-amber-400 relative z-10" />
                    <span className="relative z-10">Редактировать ТЗ</span>
                  </button>
                )}
              </div>
            </div>

            {/* 16:9 Architectural Solution Banner */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-amber-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-400" />
                <span>Пример интерфеса приложения</span>
              </div>

              <div className="liquid-bubble-plate rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-amber-400/40">
                <Rivets />
                <span className="liquid-bubble-glare" />
                {formData.imageUrl ? (
                  <img
                    src={formData.imageUrl}
                    alt="Пример интерфеса приложения"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover relative z-10"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3 relative z-10">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-400 mx-auto" />
                    <p className="text-sm text-zinc-400">Генерация архитектурной визуализации интерфейса...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Exact Functions List Cards (Strictly = employeeCount) */}
            <div className="space-y-3">
              <div className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                <span>Ключевые автономные функции приложения ({(formData.tzFunctions && formData.tzFunctions.length > 0 ? formData.tzFunctions.length : employees)} шт. по 1 на сотрудника):</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(formData.tzFunctions && formData.tzFunctions.length > 0 ? formData.tzFunctions : Array.from({ length: employees })).map((fn, idx) => {
                  const cleanFn = typeof fn === 'string'
                    ? fn.trim().replace(/^[-•*]\s*/, '').replace(/^\d+[\.\)]\s*/, '').replace(/[;,]+$/, '').trim()
                    : `Автоматизация задач сотрудника ${idx + 1} для подразделения ${formData.department}`;
                  return (
                    <div
                      key={idx}
                      className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 hover:border-amber-400/60 transition-all relative overflow-hidden"
                    >
                      <Rivets />
                      <span className="liquid-bubble-glare" />
                      <div className="relative z-10 flex items-center justify-between text-sm text-amber-300 font-mono">
                        <span>Модуль {idx + 1} • Замещение сотрудника {idx + 1}</span>
                        <span className="text-zinc-400">Автономный режим 24/7</span>
                      </div>
                      <div className="relative z-10 text-sm sm:text-base font-medium text-white leading-snug">
                        {cleanFn}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Full Technical Assignment Text (Styled UI Markdown) */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-zinc-300">
                  Техническое задание
                </label>
                {isEditingTz && (
                  <span className="text-sm text-amber-300/90 font-mono px-3 py-1 rounded-lg bg-black/50 border border-amber-400/20">
                    Режим редактирования
                  </span>
                )}
              </div>

              {isEditingTz ? (
                <textarea
                  rows={14}
                  value={editedTzText}
                  onChange={(e) => setEditedTzText(e.target.value)}
                  placeholder="Введите или отредактируйте техническое задание..."
                  className="w-full px-4 py-3 rounded-2xl bg-black/75 border border-amber-400/50 text-white font-mono text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-400 leading-relaxed"
                />
              ) : (
                <div className="liquid-bubble-plate p-5 sm:p-6 rounded-2xl text-zinc-100 text-sm sm:text-base leading-relaxed max-h-[420px] overflow-y-auto space-y-3 prose prose-invert max-w-none shadow-inner relative">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent mt-4 mb-2 pb-1.5 border-b border-amber-400/30">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-base sm:text-lg font-bold text-amber-200 mt-3 mb-1.5 flex items-center gap-1.5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm sm:text-base font-semibold text-amber-100 mt-2.5 mb-1">
                            {children}
                          </h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-zinc-200 leading-relaxed my-1.5 text-sm sm:text-base">
                            {children}
                          </p>
                        ),
                        ul: ({ children }) => (
                          <ul className="space-y-1.5 my-2 pl-4 list-disc marker:text-amber-400 text-zinc-200 text-sm sm:text-base">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="space-y-1.5 my-2 pl-4 list-decimal marker:text-amber-400 text-zinc-200 text-sm sm:text-base">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="pl-1 leading-snug">
                            {children}
                          </li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-bold text-amber-300">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic text-amber-100/90">
                            {children}
                          </em>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="p-3 my-2 rounded-xl bg-amber-400/10 border-l-4 border-amber-400 text-amber-100 text-sm sm:text-base italic">
                            {children}
                          </blockquote>
                        ),
                        code: ({ children }) => (
                          <code className="px-2 py-0.5 rounded-lg bg-black/80 border border-amber-400/30 text-amber-300 font-mono text-sm">
                            {children}
                          </code>
                        )
                      }}
                    >
                      {formData.tzText || 'Формирование ТЗ...'}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: ESTIMATE & ROI */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">
            {/* Left Column (7/12 on desktop): Financial dashboard & live ROI metrics */}
            <div className="lg:col-span-7 rounded-2xl bg-transparent backdrop-blur-2xl border border-amber-400/35 p-5 sm:p-7 shadow-2xl relative space-y-6 overflow-hidden">
              <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
              <Rivets />
              <div className="relative z-10">
                <h3 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  <span>2. Смета, финансовый расчёт и окупаемость</span>
                </h3>
                <p className="text-sm text-zinc-300 mt-1">
                  Сравнение текущих расходов на фонд оплаты труда ({employees} чел.) с внедрением автономного ИИ-приложения
                </p>
              </div>

              {/* 6 Bento Cards according to Financial Formula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Block 1: Cost of Implementation */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>1. Разработка приложения</span>
                      {hasPromo && (
                        <span className="liquid-bubble-secondary text-sm text-amber-300 px-2.5 py-0.5 rounded font-mono border border-amber-400/40">
                          Скидка 5%
                        </span>
                      )}
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono mt-1">
                      {finalBotCost.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      {hasPromo ? (
                        <span>Базовая: {baseDevCost.toLocaleString('ru-RU')} ₽ (скидка {promoDiscount.toLocaleString('ru-RU')} ₽)</span>
                      ) : (
                        <span>Разовая инвестиция под ключ (React + PostgreSQL BD ProTalk)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block 2: Software & AI Tokens */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>2. Софт и токены нейросети</span>
                      <Cpu className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-200 font-mono mt-1">
                      {monthlySoftCost.toLocaleString('ru-RU')} ₽ / мес
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      Сервис {integrationServiceMonthly.toLocaleString('ru-RU')} ₽ + токены ~{monthlyTokensTotal.toLocaleString('ru-RU')} ₽ ({annualSoftCost.toLocaleString('ru-RU')} ₽ / год)
                    </div>
                  </div>
                </div>

                {/* Block 3: Maintenance (10% per month) */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>3. Сопровождение (10%)</span>
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-1">
                      {monthlyMaintenanceCost.toLocaleString('ru-RU')} ₽ / мес
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      {isMaintenanceActive ? (
                        <span>10% от стоимости разработки ({annualMaintenanceCost.toLocaleString('ru-RU')} ₽ / год)</span>
                      ) : (
                        <span>Техподдержка не выбрана (0 ₽)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Block 4: Human Operator Support (80% automation) */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>4. Оператор + ИИ (80% задач)</span>
                      <Users className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-100 font-mono mt-1">
                      1 оператор
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      1 оператор + ИИ заменяют {employees} сотрудников (ЗП: {monthlyHumanSupport.toLocaleString('ru-RU')} ₽/мес)
                    </div>
                  </div>
                </div>

                {/* Block 5: Payback Period */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-zinc-400">
                      <span>5. Срок окупаемости</span>
                      <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-amber-200 font-mono mt-1">
                      ~{paybackDays} дней
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      ~{paybackMonths} мес. за счёт чистой экономии {monthlyNetBenefit.toLocaleString('ru-RU')} ₽ / мес
                    </div>
                  </div>
                </div>

                {/* Block 6: Net Annual Savings */}
                <div className="liquid-bubble-plate p-4 rounded-xl space-y-1.5 relative overflow-hidden border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-sm text-amber-300 font-medium">
                      <span>6. Чистая экономия</span>
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">
                      {annualSavingsYear1.toLocaleString('ru-RU')} ₽
                    </div>
                    <div className="text-sm text-amber-200/90 mt-1">
                      1-й год: {annualSavingsYear1.toLocaleString('ru-RU')} ₽, со 2-го: {annualSavingsSubsequent.toLocaleString('ru-RU')} ₽ / год
                    </div>
                  </div>
                </div>
              </div>

              {/* FOT Comparison Strip */}
              <div className="liquid-bubble-plate p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm relative overflow-hidden">
                <Rivets />
                <span className="liquid-bubble-glare" />
                <div className="relative z-10">
                  <span className="text-zinc-400">Текущий годовой ФОТ отдела ({employees} чел.):</span>
                  <div className="text-lg font-bold text-zinc-100 font-mono">
                    {currentAnnualFot.toLocaleString('ru-RU')} ₽ / год
                  </div>
                </div>
                <div className="relative z-10 text-left sm:text-right">
                  <span className="text-zinc-400">Ежемесячный ФОТ до автоматизации:</span>
                  <div className="text-base font-semibold text-amber-300 font-mono">
                    {currentMonthlyFot.toLocaleString('ru-RU')} ₽ / мес
                  </div>
                </div>
              </div>

              {/* Scope of delivery & Stack */}
              <div className="liquid-bubble-plate p-5 rounded-xl space-y-3 text-sm relative overflow-hidden">
                <Rivets />
                <span className="liquid-bubble-glare" />
                <div className="relative z-10 font-bold text-amber-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Что входит в поставку ИИ-приложения:</span>
                </div>
                <ul className="relative z-10 space-y-2 text-zinc-300">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Индивидуальный веб-интерфейс на React 18 в стиле Liquid Glass Apple (ПК + Мобильная версия).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Защищенная облачная база данных BD ProTalk (PostgreSQL) с авто-сохранением состояния и устойчивостью к перезагрузкам.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Ровно <b>{employees} автономных модулей</b>, закрывающих 80% обязанностей {employees} сотрудников подразделения.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Эффективная связка: 1 штатный оператор + ИИ-приложение с производительностью целого отдела.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Подключение сервиса нейросетей (2 900 ₽/мес) и предварительный пакет рабочих токенов.</span>
                  </li>
                  {isMaintenanceActive && (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Ежемесячное техническое сопровождение и дообучение моделей: <b>{monthlyMaintenanceCost.toLocaleString('ru-RU')} ₽ / мес</b>.</span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>Персональный аудит и кураторство внедрения от эксперта: <b>{formData.selectedExpert}</b>.</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column (5/12 on desktop): Quick summary & Actions */}
            <div className="lg:col-span-5 rounded-2xl bg-transparent backdrop-blur-2xl border border-amber-400/35 p-5 sm:p-6 shadow-2xl relative space-y-5 overflow-hidden">
              <RealisticSmokeBackdrop speed="normal" opacity={0.4} className="-top-4 -left-4 w-[calc(100%+32px)] h-[80px]" />
              <Rivets />
              <div className="relative z-10">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-200 bg-clip-text text-transparent">Параметры и утверждение</span>
                </h3>
                <p className="text-sm text-zinc-300 mt-0.5">
                  Сводные данные проекта
                </p>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="liquid-bubble-plate p-3 rounded-xl relative overflow-hidden flex justify-between">
                  <span className="liquid-bubble-glare" />
                  <span className="text-zinc-400 relative z-10">Компания:</span>
                  <span className="font-bold text-white relative z-10">{formData.company || '—'}</span>
                </div>
                <div className="liquid-bubble-plate p-3 rounded-xl relative overflow-hidden flex justify-between">
                  <span className="liquid-bubble-glare" />
                  <span className="text-zinc-400 relative z-10">Город присутствия:</span>
                  <span className="font-medium text-amber-200 relative z-10">{formData.city || '—'}</span>
                </div>
                <div className="liquid-bubble-plate p-3 rounded-xl relative overflow-hidden flex justify-between">
                  <span className="liquid-bubble-glare" />
                  <span className="text-zinc-400 relative z-10">Подразделение:</span>
                  <span className="font-bold text-white relative z-10">{formData.department}</span>
                </div>
                <div className="liquid-bubble-plate p-3 rounded-xl relative overflow-hidden flex justify-between">
                  <span className="liquid-bubble-glare" />
                  <span className="text-zinc-400 relative z-10">Заменяемых сотрудников:</span>
                  <span className="font-bold text-amber-300 font-mono relative z-10">{employees} чел.</span>
                </div>
                <div className="liquid-bubble-plate p-3 rounded-xl relative overflow-hidden flex items-center justify-between gap-2">
                  <span className="liquid-bubble-glare" />
                  <span className="text-zinc-400 relative z-10">Куратор проекта:</span>
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="font-medium text-amber-200 truncate max-w-[170px]">{formData.selectedExpert}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const found = experts.find(e => 
                          String(e.id) === String(formData.selectedExpertId) ||
                          (formData.selectedExpert && (
                            formData.selectedExpert.includes(e.pseudonym) ||
                            e.pseudonym.includes(formData.selectedExpert)
                          ))
                        );
                        if (found) {
                          setSelectedExpertModal(found);
                        } else if (experts.length > 0) {
                          setSelectedExpertModal(experts[0]);
                        }
                      }}
                      className="liquid-bubble-secondary relative overflow-hidden px-2.5 py-1 rounded-lg text-sm text-amber-200 transition-all cursor-pointer shadow-[0_0_8px_rgba(231,199,104,0.2)] hover:scale-105 active:scale-95"
                    >
                      <span className="liquid-bubble-glare" />
                      <span className="relative z-10">Подробнее</span>
                    </button>
                  </div>
                </div>

                {/* Editable FIO and Contact Section (Matching Step 1 with full contact types) */}
                <div className="liquid-bubble-plate p-4 sm:p-5 rounded-2xl space-y-4 relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  {/* Full Name */}
                  <div className="space-y-1.5 relative z-10">
                    <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-amber-400" />
                      <span>ФИО контактного лица</span>
                    </label>
                    <input
                      type="text"
                      value={formData.fullName || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const updated = { ...prev, fullName: val };
                          sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
                          localStorage.setItem('sav_calculator_data', JSON.stringify(updated));
                          localStorage.setItem('sav_user_name', val);
                          return updated;
                        });
                      }}
                      placeholder="Например: Иван Васильев"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 focus:border-amber-300 text-white font-sans text-sm focus:outline-none focus:ring-1 focus:ring-amber-300 transition-all placeholder:text-zinc-500"
                    />
                  </div>

                  {/* Contact Type Choice */}
                  <div className="space-y-2 relative z-10">
                    <label className="text-sm font-medium text-amber-200/90 flex items-center gap-1.5">
                      <Phone className="w-4 h-4 text-amber-400" />
                      <span>Контакт для связи:</span>
                    </label>

                    {/* Choice Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {CONTACT_TYPES.map(ct => {
                        const Icon = ct.icon;
                        const isSelected = formData.contactType === ct.id;
                        return (
                          <button
                            key={ct.id}
                            type="button"
                            onClick={() => {
                              setFormData(prev => {
                                const updated = { ...prev, contactType: ct.id };
                                sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
                                localStorage.setItem('sav_calculator_data', JSON.stringify(updated));
                                return updated;
                              });
                            }}
                            className={`p-2.5 rounded-xl relative overflow-hidden flex items-center justify-center gap-1.5 text-sm font-medium transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${
                              isSelected
                                ? 'liquid-bubble-gold text-amber-950 font-bold shadow-[0_0_12px_rgba(231,199,104,0.4)]'
                                : 'liquid-bubble-secondary text-zinc-300 hover:text-white'
                            }`}
                          >
                            <span className="liquid-bubble-glare" />
                            <Icon className={`w-4 h-4 relative z-10 ${isSelected ? 'text-amber-950' : 'text-amber-400'}`} />
                            <span className="relative z-10">{ct.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Contact Value Input */}
                    <input
                      type="text"
                      value={formData.contactValue || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setFormData(prev => {
                          const updated = { ...prev, contactValue: val };
                          sessionStorage.setItem('sav-calculator-data', JSON.stringify(updated));
                          localStorage.setItem('sav_calculator_data', JSON.stringify(updated));
                          localStorage.setItem('sav_contact_value', val);
                          return updated;
                        });
                      }}
                      placeholder={
                        (CONTACT_TYPES.find(c => c.id === formData.contactType) || CONTACT_TYPES[0]).placeholder
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/20 focus:border-amber-300 text-white placeholder:text-zinc-500 text-sm font-mono outline-none focus:ring-1 focus:ring-amber-300 transition-all"
                    />
                    <p className="text-sm text-zinc-400">
                      Куратор проекта свяжется с вами для согласования аудита и деталей разработки
                    </p>
                  </div>
                </div>
              </div>

              {/* Promo Code Box */}
              {formData.promoCode && (
                <div className="liquid-bubble-plate p-3.5 rounded-xl border border-amber-400/50 flex items-center justify-between text-sm relative overflow-hidden">
                  <Rivets />
                  <span className="liquid-bubble-glare" />
                  <div className="relative z-10 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-amber-300" />
                    <span className="text-amber-200 font-medium">Промокод активирован:</span>
                  </div>
                  <span className="relative z-10 font-mono font-bold text-amber-300">{formData.promoCode} (-5%)</span>
                </div>
              )}

              {/* PDF Download Button (Sequential: Generate PDF -> Register -> Notify) */}
              <button
                type="button"
                onClick={handleDownloadPdfAndNotify}
                disabled={isDownloadingPdf}
                className="liquid-bubble-secondary relative overflow-hidden w-full py-3.5 px-5 rounded-xl font-bold text-sm text-amber-200 shadow-[0_0_15px_rgba(231,199,104,0.3)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="liquid-bubble-glare" />
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300 relative z-10" />
                    <span className="relative z-10">Формирование PDF сметы...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-400 relative z-10" />
                    <span className="relative z-10">Скачать смету и ТЗ в PDF</span>
                  </>
                )}
              </button>

              {/* Primary Action Button */}
              <button
                type="button"
                onClick={handleSubmitCalculation}
                disabled={isSubmitting}
                className="liquid-bubble-gold relative overflow-hidden w-full py-4 px-6 rounded-xl font-bold text-base text-amber-950 shadow-[0_0_25px_rgba(231,199,104,0.45)] hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="liquid-bubble-glare" />
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-950 relative z-10" />
                    <span className="relative z-10">Отправляем смету...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5 text-amber-950 relative z-10" />
                    <span className="relative z-10">Утвердить и отправить смету</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Navigation & Submission Footer Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-400/20">
            <button
              type="button"
              onClick={() => navigate('/calculator/step2')}
              className="liquid-bubble-secondary relative overflow-hidden w-full sm:w-auto px-6 py-3 rounded-xl text-zinc-200 hover:text-white transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.3)]"
            >
              <span className="liquid-bubble-glare" />
              <ChevronLeft className="w-4 h-4 text-amber-400 relative z-10" />
              <span className="relative z-10">Назад к выбору эксперта</span>
            </button>

            <button
              type="button"
              onClick={handleStartNewCalculation}
              className="liquid-bubble-secondary relative overflow-hidden w-full sm:w-auto px-6 py-3 rounded-xl text-amber-200 border-amber-400/40 hover:border-amber-400/70 transition-all text-sm font-medium flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(231,199,104,0.2)] hover:scale-[1.02] active:scale-95"
            >
              <span className="liquid-bubble-glare" />
              <Plus className="w-4 h-4 text-amber-400 relative z-10" />
              <span className="relative z-10">Новый расчет</span>
            </button>

            <button
              type="button"
              onClick={handleSubmitCalculation}
              disabled={isSubmitting}
              className="liquid-bubble-gold relative overflow-hidden w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer text-amber-950 shadow-[0_0_24px_rgba(231,199,104,0.45)] hover:scale-[1.02] active:scale-95"
            >
              <span className="liquid-bubble-glare" />
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-amber-950 relative z-10" />
                  <span className="relative z-10">Отправка расчёта...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 text-amber-950 relative z-10" />
                  <span className="relative z-10">Утвердить ТЗ и получить смету</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </main>
      )}

      {/* Global Footer */}
      <GlobalFooter />
    </div>
  );
};

export default CalculatorStep3;
