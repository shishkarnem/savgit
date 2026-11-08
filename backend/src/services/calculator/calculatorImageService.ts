/**
 * SAV AI Calculator Image Generation Service
 * Dedicated implementation for generating AI-application visual mockups during cost calculation
 * Uses ProTalk Function 791 (gpt-image-2.5-sunburst) and uploads the result directly to the SAV AI gallery.
 */

import { query, runSql } from '../../db/database';

export const PROTALK_FUNCTION_791_CONFIG = {
  function_id: 791,
  functions_base_id: "appkq3HrzrxYxoAV8",
  bot_id: 72220,
  bot_token: "BIUTUa499JhVgwmcsY6tRLy4WExXuSX6",
  ai_model: "gpt-image-2.5-sunburst",
  aspect_ratio: "16:9",
  resolution: "1K",
  images_urls: "https://file.pro-talk.ru/tgf/GTUpJwQ9JCkYKglyGHQMFERjORV9FyEoKxEaPxscFzkLWxd3NhV7HnoSHTEZEyIxDTceChEoJ04KDQkrWQgfEHwUEmYpNQQeLA8YFgdnGHEWMGMtN05yTm9kWVx2bl1SGBMkTzhDL1JEJjw_EgstGT0CNywaIC0xBGA3AAwZVgAuOy4GJH9dVHVpW19rZFYD.jpg",
  log_url: "https://docs.google.com/spreadsheets/d/1veEGt8f-4O0sNaFgNLjbUFmnf0CquaoIbjAMIXkt0LU/edit?usp=sharing",
  default_chat_id: "169262990"
};

const GALLERY_UPLOAD_URL = "https://file.pro-talk.ru/tgf";
const GALLERY_UPLOAD_TOKEN = "b2RdUnRrWlFha1h3GHMhU2Y5GCsuGxAULisQKl0tNCo3BTJ4FSNQGCwLFxRuPRQYaGtdWGtjUgVvAH9YAmk";

/**
 * Formats image prompt from the database for the calculator app mockup
 */
export async function getCalculatorAppImagePrompt(
  companyName: string,
  businessDescription: string
): Promise<string> {
  const cleanCompany = (companyName || '').trim() || 'Инновационная компания';
  let cleanDesc = (businessDescription || '').trim() || 'Автономная обработка задач и роботизация подразделения';

  // Extract department, employees, product if present
  let dept = 'Отдел продаж';
  let emp = '3';
  let prod = 'Аренда обученных руководителей отделов продаж с наставничеством, отчётностью и контролем KPI';

  const deptMatch = cleanDesc.match(/подразделения\s*[«"']([^»"']+)["'»]/i);
  if (deptMatch) dept = deptMatch[1];

  const empMatch = cleanDesc.match(/(\d+)\s*сотрудник/i);
  if (empMatch) emp = empMatch[1];

  const prodMatch = cleanDesc.match(/продукт:\s*([^\.\n]+)/i);
  if (prodMatch) {
    prod = prodMatch[1].trim().replace(/^["']|["']$/g, '');
    if (prod.includes('Задачи и ТЗ')) prod = prod.split('Задачи и ТЗ')[0].trim();
    if (prod.includes('###')) prod = prod.split('###')[0].trim();
    prod = prod.replace(/[.,;]+$/, '').trim();
  }

  let template = '';
  try {
    const rows = await query(
      "SELECT system_prompt FROM protalk_prompts WHERE prompt_key IN ($1, $2, $3) AND is_active = true ORDER BY (prompt_key = $1) DESC LIMIT 1;",
      ['protalk_calculator_image_gen', 'protalk_app_image', 'protalk_business_image']
    );
    if (rows && rows.length > 0 && rows[0].system_prompt) {
      template = rows[0].system_prompt;
    }
  } catch (err) {
    console.warn('[Calculator Image Service] DB prompt fetch warning:', err);
  }

  if (!template) {
    template = 'Создай высокодетализированный презентационный концепт-арт и макет цифрового интерфейса автономной ИИ-системы для бизнеса с названием компании «{{company_name}}» {{business_description}}. На едином горизонтальном кадре формата 16:9 представлен эстетичный коллаж экранов системы одновременно в мобильном виде и в виде десктопной ПК-версии. Премиальный технологичный дизайн в стиле Liquid Glass, золотые и глубокие темные стеклянные полупрозрачные панели, неоновые акценты, кристально чистая визуализация интерфейса UI/UX. Стимпанк стиль и робот на фоне приложения в стимпанк гоглах сюжетно по теме работы подразделения.';
  }

  let prompt = template
    .replace(/\{\{company_name\}\}|\{companyName\}|\{company\}|\(тут название компании\)/g, cleanCompany)
    .replace(/\{\{business_description\}\}|\{business_description\}|\{description\}|\(тут описание бизнеса\)|\(тут информация о бизнесе из поля\)/g, cleanDesc)
    .replace(/\{department\}/g, dept)
    .replace(/\{product\}/g, prod)
    .replace(/\{employees\}/g, emp);

  return prompt.replace(/\s+/g, ' ').trim();
}

/**
 * Downloads image and uploads it to the SAV AI gallery storage, registering it in file_storage
 */
export async function uploadImageToGallery(
  sourceUrl: string,
  companyName: string
): Promise<string> {
  if (!sourceUrl || !sourceUrl.startsWith('http')) return sourceUrl;

  try {
    const cleanCompany = (companyName || 'SAV AI').replace(/[^a-zA-Zа-яА-Я0-9]/g, '_').slice(0, 30);
    const filename = `calc_app_${Date.now()}_${cleanCompany}.png`;
    const slug = `calc_app_${Date.now()}`;

    console.log(`[Gallery Uploader] Downloading generated image: ${sourceUrl.slice(0, 70)}...`);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(sourceUrl, { signal: ctrl.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Gallery Uploader] Failed to download image (${res.status}), using direct URL`);
      return sourceUrl;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 500) {
      return sourceUrl;
    }

    // Upload to gallery gateway
    let directGalleryUrl = '';
    try {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: 'image/png' });
      formData.append('file', blob, filename);

      const upRes = await fetch(GALLERY_UPLOAD_URL, {
        method: 'POST',
        headers: {
          'X-Upload-Token': GALLERY_UPLOAD_TOKEN,
          'X-Preserve-Alpha': 'true'
        },
        body: formData
      });

      if (upRes.ok) {
        const text = await upRes.text();
        if (text.startsWith('http://') || text.startsWith('https://')) {
          directGalleryUrl = text.trim();
        } else {
          try {
            const data = JSON.parse(text);
            directGalleryUrl = data?.url || data?.file_url || '';
          } catch (_) {}
        }
      }
    } catch (upErr) {
      console.warn('[Gallery Uploader] Upload gateway error:', upErr);
    }

    const finalUrl = directGalleryUrl || sourceUrl;

    // Register into file_storage gallery table
    try {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let fileKey = '';
      for (let i = 0; i < 8; i++) fileKey += chars.charAt(Math.floor(Math.random() * chars.length));

      await runSql(`
        INSERT INTO file_storage (file_key, name, slug, original_url, mime_type, file_size, folder_id, description)
        VALUES (?, ?, ?, ?, ?, ?, 4, ?)
      `, [fileKey, filename, slug, finalUrl, 'image/png', buffer.length, `ИИ-приложение: ${companyName}`]);

      console.log(`[Gallery Uploader] Registered in gallery database: ${finalUrl}`);
    } catch (dbErr) {
      console.warn('[Gallery Uploader] DB registration warning:', dbErr);
    }

    return finalUrl;
  } catch (err) {
    console.error('[Gallery Uploader Error]', err);
    return sourceUrl;
  }
}

/**
 * Generates an AI Application image mockup for the calculator using Function 791 (gpt-image-2.5-sunburst)
 * and immediately stores it in our gallery to provide a direct gallery link.
 */
export async function generateCalculatorAppImageWithProTalk(
  companyName: string,
  businessDescription: string,
  timeoutMs: number = 60000,
  chatUid?: string
): Promise<string | null> {
  const cleanCompany = (companyName || '').trim();
  const cleanDesc = (businessDescription || '').trim() || 'Инновационный бизнес';
  const resolvedChatId = String(chatUid || PROTALK_FUNCTION_791_CONFIG.default_chat_id);

  console.log(`[Calculator Image Service] Starting image generation via Function 791 for: "${cleanCompany}" (chat: ${resolvedChatId})...`);

  // 1. Prepare Prompt from database
  const prompt = await getCalculatorAppImagePrompt(cleanCompany, cleanDesc);
  console.log(`[Calculator Image Service] Formatted prompt: ${prompt.slice(0, 140)}...`);

  // 2. Prepare Payload according to user specifications
  const payload = {
    function_id: PROTALK_FUNCTION_791_CONFIG.function_id,
    functions_base_id: PROTALK_FUNCTION_791_CONFIG.functions_base_id,
    bot_id: PROTALK_FUNCTION_791_CONFIG.bot_id,
    bot_token: PROTALK_FUNCTION_791_CONFIG.bot_token,
    arguments: {
      prompt,
      ai_model: PROTALK_FUNCTION_791_CONFIG.ai_model,
      aspect_ratio: PROTALK_FUNCTION_791_CONFIG.aspect_ratio,
      resolution: PROTALK_FUNCTION_791_CONFIG.resolution,
      size: "",
      images_urls: PROTALK_FUNCTION_791_CONFIG.images_urls,
      debug: false,
      log_url: PROTALK_FUNCTION_791_CONFIG.log_url,
      log_chat_id: resolvedChatId
    }
  };

  try {
    const ctrl = new AbortController();
    const effectiveTimeout = Math.max(timeoutMs, 55000);
    const timer = setTimeout(() => ctrl.abort(), effectiveTimeout);

    console.log(`[Calculator Image Service] POST https://api.pro-talk.ru/api/v1.0/run_function (function ${PROTALK_FUNCTION_791_CONFIG.function_id})...`);
    const startTime = Date.now();

    const response = await fetch("https://api.pro-talk.ru/api/v1.0/run_function", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    clearTimeout(timer);

    const duration = Date.now() - startTime;
    console.log(`[Calculator Image Service] Response status: ${response.status} (${duration}ms)`);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Calculator Image Service] Function 791 failed with HTTP ${response.status}: ${errText}`);
      return null;
    }

    const data = await response.json().catch(() => ({}));
    console.log(`[Calculator Image Service] Function 791 response:`, {
      status: data.status,
      ai_model: data.ai_model,
      has_image_url: Boolean(data.image_url),
      has_original_url: Boolean(data.original_url)
    });

    const rawImageUrl = data.image_url || data.original_url;
    if (!rawImageUrl) {
      console.warn('[Calculator Image Service] No image URL found in response');
      return null;
    }

    // 3. Immediately upload to SAV AI gallery to get direct permanent link
    const galleryDirectUrl = await uploadImageToGallery(rawImageUrl, cleanCompany);
    console.log(`[Calculator Image Service] Final direct gallery link ready: ${galleryDirectUrl}`);

    // Log to system_logs for auditing
    try {
      await runSql(`
        INSERT INTO system_logs (id, level, source, message)
        VALUES (?, 'INFO', 'CALCULATOR_IMAGE_GEN', ?)
      `, [`log_img_${Date.now()}`, `[Calc Image Gen] Created for "${cleanCompany}" via Function 791: ${galleryDirectUrl}`]);
    } catch (_) {}

    return galleryDirectUrl;
  } catch (err: any) {
    console.error('[Calculator Image Service] Error executing Function 791:', err);
    return null;
  }
}
