import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, TrendingUp, DollarSign, Calendar, RefreshCw, BarChart3, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Area, AreaChart, Funnel, FunnelChart, LabelList,
} from 'recharts';

type Client = any;

const STATUS_COLORS: Record<string, string> = {
  'Инфо': '#EAB308', 'Расчет': '#CA8A04', 'Договор': '#A855F7', 'Предоплата': '#9333EA',
  'Тариф': '#7E22CE', 'Подбор Эксперта': '#06B6D4', 'Эксперт': '#0891B2',
  'В работе': '#3B82F6', 'Обслуживание': '#2563EB', 'Выполнено': '#22C55E',
  'Отказ': '#EF4444', 'Заблокировано': '#B91C1C', 'Бот создан': '#10B981',
  'Партнер': '#F59E0B', 'Не на связи': '#6B7280', 'Дубль': '#9CA3AF', 'Без напоминаний': '#D1D5DB',
};

const FUNNEL_STAGES = ['Инфо', 'Расчет', 'Договор', 'Предоплата', 'Тариф', 'Подбор Эксперта', 'Эксперт', 'В работе', 'Обслуживание', 'Выполнено'];

const CRMDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();

  const { data: clients, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-clients'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  const stats = useMemo(() => {
    if (!clients) return null;
    const statusDistribution = clients.reduce((acc: Record<string, number>, c: Client) => { acc[c.status || 'Без статуса'] = (acc[c.status || 'Без статуса'] || 0) + 1; return acc; }, {});
    const cityDistribution = clients.reduce((acc: Record<string, number>, c: Client) => { acc[c.city || 'Не указан'] = (acc[c.city || 'Не указан'] || 0) + 1; return acc; }, {});
    const tariffDistribution = clients.reduce((acc: Record<string, number>, c: Client) => { acc[c.tariff || 'Не указан'] = (acc[c.tariff || 'Не указан'] || 0) + 1; return acc; }, {});
    const expertDistribution = clients.reduce((acc: Record<string, number>, c: Client) => { acc[c.expert_pseudonym || c.expert_name || 'Не назначен'] = (acc[c.expert_pseudonym || c.expert_name || 'Не назначен'] || 0) + 1; return acc; }, {});
    const monthlyDynamics = clients.reduce((acc: Record<string, number>, c: Client) => {
      if (c.calculator_date) { const d = new Date(c.calculator_date); acc[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = (acc[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] || 0) + 1; }
      return acc;
    }, {});
    const funnelData = FUNNEL_STAGES.map(s => ({ name: s, value: statusDistribution[s] || 0, fill: STATUS_COLORS[s] || '#6B7280' }));
    const completed = statusDistribution['Выполнено'] || 0;
    const rejected = statusDistribution['Отказ'] || 0;
    const blocked = statusDistribution['Заблокировано'] || 0;
    const total = clients.length;
    const active = total - rejected - blocked;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0';
    const rejectionRate = total > 0 ? ((rejected / total) * 100).toFixed(1) : '0';
    const inProgress = clients.filter((c: Client) => ['В работе', 'Обслуживание', 'Эксперт', 'Подбор Эксперта'].includes(c.status || '')).length;
    const totalSavCost = clients.reduce((sum: number, c: Client) => { if (c.sav_cost) { const v = parseFloat(c.sav_cost.replace(/[^\d.-]/g, '')); return sum + (isNaN(v) ? 0 : v); } return sum; }, 0);
    return { total, active, completed, rejected, blocked, inProgress, successRate, rejectionRate, totalSavCost, statusDistribution, cityDistribution, tariffDistribution, expertDistribution, monthlyDynamics, funnelData };
  }, [clients]);

  const statusChartData = useMemo(() => stats ? (Object.entries(stats.statusDistribution) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name] || '#6B7280' })) : [], [stats]);
  const cityChartData = useMemo(() => stats ? (Object.entries(stats.cityDistribution) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })) : [], [stats]);
  const tariffChartData = useMemo(() => stats ? (Object.entries(stats.tariffDistribution) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })) : [], [stats]);
  const expertChartData = useMemo(() => stats ? (Object.entries(stats.expertDistribution) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value })) : [], [stats]);
  const monthlyChartData = useMemo(() => stats ? (Object.entries(stats.monthlyDynamics) as [string, number][]).sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([month, count]) => ({ month: month.split('-').reverse().join('.'), count })) : [], [stats]);

  if (accessLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!hasAccess) return <AccessDenied />;
  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-muted-foreground">Загрузка аналитики...</div></div>;

  const tooltipStyle = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/crm')}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-xl font-bold">Аналитика CRM</h1><p className="text-sm text-muted-foreground">Дашборд и статистика</p></div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Обновить</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Всего</span></div><div className="text-2xl font-bold mt-1">{stats?.total || 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Выполнено</span></div><div className="text-2xl font-bold mt-1 text-green-500">{stats?.completed || 0}</div><div className="text-xs text-muted-foreground">{stats?.successRate}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">В работе</span></div><div className="text-2xl font-bold mt-1 text-blue-500">{stats?.inProgress || 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-red-500 rotate-180" /><span className="text-xs text-muted-foreground">Отказы</span></div><div className="text-2xl font-bold mt-1 text-red-500">{stats?.rejected || 0}</div><div className="text-xs text-muted-foreground">{stats?.rejectionRate}%</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-cyan-500" /><span className="text-xs text-muted-foreground">Активные</span></div><div className="text-2xl font-bold mt-1 text-cyan-500">{stats?.active || 0}</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">SAV сумма</span></div><div className="text-lg font-bold mt-1">{stats?.totalSavCost.toLocaleString('ru-RU')} ₽</div></CardContent></Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="text-base">Воронка продаж</CardTitle></CardHeader><CardContent><div className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><FunnelChart><Tooltip contentStyle={tooltipStyle} /><Funnel dataKey="value" data={stats?.funnelData || []} isAnimationActive><LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" fontSize={11} /><LabelList position="center" fill="white" stroke="none" dataKey="value" fontWeight="bold" /></Funnel></FunnelChart></ResponsiveContainer></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Распределение по статусам</CardTitle></CardHeader><CardContent><div className="h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>{statusChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div></CardContent></Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="text-base">Динамика по месяцам</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyChartData}><defs><linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorCount)" name="Клиентов" /></AreaChart></ResponsiveContainer></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Топ-10 городов</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={cityChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><YAxis dataKey="name" type="category" width={100} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Клиентов" /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card><CardHeader><CardTitle className="text-base">Распределение по тарифам</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={tariffChartData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} angle={-45} textAnchor="end" height={80} /><YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} name="Клиентов" /></BarChart></ResponsiveContainer></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Топ-10 экспертов</CardTitle></CardHeader><CardContent><div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={expertChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><YAxis dataKey="name" type="category" width={120} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="value" fill="#06B6D4" radius={[0, 4, 4, 0]} name="Клиентов" /></BarChart></ResponsiveContainer></div></CardContent></Card>
        </div>

        {/* Conversion Table */}
        <Card><CardHeader><CardTitle className="text-base">Конверсия по этапам воронки</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border"><th className="text-left py-2 px-3 font-medium">Этап</th><th className="text-right py-2 px-3 font-medium">Количество</th><th className="text-right py-2 px-3 font-medium">% от всех</th><th className="text-right py-2 px-3 font-medium">Конверсия</th></tr></thead><tbody>{stats?.funnelData.map((stage: any, index: number) => {
          const prevValue = index > 0 ? stats.funnelData[index - 1].value : stats.total;
          const conversion = prevValue > 0 ? ((stage.value / prevValue) * 100).toFixed(1) : '—';
          const pct = stats.total > 0 ? ((stage.value / stats.total) * 100).toFixed(1) : '0';
          return (<tr key={stage.name} className="border-b border-border/50 hover:bg-muted/20"><td className="py-2 px-3"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.fill }} />{stage.name}</div></td><td className="text-right py-2 px-3 font-medium">{stage.value}</td><td className="text-right py-2 px-3 text-muted-foreground">{pct}%</td><td className="text-right py-2 px-3">{index === 0 ? '—' : `${conversion}%`}</td></tr>);
        })}</tbody></table></div></CardContent></Card>
      </main>
    </div>
  );
};

export default CRMDashboard;