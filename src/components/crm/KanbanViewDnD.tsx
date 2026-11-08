import React, { useState, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, MapPin, Briefcase, DollarSign, Calendar, UserCheck, MessageSquare, Move, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { KanbanField } from '@/hooks/useCRMSettings';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';

type Client = any;

interface KanbanViewDnDProps {
  clients: Client[];
  onClientClick: (client: Client) => void;
  kanbanFields: KanbanField[];
  onClientStatusChange?: (clientId: string, newStatus: string) => void;
}

// Columns without forbidden red or green colors - Liquid Glass Apple Palette
const KANBAN_COLUMNS = [
  { status: 'Инфо', color: 'bg-amber-400' },
  { status: 'Расчет', color: 'bg-yellow-500' },
  { status: 'Договор', color: 'bg-purple-400' },
  { status: 'Предоплата', color: 'bg-purple-500' },
  { status: 'Тариф', color: 'bg-purple-600' },
  { status: 'Подбор Эксперта', color: 'bg-cyan-400' },
  { status: 'Эксперт', color: 'bg-sky-400' },
  { status: 'В работе', color: 'bg-sky-500' },
  { status: 'Обслуживание', color: 'bg-cyan-500' },
  { status: 'Выполнено', color: 'bg-amber-300' },
  { status: 'Отказ', color: 'bg-zinc-600' },
  { status: 'Заблокировано', color: 'bg-zinc-700' },
];

const getFieldIcon = (key: string) => {
  switch (key) {
    case 'telegram_client':
      return <User className="h-3.5 w-3.5 text-zinc-400" />;
    case 'project':
      return <Briefcase className="h-3.5 w-3.5 text-zinc-400" />;
    case 'city':
      return <MapPin className="h-3.5 w-3.5 text-zinc-400" />;
    case 'sav_cost':
    case 'service_price':
      return <DollarSign className="h-3.5 w-3.5 text-amber-400" />;
    case 'calculator_date':
      return <Calendar className="h-3.5 w-3.5 text-zinc-400" />;
    case 'expert':
      return <UserCheck className="h-3.5 w-3.5 text-amber-300" />;
    case 'last_message':
      return <MessageSquare className="h-3.5 w-3.5 text-zinc-400" />;
    default:
      return null;
  }
};

const DraggableCard: React.FC<{
  client: Client;
  kanbanFields: KanbanField[];
  onClientClick: (c: Client) => void;
  isDragging: boolean;
}> = ({ client, kanbanFields, onClientClick, isDragging }) => {
  const getVal = (key: string): string | null => {
    switch (key) {
      case 'full_name':
        return client.full_name;
      case 'project_code':
        return client.project_code;
      case 'telegram_client':
        return client.telegram_client;
      case 'project':
        return client.project;
      case 'city':
        return client.city;
      case 'tariff':
        return client.tariff;
      case 'expert':
        return client.expert_pseudonym || client.expert_name;
      case 'product':
        return client.product;
      case 'sav_cost':
        return client.sav_cost ? `${client.sav_cost} ₽` : null;
      case 'last_message':
        return client.last_message ? client.last_message.slice(0, 60) + '...' : null;
      default:
        return null;
    }
  };

  const visible = kanbanFields.filter((f) => f.visible);
  const getInitials = () =>
    (client.full_name || client.telegram_client || 'К')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const cleanTgId = client.telegram_id ? String(client.telegram_id).trim() : '';
  const hasTelegram = Boolean(
    cleanTgId && cleanTgId !== '0' && cleanTgId !== 'null' && cleanTgId !== 'undefined' && cleanTgId !== '—'
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: isDragging ? 1.02 : 1 }}
      whileHover={{ scale: 1.01 }}
      className="cursor-grab active:cursor-grabbing select-none"
    >
      <Card
        className={`p-3.5 rounded-xl transition-all border ${
          isDragging
            ? 'bg-amber-400/10 border-amber-400/80 shadow-2xl ring-2 ring-amber-400/30'
            : 'bg-zinc-900/60 backdrop-blur-xl border-white/15 hover:border-amber-400/60 hover:shadow-lg'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClientClick(client);
        }}
      >
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-start gap-2.5">
            {visible.some((f) => f.key === 'avatar') && (
              <Avatar className="h-9 w-9 shrink-0 border border-amber-400/30 bg-zinc-800">
                <AvatarFallback className="text-xs bg-amber-400/15 text-amber-300 font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <Move size={12} className="text-zinc-500 shrink-0" />
                <div className="font-semibold text-sm text-zinc-100 truncate hover:text-amber-300 transition-colors">
                  {client.full_name || client.telegram_client || 'Без имени'}
                </div>
              </div>
              {client.project_code && (
                <Badge variant="outline" className="font-mono text-xs mt-1 border-white/15 bg-white/5 text-zinc-300">
                  {client.project_code}
                </Badge>
              )}
            </div>
          </div>

          {/* Telegram Status Badge */}
          <div className="pt-0.5">
            {hasTelegram ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-amber-400/10 border border-amber-400/30 text-amber-300">
                Telegram: {cleanTgId}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-zinc-800/80 border border-white/10 text-zinc-400">
                <AlertCircle className="w-3 h-3 text-zinc-500" />
                Telegram не привязан
              </span>
            )}
          </div>

          {/* Fields */}
          {visible
            .filter((f) => !['full_name', 'project_code', 'tariff', 'avatar'].includes(f.key))
            .map((f) => {
              const val = getVal(f.key);
              if (!val) return null;
              return (
                <div key={f.key} className="flex items-center gap-2 text-sm text-zinc-300">
                  {getFieldIcon(f.key)}
                  <span className="truncate">{val}</span>
                </div>
              );
            })}

          {visible.some((f) => f.key === 'tariff') && client.tariff && (
            <Badge variant="secondary" className="text-xs bg-white/10 border border-white/15 text-zinc-200">
              {client.tariff}
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

const KanbanColumnDnD: React.FC<{
  status: string;
  color: string;
  clients: Client[];
  kanbanFields: KanbanField[];
  onClientClick: (c: Client) => void;
  onDrop: (id: string, status: string) => void;
  draggedClientId: string | null;
}> = ({ status, color, clients, kanbanFields, onClientClick, onDrop, draggedClientId }) => {
  const [isOver, setIsOver] = useState(false);

  return (
    <motion.div
      layout
      className={`flex-shrink-0 w-[215px] min-w-[200px] max-w-[240px] flex flex-col rounded-2xl transition-all duration-200 overflow-hidden ${
        isOver
          ? 'bg-amber-400/10 border-2 border-amber-400/80 ring-4 ring-amber-400/20 shadow-2xl scale-[1.01]'
          : 'bg-zinc-950/60 backdrop-blur-2xl border border-white/15 hover:border-amber-400/35'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget as HTMLElement;
        if (!related || !e.currentTarget.contains(related)) {
          setIsOver(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('clientId');
        if (id) onDrop(id, status);
        setIsOver(false);
      }}
    >
      {/* Column Header */}
      <div className={`p-3.5 border-b flex items-center justify-between ${
        isOver ? 'border-amber-400/40 bg-amber-400/15' : 'border-white/10 bg-white/[0.02]'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full ${color} shadow-sm`} />
          <h3 className="font-semibold text-sm text-zinc-100">{status}</h3>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-sm font-semibold bg-white/10 border border-white/15 text-amber-300">
          {clients.length}
        </span>
      </div>

      {/* Column Body with Scroll */}
      <ScrollArea className="flex-1 p-2.5 max-h-[calc(100vh-280px)] min-h-[160px] custom-scrollbar">
        <AnimatePresence mode="popLayout">
          <div className="space-y-2.5">
            {clients.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', c.id);
                  e.dataTransfer.setData('clientId', c.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
              >
                <DraggableCard
                  client={c}
                  kanbanFields={kanbanFields}
                  onClientClick={onClientClick}
                  isDragging={draggedClientId === c.id}
                />
              </div>
            ))}
            {clients.length === 0 && (
              <div className={`text-center text-sm py-8 rounded-xl border border-dashed ${
                isOver ? 'border-amber-400/60 bg-amber-400/10 text-amber-300' : 'border-white/10 text-zinc-500'
              }`}>
                {isOver ? 'Отпустите карточку здесь' : 'Нет клиентов'}
              </div>
            )}
          </div>
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
};

export const KanbanViewDnD: React.FC<KanbanViewDnDProps> = ({
  clients,
  onClientClick,
  kanbanFields,
  onClientStatusChange,
}) => {
  const { toast } = useToast();
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [localClients, setLocalClients] = useState(clients);

  React.useEffect(() => {
    setLocalClients(clients);
  }, [clients]);

  const clientsByStatus = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.status] = localClients.filter((c) => c.status === col.status);
    return acc;
  }, {} as Record<string, Client[]>);

  const handleDrop = useCallback(
    async (clientId: string, newStatus: string) => {
      const client = localClients.find((c: any) => c.id === clientId);
      if (!client || client.status === newStatus) return;

      setLocalClients((prev: any[]) =>
        prev.map((c) => (c.id === clientId ? { ...c, status: newStatus } : c))
      );

      try {
        const { error } = await protalkDb.from('sav_clients').update({ status: newStatus } as any).eq('id', clientId);
        if (error) throw error;

        // Also update crm table for cross-sync
        await protalkDb.from('crm' as any).update({ status: newStatus }).eq('id', clientId);

        toast({
          title: 'Статус обновлен',
          description: `${client.full_name || 'Клиент'} переведен в «${newStatus}»`,
        });
        onClientStatusChange?.(clientId, newStatus);
      } catch {
        setLocalClients((prev: any[]) =>
          prev.map((c) => (c.id === clientId ? { ...c, status: client.status } : c))
        );
        toast({ title: 'Ошибка обновления статуса' });
      }
      setDraggedClientId(null);
    },
    [localClients, toast, onClientStatusChange]
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: '520px' }}>
      {KANBAN_COLUMNS.map((col) => (
        <KanbanColumnDnD
          key={col.status}
          status={col.status}
          color={col.color}
          clients={clientsByStatus[col.status] || []}
          kanbanFields={kanbanFields}
          onClientClick={onClientClick}
          onDrop={handleDrop}
          draggedClientId={draggedClientId}
        />
      ))}
    </div>
  );
};

export default KanbanViewDnD;
