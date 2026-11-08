import { useState, useEffect, useCallback } from 'react';

// Table columns configuration
export interface TableColumn {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_TABLE_COLUMNS: TableColumn[] = [
  // Основные
  { key: 'project_code', label: 'Код', visible: true },
  { key: 'full_name', label: 'Клиент', visible: true },
  { key: 'telegram_client', label: 'Telegram', visible: true },
  { key: 'telegram_id', label: 'Telegram ID', visible: false },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'status', label: 'Статус', visible: true },
  { key: 'send_status', label: 'Статус отправки', visible: false },
  { key: 'channel', label: 'Канал', visible: false },
  
  // Эксперт и тариф
  { key: 'expert', label: 'Эксперт', visible: true },
  { key: 'selected_expert', label: 'Выбранный эксперт', visible: false },
  { key: 'tariff', label: 'Тариф', visible: true },
  
  // Локация и компания
  { key: 'city', label: 'Город', visible: true },
  { key: 'product', label: 'Продукт', visible: false },
  { key: 'department', label: 'Подразделение', visible: false },
  { key: 'department_text', label: 'Текст подразделения', visible: false },
  { key: 'employees_count', label: 'Сотрудников', visible: false },
  { key: 'functionality', label: 'Функционал', visible: false },
  { key: 'service', label: 'Сервис', visible: false },
  { key: 'service_type', label: 'Тип сервиса', visible: false },
  
  // Финансы
  { key: 'sav_cost', label: 'Стоимость SAV', visible: false },
  { key: 'service_price', label: 'Цена услуги', visible: false },
  { key: 'software_price', label: 'Цена ПО', visible: false },
  { key: 'ai_tokens_price', label: 'Цена токенов', visible: false },
  { key: 'ai_employee_cost', label: 'Стоимость ИИ сотрудника', visible: false },
  { key: 'avg_salary', label: 'Средняя ЗП', visible: false },
  { key: 'real_salary', label: 'Реальная ЗП', visible: false },
  { key: 'region_salary', label: 'ЗП региона', visible: false },
  { key: 'payback', label: 'Окупаемость', visible: false },
  { key: 'refund_amount', label: 'Сумма возврата', visible: false },
  
  // Даты
  { key: 'start_date', label: 'Дата старта', visible: false },
  { key: 'calculator_date', label: 'Дата калькулятора', visible: false },
  { key: 'tariff_date', label: 'Дата тарифа', visible: false },
  { key: 'expert_date', label: 'Дата эксперта', visible: false },
  { key: 'payment_date', label: 'Дата оплаты', visible: false },
  { key: 'service_start_date', label: 'Начало обслуживания', visible: false },
  { key: 'work_start_date', label: 'Начало работы', visible: false },
  { key: 'work_end_date', label: 'Конец работы', visible: false },
  { key: 'act_date', label: 'Дата акта', visible: false },
  { key: 'block_date', label: 'Дата блокировки', visible: false },
  { key: 'rejection_date', label: 'Дата отказа', visible: false },
  
  // Bot settings
  { key: 'protalk_name', label: 'Имя бота', visible: false },
  { key: 'protalk_id', label: 'ID бота', visible: false },
  { key: 'protalk_send_status', label: 'Статус бота', visible: false },
  { key: 'script_id', label: 'ID скрипта', visible: false },
  { key: 'bot_token', label: 'Токен бота', visible: false },
  
  // Тексты
  { key: 'comment', label: 'Комментарий', visible: false },
  { key: 'last_message', label: 'Последнее сообщение', visible: false },
  { key: 'last_100_messages', label: '100 последних сообщений', visible: false },
  { key: 'reminder_text', label: 'Текст напоминания', visible: false },
  { key: 'reminder_time', label: 'Время напоминания', visible: false },
  { key: 'software_text', label: 'Текст ПО', visible: false },
  { key: 'kp_text', label: 'Текст КП', visible: false },
];

// Kanban card fields configuration
export interface KanbanField {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_KANBAN_FIELDS: KanbanField[] = [
  { key: 'avatar', label: 'Аватар Telegram', visible: true },
  { key: 'full_name', label: 'Имя клиента', visible: true },
  { key: 'project_code', label: 'Код проекта', visible: true },
  { key: 'telegram_client', label: 'Telegram', visible: true },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'city', label: 'Город', visible: true },
  { key: 'tariff', label: 'Тариф', visible: true },
  { key: 'expert', label: 'Эксперт', visible: false },
  { key: 'product', label: 'Продукт', visible: false },
  { key: 'sav_cost', label: 'Стоимость SAV', visible: false },
  { key: 'service_price', label: 'Цена услуги', visible: false },
  { key: 'calculator_date', label: 'Дата калькулятора', visible: false },
  { key: 'last_message', label: 'Последнее сообщение', visible: false },
];

// Client card sections configuration
export interface CardSection {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_CARD_SECTIONS: CardSection[] = [
  { key: 'contacts', label: 'Контактные данные', visible: true },
  { key: 'project', label: 'Проект', visible: true },
  { key: 'expert', label: 'Эксперт и тариф', visible: true },
  { key: 'finance', label: 'Финансы', visible: true },
  { key: 'dates', label: 'Важные даты', visible: true },
  { key: 'protalk', label: 'ИИ-бот', visible: true },
  { key: 'documents', label: 'Документы', visible: true },
  { key: 'comment', label: 'Комментарий', visible: true },
  { key: 'kp', label: 'Текст КП', visible: false },
  { key: 'messages', label: '100 последних сообщений', visible: false },
];

const STORAGE_KEYS = {
  tableColumns: 'crm_table_columns',
  kanbanFields: 'crm_kanban_fields',
  cardSections: 'crm_card_sections',
};

// Helper to merge saved settings with defaults (adds new fields)
function mergeWithDefaults<T extends { key: string }>(saved: T[], defaults: T[]): T[] {
  const savedKeys = new Set(saved.map(item => item.key));
  const newItems = defaults.filter(item => !savedKeys.has(item.key));
  return [...saved, ...newItems];
}

export function useCRMSettings() {
  // Table columns
  const [tableColumns, setTableColumnsState] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.tableColumns);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to include new columns
        return mergeWithDefaults(parsed, DEFAULT_TABLE_COLUMNS);
      } catch {
        return DEFAULT_TABLE_COLUMNS;
      }
    }
    return DEFAULT_TABLE_COLUMNS;
  });

  // Kanban fields
  const [kanbanFields, setKanbanFieldsState] = useState<KanbanField[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.kanbanFields);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to include new fields
        return mergeWithDefaults(parsed, DEFAULT_KANBAN_FIELDS);
      } catch {
        return DEFAULT_KANBAN_FIELDS;
      }
    }
    return DEFAULT_KANBAN_FIELDS;
  });

  // Card sections
  const [cardSections, setCardSectionsState] = useState<CardSection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.cardSections);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to include new sections
        return mergeWithDefaults(parsed, DEFAULT_CARD_SECTIONS);
      } catch {
        return DEFAULT_CARD_SECTIONS;
      }
    }
    return DEFAULT_CARD_SECTIONS;
  });

  // Persist changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.tableColumns, JSON.stringify(tableColumns));
  }, [tableColumns]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.kanbanFields, JSON.stringify(kanbanFields));
  }, [kanbanFields]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.cardSections, JSON.stringify(cardSections));
  }, [cardSections]);

  const setTableColumns = useCallback((columns: TableColumn[]) => {
    setTableColumnsState(columns);
  }, []);

  const setKanbanFields = useCallback((fields: KanbanField[]) => {
    setKanbanFieldsState(fields);
  }, []);

  const setCardSections = useCallback((sections: CardSection[]) => {
    setCardSectionsState(sections);
  }, []);

  const toggleTableColumn = useCallback((key: string) => {
    setTableColumnsState(prev => 
      prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col)
    );
  }, []);

  const toggleKanbanField = useCallback((key: string) => {
    setKanbanFieldsState(prev => 
      prev.map(f => f.key === key ? { ...f, visible: !f.visible } : f)
    );
  }, []);

  const toggleCardSection = useCallback((key: string) => {
    setCardSectionsState(prev => 
      prev.map(s => s.key === key ? { ...s, visible: !s.visible } : s)
    );
  }, []);

  const resetTableColumns = useCallback(() => {
    setTableColumnsState(DEFAULT_TABLE_COLUMNS);
  }, []);

  const resetKanbanFields = useCallback(() => {
    setKanbanFieldsState(DEFAULT_KANBAN_FIELDS);
  }, []);

  const resetCardSections = useCallback(() => {
    setCardSectionsState(DEFAULT_CARD_SECTIONS);
  }, []);

  return {
    tableColumns,
    kanbanFields,
    cardSections,
    setTableColumns,
    setKanbanFields,
    setCardSections,
    toggleTableColumn,
    toggleKanbanField,
    toggleCardSection,
    resetTableColumns,
    resetKanbanFields,
    resetCardSections,
  };
}