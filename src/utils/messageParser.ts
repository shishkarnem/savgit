/**
 * Message parsing utilities for text commands, markdown-to-HTML conversion,
 * inline button parsing, and media command extraction.
 */

import type { InlineButtonRow, InlineButton, InlineButtonStyle } from '@/components/InlineButtonBuilder';

// ============ MARKDOWN → HTML ============

export function markdownToHtml(text: string): string {
  let result = text;
  result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  result = result.replace(/__(.+?)__/g, '<b>$1</b>');
  result = result.replace(/(?<![<\w])_([^_\n]+?)_(?![>\w])/g, '<i>$1</i>');
  result = result.replace(/(?<![<\w])\*([^*\n]+?)\*(?![>\w])/g, '<i>$1</i>');
  result = result.replace(/~~(.+?)~~/g, '<s>$1</s>');
  result = result.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  result = result.replace(/```\n?([\s\S]*?)\n?```/g, '<pre>$1</pre>');
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return result;
}

export function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '');
}

// ============ STYLE ICONS ============

const STYLE_ICON_MAP: Record<string, InlineButtonStyle> = {
  '🔵': 'primary',
  '🟢': 'success',
  '🔴': 'danger',
};

function parseStyleFromText(text: string): { style: InlineButtonStyle; cleanText: string } {
  for (const [icon, style] of Object.entries(STYLE_ICON_MAP)) {
    if (text.startsWith(icon)) {
      return { style, cleanText: text.slice(icon.length).trim() };
    }
  }
  return { style: 'default', cleanText: text.trim() };
}

// ============ INLINE BUTTON PARSING ============

interface ParsedButton {
  text: string;
  type: 'text' | 'link' | 'webapp';
  url?: string;
  callbackData?: string;
  style: InlineButtonStyle;
}

function parseSingleButton(token: string): ParsedButton {
  const trimmed = token.trim();
  const { style, cleanText } = parseStyleFromText(trimmed);
  
  const urlMatch = cleanText.match(/^(.+?)\s*\(url:(.+?)\)\s*$/);
  if (urlMatch) {
    return { text: urlMatch[1].trim(), type: 'link', url: urlMatch[2].trim(), style };
  }
  
  const webappMatch = cleanText.match(/^(.+?)\s*\(webapp:(.+?)\)\s*$/);
  if (webappMatch) {
    return { text: webappMatch[1].trim(), type: 'webapp', url: webappMatch[2].trim(), style };
  }
  
  return { text: cleanText, type: 'text', callbackData: cleanText.toLowerCase().replace(/\s+/g, '_'), style };
}

export function parseInlineCommands(text: string): { cleanText: string; buttons: InlineButtonRow[] } {
  const buttons: InlineButtonRow[] = [];
  
  const cleanText = text.replace(/##INLINE:([\s\S]*?)##/g, (_, content: string) => {
    const trimmedContent = content.trim();
    const hasBrackets = trimmedContent.includes('[');
    
    if (hasBrackets) {
      const bracketGroups = trimmedContent.match(/\[([^\]]*)\]/g);
      if (bracketGroups) {
        for (const group of bracketGroups) {
          const inner = group.slice(1, -1);
          const tokens = inner.split(';').filter(t => t.trim());
          const rowButtons: InlineButton[] = tokens.map(t => {
            const parsed = parseSingleButton(t);
            return { id: crypto.randomUUID(), ...parsed };
          });
          if (rowButtons.length > 0) {
            buttons.push({ id: crypto.randomUUID(), buttons: rowButtons });
          }
        }
      }
    } else {
      const tokens = trimmedContent.split(';').filter(t => t.trim());
      for (const t of tokens) {
        const parsed = parseSingleButton(t);
        buttons.push({
          id: crypto.randomUUID(),
          buttons: [{ id: crypto.randomUUID(), ...parsed }],
        });
      }
    }
    
    return '';
  });
  
  return { cleanText: cleanText.trim(), buttons };
}

// ============ MEDIA COMMAND PARSING ============

export interface ParsedMedia {
  type: 'photo' | 'video' | 'document' | 'video_note' | 'audio';
  source: string;
}

export interface ParsedAlbum {
  sources: string[];
}

export interface ParsedMediaCommands {
  cleanText: string;
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

export function parseMediaCommands(text: string): ParsedMediaCommands {
  const media: ParsedMedia[] = [];
  const albums: ParsedAlbum[] = [];
  
  let cleanText = text;
  
  const singlePatterns: Array<{ regex: RegExp; type: ParsedMedia['type'] }> = [
    { regex: /##IMG:(.+?)##/g, type: 'photo' },
    { regex: /##FILE:(.+?)##/g, type: 'document' },
    { regex: /##VIDEO:(.+?)##/g, type: 'video' },
    { regex: /##VIDEO_NOTE:(.+?)##/g, type: 'video_note' },
    { regex: /##AUDIO:(.+?)##/g, type: 'audio' },
  ];
  
  for (const { regex, type } of singlePatterns) {
    cleanText = cleanText.replace(regex, (_, source: string) => {
      media.push({ type, source: source.trim() });
      return '';
    });
  }
  
  cleanText = cleanText.replace(/##ALBUM:(.+?)##/g, (_, sources: string) => {
    const sourceList = sources.split(';').map(s => s.trim()).filter(Boolean);
    if (sourceList.length > 0) {
      albums.push({ sources: sourceList });
    }
    return '';
  });
  
  return { cleanText: cleanText.trim(), media, albums };
}

// ============ FULL MESSAGE PROCESSING ============

export interface ProcessedMessage {
  text: string;
  inlineButtons: InlineButtonRow[];
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

export function processMessageText(text: string): ProcessedMessage {
  let processed = markdownToHtml(text);
  const { cleanText: afterInline, buttons } = parseInlineCommands(processed);
  processed = afterInline;
  const { cleanText: afterMedia, media, albums } = parseMediaCommands(processed);
  processed = afterMedia;
  
  return { text: processed, inlineButtons: buttons, media, albums };
}

// ============ MESSAGE SPLITTING ============

function splitAtBoundary(text: string, charLimit: number): string[] {
  const result: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= charLimit) {
      result.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n\n', charLimit);
    if (splitIdx < charLimit * 0.3) splitIdx = remaining.lastIndexOf('\n', charLimit);
    if (splitIdx < charLimit * 0.3) {
      const sentenceMatch = remaining.slice(0, charLimit).match(/.*[.!?]\s/s);
      if (sentenceMatch) splitIdx = sentenceMatch[0].length;
    }
    if (splitIdx < charLimit * 0.3) splitIdx = remaining.lastIndexOf(' ', charLimit);
    if (splitIdx < charLimit * 0.3) splitIdx = charLimit;
    result.push(remaining.slice(0, splitIdx).trim());
    remaining = remaining.slice(splitIdx).trim();
  }
  return result;
}

export function splitMessage(text: string, charLimit: number = 4000): string[] {
  const parts = text.split(/✂️✂️✂️|::/).map(p => p.trim()).filter(Boolean);
  const result: string[] = [];
  for (const part of parts) {
    result.push(...splitAtBoundary(part, charLimit));
  }
  return result.length > 0 ? result : [text];
}

export interface ProcessedMessagePart {
  text: string;
  inlineButtons: InlineButtonRow[];
  media: ParsedMedia[];
  albums: ParsedAlbum[];
}

export function processMessageIntoParts(rawText: string, defaultCharLimit: number = 4000): ProcessedMessagePart[] {
  const explicitParts = rawText.split(/✂️✂️✂️|::/).map(p => p.trim()).filter(Boolean);
  if (explicitParts.length === 0) return [{ text: '', inlineButtons: [], media: [], albums: [] }];

  const result: ProcessedMessagePart[] = [];

  for (const part of explicitParts) {
    const html = markdownToHtml(part);
    const { cleanText: afterInline, buttons } = parseInlineCommands(html);
    const { cleanText: afterMedia, media, albums } = parseMediaCommands(afterInline);

    const hasPartMedia = media.length > 0 || albums.length > 0;
    const firstLimit = hasPartMedia ? 1000 : defaultCharLimit;

    const textChunks = splitAtBoundary(afterMedia.trim(), firstLimit);
    
    if (textChunks.length <= 1) {
      result.push({
        text: textChunks[0] || '',
        inlineButtons: buttons,
        media,
        albums,
      });
    } else {
      for (let i = 0; i < textChunks.length; i++) {
        const isFirst = i === 0;
        const isLast = i === textChunks.length - 1;
        result.push({
          text: textChunks[i],
          inlineButtons: isLast ? buttons : [],
          media: isFirst ? media : [],
          albums: isFirst ? albums : [],
        });
      }
    }
  }

  return result;
}

export function resolveMacros(text: string, client: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'telegram_link') {
      const tgClient = client.telegram_client as string | null;
      const tgId = client.telegram_id as string | null;
      return tgClient
        ? `https://t.me/${(tgClient as string).replace('@', '')}`
        : tgId
          ? `tg://user?id=${tgId}`
          : '';
    }
    return client[key]?.toString() ?? '';
  });
}
