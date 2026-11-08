import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Pencil, Link, RefreshCw, ExternalLink } from 'lucide-react';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';

interface SyncSource {
  id: string;
  name: string;
  description: string | null;
  sheet_url: string;
  sheet_id: string;
  sync_function: string;
  last_synced_at: string | null;
}

const SyncSourcesAdmin: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();
  const [editing, setEditing] = useState<SyncSource | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sheet_url: '', sheet_id: '' });
  const [syncing, setSyncing] = useState<string | null>(null);

  const { data: sources, isLoading } = useQuery({
    queryKey: ['sync-sources'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('sav_sync_sources')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return data as SyncSource[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SyncSource> }) => {
      const { error } = await protalkDb.from('sav_sync_sources').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sync-sources'] });
      setEditing(null);
      toast({ title: 'Сохранено' });
    },
    onError: (err: any) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const openEdit = (source: SyncSource) => {
    setEditing(source);
    setForm({ name: source.name, description: source.description || '', sheet_url: source.sheet_url, sheet_id: source.sheet_id });
  };

  const handleSave = () => {
    if (!editing) return;
    // Extract sheet_id from URL if changed
    let sheetId = form.sheet_id;
    const match = form.sheet_url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) sheetId = match[1];
    updateMutation.mutate({ id: editing.id, updates: { name: form.name, description: form.description || null, sheet_url: form.sheet_url, sheet_id: sheetId } });
  };

  const handleSync = async (source: SyncSource) => {
    setSyncing(source.id);
    try {
      const { data, error } = await protalkDb.functions.invoke(source.sync_function);
      if (error) throw error;
      toast({ title: 'Синхронизация завершена', description: data?.message || JSON.stringify(data) });
      queryClient.invalidateQueries({ queryKey: ['sync-sources'] });
    } catch (err: any) {
      toast({ title: 'Ошибка синхронизации', description: err.message, variant: 'destructive' });
    } finally {
      setSyncing(null);
    }
  };

  if (accessLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!hasAccess || accessLevel !== 'admin') return <AccessDenied />;

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm')} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> CRM
          </Button>
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4 text-primary" />
            <h1 className="text-base font-bold">Источники синхронизации</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          sources?.map(source => (
            <Card key={source.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>{source.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 gap-1" onClick={() => openEdit(source)}>
                      <Pencil className="h-3 w-3" /> Изменить
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 gap-1" disabled={syncing === source.id} onClick={() => handleSync(source)}>
                      <RefreshCw className={`h-3 w-3 ${syncing === source.id ? 'animate-spin' : ''}`} />
                      Синхр.
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs">
                {source.description && <p className="text-muted-foreground">{source.description}</p>}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Sheet ID:</span>
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{source.sheet_id}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Функция:</span>
                  <code className="text-[10px] bg-muted px-1 py-0.5 rounded">{source.sync_function}</code>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Последняя синхр.:</span>
                  <span>{source.last_synced_at ? new Date(source.last_synced_at).toLocaleString('ru') : 'Никогда'}</span>
                </div>
                <a href={source.sheet_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <ExternalLink className="h-3 w-3" /> Открыть таблицу
                </a>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Редактировать источник</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Название</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">Описание</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs">URL таблицы</Label>
              <Input value={form.sheet_url} onChange={e => setForm(f => ({ ...f, sheet_url: e.target.value }))} className="text-sm" placeholder="https://docs.google.com/spreadsheets/d/..." />
            </div>
            <div>
              <Label className="text-xs">Sheet ID (авто из URL)</Label>
              <Input value={form.sheet_id} onChange={e => setForm(f => ({ ...f, sheet_id: e.target.value }))} className="text-sm font-mono" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-1">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SyncSourcesAdmin;
