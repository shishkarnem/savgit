import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, 
  UserPlus, 
  Trash2, 
  ArrowLeft, 
  Loader2,
  Crown,
  Eye,
  Edit3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type AccessLevel = 'viewer' | 'editor' | 'admin';

interface CRMAdmin {
  id: string;
  telegram_id: number;
  access_level: AccessLevel;
  name: string | null;
  created_at: string;
  updated_at: string;
}

const accessLevelLabels: Record<AccessLevel, string> = {
  viewer: 'Просмотр',
  editor: 'Редактор',
  admin: 'Администратор',
};

const accessLevelColors: Record<AccessLevel, string> = {
  viewer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  editor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  admin: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
};

const accessLevelIcons: Record<AccessLevel, React.ReactNode> = {
  viewer: <Eye className="w-3 h-3" />,
  editor: <Edit3 className="w-3 h-3" />,
  admin: <Crown className="w-3 h-3" />,
};

export default function CRMAdmins() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { hasAccess, accessLevel, isLoading: accessLoading } = useCRMAccess();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTelegramId, setNewTelegramId] = useState('');
  const [newName, setNewName] = useState('');
  const [newAccessLevel, setNewAccessLevel] = useState<AccessLevel>('viewer');

  // Fetch admins
  const { data: admins, isLoading } = useQuery({
    queryKey: ['crm-admins'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('sav_crm_admins')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CRMAdmin[];
    },
    enabled: hasAccess && accessLevel === 'admin',
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (admin: { telegram_id: number; name: string; access_level: AccessLevel }) => {
      const { data, error } = await protalkDb
        .from('sav_crm_admins')
        .insert(admin)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-admins'] });
      setIsAddDialogOpen(false);
      setNewTelegramId('');
      setNewName('');
      setNewAccessLevel('viewer');
      toast({
        title: 'Администратор добавлен',
        description: 'Новый пользователь получил доступ к CRM',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.message?.includes('duplicate') 
          ? 'Пользователь с таким Telegram ID уже существует' 
          : 'Не удалось добавить администратора',
        variant: 'destructive',
      });
    },
  });

  // Update admin mutation
  const updateAdminMutation = useMutation({
    mutationFn: async ({ id, access_level }: { id: string; access_level: AccessLevel }) => {
      const { error } = await protalkDb
        .from('sav_crm_admins')
        .update({ access_level, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-admins'] });
      toast({
        title: 'Уровень доступа обновлён',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить уровень доступа',
        variant: 'destructive',
      });
    },
  });

  // Delete admin mutation
  const deleteAdminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await protalkDb
        .from('sav_crm_admins')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-admins'] });
      toast({
        title: 'Администратор удалён',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить администратора',
        variant: 'destructive',
      });
    },
  });

  const handleAddAdmin = () => {
    const telegramId = parseInt(newTelegramId, 10);
    if (isNaN(telegramId)) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректный Telegram ID (число)',
        variant: 'destructive',
      });
      return;
    }

    addAdminMutation.mutate({
      telegram_id: telegramId,
      name: newName || `User ${telegramId}`,
      access_level: newAccessLevel,
    });
  };

  // Show loading
  if (accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check access - only admins can manage other admins
  if (!hasAccess || accessLevel !== 'admin') {
    return <AccessDenied message="Управление администраторами доступно только для администраторов CRM" />;
  }

  return (
    <div className="min-h-screen admin-panel">
      <div className="container mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/crm')}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-6 h-6 text-primary" />
                Управление доступом
              </h1>
              <p className="text-muted-foreground text-sm">
                Администраторы CRM системы
              </p>
            </div>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent className="steampunk-border border-brass/30">
              <DialogHeader>
                <DialogTitle>Добавить администратора</DialogTitle>
                <DialogDescription>
                  Введите Telegram ID пользователя для предоставления доступа к CRM
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="telegram-id">Telegram ID</Label>
                  <Input
                    id="telegram-id"
                    type="number"
                    placeholder="123456789"
                    value={newTelegramId}
                    onChange={(e) => setNewTelegramId(e.target.value)}
                    className="glass-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Имя (опционально)</Label>
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="glass-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Уровень доступа</Label>
                  <Select value={newAccessLevel} onValueChange={(v) => setNewAccessLevel(v as AccessLevel)}>
                    <SelectTrigger className="glass-input border-brass/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="steampunk-border border-brass/30">
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Просмотр
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4" />
                          Редактор
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4" />
                          Администратор
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  onClick={handleAddAdmin}
                  disabled={!newTelegramId || addAdminMutation.isPending}
                >
                  {addAdminMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Access levels info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="steampunk-border bg-blue-500/10 border-blue-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-blue-400" />
              <span className="font-medium text-blue-400">Просмотр</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Просмотр клиентов и данных без возможности редактирования
            </p>
          </div>
          <div className="steampunk-border bg-amber-500/10 border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Edit3 className="w-5 h-5 text-amber-400" />
              <span className="font-medium text-amber-400">Редактор</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Редактирование данных клиентов и отправка сообщений
            </p>
          </div>
          <div className="steampunk-border bg-emerald-500/10 border-emerald-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-emerald-400" />
              <span className="font-medium text-emerald-400">Администратор</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Полный доступ включая управление другими администраторами
            </p>
          </div>
        </div>

        {/* Admins table */}
        <div className="steampunk-border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-brass/20 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Telegram ID</TableHead>
                  <TableHead className="text-muted-foreground">Имя</TableHead>
                  <TableHead className="text-muted-foreground">Уровень доступа</TableHead>
                  <TableHead className="text-muted-foreground">Добавлен</TableHead>
                  <TableHead className="text-muted-foreground text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins?.map((admin) => (
                  <TableRow key={admin.id} className="border-brass/20">
                    <TableCell className="font-mono text-foreground/80">
                      {admin.telegram_id}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {admin.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={admin.access_level}
                        onValueChange={(v) => updateAdminMutation.mutate({ 
                          id: admin.id, 
                          access_level: v as AccessLevel 
                        })}
                      >
                        <SelectTrigger className="w-40 bg-transparent border-brass/30">
                          <Badge 
                            variant="outline" 
                            className={`${accessLevelColors[admin.access_level]} flex items-center gap-1`}
                          >
                            {accessLevelIcons[admin.access_level]}
                            {accessLevelLabels[admin.access_level]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent className="steampunk-border border-brass/30">
                          <SelectItem value="viewer">
                            <div className="flex items-center gap-2">
                              <Eye className="w-4 h-4" />
                              Просмотр
                            </div>
                          </SelectItem>
                          <SelectItem value="editor">
                            <div className="flex items-center gap-2">
                              <Edit3 className="w-4 h-4" />
                              Редактор
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center gap-2">
                              <Crown className="w-4 h-4" />
                              Администратор
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(admin.created_at), 'dd MMM yyyy', { locale: ru })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm('Удалить этого администратора?')) {
                            deleteAdminMutation.mutate(admin.id);
                          }
                        }}
                        disabled={admin.telegram_id === 169262990} // Protect super admin
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}