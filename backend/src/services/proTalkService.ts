import { executeQuery, executeRun, saveDb } from '../db/database';
import { sendTelegramMessage, getBotConfig } from './telegramNotifier';
import { extractTextFromDocPayload } from './docExtractService';
import { generateCalculatorAppImageWithProTalk } from './calculator/calculatorImageService';
import fs from 'fs';
import path from 'path';

export { generateCalculatorAppImageWithProTalk } from './calculator/calculatorImageService';

/**
 * Downloads an external image (e.g. from fal.media) and saves it to local/cloud storage,
 * registering it in the BD ProTalk file_storage gallery table and returning a reliable accessible URL.
 */
export async function mirrorRemoteImageToStorage(url: string, filename?: string): Promise<string> {
  if (!url || !url.startsWith('http')) return url;
  
  try {
    const cleanFilename = filename || `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.png`;
    console.log(`[Image Mirror] Mirroring remote image to storage: ${url.slice(0, 60)}... as ${cleanFilename}`);
    
    // 1. Download image buffer
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    
    if (!res.ok) {
      console.warn(`[Image Mirror] Failed to fetch external image (${res.status})`);
      return url;
    }
    
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return url;
    
    const contentType = res.headers.get('content-type') || 'image/png';
    const uploadToken = "b2RdUnRrWlFha1h3GHMhU2Y5GCsuGxAULisQKl0tNCo3BTJ4FSNQGCwLFxRuPRQYaGtdWGtjUgVvAH9YAmk";
    
    // 2. Upload to ProTalk Cloud Storage via official gateway
    let cloudUrl = '';
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: contentType });
      formData.append('file', blob, cleanFilename);
      
      const upRes = await fetch("https://file.pro-talk.ru/tgf", {
        method: 'POST',
        headers: {
          'X-Upload-Token': uploadToken,
          'X-Preserve-Alpha': 'true'
        },
        body: formData
      });
      
      if (upRes.ok) {
        const text = await upRes.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          cloudUrl = text.trim();
        } else {
          try {
            const data = JSON.parse(text);
            cloudUrl = (data as any)?.url || (data as any)?.file_url || '';
          } catch {}
        }
      }
      
      if (!cloudUrl) {
        const fbRes = await fetch("https://file.pro-talk.ru/upload_tmp", {
          method: 'POST',
          headers: { 'X-Upload-Token': uploadToken, 'X-Preserve-Alpha': 'true' },
          body: formData
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json().catch(() => ({}));
          cloudUrl = (fbData as any)?.url || (fbData as any)?.file_url || '';
        }
      }
    } catch (upErr) {
      console.warn('[Image Mirror Cloud Upload Note]', upErr);
    }
    
    // 3. Save into local file_storage table as backup and gallery reference
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let fileKey = '';
    for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));
    
    const finalUrl = cloudUrl || url;
    try {
      executeRun(`
        INSERT INTO file_storage (file_key, name, slug, original_url, mime_type, file_size, folder_id)
        VALUES (?, ?, ?, ?, ?, ?, 4)
      `, [fileKey, cleanFilename, cleanFilename, finalUrl, contentType, buffer.length]);
      saveDb();
    } catch (_) {}
    
    return finalUrl;
  } catch (err) {
    console.warn('[Image Mirror Overall Warning]', err);
    return url;
  }
}

export interface ProTalkConfig {
  bot_id: number;
  bot_token: string;
  gateway_url: string;
  timeout_seconds: number;
  poll_interval_seconds: number;
  log_url?: string;
  function_id?: number;
  functions_base_id?: string;
  proxy_tasks_url?: string;
}

/**
 * Generates an 11-digit numeric unique code (UID) for guests / unauthenticated users
 */
export function generateNumericUID(): string {
  const min = 10000000000;
  const max = 99999999999;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
}

export interface ProTalkClassificationResult {
  company_name?: string;
  segment: 'B2B' | 'B2C';
  category: 'Товары' | 'Услуги';
  sphere: string;
  description: string;
  praise: string;
  package: string;
  image_url?: string;
  rawReply?: string;
  bot_chat_id: string;
  source: 'protalk' | 'database_fallback';
  matched_tariff?: any;
}

export const PROXY_TASKS_URL = process.env.PROTALK_PROXY_TASKS_URL || "https://eu1.account.dialog.ai.atiks.org/proxy/tasks";
export const DEFAULT_PROTALK_LOG_URL = process.env.PROTALK_LOG_URL || "https://docs.google.com/spreadsheets/d/1veEGt8f-4O0sNaFgNLjbUFmnf0CquaoIbjAMIXkt0LU/edit?usp=sharing";
export const DEFAULT_PROTALK_FUNCTION_ID = Number(process.env.PROTALK_FUNCTION_ID) || 621;
export const DEFAULT_PROTALK_FUNCTIONS_BASE_ID = process.env.PROTALK_FUNCTIONS_BASE_ID || "appkq3HrzrxYxoAV8";

const DEFAULT_PROTALK_BOT_ID = Number(process.env.PROTALK_BOT_ID) || 72220;
const DEFAULT_PROTALK_TOKEN = process.env.PROTALK_BOT_TOKEN || "BIUTUa499JhVgwmcsY6tRLy4WExXuSX6";
const DEFAULT_GATEWAY_URL = "https://api.pro-talk.ru";
const DEFAULT_TELEGRAM_BOT_TOKEN = "7656117989:AAFg2ThSRkaHFFOUp0EmxU3kMSBbIgrRn6o";

/**
 * Checks if a message from ProTalk is a system notification, greeting, reasoning, dialog status, or upstream provider error
 */
export function isProTalkNoise(text: string): boolean {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;

  // Upstream AI provider errors (e.g. OpenAI/Azure 400 download file errors, rate limits, invalid requests)
  if (/API error:\s*Error code/i.test(trimmed)) return true;
  if (/Provider returned error/i.test(trimmed)) return true;
  if (/Error while downloading file/i.test(trimmed)) return true;
  if (/invalid_request_error/i.test(trimmed)) return true;
  if (/Upstream status code:\s*404/i.test(trimmed)) return true;
  if (/param['":\s]+url/i.test(trimmed)) return true;
  if (/Failed to generate/i.test(trimmed)) return true;
  if (/Rate limit exceeded/i.test(trimmed)) return true;
  if (/^\{.*"error":\s*\{/s.test(trimmed)) return true;

  // Dialog state messages (e.g. "Dialog state: STARTED", "Dialog state: NOT STARTED")
  if (/^Dialog state:\s*/i.test(trimmed)) return true;

  // AI Reasoning blocks (e.g. "AI Reasoning (None): None", "AI Reasoning ...")
  if (/^AI Reasoning\b/i.test(trimmed)) return true;

  // Standalone greeting messages
  if (/^(Здравствуйте|Привет|Приветствую|Добрый день|Добрый вечер|Доброго времени суток)[.!]?$/i.test(trimmed)) return true;

  // Literal 'None' or empty brackets
  if (trimmed === 'None' || trimmed === 'null' || trimmed === '{}') return true;

  return false;
}

/**
 * Extracts image URL from markdown link, sample_url in JSON/function_result/Reask after run function, fal.media, or direct S3 link
 */
export function extractImageUrlFromText(input: any): string | null {
  if (!input) return null;

  // Helper to normalize and sanitize extracted URL
  const cleanUrl = (u: string): string | null => {
    if (!u) return null;
    let url = u.trim().replace(/[\\)>,"';]+$/, '');
    // Ensure all &amp; are replaced with &
    url = url.replace(/&amp;/g, '&');
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return null;
  };

  // Direct object inspection if input is an object
  if (typeof input === 'object' && input !== null) {
    if (Array.isArray(input.result?.images) && input.result.images[0]?.url) {
      const u = cleanUrl(input.result.images[0].url);
      if (u) return u;
    }
    if (Array.isArray(input.images) && input.images[0]?.url) {
      const u = cleanUrl(input.images[0].url);
      if (u) return u;
    }
    if (input.result?.sample_url) {
      const u = cleanUrl(input.result.sample_url);
      if (u) return u;
    }
    if (input.result?.url) {
      const u = cleanUrl(input.result.url);
      if (u) return u;
    }
    if (input.sample_url) {
      const u = cleanUrl(input.sample_url);
      if (u) return u;
    }
    if (input.url) {
      const u = cleanUrl(input.url);
      if (u) return u;
    }
  }

  const rawString = typeof input === 'string' ? input : JSON.stringify(input);
  if (!rawString || !rawString.trim()) return null;

  // Unescape backslashes, unicode and HTML entities in query strings
  const cleanText = rawString
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\//g, '/')
    .replace(/\\u0026/g, '&')
    .replace(/&amp;/g, '&');

  // 1. Explicit search for fal.media links
  const falMatch = cleanText.match(/(https?:\/\/[a-zA-Z0-9.\-_]*fal\.media\/files\/[^\s"')\]\\]+)/i);
  if (falMatch && falMatch[1]) {
    const url = cleanUrl(falMatch[1]);
    if (url) return url;
  }

  // 2. Explicit search for sample_url or sample in [Reask after run function] or function_result
  const sampleUrlMatch = cleanText.match(/['"]?(?:sample_url|sample)['"]?\s*[:=]\s*['"]?(https?:\/\/[^\s'"\}\]\)\>]+)/i);
  if (sampleUrlMatch && sampleUrlMatch[1]) {
    const url = cleanUrl(sampleUrlMatch[1]);
    if (url) return url;
  }

  // 3. AWS S3 bucket links (comet-api-bucket or any amazonaws.com / cloudfront image link)
  const s3Match = cleanText.match(/(https?:\/\/(?:comet-api-bucket|[a-zA-Z0-9.\-_]+)\.s3[a-zA-Z0-9.\-_]*\.amazonaws\.com\/images\/[^\s"')\]\\]+)/i) ||
                  cleanText.match(/(https?:\/\/[a-zA-Z0-9.\-_]*amazonaws\.com\/[^\s"')\]\\]+)/i) ||
                  cleanText.match(/(https?:\/\/[a-zA-Z0-9.\-_]*cloudfront\.net\/[^\s"')\]\\]+)/i);
  if (s3Match && s3Match[1]) {
    const url = cleanUrl(s3Match[1]);
    if (url) return url;
  }

  // 4. Generic image keys in JSON / function call dictionary: image_url, photo_url, output_url, etc.
  const generalKeyMatch = cleanText.match(/['"]?(?:image_url|photo_url|file_url|url|image|output_url|result_url|image_link)['"]?\s*[:=]\s*['"]?(https?:\/\/[^\s'"\}\]\)\>]+)/i);
  if (generalKeyMatch && generalKeyMatch[1]) {
    const url = cleanUrl(generalKeyMatch[1]);
    if (url) return url;
  }

  // 5. Markdown link or image: ![...](https://...) or [...](https://...)
  const mdMatch = cleanText.match(/!?\[[^\]]*\]\((https?:\/\/[^\s\)]+)\)/i);
  if (mdMatch && mdMatch[1]) {
    const url = cleanUrl(mdMatch[1]);
    if (url) return url;
  }

  // 6. Direct image extension URL (with or without query parameters)
  const directMatch = cleanText.match(/(https?:\/\/[^\s"')\]\\]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s"')\]\\]*)?)/i);
  if (directMatch && directMatch[1]) {
    const url = cleanUrl(directMatch[1]);
    if (url) return url;
  }

  // 7. Generic https image/media links (e.g. flux / generated / image)
  const mediaMatch = cleanText.match(/(https?:\/\/[^\s"')\]\\]*(?:image|flux|media|generated)[^\s"')\]\\]*)/i);
  if (mediaMatch && mediaMatch[1]) {
    const url = cleanUrl(mediaMatch[1]);
    if (url && (url.includes('.jpg') || url.includes('.png') || url.includes('.webp') || url.includes('s3') || url.includes('images/') || url.includes('fal.media'))) {
      return url;
    }
  }

  return null;
}

/**
 * Extracts and parses tariff packages JSON from arbitrary LLM response
 */
export function extractTariffPackagesJson(text: string): any | null {
  if (!text) return null;
  const raw = typeof text === 'string' ? text : JSON.stringify(text);

  // Helper to normalize and validate packages payload
  const normalize = (data: any): any | null => {
    if (!data) return null;
    if (Array.isArray(data) && data.length > 0 && (data[0].package || data[0].name || data[0].custom_title)) {
      return { packages: data };
    }
    if (Array.isArray(data.packages) && data.packages.length > 0) return data;
    if (Array.isArray(data.tariffs) && data.tariffs.length > 0) return { packages: data.tariffs };
    if (Array.isArray(data.plans) && data.plans.length > 0) return { packages: data.plans };
    return null;
  };

  // Strip markdown code fences if present
  let cleanText = raw.trim();
  const mdMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (mdMatch) {
    cleanText = mdMatch[1].trim();
  }

  // 1. Direct JSON parse
  try {
    const parsed = JSON.parse(cleanText);
    const norm = normalize(parsed);
    if (norm) return norm;
  } catch (_) {}

  // 2. Find any { ... "packages" ... } block with balanced brackets or regex
  const pkgMatch = raw.match(/\{[\s\S]*?"(?:packages|tariffs|plans)"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  if (pkgMatch) {
    try {
      const parsed = JSON.parse(pkgMatch[0]);
      const norm = normalize(parsed);
      if (norm) return norm;
    } catch (_) {
      try {
        const cleaned = pkgMatch[0]
          .replace(/,\s*}/g, '}')
          .replace(/,\s*]/g, ']');
        const parsed = JSON.parse(cleaned);
        const norm = normalize(parsed);
        if (norm) return norm;
      } catch (_) {}
    }
  }

  // 3. Find top-level array of objects [ { ... "package" ... } ]
  const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      const norm = normalize(parsed);
      if (norm) return norm;
    } catch (_) {
      try {
        const cleaned = arrayMatch[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
        const parsed = JSON.parse(cleaned);
        const norm = normalize(parsed);
        if (norm) return norm;
      } catch (_) {}
    }
  }

  // 4. Fallback search across all JSON-like objects in text
  const jsonBlocks = raw.match(/\{[\s\S]*\}/g);
  if (jsonBlocks) {
    for (const b of jsonBlocks) {
      try {
        const parsed = JSON.parse(b);
        const norm = normalize(parsed);
        if (norm) return norm;
      } catch (_) {}
    }
  }

  return null;
}

/**
 * Extracts and parses classification JSON from arbitrary LLM response
 */
export function extractClassificationJson(text: string): any | null {
  if (!text) return null;

  // Try direct parse first
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && (parsed.segment || parsed.category || parsed.sphere || parsed.description || parsed.praise || parsed.packages)) {
        return parsed;
      }
    }
  } catch (_) {}

  // Check tariff packages first if present
  const pkgParsed = extractTariffPackagesJson(text);
  if (pkgParsed) return pkgParsed;

  // Search for JSON block within text
  const jsonMatches = text.match(/\{[\s\S]*?\}(?!\s*\{)/g) || text.match(/\{[\s\S]*\}/g);
  if (jsonMatches) {
    for (const candidate of jsonMatches) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && (parsed.segment || parsed.category || parsed.sphere || parsed.description || parsed.praise || parsed.packages)) {
          return parsed;
        }
      } catch (e) {
        // Clean trailing commas
        try {
          const cleaned = candidate
            .replace(/,\s*}/g, '}')
            .replace(/,\s*]/g, ']');
          const parsed = JSON.parse(cleaned);
          if (parsed && typeof parsed === 'object' && (parsed.segment || parsed.category || parsed.sphere || parsed.description || parsed.praise || parsed.packages)) {
            return parsed;
          }
        } catch (_) {}
      }
    }
  }

  return null;
}

/**
 * Loads ProTalk configuration from BD ProTalk database (ai_agent_configs as primary source of truth)
 */
export function getProTalkConfig(): ProTalkConfig {
  try {
    // 1. Prioritize ai_agent_configs table
    const configs = executeQuery("SELECT * FROM ai_agent_configs WHERE agent_key = 'protalk' OR provider = 'protalk' OR is_active = 1 ORDER BY (agent_key = 'protalk') DESC, is_active DESC, updated_at DESC LIMIT 1");
    if (configs && configs.length > 0) {
      const cfg = configs[0];
      let bot_id = Number(cfg.employee_id || cfg.bot_id) || DEFAULT_PROTALK_BOT_ID;
      let bot_token = String(cfg.api_token || cfg.bot_token || DEFAULT_PROTALK_TOKEN);
      let gateway_url = String(cfg.gateway_url || DEFAULT_GATEWAY_URL);
      let timeout = 300;
      let poll_interval = 1;
      let log_url = cfg.log_url || DEFAULT_PROTALK_LOG_URL;
      let function_id = Number(cfg.function_id) || DEFAULT_PROTALK_FUNCTION_ID;
      let functions_base_id = cfg.functions_base_id || DEFAULT_PROTALK_FUNCTIONS_BASE_ID;
      let proxy_tasks_url = cfg.proxy_tasks_url || PROXY_TASKS_URL;

      if (cfg.extra_config) {
        try {
          const parsed = typeof cfg.extra_config === 'string' ? JSON.parse(cfg.extra_config) : cfg.extra_config;
          if (parsed.bot_id || parsed.employee_id) bot_id = Number(parsed.employee_id || parsed.bot_id);
          if (parsed.bot_token || parsed.api_token) bot_token = String(parsed.api_token || parsed.bot_token);
          if (parsed.gateway_url) gateway_url = String(parsed.gateway_url);
          if (parsed.timeout) timeout = Number(parsed.timeout);
          if (parsed.poll_interval) poll_interval = Number(parsed.poll_interval);
          if (parsed.log_url) log_url = String(parsed.log_url);
          if (parsed.function_id) function_id = Number(parsed.function_id);
          if (parsed.functions_base_id) functions_base_id = String(parsed.functions_base_id);
          if (parsed.proxy_tasks_url) proxy_tasks_url = String(parsed.proxy_tasks_url);
        } catch (e) {}
      }

      return {
        bot_id: bot_id || DEFAULT_PROTALK_BOT_ID,
        bot_token: bot_token || DEFAULT_PROTALK_TOKEN,
        gateway_url: gateway_url || DEFAULT_GATEWAY_URL,
        timeout_seconds: timeout,
        poll_interval_seconds: poll_interval,
        log_url: log_url || DEFAULT_PROTALK_LOG_URL,
        function_id: function_id || DEFAULT_PROTALK_FUNCTION_ID,
        functions_base_id: functions_base_id || DEFAULT_PROTALK_FUNCTIONS_BASE_ID,
        proxy_tasks_url: proxy_tasks_url || PROXY_TASKS_URL
      };
    }

    // 2. Check protalk_config table as fallback
    const ptConfigs = executeQuery("SELECT * FROM protalk_config WHERE is_active = 1 ORDER BY is_default DESC, created_at DESC LIMIT 1");
    if (ptConfigs && ptConfigs.length > 0) {
      const cfg = ptConfigs[0];
      return {
        bot_id: Number(cfg.bot_id) || DEFAULT_PROTALK_BOT_ID,
        bot_token: String(cfg.bot_token || DEFAULT_PROTALK_TOKEN),
        gateway_url: String(cfg.gateway_url || DEFAULT_GATEWAY_URL),
        timeout_seconds: 300,
        poll_interval_seconds: 1,
        log_url: String(cfg.log_url || DEFAULT_PROTALK_LOG_URL),
        function_id: Number(cfg.function_id) || DEFAULT_PROTALK_FUNCTION_ID,
        functions_base_id: String(cfg.functions_base_id || DEFAULT_PROTALK_FUNCTIONS_BASE_ID),
        proxy_tasks_url: String(cfg.proxy_tasks_url || PROXY_TASKS_URL)
      };
    }

    const botSettings = executeQuery("SELECT * FROM bot_settings WHERE id = 'protalk_bot' OR bot_username = '72220' LIMIT 1");
    if (botSettings && botSettings.length > 0) {
      const bs = botSettings[0];
      return {
        bot_id: Number(bs.bot_username) || DEFAULT_PROTALK_BOT_ID,
        bot_token: bs.token || DEFAULT_PROTALK_TOKEN,
        gateway_url: DEFAULT_GATEWAY_URL,
        timeout_seconds: 300,
        poll_interval_seconds: 1,
        log_url: DEFAULT_PROTALK_LOG_URL,
        function_id: DEFAULT_PROTALK_FUNCTION_ID,
        functions_base_id: DEFAULT_PROTALK_FUNCTIONS_BASE_ID,
        proxy_tasks_url: PROXY_TASKS_URL
      };
    }
  } catch (err) {
    console.error('Error fetching ProTalk config from DB:', err);
  }

  return {
    bot_id: DEFAULT_PROTALK_BOT_ID,
    bot_token: DEFAULT_PROTALK_TOKEN,
    gateway_url: DEFAULT_GATEWAY_URL,
    timeout_seconds: 300,
    poll_interval_seconds: 1,
    log_url: DEFAULT_PROTALK_LOG_URL,
    function_id: DEFAULT_PROTALK_FUNCTION_ID,
    functions_base_id: DEFAULT_PROTALK_FUNCTIONS_BASE_ID,
    proxy_tasks_url: PROXY_TASKS_URL
  };
}

export const VALID_SPHERES = [
  'Строительство',
  'Здоровье',
  'Производство',
  'Образование',
  'Реклама',
  'Транспорт',
  'Технологии',
  'Досуг',
  'Торговля',
  'Другое'
] as const;

export const VALID_CATEGORIES = ['Товары', 'Услуги'] as const;
export const VALID_SEGMENTS = ['B2B', 'B2C'] as const;
export const VALID_PACKAGES = ['Лайт', 'Эконом', 'Стандарт', 'Премиум', 'VIP'] as const;

/**
 * Retrieves the prompt configuration (system prompt and user prompt template) from BD ProTalk protalk_promts or ai_prompts table
 */
export function getPromptConfigByKey(promptKey: string): { systemPrompt: string; userPromptTemplate: string; rules?: string } | null {
  try {
    const ptPrompts = executeQuery("SELECT system_prompt, user_prompt_template, rules FROM protalk_prompts WHERE prompt_key = ? AND is_active = 1 LIMIT 1", [promptKey]);
    if (ptPrompts && ptPrompts.length > 0 && ptPrompts[0].system_prompt) {
      return {
        systemPrompt: ptPrompts[0].system_prompt,
        userPromptTemplate: ptPrompts[0].user_prompt_template || '',
        rules: ptPrompts[0].rules || ''
      };
    }
  } catch (e) {}

  try {
    const ptRows = executeQuery("SELECT system_prompt, user_prompt_template, rules FROM protalk_promts WHERE prompt_key = ? AND is_active = 1 LIMIT 1", [promptKey]);
    if (ptRows && ptRows.length > 0 && ptRows[0].system_prompt) {
      return {
        systemPrompt: ptRows[0].system_prompt,
        userPromptTemplate: ptRows[0].user_prompt_template || '',
        rules: ptRows[0].rules || ''
      };
    }
  } catch (e) {}

  try {
    const rows = executeQuery("SELECT system_prompt, user_prompt_template, rules FROM ai_prompts WHERE prompt_key = ? AND is_active = 1 LIMIT 1", [promptKey]);
    if (rows && rows.length > 0 && rows[0].system_prompt) {
      return {
        systemPrompt: rows[0].system_prompt,
        userPromptTemplate: rows[0].user_prompt_template || '',
        rules: rows[0].rules || ''
      };
    }
  } catch (e) {}

  return null;
}

/**
 * Retrieves the classification prompt from BD ProTalk protalk_promts or ai_prompts table
 */
export function getPromptByKey(promptKey: string): string {
  try {
    const cfg = getPromptConfigByKey(promptKey);
    if (cfg?.systemPrompt) return cfg.systemPrompt;
  } catch (e) {}

  return `Ты — ведущий системный архитектор. Проанализируй бизнес клиента и классифицируй его строго по спискам:
1. segment: строго "B2B" или "B2C"
2. category: строго "Товары" или "Услуги"
3. sphere: строго одна из 10 сфер: "Строительство", "Здоровье", "Производство", "Образование", "Реклама", "Транспорт", "Технологии", "Досуг", "Торговля", "Другое"
4. description: краткое (2-3 предложения) описание архитектуры ИИ-продавца и конкретные стартовые рекомендации, куда именно внедрить ИИ в этом бизнесе (квалификация лидов, первичный диалог, сбор параметров, авто-дожим)
5. praise: вдохновляющий комплимент конкретному бизнесу клиента, его нише и перспективам роста выручки (НЕ хвали SAV AI, НЕ упоминай ProTalk, хвали только бизнес и подход клиента)
6. package: "Лайт" | "Эконом" | "Стандарт" | "Премиум" | "VIP"

Ответь СТРОГО чистым JSON без markdown:
{"segment": "B2B"|"B2C", "category": "Товары"|"Услуги", "sphere": "...", "description": "...", "praise": "...", "package": "..."}`;
}

/**
 * Sends asynchronous message to ProTalk bot API and logs to protalk_logs
 */
export async function sendProTalkMessageAsync(
  bot_chat_id: string,
  message: string,
  user_social_id?: string,
  channel_name?: string
): Promise<any> {
  const config = getProTalkConfig();
  const url = `${config.gateway_url.replace(/\/+$/, '')}/api/v1.0/send_message_async`;

  const payload = {
    bot_id: config.bot_id,
    bot_token: config.bot_token,
    bot_chat_id,
    chat_id: bot_chat_id,
    Chat_id: bot_chat_id,
    channel_id: bot_chat_id,
    message
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const promptLen = (message || '').length;
  const tokensIn = Math.ceil(promptLen / 4) + 120;
  const logUrl = config.log_url || DEFAULT_PROTALK_LOG_URL;
  const finalChannelName = channel_name || 'SAV AI App';

  if (!response.ok) {
    const errText = await response.text();
    // Log error in protalk_logs with all columns
    try {
      executeRun(`
        INSERT INTO protalk_logs (
          channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
          tokens_total, tokens_in_source, tokens_out_source, tokens_user, rub, function_error,
          log_url, log_chat_id, server_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        bot_chat_id,
        user_social_id || 'web_guest',
        message.substring(0, 2000),
        null,
        finalChannelName,
        String(config.bot_id || '72220'),
        'ProTalk LLM',
        '••••••••',
        tokensIn,
        tokensIn,
        0,
        tokensIn,
        0,
        `HTTP ${response.status}: ${errText}`,
        logUrl,
        bot_chat_id,
        'api.pro-talk.ru'
      ]);
      saveDb();
    } catch (logErr) {}

    throw new Error(`ProTalk send_message_async HTTP ${response.status}: ${errText}`);
  }

  const jsonResult = await response.json();

  // Log outgoing request immediately to protalk_logs so it appears in logs right away with all columns
  try {
    const rubEst = Math.round((tokensIn * 300.0 / 10000000.0) * 1000000) / 1000000;
    executeRun(`
      INSERT INTO protalk_logs (
        channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
        tokens_total, tokens_in_source, tokens_out_source, tokens_user, rub,
        log_url, log_chat_id, server_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      bot_chat_id,
      user_social_id || 'web_client',
      message.substring(0, 2000),
      'Ожидание ответа от нейросети ProTalk...',
      finalChannelName,
      String(config.bot_id || '72220'),
      'ProTalk LLM',
      '••••••••',
      tokensIn,
      tokensIn,
      0,
      tokensIn,
      rubEst,
      logUrl,
      bot_chat_id,
      'api.pro-talk.ru'
    ]);
    saveDb();
  } catch (logErr) {}

  return jsonResult;
}

/**
 * Gets last reply from ProTalk bot for a given chat_id and logs tokens to protalk_logs
 */
export async function getProTalkLastReply(
  bot_chat_id: string,
  user_social_id?: string,
  user_message?: string,
  channel_name?: string
): Promise<{ message?: string; [key: string]: any }> {
  const config = getProTalkConfig();
  const url = `${config.gateway_url.replace(/\/+$/, '')}/api/v1.0/get_last_reply`;

  const payload = {
    bot_id: config.bot_id,
    bot_token: config.bot_token,
    bot_chat_id,
    chat_id: bot_chat_id,
    Chat_id: bot_chat_id
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ProTalk get_last_reply HTTP ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const logUrl = config.log_url || DEFAULT_PROTALK_LOG_URL;
  const finalChannelName = channel_name || 'SAV AI App';

  if (result && result.message) {
    const promptLen = (user_message || '').length;
    const replyLen = result.message.length;
    const tokensIn = Math.ceil(promptLen / 4) + 120;
    const tokensOut = Math.ceil(replyLen / 4);
    const tokensTotal = tokensIn + tokensOut;
    const rub = Math.round((tokensTotal * 300.0 / 10000000.0) * 1000000) / 1000000;

    try {
      // First try to update existing "Ожидание ответа..." row for this chat
      const updateRes = executeRun(`
        UPDATE protalk_logs
        SET bot_reply = ?, tokens_out_source = ?, tokens_total = tokens_in_source + ?, tokens_user = tokens_in_source + ?, rub = ?,
            log_url = COALESCE(log_url, ?), log_chat_id = COALESCE(log_chat_id, ?), channel_name = COALESCE(?, channel_name)
        WHERE id = (
          SELECT id FROM protalk_logs 
          WHERE channel_id = ? AND (bot_reply LIKE '%Ожидание ответа%' OR bot_reply IS NULL)
          ORDER BY id DESC LIMIT 1
        )
      `, [result.message, tokensOut, tokensOut, tokensOut, rub, logUrl, bot_chat_id, finalChannelName, bot_chat_id]);

      if (!updateRes || updateRes.changes === 0) {
        executeRun(`
          INSERT INTO protalk_logs (
            channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
            tokens_total, tokens_in_source, tokens_out_source, tokens_user, rub,
            log_url, log_chat_id, server_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          bot_chat_id,
          user_social_id || 'web_user',
          (user_message || 'Запрос в чат ProTalk').substring(0, 2000),
          result.message,
          finalChannelName,
          String(config.bot_id || '72220'),
          'ProTalk LLM',
          '••••••••',
          tokensTotal,
          tokensIn,
          tokensOut,
          tokensTotal,
          rub,
          logUrl,
          bot_chat_id,
          'api.pro-talk.ru'
        ]);
      }
      saveDb();
    } catch (logErr) {}
  }

  return result;
}

/**
 * Formats the business image generation prompt using templates from BD ProTalk ai_prompts / protalk_promts
 * Supports distinct prompts for AI Seller ('seller') and AI Applications ('app')
 */
export function getBusinessImagePrompt(
  companyName: string,
  businessDescription: string,
  mode: 'seller' | 'app' = 'seller'
): string {
  const cleanCompany = (companyName || '').trim();
  let cleanDescription = (businessDescription || '').trim();

  // If businessDescription contains verbose ТЗ or legacy prefix, extract clean department, employees and product
  if (cleanDescription.includes('Задачи и ТЗ:') || cleanDescription.includes('### 1.') || cleanDescription.includes('Автономное ИИ-приложение на React + BD ProTalk (PostgreSQL)')) {
    const deptMatch = cleanDescription.match(/подразделения\s*[«"']([^»"']+)["'»]/i);
    const empMatch = cleanDescription.match(/(\d+)\s*сотрудник/i);
    const prodMatch = cleanDescription.match(/продукт:\s*([^\.\n]+)/i);

    const dept = deptMatch ? deptMatch[1] : 'Отдел продаж';
    const emp = empMatch ? empMatch[1] : '3';
    let prod = prodMatch ? prodMatch[1].trim().replace(/^["']|["']$/g, '') : '';
    if (prod.includes('Задачи и ТЗ')) prod = prod.split('Задачи и ТЗ')[0].trim();
    if (prod.includes('###')) prod = prod.split('###')[0].trim();
    prod = prod.replace(/[.,;]+$/, '').trim();

    cleanDescription = `для роботизации подразделения «${dept}» (${emp} сотрудников), продукт: "${prod || 'Аренда обученных руководителей отделов продаж с наставничеством, отчётностью и контролем KPI'}"`;
  }

  let template = '';

  if (mode === 'seller') {
    // 1. Dedicated prompt for AI Seller (photo of robot seller and couple, steampunk, business theme, sign with company name)
    try {
      const rows = executeQuery("SELECT system_prompt FROM ai_prompts WHERE prompt_key IN ('protalk_seller_image', 'ai_seller_image') AND is_active = 1 LIMIT 1");
      if (rows && rows.length > 0 && rows[0].system_prompt) {
        template = rows[0].system_prompt;
      } else {
        const ptRows = executeQuery("SELECT system_prompt FROM protalk_promts WHERE prompt_key IN ('protalk_seller_image', 'ai_seller_image') AND is_active = 1 LIMIT 1");
        if (ptRows && ptRows.length > 0 && ptRows[0].system_prompt) {
          template = ptRows[0].system_prompt;
        } else {
          const ptPrompts = executeQuery("SELECT system_prompt FROM protalk_prompts WHERE prompt_key IN ('protalk_seller_image', 'ai_seller_image') AND is_active = 1 LIMIT 1");
          if (ptPrompts && ptPrompts.length > 0 && ptPrompts[0].system_prompt) {
            template = ptPrompts[0].system_prompt;
          }
        }
      }
    } catch (e) {}

    if (!template) {
      template = 'Нарисуй высокодетализированную фотографию, снятую на профессиональную камеру, с сюжетом с продавцом-роботом и семейную пару покупателей, сюжет и окружение реалистичны для бизнеса по теме (тут информация о бизнесе из поля) в стиле steampunk и четкую надпись "(тут название компании)" как вывеска по центру на заднем плане. Стиль стимпанк с фотореализмом. Робот имеет изысканные золотые и белые цвета в металле, латунные шестерни. Окружение в золотых, сепия и металлических стимпанк тонах. Освещение — золотой час с объемным мягким светом. Негативный промпт: инфографика, диаграммы, посторонний текст, водяные знаки, схемы, стрелки, размытие, деформации. Разрешение 1280x720, соотношение сторон 16:9.';
    }

    let prompt = template;
    const businessTopic = cleanDescription || 'автономные продажи и консультирование клиентов';

    prompt = prompt
      .replace(/(\(тут информация о бизнесе из поля\)|\{\{business_description\}\}|\{business_description\}|\(тут описание бизнеса\))/g, businessTopic);

    if (cleanCompany) {
      prompt = prompt
        .replace(/["']?\(тут название компании\)["']?/g, `"${cleanCompany}"`)
        .replace(/«\(тут название компании\)»/g, `"${cleanCompany}"`)
        .replace(/\{\{company_name\}\}|\{company_name\}/g, cleanCompany);
    } else {
      prompt = prompt
        .replace(/и четкую надпись ["']?(\(тут название компании\)|\{\{company_name\}\}|\{company_name\})["']? как вывеска по центру на заднем плане[.,]?/g, '')
        .replace(/и надпись ["']?(\(тут название компании\)|\{\{company_name\}\}|\{company_name\})["']? как вывеска по центру на заднем плане[.,]?/g, '')
        .replace(/["']?\(тут название компании\)["']?/g, '')
        .replace(/\{\{company_name\}\}|\{company_name\}/g, '');
    }

    return prompt.replace(/\s+/g, ' ').trim();
  } else {
    // 2. Dedicated prompt for AI Applications (digital interface mockup collage desktop + mobile Liquid Glass)
    try {
      const rows = executeQuery("SELECT system_prompt FROM ai_prompts WHERE prompt_key IN ('protalk_app_image', 'protalk_calculator_image_gen', 'protalk_business_image', 'protalk_image_generator') AND is_active = 1 LIMIT 1");
      if (rows && rows.length > 0 && rows[0].system_prompt) {
        template = rows[0].system_prompt;
      } else {
        const ptRows = executeQuery("SELECT system_prompt FROM protalk_promts WHERE prompt_key IN ('protalk_app_image', 'protalk_calculator_image_gen', 'protalk_business_image', 'protalk_image_generator') AND is_active = 1 LIMIT 1");
        if (ptRows && ptRows.length > 0 && ptRows[0].system_prompt) {
          template = ptRows[0].system_prompt;
        } else {
          const ptPrompts = executeQuery("SELECT system_prompt FROM protalk_prompts WHERE prompt_key IN ('protalk_app_image', 'protalk_calculator_image_gen', 'protalk_business_image', 'protalk_image_generator') AND is_active = 1 LIMIT 1");
          if (ptPrompts && ptPrompts.length > 0 && ptPrompts[0].system_prompt) {
            template = ptPrompts[0].system_prompt;
          }
        }
      }
    } catch (e) {}

    if (!template) {
      template = 'Создай высокодетализированный презентационный концепт-арт и макет цифрового интерфейса автономной ИИ-системы для бизнеса с названием компании «{{company_name}}» {{business_description}}. На едином горизонтальном кадре формата 16:9 представлен эстетичный коллаж экранов системы одновременно в мобильном виде и в виде десктопной ПК-версии. Минимум текста и текстовых блоков - лучше исключить текстовые поля на иконки приложения, только название приложения по названию компании. Премиальный технологичный дизайн в стиле Liquid Glass, золотые и глубокие темные стеклянные полупрозрачные панели, неоновые акценты, кристально чистая визуализация интерфейса UI/UX. Стимпанк стиль и робот на фоне приложения в стимпанк гоглах сюжетно по теме работы подразделения.';
    }

    let prompt = template;
    if (cleanCompany) {
      prompt = prompt
        .replace(/\{\{company_name\}\}|\{company_name\}|\(тут название компании\)/g, cleanCompany)
        .replace(/\{\{business_description\}\}|\{business_description\}|\(тут описание бизнеса\)|\(тут информация о бизнесе из поля\)/g, cleanDescription);
    } else {
      prompt = prompt
        .replace(/для бизнеса ["']?(\{\{company_name\}\}|\{company_name\}|\(тут название компании\))["']?/g, 'для бизнеса')
        .replace(/и надпись ["']?(\{\{company_name\}\}|\{company_name\}|\(тут название компании\))["']? как вывеска по центру на заднем плане[.,]?/g, '')
        .replace(/и четкую надпись ["']?(\{\{company_name\}\}|\{company_name\}|\(тут название компании\))["']? как вывеска по центру на заднем плане[.,]?/g, '')
        .replace(/вывеска с названием компании ["']?(\{\{company_name\}\}|\{company_name\}|\(тут название компании\))["']?[.,]?/g, 'вывеска')
        .replace(/\{\{company_name\}\}|\{company_name\}|\(тут название компании\)/g, '')
        .replace(/\{\{business_description\}\}|\{business_description\}|\(тут описание бизнеса\)|\(тут информация о бизнесе из поля\)/g, cleanDescription);
    }

    return prompt.replace(/\s+/g, ' ').trim();
  }
}

/**
 * Generates a unique task ID for ProTalk long-running tasks
 */
export function generateTaskId(functionId: number = 621): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomStr = '';
  for (let i = 0; i < 9; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `f${functionId}_task_${randomStr}`;
}

/**
 * Option 1: Long Polling implementation via proxy tasks and get_function_result
 */
export async function runFunctionApiLong(
  functionId: number,
  botId: number,
  botToken: string,
  args: {
    prompt: string;
    log_url?: string;
    log_chat_id?: string;
    aspect_ratio?: string;
    output_format?: string;
    [key: string]: any;
  },
  host: string = "api.pro-talk.ru",
  timeoutSeconds: number = 60,
  functionsBaseId: string = "appkq3HrzrxYxoAV8",
  proxyTasksUrl: string = PROXY_TASKS_URL
): Promise<{ success: boolean; url?: string; result?: any; error?: string; task_id: string }> {
  const taskId = generateTaskId(functionId);
  const start = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  try {
    // 1. Task initialization via PROXY_TASKS_URL
    const proxyPayload = {
      bot_id: botId,
      bot_token: botToken,
      task_type: "api_call",
      repeat: "Once",
      trigger_id: String(Date.now()),
      parameters: {
        api_url: `https://${cleanHost}/api/v1.0/run_function`,
        method: "POST",
        payload: {
          function_id: functionId,
          functions_base_id: functionsBaseId,
          bot_id: botId,
          bot_token: botToken,
          arguments: {
            task_id: taskId,
            image_size: { width: 1280, height: 720 },
            aspect_ratio: "16:9",
            width: 1280,
            height: 720,
            size: "1280x720",
            output_format: "jpeg",
            ...args
          }
        }
      }
    };

    console.log(`[ProTalk Long Task] Initializing task ${taskId} at ${proxyTasksUrl}...`);
    const initRes = await fetch(proxyTasksUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(proxyPayload)
    });

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.warn(`[ProTalk Long Task] Init response status ${initRes.status}: ${errText.substring(0, 200)}`);
    }

    // 2. Poll loop via get_function_result
    const pollIntervalMs = 4000; // 4 seconds polling
    while (Date.now() - start < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const pollRes = await fetch(`https://${cleanHost}/api/v1.0/get_function_result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            task_id: taskId,
            bot_id: botId,
            bot_token: botToken,
            dialogs_api_host: cleanHost
          })
        });

        if (pollRes.ok) {
          const resText = await pollRes.text();
          let data: any = null;
          try {
            data = JSON.parse(resText);
          } catch (_) {}

          if (data && (data.status === 'done' || data.state === 'done' || data.success === true)) {
            const url = extractImageUrlFromText(data) || extractImageUrlFromText(resText);
            console.log(`[ProTalk Long Task] Task ${taskId} finished with done status! Found URL: ${url}`);
            return { success: true, url: url || undefined, result: data, task_id: taskId };
          }
          if (data && (data.status === 'error' || data.state === 'error')) {
            console.warn(`[ProTalk Long Task] Error status returned for ${taskId}:`, data.error);
            return { success: false, error: data.error || 'Task error', task_id: taskId };
          }
          // Direct image check
          const earlyUrl = extractImageUrlFromText(data) || extractImageUrlFromText(resText);
          if (earlyUrl) {
            console.log(`[ProTalk Long Task] Task ${taskId} returned image: ${earlyUrl}`);
            return { success: true, url: earlyUrl, result: data, task_id: taskId };
          }
        }
      } catch (pollErr) {
        console.warn(`[ProTalk Long Task] Poll iteration error:`, pollErr);
      }
    }

    return { success: false, error: 'timeout', task_id: taskId };
  } catch (err: any) {
    console.error(`[ProTalk Long Task] Exception:`, err);
    return { success: false, error: err.message || String(err), task_id: taskId };
  }
}

/**
 * Option 2: Synchronous GET request for fast image generation
 */
export async function runFunctionGet(
  functionId: number,
  botId: number,
  botToken: string,
  prompt: string,
  logUrl?: string,
  logChatId?: string,
  host: string = "api.pro-talk.ru"
): Promise<string | null> {
  const cleanHost = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const url = new URL(`https://${cleanHost}/api/v1.0/run_function_get`);
  url.searchParams.set('function_id', String(functionId));
  url.searchParams.set('bot_id', String(botId));
  url.searchParams.set('bot_token', botToken);
  url.searchParams.set('prompt', prompt);
  url.searchParams.set('output', 'url');
  url.searchParams.set('image_size', 'landscape_16_9');
  url.searchParams.set('aspect_ratio', '16:9');
  url.searchParams.set('width', '1280');
  url.searchParams.set('height', '720');
  url.searchParams.set('size', '1280x720');
  if (logUrl) {
    url.searchParams.set('log_url', logUrl);
  }
  if (logChatId) {
    url.searchParams.set('log_chat_id', String(logChatId));
  }

  console.log(`[ProTalk Function GET] Requesting ${url.origin}${url.pathname}?function_id=${functionId}&bot_id=${botId}&log_chat_id=${logChatId}...`);

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json, text/plain, */*' }
    });

    const resText = await res.text();
    console.log(`[ProTalk Function GET] Response (HTTP ${res.status}): ${resText.substring(0, 300)}`);

    let data: any = null;
    try {
      data = JSON.parse(resText);
    } catch (_) {}

    const extractedUrl = extractImageUrlFromText(data) || extractImageUrlFromText(resText);
    if (extractedUrl) {
      console.log(`[ProTalk Function GET] Succeeded with URL: ${extractedUrl}`);
      return extractedUrl;
    }
  } catch (err) {
    console.error(`[ProTalk Function GET] Error:`, err);
  }

  return null;
}

/**
 * Direct call to ProTalk run_function API with log_url and log_chat_id
 */
export async function runProTalkImageFunction(
  promptText: string,
  functionId: number = 621,
  functionsBaseId: string = "appkq3HrzrxYxoAV8",
  logUrl?: string,
  logChatId?: string
): Promise<string | null> {
  const config = getProTalkConfig();
  const url = `${config.gateway_url.replace(/\/+$/, '')}/api/v1.0/run_function`;
  const resolvedLogUrl = logUrl || config.log_url || DEFAULT_PROTALK_LOG_URL;
  const resolvedLogChatId = logChatId || generateNumericUID();

  const payload = {
    function_id: functionId,
    functions_base_id: functionsBaseId,
    bot_id: config.bot_id,
    bot_token: config.bot_token,
    arguments: {
      prompt: promptText,
      image_size: { width: 1280, height: 720 },
      aspect_ratio: "16:9",
      width: 1280,
      height: 720,
      size: "1280x720",
      output_format: "jpeg",
      log_url: resolvedLogUrl,
      log_chat_id: resolvedLogChatId
    }
  };

  console.log(`[ProTalk Direct Function] Requesting run_function ${functionId} at ${url} (log_chat_id: ${resolvedLogChatId})...`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await res.text();
    console.log(`[ProTalk Direct Function] Status: ${res.status}, Response: ${responseText.substring(0, 300)}...`);

    let data: any = null;
    try {
      data = JSON.parse(responseText);
    } catch (_) {}

    // Check direct result images array
    if (data && data.result && Array.isArray(data.result.images) && data.result.images.length > 0 && data.result.images[0].url) {
      const imgUrl = data.result.images[0].url;
      console.log(`[ProTalk Direct Function] Got image URL: ${imgUrl}`);
      return imgUrl;
    }

    // Check with extractImageUrlFromText on JSON and raw text
    const extracted = (data && extractImageUrlFromText(data)) || extractImageUrlFromText(responseText);
    if (extracted) {
      console.log(`[ProTalk Direct Function] Extracted image URL: ${extracted}`);
      return extracted;
    }
  } catch (err) {
    console.error('[ProTalk Direct Function] Error executing run_function:', err);
  }

  return null;
}

/**
 * Helper to record image generation results (success or failure) in protalk_logs
 * Fills all columns properly: function_id 621, tokens_total = 33333, rub = 1.0
 */
export function logProTalkImageResult(params: {
  imagePrompt: string;
  imgUrl: string | null;
  botChatId: string;
  logUrl?: string;
  logChatId?: string;
  taskId?: string;
  functionError?: string;
}): void {
  const config = getProTalkConfig();
  const isSuccess = !!params.imgUrl;
  const promptLen = (params.imagePrompt || '').length;
  const tokensIn = Math.ceil(promptLen / 4) + 120;
  const tokensTotal = isSuccess ? 33333 : 0;
  const tokensOut = isSuccess ? 33333 : 0;
  const tokensUser = isSuccess ? 33333 : 0;
  const rub = isSuccess ? 1.0 : 0.0;

  try {
    executeRun(`
      INSERT INTO protalk_logs (
        bot_id, user_message, bot_reply, channel_id, channel_name,
        user_social_id, llm, api_key, tokens_total, tokens_in_source,
        tokens_out_source, tokens_user, rub, function_call_params,
        function_error, log_url, log_chat_id, task_id, server_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      String(config.bot_id || '72220'),
      params.imagePrompt,
      params.imgUrl || null,
      params.botChatId || params.logChatId || 'image_gen',
      'Генерация изображения (ф. 621)',
      'web_client',
      'ProTalk Function 621',
      '••••••••',
      tokensTotal,
      tokensIn,
      tokensOut,
      tokensUser,
      rub,
      JSON.stringify({ function_id: 621, prompt: params.imagePrompt, aspect_ratio: "16:9", size: "1280x720" }),
      params.functionError || null,
      params.logUrl || config.log_url || DEFAULT_PROTALK_LOG_URL,
      params.logChatId || params.botChatId || null,
      params.taskId || null,
      'api.pro-talk.ru'
    ]);
    saveDb();
  } catch (logErr) {
    console.warn('[ProTalk Log Image Result Error]', logErr);
  }
}

/**
 * Generates a 16:9 steampunk business image via ProTalk with company name
 * Uses updated ProTalk API methods: sync GET, long polling task, direct POST, and chat fallback
 * mode: 'seller' for AI Seller, 'app' for AI Applications
 */
export async function generateSteampunkBusinessImageWithProTalk(
  companyName: string,
  businessDescription: string,
  timeoutMs: number = 60000,
  chatUid?: string,
  mode: 'seller' | 'app' = 'seller'
): Promise<string | null> {
  const cleanCompany = (companyName || '').trim();
  const cleanDescription = (businessDescription || '').trim() || 'Инновационный бизнес';

  // For AI Applications in Calculator: use new dedicated Function 791 with gallery auto-upload
  if (mode === 'app') {
    return generateCalculatorAppImageWithProTalk(cleanCompany, cleanDescription, timeoutMs, chatUid);
  }

  // For AI Seller: keep existing function and prompt completely unchanged
  const imagePrompt = getBusinessImagePrompt(cleanCompany, cleanDescription, 'seller');
  return generateDirectImageWithProTalk(imagePrompt, timeoutMs, chatUid, cleanCompany || 'AI Seller');
}

/**
 * Generates an image via Function 621 using the exact provided image prompt (for daily Memes or custom artwork)
 */
export async function generateDirectImageWithProTalk(
  imagePrompt: string,
  timeoutMs: number = 60000,
  chatUid?: string,
  label: string = 'SAV AI'
): Promise<string | null> {
  const config = getProTalkConfig();
  const logChatId = chatUid && /^\d{11}$/.test(String(chatUid)) ? String(chatUid) : (chatUid ? String(chatUid) : generateNumericUID());
  const logUrl = config.log_url || DEFAULT_PROTALK_LOG_URL;
  const functionId = config.function_id || DEFAULT_PROTALK_FUNCTION_ID;
  const functionsBaseId = config.functions_base_id || DEFAULT_PROTALK_FUNCTIONS_BASE_ID;
  const proxyTasksUrl = config.proxy_tasks_url || PROXY_TASKS_URL;

  console.log(`[ProTalk Image] Generating image for "${label}" (log_chat_id: ${logChatId}, function_id: ${functionId}, log_url: ${logUrl.substring(0, 45)}...)...`);

  // Pipeline Execution:
  // Step 1: Try Fast Synchronous GET request
  try {
    const getResult = await runFunctionGet(
      functionId,
      config.bot_id,
      config.bot_token,
      imagePrompt,
      logUrl,
      logChatId,
      config.gateway_url
    );
    if (getResult) {
      console.log(`[ProTalk Image] Sync GET succeeded with image URL: ${getResult}`);
      logProTalkImageResult({
        imagePrompt,
        imgUrl: getResult,
        botChatId: logChatId,
        logUrl,
        logChatId
      });
      return getResult;
    }
  } catch (getErr) {
    console.warn('[ProTalk Image] Sync GET error, proceeding to direct POST and long polling:', getErr);
  }

  // Step 2: In parallel, try Direct POST and Long Polling Task
  let directPromise = runProTalkImageFunction(imagePrompt, functionId, functionsBaseId, logUrl, logChatId);
  let longPollingPromise = runFunctionApiLong(
    functionId,
    config.bot_id,
    config.bot_token,
    {
      prompt: imagePrompt,
      image_size: { width: 1280, height: 720 },
      aspect_ratio: "16:9",
      width: 1280,
      height: 720,
      size: "1280x720",
      output_format: "jpeg",
      log_url: logUrl,
      log_chat_id: logChatId
    },
    config.gateway_url,
    Math.min(Math.floor(timeoutMs / 1000), 50),
    functionsBaseId,
    proxyTasksUrl
  );

  try {
    const [directUrl, longResult] = await Promise.all([
      directPromise.catch(e => { console.warn('[ProTalk Image] Direct POST err:', e); return null; }),
      longPollingPromise.catch(e => { console.warn('[ProTalk Image] Long polling err:', e); return { success: false, task_id: '' }; })
    ]);

    if (directUrl) {
      console.log(`[ProTalk Image] Direct run_function succeeded with URL: ${directUrl}`);
      logProTalkImageResult({
        imagePrompt,
        imgUrl: directUrl,
        botChatId: logChatId,
        logUrl,
        logChatId
      });
      return directUrl;
    }

    if (longResult && longResult.success && longResult.url) {
      console.log(`[ProTalk Image] Long polling succeeded with URL: ${longResult.url}`);
      logProTalkImageResult({
        imagePrompt,
        imgUrl: longResult.url,
        botChatId: logChatId,
        logUrl,
        logChatId,
        taskId: longResult.task_id
      });
      return longResult.url;
    }
  } catch (pErr) {
    console.warn('[ProTalk Image] Parallel methods error, falling back to chat flow:', pErr);
  }

  // Step 3: Fallback chat flow with message polling
  const bot_chat_id = logChatId;
  console.log(`[ProTalk Image] Sending prompt to bot ${config.bot_id}, chat_id ${bot_chat_id}: ${imagePrompt}`);

  try {
    await sendProTalkMessageAsync(bot_chat_id, imagePrompt);

    const startTime = Date.now();
    const pollIntervalMs = 1000; // Fast polling (1000ms) to ensure no transient messages are missed

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const reply = await getProTalkLastReply(bot_chat_id, 'web_client', imagePrompt);
        if (reply) {
          const rawMsg = reply.message || '';
          const replyStr = JSON.stringify(reply);

          const imgUrl = extractImageUrlFromText(rawMsg) || extractImageUrlFromText(replyStr);
          if (imgUrl) {
            console.log(`[ProTalk Image] Found image URL in reply: ${imgUrl}`);
            logProTalkImageResult({
              imagePrompt,
              imgUrl,
              botChatId: bot_chat_id,
              logUrl,
              logChatId
            });
            return imgUrl;
          }
        }

        // Also check recent protalk_logs for this channel
        try {
          const logRows = executeQuery("SELECT bot_reply, user_message, function_error FROM protalk_logs WHERE channel_id = ? ORDER BY id DESC LIMIT 10", [bot_chat_id]);
          if (logRows && logRows.length > 0) {
            for (const r of logRows) {
              const fromLog = extractImageUrlFromText(r.bot_reply) || extractImageUrlFromText(r.user_message) || extractImageUrlFromText(r.function_error);
              if (fromLog) {
                console.log(`[ProTalk Image] Found image URL in protalk_logs for channel ${bot_chat_id}: ${fromLog}`);
                logProTalkImageResult({
                  imagePrompt,
                  imgUrl: fromLog,
                  botChatId: bot_chat_id,
                  logUrl,
                  logChatId
                });
                return fromLog;
              }
            }
          }

          // Fallback: check any recent log entries with sample_url or S3/fal.media image within the last 3 minutes
          const recentGlobalLogs = executeQuery(`
            SELECT bot_reply, user_message, function_error 
            FROM protalk_logs 
            WHERE (bot_reply LIKE '%sample_url%' OR bot_reply LIKE '%fal.media%' OR bot_reply LIKE '%amazonaws.com/images/%' OR function_error LIKE '%sample_url%' OR user_message LIKE '%sample_url%')
              AND created_at >= datetime('now', '-3 minutes')
            ORDER BY id DESC LIMIT 5
          `);
          if (recentGlobalLogs && recentGlobalLogs.length > 0) {
            for (const r of recentGlobalLogs) {
              const fromGlobal = extractImageUrlFromText(r.bot_reply) || extractImageUrlFromText(r.user_message) || extractImageUrlFromText(r.function_error);
              if (fromGlobal) {
                console.log(`[ProTalk Image] Found image URL in recent global logs: ${fromGlobal}`);
                logProTalkImageResult({
                  imagePrompt,
                  imgUrl: fromGlobal,
                  botChatId: bot_chat_id,
                  logUrl,
                  logChatId
                });
                return fromGlobal;
              }
            }
          }
        } catch (_) {}
      } catch (pollErr) {
        console.warn('[ProTalk Image] Poll attempt error:', pollErr);
      }
    }
  } catch (err) {
    console.error('[ProTalk Image] Error during generation request:', err);
  }

  // Log failure/timeout if no image was produced
  logProTalkImageResult({
    imagePrompt,
    imgUrl: null,
    botChatId: logChatId,
    logUrl,
    logChatId,
    functionError: 'Timeout or image generation failure'
  });

  return null;
}

/**
 * Full ProTalk business classification cycle with parallel image generation and tariff matching from BD ProTalk
 */
export async function classifyBusinessWithProTalk(
  rawInput: string,
  timeoutMs: number = 75000,
  companyName?: string,
  chatUid?: string
): Promise<ProTalkClassificationResult> {
  const config = getProTalkConfig();
  // Unified unique numeric chat ID for both classification and image generation for this user
  const userChatId = chatUid && /^\d{11}$/.test(String(chatUid)) ? String(chatUid) : (chatUid ? String(chatUid) : generateNumericUID());
  const classifyChatId = userChatId;
  const imageChatId = userChatId;

  const systemPrompt = getPromptByKey('protalk_business_classifier');
  const cleanCompany = (companyName || '').trim();

  const fullPromptMessage = `${systemPrompt}\n\nНазвание компании: ${cleanCompany || 'Не указано'}\nБизнес клиента:\n${rawInput}`;

  console.log(`[ProTalk] Starting parallel classification (chat: ${classifyChatId}) & image generation (chat: ${imageChatId})`);

  // Task 1: Classification via ProTalk
  const classificationTask = async (): Promise<{ parsed: any; replyText: string; detectedImageUrl: string | null }> => {
    let replyText = '';
    let parsed: any = null;
    let detectedImageUrl: string | null = null;

    try {
      await sendProTalkMessageAsync(classifyChatId, fullPromptMessage, 'ai_seller_user', 'ИИ-продавец (Классификация)');

      const startTime = Date.now();
      const pollIntervalMs = 1000; // 1 second polling

      while (Date.now() - startTime < timeoutMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
        
        try {
          const reply = await getProTalkLastReply(classifyChatId, 'ai_seller_user', fullPromptMessage, 'ИИ-продавец (Классификация)');
          if (reply) {
            const raw = (reply.message || '').trim();
            const replyStr = JSON.stringify(reply);

            // Check if any image URL came through in this channel
            const foundImg = extractImageUrlFromText(raw) || extractImageUrlFromText(replyStr);
            if (foundImg && !detectedImageUrl) {
              detectedImageUrl = foundImg;
            }

            // Check for JSON directly or in full response
            const extractedJson = extractClassificationJson(raw) || extractClassificationJson(replyStr);
            if (extractedJson) {
              parsed = extractedJson;
              replyText = raw;
              console.log(`[ProTalk Classification] Received JSON from chat ${classifyChatId}:`, parsed);
              break;
            }

            // Filter out noise messages: "Dialog state: ...", "AI Reasoning ...", "Здравствуйте"
            if (raw && isProTalkNoise(raw)) {
              continue;
            }

            if (raw) {
              replyText = raw;
            }
          }
        } catch (pollErr) {
          console.warn('[ProTalk Classification] Poll error:', pollErr);
        }
      }
    } catch (err) {
      console.error('[ProTalk Classification] Error:', err);
    }

    return { parsed, replyText, detectedImageUrl };
  };

  // Task 2: Steampunk Image Generation via ProTalk for AI Seller (runs in parallel, up to 60 seconds)
  const imageTask = async (): Promise<string | null> => {
    try {
      const imgUrl = await generateSteampunkBusinessImageWithProTalk(cleanCompany, rawInput, 55000, imageChatId, 'seller');
      if (imgUrl) {
        console.log(`[ProTalk Image] Successfully received image URL: ${imgUrl}`);
      }
      return imgUrl;
    } catch (imgErr) {
      console.error('[ProTalk Image] Task error:', imgErr);
      return null;
    }
  };

  // Launch tasks in parallel and wait for BOTH to finish
  const classPromise = classificationTask();
  const imgPromise = imageTask();

  const [classResult, imageResult] = await Promise.all([
    classPromise,
    imgPromise.catch(err => {
      console.warn('[ProTalk Image] Task caught error:', err);
      return null;
    })
  ]);

  const { parsed, replyText, detectedImageUrl } = classResult;
  let finalImageUrl: string | null = imageResult || detectedImageUrl || null;

  console.log(`[ProTalk] Completed execution. Image URL: ${finalImageUrl ? 'Found' : 'Not found'}, JSON: ${parsed ? 'Parsed' : 'Fallback'}`);

  // Determine segment strictly (B2B / B2C)
  let segment: 'B2B' | 'B2C' = 'B2C';
  if (parsed?.segment === 'B2B' || parsed?.segment === 'B2C') {
    segment = parsed.segment;
  } else if (/b2b|юрид|бизнес|опт|дилер|корпорат|предприят|производств|аренд.*руковод/i.test(replyText || rawInput)) {
    segment = 'B2B';
  }

  // Determine category strictly (Товары / Услуги)
  let category: 'Товары' | 'Услуги' = 'Услуги';
  if (parsed?.category === 'Товары' || parsed?.category === 'Услуги') {
    category = parsed.category;
  } else if (/товар|магазин|склад|доставк.*товар|маркетплейс/i.test(replyText || rawInput)) {
    category = 'Товары';
  }

  // Determine sphere strictly from the 10 approved spheres
  let rawSphere = String(parsed?.sphere || '').trim();
  let sphere: typeof VALID_SPHERES[number] = 'Другое';

  const matchedSphere = VALID_SPHERES.find(s => s.toLowerCase() === rawSphere.toLowerCase());
  if (matchedSphere) {
    sphere = matchedSphere;
  } else {
    const textLower = (rawInput + ' ' + (replyText || '')).toLowerCase();
    if (/строй|ремонт|недвижим|бетон|кирпич|архитектур|отделк|окна|кровл/i.test(textLower)) sphere = 'Строительство';
    else if (/медицин|клиник|врач|здоров|стоматолог|аптек|косметол|диагностик/i.test(textLower)) sphere = 'Здоровье';
    else if (/завод|производств|станк|цех|промышленност|сырье|фабрик/i.test(textLower)) sphere = 'Производство';
    else if (/курс|школ|обучен|репетитор|детск|язык|универ|тренинг/i.test(textLower)) sphere = 'Образование';
    else if (/реклам|маркетинг|таргет|трафик|pr|лидогенерац|seo|smm/i.test(textLower)) sphere = 'Реклама';
    else if (/авто|доставк|логистик|груз|такси|перевозк|спецтехник/i.test(textLower)) sphere = 'Транспорт';
    else if (/кафе|ресторан|клуб|праздник|event|кино|тур|отел|гостиниц/i.test(textLower)) sphere = 'Досуг';
    else if (/магазин|шоп|одежд|обувь|маркетплейс|товар|wb|ozon|ритейл/i.test(textLower)) sphere = 'Торговля';
    else if (/it|ит|программ|сервер|софт|ии|ai|разработк|технолог/i.test(textLower)) sphere = 'Технологии';
    else sphere = 'Другое';
  }

  const rawPackage = String(parsed?.package || '').trim();
  const packageLevel = VALID_PACKAGES.includes(rawPackage as any) ? (rawPackage as typeof VALID_PACKAGES[number]) : (segment === 'B2B' ? 'Премиум' : 'Стандарт');
  
  // Use AI generated description or tailored recommendations
  const description = parsed?.description || (
    cleanCompany
      ? `Для «${cleanCompany}» в нише «${sphere}» (${segment}, ${category}) рекомендуется первоочередное внедрение ИИ для квалификации входящих заявок, первичного сбора требований, презентации условий и перехвата клиентов 24/7.`
      : `В нише «${sphere}» (${segment}, ${category}) рекомендуется внедрение ИИ для квалификации лидов, первичного диалога, сбора ключевых параметров и мгновенного дожима до консультации.`
  );

  // Business-focused praise (no praise of SAV AI or ProTalk)
  const praise = parsed?.praise || (
    cleanCompany 
      ? `«${cleanCompany}» работает в перспективной и востребованной нише «${sphere}» с высоким потенциалом роста конверсии за счет внедрения роботизированной воронки продаж и мгновенной обработки входящего потока клиентов 24/7.`
      : `Перспективное и масштабируемое направление бизнеса в нише «${sphere}». Автоматизация первичной квалификации обращений обеспечит высокий рост конверсии и сокращение издержек.`
  );

  // Look up matched tariff from sav_price_tariffs in BD ProTalk
  let matchedTariff: any = null;
  try {
    const tariffs = executeQuery(
      "SELECT * FROM sav_price_tariffs WHERE (segment = ? OR segment IS NULL) AND (category = ? OR category IS NULL) ORDER BY price_month ASC LIMIT 5",
      [segment, category]
    );
    if (tariffs && tariffs.length > 0) {
      matchedTariff = tariffs.find((t: any) => t.package === packageLevel) || tariffs[0];
    }
  } catch (tErr) {
    console.error('Error fetching matched tariffs from BD ProTalk:', tErr);
  }

  // Log the classification in system_logs
  try {
    executeRun(`
      INSERT INTO system_logs (id, level, source, message)
      VALUES (?, 'INFO', 'PROTALK_AI', ?)
    `, [`log_${Date.now()}`, `[ProTalk] Classified business in chat ${classifyChatId}: ${segment} / ${category} / ${sphere} (${cleanCompany || 'Без названия'})`]);
  } catch (e) {}

  return {
    company_name: cleanCompany || undefined,
    segment,
    category,
    sphere,
    description,
    praise,
    package: packageLevel,
    image_url: finalImageUrl || undefined,
    rawReply: replyText || undefined,
    bot_chat_id: classifyChatId,
    source: parsed ? 'protalk' : 'database_fallback',
    matched_tariff: matchedTariff
  };
}

/**
 * Enhances tariff package descriptions with ProTalk AI
 */
export async function enhanceTariffsWithProTalk(
  companyName: string,
  sphere: string,
  segment: string,
  category: string,
  basePlans: any[],
  businessDescription?: string,
  userUid?: string
): Promise<any[]> {
  const targetUid = (userUid || '').trim() || generateNumericUID();
  // Use the exact numeric chat_id from the user session, without adding tariffs prefix
  const bot_chat_id = targetUid && /^\d+$/.test(targetUid)
    ? targetUid
    : generateNumericUID();

  const cleanCompany = (companyName || '').trim() || 'Бизнес клиента';
  const cleanDesc = (businessDescription || '').trim() || `Компания «${cleanCompany}» в сфере ${sphere} (${category}, ${segment})`;

  // 1. Fetch latest base tariffs directly from BD ProTalk sav_price_base
  let dbBasePrices: any[] = [];
  try {
    dbBasePrices = executeQuery("SELECT * FROM sav_price_base ORDER BY price ASC");
  } catch (dbErr) {
    console.warn('[ProTalk] Error querying sav_price_base:', dbErr);
  }

  // Helper to split features
  const splitFeat = (text: string | null | undefined): string[] => {
    if (!text) return [];
    return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  };

  // 2. Prepare base plans summary with exact database features
  const basePlansSummary = basePlans.map(bp => {
    const dbMatch = dbBasePrices.find(d => d.tariff === bp.package || d.tariff?.toLowerCase() === bp.package?.toLowerCase());
    const rawFeat = dbMatch?.features || (Array.isArray(bp.features) ? bp.features.join('\n') : bp.features) || '';
    const dur = dbMatch?.duration || bp.duration || 'По согласованию';
    return `Тариф "${bp.package}":
- Сроки разработки (duration): ${dur}
- Базовый состав (features из базы данных):
${rawFeat}`;
  }).join('\n\n✂️✂️✂️\n\n');

  // 3. Get prompt template from BD ProTalk database protalk_prompts
  let promptTemplate = getPromptByKey('protalk_tariffs_enhancer');
  if (!promptTemplate || !promptTemplate.includes('{companyName}')) {
    promptTemplate = `Ты — ведущий системный архитектор SAV AI. Адаптируй и подробно распиши коммерческие спецификации и состав 5 тарифов для компании "{companyName}" (Сфера: "{sphere}", Категория: "{category}", Сегмент: "{segment}", Описание бизнеса: "{businessDescription}").

Данные о тарифах из базы данных SAV AI (сроки, мессенджеры, базовый состав features):
{basePlansSummary}

Для КАЖДОГО из 5 тарифов (Лайт, Эконом, Стандарт, Премиум, VIP) сформируй:
1. custom_title: Адаптированное продающее название решения под специфику бизнеса (без капслока).
2. custom_description: Краткое (2-3 емких предложения) описание внедрения для карточки тарифа.
3. key_benefits: Список из 4 конкретных ключевых преимуществ и возможностей для краткого показа на карточке.
4. roi_highlight: Конкретная оценка окупаемости и роста выручки (например: "Ожидаемый рост конверсии на 15–25%, окупаемость — 2–3 месяца.").
5. full_blueprint_markdown: Подробнейшая, профессионально оформленная в Markdown архитектурная спецификация и план внедрения для детального просмотра при нажатии "Подробнее". Обязательно опирайся на данные о сроках (duration), каналах (messenger_options) и составе (features) из базы данных. Используй заголовки h3 (###), списки (- ), нумерацию (1. 2. 3.) и жирный шрифт для ключевых терминов:
   ### Архитектурный стек и каналы
   ### Сценарии диалогов и автодожима
   ### Интеграции и обмен данными
   ### Финансовый результат и метрики

Ответь СТРОГО в формате JSON без markdown backticks:
{
  "packages": [
    {
      "package": "Лайт",
      "custom_title": "...",
      "custom_description": "...",
      "key_benefits": ["...", "...", "...", "..."],
      "roi_highlight": "...",
      "full_blueprint_markdown": "### Архитектурный стек и каналы\\n\\n- ИИ-ядро: ...\\n\\n### Сценарии диалогов и автодожима\\n\\n1. ...\\n2. ...\\n\\n### Интеграции и обмен данными\\n\\n- ...\\n\\n### Финансовый результат и метрики\\n\\n- ..."
    },
    {
      "package": "Эконом",
      "custom_title": "...",
      "custom_description": "...",
      "key_benefits": ["...", "...", "...", "..."],
      "roi_highlight": "...",
      "full_blueprint_markdown": "..."
    },
    {
      "package": "Стандарт",
      "custom_title": "...",
      "custom_description": "...",
      "key_benefits": ["...", "...", "...", "..."],
      "roi_highlight": "...",
      "full_blueprint_markdown": "..."
    },
    {
      "package": "Премиум",
      "custom_title": "...",
      "custom_description": "...",
      "key_benefits": ["...", "...", "...", "..."],
      "roi_highlight": "...",
      "full_blueprint_markdown": "..."
    },
    {
      "package": "VIP",
      "custom_title": "...",
      "custom_description": "...",
      "key_benefits": ["...", "...", "...", "..."],
      "roi_highlight": "...",
      "full_blueprint_markdown": "..."
    }
  ]
}`;
  }

  // 4. Replace macros
  const enhancePrompt = promptTemplate
    .replace(/{companyName}/g, cleanCompany)
    .replace(/{sphere}/g, sphere || 'Торговля')
    .replace(/{category}/g, category || 'Товары')
    .replace(/{segment}/g, segment || 'B2C')
    .replace(/{businessDescription}/g, cleanDesc)
    .replace(/{basePlansSummary}/g, basePlansSummary);

  console.log(`[ProTalk Tariffs] Sending tariff synthesis prompt for ${cleanCompany} (chat_id: ${bot_chat_id})`);

  try {
    await sendProTalkMessageAsync(bot_chat_id, enhancePrompt, targetUid || 'ai_seller_user', 'ИИ-продавец (Тарифы)');

    // Poll for up to 75 seconds with 1.8s intervals
    const startTime = Date.now();
    const timeoutMs = 75000;
    let finalPackages: any[] | null = null;

    while (Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 1800));
      const reply = await getProTalkLastReply(bot_chat_id, targetUid || 'ai_seller_user', enhancePrompt, 'ИИ-продавец (Тарифы)');

      if (reply && reply.message && !isProTalkNoise(reply.message)) {
        const parsed = extractTariffPackagesJson(reply.message) || extractClassificationJson(reply.message);
        if (parsed && Array.isArray(parsed.packages) && parsed.packages.length > 0) {
          console.log(`[ProTalk Tariffs] Successfully parsed ${parsed.packages.length} enhanced packages for ${bot_chat_id}!`);
          finalPackages = parsed.packages;
          break;
        }
      }
    }

    if (finalPackages && finalPackages.length > 0) {
      return basePlans.map(bp => {
        const dbMatch = dbBasePrices.find(d => d.tariff === bp.package || d.tariff?.toLowerCase() === bp.package?.toLowerCase());
        const rawDbFeatures = dbMatch?.features ? splitFeat(dbMatch.features) : (Array.isArray(bp.features) ? bp.features : []);
        const match = finalPackages!.find((p: any) => p.package === bp.package || p.package?.toLowerCase() === bp.package?.toLowerCase());
        
        if (match) {
          const shortDesc = match.custom_description || match.short_description || bp.fullDescription;
          const aiBenefits = Array.isArray(match.key_benefits) && match.key_benefits.length > 0 ? match.key_benefits : [];
          const roi = match.roi_highlight || `Ожидаемый рост конверсии на 15–25%, окупаемость 2–3 месяца.`;
          const blueprintMd = match.full_blueprint_markdown || match.blueprint_markdown || `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** Нейросетевая модель SAV AI ProTalk с адаптивным промптом под специфику «${cleanCompany}».\n- **Каналы связи:** Telegram, WhatsApp, виджет на сайте.\n\n### Сценарии диалогов и автодожима\n\n1. **Приветствие и квалификация:** Автоматическое выявление потребностей, бюджета и сроков.\n2. **Презентация решения:** Подбор релевантных вариантов и ответов на частые вопросы 24/7.\n3. **Автодожим:** Мягкие напоминания и повторные касания лидов без ответа.\n\n### Интеграции и обмен данными\n\n- Синхронизация с CRM-системой (AmoCRM, Bitrix24) и таблицами.\n- Передача структурированной карточки лида с полной историей диалога.\n\n### Финансовый результат и метрики\n\n- **Окупаемость:** ${roi}\n- **Экономия времени:** Снижение нагрузки на менеджеров до 70%.`;

          return {
            ...bp,
            name: match.custom_title || bp.name || `SAV AI Продавец ${bp.package}`,
            custom_title: match.custom_title || bp.name || `SAV AI Продавец ${bp.package}`,
            fullDescription: shortDesc,
            custom_description: shortDesc,
            features: rawDbFeatures.length > 0 ? rawDbFeatures : (aiBenefits.length > 0 ? aiBenefits : bp.features),
            baseFeatures: rawDbFeatures.length > 0 ? rawDbFeatures : bp.features,
            aiBenefits: aiBenefits,
            key_benefits: aiBenefits,
            messengerOptions: bp.messengerOptions,
            duration: dbMatch?.duration || bp.duration,
            roiHighlight: roi,
            roi_highlight: roi,
            blueprintMarkdown: blueprintMd,
            full_blueprint_markdown: blueprintMd
          };
        }
        return {
          ...bp,
          custom_title: bp.name,
          custom_description: bp.fullDescription,
          features: rawDbFeatures.length > 0 ? rawDbFeatures : bp.features,
          baseFeatures: rawDbFeatures.length > 0 ? rawDbFeatures : bp.features,
          duration: dbMatch?.duration || bp.duration
        };
      });
    }
  } catch (err) {
    console.warn('[Enhance Tariffs Note]', err);
  }

  // High-quality tier-specific fallback blueprints with tailored descriptions
  const tierFallbacks: Record<string, { title: string; desc: string; benefits: string[]; roi: string; blueprint: string }> = {
    'Лайт': {
      title: `${cleanCompany} Старт: базовый ИИ-консультант`,
      desc: `Базовый ИИ-продавец для первичной обработки обращений клиентов «${cleanCompany}». Система собирает ключевые параметры запроса и передает контакт администратору.`,
      benefits: [
        'Первичная консультация по услугам и товарам 24/7',
        'Сбор контактных данных и базовых параметров заявки',
        'Автоматическая передача лида в Telegram',
        'Мгновенный ответ входящим клиентам без ожидания'
      ],
      roi: 'Ожидаемый рост первичных обращений на 15–20%, окупаемость — 1–2 месяца.',
      blueprint: `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** SAV AI Starter Model, настроенная на базу знаний «${cleanCompany}».\n- **Каналы связи:** 1 канал на выбор (Telegram-бот или веб-чат).\n\n### Сценарии диалогов\n\n1. **Приветствие:** Мгновенный ответ на обращение.\n2. **Квалификация:** Уточнение потребности и сбор контактов.\n3. **Маршрутизация:** Передача заявки в Telegram сотруднику.`
    },
    'Эконом': {
      title: `${cleanCompany} Квалификатор: умная запись и отбор заявок`,
      desc: `Решение для «${cleanCompany}», позволяющее быстро распределять обращения и не терять клиентов в часы пик. ИИ квалифицирует запрос, рассчитывает базовую стоимость и передает заявку в таблицу.`,
      benefits: [
        'Работа по заданному скрипту продаж и работа с типовыми вопросами',
        'Расчет ориентировочной стоимости по калькулятору и прайсу',
        'Отправка презентации и коммерческого предложения клиенту',
        'Сбор данных в Google Таблицу и Telegram-уведомления'
      ],
      roi: 'Ожидаемый рост конверсии из диалога в заявку на 20–25%, окупаемость — 2 месяца.',
      blueprint: `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** SAV AI ProTalk с поддержкой скриптов продаж «${cleanCompany}».\n- **Каналы связи:** До 3 мессенджеров на выбор (Telegram, WhatsApp, Сайт).\n\n### Сценарии диалогов\n\n1. **Квалификация:** Определение готовности к покупке и сроков.\n2. **Презентация:** Отправка КП или прайса в чат.\n3. **Дожим:** Напоминание клиенту при отсутствии ответа.`
    },
    'Стандарт': {
      title: `${cleanCompany} Продавец: омниканальная воронка продаж`,
      desc: `Полноценный автономный ИИ-продавец для «${cleanCompany}». Ведет сложные диалоги, отрабатывает возражения, формирует счета и передает сделки в CRM.`,
      benefits: [
        'Консультация по обширной базе знаний и глубокая отработка возражений',
        'Интерактивный расчет точной стоимости и подбор решений',
        'Двусторонняя интеграция с CRM (AmoCRM, Bitrix24)',
        'Автоматическое формирование договоров и счетов'
      ],
      roi: 'Ожидаемый рост конверсии на 25–35%, окупаемость — 2–3 месяца.',
      blueprint: `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** SAV AI ProTalk с контекстной памятью диалога.\n- **Каналы:** Любое количество подключенных мессенджеров.\n\n### Сценарии диалогов и автодожима\n\n1. **Глубокая квалификация:** Выявление бюджета, критериев и ЛПР.\n2. **Отработка возражений:** Ответы на сомнения по ценам и срокам.\n3. **Автодожим:** 3 ступени мягких касаний в течение 48 часов.\n\n### Интеграции\n\n- Полная синхронизация с AmoCRM / Bitrix24.`
    },
    'Премиум': {
      title: `${cleanCompany} Эксперт: продвинутый отдел продаж`,
      desc: `Многофункциональный ИИ-ассистент для «${cleanCompany}» с несколькими базами знаний, многоэтапным автодожимом и индивидуальной бизнес-логикой.`,
      benefits: [
        'Работа с несколькими направлениями и сложными продуктовыми линейками',
        'Индивидуальный калькулятор расчета стоимости и спецификаций',
        'Многоступенчатая воронка прогрева и триггерных напоминаний',
        'Индивидуальная доработка логики и расширенная аналитика диалогов'
      ],
      roi: 'Ожидаемый рост выручки на 30–45%, окупаемость — 2–4 месяца.',
      blueprint: `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** SAV AI Multi-Agent Core для «${cleanCompany}».\n- **Каналы:** Омниканальность во всех поддерживаемых мессенджерах.\n\n### Сценарии и воронки\n\n1. **Многоуровневый диалог:** Адаптация тональности под тип клиента.\n2. **Умный дожим:** Сегментированные цепочки дожима по статусу воронки.\n3. **Аналитика:** Детальная статистика конверсий.`
    },
    'VIP': {
      title: `${cleanCompany} Архитектор: интеллектуальная экосистема`,
      desc: `Флагманский комплекс для «${cleanCompany}» с подключением думающих LLM моделей, интеграцией по API с корпоративными системами, видеопрезентациями и персональным архитектором.`,
      benefits: [
        'Подключение передовых думающих моделей и ИИ-агентов',
        'Создание видеопрезентаций нейросетями под каждого клиента',
        'Прямая интеграция по API с корпоративным бэкендом и ERP',
        'Выделенный системный архитектор и индивидуальная разработка'
      ],
      roi: 'Максимальная автоматизация продаж (до 85%), окупаемость — 3–5 месяцев при масштабных оборотах.',
      blueprint: `### Архитектурный стек и каналы\n\n- **ИИ-ядро:** Флагманский стек SAV AI с рассуждающими моделями.\n- **Интеграции:** Прямое API-взаимодействие со складами, 1С, ERP.\n\n### Сценарии\n\n1. **Персонализированный синтез:** Генерация индивидуальных видео-КП.\n2. **Автоматический документооборот:** Полный цикл от лида до акта.\n3. **Сопровождение:** Персональный архитектор 24/7.`
    }
  };

  return basePlans.map(bp => {
    const pkg = bp.package || 'Стандарт';
    const fallbackInfo = tierFallbacks[pkg] || tierFallbacks['Стандарт'];

    return {
      ...bp,
      name: bp.name && bp.name !== bp.package ? bp.name : fallbackInfo.title,
      custom_title: bp.name && bp.name !== bp.package ? bp.name : fallbackInfo.title,
      fullDescription: bp.fullDescription && bp.fullDescription.length > 30 ? bp.fullDescription : fallbackInfo.desc,
      custom_description: bp.fullDescription && bp.fullDescription.length > 30 ? bp.fullDescription : fallbackInfo.desc,
      features: fallbackInfo.benefits,
      baseFeatures: bp.features,
      aiBenefits: fallbackInfo.benefits,
      key_benefits: fallbackInfo.benefits,
      messengerOptions: bp.messengerOptions,
      duration: bp.duration,
      roiHighlight: fallbackInfo.roi,
      roi_highlight: fallbackInfo.roi,
      blueprintMarkdown: fallbackInfo.blueprint,
      full_blueprint_markdown: fallbackInfo.blueprint
    };
  });
}

/**
 * Matches experts with business context, user history, and DB-stored prompts
 */
export async function matchExpertsWithDBAndProTalk(
  businessDescription: string,
  userInfo?: any,
  userHistory?: any[]
): Promise<any[]> {
  try {
    // 1. Fetch active verified experts from BD ProTalk DB
    const experts = executeQuery("SELECT id, pseudonym, greeting, spheres, description, photo_url, cases, tools FROM sav_experts WHERE status = 'active' AND photo_url IS NOT NULL AND spheres IS NOT NULL AND id NOT LIKE 'exp_%' LIMIT 50");
    if (!experts || experts.length === 0) {
      return [];
    }

    // 2. Fetch prompt from protalk_promts or ai_prompts
    let promptTemplate = getPromptByKey('protalk_expert_matching');
    if (!promptTemplate || !promptTemplate.includes('{expertsList}')) {
      promptTemplate = `Ты — ведущий координатор SAV AI. Твоя задача — подобрать наиболее подходящего эксперта из базы данных для бизнеса клиента на основе описания и истории действий.

Бизнес клиента:
{businessDescription}

Список доступных экспертов:
{expertsList}

История действий пользователя:
{userHistory}

Выбери наилучшего эксперта-куратора, оцени совпадение (matchScore от 85 до 99) и дай подробное, убедительное обоснование (matchReason на 2-4 предложения, почему именно этот эксперт идеально подходит под цели клиента).

Ответь СТРОГО в формате JSON без markdown backticks:
{
  "matches": [
    {
      "id": "ID_эксперта",
      "matchScore": 95,
      "matchReason": "Обоснование..."
    }
  ]
}`;
    } else if (!promptTemplate.includes('{businessDescription}')) {
      promptTemplate = `Бизнес клиента:\n{businessDescription}\n\n` + promptTemplate;
    }

    const expertsSummary = experts.map((e: any) => 
      `ID: ${e.id} | Эксперт: ${e.greeting || ''}${e.pseudonym || ''} | Сферы: ${e.spheres || 'Все'} | Описание: ${e.description || 'Опыт во внедрении ИИ'}`
    ).join('\n');

    let historySummary = 'Пользователь новый, история действий пока отсутствует.';
    if (Array.isArray(userHistory) && userHistory.length > 0) {
      historySummary = userHistory.map((h: any) => `• ${h.action || h.page || ''} (${h.value || h.field || ''})`).join('\n');
    }

    const stripUrls = (str: string) => (str || '').replace(/https?:\/\/[^\s'")\]]+/gi, '').replace(/\b(?:www\.)[^\s'")\]]+/gi, '');

    const sanitizedBusinessDescription = stripUrls(businessDescription || 'Автоматизация бизнеса');
    const sanitizedHistorySummary = stripUrls(historySummary);

    const fullPrompt = stripUrls(promptTemplate
      .replace('{expertsList}', expertsSummary)
      .replace('{userHistory}', sanitizedHistorySummary)
      .replace('{businessDescription}', sanitizedBusinessDescription));

    const isErrorText = (txt: string) => {
      if (!txt) return false;
      return /API error:\s*Error code/i.test(txt) ||
             /Provider returned error/i.test(txt) ||
             /Error while downloading file/i.test(txt) ||
             /invalid_request_error/i.test(txt) ||
             /upstream status code/i.test(txt) ||
             /param['":\s]+url/i.test(txt);
    };

    const cleanMatchReason = (r?: string) => {
      if (!r || typeof r !== 'string') return '';
      if (isErrorText(r)) return '';
      return r.trim();
    };

    const bot_chat_id = userInfo?.telegram_id ? `exp_match_${userInfo.telegram_id}_${Date.now()}` : `exp_match_${Date.now()}`;
    const sent = await sendProTalkMessageAsync(bot_chat_id, fullPrompt, userInfo?.telegram_id || 'expert_seeker', 'Подбор экспертов');

    let matches: any[] = [];
    if (sent) {
      const startTime = Date.now();
      // Wait up to 60 seconds (matching UI timer) to allow neural network to form high-quality matching
      while (Date.now() - startTime < 60000) {
        await new Promise(r => setTimeout(r, 1200));
        try {
          const reply = await getProTalkLastReply(bot_chat_id, userInfo?.telegram_id || 'expert_seeker', fullPrompt, 'Подбор экспертов');
          if (reply?.message && !isProTalkNoise(reply.message)) {
            const raw = reply.message.trim();
            if (isErrorText(raw)) {
              console.warn('[ProTalk Upstream Error ignored in match]', raw.slice(0, 150));
              continue;
            }

            const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
            const startIdx = cleaned.indexOf('{');
            const endIdx = cleaned.lastIndexOf('}');
            if (startIdx !== -1 && endIdx > startIdx) {
              const jsonStr = cleaned.slice(startIdx, endIdx + 1);
              const parsed = JSON.parse(jsonStr);
              if (parsed?.error || isErrorText(jsonStr)) {
                console.warn('[ProTalk Error object ignored in match]');
                continue;
              }

              if (Array.isArray(parsed?.matches) && parsed.matches.length > 0) {
                matches = parsed.matches.map((m: any) => ({
                  ...m,
                  matchReason: cleanMatchReason(m.matchReason)
                }));
                break;
              } else if (parsed?.expertId || parsed?.id) {
                matches = [{
                  id: parsed.expertId || parsed.id,
                  matchScore: Number(parsed.matchScore) || 96,
                  matchReason: cleanMatchReason(parsed.matchReason || parsed.reason) || 'Высокая отраслевая релевантность'
                }];
                break;
              }
            }
          }
        } catch (pollErr) {
          // Continue polling until timeout
        }
      }
    }

    // Combine AI results with DB expert fields
    if (matches.length > 0) {
      const expertMap = new Map(experts.map((e: any) => [String(e.id).trim(), e]));
      const mapped = matches
        .map((m: any) => {
          const mIdStr = String(m.id || '').trim();
          const baseExp = expertMap.get(mIdStr) || experts.find((e: any) => 
            (e.pseudonym && mIdStr && (mIdStr.toLowerCase().includes(String(e.pseudonym).toLowerCase()) || String(e.pseudonym).toLowerCase().includes(mIdStr.toLowerCase()))) ||
            (e.greeting && mIdStr && mIdStr.toLowerCase().includes(String(e.greeting).toLowerCase()))
          );
          if (!baseExp) return null;
          return {
            ...baseExp,
            matchScore: Number(m.matchScore) || 92,
            matchReason: cleanMatchReason(m.matchReason) || 'Высокая отраслевая релевантность вашему бизнесу'
          };
        })
        .filter(Boolean);

      if (mapped.length > 0) {
        mapped.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        return mapped;
      }
    }

    // Smart fallback matching based on sphere/keywords if AI takes longer
    const descLower = (businessDescription || '').toLowerCase();
    const scoredExperts = experts.map((e: any) => {
      let score = 84;
      const spheresLower = (e.spheres || '').toLowerCase();
      const descExpLower = (e.description || '').toLowerCase();
      let matchedReason = '';

      if (descLower.includes('строит') || descLower.includes('ремонт') || descLower.includes('дом') || descLower.includes('недвижим')) {
        if (spheresLower.includes('строительств') || descExpLower.includes('строит')) {
          score += 13;
          matchedReason = 'Глубокая экспертиза в строительном секторе, расчете смет и автоматизации продаж объектов.';
        }
      } else if (descLower.includes('торговл') || descLower.includes('магаз') || descLower.includes('товар') || descLower.includes('розниц') || descLower.includes('продаж')) {
        if (spheresLower.includes('торговл') || descExpLower.includes('продаж') || spheresLower.includes('ecommerce')) {
          score += 14;
          matchedReason = 'Специализация на омниканальных воронках, e-commerce и автоматизации клиентских заказов в ритейле.';
        }
      } else if (descLower.includes('здоровь') || descLower.includes('клиник') || descLower.includes('врач') || descLower.includes('медицин')) {
        if (spheresLower.includes('здоровь') || spheresLower.includes('медицин')) {
          score += 13;
          matchedReason = 'Профильный опыт внедрения ИИ-агентов в медицинских центрах и интеграции с МИС.';
        }
      } else if (descLower.includes('it') || descLower.includes('разработк') || descLower.includes('софт') || descLower.includes('технолог') || descLower.includes('тариф')) {
        if (e.pseudonym === 'White' || spheresLower.includes('технолог') || descExpLower.includes('архитектор')) {
          score += 14;
          matchedReason = 'Главный архитектор SAV AI, специализируется на ИИ-продавцах, автоматизации отделов продаж и автономных воронках.';
        }
      }

      if (!matchedReason) {
        matchedReason = `Профильный опыт эксперта по направлению «${e.spheres || 'Комплексная автоматизация'}» оптимально подходит для задач вашего бизнеса.`;
      }

      return {
        ...e,
        matchScore: Math.min(score, 98),
        matchReason: matchedReason
      };
    }).sort((a: any, b: any) => b.matchScore - a.matchScore);

    return scoredExperts;
  } catch (err) {
    console.error('[Match Experts Error]', err);
    return [];
  }
}

/**
 * Runs direct document text recognition function using ProTalk run_function API (function_id: 369)
 * Supports PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX and Google Docs/Sheets/Slides.
 *
 * [REQUEST] POST https://api.pro-talk.ru/api/v1.0/run_function
 * [PAYLOAD] {
 *   "function_id": 369,
 *   "functions_base_id": "appkq3HrzrxYxoAV8",
 *   "bot_id": 72220,
 *   "bot_token": "BIUTUa499JhVgwmcsY6tRLy4WExXuSX6",
 *   "arguments": {
 *     "url": "тут ссылка",
 *     "file_type": "pdf",
 *     "sheet_number": 0,
 *     "sheet_name": ""
 *   }
 * }
 */
export async function runProTalkDocRecognitionFunction(params: {
  url: string;
  file_type?: string;
  sheet_number?: number;
  sheet_name?: string;
  userUid?: string | number;
  log_url?: string;
  log_chat_id?: string;
  log_table?: string;
  table?: string;
}): Promise<{ success: boolean; text: string; error?: string }> {
  try {
    let rawUrl = (params.url || '').trim();
    if (!rawUrl) {
      return { success: false, text: '', error: 'Не указана ссылка на документ' };
    }

    // If it's a relative URL, file ID or key, resolve to full URL if present in file_storage
    if (!rawUrl.startsWith('http')) {
      const cleanKey = rawUrl.split('/').pop()?.split('?')[0] || '';
      try {
        const candidate: any = executeQuery(
          `SELECT original_url FROM file_storage 
           WHERE id = ? OR file_key = ? OR slug = ? OR name = ? 
              OR original_url = ? OR original_url LIKE ? 
           ORDER BY id DESC LIMIT 1`,
          [rawUrl, rawUrl, cleanKey, cleanKey, rawUrl, `%${cleanKey}%`]
        )?.[0];
        if (candidate?.original_url && candidate.original_url.startsWith('http')) {
          rawUrl = candidate.original_url;
        }
      } catch {}
    }

    // Auto-detect file_type if not provided
    let fileType = (params.file_type || '').toLowerCase().trim().replace(/^\./, '');
    const lowerUrl = rawUrl.toLowerCase();

    if (!fileType || fileType === 'auto') {
      if (lowerUrl.includes('docs.google.com/spreadsheets') || lowerUrl.endsWith('.xlsx')) {
        fileType = 'xlsx';
      } else if (lowerUrl.endsWith('.xls')) {
        fileType = 'xls';
      } else if (lowerUrl.includes('docs.google.com/presentation') || lowerUrl.endsWith('.pptx')) {
        fileType = 'pptx';
      } else if (lowerUrl.endsWith('.ppt')) {
        fileType = 'ppt';
      } else if (lowerUrl.includes('docs.google.com/document') || lowerUrl.endsWith('.docx')) {
        fileType = 'docx';
      } else if (lowerUrl.endsWith('.doc')) {
        fileType = 'doc';
      } else if (lowerUrl.endsWith('.pdf')) {
        fileType = 'pdf';
      } else {
        fileType = 'pdf';
      }
    }

    // Google Drive share link helper:
    // If it's https://drive.google.com/file/d/FILE_ID/view... convert to export link if possible
    if (rawUrl.includes('drive.google.com/file/d/')) {
      const match = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        rawUrl = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    }

    // Persistent User ID, Google Spreadsheet and logging table arguments
    const config = getProTalkConfig();
    const resolvedUid = params.userUid ? String(params.userUid).trim() : '99346388151';
    const logUrl = params.log_url || config.log_url || "https://docs.google.com/spreadsheets/d/1veEGt8f-4O0sNaFgNLjbUFmnf0CquaoIbjAMIXkt0LU/edit?usp=sharing";
    const logChatId = params.log_chat_id || `${resolvedUid}_tz`;
    const logTable = params.log_table || params.table || (config as any).log_table || 'Лист1';

    const payload = {
      function_id: 369,
      functions_base_id: "appkq3HrzrxYxoAV8",
      bot_id: 72220,
      bot_token: "BIUTUa499JhVgwmcsY6tRLy4WExXuSX6",
      arguments: {
        url: rawUrl,
        log_url: logUrl,
        log_chat_id: logChatId,
        log_table: logTable,
        table: logTable,
        table_name: logTable,
        log_sheet: logTable,
        file_type: fileType,
        sheet_number: params.sheet_number !== undefined ? Number(params.sheet_number) : 0,
        sheet_name: params.sheet_name || ""
      }
    };

    console.log(`[ProTalk Run Function 369] Requesting text from: ${rawUrl} (type: ${fileType}, log_chat_id: ${logChatId})...`);

    const res = await fetch("https://api.pro-talk.ru/api/v1.0/run_function", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      try {
        const tokensIn = Math.ceil(rawUrl.length / 4) + 150;
        executeRun(`
          INSERT INTO protalk_logs (
            channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
            tokens_total, tokens_in_source, tokens_out_source, tokens_user, function_error, function_call_params,
            log_url, log_chat_id, server_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          resolvedUid,
          resolvedUid,
          `Распознавание документа (ф. 369): ${rawUrl}`,
          null,
          'SAV AI Doc Recognition (fn: 369)',
          '72220',
          'ProTalk Function 369',
          '••••••••',
          tokensIn,
          tokensIn,
          0,
          tokensIn,
          `HTTP ${res.status}: ${errBody || res.statusText}`,
          JSON.stringify(payload.arguments),
          logUrl,
          logChatId,
          'api.pro-talk.ru'
        ]);
      } catch {}
      throw new Error(`Ошибка сервиса ProTalk (${res.status}): ${errBody || res.statusText}`);
    }

    const json = await res.json();
    let text = '';
    if (typeof json === 'string') {
      text = json;
    } else if (json && typeof json.text === 'string') {
      text = json.text;
    } else if (json && typeof json.result === 'string') {
      text = json.result;
    } else if (json && typeof json.content === 'string') {
      text = json.content;
    } else {
      text = JSON.stringify(json);
    }

    // Handle ProTalk error string inside status 200 (e.g. "Error downloading file: ...", "Error reading PDF: ...")
    if (
      text.startsWith('Error downloading file:') ||
      text.startsWith('Error reading') ||
      text.startsWith('Error processing') ||
      text.startsWith('Error:')
    ) {
      try {
        const tokensIn = Math.ceil(rawUrl.length / 4) + 150;
        executeRun(`
          INSERT INTO protalk_logs (
            channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
            tokens_total, tokens_in_source, tokens_out_source, tokens_user, function_error, function_call_params,
            log_url, log_chat_id, server_name
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          resolvedUid,
          resolvedUid,
          `Распознавание документа (ф. 369): ${rawUrl}`,
          text.substring(0, 500),
          'SAV AI Doc Recognition (fn: 369)',
          '72220',
          'ProTalk Function 369',
          '••••••••',
          tokensIn,
          tokensIn,
          0,
          tokensIn,
          text,
          JSON.stringify(payload.arguments),
          logUrl,
          logChatId,
          'api.pro-talk.ru'
        ]);
      } catch {}
      return { success: false, text: '', error: text };
    }

    // Clean whitespace
    const cleanText = text.replace(/\r\n/g, '\n').trim();

    // Log success into protalk_logs with token and rub calculations
    try {
      const tokensIn = Math.ceil(rawUrl.length / 4) + 150;
      const tokensOut = Math.ceil(cleanText.length / 4);
      const tokensTotal = tokensIn + tokensOut;
      const rub = Math.round((tokensTotal * 300.0 / 10000000.0) * 1000000) / 1000000;

      executeRun(`
        INSERT INTO protalk_logs (
          channel_id, user_social_id, user_message, bot_reply, channel_name, bot_id, llm, api_key,
          tokens_total, tokens_in_source, tokens_out_source, tokens_user, rub, function_call_params,
          log_url, log_chat_id, server_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        resolvedUid,
        resolvedUid,
        `Распознавание документа (ф. 369): ${rawUrl}`,
        cleanText.substring(0, 1000),
        'SAV AI Doc Recognition (fn: 369)',
        '72220',
        'ProTalk Function 369',
        '••••••••',
        tokensTotal,
        tokensIn,
        tokensOut,
        tokensTotal,
        rub,
        JSON.stringify(payload.arguments),
        logUrl,
        logChatId,
        'api.pro-talk.ru'
      ]);
    } catch (logErr) {
      console.warn('[ProTalk Function 369] Log insertion warning:', logErr);
    }

    return {
      success: true,
      text: cleanText
    };
  } catch (err: any) {
    console.error('[ProTalk Run Function 369 Error]', err);
    return {
      success: false,
      text: '',
      error: err.message || 'Ошибка выполнения функции распознавания текста'
    };
  }
}

/**
 * Normalizes any department string or context to one of the 8 canonical departments in BD ProTalk DB
 */
export function normalizeDepartmentName(dept?: string, textContext?: string): string {
  const d = (dept || '').trim().toLowerCase().replace(/^[cс]/i, 'c');
  const ctx = (textContext || '').toLowerCase();

  // 1. Direct or partial check in dept string
  if (d.includes('найм') || d.includes('кадр') || d.includes('hr') || d.includes('рекрут') || d.includes('собесед') || d.includes('кандидат') || d.includes('резюме') || d.includes('подбор')) {
    return 'Отдел найма';
  }
  if (d.includes('call') || d.includes('колл') || d.includes('кол') || d.includes('звон') || d.includes('оператор') || d.includes('линия')) {
    return 'Call-центр';
  }
  if (d.includes('разработ') || d.includes('it') || d.includes('програм') || d.includes('код') || d.includes('sqlite') || d.includes('разраб')) {
    return 'Отдел разработки';
  }
  if (d.includes('маркетинг') || d.includes('реклам') || d.includes('трафик') || d.includes('таргет') || d.includes('лидоген')) {
    return 'Отдел маркетинга';
  }
  if (d.includes('копирайт') || d.includes('контент') || d.includes('стать') || d.includes('текст')) {
    return 'Копирайтинг';
  }
  if (d.includes('делопроизвод') || d.includes('документ') || d.includes('акт') || d.includes('договор') || d.includes('архив')) {
    return 'Делопроизводство';
  }
  if (d.includes('юрид') || d.includes('прав') || d.includes('претенз') || d.includes('суд') || d.includes('комплаенс')) {
    return 'Юридический отдел';
  }
  if (d.includes('продаж') || d.includes('лид') || d.includes('сделк') || d.includes('клиент') || d.includes('crm') || d.includes('дожим') || d.includes('роп')) {
    return 'Отдел продаж';
  }

  // 2. Contextual heuristic check if dept was missing or unrecognized
  if (ctx.includes('отдел найма') || ctx.includes('роботизация найма') || ctx.includes('подбор персонала') || ctx.includes('скрининг резюме') || ctx.includes('собеседован') || ctx.includes('подбор ропов') || ctx.includes('найм сотрудников')) {
    return 'Отдел найма';
  }
  if (ctx.includes('call-центр') || ctx.includes('колл-центр') || ctx.includes('горячая линия') || ctx.includes('входящие звонки') || ctx.includes('операторы колл')) {
    return 'Call-центр';
  }
  if (ctx.includes('отдел разработки') || ctx.includes('программист') || ctx.includes('написание кода') || ctx.includes('sqlite')) {
    return 'Отдел разработки';
  }
  if (ctx.includes('отдел маркетинга') || ctx.includes('маркетолог') || ctx.includes('трафик') || ctx.includes('таргет')) {
    return 'Отдел маркетинга';
  }
  if (ctx.includes('копирайтинг') || ctx.includes('написание статей') || ctx.includes('копирайтер')) {
    return 'Копирайтинг';
  }
  if (ctx.includes('делопроизводство') || ctx.includes('документооборот') || ctx.includes('оформление договоров')) {
    return 'Делопроизводство';
  }
  if (ctx.includes('юридический') || ctx.includes('юрист') || ctx.includes('аудит договоров') || ctx.includes('правовой анализ')) {
    return 'Юридический отдел';
  }

  return 'Отдел продаж';
}

/**
 * Helper to get list of departments with coefficients and descriptions for AI prompts
 */
export function getDepartmentsListForPrompt(): string {
  try {
    const rows: any[] = executeQuery(
      "SELECT department_name, description, coefficient FROM sav_department_coefficients ORDER BY id ASC"
    ) || [];
    if (rows.length > 0) {
      return rows.map((r, i) => `${i + 1}. ${r.department_name} (коэффициент ${r.coefficient}) — ${r.description || 'автоматизация функций сотрудников'}`).join('\n');
    }
  } catch (_) {}
  return [
    '1. Отдел продаж (коэффициент 1.00) — менеджеры по продажам, обработка лидов, квалификация, автодожим и CRM 24/7',
    '2. Отдел найма (коэффициент 0.95) — HR, рекрутинг, первичный отклик кандидатов, скрининг резюме, автособеседования и тестирование',
    '3. Call-центр (коэффициент 0.80) — операторы первой линии, обработка входящих/исходящих звонков и чатов, запись на консультации',
    '4. Отдел разработки (коэффициент 1.45) — программисты, архитекторы, написание кода, развертывание баз BD ProTalk, интеграции API и микросервисов',
    '5. Отдел маркетинга (коэффициент 1.10) — маркетологи, генерация офферов, автокреативы, сквозная аналитика, рассылки',
    '6. Копирайтинг (коэффициент 0.85) — авторы контента, рерайт, статьи, сценарии чат-ботов и ведение контент-плана',
    '7. Делопроизводство (коэффициент 0.70) — документооборот, формирование договоров, актов, счетов и архивный учет',
    '8. Юридический отдел (коэффициент 1.05) — юристы, аудит контрактов, правовой анализ рисков и претензионная работа'
  ].join('\n');
}

/**
 * Helper to get list of cities with average salary benchmarks for AI prompts
 */
export function getCitiesListForPrompt(): string {
  try {
    const rows: any[] = executeQuery(
      "SELECT name FROM sav_cities ORDER BY avg_salary DESC LIMIT 40"
    ) || [];
    if (rows.length > 0) {
      return rows.map(r => r.name).join(', ');
    }
  } catch (_) {}
  return 'Москва, Санкт-Петербург, Новосибирск, Екатеринбург, Казань, Нижний Новгород, Челябинск, Самара, Омск, Ростов-на-Дону, Уфа, Красноярск, Пермь, Воронеж, Волгоград, Краснодар, Саратов, Тюмень, Тольятти, Ижевск, Барнаул, Ульяновск, Иркутск, Владивосток, Ярославль, Хабаровск, Махачкала, Оренбург, Томск, Кемерово, Новокузнецк, Рязань, Астана, Алматы, Минск';
}

/**
 * Sanitizes JSON strings by escaping unescaped literal newlines and control characters inside double quotes
 */
function sanitizeJsonStringLiterals(str: string): string {
  let inString = false;
  let escaped = false;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        continue;
      }
      if (ch === '\t') {
        out += '\\t';
        continue;
      }
    }
    out += ch;
  }
  return out;
}

/**
 * Resilient JSON parser for AI responses: handles markdown, trailing commas,
 * unescaped quotes/newlines, and provides boundary-based extraction fallback for long markdown fields.
 */
export function safeParseAiJson(rawText: string): any {
  if (!rawText) return null;
  const clean = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // 1. Попытка стандартного JSON.parse подстроки
  const startIdx = clean.indexOf('{');
  const endIdx = clean.lastIndexOf('}');
  if (startIdx !== -1 && endIdx > startIdx) {
    const candidate = clean.slice(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {
      try {
        const sanitized = sanitizeJsonStringLiterals(candidate).replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(sanitized);
      } catch (_) {}
    }
  }

  // 2. Резервное извлечение регулярными выражениями и поиском границ полей
  const result: any = {};
  const allKnownKeys = [
    'functionality', 'technicalAssignment', 'clientName', 'fullName',
    'companyName', 'company', 'product', 'city', 'phone', 'contact',
    'contactValue', 'contactType', 'comment', 'employeeCount',
    'salaryPerEmployee', 'averageSalary', 'department', 'summary', 'hasSla', 'promoCode'
  ];

  const extractString = (key: string): string | null => {
    // 2.1 Попытка прямого regex с экранированием
    const directRegex = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's');
    const directMatch = clean.match(directRegex);
    if (directMatch && directMatch[1]) {
      return directMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').trim();
    }

    // 2.2 Для длинных многострочных Markdown-полей (например, functionality) ищем до следующего валидного ключа
    const otherKeys = allKnownKeys.filter(k => k.toLowerCase() !== key.toLowerCase());
    const nextKeyPattern = otherKeys.map(k => `"${k}"\\s*:`).join('|');
    const boundaryRegex = new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)(?=(?:${nextKeyPattern})|"$|"}|\",\\s*$)`, 'i');
    const boundaryMatch = clean.match(boundaryRegex);
    if (boundaryMatch && boundaryMatch[1]) {
      let val = boundaryMatch[1].trim();
      val = val.replace(/"\s*,?\s*$/, '');
      val = val.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t');
      return val.trim();
    }
    return null;
  };

  const func = extractString('functionality') || extractString('technicalAssignment');
  if (func) result.functionality = func;
  const comp = extractString('companyName') || extractString('company');
  if (comp) result.companyName = comp;
  const prod = extractString('product');
  if (prod) result.product = prod;
  const client = extractString('clientName') || extractString('fullName');
  if (client) result.clientName = client;
  const city = extractString('city');
  if (city) result.city = city;
  const phone = extractString('phone') || extractString('contact') || extractString('contactValue');
  if (phone) result.phone = phone;
  const comment = extractString('comment') || extractString('summary');
  if (comment) result.comment = comment;
  const dept = extractString('department');
  if (dept) result.department = dept;
  const contactType = extractString('contactType');
  if (contactType) result.contactType = contactType;
  const empCount = extractString('employeeCount') || clean.match(/"employeeCount"\s*:\s*"?(\d+)"?/)?.[1];
  if (empCount) result.employeeCount = empCount;
  const salary = extractString('salaryPerEmployee') || extractString('averageSalary') || clean.match(/"salaryPerEmployee"\s*:\s*"?(\d+)"?/)?.[1];
  if (salary) result.salaryPerEmployee = salary;
  const summary = extractString('summary');
  if (summary) result.summary = summary;

  if (Object.keys(result).length > 0) {
    return result;
  }
  return null;
}

/**
 * Recognizes and structures Technical Assignment (ТЗ) from uploaded document/file or text using ProTalk AI
 */
export async function recognizeDocumentTzWithProTalk(
  payloadOrUrl?: {
    fileUrl?: string;
    fileName?: string;
    fileBase64?: string;
    mimeType?: string;
    fileBuffer?: Buffer;
    rawText?: string;
    userUid?: string;
  } | string,
  legacyFileName?: string,
  legacyRawText?: string,
  legacyUserUid?: string
): Promise<{
  companyName?: string;
  department?: string;
  product?: string;
  technicalAssignment: string;
  functionality: string;
  summary: string;
  rawReply?: string;
  clientName?: string;
  fullName?: string;
  city?: string;
  phone?: string;
  contact?: string;
  contactValue?: string;
  contactType?: string;
  comment?: string;
  employeeCount?: string;
  salaryPerEmployee?: string;
  averageSalary?: string;
}> {
  const isObject = typeof payloadOrUrl === 'object' && payloadOrUrl !== null;
  const fileUrl = isObject ? payloadOrUrl.fileUrl : payloadOrUrl;
  const fileName = isObject ? payloadOrUrl.fileName : legacyFileName;
  const rawText = isObject ? payloadOrUrl.rawText : legacyRawText;
  const userUid = isObject ? payloadOrUrl.userUid : legacyUserUid;
  const fileBase64 = isObject ? payloadOrUrl.fileBase64 : undefined;
  const mimeType = isObject ? payloadOrUrl.mimeType : undefined;
  const fileBuffer = isObject ? payloadOrUrl.fileBuffer : undefined;

  // Use persistent user UID for chat_id session
  const passedChatId = isObject ? (payloadOrUrl as any).chat_id : undefined;
  let bot_chat_id = passedChatId || userUid || legacyUserUid || '';
  if (bot_chat_id) {
    bot_chat_id = String(bot_chat_id).trim();
    if (!bot_chat_id.endsWith('_tz')) {
      bot_chat_id = `${bot_chat_id}_tz`;
    }
  } else {
    bot_chat_id = `${generateNumericUID()}_tz`;
  }

  // 1. Гарантированное получение ссылки на файл из filestore.pro-talk.ru
  let resolvedFileUrl = '';
  if (fileUrl && (fileUrl.startsWith('https://filestore.pro-talk.ru/') || fileUrl.startsWith('https://file.pro-talk.ru/'))) {
    resolvedFileUrl = fileUrl;
  } else if (fileUrl) {
    const cleanKey = fileUrl.split('/').pop()?.split('?')[0] || '';
    try {
      const candidate: any = executeQuery(
        `SELECT original_url, name FROM file_storage 
         WHERE id = ? OR file_key = ? OR slug = ? OR name = ? 
            OR original_url = ? OR original_url LIKE ? 
         ORDER BY id DESC LIMIT 1`,
        [fileUrl, fileUrl, cleanKey, fileName || cleanKey, fileUrl, `%${cleanKey}%`]
      )?.[0];
      if (candidate?.original_url && (candidate.original_url.startsWith('https://filestore.pro-talk.ru/') || candidate.original_url.startsWith('https://file.pro-talk.ru/'))) {
        resolvedFileUrl = candidate.original_url;
      }
    } catch (dbErr) {
      console.warn('[ProTalk Doc Recognition] DB lookup warning:', dbErr);
    }
  }

  // Если ссылки на filestore.pro-talk.ru еще нет, но есть буфер или base64 — загружаем на filestore
  if (!resolvedFileUrl && (fileBuffer || fileBase64)) {
    try {
      const buf = fileBuffer || Buffer.from(fileBase64!, 'base64');
      const uploadFormData = new FormData();
      const mime = mimeType || 'application/pdf';
      const cleanName = fileName || 'document.pdf';
      const blob = new Blob([buf], { type: mime });
      uploadFormData.append('file', blob, cleanName);

      const upRes = await fetch('https://file.pro-talk.ru/tgf', {
        method: 'POST',
        headers: {
          'X-Upload-Token': 'b2RdUnRrWlFha1h3GHMhU2Y5GCsuGxAULisQKl0tNCo3BTJ4FSNQGCwLFxRuPRQYaGtdWGtjUgVvAH9YAmk',
          'X-Preserve-Alpha': 'true'
        },
        body: uploadFormData
      });
      if (upRes.ok) {
        const text = await upRes.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          resolvedFileUrl = text.trim();
        } else {
          try {
            const d = JSON.parse(text);
            resolvedFileUrl = d.url || d.file_url || '';
          } catch {}
        }
      }
    } catch (upErr) {
      console.warn('[ProTalk Doc Recognition] Auto-upload to filestore warning:', upErr);
    }
  }

  // 2. Извлечение текста документа:
  // КРИТИЧЕСКИ ВАЖНО: если rawText уже передан (например, после прямого вызова функции 369),
  // НЕ запускаем извлечение повторно, чтобы не спамить двойными запросами!
  let extractedText = '';
  if (rawText && rawText.trim().length > 30) {
    extractedText = rawText.trim();
    console.log(`[ProTalk Doc Recognition] Re-using provided document text (${extractedText.length} chars), skipping second extraction.`);
  } else {
    try {
      extractedText = await extractTextFromDocPayload({
        fileUrl: resolvedFileUrl || fileUrl,
        fileName,
        fileBase64,
        mimeType,
        fileBuffer
      });
    } catch (extractErr) {
      console.warn('[ProTalk Doc Recognition] Extraction warning:', extractErr);
    }
  }

  const documentContent = (extractedText || rawText || '').trim() ||
    'Техническое задание на разработку и внедрение автономного ИИ-специалиста для автоматизации обработки обращений, консультирования и квалификации клиентов.';

  // Динамические данные из базы данных для точного выбора подразделения и города
  const deptList = getDepartmentsListForPrompt();
  const cityList = getCitiesListForPrompt();

  // 3. Загрузка системного промпта и шаблона из базы данных (protalk_promts)
  const promptCfg = getPromptConfigByKey('protalk_recognize_doc_tz');
  let systemPrompt = promptCfg?.systemPrompt || `Ты — ведущий бизнес-аналитик и системный архитектор платформы SAV AI.
Твоя задача — внимательно изучить прикрепленный документ (PDF, DOCX, TXT, таблицу или тезисы) и сформировать структурированные данные для точного автозаполнения полей калькулятора автономных ИИ-приложений.

Список подразделений из раздела «Выбор автоматизируемого подразделения компании»:
Выбери наиболее подходящее подразделение из списка ниже в зависимости от специфики задач бизнеса (у нас могут быть не только продавцы, но и рекрутеры, операторы, программисты, маркетологи, юристы, делопроизводители и др.):
1. Отдел продаж — менеджеры по продажам, обработка лидов, квалификация, автодожим и CRM 24/7
2. Отдел найма — HR, рекрутинг, первичный отклик кандидатов, скрининг резюме, автособеседования и тестирование
3. Call-центр — операторы первой линии, обработка входящих/исходящих звонков и чатов, запись на встречи
4. Отдел разработки — программисты, написание кода, развертывание баз BD ProTalk, интеграции API и микросервисов
5. Отдел маркетинга — маркетологи, генерация офферов, автокреативы, сквозная аналитика, рассылки
6. Копирайтинг — авторы контента, рерайт, статьи, сценарии чат-ботов и ведение контент-плана
7. Делопроизводство — документооборот, формирование договоров, актов, счетов и архивный учет
8. Юридический отдел — юристы, комплаенс, аудит контрактов, правовой анализ рисков и претензионная работа

Список городов присутствия для выбора:
{citiesList}
Если в документе или на сайте упоминается конкретный город присутствия бизнеса — выбери его. Если бизнес работает удаленно по всей России или город не указан явно — укажи «Москва».

Типы контактов:
Telegram, WhatsApp, Телефон, Email, MAX, Сетка, ВКонтакте.
(Если указан никнейм @username или ссылка t.me — выбирай Telegram; если номер WhatsApp — WhatsApp; если обычный телефон — Телефон; если почта — Email).

Требования к заполнению каждого поля:
1. «functionality» (поле ввода «Расскажите про вашу компанию и продукт:»):
   Обязательно сформируй исчерпывающее, высокодетализированное техническое задание (ТЗ) на разработку и запуск автономного ИИ-приложения SAV AI (React + BD ProTalk (PostgreSQL)) в стиле Markdown объемом около 4000–5000 символов.
   Текст ТЗ должен быть глубоким, структурированным и разбит на следующие 8 разделов третьего уровня:
   ### 1. Общие сведения о компании, позиционирование и продукт
   (Полное описание сферы деятельности, специфика бизнеса, целевая аудитория B2B/B2C, линейка продуктов/услуг, условия, география и УТП компании).
   ### 2. Текущие проблемы, заменяемые функции и человеческий фактор
   (Подробный разбор рутинных операций сотрудников выбранного подразделения, простои, человеческий фактор, потери входящих заявок из-за задержек ответов, перегрузка CRM).
   ### 3. Функциональные требования к автономному ИИ-приложению SAV AI
   (Модуль квалификации и ведения диалогов 24/7, векторный поиск по регламентам и базе знаний, обработка возражений по авторским скриптам, сценарии эскалации на живых специалистов).
   ### 4. Архитектурные требования и стек технологий (React + BD ProTalk (PostgreSQL))
   (Клиентская часть на React с интерфейсом в стиле Liquid Glass, защищенная база данных PostgreSQL BD ProTalk для мгновенного сохранения состояния и работы без задержек, REST API).
   ### 5. Сценарии диалогов, квалификация и воронка коммуникации
   (Пошаговая карта коммуникации: приветствие, сбор критериев, презентация оффера, снятие возражений, запись на целевое действие / аудит / демо, автодожим при засыпании диалога).
   ### 6. Интеграции с внешними системами (amoCRM / Bitrix24, мессенджеры, телефония)
   (Автоматическое создание лидов, заполнение кастомных полей, передача в CRM, Telegram, WhatsApp, телефония, логирование в Google Таблицах).
   ### 7. Контроль качества, регламенты и KPI
   (100% аудит переписок и звонков на соблюдение скриптов, выявление стоп-слов, расчет конверсий, ежедневные сводки руководству в Telegram).
   ### 8. Ожидаемый экономический эффект, окупаемость и масштабирование
   (Высвобождение ФОТ заменяемых сотрудников, круглосуточная обработка без больничных и отпусков, быстрая окупаемость в первые месяцы).

2. «comment» (поле ввода «Комментарий или задачи автоматизации»):
   Внеси подробный перечень задач автоматизации по пунктам: 1), 2), 3), 4), 5)...
   Опиши уникальные задачи внедрения, настройки интеграций, скриптов и контроля качества, не дублируя текст functionality буквально.

3. «product» (поле ввода «Продукт или услуга *»):
   Краткая емкая суть продукта или услуги ровно около 100 символов (например: «Аренда обученных руководителей отделов продаж (РОП) и роботизация контроля звонков в CRM»).

4. «companyName» (поле «Компания или название проекта *»):
   Реальное имя компании или бренда из описания (например, «РентРОП», «Альфа-Трейд»). Важно: никогда не пиши слово «Проект»!

5. «clientName» (поле «ФИО контактного лица *»):
   ФИО контактного лица. Если не указано явно в тексте — обязательно укажи «Иван Иванов».

6. «city» (поле «Город присутствия со средней зарплатой *»):
   Город из официального списка (например, «Москва», «Санкт-Петербург», «Новосибирск» и т.д.).

7. «phone» (поле «Контакт для бесплатного аудита *»):
   Контактные данные: никнейм в Telegram (@username), телефон (+7...), email или ссылка на сайт/профиль.

8. «contactType»: строго один из: Telegram / WhatsApp / Телефон / Email / MAX / Сетка / ВКонтакте.
9. «employeeCount»: число заменяемых сотрудников цифрой (например: «3», минимум 2).
10. «salaryPerEmployee»: средняя зарплата 1 сотрудника в рублях цифрой (например: «80000»).
11. «department»: точное название подразделения из списка выше.

Пример валидного json для ответа (ответь строго в таком формате без лишнего текста и без капслока):
{
  "functionality": "### 1. Общие сведения о компании, позиционирование и продукт\\nКомпания «РентРОП» (arenda-ropa.com) является лидером в сегменте аренды и управления удаленными отделами продаж для малого и среднего бизнеса. Компания берет на себя полный цикл построения и усиления коммерческих подразделений заказчиков: от подбора, глубокой подготовки и оформления квалифицированных Руководителей Отделов Продаж (РОП) в собственный штат до их оперативного вывода на проекты клиентов. Ключевая услуга включает ежедневное управление менеджерами по продажам, контроль воронки в amoCRM и Bitrix24, регулярное проведение планерок, системное прослушивание звонков и выполнение установленных планов выручки. География присутствия охватывает всю территорию Российской Федерации и страны СНГ благодаря отлаженной модели удаленного взаимодействия. Целевая аудитория — владельцы производственных, оптовых, строительных и сервисных компаний с оборотом от 20 до 500 млн рублей в год, стремящиеся систематизировать продажи без рисков найма некомпетентных управленцев.\\n\\n### 2. Текущие проблемы, заменяемые функции и человеческий фактор\\nВ текущей операционной деятельности компания сталкивается с высокими трудозатратами квалифицированных РОПов и экспертов на рутинные процессы: ручной аудит сотен аудиозаписей разговоров менеджеров, длительное заполнение карточек сделок в CRM-системах, субъективность в оценке кандидатов на этапе массового рекрутинга и задержки в подготовке ежедневных сводок для собственников бизнеса. Человеческий фактор приводит к тому, что до 35% звонков не анализируются вовсе, нарушения регламентов общения выявляются с опозданием, а перспективные лиды остывают из-за отсутствия мгновенной квалификации и круглосуточного автодожима в нерабочее время.\\n\\n### 3. Функциональные требования к автономному ИИ-приложению SAV AI\\nПроект автоматизации нацелен на создание и развертывание автономного веб-приложения SAV AI со следующими модулями:\\n- Интеллектуальный модуль аудита диалогов и звонков: автоматическая транскрибация аудиозаписей из телефонии, сопоставление с эталонным скриптом продаж, выявление стоп-слов, фиксация возражений и выставление объективной оценки качества работы каждого менеджера.\\n- Автономный HR-робот для первичного скрининга кандидатов: интерактивное тестирование соискателей на позицию РОПа и менеджеров по продажам по базе профессиональных кейсов через мессенджер с автоматическим формированием скоринг-карты.\\n- Модуль автоматического сбора утренней и вечерней отчетности: автоматический опрос сотрудников в Telegram, сопоставление фактических показателей с плановыми в режиме реального времени.\\n- Ассистент автодожима лидов: ведение диалогов 24/7 в каналах WhatsApp и Telegram, оперативные консультации по услугам аренды РОПов и передача готовых к аудиту заявок напрямую ведущим экспертам.\\n\\n### 4. Архитектурные требования и стек технологий (React + BD ProTalk (PostgreSQL))\\n- Клиентская часть: современное веб-приложение на базе React, Vite и Tailwind CSS с эстетичным интерфейсом в стиле Liquid Glass, оптимизированное для работы на десктопных и мобильных экранах.\\n- Локальная база данных: высокопроизводительная база данных PostgreSQL BD ProTalk для моментального сохранения всех карточек лидов, расчетов окупаемости, истории аудита и настроек промптов без сетевых задержек.\\n- Серверная часть: защищенный бэкенд на Node.js / Express с API для бесшовной интеграции с нейросетевыми моделями ProTalk, хранилищем файлов и внешними сервисами.\\n\\n### 5. Сценарии диалогов, квалификация и воронка коммуникации\\n- Первичное касание: мгновенный ответ на обращение потенциального клиента в течение 10 секунд в любое время суток.\\n- Квалифицирующий опрос: выявление текущего количества менеджеров, средней зарплаты, используемой CRM-системы, текущей конверсии и основных причин недовыполнения планов продаж.\\n- Презентация ценности: автоматический подбор подходящего тарифа аренды РОПа, расчет финансовой выгоды и окупаемости внедрения.\\n- Закрытие на аудит: согласование удобного времени для бесплатного экспресс-аудита отдела продаж и передача контактных данных ответственному куратору.\\n- Сценарий автодожима: тактичные напоминания через 24, 72 и 120 часов в случае засыпания диалога с предложением полезных материалов и кейсов компании.\\n\\n### 6. Интеграции с внешними системами\\n- amoCRM / Bitrix24: создание и обновление сделок, заполнение кастомных полей (бюджет, число менеджеров, боли клиента, результат скоринга), автоматическое перемещение по этапам воронки.\\n- Мессенджеры: официальные и веб-интеграции с Telegram и WhatsApp для ведения непрерывного диалога с клиентами и сбора внутренней отчетности команды.\\n- Телефония: интеграция с виртуальными АТС для автоматического перехвата аудиозаписей звонков и их маршрутизации на речевой анализ.\\n- Google Таблицы: синхронизация журнала аудита и логов распознавания документов для прозрачной отчетности перед руководством.\\n\\n### 7. Контроль качества, регламенты и KPI\\n- 100% покрытие контроля разговоров менеджеров с формированием отчетов об отклонении от стандартов обслуживания.\\n- Отслеживание ключевых метрик: скорость первого ответа, глубина выявления потребностей, соблюдение структуры презентации ценности, корректность отработки возражений «дорого» и «мы подумаем».\\n- Ежедневная генерация сводного дашборда для руководства с агрегацией конверсий и персональными рейтингами сотрудников.\\n\\n### 8. Ожидаемый экономический эффект, окупаемость и масштабирование\\nВнедрение автономного ИИ-приложения SAV AI позволит высвободить до 25 рабочих часов каждого РОПа в неделю за счет автоматизации рутинного прослушивания звонков и сбора отчетов. Это позволит одному РОПу качественно курировать до 3-4 проектов одновременно без потери фокуса и снижения эффективности. Сокращение прямых расходов на контролирующий персонал составит свыше 180 000 рублей в месяц, конверсия входящих лидов вырастет минимум на 20-25%, а полная окупаемость проекта автоматизации будет достигнута уже в течение первых 1,5–2 месяцев с момента запуска.",
  "clientName": "Иван Иванов",
  "companyName": "РентРОП",
  "product": "Аренда обученных руководителей отделов продаж (РОП) и автоматизация контроля звонков в CRM",
  "city": "Москва",
  "phone": "@rentrop_audit",
  "contactType": "Telegram",
  "comment": "Задачи автоматизации:\\n1) Автоматический скоринг и распознавание 100% аудиозаписей звонков менеджеров по скриптам продаж с фиксацией нарушений в amoCRM.\\n2) Интеллектуальный HR-робот в Telegram для 4-этапного тестирования кандидатов на позицию РОПа по внутренней базе знаний.\\n3) Автоматизированный сбор утренних планов и вечерних отчетов РОПов через Telegram-чат с агрегацией в дашборды.\\n4) Квалификация входящих обращений клиентов на сайте и бесшовная передача в CRM-систему.\\n5) Ежедневная выгрузка сводного аудита в Google Таблицы для контроля собственниками.",
  "employeeCount": "3",
  "salaryPerEmployee": "150000",
  "department": "Отдел продаж",
  "summary": "Компания «РентРОП» предоставляет услуги аренды квалифицированных РОПов. Автоматизация решает задачи скоринга звонков, сбора отчетности и HR-скрининга."
}`;

  systemPrompt = systemPrompt
    .replace(/{departmentsList}/g, deptList)
    .replace(/{citiesList}/g, cityList);

  const userPromptTemplate = promptCfg?.userPromptTemplate || 'Документ / Текст ТЗ: {documentContent}\nСсылка на файл: {fileUrl}';

  const userPromptPart = userPromptTemplate
    .replace(/{documentContent}/g, documentContent.slice(0, 15000))
    .replace(/{fileUrl}/g, resolvedFileUrl || fileUrl || '')
    .replace(/{fileName}/g, fileName || (resolvedFileUrl ? resolvedFileUrl.split('/').pop()?.split('?')[0] || '' : 'Документ ТЗ'))
    .replace(/{departmentsList}/g, deptList)
    .replace(/{citiesList}/g, cityList);

  const fullPrompt = `${systemPrompt}\n\n${userPromptPart}`;

  console.log(`[ProTalk Doc Recognition] Sending document to ProTalk API in chat ${bot_chat_id} with file link: ${resolvedFileUrl || fileUrl}...`);

  let replyText = '';
  try {
    const sent = await sendProTalkMessageAsync(bot_chat_id, fullPrompt, 'calc_doc_tz', 'Распознавание документов');
    if (sent) {
      const startTime = Date.now();
      const timeoutMs = 40000;
      while (Date.now() - startTime < timeoutMs) {
        await new Promise(r => setTimeout(r, 1500));
        try {
          const lastReply = await getProTalkLastReply(bot_chat_id, 'calc_doc_tz', fullPrompt, 'Распознавание документов');
          if (lastReply?.message && !isProTalkNoise(lastReply.message)) {
            replyText = lastReply.message.trim();
            if (replyText.length > 50) {
              break;
            }
          }
        } catch (pollErr) {
          console.warn('[ProTalk Doc Recognition] Poll error:', pollErr);
        }
      }
    }
  } catch (err) {
    console.error('[ProTalk Doc Recognition] Error communicating with ProTalk:', err);
  }

  // If ProTalk responded with text
  if (replyText && replyText.length > 40) {
    let companyName: string | undefined = undefined;
    let clientName: string = 'Иван Иванов';
    let product: string | undefined = undefined;
    let department: string = 'Отдел продаж';
    let city: string = 'Москва';
    let phone: string = '';
    let comment: string = '';
    let employeeCount: string = '2';
    let salaryPerEmployee: string = '80000';
    let contactType: string = 'Telegram';
    let technicalAssignment = replyText;
    let summary = 'Техническое задание успешно сформировано нейросетью.';

    try {
      const parsed = safeParseAiJson(replyText);
      if (parsed) {
        if (parsed.functionality || parsed.technicalAssignment) {
          technicalAssignment = parsed.functionality || parsed.technicalAssignment || technicalAssignment;
        }
        product = parsed.product ? String(parsed.product).slice(0, 150) : undefined;
        summary = parsed.summary || summary;
        comment = parsed.comment || parsed.summary || '';
        
        companyName = (parsed.companyName && parsed.companyName.toLowerCase() !== 'проект' && parsed.companyName.toLowerCase() !== 'название компании') 
          ? parsed.companyName 
          : ((parsed.company && parsed.company.toLowerCase() !== 'проект') ? parsed.company : undefined);
          
        if (parsed.clientName && parsed.clientName.toLowerCase() !== 'не указано') {
          clientName = parsed.clientName;
        } else if (parsed.fullName && parsed.fullName.toLowerCase() !== 'не указано') {
          clientName = parsed.fullName;
        }

        if (parsed.city && parsed.city.toLowerCase() !== 'не указан') {
          city = parsed.city;
        }

        phone = parsed.phone || parsed.contactValue || parsed.contact || '';
        contactType = parsed.contactType || 'Telegram';
        department = normalizeDepartmentName(parsed.department, documentContent);
        if (parsed.employeeCount) {
          employeeCount = String(Math.max(2, parseInt(parsed.employeeCount) || 2));
        }
        if (parsed.salaryPerEmployee || parsed.averageSalary) {
          salaryPerEmployee = String(parsed.salaryPerEmployee || parsed.averageSalary);
        }
      }
    } catch (_) {}

    if (!product && technicalAssignment) {
      const firstLines = technicalAssignment.split('\n').filter(l => l.trim().length > 5);
      if (firstLines[0]) {
        product = firstLines[0].replace(/^[#*\-•\d.]+\s*/, '').slice(0, 120).trim();
      }
    }

    if (summary.startsWith('Техническое задание') && technicalAssignment) {
      const firstLines = technicalAssignment.split('\n').filter(l => l.trim().length > 10).slice(0, 2).join(' ');
      if (firstLines) summary = firstLines.slice(0, 250);
    }

    return {
      companyName,
      clientName,
      fullName: clientName,
      department: normalizeDepartmentName(department, documentContent),
      product,
      city,
      phone,
      contact: phone,
      contactValue: phone,
      contactType,
      comment: comment || summary,
      employeeCount,
      salaryPerEmployee,
      averageSalary: salaryPerEmployee,
      technicalAssignment,
      functionality: technicalAssignment,
      summary,
      rawReply: replyText
    };
  }

  // ProTalk fallback structuring without external services
  let extractedProduct = '';
  let extractedCompany = '';
  const lines = documentContent.split('\n').map(l => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (!extractedCompany && /(?:компани|ооо|зао|ип|бренд|организаци|проект)[:\s]+([^\n,.]+)/i.test(line)) {
      const match = line.match(/(?:компани|ооо|зао|ип|бренд|организаци|проект)[:\s]+([^\n,.]+)/i);
      if (match && match[1]) extractedCompany = match[1].trim();
    }
    if (!extractedProduct && /(?:продукт|услуг|сервис|предложени|направлени)[:\s]+([^\n.]+)/i.test(line)) {
      const match = line.match(/(?:продукт|услуг|сервис|предложени|направлени)[:\s]+([^\n.]+)/i);
      if (match && match[1]) extractedProduct = match[1].trim();
    }
  }
  if (!extractedProduct && lines.length > 0) {
    extractedProduct = lines[0].replace(/^[#*\-•\d.]+\s*/, '').slice(0, 100).trim();
  }

  const finalAssignment = documentContent || 'Техническое задание на внедрение автономного ИИ-специалиста SAV AI.';
  const fallbackComment = `Задачи автоматизации:\n1) Развертывание автономного ИИ-агента для обработки входящих обращений и ведения диалогов 24/7.\n2) Автоматическая квалификация лидов и бесшовная передача данных в CRM.\n3) Контроль качества коммуникаций и подготовка сводных отчетов.\n4) Снижение нагрузки на сотрудников и оптимизация ФОТ.`;

  return {
    companyName: extractedCompany || undefined,
    clientName: 'Иван Иванов',
    fullName: 'Иван Иванов',
    department: normalizeDepartmentName(undefined, documentContent),
    product: extractedProduct || undefined,
    city: 'Москва',
    phone: '',
    contact: '',
    contactValue: '',
    contactType: 'Telegram',
    comment: fallbackComment,
    employeeCount: '2',
    salaryPerEmployee: '80000',
    averageSalary: '80000',
    technicalAssignment: finalAssignment,
    functionality: finalAssignment,
    summary: 'Техническое задание сформировано из прикрепленного документа.',
    rawReply: replyText || finalAssignment
  };
}

/**
 * Generates Technical Assignment (ТЗ) for Custom AI Application replacing a department.
 * CRITICAL CONSTRAINT: Number of core functions must strictly equal the number of replaced employees!
 */
export async function generateCalculatorTzWithProTalk(
  params: {
    companyName?: string;
    product?: string;
    city?: string;
    department?: string;
    employeeCount?: number | string;
    averageSalary?: number | string;
    functionality?: string;
    userUid?: string;
  }
): Promise<{
  tzText: string;
  functionsList: string[];
  summary: string;
  rawReply?: string;
}> {
  const count = Math.max(1, Number(params.employeeCount) || 2);
  const avgSal = Math.round(Number(params.averageSalary) || 68000);
  const monthlyFot = count * avgSal;
  const annualFot = monthlyFot * 12;
  const company = (params.companyName || '').trim() || 'Бизнес клиента';
  const dept = (params.department || '').trim() || 'Отдел продаж';
  const prod = (params.product || '').trim() || 'Товары и услуги';
  const city = (params.city || '').trim() || 'Москва';
  const userFunc = (params.functionality || '').trim() || 'Комплексная роботизация и автономная обработка задач';

  const bot_chat_id = params.userUid && /^\d+$/.test(String(params.userUid).trim())
    ? String(params.userUid).trim()
    : (params.userUid ? String(params.userUid).trim() : generateNumericUID());

  let promptTemplate = getPromptByKey('protalk_calculator_tz_gen');
  if (!promptTemplate || !promptTemplate.includes('{employeeCount}')) {
    promptTemplate = `Ты — ведущий системный архитектор SAV AI. Разработай подробное, строгое и профессиональное Техническое задание (ТЗ) на создание кастомного автономного ИИ-приложения (архитектура React + BD ProTalk), заменяющего целый отдел компании.

КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО: Количество ключевых функций приложения СТРОГО РАВНО количеству заменяемых сотрудников в отделе ({employeeCount} чел.). Каждая функция должна автономно и полностью закрывать обязанности отдельного сотрудника.

Параметры проекта:
- Компания / Проект: {companyName}
- Продукт / Услуга: {product}
- Город: {city}
- Подразделение: {department}
- Количество заменяемых сотрудников: {employeeCount} чел.
- Средняя зарплата 1 сотрудника: {averageSalary} ₽/мес.
- Текущий месячный ФОТ: {monthlyFot} ₽/мес. (годовой ФОТ: {annualFot} ₽/год)
- Исходные пожелания и описание задач: {functionality}

Сформируй ТЗ в следующем формате:
1. Название решения: Индивидуальное ИИ-приложение для роботизации подразделения «{department}»
2. Архитектурный стек: React 18 SPA + российская защищенная база данных BD ProTalk (PostgreSQL), автономный режим 24/7, интеграция с Telegram Bot API и CRM
3. Список ровно из {employeeCount} ключевых автономных функций приложения (по 1 функции на каждого из {employeeCount} сотрудников):
   [Для каждого сотрудника 1..{employeeCount} напиши развернутый блок объемом 2-3 подробных предложения: конкретный перечень заменяемых рутинных операций сотрудника, требования к автономному алгоритму 24/7, валидация данных и фиксация в российской базе данных BD ProTalk. СТРОГОЕ ТРЕБОВАНИЕ: категорически запрещено ставить точку с запятой (;) или запятую (,) на конце строк и пунктов! Завершай предложения обычной точкой (.) или без знака препинания.]
4. Потоки данных и интеграции (CRM, мессенджеры, уведомления руководству)
5. Экономический результат: Полное замещение {employeeCount} сотрудников с ФОТ {monthlyFot} ₽/мес. ({annualFot} ₽/год), окупаемость за 1-2 месяца.`;
  }

  const fullPrompt = promptTemplate
    .replace(/{companyName}/g, company)
    .replace(/{product}/g, prod)
    .replace(/{city}/g, city)
    .replace(/{department}/g, dept)
    .replace(/{employeeCount}/g, String(count))
    .replace(/{averageSalary}/g, avgSal.toLocaleString('ru-RU'))
    .replace(/{monthlyFot}/g, monthlyFot.toLocaleString('ru-RU'))
    .replace(/{annualFot}/g, annualFot.toLocaleString('ru-RU'))
    .replace(/{functionality}/g, userFunc);

  console.log(`[ProTalk Calc TZ] Generating TZ with ${count} functions for ${company} (${dept}) in chat ${bot_chat_id}...`);

  let replyText = '';
  try {
    const sent = await sendProTalkMessageAsync(bot_chat_id, fullPrompt, params.userUid || 'calc_user', 'Калькулятор ТЗ');
    if (sent) {
      const startTime = Date.now();
      const timeoutMs = 60000;
      while (Date.now() - startTime < timeoutMs) {
        await new Promise(r => setTimeout(r, 1800));
        const lastReply = await getProTalkLastReply(bot_chat_id, params.userUid || 'calc_user', fullPrompt, 'Калькулятор ТЗ');
        if (lastReply?.message && !isProTalkNoise(lastReply.message)) {
          replyText = lastReply.message.trim();
          if (replyText.length > 50) {
            break;
          }
        }
      }
    }
  } catch (err) {
    console.warn('[ProTalk Calc TZ Error]', err);
  }

  // Comprehensive canonical department functions (detailed 1-2 sentences, no semicolons)
  const CANONICAL_DEPT_FUNCTIONS: Record<string, string[]> = {
    'Отдел продаж': [
      'Автономная квалификация входящих лидов и выявление потребностей клиентов 24/7 с фиксацией параметров в базе данных',
      'Интерактивный расчет сметы проекта, презентация коммерческого предложения и подбор оптимального тарифа без участия человека',
      'Автодожим клиентов по сценариям продаж, квалифицированная отработка типовых возражений и генерация счетов на оплату',
      'Бесшовная синхронизация с CRM (AmoCRM и Bitrix24), автоматическое обогащение карточек сделок и передача истории переписки',
      'Контроль повторных продаж постоянным клиентам, мониторинг оплат и автоматический сбор обратной связи по качеству обслуживания',
      'Глубокий анализ истории коммуникаций, ведение аудиторского журнала в BD ProTalk и регулярная отправка сводных отчетов руководству в Telegram'
    ],
    'Отдел найма': [
      'Автоматический первичный скрининг входящих резюме и откликов соискателей с парсингом ключевых навыков и оценкой соответствия профилю должности',
      'Проведение интерактивного квалификационного собеседования и анкетирования кандидатов в чат-боте 24/7 с фиксацией ответов в базе данных',
      'Интеллектуальная выдача профильных тестовых заданий и автоматическая проверка результатов со скорингом компетенций кандидата',
      'Автоматизированный онбординг принятых сотрудников: выдача регламентов компании, проверка усвоения информации и сбор подтверждений',
      'Формирование цифрового досье финалистов конкурса и мгновенная отправка сводки с рекомендациями руководителю подразделения',
      'Непрерывное ведение базы кадрового резерва компании в BD ProTalk с регулярной реактивацией соискателей и анонсами новых вакансий'
    ],
    'Сall-центр': [
      'Круглосуточный прием и маршрутизация входящих обращений в текстовых каналах и телефонии без очередей и ожидания оператора',
      'Автономное консультирование по базе знаний, тарифам и регламентам компании с мгновенным поиском точных ответов',
      'Интерактивная запись клиентов на аудит и консультации с бронированием слотов в корпоративном календаре',
      'Автоматизированное информирование клиентов о статусе исполнения заказов, платежей и готовности отчетных документов',
      'Сбор индекса потребительской лояльности NPS и оперативная эскалация негативных инцидентов на дежурного менеджера',
      'Автоматический обзвон базы контактов с персонализированными сервисными напоминаниями и фиксацией результата в CRM'
    ],
    'Call-центр': [
      'Круглосуточный прием и маршрутизация входящих обращений в текстовых каналах и телефонии без очередей и ожидания оператора',
      'Автономное консультирование по базе знаний, тарифам и регламентам компании с мгновенным поиском точных ответов',
      'Интерактивная запись клиентов на аудит и консультации с бронированием слотов в корпоративном календаре',
      'Автоматизированное информирование клиентов о статусе исполнения заказов, платежей и готовности отчетных документов',
      'Сбор индекса потребительской лояльности NPS и оперативная эскалация негативных инцидентов на дежурного менеджера',
      'Автоматический обзвон базы контактов с персонализированными сервисными напоминаниями и фиксацией результата в CRM'
    ],
    'Отдел маркетинга': [
      'Генерация высококонверсионных продающих офферов, текстов креативов и рекламных гипотез под целевые сегменты аудитории',
      'Сквозной анализ эффективности каналов привлечения трафика, расчет стоимости лида и конверсий воронки в реальном времени',
      'Умная сегментация клиентской базы и запуск триггерных персонализированных рассылок по поведению пользователей',
      'Автоматическое A/B тестирование лид-магнитов и посадочных страниц с фиксацией статистически значимых лидеров',
      'Мониторинг цен, акций и продуктовых предложений прямых конкурентов в нише с выгрузкой аналитических сводок',
      'Формирование и поддержание контент-плана публикаций с автоматическим постингом материалов в корпоративные медиа'
    ],
    'Отдел разработки': [
      'Автоматическая генерация, верификация и отладка серверного кода, API-эндпоинтов и защищенных SQL-запросов',
      'Развертывание и сопровождение баз данных React + BD ProTalk (PostgreSQL) с контролем целостности и резервным копированием',
      'Интеграция внешних API сервисов (Telegram Bot API, платежные шлюзы, CRM-системы и складской учет)',
      'Круглосуточный мониторинг логов приложения, диагностика ошибок и автоматическое оповещение команды инженеров',
      'Сквозное автоматизированное тестирование пользовательских сценариев и проверка отказоустойчивости сервисов',
      'Подготовка и актуализация технической спецификации, документации архитектуры и контрактов REST API'
    ],
    'Делопроизводство': [
      'Автоматическое формирование типовых договоров, спецификаций, счетов и актов выполненных работ по шаблонам компании',
      'Распознавание реквизитов контрагентов и проверка корректности входящей документации перед внесением в реестр',
      'Централизованная регистрация входящей и исходящей корреспонденции в защищенной базе данных BD ProTalk',
      'Автоматический контроль сроков действия договоров, этапов закрытия обязательств и выставления первичных документов',
      'Быстрая подготовка выгрузок и архивных пакетов документов по запросам бухгалтерии и аудиторов',
      'Безопасная доставка электронных документов клиентам через Telegram и защищенные почтовые каналы'
    ],
    'Юридический отдел': [
      'Экспресс-аудит договоров и соглашений на скрытые юридические риски, штрафные санкции и невыгодные условия',
      'Сверка положений контрактов с действующей нормативной базой и корпоративными регламентами безопасности компании',
      'Автоматизированная подготовка типовых досудебных претензий, протоколов разногласий и дополнительных соглашений',
      'Первичное консультирование сотрудников по правовым стандартам ведения переговоров и типовым договорам',
      'Мониторинг регуляторных изменений в законодательстве отрасли с оценкой влияния на текущую деятельность компании',
      'Ведение электронного реестра доверенностей, лицензий и юридически значимых соглашений организации'
    ],
    'Копирайтинг': [
      'Глубокий рерайт и адаптация текстовых материалов под фирменный Tone of Voice и позиционирование бренда',
      'Создание экспертных статей, кейсов внедрения и аналитических лонгридов для блога компании и СМИ',
      'Адаптация контента под форматы Telegram-каналов, социальных сетей и профессиональных площадок',
      'Разработка серий прогревающих email-писем и сценариев сообщений для автоматических воронок продаж',
      'SEO-оптимизация текстов карточек товаров, категорий и лендингов с органическим внедрением ключевых запросов',
      'Стилистическая и грамматическая вычитка всех исходящих маркетинговых и сервисных текстов компании'
    ]
  };

  const pool = CANONICAL_DEPT_FUNCTIONS[dept] || CANONICAL_DEPT_FUNCTIONS['Отдел продаж'];

  // Fallback if ProTalk reply is empty or unavailable
  if (!replyText || replyText.length < 30) {
    const selectedFunctions: string[] = [];
    for (let i = 0; i < count; i++) {
      if (i < pool.length) {
        selectedFunctions.push(pool[i]);
      } else {
        selectedFunctions.push(`Автономный модуль ${i + 1}: специализированная автоматизация задач подразделения ${dept} в режиме 24/7`);
      }
    }

    replyText = `Техническое задание на создание ИИ-приложения

1. Проект: Автономное ИИ-приложение для роботизации подразделения «${dept}» компании «${company}».
2. Архитектура: React + BD ProTalk (PostgreSQL, российское защищенное хранение), интеграция с Telegram Bot API и CRM.
3. Состав приложения (${count} ключевых функций — замещение ${count} сотрудников):
${selectedFunctions.map((fn, idx) => `   ${idx + 1}. ${fn}`).join('\n')}
4. Интеграция: Подключение к каналам связи, передача горячих лидов, журнал событий в BD ProTalk.
5. Экономический результат: Полная автоматизация рабочих мест (${count} чел.), высвобождение ФОТ и окупаемость в кратчайшие сроки.`;
  }

  // Intelligently extract functions from section 3 or numbered lists
  let candidateLines: string[] = [];
  const section3Match = replyText.match(/(?:3\.\s*(?:Список|Состав|Ключевые|Основные)[^\n]*\n)([\s\S]*?)(?=(?:\n\s*[4-9]\.|\n\s*Потоки|\n\s*Интеграци|\n\s*Экономическ|$))/i);
  if (section3Match && section3Match[1]) {
    const subMatches = section3Match[1].match(/(?:^\s*(?:\d+[\.\)]|[-•*])\s*)([^\n]+)/gm);
    if (subMatches && subMatches.length > 0) {
      candidateLines = subMatches
        .map(l => l.replace(/^\s*(?:\d+[\.\)]|[-•*])\s*/, '').replace(/[;,]+$/, '').trim())
        .filter(l => l.length > 5);
    }
  }

  // Fallback: look for all numbered list items excluding top-level section headings
  if (candidateLines.length < count) {
    const allLines = replyText.split('\n');
    for (const line of allLines) {
      const trimmed = line.trim();
      if (/^(?:\d+[\.\)]|[-•*])\s+/.test(trimmed)) {
        const textOnly = trimmed.replace(/^(?:\d+[\.\)]|[-•*])\s+/, '').replace(/[;,]+$/, '').trim();
        // Skip obvious section headers
        if (/^(?:Название решения|Архитектурный стек|Потоки данных|Интеграци|Экономический результат|Список ровно|Состав)/i.test(textOnly)) {
          continue;
        }
        if (textOnly.length > 10 && !candidateLines.includes(textOnly)) {
          candidateLines.push(textOnly);
        }
      }
    }
  }

  let functionsList = candidateLines.map(fn => fn.replace(/[;,]+$/, '').trim());
  if (functionsList.length > count) {
    functionsList = functionsList.slice(0, count);
  } else if (functionsList.length < count) {
    for (let i = functionsList.length; i < count; i++) {
      if (i < pool.length && !functionsList.includes(pool[i])) {
        functionsList.push(pool[i].replace(/[;,]+$/, '').trim());
      } else {
        functionsList.push(`Автономный модуль ${i + 1}: специализированная автоматизация задач подразделения ${dept} в режиме 24/7`);
      }
    }
  }

  return {
    tzText: replyText,
    functionsList,
    summary: `Разработано ТЗ на ИИ-приложение с ровно ${count} ключевыми функциями для замены ${count} сотрудников.`,
    rawReply: replyText
  };
}

/**
 * Sends a Telegram admin notification message
 */
export async function sendTelegramAdminNotification(messageText: string): Promise<boolean> {
  const { botToken, adminChatId } = getBotConfig();
  try {
    return await sendTelegramMessage(botToken, adminChatId, messageText);
  } catch (e) {
    console.warn('Failed to send Telegram admin notification:', e);
    return false;
  }
}

/**
 * Parses voice, text or document input into structured Calculator Survey fields using ProTalk AI
 */
export async function parseVoiceCalculatorWithProTalk(
  userInput: string,
  userUid?: string,
  docPayload?: {
    fileUrl?: string;
    fileName?: string;
    fileBase64?: string;
    mimeType?: string;
    fileBuffer?: Buffer;
    chat_id?: string;
  }
): Promise<{
  clientName: string;
  companyName: string;
  product: string;
  city: string;
  phone: string;
  contactType: string;
  department: string;
  employeeCount: string;
  salaryPerEmployee: string;
  functionality: string;
  hasSla: boolean;
  promoCode: string;
  comment: string;
  summary: string;
}> {
  let docText = '';
  if (docPayload) {
    try {
      docText = await extractTextFromDocPayload(docPayload);
    } catch (e) {
      console.warn('[parseVoiceCalculatorWithProTalk] doc extract note:', e);
    }
  }

  let cleanInput = (userInput || '').trim();
  if (docText) {
    cleanInput = cleanInput 
      ? `${cleanInput}\n\n[Текст документа ${docPayload?.fileName || ''}]:\n${docText.slice(0, 12000)}` 
      : docText.slice(0, 14000);
  }

  if (!cleanInput) {
    return {
      clientName: 'Иван Иванов',
      companyName: '',
      product: '',
      city: 'Москва',
      phone: '',
      contactType: 'Telegram',
      department: 'Отдел продаж',
      employeeCount: '2',
      salaryPerEmployee: '80000',
      functionality: '',
      hasSla: false,
      promoCode: '',
      comment: '',
      summary: ''
    };
  }

  // Use persistent user UID for chat_id session
  const passedChatId = docPayload?.chat_id;
  let bot_chat_id = passedChatId || userUid || '';
  if (bot_chat_id) {
    bot_chat_id = String(bot_chat_id).trim();
    if (!bot_chat_id.endsWith('_tz')) {
      bot_chat_id = `${bot_chat_id}_tz`;
    }
  } else {
    bot_chat_id = `${generateNumericUID()}_tz`;
  }

  const deptList = getDepartmentsListForPrompt();
  const cityList = getCitiesListForPrompt();

  let promptTemplate = getPromptByKey('protalk_calculator_voice_parse');
  if (!promptTemplate) {
    promptTemplate = `Ты — ведущий системный архитектор SAV AI для автоматического структурирования диктовки, ТЗ или документа и заполнения анкеты калькулятора ИИ-приложений.
Пользователь предоставил информацию о своем бизнесе и проекте автоматизации:
"{userInput}"

СПИСОК ПОДРАЗДЕЛЕНИЙ ИЗ РАЗДЕЛА «ВЫБОР АВТОМАТИЗИРУЕМОГО ПОДРАЗДЕЛЕНИЯ КОМПАНИИ»:
Выбери НАИБОЛЕЕ подходящее подразделение из списка ниже:
{departmentsList}

СПИСОК ГОРОДОВ ПРИСУТСТВИЯ:
{citiesList}
Если город не указан явно — укажи «Москва».

ТИПЫ КОНТАКТОВ:
Telegram, WhatsApp, Телефон, Email, MAX, Сетка, ВКонтакте.

Извлеки данные и верни СТРОГО валидный JSON без лишнего текста и без капслока:
{
  "functionality": "Подробное, структурированное ТЗ для поля «Расскажите про вашу компанию и продукт:». Опиши цели проекта, специфику бизнеса, перечень заменяемых функций сотрудников, требования к функционалу ИИ-агента, сценарии диалогов в Telegram/CRM и ожидаемые результаты",
  "clientName": "ФИО контактного лица для поля «ФИО контактного лица *». Если имя не указано явно в тексте, ОБЯЗАТЕЛЬНО укажи 'Иван Иванов'",
  "companyName": "Название компании или бренда бизнеса из описания для поля «Компания или название проекта *». ВАЖНО: никогда не пиши слово 'Проект', извлеки реальное наименование компании или бренда, например РентРОП или Альфа-Трейд",
  "product": "Краткая емкая суть продукта или услуги ровно около 100 символов для поля ввода «Продукт или услуга *» (например: «Автоматизированная аренда строительной техники и квалификация заказчиков в Telegram»)",
  "city": "Город присутствия для поля «Город присутствия со средней зарплатой *». Если город не указан явно, ОБЯЗАТЕЛЬНО укажи 'Москва'",
  "phone": "Телефон, никнейм в Telegram (@username) или контакт для поля «Контакт для бесплатного аудита *»",
  "comment": "Подробный перечень задач автоматизации по пунктам (1, 2, 3...) и сценарии для поля «Комментарий или задачи автоматизации»",
  "employeeCount": "Число заменяемых сотрудников цифрой для поля «Численность отдела (заменяемые сотрудники) *» (например: '3', минимум 2)",
  "salaryPerEmployee": "Средняя зарплата одного сотрудника в рублях цифрой для поля «Средняя зарплата 1 сотрудника *» (например: '80000')",
  "department": "Одно из подразделений из списка выше",
  "contactType": "Telegram / WhatsApp / Телефон / Email / MAX / Сетка / ВКонтакте",
  "hasSla": true/false,
  "promoCode": "Промокод (если назван)",
  "summary": "Краткое емкое резюме ТЗ и ключевые задачи автоматизации (2-4 предложения) для поля комментариев"
}`;
  }

  const fullPrompt = promptTemplate
    .replace(/{userInput}/g, cleanInput)
    .replace(/{departmentsList}/g, deptList)
    .replace(/{citiesList}/g, cityList);

  console.log(`[ProTalk Calculator Parse] Sending prompt to ProTalk API in chat ${bot_chat_id}...`);

  let replyText = '';
  try {
    const sent = await sendProTalkMessageAsync(bot_chat_id, fullPrompt, 'calc_survey_parse', 'Калькулятор (Голосовой ввод)');
    if (sent) {
      const startTime = Date.now();
      while (Date.now() - startTime < 35000) {
        await new Promise(r => setTimeout(r, 1500));
        const lastReply = await getProTalkLastReply(bot_chat_id, 'calc_survey_parse', fullPrompt, 'Калькулятор (Голосовой ввод)');
        if (lastReply?.message && !isProTalkNoise(lastReply.message)) {
          replyText = lastReply.message.trim();
          if (replyText.includes('{') && replyText.includes('}')) break;
        }
      }
    }
  } catch (err) {
    console.warn('[ProTalk Voice Parse Warning]', err);
  }

  try {
    const parsed = safeParseAiJson(replyText);
    if (parsed) {
      const rawCompany = (parsed.companyName || parsed.company || '').trim();
      const cleanCompany = (rawCompany && rawCompany.toLowerCase() !== 'проект' && rawCompany.toLowerCase() !== 'название компании')
        ? rawCompany
        : '';

      const rawCity = (parsed.city || '').trim();
      const cleanCity = (rawCity && rawCity.toLowerCase() !== 'не указан') ? rawCity : 'Москва';

      const rawName = (parsed.clientName || parsed.fullName || '').trim();
      const cleanName = (rawName && rawName.toLowerCase() !== 'не указано') ? rawName : 'Иван Иванов';

      return {
        clientName: cleanName,
        companyName: cleanCompany,
        product: parsed.product || '',
        city: cleanCity,
        phone: parsed.phone || parsed.contactValue || '',
        contactType: parsed.contactType || 'Telegram',
        department: parsed.department || 'Отдел продаж',
        employeeCount: String(Math.max(2, parseInt(parsed.employeeCount) || 2)),
        salaryPerEmployee: String(parsed.salaryPerEmployee || parsed.averageSalary || '80000'),
        functionality: parsed.functionality || cleanInput,
        hasSla: Boolean(parsed.hasSla),
        promoCode: parsed.promoCode || '',
        comment: parsed.comment || parsed.summary || cleanInput.slice(0, 300),
        summary: parsed.summary || cleanInput.slice(0, 200)
      };
    }
  } catch (e) {
    console.warn('[Voice Parse JSON Extract fallback]', e);
  }

  // Heuristic extraction fallback when ProTalk structured JSON is parsing directly
  let fallbackCompany = '';
  let fallbackProduct = '';
  let fallbackCity = 'Москва';
  let fallbackPhone = '';

  const phoneMatch = cleanInput.match(/(?:\+7|8)[\s(-]?\d{3}[\s)-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/);
  if (phoneMatch) fallbackPhone = phoneMatch[0];

  const compMatch = cleanInput.match(/(?:компани|ооо|зао|ип|бренд|организаци|проект)[:\s]+([^\n,.]+)/i);
  if (compMatch && compMatch[1]) fallbackCompany = compMatch[1].trim();

  const cityMatch = cleanInput.match(/(?:город|г\.|в\s+городе)[:\s]+([А-Яа-яЁё-]+)/i);
  if (cityMatch && cityMatch[1]) fallbackCity = cityMatch[1].trim();

  const prodMatch = cleanInput.match(/(?:продукт|услуг|сервис|продаем|занимаемся)[:\s]+([^\n.]+)/i);
  if (prodMatch && prodMatch[1]) fallbackProduct = prodMatch[1].trim();
  if (!fallbackProduct) fallbackProduct = cleanInput.slice(0, 80);

  return {
    clientName: 'Иван Иванов',
    companyName: fallbackCompany,
    product: fallbackProduct,
    city: fallbackCity,
    phone: fallbackPhone,
    contactType: 'Telegram',
    department: 'Отдел продаж',
    employeeCount: '2',
    salaryPerEmployee: '80000',
    functionality: cleanInput,
    hasSla: false,
    promoCode: '',
    comment: cleanInput.slice(0, 150),
    summary: cleanInput.slice(0, 150)
  };
}

/**
 * Intelligent Match of Expert Curator
 */
export async function matchExpertWithProTalk(
  params: {
    companyName?: string;
    product?: string;
    department?: string;
    tzText?: string;
    userUid?: string;
  }
): Promise<{
  expertId: string;
  expertName: string;
  matchScore: number;
  matchReason: string;
}> {
  const dept = params.department || 'Отдел продаж';
  const company = params.companyName || 'Бизнес клиента';
  const prod = params.product || 'Услуги и товары';
  const tz = params.tzText || '';

  let rawExperts: any[] = [];
  try {
    rawExperts = executeQuery("SELECT id, greeting, pseudonym, spheres, tools, description, cases FROM sav_experts ORDER BY id ASC");
  } catch (e) {
    try {
      rawExperts = executeQuery("SELECT id, greeting, pseudonym, spheres, tools, description, cases FROM sav_experts");
    } catch (e2) {
      rawExperts = [];
    }
  }

  const experts = (rawExperts && rawExperts.length > 0 ? rawExperts : [
    { id: '6894f5b1-9a96-4cc0-93d7-9383ff5e924a', greeting: 'Mr.', pseudonym: 'Poison', spheres: 'Военная промышленность, производство, звуковые студии', tools: 'ProTalk, ChatGPT, CRM' },
    { id: '7d0c35c2-a05c-4b83-bf63-8f1cb8d9db37', greeting: 'Mrs.', pseudonym: 'Black', spheres: 'Офлайн образование, Логистика, Недвижимость, B2B', tools: 'AMO CRM, Битрикс 24, ProTalk' },
    { id: 'b25a1d0a-25a7-4911-bffa-9ffdd32e571c', greeting: 'Mr.', pseudonym: 'Copper', spheres: 'Разработка сайтов, интернет-магазины, автосалоны, B2B', tools: 'Python, ProTalk, Webhook, API' },
    { id: 'c34b1d0a-25a7-4911-bffa-9ffdd32e571d', greeting: 'Ms.', pseudonym: 'Violet', spheres: 'Отдел продаж, сервис, клиентская поддержка, CRM', tools: 'ProTalk, ChatGPT, Claude, CRM' }
  ]).map((e: any) => {
    const greeting = (e.greeting || '').trim();
    const pseudonym = (e.pseudonym || '').trim();
    const fullPseudonym = greeting
      ? `${greeting}${greeting.endsWith('.') ? '' : '.'}${pseudonym}`
      : pseudonym;
    return {
      ...e,
      fullPseudonym: fullPseudonym || 'Эксперт SAV AI',
      name: fullPseudonym || pseudonym
    };
  });

  const expertsListText = experts.map((e: any) => 
    `ID: ${e.id} | Полный псевдоним: ${e.fullPseudonym} | Сферы: ${e.spheres || ''} | Кейсы: ${e.cases || ''} | Инструменты: ${e.tools || ''}`
  ).join('\n');

  const bot_chat_id = params.userUid && /^\d+$/.test(String(params.userUid).trim())
    ? String(params.userUid).trim()
    : generateNumericUID();

  let promptTemplate = getPromptByKey('protalk_calculator_expert_match');
  if (!promptTemplate) {
    promptTemplate = `Ты — ведущий HR и тимлид платформы SAV AI. Подбери идеального эксперта-куратора для проекта ИИ-приложения (замена или усиление подразделения {department} компании "{companyName}", продукт: "{product}").

Список доступных экспертов:
{expertsList}

Выбери одного наиболее подходящего эксперта и верни строго JSON:
{
  "expertId": "id эксперта из списка",
  "expertName": "Полный псевдоним эксперта (например: Ms.Violet, Mrs.Black, Mr.Copper, Mr.Poison)",
  "matchScore": 97,
  "matchReason": "Критерии: {expertName} наиболее подходит для проекта компании {companyName} по автоматизации подразделения {department}, обладая релевантным стеком инструментов и подтвержденными кейсами."
}`;
  }

  const fullPrompt = promptTemplate
    .replace(/{companyName}/g, company)
    .replace(/{product}/g, prod)
    .replace(/{department}/g, dept)
    .replace(/{tzText}/g, tz.slice(0, 300))
    .replace(/{expertsList}/g, expertsListText);

  let replyText = '';
  try {
    const sent = await sendProTalkMessageAsync(bot_chat_id, fullPrompt, params.userUid || 'calculator_user', 'Подбор экспертов');
    if (sent) {
      const startTime = Date.now();
      while (Date.now() - startTime < 60000) {
        await new Promise(r => setTimeout(r, 1500));
        const lastReply = await getProTalkLastReply(bot_chat_id, params.userUid || 'calculator_user', fullPrompt, 'Подбор экспертов');
        if (lastReply?.message && !isProTalkNoise(lastReply.message)) {
          replyText = lastReply.message.trim();
          if (replyText.includes('{') && replyText.includes('}')) break;
        }
      }
    }
  } catch (err) {
    console.warn('[ProTalk Expert Match Warning]', err);
  }

  try {
    const jsonStr = replyText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIdx = jsonStr.indexOf('{');
    const endIdx = jsonStr.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const parsed = JSON.parse(jsonStr.substring(startIdx, endIdx + 1));
      if (parsed.expertId || parsed.expertName) {
        const matched = experts.find((e: any) => 
          String(e.id) === String(parsed.expertId) ||
          e.fullPseudonym.toLowerCase() === String(parsed.expertName || '').toLowerCase() ||
          e.pseudonym.toLowerCase() === String(parsed.expertName || '').toLowerCase()
        ) || experts[0];

        const fullPseudonym = matched.fullPseudonym || parsed.expertName || 'Ms.Violet';
        return {
          expertId: matched.id,
          expertName: fullPseudonym,
          matchScore: Number(parsed.matchScore) || 97,
          matchReason: parsed.matchReason || `Критерии: ${fullPseudonym} наиболее подходит для проекта компании «${company}» по автоматизации подразделения «${dept}».`
        };
      }
    }
  } catch (e) {
    console.warn('[Expert Match JSON extract fallback]', e);
  }

  // Smart algorithmic fallback based on department keyword matching
  let selected = experts.find((e: any) => e.pseudonym?.toLowerCase().includes('violet')) || experts[0];
  const deptLower = dept.toLowerCase();
  if (deptLower.includes('продаж') || deptLower.includes('клиент') || deptLower.includes('call') || deptLower.includes('сервис')) {
    selected = experts.find((e: any) => e.pseudonym?.toLowerCase().includes('violet') || String(e.spheres || '').toLowerCase().includes('продаж')) || selected;
  } else if (deptLower.includes('разработк') || deptLower.includes('it') || deptLower.includes('сайт')) {
    selected = experts.find((e: any) => e.pseudonym?.toLowerCase().includes('copper') || String(e.spheres || '').toLowerCase().includes('разработк')) || selected;
  } else if (deptLower.includes('маркетинг') || deptLower.includes('реклам') || deptLower.includes('smm')) {
    selected = experts.find((e: any) => e.pseudonym?.toLowerCase().includes('black') || String(e.spheres || '').toLowerCase().includes('маркетинг')) || selected;
  } else if (deptLower.includes('производств') || deptLower.includes('военн')) {
    selected = experts.find((e: any) => e.pseudonym?.toLowerCase().includes('poison') || String(e.spheres || '').toLowerCase().includes('производств')) || selected;
  }

  const finalName = selected.fullPseudonym || 'Ms.Violet';
  const finalReason = `Критерии: ${finalName} наиболее подходит для проекта компании «${company}» по автоматизации подразделения «${dept}», обладая подтвержденными кейсами и опытом интеграции.`;

  try {
    const tokensOut = Math.ceil(finalReason.length / 4);
    executeRun(`
      UPDATE protalk_logs
      SET bot_reply = ?, tokens_out_source = ?, tokens_total = tokens_in_source + ?, tokens_user = tokens_in_source + ?
      WHERE channel_id = ? AND bot_reply LIKE '%Ожидание ответа%'
    `, [JSON.stringify({ expertId: selected.id, expertName: finalName, matchScore: 97, matchReason: finalReason }), tokensOut, tokensOut, tokensOut, bot_chat_id]);
    saveDb();
  } catch (_) {}

  return {
    expertId: selected.id,
    expertName: finalName,
    matchScore: 97,
    matchReason: finalReason
  };
}
