import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Search, Edit2, Move
} from 'lucide-react';
import { protalkDb } from '@/integrations/protalk/client';
import { useToast } from '@/hooks/use-toast';

interface AdminCRMKanbanProps {
  crmData: any[];
  onEditRow: (row: any) => void;
  onRefresh?: () => void;
}

const DEFAULT_STAGES = [
  'Новый',
  'Регистрация',
  'Реферал',
  'Эксперт',
  'В работе',
  'Оплачено',
  'Заблокировано',
];

export const AdminCRMKanban: React.FC<AdminCRMKanbanProps> = ({
  crmData,
  onEditRow,
  onRefresh,
}) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Board container ref to dynamically calculate column width so exactly 6 columns fit across the visible screen
  const boardRef = useRef<HTMLDivElement>(null);
  const [columnWidth, setColumnWidth] = useState<number>(220);

  const calculateColumnWidth = useCallback(() => {
    if (!boardRef.current) return;
    const containerWidth = boardRef.current.clientWidth;
    // Exactly 6 columns fit across the screen on desktop (accounting for 5 gaps of 10px and margin/scroll space)
    if (containerWidth >= 1100) {
      const calculated = Math.floor((containerWidth - 54) / 6);
      // Keep column width between 195px and 260px so cards remain readable and compact
      setColumnWidth(Math.max(195, Math.min(270, calculated)));
    } else if (containerWidth >= 768) {
      const calculated = Math.floor((containerWidth - 36) / 3);
      setColumnWidth(Math.max(190, Math.min(260, calculated)));
    } else {
      setColumnWidth(260);
    }
  }, []);

  useEffect(() => {
    calculateColumnWidth();
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => calculateColumnWidth());
    ro.observe(el);
    window.addEventListener('resize', calculateColumnWidth);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', calculateColumnWidth);
    };
  }, [calculateColumnWidth]);

  // Discover all unique statuses present in data
  const allStages = useMemo(() => {
    const stageSet = new Set<string>(DEFAULT_STAGES);
    crmData.forEach(item => {
      if (item.status && typeof item.status === 'string' && item.status.trim()) {
        stageSet.add(item.status.trim());
      }
    });
    return Array.from(stageSet);
  }, [crmData]);

  // Filter items
  const filteredData = useMemo(() => {
    if (!search.trim()) return crmData;
    const lower = search.toLowerCase();
    return crmData.filter(item => {
      return (
        (item.fio && String(item.fio).toLowerCase().includes(lower)) ||
        (item.telegram && String(item.telegram).toLowerCase().includes(lower)) ||
        (item.telegram_id && String(item.telegram_id).toLowerCase().includes(lower)) ||
        (item.partner_code && String(item.partner_code).toLowerCase().includes(lower)) ||
        (item.promo && String(item.promo).toLowerCase().includes(lower)) ||
        (item.comment && String(item.comment).toLowerCase().includes(lower)) ||
        (item.registration_type && String(item.registration_type).toLowerCase().includes(lower)) ||
        (item.status && String(item.status).toLowerCase().includes(lower))
      );
    });
  }, [crmData, search]);

  // Group by status
  const stageGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    allStages.forEach(s => {
      groups[s] = [];
    });
    filteredData.forEach(item => {
      const st = item.status && typeof item.status === 'string' && item.status.trim() ? item.status.trim() : 'Новый';
      if (!groups[st]) groups[st] = [];
      groups[st].push(item);
    });
    return groups;
  }, [allStages, filteredData]);

  const handleMoveStage = useCallback(async (cardOrId: any, newStatus: string) => {
    const cardId = typeof cardOrId === 'string' ? cardOrId : cardOrId?.id;
    if (!cardId) return;

    const targetCard = crmData.find(c => c.id === cardId);
    if (!targetCard || targetCard.status === newStatus) return;

    const oldStatus = targetCard.status;
    targetCard.status = newStatus;
    setMovingId(cardId);

    try {
      await protalkDb.from('crm' as any).update({ status: newStatus }).eq('id', cardId);
      // Also update sav_clients if present
      await protalkDb.from('sav_clients' as any).update({ status: newStatus }).eq('id', cardId);

      toast({
        title: 'Статус обновлен',
        description: `${targetCard.fio || 'Клиент'} переведен в «${newStatus}»`
      });

      if (onRefresh) onRefresh();
    } catch (e) {
      console.error('Failed to move CRM stage:', e);
      targetCard.status = oldStatus;
      toast({ title: 'Ошибка перемещения статуса' });
    } finally {
      setMovingId(null);
    }
  }, [crmData, onRefresh, toast]);

  // Drag and Drop event handlers
  const handleDragStart = (e: React.DragEvent, card: any) => {
    e.dataTransfer.setData('text/plain', card.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingCardId(card.id);
  };

  const handleDragEnd = () => {
    setDraggingCardId(null);
    setDragOverStage(null);
  };

  const handleDragOverColumn = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStage !== stage) {
      setDragOverStage(stage);
    }
  };

  const handleDragLeaveColumn = (e: React.DragEvent, stage: string) => {
    const related = e.relatedTarget as HTMLElement;
    if (!related || !e.currentTarget.contains(related)) {
      if (dragOverStage === stage) {
        setDragOverStage(null);
      }
    }
  };

  const handleDropColumn = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    const cardId = e.dataTransfer.getData('text/plain') || draggingCardId;
    if (cardId) {
      handleMoveStage(cardId, stage);
    }
    setDragOverStage(null);
    setDraggingCardId(null);
  };

  return (
    <div className="flex-grow flex flex-col overflow-hidden space-y-3.5 w-full">
      {/* Top Search & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 liquid-bubble-plate border border-amber-400/25 rounded-2xl shadow-sm">
        <span className="liquid-bubble-glare" />
        <div className="relative flex-grow max-w-md z-10">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по ФИО, Telegram, ID, коду партнера..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950/60 border border-white/15 focus:border-amber-400/60 rounded-xl pl-10 pr-4 py-2 text-sm text-white outline-none backdrop-blur-md placeholder:text-zinc-500"
          />
        </div>
        <div className="flex items-center gap-2.5 text-sm text-zinc-300 z-10 flex-wrap">
          <span className="liquid-bubble-secondary px-3 py-1.5 rounded-xl border border-white/10 font-medium text-xs sm:text-sm">
            Всего карточек: <strong className="text-amber-300 font-bold">{filteredData.length}</strong>
          </span>
          <span className="liquid-bubble-secondary px-3 py-1.5 rounded-xl border border-white/10 font-medium text-xs sm:text-sm">
            Колонок: <strong className="text-amber-300 font-bold">{allStages.length}</strong>
          </span>
          <span className="text-xs text-zinc-400 border border-white/10 px-2.5 py-1.5 rounded-xl bg-white/[0.02] hidden md:inline">
            Перетаскивайте карточки между колонками
          </span>
        </div>
      </div>

      {/* Kanban Board Columns Container with DnD — exactly 6 columns fit across the screen */}
      <div
        ref={boardRef}
        className="flex-grow overflow-x-auto pb-4 custom-scrollbar w-full"
      >
        <div className="flex gap-2.5 min-w-max h-full items-start">
          {allStages.map(stage => {
            const cards = stageGroups[stage] || [];
            const isColumnOver = dragOverStage === stage;

            return (
              <div
                key={stage}
                onDragOver={(e) => handleDragOverColumn(e, stage)}
                onDragLeave={(e) => handleDragLeaveColumn(e, stage)}
                onDrop={(e) => handleDropColumn(e, stage)}
                style={{
                  width: `${columnWidth}px`,
                  minWidth: `${columnWidth}px`,
                  maxWidth: `${columnWidth}px`,
                }}
                className={`flex-shrink-0 flex flex-col max-h-[calc(100vh-270px)] liquid-bubble-plate rounded-2xl overflow-hidden shadow-xl transition-all duration-200 ${
                  isColumnOver
                    ? 'border-2 border-amber-400/80 bg-amber-400/10 ring-4 ring-amber-400/20 scale-[1.01]'
                    : 'border border-white/15 hover:border-amber-400/35'
                }`}
              >
                <span className="liquid-bubble-glare" />

                {/* Column Header — tightly constrained to prevent expanding */}
                <div className={`p-2.5 border-b flex items-center justify-between z-10 transition-colors ${
                  isColumnOver ? 'border-amber-400/40 bg-amber-400/15' : 'border-white/10 liquid-bubble-secondary'
                }`}>
                  <div className="flex items-center gap-2 min-w-0 flex-1 mr-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shrink-0" />
                    <h3 className="font-bold text-sm text-zinc-100 truncate min-w-0" title={stage}>
                      {stage}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold liquid-bubble-gold text-amber-950 border border-amber-300 shadow-sm shrink-0">
                    {cards.length}
                  </span>
                </div>

                {/* Cards Column Body with Drag & Drop */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-grow custom-scrollbar z-10 min-h-[160px] w-full min-w-0">
                  {cards.length === 0 ? (
                    <div className={`text-center py-8 px-2 rounded-xl text-xs italic transition-colors border border-dashed ${
                      isColumnOver
                        ? 'border-amber-400/60 bg-amber-400/10 text-amber-300 font-medium'
                        : 'border-white/10 text-zinc-500'
                    }`}>
                      {isColumnOver ? 'Отпустите карточку здесь' : 'Нет записей'}
                    </div>
                  ) : (
                    cards.map(card => {
                      const fioText = card.fio || card.client_telegram || card.telegram || 'Без имени';
                      const isMoving = movingId === card.id;
                      const isDraggingThis = draggingCardId === card.id;

                      return (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, card)}
                          onDragEnd={handleDragEnd}
                          className={`w-full min-w-0 overflow-hidden liquid-bubble-secondary border rounded-xl p-2.5 transition-all shadow-md group relative cursor-grab active:cursor-grabbing select-none ${
                            isDraggingThis
                              ? 'opacity-40 scale-[0.98] border-dashed border-amber-400/70 bg-amber-400/10'
                              : 'border-white/15 hover:border-amber-400/60 hover:translate-y-[-2px] hover:shadow-xl'
                          }`}
                        >
                          <span className="liquid-bubble-glare" />

                          {/* Card Top: Title & Edit Button — strictly constrained with truncate and min-w-0 */}
                          <div className="flex items-start justify-between gap-1.5 mb-1.5 min-w-0">
                            <div className="min-w-0 flex-1 overflow-hidden">
                              <div className="flex items-center gap-1 min-w-0">
                                <Move size={12} className="text-zinc-500 group-hover:text-amber-400 shrink-0 transition-colors" />
                                <h4
                                  className="font-bold text-sm text-zinc-100 truncate min-w-0 flex-1 group-hover:text-amber-300 transition-colors"
                                  title={fioText}
                                >
                                  {fioText}
                                </h4>
                              </div>
                              {card.telegram && (
                                <p className="text-xs text-amber-300/90 font-mono truncate pl-3.5 min-w-0" title={card.telegram}>
                                  {card.telegram.startsWith('@') ? card.telegram : `@${card.telegram}`}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditRow(card);
                              }}
                              className="p-1 rounded-lg liquid-bubble-secondary border border-white/15 hover:border-amber-400 text-zinc-300 hover:text-white transition-colors cursor-pointer shrink-0"
                              title="Редактировать карточку"
                            >
                              <Edit2 size={13} />
                            </button>
                          </div>

                          {/* Badges / Info — compact text layout */}
                          <div className="space-y-1 text-xs text-zinc-300 mb-2 pl-0.5 min-w-0 overflow-hidden">
                            {card.telegram_id && (
                              <div className="flex items-center justify-between gap-1 min-w-0">
                                <span className="text-zinc-400 shrink-0">TG ID:</span>
                                <span className="font-mono text-zinc-200 font-medium truncate min-w-0" title={card.telegram_id}>{card.telegram_id}</span>
                              </div>
                            )}

                            {card.partner_code && (
                              <div className="flex items-center justify-between gap-1 min-w-0">
                                <span className="text-zinc-400 shrink-0">Код:</span>
                                <span className="font-mono text-amber-300 font-semibold truncate min-w-0">{card.partner_code}</span>
                              </div>
                            )}

                            {card.registration_type && (
                              <div className="flex items-center justify-between gap-1 min-w-0">
                                <span className="text-zinc-400 shrink-0">Тип:</span>
                                <span className="text-zinc-200 truncate min-w-0">{card.registration_type}</span>
                              </div>
                            )}

                            {card.progress && (
                              <div className="pt-1 border-t border-white/5 text-xs text-zinc-300 whitespace-pre-line leading-relaxed break-words min-w-0">
                                {card.progress}
                              </div>
                            )}

                            {card.comment && (
                              <div className="text-xs text-zinc-400 italic truncate pt-0.5 min-w-0" title={card.comment}>
                                💬 {card.comment}
                              </div>
                            )}
                          </div>

                          {/* Move Stage Selector & Drag Prompt */}
                          <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-1.5 min-w-0">
                            <span className="text-xs text-zinc-400 flex items-center gap-1 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Этап:
                            </span>
                            <select
                              value={card.status || stage}
                              disabled={isMoving}
                              onChange={e => handleMoveStage(card, e.target.value)}
                              className="bg-zinc-950/80 border border-white/15 focus:border-amber-400 rounded-lg px-2 py-0.5 text-xs text-white outline-none cursor-pointer max-w-[125px] truncate"
                            >
                              {allStages.map(s => (
                                <option key={s} value={s} className="bg-zinc-900 text-white">
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminCRMKanban;
