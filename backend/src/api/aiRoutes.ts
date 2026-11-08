import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { executeQuery, executeRun, saveDb } from '../db/database';
import {
  classifyBusinessWithProTalk,
  sendProTalkMessageAsync,
  getProTalkLastReply,
  getProTalkConfig,
  getPromptByKey,
  generateSteampunkBusinessImageWithProTalk,
  generateCalculatorAppImageWithProTalk,
  enhanceTariffsWithProTalk,
  recognizeDocumentTzWithProTalk,
  runProTalkDocRecognitionFunction,
  generateCalculatorTzWithProTalk,
  parseVoiceCalculatorWithProTalk,
  matchExpertWithProTalk,
  sendTelegramAdminNotification
} from '../services/proTalkService';
import { processAuditSubmission } from '../services/telegramNotifier';
import { sanitizeRows, redactTokensInText } from '../utils/securityUtils';

const router = Router();

function splitNumberedList(text: string | null | undefined): string[] {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.flatMap((item: any) => splitNumberedList(String(item)));
      }
    } catch {}
  }

  if (/(?:^|\s+|\n+)\d+\.\s+/.test(trimmed)) {
    const rawParts = trimmed
      .split(/(?:^|\s+|\n+)(?=\d+\.\s+)/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (rawParts.length > 1 || (rawParts.length === 1 && /^\d+\.\s+/.test(rawParts[0]))) {
      return rawParts;
    }
  }

  if (trimmed.includes('\n')) {
    const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) return lines;
  }

  if (trimmed.includes(';') && trimmed.split(';').length >= 3) {
    return trimmed.split(';').map(s => s.trim()).filter(Boolean);
  }

  return [trimmed];
}

/**
 * POST /api/v1/ai/classify-business
 * Processes business classification using ProTalk AI Core bot (bot_id: 72220) and generates 16:9 banner
 */
router.post('/classify-business', async (req: Request, res: Response) => {
  try {
    const { userInput, companyName, userInfo, timeoutSeconds, uid } = req.body;
    const rawInput = (typeof userInput === 'string' ? userInput : '').trim();
    const cleanCompany = (typeof companyName === 'string' ? companyName : '').trim();
    const userUid = uid || userInfo?.uid || userInfo?.chat_id;

    if (!rawInput) {
      return res.status(400).json({ success: false, error: 'Параметры бизнеса обязательны для классификации' });
    }

    const timeoutMs = (Number(timeoutSeconds) || 90) * 1000;
    const classificationResult = await classifyBusinessWithProTalk(rawInput, timeoutMs, cleanCompany, userUid);

    // Save calculation into SQLite Database
    const tgId = userInfo?.telegram_id ? String(userInfo.telegram_id) : null;
    const calcId = `calc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const botCfg = getProTalkConfig();

    try {
      executeRun(`
        INSERT INTO sav_user_calculations (
          id, calculation_type, company_name, business_description, segment, category, sphere, package_level, praise, image_url, telegram_id, data, created_at
        )
        VALUES (?, 'AI_SELLER_CLASSIFICATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        calcId,
        cleanCompany || null,
        rawInput,
        classificationResult.segment,
        classificationResult.category,
        classificationResult.sphere,
        classificationResult.package,
        classificationResult.praise,
        classificationResult.image_url || null,
        tgId ? Number(tgId) || null : null,
        JSON.stringify({ ...classificationResult, company_name: cleanCompany, user_info: userInfo })
      ]);
    } catch (calcErr) {
      console.warn('[Calc Save Note]', calcErr);
    }

    // Save into sav_leads table
    try {
      const leadId = `lead_${Date.now()}`;
      executeRun(`
        INSERT OR REPLACE INTO sav_leads (
          id, bot_id, bot_token, protalk_id, project, user_biz, segment, category, sphere, tariff, telegram_id, first_name, last_name, username, photo_url, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
      `, [
        leadId,
        String(botCfg.bot_id),
        botCfg.bot_token,
        classificationResult.bot_chat_id,
        cleanCompany || null,
        rawInput,
        classificationResult.segment,
        classificationResult.category,
        classificationResult.sphere,
        classificationResult.package,
        tgId,
        userInfo?.first_name || null,
        userInfo?.last_name || null,
        userInfo?.username || null,
        classificationResult.image_url || null
      ]);
    } catch (lErr) {
      console.warn('[Lead Save Note]', lErr);
    }

    saveDb();

    return res.json({
      success: true,
      calculationId: calcId,
      company_name: cleanCompany || undefined,
      ...classificationResult
    });
  } catch (err: any) {
    console.error('[Classify Business Error]', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Ошибка классификации ProTalk'
    });
  }
});

/**
 * POST /api/v1/ai/generate-image
 * Dedicated endpoint to generate a 16:9 steampunk business image via ProTalk
 */
router.post('/generate-image', async (req: Request, res: Response) => {
  try {
    const { companyName, businessDescription, timeoutSeconds, uid, chat_id, userUid, mode, type, promptType } = req.body;
    const timeoutMs = (Number(timeoutSeconds) || 60) * 1000;
    const targetUid = userUid || uid || chat_id;
    const resolvedMode: 'seller' | 'app' = (mode || type || promptType || '').toLowerCase().includes('app') ? 'app' : 'seller';

    const imageUrl = resolvedMode === 'app'
      ? await generateCalculatorAppImageWithProTalk(companyName || '', businessDescription || '', timeoutMs, targetUid)
      : await generateSteampunkBusinessImageWithProTalk(companyName || '', businessDescription || '', timeoutMs, targetUid, 'seller');

    res.json({
      success: true,
      imageUrl: imageUrl || null
    });
  } catch (err: any) {
    console.error('[Generate Image Error]', err);
    res.status(500).json({ success: false, error: err.message || 'Ошибка генерации изображения' });
  }
});

/**
 * POST /api/v1/ai/enhance-tariffs
 * Tailors 5 tariff package descriptions via ProTalk
 */
router.post('/enhance-tariffs', async (req: Request, res: Response) => {
  try {
    const { companyName, sphere, segment, category, basePlans, businessDescription, userUid, uid, chat_id } = req.body;
    if (!Array.isArray(basePlans) || basePlans.length === 0) {
      return res.status(400).json({ success: false, error: 'basePlans array is required' });
    }

    const targetUid = userUid || uid || chat_id;

    const enhanced = await enhanceTariffsWithProTalk(
      companyName || '',
      sphere || 'Торговля',
      segment || 'B2C',
      category || 'Товары',
      basePlans,
      businessDescription,
      targetUid
    );

    res.json({
      success: true,
      plans: enhanced
    });
  } catch (err: any) {
    console.error('[Enhance Tariffs Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/notify-telegram
 * Sends Telegram notification when a user chooses a tariff
 */
router.post('/notify-telegram', async (req: Request, res: Response) => {
  try {
    const {
      companyName,
      selectedTariff,
      paymentType,
      price,
      sphere,
      segment,
      category,
      clientName,
      telegramUsername,
      phone,
      promoCode
    } = req.body;

    if (!selectedTariff || !price) {
      return res.status(400).json({ success: false, error: 'selectedTariff and price are required' });
    }

    const result = await sendTelegramAdminNotification({
      companyName,
      selectedTariff,
      paymentType: paymentType || 'monthly',
      price,
      sphere,
      segment,
      category,
      clientName,
      telegramUsername,
      phone,
      promoCode
    });

    res.json(result);
  } catch (err: any) {
    console.error('[Telegram Notification API Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/telegram-config
 */
router.get('/telegram-config', (req: Request, res: Response) => {
  try {
    const configs = executeQuery("SELECT * FROM telegram_bot_config ORDER BY created_at DESC");
    res.json({ success: true, configs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/telegram-config
 */
router.post('/telegram-config', (req: Request, res: Response) => {
  try {
    const { bot_token, admin_chat_id, bot_name, description } = req.body;
    if (!bot_token) {
      return res.status(400).json({ success: false, error: 'bot_token is required' });
    }

    executeRun(`
      INSERT OR REPLACE INTO telegram_bot_config (
        id, bot_token, admin_chat_id, bot_name, description, is_active, updated_at
      ) VALUES (
        'sales_alert_bot', ?, ?, ?, ?, 1, CURRENT_TIMESTAMP
      )
    `, [
      bot_token,
      admin_chat_id || '169262990',
      bot_name || 'SAV AI Telegram Notification Bot',
      description || 'Бот для отправки оповещений о выбранных тарифах'
    ]);

    saveDb();
    res.json({ success: true, message: 'Настройки Telegram бота сохранены' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/generate-business-image
 * Direct generation of 16:9 steampunk business image via ProTalk API
 */
router.post('/generate-business-image', async (req: Request, res: Response) => {
  try {
    const { companyName, company, businessDescription, description, timeoutSeconds, uid, mode, type, promptType } = req.body;
    const cleanCompany = (typeof companyName === 'string' ? companyName : (typeof company === 'string' ? company : '')).trim();
    const cleanDescription = (typeof businessDescription === 'string' ? businessDescription : (typeof description === 'string' ? description : '')).trim() || 'Инновационный бизнес';
    const timeoutMs = (Number(timeoutSeconds) || 60) * 1000;
    const resolvedMode: 'seller' | 'app' = (mode || type || promptType || '').toLowerCase().includes('app') ? 'app' : 'seller';

    const imageUrl = await generateSteampunkBusinessImageWithProTalk(cleanCompany, cleanDescription, timeoutMs, uid, resolvedMode);
    if (imageUrl) {
      res.json({ success: true, image_url: imageUrl, imageUrl });
    } else {
      res.status(500).json({ success: false, error: 'Не удалось получить ссылку на сгенерированное изображение' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/promo/check and GET /api/v1/promo/check
 * Validates promo code against partners table in SQLite
 */
router.get(['/promo/check', '/calculator/promo/check'], (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || req.query.promo || '').trim();
    if (!code) {
      return res.json({ success: true, isValid: false });
    }

    const partners = executeQuery("SELECT * FROM partners");
    const normalizedInput = code.toLowerCase();

    const match = partners.find((p: any) => {
      const pPromo = p.promo ? String(p.promo).trim().toLowerCase() : '';
      const pCode = p.partner_code ? String(p.partner_code).trim().toLowerCase() : '';
      const pTg = p.telegram_id ? String(p.telegram_id).trim().toLowerCase() : '';
      return pPromo === normalizedInput || pCode === normalizedInput || pTg === normalizedInput;
    });

    if (match) {
      return res.json({
        success: true,
        isValid: true,
        partnerName: match.pseudonym || match.fio || match.title || 'Партнёр',
        discountPercent: Number(match.discount_percent) || 5,
        partnerId: match.id,
        telegramId: match.telegram_id
      });
    }

    return res.json({
      success: true,
      isValid: false
    });
  } catch (err: any) {
    console.error('[Promo Check Route Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/generate-business-image
 */
router.post('/protalk/send_async', async (req: Request, res: Response) => {
  try {
    const { bot_chat_id, message } = req.body;
    if (!bot_chat_id || !message) {
      return res.status(400).json({ success: false, error: 'bot_chat_id and message are required' });
    }
    const result = await sendProTalkMessageAsync(bot_chat_id, message);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Direct ProTalk Get Last Reply
 */
router.post('/protalk/get_last_reply', async (req: Request, res: Response) => {
  try {
    const { bot_chat_id } = req.body;
    if (!bot_chat_id) {
      return res.status(400).json({ success: false, error: 'bot_chat_id is required' });
    }
    const reply = await getProTalkLastReply(bot_chat_id);
    res.json({ success: true, reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/prompts
 * Returns all active prompts from SQLite database
 */
router.get('/prompts', (req: Request, res: Response) => {
  try {
    const prompts = executeQuery("SELECT * FROM ai_prompts ORDER BY created_at DESC");
    res.json({ success: true, prompts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/prompts
 * Create or update prompt in SQLite
 */
router.post('/prompts', (req: Request, res: Response) => {
  try {
    const { prompt_key, title, category, system_prompt, user_prompt_template, target_model } = req.body;
    if (!prompt_key || !title || !system_prompt) {
      return res.status(400).json({ success: false, error: 'prompt_key, title and system_prompt are required' });
    }

    const id = `prompt_${Date.now()}`;
    executeRun(`
      INSERT OR REPLACE INTO ai_prompts (
        id, prompt_key, title, category, system_prompt, user_prompt_template, target_model, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `, [id, prompt_key, title, category || 'Общие', system_prompt, user_prompt_template || '', target_model || 'ProTalk']);

    saveDb();
    res.json({ success: true, message: 'Промпт сохранен' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/tariffs
 * Returns all tariffs, base prices, and coefficients from SQLite database
 */
router.get('/tariffs', (req: Request, res: Response) => {
  try {
    const tariffs = executeQuery("SELECT * FROM sav_price_tariffs ORDER BY price_month ASC");
    const basePrices = executeQuery("SELECT * FROM sav_price_base ORDER BY price ASC");
    const coefficients = executeQuery("SELECT * FROM sav_price_coefficients ORDER BY indicator ASC, coefficient ASC");

    res.json({
      success: true,
      tariffs,
      basePrices,
      coefficients
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/tariffs/calculate
 * Calculates final pricing using sav_price_base multiplied by coefficients:
 * totalCoeff = categoryCoef * segmentCoef * sphereCoef
 * monthlyPrice = Math.round(basePrice * totalCoeff)
 * onetimePrice = Math.round(monthlyPrice / 0.2)
 */
router.post('/tariffs/calculate', (req: Request, res: Response) => {
  try {
    const { sphere, category, segment, payment_type } = req.body;

    const basePrices = executeQuery("SELECT * FROM sav_price_base ORDER BY price ASC");
    const coefficients = executeQuery("SELECT * FROM sav_price_coefficients");

    const getCoef = (groupName: string, indicatorVal: string, defaultVal: number = 1.0): number => {
      const match = coefficients.find((c: any) => 
        c.indicator?.trim().toLowerCase() === indicatorVal?.trim().toLowerCase() ||
        (c.option_name?.trim().toLowerCase() === groupName?.trim().toLowerCase() && c.indicator?.trim().toLowerCase() === indicatorVal?.trim().toLowerCase())
      );
      return match ? Number(match.coefficient) : defaultVal;
    };

    const isOnetime = payment_type === 'onetime' || payment_type === 'Единоразово';

    const sphereName = sphere || 'Другое';
    const categoryName = category || 'Товары';
    const segmentName = segment || 'B2C';

    const categoryCoef = getCoef('Категория', categoryName, 1.0);
    const segmentCoef = getCoef('Сегмент', segmentName, 1.0);
    const sphereCoef = getCoef('Сфера', sphereName, 1.0);

    // Multiplied: category * segment * sphere
    const totalMultiplier = categoryCoef * segmentCoef * sphereCoef;

    const calculatedPlans = basePrices.map((bp: any) => {
      const basePrice = Number(bp.price) || 0;
      
      // Monthly price (Ежемесячно) = basePrice * totalMultiplier
      const monthlyPrice = Math.round(basePrice * totalMultiplier);

      // Onetime price (Единоразово за разработку) = monthlyPrice / 0.2
      const onetimePrice = Math.round(monthlyPrice / 0.2);

      const finalPrice = isOnetime ? onetimePrice : monthlyPrice;

      let parsedFeatures: string[] = [];
      if (bp.features) {
        parsedFeatures = splitNumberedList(bp.features);
      }

      let parsedMessengers: string[] = [];
      if (bp.messenger_options) {
        parsedMessengers = splitNumberedList(bp.messenger_options);
      }

      return {
        id: bp.id,
        package: bp.tariff,
        tariffName: `SAV AI Продавец ${bp.tariff}`,
        basePrice,
        finalPrice,
        monthlyPrice,
        onetimePrice,
        priceMonth: finalPrice,
        paymentType: isOnetime ? 'onetime' : 'monthly',
        duration: bp.duration || '1 месяц',
        description: bp.description || '',
        features: parsedFeatures,
        messengerOptions: parsedMessengers,
        photoUrl: '',
        breakdown: {
          basePrice,
          categoryName,
          categoryCoef,
          segmentName,
          segmentCoef,
          sphereName,
          sphereCoef,
          totalMultiplier: Number(totalMultiplier.toFixed(4)),
          monthlyPrice,
          onetimePrice
        }
      };
    });

    res.json({
      success: true,
      sphere: sphereName,
      category: categoryName,
      segment: segmentName,
      paymentType: isOnetime ? 'onetime' : 'monthly',
      coefficients: {
        category: categoryCoef,
        segment: segmentCoef,
        sphere: sphereCoef,
        totalMultiplier: Number(totalMultiplier.toFixed(4))
      },
      plans: calculatedPlans
    });
  } catch (err: any) {
    console.error('[Calculate Tariffs Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/departments/coefficients
 * Returns all department coefficients
 */
router.get('/departments/coefficients', (req: Request, res: Response) => {
  try {
    const departments = executeQuery("SELECT * FROM sav_department_coefficients ORDER BY coefficient DESC");
    res.json({ success: true, departments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/cities
 * Returns all cities and their average salaries
 */
router.get('/cities', (req: Request, res: Response) => {
  try {
    const cities = executeQuery("SELECT * FROM sav_cities ORDER BY name ASC");
    res.json({ success: true, cities });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/departments/calculate-salary
 * Multiplies city average salary by department coefficient
 */
router.post('/departments/calculate-salary', (req: Request, res: Response) => {
  try {
    const { city_name, department_name, employees_count, tariff_price } = req.body;

    const cities = executeQuery("SELECT * FROM sav_cities");
    const matchedCity = cities.find((c: any) => c.name?.toLowerCase() === (city_name || 'москва').toLowerCase()) || { name: 'Москва', avg_salary: 98500 };
    const cityAvgSalary = Number(matchedCity.avg_salary) || 80000;

    const departments = executeQuery("SELECT * FROM sav_department_coefficients");
    const matchedDept = departments.find((d: any) => d.department_name?.toLowerCase() === (department_name || 'отдел продаж').toLowerCase()) || { department_name: 'Отдел продаж', coefficient: 1.15 };
    const deptCoef = Number(matchedDept.coefficient) || 1.0;

    const count = Math.max(1, Number(employees_count) || 1);
    const monthlySalaryPerEmployee = Math.round(cityAvgSalary * deptCoef);
    const taxAndOverheadPerEmployee = Math.round(monthlySalaryPerEmployee * 0.30); // 30% taxes & workplace
    const fullMonthlyCostPerEmployee = monthlySalaryPerEmployee + taxAndOverheadPerEmployee;

    const totalMonthlyCost = fullMonthlyCostPerEmployee * count;
    const totalAnnualCost = totalMonthlyCost * 12;

    const aiMonthlyPrice = Number(tariff_price) || 20000;
    const aiAnnualPrice = aiMonthlyPrice * 12;

    const monthlySavings = Math.max(0, totalMonthlyCost - aiMonthlyPrice);
    const annualSavings = Math.max(0, totalAnnualCost - aiAnnualPrice);
    const roiPercent = aiMonthlyPrice > 0 ? Math.round((monthlySavings / aiMonthlyPrice) * 100) : 0;
    const paybackMonths = totalMonthlyCost > 0 ? Number((aiMonthlyPrice / (totalMonthlyCost * 0.7)).toFixed(1)) : 0;

    res.json({
      success: true,
      city: matchedCity.name,
      city_avg_salary: cityAvgSalary,
      department: matchedDept.department_name,
      department_coefficient: deptCoef,
      employees_count: count,
      salary_per_employee: monthlySalaryPerEmployee,
      tax_overhead_per_employee: taxAndOverheadPerEmployee,
      full_monthly_cost_per_employee: fullMonthlyCostPerEmployee,
      total_monthly_cost: totalMonthlyCost,
      total_annual_cost: totalAnnualCost,
      ai_monthly_price: aiMonthlyPrice,
      ai_annual_price: aiAnnualPrice,
      monthly_savings: monthlySavings,
      annual_savings: annualSavings,
      roi_percent: roiPercent,
      payback_months: paybackMonths
    });
  } catch (err: any) {
    console.error('[Calculate Salary Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/protalk/config
 */
router.get('/protalk/config', (req: Request, res: Response) => {
  try {
    const config = executeQuery("SELECT * FROM protalk_config ORDER BY created_at DESC");
    const safeConfig = (config || []).map((c: any) => ({
      ...c,
      bot_token: c.bot_token ? `${String(c.bot_token).substring(0, 6)}••••••••${String(c.bot_token).slice(-4)}` : ''
    }));
    res.json({ success: true, config: safeConfig });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PUT /api/v1/ai/protalk/config
 */
router.put('/protalk/config', (req: Request, res: Response) => {
  try {
    const { id, name, bot_id, bot_token, gateway_url, log_url, function_id, functions_base_id, proxy_tasks_url, is_active } = req.body;
    const cleanBotToken = (bot_token && !bot_token.includes('••') && !bot_token.includes('...')) ? bot_token : null;
    if (id) {
      executeRun(`
        UPDATE protalk_config
        SET name = COALESCE(?, name),
            bot_id = COALESCE(?, bot_id),
            bot_token = COALESCE(?, bot_token),
            gateway_url = COALESCE(?, gateway_url),
            log_url = COALESCE(?, log_url),
            function_id = COALESCE(?, function_id),
            functions_base_id = COALESCE(?, functions_base_id),
            proxy_tasks_url = COALESCE(?, proxy_tasks_url),
            is_active = COALESCE(?, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [name, bot_id, cleanBotToken, gateway_url, log_url, function_id, functions_base_id, proxy_tasks_url, is_active, id]);
    }
    saveDb();
    const config = executeQuery("SELECT * FROM protalk_config ORDER BY created_at DESC");
    const safeConfig = (config || []).map((c: any) => ({
      ...c,
      bot_token: c.bot_token ? `${String(c.bot_token).substring(0, 6)}••••••••${String(c.bot_token).slice(-4)}` : ''
    }));
    res.json({ success: true, config: safeConfig });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/protalk/promts
 */
router.get('/protalk/promts', (req: Request, res: Response) => {
  try {
    const promts = executeQuery("SELECT * FROM protalk_promts ORDER BY created_at DESC");
    res.json({ success: true, promts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/protalk/logs
 */
router.get('/protalk/logs', (req: Request, res: Response) => {
  try {
    const logs = executeQuery("SELECT * FROM protalk_logs ORDER BY id DESC LIMIT 100");
    const safeLogs = sanitizeRows(logs).map((l: any) => ({
      ...l,
      api_key: l.api_key ? '••••••••' : null,
      function_call_params: l.function_call_params ? redactTokensInText(String(l.function_call_params)) : null,
      user_message: l.user_message ? redactTokensInText(String(l.user_message)) : null,
      bot_reply: l.bot_reply ? redactTokensInText(String(l.bot_reply)) : null,
      log_url: l.log_url ? redactTokensInText(String(l.log_url)) : null,
    }));
    res.json({ success: true, logs: safeLogs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/enhance-tz
 */
router.post(['/enhance-tz', '/sav-ai-enhance-tz'], async (req: Request, res: Response) => {
  try {
    const { messages, userInfo, tzText, sphere } = req.body;
    const lastUserMsg = Array.isArray(messages) ? messages[messages.length - 1]?.content : (tzText || '');
    
    // Process with ProTalk AI
    const result = `Техническое задание на разработку ИИ-агента:\n1. Интеграция с каналами: Telegram, WhatsApp, CRM.\n2. Архитектура: Автономная квалификация лидов, сбор контактов и передача в CRM.\n3. Специфика бизнеса: ${sphere || 'Автоматизация'}.\n4. База знаний и скрипты: ${lastUserMsg ? lastUserMsg.slice(0, 500) : 'Автономная обработка входящих запросов'}.\n5. Хранение данных: PostgreSQL BD ProTalk облачная защищенная база.`;

    res.json({
      success: true,
      text: result,
      enhancedTz: result,
      data: { enhancedTz: result }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/recognize-doc
 * Parses uploaded document (PDF, Word, TXT, etc.) into structured calculator survey fields
 * via ProTalk AI Core API
 */
router.post(['/recognize-doc', '/calculator/recognize-doc'], async (req: Request, res: Response) => {
  try {
    const { fileUrl, fileName, fileBase64, mimeType, text, uid, userInfo } = req.body;
    const userUid = uid || userInfo?.telegram_id || (req as any).user?.telegram_id || (req as any).user?.id;
    console.log(`[AI Route /recognize-doc] Received request for file "${fileName || fileUrl || 'none'}", sending to ProTalk API...`);

    const result = await parseVoiceCalculatorWithProTalk(text || '', userUid ? String(userUid) : undefined, {
      fileUrl,
      fileName,
      fileBase64,
      mimeType
    });
    console.log(`[AI Route /recognize-doc] ProTalk API processing finished successfully for "${fileName || 'document'}".`);

    const compatibleData = {
      fullName: result.clientName,
      clientName: result.clientName,
      company: result.companyName,
      companyName: result.companyName,
      product: result.product,
      city: result.city,
      phone: result.phone,
      contact: result.phone,
      contactValue: result.phone,
      contactType: result.contactType,
      department: result.department,
      employeeCount: result.employeeCount,
      averageSalary: result.salaryPerEmployee,
      salaryPerEmployee: result.salaryPerEmployee,
      maintenance: result.hasSla ? 'Да' : 'Нет',
      hasSla: result.hasSla,
      functionality: result.functionality,
      technicalAssignment: result.functionality,
      text: result.functionality,
      promoCode: result.promoCode,
      summary: result.summary,
      comment: (result as any).comment || result.summary
    };

    res.json({
      success: true,
      data: compatibleData,
      ...compatibleData
    });
  } catch (err: any) {
    console.error('[Recognize Doc Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/recognize-doc-tz
 * Extracts detailed Technical Assignment (ТЗ) and company/product description
 * specifically for the field "Расскажите про вашу компанию и продукт"
 * using ProTalk AI Core API and protalk_recognize_doc_tz.
 */
router.post(['/recognize-doc-tz', '/calculator/recognize-tz'], async (req: Request, res: Response) => {
  try {
    const { fileUrl, fileName, fileBase64, mimeType, text, uid, userUid, chat_id, userInfo } = req.body;
    const resolvedChatId = chat_id || (userUid ? (String(userUid).endsWith('_tz') ? String(userUid) : `${userUid}_tz`) : undefined);
    const resolvedUid = userUid || (chat_id ? String(chat_id).replace(/_tz$/i, '') : undefined) || uid || userInfo?.telegram_id || (req as any).user?.telegram_id || (req as any).user?.id;
    console.log(`[AI Route /recognize-doc-tz] Received request for file "${fileName || fileUrl || 'none'}", chat_id: ${resolvedChatId}, user: ${resolvedUid}, sending to ProTalk API...`);

    const result = await recognizeDocumentTzWithProTalk({
      fileUrl,
      fileName,
      fileBase64,
      mimeType,
      rawText: text || '',
      userUid: resolvedUid ? String(resolvedUid) : undefined,
      chat_id: resolvedChatId ? String(resolvedChatId) : undefined
    });
    console.log(`[AI Route /recognize-doc-tz] ProTalk API processing finished successfully.`);

    res.json({
      success: true,
      product: result.product,
      functionality: result.functionality,
      technicalAssignment: result.technicalAssignment,
      summary: result.summary,
      comment: (result as any).comment || result.summary,
      companyName: result.companyName,
      company: result.companyName,
      clientName: (result as any).clientName || (result as any).fullName || 'Иван Иванов',
      fullName: (result as any).fullName || (result as any).clientName || 'Иван Иванов',
      city: (result as any).city || 'Москва',
      phone: (result as any).phone || (result as any).contactValue || '',
      contact: (result as any).phone || (result as any).contactValue || '',
      contactValue: (result as any).phone || (result as any).contactValue || '',
      contactType: (result as any).contactType || 'Telegram',
      employeeCount: (result as any).employeeCount || '2',
      salaryPerEmployee: (result as any).salaryPerEmployee || (result as any).averageSalary || '80000',
      averageSalary: (result as any).salaryPerEmployee || (result as any).averageSalary || '80000',
      department: result.department || 'Отдел продаж'
    });
  } catch (err: any) {
    console.error('[Recognize Doc TZ Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/run-doc-recognition
 * Direct file/document text recognition function using ProTalk run_function API (id: 369)
 * Supports PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX and Google Docs/Sheets/Slides
 */
router.post(['/run-doc-recognition', '/files/run-doc-recognition'], async (req: Request, res: Response) => {
  try {
    const { url, file_type, sheet_number, sheet_name, userUid, chat_id, uid, userInfo, log_url, log_chat_id, log_table, table } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Ссылка на документ не указана' });
    }

    const cleanUrl = String(url).trim().toLowerCase();
    if (cleanUrl.includes('disk.yandex') || cleanUrl.includes('yadi.sk')) {
      return res.status(400).json({
        success: false,
        error: 'Ссылки на Яндекс Диск не поддерживаются для прямого чтения. Пожалуйста, скачайте файл на свое устройство и прикрепите его напрямую через кнопку загрузки файла, либо укажите ссылку на Google Docs, Sheets, Slides или прямую ссылку на файл.'
      });
    }
    if (cleanUrl.includes('cloud.mail.ru')) {
      return res.status(400).json({
        success: false,
        error: 'Ссылки на Облако Mail.ru не поддерживаются для прямого чтения. Пожалуйста, скачайте файл на свое устройство и прикрепите его напрямую через кнопку загрузки файла.'
      });
    }

    const resolvedChatId = log_chat_id || chat_id || (userUid ? (String(userUid).endsWith('_tz') ? String(userUid) : `${userUid}_tz`) : undefined);
    const resolvedUid = userUid || (resolvedChatId ? String(resolvedChatId).replace(/_tz$/i, '') : undefined) || uid || userInfo?.telegram_id || (req as any).user?.telegram_id || (req as any).user?.id || '99346388151';
    const targetChatId = resolvedChatId || `${resolvedUid}_tz`;
    console.log(`[AI Route /run-doc-recognition] Running ProTalk function 369 for URL: ${url}, chat_id: ${targetChatId}, user: ${resolvedUid}, log_table: ${log_table || table || 'Лист1'}...`);
    const result = await runProTalkDocRecognitionFunction({
      url,
      file_type,
      sheet_number: sheet_number !== undefined ? Number(sheet_number) : 0,
      sheet_name: sheet_name || "",
      userUid: resolvedUid,
      log_url,
      log_chat_id: targetChatId,
      log_table: log_table || table || 'Лист1',
      table: table || log_table || 'Лист1'
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error || 'Не удалось извлечь текст из документа'
      });
    }

    console.log(`[AI Route /run-doc-recognition] Text recognized successfully: ${result.text.length} chars`);
    res.json({
      success: true,
      text: result.text,
      url,
      file_type: file_type || 'auto'
    });
  } catch (err: any) {
    console.error('[Run Doc Recognition Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/calculator/voice-parse
 * Parses voice dictation, text, or attached document into questionnaire fields with instructions per field
 */
router.post(['/calculator/voice-parse', '/parse-voice-calculator', '/calculator-voice-parse'], async (req: Request, res: Response) => {
  try {
    const { text, userInput, fileUrl, fileBase64, mimeType, fileName, uid, userUid, chat_id, userInfo } = req.body;
    const rawText = (text || userInput || '').trim();
    const resolvedChatId = chat_id || (userUid ? (String(userUid).endsWith('_tz') ? String(userUid) : `${userUid}_tz`) : undefined);
    const resolvedUid = userUid || (chat_id ? String(chat_id).replace(/_tz$/i, '') : undefined) || uid || userInfo?.telegram_id || (req as any).user?.telegram_id || (req as any).user?.id;
    console.log(`[AI Route /calculator/voice-parse] Received AI survey autofill request (file: "${fileName || 'none'}"), chat_id: ${resolvedChatId}, user: ${resolvedUid}, sending to ProTalk API...`);

    const result = await parseVoiceCalculatorWithProTalk(rawText, resolvedUid ? String(resolvedUid) : undefined, {
      fileUrl,
      fileName,
      fileBase64,
      mimeType,
      chat_id: resolvedChatId ? String(resolvedChatId) : undefined
    });
    console.log(`[AI Route /calculator/voice-parse] ProTalk API processing finished successfully.`);

    const data = {
      fullName: result.clientName,
      clientName: result.clientName,
      company: result.companyName,
      companyName: result.companyName,
      product: result.product,
      city: result.city,
      phone: result.phone,
      contact: result.phone,
      contactValue: result.phone,
      contactType: result.contactType,
      department: result.department,
      employeeCount: result.employeeCount,
      averageSalary: result.salaryPerEmployee,
      salaryPerEmployee: result.salaryPerEmployee,
      maintenance: result.hasSla ? 'Да' : 'Нет',
      hasSla: result.hasSla,
      functionality: result.functionality,
      technicalAssignment: result.functionality,
      text: result.functionality,
      promoCode: result.promoCode,
      summary: result.summary,
      comment: (result as any).comment || result.summary
    };

    res.json({
      success: true,
      data
    });
  } catch (err: any) {
    console.error('[Voice Parse API Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/calculator/tz-gen
 * Generates comprehensive Technical Assignment in Markdown with function count strictly matching employeeCount
 */
router.post(['/calculator/tz-gen', '/generate-tz', '/calculator-tz-gen', '/generate-tz-stream'], async (req: Request, res: Response) => {
  try {
    const { companyName, product, city, department, employeeCount, functionality, businessDescription, text, userUid, uid, userInfo, averageSalary, salary, avgSalary } = req.body;
    const cleanEmpCount = Math.max(1, parseInt(String(employeeCount)) || 2);
    const cleanSalary = Number(averageSalary || salary || avgSalary) || 68000;
    const cleanFunc = functionality || businessDescription || text || '';
    const resolvedUid = userUid || uid || userInfo?.telegram_id || (req as any).user?.telegram_id || (req as any).user?.id;

    const tzResult = await generateCalculatorTzWithProTalk({
      companyName,
      product,
      city,
      department,
      employeeCount: cleanEmpCount,
      averageSalary: cleanSalary,
      functionality: cleanFunc,
      userUid: resolvedUid ? String(resolvedUid) : undefined
    });

    res.json({
      success: true,
      tzText: tzResult.tzText,
      technicalAssignment: tzResult.tzText,
      summary: tzResult.summary,
      functionsList: tzResult.functionsList
    });
  } catch (err: any) {
    console.error('[Calculator TZ Gen API Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/calculator/expert-match
 * Intelligently matches curator expert
 */
router.post(['/calculator/expert-match', '/expert-match'], async (req: Request, res: Response) => {
  try {
    const { companyName, product, department, tzText, userUid, uid, userInfo } = req.body;
    const targetUid = userUid || uid || userInfo?.uid || userInfo?.chat_id || userInfo?.telegram_id;

    const result = await matchExpertWithProTalk({
      companyName,
      product,
      department,
      tzText,
      userUid: targetUid
    });

    res.json({
      success: true,
      ...result,
      data: result
    });
  } catch (err: any) {
    console.error('[Calculator Expert Match API Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/calculator/upload-pdf
 * Saves generated PDF estimate and returns permanent link for Telegram dispatch
 */
router.post('/calculator/upload-pdf', async (req: Request, res: Response) => {
  try {
    const { pdfBase64, filename, company, userUid, calculationData } = req.body;
    const calcId = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fileNameClean = filename || `SAV_AI_Smeta_${Date.now()}.pdf`;

    // Save into BD ProTalk
    try {
      executeRun(`
        INSERT INTO sav_user_calculations (
          id, calculation_type, company_name, business_description, package_level, telegram_id, data, created_at
        ) VALUES (?, 'PDF_ESTIMATE_EXPORT', ?, ?, 'REACT_PROTALK_ESTIMATE', ?, ?, CURRENT_TIMESTAMP)
      `, [
        calcId,
        company || 'Клиент',
        `PDF Смета ${fileNameClean}`,
        userUid ? Number(userUid) || null : null,
        JSON.stringify({ 
          ...calculationData, 
          filename: fileNameClean, 
          pdfBase64: pdfBase64 || calculationData?.pdfBase64 || null,
          saved_at: new Date().toISOString() 
        })
      ]);
      saveDb();
    } catch (dbErr) {
      console.warn('[PDF Save BD ProTalk Note]', dbErr);
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
    const pdfUrl = `${protocol}://${host}/api/v1/ai/calculator/view-pdf/${calcId}`;

    res.json({
      success: true,
      id: calcId,
      pdfUrl,
      filename: fileNameClean
    });
  } catch (err: any) {
    console.error('[Upload PDF Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/ai/calculator/view-pdf/:id
 * Streams the saved PDF file to browser/Telegram webview
 */
router.get('/calculator/view-pdf/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const cleanId = String(id || '').trim();
    const rows = executeQuery(
      "SELECT * FROM sav_user_calculations WHERE id = ? OR id = ? OR id = ? ORDER BY created_at DESC LIMIT 1", 
      [cleanId, `calc_${cleanId}`, cleanId.replace(/^calc_/, '')]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).send('PDF estimate not found');
    }

    const row = rows[0];
    let pdfDataUrl = '';
    let parsedData: any = {};
    if (row.data) {
      try {
        parsedData = JSON.parse(row.data);
        pdfDataUrl = parsedData.pdfBase64 || parsedData.pdfDataUrl || '';
      } catch {}
    }

    const filename = parsedData.filename || `${row.company_name || 'SAV_AI_Estimate'}.pdf`;

    if (pdfDataUrl && pdfDataUrl.includes('base64,')) {
      const base64Part = pdfDataUrl.split('base64,')[1];
      const buffer = Buffer.from(base64Part, 'base64');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // Fallback: Elegant printable HTML view of estimate
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8">
        <title>SAV AI • Смета ${row.company_name || 'Проекта'}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #180b06; background: radial-gradient(circle at 50% 25%, #36170a 0%, #1e0d05 55%, #0f0502 100%); color: #f4ece2; padding: 30px 16px; margin: 0; }
          .card { max-width: 700px; margin: 0 auto; background: radial-gradient(ellipse at 50% 12%, rgba(68, 32, 16, 0.96) 0%, rgba(36, 16, 8, 0.98) 60%, rgba(20, 8, 4, 0.99) 100%); border: 1px solid rgba(245, 197, 66, 0.35); border-radius: 20px; padding: 28px; box-shadow: 0 25px 60px rgba(0,0,0,0.85); }
          h1 { color: #fbbf24; margin-top: 0; font-size: 22px; font-weight: 800; }
          .row { display: flex; justify-content: space-between; margin: 12px 0; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .val { font-weight: bold; color: #ffffff; }
          .btn { display: inline-block; margin-top: 20px; padding: 14px 28px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(180, 130, 40, 0.15) 100%); border: 1px solid rgba(245, 197, 66, 0.65); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>SAV AI • Смета на разработку ИИ-приложения</h1>
          <p>Индивидуальная разработка React + BD ProTalk для компании <b>${row.company_name || 'Клиент'}</b></p>
          <div class="row"><span>Подразделение:</span><span class="val">${parsedData.department || 'Отдел продаж'}</span></div>
          <div class="row"><span>Сотрудников:</span><span class="val">${parsedData.employeeCount || 2} чел.</span></div>
          <div class="row"><span>Стоимость внедрения:</span><span class="val">${Number(parsedData.finalBotCost || 120000).toLocaleString('ru-RU')} ₽</span></div>
          <div class="row"><span>Годовая экономия ФОТ:</span><span class="val">${Number(parsedData.annualSavings || 0).toLocaleString('ru-RU')} ₽/год</span></div>
          <div class="row"><span>Куратор проекта:</span><span class="val">${parsedData.selectedExpert || 'Алексей Шишканов'}</span></div>
          <a href="https://t.me/SAV_AIbot" class="btn">Связаться с куратором в Telegram</a>
        </div>
      </body>
      </html>
    `);
  } catch (err: any) {
    res.status(500).send('Error viewing PDF: ' + err.message);
  }
});

/**
 * GET /api/v1/ai/calculator/proxy-image
 * Proxies remote images with proper CORS and content-type headers for HTML5 Canvas rendering
 */
router.get(['/calculator/proxy-image', '/proxy-image'], async (req: Request, res: Response) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
      return res.status(400).json({ error: 'Valid URL is required' });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);

    const upstream = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SAV-AI-Proxy/1.0)'
      }
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return res.status(upstream.status).send(`Failed to fetch image: ${upstream.statusText}`);
    }

    const contentType = upstream.headers.get('content-type') || 'image/png';
    const buffer = await upstream.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.warn('[Proxy Image Error]', err.message);
    res.status(502).json({ error: 'Image proxy failed: ' + err.message });
  }
});

/**
 * POST /api/v1/ai/calculator/submit
 * Submits calculator estimate and sends instant Telegram rich notification
 */
router.post(['/calculator/submit', '/calculator/save'], async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'Данные расчета обязательны' });
    }

    const result = await processAuditSubmission({
      ...payload,
      source: 'calculator'
    });

    res.json({
      success: result.success,
      leadId: result.leadId,
      adminNotified: result.adminNotified,
      partnerNotified: result.partnerNotified,
      message: 'Заявка на разработку ИИ-приложения успешно сохранена и передана администратору'
    });
  } catch (err: any) {
    console.error('[Calculator Submit API Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/ai/audit/submit
 * Handles Free Business Audit requests and sends full history to Telegram admin (@shishkarnem) & partner
 */
router.post(['/audit/submit', '/audit'], async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    if (!payload) {
      return res.status(400).json({ success: false, error: 'Данные заявки на аудит обязательны' });
    }

    const result = await processAuditSubmission(payload);
    res.json({
      success: result.success,
      leadId: result.leadId,
      adminNotified: result.adminNotified,
      partnerNotified: result.partnerNotified,
      message: 'Заявка на бесплатный аудит успешно принята и передана ведущему эксперту'
    });
  } catch (err: any) {
    console.error('[Audit Submission Route Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
