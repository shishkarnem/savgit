import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protalkDb } from '@/integrations/protalk/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Send, Loader2, MessageSquare, AlertCircle, Check, CheckCheck, Settings, ChevronDown, FileText, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';
import { type MediaAttachment, ALL_CRM_FIELDS } from '@/pages/CRMMessageConstructor';
import { resolveMacros, processMessageIntoParts, stripHtml } from '@/utils/messageParser';

type Client = any;

interface ClientChatProps {
  clientId: string;
  telegramId: string | null;
  clientName: string | null;
  clientData?: Client | null;
}

interface Message {
  id: string;
  client_id: string;
  telegram_id: string;
  direction: 'outgoing' | 'incoming';
  message: string;
  sent_at: string;
  status: string;
  error_message: string | null;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-400" />;
    case 'sent':
      return <Check className="h-3.5 w-3.5 text-zinc-300" />;
    case 'delivered':
      return <CheckCheck className="h-3.5 w-3.5 text-zinc-300" />;
    case 'read':
      return <CheckCheck className="h-3.5 w-3.5 text-amber-300" />;
    case 'failed':
      return <AlertCircle className="h-3.5 w-3.5 text-zinc-400" />;
    default:
      return null;
  }
};

export const ClientChat: React.FC<ClientChatProps> = ({ clientId, telegramId, clientName, clientData }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [showConstructor, setShowConstructor] = useState(false);
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>([]);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const cleanTgId = telegramId ? String(telegramId).trim() : null;
  const hasValidTg = Boolean(cleanTgId && cleanTgId !== '0' && cleanTgId !== 'null' && cleanTgId !== 'undefined' && cleanTgId !== '—');

  const { data: messages, isLoading } = useQuery({
    queryKey: ['client-messages', clientId],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_client_messages').select('*').eq('client_id', clientId).order('sent_at', { ascending: true });
      if (error) return [];
      return (data || []) as Message[];
    },
    enabled: !!clientId,
  });

  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['chat-templates'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('sav_notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const applyTemplate = (templateId: string) => {
    if (!templates) return;
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const rawFields = template.fields as any;
    const macroText = rawFields?.macroText || template.header_text || '';
    setMessage(prev => (prev ? `${prev}\n\n${macroText}` : macroText));

    if (rawFields?.inlineButtons) setInlineButtons(rawFields.inlineButtons);
    if (rawFields?.disableWebPagePreview !== undefined) setDisableWebPagePreview(rawFields.disableWebPagePreview);

    if (template.media && Array.isArray(template.media) && template.media.length > 0) {
      setMedia(template.media as unknown as MediaAttachment[]);
      setUseMediaCaption(template.use_media_caption || false);
    }

    toast({ title: 'Шаблон применен' });
  };

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast({ title: 'Введите название шаблона' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      const { error } = await protalkDb.from('sav_notification_templates').insert([{
        name: newTemplateName.trim(),
        type: 'chat_message',
        header_text: '',
        footer_text: '',
        fields: { fieldsList: [], inlineButtons, macroText: message, disableWebPagePreview } as any,
        media: (media.length > 0 ? media : []) as any,
        use_media_caption: useMediaCaption,
        is_active: true,
      }]);
      if (error) throw error;
      setNewTemplateName('');
      refetchTemplates();
      toast({ title: 'Шаблон сохранен' });
    } catch {
      toast({ title: 'Ошибка сохранения шаблона' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!hasValidTg) {
        throw new Error('У пользователя нет привязанного Telegram ID. Отправка невозможна.');
      }

      const clientRecord = (clientData as Record<string, unknown> | null) || {};
      const resolvedText = resolveMacros(text, clientRecord);
      const parts = processMessageIntoParts(resolvedText);
      const uiMedia: MediaAttachment[] = media.filter(m => m.url.trim());

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isFirst = i === 0;
        const partMedia: MediaAttachment[] = [];
        if (isFirst && uiMedia.length > 0) partMedia.push(...uiMedia);
        for (const pm of part.media) {
          partMedia.push({ id: crypto.randomUUID(), type: pm.type as any, url: pm.source });
        }
        if (part.albums) {
          for (const album of part.albums) {
            for (const source of album.sources) {
              partMedia.push({ id: crypto.randomUUID(), type: 'photo', url: source });
            }
          }
        }

        const partButtons = [...(isFirst ? inlineButtons : []), ...part.inlineButtons];
        const resolvedButtons = partButtons.length > 0
          ? partButtons.map(row => ({
              ...row,
              buttons: row.buttons.map(btn => ({
                ...btn,
                text: stripHtml(resolveMacros(btn.text, clientRecord)),
                url: btn.url ? resolveMacros(btn.url, clientRecord) : btn.url,
              })),
            }))
          : undefined;

        const hasTextParsedMedia = part.media.length > 0 || (part.albums && part.albums.length > 0);
        const effectiveUseCaption = partMedia.length > 0 && (useMediaCaption || hasTextParsedMedia);

        const response = await protalkDb.functions.invoke('sav-send-telegram-message', {
          body: {
            clientId,
            telegramId: cleanTgId,
            message: part.text,
            media: partMedia.length > 0 ? partMedia : undefined,
            useMediaCaption: effectiveUseCaption,
            inlineButtons: resolvedButtons,
            disableWebPagePreview,
          },
        });

        if (response.error) throw new Error(response.error.message || 'Ошибка отправки в Telegram');
        if (response.data?.error) throw new Error(response.data.error);
        if (i < parts.length - 1) await new Promise(r => setTimeout(r, 450));
      }

      if (parts.length === 0 && uiMedia.length > 0) {
        const response = await protalkDb.functions.invoke('sav-send-telegram-message', {
          body: {
            clientId,
            telegramId: cleanTgId,
            message: '',
            media: uiMedia,
            useMediaCaption: false,
            disableWebPagePreview,
          },
        });
        if (response.error) throw new Error(response.error.message);
        if (response.data?.error) throw new Error(response.data.error);
      }
    },
    onSuccess: () => {
      setMessage('');
      setMedia([]);
      setInlineButtons([]);
      setUseMediaCaption(false);
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
      toast({ title: 'Сообщение отправлено в Telegram' });
    },
    onError: (error: Error) => {
      toast({ title: 'Ошибка отправки', description: error.message });
      queryClient.invalidateQueries({ queryKey: ['client-messages', clientId] });
    },
  });

  const handleSend = () => {
    if (!message.trim() && media.filter(m => m.url.trim()).length === 0) return;
    if (!hasValidTg) {
      toast({ title: 'Ошибка', description: 'У клиента нет привязанного Telegram ID' });
      return;
    }
    sendMutation.mutate(message.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!hasValidTg) {
    return (
      <div className="flex flex-col items-center justify-center h-[350px] text-center p-6 rounded-2xl bg-white/[0.02] border border-white/10">
        <div className="p-4 rounded-full bg-white/5 border border-white/10 text-amber-300 mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h4 className="text-base font-semibold text-zinc-100">Чат недоступен</h4>
        <p className="text-sm text-zinc-400 max-w-sm mt-1">
          У данного клиента не привязан Telegram ID. Сообщения и рассылки могут быть отправлены только пользователям с подключенным Telegram.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[62vh] sm:h-[520px] rounded-2xl bg-zinc-950/40 border border-white/10 p-4 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-400/10 text-amber-300 border border-amber-400/20">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div>
            <span className="text-sm font-semibold text-zinc-100">Чат в Telegram</span>
            <p className="text-xs text-zinc-400">Сообщения доставляются напрямую в Telegram пользователя</p>
          </div>
        </div>
        <Badge variant="outline" className="text-sm bg-white/5 border-white/15 text-amber-300 font-mono">
          ID: {cleanTgId}
        </Badge>
      </div>

      {/* Messages Scroll Area */}
      <ScrollArea className="flex-1 py-3 px-1 custom-scrollbar" ref={scrollRef}>
        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-500">
            <MessageSquare className="h-8 w-8 mb-2 opacity-30 text-amber-400" />
            <p className="text-sm font-medium text-zinc-400">История сообщений пуста</p>
            <p className="text-xs text-zinc-500 mt-1">Напишите сообщение ниже, чтобы отправить его в Telegram</p>
          </div>
        ) : (
          <div className="space-y-3 pr-2">
            {messages.map((msg) => {
              const msgMedia = Array.isArray((msg as any).media) ? ((msg as any).media as Array<{ type: string; url: string }>) : [];
              const msgButtons = Array.isArray((msg as any).inline_buttons) ? ((msg as any).inline_buttons as Array<{ buttons: Array<{ text: string; type?: string; url?: string; style?: string }> }>) : [];
              const isOutgoing = msg.direction === 'outgoing';

              return (
                <div key={msg.id} className={`flex ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg border backdrop-blur-md ${
                      isOutgoing
                        ? 'bg-gradient-to-r from-amber-500/20 to-yellow-600/20 border-amber-400/40 text-zinc-100'
                        : 'bg-white/[0.05] border-white/15 text-zinc-200'
                    }`}
                  >
                    {msgMedia.length > 0 && (
                      <div className={`mb-2.5 ${msgMedia.length > 1 ? 'grid grid-cols-2 gap-1.5' : ''}`}>
                        {msgMedia.map((m: any, i: number) => {
                          const isUrl = m.url?.startsWith('http');
                          if (m.type === 'video' && isUrl) return <video key={i} src={m.url} className="rounded-xl max-w-full max-h-48 object-cover border border-white/15" controls muted preload="metadata" />;
                          if ((m.type === 'photo' || m.type === 'album') && isUrl) return <img key={i} src={m.url} alt="" className="rounded-xl max-w-full max-h-48 object-cover border border-white/15" loading="lazy" />;
                          return (
                            <div key={i} className="flex items-center gap-1.5 text-xs opacity-80 py-1 px-2 rounded-lg bg-black/20">
                              📎 <span className="truncate">{m.url?.slice(0, 35)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {msg.message && msg.message !== '[Медиафайл]' && (
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed [&_a]:text-amber-300 [&_a]:underline" dangerouslySetInnerHTML={{ __html: msg.message }} />
                    )}

                    {msgButtons.length > 0 && (
                      <div className="mt-2.5 space-y-1.5">
                        {msgButtons.map((row: any, ri: number) => (
                          <div key={ri} className="flex gap-1.5 flex-wrap">
                            {(row.buttons || []).map((btn: any, bi: number) => {
                              return btn.type === 'link' && btn.url ? (
                                <a
                                  key={bi}
                                  href={btn.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-1 min-w-[70px] text-center py-1.5 px-2.5 rounded-lg text-xs font-medium border border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-all"
                                >
                                  🔗 {btn.text}
                                </a>
                              ) : (
                                <span
                                  key={bi}
                                  className="flex-1 min-w-[70px] text-center py-1.5 px-2.5 rounded-lg text-xs font-medium border border-white/15 bg-white/5 text-zinc-300"
                                >
                                  {btn.text}
                                </span>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={`flex items-center gap-1.5 mt-2 ${isOutgoing ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-xs text-zinc-400">
                        {format(new Date(msg.sent_at || Date.now()), 'HH:mm', { locale: ru })}
                      </span>
                      {isOutgoing && getStatusIcon(msg.status)}
                    </div>

                    {msg.status === 'failed' && msg.error_message && (
                      <p className="text-xs text-amber-300/90 mt-1.5 font-medium flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        {msg.error_message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Constructor Toggle */}
      <Collapsible open={showConstructor} onOpenChange={setShowConstructor}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-sm h-9 mt-2 px-3 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-400/40 text-zinc-300 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-amber-400" />
              Конструктор шаблонов и кнопок
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform text-zinc-400 ${showConstructor ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-2 space-y-3 max-h-[280px] overflow-y-auto overflow-x-hidden custom-scrollbar">
          {/* Template selector */}
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              Готовый шаблон сообщения
            </Label>
            <Select onValueChange={applyTemplate}>
              <SelectTrigger className="h-9 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl">
                <SelectValue placeholder="Выберите шаблон..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                {templates?.map((t) => (
                  <SelectItem key={t.id} value={t.id} className="text-sm">
                    {t.name}
                  </SelectItem>
                ))}
                {(!templates || templates.length === 0) && (
                  <SelectItem value="__none" disabled className="text-sm text-zinc-500">
                    Нет сохраненных шаблонов
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Save as template */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Название нового шаблона..."
              className="h-9 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={saveAsTemplate}
              disabled={isSavingTemplate || !newTemplateName.trim()}
              className="h-9 px-3 text-sm gap-1.5 rounded-xl border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
            >
              {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Сохранить
            </Button>
          </div>

          <MacroEditor
            value={message}
            onChange={setMessage}
            fields={ALL_CRM_FIELDS}
            media={media}
            onMediaChange={setMedia}
            useMediaCaption={useMediaCaption}
            onUseMediaCaptionChange={setUseMediaCaption}
            compact
            previewClient={clientData || null}
          />

          <div className="flex items-center gap-2.5 pt-1">
            <Switch checked={disableWebPagePreview} onCheckedChange={setDisableWebPagePreview} />
            <Label className="text-xs text-zinc-300">Отключить предпросмотр ссылок</Label>
          </div>

          <InlineButtonBuilder rows={inlineButtons} onChange={setInlineButtons} />
        </CollapsibleContent>
      </Collapsible>

      {/* Input & Send Area */}
      <div className="pt-3 border-t border-white/10 mt-2">
        <div className="flex gap-2.5">
          <textarea
            placeholder="Введите сообщение для отправки в Telegram..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex min-h-[64px] max-h-[140px] w-full rounded-2xl border border-white/15 bg-zinc-900/70 px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:border-amber-400/60 focus-visible:ring-1 focus-visible:ring-amber-400/30 resize-none transition-all"
            disabled={sendMutation.isPending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={(!message.trim() && media.filter((m) => m.url.trim()).length === 0) || sendMutation.isPending}
            className="shrink-0 self-end h-12 w-12 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-bold hover:brightness-110 shadow-lg transition-all"
            title="Отправить в Telegram"
          >
            {sendMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientChat;
