import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCRMAccess } from '@/hooks/useCRMAccess';
import { AccessDenied } from '@/components/crm/AccessDenied';
import { Button } from '@/components/ui/button';
import { protalkDb } from '@/integrations/protalk/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft, Loader2, Save, MessageSquare, User, Briefcase, DollarSign, Calendar, Bot,
  Send, Eye, FileText, MapPin, Settings, Link, Hash, Image, Video, File, Plus, Trash2, ChevronDown
} from 'lucide-react';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';

// Text formatting types
export type TextFormat = 'normal' | 'bold' | 'italic' | 'code' | 'mono' | 'quote' | 'link' | 'inline_button' | 'inline_button_link';

export const FORMAT_LABELS: Record<TextFormat, string> = {
  normal: 'Обычный', bold: 'Жирный', italic: 'Курсив', code: 'Код', mono: 'Моноширинный',
  quote: 'Цитата', link: 'Ссылка', inline_button: 'Кнопка', inline_button_link: 'Кнопка-ссылка',
};

export type MediaType = 'photo' | 'video' | 'document' | 'album';

export interface MediaAttachment {
  id: string;
  type: MediaType;
  url: string;
  caption?: string;
}

export interface MessageField {
  key: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
  format: TextFormat;
  category: 'client' | 'project' | 'finance' | 'expert' | 'dates' | 'protalk' | 'documents' | 'other';
  customLabel?: string;
  buttonText?: string;
  linkText?: string;
}

export const ALL_CRM_FIELDS: MessageField[] = [
  // Client info
  { key: 'full_name', label: 'ФИО клиента', icon: <User className="w-4 h-4" />, enabled: true, format: 'bold', category: 'client' },
  { key: 'telegram_link', label: 'Ссылка на Telegram', icon: <Send className="w-4 h-4" />, enabled: true, format: 'link', category: 'client', linkText: 'Написать в Telegram' },
  { key: 'telegram_id', label: 'Telegram ID', icon: <Hash className="w-4 h-4" />, enabled: true, format: 'code', category: 'client' },
  { key: 'telegram_client', label: 'Telegram клиента', icon: <User className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'city', label: 'Город', icon: <MapPin className="w-4 h-4" />, enabled: true, format: 'normal', category: 'client' },
  { key: 'channel', label: 'Канал', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'status', label: 'Статус', icon: <Settings className="w-4 h-4" />, enabled: false, format: 'bold', category: 'client' },
  { key: 'comment', label: 'Комментарий', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'client' },
  { key: 'send_status', label: 'Статус отправки', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'reminder_time', label: 'Время напоминания', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'client' },
  { key: 'reminder_text', label: 'Текст напоминания', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'client' },
  { key: 'last_message', label: 'Последнее сообщение', icon: <MessageSquare className="w-4 h-4" />, enabled: false, format: 'quote', category: 'client' },
  { key: 'last_100_messages', label: 'История сообщений (100)', icon: <MessageSquare className="w-4 h-4" />, enabled: false, format: 'code', category: 'client' },
  // Project info
  { key: 'project', label: 'Проект', icon: <Briefcase className="w-4 h-4" />, enabled: true, format: 'bold', category: 'project' },
  { key: 'project_code', label: 'Код проекта', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'project' },
  { key: 'product', label: 'Продукт', icon: <Briefcase className="w-4 h-4" />, enabled: true, format: 'normal', category: 'project' },
  { key: 'department', label: 'Отдел', icon: <Briefcase className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'department_text', label: 'Описание отдела', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'project' },
  { key: 'employees_count', label: 'Количество сотрудников', icon: <User className="w-4 h-4" />, enabled: false, format: 'bold', category: 'project' },
  { key: 'functionality', label: 'Функционал', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'quote', category: 'project' },
  { key: 'service', label: 'Услуга', icon: <Briefcase className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'service_type', label: 'Тип услуги', icon: <Settings className="w-4 h-4" />, enabled: false, format: 'normal', category: 'project' },
  { key: 'kp_text', label: 'Текст КП', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'quote', category: 'project' },
  { key: 'software_text', label: 'Текст ПО', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'code', category: 'project' },
  // Finance
  { key: 'sav_cost', label: 'Стоимость SAV', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'finance' },
  { key: 'tariff', label: 'Тариф', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'finance' },
  { key: 'avg_salary', label: 'Средняя ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'region_salary', label: 'Региональная ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'real_salary', label: 'Реальная ЗП', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'ai_employee_cost', label: 'Стоимость ИИ-сотрудника', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'ai_tokens_price', label: 'Стоимость токенов ИИ', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'service_price', label: 'Стоимость услуги', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'software_price', label: 'Стоимость ПО', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  { key: 'payback', label: 'Окупаемость', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'refund_amount', label: 'Сумма возврата', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'normal', category: 'finance' },
  // Expert
  { key: 'selected_expert', label: 'Выбранный эксперт', icon: <Bot className="w-4 h-4" />, enabled: true, format: 'bold', category: 'expert' },
  { key: 'expert_name', label: 'Имя эксперта', icon: <User className="w-4 h-4" />, enabled: false, format: 'normal', category: 'expert' },
  { key: 'expert_pseudonym', label: 'Псевдоним эксперта', icon: <User className="w-4 h-4" />, enabled: false, format: 'italic', category: 'expert' },
  { key: 'expert_telegram_link', label: 'Ссылка на эксперта', icon: <Link className="w-4 h-4" />, enabled: false, format: 'link', category: 'expert', linkText: 'Написать эксперту' },
  { key: 'expert_telegram_username', label: 'Телеграм эксперта', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'expert' },
  { key: 'business_type', label: 'Тип бизнеса', icon: <Briefcase className="w-4 h-4" />, enabled: false, format: 'normal', category: 'other' },
  { key: 'classification_result', label: 'Результат классификации', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'other' },
  { key: 'business_description', label: 'Чем занимается', icon: <FileText className="w-4 h-4" />, enabled: true, format: 'normal', category: 'other' },
  { key: 'first_name', label: 'Имя телеграм', icon: <User className="w-4 h-4" />, enabled: true, format: 'normal', category: 'other' },
  { key: 'last_name', label: 'Фамилия телеграм', icon: <User className="w-4 h-4" />, enabled: true, format: 'normal', category: 'other' },
  { key: 'current_step', label: 'Текущий шаг', icon: <Settings className="w-4 h-4" />, enabled: true, format: 'bold', category: 'other' },
  { key: 'selected_tariff', label: 'Выбранный тариф', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'other' },
  { key: 'tariff_price', label: 'Стоимость тарифа', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'other' },
  { key: 'tariff_description', label: 'Описание тарифа', icon: <FileText className="w-4 h-4" />, enabled: false, format: 'italic', category: 'other' },
  { key: 'payment_model', label: 'Модель оплаты', icon: <DollarSign className="w-4 h-4" />, enabled: true, format: 'bold', category: 'other' },
  { key: 'promo_code', label: 'Промокод', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  { key: 'discounted_price', label: 'Цена со скидкой', icon: <DollarSign className="w-4 h-4" />, enabled: false, format: 'bold', category: 'finance' },
  // Dates
  { key: 'calculator_date', label: 'Дата калькулятора', icon: <Calendar className="w-4 h-4" />, enabled: true, format: 'normal', category: 'dates' },
  { key: 'start_date', label: 'Дата старта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'tariff_date', label: 'Дата тарифа', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'expert_date', label: 'Дата эксперта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'payment_date', label: 'Дата оплаты', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'bold', category: 'dates' },
  { key: 'service_start_date', label: 'Дата начала услуги', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'work_start_date', label: 'Дата начала работ', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'work_end_date', label: 'Дата окончания работ', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'act_date', label: 'Дата акта', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'rejection_date', label: 'Дата отказа', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  { key: 'block_date', label: 'Дата блокировки', icon: <Calendar className="w-4 h-4" />, enabled: false, format: 'normal', category: 'dates' },
  // Bot integration
  { key: 'protalk_name', label: 'Имя бота', icon: <Bot className="w-4 h-4" />, enabled: false, format: 'normal', category: 'protalk' },
  { key: 'protalk_id', label: 'ID бота', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  { key: 'protalk_send_status', label: 'Статус отправки бота', icon: <Send className="w-4 h-4" />, enabled: false, format: 'normal', category: 'protalk' },
  { key: 'bot_token', label: 'Токен бота', icon: <Bot className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  { key: 'script_id', label: 'ID скрипта', icon: <Hash className="w-4 h-4" />, enabled: false, format: 'code', category: 'protalk' },
  // Documents
  { key: 'contract_ooo_url', label: 'Договор ООО', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📄 Договор ООО' },
  { key: 'contract_ip_url', label: 'Договор ИП', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📄 Договор ИП' },
  { key: 'project_plan_url', label: 'План проекта', icon: <Link className="w-4 h-4" />, enabled: false, format: 'inline_button_link', category: 'documents', buttonText: '📋 План проекта' },
];

const CATEGORY_LABELS: Record<string, string> = {
  client: '👤 Информация о клиенте', project: '📂 Информация о проекте', finance: '💰 Финансы',
  expert: '🎓 Эксперт', dates: '📅 Даты', protalk: '🤖 ИИ-ассистент', documents: '📎 Документы', other: '📌 Другое',
};

export const MESSAGE_CONSTRUCTOR_STORAGE_KEY = 'sav-crm-message-constructor';
export const CHAT_CONSTRUCTOR_STORAGE_KEY = 'sav-crm-chat-constructor';
export const TARIFF_CONSTRUCTOR_STORAGE_KEY = 'sav-crm-tariff-constructor';

export interface MessageConstructorSettings {
  fields: MessageField[];
  headerText: string;
  footerText: string;
  media: MediaAttachment[];
  useMediaCaption: boolean;
  inlineButtons?: InlineButtonRow[];
  macroText?: string;
}

async function loadSettingsFromDB(type: string): Promise<{ settings: MessageConstructorSettings | null; templateId: string | null }> {
  try {
    const { data, error } = await protalkDb
      .from('sav_notification_templates')
      .select('*')
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (!error && data) {
      const rawFields = data.fields as any;
      let fieldsList: any[] = [];
      let inlineButtons: InlineButtonRow[] = [];

      if (Array.isArray(rawFields)) {
        fieldsList = rawFields;
      } else if (rawFields && typeof rawFields === 'object') {
        fieldsList = rawFields.fieldsList || [];
        inlineButtons = rawFields.inlineButtons || [];
      }

      return {
        templateId: data.id,
        settings: {
          fields: fieldsList,
          headerText: data.header_text || '',
          footerText: data.footer_text || '',
          media: (data.media as any) || [],
          useMediaCaption: data.use_media_caption || false,
          inlineButtons,
          macroText: (rawFields as any)?.macroText || undefined,
        },
      };
    }
  } catch (e) {
    console.error('Error loading from DB:', e);
  }
  return { settings: null, templateId: null };
}

async function saveSettingsToDB(
  type: string, name: string, settings: MessageConstructorSettings, templateId: string | null
): Promise<string | null> {
  const fieldsData = {
    fieldsList: settings.fields,
    inlineButtons: settings.inlineButtons || [],
    macroText: settings.macroText || '',
  };

  const templateData = {
    name, type,
    header_text: settings.headerText,
    footer_text: settings.footerText,
    fields: fieldsData as any,
    media: settings.media as any,
    use_media_caption: settings.useMediaCaption,
    is_active: true,
  };

  try {
    if (templateId) {
      const { error } = await protalkDb.from('sav_notification_templates').update(templateData).eq('id', templateId);
      if (error) throw error;
      return templateId;
    } else {
      const { data, error } = await protalkDb.from('sav_notification_templates').insert(templateData).select('id').single();
      if (error) throw error;
      return data?.id || null;
    }
  } catch (e) {
    console.error('Error saving to DB:', e);
    return null;
  }
}

export function getMessageConstructorSettings(): MessageConstructorSettings {
  const saved = localStorage.getItem(MESSAGE_CONSTRUCTOR_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
        const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
        return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText, linkText: savedField.linkText } : defaultField;
      });
      return { fields: mergedFields, headerText: parsed.headerText || '🔔 Новый выбор эксперта!', footerText: parsed.footerText || '', media: parsed.media || [], useMediaCaption: parsed.useMediaCaption || false };
    } catch (e) { console.error('Failed to parse message settings:', e); }
  }
  return { fields: ALL_CRM_FIELDS, headerText: '🔔 Новый выбор эксперта!', footerText: '', media: [], useMediaCaption: false };
}

export function getChatConstructorSettings(): MessageConstructorSettings {
  const saved = localStorage.getItem(CHAT_CONSTRUCTOR_STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
        const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
        return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText, linkText: savedField.linkText } : defaultField;
      });
      return { fields: mergedFields, headerText: parsed.headerText || '', footerText: parsed.footerText || '', media: parsed.media || [], useMediaCaption: parsed.useMediaCaption || false };
    } catch (e) { console.error('Failed to parse chat settings:', e); }
  }
  return { fields: ALL_CRM_FIELDS.map(f => ({ ...f, enabled: false })), headerText: '', footerText: '', media: [], useMediaCaption: false };
}

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo: '🖼 Фото', video: '🎬 Видео', document: '📄 Документ', album: '🗂 Альбом',
};

interface MessageConstructorFormProps {
  storageKey: string;
  dbType: string;
  dbName: string;
  title: string;
  description: string;
  defaultHeaderText?: string;
}

export function MessageConstructorForm({
  storageKey, dbType, dbName, title, description, defaultHeaderText = ''
}: MessageConstructorFormProps) {
  const { toast } = useToast();

  const [fields, setFields] = useState<MessageField[]>(ALL_CRM_FIELDS);
  const [headerText, setHeaderText] = useState(defaultHeaderText);
  const [footerText, setFooterText] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>([]);
  const [macroText, setMacroText] = useState('');

  useEffect(() => {
    const load = async () => {
      const { settings, templateId: dbId } = await loadSettingsFromDB(dbType);
      if (settings && settings.fields?.length > 0) {
        const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
          const savedField = settings.fields?.find((f: any) => f.key === defaultField.key);
          return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: (savedField as any).customLabel, buttonText: savedField.buttonText, linkText: (savedField as any).linkText } : defaultField;
        });
        setFields(mergedFields);
        setHeaderText(settings.headerText || defaultHeaderText);
        setFooterText(settings.footerText || '');
        setMedia(settings.media || []);
        setUseMediaCaption(settings.useMediaCaption || false);
        setInlineButtons(settings.inlineButtons || []);
        setMacroText(settings.macroText || '');
        setTemplateId(dbId);
      } else {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const mergedFields = ALL_CRM_FIELDS.map(defaultField => {
              const savedField = parsed.fields?.find((f: MessageField) => f.key === defaultField.key);
              return savedField ? { ...defaultField, enabled: savedField.enabled, format: savedField.format || defaultField.format, customLabel: savedField.customLabel, buttonText: savedField.buttonText, linkText: savedField.linkText } : defaultField;
            });
            setFields(mergedFields);
            setHeaderText(parsed.headerText || defaultHeaderText);
            setFooterText(parsed.footerText || '');
            setMedia(parsed.media || []);
            setUseMediaCaption(parsed.useMediaCaption || false);
            setInlineButtons(parsed.inlineButtons || []);
            setMacroText(parsed.macroText || '');
          } catch (e) { console.error('Failed to parse settings:', e); }
        }
      }
    };
    load();
  }, [storageKey, dbType, defaultHeaderText]);

  const toggleField = (key: string) => setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  const updateFieldFormat = (key: string, format: TextFormat) => setFields(prev => prev.map(f => f.key === key ? { ...f, format } : f));
  const updateFieldButtonText = (key: string, buttonText: string) => setFields(prev => prev.map(f => f.key === key ? { ...f, buttonText } : f));
  const updateFieldLinkText = (key: string, linkText: string) => setFields(prev => prev.map(f => f.key === key ? { ...f, linkText } : f));

  const addMedia = () => setMedia(prev => [...prev, { id: crypto.randomUUID(), type: 'photo', url: '' }]);
  const updateMedia = (id: string, updates: Partial<MediaAttachment>) => setMedia(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  const removeMedia = (id: string) => setMedia(prev => prev.filter(m => m.id !== id));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settings = { fields, headerText, footerText, media, useMediaCaption, inlineButtons, macroText };
      const newId = await saveSettingsToDB(dbType, dbName, settings, templateId);
      if (newId) setTemplateId(newId);
      localStorage.setItem(storageKey, JSON.stringify(settings));
      toast({ title: 'Настройки сохранены', description: 'Конфигурация сохранена в базу данных' });
    } catch (e) {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  const handleReset = () => {
    setFields(ALL_CRM_FIELDS);
    setHeaderText(defaultHeaderText);
    setFooterText('');
    setMedia([]);
    setUseMediaCaption(false);
    setInlineButtons([]);
    setMacroText('');
    localStorage.removeItem(storageKey);
    toast({ title: 'Настройки сброшены' });
  };

  const generateFromFields = () => {
    const enabledFields = fields.filter(f => f.enabled);
    const lines: string[] = [];
    if (headerText) { lines.push(headerText); lines.push(''); }
    for (const field of enabledFields) {
      const macro = `{{${field.key}}}`;
      let formatted: string;
      if (field.format === 'bold') formatted = `<b>${field.label}:</b> ${macro}`;
      else if (field.format === 'italic') formatted = `${field.label}: <i>${macro}</i>`;
      else if (field.format === 'code') formatted = `${field.label}:\n<pre>${macro}</pre>`;
      else if (field.format === 'mono') formatted = `${field.label}: <code>${macro}</code>`;
      else if (field.format === 'quote') formatted = `${field.label}:\n<blockquote>${macro}</blockquote>`;
      else if (field.format === 'link') {
        const linkLabel = field.linkText || field.label;
        formatted = `<a href="${macro}">${linkLabel}</a>`;
      } else formatted = `${field.label}: ${macro}`;
      lines.push(formatted);
    }
    if (footerText) { lines.push(''); lines.push(footerText); }
    setMacroText(lines.join('\n'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleReset}>Сбросить</Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Сохранить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="header">Заголовок сообщения</Label>
            <Input id="header" value={headerText} onChange={(e) => setHeaderText(e.target.value)} placeholder="Заголовок..." />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Медиафайлы</Label>
              <Button variant="outline" size="sm" onClick={addMedia} className="gap-1"><Plus className="w-3 h-3" />Добавить</Button>
            </div>
            {media.length > 0 && (
              <div className="flex items-center gap-2 mb-2">
                <Switch checked={useMediaCaption} onCheckedChange={setUseMediaCaption} id="useCaption" />
                <Label htmlFor="useCaption" className="text-sm">Использовать текст как подпись к медиа</Label>
              </div>
            )}
            <div className="space-y-2">
              {media.map((m) => (
                <div key={m.id} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg border">
                  <Select value={m.type} onValueChange={(value: MediaType) => updateMedia(m.id, { type: value })}>
                    <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(MEDIA_TYPE_LABELS).map(([key, label]) => <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={m.url} onChange={(e) => updateMedia(m.id, { url: e.target.value })} placeholder="URL или file_id" className="flex-1 h-8 text-xs" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeMedia(m.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
            {media.length === 0 && <p className="text-xs text-muted-foreground">Добавьте фото, видео или документы по URL или file_id</p>}
          </div>

          <Separator />

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {(['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'] as const).map(category => {
                const categoryFields = fields.filter(f => f.category === category);
                if (categoryFields.length === 0) return null;
                return (
                  <div key={category} className="space-y-3">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {CATEGORY_LABELS[category]} ({categoryFields.filter(f => f.enabled).length}/{categoryFields.length})
                    </h4>
                    <div className="space-y-2">
                      {categoryFields.map(field => (
                        <div key={field.key} className={`p-3 rounded-lg border transition-colors ${field.enabled ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 border-border'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-muted-foreground">{field.icon}</span>
                              <span className="text-sm font-medium">{field.label}</span>
                            </div>
                            <Switch checked={field.enabled} onCheckedChange={() => toggleField(field.key)} />
                          </div>
                          {field.enabled && (
                            <div className="ml-7 mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground w-16">Формат:</Label>
                                <Select value={field.format} onValueChange={(value: TextFormat) => updateFieldFormat(field.key, value)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                  <SelectContent>{Object.entries(FORMAT_LABELS).map(([key, label]) => <SelectItem key={key} value={key} className="text-xs">{label}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              {(field.format === 'inline_button' || field.format === 'inline_button_link') && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">Текст:</Label>
                                  <Input value={field.buttonText || ''} onChange={(e) => updateFieldButtonText(field.key, e.target.value)} placeholder="Текст кнопки" className="h-8 text-xs" />
                                </div>
                              )}
                              {field.format === 'link' && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground w-16">Текст:</Label>
                                  <Input value={field.linkText || ''} onChange={(e) => updateFieldLinkText(field.key, e.target.value)} placeholder="Текст ссылки" className="h-8 text-xs" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="footer">Подпись сообщения (опционально)</Label>
            <Textarea id="footer" value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Дополнительный текст в конце сообщения..." rows={3} />
          </div>

          <Separator />

          <Button variant="outline" size="sm" onClick={generateFromFields} className="w-full gap-2">
            <Eye className="w-4 h-4" />Сгенерировать макро-текст из включённых полей
          </Button>
        </div>

        {/* Macro Editor Panel */}
        <div className="space-y-4">
          <MacroEditor value={macroText} onChange={setMacroText} fields={fields} />
          <Separator />
          <InlineButtonBuilder rows={inlineButtons} onChange={setInlineButtons} />
          {inlineButtons.length > 0 && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Превью кнопок:</Label>
              {inlineButtons.map((row) => (
                <div key={row.id} className="flex gap-1">
                  {row.buttons.map((btn) => (
                    <div key={btn.id} className={`flex-1 text-center py-1.5 px-2 rounded text-xs truncate ${
                      btn.style === 'success' ? 'bg-green-500/20 border border-green-500/40 text-green-400' :
                      btn.style === 'danger' ? 'bg-red-500/20 border border-red-500/40 text-red-400' :
                      'bg-[#3390ec]/20 border border-[#3390ec]/40 text-[#3390ec]'
                    }`}>
                      {btn.type === 'link' && '🔗 '}{btn.type === 'webapp' && '🌐 '}{btn.text}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CRMMessageConstructor() {
  const navigate = useNavigate();
  const { hasAccess, isLoading: accessLoading } = useCRMAccess();
  const { toast } = useToast();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Load all user-created templates (from chat/bulk)
  useEffect(() => {
    const load = async () => {
      setLoadingTemplates(true);
      const { data } = await protalkDb
        .from('sav_notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      setUserTemplates(data || []);
      setLoadingTemplates(false);
    };
    load();
  }, []);

  const deleteTemplate = async (id: string) => {
    await protalkDb.from('sav_notification_templates').update({ is_active: false }).eq('id', id);
    setUserTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: 'Шаблон удалён' });
  };

  const toggle = (key: string) => setOpenSection(prev => prev === key ? null : key);

  if (accessLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!hasAccess) return <AccessDenied />;

  const SECTIONS = [
    { key: 'expert_selection', icon: <Bot className="w-5 h-5" />, title: 'Уведомления экспертам (свайп вправо)', desc: 'Настройка сообщений в групповой чат при выборе эксперта', storageKey: MESSAGE_CONSTRUCTOR_STORAGE_KEY, dbType: 'expert_selection', dbName: 'Уведомления экспертам', defaultHeader: '🔔 Новый выбор эксперта!' },
    { key: 'tariff_selection', icon: <DollarSign className="w-5 h-5" />, title: 'Уведомления о тарифах', desc: 'Настройка сообщений при просмотре и выборе тарифа ИИ-Продавца', storageKey: TARIFF_CONSTRUCTOR_STORAGE_KEY, dbType: 'tariff_selection', dbName: 'Уведомления о тарифах', defaultHeader: '📋 Новый выбор тарифа!' },
    { key: 'chat_message', icon: <MessageSquare className="w-5 h-5" />, title: 'Сообщения клиентам из CRM', desc: 'Настройка шаблона сообщений из карточки клиента', storageKey: CHAT_CONSTRUCTOR_STORAGE_KEY, dbType: 'chat_message', dbName: 'Сообщения клиентам', defaultHeader: '' },
  ];

  // Separate system templates from user-created ones
  const systemTypes = new Set(['expert_selection', 'tariff_selection', 'chat_message']);
  const savedTemplates = userTemplates.filter(t => !systemTypes.has(t.type));

  return (
    <div className="min-h-screen text-foreground admin-panel">
      <header className="border-b border-border bg-card/30 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/crm')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><MessageSquare className="h-6 w-6 text-primary" /></div>
              <div>
                <h1 className="text-xl font-bold">Конструктор сообщений</h1>
                <p className="text-sm text-muted-foreground">Настройка уведомлений и сообщений клиентам</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-3">
        {/* System templates as collapsible buttons */}
        {SECTIONS.map(s => (
          <Card key={s.key}>
            <div
              className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => toggle(s.key)}
            >
              <div className="p-1.5 rounded-md bg-primary/10">{s.icon}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{s.title}</h3>
                <p className="text-xs text-muted-foreground truncate">{s.desc}</p>
              </div>
              <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === s.key ? 'rotate-180' : ''}`} />
            </div>
            {openSection === s.key && (
              <CardContent className="pt-0 border-t border-border">
                <MessageConstructorForm
                  storageKey={s.storageKey} dbType={s.dbType} dbName={s.dbName}
                  title="Поля сообщения" description="Выберите какие данные отправлять"
                  defaultHeaderText={s.defaultHeader}
                />
              </CardContent>
            )}
          </Card>
        ))}

        {/* User-created templates from chat/bulk */}
        <Card>
          <div
            className="flex items-center gap-3 p-4 cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => toggle('saved')}
          >
            <div className="p-1.5 rounded-md bg-primary/10"><FileText className="w-5 h-5" /></div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Сохранённые шаблоны</h3>
              <p className="text-xs text-muted-foreground">Шаблоны из чата и рассылок ({savedTemplates.length})</p>
            </div>
            <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${openSection === 'saved' ? 'rotate-180' : ''}`} />
          </div>
          {openSection === 'saved' && (
            <CardContent className="pt-0 border-t border-border space-y-3">
              {loadingTemplates && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>}
              {!loadingTemplates && savedTemplates.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">Нет сохранённых шаблонов. Сохраните шаблон из чата или рассылки.</p>
              )}
              {savedTemplates.map(t => {
                const rawFields = t.fields as any;
                const macroText = rawFields?.macroText || t.header_text || '';
                const templateMedia = (t.media as any[]) || [];
                const templateButtons: InlineButtonRow[] = rawFields?.inlineButtons || [];
                const isEditing = editingTemplate?.id === t.id;

                return (
                  <Card key={t.id} className="border-border">
                    <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-accent/20" onClick={() => setEditingTemplate(isEditing ? null : t)}>
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{t.type}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); deleteTemplate(t.id); }}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                    </div>
                    {isEditing && (
                      <CardContent className="pt-0 border-t border-border">
                        <SavedTemplateEditor template={t} onSaved={(updated) => {
                          setUserTemplates(prev => prev.map(ut => ut.id === updated.id ? updated : ut));
                          setEditingTemplate(null);
                        }} />
                      </CardContent>
                    )}
                  </Card>
                );
              })}
            </CardContent>
          )}
        </Card>
      </main>
    </div>
  );
}

function SavedTemplateEditor({ template, onSaved }: { template: any; onSaved: (t: any) => void }) {
  const { toast } = useToast();
  const rawFields = template.fields as any;
  const [macroText, setMacroText] = useState(rawFields?.macroText || template.header_text || '');
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>(rawFields?.inlineButtons || []);
  const [media, setMedia] = useState<MediaAttachment[]>((template.media as any[]) || []);
  const [useMediaCaption, setUseMediaCaption] = useState(template.use_media_caption || false);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(rawFields?.disableWebPagePreview || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const fieldsData = { fieldsList: [], inlineButtons, macroText, disableWebPagePreview };
      const { data, error } = await protalkDb.from('sav_notification_templates').update({
        fields: fieldsData as any,
        media: media as any,
        use_media_caption: useMediaCaption,
      }).eq('id', template.id).select().single();
      if (error) throw error;
      toast({ title: 'Шаблон обновлён' });
      onSaved(data);
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <MacroEditor value={macroText} onChange={setMacroText} fields={ALL_CRM_FIELDS} media={media} onMediaChange={setMedia} useMediaCaption={useMediaCaption} onUseMediaCaptionChange={setUseMediaCaption} />
      <div className="flex items-center gap-2">
        <Switch checked={disableWebPagePreview} onCheckedChange={setDisableWebPagePreview} className="scale-75" />
        <Label className="text-[10px]">Отключить превью ссылок</Label>
      </div>
      <InlineButtonBuilder rows={inlineButtons} onChange={setInlineButtons} />
      <Button onClick={handleSave} disabled={isSaving} className="w-full gap-2" size="sm">
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Сохранить изменения
      </Button>
    </div>
  );
}
