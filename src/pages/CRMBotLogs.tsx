import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Loader2, Search, Bot, RefreshCw, MessageSquare, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const PAGE_SIZE_OPTIONS = [25, 100, 500, -1] as const;
const DEFAULT_PAGE_SIZE = 25;

const CRMBotLogs: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['sav-bot-logs'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('savlogs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: hasAccess,
  });

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const matchesSearch = !search ||
        log.fio?.toLowerCase().includes(search.toLowerCase()) ||
        log.telegram_id?.toLowerCase().includes(search.toLowerCase()) ||
        log.user_message?.toLowerCase().includes(search.toLowerCase()) ||
        log.bot_reply?.toLowerCase().includes(search.toLowerCase()) ||
        log.channel_name?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [logs, search, statusFilter]);

  const uniqueStatuses = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.status).filter(Boolean))] as string[];
  }, [logs]);

  const effectivePageSize = pageSize === -1 ? filtered.length : pageSize;
  const totalPages = effectivePageSize > 0 ? Math.ceil(filtered.length / effectivePageSize) : 1;
  const paginated = pageSize === -1 ? filtered : filtered.slice((currentPage - 1) * effectivePageSize, currentPage * effectivePageSize);

  if (accessLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!hasAccess) return <AccessDenied />;

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin/crm')}><ArrowLeft className="h-5 w-5" /></Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Bot className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-xl font-bold">Логи бота</h1><p className="text-sm text-muted-foreground">{filtered.length} из {logs?.length || 0}</p></div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Обновить</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Поиск по ФИО, ID, сообщению..." className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {uniqueStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">Строк:</span>
            {PAGE_SIZE_OPTIONS.map(size => (
              <button key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${pageSize === size ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {size === -1 ? 'Все' : size}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Дата</TableHead>
                  <TableHead className="w-[120px]">ФИО</TableHead>
                  <TableHead className="w-[100px]">Telegram ID</TableHead>
                  <TableHead className="w-[80px]">Статус</TableHead>
                  <TableHead className="w-[80px]">LLM</TableHead>
                  <TableHead>Сообщение пользователя</TableHead>
                  <TableHead>Ответ бота</TableHead>
                  <TableHead className="w-[80px]">Токены</TableHead>
                  <TableHead>Выбор эксперта</TableHead>
                  <TableHead>Партнёр</TableHead>
                  <TableHead className="w-[120px]">Ошибки</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(log => (
                  <TableRow key={log.id} className={log.function_error ? 'bg-destructive/5' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {log.created_at ? format(new Date(log.created_at), 'dd.MM.yy HH:mm:ss', { locale: ru }) : '—'}
                    </TableCell>
                    <TableCell className="text-sm truncate max-w-[120px]">{log.fio || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{log.telegram_id || '—'}</TableCell>
                    <TableCell>
                      {log.status ? <Badge variant="outline" className="text-xs">{log.status}</Badge> : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{log.llm || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[250px]">
                      <div className="truncate" title={log.user_message}>{log.user_message?.slice(0, 100) || log.message_user_text?.slice(0, 100) || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs max-w-[250px]">
                      <div className="truncate" title={log.bot_reply}>{log.bot_reply?.slice(0, 100) || log.message_ai_text?.slice(0, 100) || '—'}</div>
                    </TableCell>
                    <TableCell className="text-xs text-center">{log.tokens_total || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{log.choose_expert || '—'}</TableCell>
                    <TableCell className="text-xs max-w-[150px] truncate">{log.partner_name || '—'}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[120px] truncate">
                      {log.function_error || log.error_id || '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && (
                  <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Нет логов</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage + i - 2;
                if (page < 1 || page > totalPages) return null;
                return (<PaginationItem key={page}><PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink></PaginationItem>);
              })}
              <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default CRMBotLogs;
