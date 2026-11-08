import React, { useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Bold, Italic, Code, Quote, Link, Terminal, Plus, Type, Image, Trash2, Eye, Scissors } from 'lucide-react';
import type { MessageField, TextFormat, MediaType, MediaAttachment } from '@/pages/CRMMessageConstructor';
import { markdownToHtml, processMessageIntoParts } from '@/utils/messageParser';

type Client = any;

const CATEGORY_LABELS: Record<string, string> = {
  client: '👤 Клиент', project: '📂 Проект', finance: '💰 Финансы', expert: '🎓 Эксперт',
  dates: '📅 Даты', protalk: '🤖 ИИ-ассистент', documents: '📎 Документы', other: '📌 Другое',
};

const MEDIA_TYPE_LABELS: Record<MediaType, string> = {
  photo: '🖼 Фото', video: '🎬 Видео', document: '📄 Документ', album: '🗂 Альбом',
};

const BUTTON_STYLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  default: { bg: 'bg-[#3390ec]/20', border: 'border-[#3390ec]/40', text: 'text-[#3390ec]' },
  primary: { bg: 'bg-[#3390ec]/30', border: 'border-[#3390ec]/60', text: 'text-[#3390ec]' },
  success: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400' },
  danger: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400' },
};

interface MacroEditorProps {
  value: string; onChange: (value: string) => void; fields: MessageField[];
  media?: MediaAttachment[]; onMediaChange?: (media: MediaAttachment[]) => void;
  useMediaCaption?: boolean; onUseMediaCaptionChange?: (v: boolean) => void;
  compact?: boolean; previewClient?: Client | null;
}

function wrapWithFormat(text: string, format: TextFormat): string {
  switch (format) {
    case 'bold': return `<b>${text}</b>`;
    case 'italic': return `<i>${text}</i>`;
    case 'code': return `<pre>${text}</pre>`;
    case 'mono': return `<code>${text}</code>`;
    case 'quote': return `<blockquote>${text}</blockquote>`;
    case 'link': return `<a href="${text}">${text}</a>`;
    default: return text;
  }
}

function resolveMacrosForPreview(text: string, client: any): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (key === 'telegram_link') {
      return client.telegram_client ? `https://t.me/${client.telegram_client.replace('@', '')}` : client.telegram_id ? `tg://user?id=${client.telegram_id}` : match;
    }
    return (client as any)[key]?.toString() ?? match;
  });
}

const MacroEditor: React.FC<MacroEditorProps> = ({ value, onChange, fields, media = [], onMediaChange, useMediaCaption = false, onUseMediaCaptionChange, compact = false, previewClient }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = useCallback((insertion: string) => {
    const ta = textareaRef.current;
    if (!ta) { onChange(value + insertion); return; }
    const start = ta.selectionStart;
    const newVal = value.slice(0, start) + insertion + value.slice(ta.selectionEnd);
    onChange(newVal);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(start + insertion.length, start + insertion.length); });
  }, [value, onChange]);

  const wrapSelection = useCallback((format: TextFormat) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const selected = value.slice(start, ta.selectionEnd) || 'текст';
    const wrapped = wrapWithFormat(selected, format);
    onChange(value.slice(0, start) + wrapped + value.slice(ta.selectionEnd));
  }, [value, onChange]);

  const insertFieldMacro = useCallback((field: MessageField) => {
    const macro = `{{${field.key}}}`;
    const insertion = field.format === 'link' ? `<a href="${macro}">${field.linkText || field.label}</a>` : field.format !== 'normal' ? wrapWithFormat(macro, field.format) : macro;
    insertAtCursor(insertion);
  }, [insertAtCursor]);

  const handleConvertMarkdown = useCallback(() => { onChange(markdownToHtml(value)); }, [value, onChange]);

  const addMedia = () => { if (!onMediaChange) return; onMediaChange([...media, { id: crypto.randomUUID(), type: 'photo', url: '' }]); };
  const updateMedia = (id: string, updates: Partial<MediaAttachment>) => { if (!onMediaChange) return; onMediaChange(media.map(m => m.id === id ? { ...m, ...updates } : m)); };
  const removeMedia = (id: string) => { if (!onMediaChange) return; onMediaChange(media.filter(m => m.id !== id)); };

  const hasMedia = media.some(m => m.url.trim());
  const charLimit = hasMedia && useMediaCaption ? 1000 : 4000;
  
  // Process parts — always use split view
  const previewText = useMemo(() => previewClient && value.trim() ? resolveMacrosForPreview(value, previewClient) : null, [previewClient, value]);
  const previewParts = useMemo(() => {
    const text = previewText || value;
    return text.trim() ? processMessageIntoParts(text) : [];
  }, [previewText, value]);

  const categories = ['client', 'project', 'finance', 'expert', 'dates', 'protalk', 'documents', 'other'] as const;
  const groupedFields = categories.map(cat => ({ key: cat, label: CATEGORY_LABELS[cat], fields: fields.filter(f => f.category === cat) })).filter(g => g.fields.length > 0);

  const btnSize = compact ? 'h-6 px-1.5 text-[10px]' : 'h-7 px-2 text-xs';
  const iconSize = compact ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <div className="space-y-2 w-full min-w-0 overflow-x-hidden">
      <Label className={`${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center gap-2`}><Type className={iconSize} />Макро-редактор (HTML)</Label>

      <div className="flex items-center gap-0.5 p-1 border border-border rounded-lg bg-muted/30 flex-wrap">
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} font-bold`} onClick={() => wrapSelection('bold')}><Bold className={iconSize} /></Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} italic`} onClick={() => wrapSelection('italic')}><Italic className={iconSize} /></Button>
        <Button type="button" variant="ghost" size="sm" className={`${btnSize} font-mono`} onClick={() => wrapSelection('code')}><Code className={iconSize} /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnSize} onClick={() => wrapSelection('mono')}><Terminal className={iconSize} /></Button>
        <Button type="button" variant="ghost" size="sm" className={btnSize} onClick={() => wrapSelection('quote')}><Quote className={iconSize} /></Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button type="button" variant="ghost" size="sm" className={btnSize} onClick={handleConvertMarkdown}><span className="text-[9px] font-mono">MD→HTML</span></Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Popover>
          <PopoverTrigger asChild><Button type="button" variant="outline" size="sm" className={`${btnSize} gap-0.5`}><Plus className={iconSize} />Макрос</Button></PopoverTrigger>
          <PopoverContent className="w-[calc(100vw-2rem)] max-w-72 p-0" align="start">
            <ScrollArea className="h-[300px]">
              <div className="p-2 space-y-2">
                {groupedFields.map(g => (
                  <div key={g.key}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide px-2 py-1">{g.label}</p>
                    {g.fields.map(f => (
                      <button key={f.key} type="button" className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center gap-2" onClick={() => insertFieldMacro(f)}>
                        <span className="text-muted-foreground shrink-0">{f.icon}</span><span className="flex-1">{f.label}</span><span className="text-[10px] text-muted-foreground font-mono">{`{{${f.key}}}`}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      <Textarea ref={textareaRef} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Введите текст с макросами: {{full_name}}, {{tariff}}..." className={`${compact ? 'min-h-[100px]' : 'min-h-[200px]'} font-mono text-sm resize-y w-full`} />

      <div className="flex flex-wrap items-start justify-between gap-1">
        <div className="text-[10px] text-muted-foreground"><b>Разделители:</b> ✂️✂️✂️ или :: — разбивают на сообщения</div>
        <span className={`text-[10px] ${value.length > charLimit ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>{value.length}/{charLimit}</span>
      </div>

      {/* Unified preview: always show split parts with media + buttons */}
      {(value.trim() || media.some(m => m.url.trim())) && (
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Eye className={iconSize} />
            Предпросмотр{previewClient ? `: ${previewClient.full_name || 'Клиент'}` : ''}
            {previewParts.length > 1 && <span className="ml-1">({previewParts.length} сообщений)</span>}
          </Label>
          <div className="bg-[#1a1a1a] rounded-lg p-3 text-xs text-white/80 space-y-2">
            {previewParts.map((part, partIdx) => (
              <div key={partIdx} className={previewParts.length > 1 ? 'border-l-2 border-white/10 pl-2' : ''}>
                {/* Part label if multiple */}
                {previewParts.length > 1 && (
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] text-white/30">Часть {partIdx + 1}</span>
                    <span className="text-[9px] text-white/30">{part.text.length} симв.</span>
                  </div>
                )}
                {/* UI-attached media (only in first part) */}
                {partIdx === 0 && media.filter(m => m.url.trim()).length > 0 && (
                  <div className="space-y-1.5 mb-1.5">
                    {media.filter(m => m.url.trim()).map(m => (
                      <div key={m.id}>
                        {m.type === 'photo' ? (
                          <img src={m.url} alt="preview" className="rounded max-w-full max-h-40 object-cover" onError={(e) => { (e.target as HTMLImageElement).outerHTML = `<span class="text-[10px] opacity-50">🖼 ${m.url}</span>`; }} />
                        ) : m.type === 'video' ? (
                          <video src={m.url} controls className="rounded max-w-full max-h-40" />
                        ) : (
                          <span className="text-[10px] opacity-70">📄 {m.url.split('/').pop() || 'файл'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* Part media from ##IMG:## etc */}
                {part.media.length > 0 && (
                  <div className="space-y-1 mb-1">
                    {part.media.map((m, mIdx) => (
                      <div key={mIdx}>
                        {m.type === 'photo' ? (
                          <img src={m.source} alt="media" className="rounded max-w-full max-h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).outerHTML = `<span class="text-[10px] opacity-50">🖼 ${m.source}</span>`; }} />
                        ) : m.type === 'video' ? (
                          <video src={m.source} controls className="rounded max-w-full max-h-32" />
                        ) : (
                          <span className="text-[10px] opacity-70">{m.type === 'document' ? '📄' : '📎'} {m.source.split('/').pop() || 'файл'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {part.text.trim() && (
                  <div className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: part.text }} />
                )}
                {/* Inline buttons preview */}
                {part.inlineButtons.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    {part.inlineButtons.map((row, rIdx) => (
                      <div key={rIdx} className="flex gap-1 flex-wrap">
                        {row.buttons.map((btn, bIdx) => {
                          const colors = BUTTON_STYLE_COLORS[btn.style || 'default'] || BUTTON_STYLE_COLORS.default;
                          return (
                            <div key={bIdx} className={`flex-1 min-w-[60px] text-center py-1 px-2 rounded ${colors.bg} border ${colors.border} text-[10px] ${colors.text} truncate`}>
                              {btn.type === 'link' && '🔗 '}{btn.type === 'webapp' && '🌐 '}{btn.text}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                {/* Separator between parts */}
                {partIdx < previewParts.length - 1 && (
                  <div className="flex items-center gap-2 my-2 opacity-30"><div className="flex-1 h-px bg-white/30" /><span className="text-[9px]">✂️</span><div className="flex-1 h-px bg-white/30" /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {onMediaChange && (
        <div className="space-y-2 border-t border-border pt-2">
          <div className="flex items-center justify-between">
            <Label className={`${compact ? 'text-[10px]' : 'text-xs'} flex items-center gap-1`}><Image className={iconSize} />Медиафайлы</Label>
            <Button variant="ghost" size="sm" onClick={addMedia} className={`${btnSize} gap-0.5`}><Plus className={iconSize} />Добавить</Button>
          </div>
          {media.length > 0 && onUseMediaCaptionChange && (
            <div className="flex items-center gap-2"><Switch checked={useMediaCaption} onCheckedChange={onUseMediaCaptionChange} className="scale-75" /><Label className="text-[10px]">Текст как подпись (лимит 1000)</Label></div>
          )}
          {media.map(m => (
            <div key={m.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
              <Select value={m.type} onValueChange={(v: MediaType) => updateMedia(m.id, { type: v })}>
                <SelectTrigger className="w-full sm:w-20 h-7 text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(MEDIA_TYPE_LABELS).map(([k, l]) => <SelectItem key={k} value={k} className="text-xs">{l}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={m.url} onChange={(e) => updateMedia(m.id, { url: e.target.value })} placeholder="URL или file_id" className="flex-1 min-w-0 h-7 text-[10px]" />
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeMedia(m.id)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] text-muted-foreground space-y-0.5 break-words">
        <p><b>Формат:</b> HTML. {'<b>жирный</b>'}, {'<i>курсив</i>'}, {'<a href="url">ссылка</a>'}</p>
        <p><b>Макросы:</b> {`{{field_key}}`} — подставляются при отправке</p>
        <p><b>Медиа:</b> {'##IMG:url##'}, {'##VIDEO:url##'}, {'##FILE:url##'}</p>
        <p><b>Кнопки:</b> {'##INLINE:[кнопка(url:https://...)]##'}</p>
      </div>
    </div>
  );
};

export default MacroEditor;
