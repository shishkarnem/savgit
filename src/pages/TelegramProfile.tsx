import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Rivets from '@/components/Rivets';
import { 
  Users, MapPin, Briefcase, DollarSign, Calendar, 
  MessageSquare, Bot, ExternalLink, Copy, Check, Loader2, History, Calculator, Sparkles,
  ChevronDown, Clock, FileText, Eye, Edit2, X, Gift, UserCheck, Mail, LogIn
} from 'lucide-react';
import { ReferralDashboard } from '@/components/dashboard/ReferralDashboard';
import { AuthModal } from '@/components/auth/AuthModal';
import { protalkDb } from '@/integrations/protalk/client';
import { Input } from '@/components/ui/input';

interface UserCalculation {
  id: string;
  calculation_type: string;
  data: Record<string, any>;
  created_at: string;
}

type Client = any;
type TelegramProfileType = any;

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'В работе':
    case 'Обслуживание':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Отказ':
    case 'Заблокировано':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Инфо':
    case 'Расчет':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Договор':
    case 'Предоплата':
    case 'Тариф':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const InfoRow: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ 
  label, value, icon 
}) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      {icon && <span className="text-primary/60 mt-0.5">{icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-foreground/50">{label}</div>
        <div className="text-sm break-words">{value}</div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-1">
    <h3 className="text-sm font-semibold text-primary">{title}</h3>
    <div className="pl-1">{children}</div>
  </div>
);

const TelegramProfile: React.FC = () => {
  const navigate = useNavigate();
  const { telegramId: paramTelegramId } = useParams<{ telegramId: string }>();
  const { telegramUser, profile, isLoading: authLoading, isTelegramWebApp, referralPromo } = useTelegramAuth();
  const { hasAccess: hasCRMAccess, accessLevel } = useCRMAccess();
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'overview' | 'referrals' | 'history'>('overview');
  const [showAuthModal, setShowAuthModal] = React.useState(false);

  // Determine which telegram ID to use
  const isPublicProfile = !!paramTelegramId;
  const targetTelegramId = paramTelegramId || profile?.telegram_id?.toString();

  // Fetch user calculations history
  const { data: calculations } = useQuery({
    queryKey: ['user-calculations', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return [];
      const telegramIdNum = parseInt(targetTelegramId, 10);
      if (isNaN(telegramIdNum)) return [];
      
      const { data, error } = await protalkDb
        .from('sav_user_calculations')
        .select('*')
        .eq('telegram_id', telegramIdNum)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error('Error fetching calculations:', error);
        return [];
      }
      return data as UserCalculation[];
    },
    enabled: !!targetTelegramId,
  });

  // Fetch contracts — separate queries are more reliable here than a single OR filter
  const { data: userContracts, refetch: refetchContracts } = useQuery({
    queryKey: ['user-contracts', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return [];
      const tid = String(targetTelegramId).trim();

      try {
        const res = await (protalkDb as any)
          .from('contracts')
          .select('*')
          .order('created_at', { ascending: false });

        if (res.error) {
          return [];
        }
        return res.data || [];
      } catch {
        return [];
      }
    },
    enabled: !!targetTelegramId,
  });

  const [expandedContract, setExpandedContract] = useState<string | null>(null);
  const [contractViewUrl, setContractViewUrl] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<{contractId: string; field: string} | null>(null);
  const [editValue, setEditValue] = useState('');

  const calculatorHistory = calculations?.filter(c => c.calculation_type === 'calculator') || [];
  const aiSellerHistory = calculations?.filter(c => c.calculation_type === 'ai_seller') || [];

  // Group by date helper
  const groupByDate = (items: UserCalculation[]) => {
    const groups: Record<string, UserCalculation[]> = {};
    items.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  };

  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Fetch client data from CRM
  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['client-profile', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return null;
      
      const { data, error } = await protalkDb
        .from('sav_clients')
        .select('*')
        .eq('telegram_id', targetTelegramId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching client:', error);
        return null;
      }
      return data as Client | null;
    },
    enabled: !!targetTelegramId,
  });

  // Fetch telegram profile for public profiles
  const { data: publicProfile, isLoading: publicProfileLoading } = useQuery({
    queryKey: ['public-telegram-profile', targetTelegramId],
    queryFn: async () => {
      if (!targetTelegramId) return null;
      
      const telegramIdNum = parseInt(targetTelegramId, 10);
      if (isNaN(telegramIdNum)) return null;
      
      const { data, error } = await protalkDb
        .from('sav_telegram_profiles')
        .select('*')
        .eq('telegram_id', telegramIdNum)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching telegram profile:', error);
        return null;
      }
      return data as TelegramProfileType | null;
    },
    enabled: isPublicProfile && !!targetTelegramId,
  });

  const isLoading = authLoading || clientLoading || (isPublicProfile && publicProfileLoading);

  // Use public profile data or auth context profile
  const displayProfile = isPublicProfile ? publicProfile : profile;

  const copyProfileLink = () => {
    const link = `${window.location.origin}/profile/${targetTelegramId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg">Загрузка профиля...</p>
        </motion.div>
      </div>
    );
  }

  // For non-public profiles, require either Telegram WebApp or logged-in User
  if (!isPublicProfile && !isTelegramWebApp && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="rounded-3xl backdrop-blur-2xl bg-black/60 border border-white/20 p-8 text-center max-w-md w-full shadow-2xl text-white space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 mx-auto bg-black/40 border border-amber-400/40 rounded-2xl flex items-center justify-center text-amber-300 shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent mb-2">
              Личный кабинет
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Для доступа к персональной статистике и сохранённым проектам войдите по Email или откройте приложение через Telegram бота.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              onClick={() => setShowAuthModal(true)}
              className="w-full py-3.5 border border-amber-400 text-white hover:border-amber-300 font-bold text-sm md:text-base rounded-2xl shadow-lg shadow-amber-500/10 backdrop-blur-xl bg-black/40"
            >
              <LogIn className="w-4 h-4 mr-2 text-amber-300" /> Войти в аккаунт
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full py-3.5 border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm md:text-base rounded-2xl backdrop-blur-xl bg-black/20"
            >
              Вернуться на главную
            </Button>
          </div>
        </motion.div>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  // For public profiles without data
  if (isPublicProfile && !displayProfile && !clientData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          className="glass-panel p-8 text-center max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Rivets />
          <i className="fa-solid fa-user-slash text-6xl text-primary/50 mb-6"></i>
          <h2 className="text-2xl font-bold mb-4 text-primary">Профиль не найден</h2>
          <p className="text-foreground/70 mb-6">
            Пользователь с ID {paramTelegramId} не зарегистрирован в системе.
          </p>
          <Button
            onClick={() => navigate('/')}
            className="steam-button"
          >
            <i className="fa-solid fa-arrow-left mr-2"></i>
            Вернуться на главную
          </Button>
        </motion.div>
      </div>
    );
  }

  const fullName = clientData?.full_name || 
    (displayProfile ? [displayProfile.first_name, displayProfile.last_name].filter(Boolean).join(' ') : null) || 
    'Безымянный инженер';
  
  const registrationDate = displayProfile?.created_at 
    ? new Date(displayProfile.created_at).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : null;

  const photoUrl = displayProfile?.photo_url;

  return (
    <div className="min-h-screen flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl mb-6 flex justify-between items-center">
        <Button
          onClick={() => navigate('/')}
          variant="ghost"
          className="text-foreground/60 hover:text-primary"
        >
          <i className="fa-solid fa-arrow-left mr-2"></i>
          Назад
        </Button>
        
        <div className="flex items-center gap-2">
          {!profile?.email && (
            <Button
              onClick={() => setShowAuthModal(true)}
              variant="outline"
              size="sm"
              className="gap-2 text-xs bg-amber-400/10 border-amber-400/30 text-amber-300 hover:bg-amber-400/20"
            >
              <LogIn className="w-3.5 h-3.5" /> Вход / Регистрация по Email
            </Button>
          )}

          {targetTelegramId && (
            <Button
              onClick={copyProfileLink}
              variant="outline"
              size="sm"
              className="gap-2 text-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Скопировано!' : 'Ссылка на профиль'}
            </Button>
          )}
        </div>
      </header>

      {/* Tabs navigation */}
      {!isPublicProfile && (
        <div className="w-full max-w-4xl flex items-center justify-center gap-2 mb-6 p-1 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'overview'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" /> Профиль и Договоры
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'referrals'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4" /> Реферальная сеть и Бонусы
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" /> История расчетов ({calculatorHistory.length + aiSellerHistory.length})
          </button>
        </div>
      )}

      {/* REFERRAL NETWORK TAB */}
      {activeTab === 'referrals' && !isPublicProfile && (
        <div className="w-full max-w-4xl">
          <ReferralDashboard />
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && !isPublicProfile && (
        <div className="w-full max-w-4xl space-y-6">
          <div className="p-6 rounded-3xl backdrop-blur-2xl bg-white/[0.03] border border-white/10 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-amber-400" />
              История активности пользователя
            </h3>

            <Button
              onClick={() => navigate('/experts/history')}
              variant="outline"
              className="w-full gap-2 justify-start bg-white/5 border-white/10"
            >
              <History className="w-4 h-4" />
              История свайпов экспертов
            </Button>

            {calculatorHistory.length > 0 ? (
              <HistorySection
                title={`История калькулятора (${calculatorHistory.length})`}
                icon={<Calculator className="w-4 h-4 text-primary" />}
                items={calculatorHistory}
                groupByDate={groupByDate}
                expandedDates={expandedDates}
                toggleDate={toggleDate}
                onItemClick={(calc) => {
                  sessionStorage.setItem('sav-calculator-data', JSON.stringify(calc.data));
                  navigate('/calculator');
                }}
                getItemLabel={(calc) => calc.data?.company || calc.data?.product || 'Расчет'}
              />
            ) : (
              <p className="text-xs text-slate-400 py-2">Расчёты в калькуляторе ещё не производились.</p>
            )}

            {aiSellerHistory.length > 0 ? (
              <HistorySection
                title={`История ИИ-продавца (${aiSellerHistory.length})`}
                icon={<Sparkles className="w-4 h-4 text-accent" />}
                items={aiSellerHistory}
                groupByDate={groupByDate}
                expandedDates={expandedDates}
                toggleDate={toggleDate}
                onItemClick={(calc) => {
                  if (calc.data?.businessDescription) sessionStorage.setItem('sav-business-type', String(calc.data.businessDescription));
                  if (calc.data?.selectedPlan) sessionStorage.setItem('sav-selected-plan', String(calc.data.selectedPlan));
                  navigate('/ai-seller/plans');
                }}
                getItemLabel={(calc) => calc.data?.businessDescription || calc.data?.segment || calc.data?.selectedPlan || 'Анализ'}
              />
            ) : (
              <p className="text-xs text-slate-400 py-2">Запросов к ИИ-продавцу пока не сохранено.</p>
            )}
          </div>
        </div>
      )}

      {/* OVERVIEW / CRM TAB */}
      {(activeTab === 'overview' || isPublicProfile) && (
      <motion.div
        className="glass-panel p-8 max-w-4xl w-full relative overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Rivets />
        
        {/* Decorative gears */}
        <div className="absolute -top-4 -right-4 opacity-10">
          <i className="fa-solid fa-gear text-6xl text-primary animate-spin" style={{ animationDuration: '20s' }}></i>
        </div>
        
        {/* Profile Photo */}
        <div className="flex justify-center mb-6">
          <motion.div
            className="relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <div className="w-32 h-32 rounded-full border-4 border-primary/50 overflow-hidden bg-black/40 backdrop-blur-md shadow-lg shadow-primary/20">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <i className="fa-solid fa-user-gear text-5xl text-primary/60"></i>
                </div>
              )}
            </div>
            {/* Telegram badge */}
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#0088cc] rounded-full flex items-center justify-center border-2 border-background shadow-lg">
              <i className="fa-brands fa-telegram text-white text-xl"></i>
            </div>
          </motion.div>
        </div>

        {/* Name */}
        <motion.h1
          className="text-2xl md:text-3xl font-bold text-center text-primary mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {fullName}
        </motion.h1>

        {/* Username */}
        {displayProfile?.username && (
          <motion.p
            className="text-center text-foreground/60 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            @{displayProfile.username}
          </motion.p>
        )}

        {/* Status badge */}
        {clientData?.status && (
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <Badge variant="outline" className={getStatusColor(clientData.status)}>
              {clientData.status}
            </Badge>
          </motion.div>
        )}

        {/* Divider */}
        <div className="border-t border-foreground/10 my-6"></div>

        {/* Scrollable content for CRM data */}
        <ScrollArea className="max-h-none md:max-h-[70vh]">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            {/* Basic Info */}
            <Section title="Основная информация">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <InfoRow 
                  label="ID Telegram" 
                  value={targetTelegramId} 
                  icon={<i className="fa-solid fa-fingerprint text-sm"></i>} 
                />
                {registrationDate && (
                  <InfoRow 
                    label="Дата регистрации" 
                    value={registrationDate} 
                    icon={<Calendar className="h-4 w-4" />} 
                  />
                )}
                <InfoRow 
                  label="Город" 
                  value={clientData?.city} 
                  icon={<MapPin className="h-4 w-4" />} 
                />
                <InfoRow 
                  label="Telegram" 
                  value={clientData?.telegram_client} 
                  icon={<MessageSquare className="h-4 w-4" />} 
                />
                <InfoRow 
                  label="Реферальный код" 
                  value={(displayProfile as any)?.referral_code} 
                  icon={<Users className="h-4 w-4" />} 
                />
                <InfoRow 
                  label="Приглашён партнёром" 
                  value={(displayProfile as any)?.referred_by} 
                  icon={<ExternalLink className="h-4 w-4" />} 
                />
                {referralPromo && !isPublicProfile && (
                  <InfoRow 
                    label="Промокод партнёра" 
                    value={referralPromo} 
                    icon={<i className="fa-solid fa-tag text-sm"></i>} 
                  />
                )}
              </div>
            </Section>

            {/* Project Info */}
            {clientData?.project && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Проект">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Название проекта" 
                      value={clientData.project} 
                      icon={<Briefcase className="h-4 w-4" />} 
                    />
                    <InfoRow label="Код проекта" value={clientData.project_code} />
                    <InfoRow label="Продукт" value={clientData.product} />
                    <InfoRow label="Подразделение" value={clientData.department} />
                    <InfoRow label="Сотрудников" value={clientData.employees_count} />
                    <InfoRow label="Функционал" value={clientData.functionality} />
                  </div>
                </Section>
              </>
            )}

            {/* Expert & Tariff */}
            {(clientData?.expert_name || clientData?.tariff) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Эксперт и тариф">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow label="Эксперт" value={clientData.expert_pseudonym || clientData.expert_name} />
                    <InfoRow label="Тариф" value={clientData.tariff} />
                    <InfoRow label="Выбранный эксперт" value={clientData.selected_expert} />
                  </div>
                </Section>
              </>
            )}

            {/* Finance */}
            {clientData?.sav_cost && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Финансы">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Стоимость SAV" 
                      value={clientData.sav_cost} 
                      icon={<DollarSign className="h-4 w-4" />} 
                    />
                    <InfoRow label="Окупаемость" value={clientData.payback} />
                    <InfoRow label="Обслуживание" value={clientData.service_price} />
                  </div>
                </Section>
              </>
            )}

            {/* Dates */}
            {(clientData?.calculator_date || clientData?.start_date) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Важные даты">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="Дата калькулятора" 
                      value={clientData.calculator_date} 
                      icon={<Calendar className="h-4 w-4" />} 
                    />
                    <InfoRow label="Дата старта" value={clientData.start_date} />
                    <InfoRow label="Дата эксперта" value={clientData.expert_date} />
                    <InfoRow label="Дата оплаты" value={clientData.payment_date} />
                  </div>
                </Section>
              </>
            )}

            {/* Bot Info */}
            {clientData?.protalk_id && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Telegram бот">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                    <InfoRow 
                      label="ID ИИ-ассистента" 
                      value={clientData.protalk_id} 
                      icon={<Bot className="h-4 w-4" />} 
                    />
                    <InfoRow label="Статус отправки" value={clientData.protalk_send_status} />
                    <InfoRow label="Канал" value={clientData.channel} />
                  </div>
                </Section>
              </>
            )}

            {/* Documents */}
            {(clientData?.contract_ooo_url || clientData?.contract_ip_url || clientData?.project_plan_url) && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Документы">
                  <div className="space-y-2">
                    {clientData.contract_ooo_url && (
                      <a 
                        href={clientData.contract_ooo_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Договор ООО
                      </a>
                    )}
                    {clientData.contract_ip_url && (
                      <a 
                        href={clientData.contract_ip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Договор ИП
                      </a>
                    )}
                    {clientData.project_plan_url && (
                      <a 
                        href={clientData.project_plan_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                        План проекта
                      </a>
                    )}
                  </div>
                </Section>
              </>
            )}

            {/* Contracts */}
            {userContracts && userContracts.length > 0 && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title={`Договоры (${userContracts.length})`}>
                  <div className="space-y-2">
                    {userContracts.map((contract: any) => {
                      const isExpanded = expandedContract === contract.id;
                      const editableFields = [
                        ['company_name', 'Компания'], ['full_name', 'ФИО'], ['city', 'Город'],
                        ['inn', 'ИНН'], ['ogrn', 'ОГРН'], ['kpp', 'КПП'],
                        ['phone', 'Телефон'], ['email', 'Email'],
                        ['bank', 'Банк'], ['rs', 'Р/С'], ['bik', 'БИК'], ['ks', 'К/С'],
                        ['ur_address', 'Юр. адрес'], ['address', 'Адрес'],
                        ['passport', 'Паспорт'], ['passport_date', 'Дата выдачи'], ['passport_issued', 'Кем выдан'],
                      ];

                      return (
                        <div key={contract.id} className="border border-foreground/10 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedContract(isExpanded ? null : contract.id)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-foreground/5 transition-colors"
                          >
                            <span className="text-xs font-medium flex items-center gap-2">
                              <FileText className="w-3 h-3 text-primary" />
                              {contract.contract_type?.includes('ooo') ? 'ООО' : 'ИП'}: {contract.company_name || contract.full_name || 'Договор'}
                              <Badge variant="outline" className={contract.status === 'Отправлен' ? 'bg-green-500/10 text-green-400 border-green-500/30 text-[10px]' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 text-[10px]'}>
                                {contract.status || '—'}
                              </Badge>
                            </span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden border-t border-foreground/5"
                              >
                                <div className="p-3 space-y-2">
                                  {/* Preview & Link */}
                                  {contract.contract_url && (
                                    <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => setContractViewUrl(contract.contract_url)}>
                                      <Eye className="w-3 h-3" /> Просмотр договора
                                    </Button>
                                  )}
                                  {/* View sample by type */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full gap-2 text-xs text-foreground/50"
                                    onClick={() => setContractViewUrl(
                                      contract.contract_type?.includes('ooo')
                                        ? 'https://drive.google.com/file/d/1PIUpI6ANNzMkjR6YTc0XSoQ0TxHtBeSU/view'
                                        : 'https://drive.google.com/file/d/1HILZEdNyGX-wIT2M-oSWrJrf-FvaT2gN/view'
                                    )}
                                  >
                                    <FileText className="w-3 h-3" /> Образец договора
                                  </Button>

                                  {/* Editable fields */}
                                  {editableFields.map(([field, label]) => {
                                    const value = contract[field];
                                    if (!value || value === '-') return null;
                                    const isEditing = editingField?.contractId === contract.id && editingField?.field === field;

                                    return (
                                      <div key={field} className="flex items-center justify-between gap-2 text-xs py-1 group">
                                        <span className="text-foreground/50 w-24 shrink-0">{label}:</span>
                                        {isEditing ? (
                                          <div className="flex-1 flex gap-1">
                                            <Input
                                              value={editValue}
                                              onChange={e => setEditValue(e.target.value)}
                                              className="h-6 text-xs"
                                              autoFocus
                                              onKeyDown={async e => {
                                                if (e.key === 'Enter') {
                                                  await (protalkDb as any).from('sav_contracts').update({ [field]: editValue }).eq('id', contract.id);
                                                  setEditingField(null);
                                                  refetchContracts();
                                                }
                                                if (e.key === 'Escape') setEditingField(null);
                                              }}
                                              onBlur={async () => {
                                                await (protalkDb as any).from('sav_contracts').update({ [field]: editValue }).eq('id', contract.id);
                                                setEditingField(null);
                                                refetchContracts();
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <span
                                            className="text-foreground font-medium text-right break-all flex-1 cursor-pointer hover:text-primary transition-colors"
                                            onClick={() => {
                                              setEditingField({ contractId: contract.id, field });
                                              setEditValue(value || '');
                                            }}
                                            title="Нажмите для редактирования"
                                          >
                                            {value}
                                            <Edit2 className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-50" />
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                  <p className="text-[10px] text-foreground/30 pt-1">{new Date(contract.created_at).toLocaleString('ru-RU')}</p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </>
            )}

            {/* Comment */}
            {clientData?.comment && (
              <>
                <div className="border-t border-foreground/10"></div>
                <Section title="Комментарий">
                  <p className="text-sm text-foreground/70 whitespace-pre-wrap">
                    {clientData.comment}
                  </p>
                </Section>
              </>
            )}
          </motion.div>
        </ScrollArea>

        {/* CRM Access Button - Only for admins */}
        {hasCRMAccess && !isPublicProfile && (
          <motion.div
            className="mt-6 pt-6 border-t border-foreground/10"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              onClick={() => navigate('/admin/crm')}
              className="w-full gap-2 bg-primary/20 hover:bg-primary/30 border border-primary/40"
              variant="outline"
            >
              <Users className="w-4 h-4" />
              Войти в CRM
              {accessLevel === 'admin' && (
                <span className="ml-2 text-xs bg-primary/30 px-2 py-0.5 rounded">Admin</span>
              )}
            </Button>
          </motion.div>
        )}

        {/* Quick Actions */}
        {!isPublicProfile && (
          <motion.div
            className="mt-6 pt-6 border-t border-foreground/10 space-y-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h3 className="text-sm font-semibold text-primary mb-3">Быстрые действия</h3>

            <Button
              onClick={() => navigate('/experts/history')}
              variant="outline"
              className="w-full gap-2 justify-start"
            >
              <History className="w-4 h-4" />
              История свайпов экспертов
            </Button>

            {calculatorHistory.length > 0 && (
              <HistorySection
                title={`История калькулятора (${calculatorHistory.length})`}
                icon={<Calculator className="w-4 h-4 text-primary" />}
                items={calculatorHistory}
                groupByDate={groupByDate}
                expandedDates={expandedDates}
                toggleDate={toggleDate}
                onItemClick={(calc) => {
                  sessionStorage.setItem('sav-calculator-data', JSON.stringify(calc.data));
                  navigate('/calculator');
                }}
                getItemLabel={(calc) => calc.data?.company || calc.data?.product || 'Расчет'}
              />
            )}

            {aiSellerHistory.length > 0 && (
              <HistorySection
                title={`История ИИ-продавца (${aiSellerHistory.length})`}
                icon={<Sparkles className="w-4 h-4 text-accent" />}
                items={aiSellerHistory}
                groupByDate={groupByDate}
                expandedDates={expandedDates}
                toggleDate={toggleDate}
                onItemClick={(calc) => {
                  if (calc.data?.businessDescription) sessionStorage.setItem('sav-business-type', String(calc.data.businessDescription));
                  if (calc.data?.selectedPlan) sessionStorage.setItem('sav-selected-plan', String(calc.data.selectedPlan));
                  navigate('/ai-seller/plans');
                }}
                getItemLabel={(calc) => calc.data?.businessDescription || calc.data?.segment || calc.data?.selectedPlan || 'Анализ'}
              />
            )}
          </motion.div>
        )}
      </motion.div>
      )}

      {/* Auth Modal for Email login/register */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Contract View Popup */}
      <AnimatePresence>
        {contractViewUrl && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setContractViewUrl(null)} />
            <div className="relative z-10 flex flex-col w-full max-w-4xl mx-auto mt-16 mb-8 h-[calc(100vh-6rem)] glass-panel overflow-hidden">
              <Rivets />
              <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setContractViewUrl(null)} className="gap-1">
                  <i className="fa-solid fa-arrow-left"></i> Назад
                </Button>
                <div className="flex items-center gap-2">
                  <a
                    href={contractViewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg bg-primary/10 border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <ExternalLink className="w-3 h-3" /> Открыть
                  </a>
                  <Button variant="ghost" size="sm" onClick={() => setContractViewUrl(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <iframe
                src={contractViewUrl.replace('/view', '/preview')}
                className="flex-grow w-full border-none"
                title="Просмотр договора"
                allow="autoplay"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-8 py-6 text-center opacity-60 text-sm tracking-wider font-sans text-amber-200">
        © 2026 SAV AI • Интеллектуальные нейросетевые системы и автоматизация бизнеса
      </footer>
    </div>
  );
};

// History section component with date grouping
const HistorySection: React.FC<{
  title: string;
  icon: React.ReactNode;
  items: UserCalculation[];
  groupByDate: (items: UserCalculation[]) => Record<string, UserCalculation[]>;
  expandedDates: Record<string, boolean>;
  toggleDate: (date: string) => void;
  onItemClick: (calc: UserCalculation) => void;
  getItemLabel: (calc: UserCalculation) => string;
}> = ({ title, icon, items, groupByDate, expandedDates, toggleDate, onItemClick, getItemLabel }) => {
  const groups = groupByDate(items);

  return (
    <div className="space-y-2">
      <p className="text-xs text-foreground/50 flex items-center gap-1">{icon} {title}</p>
      {Object.entries(groups).map(([date, dateItems]) => (
        <div key={date} className="border border-foreground/10 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleDate(`${title}-${date}`)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-foreground/5 transition-colors"
          >
            <span className="text-xs font-medium flex items-center gap-2">
              <Calendar className="w-3 h-3 text-primary" />
              {date}
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{dateItems.length}</Badge>
            </span>
            <ChevronDown className={`w-3 h-3 transition-transform ${expandedDates[`${title}-${date}`] ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {expandedDates[`${title}-${date}`] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                {dateItems.map(calc => (
                  <Button
                    key={calc.id}
                    variant="ghost"
                    className="w-full gap-2 justify-start text-sm h-auto py-2 px-4 rounded-none border-t border-foreground/5"
                    onClick={() => onItemClick(calc)}
                  >
                    <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-12 shrink-0">
                      {new Date(calc.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="truncate text-left flex-1">{getItemLabel(calc)}</span>
                    {calc.data?.lastAction && (
                      <span className="text-[10px] text-foreground/30 shrink-0">{String(calc.data.lastAction)}</span>
                    )}
                  </Button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export default TelegramProfile;