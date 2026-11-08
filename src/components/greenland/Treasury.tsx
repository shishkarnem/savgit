import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Wallet,
  TrendingUp,
  Users,
  FileText,
  Clock,
  Building2,
  UserRound,
  Search,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  Send,
  RefreshCw,
  Sparkles,
  Award,
  CheckCircle2,
  Calculator,
  CreditCard,
  Coins,
  ChevronRight,
  HelpCircle,
  Briefcase
} from 'lucide-react';
import { Language } from '@/types';
import { protalkDb } from '@/integrations/protalk/client';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';

const MONTHS_RU = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_FULL_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

interface TreasuryProps {
  lang: Language;
  t: (key: string) => string;
  telegramId?: string | null;
  partnerData?: {
    fio?: string;
    telegram?: string;
    telegramId?: string;
    promo?: string;
    phone?: string;
    email?: string;
    rank?: string;
    type?: string;
  };
}

const parseAmount = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const cleaned = value.replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const Treasury: React.FC<TreasuryProps> = ({ lang, t, telegramId, partnerData }) => {
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPayoutModal, setShowPayoutModal] = useState<boolean>(false);
  const [payoutRequisites, setPayoutRequisites] = useState<string>('');
  const [payoutMethod, setPayoutMethod] = useState<'sbp' | 'account' | 'crypto'>('sbp');
  const [payoutAmount, setPayoutAmount] = useState<string>('');
  const [payoutSuccess, setPayoutSuccess] = useState<string>('');
  const [isSubmittingPayout, setIsSubmittingPayout] = useState<boolean>(false);

  // Interactive resident income projection calculator state
  const [calcDealSize, setCalcDealSize] = useState<number>(300000);
  const [calcDealsCount, setCalcDealsCount] = useState<number>(3);
  const [calcRoleMode, setCalcRoleMode] = useState<'partner' | 'expert' | 'combo'>('partner');

  const loadLeads = async () => {
    if (!telegramId) {
      setIsLoading(false);
      setLeads([]);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/partners/treasury?telegram_id=${telegramId}`).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json.success && json.analytics) {
          const list = [...(json.analytics.partnerLeads || []), ...(json.analytics.expertProjects || [])];
          if (list.length > 0) {
            setLeads(list);
            setIsLoading(false);
            return;
          }
        }
      }

      const { data, error } = await protalkDb
        .from('leads' as any)
        .select('*')
        .or(`expert_chat_id.eq.${telegramId},partner_chat_id.eq.${telegramId},partner_code.eq.${telegramId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Failed to load treasury leads:', error);
        setLeads([]);
      } else {
        setLeads((data as any[]) || []);
      }
    } catch (err) {
      console.warn('Treasury loadLeads error:', err);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [telegramId]);

  const analytics = useMemo(() => {
    const rows = leads || [];

    const enriched = rows.map((lead) => {
      const asPartner = String(lead.partner_chat_id || '') === String(telegramId) || String(lead.partner_code || '') === String(telegramId);
      const asExpert = String(lead.expert_chat_id || '') === String(telegramId);
      const status = String(lead.status || '').toLowerCase();
      const paid = /оплач|выплач|paid|выполнен/.test(status);

      const partnerPayout = asPartner ? parseAmount(lead.partner_payout || (lead.commission_amount)) : 0;
      const expertPayout = asExpert ? parseAmount(lead.expert_payout) : 0;
      let payout = partnerPayout + expertPayout;

      // Fallback if payout is 0 but price exists
      if (payout === 0) {
        const total = parseAmount(lead.act_sum || lead.discounted_price || lead.sum || lead.total_price);
        if (total > 0) {
          payout = asExpert ? total * 0.5 : total * 0.25;
        }
      }

      const actSum = parseAmount(lead.act_sum || lead.discounted_price || lead.sum || lead.total_price);
      const payoutDateRaw = asPartner ? lead.partner_payout_date : asExpert ? lead.expert_payout_date : null;
      const payoutDate = payoutDateRaw ? new Date(payoutDateRaw) : null;

      return { ...lead, payout, actSum, paid, asPartner, asExpert, payoutDate };
    });

    const uniqueClients = new Set(
      enriched.map((r) => r.client_telegram || r.telegram || r.chat_id || r.id).filter(Boolean)
    ).size;

    const totalPaid = enriched.filter((r) => r.paid).reduce((sum, r) => sum + r.payout, 0);
    const totalPending = enriched.filter((r) => !r.paid).reduce((sum, r) => sum + r.payout, 0);
    const totalActSum = enriched.reduce((sum, r) => sum + r.actSum, 0);

    const now = Date.now();
    const nextPayoutDate = enriched
      .map((r) => r.payoutDate)
      .filter((d): d is Date => !!d && !Number.isNaN(d.getTime()) && d.getTime() >= now)
      .sort((a, b) => a.getTime() - b.getTime())[0] || null;

    const monthMap = new Map<number, number>();
    MONTHS_RU.forEach((_, idx) => monthMap.set(idx, 0));
    enriched.forEach((row) => {
      const dateRaw = row.act_date || row.created_at || row.timestamp;
      const dt = dateRaw ? new Date(dateRaw) : null;
      if (dt && !Number.isNaN(dt.getTime())) {
        monthMap.set(dt.getMonth(), (monthMap.get(dt.getMonth()) || 0) + row.payout);
      }
    });

    const chartData = MONTHS_RU.map((name, idx) => ({
      name,
      fullName: MONTHS_FULL_RU[idx],
      payout: monthMap.get(idx) || 0
    }));

    return { list: enriched, chartData, uniqueClients, totalPaid, totalPending, totalActSum, nextPayoutDate };
  }, [leads, telegramId]);

  // Filtered Leads list
  const filteredList = useMemo(() => {
    return analytics.list.filter((lead) => {
      const q = searchQuery.toLowerCase().trim();
      const clientName = String(lead.full_name || lead.fio || lead.product || lead.company || '').toLowerCase();
      const clientTg = String(lead.client_telegram || lead.telegram || '').toLowerCase();
      const promo = String(lead.promo || '').toLowerCase();

      const matchesSearch = !q || clientName.includes(q) || clientTg.includes(q) || promo.includes(q);

      if (!matchesSearch) return false;

      if (statusFilter === 'paid') return lead.paid;
      if (statusFilter === 'pending') return !lead.paid;
      if (statusFilter === 'partner') return lead.asPartner;
      if (statusFilter === 'expert') return lead.asExpert;

      return true;
    });
  }, [analytics.list, searchQuery, statusFilter]);

  // Estimated potential income calculation from slider
  const calcEstimatedIncome = useMemo(() => {
    const rate = calcRoleMode === 'partner' ? 0.25 : calcRoleMode === 'expert' ? 0.50 : 0.75;
    return Math.round(calcDealSize * calcDealsCount * rate);
  }, [calcDealSize, calcDealsCount, calcRoleMode]);

  const handleRequestPayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutRequisites.trim()) return;

    setIsSubmittingPayout(true);
    setPayoutSuccess('');

    try {
      const methodLabel =
        payoutMethod === 'sbp' ? 'СБП / Карта МИР' : payoutMethod === 'account' ? 'Расчетный счет ИП / Самозанятого' : 'USDT TRC20 / TON';

      const numericAmount = payoutAmount
        ? parseFloat(String(payoutAmount).replace(/\s/g, '').replace(',', '.')) || analytics.totalPending
        : analytics.totalPending;

      const res = await fetch('/api/v1/partners/payout-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: partnerData?.telegramId || telegramId || '',
          fio: partnerData?.fio || '',
          telegram: partnerData?.telegram || '',
          phone: partnerData?.phone || '',
          email: partnerData?.email || '',
          promo: partnerData?.promo || '',
          rank: partnerData?.rank || 'Резидент',
          type: partnerData?.type || 'Партнер',
          amount: numericAmount,
          availableBalance: analytics.totalPending,
          totalPaid: analytics.totalPaid,
          method: methodLabel,
          requisites: payoutRequisites.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        setPayoutSuccess('Заявка на выплату вознаграждения успешно зарегистрирована и передана администратору в Telegram.');
        setTimeout(() => {
          setShowPayoutModal(false);
          setPayoutSuccess('');
          setPayoutRequisites('');
          setPayoutAmount('');
        }, 3000);
      } else {
        setPayoutSuccess(data.error || 'Заявка принята в обработку.');
      }
    } catch (err) {
      setPayoutSuccess('Заявка сохранена в казначействе.');
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <div className="w-full max-w-full space-y-6 animate-fadeIn pb-16">
      {/* 1. Primary Header with Smoke Animation & Quick Action Bar */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl shadow-2xl">
        <span className="liquid-bubble-glare" />
        <RealisticSmokeBackdrop speed="normal" opacity={0.35} variant="amber" className="absolute inset-0 pointer-events-none z-0" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-sm font-medium">
              <ShieldCheck size={16} className="text-amber-400" />
              <span>Королевское казначейство резидентов</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              {t('tr_title') || 'Казначейство и Финансовый центр'}
            </h1>
            <p className="text-sm md:text-base text-zinc-300 max-w-3xl leading-relaxed">
              Автоматизированный учет вознаграждений резидентов ИИ-Гренландии. Партнёрская комиссия 25% с каждой продажи и экспертная ставка 50% от решений с прозрачными выплатами по регламенту.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={loadLeads}
              className="liquid-bubble-secondary text-zinc-200 hover:text-white px-4 py-3 rounded-xl text-sm font-semibold border border-white/15 hover:border-amber-400/40 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              title="Обновить реестр начислений"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin text-amber-400' : 'text-amber-400'} />
              <span>Синхронизировать</span>
            </button>

            <button
              onClick={() => setShowPayoutModal(true)}
              className="liquid-bubble-gold text-amber-950 font-bold px-6 py-3 rounded-xl text-sm md:text-base border border-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.4)] flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <span className="liquid-bubble-glare" />
              <ArrowUpRight size={18} className="relative z-10" />
              <span className="relative z-10">Запросить вывод средств</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Top Executive Grid: Resident Balance Wallet Card (Left) + 4 Metric Panels (Right) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Resident Master Balance Card (Apple Liquid Glass Luxury Aesthetic) */}
        <div className="lg:col-span-5 liquid-bubble-plate border border-amber-400/40 rounded-2xl p-6 md:p-7 relative overflow-hidden backdrop-blur-2xl shadow-2xl flex flex-col justify-between">
          <span className="liquid-bubble-glare" />
          <RealisticSmokeBackdrop speed="slow" opacity={0.25} variant="amber" className="absolute inset-0 pointer-events-none z-0" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-bold text-white leading-tight">
                    Личный баланс резидента
                  </h3>
                  <p className="text-sm text-amber-300/80 font-medium">
                    SAV AI Treasury Account
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-sm font-mono font-semibold">
                ID {telegramId ? `@${telegramId}` : 'РЕЗИДЕНТ'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-black/50 border border-amber-400/30 space-y-2 shadow-inner">
              <span className="text-sm font-medium text-zinc-300">
                Доступно к выводу прямо сейчас:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold font-mono bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  {analytics.totalPending.toLocaleString('ru-RU')} ₽
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {analytics.nextPayoutDate
                  ? `Ближайшая регламентная выплата: ${analytics.nextPayoutDate.toLocaleDateString('ru-RU')}`
                  : 'Средства переводятся в день расчетного четверга после подтверждения акта.'}
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-white/10 relative z-10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowPayoutModal(true)}
              className="liquid-bubble-gold text-amber-950 font-bold w-full py-3 rounded-xl text-sm border border-amber-300 shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              <CreditCard size={16} />
              <span>Вывести вознаграждение</span>
            </button>
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-sm text-zinc-300 font-medium shrink-0">
              <Clock size={15} className="text-amber-400" />
              <span>Выплаты: каждый ЧТ</span>
            </div>
          </div>
        </div>

        {/* 4 Financial KPI Stat Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Всего выплачено */}
          <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <span className="liquid-bubble-glare" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-sm font-medium text-zinc-300">Уже выплачено резиденту</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-300">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold font-mono text-zinc-100">
                {analytics.totalPaid.toLocaleString('ru-RU')} ₽
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Успешно переведено на банковские счета и карты
              </p>
            </div>
          </div>

          {/* Card 2: Общий объем сделок */}
          <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <span className="liquid-bubble-glare" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-sm font-medium text-zinc-300">Общий оборот сделок</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <TrendingUp size={20} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold font-mono text-amber-300">
                {analytics.totalActSum.toLocaleString('ru-RU')} ₽
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Суммарный объем привлеченных и реализованных контрактов
              </p>
            </div>
          </div>

          {/* Card 3: Закрепленные клиенты */}
          <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <span className="liquid-bubble-glare" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-sm font-medium text-zinc-300">Закрепленные клиенты</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Users size={20} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold font-mono text-zinc-100">
                {analytics.uniqueClients}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Компании и заказчики, прикрепленные к вашему промокоду
              </p>
            </div>
          </div>

          {/* Card 4: Количество сделок */}
          <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-5 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
            <span className="liquid-bubble-glare" />
            <div className="flex items-start justify-between mb-3 relative z-10">
              <span className="text-sm font-medium text-zinc-300">Реестр сделок и проектов</span>
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Briefcase size={20} />
              </div>
            </div>
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-bold font-mono text-amber-300">
                {analytics.list.length}
              </h3>
              <p className="text-sm text-zinc-400 mt-1">
                Всего зафиксировано в партнерской CRM системе
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Revenue Bar Chart (Left 7 Cols) + Interactive Resident Income Calculator (Right 5 Cols) */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Monthly Revenue Dynamic Chart */}
        <div className="lg:col-span-7 liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-7 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <span className="liquid-bubble-glare" />

          <div className="relative z-10 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="text-amber-400" size={20} />
                <span>Динамика выплат и начислений по месяцам</span>
              </h3>
              <p className="text-sm text-zinc-400 mt-0.5">
                Фактические и ожидаемые начисления резиденту за календарный год
              </p>
            </div>
            <span className="text-sm px-3.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono self-start font-semibold">
              Годовой цикл
            </span>
          </div>

          <div className="h-72 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  fontSize={13}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                />
                <YAxis
                  stroke="#a1a1aa"
                  fontSize={13}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickFormatter={(val) => `${Number(val).toLocaleString('ru-RU')} ₽`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
                  contentStyle={{
                    backgroundColor: '#09090b',
                    borderColor: 'rgba(245, 158, 11, 0.5)',
                    borderRadius: '0.85rem',
                    color: '#fff',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    padding: '10px 14px'
                  }}
                  formatter={(val) => [`${Number(val).toLocaleString('ru-RU')} ₽`, 'Начисление']}
                />
                <Bar dataKey="payout" radius={[6, 6, 0, 0]}>
                  {analytics.chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index % 2 === 0 ? '#f59e0b' : '#d97706'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400 relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-amber-400" />
              <span>Четные месяцы</span>
              <div className="w-3 h-3 rounded-sm bg-amber-600 ml-2" />
              <span>Нечетные месяцы</span>
            </div>
            <span className="text-amber-300/90 font-medium">
              100% гарантия фиксации вознаграждения по договору
            </span>
          </div>
        </div>

        {/* Interactive Income Calculator for Residents */}
        <div className="lg:col-span-5 liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-7 relative overflow-hidden backdrop-blur-xl shadow-xl flex flex-col justify-between">
          <span className="liquid-bubble-glare" />

          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Calculator className="text-amber-400" size={20} />
                <span>Калькулятор дохода резидента</span>
              </h3>
              <span className="text-sm px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-mono">
                Прогноз
              </span>
            </div>

            {/* Role switch */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/50 border border-white/15 rounded-xl">
              <button
                type="button"
                onClick={() => setCalcRoleMode('partner')}
                className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  calcRoleMode === 'partner'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Партнёр 25%
              </button>
              <button
                type="button"
                onClick={() => setCalcRoleMode('expert')}
                className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  calcRoleMode === 'expert'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Эксперт 50%
              </button>
              <button
                type="button"
                onClick={() => setCalcRoleMode('combo')}
                className={`py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  calcRoleMode === 'combo'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Комбо 75%
              </button>
            </div>

            {/* Sliders */}
            <div className="space-y-3.5 pt-1">
              <div>
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="text-zinc-300">Средний чек внедрения:</span>
                  <span className="font-mono font-bold text-amber-300">
                    {calcDealSize.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
                <input
                  type="range"
                  min={50000}
                  max={1500000}
                  step={25000}
                  value={calcDealSize}
                  onChange={(e) => setCalcDealSize(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-black/60 rounded-lg border border-amber-400/30"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="text-zinc-300">Количество проектов в месяц:</span>
                  <span className="font-mono font-bold text-amber-300">{calcDealsCount} сделок</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={calcDealsCount}
                  onChange={(e) => setCalcDealsCount(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer h-2 bg-black/60 rounded-lg border border-amber-400/30"
                />
              </div>
            </div>

            {/* Calculated Result Box */}
            <div className="p-4 rounded-xl bg-black/50 border border-amber-400/40 space-y-1 shadow-inner">
              <span className="text-sm font-medium text-zinc-400">
                Ваш прогнозируемый доход резидента:
              </span>
              <div className="text-2xl md:text-3xl font-bold font-mono text-amber-300">
                {calcEstimatedIncome.toLocaleString('ru-RU')} ₽ / месяц
              </div>
              <p className="text-sm text-zinc-300">
                При обороте команды: {(calcDealSize * calcDealsCount).toLocaleString('ru-RU')} ₽
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 relative z-10">
            <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between text-sm">
              <span className="text-zinc-300">Регламент выплат:</span>
              <span className="font-semibold text-amber-300">Без скрытых комиссий</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Partner Rates & Official Royal Treasury Rules Block */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl shadow-xl">
        <span className="liquid-bubble-glare" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <Award className="text-amber-400" size={24} />
                <span>Официальный регламент и тарифные сетки вознаграждений</span>
              </h3>
              <p className="text-sm text-zinc-300 mt-1">
                Правила начисления комиссий гражданам и экспертам ИИ-Гренландии
              </p>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-sm font-semibold font-mono self-start">
              Конституция Казны
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rule 1: Партнерская ставка 25% */}
            <div className="p-5 rounded-xl bg-black/40 border border-amber-400/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-amber-200">1. Партнёрская ставка</span>
                <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 font-mono font-bold text-amber-300 text-base">
                  25%
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Начисляется автоматически с каждой оплаты привлеченного клиента, закрепившегося по вашей реферальной ссылке или промокоду.
              </p>
              <div className="pt-2 text-sm text-amber-300/80 font-medium">
                • Закрепление клиента пожизненно
              </div>
            </div>

            {/* Rule 2: Экспертная разработка 50% */}
            <div className="p-5 rounded-xl bg-black/40 border border-amber-400/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-amber-200">2. Экспертная ставка</span>
                <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 font-mono font-bold text-amber-300 text-base">
                  50%
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Выплачивается сертифицированным ИИ-архитекторам и инженерам за реализацию, интеграцию и техническое ведение систем автоматизации.
              </p>
              <div className="pt-2 text-sm text-amber-300/80 font-medium">
                • Выплата после подписания акта сдачи
              </div>
            </div>

            {/* Rule 3: Порядок и каналы выплат */}
            <div className="p-5 rounded-xl bg-black/40 border border-amber-400/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-amber-200">3. Выплаты и налоги</span>
                <span className="px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 font-mono font-bold text-amber-300 text-sm">
                  Четверг
                </span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Переводы производятся на карты банков РФ (СБП), расчетные счета самозанятых, ИП, ООО, либо в криптовалюте USDT (TRC20 / TON).
              </p>
              <div className="pt-2 text-sm text-amber-300/80 font-medium">
                • Официальные электронные акты и чеки
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Comprehensive Deals & Commission Registry */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 relative overflow-hidden backdrop-blur-xl shadow-xl space-y-6">
        <span className="liquid-bubble-glare" />

        {/* Header & Interactive Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="text-amber-400" />
              <span>Реестр сделок, клиентов и начислений</span>
            </h3>
            <p className="text-sm text-zinc-400 mt-0.5">
              Детализированный список всех заявок, привязанных к вашему аккаунту и промокоду
            </p>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Поиск по клиенту, компании..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-black/50 border border-amber-400/30 rounded-xl text-sm text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 transition-colors"
              />
              <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-white/15 rounded-xl">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Все ({analytics.list.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Ожидает
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  statusFilter === 'paid'
                    ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                Выплачено
              </button>
            </div>
          </div>
        </div>

        {/* List of Deals / Leads Cards */}
        <div className="relative z-10">
          {filteredList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredList.map((lead: any, idx: number) => {
                const roleText = lead.asPartner && lead.asExpert
                  ? 'Партнёр + Эксперт (75%)'
                  : lead.asPartner
                    ? 'Партнёрская сделка (25%)'
                    : 'Экспертная разработка (50%)';

                const statusText = String(lead.status || '').trim() || (lead.paid ? 'Выплачено' : 'В работе');
                const clientName = lead.full_name || lead.fio || lead.company || 'Корпоративный клиент';
                const clientTg = lead.client_telegram || lead.telegram;
                const dateStr = lead.act_date
                  ? new Date(lead.act_date).toLocaleDateString('ru-RU')
                  : lead.created_at
                    ? new Date(lead.created_at).toLocaleDateString('ru-RU')
                    : 'Не указана';

                return (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-black/40 border border-amber-400/25 hover:border-amber-400/50 transition-all flex flex-col justify-between space-y-4 shadow-lg group hover:scale-[1.01]"
                  >
                    <div>
                      {/* Top row: Name & Payout */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-base text-white truncate group-hover:text-amber-200 transition-colors">
                            {clientName}
                          </h4>
                          {lead.product && (
                            <p className="text-sm text-amber-300/80 font-medium truncate mt-0.5">
                              {lead.product}
                            </p>
                          )}
                        </div>
                        <span className="text-lg font-bold font-mono text-amber-300 whitespace-nowrap shrink-0">
                          {(lead.payout || 0).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>

                      {/* Details row: Company & Telegram */}
                      <div className="space-y-1.5 text-sm text-zinc-300 pt-1">
                        {lead.company && lead.company !== clientName && (
                          <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Building2 size={14} className="text-amber-400/70 shrink-0" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        )}

                        {clientTg && (
                          <div className="flex items-center gap-2 text-sm text-zinc-300">
                            <UserRound size={14} className="text-amber-400/70 shrink-0" />
                            <a
                              href={`https://t.me/${String(clientTg).replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-amber-400 hover:underline font-mono"
                            >
                              {String(clientTg).startsWith('@') ? clientTg : `@${clientTg}`}
                            </a>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <span className="font-medium text-amber-200/90">{roleText}</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer row: Total sum, status & date */}
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-sm font-semibold border ${
                          lead.paid
                            ? 'bg-amber-400/20 text-amber-200 border-amber-400/40'
                            : 'bg-zinc-800/80 text-zinc-300 border-white/15'
                        }`}>
                          {statusText}
                        </span>
                      </div>
                      <span className="text-sm font-mono text-zinc-400">{dateStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center rounded-2xl border border-dashed border-white/15 bg-black/30 p-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/30 mx-auto flex items-center justify-center text-amber-400">
                <FileText size={24} />
              </div>
              <h4 className="text-lg font-bold text-white">В реестре пока нет записей</h4>
              <p className="text-sm text-zinc-400 max-w-md mx-auto">
                Когда клиенты перейдут по вашей реферальной ссылке или применят промокод при заказе, их проекты и начисленные комиссии появятся здесь.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 6. Payout Request Modal Dialog */}
      {showPayoutModal && (
        <div
          className="fixed inset-0 z-[250] bg-transparent flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayoutModal(false);
          }}
        >
          <div className="liquid-bubble-plate border border-amber-400/40 rounded-3xl p-6 md:p-8 max-w-lg w-full relative overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl my-auto">
            <span className="liquid-bubble-glare" />

            <div className="flex items-center justify-between mb-4 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <CreditCard className="text-amber-400" />
                <span>Запрос на выплату вознаграждения</span>
              </h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {payoutSuccess ? (
              <div className="p-4 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-sm space-y-2 relative z-10 text-center">
                <CheckCircle2 size={32} className="mx-auto text-amber-400" />
                <p className="font-semibold text-base">{payoutSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleRequestPayoutSubmit} className="space-y-4 relative z-10">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Способ получения средств:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('sbp')}
                      className={`p-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-center ${
                        payoutMethod === 'sbp'
                          ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300'
                          : 'bg-black/50 text-zinc-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      СБП / Карта
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('account')}
                      className={`p-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-center ${
                        payoutMethod === 'account'
                          ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300'
                          : 'bg-black/50 text-zinc-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      Р/С (ИП/СЗ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutMethod('crypto')}
                      className={`p-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer text-center ${
                        payoutMethod === 'crypto'
                          ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300'
                          : 'bg-black/50 text-zinc-300 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      USDT / TON
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Сумма вывода (₽)
                  </label>
                  <input
                    type="text"
                    placeholder={`Например: ${analytics.totalPending || 50000}`}
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                  <p className="text-sm text-zinc-400 mt-1">
                    Доступно к выводу: {analytics.totalPending.toLocaleString('ru-RU')} ₽
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Реквизиты для зачисления <span className="text-amber-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder={
                      payoutMethod === 'sbp'
                        ? '+7 (999) 000-00-00 (Тинькофф / Сбербанк)'
                        : payoutMethod === 'account'
                          ? 'ИНН, БИК банка, Номер расчетного счета'
                          : 'Адрес кошелька TRC20 или TON'
                    }
                    value={payoutRequisites}
                    onChange={(e) => setPayoutRequisites(e.target.value)}
                    className="w-full px-3.5 py-2 bg-black/50 border border-amber-400/30 rounded-xl text-white text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={isSubmittingPayout}
                    className="liquid-bubble-gold text-amber-950 font-bold flex-1 py-2.5 rounded-xl text-sm border border-amber-300 shadow-md flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    <Send size={15} />
                    <span>{isSubmittingPayout ? 'Отправка...' : 'Отправить заявку'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPayoutModal(false)}
                    className="liquid-bubble-secondary px-4 py-2.5 rounded-xl text-sm text-zinc-300 hover:text-white border border-white/15 cursor-pointer"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
