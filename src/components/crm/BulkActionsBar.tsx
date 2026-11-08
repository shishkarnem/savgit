import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Send, UserCheck, RefreshCw, Trash2, X, Loader2, FileText, Save, Eye, AlertCircle, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { protalkDb } from '@/integrations/protalk/client';
import { useQuery } from '@tanstack/react-query';
import MacroEditor from '@/components/crm/MacroEditor';
import InlineButtonBuilder, { type InlineButtonRow } from '@/components/InlineButtonBuilder';
import { CLIENT_STATUSES } from '@/components/crm/CRMFilters';
import type { MediaAttachment } from '@/pages/CRMMessageConstructor';
import { ALL_CRM_FIELDS } from '@/pages/CRMMessageConstructor';
import { resolveMacros, processMessageIntoParts, stripHtml } from '@/utils/messageParser';

type Client = any;

interface BulkActionsBarProps {
  selectedIds: Set<string>;
  clients: Client[];
  onClearSelection: () => void;
  onRefresh: () => void;
  onSelectOnlyTelegram?: (tgIds: string[]) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  clients,
  onClearSelection,
  onRefresh,
  onSelectOnlyTelegram
}) => {
  const { toast } = useToast();
  const [sendOpen, setSendOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [messageText, setMessageText] = useState('');
  const [media, setMedia] = useState<MediaAttachment[]>([]);
  const [useMediaCaption, setUseMediaCaption] = useState(false);
  const [inlineButtons, setInlineButtons] = useState<InlineButtonRow[]>([]);
  const [disableWebPagePreview, setDisableWebPagePreview] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [sendProgress, setSendProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [previewClientIdx, setPreviewClientIdx] = useState<number>(0);
  const [newStatus, setNewStatus] = useState('');
  const [selectedExpert, setSelectedExpert] = useState('');

  const selectedClients = clients.filter((c: any) => selectedIds.has(c.id));
  const count = selectedIds.size;

  // Filter clients with a valid Telegram ID
  const withTelegram = selectedClients.filter((c: any) => {
    const raw = c.telegram_id ? String(c.telegram_id).trim() : '';
    return raw && raw !== '0' && raw !== 'null' && raw !== 'undefined' && raw !== '—' && raw !== 'Гость';
  });

  const withoutTelegramCount = count - withTelegram.length;
  const canSendBroadcast = withTelegram.length > 0;
  const previewClient = withTelegram[previewClientIdx] || withTelegram[0] || null;

  const { data: experts } = useQuery({
    queryKey: ['experts-list'],
    queryFn: async () => {
      const { data, error } = await protalkDb.from('sav_experts').select('*');
      if (error) return [];
      return data || [];
    },
  });

  const { data: templates, refetch: refetchTemplates } = useQuery({
    queryKey: ['bulk-templates'],
    queryFn: async () => {
      const { data, error } = await protalkDb
        .from('sav_notification_templates')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  const handleLoadTemplate = (templateId: string) => {
    const t = templates?.find((t) => t.id === templateId);
    if (!t) return;
    setMessageText(t.header_text || '');
    setMedia((t.media as unknown as MediaAttachment[]) || []);
    setUseMediaCaption(t.use_media_caption || false);
    const rawFields = t.fields as any;
    if (rawFields && !Array.isArray(rawFields) && rawFields.inlineButtons) {
      setInlineButtons(rawFields.inlineButtons);
    } else {
      setInlineButtons([]);
    }
    if (rawFields && !Array.isArray(rawFields) && rawFields.macroText) {
      setMessageText(rawFields.macroText);
    }
    if (rawFields && rawFields.disableWebPagePreview !== undefined) {
      setDisableWebPagePreview(rawFields.disableWebPagePreview);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({ title: 'Введите название шаблона' });
      return;
    }
    setIsSavingTemplate(true);
    try {
      const { error } = await protalkDb.from('sav_notification_templates').insert([{
        name: templateName.trim(),
        type: 'bulk_message',
        header_text: '',
        footer_text: '',
        fields: { fieldsList: [], inlineButtons, macroText: messageText, disableWebPagePreview } as any,
        media: (media.length > 0 ? media : []) as any,
        use_media_caption: useMediaCaption,
        is_active: true,
      }]);
      if (error) throw error;
      setTemplateName('');
      refetchTemplates();
      toast({ title: 'Шаблон сохранен' });
    } catch {
      toast({ title: 'Ошибка сохранения' });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleBulkSend = async () => {
    if (!canSendBroadcast) {
      toast({ title: 'Отправка невозможна', description: 'У выбранных клиентов нет Telegram ID' });
      return;
    }
    if (!messageText.trim() && !media.some((m) => m.url.trim())) {
      toast({ title: 'Ошибка', description: 'Введите текст или добавьте вложение' });
      return;
    }

    setIsProcessing(true);
    const total = withTelegram.length;
    setSendProgress({ sent: 0, failed: 0, total });

    const BATCH_SIZE = 20;
    const BATCH_DELAY = 1200;
    const INTER_MSG_DELAY = 250;
    let sent = 0;
    let failed = 0;

    for (let batchStart = 0; batchStart < withTelegram.length; batchStart += BATCH_SIZE) {
      const batch = withTelegram.slice(batchStart, batchStart + BATCH_SIZE);
      for (const client of batch) {
        try {
          const resolvedText = resolveMacros(messageText, client as any);
          const parts = processMessageIntoParts(resolvedText);
          const uiMedia: MediaAttachment[] = media.filter((m) => m.url.trim());

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
              ? partButtons.map((row) => ({
                  ...row,
                  buttons: row.buttons.map((btn) => ({
                    ...btn,
                    text: stripHtml(resolveMacros(btn.text, client as any)),
                    url: btn.url ? resolveMacros(btn.url, client as any) : btn.url,
                    callbackData: btn.callbackData ? resolveMacros(btn.callbackData, client as any) : btn.callbackData,
                  })),
                }))
              : undefined;

            const hasTextParsedMedia = part.media.length > 0 || (part.albums && part.albums.length > 0);
            const effectiveUseCaption = partMedia.length > 0 && (useMediaCaption || hasTextParsedMedia);

            const resp = await protalkDb.functions.invoke('sav-send-telegram-message', {
              body: {
                clientId: client.id,
                telegramId: client.telegram_id,
                message: part.text,
                media: partMedia.length > 0 ? partMedia : undefined,
                useMediaCaption: effectiveUseCaption,
                inlineButtons: resolvedButtons,
                disableWebPagePreview,
                templateName: templateName.trim() || undefined,
              },
            });

            if (resp.error) throw new Error(resp.error.message);
            if (i < parts.length - 1) await new Promise((r) => setTimeout(r, 400));
          }
          sent++;
        } catch {
          failed++;
        }
        setSendProgress({ sent: sent + failed, failed, total });
        await new Promise((r) => setTimeout(r, INTER_MSG_DELAY));
      }
      if (batchStart + BATCH_SIZE < withTelegram.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY));
      }
    }

    toast({ title: 'Рассылка завершена', description: `Доставлено: ${sent}, ошибок: ${failed}` });
    setIsProcessing(false);
    setSendOpen(false);
    setMessageText('');
    setMedia([]);
    setInlineButtons([]);
    setSendProgress({ sent: 0, failed: 0, total: 0 });
    onRefresh();
  };

  const handleBulkStatusChange = async () => {
    if (!newStatus) return;
    setIsProcessing(true);
    try {
      const { error } = await protalkDb.from('sav_clients').update({ status: newStatus } as any).in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: 'Статусы обновлены', description: `${count} клиентов переведено в «${newStatus}»` });
      onRefresh();
      setStatusOpen(false);
      onClearSelection();
    } catch {
      toast({ title: 'Ошибка обновления статусов' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAssignExpert = async () => {
    if (!selectedExpert) return;
    setIsProcessing(true);
    try {
      const expert = experts?.find((e) => e.pseudonym === selectedExpert || e.id === selectedExpert);
      const { error } = await protalkDb.from('sav_clients').update({
        expert_pseudonym: expert?.pseudonym || selectedExpert,
        expert_name: expert?.pseudonym || selectedExpert,
      } as any).in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: 'Эксперт назначен', description: `${count} клиентов передано куратору` });
      onRefresh();
      setExpertOpen(false);
      onClearSelection();
    } catch {
      toast({ title: 'Ошибка назначения' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const { error } = await protalkDb.from('sav_clients').delete().in('id', Array.from(selectedIds));
      if (error) throw error;
      toast({ title: `${count} записей удалено` });
      onRefresh();
      setDeleteOpen(false);
      onClearSelection();
    } catch {
      toast({ title: 'Ошибка удаления' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (count === 0) return null;
  const progressPercent = sendProgress.total > 0 ? Math.round((sendProgress.sent / sendProgress.total) * 100) : 0;

  return (
    <>
      {/* Floating Bottom Bar in Liquid Glass Apple style */}
      <div className="sticky bottom-4 z-30 flex justify-center px-4 w-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none">
        <div className="pointer-events-auto max-w-4xl w-full bg-zinc-950/85 backdrop-blur-2xl border border-amber-400/40 rounded-2xl shadow-2xl p-3 sm:px-5 sm:py-3.5 flex items-center justify-between gap-3 flex-wrap">
          {/* Left stats info */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-sm font-semibold text-zinc-100">
              Выбрано: <strong className="text-amber-300">{count}</strong>
            </span>

            {canSendBroadcast ? (
              <span className="px-2.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/30 text-xs font-medium text-amber-300">
                С Telegram: {withTelegram.length}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-xl bg-zinc-800/80 border border-white/15 text-xs text-zinc-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Нет Telegram ID (рассылка недоступна)
              </span>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
              onClick={onClearSelection}
              title="Сбросить выделение"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {/* Broadcast Button - Disabled if 0 clients have Telegram ID */}
            <Button
              size="sm"
              variant="outline"
              disabled={!canSendBroadcast}
              className={`gap-1.5 h-9 px-3.5 text-sm rounded-xl transition-all ${
                canSendBroadcast
                  ? 'bg-gradient-to-r from-amber-400/20 to-yellow-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-400/30 hover:border-amber-400 shadow-md font-medium'
                  : 'opacity-40 border-white/10 text-zinc-500 cursor-not-allowed'
              }`}
              onClick={() => setSendOpen(true)}
              title={canSendBroadcast ? 'Отправить рассылку в Telegram' : 'Нельзя отправить рассылку: нет Telegram ID'}
            >
              <Send className="w-4 h-4" />
              Рассылка ({withTelegram.length})
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 px-3 text-sm rounded-xl bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => setStatusOpen(true)}
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
              Статус
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 px-3 text-sm rounded-xl bg-white/5 border-white/15 text-zinc-200 hover:bg-white/10 hover:text-white"
              onClick={() => setExpertOpen(true)}
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              Эксперт
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 px-3 text-sm rounded-xl bg-zinc-900 border-white/15 text-zinc-300 hover:bg-zinc-800 hover:text-white"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Удалить
            </Button>
          </div>
        </div>
      </div>

      {/* Send Messages Dialog */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto overflow-x-hidden w-[95vw] mx-auto p-5 sm:p-6 rounded-3xl bg-zinc-950/90 backdrop-blur-3xl border border-white/15 text-zinc-100 shadow-2xl custom-scrollbar">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold text-white">
              <Send className="w-5 h-5 text-amber-400" />
              Рассылка сообщений в Telegram
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-300 pt-1 leading-relaxed">
              Рассылка будет отправлена{' '}
              <strong className="text-amber-300 font-semibold">{withTelegram.length}</strong> клиентам с привязанным Telegram ID.
              {withoutTelegramCount > 0 && (
                <span className="block mt-1 text-xs text-zinc-400">
                  {withoutTelegramCount} клиентов без Telegram ID пропущены (рассылка на них невозможна).
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Template selector */}
          {templates && templates.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Готовый шаблон рассылки
              </Label>
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger className="h-9 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl">
                  <SelectValue placeholder="Загрузить шаблон..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-sm">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Save as template */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Название шаблона для сохранения..."
              className="h-9 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveTemplate}
              disabled={isSavingTemplate || !templateName.trim()}
              className="h-9 px-3 text-sm gap-1.5 rounded-xl border-amber-400/40 text-amber-300 hover:bg-amber-400/10"
            >
              {isSavingTemplate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Сохранить
            </Button>
          </div>

          <MacroEditor
            value={messageText}
            onChange={setMessageText}
            fields={ALL_CRM_FIELDS}
            media={media}
            onMediaChange={setMedia}
            useMediaCaption={useMediaCaption}
            onUseMediaCaptionChange={setUseMediaCaption}
            previewClient={previewClient}
          />

          <div className="flex items-center gap-2.5 pt-1">
            <Switch checked={disableWebPagePreview} onCheckedChange={setDisableWebPagePreview} />
            <Label className="text-xs text-zinc-300">Отключить предпросмотр ссылок</Label>
          </div>

          {withTelegram.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-zinc-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Предпросмотр подстановки макросов для клиента
              </Label>
              <Select value={String(previewClientIdx)} onValueChange={(v) => setPreviewClientIdx(Number(v))}>
                <SelectTrigger className="h-9 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl">
                  <SelectValue placeholder="Предпросмотр для клиента..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                  {withTelegram.slice(0, 25).map((c: any, i: number) => (
                    <SelectItem key={c.id} value={String(i)} className="text-sm">
                      {c.full_name || c.telegram_client || c.telegram_id || `Клиент ${i + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <InlineButtonBuilder rows={inlineButtons} onChange={setInlineButtons} />

          {isProcessing && sendProgress.total > 0 && (
            <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <Progress value={progressPercent} className="h-2.5 bg-zinc-800" />
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Отправлено: {sendProgress.sent - sendProgress.failed} / {sendProgress.total}</span>
                {sendProgress.failed > 0 && <span>Ошибок: {sendProgress.failed}</span>}
                <span className="font-semibold text-amber-300">{progressPercent}%</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setSendOpen(false)}
              disabled={isProcessing}
              className="rounded-xl border-white/15 text-zinc-300 hover:text-white"
            >
              Отмена
            </Button>
            <Button
              onClick={handleBulkSend}
              disabled={isProcessing || !canSendBroadcast}
              className="gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-bold hover:brightness-110 shadow-lg"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Отправить {withTelegram.length} клиентам
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="rounded-3xl bg-zinc-950/90 backdrop-blur-3xl border border-white/15 text-zinc-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              Сменить статус ({count} клиентов)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="h-10 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl">
                <SelectValue placeholder="Выберите новый статус" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                {CLIENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setStatusOpen(false)} className="rounded-xl border-white/15 text-zinc-300">
              Отмена
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={isProcessing || !newStatus}
              className="gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-bold hover:brightness-110"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Expert Dialog */}
      <Dialog open={expertOpen} onOpenChange={setExpertOpen}>
        <DialogContent className="rounded-3xl bg-zinc-950/90 backdrop-blur-3xl border border-white/15 text-zinc-100 p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">
              Назначить эксперта ({count} клиентов)
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Select value={selectedExpert} onValueChange={setSelectedExpert}>
              <SelectTrigger className="h-10 text-sm bg-zinc-900 border-white/15 text-zinc-100 rounded-xl">
                <SelectValue placeholder="Выберите эксперта" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-950 border-white/15 text-zinc-100">
                {experts?.map((e) => (
                  <SelectItem key={e.id} value={e.pseudonym || e.id} className="text-sm">
                    {e.pseudonym || e.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setExpertOpen(false)} className="rounded-xl border-white/15 text-zinc-300">
              Отмена
            </Button>
            <Button
              onClick={handleBulkAssignExpert}
              disabled={isProcessing || !selectedExpert}
              className="gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-bold hover:brightness-110"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl bg-zinc-950/90 backdrop-blur-3xl border border-white/15 text-zinc-100 p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-white">
              Удалить {count} клиентов?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-300">
              Это действие нельзя отменить. Все данные выбранных клиентов будут удалены из базы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl border-white/15 text-zinc-300">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-white/15 gap-2 font-medium"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsBar;
