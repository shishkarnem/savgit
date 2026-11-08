import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, Edit2, X, Save, Check, Map as MapIcon, Trash2, Settings, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, GripVertical, Book, Upload, File as FileIcon, PlusCircle, Bold, Italic, Code, Quote, Variable, Image as ImageIcon, Users, Send, Loader2, Shield, Eye, ChevronDown, ChevronUp, Database, LayoutGrid, List
} from 'lucide-react';
import { CityNode, InlineButton } from '@/types';
import { useAdminData } from '@/hooks/useAdminData';
import { protalkDb } from '@/integrations/protalk/client';
import { AdminAISettings } from './AdminAISettings';
import { AdminKnowledge } from './AdminKnowledge';
import { AdminCRMKanban } from './AdminCRMKanban';
import { AdminEditModal } from './AdminEditModal';
import { MemeAutopilotManager } from '@/components/crm/MemeAutopilotManager';
import RealisticSmokeBackdrop from '@/components/RealisticSmokeBackdrop';

type AdminTab = 'CRM' | 'LEADS' | 'PARTNERS' | 'LOGS' | 'BROADCAST' | 'HISTORY' | 'REMINDERS' | 'AUTOPILOT' | 'RULES' | 'MAP' | 'LAWS' | 'SITE_TEXT' | 'KNOWLEDGE' | 'CONTRACTS' | 'STATUS_CONFIG' | 'AI_SETTINGS';

const TAB_LABELS: Record<AdminTab, string> = {
  CRM: 'База CRM',
  LEADS: 'Лиды и заявки',
  PARTNERS: 'Партнеры',
  LOGS: 'Системные логи',
  BROADCAST: 'Рассылка сообщений',
  HISTORY: 'История рассылок',
  REMINDERS: 'Авто-напоминания',
  AUTOPILOT: 'Мем-Автопилот (7:00)',
  RULES: 'Управление доступом',
  MAP: 'Карта присутствия',
  LAWS: 'Конституция и законы',
  SITE_TEXT: 'Тексты интерфейса',
  KNOWLEDGE: 'База знаний и промпты',
  CONTRACTS: 'Шаблоны договоров',
  STATUS_CONFIG: 'Конфигурация статусов',
  AI_SETTINGS: 'Настройки ИИ',
};

interface ColumnDef {
  key: string;
  label: string;
  width: number;
  type?: 'text' | 'number' | 'status' | 'date';
  visible: boolean;
}

const ALL_PAGES = ['home', 'immigration', 'constitution', 'profile', 'admin', 'library', 'treasury', 'ai_assistant'];
const PAGE_LABELS: Record<string, string> = {
  home: 'Главная',
  immigration: 'Иммиграция',
  constitution: 'Конституция',
  profile: 'Профиль',
  admin: 'Штаб',
  library: 'Библиотека',
  treasury: 'Казна',
  ai_assistant: 'ИИ-Ассистент',
};

type ButtonStyle = 'default' | 'primary' | 'success' | 'danger';
const BUTTON_STYLE_COLORS: Record<ButtonStyle, string> = {
  default: 'liquid-bubble-secondary text-zinc-200 border border-white/10',
  primary: 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300',
  success: 'liquid-bubble-secondary text-amber-300 border border-amber-400/35',
  danger: 'liquid-bubble-secondary text-zinc-300 border border-white/20',
};

interface EnhancedInlineButton {
  text: string;
  type: 'url' | 'callback' | 'webapp';
  value: string;
  style: ButtonStyle;
  row: number;
}

function parseInlineButtons(text: string): { cleanText: string; buttons: EnhancedInlineButton[] } {
  const buttons: EnhancedInlineButton[] = [];
  const cleanText = text.replace(/##INLINE:([\s\S]*?)##/g, (_, content) => {
    const rowsRaw = content.trim();
    let rows: string[];
    if (rowsRaw.includes('], [')) {
      rows = rowsRaw.split(/\],\s*\[/);
    } else {
      rows = [rowsRaw];
    }
    rows.forEach((rowContent: string, rowIdx: number) => {
      const cleaned = rowContent.replace(/^\[/, '').replace(/\]$/, '');
      const cols = cleaned.split(';');
      cols.forEach((col: string) => {
        let trimmed = col.trim();
        if (!trimmed) return;
        let style: ButtonStyle = 'default';
        if (trimmed.startsWith('🔵')) { style = 'primary'; trimmed = trimmed.replace(/^🔵\s*/, ''); }
        else if (trimmed.startsWith('🟢')) { style = 'success'; trimmed = trimmed.replace(/^🟢\s*/, ''); }
        else if (trimmed.startsWith('🔴')) { style = 'danger'; trimmed = trimmed.replace(/^🔴\s*/, ''); }
        const urlMatch = trimmed.match(/^(.+?)\s*\(url:(.+?)\)$/);
        const webappMatch = trimmed.match(/^(.+?)\s*\(webapp:(.+?)\)$/);
        if (urlMatch) {
          buttons.push({ text: urlMatch[1].trim(), type: 'url', value: urlMatch[2].trim(), style, row: rowIdx });
        } else if (webappMatch) {
          buttons.push({ text: webappMatch[1].trim(), type: 'webapp', value: webappMatch[2].trim(), style, row: rowIdx });
        } else {
          buttons.push({ text: trimmed, type: 'callback', value: trimmed, style, row: rowIdx });
        }
      });
    });
    return '';
  }).trim();
  return { cleanText, buttons };
}

function splitMessages(text: string): string[] {
  return text.split(/✂️✂️✂️|::/).map(s => s.trim()).filter(Boolean);
}

export function parseAllowedPages(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(String) : [];
      } catch {
        return [];
      }
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [];
}

function replaceMacros(text: string, userData: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    return userData[key] !== undefined ? String(userData[key]) : `{${key}}`;
  });
}

const INITIAL_COLS: Record<string, ColumnDef[]> = {
  CRM: [
    { key: 'created_at', label: 'Дата', width: 140, visible: true },
    { key: 'fio', label: 'ФИО', width: 180, visible: true },
    { key: 'telegram', label: 'Телеграм', width: 140, visible: true },
    { key: 'status', label: 'Статус', width: 120, visible: true, type: 'status' },
    { key: 'progress', label: 'Прогресс', width: 140, visible: true },
    { key: 'comment', label: 'Комментарий', width: 220, visible: true },
    { key: 'partner_code', label: 'Код Партнера', width: 110, visible: true },
    { key: 'promo', label: 'ПРОМОКОД', width: 120, visible: true },
    { key: 'channel', label: 'Канал', width: 100, visible: false },
    { key: 'last_message', label: 'Последнее сообщение', width: 200, visible: false },
    { key: 'telegram_id', label: 'ID Telegram', width: 120, visible: false },
    { key: 'launch_date', label: 'Дата запуска', width: 120, visible: false },
    { key: 'registration_date', label: 'Дата регистрации', width: 120, visible: false },
    { key: 'registration_type', label: 'Тип Регистрации', width: 120, visible: false },
    { key: 'pseudonym', label: 'Псевдоним', width: 120, visible: false },
    { key: 'expert_description', label: 'Описание Эксперта', width: 200, visible: false },
    { key: 'contract_link', label: 'Ссылка на договор', width: 200, visible: false },
    { key: 'training', label: 'Обучение', width: 80, visible: false },
    { key: 'card_or_account', label: 'Карта или Р/С', width: 150, visible: false },
    { key: 'partner_clients', label: 'Клиенты Партнера', width: 150, visible: false },
    { key: 'expert_clients', label: 'Клиенты Эксперта', width: 150, visible: false },
    { key: 'photo_url', label: 'Фото ссылка', width: 150, visible: false },
    { key: 'chat_id', label: 'Chat ID', width: 120, visible: false },
  ],
  LEADS: [
    { key: 'created_at', label: 'Дата заявки', width: 140, visible: true },
    { key: 'fio', label: 'ФИО', width: 200, visible: true },
    { key: 'client_telegram', label: 'ТГ Клиента', width: 180, visible: true },
    { key: 'telegram_id', label: 'ID Telegram', width: 120, visible: true },
    { key: 'sum', label: 'Сумма', width: 100, visible: true, type: 'number' },
    { key: 'status', label: 'Статус', width: 120, visible: true, type: 'status' },
    { key: 'partner_code', label: 'Код Партнера', width: 110, visible: true },
    { key: 'promo', label: 'ПРОМОКОД', width: 120, visible: true },
    { key: 'discounted_price', label: 'Цена со скидкой', width: 120, visible: true },
    { key: 'product', label: 'Продукт', width: 150, visible: true },
    { key: 'company', label: 'Компания', width: 150, visible: true },
    { key: 'city', label: 'Город', width: 120, visible: false },
    { key: 'department', label: 'Подразделение', width: 120, visible: false },
    { key: 'employees', label: 'Сотрудников', width: 100, visible: false },
    { key: 'avg_salary', label: 'Средняя ЗП', width: 100, visible: false },
    { key: 'selected_expert', label: 'Выбранный эксперт', width: 150, visible: false },
    { key: 'functionality', label: 'Функционал', width: 150, visible: false },
    { key: 'service_type', label: 'Обслуживание', width: 120, visible: false },
    { key: 'messenger', label: 'Мессенджер', width: 100, visible: false },
    { key: 'partner_name', label: 'Партнер', width: 150, visible: false },
    { key: 'expert_name', label: 'Эксперт', width: 150, visible: false },
    { key: 'partner_percent', label: '% Партнера', width: 100, visible: false },
    { key: 'expert_percent', label: '% Эксперта', width: 100, visible: false },
    { key: 'partner_payout', label: 'Выплата партнеру', width: 120, visible: false },
    { key: 'expert_payout', label: 'Выплата эксперту', width: 120, visible: false },
    { key: 'chat_id', label: 'Chat ID', width: 120, visible: false },
    { key: 'client_description', label: 'Описание клиента', width: 200, visible: false },
  ],
  PARTNERS: [
    { key: 'created_at', label: 'Дата регистрации', width: 140, visible: true },
    { key: 'fio', label: 'ФИО', width: 200, visible: true },
    { key: 'email', label: 'Email', width: 180, visible: true },
    { key: 'phone', label: 'Телефон', width: 140, visible: true },
    { key: 'city', label: 'Город', width: 120, visible: true },
    { key: 'partner_code', label: 'Код Партнера', width: 110, visible: true },
    { key: 'promo', label: 'ПРОМОКОД', width: 120, visible: true },
    { key: 'type', label: 'Тип Регистрации', width: 120, visible: true },
    { key: 'telegram', label: 'Телеграм', width: 150, visible: true },
    { key: 'status', label: 'Статус', width: 100, visible: true, type: 'status' },
    { key: 'pseudonym', label: 'Псевдоним', width: 120, visible: false },
    { key: 'title', label: 'Обращение', width: 100, visible: false },
    { key: 'tools', label: 'Инструменты', width: 200, visible: false },
    { key: 'spheres', label: 'Сферы', width: 200, visible: false },
    { key: 'cases', label: 'Кейсы и боты', width: 200, visible: false },
    { key: 'other', label: 'Другое', width: 200, visible: false },
    { key: 'rank', label: 'Ранг', width: 100, visible: false },
    { key: 'payout_details', label: 'Реквизиты', width: 150, visible: false },
    { key: 'photo_url', label: 'Фото ссылка', width: 150, visible: false },
    { key: 'telegram_id', label: 'ID Telegram', width: 120, visible: false },
    { key: 'chat_id', label: 'chat_id', width: 120, visible: false },
  ],
  LOGS: [
    { key: 'created_at', label: 'Timestamp', width: 150, visible: true },
    { key: 'channel_id', label: 'chat_id', width: 120, visible: true },
    { key: 'user_social_id', label: 'social_id', width: 120, visible: false },
    { key: 'user_message', label: 'Сообщение', width: 300, visible: true },
    { key: 'bot_reply', label: 'Ответ ИИ', width: 300, visible: true },
    { key: 'message_user_text', label: 'Текст юзера', width: 200, visible: false },
    { key: 'message_ai_text', label: 'Текст ИИ', width: 200, visible: false },
    { key: 'channel_name', label: 'Channel', width: 100, visible: false },
    { key: 'bot_id', label: 'bot_id', width: 120, visible: false },
    { key: 'llm', label: 'model', width: 100, visible: false },
    { key: 'tokens_user', label: 'tokens', width: 80, visible: false, type: 'number' },
    { key: 'tokens_total', label: 'user_tokens', width: 80, visible: false, type: 'number' },
    { key: 'tokens_in_source', label: 'tokens_in', width: 80, visible: false, type: 'number' },
    { key: 'tokens_out_source', label: 'tokens_out', width: 80, visible: false, type: 'number' },
    { key: 'function_error', label: 'error_log', width: 200, visible: false },
    { key: 'function_call_params', label: 'function_log', width: 200, visible: false },
    { key: 'api_key', label: 'api_key', width: 120, visible: false },
    { key: 'telegram_id', label: 'ID Telegram', width: 120, visible: false },
    { key: 'partner_code', label: 'Код Партнера', width: 110, visible: false },
    { key: 'start_code_text', label: 'Текст Код на старте', width: 150, visible: false },
    { key: 'start_time', label: 'Время старта', width: 120, visible: false },
    { key: 'status_code', label: 'Статус код', width: 100, visible: false },
    { key: 'promo', label: 'ПРОМОКОД', width: 120, visible: false },
    { key: 'fio', label: 'ФИО', width: 150, visible: false },
    { key: 'status', label: 'Статус', width: 100, visible: false },
    { key: 'progress', label: 'Прогресс', width: 100, visible: false },
    { key: 'name_no_button', label: 'Имя без кнопки', width: 130, visible: false },
    { key: 'recognized_name', label: 'Распознанное имя', width: 130, visible: false },
    { key: 'recognized_id', label: 'Распознанный ID', width: 120, visible: false },
    { key: 'text_split_1', label: 'Разбитие текста 1', width: 200, visible: false },
    { key: 'text_split_2', label: 'Разбитие текста 2', width: 200, visible: false },
    { key: 'deletion', label: 'Удаление', width: 100, visible: false },
    { key: 'code_and_start', label: 'Код и старт', width: 120, visible: false },
    { key: 'error_id', label: 'ID ошибки', width: 120, visible: false },
    { key: 'double_start', label: 'Дубль старт', width: 100, visible: false },
    { key: 'double_block', label: 'Дубль блок', width: 100, visible: false },
    { key: 'last_100_messages', label: '100 последних', width: 200, visible: false },
    { key: 'last_message', label: 'Последнее сообщение', width: 200, visible: false },
    { key: 'server_name', label: 'Сервер', width: 120, visible: false },
  ],
  BROADCAST: [
    { key: 'date_sent', label: 'Дата', width: 150, visible: true },
    { key: 'message', label: 'Сообщение', width: 300, visible: true },
    { key: 'chat_ids', label: 'Получатели', width: 150, visible: true },
    { key: 'status', label: 'Статус', width: 100, visible: true, type: 'status' },
  ],
  HISTORY: [
    { key: 'created_at', label: 'Дата', width: 150, visible: true },
    { key: 'chat_id', label: 'Chat ID', width: 120, visible: true },
    { key: 'fio', label: 'ФИО', width: 150, visible: true },
    { key: 'message_text', label: 'Сообщение', width: 250, visible: true },
    { key: 'status', label: 'Статус', width: 100, visible: true, type: 'status' },
    { key: 'error_reason', label: 'Ошибка', width: 200, visible: true },
    { key: 'send_time_ms', label: 'Время (мс)', width: 80, visible: true, type: 'number' },
  ],
  REMINDERS: [
    { key: 'status_trigger', label: 'Статус-триггер', width: 150, visible: true },
    { key: 'message', label: 'Сообщение', width: 300, visible: true },
    { key: 'frequency_hours', label: 'Частота (ч)', width: 100, visible: true, type: 'number' },
    { key: 'max_sends', label: 'Макс. отправок', width: 100, visible: true, type: 'number' },
    { key: 'is_active', label: 'Активно', width: 80, visible: true },
  ],
  RULES: [
    { key: 'telegram_id', label: 'Telegram ID', width: 150, visible: true },
    { key: 'allowed_pages', label: 'Доступные страницы', width: 300, visible: true },
    { key: 'is_superuser', label: 'Суперюзер', width: 100, visible: true },
  ],
  LAWS: [
    { key: 'q', label: 'Вопрос (RU)', width: 300, visible: true },
    { key: 'q_olbanian', label: 'Вопрос (УПЧК)', width: 300, visible: true },
    { key: 'a', label: 'Ответ (RU)', width: 400, visible: true },
    { key: 'a_olbanian', label: 'Ответ (УПЧК)', width: 400, visible: true },
  ],
  SITE_TEXT: [
    { key: 'key', label: 'Ключ', width: 150, visible: true },
    { key: 'ru', label: 'RU', width: 300, visible: true },
    { key: 'olbanian', label: 'УПЧК', width: 300, visible: true },
  ],
  KNOWLEDGE: [
    { key: 'category', label: 'Категория', width: 140, visible: true },
    { key: 'title', label: 'Заголовок / Вопрос', width: 240, visible: true },
    { key: 'prompt_key', label: 'Ключ', width: 160, visible: true },
    { key: 'system_prompt', label: 'Системный промпт / Ответ', width: 340, visible: true },
    { key: 'user_prompt_template', label: 'Шаблон запроса', width: 220, visible: true },
    { key: 'bot_id', label: 'Бот / Модель', width: 110, visible: true },
    { key: 'is_active', label: 'Активен', width: 90, visible: true },
  ],
  STATUS_CONFIG: [
    { key: 'status_name', label: 'Статус', width: 150, visible: true },
    { key: 'partner_percent', label: '% Партнерам', width: 110, visible: true, type: 'number' },
    { key: 'expert_percent', label: '% Экспертам', width: 110, visible: true, type: 'number' },
    { key: 'available_actions', label: 'Доступные действия', width: 250, visible: true },
    { key: 'registration_check', label: 'Регистрация', width: 100, visible: true },
    { key: 'consultation_check', label: 'Консультация', width: 100, visible: true },
    { key: 'contract_check', label: 'Договор', width: 100, visible: true },
    { key: 'payout_by_clients', label: 'Выплата по клиентам', width: 130, visible: true },
    { key: 'client_list', label: 'Список клиентов', width: 120, visible: true },
    { key: 'sort_order', label: 'Порядок', width: 80, visible: true, type: 'number' },
  ],
};

function ContractUrlRow({ row, onSave }: { row: any; onSave: (row: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(row.script_url || '');
  const [formUrl, setFormUrl] = useState(row.form_url || '');
  const handleSave = () => { onSave({ ...row, script_url: scriptUrl, form_url: formUrl }); setEditing(false); };
  return (
    <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-md shadow-lg space-y-4">
      <span className="liquid-bubble-glare" />
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <span className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
          {row.label}
        </span>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
            editing
              ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-md'
              : 'liquid-bubble-secondary text-zinc-200 hover:text-white border border-white/15 hover:border-amber-400/40'
          }`}
        >
          <span className="liquid-bubble-glare" />
          {editing ? <><Check size={15} /><span>Сохранить</span></> : <><Edit2 size={15} /><span>Изменить</span></>}
        </button>
      </div>
      <div className="space-y-3 relative z-10">
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Ссылка скрипта (AppScript)</label>
          <input
            type="text"
            value={scriptUrl}
            onChange={(e) => setScriptUrl(e.target.value)}
            disabled={!editing}
            className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none disabled:opacity-60 font-mono backdrop-blur-md transition-all"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300 mb-1.5 block">Ссылка формы (Google Forms)</label>
          <input
            type="text"
            value={formUrl}
            onChange={(e) => setFormUrl(e.target.value)}
            disabled={!editing}
            className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-4 py-3 text-sm text-zinc-100 outline-none disabled:opacity-60 font-mono backdrop-blur-md transition-all"
          />
        </div>
      </div>
    </div>
  );
}

interface AdminProps {
  mapImage: string;
  cities: CityNode[];
  onUpdateMapImage: (url: string) => void;
  onUpdateCities: (cities: CityNode[]) => void;
  appData: any;
  setAppData: (data: any) => void;
}

export const Admin: React.FC<AdminProps> = ({ mapImage, cities, onUpdateMapImage, onUpdateCities, appData, setAppData }) => {
  const navigate = useNavigate();

  // Admin access protection: non-admins are redirected out of /partner/admin
  useEffect(() => {
    try {
      const storedProfile = JSON.parse(localStorage.getItem('sav_user_profile') || '{}');
      const tgId = String(storedProfile.telegram_id || localStorage.getItem('gl_tg_id') || '').trim();
      const isAdmin =
        tgId === '169262990' ||
        storedProfile.email === 'shishkarnem@gmail.com' ||
        storedProfile.role === 'ADMIN' ||
        storedProfile.role === 'admin' ||
        storedProfile.is_admin === 1 ||
        storedProfile.is_admin === true;

      if (!isAdmin) {
        navigate('/partner/profile', { replace: true });
      }
    } catch {
      navigate('/partner/profile', { replace: true });
    }
  }, [navigate]);

  const { loading, syncing, saveRow, deleteRow, insertRow, refreshTab, loadCities, saveCities, deleteCity: deleteCityDb, seedInitialData, loadAllData } = useAdminData(appData, setAppData);
  const [activeTab, setActiveTab] = useState<AdminTab>('CRM');
  const [contractUrlsList, setContractUrlsList] = useState<any[]>([]);
  const [contractUrlsLoading, setContractUrlsLoading] = useState(false);

  const [tabOrder, setTabOrder] = useState<string[]>(() => {
    const cols = Object.keys(INITIAL_COLS);
    if (!cols.includes('MAP')) cols.push('MAP');
    if (!cols.includes('CONTRACTS')) cols.push('CONTRACTS');
    if (!cols.includes('AI_SETTINGS')) cols.push('AI_SETTINGS');
    if (!cols.includes('AUTOPILOT')) cols.push('AUTOPILOT');
    // Remove AI2 and CONTRACTS_DATA if previously saved
    return cols.filter(t => t !== 'AI2' && t !== 'CONTRACTS_DATA');
  });
  const [draggedTab, setDraggedTab] = useState<string | null>(null);
  const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnDef[]>>(() => {
    try {
      const saved = localStorage.getItem('gl_admin_col_configs');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with INITIAL_COLS to add any new columns that might have been added
        const merged: Record<string, ColumnDef[]> = {};
        for (const tab of Object.keys(INITIAL_COLS)) {
          const savedTab = parsed[tab];
          if (savedTab) {
            // Keep saved visibility/width but add any new columns from INITIAL_COLS
            const initialKeys = INITIAL_COLS[tab].map(c => c.key);
            const savedKeys = savedTab.map((c: ColumnDef) => c.key);
            const newCols = INITIAL_COLS[tab].filter(c => !savedKeys.includes(c.key));
            merged[tab] = [...savedTab, ...newCols];
          } else {
            merged[tab] = INITIAL_COLS[tab];
          }
        }
        return merged;
      }
    } catch {}
    return INITIAL_COLS;
  });
  const [showColSettings, setShowColSettings] = useState(false);
  const [filters, setFilters] = useState<Record<string, Record<string, string>>>({});
  const [contractTypeFilter, setContractTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [draggingCityId, setDraggingCityId] = useState<string | null>(null);
  const [editingCity, setEditingCity] = useState<CityNode | null>(null);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientFilter, setRecipientFilter] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [inlineButtons, setInlineButtons] = useState<EnhancedInlineButton[]>([]);
  const [showVarSelector, setShowVarSelector] = useState(false);
  const msgTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);
  const [knowCategory, setKnowCategory] = useState('');
  const [knowContent, setKnowContent] = useState('');
  const [knowAnswer, setKnowAnswer] = useState('');
  const [customFields, setCustomFields] = useState<{key: string, value: string}[]>([]);
  const [crmViewMode, setCrmViewMode] = useState<'kanban' | 'table'>('kanban');

  // CRM bulk selection state
  const [crmSelected, setCrmSelected] = useState<string[]>([]);
  const [crmBulkAction, setCrmBulkAction] = useState<'delete' | 'status' | 'broadcast' | null>(null);
  const [crmBulkStatus, setCrmBulkStatus] = useState('');
  const [showBroadcastPopup, setShowBroadcastPopup] = useState(false);

  // RULES state
  const [accessRecords, setAccessRecords] = useState<any[]>([]);
  const [newAccessTgId, setNewAccessTgId] = useState('');
  const [newAccessPages, setNewAccessPages] = useState<string[]>([]);
  const [newAccessSuperuser, setNewAccessSuperuser] = useState(false);
  const [newAccessRole, setNewAccessRole] = useState('Телеграм');
  const [accessLoading, setAccessLoading] = useState(false);
  const [rolePresets, setRolePresets] = useState<any[]>([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePages, setNewRolePages] = useState<string[]>([]);
  const [partnerProfiles, setPartnerProfiles] = useState<any[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetPages, setEditingPresetPages] = useState<string[]>([]);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingUserAccess, setEditingUserAccess] = useState<any | null>(null);

  // Preview state for broadcast
  const [previewRecipientId, setPreviewRecipientId] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{sent: number; failed: number; total: number} | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Sorting state for data tables
  const [tableSortCol, setTableSortCol] = useState<string>('');
  const [tableSortDir, setTableSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleTableSort = (col: string) => {
    if (tableSortCol === col) {
      setTableSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setTableSortCol(col);
      setTableSortDir('asc');
    }
    setCurrentPage(1);
  };

  // Stable map dimensions to prevent scale changes
  const [mapDimensions, setMapDimensions] = useState<{width: number; height: number} | null>(null);

  // History state
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('');
  const [historyFilters, setHistoryFilters] = useState<Record<string, string>>({});
  const [historySortCol, setHistorySortCol] = useState<string>('created_at');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('desc');
  const [historySelected, setHistorySelected] = useState<string[]>([]);
  const [historyEditMsg, setHistoryEditMsg] = useState<string | null>(null);
  const [historyEditOpen, setHistoryEditOpen] = useState(false);

  // CRM broadcast popup separate state (full constructor)
  const [crmBroadcastMsg, setCrmBroadcastMsg] = useState('');
  const [crmMediaUrl, setCrmMediaUrl] = useState('');
  const [crmInlineButtons, setCrmInlineButtons] = useState<EnhancedInlineButton[]>([]);
  const [crmShowVarSelector, setCrmShowVarSelector] = useState(false);
  const [crmPreviewRecipientId, setCrmPreviewRecipientId] = useState('');
  const [crmSelectedTemplate, setCrmSelectedTemplate] = useState('');
  const [crmTemplateName, setCrmTemplateName] = useState('');
  const crmMsgTextAreaRef = useRef<HTMLTextAreaElement>(null);

  // Reminders state
  const [remindersList, setRemindersList] = useState<any[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [newReminder, setNewReminder] = useState({ status_trigger: '', message: '', media_url: '', frequency_hours: 24, max_sends: 3, is_active: true });

  useEffect(() => {
    const loadTemplates = async () => {
      const { data } = await protalkDb.from('message_templates' as any).select('*').order('created_at', { ascending: false });
      if (data) setTemplates(data as any);
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab !== 'MAP' && activeTab !== 'AI_SETTINGS') {
      refreshTab(activeTab);
    }
  }, [activeTab, refreshTab]);

  const loadContractUrls = async () => {
    setContractUrlsLoading(true);
    const { data } = await protalkDb.from('contract_urls' as any).select('*').order('created_at', { ascending: true });
    if (data) setContractUrlsList(data as any);
    setContractUrlsLoading(false);
  };

  const saveContractUrl = async (row: any) => {
    const { id, created_at, updated_at, ...rest } = row;
    if (id) {
      await protalkDb.from('contract_urls' as any).update(rest).eq('id', id);
    } else {
      await protalkDb.from('contract_urls' as any).insert(rest);
    }
    loadContractUrls();
  };

  useEffect(() => {
    if (activeTab === 'RULES') {
      loadAccessRecords();
      loadRolePresets();
      loadPartnerProfiles();
    }
    if (activeTab === 'HISTORY') {
      loadHistoryLogs();
    }
    if (activeTab === 'REMINDERS') {
      loadReminders();
    }
    if (activeTab === 'CONTRACTS') {
      loadContractUrls();
    }
  }, [activeTab]);

  // Capture map dimensions on mount to prevent scale changes
  useEffect(() => {
    if (activeTab === 'MAP' && mapContainerRef.current && !mapDimensions) {
      const rect = mapContainerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMapDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [activeTab, mapDimensions]);

  const loadAccessRecords = async () => {
    setAccessLoading(true);
    const { data } = await protalkDb.from('user_access' as any).select('*').order('created_at', { ascending: false });
    if (data && Array.isArray(data)) {
      const normalized = data.map((rec: any) => ({
        ...rec,
        allowed_pages: parseAllowedPages(rec.allowed_pages),
      }));
      setAccessRecords(normalized);
    } else {
      setAccessRecords([]);
    }
    setAccessLoading(false);
  };

  const loadRolePresets = async () => {
    const { data } = await protalkDb.from('access_roles' as any).select('*').order('is_system', { ascending: false });
    if (data && Array.isArray(data)) {
      const normalized = data.map((role: any) => ({
        ...role,
        allowed_pages: parseAllowedPages(role.allowed_pages),
      }));
      setRolePresets(normalized);
    } else {
      setRolePresets([]);
    }
  };

  const loadPartnerProfiles = async () => {
    const { data } = await protalkDb.from('partner_profile' as any).select('*').order('created_at', { ascending: false });
    if (data) setPartnerProfiles(data as any);
  };

  const loadHistoryLogs = async () => {
    setHistoryLoading(true);
    const { data } = await protalkDb.from('broadcast_logs' as any).select('*').order('created_at', { ascending: false }).limit(500);
    if (data) setHistoryLogs(data as any);
    setHistoryLoading(false);
  };

  const loadReminders = async () => {
    setRemindersLoading(true);
    const { data } = await protalkDb.from('reminders' as any).select('*').order('created_at', { ascending: false });
    if (data) setRemindersList(data as any);
    setRemindersLoading(false);
  };

  const saveReminder = async () => {
    if (!newReminder.status_trigger.trim() || !newReminder.message.trim()) return;
    await protalkDb.from('reminders' as any).insert({
      status_trigger: newReminder.status_trigger,
      message: newReminder.message,
      media_url: newReminder.media_url || null,
      frequency_hours: newReminder.frequency_hours,
      max_sends: newReminder.max_sends,
      is_active: newReminder.is_active,
    });
    setNewReminder({ status_trigger: '', message: '', media_url: '', frequency_hours: 24, max_sends: 3, is_active: true });
    loadReminders();
  };

  const toggleReminderActive = async (id: string, isActive: boolean) => {
    await protalkDb.from('reminders' as any).update({ is_active: !isActive }).eq('id', id);
    loadReminders();
  };

  const deleteReminder = async (id: string) => {
    await protalkDb.from('reminders' as any).delete().eq('id', id);
    loadReminders();
  };

  const resendHistoryItems = async () => {
    if (historySelected.length === 0) return;
    setBroadcastSending(true);
    const itemsToResend = historyLogs.filter((l: any) => historySelected.includes(l.id));
    const crmData = appData.CRM || [];

    // Use historyEditMsg if editing was done, otherwise use original message_text
    const msgText = historyEditMsg !== null ? historyEditMsg : (itemsToResend[0]?.message_text || '');

    // Send each recipient individually so macros (including in inline buttons) are resolved per user
    for (const item of itemsToResend) {
      const userData = crmData.find((u: any) => u.chat_id === item.chat_id) || { chat_id: item.chat_id, fio: item.fio };
      // Replace macros in message AND inline buttons
      const resolvedMsg = replaceMacros(msgText, userData);
      try {
        await protalkDb.functions.invoke('send-broadcast', {
          body: {
            message: resolvedMsg,
            recipients: [{ chat_id: item.chat_id, fio: item.fio, telegram: item.telegram, username: item.username }],
          },
        });
      } catch (err) {
        console.error('Resend error for', item.chat_id, err);
      }
    }
    setHistorySelected([]);
    setHistoryEditMsg(null);
    setHistoryEditOpen(false);
    loadHistoryLogs();
    setBroadcastSending(false);
  };

  // CRM bulk actions
  const executeCrmBulkDelete = async () => {
    if (crmSelected.length === 0 || !window.confirm(`Удалить ${crmSelected.length} записей?`)) return;
    for (const id of crmSelected) {
      await protalkDb.from('crm' as any).delete().eq('id', id);
    }
    setAppData({ ...appData, CRM: (appData.CRM || []).filter((r: any) => !crmSelected.includes(r.id)) });
    setCrmSelected([]);
    setCrmBulkAction(null);
  };

  const executeCrmBulkStatus = async () => {
    if (crmSelected.length === 0 || !crmBulkStatus) return;
    for (const id of crmSelected) {
      await protalkDb.from('crm' as any).update({ status: crmBulkStatus }).eq('id', id);
    }
    setAppData({ ...appData, CRM: (appData.CRM || []).map((r: any) => crmSelected.includes(r.id) ? { ...r, status: crmBulkStatus } : r) });
    setCrmSelected([]);
    setCrmBulkStatus('');
    setCrmBulkAction(null);
  };

  const sendCrmBroadcast = async () => {
    if (!crmBroadcastMsg.trim() && !crmMediaUrl) return;
    setBroadcastSending(true);
    setBroadcastResult(null);
    const crmData = appData.CRM || [];
    // crmSelected contains row.id (UUID), so find by id and extract chat_id
    const recipientsData = crmSelected
      .map((rowId: string) => crmData.find((u: any) => u.id === rowId))
      .filter((u: any) => u && u.chat_id)
      .map((u: any) => ({ chat_id: u.chat_id, fio: u.fio || null, telegram: u.telegram || null, username: u.telegram || null, ...u }));
    const newEntry = { date_sent: new Date().toLocaleString('ru-RU'), message: crmBroadcastMsg.substring(0, 50) + (crmBroadcastMsg.length > 50 ? '...' : ''), chat_ids: `${crmSelected.length} recipients`, status: 'Отправляется...' };
    const saved = await insertRow('BROADCAST', newEntry);
    const { data, error } = await protalkDb.functions.invoke('send-broadcast', {
      body: {
        message: crmBroadcastMsg,
        recipients: recipientsData,
        media_url: crmMediaUrl || null,
        inline_buttons: crmInlineButtons.length > 0 ? crmInlineButtons : null,
        broadcast_id: saved?.id || null,
      }
    });
      if (!error && data) {
        if (data.background) {
          setBroadcastResult({ sent: -1, failed: 0, total: data.total });
        } else {
          setBroadcastResult({ sent: data.sent, failed: data.failed, total: data.total });
        }
      } else {
        setBroadcastResult({ sent: 0, failed: crmSelected.length, total: crmSelected.length });
      }
    setBroadcastSending(false);
  };

  const insertCrmTextTag = (tagStart: string, tagEnd: string) => {
    if (!crmMsgTextAreaRef.current) return;
    const start = crmMsgTextAreaRef.current.selectionStart;
    const end = crmMsgTextAreaRef.current.selectionEnd;
    const text = crmBroadcastMsg;
    setCrmBroadcastMsg(text.substring(0, start) + tagStart + text.substring(start, end) + tagEnd + text.substring(end));
  };
  const insertCrmVariable = (varName: string) => {
    if (!crmMsgTextAreaRef.current) return;
    const start = crmMsgTextAreaRef.current.selectionStart;
    setCrmBroadcastMsg(crmBroadcastMsg.substring(0, start) + `{${varName}}` + crmBroadcastMsg.substring(start));
    setCrmShowVarSelector(false);
  };
  const addCrmInlineButton = () => setCrmInlineButtons([...crmInlineButtons, { text: '', type: 'url', value: '', style: 'default', row: 0 }]);
  const removeCrmInlineButton = (idx: number) => setCrmInlineButtons(crmInlineButtons.filter((_, i) => i !== idx));
  const updateCrmInlineButton = (idx: number, field: string, val: any) => { const nb = [...crmInlineButtons]; (nb[idx] as any)[field] = val; setCrmInlineButtons(nb); };
  const saveCrmTemplate = async () => {
    if (!crmTemplateName.trim()) return;
    const { data } = await protalkDb.from('message_templates' as any).insert({ name: crmTemplateName.trim(), message: crmBroadcastMsg, media_url: crmMediaUrl || null, inline_buttons: JSON.stringify(crmInlineButtons) }).select().single() as { data: any };
    if (data) setTemplates(prev => [data, ...prev]);
    setCrmTemplateName('');
  };
  const loadCrmTemplate = (id: string) => {
    const tpl = templates.find((t: any) => t.id === id);
    if (tpl) {
      setCrmBroadcastMsg(tpl.message || '');
      setCrmMediaUrl(tpl.media_url || '');
      try { setCrmInlineButtons(JSON.parse(tpl.inline_buttons || '[]')); } catch { setCrmInlineButtons([]); }
      setCrmSelectedTemplate(id);
    }
  };

  const saveAccessRecord = async (tgId?: string, pages?: string[], superuser?: boolean, role?: string) => {
    const id = tgId || newAccessTgId.trim();
    if (!id) return;
    setAccessLoading(true);
    const isSu = superuser !== undefined ? superuser : newAccessSuperuser;
    const rawPages = pages || (isSu ? ALL_PAGES : newAccessPages);
    const pgs = parseAllowedPages(rawPages);
    const rl = role || (isSu ? 'Суперюзер' : newAccessRole);
    await protalkDb.from('user_access' as any).upsert({
      telegram_id: id,
      allowed_pages: pgs,
      is_superuser: isSu,
      role_name: rl,
    }, { onConflict: 'telegram_id' }).select().single();
    await loadAccessRecords();
    if (!tgId) {
      setNewAccessTgId('');
      setNewAccessPages([]);
      setNewAccessSuperuser(false);
      setNewAccessRole('Телеграм');
    }
    setAccessLoading(false);
  };

  const deleteAccessRecord = async (id: string) => {
    await protalkDb.from('user_access' as any).delete().eq('id', id);
    await loadAccessRecords();
  };

  const saveRolePreset = async () => {
    if (!newRoleName.trim()) return;
    await protalkDb.from('access_roles' as any).insert({ name: newRoleName.trim(), allowed_pages: parseAllowedPages(newRolePages), is_system: false });
    await loadRolePresets();
    setNewRoleName('');
    setNewRolePages([]);
  };

  const updateRolePreset = async (id: string, pages: string[]) => {
    await protalkDb.from('access_roles' as any).update({ allowed_pages: parseAllowedPages(pages) }).eq('id', id);
    await loadRolePresets();
    setEditingPresetId(null);
  };

  const deleteRolePreset = async (id: string) => {
    await protalkDb.from('access_roles' as any).delete().eq('id', id);
    await loadRolePresets();
  };

  const applyRolePreset = (roleName: string) => {
    const preset = rolePresets.find((r: any) => r.name === roleName);
    if (preset) {
      setNewAccessPages(parseAllowedPages(preset.allowed_pages));
      setNewAccessRole(roleName);
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) return;
    const { data } = await protalkDb.from('message_templates' as any).insert({
      name: templateName.trim(),
      message: broadcastMsg,
      media_url: mediaUrl || null,
      inline_buttons: JSON.stringify(inlineButtons),
    }).select().single() as { data: any };
    if (data) setTemplates(prev => [data, ...prev]);
    setTemplateName('');
  };

  const loadTemplate = (id: string) => {
    const tpl = templates.find((t: any) => t.id === id);
    if (tpl) {
      setBroadcastMsg(tpl.message || '');
      setMediaUrl(tpl.media_url || '');
      try { setInlineButtons(JSON.parse(tpl.inline_buttons || '[]')); } catch { setInlineButtons([]); }
      setSelectedTemplate(id);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { CITIES: initialCities } = await import('@/greenlandConstants');
      const citiesWithIds = initialCities.map((c: any, i: number) => ({ ...c, id: `city-${i}` }));
      await seedInitialData(appData, citiesWithIds);
      const dbCities = await loadCities();
      if (dbCities.length > 0) {
        onUpdateCities(dbCities);
      }
    };
    init();
  }, []);

  const handleTabDragStart = (e: React.DragEvent, tab: string) => { setDraggedTab(tab); e.dataTransfer.effectAllowed = "move"; };
  const handleTabDragOver = (e: React.DragEvent, targetTab: string) => {
    e.preventDefault();
    if (!draggedTab || draggedTab === targetTab) return;
    const newOrder = [...tabOrder];
    const draggedIdx = newOrder.indexOf(draggedTab);
    const targetIdx = newOrder.indexOf(targetTab);
    newOrder.splice(draggedIdx, 1);
    newOrder.splice(targetIdx, 0, draggedTab);
    setTabOrder(newOrder);
  };

  const handleColumnResize = (e: React.MouseEvent, tab: string, colKey: string) => {
    e.preventDefault();
    const startX = e.pageX;
    const currentCols = columnConfigs[tab];
    const colIndex = currentCols.findIndex(c => c.key === colKey);
    const startWidth = currentCols[colIndex].width;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnConfigs(prev => { const newCols = [...prev[tab]]; newCols[colIndex] = { ...newCols[colIndex], width: newWidth }; return { ...prev, [tab]: newCols }; });
    };
    const onMouseUp = () => { document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Persist column configs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('gl_admin_col_configs', JSON.stringify(columnConfigs));
    } catch {}
  }, [columnConfigs]);

  const toggleColumnVisibility = (tab: string, colKey: string) => {
    setColumnConfigs(prev => ({ ...prev, [tab]: prev[tab].map(col => col.key === colKey ? { ...col, visible: !col.visible } : col) }));
  };

  const handleEditRow = (row: any) => { setEditingRow({ ...row }); setIsEditModalOpen(true); };
  const handleSaveRowData = async (rowId: any, updatedData: any) => {
    await saveRow(activeTab, updatedData);
    const currentData = appData[activeTab] || [];
    const rowIndex = currentData.findIndex((r: any) => r.id === rowId);
    if (rowIndex >= 0) {
      const newData = [...currentData];
      newData[rowIndex] = updatedData;
      setAppData({ ...appData, [activeTab]: newData });
    }
  };
  const handleDeleteRowData = async (rowId: any) => {
    await deleteRow(activeTab, rowId);
    const currentData = appData[activeTab] || [];
    const newData = currentData.filter((r: any) => r.id !== rowId);
    setAppData({ ...appData, [activeTab]: newData });
  };

  const filteredRecipients = useMemo(() => {
    const crmData = appData.CRM || [];
    if (!recipientFilter) return crmData;
    const lowFilter = recipientFilter.toLowerCase();
    return crmData.filter((u: any) => (u.fio && u.fio.toLowerCase().includes(lowFilter)) || (u.chat_id && u.chat_id.includes(lowFilter)) || (u.telegram && u.telegram.toLowerCase().includes(lowFilter)));
  }, [appData.CRM, recipientFilter]);

  // Select all filtered recipients, not just displayed ones
  const toggleRecipient = (chatId: string) => { setSelectedRecipients(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]); };
  const toggleAllRecipients = () => {
    const allFilteredIds = filteredRecipients.map((u: any) => u.chat_id);
    const allSelected = allFilteredIds.every((id: string) => selectedRecipients.includes(id));
    if (allSelected) {
      setSelectedRecipients(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedRecipients(prev => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const insertTextTag = (tagStart: string, tagEnd: string) => {
    if (!msgTextAreaRef.current) return;
    const start = msgTextAreaRef.current.selectionStart;
    const end = msgTextAreaRef.current.selectionEnd;
    const text = broadcastMsg;
    setBroadcastMsg(text.substring(0, start) + tagStart + text.substring(start, end) + tagEnd + text.substring(end));
  };
  const insertVariable = (varName: string) => {
    if (!msgTextAreaRef.current) return;
    const start = msgTextAreaRef.current.selectionStart;
    setBroadcastMsg(broadcastMsg.substring(0, start) + `{${varName}}` + broadcastMsg.substring(start));
    setShowVarSelector(false);
  };
  const addInlineButton = () => { setInlineButtons([...inlineButtons, { text: '', type: 'url', value: '', style: 'default', row: 0 }]); };
  const removeInlineButton = (idx: number) => { setInlineButtons(inlineButtons.filter((_, i) => i !== idx)); };
  const updateInlineButton = (idx: number, field: string, val: any) => { const newBtns = [...inlineButtons]; (newBtns[idx] as any)[field] = val; setInlineButtons(newBtns); };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim() && !mediaUrl) return;
    if (selectedRecipients.length === 0) { alert("Выберите хотя бы одного получателя."); return; }
    setBroadcastSending(true);
    setBroadcastResult(null);
    const newEntry = { date_sent: new Date().toLocaleString('ru-RU'), message: broadcastMsg.substring(0, 50) + (broadcastMsg.length > 50 ? '...' : ''), chat_ids: `${selectedRecipients.length} recipients`, status: 'Отправляется...' };
    const saved = await insertRow('BROADCAST', newEntry);
    const crmData = appData.CRM || [];
    const recipientsData = selectedRecipients.map(chatId => {
      const user = crmData.find((u: any) => u.chat_id === chatId);
      return user || { chat_id: chatId };
    });
    try {
      const { data, error } = await protalkDb.functions.invoke('send-broadcast', {
        body: {
          message: broadcastMsg,
          recipients: recipientsData,
          media_url: mediaUrl || null,
          inline_buttons: inlineButtons.length > 0 ? inlineButtons : null,
          broadcast_id: saved?.id || null,
        },
      });
      if (error) throw error;
      if (data.background) {
        setBroadcastResult({ sent: -1, failed: 0, total: data.total });
        setAppData({ ...appData, BROADCAST: [{ ...saved, status: '⏳ Отправляется в фоне...' }, ...(appData.BROADCAST || [])] });
      } else {
        setBroadcastResult({ sent: data.sent, failed: data.failed, total: data.total });
        setAppData({ ...appData, BROADCAST: [{ ...saved, status: `✅ ${data.sent} / ❌ ${data.failed}` }, ...(appData.BROADCAST || [])] });
      }
    } catch (err) {
      console.error('Broadcast error:', err);
      setBroadcastResult({ sent: 0, failed: selectedRecipients.length, total: selectedRecipients.length });
      alert('Ошибка при отправке рассылки: ' + (err instanceof Error ? err.message : 'Неизвестная ошибка'));
    } finally {
      setBroadcastSending(false);
    }
  };

  // Auto-split message if > 4000 chars
  const autoSplitMessage = () => {
    const MAX = 4000;
    if (broadcastMsg.length <= MAX) return;
    const parts: string[] = [];
    let remaining = broadcastMsg;
    while (remaining.length > MAX) {
      // Try to split at last newline before limit
      let splitAt = remaining.lastIndexOf('\n', MAX);
      if (splitAt < MAX * 0.5) splitAt = MAX;
      parts.push(remaining.substring(0, splitAt).trim());
      remaining = remaining.substring(splitAt).trim();
    }
    if (remaining) parts.push(remaining);
    setBroadcastMsg(parts.join('\n✂️✂️✂️\n'));
  };

  const charCount = broadcastMsg.length;
  const maxChars = mediaUrl ? 1024 : 4096;
  const isOverLimit = charCount > maxChars;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) { setKnowledgeFiles(prev => [...prev, ...Array.from(e.target.files!).map(f => f.name)]); } };
  const addKnowledgeEntry = async () => {
    const entry: any = { category: knowCategory, content: knowContent, answer: knowAnswer, files: knowledgeFiles.join(', ') };
    customFields.forEach(f => { if(f.key) entry[f.key] = f.value; });
    const saved = await insertRow('KNOWLEDGE', entry);
    setAppData({ ...appData, KNOWLEDGE: [saved, ...(appData.KNOWLEDGE || [])] });
    setKnowCategory(''); setKnowContent(''); setKnowAnswer(''); setKnowledgeFiles([]); setCustomFields([]);
  };
  const addCustomField = () => { setCustomFields([...customFields, { key: '', value: '' }]); };
  const updateCustomField = (idx: number, field: 'key' | 'value', val: string) => { const newFields = [...customFields]; newFields[idx][field] = val; setCustomFields(newFields); };

  const handleFilterChange = (key: string, value: string) => { setFilters(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [key]: value } })); setCurrentPage(1); };

  const getFilteredData = useMemo(() => {
    if (activeTab === 'MAP' || activeTab === 'RULES' || activeTab === 'HISTORY' || activeTab === 'REMINDERS' || activeTab === 'CONTRACTS' || activeTab === 'AI_SETTINGS' || activeTab === 'AUTOPILOT') return [];
    const tabData = appData[activeTab] || [];
    const currentFilters: Record<string, string> = filters[activeTab] || {};
    let result = tabData.filter((item: any) => {
      // Contract type filter for CONTRACTS_DATA tab
      if (activeTab === 'CONTRACTS_DATA' && contractTypeFilter !== 'all') {
        if (item.contract_type !== contractTypeFilter) return false;
      }
      return Object.entries(currentFilters).every(([key, filterVal]) => { if (!filterVal) return true; return String(item[key] || '').toLowerCase().includes(filterVal.toLowerCase()); });
    });
    if (tableSortCol) {
      result = [...result].sort((a: any, b: any) => {
        const av = a[tableSortCol] ?? '';
        const bv = b[tableSortCol] ?? '';
        const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
        return tableSortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [appData, activeTab, filters, tableSortCol, tableSortDir, contractTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(getFilteredData.length / rowsPerPage));
  const paginatedData = getFilteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const handleMapClick = async (e: React.MouseEvent) => {
    if (draggingCityId || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const newCity: CityNode = { id: `city-${Date.now()}`, name: "New Node", top: `${y.toFixed(1)}%`, left: `${x.toFixed(1)}%` };
    const updated = [...cities, newCity];
    onUpdateCities(updated);
    setEditingCity(newCity);
    await saveCities([newCity]);
  };
  const handleCityDragStart = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setDraggingCityId(id); };
  const handleCityDragMove = (e: React.MouseEvent) => {
    if (!draggingCityId || !mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    onUpdateCities(cities.map(c => c.id === draggingCityId ? { ...c, top: `${y.toFixed(1)}%`, left: `${x.toFixed(1)}%` } : c));
  };
  const handleCityDragEnd = () => {
    if (draggingCityId) {
      const movedCity = cities.find(c => c.id === draggingCityId);
      if (movedCity) saveCities([movedCity]);
    }
    setDraggingCityId(null);
  };
  const handleDeleteCity = async (id: string) => { onUpdateCities(cities.filter(c => c.id !== id)); if (editingCity?.id === id) setEditingCity(null); await deleteCityDb(id); };

  const getPreviewData = useMemo(() => {
    if (!previewRecipientId) return null;
    const crmData = appData.CRM || [];
    return crmData.find((u: any) => u.chat_id === previewRecipientId) || null;
  }, [appData.CRM, previewRecipientId]);

  const previewMessages = useMemo(() => {
    const userData = getPreviewData || {};
    const textWithMacros = replaceMacros(broadcastMsg, userData);
    const parts = splitMessages(textWithMacros);
    return parts.map(part => {
      const { cleanText, buttons } = parseInlineButtons(part);
      return { text: cleanText, buttons };
    });
  }, [broadcastMsg, getPreviewData]);

  // Filtered + sorted history logs
  const getFilteredHistoryLogs = useMemo(() => {
    let result = historyLogs.filter((l: any) => {
      const quickMatch = !historyFilter || l.chat_id?.includes(historyFilter) || l.fio?.toLowerCase().includes(historyFilter.toLowerCase()) || l.message_text?.toLowerCase().includes(historyFilter.toLowerCase());
      if (!quickMatch) return false;
      if (historyFilters.chat_id && !l.chat_id?.includes(historyFilters.chat_id)) return false;
      if (historyFilters.fio && !l.fio?.toLowerCase().includes(historyFilters.fio.toLowerCase())) return false;
      if (historyFilters.status && !l.status?.toLowerCase().includes(historyFilters.status.toLowerCase())) return false;
      return true;
    });
    // Sort
    result = [...result].sort((a, b) => {
      const av = a[historySortCol] ?? '';
      const bv = b[historySortCol] ?? '';
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return historySortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [historyLogs, historyFilter, historyFilters, historySortCol, historySortDir]);

  const toggleHistorySort = (col: string) => {
    if (historySortCol === col) {
      setHistorySortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setHistorySortCol(col);
      setHistorySortDir('asc');
    }
  };

  // Filtered partner profiles for search
  const filteredPartnerProfiles = useMemo(() => {
    if (!partnerSearch) return partnerProfiles;
    const lower = partnerSearch.toLowerCase();
    return partnerProfiles.filter((pp: any) =>
      (pp.telegram_id && pp.telegram_id.includes(lower)) ||
      (pp.first_name && pp.first_name.toLowerCase().includes(lower)) ||
      (pp.last_name && pp.last_name.toLowerCase().includes(lower)) ||
      (pp.username && pp.username.toLowerCase().includes(lower))
    );
  }, [partnerProfiles, partnerSearch]);

  return (
    <div className="w-full bg-transparent border border-white/10 backdrop-blur-md rounded-3xl overflow-hidden flex flex-col relative animate-fadeIn shadow-2xl">
      {/* Tabs - Mobile Dropdown & Desktop Bubble List */}
      <div className="md:hidden p-3.5 liquid-bubble-secondary border-b border-white/10 relative z-20">
        <label className="text-sm text-amber-300 font-semibold mb-2 block">Раздел штаба:</label>
        <select
          value={activeTab}
          onChange={(e) => { setActiveTab(e.target.value as AdminTab); setCurrentPage(1); }}
          className="w-full text-sm bg-zinc-950/70 border border-amber-400/30 rounded-xl p-3 text-white outline-none focus:border-amber-400 backdrop-blur-md"
        >
          {tabOrder.map(tab => (
            <option key={tab} value={tab} className="bg-zinc-900 text-white">
              {TAB_LABELS[tab as AdminTab] || tab}
            </option>
          ))}
        </select>
      </div>

      <div className="hidden md:flex liquid-bubble-secondary border-b border-white/10 p-3 items-center gap-2 flex-wrap relative z-20">
        {tabOrder.map(tab => (
          <div key={tab} draggable onDragStart={(e) => handleTabDragStart(e, tab)} onDragOver={(e) => handleTabDragOver(e, tab)} className="relative group">
            <button onClick={() => { setActiveTab(tab as AdminTab); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${activeTab === tab ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]' : 'liquid-bubble-secondary text-zinc-300 hover:text-white border border-white/10 hover:border-amber-400/30'}`}>
              <GripVertical size={14} className="opacity-0 group-hover:opacity-50 cursor-grab" />
              {TAB_LABELS[tab as AdminTab] || tab}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-hidden flex flex-col p-4 md:p-6 relative">
        <div className="flex flex-wrap justify-between items-center mb-5 gap-4">
          <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent tracking-tight">
              {TAB_LABELS[activeTab] || activeTab}
            </h2>
            {syncing && <Loader2 size={16} className="animate-spin text-amber-400" />}
            <span className="text-sm text-amber-300 liquid-bubble-secondary px-3.5 py-1 rounded-full border border-amber-400/30 font-medium">
              {activeTab === 'MAP' ? cities.length + ' точек' : activeTab === 'RULES' ? accessRecords.length + ' правил' : getFilteredData.length + ' записей'}
            </span>
          </div>
          {activeTab !== 'MAP' && activeTab !== 'RULES' && (
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Database button leading to /system-admin */}
              <button
                type="button"
                onClick={() => navigate('/system-admin')}
                className="liquid-bubble-secondary text-amber-300 hover:text-white px-3.5 py-2 rounded-xl text-sm font-semibold border border-amber-400/35 hover:border-amber-400/60 flex items-center gap-2 transition-all cursor-pointer shadow-md"
                title="Перейти в системное управление базами данных (/system-admin)"
              >
                <Database size={16} className="text-amber-400" />
                <span>База данных</span>
              </button>

              {/* View Switcher for CRM (Kanban vs Table) */}
              {activeTab === 'CRM' && (
                <div className="flex rounded-xl p-0.5 liquid-bubble-secondary border border-white/15">
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('kanban')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${crmViewMode === 'kanban' ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-sm' : 'text-zinc-300 hover:text-white'}`}
                  >
                    <LayoutGrid size={15} />
                    <span>Канбан</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCrmViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${crmViewMode === 'table' ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-sm' : 'text-zinc-300 hover:text-white'}`}
                  >
                    <List size={15} />
                    <span>Таблица</span>
                  </button>
                </div>
              )}
              <div className="relative">
                <button onClick={() => setShowColSettings(!showColSettings)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${showColSettings ? 'liquid-bubble-gold text-amber-950 border-amber-300 font-bold shadow-md' : 'liquid-bubble-secondary text-zinc-300 hover:text-white border-white/15 hover:border-amber-400/40'}`}>
                  <Settings size={18} />
                </button>
                {showColSettings && (
                  <div className="absolute right-0 top-full mt-2 w-64 liquid-bubble-plate border border-amber-400/30 rounded-2xl shadow-2xl z-50 p-4 max-h-72 overflow-y-auto backdrop-blur-xl">
                    <span className="liquid-bubble-glare" />
                    <h4 className="text-sm font-bold text-amber-300 mb-2">Отображаемые колонки</h4>
                    <div className="space-y-1">
                      {(columnConfigs[activeTab] || []).map(col => (
                        <div key={col.key} className="flex items-center gap-2 p-1.5 hover:bg-amber-400/10 rounded-lg cursor-pointer" onClick={() => toggleColumnVisibility(activeTab, col.key)}>
                          {col.visible ? <Check size={15} className="text-amber-400" /> : <X size={15} className="text-zinc-500 opacity-50" />}
                          <span className={`text-sm ${col.visible ? 'text-zinc-100 font-medium' : 'text-zinc-500'}`}>{col.label}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('gl_admin_col_configs');
                        setColumnConfigs(INITIAL_COLS);
                      }}
                      className="w-full mt-3 pt-2 border-t border-white/10 text-xs text-amber-300 hover:text-amber-200 text-left font-medium cursor-pointer"
                    >
                      Сбросить к колонкам BD ProTalk по умолчанию
                    </button>
                  </div>
                )}
              </div>
              <button onClick={() => refreshTab(activeTab)} className="p-2.5 liquid-bubble-secondary border border-white/15 rounded-xl text-zinc-300 hover:text-white hover:border-amber-400/40 transition-colors cursor-pointer">{syncing ? <Loader2 size={18} className="animate-spin text-amber-400" /> : <RefreshCw size={18} />}</button>
            </div>
          )}
        </div>

        {/* RULES - Access Control */}
        {activeTab === 'RULES' && (
          <div className="flex flex-col gap-5 overflow-y-auto custom-scrollbar pb-4">
            {/* System Roles */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-3 -left-3 w-[calc(100%+24px)] h-[60px]" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                  <Shield size={18} className="text-amber-400" /> Системные роли (контекст входа)
                </h3>
                <p className="text-sm text-zinc-300 mt-1">Эти роли автоматически присваиваются в зависимости от способа входа. Настройте доступные страницы для каждой.</p>
              </div>
              <div className="space-y-3 relative z-10">
                {rolePresets.filter((r: any) => r.is_system).map((role: any) => {
                  const rolePages = parseAllowedPages(role.allowed_pages);
                  return (
                    <div key={role.id} className="liquid-bubble-secondary rounded-xl border border-white/10 p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-zinc-100">{role.name}</span>
                        <span className="text-sm text-amber-300 liquid-bubble-secondary border border-amber-400/30 px-2.5 py-0.5 rounded-lg">Системная</span>
                        <span className="text-sm text-zinc-400 ml-auto">{role.description}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_PAGES.map(page => {
                          const isActive = rolePages.includes(page);
                          return (
                            <button key={page} onClick={async () => {
                              const newPages = isActive ? rolePages.filter((p: string) => p !== page) : [...rolePages, page];
                              await protalkDb.from('access_roles' as any).update({ allowed_pages: newPages }).eq('id', role.id);
                              loadRolePresets();
                            }}
                              className={`px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${isActive ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 border-white/10 hover:border-amber-400/30'}`}>
                              {PAGE_LABELS[page] || page}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Role Presets - with editing */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                  <Shield size={18} className="text-amber-400" /> Пресеты ролей (для пользователей)
                </h3>
              </div>
              <div className="space-y-3 relative z-10">
                {rolePresets.filter((r: any) => !r.is_system).map((role: any) => {
                  const rolePages = parseAllowedPages(role.allowed_pages);
                  return (
                    <div key={role.id} className="liquid-bubble-secondary rounded-xl border border-white/10 p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-sm font-bold text-zinc-100">{role.name}</span>
                        <span className="text-sm text-zinc-400">({rolePages.length} стр.)</span>
                        <div className="ml-auto flex gap-2">
                          {editingPresetId === role.id ? (
                            <>
                              <button onClick={() => updateRolePreset(role.id, editingPresetPages)} className="px-3 py-1.5 liquid-bubble-gold text-amber-950 text-sm rounded-xl font-bold border border-amber-300 flex items-center gap-1 cursor-pointer"><Save size={14} /> Сохранить</button>
                              <button onClick={() => setEditingPresetId(null)} className="px-3 py-1.5 liquid-bubble-secondary text-zinc-200 border border-white/15 text-sm rounded-xl cursor-pointer"><X size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => { setEditingPresetId(role.id); setEditingPresetPages(rolePages); }} className="liquid-bubble-secondary text-zinc-300 hover:text-white p-2 rounded-xl border border-white/10 hover:border-amber-400/30 cursor-pointer"><Edit2 size={15} /></button>
                              <button onClick={() => applyRolePreset(role.name)} className="text-sm text-amber-300 hover:text-amber-200 underline cursor-pointer">Применить</button>
                              <button onClick={() => deleteRolePreset(role.id)} className="liquid-bubble-secondary text-zinc-300 hover:text-white p-2 rounded-xl border border-white/10 hover:border-amber-400/30 cursor-pointer"><Trash2 size={15} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      {editingPresetId === role.id ? (
                        <div className="flex flex-wrap gap-2">
                          {ALL_PAGES.map(page => {
                            const isActive = editingPresetPages.includes(page);
                            return (
                              <button key={page} onClick={() => setEditingPresetPages(prev => isActive ? prev.filter(p => p !== page) : [...prev, page])}
                                className={`px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${isActive ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 border-white/10 hover:border-amber-400/30'}`}>
                                {PAGE_LABELS[page] || page}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {rolePages.map((page: string) => (
                            <span key={page} className="px-3 py-1 liquid-bubble-secondary border border-amber-400/30 text-amber-300 rounded-xl text-sm font-semibold">{PAGE_LABELS[page] || page}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 items-end pt-3 border-t border-white/10 relative z-10">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Новая роль</label>
                  <input type="text" placeholder="Название" className="bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white outline-none w-44 backdrop-blur-md" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PAGES.map(page => (
                    <button key={page} onClick={() => setNewRolePages(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page])}
                      className={`px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${newRolePages.includes(page) ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 border-white/10 hover:border-amber-400/30'}`}>
                      {PAGE_LABELS[page] || page}
                    </button>
                  ))}
                </div>
                <button onClick={saveRolePreset} disabled={!newRoleName.trim()} className="px-5 py-2.5 liquid-bubble-gold text-amber-950 border border-amber-300 text-sm rounded-xl font-bold disabled:opacity-50 cursor-pointer shadow-md">Создать</button>
              </div>
            </div>

            {/* Add new access record */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                  <Shield size={18} className="text-amber-400" /> Доступ по ID
                </h3>
              </div>
              <div className="flex flex-wrap gap-4 items-end relative z-10">
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Telegram ID</label>
                  <input type="text" placeholder="169262990" className="bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white outline-none w-44 font-mono backdrop-blur-md" value={newAccessTgId} onChange={(e) => setNewAccessTgId(e.target.value)} />
                </div>
                <div className="flex-shrink-0">
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Роль</label>
                  <select className="bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 text-sm text-white outline-none w-44 backdrop-blur-md" value={newAccessRole} onChange={(e) => { setNewAccessRole(e.target.value); applyRolePreset(e.target.value); }}>
                    {rolePresets.filter((r: any) => !r.is_system).map((r: any) => (<option key={r.id} value={r.name} className="bg-zinc-900 text-white">{r.name}</option>))}
                    <option value="Телеграм" className="bg-zinc-900 text-white">Телеграм (по умолчанию)</option>
                  </select>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_PAGES.map(page => (
                    <button key={page} onClick={() => setNewAccessPages(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page])}
                      className={`px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${newAccessPages.includes(page) ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 border-white/10 hover:border-amber-400/30'}`}>
                      {PAGE_LABELS[page] || page}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                    <input type="checkbox" checked={newAccessSuperuser} onChange={(e) => setNewAccessSuperuser(e.target.checked)} className="rounded accent-amber-400" />
                    <span>Суперюзер</span>
                  </label>
                </div>
                <button onClick={() => saveAccessRecord()} disabled={!newAccessTgId.trim() || accessLoading} className="px-5 py-2.5 liquid-bubble-gold text-amber-950 font-bold rounded-xl border border-amber-300 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer shadow-md text-sm">
                  {accessLoading ? <Loader2 size={16} className="animate-spin text-amber-950" /> : <Save size={16} className="text-amber-950" />} Сохранить
                </button>
              </div>
            </div>

            {/* Partner Profiles with inline editor and search */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2 mb-3">
                  <Users size={18} className="text-amber-400" /> Пользователи из partner_profile
                </h3>
                <div className="relative mb-3">
                  <input type="text" placeholder="Поиск по ID, имени, username..." className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2.5 pl-9 text-sm text-white outline-none backdrop-blur-md" value={partnerSearch} onChange={(e) => setPartnerSearch(e.target.value)} />
                  <Search size={16} className="absolute left-3 top-3 text-zinc-400" />
                </div>
                <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
                  {filteredPartnerProfiles.map((pp: any) => {
                    const userAccess = accessRecords.find((a: any) => a.telegram_id === pp.telegram_id);
                    const isExpanded = expandedUserId === pp.telegram_id;
                    return (
                      <div key={pp.id} className="rounded-xl border border-white/10 liquid-bubble-secondary overflow-hidden">
                        <div className="flex items-center gap-3 p-3 hover:bg-white/[0.04] cursor-pointer" onClick={() => setExpandedUserId(isExpanded ? null : pp.telegram_id)}>
                          <div className="w-9 h-9 rounded-xl liquid-bubble-secondary border border-white/15 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {pp.photo_url ? <img src={pp.photo_url} alt="" className="w-full h-full object-cover" /> : <Users size={18} className="text-zinc-400" />}
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="text-sm font-bold text-zinc-100 truncate">{pp.first_name} {pp.last_name}</div>
                            <div className="text-sm text-zinc-400 truncate">ID: {pp.telegram_id} {pp.username ? `| @${pp.username}` : ''} | {pp.rank}</div>
                          </div>
                          {userAccess ? (
                            <span className="text-sm text-amber-300 font-semibold px-2.5 py-0.5 liquid-bubble-secondary border border-amber-400/30 rounded-lg">{userAccess.role_name || 'Активен'}</span>
                          ) : (
                            <span className="text-sm text-zinc-400">Телеграм</span>
                          )}
                          {isExpanded ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
                        </div>
                        {isExpanded && (
                          <div className="p-4 liquid-bubble-plate border-t border-white/10 space-y-3 animate-fadeIn">
                            <div className="flex flex-wrap gap-3 items-center">
                              <label className="text-sm font-medium text-zinc-300">Роль:</label>
                              <select className="bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none" 
                                value={editingUserAccess?.telegram_id === pp.telegram_id ? editingUserAccess.role_name : (userAccess?.role_name || 'Телеграм')}
                                onChange={(e) => {
                                  const preset = rolePresets.find((r: any) => r.name === e.target.value);
                                  const presetPages = preset ? parseAllowedPages(preset.allowed_pages) : null;
                                  const userPages = userAccess ? parseAllowedPages(userAccess.allowed_pages) : null;
                                  setEditingUserAccess({
                                    telegram_id: pp.telegram_id,
                                    role_name: e.target.value,
                                    allowed_pages: presetPages || userPages || ['home', 'profile'],
                                    is_superuser: e.target.value === 'Суперюзер' || (userAccess?.is_superuser || false),
                                  });
                                }}>
                                {rolePresets.filter((r: any) => !r.is_system).map((r: any) => (<option key={r.id} value={r.name} className="bg-zinc-900 text-white">{r.name}</option>))}
                                <option value="Телеграм" className="bg-zinc-900 text-white">Телеграм</option>
                              </select>
                              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                <input type="checkbox" 
                                  checked={editingUserAccess?.telegram_id === pp.telegram_id ? editingUserAccess.is_superuser : (userAccess?.is_superuser || false)}
                                  onChange={(e) => {
                                    const fallbackPages = editingUserAccess ? parseAllowedPages(editingUserAccess.allowed_pages) : (userAccess ? parseAllowedPages(userAccess.allowed_pages) : ['home', 'profile']);
                                    setEditingUserAccess({
                                      telegram_id: pp.telegram_id,
                                      role_name: editingUserAccess?.role_name || userAccess?.role_name || 'Телеграм',
                                      allowed_pages: e.target.checked ? ALL_PAGES : fallbackPages,
                                      is_superuser: e.target.checked,
                                    });
                                  }} className="rounded accent-amber-400" />
                                <span>Суперюзер</span>
                              </label>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_PAGES.map(page => {
                                const rawPages = editingUserAccess?.telegram_id === pp.telegram_id ? editingUserAccess.allowed_pages : (userAccess?.allowed_pages || ['home', 'profile']);
                                const currentPages = parseAllowedPages(rawPages);
                                const isActive = currentPages.includes(page);
                                return (
                                  <button key={page} onClick={() => {
                                    const newPages = isActive ? currentPages.filter((p: string) => p !== page) : [...currentPages, page];
                                    setEditingUserAccess({
                                      telegram_id: pp.telegram_id,
                                      role_name: editingUserAccess?.role_name || userAccess?.role_name || 'Телеграм',
                                      allowed_pages: newPages,
                                      is_superuser: editingUserAccess?.is_superuser || userAccess?.is_superuser || false,
                                    });
                                  }}
                                    className={`px-3 py-1.5 text-sm rounded-xl border transition-all cursor-pointer ${isActive ? 'liquid-bubble-gold text-amber-950 font-bold border-amber-300 shadow-sm' : 'liquid-bubble-secondary text-zinc-300 border-white/10 hover:border-amber-400/30'}`}>
                                    {PAGE_LABELS[page] || page}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2 pt-2">
                              <button onClick={async () => {
                                const data = editingUserAccess?.telegram_id === pp.telegram_id ? editingUserAccess : {
                                  telegram_id: pp.telegram_id,
                                  role_name: userAccess?.role_name || 'Телеграм',
                                  allowed_pages: parseAllowedPages(userAccess?.allowed_pages || ['home', 'profile']),
                                  is_superuser: userAccess?.is_superuser || false,
                                };
                                await saveAccessRecord(data.telegram_id, parseAllowedPages(data.allowed_pages), data.is_superuser, data.role_name);
                                setEditingUserAccess(null);
                                setExpandedUserId(null);
                              }} className="px-4 py-2 liquid-bubble-gold text-amber-950 text-sm font-bold rounded-xl border border-amber-300 flex items-center gap-1.5 cursor-pointer shadow-md">
                                <Save size={14} /> Сохранить
                              </button>
                              {userAccess && (
                                <button onClick={async () => { await deleteAccessRecord(userAccess.id); setExpandedUserId(null); }} className="px-4 py-2 liquid-bubble-secondary text-zinc-300 hover:text-white border border-white/15 hover:border-amber-400/40 text-sm font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer">
                                  <Trash2 size={14} /> Удалить доступ
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredPartnerProfiles.length === 0 && <div className="text-center text-zinc-500 py-4 text-sm">Нет профилей</div>}
                </div>
              </div>
            </div>

            {/* Access records list */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-3">Текущие правила доступа</h3>
                <div className="space-y-2">
                  {accessRecords.map((rec: any) => {
                    const pages = parseAllowedPages(rec.allowed_pages);
                    return (
                      <div key={rec.id} className="liquid-bubble-secondary rounded-xl border border-white/10 p-3.5 flex items-center gap-3 flex-wrap">
                        <div className="flex-shrink-0">
                          <span className="text-sm font-bold text-zinc-400">ID:</span>
                          <span className="ml-1 text-sm font-mono text-zinc-100">{rec.telegram_id}</span>
                        </div>
                        {rec.role_name && (
                          <span className="px-3 py-1 liquid-bubble-secondary border border-amber-400/30 text-amber-300 rounded-xl text-sm font-semibold">{rec.role_name}</span>
                        )}
                        {rec.is_superuser && (
                          <span className="px-3 py-1 liquid-bubble-gold text-amber-950 border border-amber-300 rounded-xl text-sm font-bold">Суперюзер</span>
                        )}
                        <div className="flex-grow flex flex-wrap gap-1.5">
                          {pages.map((page: string) => (
                            <span key={page} className="px-2.5 py-0.5 liquid-bubble-secondary border border-white/15 text-zinc-200 rounded-lg text-sm font-medium">{PAGE_LABELS[page] || page}</span>
                          ))}
                        </div>
                        <button onClick={() => deleteAccessRecord(rec.id)}
                          className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 text-zinc-400 hover:text-white hover:border-amber-400/40 transition-colors cursor-pointer"><Trash2 size={15} /></button>
                      </div>
                    );
                  })}
                  {accessRecords.length === 0 && !accessLoading && (
                    <div className="text-center text-zinc-500 py-8 text-sm italic">Нет записей о доступе. Добавьте первую запись выше.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BROADCAST */}
        {activeTab === 'BROADCAST' && (
          <div className="flex flex-col lg:flex-row h-full gap-5 overflow-hidden">
            <div className="w-full lg:w-1/3 liquid-bubble-plate border border-amber-400/25 rounded-2xl flex flex-col overflow-hidden relative shadow-lg backdrop-blur-md">
              <span className="liquid-bubble-glare" />
              <div className="p-4 border-b border-white/10 liquid-bubble-secondary relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-3 flex items-center gap-2">
                  <Users size={18} className="text-amber-400" /> Получатели (CRM)
                </h3>
                <div className="relative mb-3">
                  <input type="text" placeholder="Поиск по ID, имени..." className="w-full bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-2 pl-9 text-sm text-white outline-none backdrop-blur-md" value={recipientFilter} onChange={(e) => setRecipientFilter(e.target.value)} />
                  <Search size={16} className="absolute left-3 top-2.5 text-zinc-400" />
                </div>
                <div className="flex justify-between items-center text-sm">
                  <button onClick={toggleAllRecipients} className="text-amber-300 hover:text-amber-200 underline cursor-pointer font-medium">
                    {filteredRecipients.every((u: any) => selectedRecipients.includes(u.chat_id)) ? "Снять все" : "Выбрать все по фильтру"}
                  </button>
                  <span className="text-zinc-400 font-mono text-sm">{selectedRecipients.length} / {(appData.CRM || []).length}</span>
                </div>
              </div>
              <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 relative z-10">
                {filteredRecipients.map((user: any) => (
                  <div key={user.chat_id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedRecipients.includes(user.chat_id) ? 'liquid-bubble-gold text-amber-950 border border-amber-300 shadow-sm' : 'liquid-bubble-secondary hover:bg-white/[0.04] border border-white/10'}`} onClick={() => toggleRecipient(user.chat_id)}>
                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center ${selectedRecipients.includes(user.chat_id) ? 'bg-amber-950 border-amber-950' : 'border-zinc-400'}`}>
                      {selectedRecipients.includes(user.chat_id) && <Check size={14} className="text-amber-300" />}
                    </div>
                    <div className="flex-grow min-w-0">
                      <div className={`text-sm font-bold truncate ${selectedRecipients.includes(user.chat_id) ? 'text-amber-950' : 'text-zinc-100'}`}>{user.fio || 'Без имени'}</div>
                      <div className={`text-sm font-mono truncate ${selectedRecipients.includes(user.chat_id) ? 'text-amber-900' : 'text-zinc-400'}`}>{user.chat_id} | {user.telegram}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-grow flex flex-col liquid-bubble-plate border border-amber-400/25 rounded-2xl overflow-hidden relative shadow-lg backdrop-blur-md">
              <span className="liquid-bubble-glare" />
              <div className="p-3.5 border-b border-white/10 flex justify-between items-center liquid-bubble-secondary relative z-10 flex-wrap gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button onClick={() => insertTextTag('<b>', '</b>')} className="p-2 liquid-bubble-secondary hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white border border-white/10 cursor-pointer" title="Жирный"><Bold size={16} /></button>
                  <button onClick={() => insertTextTag('<i>', '</i>')} className="p-2 liquid-bubble-secondary hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white border border-white/10 cursor-pointer" title="Курсив"><Italic size={16} /></button>
                  <button onClick={() => insertTextTag('<code>', '</code>')} className="p-2 liquid-bubble-secondary hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white border border-white/10 cursor-pointer" title="Код"><Code size={16} /></button>
                  <button onClick={() => insertTextTag('<blockquote>', '</blockquote>')} className="p-2 liquid-bubble-secondary hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white border border-white/10 cursor-pointer" title="Цитата"><Quote size={16} /></button>
                  <div className="h-5 w-px bg-white/15 mx-1"></div>
                  <div className="relative">
                    <button onClick={() => setShowVarSelector(!showVarSelector)} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary text-amber-300 border border-amber-400/30 rounded-xl text-sm font-semibold hover:border-amber-400/60 cursor-pointer"><Variable size={15} /> {`{var}`}</button>
                    {showVarSelector && (
                      <div className="absolute top-full left-0 mt-2 w-56 liquid-bubble-plate border border-amber-400/30 rounded-2xl shadow-2xl z-50 p-3 backdrop-blur-xl">
                        <span className="liquid-bubble-glare" />
                        <div className="text-sm font-bold text-amber-300 mb-2">Выберите переменную:</div>
                        <div className="space-y-1">
                          {columnConfigs['CRM']?.map(col => (<button key={col.key} onClick={() => insertVariable(col.key)} className="block w-full text-left px-2.5 py-1.5 text-sm hover:bg-amber-400/10 rounded-lg text-zinc-200 cursor-pointer font-medium">{col.label} {`{${col.key}}`}</button>))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="h-5 w-px bg-white/15 mx-1"></div>
                  <button onClick={() => insertTextTag('##INLINE:[', ']##')} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary text-zinc-200 border border-white/15 rounded-xl text-sm font-semibold hover:border-amber-400/40 cursor-pointer">Инлайн</button>
                  <button onClick={() => insertTextTag('✂️✂️✂️', '')} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary text-zinc-200 border border-white/15 rounded-xl text-sm font-semibold hover:border-amber-400/40 cursor-pointer">Разделить</button>
                  {isOverLimit && (
                    <button onClick={autoSplitMessage} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-gold text-amber-950 border border-amber-300 rounded-xl text-sm font-bold cursor-pointer animate-pulse">Авто-разделить</button>
                  )}
                </div>
                <span className={`text-sm font-mono ${isOverLimit ? 'text-amber-300 font-bold' : 'text-zinc-400'}`}>{charCount} / {maxChars}</span>
              </div>
              <div className="flex-grow p-4 flex flex-col min-h-0 relative z-10">
                <textarea ref={msgTextAreaRef} className="flex-grow w-full bg-transparent border-none outline-none text-sm text-zinc-100 resize-y custom-scrollbar font-sans min-h-[140px]" placeholder="Введите текст рассылки...&#10;&#10;Макросы: {fio}, {chat_id}, {telegram}&#10;Инлайн: ##INLINE:[кнопка 1;кнопка 2], [кнопка 3]##&#10;Разделитель: ✂️✂️✂️ или ::" value={broadcastMsg} onChange={(e) => setBroadcastMsg(e.target.value)} />
              </div>
              <div className="p-4 border-t border-white/10 space-y-4 liquid-bubble-secondary relative z-10">
                <div className="flex items-center gap-3">
                  <ImageIcon size={18} className="text-zinc-400" />
                  <input type="text" placeholder="Ссылка на медиа" className="flex-grow bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3.5 py-2 text-sm text-white outline-none backdrop-blur-md" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-300">Инлайн-кнопки (конструктор)</span>
                    <button onClick={addInlineButton} className="text-sm text-amber-300 flex items-center gap-1.5 hover:underline cursor-pointer"><PlusCircle size={15} /> Добавить кнопку</button>
                  </div>
                  {inlineButtons.map((btn, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center liquid-bubble-secondary p-3 rounded-xl border border-white/10">
                      <input placeholder="Текст" className="w-full sm:w-1/4 bg-transparent border-b border-white/20 text-sm py-1.5 outline-none text-white focus:border-amber-400" value={btn.text} onChange={(e) => updateInlineButton(idx, 'text', e.target.value)} />
                      <select className="bg-zinc-900 border border-white/15 text-sm py-1.5 px-2 rounded-lg outline-none text-white" value={btn.type} onChange={(e) => updateInlineButton(idx, 'type', e.target.value)}>
                        <option value="url">URL</option><option value="callback">Callback</option><option value="webapp">WebApp</option>
                      </select>
                      <input placeholder={btn.type === 'url' ? 'https://...' : 'data'} className="flex-grow bg-transparent border-b border-white/20 text-sm py-1.5 outline-none text-white focus:border-amber-400" value={btn.value} onChange={(e) => updateInlineButton(idx, 'value', e.target.value)} />
                      <select className="bg-zinc-900 border border-white/15 text-sm py-1.5 px-2 rounded-lg outline-none text-white w-24" value={btn.style} onChange={(e) => updateInlineButton(idx, 'style', e.target.value)}>
                        <option value="default">Обычная</option>
                        <option value="primary">Золотая</option>
                        <option value="success">Светлая</option>
                        <option value="danger">Акцент</option>
                      </select>
                      <input type="number" placeholder="Ряд" className="w-14 bg-zinc-900 border border-white/15 text-sm py-1.5 rounded-lg outline-none text-white text-center" value={btn.row} onChange={(e) => updateInlineButton(idx, 'row', parseInt(e.target.value) || 0)} />
                      <button onClick={() => removeInlineButton(idx)} className="text-zinc-400 hover:text-white p-1 cursor-pointer"><X size={16}/></button>
                    </div>
                  ))}
                </div>

                {/* Preview - always visible */}
                <div className="border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                    <span className="text-sm font-bold text-zinc-300 flex items-center gap-1.5"><Eye size={16} /> Предпросмотр</span>
                    <select className="bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none" value={previewRecipientId} onChange={(e) => setPreviewRecipientId(e.target.value)}>
                      <option value="">Выберите получателя для макросов...</option>
                      {(appData.CRM || []).map((u: any) => (<option key={u.chat_id} value={u.chat_id} className="bg-zinc-900 text-white">{u.fio || u.chat_id}</option>))}
                    </select>
                  </div>
                  <div className="liquid-bubble-secondary rounded-xl p-4 space-y-3 max-h-64 overflow-y-auto custom-scrollbar border border-white/10">
                    {previewMessages.length > 0 ? previewMessages.map((msg, idx) => (
                      <div key={idx} className="liquid-bubble-plate rounded-xl p-3.5 border border-white/10">
                        <div className="text-sm text-zinc-400 mb-1">Сообщение {idx + 1}</div>
                        <div className="text-sm text-zinc-100 whitespace-pre-wrap mb-3">{msg.text || '(медиа без текста)'}</div>
                        {msg.buttons.length > 0 && (
                          <div className="space-y-1.5">
                            {Object.entries(
                              msg.buttons.reduce((acc: Record<number, typeof msg.buttons>, btn) => {
                                if (!acc[btn.row]) acc[btn.row] = [];
                                acc[btn.row].push(btn);
                                return acc;
                              }, {})
                            ).map(([row, btns]) => (
                              <div key={row} className="flex gap-2 flex-wrap">
                                {(btns as EnhancedInlineButton[]).map((btn, i) => (
                                  <span key={i} className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${BUTTON_STYLE_COLORS[btn.style] || 'liquid-bubble-secondary text-zinc-200 border-white/15'}`}>
                                    {btn.text}
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )) : <div className="text-sm text-zinc-400 text-center py-3">Введите текст сообщения</div>}
                  </div>
                </div>

                {/* Template save/load */}
                <div className="flex gap-2.5 items-center flex-wrap">
                  <select className="flex-grow bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none" value={selectedTemplate} onChange={(e) => { if (e.target.value) loadTemplate(e.target.value); }}>
                    <option value="" className="bg-zinc-900 text-white">Шаблоны...</option>
                    {templates.map((tpl: any) => <option key={tpl.id} value={tpl.id} className="bg-zinc-900 text-white">{tpl.name}</option>)}
                  </select>
                  <input type="text" placeholder="Название шаблона" className="w-40 bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                  <button onClick={saveTemplate} disabled={!templateName.trim()} className="px-4 py-2 liquid-bubble-secondary text-zinc-200 border border-white/15 hover:border-amber-400/40 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5"><Save size={15} /> Сохранить</button>
                </div>

                {broadcastResult && (
                  <div className={`p-3.5 rounded-xl text-sm font-semibold border ${broadcastResult.sent === -1 ? 'liquid-bubble-secondary text-amber-300 border-amber-400/30' : broadcastResult.failed === 0 ? 'liquid-bubble-secondary text-zinc-100 border-white/20' : 'liquid-bubble-secondary text-amber-300 border-amber-400/40'}`}>
                    {broadcastResult.sent === -1 ? `Рассылка запущена в фоне (${broadcastResult.total} получателей). Статус — в истории.` : `Отправлено: ${broadcastResult.sent} | Ошибки: ${broadcastResult.failed} | Всего: ${broadcastResult.total}`}
                  </div>
                )}

                <button onClick={sendBroadcast} disabled={selectedRecipients.length === 0 || broadcastSending} className="w-full py-3.5 liquid-bubble-gold text-amber-950 font-bold rounded-2xl border border-amber-300 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-sm">
                  {broadcastSending ? <Loader2 size={18} className="animate-spin text-amber-950" /> : <Send size={18} className="text-amber-950" />} {broadcastSending ? 'Отправка...' : `Отправить рассылку (${selectedRecipients.length})`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="flex flex-col gap-5 overflow-y-auto custom-scrollbar pb-4">
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-3 -left-3 w-[calc(100%+24px)] h-[60px]" />
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3 relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                  <Send size={18} className="text-amber-400" /> История рассылок
                </h3>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <input type="text" placeholder="Быстрый поиск..." className="bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-1.5 text-sm text-white outline-none w-48 backdrop-blur-md" value={historyFilter} onChange={(e) => setHistoryFilter(e.target.value)} />
                  <button onClick={loadHistoryLogs} className="p-2 liquid-bubble-secondary border border-white/15 rounded-xl text-zinc-300 hover:text-white hover:border-amber-400/40 transition-colors cursor-pointer"><RefreshCw size={15} /></button>
                  {historySelected.length > 0 && (
                    <>
                      <button
                        onClick={() => {
                          const firstSelected = historyLogs.find(l => historySelected.includes(l.id));
                          setHistoryEditMsg(firstSelected?.message_text || '');
                          setHistoryEditOpen(true);
                        }}
                        className="px-3.5 py-1.5 liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-200 text-sm rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit2 size={14} /> Редактировать ({historySelected.length})
                      </button>
                      <button onClick={resendHistoryItems} disabled={broadcastSending} className="px-4 py-1.5 liquid-bubble-gold text-amber-950 border border-amber-300 text-sm rounded-xl font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md">
                        {broadcastSending ? <Loader2 size={14} className="animate-spin text-amber-950" /> : <Send size={14} className="text-amber-950" />} Повторить ({historySelected.length})
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Edit message modal */}
              {historyEditOpen && (
                <div className="mb-4 p-4 liquid-bubble-secondary rounded-2xl border border-amber-400/30 space-y-3 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-amber-300">Редактировать сообщение перед повторной отправкой</span>
                    <button onClick={() => { setHistoryEditOpen(false); setHistoryEditMsg(null); }} className="text-zinc-400 hover:text-white cursor-pointer"><X size={16} /></button>
                  </div>
                  <textarea
                    className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white resize-y min-h-[90px] outline-none"
                    value={historyEditMsg || ''}
                    onChange={(e) => setHistoryEditMsg(e.target.value)}
                  />
                  <p className="text-sm text-zinc-400">Макросы {`{fio}`}, {`{chat_id}`} будут заменены для каждого получателя отдельно.</p>
                </div>
              )}

              {/* Column filters */}
              <div className="flex gap-2 mb-3 flex-wrap relative z-10">
                {['chat_id', 'fio', 'status'].map(col => (
                  <input
                    key={col}
                    type="text"
                    placeholder={`Фильтр: ${col}`}
                    className="bg-zinc-950/40 border border-white/15 focus:border-amber-400/60 rounded-xl px-3 py-1.5 text-sm text-zinc-100 outline-none w-36 backdrop-blur-md"
                    value={historyFilters[col] || ''}
                    onChange={(e) => setHistoryFilters(prev => ({ ...prev, [col]: e.target.value }))}
                  />
                ))}
                {Object.values(historyFilters).some(v => v) && (
                  <button onClick={() => setHistoryFilters({})} className="text-sm text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer font-medium"><X size={14} /> Сброс</button>
                )}
              </div>

              {historyLoading ? (
                <div className="text-center py-10 relative z-10"><Loader2 size={26} className="animate-spin text-amber-400 mx-auto" /></div>
              ) : (
                <div className="overflow-auto max-h-[600px] custom-scrollbar rounded-2xl border border-white/10 relative z-10 liquid-bubble-secondary">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-md border-b border-white/10">
                      <tr>
                        <th className="p-3 w-8"><input type="checkbox" onChange={(e) => {
                          const filtered = getFilteredHistoryLogs;
                          setHistorySelected(e.target.checked ? filtered.map((l: any) => l.id) : []);
                        }} className="rounded accent-amber-400" /></th>
                        {([
                          { col: 'created_at', label: 'Дата' },
                          { col: 'chat_id', label: 'Chat ID' },
                          { col: 'fio', label: 'ФИО' },
                          { col: 'message_text', label: 'Сообщение' },
                          { col: 'status', label: 'Статус' },
                          { col: 'error_reason', label: 'Ошибка' },
                          { col: 'send_time_ms', label: 'мс' },
                        ] as {col: string; label: string}[]).map(({ col, label }) => (
                          <th key={col} className="p-3 cursor-pointer hover:bg-white/[0.04] transition-colors select-none" onClick={() => toggleHistorySort(col)}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-zinc-300 whitespace-nowrap">{label}</span>
                              <span className="text-xs text-amber-400">
                                {historySortCol === col ? (historySortDir === 'asc' ? '↑' : '↓') : <span className="opacity-30">↕</span>}
                              </span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {getFilteredHistoryLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-white/[0.03] transition-colors">
                          <td className="p-3"><input type="checkbox" checked={historySelected.includes(log.id)} onChange={() => setHistorySelected(prev => prev.includes(log.id) ? prev.filter(i => i !== log.id) : [...prev, log.id])} className="rounded accent-amber-400" /></td>
                          <td className="p-3 text-sm text-zinc-300 whitespace-nowrap">{new Date(log.created_at).toLocaleString('ru-RU')}</td>
                          <td className="p-3 text-sm font-mono text-zinc-100">{log.chat_id}</td>
                          <td className="p-3 text-sm text-zinc-200 truncate max-w-[140px]">{log.fio || '-'}</td>
                          <td className="p-3 text-sm text-zinc-200 truncate max-w-[220px]" title={log.message_text}>{log.message_text || '-'}</td>
                          <td className="p-3">
                            <span className="px-3 py-1 rounded-xl text-sm font-medium liquid-bubble-secondary border border-white/15 text-zinc-200">{log.status}</span>
                          </td>
                          <td className="p-3 text-sm text-zinc-400 truncate max-w-[160px]" title={log.error_reason}>{log.error_reason || '-'}</td>
                          <td className="p-3 text-sm text-zinc-400 font-mono">{log.send_time_ms || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {getFilteredHistoryLogs.length === 0 && <div className="text-center text-zinc-400 py-10 text-sm">Нет записей</div>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* REMINDERS */}
        {activeTab === 'REMINDERS' && (
          <div className="flex flex-col gap-5 overflow-y-auto custom-scrollbar pb-4">
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <RealisticSmokeBackdrop speed="slow" opacity={0.2} className="-top-3 -left-3 w-[calc(100%+24px)] h-[60px]" />
              <div className="relative z-10">
                <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                  <Shield size={18} className="text-amber-400" /> Конструктор напоминаний
                </h3>
                <p className="text-sm text-zinc-300 mt-1">Создавайте напоминания, привязанные к статусам. Система будет отправлять напоминания пользователям с заданной периодичностью.</p>
              </div>
              <div className="grid lg:grid-cols-2 gap-5 relative z-10">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Статус-триггер</label>
                    <select className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none" value={newReminder.status_trigger} onChange={(e) => setNewReminder(prev => ({ ...prev, status_trigger: e.target.value }))}>
                      <option value="" className="bg-zinc-900 text-white">Выберите статус...</option>
                      <option value="Активен" className="bg-zinc-900 text-white">Активен</option>
                      <option value="В работе" className="bg-zinc-900 text-white">В работе</option>
                      <option value="На проверке" className="bg-zinc-900 text-white">На проверке</option>
                      <option value="Блок" className="bg-zinc-900 text-white">Блок</option>
                      <option value="Оплачено" className="bg-zinc-900 text-white">Оплачено</option>
                      <option value="Новый" className="bg-zinc-900 text-white">Новый</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Частота (часы)</label>
                      <input type="number" className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none" value={newReminder.frequency_hours} onChange={(e) => setNewReminder(prev => ({ ...prev, frequency_hours: parseInt(e.target.value) || 24 }))} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Макс. отправок</label>
                      <input type="number" className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none" value={newReminder.max_sends} onChange={(e) => setNewReminder(prev => ({ ...prev, max_sends: parseInt(e.target.value) || 3 }))} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Медиа URL</label>
                    <input type="text" placeholder="https://..." className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none" value={newReminder.media_url} onChange={(e) => setNewReminder(prev => ({ ...prev, media_url: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Текст напоминания</label>
                    <textarea className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl p-3 text-sm text-white outline-none resize-y min-h-[140px] font-sans" placeholder={'Текст напоминания...\nМакросы: {fio}, {chat_id}, {status}\n##INLINE:[кнопка]##'} value={newReminder.message} onChange={(e) => setNewReminder(prev => ({ ...prev, message: e.target.value }))} />
                  </div>
                  <button onClick={saveReminder} disabled={!newReminder.status_trigger || !newReminder.message.trim()} className="w-full py-3.5 liquid-bubble-gold text-amber-950 font-bold rounded-2xl border border-amber-300 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm shadow-lg">
                    <Save size={16} /> Создать напоминание
                  </button>
                </div>
              </div>
            </div>

            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-4 relative z-10">Активные напоминания</h3>
              {remindersLoading ? (
                <div className="text-center py-6 relative z-10"><Loader2 size={24} className="animate-spin text-amber-400 mx-auto" /></div>
              ) : (
                <div className="space-y-3 relative z-10">
                  {remindersList.map((rem: any) => (
                    <div key={rem.id} className={`p-4 rounded-xl border transition-all ${rem.is_active ? 'liquid-bubble-secondary border-amber-400/30' : 'liquid-bubble-secondary border-white/10 opacity-60'}`}>
                      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-3 py-1 liquid-bubble-secondary border border-amber-400/30 text-amber-300 rounded-xl text-sm font-semibold">{rem.status_trigger}</span>
                          <span className="text-sm text-zinc-400">каждые {rem.frequency_hours}ч | макс. {rem.max_sends} раз</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleReminderActive(rem.id, rem.is_active)} className={`px-3 py-1 text-sm rounded-xl font-semibold border cursor-pointer ${rem.is_active ? 'liquid-bubble-gold text-amber-950 border-amber-300' : 'liquid-bubble-secondary text-zinc-400 border-white/15'}`}>
                            {rem.is_active ? 'Активно' : 'Пауза'}
                          </button>
                          <button onClick={() => deleteReminder(rem.id)} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="text-sm text-zinc-200 whitespace-pre-wrap font-sans bg-zinc-950/40 rounded-xl p-3 border border-white/10 max-h-32 overflow-y-auto">{rem.message}</div>
                    </div>
                  ))}
                  {remindersList.length === 0 && <div className="text-center text-zinc-400 py-6 text-sm">Нет напоминаний</div>}
                </div>
              )}
            </div>

            {/* AppScript Block */}
            <div className="liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 space-y-4 relative overflow-hidden backdrop-blur-md shadow-lg">
              <span className="liquid-bubble-glare" />
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2 relative z-10">
                <Code size={18} className="text-amber-400" /> Google Apps Script — триггер напоминаний
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed relative z-10">
                Этот скрипт запускается по расписанию и вызывает серверную функцию обработки напоминаний, которая автоматически рассылает сообщения по статусам из базы данных.
              </p>
              <div className="relative z-10">
                <pre className="bg-zinc-950/80 border border-white/10 text-amber-200/90 text-sm font-mono rounded-xl p-4 overflow-x-auto leading-relaxed whitespace-pre">
{`// GREENLAND — Триггер напоминаний (Apps Script)
// Установить: Triggers -> Time-driven -> Every hour

var SERVER_URL = 'https://' + ScriptApp.getService().getUrl() || 'http://localhost:3000';
var FUNCTION_NAME = 'send-reminders';

function sendReminders() {
  var url = '/api/v1/functions/' + FUNCTION_NAME;
  var options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify({}),
    muteHttpExceptions: true
  };
  try {
    var response = UrlFetchApp.fetch(url, options);
    Logger.log('Status: ' + response.getResponseCode());
  } catch (e) {
    Logger.log('Error: ' + e.toString());
  }
}`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE */}
        {activeTab === 'KNOWLEDGE' && (
          <AdminKnowledge />
        )}

        {/* AUTOPILOT */}
        {activeTab === 'AUTOPILOT' && (
          <div className="flex-grow overflow-y-auto custom-scrollbar pb-6">
            <MemeAutopilotManager />
          </div>
        )}

        {/* MAP */}
        {activeTab === 'MAP' ? (
          <div className="flex flex-col lg:flex-row h-full gap-5" style={{ minHeight: '500px' }}>
            <div className="flex-grow relative liquid-bubble-plate rounded-2xl overflow-hidden border border-amber-400/25 shadow-lg">
              <span className="liquid-bubble-glare" />
              <div ref={mapContainerRef} className="relative w-full cursor-crosshair" style={{ aspectRatio: '16/9' }} onClick={handleMapClick} onMouseMove={handleCityDragMove} onMouseUp={handleCityDragEnd} onMouseLeave={handleCityDragEnd}>
                <img src={mapImage} alt="Map" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                {cities.map((city) => (
                  <div key={city.id} className={`absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-move transition-transform ${editingCity?.id === city.id ? 'bg-amber-400 scale-125 ring-4 ring-amber-400/40 shadow-lg' : 'bg-white hover:scale-125'}`} style={{ top: city.top, left: city.left }} onMouseDown={(e) => handleCityDragStart(e, city.id)} onClick={(e) => { e.stopPropagation(); setEditingCity(city); }}>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-black/80 text-white px-2 py-0.5 rounded-lg border border-white/10 pointer-events-none">{city.name}</div>
                  </div>
                ))}
              </div>
              <div className="absolute top-4 right-4 liquid-bubble-secondary text-zinc-200 text-sm px-3.5 py-1.5 rounded-xl backdrop-blur-md pointer-events-none border border-white/15">Кликните для добавления точки. Перетащите для сдвига.</div>
            </div>
            <div className="w-full lg:w-80 liquid-bubble-plate border border-amber-400/25 rounded-2xl p-5 overflow-y-auto backdrop-blur-md flex-shrink-0 relative shadow-lg">
              <span className="liquid-bubble-glare" />
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-4 flex items-center gap-2 relative z-10"><Settings size={18} className="text-amber-400" /> Свойства точки</h3>
              {editingCity ? (
                <div className="space-y-4 animate-fadeIn relative z-10">
                  {(['name', 'description', 'link', 'linkText', 'logo'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-sm font-semibold text-zinc-300 mb-1 capitalize">{field}</label>
                      {field === 'description' ? (
                        <textarea value={(editingCity as any)[field] || ''} onChange={(e) => { const updated = { ...editingCity, [field]: e.target.value }; setEditingCity(updated); onUpdateCities(cities.map(c => c.id === updated.id ? updated : c)); saveCities([updated]); }} className="w-full bg-zinc-950/50 border border-white/15 rounded-xl p-2.5 text-sm text-white h-24 focus:border-amber-400 outline-none resize-y" />
                      ) : (
                        <input type="text" value={(editingCity as any)[field] || ''} onChange={(e) => { const updated = { ...editingCity, [field]: e.target.value }; setEditingCity(updated); onUpdateCities(cities.map(c => c.id === updated.id ? updated : c)); saveCities([updated]); }} className="w-full bg-zinc-950/50 border border-white/15 rounded-xl p-2.5 text-sm text-white focus:border-amber-400 outline-none" />
                      )}
                    </div>
                  ))}
                  <div className="pt-3 border-t border-white/10">
                    <button onClick={() => handleDeleteCity(editingCity.id)} className="w-full py-2.5 liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white rounded-xl transition-colors text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"><Trash2 size={16} /> Удалить точку</button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-zinc-400 py-8 text-sm italic relative z-10">Выберите точку на карте для редактирования.</div>
              )}
              <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                <label className="block text-sm font-semibold text-zinc-300 mb-2">Фоновое изображение карты</label>
                <div className="flex gap-2">
                  <input type="text" value={mapImage} onChange={(e) => onUpdateMapImage(e.target.value)} className="flex-grow bg-zinc-950/50 border border-white/15 rounded-xl p-2 text-sm text-white focus:border-amber-400 outline-none" />
                  <button className="p-2.5 liquid-bubble-secondary border border-white/15 rounded-xl hover:border-amber-400 text-zinc-300 hover:text-white transition-colors cursor-pointer"><Upload size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'CONTRACTS' ? (
          /* CONTRACTS — manage Google Apps Script URLs */
          <div className="flex-grow overflow-y-auto p-2">
            <div className="mb-4 p-4 liquid-bubble-plate border border-amber-400/30 rounded-2xl text-sm text-zinc-200 backdrop-blur-md shadow-md relative overflow-hidden">
              <span className="liquid-bubble-glare" />
              <div className="relative z-10 flex items-center gap-2 font-medium">
                <span className="text-amber-400">🔗</span> Здесь хранятся ссылки на Google Apps Script для каждого типа договора. Изменения сохраняются в реальную базу данных и вступают в силу немедленно.
              </div>
            </div>
            {contractUrlsLoading ? (
              <div className="flex items-center justify-center p-8 text-zinc-400 text-sm"><Loader2 size={22} className="animate-spin mr-2 text-amber-400" /> Загрузка...</div>
            ) : (
              <div className="space-y-3">
                {contractUrlsList.map((row: any) => (
                  <ContractUrlRow key={row.id} row={row} onSave={saveContractUrl} />
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'AI_SETTINGS' ? (
          <AdminAISettings />
        ) : activeTab === 'CRM' && crmViewMode === 'kanban' ? (
          <AdminCRMKanban
            crmData={appData.CRM || []}
            onEditRow={handleEditRow}
            onRefresh={() => refreshTab('CRM')}
          />
        ) : (
          /* DATA TABLE */
          activeTab !== 'BROADCAST' && activeTab !== 'KNOWLEDGE' && activeTab !== 'RULES' && activeTab !== 'HISTORY' && activeTab !== 'REMINDERS' && activeTab !== 'AUTOPILOT' && (
          <div className="flex-grow flex flex-col overflow-hidden relative">
            {/* CRM Bulk Actions Bar */}
            {activeTab === 'CRM' && crmSelected.length > 0 && (
              <div className="mb-3 p-3.5 liquid-bubble-plate border border-amber-400/30 rounded-2xl flex flex-wrap items-center gap-3 animate-fadeIn relative shadow-md">
                <span className="liquid-bubble-glare" />
                <span className="text-sm font-bold text-amber-300 relative z-10">✓ Выбрано: {crmSelected.length}</span>
                <button onClick={() => { setCrmBulkAction('status'); }} className="px-3.5 py-1.5 liquid-bubble-secondary border border-white/15 text-zinc-200 hover:border-amber-400/40 rounded-xl text-sm font-semibold transition-colors cursor-pointer relative z-10">Сменить статус</button>
                <button onClick={() => { setBroadcastMsg(''); setSelectedRecipients(crmSelected); setShowBroadcastPopup(true); }} className="px-3.5 py-1.5 liquid-bubble-gold text-amber-950 border border-amber-300 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm relative z-10"><Send size={14} /> Рассылка</button>
                <button onClick={executeCrmBulkDelete} className="px-3.5 py-1.5 liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer relative z-10"><Trash2 size={14} /> Удалить</button>
                <button onClick={() => setCrmSelected([])} className="ml-auto text-sm text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer font-medium relative z-10"><X size={15} /> Снять выбор</button>
                {crmBulkAction === 'status' && (
                  <div className="w-full flex items-center gap-2.5 pt-3 border-t border-white/10 relative z-10">
                    <select className="bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none" value={crmBulkStatus} onChange={(e) => setCrmBulkStatus(e.target.value)}>
                      <option value="" className="bg-zinc-900 text-white">Выберите статус...</option>
                      {['Активен', 'В работе', 'На проверке', 'Блок', 'Оплачено', 'Новый'].map(s => <option key={s} value={s} className="bg-zinc-900 text-white">{s}</option>)}
                    </select>
                    <button onClick={executeCrmBulkStatus} disabled={!crmBulkStatus} className="px-4 py-1.5 liquid-bubble-gold text-amber-950 text-sm font-bold rounded-xl border border-amber-300 disabled:opacity-50 cursor-pointer">Применить</button>
                    <button onClick={() => setCrmBulkAction(null)} className="text-zinc-400 hover:text-white p-1 cursor-pointer"><X size={16} /></button>
                  </div>
                )}
              </div>
            )}
            <div className="flex-grow overflow-auto border border-amber-400/25 rounded-2xl custom-scrollbar liquid-bubble-plate relative shadow-lg">
              <span className="liquid-bubble-glare" />
              <table className="w-full text-left border-collapse relative z-10">
                <thead className="bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-md shadow-sm border-b border-white/10">
                  <tr>
                    {activeTab === 'CRM' && (
                      <th className="p-3.5 w-8 border-b border-white/10">
                        <input type="checkbox" className="rounded accent-amber-400" checked={paginatedData.length > 0 && paginatedData.every((r: any) => crmSelected.includes(r.id))} onChange={(e) => {
                          const ids = paginatedData.map((r: any) => r.id);
                          setCrmSelected(e.target.checked ? [...new Set([...crmSelected, ...ids])] : crmSelected.filter(id => !ids.includes(id)));
                        }} />
                      </th>
                    )}
                    {(columnConfigs[activeTab] || []).filter(c => c.visible).map(col => (
                      <th key={col.key} className="relative group p-0 align-top border-b border-white/10" style={{ width: col.width }}>
                        <div className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <button
                              onClick={() => toggleTableSort(col.key)}
                              className="flex items-center gap-1.5 text-sm font-semibold text-zinc-300 truncate hover:text-amber-300 transition-colors"
                            >
                              {col.label}
                              {tableSortCol === col.key ? (
                                tableSortDir === 'asc' ? <ChevronUp size={14} className="text-amber-400" /> : <ChevronDown size={14} className="text-amber-400" />
                              ) : (
                                <span className="opacity-0 group-hover:opacity-40 text-xs"><ChevronUp size={14} /></span>
                              )}
                            </button>
                          </div>
                          <input type="text" placeholder="Фильтр..." className="w-full bg-zinc-950/50 border border-white/15 focus:border-amber-400/60 rounded-xl px-2.5 py-1 text-sm text-white outline-none placeholder:text-zinc-500 backdrop-blur-md" onChange={(e) => handleFilterChange(col.key, e.target.value)} />
                        </div>
                        <div className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-amber-400 z-20" onMouseDown={(e) => handleColumnResize(e, activeTab, col.key)} />
                      </th>
                    ))}
                    <th className="p-3.5 w-16 border-b border-white/10 text-right bg-zinc-950/80 sticky right-0 z-20"><span className="sr-only">Действия</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedData.map((row: any, idx: number) => (
                    <tr key={idx} className={`hover:bg-white/[0.03] transition-colors group ${activeTab === 'CRM' && crmSelected.includes(row.id) ? 'bg-amber-400/10' : ''}`}>
                      {activeTab === 'CRM' && (
                        <td className="p-3.5 w-8">
                          <input type="checkbox" className="rounded accent-amber-400" checked={crmSelected.includes(row.id)} onChange={() => setCrmSelected(prev => prev.includes(row.id) ? prev.filter(id => id !== row.id) : [...prev, row.id])} />
                        </td>
                      )}
                      {(columnConfigs[activeTab] || []).filter(c => c.visible).map(col => {
                        const cellVal = row[col.key] !== undefined && row[col.key] !== null && row[col.key] !== ''
                          ? row[col.key]
                          : (col.key === 'created_at' ? row.timestamp : (col.key === 'fio' ? row.client_telegram : (col.key === 'client_telegram' ? row.telegram : '')));
                        return (
                          <td key={col.key} className="p-3.5 text-sm text-zinc-200 whitespace-nowrap truncate font-sans" style={{ maxWidth: col.width }}>
                            {col.key === 'status' ? (
                              <span className="px-3 py-1 rounded-xl text-sm font-semibold liquid-bubble-secondary border border-amber-400/30 text-amber-300">{cellVal || '-'}</span>
                            ) : (<span title={String(cellVal || '')}>{cellVal || '-'}</span>)}
                          </td>
                        );
                      })}
                      <td className="p-3.5 text-right sticky right-0 bg-zinc-950/70 backdrop-blur-sm group-hover:bg-zinc-950/90">
                        <button onClick={() => handleEditRow(row)} className="p-2 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 text-zinc-300 hover:text-white transition-colors cursor-pointer"><Edit2 size={15} /></button>
                      </td>
                    </tr>
                  ))}
                  {paginatedData.length === 0 && (<tr><td colSpan={(columnConfigs[activeTab]?.length || 0) + (activeTab === 'CRM' ? 2 : 1)} className="p-12 text-center text-zinc-400 text-sm">Данные не найдены.</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center mt-4 pt-3 border-t border-white/10 gap-4">
              <div className="flex items-center gap-3 text-sm text-zinc-300 flex-wrap">
                <span>Строк на странице:</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-1.5 text-sm text-white outline-none focus:border-amber-400/60">
                  <option value={10} className="bg-zinc-900 text-white">10</option><option value={20} className="bg-zinc-900 text-white">20</option><option value={50} className="bg-zinc-900 text-white">50</option><option value={100} className="bg-zinc-900 text-white">100</option>
                </select>
                <span>Показано {Math.min((currentPage - 1) * rowsPerPage + 1, getFilteredData.length)} - {Math.min(currentPage * rowsPerPage, getFilteredData.length)} из {getFilteredData.length}</span>
              </div>
              <div className="flex gap-2 items-center">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"><ChevronsLeft size={16} /></button>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"><ChevronLeft size={16} /></button>
                <span className="text-sm px-4 py-2 liquid-bubble-gold text-amber-950 rounded-xl border border-amber-300 min-w-[3rem] text-center font-bold">{currentPage}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"><ChevronRight size={16} /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="p-2.5 rounded-xl liquid-bubble-secondary border border-white/15 hover:border-amber-400/40 disabled:opacity-30 text-zinc-300 hover:text-white cursor-pointer"><ChevronsRight size={16} /></button>
              </div>
            </div>
          </div>
          )
        )}
      </div>

      {/* Edit Modal (2x wider max-w-5xl, convenient layout) */}
      <AdminEditModal
        isOpen={isEditModalOpen}
        row={editingRow}
        activeTab={activeTab}
        onClose={() => { setIsEditModalOpen(false); setEditingRow(null); }}
        onSave={handleSaveRowData}
        onDelete={handleDeleteRowData}
      />


      {/* CRM Broadcast Popup — Full Constructor */}
      {showBroadcastPopup && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-stretch justify-center p-4 animate-fadeIn"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowBroadcastPopup(false); setBroadcastResult(null); } }}
        >
          <div className="liquid-bubble-plate border border-amber-400/30 rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden relative">
            <span className="liquid-bubble-glare" />
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex justify-between items-center liquid-bubble-secondary shrink-0 relative z-10">
              <h3 className="font-bold text-base bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent flex items-center gap-2">
                <Send size={18} className="text-amber-400" /> Рассылка по выбранным ({crmSelected.length})
              </h3>
              <button onClick={() => { setShowBroadcastPopup(false); setBroadcastResult(null); }} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 cursor-pointer"><X size={20} /></button>
            </div>

            {/* Body: full-width constructor */}
            <div className="flex-grow flex flex-col overflow-hidden min-h-0 relative z-10">
              {/* Toolbar */}
              <div className="p-3.5 border-b border-white/10 flex flex-wrap gap-1.5 liquid-bubble-secondary shrink-0 items-center">
                <button onClick={() => insertCrmTextTag('<b>', '</b>')} className="p-2 liquid-bubble-secondary border border-white/10 hover:border-amber-400 rounded-xl text-zinc-300 hover:text-white cursor-pointer" title="Жирный"><Bold size={15} /></button>
                <button onClick={() => insertCrmTextTag('<i>', '</i>')} className="p-2 liquid-bubble-secondary border border-white/10 hover:border-amber-400 rounded-xl text-zinc-300 hover:text-white cursor-pointer" title="Курсив"><Italic size={15} /></button>
                <button onClick={() => insertCrmTextTag('<code>', '</code>')} className="p-2 liquid-bubble-secondary border border-white/10 hover:border-amber-400 rounded-xl text-zinc-300 hover:text-white cursor-pointer" title="Код"><Code size={15} /></button>
                <button onClick={() => insertCrmTextTag('<blockquote>', '</blockquote>')} className="p-2 liquid-bubble-secondary border border-white/10 hover:border-amber-400 rounded-xl text-zinc-300 hover:text-white cursor-pointer" title="Цитата"><Quote size={15} /></button>
                <div className="h-5 w-px bg-white/15 mx-1 self-center"></div>
                <div className="relative">
                  <button onClick={() => setCrmShowVarSelector(!crmShowVarSelector)} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary border border-amber-400/30 text-amber-300 rounded-xl text-sm font-semibold cursor-pointer"><Variable size={14} /> {`{var}`}</button>
                  {crmShowVarSelector && (
                    <div className="absolute top-full left-0 mt-2 w-52 liquid-bubble-plate border border-amber-400/30 rounded-2xl shadow-xl z-50 p-3 backdrop-blur-xl">
                      <span className="liquid-bubble-glare" />
                      <div className="text-sm font-bold text-amber-300 mb-2">Выберите переменную:</div>
                      {columnConfigs['CRM']?.map(col => (
                        <button key={col.key} onClick={() => insertCrmVariable(col.key)} className="block w-full text-left px-2.5 py-1.5 text-sm hover:bg-amber-400/10 rounded-lg text-zinc-200 cursor-pointer">{col.label} {`{${col.key}}`}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="h-5 w-px bg-white/15 mx-1 self-center"></div>
                <button onClick={() => insertCrmTextTag('##INLINE:[', ']##')} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary border border-white/15 text-zinc-200 rounded-xl text-sm font-semibold cursor-pointer">Инлайн</button>
                <button onClick={() => insertCrmTextTag('✂️✂️✂️', '')} className="flex items-center gap-1.5 px-3 py-1.5 liquid-bubble-secondary border border-white/15 text-zinc-200 rounded-xl text-sm font-semibold cursor-pointer">Разделить</button>
                <span className={`ml-auto text-sm font-mono self-center ${crmBroadcastMsg.length > (crmMediaUrl ? 1024 : 4096) ? 'text-amber-300 font-bold' : 'text-zinc-400'}`}>{crmBroadcastMsg.length} / {crmMediaUrl ? 1024 : 4096}</span>
              </div>
              {/* Scrollable content */}
              <div className="flex-grow overflow-y-auto custom-scrollbar p-5 flex flex-col gap-4">
                <textarea ref={crmMsgTextAreaRef} className="w-full bg-zinc-950/50 border border-white/15 rounded-2xl outline-none text-sm text-white font-sans p-4 focus:border-amber-400 transition-colors resize-none" placeholder={'Текст...\nМакросы: {fio}, {chat_id}\nИнлайн: ##INLINE:[кнопка]##'} value={crmBroadcastMsg} onChange={(e) => setCrmBroadcastMsg(e.target.value)} style={{ minHeight: '180px' }} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-zinc-300">Медиа URL</label><div className="flex items-center gap-2 bg-zinc-950/40 border border-white/15 rounded-xl px-3 py-2"><ImageIcon size={16} className="text-zinc-400 shrink-0" /><input type="text" placeholder="https://..." className="flex-grow bg-transparent text-sm text-white outline-none" value={crmMediaUrl} onChange={(e) => setCrmMediaUrl(e.target.value)} /></div></div>
                  <div className="space-y-1.5"><label className="text-sm font-semibold text-zinc-300">Шаблоны</label><div className="flex gap-2"><select className="flex-grow bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none" value={crmSelectedTemplate} onChange={(e) => { if (e.target.value) loadCrmTemplate(e.target.value); }}><option value="" className="bg-zinc-900 text-white">Загрузить...</option>{templates.map((tpl: any) => <option key={tpl.id} value={tpl.id} className="bg-zinc-900 text-white">{tpl.name}</option>)}</select><input type="text" placeholder="Название" className="w-32 bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-400" value={crmTemplateName} onChange={(e) => setCrmTemplateName(e.target.value)} /><button onClick={saveCrmTemplate} disabled={!crmTemplateName.trim()} className="px-4 py-2 liquid-bubble-secondary border border-white/15 text-zinc-200 rounded-xl text-sm font-bold disabled:opacity-50 shrink-0 cursor-pointer"><Save size={15} /></button></div></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm font-semibold text-zinc-300">Инлайн-кнопки</span><button onClick={addCrmInlineButton} className="text-sm text-amber-300 flex items-center gap-1.5 hover:underline cursor-pointer"><PlusCircle size={14} /> Добавить кнопку</button></div>
                  {crmInlineButtons.map((btn, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2 items-center liquid-bubble-secondary p-3 rounded-xl border border-white/10">
                      <input placeholder="Текст" className="w-1/4 bg-zinc-950/50 border border-white/15 rounded-xl px-3 py-1.5 text-sm outline-none text-white focus:border-amber-400" value={btn.text} onChange={(e) => updateCrmInlineButton(idx, 'text', e.target.value)} />
                      <select className="bg-zinc-900 border border-white/15 rounded-xl px-3 py-1.5 text-sm outline-none text-white" value={btn.type} onChange={(e) => updateCrmInlineButton(idx, 'type', e.target.value)}><option value="url">URL</option><option value="callback">Callback</option><option value="webapp">WebApp</option></select>
                      <input placeholder="value" className="flex-grow bg-zinc-950/50 border border-white/15 rounded-xl px-3 py-1.5 text-sm outline-none text-white focus:border-amber-400" value={btn.value} onChange={(e) => updateCrmInlineButton(idx, 'value', e.target.value)} />
                      <select className="bg-zinc-900 border border-white/15 rounded-xl px-3 py-1.5 text-sm outline-none text-white" value={btn.style} onChange={(e) => updateCrmInlineButton(idx, 'style', e.target.value)}><option value="default">Обычная</option><option value="primary">Золотая</option><option value="success">Светлая</option><option value="danger">Акцент</option></select>
                      <input type="number" placeholder="Ряд" className="w-16 bg-zinc-900 border border-white/15 rounded-xl px-2 py-1.5 text-sm outline-none text-center text-white" value={btn.row} onChange={(e) => updateCrmInlineButton(idx, 'row', parseInt(e.target.value) || 0)} />
                      <button onClick={() => removeCrmInlineButton(idx)} className="text-zinc-400 hover:text-white p-1.5 cursor-pointer"><X size={16}/></button>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Eye size={16} className="text-zinc-400" /><span className="text-sm font-semibold text-zinc-300">Предпросмотр</span><select className="ml-auto bg-zinc-950/60 border border-white/15 rounded-xl px-3 py-1 text-sm text-white" value={crmPreviewRecipientId} onChange={(e) => setCrmPreviewRecipientId(e.target.value)}><option value="" className="bg-zinc-900 text-white">Без макросов</option>{(appData.CRM || []).map((u: any) => <option key={u.chat_id} value={u.chat_id} className="bg-zinc-900 text-white">{u.fio || u.chat_id}</option>)}</select></div>
                  <div className="liquid-bubble-secondary rounded-2xl p-4 space-y-3 border border-white/10">{(() => { const userData = crmPreviewRecipientId ? (appData.CRM || []).find((u: any) => u.chat_id === crmPreviewRecipientId) || {} : {}; const parts = splitMessages(replaceMacros(crmBroadcastMsg, userData)); return parts.length > 0 && parts[0] ? parts.map((part, idx) => { const { cleanText, buttons } = parseInlineButtons(part); return (<div key={idx} className="liquid-bubble-plate rounded-xl p-3.5 border border-white/10"><div className="text-xs text-zinc-400 mb-1">Сообщение {idx + 1}</div><div className="text-sm text-white whitespace-pre-wrap mb-2.5">{cleanText || '(медиа)'}</div>{buttons.length > 0 && <div className="flex flex-wrap gap-1.5">{buttons.map((btn, i) => <span key={i} className={`px-3 py-1 rounded-xl text-sm font-semibold border ${BUTTON_STYLE_COLORS[btn.style] || 'liquid-bubble-secondary text-zinc-200 border-white/15'}`}>{btn.text}</span>)}</div>}</div>); }) : <div className="text-sm text-zinc-400 text-center py-3">Введите текст для предпросмотра</div>; })()}</div>
                </div>
                {broadcastResult && (<div className={`p-4 rounded-2xl text-sm font-semibold border ${broadcastResult.sent === -1 ? 'liquid-bubble-secondary text-amber-300 border-amber-400/30' : broadcastResult.failed === 0 ? 'liquid-bubble-secondary text-zinc-100 border-white/20' : 'liquid-bubble-secondary text-amber-300 border-amber-400/40'}`}>{broadcastResult.sent === -1 ? `Рассылка запущена в фоне (${broadcastResult.total} получателей). Статус — в истории.` : `Отправлено: ${broadcastResult.sent} | Ошибки: ${broadcastResult.failed} | Всего: ${broadcastResult.total}`}</div>)}
              </div>
            </div>
            <div className="p-5 border-t border-white/10 flex gap-3 justify-end items-center shrink-0 liquid-bubble-secondary relative z-10">
              <span className="text-sm text-zinc-300 mr-auto">{crmSelected.length} получателей выбрано</span>
              <button onClick={() => { setShowBroadcastPopup(false); setBroadcastResult(null); }} className="px-5 py-2.5 liquid-bubble-secondary border border-white/15 text-zinc-300 rounded-xl text-sm font-semibold hover:text-white cursor-pointer">Отмена</button>
              <button onClick={sendCrmBroadcast} disabled={crmSelected.length === 0 || broadcastSending || (!crmBroadcastMsg.trim() && !crmMediaUrl)} className="px-8 py-2.5 liquid-bubble-gold text-amber-950 font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 shadow-lg cursor-pointer text-sm border border-amber-300">
                {broadcastSending ? <Loader2 size={16} className="animate-spin text-amber-950" /> : <Send size={16} className="text-amber-950" />} {broadcastSending ? 'Отправка...' : `Отправить (${crmSelected.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
