import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Settings, RotateCcw } from 'lucide-react';
import type { TableColumn, KanbanField, CardSection } from '@/hooks/useCRMSettings';

interface SettingsConstructorProps {
  tableColumns?: TableColumn[];
  kanbanFields?: KanbanField[];
  cardSections?: CardSection[];
  onToggleTableColumn?: (key: string) => void;
  onToggleKanbanField?: (key: string) => void;
  onToggleCardSection?: (key: string) => void;
  onResetTableColumns?: () => void;
  onResetKanbanFields?: () => void;
  onResetCardSections?: () => void;
  mode: 'table' | 'kanban' | 'card';
}

export const SettingsConstructor: React.FC<SettingsConstructorProps> = ({
  tableColumns, kanbanFields, cardSections,
  onToggleTableColumn, onToggleKanbanField, onToggleCardSection,
  onResetTableColumns, onResetKanbanFields, onResetCardSections, mode,
}) => {
  const getTitle = () => {
    switch (mode) {
      case 'table': return 'Колонки таблицы';
      case 'kanban': return 'Поля карточек канбан';
      case 'card': return 'Секции карточки клиента';
    }
  };

  const handleReset = () => {
    switch (mode) {
      case 'table': onResetTableColumns?.(); break;
      case 'kanban': onResetKanbanFields?.(); break;
      case 'card': onResetCardSections?.(); break;
    }
  };

  const renderItems = () => {
    const items = mode === 'table' ? tableColumns : mode === 'kanban' ? kanbanFields : cardSections;
    const handler = mode === 'table' ? onToggleTableColumn : mode === 'kanban' ? onToggleKanbanField : onToggleCardSection;
    return items?.map((item) => (
      <div key={item.key} className="flex items-center gap-2 py-1">
        <Checkbox id={`${mode}-${item.key}`} checked={item.visible} onCheckedChange={() => handler?.(item.key)} />
        <Label htmlFor={`${mode}-${item.key}`} className="text-sm cursor-pointer flex-1">{item.label}</Label>
      </div>
    ));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title={getTitle()}>
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">{getTitle()}</h4>
            <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-xs">
              <RotateCcw className="h-3 w-3 mr-1" />Сбросить
            </Button>
          </div>
          <Separator />
          <div className="max-h-[300px] overflow-y-auto space-y-1">{renderItems()}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsConstructor;
