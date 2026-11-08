import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Loader2, Plus, Save, X, User } from 'lucide-react';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';

type Expert = Record<string, any>;

const EDITABLE_FIELDS = [
  { key: 'pseudonym', label: 'Псевдоним' },
  { key: 'greeting', label: 'Приветствие' },
  { key: 'spheres', label: 'Сферы' },
  { key: 'tools', label: 'Инструменты' },
  { key: 'cases', label: 'Кейсы' },
  { key: 'description', label: 'Описание' },
  { key: 'other_info', label: 'Другое' },
  { key: 'photo_url', label: 'Фото URL' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'telegram_id', label: 'Telegram ID' },
  { key: 'status', label: 'Статус' },
];

const AdminExperts: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();

  const [editingExpert, setEditingExpert] = useState<Expert | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: experts, isLoading } = useQuery({
    queryKey: ['admin-experts'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_experts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Expert[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, string | null> }) => {
      const { error } = await protalkDb.from('sav_experts').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-experts'] });
      setEditingExpert(null);
      toast({ title: 'Сохранено' });
    },
    onError: (err: any) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await protalkDb.from('sav_experts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-experts'] });
      setDeleteConfirm(null);
      toast({ title: 'Эксперт удалён' });
    },
    onError: (err: any) => toast({ title: 'Ошибка', description: err.message, variant: 'destructive' }),
  });

  const openEdit = useCallback((expert: Expert) => {
    setEditingExpert(expert);
    const form: Record<string, string> = {};
    EDITABLE_FIELDS.forEach(f => { form[f.key] = expert[f.key] || ''; });
    setEditForm(form);
  }, []);

  const handleSave = () => {
    if (!editingExpert) return;
    const updates: Record<string, string | null> = {};
    EDITABLE_FIELDS.forEach(f => {
      updates[f.key] = editForm[f.key]?.trim() || null;
    });
    updateMutation.mutate({ id: editingExpert.id, updates });
  };

  if (accessLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!hasAccess || accessLevel !== 'admin') return <AccessDenied />;

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/crm')} className="gap-1">
            <ArrowLeft className="h-4 w-4" /> CRM
          </Button>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h1 className="text-base font-bold">Эксперты</h1>
            <span className="text-xs text-muted-foreground">({experts?.length || 0})</span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Фото</TableHead>
                  <TableHead>Псевдоним</TableHead>
                  <TableHead>Сферы</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead className="w-24">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experts?.map(expert => (
                  <TableRow key={expert.id}>
                    <TableCell>
                      {expert.photo_url ? (
                        <img src={expert.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{expert.greeting}{expert.pseudonym || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{expert.spheres || '—'}</TableCell>
                    <TableCell className="text-sm">{expert.status || '—'}</TableCell>
                    <TableCell className="text-sm">{expert.telegram || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(expert)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteConfirm(expert.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpert} onOpenChange={(open) => !open && setEditingExpert(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать эксперта</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {EDITABLE_FIELDS.map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
                {['spheres', 'cases', 'description', 'other_info'].includes(field.key) ? (
                  <Textarea
                    value={editForm[field.key] || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    rows={3}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={editForm[field.key] || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="text-sm"
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExpert(null)}>Отмена</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-1">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить эксперта?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Это действие нельзя отменить.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Отмена</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Удалить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExperts;
