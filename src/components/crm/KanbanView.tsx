import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { User, MapPin, Briefcase } from 'lucide-react';

// Use any for Client type since sav_clients may not be in types yet
type Client = any;

interface KanbanViewProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
}

const KANBAN_COLUMNS = [
  { status: 'Инфо', color: 'bg-yellow-500' },
  { status: 'Расчет', color: 'bg-yellow-600' },
  { status: 'Договор', color: 'bg-purple-500' },
  { status: 'Предоплата', color: 'bg-purple-600' },
  { status: 'Тариф', color: 'bg-purple-700' },
  { status: 'Подбор Эксперта', color: 'bg-cyan-500' },
  { status: 'Эксперт', color: 'bg-cyan-600' },
  { status: 'В работе', color: 'bg-blue-500' },
  { status: 'Обслуживание', color: 'bg-blue-600' },
  { status: 'Выполнено', color: 'bg-green-500' },
  { status: 'Отказ', color: 'bg-red-500' },
  { status: 'Заблокировано', color: 'bg-red-700' },
];

const KanbanColumn: React.FC<{ status: string; color: string; clients: Client[]; onClientClick: (c: Client) => void }> = ({ status, color, clients, onClientClick }) => (
  <div className="flex-shrink-0 w-72 flex flex-col bg-muted/30 rounded-lg">
    <div className="p-3 border-b border-border flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <h3 className="font-medium text-sm">{status}</h3>
      <Badge variant="secondary" className="ml-auto text-xs">{clients.length}</Badge>
    </div>
    <ScrollArea className="flex-1 p-2">
      <div className="space-y-2">
        {clients.map((client) => (
          <Card key={client.id} className="p-3 cursor-pointer hover:bg-accent/50 transition-colors border-border" onClick={() => onClientClick(client)}>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-medium text-sm truncate flex-1">{client.full_name || client.telegram_client || client.telegram_id || 'Без имени'}</div>
                {client.project_code && <Badge variant="outline" className="font-mono text-[10px] shrink-0">{client.project_code}</Badge>}
              </div>
              {client.telegram_client && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><User className="h-3 w-3" /><span className="truncate">{client.telegram_client}</span></div>}
              {client.project && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Briefcase className="h-3 w-3" /><span className="truncate">{client.project}</span></div>}
              {client.city && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /><span>{client.city}</span></div>}
              {client.tariff && <Badge variant="secondary" className="text-[10px]">{client.tariff}</Badge>}
            </div>
          </Card>
        ))}
        {clients.length === 0 && <div className="text-center text-xs text-muted-foreground py-4">Нет клиентов</div>}
      </div>
    </ScrollArea>
  </div>
);

export const KanbanView: React.FC<KanbanViewProps> = ({ clients, onClientClick }) => {
  const clientsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = clients.filter((c) => c.status === col.status);
    return acc;
  }, {} as Record<string, Client[]>);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '500px' }}>
      {KANBAN_COLUMNS.map((col) => (
        <KanbanColumn key={col.status} status={col.status} color={col.color} clients={clientsByStatus[col.status] || []} onClientClick={onClientClick} />
      ))}
    </div>
  );
};

export default KanbanView;
