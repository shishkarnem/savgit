import { executeQuery, executeRun, saveDb } from '../db/database';
import { sendTelegramMessage } from './telegramNotifier';
import nodemailer from 'nodemailer';
import {
  generateSteampunkBusinessImageWithProTalk,
  generateDirectImageWithProTalk,
  sendProTalkMessageAsync,
  getProTalkLastReply,
  getProTalkConfig
} from './proTalkService';

export interface MemePost {
  id: string;
  target_audience: 'clients' | 'partners';
  title: string;
  subtitle?: string | null;
  text_rich: string;
  image_url: string | null;
  image_prompt: string | null;
  status: 'draft' | 'approved' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  admin_test_sent_at: string | null;
  recipients_total: number;
  recipients_sent: number;
  recipients_blocked: number;
  recipients_failed: number;
  created_at: string;
  updated_at: string;
}

export interface MemeAutopilotConfig {
  id: string;
  is_active: number;
  interval_days: number;
  generation_hour_msk: number;
  generation_minute_msk: number;
  send_window_start_hour_msk: number;
  send_window_end_hour_msk: number;
  admin_telegram_id: string;
  last_generation_at: string | null;
  last_dispatch_at: string | null;
  updated_at: string;
}

const DEFAULT_CONFIG: MemeAutopilotConfig = {
  id: 'primary',
  is_active: 1,
  interval_days: 2,
  generation_hour_msk: 7,
  generation_minute_msk: 0,
  send_window_start_hour_msk: 10,
  send_window_end_hour_msk: 17,
  admin_telegram_id: '169262990',
  last_generation_at: null,
  last_dispatch_at: null,
  updated_at: new Date().toISOString()
};

/**
 * Returns current MSK Date
 */
export function getMskDate(): Date {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 3));
}

/**
 * Get active Meme Autopilot config from BD ProTalk
 */
export function getMemeAutopilotConfig(): MemeAutopilotConfig {
  try {
    const rows = executeQuery<MemeAutopilotConfig>("SELECT * FROM meme_autopilot_config WHERE id = 'primary'");
    if (rows && rows.length > 0) {
      return rows[0];
    }
  } catch (err) {
    console.error('[Meme Autopilot] Error fetching config:', err);
  }
  return DEFAULT_CONFIG;
}

/**
 * Update Meme Autopilot config in BD ProTalk
 */
export function updateMemeAutopilotConfig(updates: Partial<MemeAutopilotConfig>): MemeAutopilotConfig {
  const current = getMemeAutopilotConfig();
  const updated: MemeAutopilotConfig = {
    ...current,
    ...updates,
    is_active: updates.is_active !== undefined ? Number(updates.is_active) : current.is_active,
    interval_days: updates.interval_days !== undefined ? Number(updates.interval_days) : current.interval_days,
    generation_hour_msk: updates.generation_hour_msk !== undefined ? Number(updates.generation_hour_msk) : current.generation_hour_msk,
    generation_minute_msk: updates.generation_minute_msk !== undefined ? Number(updates.generation_minute_msk) : current.generation_minute_msk,
    send_window_start_hour_msk: updates.send_window_start_hour_msk !== undefined ? Number(updates.send_window_start_hour_msk) : current.send_window_start_hour_msk,
    send_window_end_hour_msk: updates.send_window_end_hour_msk !== undefined ? Number(updates.send_window_end_hour_msk) : current.send_window_end_hour_msk,
    admin_telegram_id: updates.admin_telegram_id !== undefined ? String(updates.admin_telegram_id).trim() : current.admin_telegram_id,
    updated_at: new Date().toISOString()
  };

  try {
    executeRun(`
      INSERT OR REPLACE INTO meme_autopilot_config (
        id, is_active, interval_days, generation_hour_msk, generation_minute_msk,
        send_window_start_hour_msk, send_window_end_hour_msk, admin_telegram_id,
        last_generation_at, last_dispatch_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      updated.id,
      updated.is_active,
      updated.interval_days,
      updated.generation_hour_msk,
      updated.generation_minute_msk,
      updated.send_window_start_hour_msk,
      updated.send_window_end_hour_msk,
      updated.admin_telegram_id,
      updated.last_generation_at,
      updated.last_dispatch_at,
      updated.updated_at
    ]);
    saveDb();
    console.log('[Meme Autopilot] Config successfully saved to BD ProTalk in real-time:', updated);
  } catch (err) {
    console.error('[Meme Autopilot] Error updating config:', err);
  }

  return updated;
}

/**
 * Get Telegram Bot tokens for clients and partners
 */
export function getMemeBotCredentials(target: 'clients' | 'partners'): { botToken: string; botUsername: string } {
  if (target === 'partners') {
    try {
      const pBot = executeQuery<{ bot_token: string; bot_name: string }>("SELECT bot_token, bot_name FROM partner_bot_config LIMIT 1")?.[0];
      if (pBot?.bot_token) {
        return { botToken: pBot.bot_token.trim(), botUsername: pBot.bot_name || '@SAVPartnerBot' };
      }
    } catch (_) {}
    return { botToken: '7595652062:AAHeybK-qt5Fcv2yCuhDx6sd3idfT8MdVZo', botUsername: '@SAVPartnerBot' };
  } else {
    try {
      const cBot = executeQuery<{ bot_token: string; bot_username: string }>("SELECT bot_token, bot_username FROM telegram_bot_config LIMIT 1")?.[0];
      if (cBot?.bot_token) {
        return { botToken: cBot.bot_token.trim(), botUsername: cBot.bot_username || '@SAV_AI_Sales_Bot' };
      }
    } catch (_) {}
    return { botToken: '7656117989:AAFg2ThSRkaHFFOUp0EmxU3kMSBbIgrRn6o', botUsername: '@SAV_AI_Sales_Bot' };
  }
}

/**
 * Builds the inline keyboard for meme reminder messages
 */
export function getMemeInlineKeyboard(target: 'clients' | 'partners') {
  if (target === 'partners') {
    return {
      inline_keyboard: [
        [
          { text: '✨ Твой ИИ-Партнер', url: 'https://t.me/SAVPartnerBot/app?startapp=crm' }
        ],
        [
          { text: '💼 Партнерский кабинет', url: 'https://savbot.ru/partner' }
        ]
      ]
    };
  } else {
    return {
      inline_keyboard: [
        [
          { text: '🚀 Хочу ИИ-бизнес', url: 'https://t.me/SAV_AI_Sales_Bot/app?startapp=calc' }
        ],
        [
          { text: '🌐 Открыть SAV AI', url: 'https://savbot.ru' }
        ]
      ]
    };
  }
}

/**
 * Live Progress Tracker State for Meme Autopilot
 */
export interface AutopilotProgressState {
  isActive: boolean;
  step: number; // 0..3
  totalSteps: number;
  stageName: string;
  detail: string;
  percent: number;
  currentAudience: 'clients' | 'partners' | 'cycle' | 'idle';
  lastClientPost?: MemePost;
  lastPartnerPost?: MemePost;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

let autopilotProgress: AutopilotProgressState = {
  isActive: false,
  step: 0,
  totalSteps: 3,
  stageName: 'Ожидание запуска',
  detail: 'Автопилот готов к работе',
  percent: 0,
  currentAudience: 'idle'
};

export function getAutopilotProgress(): AutopilotProgressState {
  return autopilotProgress;
}

export function updateAutopilotProgress(patch: Partial<AutopilotProgressState>) {
  autopilotProgress = { ...autopilotProgress, ...patch };
}

/**
 * Synthesizes a humorous, vivid 16:9 steampunk scene prompt purely from meme text and keywords
 * (WITHOUT secondary bot calls or tool triggers)
 */
export function synthesizeSteampunkImagePrompt(
  memeText: string,
  targetAudience: 'clients' | 'partners'
): string {
  let visualScene = '';
  const lower = (memeText || '').toLowerCase();

  if (targetAudience === 'partners' || lower.includes('партнер') || lower.includes('пассивн') || lower.includes('процент') || lower.includes('доход')) {
    visualScene = 'стимпанк робот в красных гоглах с довольной улыбкой сидит в роскошном кожаном кресле с золотыми шестеренками, любуясь парящими стеклянными сферами с растущими золотыми монетами пассивного дохода и автоматическими сделками';
  } else if (lower.includes('excel') || lower.includes('таблиц') || lower.includes('формул')) {
    visualScene = 'стимпанк робот в красных гоглах невозмутимо пьет кофе за парящей стеклянной консолью с графиками прибыли, в то время как рядом комично высится гигантская бумажная башня светящихся таблиц Excel и ночных отчетов';
  } else if (lower.includes('ноч') || lower.includes('3 час') || lower.includes('сна') || lower.includes('перезвон') || lower.includes('утро')) {
    visualScene = 'стимпанк робот в красных гоглах бодро управляет светящимися рычагами автоматизации у панорамного ночного окна в стиле Liquid Glass, моментально перехватывая летящие золотые сообщения клиентов';
  } else if (lower.includes('выгор') || lower.includes('обед') || lower.includes('рутин') || lower.includes('устал')) {
    visualScene = 'стимпанк робот в красных гоглах галантно наливает свежий эспрессо за высокотехнологичным прозрачным столом, пока роботизированные манипуляторы за доли секунды закрывают клиентские сделки на голографических экранах';
  } else {
    visualScene = 'харизматичный стимпанк робот в круглых красных гоглах и белом глянцевом корпусе управляет золотым пультом автоматизации продаж, с улыбкой демонстрируя витрину цифровых ИИ-ассистентов и растущие золотые графики прибыли';
  }

  return `Высокодетализированный кинематографичный сатирический стимпанк-арт формата 16:9. В центре сюжета — харизматичный стимпанк робот в круглых гоглах из красного полированного металла, корпусе из премиального белого глянцевого пластика с элементами из полированного золота и портупеей из тисненой коричневой кожи. Сюжет сцены по мотивам бизнес-мема: ${visualScene}. Атмосфера офиса будущего в стиле Apple Liquid Glass, мягкий кинематографичный свет золотого часа, объемная детализация, без постороннего текста и без надписей на изображении.`;
}

/**
 * Backward compatibility alias
 */
export async function generateMemeImagePromptFromMemeText(
  memeText: string,
  targetAudience: 'clients' | 'partners',
  _unusedChatId?: string
): Promise<string> {
  return synthesizeSteampunkImagePrompt(memeText, targetAudience);
}

export interface MemeSingleJsonResponse {
  h1: string;
  h2: string;
  text: string;
  image_prompt: string;
}

export function parseMemeJsonResponse(rawText: string): Partial<MemeSingleJsonResponse> | null {
  if (!rawText) return null;
  let text = rawText.trim();

  // Strip code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    text = fenceMatch[1].trim();
  }

  const startIdx = text.indexOf('{');
  const lastIdx = text.lastIndexOf('}');
  if (startIdx !== -1 && lastIdx > startIdx) {
    try {
      const jsonStr = text.substring(startIdx, lastIdx + 1);
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed;
      }
    } catch (_) {}
  }
  return null;
}

/**
 * Synthesizes or extracts catchy hook titles for the meme:
 * h1: primary situation hook / punchline
 * h2: complementary subtitle hook / contrast
 */
export function extractOrGenerateMemeHooks(textRich: string, targetAudience: 'clients' | 'partners'): { h1: string; h2: string } {
  const lower = (textRich || '').toLowerCase();
  
  let h1 = '';
  let h2 = '';

  if (targetAudience === 'partners') {
    if (lower.includes('ведро') || lower.includes('воду')) {
      h1 = 'Дожимать клиентов вручную — как носить воду в дырявом ведре';
      h2 = 'Пассивный доход любит тех, чьи роботы не спят';
    } else if (lower.includes('процент') || lower.includes('выплат') || lower.includes('доход')) {
      h1 = 'Пока город спит: робот закрывает сделки и начисляет процент';
      h2 = 'Как получать партнерские выплаты без ночных переписок';
    } else if (lower.includes('охранять') || lower.includes('чат')) {
      h1 = 'Пассивный доход для тех, кто устал охранять чаты 24/7';
      h2 = 'ИИ-продавец закрывает клиентов, пока вы отдыхаете';
    } else if (lower.includes('партнер')) {
      h1 = 'Хроники партнерского спокойствия: когда за сделку платит алгоритм';
      h2 = 'Автоматизация продаж, которая работает на ваш баланс';
    } else {
      h1 = 'Деньги любят автоматизацию: умный процент для партнеров SAV AI';
      h2 = 'Роботы на боевом дежурстве без выходных и выгорания';
    }
  } else {
    if (lower.includes('excel') || lower.includes('таблиц')) {
      h1 = 'Когда Excel открылся, а предприниматель — уже нет';
      h2 = 'ИИ-продавец SAV AI закрывает сделки вместо ночных таблиц';
    } else if (lower.includes('ноч') || lower.includes('3 час') || lower.includes('сна')) {
      h1 = 'Клиент написал в три часа ночи: спасение продаж без ночных смен';
      h2 = 'Железный продавец отвечает за 0.4 секунды и ведет к оплате';
    } else if (lower.includes('обед') || lower.includes('кофе') || lower.includes('уход')) {
      h1 = 'ИИ-продавец не уходит на обед и не путает «срочно» со «скидкой»';
      h2 = 'Бизнес на автопилоте: ни одной потерянной заявки';
    } else if (lower.includes('рутин') || lower.includes('выгор')) {
      h1 = 'Рутина крадет прибыль: железный продавец возвращает время';
      h2 = 'Автоматическая квалификация и бронь встреч 24/7';
    } else if (lower.includes('дожим') || lower.includes('заявк')) {
      h1 = 'Потерянные заявки в чатах: почему робот дожимает быстрее';
      h2 = 'Мгновенный ответ клиенту и дожим до результата';
    } else {
      h1 = 'Утро доброе, бизнес непобедимый: ИИ на боевом дежурстве';
      h2 = 'Легкость и прибыль от внедрения ИИ-продавца SAV AI';
    }
  }

  return { h1, h2 };
}

export function extractOrGenerateMemeHookTitle(textRich: string, targetAudience: 'clients' | 'partners'): string {
  return extractOrGenerateMemeHooks(textRich, targetAudience).h1;
}

/**
 * Formats rich Telegram message adhering to our standard:
 * - H1 title with meme hook
 * - H2 subtitle continuing and emphasizing the meme
 * - Embedded image in markdown format: ![Alt](url)
 * - Meme text with no redundant administrative boilerplate
 * - Discrete footer for admin tests only
 */
export function extractHooksForDisplay(post: {
  title?: string;
  subtitle?: string | null;
  text_rich: string;
  target_audience: 'clients' | 'partners';
}): { h1: string; h2: string; cleanText: string } {
  const hooks = extractOrGenerateMemeHooks(post.text_rich, post.target_audience);
  const h1 = post.title && !post.title.includes('Мем-напоминание') && !post.title.includes('предпросмотр')
    ? post.title
    : hooks.h1;
  const h2 = post.subtitle && post.subtitle.trim().length > 0 && !post.subtitle.includes('Мем-напоминание')
    ? post.subtitle.trim()
    : hooks.h2;

  // Clean the meme text: strip any leading markdown headers (#, ##), duplicate dates, or admin tags
  let cleanBody = (post.text_rich || '').trim();
  cleanBody = cleanBody.replace(/^#+\s+[^\n]+\n*/gm, '');
  cleanBody = cleanBody.replace(/^[☕🔔✨💼🚀🎯].*напоминание.*\n*/gim, '');
  cleanBody = cleanBody.replace(/^.*тестовый предпросмотр.*\n*/gim, '');
  cleanBody = cleanBody.replace(/^.*аудитория:.*\n*/gim, '');

  // Strip duplicate leading sentence if it closely duplicates the hook
  if (cleanBody.toLowerCase().startsWith(h1.toLowerCase())) {
    cleanBody = cleanBody.slice(h1.length).trim();
  }

  return { h1, h2, cleanText: cleanBody };
}

/**
 * Formats full meme message adhering strictly to layout requirements:
 * 1. Title Hook (H1)
 * 2. Embedded 16:9 Image Preview
 * 3. Subtitle Hook (H2)
 * 4. Rich Punchline / Story Body
 */
export function formatMemeRichMessage(
  post: { title?: string; subtitle?: string | null; text_rich: string; image_url?: string | null; target_audience: 'clients' | 'partners' },
  options: { isTest?: boolean; adminChatId?: string; botUsername?: string } = {}
): string {
  const { h1, h2, cleanText } = extractHooksForDisplay(post);

  // The image MUST be located strictly BETWEEN the two punchline headers!
  const parts: string[] = [
    `# ${h1}`,
    ''
  ];

  if (post.image_url) {
    parts.push(`![${h1}](${post.image_url})`);
    parts.push('');
  }

  parts.push(`## ${h2}`);
  parts.push('');
  parts.push(cleanText);

  if (options.isTest) {
    parts.push('');
    parts.push('---');
    parts.push(`_Тестовый предпросмотр для администратора (${options.adminChatId || '169262990'}) в ${options.botUsername || ''}_`);
  }

  return parts.join('\n');
}

/**
 * Generate a new meme post via ONE SINGLE request (JSON: h1, h2, text, image_prompt)
 * and generate image strictly ONCE via Function 621 (without secondary bot dialogs or bot-side tools)
 */
export async function generateMemePost(
  targetAudience: 'clients' | 'partners',
  options: { customTopic?: string; customPrompt?: string; existingImageUrl?: string; existingImagePrompt?: string } = {}
): Promise<MemePost> {
  const dayName = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(getMskDate());
  const audienceLabel = targetAudience === 'partners' ? 'Партнеры' : 'Клиенты';

  // 1. Progress Step 1: Single combined JSON prompt
  updateAutopilotProgress({
    isActive: true,
    step: 1,
    totalSteps: 3,
    stageName: `1/3 Запрос текста мема и промпта в одном JSON [${audienceLabel}]`,
    detail: `Генерация хуков H1/H2, текста и промпта 16:9 в едином запросе...`,
    percent: 25,
    currentAudience: targetAudience,
    startedAt: autopilotProgress.startedAt || Date.now()
  });

  const sessionChatId = `meme_${targetAudience}_${Date.now()}`;
  
  // Check if custom saved prompt exists in BD ProTalk ai_prompts
  const promptKey = targetAudience === 'partners' ? 'meme_reminder_partners' : 'meme_reminder_clients';
  let dbSavedPrompt = '';
  try {
    const row = executeQuery<{ system_prompt: string }>("SELECT system_prompt FROM ai_prompts WHERE prompt_key = ?", [promptKey])?.[0];
    if (row && row.system_prompt && row.system_prompt.trim().length > 40) {
      dbSavedPrompt = row.system_prompt.trim();
    }
  } catch (_) {}

  // Single JSON prompt: creates text, H1/H2 hooks, and 16:9 steampunk art scene prompt in ONE SINGLE request!
  // Explicitly commands AI NOT to invoke any internal image functions or tools.
  const singleJsonPrompt = options.customPrompt || dbSavedPrompt || `Ты — ведущий креативный сценарист и арт-директор компании SAV AI.
Создай сатирический бизнес-мем для аудитории: ${targetAudience === 'partners' ? 'Партнеры SAV AI (пассивный доход, партнерская сеть, сделки закрываются алгоритмами без ночной рутины)' : 'Клиенты SAV AI (предприниматели, потерянные клиенты в 3 ночи, ночные таблицы Excel против легкости и прибыли от ИИ-продавца SAV AI)'}.
Контекст: Сегодня ${dayName}. Фокус темы: ${options.customTopic || 'будни бизнеса, потерянные клиенты, дожимы и автоматизация'}.

ВАЖНО:
1. Ответь СТРОГО одним валидным JSON-объектом без вступительных или заключительных слов, без markdown-кавычек (или строго внутри \`\`\`json...\`\`\`).
2. НЕ ВЫЗЫВАЙ никаких внутренних функций или генерации картинок! Все инструменты запрещены. Картинка создается внешней системой через функцию 621.

Формат JSON:
{
  "h1": "Остроумный емкий заголовок-хук (панчлайн 1, продолжающий и подчеркивающий мем, без капслока)",
  "h2": "Подзаголовок-контраст или ироничный вывод (панчлайн 2, без капслока)",
  "text": "Текст мема: 2-3 коротких абзаца сатирического живого описания будней бизнеса. Тон легкий, ироничный, дружелюбный, без капслока. Заверши фразой-призывом нажать кнопку «${targetAudience === 'partners' ? 'Твой ИИ-Партнер' : 'Хочу ИИ-бизнес'}» ниже.",
  "image_prompt": "Высокодетализированный кинематографичный сатирический стимпанк-арт формата 16:9. В центре сюжета — харизматичный стимпанк робот в круглых гоглах из красного полированного металла, корпусе из премиального белого глянцевого пластика с элементами из полированного золота и портупеей из тисненой коричневой кожи. Сюжет сцены по мотивам бизнес-мема: [точное описание комичной сцены с роботом под тему текста]. Атмосфера офиса будущего в стиле Apple Liquid Glass, мягкий кинематографичный свет золотого часа, объемная детализация, без постороннего текста и без надписей на изображении."
}`;

  console.log(`[Meme Autopilot] Sending single combined JSON request for ${targetAudience}...`);
  let rawAiReply = '';
  try {
    await sendProTalkMessageAsync(sessionChatId, singleJsonPrompt);
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 1200));
      const reply = await getProTalkLastReply(sessionChatId, 'meme_service', singleJsonPrompt);
      if (reply && reply.message && reply.message.length > 25 && !reply.message.includes('с начала диалога')) {
        rawAiReply = reply.message.trim();
        break;
      }
    }
  } catch (pErr) {
    console.warn('[Meme Autopilot] Single JSON ProTalk error, using programmatic fallback:', pErr);
  }

  // Parse JSON response
  const parsed = parseMemeJsonResponse(rawAiReply);

  let textRich = parsed?.text?.trim() || '';
  let imagePrompt = options.existingImagePrompt || parsed?.image_prompt?.trim() || '';
  let h1 = parsed?.h1?.trim() || '';
  let h2 = parsed?.h2?.trim() || '';

  // Fallback if AI didn't return complete JSON
  if (!textRich || textRich.length < 30) {
    if (rawAiReply && !rawAiReply.startsWith('{') && rawAiReply.length > 40) {
      textRich = rawAiReply;
    } else if (targetAudience === 'partners') {
      textRich = `⚙️ **Хроники партнерского спокойствия**\n\nПока где-то менеджеры в сотый раз вручную переписывают коммерческие предложения в полночь, наши ИИ-агенты уже закрыли три сделки и начислили партнерские баллы.\n\n> *«Лучшая работа — это та, за которую платит алгоритм, пока ты пьешь утренний эспрессо.»*\n\nЗагляни в баланс и проверь актуальные выплаты по рефералам. Роботы на боевом дежурстве! 👇`;
    } else {
      textRich = `☕ **Утро доброе, бизнес непобедимый!**\n\nГде-то во Вселенной клиент написал в три часа ночи: *«А можно скидку и презентацию?»* — и обычный менеджер ответит только к полудню (если вообще вспомнит).\n\nНаш стимпанк ИИ-продавец ответил через **0.4 секунды**, квалифицировал бюджет, посчитал экономику и вежливо забронировал встречу.\n\n> Рутина крадет время. ИИ возвращает прибыль.\n\nГотовы подключить железного продавца в свой отдел продаж? Нажмите кнопку ниже! 👇`;
    }
  }

  if (!h1 || !h2) {
    const hooks = extractOrGenerateMemeHooks(textRich, targetAudience);
    if (!h1) h1 = hooks.h1;
    if (!h2) h2 = hooks.h2;
  }

  if (!imagePrompt || imagePrompt.length < 30) {
    imagePrompt = synthesizeSteampunkImagePrompt(textRich, targetAudience);
  }

  console.log(`[Meme Autopilot] Single Request complete for ${targetAudience}. H1: "${h1}", Image Prompt: ${imagePrompt.substring(0, 90)}...`);

  // 2. Progress Step 2: Generate 16:9 illustration strictly ONCE via Function 621!
  updateAutopilotProgress({
    step: 2,
    stageName: `2/3 Создание 16:9 иллюстрации через функцию 621 [${audienceLabel}]`,
    detail: `Отрисовка стимпанк-арта: ${h1}`,
    percent: 65
  });

  let imageUrl: string | null = options.existingImageUrl || null;
  if (!imageUrl) {
    console.log(`[Meme Autopilot] 🎨 Generating 16:9 Steampunk Robot illustration strictly ONCE via Function 621 for ${targetAudience}...`);
    try {
      imageUrl = await generateDirectImageWithProTalk(
        imagePrompt,
        55000,
        undefined, // Passing undefined guarantees fresh numeric UID, preventing bot dialogue collisions!
        `SAV AI Meme (${dayName})`
      );
    } catch (imgErr) {
      console.warn('[Meme Autopilot] Function 621 image generation warning:', imgErr);
    }

    if (!imageUrl) {
      imageUrl = 'https://file.pro-talk.ru/tgf/GgMpJwQ9JCkYKglyGHQPBXZjOg0wCy02DipyAF0ONAA9cBphACYGfAoDNREZEyMtKgssKwEKW04KZHA0dDUAJgtXPBo4NRQmEVBrZVICawB2UgdrCjgNKQkRJBVyNhwhaT8nQz0CdhBRAyAcKD4sGAMiDDQMAzouHg5oB3dWCmN4.png';
    }
  }

  // 3. Progress Step 3: Save to BD ProTalk database table `meme_posts`
  updateAutopilotProgress({
    step: 3,
    stageName: `3/3 Фиксация мема в базе данных и предпросмотр [${audienceLabel}]`,
    detail: `Сохранение поста в таблицу meme_posts`,
    percent: 90
  });

  const postId = `meme_${targetAudience}_${Date.now()}`;
  const post: MemePost = {
    id: postId,
    target_audience: targetAudience,
    title: h1,
    subtitle: h2,
    text_rich: textRich,
    image_url: imageUrl,
    image_prompt: imagePrompt,
    status: 'draft',
    scheduled_for: null,
    admin_test_sent_at: null,
    recipients_total: 0,
    recipients_sent: 0,
    recipients_blocked: 0,
    recipients_failed: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  executeRun(`
    INSERT INTO meme_posts (
      id, target_audience, title, subtitle, text_rich, image_url, image_prompt,
      status, scheduled_for, admin_test_sent_at, recipients_total,
      recipients_sent, recipients_blocked, recipients_failed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    post.id,
    post.target_audience,
    post.title,
    post.subtitle,
    post.text_rich,
    post.image_url,
    post.image_prompt,
    post.status,
    post.scheduled_for,
    post.admin_test_sent_at,
    post.recipients_total,
    post.recipients_sent,
    post.recipients_blocked,
    post.recipients_failed,
    post.created_at,
    post.updated_at
  ]);
  saveDb();

  return post;
}

// In-memory locks to prevent double-firing from parallel requests, double-clicks, or race conditions
const adminSendLock = new Map<string, number>();
let isMorningGenerationInProgress = false;

/**
 * Regenerate image for an existing post via Function 621
 */
export async function regeneratePostImage(postId: string, customPrompt?: string): Promise<string | null> {
  const post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE id = ?", [postId])?.[0];
  if (!post) throw new Error('Пост не найден');

  const sessionChatId = `regen_${post.target_audience}_${Date.now()}`;
  let promptToUse = customPrompt || post.image_prompt;
  if (!promptToUse) {
    promptToUse = await generateMemeImagePromptFromMemeText(post.text_rich, post.target_audience, sessionChatId);
  }

  console.log(`[Meme Autopilot] Regenerating image via Function 621 for post ${postId}...`);
  const newUrl = await generateDirectImageWithProTalk(
    promptToUse,
    55000,
    sessionChatId,
    `SAV AI Regenerated Meme (${post.target_audience})`
  );

  if (newUrl) {
    executeRun("UPDATE meme_posts SET image_url = ?, image_prompt = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newUrl, promptToUse, postId]);
    saveDb();
    return newUrl;
  }
  return null;
}

/**
 * Send test post immediately to Admin (ID: 169262990)
 * Includes robust deduplication lock to guarantee zero duplicate Telegram deliveries.
 * Formats in our Rich Message standard with H1, H2 headers and direct image link in text.
 */
export async function sendTestPostToAdmin(postId: string, adminChatIdOverride?: string): Promise<{ success: boolean; error?: string }> {
  const post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE id = ?", [postId])?.[0];
  if (!post) return { success: false, error: 'Пост не найден' };

  const config = getMemeAutopilotConfig();
  const adminId = adminChatIdOverride || config.admin_telegram_id || '169262990';
  const lockKey = `${postId}_${adminId}`;

  // 1. In-memory debounce lock (blocks concurrent triggers or clicks within 8 seconds)
  const lastSentTime = adminSendLock.get(lockKey);
  const now = Date.now();
  if (lastSentTime && (now - lastSentTime) < 8000) {
    console.log(`[Meme Autopilot] 🛡️ Duplicate test send blocked by lock for post ${postId} to ${adminId} (${now - lastSentTime}ms ago)`);
    return { success: true };
  }
  adminSendLock.set(lockKey, now);

  const { botToken, botUsername } = getMemeBotCredentials(post.target_audience);
  const inlineButtons = getMemeInlineKeyboard(post.target_audience);

  // Format rich message using authentic meme hooks (H1, H2) and embedded image
  const fullText = formatMemeRichMessage(post, {
    isTest: true,
    adminChatId: adminId,
    botUsername
  });

  console.log(`[Meme Autopilot] Sending rich test post ${postId} to Admin ${adminId} via ${botUsername}...`);
  try {
    const res = await sendTelegramMessage({
      chatId: adminId,
      text: fullText,
      botToken,
      replyMarkup: inlineButtons,
      parseMode: 'HTML',
      timeoutMs: 15000
    });

    const isOk = typeof res === 'object' ? (res as any)?.ok : Boolean(res);
    if (isOk) {
      executeRun("UPDATE meme_posts SET admin_test_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [postId]);
      saveDb();
      return { success: true };
    } else {
      const errDesc = typeof res === 'object' ? (res as any)?.error : 'Ошибка отправки в Telegram';
      adminSendLock.delete(lockKey);
      return { success: false, error: errDesc };
    }
  } catch (err: any) {
    console.error('[Meme Autopilot] Error sending test post to admin:', err);
    adminSendLock.delete(lockKey);
    return { success: false, error: err.message };
  }
}

/**
 * Nodemailer SMTP Transporter helper using BD ProTalk mail_config
 */
export function getMemeSmtpTransporter() {
  const mailRows = executeQuery<any>("SELECT * FROM mail_config WHERE id = 'primary_mail' LIMIT 1");
  const mailCfg = mailRows && mailRows.length > 0 ? mailRows[0] : {
    account_email: 'info@arenda-ropa.com',
    out_server: 'mail.hosting.reg.ru',
    smtp_ssl_port: 465,
    password: 'eV5?rW4?fEiP5*mC'
  };

  const transporter = nodemailer.createTransport({
    host: mailCfg.out_server || 'mail.hosting.reg.ru',
    port: Number(mailCfg.smtp_ssl_port) || 465,
    secure: true,
    connectionTimeout: 8000,
    socketTimeout: 8000,
    auth: {
      user: mailCfg.account_email || 'info@arenda-ropa.com',
      pass: mailCfg.password || 'eV5?rW4?fEiP5*mC'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  return { transporter, fromEmail: mailCfg.account_email || 'info@arenda-ropa.com' };
}

// In-memory rate limiting for Email delivery to prevent hosting / spam flags
// - Max 3 emails per minute
// - Max 60 emails per hour
const emailSendLog: number[] = [];

export function checkEmailRateLimit(): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  while (emailSendLog.length > 0 && emailSendLog[0] < now - 3600000) {
    emailSendLog.shift();
  }
  if (emailSendLog.length >= 60) {
    const oldestInHour = emailSendLog[0];
    return { allowed: false, retryAfterMs: Math.max(1000, (oldestInHour + 3600000) - now) };
  }
  const inLastMinute = emailSendLog.filter(ts => ts > now - 60000).length;
  if (inLastMinute >= 3) {
    return { allowed: false, retryAfterMs: 20000 };
  }
  return { allowed: true };
}

/**
 * Strip caps lock words while preserving standard acronyms (SAV, AI, CRM, ООО, etc.)
 */
export function removeForbiddenCapsLock(text: string): string {
  if (!text) return '';
  return text.replace(/(?<![а-яА-Яa-zA-ZёЁ0-9])([А-ЯЁA-Z]{3,})(?![а-яА-Яa-zA-ZёЁ0-9])/gu, (match) => {
    const upper = match.toUpperCase();
    if (upper === 'SAV' || upper === 'AI' || upper === 'ООО' || upper === 'CRM' || upper === 'SMS' || upper === 'SMTP' || upper === 'MSK' || upper === 'МСК') {
      return match;
    }
    return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
  });
}

/**
 * Beautifies rich meme text for HTML emails:
 * - Parses **bold text** with luminous golden emphasis
 * - Parses *italic text* with warm champagne tone
 * - Styles quote blocks with burnished brass left border and subtle darkened glass
 * - Styles bullet points with golden steampunk gear/star icons
 * - Prevents caps lock words and enforces >= 14px typography
 */
export function beautifyMemeBodyHtml(rawText: string): string {
  if (!rawText) return '';

  let cleaned = removeForbiddenCapsLock(rawText.trim());
  // Remove duplicate markdown headers
  cleaned = cleaned.replace(/^#+\s+[^\n]+\n*/gm, '');

  const lines = cleaned.split('\n');
  const resultBlocks: string[] = [];
  let currentParagraphLines: string[] = [];

  const formatInlineStyles = (str: string) => {
    return str
      .replace(/\*\*([^*]+?)\*\*/g, '<strong style="color:#ffffff; font-weight:700; text-shadow:0 0 10px rgba(251,191,36,0.45); border-bottom:1px dotted rgba(212,175,55,0.6); padding-bottom:1px;">$1</strong>')
      .replace(/\*([^*]+?)\*/g, '<em style="color:#fde68a; font-style:italic;">$1</em>');
  };

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join('<br/>').trim();
      if (paragraphText) {
        const formatted = formatInlineStyles(paragraphText);
        resultBlocks.push(`
          <p style="margin:0 0 16px 0; font-size:15px; line-height:1.75; color:#e4d8cb; letter-spacing:0.15px;">
            ${formatted}
          </p>
        `);
      }
      currentParagraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Check for call-to-action button instruction (e.g. "Нажмите кнопку **«Хочу ИИ-бизнес»** ниже")
    const lowerLine = trimmed.toLowerCase();
    if (lowerLine.includes('нажмите кнопку') || lowerLine.includes('кнопк') || lowerLine.includes('жми') || lowerLine.includes('переходи по кнопке')) {
      flushParagraph();
      const formattedCta = trimmed
        .replace(/\*\*([^*]+?)\*\*/g, '<strong style="color:#ffd700; font-weight:800; text-shadow:0 0 14px rgba(251,191,36,0.6); border-bottom:1px dotted rgba(212,175,55,0.8); padding-bottom:1px;">$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em style="color:#fde68a;">$1</em>');

      resultBlocks.push(`
        <div style="margin:20px 0 14px 0; padding:14px 18px; background:linear-gradient(135deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.05) 100%); border:1px solid rgba(212,175,55,0.45); border-radius:14px; text-align:center;">
          <span style="font-size:15px; color:#fffbeb; font-weight:600; line-height:1.6; letter-spacing:0.2px;">
            ⚙ ${formattedCta}
          </span>
        </div>
      `);
      continue;
    }

    // Check for quote / dialogue (e.g. «...», "...", or dialog dash)
    if (
      (trimmed.startsWith('«') && (trimmed.endsWith('»') || trimmed.includes('» —') || trimmed.includes('» -'))) ||
      trimmed.startsWith('— «') ||
      trimmed.startsWith('- «') ||
      (trimmed.startsWith('"') && trimmed.includes('":'))
    ) {
      flushParagraph();
      const formattedQuote = formatInlineStyles(trimmed);

      resultBlocks.push(`
        <div style="margin:16px 0; padding:12px 18px; border-left:3px solid #d4af37; background:linear-gradient(90deg, rgba(212,175,55,0.14) 0%, rgba(212,175,55,0.03) 100%); border-radius:0 14px 14px 0; color:#fffbeb; font-size:15px; line-height:1.7; font-style:italic;">
          ${formattedQuote}
        </div>
      `);
      continue;
    }

    // Check for bullet list item (•, -, *, or numbered like 1.)
    const bulletMatch = trimmed.match(/^([•\-\*]|\d+\.)\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      const itemContent = formatInlineStyles(bulletMatch[2]);

      resultBlocks.push(`
        <div style="display:table; width:100%; margin:8px 0; padding:8px 14px; background:rgba(212,175,55,0.06); border:1px solid rgba(212,175,55,0.22); border-radius:12px;">
          <div style="display:table-cell; vertical-align:top; width:24px; padding-top:2px;">
            <span style="display:inline-block; color:#fbbf24; font-size:14px; line-height:1;">⚙</span>
          </div>
          <div style="display:table-cell; vertical-align:top; font-size:15px; line-height:1.65; color:#f5ece2;">
            ${itemContent}
          </div>
        </div>
      `);
      continue;
    }

    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  return resultBlocks.join('');
}

/**
 * Format Apple Liquid Glass styled HTML email with chocolate steampunk aesthetic,
 * corner rivets, decorative gears, golden gradients, and buttons matched for clients & partners.
 */
export function formatMemeEmailHtml(
  post: MemePost,
  recipientEmail: string,
  recipientName?: string,
  options: { isTest?: boolean } = {}
): { html: string; text: string; subject: string } {
  const hooks = extractHooksForDisplay(post);
  const appBaseUrl = process.env.APP_URL || 'https://rent-rop.com';
  const cleanEmail = recipientEmail.trim().toLowerCase();
  const unsubscribeUrl = `${appBaseUrl}/api/meme-autopilot/unsubscribe?email=${encodeURIComponent(cleanEmail)}`;

  // Target audience links & buttons
  const isPartners = post.target_audience === 'partners';

  // Primary and secondary buttons strictly matching Telegram & SAV AI specifications
  // Clients: "🚀 Хочу ИИ-бизнес" & "🌐 Открыть SAV AI"
  // Partners: "✨ Твой ИИ-Партнер" & "💼 Партнерский кабинет"
  const primaryButtonText = isPartners ? '✨ Твой ИИ-Партнер' : '🚀 Хочу ИИ-бизнес';
  const primaryButtonUrl = isPartners
    ? 'https://t.me/SAVPartnerBot/app?startapp=crm'
    : 'https://t.me/SAV_AI_Sales_Bot/app?startapp=calc';

  const secondaryButtonText = isPartners ? '💼 Партнерский кабинет' : '🌐 Открыть SAV AI';
  const secondaryButtonUrl = isPartners
    ? 'https://savbot.ru/partner'
    : 'https://savbot.ru';

  const audienceBadgeText = isPartners ? 'Партнерская сеть и пассивный доход' : 'Автопилот бизнес-решений и продаж';

  const subject = options.isTest
    ? `[Тест рассылки] ${hooks.h1 || post.title || 'SAV AI — Бизнес на автопилоте'}`
    : `${hooks.h1 || post.title || 'SAV AI — Аналитика и бизнес на автопилоте'}`;

  const textBody = `${hooks.h1}\n\n${hooks.h2}\n\n${hooks.cleanText}\n\n${primaryButtonText}: ${primaryButtonUrl}\n${secondaryButtonText}: ${secondaryButtonUrl}\n\nОтписаться от рассылки: ${unsubscribeUrl}`;

  // Metallic 3D Rivet HTML component
  const makeRivet = () => `
    <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #fff1a8 0%, #d4af37 40%, #875c1a 75%, #3d260a 100%); box-shadow:0 1px 3px rgba(0,0,0,0.85), inset 0 1px 1px rgba(255,255,255,0.7); border:1px solid #4a2f10; vertical-align:middle;"></span>
  `.trim();

  // Steampunk Gear SVG icon
  const gearSvg = `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle;">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  `.trim();

  // Decorated body text
  const formattedBody = beautifyMemeBodyHtml(hooks.cleanText || post.text_rich);

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${hooks.h1}</title>
  <style>
    @keyframes smokeDrift {
      0% { opacity: 0.88; text-shadow: 0 0 12px rgba(251,191,36,0.3); }
      50% { opacity: 1; text-shadow: 0 0 24px rgba(251,191,36,0.55), 0 0 35px rgba(212,175,55,0.25); }
      100% { opacity: 0.88; text-shadow: 0 0 12px rgba(251,191,36,0.3); }
    }
    @keyframes gearSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .gear-animate {
      display: inline-block;
      animation: gearSpin 24s linear infinite;
    }
    .smoke-title {
      animation: smokeDrift 4s ease-in-out infinite;
    }
    .glass-btn:hover {
      opacity: 0.95;
      transform: translateY(-1px);
    }
    @media only screen and (max-width: 620px) {
      .responsive-container {
        width: 100% !important;
        border-radius: 16px !important;
        padding: 20px 14px !important;
      }
      .btn-stack {
        display: block !important;
        width: 100% !important;
        margin: 8px 0 !important;
        box-sizing: border-box !important;
      }
    }
  </style>
</head>
<body style="margin:0; padding:28px 10px; background-color:#180b06; background:radial-gradient(circle at 50% 25%, #36170a 0%, #1e0d05 55%, #0f0502 100%); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color:#f4ece2; -webkit-font-smoothing:antialiased;">
  
  <!-- Outer Apple Liquid Glass Container with Chocolate Radial Gradient -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:620px; margin:0 auto; background:transparent;">
    <tr>
      <td style="background:transparent;">
        <div class="responsive-container" style="position:relative; background:radial-gradient(ellipse at 50% 12%, rgba(68, 32, 16, 0.96) 0%, rgba(36, 16, 8, 0.98) 60%, rgba(20, 8, 4, 0.99) 100%); border:1px solid rgba(245, 197, 66, 0.35); border-radius:24px; padding:30px 24px; box-shadow:0 25px 60px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.2), 0 0 40px rgba(68, 32, 16, 0.4);">
          
          <!-- Chassis Corner Rivets -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px; background:transparent;">
            <tr>
              <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
              <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
            </tr>
          </table>

          <!-- Steampunk Header with NO Gold Background (Clean Transparent Apple Glass) -->
          <div style="text-align:center; padding-bottom:18px; border-bottom:1px solid rgba(255,255,255,0.12); background:transparent; position:relative;">
            <table align="center" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto; background:transparent;">
              <tr>
                <td style="padding:0 8px; background:transparent;" class="gear-animate">
                  ${gearSvg}
                </td>
                <td style="padding:0 12px; text-align:center; background:transparent;">
                  <div style="font-size:26px; font-weight:800; letter-spacing:2px; color:#ffffff; text-shadow:0 0 20px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.9); font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:transparent;">
                    SAV AI
                  </div>
                  <div style="font-size:14px; font-weight:500; color:#fbbf24; margin-top:4px; letter-spacing:0.3px; background:transparent;">
                    ${audienceBadgeText}
                  </div>
                </td>
                <td style="padding:0 8px; background:transparent;" class="gear-animate">
                  ${gearSvg}
                </td>
              </tr>
            </table>
          </div>

          <!-- H1 Punchline Header with Smoke Effect -->
          <div style="margin:24px 0 16px 0; text-align:center; background:transparent;">
            <h1 class="smoke-title" style="margin:0; font-size:23px; line-height:1.35; font-weight:800; color:#fbbf24; text-shadow:0 2px 14px rgba(251,191,36,0.35); letter-spacing:-0.2px; background:transparent;">
              ${hooks.h1}
            </h1>
          </div>

          <!-- 16:9 Steampunk Robot Meme Illustration Frame with Chocolate Radial Gradient and Rivets -->
          ${post.image_url ? `
          <div style="margin:20px 0; position:relative; background:radial-gradient(ellipse at 50% 20%, rgba(50, 23, 11, 0.9) 0%, rgba(24, 10, 5, 0.95) 100%); border:1px solid rgba(245, 197, 66, 0.25); border-radius:18px; padding:8px; box-shadow:0 12px 30px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.15);">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px; background:transparent;">
              <tr>
                <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
                <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
              </tr>
            </table>
            <img src="${post.image_url}" alt="${hooks.h1}" style="width:100%; max-width:554px; height:auto; border-radius:12px; border:1px solid rgba(255,255,255,0.12); display:block; margin:0 auto;" />
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px; background:transparent;">
              <tr>
                <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
                <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <!-- H2 Subtitle Contrast Punchline -->
          <div style="margin:18px 0; text-align:center; background:transparent;">
            <h2 style="margin:0; font-size:16px; line-height:1.45; font-weight:600; color:#ffffff; text-shadow:0 1px 6px rgba(0,0,0,0.7); letter-spacing:0.1px; background:transparent;">
              ${hooks.h2}
            </h2>
          </div>

          <!-- Chocolate Inner Glass Container with Corner Rivets for Body Text -->
          <div style="margin:22px 0; position:relative; background:radial-gradient(ellipse at 50% 15%, rgba(46, 21, 10, 0.92) 0%, rgba(22, 9, 4, 0.96) 100%); border:1px solid rgba(245, 197, 66, 0.22); border-radius:18px; padding:22px 20px; box-shadow:inset 0 2px 8px rgba(0,0,0,0.7), 0 4px 20px rgba(28, 12, 6, 0.45);">
            
            <!-- Inner Corner Rivets -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:12px; background:transparent;">
              <tr>
                <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
                <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
              </tr>
            </table>

            <!-- Formatted Body Content -->
            <div style="font-size:15px; line-height:1.75; color:#e4d8cb; background:transparent;">
              ${formattedBody}
            </div>

            <!-- Bottom Inner Rivets -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px; background:transparent;">
              <tr>
                <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
                <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
              </tr>
            </table>
          </div>

          <!-- Interactive Steampunk Liquid Glass Buttons matching Clients & Partners -->
          <div style="margin:28px 0 18px 0; text-align:center; background:transparent;">
            <!-- Primary Golden Button (Transparent Glass Gradient) -->
            <a href="${primaryButtonUrl}" class="glass-btn btn-stack" style="display:inline-block; padding:15px 28px; background:linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(180, 130, 40, 0.15) 100%); border:1px solid rgba(245, 197, 66, 0.65); border-radius:14px; color:#ffffff; text-decoration:none; font-weight:700; font-size:15px; margin:6px; box-shadow:0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.3); letter-spacing:0.2px;">
              ${primaryButtonText}
            </a>

            <!-- Secondary White Glass Button -->
            <a href="${secondaryButtonUrl}" class="glass-btn btn-stack" style="display:inline-block; padding:15px 26px; background:linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.04) 100%); border:1px solid rgba(255, 255, 255, 0.32); border-radius:14px; color:#ffffff; text-decoration:none; font-weight:600; font-size:14px; margin:6px; box-shadow:0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.2); letter-spacing:0.2px;">
              ${secondaryButtonText}
            </a>
          </div>

          <!-- Unsubscribe & Legal Steampunk Footer -->
          <div style="margin-top:34px; padding-top:22px; border-top:1px solid rgba(245,197,66,0.2); text-align:center; background:transparent;">
            <p style="margin:0 0 12px 0; font-size:14px; color:#e4d8cb; line-height:1.6; background:transparent;">
              ${recipientName ? `${recipientName}, вы` : 'Вы'} получили это сообщение, так как указали почту при регистрации или заполнении заявки на платформе SAV AI / ООО «РентРоп».
            </p>
            
            <p style="margin:0 0 16px 0; font-size:14px; background:transparent;">
              <a href="${unsubscribeUrl}" style="display:inline-block; padding:10px 22px; background:linear-gradient(135deg, rgba(68, 32, 16, 0.75) 0%, rgba(36, 16, 8, 0.85) 100%); border:1px solid rgba(245, 197, 66, 0.4); border-radius:12px; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; box-shadow:0 4px 12px rgba(0,0,0,0.5);">
                Отписаться от рассылки в 1 клик
              </a>
            </p>
            
            <div style="margin-top:16px; font-size:14px; color:#fbbf24; letter-spacing:0.3px; background:transparent; font-weight:500;">
              © 2026 SAV AI • ООО «РентРоп» • Все права защищены
            </div>
          </div>

          <!-- Bottom Chassis Rivets -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px; background:transparent;">
            <tr>
              <td align="left" style="width:50%; background:transparent;">${makeRivet()}</td>
              <td align="right" style="width:50%; background:transparent;">${makeRivet()}</td>
            </tr>
          </table>

        </div>
      </td>
    </tr>
  </table>

</body>
</html>`;

  return { html, text: textBody, subject };
}

/**
 * Send test post to an email address using SMTP
 */
export async function sendTestPostToEmail(
  postIdOrEmail?: string,
  targetEmailOrAudience?: string,
  targetAudience?: 'clients' | 'partners'
): Promise<{ success: boolean; messageId?: string; error?: string; post?: MemePost; htmlPreview?: string }> {
  try {
    let resolvedPostId: string | undefined = postIdOrEmail;
    let resolvedEmail = targetEmailOrAudience;
    let resolvedAudience: 'clients' | 'partners' | undefined = targetAudience;

    // Flexible arguments check: if first arg is an email, shift params
    if (postIdOrEmail && postIdOrEmail.includes('@')) {
      resolvedEmail = postIdOrEmail;
      resolvedPostId = undefined;
      if (targetEmailOrAudience === 'clients' || targetEmailOrAudience === 'partners') {
        resolvedAudience = targetEmailOrAudience;
      }
    }

    let post: MemePost | undefined;
    if (resolvedPostId) {
      post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE id = ?", [resolvedPostId])?.[0];
    }
    if (!post && resolvedAudience) {
      post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE target_audience = ? ORDER BY created_at DESC LIMIT 1", [resolvedAudience])?.[0];
    }
    if (!post) {
      post = executeQuery<MemePost>("SELECT * FROM meme_posts ORDER BY created_at DESC LIMIT 1")?.[0];
    }
    if (!post) throw new Error('Пост не найден в базе данных');

    const cleanEmail = (resolvedEmail || 'shishkarnem@gmail.com').trim().toLowerCase();
    if (!cleanEmail.includes('@')) throw new Error('Некорректный адрес электронной почты');

    const { transporter, fromEmail } = getMemeSmtpTransporter();
    const { html, text, subject } = formatMemeEmailHtml(post, cleanEmail, 'Администратор', { isTest: true });

    const info = await transporter.sendMail({
      from: `"SAV AI — Напоминания" <${fromEmail}>`,
      to: cleanEmail,
      subject,
      text,
      html,
      headers: {
        'List-Unsubscribe': `<https://rent-rop.com/api/meme-autopilot/unsubscribe?email=${encodeURIComponent(cleanEmail)}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        'Precedence': 'bulk'
      }
    });

    console.log(`[Meme Autopilot] Steampunk test email sent successfully to ${cleanEmail}, messageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, post, htmlPreview: html };
  } catch (err: any) {
    console.error('[Meme Autopilot] Test email send error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Distribute timestamps randomly within the 10:00 - 17:00 MSK window,
 * strictly ensuring NO minute slot has more than maxPerMinute (default 5) messages,
 * and seconds within each minute are uniquely randomized.
 * 
 * If count is larger than remaining capacity on the target day, smoothly overflows into next day(s) 10:00-17:00 MSK.
 */
export function generateRandomScheduleTimes(
  count: number,
  targetDay: 'today' | 'tomorrow' | 'auto',
  startHourMsk = 10,
  endHourMsk = 17,
  maxPerMinute = 5
): Date[] {
  if (count <= 0) return [];

  const now = new Date();
  const MSK_OFFSET = 3 * 3600000;
  const nowMsk = new Date(now.getTime() + MSK_OFFSET);

  let targetYear = nowMsk.getUTCFullYear();
  let targetMonth = nowMsk.getUTCMonth();
  let targetDate = nowMsk.getUTCDate();

  const currentMskHour = nowMsk.getUTCHours();
  const currentMskMinute = nowMsk.getUTCMinutes();

  let effectiveTarget = targetDay;
  if (effectiveTarget === 'auto') {
    effectiveTarget = currentMskHour >= endHourMsk ? 'tomorrow' : 'today';
  }

  let startMinuteIndex = 0;
  if (effectiveTarget === 'tomorrow') {
    const tomorrow = new Date(Date.UTC(targetYear, targetMonth, targetDate + 1, 0, 0, 0));
    targetYear = tomorrow.getUTCFullYear();
    targetMonth = tomorrow.getUTCMonth();
    targetDate = tomorrow.getUTCDate();
    startMinuteIndex = 0;
  } else {
    // Target today
    if (currentMskHour >= endHourMsk) {
      // Past 17:00 MSK today -> move to tomorrow
      const tomorrow = new Date(Date.UTC(targetYear, targetMonth, targetDate + 1, 0, 0, 0));
      targetYear = tomorrow.getUTCFullYear();
      targetMonth = tomorrow.getUTCMonth();
      targetDate = tomorrow.getUTCDate();
      startMinuteIndex = 0;
    } else if (currentMskHour >= startHourMsk) {
      // In middle of daytime window: start from now + 2 mins
      startMinuteIndex = Math.min((endHourMsk - startHourMsk) * 60 - 5, (currentMskHour - startHourMsk) * 60 + currentMskMinute + 2);
    } else {
      // Early morning before 10:00 MSK: start at 10:00
      startMinuteIndex = 0;
    }
  }

  const dailyTotalMinutes = (endHourMsk - startHourMsk) * 60;
  const allocatedTimestamps: Date[] = [];
  const minuteUsage = new Map<number, number>();

  let dayOffset = 0;
  let curDayStartMinute = startMinuteIndex;

  for (let i = 0; i < count; i++) {
    const availableMinutes: number[] = [];
    for (let m = curDayStartMinute; m < dailyTotalMinutes; m++) {
      const globalMinKey = dayOffset * 10000 + m;
      const used = minuteUsage.get(globalMinKey) || 0;
      if (used < maxPerMinute) {
        availableMinutes.push(m);
      }
    }

    if (availableMinutes.length === 0) {
      // Current day window is saturated, advance to next day
      dayOffset++;
      curDayStartMinute = 0;
      i--;
      continue;
    }

    // Pick a completely random minute among available slots
    const randomMinSlot = availableMinutes[Math.floor(Math.random() * availableMinutes.length)];
    const globalMinKey = dayOffset * 10000 + randomMinSlot;
    minuteUsage.set(globalMinKey, (minuteUsage.get(globalMinKey) || 0) + 1);

    const itemDay = new Date(Date.UTC(targetYear, targetMonth, targetDate + dayOffset, 0, 0, 0));
    const itemHourMsk = startHourMsk + Math.floor(randomMinSlot / 60);
    const itemMinuteMsk = randomMinSlot % 60;
    
    // Pick random second and millisecond so no two timestamps are identical
    const randomSec = Math.floor(Math.random() * 60);
    const randomMs = Math.floor(Math.random() * 1000);

    const utcTimestamp = new Date(Date.UTC(
      itemDay.getUTCFullYear(),
      itemDay.getUTCMonth(),
      itemDay.getUTCDate(),
      itemHourMsk - 3,
      itemMinuteMsk,
      randomSec,
      randomMs
    ));

    allocatedTimestamps.push(utcTimestamp);
  }

  allocatedTimestamps.sort((a, b) => a.getTime() - b.getTime());
  return allocatedTimestamps;
}

/**
 * Legacy compatibility wrapper for cascade window bounds
 */
export function calculateCascadeWindow(config: MemeAutopilotConfig): { windowStart: Date; windowEnd: Date } {
  const times = generateRandomScheduleTimes(1, 'auto', config.send_window_start_hour_msk, config.send_window_end_hour_msk, 5);
  const start = times[0] || new Date();
  const end = new Date(start.getTime() + 6 * 3600000);
  return { windowStart: start, windowEnd: end };
}

/**
 * Normalizes all queue dates:
 * STRICT RULE: No reminder date must EVER be in the past or yesterday for clients and partners!
 * If scheduled_time or next_send_at is in the past, re-distribute them to today or tomorrow within 10:00 - 17:00 MSK.
 */
export function normalizeQueueDates(): { normalizedCount: number } {
  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Pending items with scheduled_time or next_send_at in the past
  const pastPending = executeQuery<{ id: string }>(`
    SELECT id FROM meme_delivery_queue 
    WHERE status = 'pending' AND (scheduled_time < ? OR (next_send_at IS NOT NULL AND next_send_at < ?))
    ORDER BY id ASC
  `, [nowIso, nowIso]) || [];

  if (pastPending.length > 0) {
    console.log(`[Meme Autopilot] Found ${pastPending.length} pending queue items with past dates. Normalizing to today/tomorrow daytime window...`);
    const newTimes = generateRandomScheduleTimes(pastPending.length, 'auto', 10, 17, 5);
    pastPending.forEach((item, idx) => {
      const iso = newTimes[idx].toISOString();
      executeRun(`
        UPDATE meme_delivery_queue 
        SET scheduled_time = ?, next_send_at = ? 
        WHERE id = ?
      `, [iso, iso, item.id], false);
    });
  }

  // 2. Sent, blocked, failed items whose next_send_at is in the past or null: set to tomorrow daytime
  const pastNonPending = executeQuery<{ id: string }>(`
    SELECT id FROM meme_delivery_queue 
    WHERE status != 'pending' AND (next_send_at IS NULL OR next_send_at < ?)
    ORDER BY id ASC
  `, [nowIso]) || [];

  if (pastNonPending.length > 0) {
    const nextTimes = generateRandomScheduleTimes(pastNonPending.length, 'tomorrow', 10, 17, 5);
    pastNonPending.forEach((item, idx) => {
      const iso = nextTimes[idx].toISOString();
      executeRun(`
        UPDATE meme_delivery_queue 
        SET next_send_at = ? 
        WHERE id = ?
      `, [iso, item.id], false);
    });
  }

  if (pastPending.length > 0 || pastNonPending.length > 0) {
    saveDb();
  }

  return { normalizedCount: pastPending.length + pastNonPending.length };
}

/**
 * 1-Click Reschedule for all pending queue items to 'today' or 'tomorrow':
 * Allows filtering by audience ('client', 'partner', or 'all').
 * Ensures random timestamps between 10:00 and 17:00 MSK without exceeding 5 per minute.
 */
export function rescheduleAllQueue(
  targetDay: 'today' | 'tomorrow',
  recipientType?: string
): { rescheduledCount: number; targetDay: string; firstScheduled?: string; lastScheduled?: string } {
  let query = "SELECT id FROM meme_delivery_queue WHERE status = 'pending'";
  const params: any[] = [];

  if (recipientType && recipientType !== 'all') {
    const normType = (recipientType === 'clients' || recipientType === 'client') ? 'client' : 'partner';
    query += " AND recipient_type = ?";
    params.push(normType);
  }
  query += " ORDER BY id ASC";

  const items = executeQuery<{ id: string }>(query, params) || [];
  if (items.length === 0) {
    return { rescheduledCount: 0, targetDay };
  }

  const times = generateRandomScheduleTimes(items.length, targetDay, 10, 17, 5);
  items.forEach((item, idx) => {
    const iso = times[idx].toISOString();
    executeRun(`
      UPDATE meme_delivery_queue 
      SET scheduled_time = ?, next_send_at = ?
      WHERE id = ?
    `, [iso, iso, item.id], false);
  });

  saveDb();
  console.log(`[Meme Autopilot] Rescheduled ${items.length} pending items to ${targetDay} (first: ${times[0]?.toISOString()}, last: ${times[times.length - 1]?.toISOString()})`);

  return {
    rescheduledCount: items.length,
    targetDay,
    firstScheduled: times[0]?.toISOString(),
    lastScheduled: times[times.length - 1]?.toISOString()
  };
}

/**
 * Schedule a post for cascade delivery strictly between 10:00 and 17:00 MSK:
 * - Gathers Telegram recipients (partners or clients with telegram_id)
 * - Gathers Email recipients (partners or clients without telegram, but with valid email who are not unsubscribed)
 * - Distributes timestamps randomly with max 5/min limit for telegram, max 3/min for email.
 */
export async function schedulePostCascade(postId: string): Promise<{ queuedCount: number; emailCount: number; telegramCount: number }> {
  const post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE id = ?", [postId])?.[0];
  if (!post) throw new Error('Пост не найден');

  const config = getMemeAutopilotConfig();
  const startHour = config.send_window_start_hour_msk || 10;
  const endHour = config.send_window_end_hour_msk || 17;

  // 1. Gather Telegram recipients based on target audience
  // Partners: strictly taken from crm table (where all partners from Telegram bot @SAVPartnerBot are stored)
  // Clients: strictly taken from sav_clients / crm_clients table (~1115 clients)
  let tgRecipients: Array<{ id: string; name: string; telegram_id: string; bot_type: string; is_blocked: boolean }> = [];

  if (post.target_audience === 'partners') {
    // Partner audience unified from crm table (all Telegram bot partners: registered & pending)
    // AND partners table (registered users), with duplicate union!
    const crmRows = executeQuery<{ 
      id: string; 
      fio?: string; 
      telegram?: string; 
      telegram_id?: string; 
      chat_id?: string; 
      partner_code?: string;
      promo?: string;
      status?: string; 
      status_hand?: string;
      send_status?: string;
      reg_check?: string;
    }>(`
      SELECT id, fio, telegram, telegram_id, chat_id, partner_code, promo, status, status_hand, send_status, reg_check
      FROM crm 
      WHERE (telegram_id IS NOT NULL AND telegram_id != '' AND telegram_id != '0')
         OR (chat_id IS NOT NULL AND chat_id != '' AND chat_id != '0')
    `) || [];

    const partnerRows = executeQuery<{
      id: string;
      fio?: string;
      telegram?: string;
      telegram_id?: string;
      chat_id?: string;
      partner_code?: string;
      promo?: string;
      status?: string;
      email?: string;
    }>(`
      SELECT id, fio, telegram, telegram_id, chat_id, partner_code, promo, status, email
      FROM partners
      WHERE (telegram_id IS NOT NULL AND telegram_id != '' AND telegram_id != '0')
         OR (chat_id IS NOT NULL AND chat_id != '' AND chat_id != '0')
    `) || [];

    const partnerMap = new Map<string, { id: string; name: string; telegram_id: string; bot_type: string; is_blocked: boolean; email?: string }>();

    // 1. Populate from CRM (Telegram bot partners)
    for (const r of crmRows) {
      const tgId = String(r.telegram_id || r.chat_id || '').replace(/^tb|_.*$/g, '').trim();
      if (!tgId) continue;

      const isBlocked = 
        r.status === 'Заблокировано' || 
        r.status === 'blocked' || 
        r.status === 'BLOCKED' ||
        r.status_hand === 'Заблокировано' ||
        Boolean(r.send_status && (
          r.send_status.includes('Forbidden') || 
          r.send_status.includes('blocked') || 
          r.send_status.includes('deactivated')
        ));

      partnerMap.set(tgId, {
        id: r.id,
        name: r.fio || r.telegram || `Партнер ${tgId}`,
        telegram_id: tgId,
        bot_type: 'partner_bot',
        is_blocked: isBlocked
      });
    }

    // 2. Merge registered partners from partners table with deduplication
    for (const p of partnerRows) {
      const tgId = String(p.telegram_id || p.chat_id || '').replace(/^tb|_.*$/g, '').trim();
      let matchedKey = tgId;

      if (!matchedKey || !partnerMap.has(matchedKey)) {
        for (const [k, v] of partnerMap.entries()) {
          if (p.partner_code && (p.partner_code === v.telegram_id || p.partner_code === (v as any).partner_code)) {
            matchedKey = k;
            break;
          }
        }
      }

      const isBlocked = p.status === 'Заблокировано' || p.status === 'blocked' || p.status === 'BLOCKED';

      if (matchedKey && partnerMap.has(matchedKey)) {
        const existing = partnerMap.get(matchedKey)!;
        if (p.fio && !existing.name.includes(p.fio)) existing.name = p.fio;
        if (p.email) existing.email = p.email;
        if (isBlocked) existing.is_blocked = true;
      } else if (tgId) {
        partnerMap.set(tgId, {
          id: p.id,
          name: p.fio || p.telegram || `Партнер ${tgId}`,
          telegram_id: tgId,
          bot_type: 'partner_bot',
          is_blocked: isBlocked,
          email: p.email || undefined
        });
      }
    }

    tgRecipients = Array.from(partnerMap.values());
  } else {
    // Client queue from crm_clients (sav_clients table) with ~1115 clients
    const rows = executeQuery<{ id: string; full_name?: string; fio?: string; telegram_client?: string; telegram_id: string; status?: string }>(`
      SELECT id, full_name, fio, telegram_client, telegram_id, status 
      FROM sav_clients 
      WHERE telegram_id IS NOT NULL 
        AND telegram_id != '' 
        AND telegram_id != '0'
      GROUP BY telegram_id
    `);

    tgRecipients = rows.map(r => {
      const isBlocked = r.status === 'Заблокировано' || r.status === 'blocked' || r.status === 'BLOCKED';
      return {
        id: r.id,
        name: r.full_name || r.fio || r.telegram_client || `Клиент ${r.telegram_id}`,
        telegram_id: String(r.telegram_id).trim(),
        bot_type: 'sales_bot',
        is_blocked: isBlocked
      };
    });
  }

  // 2. Gather Email recipients from database (sav_clients / crm_clients, users, partners, leads)
  let emailRecipients: Array<{ id: string; name: string; email: string }> = [];
  const seenEmails = new Set<string>();

  const addEmail = (id: string, name: string, email: string) => {
    const clean = (email || '').trim().toLowerCase();
    if (clean && clean.includes('@') && !seenEmails.has(clean)) {
      seenEmails.add(clean);
      emailRecipients.push({ id, name, email: clean });
    }
  };

  if (post.target_audience === 'partners') {
    // 1. Partner emails from crm table (Telegram bot partners)
    const crmEmailRows = executeQuery<{ id: string; fio?: string; comment?: string; email?: string }>(`
      SELECT id, fio, comment, email FROM crm
      WHERE (comment LIKE '%@%' OR email LIKE '%@%')
    `) || [];
    for (const r of crmEmailRows) {
      if (r.email) addEmail(r.id, r.fio || 'Партнер', r.email);
      const match = r.comment?.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (match) addEmail(r.id, r.fio || 'Партнер', match[0]);
    }

    // 2. Partner emails from partners table (registered users)
    const pRows = executeQuery<{ id: string; fio?: string; email?: string }>(`
      SELECT id, fio, email FROM partners
      WHERE email IS NOT NULL AND email LIKE '%@%'
        AND status NOT IN ('Заблокировано', 'Отказ', 'blocked', 'BLOCKED')
        AND email NOT IN (SELECT email FROM meme_unsubscribed_emails)
      GROUP BY email
    `) || [];
    for (const r of pRows) addEmail(r.id, r.fio || 'Партнер', r.email!);

    // 3. Partner emails from users table (registered partners / accounts)
    const partnerUsers = executeQuery<{ id: string; full_name?: string; email?: string }>(`
      SELECT id, full_name, email FROM users
      WHERE email IS NOT NULL AND email LIKE '%@%'
        AND (role = 'partner' OR role = 'PARTNER' OR referral_code IS NOT NULL)
        AND status = 'ACTIVE'
        AND email NOT IN (SELECT email FROM meme_unsubscribed_emails)
      GROUP BY email
    `) || [];
    for (const u of partnerUsers) addEmail(u.id, u.full_name || 'Партнер', u.email!);
  } else {
    // Clients email from sav_clients / crm_clients
    const cRows = executeQuery<{ id: string; full_name?: string; fio?: string; email?: string }>(`
      SELECT id, COALESCE(full_name, fio, 'Клиент SAV AI') as full_name, email FROM sav_clients
      WHERE email IS NOT NULL AND email LIKE '%@%'
        AND email NOT IN (SELECT email FROM meme_unsubscribed_emails)
      GROUP BY email
    `) || [];
    for (const r of cRows) addEmail(r.id, r.full_name || 'Клиент', r.email!);

    // Registered users from users table
    const uRows = executeQuery<{ id: string; full_name?: string; username?: string; email?: string }>(`
      SELECT id, COALESCE(full_name, username, 'Пользователь') as full_name, email FROM users
      WHERE email IS NOT NULL AND email LIKE '%@%'
        AND status = 'ACTIVE'
        AND email NOT IN (SELECT email FROM meme_unsubscribed_emails)
      GROUP BY email
    `) || [];
    for (const r of uRows) addEmail(r.id, r.full_name || 'Пользователь', r.email!);

    // Applications with email from leads
    const lRows = executeQuery<{ id: string; fio?: string; email?: string }>(`
      SELECT id, fio, email FROM leads
      WHERE email IS NOT NULL AND email LIKE '%@%'
        AND email NOT IN (SELECT email FROM meme_unsubscribed_emails)
      GROUP BY email
    `) || [];
    for (const r of lRows) addEmail(r.id, r.fio || 'Заявка', r.email!);
  }

  // Guarantee presence of verified system emails (Admin, Expert, registered accounts)
  const guaranteed = [
    { id: 'guar_admin', name: 'Денис (Администратор)', email: 'shishkarnem@gmail.com' },
    { id: 'guar_expert', name: 'Руслан (Эксперт SAV AI)', email: 'rentropexpert@gmail.com' },
    { id: 'guar_user', name: 'Денис (Клиент)', email: 'shishka.rnem@gmail.com' },
    { id: 'guar_partner', name: 'Игорь Сидоров (Партнер)', email: 'sid@sid.ru' }
  ];
  for (const g of guaranteed) {
    if (post.target_audience === 'partners' && g.email === 'shishka.rnem@gmail.com') continue;
    addEmail(g.id, g.name, g.email);
  }

  const activeTgRecipients = tgRecipients.filter(r => !r.is_blocked);
  const blockedTgRecipients = tgRecipients.filter(r => r.is_blocked);
  const totalRecipients = activeTgRecipients.length + emailRecipients.length;

  if (totalRecipients === 0) {
    executeRun("UPDATE meme_posts SET status = 'approved', recipients_total = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [postId]);
    saveDb();
    return { queuedCount: 0, emailCount: 0, telegramCount: 0 };
  }

  // Clear previous pending items for this audience to prevent accumulation of thousands of records
  const targetRecipientType = post.target_audience === 'partners' ? 'partner' : 'client';
  executeRun("DELETE FROM meme_delivery_queue WHERE recipient_type = ? AND status = 'pending'", [targetRecipientType], false);

  // Generate randomized schedule times strictly for ACTIVE Telegram recipients (max 5/min)
  const tgTimes = generateRandomScheduleTimes(activeTgRecipients.length, 'auto', startHour, endHour, 5);
  activeTgRecipients.forEach((rec, idx) => {
    const scheduledIso = tgTimes[idx].toISOString();
    const queueId = `mq_${post.id}_${rec.telegram_id}_${idx}`;

    executeRun(`
      INSERT OR REPLACE INTO meme_delivery_queue (
        id, post_id, recipient_type, recipient_id, recipient_name,
        telegram_id, bot_type, scheduled_time, next_send_at, status, channel, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'telegram', CURRENT_TIMESTAMP)
    `, [
      queueId,
      post.id,
      post.target_audience === 'partners' ? 'partner' : 'client',
      rec.id,
      rec.name,
      rec.telegram_id,
      rec.bot_type,
      scheduledIso,
      scheduledIso
    ], false);
  });

  // Schedule BLOCKED recipients with status='blocked' (NOT 'pending' - no reminders sent to blocked bots)
  // This satisfies user requirement: "статус Заблокировано = там бот заблокирован, следовательно не надо там чтобы был статус В ожидании для отправки напоминаний. Надо показывать список заблокированных."
  blockedTgRecipients.forEach((rec, idx) => {
    const queueId = `mq_blk_${post.id}_${rec.telegram_id}_${idx}`;
    const nowIso = new Date().toISOString();

    executeRun(`
      INSERT OR REPLACE INTO meme_delivery_queue (
        id, post_id, recipient_type, recipient_id, recipient_name,
        telegram_id, bot_type, scheduled_time, next_send_at, status, error_message, channel, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'blocked', 'Бот заблокирован пользователем', 'telegram', CURRENT_TIMESTAMP)
    `, [
      queueId,
      post.id,
      post.target_audience === 'partners' ? 'partner' : 'client',
      rec.id,
      rec.name,
      rec.telegram_id,
      rec.bot_type,
      nowIso,
      nowIso
    ], false);
  });

  // Generate randomized schedule times for Email (max 3/min)
  const emailTimes = generateRandomScheduleTimes(emailRecipients.length, 'auto', startHour, endHour, 3);
  emailRecipients.forEach((rec, idx) => {
    const scheduledIso = emailTimes[idx].toISOString();
    const queueId = `mq_email_${post.id}_${rec.email.replace(/[^a-zA-Z0-9]/g, '_')}_${idx}`;

    executeRun(`
      INSERT OR REPLACE INTO meme_delivery_queue (
        id, post_id, recipient_type, recipient_id, recipient_name,
        telegram_id, bot_type, scheduled_time, next_send_at, status, channel, email, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'smtp_email', ?, ?, 'pending', 'email', ?, CURRENT_TIMESTAMP)
    `, [
      queueId,
      post.id,
      post.target_audience === 'partners' ? 'partner' : 'client',
      rec.id,
      rec.name,
      `email:${rec.email}`,
      scheduledIso,
      scheduledIso,
      rec.email
    ], false);
  });

  const firstDate = tgTimes[0] || emailTimes[0] || new Date();
  executeRun(`
    UPDATE meme_posts 
    SET status = 'scheduled', scheduled_for = ?, recipients_total = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `, [firstDate.toISOString(), totalRecipients, postId]);
  saveDb();

  console.log(`[Meme Autopilot] Scheduled cascade delivery of post ${postId} for ${totalRecipients} active recipients (${activeTgRecipients.length} active Telegram, ${blockedTgRecipients.length} blocked Telegram excluded from reminders, ${emailRecipients.length} Email) in daytime window.`);
  return { 
    queuedCount: totalRecipients, 
    emailCount: emailRecipients.length, 
    telegramCount: activeTgRecipients.length,
    blockedCount: blockedTgRecipients.length
  };
}

export function pauseAndRescheduleNightQueue(): { rescheduledCount: number } {
  updateMemeAutopilotConfig({ is_active: 0 });
  const result = rescheduleAllQueue('tomorrow', 'all');
  console.log(`[Meme Autopilot] 🛑 Autopilot paused. Rescheduled ${result.rescheduledCount} pending items strictly into tomorrow daytime window.`);
  return { rescheduledCount: result.rescheduledCount };
}

/**
 * Executes pending items in delivery queue that are due right now.
 * STRICT SECURITY GUARD: Never dispatches messages when autopilot is paused or outside 10:00 - 17:00 MSK!
 * Enforces rate limits: max 5/min for Telegram, max 3/min and 60/hr for Email.
 */
export async function processPendingDeliveryQueue(): Promise<{ processed: number; sent: number; blocked: number; failed: number }> {
  const config = getMemeAutopilotConfig();

  // 1. Check active switch
  if (config.is_active !== 1) {
    return { processed: 0, sent: 0, blocked: 0, failed: 0 };
  }

  // 2. Strict daytime window lock (10:00 - 17:00 MSK)
  const msk = getMskDate();
  const currentHourMsk = msk.getHours();
  if (currentHourMsk < config.send_window_start_hour_msk || currentHourMsk >= config.send_window_end_hour_msk) {
    return { processed: 0, sent: 0, blocked: 0, failed: 0 };
  }

  // 3. Normalize any past dates first so nothing stays in yesterday
  normalizeQueueDates();

  const nowIso = new Date().toISOString();
  
  // Pick up to 8 items per cycle with delay to respect rate limits
  const dueItems = executeQuery<{
    id: string;
    post_id: string;
    recipient_type: string;
    recipient_id: string;
    recipient_name: string;
    telegram_id: string;
    bot_type: string;
    channel?: string;
    email?: string;
  }>(`
    SELECT id, post_id, recipient_type, recipient_id, recipient_name, telegram_id, bot_type, channel, email 
    FROM meme_delivery_queue 
    WHERE status = 'pending' AND scheduled_time <= ?
    ORDER BY scheduled_time ASC 
    LIMIT 8
  `, [nowIso]);

  if (!dueItems || dueItems.length === 0) {
    return { processed: 0, sent: 0, blocked: 0, failed: 0 };
  }

  let sentCount = 0;
  let blockedCount = 0;
  let failedCount = 0;

  for (const item of dueItems) {
    const post = executeQuery<MemePost>("SELECT * FROM meme_posts WHERE id = ?", [item.post_id])?.[0];
    if (!post) {
      executeRun("UPDATE meme_delivery_queue SET status = 'failed', error_message = 'Пост удален' WHERE id = ?", [item.id]);
      continue;
    }

    const isEmail = item.channel === 'email' || item.bot_type === 'smtp_email' || item.telegram_id?.startsWith('email:');

    if (isEmail) {
      // Email dispatch via SMTP
      const targetEmail = item.email || item.telegram_id.replace(/^email:/, '');
      const rateCheck = checkEmailRateLimit();
      if (!rateCheck.allowed) {
        console.log(`[Meme Autopilot] Email rate limit reached (60/hr or 3/min). Skipping email item ${item.id} for next cycle.`);
        continue;
      }

      try {
        await new Promise(r => setTimeout(r, 3200));
        const { transporter, fromEmail } = getMemeSmtpTransporter();
        const { html, text, subject } = formatMemeEmailHtml(post, targetEmail, item.recipient_name, { isTest: false });

        await transporter.sendMail({
          from: `"SAV AI — Напоминания" <${fromEmail}>`,
          to: targetEmail,
          subject,
          text,
          html,
          headers: {
            'List-Unsubscribe': `<https://rent-rop.com/api/meme-autopilot/unsubscribe?email=${encodeURIComponent(targetEmail)}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            'Precedence': 'bulk'
          }
        });

        emailSendLog.push(Date.now());
        sentCount++;

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 2);

        executeRun(`
          UPDATE meme_delivery_queue 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP, next_send_at = ?, error_message = NULL 
          WHERE id = ?
        `, [nextDate.toISOString(), item.id]);

        executeRun("UPDATE meme_posts SET recipients_sent = recipients_sent + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id]);
      } catch (err: any) {
        failedCount++;
        console.error(`[Meme Autopilot] Email send failed to ${targetEmail}:`, err.message);
        executeRun(`
          UPDATE meme_delivery_queue 
          SET status = 'failed', error_message = ? 
          WHERE id = ?
        `, [err.message || 'Ошибка отправки Email', item.id]);
        executeRun("UPDATE meme_posts SET recipients_failed = recipients_failed + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id]);
      }
      continue;
    }

    // Telegram dispatch
    const { botToken } = getMemeBotCredentials(post.target_audience);
    const inlineButtons = getMemeInlineKeyboard(post.target_audience);
    const messageText = formatMemeRichMessage(post, { isTest: false });

    try {
      // 2.2 second throttle between individual Telegram sends
      await new Promise(r => setTimeout(r, 2200));

      const res = await sendTelegramMessage({
        chatId: item.telegram_id,
        text: messageText,
        botToken,
        replyMarkup: inlineButtons,
        parseMode: 'HTML',
        timeoutMs: 12000
      });

      const isOk = typeof res === 'object' ? (res as any)?.ok : Boolean(res);
      const errDesc = typeof res === 'object' ? String((res as any)?.error || '') : '';

      if (isOk) {
        sentCount++;
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + 2);

        executeRun(`
          UPDATE meme_delivery_queue 
          SET status = 'sent', sent_at = CURRENT_TIMESTAMP, next_send_at = ?, error_message = NULL 
          WHERE id = ?
        `, [nextDate.toISOString(), item.id]);

        // Record in sav_client_messages history table
        executeRun(`
          INSERT INTO sav_client_messages (
            id, client_id, telegram_id, direction, message, media, inline_buttons, template_name, status, sent_at
          ) VALUES (?, ?, ?, 'outgoing', ?, ?, ?, 'Мем-напоминание (Автопилот)', 'sent', CURRENT_TIMESTAMP)
        `, [
          `msg_${Date.now()}_${item.telegram_id}`,
          item.recipient_id,
          item.telegram_id,
          post.text_rich,
          post.image_url,
          JSON.stringify(inlineButtons)
        ]);

        executeRun("UPDATE meme_posts SET recipients_sent = recipients_sent + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id]);
      } else if (/bot was blocked|user is deactivated|chat not found|can't initiate conversation/i.test(errDesc)) {
        blockedCount++;
        console.log(`[Meme Autopilot] Recipient ${item.telegram_id} (${item.recipient_name}) status: bot inactive/blocked (${errDesc}). Marked as Заблокировано in DB.`);

        executeRun(`
          UPDATE meme_delivery_queue 
          SET status = 'blocked', error_message = ? 
          WHERE id = ?
        `, [errDesc, item.id]);

        if (item.recipient_type === 'partner') {
          executeRun("UPDATE partners SET status = 'Заблокировано', comment = COALESCE(comment, '') || ' [Бот заблокирован пользователем]' WHERE telegram_id = ?", [item.telegram_id]);
        } else {
          executeRun("UPDATE sav_clients SET status = 'Заблокировано', comment = COALESCE(comment, '') || ' [Бот заблокирован пользователем]' WHERE telegram_id = ?", [item.telegram_id]);
        }

        executeRun("UPDATE meme_posts SET recipients_blocked = recipients_blocked + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id]);
      } else {
        failedCount++;
        executeRun(`
          UPDATE meme_delivery_queue 
          SET status = 'failed', error_message = ? 
          WHERE id = ?
        `, [errDesc || 'Ошибка доставки', item.id]);

        executeRun("UPDATE meme_posts SET recipients_failed = recipients_failed + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [post.id]);
      }
    } catch (err: any) {
      failedCount++;
      executeRun(`
        UPDATE meme_delivery_queue 
        SET status = 'failed', error_message = ? 
        WHERE id = ?
      `, [err.message, item.id]);
    }
  }

  saveDb();
  return { processed: dueItems.length, sent: sentCount, blocked: blockedCount, failed: failedCount };
}

/**
 * Morning Autopilot Trigger (Runs at 07:00 MSK every 2 days):
 * 1. Generates fresh Client post & Partner post with 16:9 Steampunk robot memes
 * 2. Immediately sends test drafts to Admin 169262990 for review
 * 3. Schedules cascade deliveries for 10:00 - 17:00 MSK
 */
export async function runMorningAutopilotGeneration(): Promise<{ clientPost: MemePost; partnerPost: MemePost }> {
  if (isMorningGenerationInProgress) {
    console.warn('[Meme Autopilot] ⚠️ Morning autopilot cycle is already currently running. Duplicate call prevented.');
    throw new Error('Утренний цикл автопилота уже выполняется в данный момент');
  }

  isMorningGenerationInProgress = true;
  console.log('[Meme Autopilot] 🌅 Starting scheduled 07:00 MSK generation cycle for Clients and Partners...');
  
  updateAutopilotProgress({
    isActive: true,
    step: 1,
    totalSteps: 3,
    stageName: 'Запуск полного утреннего цикла 07:00 (Клиенты + Партнеры)',
    detail: 'Генерация мема для клиентов: единый JSON (текст, хуки, промпт 16:9)...',
    percent: 10,
    currentAudience: 'cycle',
    startedAt: Date.now(),
    completedAt: undefined,
    error: undefined
  });

  try {
    const config = getMemeAutopilotConfig();

    // 1. Immediately update last_generation_at timestamp in database FIRST to prevent concurrent ticks
    updateMemeAutopilotConfig({ last_generation_at: new Date().toISOString() });

    // 2. Generate Client post with its single JSON request and single Function 621 image
    const clientPost = await generateMemePost('clients');
    updateAutopilotProgress({
      lastClientPost: clientPost,
      percent: 50,
      stageName: 'Мем для клиентов готов',
      detail: 'Генерация мема для партнеров: единый JSON + функция 621...'
    });

    // 3. Generate Partner post with its single JSON request and single Function 621 image
    const partnerPost = await generateMemePost('partners');
    updateAutopilotProgress({
      lastPartnerPost: partnerPost,
      percent: 80,
      stageName: 'Мем для партнеров готов',
      detail: 'Отправка тестов администратору (169262990)...'
    });

    // 4. Instantly notify Admin (169262990) with both preview cards
    await sendTestPostToAdmin(clientPost.id, config.admin_telegram_id);
    await new Promise(r => setTimeout(r, 2000));
    await sendTestPostToAdmin(partnerPost.id, config.admin_telegram_id);

    // 5. Schedule cascade deliveries for 10:00 - 17:00 MSK window
    await schedulePostCascade(clientPost.id);
    await schedulePostCascade(partnerPost.id);

    updateAutopilotProgress({
      isActive: false,
      step: 3,
      stageName: 'Утренний цикл успешно завершен',
      detail: 'Оба мема созданы, тесты отправлены на 169262990, каскадная очередь запланирована на 10:00-17:00 МСК',
      percent: 100,
      currentAudience: 'cycle',
      completedAt: Date.now(),
      lastClientPost: clientPost,
      lastPartnerPost: partnerPost
    });

    console.log('[Meme Autopilot] ✅ 07:00 MSK generation completed, test drafts sent to admin and cascade scheduled.');
    return { clientPost, partnerPost };
  } catch (err: any) {
    updateAutopilotProgress({
      isActive: false,
      stageName: 'Ошибка цикла',
      detail: err.message,
      error: err.message
    });
    throw err;
  } finally {
    isMorningGenerationInProgress = false;
  }
}

/**
 * Periodic cron tick check:
 * - Checks if 07:00 MSK arrived and 2 days elapsed -> triggers morning generation
 * - Processes any pending delivery queue items that are scheduled right now
 */
export async function tickMemeAutopilotScheduler(): Promise<void> {
  const config = getMemeAutopilotConfig();
  if (!config.is_active) return;

  const msk = getMskDate();
  const currentHour = msk.getHours();
  const currentMinute = msk.getMinutes();

  // 1. Check if morning generation is due (strictly at the configured 07:00 hour)
  if (currentHour === config.generation_hour_msk && currentMinute >= config.generation_minute_msk && !isMorningGenerationInProgress) {
    const lastGen = config.last_generation_at ? new Date(config.last_generation_at) : null;
    let daysSinceLast = 999;
    if (lastGen) {
      daysSinceLast = (Date.now() - lastGen.getTime()) / (1000 * 60 * 60 * 24);
    }

    if (daysSinceLast >= (config.interval_days - 0.05)) {
      try {
        await runMorningAutopilotGeneration();
      } catch (gErr) {
        console.error('[Meme Autopilot] Morning generation error:', gErr);
      }
    }
  }

  // 2. Process pending items in delivery queue strictly during configured daytime window (10:00 - 17:00 MSK)
  if (currentHour >= config.send_window_start_hour_msk && currentHour < config.send_window_end_hour_msk) {
    try {
      const queueRes = await processPendingDeliveryQueue();
      if (queueRes.processed > 0) {
        console.log(`[Meme Autopilot Queue] Processed ${queueRes.processed} messages (sent: ${queueRes.sent}, blocked: ${queueRes.blocked}, failed: ${queueRes.failed})`);
      }
    } catch (qErr) {
      console.error('[Meme Autopilot] Queue processing error:', qErr);
    }
  }
}
