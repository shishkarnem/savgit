import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Sparkles, Loader2, User } from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';
import { CLIENT_STATUSES } from '@/components/crm/CRMFilters';

interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    telegram_id: '',
    telegram_client: '',
    phone: '',
    city: '',
    status: 'Новый',
    tariff: 'Стандарт',
    project: '',
    project_code: '',
    expert_name: '',
    sav_cost: '',
    comment: '',
  });

  const handleFillMe = () => {
    setFormData({
      full_name: 'Тимошенко Денис Андреевич',
      telegram_id: '169262990',
      telegram_client: '@shishkarnem',
      phone: '+7 900 000-00-00',
      city: 'Москва',
      status: 'В работе',
      tariff: 'VIP',
      project: 'SAV AI Core',
      project_code: 'SAV-169',
      expert_name: 'Dr.White',
      sav_cost: '150000',
      comment: 'Добавлен через быстрое заполнение админа 169262990',
    });
    toast({
      title: 'Данные заполнены',
      description: 'Данные администратора 169262990 подставлены',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim() && !formData.telegram_id.trim()) {
      toast({
        title: 'Заполните данные',
        description: 'Укажите ФИО или Telegram ID клиента для добавления',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    const cleanTgId = formData.telegram_id.trim() || null;
    const cleanTgClient = formData.telegram_client.trim() || null;
    const finalFullName = formData.full_name.trim() || cleanTgClient || `Клиент ${cleanTgId || ''}`;
    const newId = cleanTgId ? `cli_${cleanTgId}_${Date.now()}` : `cli_${Date.now()}`;

    try {
      // 1. Insert into sav_clients
      const { error: err1 } = await protalkDb.from('sav_clients').insert({
        id: newId,
        full_name: finalFullName,
        fio: finalFullName,
        telegram_id: cleanTgId,
        telegram_client: cleanTgClient,
        city: formData.city.trim() || null,
        status: formData.status,
        tariff: formData.tariff.trim() || null,
        project: formData.project.trim() || null,
        project_code: formData.project_code.trim() || null,
        expert_name: formData.expert_name.trim() || null,
        expert_pseudonym: formData.expert_name.trim() || null,
        sav_cost: formData.sav_cost.trim() || null,
        comment: formData.comment.trim() || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as any);

      if (err1) throw err1;

      // 2. Also insert into crm table for cross-table sync
      try {
        await protalkDb.from('crm' as any).insert({
          id: newId,
          fio: finalFullName,
          telegram_id: cleanTgId,
          telegram: cleanTgClient,
          channel: 'Telegram',
          chat_id: cleanTgId,
          status: formData.status,
          comment: formData.comment.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (crmErr) {
        console.warn('[CRM Table Sync Note]', crmErr);
      }

      toast({
        title: 'Клиент успешно добавлен',
        description: `${finalFullName} зафиксирован в базе данных`,
      });

      // Reset form
      setFormData({
        full_name: '',
        telegram_id: '',
        telegram_client: '',
        phone: '',
        city: '',
        status: 'Новый',
        tariff: 'Стандарт',
        project: '',
        project_code: '',
        expert_name: '',
        sav_cost: '',
        comment: '',
      });

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error inserting client:', err);
      toast({
        title: 'Ошибка добавления',
        description: err.message || 'Не удалось сохранить в BD ProTalk',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] mx-auto p-5 sm:p-6 rounded-3xl bg-zinc-950/90 backdrop-blur-3xl border border-white/20 text-zinc-100 shadow-2xl custom-scrollbar">
        <DialogHeader className="pb-3 border-b border-white/10">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
              <UserPlus className="w-5 h-5 text-amber-400" />
              Добавить клиента вручную
            </DialogTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillMe}
              className="text-sm h-9 px-3 rounded-xl border-amber-400/40 text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 gap-1.5 transition-all shadow-sm"
              title="Заполнить данные администратора 169262990"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Заполнить меня (169262990)</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm text-zinc-300 font-medium">ФИО / Название клиента *</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Например: Тимошенко Денис Андреевич"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
                required
              />
            </div>

            {/* Telegram ID */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Telegram ID (цифровой)</Label>
              <Input
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
                placeholder="169262990"
                className="h-10 text-sm font-mono bg-zinc-900/70 border-white/15 text-amber-300 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Telegram username */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Telegram логин</Label>
              <Input
                value={formData.telegram_client}
                onChange={(e) => setFormData({ ...formData, telegram_client: e.target.value })}
                placeholder="@shishkarnem"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Телефон</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+7 900 000-00-00"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* City */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Город</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Москва, Ставрополь..."
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Status */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Статус сделки</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                  {CLIENT_STATUSES.map((st) => (
                    <SelectItem key={st} value={st} className="text-sm">
                      {st}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tariff */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Тариф</Label>
              <Input
                value={formData.tariff}
                onChange={(e) => setFormData({ ...formData, tariff: e.target.value })}
                placeholder="Лайт, Эконом, Стандарт, Премиум, VIP"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Project */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Проект / Компания</Label>
              <Input
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                placeholder="Название проекта"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Project Code */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Код проекта</Label>
              <Input
                value={formData.project_code}
                onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                placeholder="SAV-101"
                className="h-10 text-sm font-mono bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Expert */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Куратор / Эксперт</Label>
              <Input
                value={formData.expert_name}
                onChange={(e) => setFormData({ ...formData, expert_name: e.target.value })}
                placeholder="Dr.White, Mr.Emerald..."
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Sav Cost */}
            <div className="space-y-1">
              <Label className="text-sm text-zinc-300 font-medium">Бюджет / Стоимость (₽)</Label>
              <Input
                value={formData.sav_cost}
                onChange={(e) => setFormData({ ...formData, sav_cost: e.target.value })}
                placeholder="150000"
                className="h-10 text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl focus:border-amber-400/50"
              />
            </div>

            {/* Comment */}
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm text-zinc-300 font-medium">Заметки / Комментарий</Label>
              <Textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                placeholder="Вводные данные, пожелания клиента..."
                className="min-h-[80px] text-sm bg-zinc-900/70 border-white/15 text-zinc-100 rounded-xl resize-none focus:border-amber-400/50"
              />
            </div>
          </div>

          <DialogFooter className="gap-2.5 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="rounded-xl border-white/15 text-zinc-300 text-sm h-10 px-4 bg-white/5 hover:bg-white/10"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-gradient-to-r from-amber-500/30 via-amber-400/25 to-amber-500/20 hover:from-amber-500/40 hover:to-amber-400/30 text-amber-200 border border-amber-400/50 shadow-lg text-sm h-10 px-6 font-medium gap-2 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-amber-300" /> : <UserPlus className="w-4 h-4 text-amber-300" />}
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить в базу'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddClientModal;
