import { executeQuery, executeRun, saveDb } from '../db/database';

export interface AuditSubmissionPayload {
  // Client contact info
  preferredChannel: 'Telegram' | 'Телефон' | 'MAX' | 'Сетка' | 'WhatsApp' | 'ВКонтакте' | 'Instagram' | string;
  contactValue: string;
  fullName?: string;
  companyName?: string;
  comment?: string;
  imageUrl?: string;
  
  // Telegram profile of user (if available)
  telegramUser?: {
    id?: string | number;
    username?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };

  // Context: where the request originated
  source: 'ai_seller' | 'calculator' | 'expert_selection' | 'general' | string;
  
  // Tariff context (if from AI Seller)
  tariff?: {
    package?: string;
    name?: string;
    paymentType?: 'monthly' | 'onetime';
    priceBase?: number;
    priceFinal?: number;
    discountPercent?: number;
    features?: string[];
    imageUrl?: string;
  };

  // Calculator context (if from Calculator)
  calculator?: {
    department?: string;
    employeeCount?: string | number;
    averageSalary?: string | number;
    city?: string;
    product?: string;
    company?: string;
    functionality?: string;
    maintenance?: string;
    monthlyCost?: number;
    monthlySavings?: number;
    roiPercent?: number;
    selectedExpert?: string;
  };

  // Expert context (if from Expert selection)
  expert?: {
    id?: string;
    name?: string;
    pseudonym?: string;
    spheres?: string;
    telegram?: string;
  };

  // Promo code & Partner info
  promoCode?: string;
  partnerInfo?: {
    id?: string;
    fio?: string;
    pseudonym?: string;
    telegramId?: string | number;
    discountPercent?: number;
  };

  // User actions & history
  actionsHistory?: Array<{ action: string; timestamp?: string; page?: string; value?: string; field?: string }>;
  businessInfo?: {
    sphere?: string;
    segment?: string;
    category?: string;
    description?: string;
    rawInput?: string;
    imageUrl?: string;
  };
}

export function formatTelegramAssignment(raw: string): string {
  if (!raw) return '';
  return formatTelegramAssignmentBlock(raw);
}

/**
 * Format Technical Assignment into Telegram-native collapsible blockquote expandable.
 * Escapes raw HTML entities so Telegram Bot API never fails with entity parse errors.
 */
export function formatTelegramAssignmentBlock(raw: string): string {
  if (!raw) return '';
  let text = String(raw).trim();

  // 1. Strip details and summary tags from any previous wraps
  text = text.replace(/<\/?details[^>]*>/gi, '');
  text = text.replace(/<\/?summary[^>]*>/gi, '');

  // 2. Remove form feeds and page break markers
  text = text.replace(/\f/g, '\n');
  text = text.replace(/<!--\s*page\s*break\s*-->/gi, '');
  text = text.replace(/<div[^>]*page-break[^>]*>[\s\S]*?<\/div>/gi, '');
  text = text.replace(/<br[^>]*page-break[^>]*\/?>/gi, '');
  text = text.replace(/\[\s*Разрыв\s+страницы\s*\]/gi, '');
  text = text.replace(/^[-—_]{3,}\s*(?:Разрыв\s+страницы)?\s*[-—_]{3,}$/gim, '');
  text = text.replace(/^(?:\s*[-*_]\s*){3,}$/gm, '');

  // 3. Strip trailing punctuation at line ends
  text = text.replace(/([;\,])\s*$/gm, '');

  // 4. Normalize quotes and lists
  text = text.replace(/^\|\s*\*\*?(.*?)\*\*?_?$/gm, '> **$1**');
  text = text.replace(/^\|\s*(.*?)$/gm, '> $1');
  text = text.replace(/^_+(#+\s+.*?)_+$/gm, '$1');
  text = text.replace(/^_+(#+\s+.*?)$/gm, '$1');
  text = text.replace(/^>([^\s>])/gm, '> $1');
  text = text.replace(/^•\s*/gm, '- ');

  // 5. Normalize consecutive blank lines
  text = text.replace(/\n{3,}/g, '\n\n').trim();

  // Return RichMessage details format
  return `<details open>\n<summary>📋Техническое задание</summary>\n\n${text}\n\n</details>`;
}

export function splitTzIntoExpandableTelegramBlocks(rawTz: string, maxLen: number = 3200): string[] {
  if (!rawTz) return [];
  const fullBlock = formatTelegramAssignmentBlock(rawTz);
  if (fullBlock.length <= maxLen) {
    return [fullBlock];
  }

  // Strip outer tags and chunk the inside
  const inner = fullBlock.replace(/^<details[^>]*>\s*<summary>.*?<\/summary>/i, '').replace(/<\/details>$/i, '').trim();
  const rawChunks = splitTextIntoTelegramChunks(inner, maxLen - 80);
  return rawChunks.map(c => `<details open>\n<summary>📋Техническое задание</summary>\n\n${c}\n\n</details>`);
}

function splitTextIntoTelegramChunks(text: string, maxChunkLen: number = 3800): string[] {
  if (!text || text.length <= maxChunkLen) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > maxChunkLen) {
    let splitIdx = remaining.lastIndexOf('\n\n', maxChunkLen);
    if (splitIdx === -1 || splitIdx < maxChunkLen * 0.4) {
      splitIdx = remaining.lastIndexOf('\n', maxChunkLen);
    }
    if (splitIdx === -1 || splitIdx < maxChunkLen * 0.4) {
      splitIdx = remaining.lastIndexOf('. ', maxChunkLen);
    }
    if (splitIdx === -1 || splitIdx < maxChunkLen * 0.4) {
      splitIdx = maxChunkLen;
    }
    chunks.push(remaining.substring(0, splitIdx).trim());
    remaining = remaining.substring(splitIdx).trim();
  }
  if (remaining.length > 0) {
    chunks.push(remaining);
  }
  return chunks;
}

/**
 * Convert HTML or raw text into Telegram Rich Markdown
 */
export function htmlToTelegramRichMarkdown(htmlOrText: string): string {
  if (!htmlOrText) return '';

  let text = String(htmlOrText);

  // Preserve <details open> and <summary> before removing other html tags
  const detailsPlaceholders: string[] = [];
  text = text.replace(/<details[^>]*>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/gi, (_, sum, content) => {
    const idx = detailsPlaceholders.length;
    detailsPlaceholders.push(`<details open>\n<summary>${sum.trim()}</summary>\n\n${content.trim()}\n\n</details>`);
    return `___DETAILS_PLACEHOLDER_${idx}___`;
  });

  // 1. Process HTML structural elements to Markdown
  text = text
    .replace(/<h1>([\s\S]*?)<\/h1>/gi, '\n# $1\n\n')
    .replace(/<h2>([\s\S]*?)<\/h2>/gi, '\n## $1\n\n')
    .replace(/<h3>([\s\S]*?)<\/h3>/gi, '\n### $1\n\n')
    .replace(/<b>([\s\S]*?)<\/b>/gi, '**$1**')
    .replace(/<strong>([\s\S]*?)<\/strong>/gi, '**$1**')
    .replace(/<i>([\s\S]*?)<\/i>/gi, '_$1_')
    .replace(/<em>([\s\S]*?)<\/em>/gi, '_$1_')
    .replace(/<code>([\s\S]*?)<\/code>/gi, '`$1`')
    .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```')
    .replace(/<blockquote\s*expandable\s*>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<blockquote>([\s\S]*?)<\/blockquote>/gi, '> $1\n')
    .replace(/<a\s+href="([^"]+)">([\s\S]*?)<\/a>/gi, (_, url, label) => {
      const cleanLabel = label.replace(/<[^>]+>/g, '').trim();
      if (!cleanLabel || cleanLabel === '&#8205;') return '';
      return `[${cleanLabel}](${url})`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>([\s\S]*?)<\/p>/gi, '$1\n\n')
    .replace(/<[^>]+>/g, '') // remove remaining HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8205;/g, '')
    .replace(/\n{3,}/g, '\n\n');

  // Restore details blocks
  for (let i = 0; i < detailsPlaceholders.length; i++) {
    text = text.replace(`___DETAILS_PLACEHOLDER_${i}___`, detailsPlaceholders[i]);
  }

  return text.trim();
}

/**
 * Convert Telegram Markdown to HTML for standard Bot API fallback
 */
export function markdownToTelegramHtml(text: string): string {
  if (!text) return '';

  let html = String(text);

  // Collapsible details block -> Telegram expandable blockquote
  html = html.replace(/<details[^>]*>\s*<summary>(.*?)<\/summary>\s*([\s\S]*?)<\/details>/gi, '\n<blockquote expandable><b>$1</b>\n\n$2</blockquote>\n');

  // Headers # Title -> <b>Title</b>
  html = html.replace(/^#+\s+(.*?)$/gm, '\n<b>$1</b>\n');

  // Blockquotes > Quote -> <blockquote>Quote</blockquote>
  html = html.replace(/^>\s*(.*?)$/gm, '<blockquote>$1</blockquote>');

  // Bullet items - Item or * Item -> • Item
  html = html.replace(/^[-*]\s+(.*?)$/gm, '• $1');

  // Images ![Alt](url) -> <a href="url">&#8205;</a> (renders preview in Telegram)
  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">&#8205;</a>');

  // Links [text](url) -> <a href="url">text</a>
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');

  // Bold **text** -> <b>text</b>
  html = html.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

  // Italic _text_ -> <i>text</i>
  html = html.replace(/(?<!\w)_([^_]+)_(?!\w)/g, '<i>$1</i>');

  // Inline code `code` -> <code>code</code>
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  return html.trim();
}

/**
 * Telegram Proxy Presets and Utility Functions
 */
export const PROXY_PRESETS = {
  dialog_ai: "https://eu1.account.dialog.ai.atiks.org",
  direct: "https://api.telegram.org"
};

export interface TelegramBotConfig {
  botToken: string;
  botUsername: string;
  proxyType: "dialog_ai" | "custom_cloudflare" | "direct";
  apiBaseUrl: string;
  adminTelegramId: string;
}

export function cleanTelegramBaseUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== "string") return PROXY_PRESETS.dialog_ai;
  let u = rawUrl.trim().replace(/\/+$/, "");
  // Remove trailing /bot<TOKEN>/... if accidentally provided
  u = u.replace(/\/bot[^\/]+.*$/i, "");
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  return u;
}

export function getTelegramBotConfig(): TelegramBotConfig {
  const envToken = process.env.TELEGRAM_BOT_TOKEN;
  const envAdminChat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  const envApiBase = process.env.TELEGRAM_API_BASE;

  const defaultConfig: TelegramBotConfig = {
    botToken: envToken || '7656117989:AAFg2ThSRkaHFFOUp0EmxU3kMSBbIgrRn6o',
    botUsername: '@SAV_AI_Sales_Bot',
    proxyType: 'dialog_ai',
    apiBaseUrl: envApiBase || PROXY_PRESETS.dialog_ai,
    adminTelegramId: envAdminChat || '169262990'
  };

  try {
    const rows = executeQuery("SELECT * FROM telegram_bot_config WHERE is_active = 1 LIMIT 1");
    if (rows && rows.length > 0) {
      const cfg = rows[0];
      if (cfg.config_json) {
        try {
          const parsed = typeof cfg.config_json === 'string' ? JSON.parse(cfg.config_json) : cfg.config_json;
          return { ...defaultConfig, ...parsed };
        } catch (_) {}
      }
      return {
        botToken: (cfg.bot_token || defaultConfig.botToken).trim(),
        botUsername: (cfg.bot_username || cfg.bot_name || defaultConfig.botUsername).trim(),
        proxyType: (cfg.proxy_type as any) || defaultConfig.proxyType,
        apiBaseUrl: cleanTelegramBaseUrl(cfg.api_base_url || defaultConfig.apiBaseUrl),
        adminTelegramId: (cfg.admin_chat_id || defaultConfig.adminTelegramId).trim()
      };
    }

    const bRows = executeQuery("SELECT token FROM bot_settings LIMIT 1");
    if (bRows && bRows.length > 0 && bRows[0].token) {
      defaultConfig.botToken = bRows[0].token.trim();
    }
  } catch (e) {
    console.error('[getTelegramBotConfig Error]', e);
  }

  return defaultConfig;
}

/**
 * Get active bot token and admin chat ID from BD ProTalk database or environment (backward-compatible)
 */
export function getBotConfig(): { botToken: string; adminChatId: string } {
  const cfg = getTelegramBotConfig();
  return {
    botToken: cfg.botToken,
    adminChatId: cfg.adminTelegramId
  };
}

/**
 * Send document / database backup via Telegram Bot API with proxy & fallback
 */
export async function sendTelegramDocument(options: {
  chatId: string | number;
  fileBuffer: Buffer | Uint8Array;
  filename: string;
  caption?: string;
  botToken?: string;
  apiBaseUrl?: string;
  timeoutMs?: number;
}): Promise<{ ok: boolean; result?: any; error?: string; usedFallback?: boolean }> {
  const config = getTelegramBotConfig();
  const token = (options.botToken || config.botToken).trim();
  const rawBase = options.apiBaseUrl || config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);
  const timeoutMs = options.timeoutMs || 30000;
  const cleanChatId = String(options.chatId || config.adminTelegramId).trim();

  if (!token) return { ok: false, error: "Bot token is missing" };

  const formData = new FormData();
  formData.append("chat_id", cleanChatId);
  if (options.caption) {
    formData.append("caption", options.caption);
    formData.append("parse_mode", "HTML");
  }

  const blob = new Blob([options.fileBuffer], { type: "application/json" });
  formData.append("document", blob, options.filename);

  const primaryUrl = `${primaryBase}/bot${token}/sendDocument`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(primaryUrl, {
      method: "POST",
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timer);

    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      console.log(`[Telegram Document Proxy] ✅ File sent (${options.filename}) via ${primaryBase}`);
      return { ok: true, result: data.result };
    }
    throw new Error(data?.description || `HTTP ${res.status}`);
  } catch (err: any) {
    console.warn(`[Telegram Document Proxy] Primary failed (${primaryUrl}):`, err.message);

    // Fallback: Try alternative gateway (Dialog AI or direct api.telegram.org)
    const fallbackBase = primaryBase.includes("dialog.ai") ? "https://api.telegram.org" : PROXY_PRESETS.dialog_ai;
    const fallbackUrl = `${fallbackBase}/bot${token}/sendDocument`;

    try {
      const fbController = new AbortController();
      const fbTimer = setTimeout(() => fbController.abort(), timeoutMs);
      const resFb = await fetch(fallbackUrl, {
        method: "POST",
        body: formData,
        signal: fbController.signal
      });
      clearTimeout(fbTimer);

      const dataFb: any = await resFb.json().catch(() => null);
      if (resFb.ok && dataFb?.ok) {
        console.log(`[Telegram Document Proxy] ✅ File sent via fallback (${fallbackBase})`);
        return { ok: true, result: dataFb.result, usedFallback: true };
      }
      return { ok: Boolean(dataFb?.ok), result: dataFb?.result, error: dataFb?.description };
    } catch (fbErr: any) {
      return { ok: false, error: `Fallback failed: ${fbErr.message}` };
    }
  }
}

/**
 * Send message via Telegram Bot API with Rich Message, HTML, Proxy and Plain-text fallbacks
 * Supports both object signature `sendTelegramMessage({ chatId, text, ... })` and legacy `(botToken, chatId, text, markup)`
 */
export async function sendTelegramMessage(
  arg1: string | {
    chatId: string | number;
    text: string;
    parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    botToken?: string;
    apiBaseUrl?: string;
    timeoutMs?: number;
    replyMarkup?: any;
  },
  arg2?: string | number,
  arg3?: string,
  arg4?: any
): Promise<any> {
  const config = getTelegramBotConfig();
  let chatId: string | number;
  let text: string;
  let parseMode: string = 'HTML';
  let botToken: string = config.botToken;
  let apiBaseUrl: string = config.apiBaseUrl;
  let replyMarkup: any = undefined;
  let timeoutMs: number = 15000;
  let isOptionsObj = false;

  if (typeof arg1 === 'object' && arg1 !== null) {
    isOptionsObj = true;
    chatId = arg1.chatId;
    text = arg1.text;
    parseMode = arg1.parseMode || 'HTML';
    if (arg1.botToken) botToken = arg1.botToken;
    if (arg1.apiBaseUrl) apiBaseUrl = arg1.apiBaseUrl;
    if (arg1.replyMarkup) replyMarkup = arg1.replyMarkup;
    if (arg1.timeoutMs) timeoutMs = arg1.timeoutMs;
  } else {
    botToken = (arg1 || config.botToken).trim();
    chatId = arg2 as any;
    text = arg3 as string;
    replyMarkup = arg4;
  }

  const cleanToken = (botToken || config.botToken || '7656117989:AAFg2ThSRkaHFFOUp0EmxU3kMSBbIgrRn6o').trim();
  const cleanChatId = chatId ? String(chatId).trim() : config.adminTelegramId;

  if (!cleanToken || !cleanChatId || cleanChatId === 'undefined' || cleanChatId === 'null' || cleanChatId === 'Гость' || cleanChatId === '—' || cleanChatId === '0') {
    return isOptionsObj ? { ok: false, error: 'Bot token or Chat ID is invalid' } : false;
  }

  const rawBase = apiBaseUrl || config.apiBaseUrl || PROXY_PRESETS.dialog_ai;
  const primaryBase = cleanTelegramBaseUrl(rawBase);
  const supportsRich = primaryBase.includes('dialog.ai') || primaryBase.includes('atiks.org');

  // 1. Attempt sendRichMessage first if proxy supports it (supports up to 36,000 characters in a single message)
  if (supportsRich && text && text.length <= 36000) {
    const richMarkdown = text && (text.includes('<') && !text.includes('#')) 
      ? htmlToTelegramRichMarkdown(text) 
      : (text || '');

    const richUrl = `${primaryBase}/bot${cleanToken}/sendRichMessage`;
    const richPayload: any = {
      chat_id: cleanChatId,
      rich_message: {
        markdown: richMarkdown
      }
    };
    if (replyMarkup) {
      richPayload.reply_markup = replyMarkup;
    }

    try {
      const richCtrl = new AbortController();
      const richTimer = setTimeout(() => richCtrl.abort(), timeoutMs);
      const resRich = await fetch(richUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(richPayload),
        signal: richCtrl.signal
      });
      clearTimeout(richTimer);

      const dataRich: any = await resRich.json().catch(() => null);
      if (resRich.ok && dataRich?.ok) {
        console.log(`[Telegram Proxy] ✅ Rich Message (${text.length} chars) successfully sent via (${primaryBase}) to Chat ID: ${cleanChatId}`);
        return isOptionsObj ? { ok: true, result: dataRich.result } : true;
      }
      const descRich = dataRich?.description || resRich.statusText || '';
      if (/chat not found|bot was blocked|user is deactivated|bot can't initiate conversation|chat was deleted/i.test(descRich)) {
        console.log(`[Telegram Proxy] Delivery impossible for Chat ID ${cleanChatId}: ${descRich}`);
        return isOptionsObj ? { ok: false, error: descRich } : false;
      }
      console.log(`[Telegram Proxy] sendRichMessage endpoint returned non-ok:`, descRich);
    } catch (richErr: any) {
      console.log(`[Telegram Proxy] sendRichMessage failed (${richUrl}):`, richErr.message);
    }
  }

  // 2. Fallback: If message exceeds standard Telegram limit (3800), split sequentially in clean parts
  if (text && text.length > 3800) {
    const chunks = splitTextIntoTelegramChunks(text, 3800);
    let finalResult: any = null;
    for (let i = 0; i < chunks.length; i++) {
      const isLast = i === chunks.length - 1;
      const res = await sendTelegramMessage({
        chatId: cleanChatId,
        text: chunks[i],
        parseMode: parseMode as any,
        botToken: cleanToken,
        apiBaseUrl: primaryBase,
        timeoutMs,
        replyMarkup: isLast ? replyMarkup : undefined
      });
      if (isLast) finalResult = res;
    }
    return finalResult;
  }

  // Standardize HTML for Telegram Bot API
  let htmlText = text || '';
  if (!htmlText.includes('<') || htmlText.includes('#') || htmlText.includes('**')) {
    htmlText = markdownToTelegramHtml(htmlText);
  }

  // Telegram Bot API only supports <blockquote expandable> for collapsible text, NOT <details>
  if (parseMode === 'HTML') {
    htmlText = htmlText.replace(/<details[^>]*>\s*<summary>([\s\S]*?)<\/summary>\s*([\s\S]*?)<\/details>/gi, '\n<blockquote expandable><b>$1</b>\n\n$2</blockquote>\n');
    htmlText = htmlText.replace(/<\/?details[^>]*>/gi, '');
    htmlText = htmlText.replace(/<\/?summary[^>]*>/gi, '');
  }

  const payload: any = {
    chat_id: cleanChatId,
    text: htmlText,
    parse_mode: parseMode,
    disable_web_page_preview: false
  };
  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  const primaryUrl = `${primaryBase}/bot${cleanToken}/sendMessage`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(primaryUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timer);

    const data: any = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      console.log(`[Telegram Proxy] ✅ Message successfully sent via proxy (${primaryBase}) to Chat ID: ${cleanChatId}`);
      return isOptionsObj ? { ok: true, result: data.result } : true;
    }

    const desc = data?.description || res.statusText || '';
    if (/chat not found|bot was blocked|user is deactivated|bot can't initiate conversation|chat was deleted/i.test(desc)) {
      return isOptionsObj ? { ok: false, error: desc } : false;
    }
    throw new Error(desc || `HTTP ${res.status}`);
  } catch (primaryErr: any) {
    console.warn(`[Telegram Proxy] Primary endpoint failed (${primaryUrl}):`, primaryErr.message);

    // Fallback: If Dialog AI failed, try direct api.telegram.org; if direct failed, try Dialog AI
    const fallbackBase = primaryBase.includes("dialog.ai") ? "https://api.telegram.org" : PROXY_PRESETS.dialog_ai;
    const fallbackUrl = `${fallbackBase}/bot${cleanToken}/sendMessage`;

    try {
      const fbController = new AbortController();
      const fbTimer = setTimeout(() => fbController.abort(), timeoutMs);
      const resFb = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: fbController.signal
      });
      clearTimeout(fbTimer);

      const dataFb: any = await resFb.json().catch(() => null);
      if (resFb.ok && dataFb?.ok) {
        console.log(`[Telegram Proxy] ✅ Message sent via fallback endpoint (${fallbackBase}) to Chat ID: ${cleanChatId}`);
        return isOptionsObj ? { ok: true, result: dataFb.result, usedFallback: true } : true;
      }
    } catch (fbErr: any) {
      console.warn(`[Telegram Proxy] Fallback HTML endpoint failed (${fallbackUrl}):`, fbErr.message);
    }

    // Plain-text Fallback
    try {
      const plainText = (text || '')
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1: $2')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/<a\s+href="([^"]+)">([\s\S]*?)<\/a>/gi, '$2 ($1)')
        .replace(/<\/?[^>]+(>|$)/g, '')
        .replace(/&#8205;/g, '')
        .replace(/[*_`#]/g, '')
        .trim();

      const plainPayload: any = {
        chat_id: cleanChatId,
        text: plainText,
        disable_web_page_preview: false
      };
      if (replyMarkup) plainPayload.reply_markup = replyMarkup;

      const plainUrl = `${primaryBase}/bot${cleanToken}/sendMessage`;
      const resPlain = await fetch(plainUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plainPayload)
      });
      const dataPlain: any = await resPlain.json().catch(() => null);
      if (resPlain.ok && dataPlain?.ok) {
        console.log(`[Telegram Proxy] ✅ Plain-text fallback delivered to Chat ID: ${cleanChatId}`);
        return isOptionsObj ? { ok: true, result: dataPlain.result } : true;
      }
    } catch (_) {}

    return isOptionsObj ? { ok: false, error: primaryErr.message } : false;
  }
}

/**
 * Handle new Free Business Audit submission:
 * 1. Build rich HTML report with full history and context
 * 2. Send Telegram message to Admin (@shishkarnem / admin chat ID)
 * 3. Send Telegram message to Partner if promo code was used
 * 4. Upsert into CRM, sav_leads, leads, sav_clients, sav_user_calculations in BD ProTalk
 * 5. Persist DB state
 */
export async function processAuditSubmission(rawPayload: AuditSubmissionPayload | any): Promise<{ success: boolean; leadId: string; adminNotified: boolean; partnerNotified: boolean }> {
  const payload: any = rawPayload || {};
  const leadId = `lead_audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const nowStr = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const { botToken, adminChatId } = getBotConfig();

  // 1. Resolve Partner details if promo code exists
  let partnerMatch: any = null;
  const promo = (payload.promoCode || payload.promo || '').trim();
  if (promo) {
    try {
      const partners = executeQuery("SELECT * FROM partners");
      partnerMatch = partners.find((p: any) => 
        String(p.promo || '').trim().toLowerCase() === promo.toLowerCase() ||
        String(p.partner_code || '').trim().toLowerCase() === promo.toLowerCase() ||
        String(p.telegram_id || '').trim().toLowerCase() === promo.toLowerCase()
      );
    } catch (e) {
      console.error('[Error resolving partner]', e);
    }
  }

  // 2. Format Admin Telegram Rich Message
  const rawTg = payload.telegramUser || {};
  const tgUser = {
    id: rawTg.id,
    username: rawTg.username,
    firstName: rawTg.firstName || rawTg.first_name || '',
    lastName: rawTg.lastName || rawTg.last_name || '',
    phone: rawTg.phone
  };

  const tgHandle = tgUser?.username ? `@${tgUser.username.replace('@', '')}` : 'не указан';
  const tgId = tgUser?.id ? String(tgUser.id) : 'не указан';
  const clientName = payload.fullName || payload.clientName || `${tgUser?.firstName || ''} ${tgUser?.lastName || ''}`.trim() || 'Клиент';
  const company = payload.companyName || payload.company || payload.calculator?.company || payload.businessInfo?.companyName || payload.businessInfo?.description || 'Не указана';
  const rawContact = (payload.contactValue || payload.phone || payload.contact || payload.telegram || payload.email || tgUser?.phone || (tgUser?.username ? `@${tgUser.username}` : '') || '').trim();
  const phoneOrContact = rawContact || 'Не указан';
  const channel = payload.preferredChannel || payload.contactType || payload.contactMethod || 'Telegram';
  const clientComment = payload.comment || payload.additionalNote || payload.customNotes || '';
  const actionsList = payload.actionsHistory || payload.actionHistory || [];
  
  let resolvedTgHandle = tgHandle;
  let resolvedTgUsername = tgUser?.username ? tgUser.username.replace('@', '').trim() : '';

  if (rawContact) {
    if (rawContact.startsWith('@')) {
      resolvedTgUsername = rawContact.replace(/^@+/, '').trim();
      resolvedTgHandle = `@${resolvedTgUsername}`;
    } else if (rawContact.includes('t.me/')) {
      const m = rawContact.match(/t\.me\/([a-zA-Z0-9_]+)/);
      if (m && m[1]) {
        resolvedTgUsername = m[1];
        resolvedTgHandle = `@${resolvedTgUsername}`;
      }
    } else if ((channel === 'Telegram' || !channel) && /^[a-zA-Z0-9_]{3,}$/.test(rawContact)) {
      resolvedTgUsername = rawContact;
      resolvedTgHandle = `@${resolvedTgUsername}`;
    }
  }

  const calcData = payload.calculator || payload.calculatorState || (payload.department ? {
    department: payload.department,
    employeeCount: payload.employeeCount,
    averageSalary: payload.averageSalary || payload.salary,
    city: payload.city,
    finalBotCost: payload.finalBotCost,
    annualSavings: payload.annualSavings,
    paybackDays: payload.paybackDays,
    maintenance: payload.maintenance,
    selectedExpert: payload.selectedExpert,
    functionality: payload.functionality || payload.tzText,
    product: payload.product,
    company: payload.company,
    uploadedDocUrl: payload.uploadedDocUrl || payload.uploaded_doc_url,
    uploadedDocName: payload.uploadedDocName || payload.uploaded_doc_name,
    pdfUrl: payload.pdfUrl || payload.pdfDownloadUrl || payload.pdf_url
  } : null);

  let sourceLabel = 'Общая заявка';
  if (payload.source === 'ai_seller' || payload.source === 'ai_seller_plans') sourceLabel = 'ИИ-Продавец (Каталог тарифов)';
  if (payload.source === 'calculator' || calcData) sourceLabel = 'Калькулятор сметы (Замена отдела)';
  if (payload.source === 'expert_selection') sourceLabel = 'Подбор эксперта';
  if (payload.source === 'marketplace_product_detail') sourceLabel = 'Карточка товара маркетплейса';

  // Client link representation in Markdown
  let clientTgLink = clientName;
  if (resolvedTgUsername) {
    clientTgLink = `[${clientName}](https://t.me/${resolvedTgUsername})`;
  } else if (tgUser?.id && /^\d+$/.test(String(tgUser.id))) {
    clientTgLink = `[${clientName}](tg://user?id=${tgUser.id})`;
  }

  const productImgUrl = payload.imageUrl || payload.image_url || payload.productImage || payload.product?.imageUrl || payload.marketplaceProduct?.imageUrl || payload.businessInfo?.imageUrl || payload.tariff?.imageUrl;
  const productTitle = payload.productName || payload.product?.name || payload.marketplaceProduct?.name || payload.tariff?.name || payload.tariff?.package || 'ИИ-Решение для бизнеса';

  let adminMessage = `# Новая заявка: Бесплатный аудит бизнеса\n\n`;

  // Place image in the middle of message right after header and instead of divider line
  if (productImgUrl && typeof productImgUrl === 'string' && productImgUrl.startsWith('http')) {
    adminMessage += `![${productTitle}](${productImgUrl})\n\n`;
  }

  adminMessage += `📍 **Источник:** ${sourceLabel}\n\n`;
  adminMessage += `👤 **Клиент:** ${clientTgLink}\n\n`;
  adminMessage += `📱 **Канал связи:** ${channel}\n\n`;
  adminMessage += `📞 **Контакт:** \`${phoneOrContact}\`\n\n`;
  adminMessage += `🆔 **Telegram ID:** \`${tgId}\` ${resolvedTgHandle !== 'не указан' ? `(${resolvedTgHandle})` : ''}\n\n`;
  adminMessage += `🏢 **Компания:** ${company}\n\n`;

  // Business Profile: Clean list format without blockquotes, no repetitive text
  if (payload.businessInfo) {
    const bi = payload.businessInfo;
    const rawParts = [bi.sphere, bi.category, bi.segment]
      .map(s => (s || '').trim())
      .filter(s => Boolean(s) && s !== '—' && s !== 'SAV Другое / SAV Другое' && s !== 'SAV Другое');

    const uniqueParts: string[] = [];
    for (const part of rawParts) {
      if (!uniqueParts.some(p => p.toLowerCase() === part.toLowerCase())) {
        uniqueParts.push(part);
      }
    }
    const nicheText = uniqueParts.join(' / ') || bi.sphere || 'Не указана';

    adminMessage += `🏢 **Профиль бизнеса:**\n`;
    adminMessage += `- **Сфера / Ниша:** ${nicheText}\n`;
    if (bi.description && bi.description.trim()) {
      adminMessage += `- **Описание:** _${bi.description.slice(0, 400)}_\n`;
    }
    adminMessage += `\n`;
  }

  // Selected Tariff: Clean list format without blockquotes, with paragraph separation
  if (payload.tariff) {
    const t = payload.tariff;
    const tariffTitle = t.name || t.package || 'Стандарт';
    adminMessage += `📦 **Выбранный тариф:** ${tariffTitle}\n\n`;
    adminMessage += `- **Формат:** ${t.paymentType === 'onetime' ? 'Единоразово под ключ' : 'Ежемесячно по тарифу'}\n`;
    if (t.priceFinal || t.price) {
      const pFinal = t.priceFinal || t.price;
      const discountText = t.discountPercent ? ` _(скидка ${t.discountPercent}%)_` : '';
      adminMessage += `- **Инвестиции:** **${Number(pFinal).toLocaleString('ru-RU')} ₽**${discountText}\n`;
    }
    adminMessage += `\n`;
  }

  if (calcData) {
    const c = calcData;
    adminMessage += `🧮 **Смета ИИ-приложения (замена отдела):**\n\n`;
    if (c.department) adminMessage += `- **Подразделение:** ${c.department}\n`;
    if (c.employeeCount) adminMessage += `- **Заменяемых сотрудников:** ${c.employeeCount} чел.\n`;
    if (c.averageSalary) adminMessage += `- **Средняя ЗП сотрудника:** ${Number(c.averageSalary).toLocaleString('ru-RU')} ₽\n`;
    if (c.city) adminMessage += `- **Город:** ${c.city}\n`;
    if (c.finalBotCost || c.priceFinal || c.monthlyCost) {
      const cost = c.finalBotCost || c.priceFinal || c.monthlyCost;
      adminMessage += `- **Стоимость внедрения React + BD ProTalk (PostgreSQL):** ${Number(cost).toLocaleString('ru-RU')} ₽\n`;
    }
    if (c.annualSavings) adminMessage += `- **Годовая экономия ФОТ:** ${Number(c.annualSavings).toLocaleString('ru-RU')} ₽/год\n`;
    else if (c.monthlySavings) adminMessage += `- **Экономия в месяц:** ${Number(c.monthlySavings).toLocaleString('ru-RU')} ₽/мес\n`;
    if (c.paybackDays) adminMessage += `- **Срок полной окупаемости:** ${c.paybackDays} дней\n`;
    else if (c.paybackMonths) adminMessage += `- **Окупаемость:** ${c.paybackMonths} мес.\n`;
    if (c.maintenance) adminMessage += `- **Серверное обслуживание:** ${c.maintenance}\n`;
    if (c.selectedExpert) adminMessage += `- **Назначенный куратор:** ${c.selectedExpert}\n`;
    adminMessage += `\n`;
  }

  let pdfUrl = payload.pdfUrl || payload.pdfDownloadUrl || payload.pdf_url || (calcData as any)?.pdfUrl;
  if (!pdfUrl && calcData) {
    const host = process.env.APP_HOST || (process.env.NODE_ENV === 'production' ? 'sav-ai.ru' : 'localhost:3000');
    const proto = host.includes('localhost') ? 'http' : 'https';
    pdfUrl = `${proto}://${host}/api/v1/ai/calculator/view-pdf/${leadId}`;
  }

  const uploadedDocUrl = payload.uploadedDocUrl || payload.uploaded_doc_url || (calcData as any)?.uploadedDocUrl;
  const uploadedDocName = payload.uploadedDocName || payload.uploaded_doc_name || (calcData as any)?.uploadedDocName || 'Прикрепленный файл ТЗ клиента';

  if (pdfUrl && typeof pdfUrl === 'string' && (pdfUrl.startsWith('http') || pdfUrl.startsWith('/'))) {
    adminMessage += `📄 **Сформированная PDF-смета:** [Открыть PDF файл](${pdfUrl})\n\n`;
  }

  if (uploadedDocUrl && typeof uploadedDocUrl === 'string' && (uploadedDocUrl.startsWith('http') || uploadedDocUrl.startsWith('/'))) {
    adminMessage += `📎 **Прикрепленный файл ТЗ клиента:** [${uploadedDocName}](${uploadedDocUrl})\n\n`;
  }

  // Only show expert if valid expert exists and not placeholder 'Эксперт'
  if (payload.expert) {
    const expName = (payload.expert.pseudonym || payload.expert.name || '').trim();
    const isRealExpert = expName && expName.toLowerCase() !== 'эксперт' && expName !== '—';
    if (isRealExpert) {
      const expTg = payload.expert.telegram ? `@${payload.expert.telegram.replace('@', '')}` : '—';
      const expTgUrl = payload.expert.telegram ? `https://t.me/${payload.expert.telegram.replace('@', '')}` : '';
      adminMessage += `👨‍💼 **Закрепленный эксперт:** ${expTgUrl ? `[${expName}](${expTgUrl})` : `**${expName}**`}\n`;
      if (payload.expert.spheres) adminMessage += `- Компетенции: _${payload.expert.spheres}_\n`;
      if (expTg !== '—') adminMessage += `- Связь в Telegram: \`${expTg}\`\n`;
      adminMessage += `\n`;
    }
  }

  if (promo) {
    const pName = partnerMatch ? (partnerMatch.pseudonym || partnerMatch.fio || partnerMatch.title) : 'Партнер платформы';
    adminMessage += `🏷️ **Промокод:** \`${promo}\` _(${pName})_\n\n`;
  }

  if (clientComment) {
    adminMessage += `💬 **Комментарий клиента:**\n_${clientComment}_\n\n`;
  }

  // Summarize action steps history
  if (actionsList && actionsList.length > 0) {
    const stepsSummary = actionsList.slice(-8).map((a: any) => `• ${a.action || a.field || 'Действие'}${a.page ? ` (${a.page})` : ''}${a.value ? ` → ${a.value}` : ''}`).join('\n');
    adminMessage += `🧭 **История действий клиента:**\n\`${stepsSummary}\`\n\n`;
  }

  adminMessage += `⏰ \`${nowStr} (МСК)\``;

  // Append Collapsible Technical Assignment AFTER all links and metadata in ONE single big message
  const rawTz = calcData?.functionality || (payload as any)?.functionality || '';
  const expandableTz = rawTz ? formatTelegramAssignmentBlock(rawTz) : '';

  if (expandableTz) {
    adminMessage += `\n\n${expandableTz}`;
  }

  // Build Inline Keyboard for Rich Interactive Experience: 2 buttons (client contact and expert)
  const inlineButtons: any[] = [];
  const buttonsRow: any[] = [];

  let clientContactUrl: string | null = null;
  let clientContactText = '💬 Написать клиенту';

  const rawContactDigits = (phoneOrContact || '').replace(/\D/g, '');

  if (resolvedTgUsername) {
    clientContactUrl = `https://t.me/${resolvedTgUsername}`;
    clientContactText = `💬 Клиент @${resolvedTgUsername}`;
  } else if (tgUser?.id && tgUser.id !== 'Гость' && /^\d+$/.test(String(tgUser.id))) {
    clientContactUrl = `tg://user?id=${tgUser.id}`;
    clientContactText = '💬 Клиент в Telegram';
  } else if (phoneOrContact.includes('@') && phoneOrContact.includes('.')) {
    clientContactUrl = `mailto:${phoneOrContact}`;
    clientContactText = `✉️ Написать на Email`;
  } else if (rawContactDigits && rawContactDigits.length >= 10) {
    const waPhone = rawContactDigits.length === 11 && rawContactDigits.startsWith('8') ? '7' + rawContactDigits.slice(1) : rawContactDigits;
    if (channel === 'WhatsApp') {
      clientContactUrl = `https://wa.me/${waPhone}`;
      clientContactText = '💬 WhatsApp клиента';
    } else {
      clientContactUrl = `tel:+${waPhone}`;
      clientContactText = `📞 Позвонить (${phoneOrContact})`;
    }
  }

  if (clientContactUrl) {
    buttonsRow.push({ text: clientContactText, url: clientContactUrl });
  }

  if (payload.expert?.telegram) {
    const cleanExpTg = payload.expert.telegram.replace('@', '').trim();
    if (cleanExpTg) {
      buttonsRow.push({ text: `👨‍💼 Эксперт @${cleanExpTg}`, url: `https://t.me/${cleanExpTg}` });
    }
  }

  if (buttonsRow.length > 0) {
    inlineButtons.push(buttonsRow);
  }

  const replyMarkup = inlineButtons.length > 0 ? { inline_keyboard: inlineButtons } : undefined;

  // 3. Send message to Admin (Always include 169262990)
  let adminNotified = false;
  const adminIdsToNotify: string[] = ['169262990'];
  if (adminChatId && adminChatId !== '0') {
    adminIdsToNotify.push(adminChatId);
  }

  try {
    const crmAdmins = executeQuery("SELECT telegram_id FROM sav_crm_admins WHERE telegram_id IS NOT NULL");
    for (const a of crmAdmins) {
      if (a.telegram_id && String(a.telegram_id).trim()) {
        adminIdsToNotify.push(String(a.telegram_id).trim());
      }
    }
    const userAdmins = executeQuery("SELECT telegram_id FROM users WHERE role IN ('ADMIN', 'SUPERADMIN') AND telegram_id IS NOT NULL");
    for (const u of userAdmins) {
      if (u.telegram_id && String(u.telegram_id).trim()) {
        adminIdsToNotify.push(String(u.telegram_id).trim());
      }
    }
  } catch (e) {
    console.error('[Error fetching admin chat IDs]', e);
  }

  const mockIds = new Set(['7238129', '1928471', '5523912', '0', '']);
  const uniqueAdminIds = Array.from(new Set(adminIdsToNotify.filter(id => id && /^\d+$/.test(id) && !mockIds.has(id))));
  if (uniqueAdminIds.length === 0) {
    uniqueAdminIds.push('169262990');
  }
  console.log(`[processAuditSubmission] Dispatching lead ${leadId} to admins:`, uniqueAdminIds);
  for (const aId of uniqueAdminIds) {
    const sent = await sendTelegramMessage(botToken, aId, adminMessage, replyMarkup);
    if (sent) adminNotified = true;
  }

  // 4. Send notification to Partner if promo was used
  let partnerNotified = false;
  if (partnerMatch && (partnerMatch.telegram_id || partnerMatch.chat_id)) {
    const partnerTgId = partnerMatch.telegram_id || partnerMatch.chat_id;
    let partnerMsg = `# 🎉 Новая заявка по вашему промокоду [\`${promo}\`]!\n\n`;
    if (productImgUrl && typeof productImgUrl === 'string' && productImgUrl.startsWith('http')) {
      partnerMsg += `![${productTitle}](${productImgUrl})\n\n`;
    }
    partnerMsg += `📍 **Источник:** ${sourceLabel}\n\n`;
    partnerMsg += `👤 **Клиент:** ${clientTgLink}\n\n`;
    partnerMsg += `📱 **Канал связи:** ${channel}\n\n`;
    partnerMsg += `📞 **Контакт:** \`${phoneOrContact}\`\n\n`;
    partnerMsg += `🆔 **Telegram ID:** \`${tgId}\` ${resolvedTgHandle !== 'не указан' ? `(${resolvedTgHandle})` : ''}\n\n`;
    partnerMsg += `🏢 **Компания:** **${company}**\n\n`;

    if (payload.businessInfo) {
      const bi = payload.businessInfo;
      const rawParts = [bi.sphere, bi.category, bi.segment]
        .map(s => (s || '').trim())
        .filter(s => Boolean(s) && s !== '—' && s !== 'SAV Другое / SAV Другое' && s !== 'SAV Другое');

      const uniqueParts: string[] = [];
      for (const part of rawParts) {
        if (!uniqueParts.some(p => p.toLowerCase() === part.toLowerCase())) {
          uniqueParts.push(part);
        }
      }
      const nicheText = uniqueParts.join(' / ') || bi.sphere || 'Не указана';

      partnerMsg += `🏢 **Профиль бизнеса:**\n`;
      partnerMsg += `- **Сфера / Ниша:** ${nicheText}\n`;
      if (bi.description && bi.description.trim()) {
        partnerMsg += `- **Описание:** _${bi.description.slice(0, 400)}_\n`;
      }
      partnerMsg += `\n`;
    }

    if (payload.tariff) {
      const t = payload.tariff;
      const tariffTitle = t.name || t.package || 'Стандарт';
      partnerMsg += `📦 **Выбранный тариф:** ${tariffTitle}\n\n`;
      partnerMsg += `- **Формат:** ${t.paymentType === 'onetime' ? 'Единоразово под ключ' : 'Ежемесячно по тарифу'}\n`;
      if (t.priceFinal || t.price) {
        const pFinal = t.priceFinal || t.price;
        const discountText = t.discountPercent ? ` _(скидка ${t.discountPercent}%)_` : '';
        partnerMsg += `- **Инвестиции:** **${Number(pFinal).toLocaleString('ru-RU')} ₽**${discountText}\n`;
      }
      partnerMsg += `\n`;
    }

    if (calcData) {
      const c = calcData;
      partnerMsg += `🧮 **Смета ИИ-приложения (замена отдела):**\n\n`;
      if (c.department) partnerMsg += `- **Подразделение:** ${c.department}\n`;
      if (c.employeeCount) partnerMsg += `- **Заменяемых сотрудников:** ${c.employeeCount} чел.\n`;
      if (c.averageSalary) partnerMsg += `- **Средняя ЗП сотрудника:** ${Number(c.averageSalary).toLocaleString('ru-RU')} ₽\n`;
      if (c.city) partnerMsg += `- **Город:** ${c.city}\n`;
      if (c.finalBotCost || c.priceFinal || c.monthlyCost) {
        const cost = c.finalBotCost || c.priceFinal || c.monthlyCost;
        partnerMsg += `- **Стоимость внедрения React + BD ProTalk (PostgreSQL):** ${Number(cost).toLocaleString('ru-RU')} ₽\n`;
      }
      if (c.annualSavings) partnerMsg += `- **Годовая экономия ФОТ:** ${Number(c.annualSavings).toLocaleString('ru-RU')} ₽/год\n`;
      else if (c.monthlySavings) partnerMsg += `- **Экономия в месяц:** ${Number(c.monthlySavings).toLocaleString('ru-RU')} ₽/мес\n`;
      if (c.paybackDays) partnerMsg += `- **Срок полной окупаемости:** ${c.paybackDays} дней\n`;
      else if (c.paybackMonths) partnerMsg += `- **Окупаемость:** ${c.paybackMonths} мес.\n`;
      if (c.maintenance) partnerMsg += `- **Серверное обслуживание:** ${c.maintenance}\n`;
      if (c.selectedExpert) partnerMsg += `- **Назначенный куратор:** ${c.selectedExpert}\n`;
      partnerMsg += `\n`;
    }

    if (pdfUrl && typeof pdfUrl === 'string' && (pdfUrl.startsWith('http') || pdfUrl.startsWith('/'))) {
      partnerMsg += `📄 **Сформированная PDF-смета:** [Открыть PDF файл](${pdfUrl})\n\n`;
    }

    if (uploadedDocUrl && typeof uploadedDocUrl === 'string' && (uploadedDocUrl.startsWith('http') || uploadedDocUrl.startsWith('/'))) {
      partnerMsg += `📎 **Прикрепленный файл ТЗ клиента:** [${uploadedDocName}](${uploadedDocUrl})\n\n`;
    }

    if (payload.comment) {
      partnerMsg += `💬 **Комментарий клиента:**\n_${payload.comment}_\n\n`;
    }

    partnerMsg += `> _Клиент направлен на квалификацию и проведение аудита. Ваше партнерское вознаграждение будет начислено после заключения сделки._\n\n`;
    partnerMsg += `⏰ \`${nowStr} (МСК)\``;

    // Append Collapsible Technical Assignment in ONE single big message
    if (expandableTz) {
      partnerMsg += `\n\n${expandableTz}`;
    }

    const partnerButtons: any[] = [];
    if (tgUser?.username) {
      partnerButtons.push([{ text: '💬 Написать клиенту', url: `https://t.me/${tgUser.username.replace('@', '')}` }]);
    }
    const partnerMarkup = partnerButtons.length > 0 ? { inline_keyboard: partnerButtons } : undefined;

    partnerNotified = await sendTelegramMessage(botToken, partnerTgId, partnerMsg, partnerMarkup);

    try {
      executeRun(`
        INSERT INTO broadcast_logs (id, chat_id, fio, telegram, message_text, status, send_time_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        `blog_${Date.now()}`,
        String(partnerTgId),
        partnerMatch.fio || partnerMatch.pseudonym || 'Партнер',
        partnerMatch.telegram || String(partnerTgId),
        partnerMsg,
        partnerNotified ? 'SENT' : 'ERROR',
        100
      ]);
    } catch (bErr) {
      console.error('[Error logging partner broadcast]', bErr);
    }
  }

  // 5. Save to BD ProTalk: crm, sav_leads, leads, sav_clients, sav_user_calculations
  try {
    const tgIdStr = tgUser?.id ? String(tgUser.id) : null;
    const fullCalcRecord = {
      leadId,
      clientName,
      phoneOrContact,
      channel,
      company,
      promo,
      pdfUrl,
      uploadedDocUrl,
      uploadedDocName,
      actions: payload.actionsHistory || [],
      businessInfo: payload.businessInfo || {},
      tariff: payload.tariff || {},
      calculator: calcData || payload.calculator || {},
      expert: payload.expert || {},
      comment: payload.comment || '',
      preferredChannel: channel,
      contactValue: phoneOrContact,
      timestamp: new Date().toISOString()
    };
    const historyJson = JSON.stringify(fullCalcRecord);

    // 5.1 sav_leads table
    executeRun(`
      INSERT OR REPLACE INTO sav_leads (
        id, telegram_id, full_name, username, telegram_url, photo_url,
        city, department, employees_count, avg_salary, functionality,
        tariff, pay_model, tariff_sum, tariff_sale, sale_percent,
        selected_expert, promo, user_biz, segment, category, sphere,
        status, status_kp, text_chat, uploaded_doc_url, uploaded_doc_name,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        'Аудит бизнеса', 'Новая заявка', ?, ?, ?,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      leadId,
      tgIdStr,
      clientName,
      tgUser?.username ? `@${tgUser.username}` : null,
      tgUser?.username ? `https://t.me/${tgUser.username}` : (tgIdStr ? `tg://user?id=${tgIdStr}` : null),
      null,
      calcData?.city || payload.city || 'Не указан',
      calcData?.department || payload.department || 'Отдел продаж',
      calcData?.employeeCount ? String(calcData.employeeCount) : (payload.employeeCount ? String(payload.employeeCount) : '1'),
      calcData?.averageSalary ? String(calcData.averageSalary) : (payload.averageSalary ? String(payload.averageSalary) : null),
      calcData?.functionality || payload.functionality || null,
      payload.tariff?.package || payload.tariff?.name || null,
      payload.tariff?.paymentType || 'monthly',
      payload.tariff?.priceBase ? String(payload.tariff.priceBase) : null,
      payload.tariff?.priceFinal ? String(payload.tariff.priceFinal) : null,
      payload.tariff?.discountPercent || 0,
      payload.expert?.pseudonym || payload.expert?.name || payload.calculator?.selectedExpert || 'Dr.White',
      promo || null,
      company,
      payload.businessInfo?.segment || 'B2C',
      payload.businessInfo?.category || 'Услуги',
      payload.businessInfo?.sphere || 'Другое',
      `Канал: ${channel} | Контакт: ${phoneOrContact} | Заявка на аудит. ${payload.comment || ''}`,
      uploadedDocUrl || null,
      uploadedDocName || null
    ]);

    // 5.2 crm table
    executeRun(`
      INSERT OR REPLACE INTO crm (
        id, fio, telegram, telegram_id, channel, chat_id,
        fio_code_tg, comment, promo, partner_code, status,
        last_message, progress, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, 'Аудит бизнеса',
        ?, 'Заявка отправлена', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `, [
      leadId,
      clientName,
      tgUser?.username || phoneOrContact,
      tgIdStr,
      channel,
      tgIdStr,
      `${clientName} [${promo || 'Прямой'}]`,
      `Канал: ${channel} | Контакт: ${phoneOrContact} | Комментарий: ${payload.comment || ''} | Тариф: ${payload.tariff?.package || '—'} | Компания: ${company}`,
      promo || null,
      partnerMatch?.partner_code || promo || null,
      `Новая заявка на бесплатный аудит бизнеса (${sourceLabel})`,
    ]);

    // 5.3 sav_user_calculations records (save both leadId and calc_${leadId})
    executeRun(`
      INSERT OR REPLACE INTO sav_user_calculations (
        id, telegram_id, calculation_type, company_name, business_description,
        segment, category, sphere, package_level, praise, data, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `, [
      leadId,
      tgIdStr ? Number(tgIdStr) || null : null,
      payload.source || 'AI_APP_DEPARTMENT_REPLACEMENT',
      company,
      payload.businessInfo?.description || calcData?.functionality || null,
      payload.businessInfo?.segment || 'B2C',
      payload.businessInfo?.category || 'Услуги',
      payload.businessInfo?.sphere || 'Другое',
      payload.tariff?.package || 'Стандарт',
      'Заявка на бесплатный аудит бизнеса принята',
      historyJson
    ]);

    executeRun(`
      INSERT OR REPLACE INTO sav_user_calculations (
        id, telegram_id, calculation_type, company_name, business_description,
        segment, category, sphere, package_level, praise, data, created_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP
      )
    `, [
      `calc_${leadId}`,
      tgIdStr ? Number(tgIdStr) || null : null,
      payload.source || 'AI_APP_DEPARTMENT_REPLACEMENT',
      company,
      payload.businessInfo?.description || calcData?.functionality || null,
      payload.businessInfo?.segment || 'B2C',
      payload.businessInfo?.category || 'Услуги',
      payload.businessInfo?.sphere || 'Другое',
      payload.tariff?.package || 'Стандарт',
      'Заявка на бесплатный аудит бизнеса принята',
      historyJson
    ]);

    // 5.4 system_logs record
    executeRun(`
      INSERT INTO system_logs (id, level, source, message)
      VALUES (?, 'INFO', 'AUDIT_REQUEST', ?)
    `, [
      `log_${Date.now()}`,
      `[Audit Request] New lead created for ${clientName} via ${channel} (${phoneOrContact}). Admin notified: ${adminNotified}, Partner notified: ${partnerNotified}`
    ]);

    // Persist DB state
    saveDb();
  } catch (dbErr) {
    console.error('[Error persisting audit lead to BD ProTalk]', dbErr);
  }

  return {
    success: true,
    leadId,
    adminNotified,
    partnerNotified
  };
}

export function escapeHtml(text: any): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
