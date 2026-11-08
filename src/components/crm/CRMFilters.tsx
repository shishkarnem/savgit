import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, X, Sparkles, Loader2, Mail } from 'lucide-react';

export const CLIENT_STATUSES = [
  'Заблокировано', 'Инфо', 'Расчет', 'Договор', 'Предоплата', 'Тариф',
  'Подбор Эксперта', 'Отказ', 'Обслуживание', 'Не на связи', 'Дубль',
  'Эксперт', 'Выполнено', 'В работе', 'Бот создан', 'Без напоминаний', 'Партнер',
];

export const MESSAGE_STATUSES = ['sent', 'pending', 'failed', 'blocked', 'chat_not_found'];

export interface ColumnFilters {
  statuses: string[];
  city: string;
  tariff: string;
  expert: string;
  project: string;
  // Message filters
  messageTemplate: string;
  messagePeriod: string;
  messageStatus: string;
  excludeSentClients: boolean;
}

interface CRMFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  columnFilters: ColumnFilters;
  onColumnFiltersChange: (filters: ColumnFilters) => void;
  statusCounts: Record<string, number>;
  uniqueCities: string[];
  uniqueTariffs: string[];
  uniqueExperts: string[];
  uniqueTemplates: string[];
  onAISearch: () => void;
  isAISearching: boolean;
  aiSearchEnabled: boolean;
  onAISearchToggle: () => void;
}

export const CRMFilters: React.FC<CRMFiltersProps> = ({
  search, onSearchChange, columnFilters, onColumnFiltersChange,
  statusCounts, uniqueCities, uniqueTariffs, uniqueExperts, uniqueTemplates,
  onAISearch, isAISearching, aiSearchEnabled, onAISearchToggle,
}) => {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);

  const activeFiltersCount = [
    columnFilters.city !== 'all' ? 1 : 0,
    columnFilters.tariff !== 'all' ? 1 : 0,
    columnFilters.expert !== 'all' ? 1 : 0,
    columnFilters.project ? 1 : 0,
    columnFilters.messageTemplate !== 'all' ? 1 : 0,
    columnFilters.messagePeriod !== 'all' ? 1 : 0,
    columnFilters.messageStatus !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    onColumnFiltersChange({
      statuses: [], city: 'all', tariff: 'all', expert: 'all', project: '',
      messageTemplate: 'all', messagePeriod: 'all', messageStatus: 'all', excludeSentClients: false,
    });
  };

  const toggleStatus = (status: string) => {
    const current = columnFilters.statuses;
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onColumnFiltersChange({ ...columnFilters, statuses: next });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={aiSearchEnabled ? "ИИ-поиск: например 'клиенты из Москвы'" : "Поиск по имени, телеграм, проекту..."}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && aiSearchEnabled && search.trim()) onAISearch(); }}
            className={`pl-10 pr-24 ${aiSearchEnabled ? 'border-primary/50' : ''}`}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {aiSearchEnabled && search.trim() && (
              <Button size="sm" variant="ghost" onClick={onAISearch} disabled={isAISearching} className="h-7 px-2">
                {isAISearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Найти'}
              </Button>
            )}
            <Button size="sm" variant={aiSearchEnabled ? 'default' : 'ghost'} onClick={onAISearchToggle} className="h-7 px-2 gap-1" title="ИИ-поиск">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">ИИ</span>
            </Button>
          </div>
        </div>

        {/* Multi-select statuses */}
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[220px] justify-between">
              <span className="truncate text-sm">
                {columnFilters.statuses.length === 0 ? 'Все статусы' : `${columnFilters.statuses.length} статус(ов)`}
              </span>
              {columnFilters.statuses.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{columnFilters.statuses.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 max-h-80 overflow-y-auto" align="start">
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2 border-b border-border mb-2">
                <span className="text-xs font-medium">Статусы</span>
                {columnFilters.statuses.length > 0 && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => onColumnFiltersChange({ ...columnFilters, statuses: [] })}>
                    <X className="h-3 w-3 mr-1" />Сбросить
                  </Button>
                )}
              </div>
              {CLIENT_STATUSES.map(s => (
                <label key={s} className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={columnFilters.statuses.includes(s)}
                    onCheckedChange={() => toggleStatus(s)}
                  />
                  <span className="text-sm flex-1">{s}</span>
                  <span className="text-[10px] text-muted-foreground">{statusCounts[s] || 0}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />Фильтры
              {activeFiltersCount > 0 && <span className="bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">{activeFiltersCount}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Фильтры</h4>
                {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs"><X className="h-3 w-3 mr-1" />Сбросить</Button>}
              </div>

              {/* Column filters */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Город</Label>
                  <Select value={columnFilters.city} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, city: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все города" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Все города</SelectItem>{uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Тариф</Label>
                  <Select value={columnFilters.tariff} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, tariff: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все тарифы" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Все тарифы</SelectItem>{uniqueTariffs.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Эксперт</Label>
                  <Select value={columnFilters.expert} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, expert: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все эксперты" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Все эксперты</SelectItem>{uniqueExperts.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Проект (поиск)</Label>
                  <Input placeholder="Введите название проекта..." value={columnFilters.project} onChange={(e) => onColumnFiltersChange({ ...columnFilters, project: e.target.value })} className="h-9" />
                </div>
              </div>

              {/* Message/broadcast filters */}
              <div className="border-t border-border pt-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <h4 className="font-medium text-sm">Фильтр по рассылке</h4>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Шаблон сообщения</Label>
                  <Select value={columnFilters.messageTemplate} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, messageTemplate: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все шаблоны" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все шаблоны</SelectItem>
                      {uniqueTemplates.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Период отправки</Label>
                  <Select value={columnFilters.messagePeriod} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, messagePeriod: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все время" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все время</SelectItem>
                      <SelectItem value="today">Сегодня</SelectItem>
                      <SelectItem value="yesterday">Вчера</SelectItem>
                      <SelectItem value="week">За неделю</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Статус сообщения</Label>
                  <Select value={columnFilters.messageStatus} onValueChange={(v) => onColumnFiltersChange({ ...columnFilters, messageStatus: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Все статусы" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все статусы</SelectItem>
                      <SelectItem value="sent">Отправлено (sent)</SelectItem>
                      <SelectItem value="pending">Ожидает (pending)</SelectItem>
                      <SelectItem value="failed">Ошибка (failed)</SelectItem>
                      <SelectItem value="blocked">Заблокирован (blocked)</SelectItem>
                      <SelectItem value="chat_not_found">Чат не найден</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 py-1 cursor-pointer">
                  <Checkbox
                    checked={columnFilters.excludeSentClients}
                    onCheckedChange={(checked) => onColumnFiltersChange({ ...columnFilters, excludeSentClients: !!checked })}
                  />
                  <span className="text-xs">Исключить клиентов (показать тех, кому <strong>НЕ</strong> отправляли)</span>
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {columnFilters.statuses.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {columnFilters.statuses.map(s => (
            <Badge key={s} variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => toggleStatus(s)}>
              {s}<X className="h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}

      {aiSearchEnabled && (
        <div className="text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          💡 <strong>ИИ-поиск:</strong> Введите запрос на естественном языке
        </div>
      )}
    </div>
  );
};

export default CRMFilters;
