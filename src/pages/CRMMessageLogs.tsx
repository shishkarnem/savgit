import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Loader2, Search, MessageSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const PAGE_SIZE_OPTIONS = [25, 100, 1000, -1] as const;
const DEFAULT_PAGE_SIZE = 50;

const statusColors: Record<string, string> = {
  sent: 'bg-green-500/20 text-green-400 border-green-500/30',
  delivered: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  read: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

type MessageLog = { id: string; client_id: string; telegram_id: string; direction: string; message: string; sent_at: string; status: string; error_message: string | null; media?: any[] };

const CRMMessageLogs: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const { data: messages, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['all-messages'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_client_messages').select('*').order('sent_at', { ascending: false }).limit(1000);
      if (error) throw error;
      return data as MessageLog[];
    },
    enabled: hasAccess,
  });

  const { data: clients } = useQuery({
    queryKey: ['clients-names'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_clients').select('id, full_name, telegram_client, telegram_id');
      if (error) throw error;
      return data as any[];
    },
    enabled: hasAccess,
  });

  const clientMap = useMemo(() => {
    const map = new Map<string, string>();
    clients?.forEach((c: any) => { map.set(c.id, c.full_name || c.telegram_client || c.telegram_id || c.id); });
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!messages) return [];
    return messages.filter(msg => {
      const matchesSearch = !search || msg.message?.toLowerCase().includes(search.toLowerCase()) || msg.telegram_id?.toLowerCase().includes(search.toLowerCase()) || clientMap.get(msg.client_id)?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || msg.status === statusFilter;
      const matchesDirection = directionFilter === 'all' || msg.direction === directionFilter;
      return matchesSearch && matchesStatus && matchesDirection;
    });
  }, [messages, search, statusFilter, directionFilter, clientMap]);

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
                <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-xl font-bold">Логи сообщений</h1><p className="text-sm text-muted-foreground">{filtered.length} из {messages?.length || 0}</p></div>
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
            <Input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Поиск по тексту, ID, имени..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Статус" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="sent">Sent</SelectItem><SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="read">Read</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={directionFilter} onValueChange={v => { setDirectionFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="Направление" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Все</SelectItem><SelectItem value="outgoing">Исходящие</SelectItem><SelectItem value="incoming">Входящие</SelectItem></SelectContent>
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
                  <TableHead className="w-[140px]">Дата</TableHead><TableHead className="w-[80px]">Тип</TableHead>
                  <TableHead className="w-[80px]">Статус</TableHead><TableHead className="w-[150px]">Клиент</TableHead>
                  <TableHead className="w-[100px]">Telegram ID</TableHead><TableHead>Сообщение</TableHead>
                  <TableHead className="w-[60px]">Медиа</TableHead><TableHead className="w-[200px]">Ошибка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(msg => (
                  <TableRow key={msg.id} className={msg.status === 'failed' ? 'bg-destructive/5' : ''}>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(msg.sent_at), 'dd.MM.yy HH:mm:ss', { locale: ru })}</TableCell>
                    <TableCell><Badge variant="outline" className={msg.direction === 'outgoing' ? 'text-primary border-primary/30' : 'text-muted-foreground'}>{msg.direction === 'outgoing' ? '→' : '←'}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[msg.status] || ''}>{msg.status}</Badge></TableCell>
                    <TableCell className="text-sm truncate max-w-[150px]">{clientMap.get(msg.client_id) || msg.client_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs font-mono">{msg.telegram_id}</TableCell>
                    <TableCell className="text-xs max-w-[300px]"><div className="truncate" title={msg.message}>{msg.message?.slice(0, 100) || '—'}</div></TableCell>
                    <TableCell className="text-xs text-center">{Array.isArray(msg.media) && msg.media.length > 0 ? `📎${msg.media.length}` : '—'}</TableCell>
                    <TableCell className="text-xs text-destructive max-w-[200px] truncate">{msg.error_message || '—'}</TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Нет сообщений</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem><PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => { const page = currentPage <= 3 ? i + 1 : currentPage + i - 2; if (page < 1 || page > totalPages) return null; return (<PaginationItem key={page}><PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink></PaginationItem>); })}
              <PaginationItem><PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
};

export default CRMMessageLogs;
