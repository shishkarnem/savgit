import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { User, MapPin, Calendar, Briefcase, DollarSign, MessageSquare, Bot, ExternalLink } from 'lucide-react';

type Client = any;

interface ClientCardProps { client: Client | null; open: boolean; onOpenChange: (open: boolean) => void; }

const getStatusColor = (status: string | null): string => {
  switch (status) {
    case 'Выполнено': return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'В работе': case 'Обслуживание': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Отказ': case 'Заблокировано': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Инфо': case 'Расчет': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Договор': case 'Предоплата': case 'Тариф': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'Подбор Эксперта': case 'Эксперт': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
};

const InfoRow: React.FC<{ label: string; value: string | null | undefined; icon?: React.ReactNode }> = ({ label, value, icon }) => {
  if (!value) return null;
  return (<div className="flex items-start gap-3 py-2">{icon && <span className="text-muted-foreground mt-0.5">{icon}</span>}<div className="flex-1 min-w-0"><div className="text-xs text-muted-foreground">{label}</div><div className="text-sm break-words">{value}</div></div></div>);
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (<div className="space-y-1"><h3 className="text-sm font-semibold text-primary">{title}</h3><div className="pl-1">{children}</div></div>);

export const ClientCard: React.FC<ClientCardProps> = ({ client, open, onOpenChange }) => {
  if (!client) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{client.full_name || 'Без имени'}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={getStatusColor(client.status)}>{client.status || 'Нет статуса'}</Badge>
                {client.project_code && <Badge variant="secondary" className="font-mono">{client.project_code}</Badge>}
              </div>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            <Section title="Контактные данные">
              <InfoRow label="Telegram ID" value={client.telegram_id} icon={<User className="h-4 w-4" />} />
              <InfoRow label="Telegram" value={client.telegram_client} icon={<MessageSquare className="h-4 w-4" />} />
              <InfoRow label="Город" value={client.city} icon={<MapPin className="h-4 w-4" />} />
            </Section>
            <Separator />
            <Section title="Проект">
              <InfoRow label="Название проекта" value={client.project} icon={<Briefcase className="h-4 w-4" />} />
              <InfoRow label="Продукт" value={client.product} />
              <InfoRow label="Подразделение" value={client.department} />
              <InfoRow label="Сотрудников" value={client.employees_count} />
              <InfoRow label="Функционал" value={client.functionality} />
            </Section>
            <Separator />
            <Section title="Финансы">
              <InfoRow label="Стоимость SAV" value={client.sav_cost} icon={<DollarSign className="h-4 w-4" />} />
              <InfoRow label="Тариф" value={client.tariff} />
              <InfoRow label="Окупаемость" value={client.payback} />
            </Section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ClientCard;
