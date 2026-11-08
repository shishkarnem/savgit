import React, { useState } from 'react';
import { protalkDb } from '@/integrations/protalk/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Sparkles, User, Tag, MapPin, FileText, CheckCircle2 } from 'lucide-react';

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded?: (client: any) => void;
}

const TARIFF_OPTIONS = ['Лайт', 'Эконом', 'Стандарт', 'Премиум', 'VIP'];
const STATUS_OPTIONS = ['Новый', 'В работе', 'КП отправлено', 'Оплачено', 'Выполнено', 'Отказ'];

export const AddClientDialog: React.FC<AddClientDialogProps> = ({
  open,
  onOpenChange,
  onClientAdded,
}) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    telegram_id: '',
    telegram_client: '',
    city: 'Москва',
    tariff: 'Стандарт',
    status: 'Новый',
    product: 'ИИ-Продавец SAV AI',
    comment: '',
    project_code: '',
  });

  const handleFillAdminData = () => {
    setFormData({
      full_name: 'Тимошенко Денис Андреевич',
      telegram_id: '169262990',
      telegram_client: '@shishkarnem',
      city: 'Москва',
      tariff: 'VIP',
      status: 'В работе',
      product: 'ИИ-Продавец SAV AI',
      comment: 'Администратор системы (169262990)',
      project_code: `SAV-${Date.now().toString().slice(-4)}`,
    });
    toast({
      title: 'Данные подставлены',
      description: 'Данные администратора 169262990 внесены в форму',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      toast({
        title: 'Укажите ФИО клиента',
        description: 'Поле ФИО обязательно для добавления в базу CRM',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedCode = formData.project_code.trim() || `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
      const cleanTelegramId = formData.telegram_id.trim();
      const clientId = cleanTelegramId ? `cli_${cleanTelegramId}_${Date.now()}` : `cli_${Date.now()}`;

      const newRecord = {
        id: clientId,
        full_name: formData.full_name.trim(),
        telegram_id: cleanTelegramId || null,
        telegram_client: formData.telegram_client.trim() || null,
        city: formData.city.trim() || null,
        tariff: formData.tariff || 'Стандарт',
        status: formData.status || 'Новый',
        product: formData.product.trim() || 'ИИ-Продавец SAV AI',
        comment: formData.comment.trim() || null,
        project_code: generatedCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await protalkDb.from('sav_clients').insert([newRecord]);
      if (error) {
        throw error;
      }

      toast({
        title: 'Клиент добавлен',
        description: `${formData.full_name} успешно сохранён в базу CRM`,
      });

      // Reset form
      setFormData({
        full_name: '',
        telegram_id: '',
        telegram_client: '',
        city: 'Москва',
        tariff: 'Стандарт',
        status: 'Новый',
        product: 'ИИ-Продавец SAV AI',
        comment: '',
        project_code: '',
      });

      onOpenChange(false);
      if (onClientAdded) {
        onClientAdded(newRecord);
      }
    } catch (err: any) {
      console.error('Error adding client manually:', err);
      toast({
        title: 'Ошибка сохранения',
        description: err?.message || 'Не удалось сохранить клиента в базу',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950/85 backdrop-blur-2xl border border-white/20 text-zinc-100 shadow-2xl rounded-2xl p-6 overflow-hidden">
        <DialogHeader className="space-y-2 border-b border-white/10 pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/30 text-amber-300">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">
                  Добавление клиента в базу CRM
                </DialogTitle>
                <DialogDescription className="text-sm text-zinc-400">
                  Внесите данные клиента вручную для постоянной фиксации в базе данных
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleFillAdminData}
              className="text-xs bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border-amber-400/30 gap-1.5 transition-all shadow-sm"
              title="Заполнить данные администратора 169262990"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Добавить меня (169262990)</span>
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <User className="h-4 w-4 text-amber-400" />
                <span>ФИО клиента <strong className="text-amber-400">*</strong></span>
              </Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Иванов Иван Иванович"
                required
                className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <span className="font-mono text-xs px-1 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">TG</span>
                <span>Telegram ID</span>
              </Label>
              <Input
                value={formData.telegram_id}
                onChange={(e) => setFormData(prev => ({ ...prev, telegram_id: e.target.value }))}
                placeholder="Например: 169262990"
                className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <span className="font-mono text-xs px-1 rounded bg-white/10 text-zinc-300 border border-white/15">@</span>
                <span>Никнейм в Telegram</span>
              </Label>
              <Input
                value={formData.telegram_client}
                onChange={(e) => setFormData(prev => ({ ...prev, telegram_client: e.target.value }))}
                placeholder="@username"
                className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <MapPin className="h-4 w-4 text-amber-400" />
                <span>Город</span>
              </Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Москва"
                className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <Tag className="h-4 w-4 text-amber-400" />
                <span>Тариф</span>
              </Label>
              <Select
                value={formData.tariff}
                onValueChange={(val) => setFormData(prev => ({ ...prev, tariff: val }))}
              >
                <SelectTrigger className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl">
                  <SelectValue placeholder="Выберите тариф" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/20 text-zinc-100">
                  {TARIFF_OPTIONS.map(tariff => (
                    <SelectItem key={tariff} value={tariff} className="text-sm focus:bg-amber-400/10 focus:text-amber-300">
                      {tariff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <span>Статус в воронке CRM</span>
              </Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData(prev => ({ ...prev, status: val }))}
              >
                <SelectTrigger className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl">
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/20 text-zinc-100">
                  {STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status} className="text-sm focus:bg-amber-400/10 focus:text-amber-300">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
              <FileText className="h-4 w-4 text-amber-400" />
              <span>Продукт / Решение</span>
            </Label>
            <Input
              value={formData.product}
              onChange={(e) => setFormData(prev => ({ ...prev, product: e.target.value }))}
              placeholder="ИИ-Продавец SAV AI"
              className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-zinc-300 flex items-center gap-1.5 font-medium">
              <span>Комментарий / Примечание</span>
            </Label>
            <Textarea
              value={formData.comment}
              onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
              placeholder="Дополнительные сведения о клиенте, источнике лида или потребностях..."
              rows={3}
              className="bg-zinc-900/60 border-white/15 text-zinc-100 focus:border-amber-400/50 text-sm rounded-xl resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-white/5 hover:bg-white/10 border-white/15 text-zinc-300 text-sm h-10 px-4 rounded-xl"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-amber-500/30 via-amber-400/25 to-amber-500/20 hover:from-amber-500/40 hover:to-amber-400/30 text-amber-200 border border-amber-400/50 shadow-lg text-sm h-10 px-6 rounded-xl font-medium gap-2 transition-all"
            >
              <UserPlus className="h-4 w-4 text-amber-300" />
              <span>{isSubmitting ? 'Сохранение...' : 'Сохранить в базу'}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
