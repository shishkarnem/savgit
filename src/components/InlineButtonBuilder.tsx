import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, GripVertical, ArrowDown, ArrowRight, Link, Type, Globe } from 'lucide-react';

export type InlineButtonType = 'text' | 'link' | 'webapp';
export type InlineButtonStyle = 'default' | 'primary' | 'success' | 'danger';

export interface InlineButton {
  id: string;
  type: InlineButtonType;
  text: string;
  url?: string;
  callbackData?: string;
  style?: InlineButtonStyle;
}

export interface InlineButtonRow {
  id: string;
  buttons: InlineButton[];
}

const BUTTON_TYPE_LABELS: Record<InlineButtonType, { label: string; icon: React.ReactNode }> = {
  text: { label: 'Текст', icon: <Type className="w-3 h-3" /> },
  link: { label: 'Ссылка', icon: <Link className="w-3 h-3" /> },
  webapp: { label: 'WebApp', icon: <Globe className="w-3 h-3" /> },
};

const BUTTON_STYLE_OPTIONS: { value: InlineButtonStyle; label: string; color: string; previewBg: string; previewBorder: string; previewText: string }[] = [
  { value: 'default', label: '⬜ Default', color: 'text-muted-foreground', previewBg: 'bg-[#3390ec]/20', previewBorder: 'border-[#3390ec]/40', previewText: 'text-[#3390ec]' },
  { value: 'primary', label: '🔵 Primary', color: 'text-blue-500', previewBg: 'bg-[#3390ec]/30', previewBorder: 'border-[#3390ec]/60', previewText: 'text-[#3390ec]' },
  { value: 'success', label: '🟢 Success', color: 'text-green-500', previewBg: 'bg-green-500/20', previewBorder: 'border-green-500/40', previewText: 'text-green-400' },
  { value: 'danger', label: '🔴 Danger', color: 'text-red-500', previewBg: 'bg-red-500/20', previewBorder: 'border-red-500/40', previewText: 'text-red-400' },
];

function getStylePreview(style?: InlineButtonStyle) {
  return BUTTON_STYLE_OPTIONS.find(s => s.value === (style || 'default')) || BUTTON_STYLE_OPTIONS[0];
}

interface InlineButtonBuilderProps {
  rows: InlineButtonRow[];
  onChange: (rows: InlineButtonRow[]) => void;
}

const InlineButtonBuilder: React.FC<InlineButtonBuilderProps> = ({ rows, onChange }) => {
  const [dragSource, setDragSource] = useState<{ rowIdx: number; btnIdx: number } | null>(null);

  const addButton = (rowIndex: number) => {
    const newRows = [...rows];
    newRows[rowIndex].buttons.push({
      id: crypto.randomUUID(),
      type: 'text',
      text: 'Кнопка',
      callbackData: 'action',
      style: 'default',
    });
    onChange(newRows);
  };

  const addRow = () => {
    onChange([...rows, {
      id: crypto.randomUUID(),
      buttons: [{
        id: crypto.randomUUID(),
        type: 'text',
        text: 'Кнопка',
        callbackData: 'action',
        style: 'default',
      }],
    }]);
  };

  const removeButton = (rowIndex: number, btnIndex: number) => {
    const newRows = [...rows];
    newRows[rowIndex].buttons.splice(btnIndex, 1);
    onChange(newRows.filter(r => r.buttons.length > 0));
  };

  const removeRow = (rowIndex: number) => {
    const newRows = [...rows];
    newRows.splice(rowIndex, 1);
    onChange(newRows);
  };

  const updateButton = (rowIndex: number, btnIndex: number, updates: Partial<InlineButton>) => {
    const newRows = [...rows];
    newRows[rowIndex].buttons[btnIndex] = {
      ...newRows[rowIndex].buttons[btnIndex],
      ...updates,
    };
    onChange(newRows);
  };

  const moveButtonToRow = (fromRow: number, btnIdx: number, toRow: number) => {
    const newRows = [...rows];
    const [btn] = newRows[fromRow].buttons.splice(btnIdx, 1);
    if (toRow >= newRows.length) {
      newRows.push({ id: crypto.randomUUID(), buttons: [btn] });
    } else {
      newRows[toRow].buttons.push(btn);
    }
    onChange(newRows.filter(r => r.buttons.length > 0));
  };

  const handleDragStart = (rowIdx: number, btnIdx: number) => {
    setDragSource({ rowIdx, btnIdx });
  };

  const handleDrop = (targetRowIdx: number) => {
    if (!dragSource) return;
    if (dragSource.rowIdx === targetRowIdx) return;
    moveButtonToRow(dragSource.rowIdx, dragSource.btnIdx, targetRowIdx);
    setDragSource(null);
  };

  return (
    <div className="space-y-3 w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">Инлайн-кнопки</Label>
        <Button variant="outline" size="sm" onClick={addRow} className="gap-1 h-7 text-xs w-full sm:w-auto">
          <Plus className="w-3 h-3" />
          Новый ряд
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">
          Нет инлайн-кнопок. Нажмите "Новый ряд" для добавления.
        </p>
      )}

      {rows.map((row, rowIdx) => (
        <div
          key={row.id}
          className="border border-border rounded-lg p-3 space-y-2 overflow-x-hidden"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(rowIdx)}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Ряд {rowIdx + 1}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addButton(rowIdx)}
                className="h-6 px-2 text-[10px] gap-1"
              >
                <ArrowRight className="w-3 h-3" />
                В этот ряд
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(rowIdx)}
                className="h-6 px-1 text-destructive"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Button preview row */}
          <div className="flex flex-wrap gap-1 p-2 bg-muted/30 rounded-md min-h-[32px]">
            {row.buttons.map((btn, btnIdx) => {
              const styleInfo = getStylePreview(btn.style);
              return (
                <div
                  key={btn.id}
                  draggable
                  onDragStart={() => handleDragStart(rowIdx, btnIdx)}
                  className={`flex items-center gap-1 ${styleInfo.previewBg} border ${styleInfo.previewBorder} rounded px-2 py-1 text-xs cursor-grab active:cursor-grabbing`}
                >
                  <GripVertical className="w-3 h-3 text-muted-foreground" />
                  {BUTTON_TYPE_LABELS[btn.type].icon}
                  <span className={`max-w-20 truncate ${styleInfo.previewText}`}>{btn.text}</span>
                </div>
              );
            })}
          </div>

          {/* Button editors */}
          {row.buttons.map((btn, btnIdx) => (
            <div key={btn.id} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-2 pl-2 border-l-2 border-primary/20">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={btn.type}
                    onValueChange={(v: InlineButtonType) => {
                      const updates: Partial<InlineButton> = { type: v };
                      if (v === 'text') { updates.url = undefined; updates.callbackData = updates.callbackData || 'action'; }
                      if (v === 'link' || v === 'webapp') { updates.callbackData = undefined; updates.url = updates.url || ''; }
                      updateButton(rowIdx, btnIdx, updates);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-24 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(BUTTON_TYPE_LABELS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={btn.text}
                    onChange={(e) => updateButton(rowIdx, btnIdx, { text: e.target.value })}
                    placeholder="Текст кнопки"
                    className="flex-1 min-w-0 h-7 text-xs"
                  />
                  <Select
                    value={btn.style || 'default'}
                    onValueChange={(v: InlineButtonStyle) => updateButton(rowIdx, btnIdx, { style: v })}
                  >
                    <SelectTrigger className="w-full sm:w-28 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BUTTON_STYLE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} className="text-xs">{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => removeButton(rowIdx, btnIdx)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                {btn.type === 'link' && (
                  <Input
                    value={btn.url || ''}
                    onChange={(e) => updateButton(rowIdx, btnIdx, { url: e.target.value })}
                    placeholder="https://example.com"
                    className="h-7 text-xs"
                  />
                )}
                {btn.type === 'webapp' && (
                  <Input
                    value={btn.url || ''}
                    onChange={(e) => updateButton(rowIdx, btnIdx, { url: e.target.value })}
                    placeholder="https://webapp.example.com"
                    className="h-7 text-xs"
                  />
                )}
                {btn.type === 'text' && (
                  <Input
                    value={btn.callbackData || ''}
                    onChange={(e) => updateButton(rowIdx, btnIdx, { callbackData: e.target.value })}
                    placeholder="callback_data"
                    className="h-7 text-xs"
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Drop zone for new row */}
      {rows.length > 0 && dragSource && (
        <div
          className="border-2 border-dashed border-primary/30 rounded-lg p-3 text-center text-xs text-muted-foreground"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragSource) {
              moveButtonToRow(dragSource.rowIdx, dragSource.btnIdx, rows.length);
              setDragSource(null);
            }
          }}
        >
          <ArrowDown className="w-4 h-4 mx-auto mb-1" />
          Перетащите сюда для создания нового ряда
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="mt-3">
          <Label className="text-xs text-muted-foreground mb-1 block">Превью кнопок:</Label>
          <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1 overflow-x-hidden">
            {rows.map((row) => (
              <div key={row.id} className="flex gap-1 flex-wrap">
                {row.buttons.map((btn) => {
                  const styleInfo = getStylePreview(btn.style);
                  return (
                    <div
                      key={btn.id}
                      className={`flex-1 min-w-[90px] text-center py-1.5 px-2 rounded ${styleInfo.previewBg} border ${styleInfo.previewBorder} text-xs ${styleInfo.previewText} truncate`}
                    >
                      {btn.type === 'link' && '🔗 '}
                      {btn.type === 'webapp' && '🌐 '}
                      {btn.text}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Text command help */}
      <div className="text-[10px] text-muted-foreground space-y-0.5 mt-2 break-words [&_code]:break-all">
        <p><b>Текстовые команды кнопок:</b></p>
        <p><code>{'##INLINE:[🔵кнопка 1;🔴кнопка 2],[🟢кнопка 3;кнопка 4]##'}</code></p>
        <p><code>{'##INLINE:кнопка(url:https://...);кнопка(webapp:https://...)##'}</code></p>
        <p>🔵 primary, 🟢 success, 🔴 danger, без иконки — default</p>
      </div>
    </div>
  );
};

export default InlineButtonBuilder;