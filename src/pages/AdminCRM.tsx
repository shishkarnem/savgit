import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RefreshCw, ArrowLeft, Users, LayoutGrid, List, BarChart3, Download, Shield, Loader2, Send, ScrollText, ArrowUp, ArrowDown, Search, Menu, ChevronDown, X, UserPlus, ChevronLeft, ChevronRight, Sliders, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CRMFilters, ColumnFilters } from '@/components/crm/CRMFilters';
import { ClientCardConfigurable } from '@/components/crm/ClientCardConfigurable';
import { KanbanViewDnD } from '@/components/crm/KanbanViewDnD';
import { SettingsConstructor } from '@/components/crm/SettingsConstructor';
import { useCRMSettings } from '@/hooks/useCRMSettings';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { BulkActionsBar } from '@/components/crm/BulkActionsBar';
import { CSVImporter } from '@/components/crm/CSVImporter';
import { AddClientModal } from '@/components/crm/AddClientModal';
import { MemeAutopilotManager } from '@/components/crm/MemeAutopilotManager';

type Client = any;

const PAGE_SIZE_OPTIONS = [25, 100, 1000, -1] as const;
const DEFAULT_PAGE_SIZE = 25;

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено':
    case 'Оплачено':
      return 'bg-amber-400/20 text-amber-200 border-amber-400/50 shadow-sm';
    case 'В работе':
    case 'Обслуживание':
      return 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40';
    case 'Отказ':
    case 'Заблокировано':
      return 'bg-zinc-800/80 text-zinc-300 border-zinc-600/60';
    case 'Инфо':
    case 'Расчет':
      return 'bg-amber-300/15 text-amber-300 border-amber-300/40';
    case 'Договор':
    case 'Предоплата':
    case 'Тариф':
      return 'bg-purple-500/20 text-purple-200 border-purple-400/40';
    case 'Подбор Эксперта':
    case 'Эксперт':
      return 'bg-sky-500/20 text-sky-200 border-sky-400/40';
    default:
      return 'bg-white/10 text-zinc-300 border-white/15';
  }
};

const AdminCRM: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();
  const { tableColumns, kanbanFields, cardSections, toggleTableColumn, toggleKanbanField, toggleCardSection, resetTableColumns, resetKanbanFields, resetCardSections } = useCRMSettings();

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'autopilot'>('table');
  const [search, setSearch] = useState('');
  const [aiSearchEnabled, setAiSearchEnabled] = useState(false);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiMatchedIds, setAiMatchedIds] = useState<string[] | null>(null);
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({ statuses: [], city: 'all', tariff: 'all', expert: 'all', project: '', messageTemplate: 'all', messagePeriod: 'all', messageStatus: 'all', excludeSentClients: false });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [isSyncingClients, setIsSyncingClients] = useState(false);
  const [isSyncingExperts, setIsSyncingExperts] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Column sorting & search
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [columnSearches, setColumnSearches] = useState<Record<string, string>>({});
  const [activeColumnSearch, setActiveColumnSearch] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [addClientOpen, setAddClientOpen] = useState(false);

  // Horizontal Table Scroll Runner
  const tableScrollRef = React.useRef<HTMLDivElement>(null);
  const [tableScrollProgress, setTableScrollProgress] = useState(0);

  const handleTableScroll = () => {
    if (!tableScrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tableScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll > 0) {
      setTableScrollProgress((scrollLeft / maxScroll) * 100);
    } else {
      setTableScrollProgress(0);
    }
  };

  const handleSliderChange = (percent: number) => {
    setTableScrollProgress(percent);
    if (!tableScrollRef.current) return;
    const { scrollWidth, clientWidth } = tableScrollRef.current;
    const maxScroll = scrollWidth - clientWidth;
    tableScrollRef.current.scrollLeft = (percent / 100) * maxScroll;
  };

  const scrollTable = (direction: 'left' | 'right') => {
    if (!tableScrollRef.current) return;
    const offset = direction === 'left' ? -350 : 350;
    tableScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const scrollToEdge = (edge: 'start' | 'end') => {
    if (!tableScrollRef.current) return;
    if (edge === 'start') {
      tableScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      tableScrollRef.current.scrollTo({ left: tableScrollRef.current.scrollWidth, behavior: 'smooth' });
    }
  };

  const { data: clients, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_clients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Client[];
    },
  });

  // Query messages for broadcast filtering
  const { data: recentMessages } = useQuery({
    queryKey: ['crm-messages-filter'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('sav_client_messages')
        .select('client_id, template_name, status, sent_at')
        .eq('direction', 'outgoing')
        .order('sent_at', { ascending: false })
        .limit(5000);
      if (error) throw error;
      return data as { client_id: string; template_name: string | null; status: string; sent_at: string }[];
    },
  });

  const uniqueTemplates = useMemo(() => {
    if (!recentMessages) return [];
    return [...new Set(recentMessages.map(m => m.template_name).filter(Boolean))] as string[];
  }, [recentMessages]);

  const uniqueValues = useMemo(() => {
    if (!clients) return { cities: [], tariffs: [], experts: [] };
    return {
      cities: [...new Set(clients.map((c: Client) => c.city).filter(Boolean))] as string[],
      tariffs: [...new Set(clients.map((c: Client) => c.tariff).filter(Boolean))] as string[],
      experts: [...new Set(clients.map((c: Client) => c.expert_pseudonym || c.expert_name).filter(Boolean))] as string[],
    };
  }, [clients]);

  const statusCounts = useMemo(() => {
    if (!clients) return {};
    return clients.reduce((acc: Record<string, number>, client: Client) => {
      const status = client.status || 'Без статуса';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [clients]);

  const handleAISearch = useCallback(async () => {
    if (!search.trim() || !clients?.length) return;
    setIsAISearching(true);
    try {
      const response = await protalkDb.functions.invoke('sav-ai-search-clients', { body: { query: search, clients, userInfo: { telegram_id: 'crm_admin' } } });
      if (response.error) throw new Error(response.error.message);
      const { matchedIds, error } = response.data;
      if (error) { toast({ title: 'Ошибка ИИ-поиска', description: error, variant: 'destructive' }); return; }
      setAiMatchedIds(matchedIds);
      toast({ title: 'ИИ-поиск завершен', description: `Найдено ${matchedIds.length} клиентов` });
    } catch (error) {
      toast({ title: 'Ошибка ИИ-поиска', description: 'Попробуйте обычный поиск', variant: 'destructive' });
    } finally { setIsAISearching(false); }
  }, [search, clients, toast]);

  const handleBulkSync = useCallback(async () => {
    setIsBulkSyncing(true);
    try {
      const { data, error } = await protalkDb.functions.invoke('sav-sync-telegram-profile', { body: { bulk_sync: true } });
      if (error) { toast({ title: 'Ошибка синхронизации', description: error.message, variant: 'destructive' }); setIsBulkSyncing(false); return; }
      if (data?.background) {
        toast({ title: 'Синхронизация запущена', description: 'Процесс идёт в фоне. Проверьте логи Edge Function.' });
        setTimeout(() => setIsBulkSyncing(false), 3000);
      } else if (data?.success) {
        toast({ title: 'Синхронизация завершена', description: `Загружено: ${data.synced}, ошибок: ${data.failed}` });
        setIsBulkSyncing(false);
      }
    } catch (err) {
      toast({ title: 'Ошибка', description: 'Не удалось выполнить массовую синхронизацию', variant: 'destructive' });
      setIsBulkSyncing(false);
    }
  }, [toast]);

  const handleSyncClients = useCallback(async () => {
    setIsSyncingClients(true);
    try {
      const { data, error } = await protalkDb.functions.invoke('sav-sync-clients');
      if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Синхронизация клиентов', description: `Синхронизировано: ${data?.synced || 0}, ошибок: ${data?.errors || 0}${data?.namesFilled ? `, имён заполнено: ${data.namesFilled}` : ''}` });
      refetch();
    } catch (err) { toast({ title: 'Ошибка', variant: 'destructive' }); }
    finally { setIsSyncingClients(false); }
  }, [toast, refetch]);

  const handleSyncExperts = useCallback(async () => {
    setIsSyncingExperts(true);
    try {
      const { data, error } = await protalkDb.functions.invoke('sav-sync-experts');
      if (error) { toast({ title: 'Ошибка', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Синхронизация экспертов', description: data?.message || 'Готово' });
    } catch (err) { toast({ title: 'Ошибка', variant: 'destructive' }); }
    finally { setIsSyncingExperts(false); }
  }, [toast]);

  const filteredClients = useMemo(() => {
    if (!clients) return [];
    let result: Client[];
    if (aiMatchedIds !== null && aiSearchEnabled) {
      result = clients.filter((c: Client) => aiMatchedIds.includes(c.id));
    } else {
      result = clients.filter((client: Client) => {
        const matchesSearch = !search || [client.full_name, client.telegram_client, client.telegram_id, client.project, client.project_code, client.city, client.tariff, client.expert_name, client.expert_pseudonym, client.comment].some((v: any) => v?.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = columnFilters.statuses.length === 0 || columnFilters.statuses.includes(client.status);
        const matchesCity = columnFilters.city === 'all' || client.city === columnFilters.city;
        const matchesTariff = columnFilters.tariff === 'all' || client.tariff === columnFilters.tariff;
        const matchesExpert = columnFilters.expert === 'all' || client.expert_pseudonym === columnFilters.expert || client.expert_name === columnFilters.expert;
        const matchesProject = !columnFilters.project || client.project?.toLowerCase().includes(columnFilters.project.toLowerCase());
        return matchesSearch && matchesStatus && matchesCity && matchesTariff && matchesExpert && matchesProject;
      });
    }

    // Apply message/broadcast filters
    const hasMessageFilter = columnFilters.messageTemplate !== 'all' || columnFilters.messagePeriod !== 'all' || columnFilters.messageStatus !== 'all';
    if (hasMessageFilter && recentMessages) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterdayStart = new Date(todayStart.getTime() - 86400000);
      const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

      const filteredMsgs = recentMessages.filter(m => {
        const matchTemplate = columnFilters.messageTemplate === 'all' || m.template_name === columnFilters.messageTemplate;
        const matchStatus = columnFilters.messageStatus === 'all' || m.status === columnFilters.messageStatus;
        let matchPeriod = true;
        if (columnFilters.messagePeriod !== 'all') {
          const sentAt = new Date(m.sent_at);
          if (columnFilters.messagePeriod === 'today') matchPeriod = sentAt >= todayStart;
          else if (columnFilters.messagePeriod === 'yesterday') matchPeriod = sentAt >= yesterdayStart && sentAt < todayStart;
          else if (columnFilters.messagePeriod === 'week') matchPeriod = sentAt >= weekStart;
        }
        return matchTemplate && matchStatus && matchPeriod;
      });

      const sentClientIds = new Set(filteredMsgs.map(m => m.client_id));

      if (columnFilters.excludeSentClients) {
        result = result.filter((c: Client) => !sentClientIds.has(c.id));
      } else {
        result = result.filter((c: Client) => sentClientIds.has(c.id));
      }
    }

    // Apply column-level searches
    for (const [key, val] of Object.entries(columnSearches)) {
      if (val.trim()) {
        result = result.filter((c: Client) => {
          const cellVal = key === 'expert' ? (c.expert_pseudonym || c.expert_name || '') : (c[key] || '');
          return cellVal.toString().toLowerCase().includes(val.toLowerCase());
        });
      }
    }

    // Apply column sorting
    if (sortKey) {
      result = [...result].sort((a, b) => {
        const aVal = (sortKey === 'expert' ? (a.expert_pseudonym || a.expert_name) : a[sortKey]) || '';
        const bVal = (sortKey === 'expert' ? (b.expert_pseudonym || b.expert_name) : b[sortKey]) || '';
        const cmp = aVal.toString().localeCompare(bVal.toString(), 'ru');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [clients, search, columnFilters, aiMatchedIds, aiSearchEnabled, columnSearches, sortKey, sortDir, recentMessages]);

  const effectivePageSize = pageSize === -1 ? filteredClients.length : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(filteredClients.length / effectivePageSize) : 1;
  const paginatedClients = pageSize === -1 ? filteredClients : filteredClients.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  const handleClientClick = (client: Client) => { setSelectedClient(client); setCardOpen(true); };
  const handleSearchChange = (value: string) => { setSearch(value); setCurrentPage(1); if (aiMatchedIds !== null) setAiMatchedIds(null); };
  const handleAISearchToggle = () => { setAiSearchEnabled(!aiSearchEnabled); setAiMatchedIds(null); };
  const handleClientStatusChange = useCallback(() => { refetch(); }, [refetch]);
  const visibleColumns = tableColumns.filter(col => col.visible);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(null); setSortDir('asc'); }
    } else {
      setSortKey(key); setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const renderCellContent = (client: Client, columnKey: string) => {
    switch (columnKey) {
      case 'project_code':
        return <span className="font-mono text-sm text-zinc-300">{client.project_code || '—'}</span>;
      case 'full_name': {
        const cleanTg = client.telegram_id ? String(client.telegram_id).trim() : '';
        const hasTg = Boolean(cleanTg && cleanTg !== '0' && cleanTg !== 'null' && cleanTg !== 'undefined' && cleanTg !== '—');
        return (
          <div className="max-w-[240px]">
            <div className="font-semibold text-sm text-zinc-100 truncate hover:text-amber-300 transition-colors">
              {client.full_name || client.telegram_client || 'Без имени'}
            </div>
            {hasTg ? (
              <div className="text-xs text-amber-300 font-mono mt-0.5">
                Telegram ID: {cleanTg}
              </div>
            ) : (
              <div className="text-xs text-zinc-400 mt-0.5">
                Telegram не привязан
              </div>
            )}
          </div>
        );
      }
      case 'status':
        return <Badge variant="outline" className={`text-sm py-0.5 px-2.5 rounded-full ${getStatusColor(client.status)}`}>{client.status || 'Новый'}</Badge>;
      case 'expert':
        return <span className="text-sm text-zinc-200">{client.expert_pseudonym || client.expert_name || '—'}</span>;
      case 'comment':
        return <div className="max-w-[240px] truncate text-sm text-zinc-300">{client.comment || '—'}</div>;
      default:
        return <span className="text-sm text-zinc-200">{client[columnKey] || '—'}</span>;
    }
  };

  if (accessLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!hasAccess) return <AccessDenied />;

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => navigate('/')} className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px] hover:bg-primary/20 transition-colors shrink-0" title="На главную">SAV</button>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
                <div><h1 className="text-base font-bold leading-tight">CRM</h1><p className="text-[10px] text-muted-foreground">{clients?.length || 0} записей</p></div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {/* Sync dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncingClients || isSyncingExperts || isBulkSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Синхр.</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSyncClients} disabled={isSyncingClients}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncingClients ? 'animate-spin' : ''}`} />
                    {isSyncingClients ? 'Синхр...' : 'Клиенты (Google)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSyncExperts} disabled={isSyncingExperts}>
                    <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isSyncingExperts ? 'animate-spin' : ''}`} />
                    {isSyncingExperts ? 'Синхр...' : 'Эксперты (Google)'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBulkSync} disabled={isBulkSyncing}>
                    <Download className={`h-3.5 w-3.5 mr-2 ${isBulkSyncing ? 'animate-pulse' : ''}`} />
                    {isBulkSyncing ? 'Синхр...' : 'Telegram профили'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddClientOpen(true)}
                className="gap-1.5 h-7 text-xs bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border-amber-400/40 transition-all font-medium"
                title="Добавить клиента вручную в базу CRM"
              >
                <UserPlus className="h-3.5 w-3.5 text-amber-400" />
                <span className="hidden sm:inline">Добавить</span>
                <span className="sm:hidden">+</span>
              </Button>

              <CSVImporter />

              {accessLevel === 'admin' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                      <Menu className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Админ</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setViewMode('autopilot')}><Sparkles className="h-3.5 w-3.5 mr-2 text-amber-400" />Мем-Автопилот</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/messages')}><Send className="h-3.5 w-3.5 mr-2" />Шаблон рассылки</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/logs')}><ScrollText className="h-3.5 w-3.5 mr-2" />Логи</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/admins')}><Shield className="h-3.5 w-3.5 mr-2" />Доступ</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/dashboard')}><BarChart3 className="h-3.5 w-3.5 mr-2" />Аналитика</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/profiles')}><Users className="h-3.5 w-3.5 mr-2" />Telegram профили</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/experts')}><Users className="h-3.5 w-3.5 mr-2" />Эксперты</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/sync-sources')}><RefreshCw className="h-3.5 w-3.5 mr-2" />Источники синхр.</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/admin/crm/bot-logs')}><ScrollText className="h-3.5 w-3.5 mr-2" />Логи бота</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {accessLevel !== 'admin' && (
                <Button variant="outline" size="sm" onClick={() => navigate('/admin/crm/dashboard')} className="gap-1 h-7 text-xs"><BarChart3 className="h-3.5 w-3.5" /></Button>
              )}

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'kanban' | 'autopilot')}>
                <TabsList className="h-7">
                  <TabsTrigger value="table" className="gap-1 h-6 text-xs px-2" title="Таблица клиентов"><List className="h-3.5 w-3.5" /></TabsTrigger>
                  <TabsTrigger value="kanban" className="gap-1 h-6 text-xs px-2" title="Канбан-доска"><LayoutGrid className="h-3.5 w-3.5" /></TabsTrigger>
                  <TabsTrigger value="autopilot" className="gap-1 h-6 text-xs px-2 text-amber-300 font-semibold" title="Мем-Автопилот (раз в 2 дня 07:00 МСК)"><Sparkles className="h-3 w-3 text-amber-400" /><span className="hidden md:inline">Автопилот</span></TabsTrigger>
                </TabsList>
              </Tabs>
              {viewMode === 'table' && <SettingsConstructor mode="table" tableColumns={tableColumns} onToggleTableColumn={toggleTableColumn} onResetTableColumns={resetTableColumns} />}
              {viewMode === 'kanban' && <SettingsConstructor mode="kanban" kanbanFields={kanbanFields} onToggleKanbanField={toggleKanbanField} onResetKanbanFields={resetKanbanFields} />}
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="h-7 w-7 p-0"><RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {viewMode !== 'autopilot' && (
          <>
            <CRMFilters search={search} onSearchChange={handleSearchChange} columnFilters={columnFilters} onColumnFiltersChange={(filters) => { setColumnFilters(filters); setCurrentPage(1); }} statusCounts={statusCounts} uniqueCities={uniqueValues.cities} uniqueTariffs={uniqueValues.tariffs} uniqueExperts={uniqueValues.experts} uniqueTemplates={uniqueTemplates} onAISearch={handleAISearch} isAISearching={isAISearching} aiSearchEnabled={aiSearchEnabled} onAISearchToggle={handleAISearchToggle} />

            <div className="flex items-center justify-between my-4 flex-wrap gap-2">
              <div className="text-sm text-zinc-300 font-medium">
                Найдено: <strong className="text-amber-300 font-bold">{filteredClients.length}</strong> клиентов
                {aiMatchedIds !== null && aiSearchEnabled && <span className="ml-2 text-amber-400 font-semibold">(ИИ-поиск)</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Строк:</span>
                {PAGE_SIZE_OPTIONS.map(size => (
                  <button key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }}
                    className={`text-xs px-2 py-0.5 rounded-lg border transition-all ${pageSize === size ? 'bg-amber-400/20 border-amber-400/50 text-amber-300 font-bold' : 'border-white/10 text-zinc-400 hover:text-white hover:border-white/20'}`}>
                    {size === -1 ? 'Все' : size}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="p-12 text-center text-zinc-400 text-sm">Загрузка данных...</div>
        ) : viewMode === 'autopilot' ? (
          <MemeAutopilotManager />
        ) : viewMode === 'kanban' ? (
          <KanbanViewDnD clients={filteredClients} onClientClick={handleClientClick} kanbanFields={kanbanFields} onClientStatusChange={handleClientStatusChange} />
        ) : (
          <>
            <div className="border border-white/15 rounded-2xl overflow-hidden bg-zinc-950/70 backdrop-blur-2xl shadow-xl">
              {/* Верхний бегунок прокрутки таблицы влево и вправо над заголовками */}
              <div className="bg-zinc-900/80 border-b border-white/10 px-4 py-2.5 flex items-center justify-between gap-3 text-sm text-zinc-300">
                <div className="flex items-center gap-2 shrink-0">
                  <div className="p-1.5 rounded-lg bg-amber-400/10 border border-amber-400/30 text-amber-300">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-sm text-zinc-200 hidden sm:inline">
                    Прокрутка таблицы:
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-xl mx-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => scrollTable('left')}
                    className="h-8 px-2.5 text-xs bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200 gap-1 shrink-0"
                    title="Прокрутить влево"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden md:inline">Влево</span>
                  </Button>

                  <div className="flex-1 relative flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={tableScrollProgress}
                      onChange={(e) => handleSliderChange(Number(e.target.value))}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none border border-white/10 hover:border-amber-400/40 transition-colors"
                      title="Передвигайте бегунок для прокрутки таблицы влево и вправо"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => scrollTable('right')}
                    className="h-8 px-2.5 text-xs bg-white/5 hover:bg-white/10 border-white/15 text-zinc-200 gap-1 shrink-0"
                    title="Прокрутить вправо"
                  >
                    <span className="hidden md:inline">Вправо</span>
                    <ChevronRight className="h-3.5 w-3.5 text-amber-400" />
                  </Button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-mono text-amber-300/90 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                    {Math.round(tableScrollProgress)}%
                  </span>
                </div>
              </div>

              <div className="relative">
                <div
                  ref={tableScrollRef}
                  onScroll={handleTableScroll}
                  className="overflow-x-auto custom-scrollbar"
                >
                  <Table className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow className="bg-white/[0.03] border-b border-white/10 hover:bg-transparent">
                        <TableHead className="w-12 text-center">
                          <Checkbox
                            checked={paginatedClients.length > 0 && paginatedClients.every((c: Client) => selectedIds.has(c.id))}
                            onCheckedChange={(checked) => {
                              setSelectedIds(prev => {
                                const next = new Set(prev);
                                if (checked) filteredClients.forEach((c: Client) => next.add(c.id));
                                else filteredClients.forEach((c: Client) => next.delete(c.id));
                                return next;
                              });
                            }}
                            title="Выбрать всех"
                          />
                        </TableHead>
                        {visibleColumns.map((col) => (
                          <TableHead key={col.key} className="whitespace-nowrap p-0">
                            <div className="px-3 py-2">
                              <button
                                className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200 hover:text-amber-300 transition-colors w-full"
                                onClick={() => toggleSort(col.key)}
                              >
                                <span>{col.label}</span>
                                {sortKey === col.key && (sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-amber-400" /> : <ArrowDown className="h-3.5 w-3.5 text-amber-400" />)}
                              </button>
                              {activeColumnSearch === col.key ? (
                                <div className="flex items-center gap-1 mt-1">
                                  <Input
                                    value={columnSearches[col.key] || ''}
                                    onChange={e => {
                                      setColumnSearches(prev => ({ ...prev, [col.key]: e.target.value }));
                                      setCurrentPage(1);
                                    }}
                                    placeholder="Поиск..."
                                    className="h-6 text-xs bg-zinc-900 border-white/15 text-zinc-100 rounded-lg min-w-0"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => {
                                      setActiveColumnSearch(null);
                                      setColumnSearches(prev => {
                                        const n = { ...prev };
                                        delete n[col.key];
                                        return n;
                                      });
                                    }}
                                    className="text-zinc-400 hover:text-white"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setActiveColumnSearch(col.key)}
                                  className={`mt-1 transition-colors ${columnSearches[col.key] ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-400'}`}
                                  title="Поиск в этом столбце"
                                >
                                  <Search className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedClients.length === 0 ? (
                        <TableRow className="hover:bg-transparent border-b border-white/5">
                          <TableCell colSpan={visibleColumns.length + 1} className="py-16 text-center text-zinc-400">
                            <div className="flex flex-col items-center justify-center gap-3">
                              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-400 shadow-lg">
                                <Search className="h-6 w-6" />
                              </div>
                              <div className="text-base font-semibold text-zinc-200">Клиенты не найдены</div>
                              <div className="text-sm text-zinc-400 max-w-md">
                                По текущему поисковому запросу или фильтрам записей не найдено. Вы можете скорректировать фильтры или добавить нового клиента вручную.
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                                {(Object.keys(columnSearches).length > 0 || search) && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setColumnSearches({});
                                      setActiveColumnSearch(null);
                                      handleSearchChange('');
                                    }}
                                    className="text-sm bg-white/10 hover:bg-white/15 border-white/20 text-zinc-200"
                                  >
                                    Сбросить фильтры поиска
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setAddClientOpen(true)}
                                  className="text-sm bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/40 text-amber-300 gap-1.5"
                                >
                                  <UserPlus className="h-4 w-4 text-amber-400" />
                                  <span>Добавить клиента</span>
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedClients.map((client: Client) => (
                          <TableRow
                            key={client.id}
                            className={`hover:bg-white/[0.04] border-b border-white/5 cursor-pointer transition-colors ${selectedIds.has(client.id) ? 'bg-amber-400/5' : ''}`}
                            onClick={() => handleClientClick(client)}
                          >
                            <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                              <Checkbox
                                checked={selectedIds.has(client.id)}
                                onCheckedChange={(checked) => {
                                  setSelectedIds(prev => {
                                    const next = new Set(prev);
                                    if (checked) next.add(client.id);
                                    else next.delete(client.id);
                                    return next;
                                  });
                                }}
                              />
                            </TableCell>
                            {visibleColumns.map((col) => (
                              <TableCell key={col.key} className="py-3 px-3">
                                {renderCellContent(client, col.key)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem><PaginationPrevious onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      return <PaginationItem key={pageNum}><PaginationLink onClick={() => setCurrentPage(pageNum)} isActive={currentPage === pageNum} className="cursor-pointer">{pageNum}</PaginationLink></PaginationItem>;
                    })}
                    <PaginationItem><PaginationNext onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        <BulkActionsBar
          selectedIds={selectedIds}
          clients={filteredClients}
          onClearSelection={() => setSelectedIds(new Set())}
          onRefresh={() => { refetch(); setSelectedIds(new Set()); }}
          onSelectOnlyTelegram={(tgIds) => setSelectedIds(new Set(tgIds))}
        />
      </main>

      <ClientCardConfigurable client={selectedClient} open={cardOpen} onOpenChange={setCardOpen} cardSections={cardSections} onToggleCardSection={toggleCardSection} onResetCardSections={resetCardSections} />
      <AddClientModal open={addClientOpen} onOpenChange={setAddClientOpen} onSuccess={() => refetch()} />
    </div>
  );
};

export default AdminCRM;
