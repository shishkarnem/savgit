import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ArrowLeft, Loader2, Search, RefreshCw, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const PAGE_SIZE = 50;

type TelegramProfile = {
  id: string; telegram_id: number; first_name: string | null; last_name: string | null;
  username: string | null; photo_url: string | null; referral_code: string | null;
  referred_by: string | null; created_at: string; updated_at: string;
};

const CRMTelegramProfiles: React.FC = () => {
  const navigate = useNavigate();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: profiles, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['telegram-profiles'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_telegram_profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as TelegramProfile[];
    },
    enabled: hasAccess,
  });

  const filtered = useMemo(() => {
    if (!profiles) return [];
    if (!search.trim()) return profiles;
    const q = search.toLowerCase();
    return profiles.filter(p =>
      p.first_name?.toLowerCase().includes(q) || p.last_name?.toLowerCase().includes(q) ||
      p.username?.toLowerCase().includes(q) || String(p.telegram_id).includes(q) ||
      p.referral_code?.toLowerCase().includes(q) || p.referred_by?.toLowerCase().includes(q)
    );
  }, [profiles, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
                <div><h1 className="text-xl font-bold">Telegram профили</h1><p className="text-sm text-muted-foreground">{filtered.length} из {profiles?.length || 0}</p></div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Обновить</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Поиск по имени, username, ID..." className="pl-9" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="border border-border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Фото</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Telegram ID</TableHead>
                  <TableHead>Реф. код</TableHead>
                  <TableHead>Приглашён</TableHead>
                  <TableHead className="w-[140px]">Дата</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Avatar className="h-9 w-9">
                        {p.photo_url ? <AvatarImage src={p.photo_url} alt={p.first_name || ''} /> : null}
                        <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                          {(p.first_name?.[0] || '') + (p.last_name?.[0] || '') || '?'}
                        </AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{[p.first_name, p.last_name].filter(Boolean).join(' ') || '—'}</TableCell>
                    <TableCell className="text-sm">{p.username ? `@${p.username}` : '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{p.telegram_id}</TableCell>
                    <TableCell className="text-xs font-mono">{p.referral_code || '—'}</TableCell>
                    <TableCell className="text-xs">{p.referred_by || '—'}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{format(new Date(p.created_at), 'dd.MM.yy HH:mm', { locale: ru })}</TableCell>
                  </TableRow>
                ))}
                {paginated.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Нет профилей</TableCell></TableRow>}
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

export default CRMTelegramProfiles;
